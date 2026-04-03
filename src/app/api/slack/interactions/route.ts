import { NextRequest, NextResponse } from "next/server";
import { waitUntil } from "@vercel/functions";
import { verifySlackSignature, openSlackModal, postToThread } from "@/lib/slack";
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

  // ── Message shortcut: PM clicked "Reach out to customer" on a suggestion ──
  if (payload.type === "message_action" && payload.callback_id === "consumerconnect_message") {
    const triggerId = payload.trigger_id as string;
    const channelId = (payload.channel?.id ?? payload.channel) as string;
    const messageTs = payload.message?.ts as string;
    const messageText = (payload.message?.text ?? "") as string;

    const match = messageText.match(/Mobile:\s*(\d+)/);
    if (!match) {
      // No phone found — open modal anyway but show a warning via ephemeral
      return NextResponse.json({
        response_type: "ephemeral",
        text: "Could not find a mobile number in this message.",
      });
    }
    const phone = match[1];

    waitUntil(
      openSlackModal({ triggerId, channelId, messageTs, phone }).catch(console.error)
    );
    return new NextResponse(null, { status: 200 });
  }

  // ── Modal submission: PM selected a PM and clicked "Send Notification" ──
  if (payload.type === "view_submission" && payload.view?.callback_id === "consumerconnect_notify") {
    const pmId = payload.view.state.values?.pm_block?.pm_select?.selected_option?.value as string;
    const { channelId, messageTs, phone } = JSON.parse(payload.view.private_metadata ?? "{}");

    const response = NextResponse.json({ response_action: "clear" });

    waitUntil(
      processNotification({ pmId, channelId, messageTs, phone }).catch(async (err) => {
        console.error("processNotification failed:", err);
        if (channelId && messageTs) {
          await postToThread(channelId, messageTs, "Something went wrong sending the notification. Please try again.");
        }
      })
    );

    return response;
  }

  return new NextResponse(null, { status: 200 });
}

async function processNotification({
  pmId,
  channelId,
  messageTs,
  phone,
}: {
  pmId: string;
  channelId: string;
  messageTs: string;
  phone: string;
}) {
  const pm = await prisma.pM.findUniqueOrThrow({ where: { id: pmId }, select: { id: true, name: true } });

  const { token, expiresAt } = generateMagicToken(phone);
  const appUrl = process.env.NEXT_PUBLIC_APP_URL!;
  const magicLink = `${appUrl}/api/auth/magic?phone=${encodeURIComponent(phone)}&token=${token}&expires=${expiresAt}&pmId=${pm.id}`;

  await sendPushNotification({ phone, pmName: pm.name, pmId: pm.id, magicLink });

  await postToThread(
    channelId,
    messageTs,
    `:bell: Push notification sent to *${phone}* on behalf of *${pm.name}*.`
  );
}
