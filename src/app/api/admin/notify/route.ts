import { NextRequest, NextResponse } from "next/server";
import { sendPushNotification } from "@/lib/clevertap";
import { generateMagicToken } from "@/lib/magic-link";

export async function POST(req: NextRequest) {
  const auth = req.headers.get("authorization") ?? "";
  if (!process.env.NOTIFY_SECRET || auth !== `Bearer ${process.env.NOTIFY_SECRET}`) {
    return new NextResponse("Unauthorized", { status: 401 });
  }

  const { phone, pmId } = await req.json();
  if (!phone || !pmId) {
    return NextResponse.json({ error: "phone and pmId are required" }, { status: 400 });
  }

  const { token, expiresAt } = generateMagicToken(phone);
  const appUrl = process.env.NEXT_PUBLIC_APP_URL!;
  const magicLink = `${appUrl}/api/auth/magic?phone=${encodeURIComponent(phone)}&token=${token}&expires=${expiresAt}&pmId=${pmId}`;

  await sendPushNotification({ phone, pmId, magicLink });

  return NextResponse.json({ ok: true, sentTo: phone, magicLink });
}
