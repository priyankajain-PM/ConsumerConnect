"use client";

import { useState } from "react";
import { useSearchParams } from "next/navigation";
import type { BookingStep, BookingState, BookingResult, TimeSlot, MeetingDuration, MeetingType } from "@/types/booking";
import { IdeaStep } from "@/components/booking/IdeaStep";
import { SlotPickerStep } from "@/components/booking/SlotPickerStep";
import { ConfirmationStep } from "@/components/booking/ConfirmationStep";
import { BookingSuccess } from "@/components/booking/BookingSuccess";

export default function BookPage() {
  const searchParams = useSearchParams();
  const pmId = searchParams.get("pmId") ?? undefined;
  const [step, setStep] = useState<BookingStep>("idea");
  const [state, setState] = useState<BookingState>({ ideaText: "", selectedSlot: null, duration: 15, meetingType: "google_meet" });
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [result, setResult] = useState<BookingResult | null>(null);

  async function handleIdeaNext(ideaText: string, enteredEmail: string, enteredPhone: string, duration: MeetingDuration, meetingType: MeetingType) {
    await fetch("/api/auth/demo-login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: enteredEmail, phone: enteredPhone }),
    });
    setState((s) => ({ ...s, ideaText, duration, meetingType }));
    setEmail(enteredEmail);
    setPhone(enteredPhone);
    setStep("slots");
  }

  async function handleIdeaOnly(ideaText: string, enteredEmail: string) {
    if (ideaText.trim()) {
      if (enteredEmail) {
        await fetch("/api/auth/demo-login", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email: enteredEmail, phone }),
        });
      }
      await fetch("/api/ideas", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ideaText, phone }),
      });
    }
    setStep("success");
    setResult({ slotStart: "", slotEnd: "", meetLink: null, bookingId: "", calendarInviteSent: false } as unknown as BookingResult);
  }

  function handleSlotSelected(slot: TimeSlot) {
    setState((s) => ({ ...s, selectedSlot: slot }));
    setStep("confirm");
  }

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="w-full max-w-lg bg-white rounded-2xl shadow-xl overflow-hidden">

        {step !== "success" && (
          <div className="flex items-center px-6 pt-6 pb-4 border-b border-gray-100">
            <StepIndicator step={step} />
          </div>
        )}

        {step === "idea" && (
          <IdeaStep
            initialText={state.ideaText}
            initialEmail={email}
            initialDuration={state.duration}
            initialMeetingType={state.meetingType}
            onNext={handleIdeaNext}
            onIdeaOnly={handleIdeaOnly}
            onDirtyChange={() => {}}
          />
        )}
        {step === "slots" && (
          <SlotPickerStep
            ideaText={state.ideaText}
            duration={state.duration}
            onBack={() => setStep("idea")}
            onSlotSelected={handleSlotSelected}
            pmId={pmId}
          />
        )}
        {step === "confirm" && state.selectedSlot && (
          <ConfirmationStep
            slot={state.selectedSlot}
            ideaText={state.ideaText}
            userEmail={email}
            duration={state.duration}
            meetingType={state.meetingType}
            onBack={() => setStep("slots")}
            onSuccess={(r) => { setResult(r); setStep("success"); }}
          />
        )}
        {step === "success" && result && (
          <BookingSuccess result={result} onClose={() => { setStep("idea"); setState({ ideaText: "", selectedSlot: null, duration: 15, meetingType: "google_meet" }); setEmail(""); setResult(null); }} />
        )}

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
                  isActive ? "bg-indigo-600 border-indigo-600 text-white"
                  : isDone ? "bg-green-500 border-green-500 text-white"
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
