import { NextRequest, NextResponse } from "next/server";
import { requireCustomer } from "@/lib/session";
import { createBooking, getActiveBooking, cancelBooking } from "@/lib/booking-service";
import { saveIdea } from "@/lib/booking-service";
import { prisma } from "@/lib/db";

export async function GET() {
  let user;
  try {
    user = await requireCustomer();
  } catch {
    return NextResponse.json({ error: "UNAUTHENTICATED" }, { status: 401 });
  }

  const booking = await getActiveBooking(user.id);
  return NextResponse.json({ booking });
}

export async function POST(req: NextRequest) {
  let user;
  try {
    user = await requireCustomer();
  } catch {
    return NextResponse.json({ error: "UNAUTHENTICATED" }, { status: 401 });
  }

  const body = await req.json();
  const { pmId, slotStart, slotEnd, signedToken, ideaText } = body;

  if (!pmId || !slotStart || !slotEnd || !signedToken) {
    return NextResponse.json({ error: "MISSING_FIELDS" }, { status: 422 });
  }

  // Save idea first — never lose it even if booking fails
  let ideaId: string | undefined;
  if (ideaText?.trim()) {
    const idea = await saveIdea({ customerId: user.id, ideaText: ideaText.trim() });
    ideaId = idea.id;
  }

  try {
    const result = await createBooking({
      customerId: user.id,
      customerEmail: user.email,
      pmId,
      slotStart,
      slotEnd,
      signedToken,
      ideaId,
      ideaText: ideaText ?? null,
    });
    return NextResponse.json(result, { status: 201 });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "UNKNOWN";

    if (msg === "SLOT_TAKEN") {
      return NextResponse.json(
        { error: "SLOT_TAKEN", message: "That slot was just taken. Please choose another time." },
        { status: 409 }
      );
    }
    if (msg === "ALREADY_BOOKED") {
      return NextResponse.json(
        { error: "ALREADY_BOOKED", message: "You already have an upcoming call scheduled." },
        { status: 409 }
      );
    }
    if (msg === "CALENDAR_ERROR") {
      return NextResponse.json(
        {
          error: "CALENDAR_ERROR",
          message: "We couldn't schedule your meeting. Your idea was saved — we'll follow up by email.",
          ideaId,
        },
        { status: 503 }
      );
    }

    console.error("Booking error:", err);
    return NextResponse.json({ error: "INTERNAL_ERROR" }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  let user;
  try {
    user = await requireCustomer();
  } catch {
    return NextResponse.json({ error: "UNAUTHENTICATED" }, { status: 401 });
  }

  const { bookingId, reason } = await req.json();
  if (!bookingId) return NextResponse.json({ error: "MISSING_BOOKING_ID" }, { status: 422 });

  try {
    await cancelBooking({ bookingId, customerId: user.id, reason });
    return NextResponse.json({ success: true });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "UNKNOWN";
    if (msg === "TOO_LATE_TO_CANCEL") {
      return NextResponse.json(
        { error: "TOO_LATE_TO_CANCEL", message: "Cancellations must be made at least 2 hours before the call." },
        { status: 422 }
      );
    }
    if (msg === "FORBIDDEN") {
      return NextResponse.json({ error: "FORBIDDEN" }, { status: 403 });
    }
    return NextResponse.json({ error: "INTERNAL_ERROR" }, { status: 500 });
  }
}
