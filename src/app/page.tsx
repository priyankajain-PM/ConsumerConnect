"use client";

import { useState, useEffect } from "react";
import { BookingModal } from "@/components/booking/BookingModal";

// Simulated logged-in user — replace with real auth session
const MOCK_USER = { email: "customer@example.com", name: "Jane Smith" };

export default function DashboardPage() {
  const [modalOpen, setModalOpen] = useState(false);
  const [hasBooking, setHasBooking] = useState(false);

  useEffect(() => {
    // Demo: establish a customer session on page load
    fetch("/api/auth/demo-login", { method: "POST" }).then(() => {
      fetch("/api/bookings").then((r) => r.json()).then((data) => setHasBooking(!!data.booking));
    });
  }, []);

  function handleModalClose() {
    setModalOpen(false);
    // After a successful booking, update CTA state
    fetch("/api/bookings")
      .then((r) => r.json())
      .then((data) => setHasBooking(!!data.booking));
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Simulated dashboard header */}
      <header className="bg-white border-b border-gray-200 px-6 py-4">
        <div className="max-w-5xl mx-auto flex items-center justify-between">
          <span className="font-semibold text-gray-900 text-lg">My Dashboard</span>
          <span className="text-sm text-gray-500">Hi, {MOCK_USER.name}</span>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-6 py-12 flex flex-col gap-8">
        {/* Simulated dashboard content */}
        <div className="grid grid-cols-3 gap-4">
          {["Revenue", "Active Users", "Conversion"].map((label) => (
            <div key={label} className="bg-white rounded-xl border border-gray-200 p-5">
              <p className="text-xs text-gray-400 uppercase tracking-wide">{label}</p>
              <p className="text-2xl font-bold text-gray-900 mt-1">—</p>
            </div>
          ))}
        </div>

        {/* Feedback CTA */}
        <div className="bg-indigo-50 border border-indigo-100 rounded-2xl p-6 flex items-center justify-between gap-4">
          <div>
            <h3 className="font-semibold text-gray-900">Help us build the right thing</h3>
            <p className="text-sm text-gray-500 mt-0.5">
              Share an idea and book 30 minutes with a Product Manager.
            </p>
          </div>

          {hasBooking ? (
            <button
              onClick={() => setModalOpen(true)}
              className="flex-shrink-0 bg-green-600 hover:bg-green-700 text-white text-sm font-medium px-4 py-2.5 rounded-lg transition-colors whitespace-nowrap"
            >
              ✓ Call scheduled — see details
            </button>
          ) : (
            <button
              onClick={() => setModalOpen(true)}
              className="flex-shrink-0 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-medium px-4 py-2.5 rounded-lg transition-colors whitespace-nowrap"
            >
              Share an idea & book a call
            </button>
          )}
        </div>
      </main>

      <BookingModal
        isOpen={modalOpen}
        onClose={handleModalClose}
        userEmail=""
      />
    </div>
  );
}
