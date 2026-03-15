"use client";

import { useEffect, useState } from "react";

const DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const DAY_LETTERS = ["S", "M", "T", "W", "T", "F", "S"];

// 15-min increment time options from 00:00 to 23:45
const TIME_OPTIONS: string[] = [];
for (let h = 0; h < 24; h++) {
  for (let m = 0; m < 60; m += 30) {
    TIME_OPTIONS.push(`${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`);
  }
}

function fmt(t: string) {
  const [h, m] = t.split(":").map(Number);
  const ampm = h < 12 ? "am" : "pm";
  const h12 = h % 12 === 0 ? 12 : h % 12;
  return `${h12}:${String(m).padStart(2, "0")}${ampm}`;
}

interface Window { startTime: string; endTime: string }
type DaySchedule = { enabled: boolean; windows: Window[] };

const TIMEZONES = [
  "Asia/Kolkata", "America/New_York", "America/Los_Angeles", "America/Chicago",
  "Europe/London", "Europe/Berlin", "Asia/Tokyo", "Asia/Singapore", "Australia/Sydney",
];

const DEFAULT_WINDOW: Window = { startTime: "09:00", endTime: "17:00" };

function defaultSchedule(): DaySchedule[] {
  return DAYS.map((_, i) => ({
    enabled: i >= 1 && i <= 5, // Mon–Fri on by default
    windows: i >= 1 && i <= 5 ? [{ ...DEFAULT_WINDOW }] : [],
  }));
}

