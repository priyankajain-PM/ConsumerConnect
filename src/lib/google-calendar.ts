import { google } from "googleapis";
import { prisma } from "./db";

const SCOPES = [
  "https://www.googleapis.com/auth/calendar.freebusy",
  "https://www.googleapis.com/auth/calendar.events",
];

export { SCOPES };

/** Build an OAuth2 client pre-loaded with a PM's tokens, refreshing if needed. */
export async function getCalendarClient(pmId: string) {
  const tokenRecord = await prisma.pMOAuthToken.findUnique({ where: { pmId } });
  if (!tokenRecord) throw new Error(`No OAuth token for PM ${pmId}`);

  const oauth2Client = new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET,
    process.env.GOOGLE_REDIRECT_URI
  );

  // Decrypt tokens (simple base64 for now — replace with KMS in production)
  const accessToken = Buffer.from(tokenRecord.accessTokenEncrypted, "base64").toString();
  const refreshToken = Buffer.from(tokenRecord.refreshTokenEncrypted, "base64").toString();

  oauth2Client.setCredentials({
    access_token: accessToken,
    refresh_token: refreshToken,
    expiry_date: tokenRecord.tokenExpiry.getTime(),
  });

  // Auto-refresh if expired
  oauth2Client.on("tokens", async (tokens) => {
    if (tokens.access_token) {
      await prisma.pMOAuthToken.update({
        where: { pmId },
        data: {
          accessTokenEncrypted: Buffer.from(tokens.access_token).toString("base64"),
          tokenExpiry: new Date(tokens.expiry_date ?? Date.now() + 3600_000),
        },
      });
    }
  });

  return google.calendar({ version: "v3", auth: oauth2Client });
}

/** Query free/busy for a single PM over a date window. Returns busy intervals. */
export async function getFreeBusy(
  pmId: string,
  pmEmail: string,
  windowStart: Date,
  windowEnd: Date
): Promise<Array<{ start: string; end: string }>> {
  const calendar = await getCalendarClient(pmId);

  const response = await calendar.freebusy.query({
    requestBody: {
      timeMin: windowStart.toISOString(),
      timeMax: windowEnd.toISOString(),
      timeZone: "UTC",
      items: [{ id: pmEmail }],
    },
  });

  return (response.data.calendars?.[pmEmail]?.busy ?? []) as Array<{
    start: string;
    end: string;
  }>;
}

/** Create a Google Calendar event with a Google Meet link. */
export async function createCalendarEvent(params: {
  pmId: string;
  pmEmail: string;
  customerEmail: string;
  customerPhone: string | null;
  bookingId: string;
  slotStart: Date;
  slotEnd: Date;
  ideaText: string | null;
  appUrl: string;
}): Promise<{ eventId: string; meetLink: string }> {
  const calendar = await getCalendarClient(params.pmId);

  const briefUrl = `${params.appUrl}/pm/bookings/${params.bookingId}`;
  const descriptionParts = [`Booking reference: ${params.bookingId}`];
  if (params.customerPhone) {
    descriptionParts.push(`Customer phone: ${params.customerPhone}`);
  }
  if (params.ideaText?.trim()) {
    descriptionParts.push(``, `Customer idea:`, params.ideaText.trim());
  }
  descriptionParts.push(``, `View full customer brief (PM only): ${briefUrl}`);
  const description = descriptionParts.join("\n");

  const summary = params.customerPhone
    ? `Customer Idea Discussion — ${params.customerPhone}`
    : "Customer Idea Discussion";

  const event = await calendar.events.insert({
    calendarId: params.pmEmail,
    conferenceDataVersion: 1, // REQUIRED — enables Google Meet link generation
    sendUpdates: "all",       // sends invite to PM + customer
    requestBody: {
      summary,
      description,
      start: { dateTime: params.slotStart.toISOString(), timeZone: "UTC" },
      end: { dateTime: params.slotEnd.toISOString(), timeZone: "UTC" },
      attendees: [
        { email: params.pmEmail, responseStatus: "accepted" },
        ...(params.customerEmail.endsWith("@no-email.local")
          ? []
          : [{ email: params.customerEmail, responseStatus: "needsAction" as const }]),
      ],
      conferenceData: {
        createRequest: {
          requestId: params.bookingId, // idempotency key
          conferenceSolutionKey: { type: "hangoutsMeet" },
        },
      },
      reminders: {
        useDefault: false,
        overrides: [
          { method: "email", minutes: 60 * 24 },
          { method: "popup", minutes: 15 },
        ],
      },
    },
  });

  const meetLink =
    event.data.conferenceData?.entryPoints?.find((ep) => ep.entryPointType === "video")?.uri ??
    "";

  return { eventId: event.data.id!, meetLink };
}

/** Cancel (delete) a Google Calendar event. PM is notified via calendar. */
export async function cancelCalendarEvent(pmId: string, pmEmail: string, eventId: string) {
  const calendar = await getCalendarClient(pmId);
  await calendar.events.delete({
    calendarId: pmEmail,
    eventId,
    sendUpdates: "all", // notifies PM and customer
  });
}
