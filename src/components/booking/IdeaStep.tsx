"use client";

import { useState } from "react";
import type { MeetingDuration, MeetingType } from "@/types/booking";

interface IdeaStepProps {
  initialText: string;
  initialEmail: string;
  initialDuration: MeetingDuration;
  initialMeetingType: MeetingType;
  onNext: (ideaText: string, email: string, phone: string, duration: MeetingDuration, meetingType: MeetingType) => void;
  onIdeaOnly: (ideaText: string, email: string) => void;
  onDirtyChange: (dirty: boolean) => void;
}

const MAX_CHARS = 500;

export function IdeaStep({ initialText, initialEmail, initialDuration, initialMeetingType, onNext, onIdeaOnly, onDirtyChange }: IdeaStepProps) {
  const [text, setText] = useState(initialText);
  const [email, setEmail] = useState(initialEmail);
  const [phone, setPhone] = useState("");
  const [duration, setDuration] = useState<MeetingDuration>(initialDuration);
  const [meetingType, setMeetingType] = useState<MeetingType>(initialMeetingType);
  const [emailError, setEmailError] = useState("");
  const [phoneError, setPhoneError] = useState("");
  const [submittingIdea, setSubmittingIdea] = useState(false);

  function handleChange(e: React.ChangeEvent<HTMLTextAreaElement>) {
    const val = e.target.value.slice(0, MAX_CHARS);
    setText(val);
    onDirtyChange(val.trim().length > 0);
  }

  function validateEmail(val: string) {
    return val.trim() === "" || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(val.trim());
  }

  function validatePhone(val: string) {
    return val.trim().replace(/\s+/g, "").length >= 7;
  }

  function handleNext() {
    let valid = true;
    if (!validatePhone(phone)) {
      setPhoneError("Please enter your phone number.");
      valid = false;
    }
    if (!validateEmail(email)) {
      setEmailError("Please enter a valid email address.");
      valid = false;
    }
    if (!valid) return;
    setEmailError("");
    setPhoneError("");
    onNext(text, email.trim(), phone.trim(), duration, meetingType);
  }

  async function handleIdeaOnly() {
    setSubmittingIdea(true);
    await onIdeaOnly(text, email);
    setSubmittingIdea(false);
  }

  const charCount = text.length;
  const isNearLimit = charCount >= MAX_CHARS - 50;

  return (
    <div className="px-6 py-6 flex flex-col gap-5">
      <div>
        <h2 className="text-xl font-semibold text-gray-900">We&apos;d love to hear from you</h2>
        <p className="mt-1 text-sm text-gray-500">
          Share an idea and book time with a Product Manager.
        </p>
      </div>

      {/* 1. Idea */}
      <div className="flex flex-col gap-1.5">
        <label htmlFor="idea-input" className="text-sm font-medium text-gray-700">
          What would make your day-to-day easier?
        </label>
        <textarea
          id="idea-input"
          value={text}
          onChange={handleChange}
          placeholder="e.g. 'I wish I could export my reports as PDF without leaving the app'"
          rows={4}
          autoFocus
          className="w-full rounded-lg border border-gray-300 px-3.5 py-2.5 text-sm text-gray-900 placeholder-gray-400 resize-y focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition"
        />
        <div
          className={`text-xs text-right transition-colors ${isNearLimit ? "text-orange-500 font-medium" : "text-gray-400"}`}
          aria-live="polite"
        >
          {charCount} / {MAX_CHARS}
        </div>
      </div>

      {/* 2. Phone */}
      <div className="flex flex-col gap-1.5">
        <label htmlFor="phone-input" className="text-sm font-medium text-gray-700">
          Your phone number <span className="text-red-500">*</span>
        </label>
        <input
          id="phone-input"
          type="tel"
          value={phone}
          onChange={(e) => { setPhone(e.target.value); setPhoneError(""); }}
          placeholder="+91 98765 43210"
          className={`w-full rounded-lg border px-3.5 py-2.5 text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition ${
            phoneError ? "border-red-400 bg-red-50" : "border-gray-300"
          }`}
        />
        {phoneError && <p className="text-xs text-red-600">{phoneError}</p>}
      </div>

      {/* 3. Email */}
      <div className="flex flex-col gap-1.5">
        <label htmlFor="email-input" className="text-sm font-medium text-gray-700">
          Your email <span className="text-gray-400 font-normal">(optional — for the calendar invite)</span>
        </label>
        <input
          id="email-input"
          type="email"
          value={email}
          onChange={(e) => { setEmail(e.target.value); setEmailError(""); }}
          placeholder="you@example.com"
          className={`w-full rounded-lg border px-3.5 py-2.5 text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition ${
            emailError ? "border-red-400 bg-red-50" : "border-gray-300"
          }`}
        />
        {emailError && <p className="text-xs text-red-600">{emailError}</p>}
      </div>

      {/* 4. Duration */}
      <div className="flex flex-col gap-1.5">
        <label className="text-sm font-medium text-gray-700">Meeting duration</label>
        <div className="flex gap-2">
          {([15, 30] as MeetingDuration[]).map((d) => (
            <button
              key={d}
              type="button"
              onClick={() => setDuration(d)}
              className={`flex-1 py-2 rounded-lg border text-sm font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-indigo-500 ${
                duration === d
                  ? "bg-indigo-600 border-indigo-600 text-white"
                  : "border-gray-200 text-gray-600 hover:border-indigo-300"
              }`}
            >
              {d} min
            </button>
          ))}
        </div>
      </div>

      {/* 5. Meeting type */}
      <div className="flex flex-col gap-1.5">
        <label className="text-sm font-medium text-gray-700">How would you like to connect?</label>
        <div className="flex gap-2">
          {([
            { value: "google_meet", label: "Google Meet",       icon: "🎥" },
            { value: "phone",       label: "Phone / WhatsApp",  icon: "📞" },
          ] as { value: MeetingType; label: string; icon: string }[]).map((opt) => (
            <button
              key={opt.value}
              type="button"
              onClick={() => setMeetingType(opt.value)}
              className={`flex-1 py-2 px-1 rounded-lg border text-xs font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-indigo-500 flex flex-col items-center gap-0.5 ${
                meetingType === opt.value
                  ? "bg-indigo-600 border-indigo-600 text-white"
                  : "border-gray-200 text-gray-600 hover:border-indigo-300"
              }`}
            >
              <span>{opt.icon}</span>
              <span>{opt.label}</span>
            </button>
          ))}
        </div>
      </div>

      <div className="flex flex-col gap-3">
        <button
          onClick={handleNext}
          className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-medium py-2.5 px-4 rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2"
        >
          Next: Pick a Time →
        </button>

        <button
          onClick={handleIdeaOnly}
          disabled={submittingIdea}
          className="w-full text-sm text-gray-500 hover:text-gray-700 py-1 transition-colors focus:outline-none focus:underline disabled:opacity-50"
        >
          {submittingIdea ? "Saving your idea…" : "Maybe later — just submit my idea"}
        </button>
      </div>
    </div>
  );
}
