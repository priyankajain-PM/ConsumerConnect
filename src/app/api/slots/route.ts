import { NextRequest, NextResponse } from "next/server";
import { getAvailableSlots } from "@/lib/slot-service";
import { requireCustomer } from "@/lib/session";

export async function GET(req: NextRequest) {
  try {
    await requireCustomer();
  } catch {
    return NextResponse.json({ error: "UNAUTHENTICATED" }, { status: 401 });
  }

  const ideaText = req.nextUrl.searchParams.get("idea") ?? "";
  const rawDuration = Number(req.nextUrl.searchParams.get("duration"));
  const duration = (rawDuration === 15 || rawDuration === 30 ? rawDuration : 15) as 15 | 30;
  const pmId = req.nextUrl.searchParams.get("pmId") ?? undefined;

  try {
    const slots = await getAvailableSlots({ ideaText, duration, pmId });
    return NextResponse.json({ slots, generatedAt: new Date().toISOString() });
  } catch (err) {
    console.error("Slot fetch error:", err);
    return NextResponse.json({ error: "CALENDAR_UNAVAILABLE" }, { status: 503 });
  }
}
