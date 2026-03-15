import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export async function GET(req: NextRequest) {
  const secret = req.headers.get("x-cron-secret");
  if (secret !== process.env.CRON_SECRET) {
    return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });
  }

  const result = await prisma.pM.updateMany({
    data: { callsThisWeek: 0 },
  });

  return NextResponse.json({ reset: result.count, at: new Date().toISOString() });
}
