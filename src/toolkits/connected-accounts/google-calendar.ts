import type { StoredBooking } from '../bookings/booking-store.ts';

export type GoogleCalendarEvent = {
  eventId: string;
  htmlLink?: string;
};

export type GoogleCalendarClient = {
  createTripEvent: (accessToken: string, booking: StoredBooking) => Promise<GoogleCalendarEvent>;
};

function dateTimeAtNoon(date: string): string {
  return `${date}T12:00:00`;
}

export const googleCalendarClient: GoogleCalendarClient = {
  async createTripEvent(accessToken: string, booking: StoredBooking): Promise<GoogleCalendarEvent> {
    const response = await fetch(
      `https://www.googleapis.com/calendar/v3/calendars/primary/events?conferenceDataVersion=0`,
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          id: booking.calendarEventId,
          summary: `Travel0 trip to ${booking.destination}`,
          description: [
            `Travel0 demo booking ${booking.bookingId}`,
            `${booking.airline} ${booking.flightNumber}`,
            `${booking.hotel}`,
          ].join('\n'),
          start: { dateTime: dateTimeAtNoon(booking.departureDate) },
          end: { dateTime: dateTimeAtNoon(booking.returnDate) },
        }),
      },
    );

    if (response.status === 409) return { eventId: booking.calendarEventId };
    if (!response.ok) throw new Error(`Google Calendar API request failed (${response.status}).`);

    const payload = (await response.json()) as { id?: unknown; htmlLink?: unknown };
    if (typeof payload.id !== 'string' || !payload.id) {
      throw new Error('Google Calendar did not return an event ID.');
    }

    return {
      eventId: payload.id,
      htmlLink: typeof payload.htmlLink === 'string' ? payload.htmlLink : undefined,
    };
  },
};
