import { createHmac, timingSafeEqual } from "crypto";
import { prisma } from "./db";

// ── Signature verification ────────────────────────────────────────────────────

export async function verifySlackSignature(
  headers: Headers,
  rawBody: string
): Promise<void> {
  const timestamp = headers.get("x-slack-request-timestamp") ?? "";
  const signature = headers.get("x-slack-signature") ?? "";

  // Reject requests older than 5 minutes (replay protection)
  if (Math.abs(Date.now() / 1000 - Number(timestamp)) > 300) {
    throw new Error("SLACK_TIMESTAMP_STALE");
  }

  const sigBase = `v0:${timestamp}:${rawBody}`;
  const expected =
    "v0=" +
    createHmac("sha256", process.env.SLACK_SIGNING_SECRET!)
      .update(sigBase)
      .digest("hex");

  const a = Buffer.from(expected, "utf8");
  const b = Buffer.from(signature, "utf8");
  if (a.length !== b.length || !timingSafeEqual(a, b)) {
    throw new Error("SLACK_SIGNATURE_INVALID");
  }
}

// ── Modal ─────────────────────────────────────────────────────────────────────

export async function openSlackModal(params: {
  triggerId: string;
  channelId: string;
  messageTs: string;
  phone: string;
}): Promise<void> {
  const pms = await prisma.pM.findMany({
    where: { isActive: true, acceptBookings: true },
    select: { id: true, name: true },
    orderBy: { name: "asc" },
  });

  if (pms.length === 0) {
    console.warn("openSlackModal: no active PMs found");
    return;
  }

  const modal = {
    type: "modal",
    callback_id: "consumerconnect_notify",
    title: { type: "plain_text", text: "Reach Out to Customer" },
    submit: { type: "plain_text", text: "Send Notification" },
    close: { type: "plain_text", text: "Cancel" },
    private_metadata: JSON.stringify({ channelId, messageTs: params.messageTs, phone: params.phone }),
    blocks: [
      {
        type: "input",
        block_id: "pm_block",
        label: { type: "plain_text", text: "Sending as PM" },
        element: {
          type: "static_select",
          action_id: "pm_select",
          placeholder: { type: "plain_text", text: "Choose a PM…" },
          options: pms.map((pm: { id: string; name: string }) => ({
            text: { type: "plain_text", text: pm.name },
            value: pm.id,
          })),
        },
      },
    ],
  };

  const res = await fetch("https://slack.com/api/views.open", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${process.env.SLACK_BOT_TOKEN}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ trigger_id: params.triggerId, view: modal }),
  });

  const data = await res.json();
  if (!data.ok) console.error("views.open failed:", data.error);
}

// ── Thread parent ─────────────────────────────────────────────────────────────

export async function fetchThreadParentText(
  channelId: string,
  threadTs: string
): Promise<string> {
  const url = new URL("https://slack.com/api/conversations.replies");
  url.searchParams.set("channel", channelId);
  url.searchParams.set("ts", threadTs);
  url.searchParams.set("limit", "1");

  const res = await fetch(url.toString(), {
    headers: { Authorization: `Bearer ${process.env.SLACK_BOT_TOKEN}` },
  });
  const data = await res.json();
  if (!data.ok) throw new Error(`conversations.replies failed: ${data.error}`);
  return (data.messages?.[0]?.text as string) ?? "";
}

// ── Post to thread ────────────────────────────────────────────────────────────

export async function postToThread(
  channelId: string,
  threadTs: string,
  text: string
): Promise<void> {
  const res = await fetch("https://slack.com/api/chat.postMessage", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${process.env.SLACK_BOT_TOKEN}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ channel: channelId, thread_ts: threadTs, text }),
  });
  const data = await res.json();
  if (!data.ok) console.error("chat.postMessage failed:", data.error);
}