export function WeeklyHours({ pmId }: { pmId: string }) {
  const [schedule, setSchedule] = useState<DaySchedule[]>(defaultSchedule());
  const [timezone, setTimezone] = useState("Asia/Kolkata");
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    fetch(`/api/pm/availability?pmId=${pmId}`)
      .then((r) => r.json())
      .then(({ availability, timezone: tz }) => {
        if (tz) setTimezone(tz);
        if (!availability?.length) return;
        const s = defaultSchedule().map((d) => ({ ...d, enabled: false, windows: [] as Window[] }));
        for (const a of availability) {
          s[a.dayOfWeek].enabled = true;
          s[a.dayOfWeek].windows.push({ startTime: a.startTime, endTime: a.endTime });
        }
        setSchedule(s);
      });
  }, [pmId]);

  function toggleDay(i: number) {
    setSchedule((prev) => prev.map((d, idx) =>
      idx !== i ? d : { enabled: !d.enabled, windows: !d.enabled ? [{ ...DEFAULT_WINDOW }] : [] }
    ));
  }

  function updateWindow(dayIdx: number, winIdx: number, field: keyof Window, val: string) {
    setSchedule((prev) => prev.map((d, i) =>
      i !== dayIdx ? d : {
        ...d, windows: d.windows.map((w, j) => j !== winIdx ? w : { ...w, [field]: val }),
      }
    ));
  }

  function addWindow(dayIdx: number) {
    setSchedule((prev) => prev.map((d, i) =>
      i !== dayIdx ? d : { ...d, windows: [...d.windows, { startTime: "09:00", endTime: "17:00" }] }
    ));
  }

  function removeWindow(dayIdx: number, winIdx: number) {
    setSchedule((prev) => prev.map((d, i) => {
      if (i !== dayIdx) return d;
      const windows = d.windows.filter((_, j) => j !== winIdx);
      return { ...d, windows, enabled: windows.length > 0 };
    }));
  }

  function copyToAll(dayIdx: number) {
    const source = schedule[dayIdx].windows;
    setSchedule((prev) => prev.map((d, i) =>
      i === dayIdx || !d.enabled ? d : { ...d, windows: source.map((w) => ({ ...w })) }
    ));
  }

  async function handleSave() {
    setSaving(true); setSaved(false);
    const availability = schedule.flatMap((d, dayOfWeek) =>
      d.enabled ? d.windows.map((w) => ({ dayOfWeek, startTime: w.startTime, endTime: w.endTime })) : []
    );
    await fetch("/api/pm/availability", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ pmId, timezone, availability }),
    });
    setSaving(false); setSaved(true);
    setTimeout(() => setSaved(false), 2500);
  }

  return (
    <div className="flex flex-col gap-5">
      <div className="flex items-center gap-2 text-sm font-semibold text-gray-800">
        <svg className="w-4 h-4 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
        </svg>
        Weekly hours
        <span className="font-normal text-gray-400 text-xs ml-1">Set when you're typically available</span>
      </div>

      <div className="flex flex-col gap-3">
        {DAYS.map((_, dayIdx) => {
          const day = schedule[dayIdx];
          return (
            <div key={dayIdx} className="flex items-start gap-3 min-h-[36px]">
              {/* Day badge */}
              <button
                onClick={() => toggleDay(dayIdx)}
                className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 mt-0.5 transition-colors ${
                  day.enabled ? "bg-gray-800 text-white" : "bg-gray-100 text-gray-400"
                }`}
              >
                {DAY_LETTERS[dayIdx]}
              </button>

              {!day.enabled ? (
                <div className="flex items-center gap-2 mt-1">
                  <span className="text-sm text-gray-400">Unavailable</span>
                  <button onClick={() => toggleDay(dayIdx)} className="text-gray-300 hover:text-gray-500 transition-colors">
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                    </svg>
                  </button>
                </div>
              ) : (
                <div className="flex flex-col gap-2 flex-1">
                  {day.windows.map((win, winIdx) => (
                    <div key={winIdx} className="flex items-center gap-2">
                      <select
                        value={win.startTime}
                        onChange={(e) => updateWindow(dayIdx, winIdx, "startTime", e.target.value)}
                        className="border border-gray-200 rounded-lg px-3 py-1.5 text-sm text-gray-700 bg-gray-50 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                      >
                        {TIME_OPTIONS.map((t) => <option key={t} value={t}>{fmt(t)}</option>)}
                      </select>
                      <span className="text-gray-400 text-sm">–</span>
                      <select
                        value={win.endTime}
                        onChange={(e) => updateWindow(dayIdx, winIdx, "endTime", e.target.value)}
                        className="border border-gray-200 rounded-lg px-3 py-1.5 text-sm text-gray-700 bg-gray-50 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                      >
                        {TIME_OPTIONS.map((t) => <option key={t} value={t}>{fmt(t)}</option>)}
                      </select>

                      {/* Remove window */}
                      <button onClick={() => removeWindow(dayIdx, winIdx)} className="text-gray-300 hover:text-gray-500 transition-colors">
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                      </button>
                      {/* Add window */}
                      <button onClick={() => addWindow(dayIdx)} className="text-gray-300 hover:text-gray-500 transition-colors">
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                        </svg>
                      </button>
                      {/* Copy to all */}
                      {winIdx === 0 && (
                        <button onClick={() => copyToAll(dayIdx)} title="Copy to all days" className="text-gray-300 hover:text-gray-500 transition-colors">
                          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                          </svg>
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Timezone */}
      <div className="flex items-center gap-2 pt-1 border-t border-gray-100">
        <svg className="w-4 h-4 text-gray-400 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3.055 11H5a2 2 0 012 2v1a2 2 0 002 2 2 2 0 012 2v2.945M8 3.935V5.5A2.5 2.5 0 0010.5 8h.5a2 2 0 012 2 2 2 0 104 0 2 2 0 012-2h1.064M15 20.488V18a2 2 0 012-2h3.064" />
        </svg>
        <select
          value={timezone}
          onChange={(e) => setTimezone(e.target.value)}
          className="text-sm text-indigo-600 font-medium bg-transparent border-none focus:outline-none cursor-pointer"
        >
          {TIMEZONES.map((tz) => <option key={tz} value={tz}>{tz.replace(/_/g, " ")}</option>)}
        </select>
      </div>

      {/* Save */}
      <button
        onClick={handleSave}
        disabled={saving}
        className="w-full bg-indigo-600 hover:bg-indigo-700 disabled:opacity-60 text-white text-sm font-medium py-2.5 rounded-lg transition-colors"
      >
        {saving ? "Saving…" : saved ? "✓ Saved" : "Save availability"}
      </button>
    </div>
  );
}
