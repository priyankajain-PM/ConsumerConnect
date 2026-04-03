import { NextRequest, NextResponse } from "next/server";
import { waitUntil } from "@vercel/functions";
import { verifySlackSignature, fetchThreadParentText, postToThread } from "@/lib/slack";
import { sendPushNotification } from "@/lib/clevertap";
import { generateMagicToken } from "@/lib/magic-link";
import { prisma } from "@/lib/db";

export async function POST(req: NextRequest) {
  const rawBody = await req.text();

  try {
    await verifySlackSignature(req.headers, rawBody);
  } catch {
    return new NextResponse("Unauthorized", { status: 401 });
  }

  const payload = JSON.parse(new URLSearchParams(rawBody).get("payload") ?? "{}");

  // Only handle modal submissions
  if (payload.type !== "view_submission" || payload.view?.callback_id !== "consumerconnect_notify") {
    return new NextResponse(null, { status: 200 });
  }

  const pmId = payload.view.state.values?.pm_block?.pm_select?.selected_option?.value as string;
  const { channelId, threadTs } = JSON.parse(payload.view.private_metadata ?? "{}");

  // Close the modal immediately
  const response = NextResponse.json({ response_action: "clear" });

  waitUntil(processNotification({ pmId, channelId, threadTs }).catch(async (err) => {
    console.error("processNotification failed:", err);
    if (channelId && threadTs) {
      await postToThread(channelId, threadTs, "Something went wrong sending the notification. Please try again.");
    }
  }));

  return response;
}

async function processNotification({
  pmId,
  channelId,
  threadTs,
}: {
  pmId: string;
  channelId: string;
  threadTs: string;
}) {
  // 1. Load PM
  const pm = await prisma.pM.findUniqueOrThrow({ where: { id: pmId }, select: { id: true, name: true } });

  // 2. Read thread parent message and extract phone
  const messageText = await fetchThreadParentText(channelId, threadTs);
  const match = messageText.match(/Mobile:\s*(\d+)/);
  if (!match) {
    await postToThread(channelId, threadTs, "Could not find a mobile number in this thread. No notification sent.");
    return;
  }
  const phone = match[1];

  // 3. Generate magic link
  const { token, expiresAt } = generateMagicToken(phone);
  const appUrl = process.env.NEXT_PUBLIC_APP_URL!;
  const magicLink = `${appUrl}/api/auth/magic?phone=${encodeURIComponent(phone)}&token=${token}&expires=${expiresAt}&pmId=${pm.id}`;

  // 4. Send CleverTap PN
  await sendPushNotification({ phone, pmName: pm.name, pmId: pm.id, magicLink });

  // 5. Confirm in thread
  await postToThread(
    channelId,
    threadTs,
    `:bell: Push notification sent to *${phone}* on behalf of *${pm.name}*.`
  );
}
