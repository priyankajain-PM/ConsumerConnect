import { NextRequest, NextResponse } from "next/server";
import { verifySlackSignature, openDirectModal } from "@/lib/slack";

export async function POST(req: NextRequest) {
  const rawBody = await req.text();

  try {
    await verifySlackSignature(req.headers, rawBody);
  } catch {
    return new NextResponse("Unauthorized", { status: 401 });
  }

  const params = new URLSearchParams(rawBody);
  const triggerId = params.get("trigger_id") ?? "";
  const channelId = params.get("channel_id") ?? "";
  const prefillPhone = (params.get("text") ?? "").trim();

  await openDirectModal({ triggerId, channelId, prefillPhone });

  return new NextResponse(null, { status: 200 });
}
