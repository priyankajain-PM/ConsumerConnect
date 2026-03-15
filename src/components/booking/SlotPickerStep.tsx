"use client";

import { useEffect, useState, useCallback } from "react";
import { format, parseISO, isSameDay } from "date-fns";
import type { TimeSlot, MeetingDuration } from "@/types/booking";

interface SlotPickerStepProps {
  ideaText: string;
  duration: MeetingDuration;
  onBack: () => void;
  onSlotSelected: (slot: TimeSlot) => void;
}

export function SlotPickerStep({ ideaText, duration, onBack, onSlotSelected }: SlotPickerStepProps) {
  const [slots, setSlots] = useState<TimeSlot[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [selectedSlot, setSelectedSlot] = useState<TimeSlot | null>(null);

  const fetchSlots = useCallback(async () => {
    setLoading(true);
    setError(false);
    try {
      const params = new URLSearchParams();
      if (ideaText.trim()) params.set("idea", ideaText.trim());
      params.set("duration", String(duration));
      const res = await fetch(`/api/slots?${params}`);
      if (!res.ok) throw new Error("fetch_failed");
      const data = await res.json();
      setSlots(data.slots ?? []);
      if (data.slots?.length > 0) {
        // Auto-select the first available date
        const firstDate = format(parseISO(data.slots[0].start), "yyyy-MM-dd");
        setSelectedDate(firstDate);
      }
    } catch {
      setError(true);
    } finally {
      setLoading(false);
    }
  }, [ideaText, duration]);

  useEffect(() => {
    fetchSlots();
  }, [fetchSlots]);

  // Group slots by date
  const dateGroups = slots.reduce<Record<string, TimeSlot[]>>((acc, slot) => {
    const date = format(parseISO(slot.start), "yyyy-MM-dd");
    if (!acc[date]) acc[date] = [];
    acc[date].push(slot);
    return acc;
  }, {});

  const uniqueDates = Object.keys(dateGroups).sort();
  const slotsForSelectedDate = selectedDate ? (dateGroups[selectedDate] ?? []) : [];

  // Format times in user's local timezone
  function formatTime(iso: string) {
    return new Intl.DateTimeFormat("en-US", {
      hour: "numeric",
      minute: "2-digit",
      hour12: true,
      timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone,
    }).format(parseISO(iso));
  }

  function formatDateLabel(dateStr: string) {
    const date = parseISO(dateStr + "T12:00:00");
    const today = new Date();
    if (isSameDay(date, today)) return "Today";
    return format(date, "EEE, MMM d");
  }

  const userTimezone = Intl.DateTimeFormat().resolvedOptions().timeZone;

  return (
    <div className="px-6 py-6 flex flex-col gap-5">
      <div className="flex items-center gap-3">
        <button
          onClick={onBack}
          className="text-gray-400 hover:text-gray-600 transition-colors text-sm flex items-center gap-1 focus:outline-none focus:underline"
        >
          ← Back
        </button>
        <div>
          <h2 className="text-xl font-semibold text-gray-900">Pick a time</h2>
          <p className="text-xs text-gray-400 mt-0.5">
            Times shown in your local time ({userTimezone})
          </p>
        </div>
      </div>

      {loading && <SlotSkeleton />}

      {error && !loading && (
        <div role="alert" className="text-center py-8">
          <p className="text-sm text-gray-500">Couldn&apos;t load available times.</p>
          <button
            onClick={fetchSlots}
            className="mt-3 text-sm text-indigo-600 hover:underline focus:outline-none"
          >
            Try again
          </button>
        </div>
      )}

      {!loading && !error && slots.length === 0 && (
        <div className="text-center py-8">
          <p className="text-sm text-gray-500">
            No open slots right now — check back in a few days.
          </p>
          <p className="text-xs text-gray-400 mt-2">
            Your idea has been noted. A Product Manager will reach out within 3 business days.
          </p>
        </div>
      )}

      {!loading && !error && slots.length > 0 && (
        <>
          {/* Date strip */}
          <div className="flex gap-2 overflow-x-auto pb-1 -mx-1 px-1 scrollbar-hide">
            {uniqueDates.map((date) => (
              <button
                key={date}
                onClick={() => { setSelectedDate(date); setSelectedSlot(null); }}
                className={`flex-shrink-0 px-3 py-1.5 rounded-full text-xs font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-indigo-500 ${
                  selectedDate === date
                    ? "bg-indigo-600 text-white"
                    : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                }`}
              >
                {formatDateLabel(date)}
                <span className="ml-1 text-[10px] opacity-70">
                  ({dateGroups[date].length})
                </span>
              </button>
            ))}
          </div>

          {/* Slot grid */}
          <div
            className="grid grid-cols-2 sm:grid-cols-3 gap-2"
            role="radiogroup"
            aria-label="Available time slots"
          >
            {slotsForSelectedDate.map((slot) => {
              const isSelected = selectedSlot?.start === slot.start && selectedSlot?.pmId === slot.pmId;
              return (
                <button
                  key={`${slot.pmId}-${slot.start}`}
                  role="radio"
                  aria-checked={isSelected}
                  onClick={() => setSelectedSlot(slot)}
                  className={`flex flex-col items-center py-3 px-2 rounded-lg border text-sm font-medium transition-all focus:outline-none focus:ring-2 focus:ring-indigo-500 ${
                    isSelected
                      ? "bg-indigo-600 border-indigo-600 text-white"
                      : "border-gray-200 text-gray-700 hover:border-indigo-300 hover:bg-indigo-50"
                  }`}
                >
                  <span>{formatTime(slot.start)}</span>
                  <span className={`text-[10px] mt-0.5 ${isSelected ? "text-indigo-200" : "text-gray-400"}`}>
                    {duration} min
                  </span>
                </button>
              );
            })}
          </div>

          <button
            onClick={() => selectedSlot && onSlotSelected(selectedSlot)}
            disabled={!selectedSlot}
            className="w-full bg-indigo-600 hover:bg-indigo-700 disabled:bg-gray-200 disabled:text-gray-400 text-white font-medium py-2.5 px-4 rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2"
          >
            Confirm time →
          </button>
        </>
      )}
    </div>
  );
}

function SlotSkeleton() {
  return (
    <div className="flex flex-col gap-4 animate-pulse">
      <div className="flex gap-2">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="h-7 w-20 rounded-full bg-gray-100" />
        ))}
      </div>
      <div className="grid grid-cols-3 gap-2">
        {Array.from({ length: 9 }).map((_, i) => (
          <div key={i} className="h-14 rounded-lg bg-gray-100" />
        ))}
      </div>
    </div>
  );
}
