import { NextRequest, NextResponse } from "next/server";
import { verifyMagicToken } from "@/lib/magic-link";
import { prisma } from "@/lib/db";
import { getSession } from "@/lib/session";

export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl;
  const phone   = searchParams.get("phone") ?? "";
  const token   = searchParams.get("token") ?? "";
  const expires = Number(searchParams.get("expires") ?? "0");
  const pmId    = searchParams.get("pmId") ?? "";

  const fallback = new URL("/book", req.nextUrl.origin);
  if (pmId) fallback.searchParams.set("pmId", pmId);

  // 1. Verify token
  try {
    verifyMagicToken(phone, token, expires);
  } catch {
    return NextResponse.redirect(fallback);
  }

  // 2. Upsert customer by phone
  let user = await prisma.user.findFirst({ where: { phone } });
  if (!user) {
    user = await prisma.user.create({
      data: {
        phone,
        email: `${phone}@no-email.local`,
        name: phone,
      },
    });
  }

  // 3. Create session
  const session = await getSession();
  session.user = { id: user.id, email: user.email, name: user.name };
  await session.save();

  // 4. Redirect straight to slot picker
  const dest = new URL("/book", req.nextUrl.origin);
  dest.searchParams.set("step", "slots");
  if (pmId) dest.searchParams.set("pmId", pmId);
  return NextResponse.redirect(dest);
}
