import { createHmac } from "crypto";
import { addMinutes, isAfter, isBefore, parseISO, startOfDay, addDays } from "date-fns";
import { toZonedTime, fromZonedTime } from "date-fns-tz";
import { prisma } from "./db";
import { getFreeBusy } from "./google-calendar";
import type { TimeSlot } from "@/types/booking";

const BOOKING_WINDOW_DAYS = 14;

function signSlot(pmId: string, start: string, end: string): string {
  const payload = `${pmId}:${start}:${end}`;
  return createHmac("sha256", process.env.SLOT_HMAC_SECRET!)
    .update(payload)
    .digest("hex");
}

export function verifySlotToken(pmId: string, start: string, end: string, token: string): boolean {
  return signSlot(pmId, start, end) === token;
}

function overlaps(
  slotStart: Date,
  slotEnd: Date,
  busy: Array<{ start: Date; end: Date }>
): boolean {
  return busy.some((b) => isBefore(slotStart, b.end) && isAfter(slotEnd, b.start));
}

export async function getAvailableSlots(params: { ideaText?: string; duration?: 15 | 30; pmId?: string }): Promise<TimeSlot[]> {
  const SLOT_DURATION_MINUTES = params.duration ?? 15;
  const now = new Date();
  const windowEnd = addDays(now, BOOKING_WINDOW_DAYS);

  // Separate queries to avoid Prisma 7 include issues
  const [pms, allAvailability, existingBookings] = await Promise.all([
    prisma.pM.findMany({
      where: { isActive: true, acceptBookings: true, calendarConnected: true, ...(params.pmId ? { id: params.pmId } : {}) },
    }),
    prisma.pMAvailability.findMany(),
    // Prefetch all bookings for the window — checked in memory, not per-slot
    prisma.booking.findMany({
      where: {
        status: { in: ["PENDING", "CONFIRMED"] },
        slotStart: { gte: now, lt: windowEnd },
      },
      select: { pmId: true, slotStart: true, slotEnd: true },
    }),
  ]);

  if (pms.length === 0) return [];

  // Index availability and bookings by pmId for O(1) lookup
  const availByPM: Record<string, { dayOfWeek: number; startTime: string; endTime: string }[]> = {};
  for (const a of allAvailability) {
    if (!availByPM[a.pmId]) availByPM[a.pmId] = [];
    availByPM[a.pmId].push(a);
  }

  const bookedByPM: Record<string, { start: Date; end: Date }[]> = {};
  for (const b of existingBookings) {
    if (!bookedByPM[b.pmId]) bookedByPM[b.pmId] = [];
    bookedByPM[b.pmId].push({ start: b.slotStart, end: b.slotEnd });
  }

  // Fetch Google freebusy for ALL PMs in parallel — 1 call per PM for the full window
  const busyByPM: Record<string, { start: Date; end: Date }[]> = {};
  await Promise.all(
    pms.map(async (pm) => {
      try {
        const raw = await getFreeBusy(pm.id, pm.email, now, windowEnd);
        busyByPM[pm.id] = raw.map((b) => ({ start: parseISO(b.start), end: parseISO(b.end) }));
      } catch {
        busyByPM[pm.id] = []; // If calendar fetch fails, treat as free
      }
    })
  );

  const allSlots: TimeSlot[] = [];

  for (const pm of pms) {
    if (pm.callsThisWeek >= pm.maxCallsPerWeek) continue;

    const pmAvail = availByPM[pm.id] ?? [];
    const pmBusy = busyByPM[pm.id] ?? [];
    const pmBooked = bookedByPM[pm.id] ?? [];

    // Combine Google busy + existing DB bookings (with buffer)
    const blocked = [
      ...pmBusy.map((b) => ({
        start: addMinutes(b.start, -pm.bufferMinutes),
        end:   addMinutes(b.end,   pm.bufferMinutes),
      })),
      ...pmBooked,
    ];

    const earliest = addMinutes(now, pm.minNoticeHours * 60);
    let cursor = earliest;
    const rem = cursor.getMinutes() % SLOT_DURATION_MINUTES;
    if (rem !== 0) cursor = addMinutes(cursor, SLOT_DURATION_MINUTES - rem);

    while (isBefore(cursor, windowEnd)) {
      const slotEnd = addMinutes(cursor, SLOT_DURATION_MINUTES);
      const localCursor = toZonedTime(cursor, pm.timezone);
      const dayOfWeek = localCursor.getDay();

      // Check availability windows
      if (pmAvail.length > 0) {
        const dayWindows = pmAvail.filter((a) => a.dayOfWeek === dayOfWeek);
        if (dayWindows.length === 0) {
          // Day unavailable — skip to next day
          cursor = fromZonedTime(startOfDay(addDays(localCursor, 1)), pm.timezone);
          continue;
        }
        const slotMin = localCursor.getHours() * 60 + localCursor.getMinutes();
        const inWindow = dayWindows.some((w) => {
          const [sh, sm] = w.startTime.split(":").map(Number);
          const [eh, em] = w.endTime.split(":").map(Number);
          return slotMin >= sh * 60 + sm && slotMin + SLOT_DURATION_MINUTES <= eh * 60 + em;
        });
        if (!inWindow) { cursor = addMinutes(cursor, SLOT_DURATION_MINUTES); continue; }
      } else {
        // Fall back to workingHoursStart/End
        const local = toZonedTime(cursor, pm.timezone);
        const [sh, sm] = pm.workingHoursStart.split(":").map(Number);
        const [eh, em] = pm.workingHoursEnd.split(":").map(Number);
        const slotMin = local.getHours() * 60 + local.getMinutes();
        if (!(slotMin >= sh * 60 + sm && slotMin + SLOT_DURATION_MINUTES <= eh * 60 + em)) {
          cursor = addMinutes(cursor, SLOT_DURATION_MINUTES); continue;
        }
      }

      if (!overlaps(cursor, slotEnd, blocked)) {
        allSlots.push({
          pmId: pm.id,
          start: cursor.toISOString(),
          end: slotEnd.toISOString(),
          signedToken: signSlot(pm.id, cursor.toISOString(), slotEnd.toISOString()),
        });
      }

      cursor = addMinutes(cursor, SLOT_DURATION_MINUTES);
    }
  }

  // Sort by start time, deduplicate per PM+time (allow multiple PMs at same time)
  const seen = new Set<string>();
  return allSlots
    .sort((a, b) => a.start.localeCompare(b.start))
    .filter((slot) => {
      const key = `${slot.pmId}:${slot.start}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
}
