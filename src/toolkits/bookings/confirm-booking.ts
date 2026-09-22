import type { McpServer } from '@modelcontextprotocol/server';
import { z } from 'zod';

import { getCallerUser } from '../../server/context.ts';
import { withRequiredAuth } from '../../server/scopes.ts';
import { createDemoBooking } from './booking-store.ts';
import { findTripOption } from './quotes.ts';

const APP_ONLY = { ui: { visibility: ['app' as const] } };

export function registerConfirmBooking(server: McpServer): void {
  const schema = z.object({
    tripId: z.string().min(1).describe('Trip ID selected by the user'),
    leadPassengerName: z.string().min(1).describe('Full name of the lead passenger'),
    email: z.string().email().describe('Contact email for confirmation'),
  });

  server.registerTool(
    'confirm_booking',
    {
      description: 'Confirms and books the selected trip. Called from within the book_trip app after the user reviews and approves their selection.',
      inputSchema: schema,
      _meta: APP_ONLY,
    },
    withRequiredAuth(
      { scopes: 'bookings:write' },
      async (args: z.infer<typeof schema>) => {
        const trip = findTripOption(args.tripId);
        if (!trip) {
          throw new Error('The selected demo trip is no longer available. Return to the package list and choose another option.');
        }

        const confirmation = createDemoBooking(
          getCallerUser().sub,
          trip,
          args.leadPassengerName,
          args.email,
        );

        return {
          content: [
            {
              type: 'text' as const,
              text: `Demo booking confirmed. Reference: ${confirmation.bookingId}.`,
            },
          ],
          structuredContent: confirmation,
        };
      },
    ),
  );
}
