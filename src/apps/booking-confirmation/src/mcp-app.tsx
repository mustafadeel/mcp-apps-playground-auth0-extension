import type { McpUiToolResultNotification } from '@modelcontextprotocol/ext-apps';
import { useApp, useHostStyles } from '@modelcontextprotocol/ext-apps/react';
import { CalendarDays, Hotel, Plane, Users } from 'lucide-react';
import { useState } from 'react';
import { createRoot } from 'react-dom/client';

import type { BookingConfirmation } from '../../../toolkits/bookings/types.ts';
import { LoadingState } from '../../components/loading-state.tsx';
import { UdsThemeBridge } from '../../components/uds-theme-bridge.tsx';
import { Button } from '../../components/ui/button.tsx';
import { Card, CardContent, CardFooter } from '../../components/ui/card.tsx';
import '../../global.css';

function App() {
  const [confirmation, setConfirmation] = useState<BookingConfirmation | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);

  const { app, isConnected, error } = useApp({
    appInfo: { name: 'booking-confirmation', version: '1.0.0' },
    capabilities: {},
    onAppCreated: (a) => {
      a.ontoolresult = (params: McpUiToolResultNotification['params']) => {
        const data = params.structuredContent as BookingConfirmation | undefined;
        if (!data?.bookingId) {
          setLoadError('No confirmation data received.');
          return;
        }
        setConfirmation(data);
      };
    },
  });
  useHostStyles(app, app?.getHostContext());

  async function viewTrips() {
    if (!app) return;
    await app.sendMessage({
      role: 'user',
      content: [{ type: 'text', text: 'Show my travel history' }],
    });
    await app.requestTeardown();
  }

  if (error) {
    return (
      <div className="flex h-full items-center justify-center p-6">
        <p className="text-sm text-destructive">Connection error: {error.message}</p>
      </div>
    );
  }

  if (!isConnected || confirmation === null) {
    return <LoadingState />;
  }

  if (loadError) {
    return (
      <div className="flex h-full items-center justify-center p-6">
        <p className="text-sm text-destructive">{loadError}</p>
      </div>
    );
  }

  return (
    <div className="p-4 space-y-4">
      <div className="text-center">
        <h2 className="text-base font-semibold text-foreground">Booking confirmed!</h2>
        <p className="mt-0.5 text-sm text-muted-foreground">
          A confirmation has been sent to{' '}
          <span className="font-medium text-foreground">{confirmation.email}</span>
        </p>
      </div>

      <Card>
        <CardContent className="space-y-5">
          <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-1">
            <span className="text-sm text-muted-foreground">Booking reference</span>
            <span className="font-mono font-bold tracking-wide">
              {confirmation.bookingId}
            </span>
          </div>

          <div>
            <p className="text-base font-semibold text-foreground">
              {confirmation.destination}, {confirmation.country}
            </p>
            <p className="text-sm text-muted-foreground">
              Booked for {confirmation.leadPassengerName}
            </p>
          </div>

          <dl className="grid gap-3 text-sm">
            <div className="flex flex-wrap items-start justify-between gap-x-4 gap-y-1">
              <dt className="flex items-center gap-2 text-muted-foreground">
                <CalendarDays className="size-4 shrink-0 text-primary" />
                Dates
              </dt>
              <dd className="text-right font-medium">
                {confirmation.departureDate} — {confirmation.returnDate}
                <span className="block text-xs font-normal text-muted-foreground">{confirmation.nights} nights</span>
              </dd>
            </div>
            <div className="flex flex-wrap items-start justify-between gap-x-4 gap-y-1">
              <dt className="flex items-center gap-2 text-muted-foreground">
                <Plane className="size-4 shrink-0 text-primary" />
                Flight
              </dt>
              <dd className="text-right font-medium">
                {confirmation.airline} {confirmation.flightNumber}
                <span className="block text-xs font-normal text-muted-foreground">Return flight included</span>
              </dd>
            </div>
            <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-1">
              <dt className="flex items-center gap-2 text-muted-foreground">
                <Hotel className="size-4 shrink-0 text-primary" />
                Hotel
              </dt>
              <dd className="font-medium">{confirmation.hotel}</dd>
            </div>
            <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-1">
              <dt className="flex items-center gap-2 text-muted-foreground">
                <Users className="size-4 shrink-0 text-primary" />
                Travelers
              </dt>
              <dd>{confirmation.passengers} passenger{confirmation.passengers === 1 ? '' : 's'}</dd>
            </div>
          </dl>

          <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
            <span className="text-sm font-semibold">Total paid</span>
            <span className="text-xl font-bold text-primary">
              {confirmation.currency} {confirmation.totalPrice.toLocaleString()}
            </span>
          </div>
        </CardContent>

        <CardFooter className="pb-4">
          <Button variant="ghost" className="travel0-action travel0-action-secondary w-full" onClick={viewTrips}>
            View my trips
          </Button>
        </CardFooter>
      </Card>
    </div>
  );
}

createRoot(document.getElementById('root')!).render(
  <div className="auth0-universal" data-theme="minimal">
    <UdsThemeBridge />
    <App />
  </div>,
);
