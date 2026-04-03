import { NextRequest, NextResponse } from "next/server";
import { waitUntil } from "@vercel/functions";
import { verifySlackSignature, openSlackModal } from "@/lib/slack";

export async function POST(req: NextRequest) {
  const rawBody = await req.text();

  try {
    await verifySlackSignature(req.headers, rawBody);
  } catch {
    return new NextResponse("Unauthorized", { status: 401 });
  }

  const params   = new URLSearchParams(rawBody);
  const triggerId = params.get("trigger_id") ?? "";
  const channelId = params.get("channel_id") ?? "";
  const threadTs  = params.get("thread_ts") ?? "";

  if (!threadTs) {
    // Command was not used inside a thread
    return NextResponse.json({
      response_type: "ephemeral",
      text: "Please use `/consumerconnect` as a reply inside a customer suggestion thread.",
    });
  }

  waitUntil(openSlackModal(triggerId, channelId, threadTs).catch(console.error));

  return new NextResponse(null, { status: 200 });
}
