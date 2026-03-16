import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/session";
import { prisma } from "@/lib/db";

// Creates or finds a customer by email and sets their session.
// Called from the booking flow when the customer enters their email.
export async function POST(req: NextRequest) {
  const { email, name, phone } = await req.json();

  const rawEmail = email?.trim() ?? "";
  if (rawEmail && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(rawEmail)) {
    return NextResponse.json({ error: "INVALID_EMAIL" }, { status: 422 });
  }

  // If no email provided, derive a synthetic one from phone so User.email stays unique
  const rawPhone = phone?.trim() ?? "";
  if (!rawEmail && !rawPhone) {
    return NextResponse.json({ error: "EMAIL_OR_PHONE_REQUIRED" }, { status: 422 });
  }
  const resolvedEmail = rawEmail || `phone_${rawPhone.replace(/\D/g, "")}@no-email.local`;

  const user = await prisma.user.upsert({
    where: { email: resolvedEmail.toLowerCase() },
    update: { ...(rawPhone ? { phone: rawPhone } : {}) },
    create: {
      email: resolvedEmail.toLowerCase(),
      name: name?.trim() || (rawEmail ? rawEmail.split("@")[0] : rawPhone),
      phone: rawPhone || null,
    },
  });

  const session = await getSession();
  session.user = { id: user.id, email: user.email, name: user.name };
  await session.save();

  return NextResponse.json({ ok: true });
}
