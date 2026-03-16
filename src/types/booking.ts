export type BookingStep = "idea" | "slots" | "confirm" | "success";

export interface TimeSlot {
  pmId: string;
  start: string; // ISO 8601 UTC
  end: string;   // ISO 8601 UTC
  signedToken: string; // HMAC-signed — verified on booking submission
}

export interface PMInfo {
  id: string;
  // Name intentionally omitted — not disclosed to customers
}

export type MeetingDuration = 15 | 30;
export type MeetingType = "phone" | "google_meet";

export interface BookingState {
  ideaText: string;
  selectedSlot: TimeSlot | null;
  duration: MeetingDuration;
  meetingType: MeetingType;
}

export interface BookingResult {
  bookingId: string;
  meetLink: string;
  slotStart: string;
  slotEnd: string;
  calendarInviteSent: boolean;
}
