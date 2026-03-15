import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";

// GET /api/pm/availability?pmId=xxx
export async function GET(req: NextRequest) {
  const pmId = req.nextUrl.searchParams.get("pmId");
  if (!pmId) return NextResponse.json({ error: "missing pmId" }, { status: 400 });

  const [availability, pm] = await Promise.all([
    prisma.pMAvailability.findMany({ where: { pmId }, orderBy: [{ dayOfWeek: "asc" }, { startTime: "asc" }] }),
    prisma.pM.findUnique({ where: { id: pmId }, select: { timezone: true } }),
  ]);

  return NextResponse.json({ availability, timezone: pm?.timezone ?? "America/New_York" });
}

// PUT /api/pm/availability  { pmId, timezone, availability: [{ dayOfWeek, startTime, endTime }] }
export async function PUT(req: NextRequest) {
  const { pmId, timezone, availability } = await req.json();
  if (!pmId) return NextResponse.json({ error: "missing pmId" }, { status: 400 });

  // Replace all availability rows for this PM atomically
  await prisma.$transaction([
    prisma.pMAvailability.deleteMany({ where: { pmId } }),
    ...(availability ?? []).map((a: { dayOfWeek: number; startTime: string; endTime: string }) =>
      prisma.pMAvailability.create({ data: { pmId, dayOfWeek: a.dayOfWeek, startTime: a.startTime, endTime: a.endTime } })
    ),
    prisma.pM.update({ where: { id: pmId }, data: { timezone } }),
  ]);

  return NextResponse.json({ ok: true });
}
