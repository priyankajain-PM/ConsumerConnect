import { NextRequest, NextResponse } from "next/server";
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

  const payloadStr = new URLSearchParams(rawBody).get("payload");
  console.log("[interactions] rawBody prefix:", rawBody.slice(0, 120));
  console.log("[interactions] payloadStr prefix:", payloadStr?.slice(0, 120));

  const payload = JSON.parse(payloadStr ?? "{}");
  console.log("[interactions] type:", payload.type, "callback_id:", payload.callback_id);

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

    await openSlackModal({ triggerId, channelId, messageTs, phone });
    return new NextResponse(null, { status: 200 });
  }

  // ── Modal submission: PM selected a PM and clicked "Send Notification" ──
  if (payload.type === "view_submission" && payload.view?.callback_id === "consumerconnect_notify") {
    const pmId = payload.view.state.values?.pm_block?.pm_select?.selected_option?.value as string;
    const { channelId, messageTs, phone } = JSON.parse(payload.view.private_metadata ?? "{}");

    try {
      await processNotification({ pmId, channelId, messageTs, phone });
    } catch (err) {
      console.error("processNotification failed:", err);
      if (channelId && messageTs) {
        await postToThread(channelId, messageTs, "Something went wrong sending the notification. Please try again.");
      }
    }
    return NextResponse.json({ response_action: "clear" });
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
