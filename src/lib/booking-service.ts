import { prisma } from "./db";
import { createCalendarEvent, cancelCalendarEvent } from "./google-calendar";
import { invalidateFreebusyCache } from "./cache";
import { verifySlotToken } from "./slot-service";
import { format } from "date-fns";
import type { BookingResult } from "@/types/booking";

/** Check if customer already has an active upcoming booking. */
export async function getActiveBooking(customerId: string) {
  return prisma.booking.findFirst({
    where: {
      customerId,
      status: { in: ["PENDING", "CONFIRMED"] },
      slotStart: { gt: new Date() },
    },
    orderBy: { slotStart: "asc" },
  });
}

/** Save idea text (before booking attempt — idea is never lost). */
export async function saveIdea(params: {
  customerId: string;
  ideaText: string;
  submittedWithoutBooking?: boolean;
}) {
  const expiresAt = new Date();
  expiresAt.setMonth(expiresAt.getMonth() + 12);

  return prisma.idea.create({
    data: {
      customerId: params.customerId,
      ideaText: params.ideaText || null,
      submittedWithoutBooking: params.submittedWithoutBooking ?? false,
      expiresAt,
    },
  });
}

/** Create a booking. Returns meet link and booking details. */
export async function createBooking(params: {
  customerId: string;
  customerEmail: string;
  pmId: string;
  slotStart: string;
  slotEnd: string;
  signedToken: string;
  ideaId?: string;
  ideaText?: string;
  meetingType?: string;
}): Promise<BookingResult> {
  // 1. Verify HMAC slot token — prevents slot injection
  const valid = verifySlotToken(params.pmId, params.slotStart, params.slotEnd, params.signedToken);
  if (!valid) throw new Error("INVALID_SLOT_TOKEN");

  const slotStart = new Date(params.slotStart);
  const slotEnd = new Date(params.slotEnd);

  // 2. Verify slot is still in the future
  if (slotStart <= new Date()) throw new Error("SLOT_IN_PAST");

  // 3. Get PM details
  const pm = await prisma.pM.findUniqueOrThrow({ where: { id: params.pmId } });

  // 4. Check for double-booking (DB-level conflict check)
  const conflict = await prisma.booking.findFirst({
    where: {
      pmId: params.pmId,
      status: { in: ["PENDING", "CONFIRMED"] },
      AND: [{ slotStart: { lt: slotEnd } }, { slotEnd: { gt: slotStart } }],
    },
  });
  if (conflict) throw new Error("SLOT_TAKEN");

  // 5. Check customer doesn't already have an active booking
  const existingBooking = await getActiveBooking(params.customerId);
  if (existingBooking) throw new Error("ALREADY_BOOKED");

  // 6. Create DB record (status: PENDING) — idea is already saved
  const booking = await prisma.booking.create({
    data: {
      customerId: params.customerId,
      pmId: params.pmId,
      ideaId: params.ideaId ?? null,
      status: "PENDING",
      slotStart,
      slotEnd,
      meetingType: params.meetingType ?? "google_meet",
    },
  });

  // 7. Create Google Calendar event
  let eventId: string;
  let meetLink: string;

  try {
    const result = await createCalendarEvent({
      pmId: pm.id,
      pmEmail: pm.email,
      customerEmail: params.customerEmail,
      bookingId: booking.id,
      slotStart,
      slotEnd,
      ideaText: params.ideaText ?? null,
      appUrl: process.env.NEXT_PUBLIC_APP_URL!,
    });
    eventId = result.eventId;
    meetLink = result.meetLink;
  } catch (err) {
    // Calendar failed — mark as error, don't surface to customer as total failure
    await prisma.booking.update({ where: { id: booking.id }, data: { status: "CANCELLED" } });
    throw new Error("CALENDAR_ERROR");
  }

  // 8. Confirm booking with event details
  const confirmed = await prisma.booking.update({
    where: { id: booking.id },
    data: { status: "CONFIRMED", googleEventId: eventId, googleMeetLink: meetLink },
  });

  // 9. Invalidate cache for this PM/date so fresh slots are served
  const dateStr = format(slotStart, "yyyy-MM-dd");
  invalidateFreebusyCache(params.pmId, dateStr);

  // 10. Increment PM's weekly call counter
  await prisma.pM.update({
    where: { id: params.pmId },
    data: { callsThisWeek: { increment: 1 }, lastCallAt: slotStart },
  });

  return {
    bookingId: confirmed.id,
    meetLink,
    slotStart: params.slotStart,
    slotEnd: params.slotEnd,
  };
}

/** Cancel a booking. Enforces 2-hour window. Notifies PM via calendar. */
export async function cancelBooking(params: {
  bookingId: string;
  customerId: string;
  reason?: string;
}) {
  const booking = await prisma.booking.findUniqueOrThrow({
    where: { id: params.bookingId },
    include: { pm: true },
  });

  // Ownership check
  if (booking.customerId !== params.customerId) throw new Error("FORBIDDEN");

  // Status check
  if (booking.status !== "CONFIRMED" && booking.status !== "PENDING") {
    throw new Error("NOT_CANCELLABLE");
  }

  // 2-hour window check
  const twoHoursBefore = new Date(booking.slotStart.getTime() - 2 * 60 * 60 * 1000);
  if (new Date() > twoHoursBefore) throw new Error("TOO_LATE_TO_CANCEL");

  // Cancel Google Calendar event (notifies PM and customer via calendar)
  if (booking.googleEventId) {
    try {
      await cancelCalendarEvent(booking.pm.id, booking.pm.email, booking.googleEventId);
    } catch {
      // Log but don't block — DB cancellation proceeds regardless
      console.error("Failed to delete Google Calendar event:", booking.googleEventId);
    }
  }

  // Update DB
  await prisma.booking.update({
    where: { id: params.bookingId },
    data: { status: "CANCELLED", cancelledAt: new Date(), cancellationReason: params.reason ?? null },
  });

  // Invalidate cache so PM's slot becomes available again
  const dateStr = format(booking.slotStart, "yyyy-MM-dd");
  invalidateFreebusyCache(booking.pmId, dateStr);

  // Decrement PM's weekly counter
  await prisma.pM.update({
    where: { id: booking.pmId },
    data: { callsThisWeek: { decrement: 1 } },
  });
}
