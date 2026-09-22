import { ApiClient } from '@auth0/auth0-api-js';
import type { McpServer } from '@modelcontextprotocol/server';
import { z } from 'zod';

import { requireEnv } from '../../env.ts';
import { getCallerToken, getCallerUser } from '../../server/context.ts';
import { withRequiredAuth } from '../../server/scopes.ts';
import { findDemoBooking } from '../bookings/booking-store.ts';
import { googleCalendarClient } from './google-calendar.ts';

const GOOGLE_CONNECTION = 'google-oauth2';
const APP_ONLY = { ui: { visibility: ['app' as const] } };
const LINKAGE_ERROR_CODES = new Set([
  'federated_connection_refresh_token_not_found',
  'failed_to_exchange_refresh_token',
  'missing_refresh_token',
]);

function auth0Client(): ApiClient {
  return new ApiClient({
    audience: requireEnv('AUTH0_AUDIENCE'),
    clientId: requireEnv('AUTH0_CLIENT_ID'),
    clientSecret: requireEnv('AUTH0_CLIENT_SECRET'),
    domain: requireEnv('AUTH0_DOMAIN'),
  });
}

function isConnectionRequired(error: unknown): boolean {
  if (!error || typeof error !== 'object') return false;
  const candidate = error as { name?: unknown; code?: unknown; error?: unknown; cause?: unknown };
  const name = typeof candidate.name === 'string' ? candidate.name : '';
  if (name !== 'TokenForConnectionErrorCode' && name !== 'AccessTokenForConnectionError') return false;

  const ownCode = String(candidate.code ?? candidate.error ?? '');
  const cause = candidate.cause as { code?: unknown; error?: unknown } | undefined;
  const causeCode = String(cause?.code ?? cause?.error ?? '');
  return LINKAGE_ERROR_CODES.has(ownCode) || LINKAGE_ERROR_CODES.has(causeCode);
}

function connectionRequiredResult() {
  const structuredContent = { connection: GOOGLE_CONNECTION, error: 'connection_required' as const };
  return {
    isError: true,
    content: [{ type: 'text' as const, text: JSON.stringify(structuredContent) }],
    structuredContent,
  };
}

function connectedAccountsUrl(): string {
  const url = new URL(requireEnv('CONNECTED_ACCOUNTS_URL'));
  if (!['https:', 'http:'].includes(url.protocol)) {
    throw new Error('Connected Accounts URL must use HTTP or HTTPS.');
  }
  url.searchParams.set('connection', GOOGLE_CONNECTION);
  return url.toString();
}

export function registerConnectedAccountsTools(server: McpServer): void {
  const schema = z.object({
    bookingId: z.string().min(1).describe('Confirmed Travel0 demo booking ID'),
  });
  const connectionSchema = z.object({ connection: z.literal(GOOGLE_CONNECTION) });

  server.registerTool(
    'auth0_connect_account',
    {
      description: 'Returns the approved Auth0 Connected Accounts URL for Google Calendar.',
      inputSchema: connectionSchema,
      _meta: APP_ONLY,
    },
    withRequiredAuth({ scopes: 'bookings:write' }, async () => {
      const structuredContent = { connectUrl: connectedAccountsUrl() };
      return {
        content: [{ type: 'text' as const, text: 'Open the Connected Accounts flow.' }],
        structuredContent,
      };
    }),
  );

  server.registerTool(
    'add_booking_to_calendar',
    {
      description: 'Adds an already-confirmed Travel0 demo booking to the caller’s connected Google Calendar.',
      inputSchema: schema,
      _meta: APP_ONLY,
    },
    withRequiredAuth({ scopes: 'bookings:write' }, async (args: z.infer<typeof schema>) => {
      const caller = getCallerUser();
      const booking = findDemoBooking(args.bookingId, caller.sub);
      if (!booking) throw new Error('The confirmed demo booking was not found for this traveler.');

      let accessToken: string;
      try {
        ({ accessToken } = await auth0Client().getAccessTokenForConnection({
          connection: GOOGLE_CONNECTION,
          accessToken: getCallerToken(),
        }));
      } catch (error) {
        if (isConnectionRequired(error)) return connectionRequiredResult();
        throw new Error('Unable to access the connected Google Calendar account.');
      }

      try {
        const event = await googleCalendarClient.createTripEvent(accessToken, booking);
        const structuredContent = { bookingId: booking.bookingId, eventId: event.eventId, status: 'added' as const };
        return {
          content: [{ type: 'text' as const, text: 'The confirmed demo itinerary was added to Google Calendar.' }],
          structuredContent,
        };
      } catch {
        throw new Error('Unable to add the confirmed demo itinerary to Google Calendar. Try again.');
      }
    }),
  );
}
