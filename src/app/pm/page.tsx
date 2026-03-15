"use client";

import { useEffect, useState } from "react";
import { WeeklyHours } from "@/components/pm/WeeklyHours";

export default function PMAdminPage() {
  const [pmId, setPmId] = useState<string | null>(null);
  const [connected, setConnected] = useState(false);
  const [acceptBookings, setAcceptBookings] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const id = params.get("pmId");
    if (!id) { setError("Invalid invite link — no PM ID found."); return; }
    setPmId(id);
    if (params.get("connected") === "true") setConnected(true);
    if (params.get("error")) setError("Calendar connection failed: " + params.get("error"));
  }, []);

  function connectCalendar() {
    if (!pmId) return;
    const params = new URLSearchParams({
      client_id: process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID ?? "",
      redirect_uri: `${window.location.origin}/api/auth/google/callback`,
      response_type: "code",
      scope: [
        "https://www.googleapis.com/auth/calendar.freebusy",
        "https://www.googleapis.com/auth/calendar.events",
      ].join(" "),
      access_type: "offline",
      prompt: "consent",
      state: pmId,
    });
    window.location.href = `https://accounts.google.com/o/oauth2/v2/auth?${params}`;
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-6">
        <div className="bg-white rounded-2xl border border-red-200 shadow-sm w-full max-w-md p-8 text-center">
          <p className="text-sm text-red-600">{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-6">
      <div className="bg-white rounded-2xl border border-gray-200 shadow-sm w-full max-w-md p-8 flex flex-col gap-6">
        <div>
          <h1 className="text-xl font-semibold text-gray-900">Customer Conversations</h1>
          <p className="text-sm text-gray-500 mt-1">
            Connect your Google Calendar to receive customer call requests.
          </p>
        </div>

        {/* Step 1: Connect calendar */}
        <div className={`border rounded-xl p-4 flex flex-col gap-3 ${connected ? "border-green-200 bg-green-50" : "border-gray-200"}`}>
          <div className="flex items-center gap-2">
            <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${connected ? "bg-green-500 text-white" : "bg-gray-200 text-gray-600"}`}>
              {connected ? "✓" : "1"}
            </span>
            <span className="font-medium text-gray-900 text-sm">Connect Google Calendar</span>
          </div>
          {connected ? (
            <p className="text-xs text-green-700 pl-8">Calendar connected successfully.</p>
          ) : (
            <>
              <p className="text-xs text-gray-500 pl-8">
                We&apos;ll only read your availability and create events — nothing else.
              </p>
              <button
                onClick={connectCalendar}
                className="ml-8 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors"
              >
                Connect Google Calendar →
              </button>
            </>
          )}
        </div>

        {/* Step 2: Accept bookings toggle */}
        <div className={`border rounded-xl p-4 flex flex-col gap-3 ${!connected ? "opacity-40 pointer-events-none" : "border-gray-200"}`}>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${acceptBookings ? "bg-green-500 text-white" : "bg-gray-200 text-gray-600"}`}>
                {acceptBookings ? "✓" : "2"}
              </span>
              <span className="font-medium text-gray-900 text-sm">Accept customer bookings</span>
            </div>
            <button
              onClick={() => {
                const next = !acceptBookings;
                setAcceptBookings(next);
                fetch("/api/pm", {
                  method: "PATCH",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({ pmId, acceptBookings: next }),
                });
              }}
              className={`w-11 h-6 rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-indigo-500 ${acceptBookings ? "bg-indigo-600" : "bg-gray-200"}`}
              role="switch"
              aria-checked={acceptBookings}
            >
              <span className={`block w-4 h-4 bg-white rounded-full shadow transform transition-transform mx-1 ${acceptBookings ? "translate-x-5" : "translate-x-0"}`} />
            </button>
          </div>
          <p className="text-xs text-gray-500 pl-8">
            Customers will see your available slots. You can turn this off anytime.
          </p>
        </div>

        {acceptBookings && connected && (
          <div className="bg-indigo-50 border border-indigo-100 rounded-xl p-4 text-sm text-indigo-700">
            ✓ You are now accepting customer bookings. Check your Google Calendar for new events.
          </div>
        )}

        {/* Step 3: Availability */}
        <div className={`border rounded-xl p-4 flex flex-col gap-4 ${!connected ? "opacity-40 pointer-events-none" : "border-gray-200"}`}>
          <div className="flex items-center gap-2">
            <span className="w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold bg-gray-200 text-gray-600">3</span>
            <span className="font-medium text-gray-900 text-sm">Set your availability</span>
          </div>
          {pmId && <WeeklyHours pmId={pmId} />}
        </div>
      </div>
    </div>
  );
}
