"use client";

import { format, parseISO } from "date-fns";

interface BookingRow {
  id: string;
  slotStart: string;
  status: string;
  customerEmail: string;
  customerPhone: string | null;
  pmName: string;
  ideaSnippet: string | null;
  meetingType: string;
}

const MEETING_LABELS: Record<string, { label: string; style: string }> = {
  google_meet: { label: "Meet",          style: "bg-blue-50 text-blue-700 border border-blue-200" },
  whatsapp:    { label: "Phone/WA",      style: "bg-green-50 text-green-700 border border-green-200" },
  phone:       { label: "Phone/WA",      style: "bg-green-50 text-green-700 border border-green-200" },
};

interface Stats {
  total: number;
  confirmed: number;
  cancelled: number;
  thisWeek: number;
}

export function BookingTable({ stats, rows }: { stats: Stats; rows: BookingRow[] }) {
  const statusStyle: Record<string, string> = {
    CONFIRMED: "bg-green-100 text-green-700",
    PENDING:   "bg-yellow-100 text-yellow-700",
    CANCELLED: "bg-red-100 text-red-700",
    NO_SHOW:   "bg-gray-100 text-gray-500",
  };

  return (
    <div className="flex flex-col gap-6">
      {/* Stat cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {[
          { label: "Total bookings", value: stats.total },
          { label: "Confirmed",      value: stats.confirmed },
          { label: "Cancelled",      value: stats.cancelled },
          { label: "This week",      value: stats.thisWeek },
        ].map((s) => (
          <div key={s.label} className="bg-white border border-gray-200 rounded-xl p-4">
            <p className="text-xs text-gray-400 uppercase tracking-wide">{s.label}</p>
            <p className="text-2xl font-bold text-gray-900 mt-1">{s.value}</p>
          </div>
        ))}
      </div>

      {/* Table */}
      {rows.length === 0 ? (
        <p className="text-sm text-gray-400 text-center py-8">No bookings yet.</p>
      ) : (
        <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100 bg-gray-50">
                {["Date & Time", "Customer", "PM", "Via", "Status", "Idea"].map((h) => (
                  <th key={h} className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((r, i) => (
                <tr key={r.id} className={`border-b border-gray-50 ${i % 2 === 0 ? "" : "bg-gray-50/50"}`}>
                  <td className="px-4 py-3 text-gray-700 whitespace-nowrap">
                    {r.slotStart ? format(parseISO(r.slotStart), "MMM d, h:mm a") : "—"}
                  </td>
                  <td className="px-4 py-3 text-gray-700">
                    <div>{r.customerEmail}</div>
                    {r.customerPhone && <div className="text-xs text-gray-400 mt-0.5">{r.customerPhone}</div>}
                  </td>
                  <td className="px-4 py-3 text-gray-700">{r.pmName}</td>
                  <td className="px-4 py-3">
                    {(() => {
                      const m = MEETING_LABELS[r.meetingType] ?? MEETING_LABELS.google_meet;
                      return <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-medium ${m.style}`}>{m.label}</span>;
                    })()}
                  </td>
                  <td className="px-4 py-3">
                    <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-medium ${statusStyle[r.status] ?? "bg-gray-100 text-gray-500"}`}>
                      {r.status}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-gray-500 max-w-xs truncate">
                    {r.ideaSnippet ?? <span className="italic text-gray-300">—</span>}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
