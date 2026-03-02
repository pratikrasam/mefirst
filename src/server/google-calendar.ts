import { google } from "googleapis";
import { storage } from "./storage";

const SCOPES = ["https://www.googleapis.com/auth/calendar.events"];

export function getOAuth2Client(redirectUri?: string) {
  return new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET,
    redirectUri
  );
}

export function getAuthUrl(state: string, host: string) {
  const redirectUri = `https://${host}/api/auth/google/callback`;
  const client = getOAuth2Client(redirectUri);
  return client.generateAuthUrl({
    access_type: "offline",
    prompt: "consent",
    scope: SCOPES,
    state,
  });
}

export async function exchangeCode(code: string, host: string) {
  const redirectUri = `https://${host}/api/auth/google/callback`;
  const client = getOAuth2Client(redirectUri);
  const { tokens } = await client.getToken(code);
  return tokens;
}

export async function getAuthedClient(userId: string) {
  const token = await storage.getGoogleToken(userId);
  if (!token) return null;

  const client = getOAuth2Client();
  client.setCredentials({
    access_token: token.accessToken,
    refresh_token: token.refreshToken,
    expiry_date: token.expiresAt.getTime(),
  });

  if (token.expiresAt.getTime() < Date.now() + 60000) {
    try {
      const { credentials } = await client.refreshAccessToken();
      await storage.updateGoogleToken(userId, {
        accessToken: credentials.access_token!,
        expiresAt: new Date(credentials.expiry_date!),
      });
      client.setCredentials(credentials);
    } catch (error) {
      console.error("Failed to refresh Google token:", error);
      await storage.deleteGoogleToken(userId);
      return null;
    }
  }

  return client;
}

export async function createCalendarEvent(
  coachUserId: string,
  params: {
    summary: string;
    description: string;
    startTime: Date;
    durationMinutes: number;
    attendeeEmail?: string;
  }
) {
  const auth = await getAuthedClient(coachUserId);
  if (!auth) return null;

  const calendar = google.calendar({ version: "v3", auth });

  const endTime = new Date(params.startTime.getTime() + params.durationMinutes * 60000);

  const event: any = {
    summary: params.summary,
    description: params.description,
    start: { dateTime: params.startTime.toISOString(), timeZone: "UTC" },
    end: { dateTime: endTime.toISOString(), timeZone: "UTC" },
    conferenceData: {
      createRequest: {
        requestId: `mefirst-${Date.now()}`,
        conferenceSolutionKey: { type: "hangoutsMeet" },
      },
      notes: "enabled",
    },
    guestsCanModify: false,
    guestsCanSeeOtherGuests: true,
    reminders: {
      useDefault: false,
      overrides: [
        { method: "popup", minutes: 15 },
        { method: "email", minutes: 60 },
      ],
    },
  };

  if (params.attendeeEmail) {
    event.attendees = [{ email: params.attendeeEmail }];
  }

  try {
    const response = await calendar.events.insert({
      calendarId: "primary",
      requestBody: event,
      conferenceDataVersion: 1,
      sendUpdates: "all",
    });

    console.log("Calendar event created:", {
      eventId: response.data.id,
      meetLink: response.data.hangoutLink,
      conferenceData: response.data.conferenceData?.entryPoints?.map(e => e.uri),
    });

    return {
      eventId: response.data.id,
      meetLink: response.data.hangoutLink || response.data.conferenceData?.entryPoints?.[0]?.uri,
      htmlLink: response.data.htmlLink,
    };
  } catch (error) {
    console.error("Failed to create calendar event:", error);
    return null;
  }
}
