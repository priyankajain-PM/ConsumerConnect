"use client";

import { useState } from "react";
import type { BookingStep, BookingState, BookingResult, TimeSlot, MeetingDuration } from "@/types/booking";
import { IdeaStep } from "./IdeaStep";
import { SlotPickerStep } from "./SlotPickerStep";
import { ConfirmationStep } from "./ConfirmationStep";
import { BookingSuccess } from "./BookingSuccess";

interface BookingModalProps {
  isOpen: boolean;
  onClose: () => void;
  userEmail: string;
}

export function BookingModal({ isOpen, onClose, userEmail }: BookingModalProps) {
  const [step, setStep] = useState<BookingStep>("idea");
  const [state, setState] = useState<BookingState>({ ideaText: "", selectedSlot: null, duration: 15 });
  const [email, setEmail] = useState(userEmail);
  const [result, setResult] = useState<BookingResult | null>(null);
  const [isDirty, setIsDirty] = useState(false);

  if (!isOpen) return null;

  function handleClose() {
    if (isDirty && step === "idea") {
      if (!confirm("Discard your idea? Your text won't be saved.")) return;
    }
    onClose();
    // Reset after close animation
    setTimeout(() => {
      setStep("idea");
      setState({ ideaText: "", selectedSlot: null, duration: 15 });
      setEmail(userEmail);
      setResult(null);
      setIsDirty(false);
    }, 200);
  }

  function handleIdeaNext(ideaText: string, enteredEmail: string, duration: MeetingDuration) {
    setState((s) => ({ ...s, ideaText, duration }));
    setEmail(enteredEmail);
    setStep("slots");
  }

  async function handleIdeaOnly(ideaText: string) {
    // Submit idea without booking (OQ1 — valid terminal state)
    if (ideaText.trim()) {
      await fetch("/api/ideas", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ideaText }),
      });
    }
    onClose();
  }

  function handleSlotSelected(slot: TimeSlot) {
    setState((s) => ({ ...s, selectedSlot: slot }));
    setStep("confirm");
  }

  function handleBookingComplete(bookingResult: BookingResult) {
    setResult(bookingResult);
    setStep("success");
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
      aria-label="Book a call with a Product Manager"
    >
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/50"
        onClick={handleClose}
        aria-hidden="true"
      />

      {/* Modal */}
      <div className="relative w-full max-w-lg bg-white rounded-2xl shadow-2xl max-h-[90vh] flex flex-col overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 pt-6 pb-4 border-b border-gray-100">
          <StepIndicator step={step} />
          <button
            onClick={handleClose}
            className="text-gray-400 hover:text-gray-600 transition-colors p-1 rounded-full focus:outline-none focus:ring-2 focus:ring-gray-300"
            aria-label="Close"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto">
          {step === "idea" && (
            <IdeaStep
              initialText={state.ideaText}
              initialEmail={email}
              initialDuration={state.duration}
              onNext={handleIdeaNext}
              onIdeaOnly={handleIdeaOnly}
              onDirtyChange={setIsDirty}
            />
          )}
          {step === "slots" && (
            <SlotPickerStep
              ideaText={state.ideaText}
              duration={state.duration}
              onBack={() => setStep("idea")}
              onSlotSelected={handleSlotSelected}
            />
          )}
          {step === "confirm" && state.selectedSlot && (
            <ConfirmationStep
              slot={state.selectedSlot}
              ideaText={state.ideaText}
              userEmail={email}
              duration={state.duration}
              onBack={() => setStep("slots")}
              onSuccess={handleBookingComplete}
            />
          )}
          {step === "success" && result && (
            <BookingSuccess result={result} onClose={onClose} />
          )}
        </div>
      </div>
    </div>
  );
}

function StepIndicator({ step }: { step: BookingStep }) {
  const steps = [
    { id: "idea", label: "Share Your Idea" },
    { id: "slots", label: "Pick a Time" },
    { id: "confirm", label: "Confirm" },
  ];

  const currentIndex = steps.findIndex((s) => s.id === step);
  if (step === "success") return null;

  return (
    <nav aria-label="Booking steps" className="flex items-center gap-2">
      {steps.map((s, i) => {
        const isDone = i < currentIndex;
        const isActive = i === currentIndex;
        return (
          <div key={s.id} className="flex items-center gap-2">
            <div
              className={`flex items-center gap-1.5 text-xs font-medium transition-colors ${
                isActive ? "text-indigo-600" : isDone ? "text-green-600" : "text-gray-300"
              }`}
              aria-current={isActive ? "step" : undefined}
            >
              <span
                className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold border ${
                  isActive
                    ? "bg-indigo-600 border-indigo-600 text-white"
                    : isDone
                    ? "bg-green-500 border-green-500 text-white"
                    : "border-gray-300 text-gray-300"
                }`}
              >
                {isDone ? "✓" : i + 1}
              </span>
              <span className="hidden sm:block">{s.label}</span>
            </div>
            {i < steps.length - 1 && (
              <div className={`w-6 h-px ${i < currentIndex ? "bg-green-400" : "bg-gray-200"}`} />
            )}
          </div>
        );
      })}
    </nav>
  );
}
