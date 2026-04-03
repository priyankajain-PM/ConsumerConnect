"use client";

import { useState } from "react";
import { PMTable } from "./PMTable";
import { BookingTable } from "./BookingTable";
import { IdeasTable } from "./IdeasTable";

type Tab = "pms" | "bookings" | "ideas";

const TABS: { id: Tab; label: string }[] = [
  { id: "pms",      label: "Product Managers" },
  { id: "bookings", label: "Bookings" },
  { id: "ideas",    label: "Customer Ideas" },
];

export function AdminTabs({
  pms,
  stats,
  rows,
  ideas,
}: {
  pms: React.ComponentProps<typeof PMTable>["initialPMs"];
  stats: React.ComponentProps<typeof BookingTable>["stats"];
  rows: React.ComponentProps<typeof BookingTable>["rows"];
  ideas: React.ComponentProps<typeof IdeasTable>["rows"];
}) {
  const [active, setActive] = useState<Tab>("pms");

  return (
    <div className="flex flex-col gap-6">
      {/* Tab bar */}
      <div className="flex gap-1 border-b border-gray-200">
        {TABS.map((t) => (
          <button
            key={t.id}
            onClick={() => setActive(t.id)}
            className={`px-4 py-2.5 text-sm font-medium rounded-t transition-colors ${
              active === t.id
                ? "text-gray-900 border-b-2 border-gray-900 -mb-px"
                : "text-gray-500 hover:text-gray-700"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* Tab panels */}
      {active === "pms" && (
        <section className="flex flex-col gap-4">
          <p className="text-sm text-gray-500">
            Add a PM to generate their invite link. Share the link so they can connect their Google Calendar.
          </p>
          <PMTable initialPMs={pms} />
        </section>
      )}

      {active === "bookings" && (
        <section className="flex flex-col gap-4">
          <p className="text-sm text-gray-500">All customer calls, most recent first.</p>
          <BookingTable stats={stats} rows={rows} />
        </section>
      )}

      {active === "ideas" && (
        <section className="flex flex-col gap-4">
          <p className="text-sm text-gray-500">
            Ideas submitted by customers, including those without a booking.
          </p>
          <IdeasTable rows={ideas} />
        </section>
      )}
    </div>
  );
}
