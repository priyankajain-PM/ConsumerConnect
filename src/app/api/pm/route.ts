import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";

// PATCH /api/pm  { pmId, acceptBookings }
export async function PATCH(req: NextRequest) {
  const { pmId, acceptBookings } = await req.json();
  if (!pmId) return NextResponse.json({ error: "missing pmId" }, { status: 400 });

  const pm = await prisma.pM.update({
    where: { id: pmId },
    data: { acceptBookings },
    select: { id: true, acceptBookings: true },
  });

  return NextResponse.json(pm);
}
