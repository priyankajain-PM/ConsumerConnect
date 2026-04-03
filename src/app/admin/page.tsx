export const dynamic = "force-dynamic";

import { prisma } from "@/lib/db";
import { AdminTabs } from "./AdminTabs";
import { startOfWeek } from "date-fns";

export default async function AdminPage() {
  const [rawPMs, availability, bookings, weekBookings, ideas] = await Promise.all([
    prisma.pM.findMany({ orderBy: { createdAt: "asc" } }),
    prisma.pMAvailability.findMany({ orderBy: [{ dayOfWeek: "asc" }, { startTime: "asc" }] }),
    prisma.booking.findMany({
      orderBy: { slotStart: "desc" },
      take: 50,
      include: {
        customer: { select: { email: true, phone: true } },
        pm:       { select: { name: true } },
        idea:     { select: { ideaText: true } },
      },
    }),
    prisma.booking.count({
      where: { createdAt: { gte: startOfWeek(new Date()) } },
    }),
    prisma.idea.findMany({
      orderBy: { createdAt: "desc" },
      take: 100,
      include: { customer: { select: { email: true, phone: true } } },
    }),
  ]);

  // Attach availability rows to each PM
  const pms = rawPMs.map((pm: typeof rawPMs[0]) => ({
    ...pm,
    availability: availability.filter((a) => a.pmId === pm.id),
  }));

  const stats = {
    total:     bookings.length,
    confirmed: bookings.filter((b) => b.status === "CONFIRMED").length,
    cancelled: bookings.filter((b) => b.status === "CANCELLED").length,
    thisWeek:  weekBookings,
  };

  const rows = bookings.map((b) => ({
    id:            b.id,
    slotStart:     b.slotStart.toISOString(),
    status:        b.status,
    customerEmail: b.customer.email,
    customerPhone: b.customer.phone ?? null,
    pmName:        b.pm.name,
    ideaSnippet:   b.idea?.ideaText ? b.idea.ideaText.slice(0, 80) : null,
    meetingType:   b.meetingType,
  }));

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b border-gray-200 px-6 py-4">
        <div className="max-w-5xl mx-auto">
          <h1 className="text-lg font-semibold text-gray-900">PM Booking — Admin</h1>
          <p className="text-sm text-gray-500 mt-0.5">Manage PMs and track customer bookings.</p>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-6 py-10">
        <AdminTabs
          pms={pms}
          stats={stats}
          rows={rows}
          ideas={ideas.map((i) => ({
            id: i.id,
            ideaText: i.ideaText ?? "",
            customerEmail: i.customer.email,
            customerPhone: i.customer.phone ?? null,
            createdAt: i.createdAt.toISOString(),
            submittedWithoutBooking: i.submittedWithoutBooking,
          }))}
        />
      </main>
    </div>
  );
}
