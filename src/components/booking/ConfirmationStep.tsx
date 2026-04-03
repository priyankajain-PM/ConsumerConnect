"use client";

import { useState } from "react";
import { parseISO } from "date-fns";
import type { TimeSlot, BookingResult, MeetingDuration, MeetingType } from "@/types/booking";

interface ConfirmationStepProps {
  slot: TimeSlot;
  ideaText: string;
  userEmail: string;
  userPhone: string;
  duration: MeetingDuration;
  meetingType: MeetingType;
  onBack: () => void;
  onSuccess: (result: BookingResult) => void;
}

const MEETING_TYPE_LABELS: Record<MeetingType, string> = {
  google_meet: "Google Meet",
  phone: "Phone / WhatsApp call",
};

export function ConfirmationStep({ slot, ideaText, userEmail, userPhone, duration, meetingType, onBack, onSuccess }: ConfirmationStepProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;
  const fmt = (iso: string) =>
    new Intl.DateTimeFormat("en-US", {
      weekday: "long",
      month: "long",
      day: "numeric",
      hour: "numeric",
      minute: "2-digit",
      hour12: true,
      timeZone: tz,
    }).format(parseISO(iso));

  async function handleBook() {
    setLoading(true);
    setError(null);

    const res = await fetch("/api/bookings", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        pmId: slot.pmId,
        slotStart: slot.start,
        slotEnd: slot.end,
        signedToken: slot.signedToken,
        ideaText: ideaText || null,
        customerPhone: userPhone || null,
        duration,
        meetingType,
      }),
    });

    const data = await res.json();
    setLoading(false);

    if (!res.ok) {
      if (data.error === "SLOT_TAKEN") {
        setError("That slot was just taken. Please go back and pick another time.");
      } else if (data.error === "ALREADY_BOOKED") {
        setError("You already have an upcoming call scheduled.");
      } else if (data.error === "CALENDAR_ERROR") {
        setError("We couldn't schedule your meeting. Your idea was saved — we'll follow up soon.");
      } else {
        setError("Something went wrong. Please try again.");
      }
      return;
    }

    onSuccess(data);
  }

  return (
    <div className="px-6 py-6 flex flex-col gap-5">
      <div className="flex items-center gap-3">
        <button
          onClick={onBack}
          className="text-gray-400 hover:text-gray-600 transition-colors text-sm focus:outline-none focus:underline"
        >
          ← Back
        </button>
        <h2 className="text-xl font-semibold text-gray-900">Confirm your booking</h2>
      </div>

      {error && (
        <div role="alert" className="bg-red-50 border border-red-200 rounded-lg px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      <div className="bg-gray-50 rounded-xl p-4 flex flex-col gap-3 text-sm">
        <Row label="Meeting" value="Customer Idea Discussion" />
        <Row label="Date & time" value={fmt(slot.start)} />
        <Row label="Duration" value={`${duration} minutes`} />
        <Row label="How" value={meetingType === "google_meet" ? "Google Meet (invite sent to your email)" : MEETING_TYPE_LABELS[meetingType]} />
        <Row label="Your email" value={userEmail} />
        {ideaText.trim() && (
          <Row
            label="Your idea"
            value={ideaText.length > 120 ? ideaText.slice(0, 120) + "…" : ideaText}
          />
        )}
      </div>

      <button
        onClick={handleBook}
        disabled={loading}
        className="w-full bg-indigo-600 hover:bg-indigo-700 disabled:opacity-60 text-white font-medium py-2.5 px-4 rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 flex items-center justify-center gap-2"
      >
        {loading && (
          <svg className="w-4 h-4 animate-spin" viewBox="0 0 24 24" fill="none">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
          </svg>
        )}
        {loading ? "Booking…" : "Book meeting"}
      </button>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex gap-3">
      <span className="text-gray-500 w-24 flex-shrink-0">{label}</span>
      <span className="text-gray-900 font-medium">{value}</span>
    </div>
  );
}
