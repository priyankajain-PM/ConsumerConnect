import { NextRequest, NextResponse } from "next/server";
import { verifySlackSignature } from "@/lib/slack";

export async function POST(req: NextRequest) {
  const rawBody = await req.text();

  try {
    await verifySlackSignature(req.headers, rawBody);
  } catch {
    return new NextResponse("Unauthorized", { status: 401 });
  }

  // Slash commands don't work in threads — guide the PM to use the message shortcut
  return NextResponse.json({
    response_type: "ephemeral",
    text: 'Use the *"Reach out to customer"* shortcut instead — hover over the suggestion message, click ⋯ (More actions), and select it from the menu.',
  });
}
