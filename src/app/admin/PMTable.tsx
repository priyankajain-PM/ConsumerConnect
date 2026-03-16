"use client";

import { useState } from "react";

interface AvailabilityRow { dayOfWeek: number; startTime: string; endTime: string; }

interface PMRow {
  id: string;
  name: string;
  email: string;
  calendarConnected: boolean;
  acceptBookings: boolean;
  callsThisWeek: number;
  timezone: string;
  availability: AvailabilityRow[];
}

export function PMTable({ initialPMs }: { initialPMs: PMRow[] }) {
  const [pms, setPMs] = useState(initialPMs);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [inviteLink, setInviteLink] = useState<string | null>(null);

  async function handleInvite(e: React.FormEvent) {
    e.preventDefault();
    setError(""); setInviteLink(null);
    if (!name.trim() || !email.trim()) { setError("Name and email are required."); return; }
    setLoading(true);
    const res = await fetch("/api/admin/pms", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, email }),
    });
    const data = await res.json();
    setLoading(false);
    if (!res.ok) { setError(data.error ?? "Something went wrong."); return; }
    const link = `${window.location.origin}/pm?pmId=${data.id}`;
    setInviteLink(link);
    setPMs((prev) => [...prev, { id: data.id, name: data.name, email: data.email, calendarConnected: false, acceptBookings: false, callsThisWeek: 0, timezone: "Asia/Kolkata", availability: [] }]);
    setName(""); setEmail("");
  }

  async function toggleAcceptBookings(pm: PMRow) {
    const next = !pm.acceptBookings;
    setPMs((prev) => prev.map((p) => p.id === pm.id ? { ...p, acceptBookings: next } : p));
    await fetch("/api/pm", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ pmId: pm.id, acceptBookings: next }),
    });
  }

  return (
    <div className="flex flex-col gap-6">
      {/* Invite form */}
      <div className="bg-white border border-gray-200 rounded-xl p-5 flex flex-col gap-4">
        <h3 className="font-semibold text-gray-900 text-sm">Invite a PM</h3>
        <form onSubmit={handleInvite} className="flex flex-col sm:flex-row gap-3">
          <input
            type="text" value={name} onChange={(e) => setName(e.target.value)}
            placeholder="Full name"
            className="flex-1 border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
          <input
            type="email" value={email} onChange={(e) => setEmail(e.target.value)}
            placeholder="Work email"
            className="flex-1 border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
          <button
            type="submit" disabled={loading}
            className="bg-indigo-600 hover:bg-indigo-700 disabled:opacity-60 text-white text-sm font-medium px-5 py-2 rounded-lg transition-colors whitespace-nowrap"
          >
            {loading ? "Adding…" : "Add PM"}
          </button>
        </form>
        {error && <p className="text-xs text-red-600">{error}</p>}
        {inviteLink && (
          <div className="flex flex-col gap-1.5">
            <p className="text-xs text-green-700 font-medium">PM added! Share this link with them:</p>
            <div className="flex gap-2">
              <input
                readOnly value={inviteLink}
                className="flex-1 border border-green-200 bg-green-50 rounded-lg px-3 py-2 text-xs text-gray-700 font-mono focus:outline-none"
              />
              <button
                onClick={() => { navigator.clipboard.writeText(inviteLink); }}
                className="border border-gray-200 hover:bg-gray-50 text-gray-600 text-xs px-3 py-2 rounded-lg transition-colors"
              >
                Copy
              </button>
            </div>
          </div>
        )}
      </div>

      {/* PM list */}
      {pms.length === 0 ? (
        <p className="text-sm text-gray-400 text-center py-8">No PMs yet. Add one above.</p>
      ) : (
        <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100 bg-gray-50">
                {["Name", "Email", "Calendar", "Availability", "Calls this week", "Taking bookings", "Invite link", "Booking link"].map((h) => (
                  <th key={h} className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {pms.map((pm, i) => (
                <tr key={pm.id} className={`border-b border-gray-50 ${i % 2 === 0 ? "" : "bg-gray-50/50"}`}>
                  <td className="px-4 py-3 font-medium text-gray-900">{pm.name}</td>
                  <td className="px-4 py-3 text-gray-500">{pm.email}</td>
                  <td className="px-4 py-3">
                    <span className={`inline-flex items-center gap-1 text-xs font-medium ${pm.calendarConnected ? "text-green-600" : "text-gray-400"}`}>
                      <span className={`w-1.5 h-1.5 rounded-full ${pm.calendarConnected ? "bg-green-500" : "bg-gray-300"}`} />
                      {pm.calendarConnected ? "Connected" : "Not connected"}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <AvailabilitySummary availability={pm.availability} timezone={pm.timezone} />
                  </td>
                  <td className="px-4 py-3 text-gray-700">{pm.callsThisWeek}</td>
                  <td className="px-4 py-3">
                    <button
                      onClick={() => toggleAcceptBookings(pm)}
                      className={`w-10 h-5 rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-indigo-500 ${pm.acceptBookings ? "bg-indigo-600" : "bg-gray-200"}`}
                      role="switch" aria-checked={pm.acceptBookings}
                    >
                      <span className={`block w-3.5 h-3.5 bg-white rounded-full shadow transform transition-transform mx-0.5 ${pm.acceptBookings ? "translate-x-4" : "translate-x-0"}`} />
                    </button>
                  </td>
                  <td className="px-4 py-3">
                    <CopyLinkButton pmId={pm.id} />
                  </td>
                  <td className="px-4 py-3">
                    <CopyBookingLinkButton pmId={pm.id} />
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

const DAY_SHORT = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

function fmt12(t: string) {
  const [h, m] = t.split(":").map(Number);
  const ampm = h < 12 ? "am" : "pm";
  const h12 = h % 12 === 0 ? 12 : h % 12;
  return `${h12}:${String(m).padStart(2, "0")}${ampm}`;
}

function AvailabilitySummary({ availability, timezone }: { availability: AvailabilityRow[]; timezone: string }) {
  if (!availability.length) {
    return <span className="text-xs text-gray-300 italic">Not set</span>;
  }

  // Group by day
  const byDay: Record<number, { startTime: string; endTime: string }[]> = {};
  for (const a of availability) {
    if (!byDay[a.dayOfWeek]) byDay[a.dayOfWeek] = [];
    byDay[a.dayOfWeek].push({ startTime: a.startTime, endTime: a.endTime });
  }

  return (
    <div className="flex flex-col gap-0.5">
      {Object.entries(byDay).map(([day, windows]) => (
        <div key={day} className="flex items-center gap-1.5 text-xs text-gray-600">
          <span className="w-7 font-medium text-gray-400">{DAY_SHORT[Number(day)]}</span>
          <span>{windows.map((w) => `${fmt12(w.startTime)}–${fmt12(w.endTime)}`).join(", ")}</span>
        </div>
      ))}
      <div className="text-[10px] text-gray-300 mt-0.5">{timezone.replace(/_/g, " ")}</div>
    </div>
  );
}

function CopyLinkButton({ pmId }: { pmId: string }) {
  const [copied, setCopied] = useState(false);
  function copy() {
    const link = `${window.location.origin}/pm?pmId=${pmId}`;
    navigator.clipboard.writeText(link);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }
  return (
    <button
      onClick={copy}
      className="text-xs text-indigo-600 hover:text-indigo-800 font-medium transition-colors"
    >
      {copied ? "✓ Copied" : "Copy link"}
    </button>
  );
}

function CopyBookingLinkButton({ pmId }: { pmId: string }) {
  const [copied, setCopied] = useState(false);
  function copy() {
    const link = `${window.location.origin}/book?pmId=${pmId}`;
    navigator.clipboard.writeText(link);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }
  return (
    <button
      onClick={copy}
      className="text-xs text-indigo-600 hover:text-indigo-800 font-medium transition-colors"
    >
      {copied ? "✓ Copied" : "Copy booking link"}
    </button>
  );
}
