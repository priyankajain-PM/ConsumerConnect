"use client";

import { parseISO } from "date-fns";
import type { BookingResult } from "@/types/booking";

interface BookingSuccessProps {
  result: BookingResult;
  onClose: () => void;
}

export function BookingSuccess({ result, onClose }: BookingSuccessProps) {
  const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;
  const formatted = new Intl.DateTimeFormat("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
    timeZone: tz,
  }).format(parseISO(result.slotStart));

  return (
    <div className="px-6 py-8 flex flex-col items-center gap-6 text-center">
      <div className="w-14 h-14 rounded-full bg-green-100 flex items-center justify-center">
        <svg className="w-7 h-7 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
        </svg>
      </div>

      <div>
        <h2 className="text-2xl font-semibold text-gray-900">You&apos;re booked!</h2>
        <p className="mt-1 text-sm text-gray-500">
          {result.calendarInviteSent
            ? "A calendar invite has been sent to your email."
            : "Your slot is confirmed. Use the link below to join the call."}
        </p>
      </div>

      <div className="w-full bg-gray-50 rounded-xl p-4 text-left text-sm flex flex-col gap-3">
        <Row label="Meeting" value="Customer Idea Discussion" />
        <Row label="Date & time" value={formatted} />
        <Row label="Duration" value={`${Math.round((parseISO(result.slotEnd).getTime() - parseISO(result.slotStart).getTime()) / 60000)} minutes`} />
        <Row label="How" value={result.calendarInviteSent ? "Google Meet (check your calendar invite)" : "Google Meet (link below)"} />
      </div>

      {result.meetLink && (
        <a
          href={result.meetLink}
          target="_blank"
          rel="noopener noreferrer"
          className="w-full border border-indigo-200 text-indigo-600 hover:bg-indigo-50 font-medium py-2.5 px-4 rounded-lg transition-colors text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
        >
          Open Google Meet link ↗
        </a>
      )}

      <button
        onClick={onClose}
        className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-medium py-2.5 px-4 rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2"
      >
        Done
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
