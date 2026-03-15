import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/session";
import { prisma } from "@/lib/db";

// Creates or finds a customer by email and sets their session.
// Called from the booking flow when the customer enters their email.
export async function POST(req: NextRequest) {
  const { email, name, phone } = await req.json();

  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return NextResponse.json({ error: "INVALID_EMAIL" }, { status: 422 });
  }

  const user = await prisma.user.upsert({
    where: { email: email.toLowerCase().trim() },
    update: { ...(phone ? { phone: phone.trim() } : {}) },
    create: {
      email: email.toLowerCase().trim(),
      name: name?.trim() || email.split("@")[0],
      phone: phone?.trim() || null,
    },
  });

  const session = await getSession();
  session.user = { id: user.id, email: user.email, name: user.name };
  await session.save();

  return NextResponse.json({ ok: true });
}
