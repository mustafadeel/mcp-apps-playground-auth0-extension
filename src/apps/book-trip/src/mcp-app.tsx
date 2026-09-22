import type { McpUiToolResultNotification } from '@modelcontextprotocol/ext-apps';
import { useApp, useHostStyles } from '@modelcontextprotocol/ext-apps/react';
import { ArrowLeft, CalendarDays, Hotel, Plane, Tag, Users } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { createRoot } from 'react-dom/client';

import { GoogleConnectAccount } from './google-connect-account.tsx';
import type { BookingConfirmation, TripOption, TripSearchResult } from '../../../toolkits/bookings/types.ts';
import { LoadingState } from '../../components/loading-state.tsx';
import { UdsThemeBridge } from '../../components/uds-theme-bridge.tsx';
import { Alert, AlertDescription } from '../../components/ui/alert.tsx';
import { Badge } from '../../components/ui/badge.tsx';
import { Button } from '../../components/ui/button.tsx';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '../../components/ui/card.tsx';
import { Separator } from '../../components/ui/separator.tsx';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../../components/ui/tabs.tsx';
import '../../global.css';

type SortKey = 'price' | 'rating' | 'duration';
type View = 'results' | 'review' | 'confirmed';
type CalendarState = 'idle' | 'connecting' | 'added' | 'error';

type CalendarResult = {
  connection?: string;
  error?: string;
  eventId?: string;
  status?: 'added';
};

const CONNECTION_POLL_INTERVAL_MS = 2_000;
const CONNECTION_POLL_MAX_ATTEMPTS = 150;

function resultErrorMessage(result: { content?: unknown }, fallback: string): string {
  const content = result.content;
  if (!Array.isArray(content)) return fallback;
  const text = content.find((item) => typeof item === 'object' && item !== null && 'text' in item);
  return typeof text === 'object' && text !== null && typeof text.text === 'string'
    ? text.text
    : fallback;
}

function sortOptions(options: TripOption[], key: SortKey): TripOption[] {
  return [...options].sort((a, b) => {
    if (key === 'price') return a.totalPrice - b.totalPrice;
    if (key === 'rating') return b.hotelRating - a.hotelRating;
    if (key === 'duration') return a.nights - b.nights;
    return 0;
  });
}

function TripCard({ option, onSelect }: { option: TripOption; onSelect: (o: TripOption) => void }) {
  return (
    <Card className="transition-colors hover:bg-muted/40">
      <CardHeader className="pb-2">
        <div className="flex items-start justify-between gap-2">
          <CardTitle className="text-sm font-semibold">
            {option.origin} → {option.destination}
          </CardTitle>
          {option.dealTag && (
            <Badge variant="info" className="shrink-0 text-xs">
              <Tag className="h-3 w-3 mr-1" />{option.dealTag}
            </Badge>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-2 pb-3">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Plane className="h-3.5 w-3.5 shrink-0 text-primary" />
          {option.airline} {option.flightNumber}
        </div>
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Hotel className="h-3.5 w-3.5 shrink-0 text-primary" />
          {option.hotel} <span className="text-star">{'★'.repeat(option.hotelRating)}</span>
        </div>
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <CalendarDays className="h-3.5 w-3.5 shrink-0" />
          {option.departureDate} → {option.returnDate} ({option.nights}n)
        </div>
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Users className="h-3.5 w-3.5 shrink-0" />
          {option.passengers} passenger{option.passengers === 1 ? '' : 's'}
        </div>
        {option.includes.length > 0 && (
          <>
            <Separator />
            <div className="flex flex-wrap gap-1">
              {option.includes.map((inc) => (
                <Badge key={inc} variant="secondary" className="text-xs">{inc}</Badge>
              ))}
            </div>
          </>
        )}
      </CardContent>
      <CardFooter className="flex items-center justify-between pt-0 pb-4">
        <div>
          <span className="text-xl font-bold text-primary">{option.currency} {option.totalPrice.toLocaleString()}</span>
          <span className="ml-1 text-xs text-muted-foreground">({option.currency} {option.pricePerPerson.toLocaleString()}/person)</span>
        </div>
        <Button className="travel0-action travel0-action-primary" onClick={() => onSelect(option)}>Select</Button>
      </CardFooter>
    </Card>
  );
}

function ReviewCard({ option, onConfirm, onBack, loading }: {
  option: TripOption; onConfirm: () => void; onBack: () => void; loading: boolean;
}) {
  return (
    <div className="space-y-5 rounded-4xl bg-page p-4">
      <Button variant="ghost" size="sm" onClick={onBack} disabled={loading} className="h-7 px-2 -ml-2">
        <ArrowLeft className="h-4 w-4 mr-1" />Back
      </Button>
      <div>
        <h2 className="text-lg font-semibold tracking-tight">Review your booking</h2>
        <p className="text-sm text-muted-foreground mt-0.5">Check everything looks right before confirming.</p>
      </div>
      <Card>
        <CardContent className="space-y-4">
          <div className="flex items-start justify-between">
            <div>
              <p className="font-semibold text-base">{option.destination}, {option.country}</p>
              <p className="text-sm text-muted-foreground">{option.origin} → {option.destination}</p>
            </div>
            {option.dealTag && <Badge variant="info" className="text-xs shrink-0">{option.dealTag}</Badge>}
          </div>
          <Separator />
          <div className="space-y-2.5">
            <div className="flex items-center gap-3 text-sm">
              <CalendarDays className="h-4 w-4 text-primary shrink-0" />
              <div>
                <p className="font-medium">{option.departureDate} — {option.returnDate}</p>
                <p className="text-xs text-muted-foreground">{option.nights} nights</p>
              </div>
            </div>
            <div className="flex items-center gap-3 text-sm">
              <Plane className="h-4 w-4 text-primary shrink-0" />
              <div>
                <p className="font-medium">{option.airline} {option.flightNumber}</p>
                <p className="text-xs text-muted-foreground">Return flight included</p>
              </div>
            </div>
            <div className="flex items-center gap-3 text-sm">
              <Hotel className="h-4 w-4 text-primary shrink-0" />
              <div>
                <p className="font-medium">{option.hotel}</p>
                <p className="text-xs text-muted-foreground">{'★'.repeat(option.hotelRating)} · {option.nights} nights</p>
              </div>
            </div>
            <div className="flex items-center gap-3 text-sm">
              <Users className="h-4 w-4 text-primary shrink-0" />
              <p className="text-muted-foreground">{option.passengers} pax · {option.currency} {option.pricePerPerson.toLocaleString()}/person</p>
            </div>
          </div>
          <Separator />
          <div className="flex flex-wrap gap-1">
            {option.includes.map((inc) => <Badge key={inc} variant="secondary" className="text-xs">{inc}</Badge>)}
          </div>
          <Separator />
          <div className="flex items-center justify-between">
            <p className="text-sm text-muted-foreground">Total price</p>
            <p className="text-xl font-bold text-primary">{option.currency} {option.totalPrice.toLocaleString()}</p>
          </div>
        </CardContent>
        <CardFooter className="pb-4">
          <Button className="travel0-action travel0-action-primary w-full" size="lg" onClick={onConfirm} disabled={loading}>
            {loading ? 'Booking…' : 'Confirm booking'}
          </Button>
        </CardFooter>
      </Card>
    </div>
  );
}

function ConfirmedCard({
  calendarError,
  calendarState,
  confirmation,
  onAddToCalendar,
  onDismissCalendarError,
  onViewTrips,
  trip,
}: {
  calendarError: string | null;
  calendarState: CalendarState;
  confirmation: BookingConfirmation;
  onAddToCalendar: () => void;
  onDismissCalendarError: () => void;
  onViewTrips: () => void;
  trip: TripOption;
}) {
  return (
    <div className="space-y-5 rounded-4xl bg-page p-4">
      <div className="text-center">
        <h2 className="text-lg font-semibold tracking-tight">Demo booking confirmed</h2>
        <p className="mt-0.5 text-sm text-muted-foreground">
          This fixture-backed demo booking is saved for <span className="font-medium text-foreground">{confirmation.leadPassengerName}</span>.
        </p>
      </div>
      <Card>
        <CardContent className="space-y-5">
          <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-1">
            <span className="text-sm text-muted-foreground">Booking reference</span>
            <span className="font-mono font-bold tracking-wide">{confirmation.bookingId}</span>
          </div>
          <dl className="grid gap-3 text-sm">
            <div className="flex flex-wrap justify-between gap-x-4 gap-y-1">
              <dt className="text-muted-foreground">Destination</dt>
              <dd className="font-medium">{trip.destination}, {trip.country}</dd>
            </div>
            <div className="flex flex-wrap justify-between gap-x-4 gap-y-1">
              <dt className="text-muted-foreground">Dates</dt>
              <dd>{trip.departureDate} → {trip.returnDate}</dd>
            </div>
            <div className="flex flex-wrap justify-between gap-x-4 gap-y-1">
              <dt className="text-muted-foreground">Hotel</dt>
              <dd className="font-medium">{trip.hotel}</dd>
            </div>
            <div className="flex flex-wrap justify-between gap-x-4 gap-y-1">
              <dt className="text-muted-foreground">Flight</dt>
              <dd>{trip.airline} {trip.flightNumber}</dd>
            </div>
          </dl>
          <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
            <span className="text-sm font-semibold">Demo booking total</span>
            <span className="text-base font-bold text-primary">{trip.currency} {trip.totalPrice.toLocaleString()}</span>
          </div>
        </CardContent>
        <CardFooter className="flex-col items-stretch gap-3 pb-4">
          <GoogleConnectAccount
            error={calendarError}
            isConnected={calendarState === 'added'}
            isConnecting={calendarState === 'connecting'}
            onCancel={calendarState === 'connecting' || calendarError ? onDismissCalendarError : undefined}
            onConnect={onAddToCalendar}
          />
          <Button variant="ghost" className="travel0-action travel0-action-secondary w-full" onClick={onViewTrips}>View my trips</Button>
        </CardFooter>
      </Card>
    </div>
  );
}

function App() {
  const [options, setOptions] = useState<TripOption[] | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [view, setView] = useState<View>('results');
  const [selectedTrip, setSelectedTrip] = useState<TripOption | null>(null);
  const [confirmation, setConfirmation] = useState<BookingConfirmation | null>(null);
  const [booking, setBooking] = useState(false);
  const [bookingError, setBookingError] = useState<string | null>(null);
  const [calendarError, setCalendarError] = useState<string | null>(null);
  const [calendarState, setCalendarState] = useState<CalendarState>('idle');
  const calendarRequestRef = useRef(false);
  const connectionAbortRef = useRef<AbortController | null>(null);

  useEffect(() => () => {
    connectionAbortRef.current?.abort();
  }, []);

  const { app, isConnected, error } = useApp({
    appInfo: { name: 'book-trip', version: '1.0.0' },
    capabilities: {},
    onAppCreated: (a) => {
      a.ontoolresult = (params: McpUiToolResultNotification['params']) => {
        const data = params.structuredContent as TripSearchResult | undefined;
        if (!data?.options) { setLoadError('No trip options received.'); return; }
        setOptions(data.options);
      };
    },
  });
  useHostStyles(app, app?.getHostContext());

  async function confirmBooking() {
    if (!app || !selectedTrip) return;
    setBookingError(null);
    setBooking(true);
    try {
      const result = await app.callServerTool({
        name: 'confirm_booking',
        arguments: { tripId: selectedTrip.tripId, leadPassengerName: 'Jacob Vidal', email: 'jacob@example.com' },
      });
      const nextConfirmation = result.structuredContent as BookingConfirmation | undefined;
      if (result.isError || !nextConfirmation?.bookingId || nextConfirmation.status !== 'confirmed') {
        throw new Error(resultErrorMessage(result, 'Unable to confirm this booking.'));
      }
      setCalendarError(null);
      setCalendarState('idle');
      setConfirmation(nextConfirmation);
      setView('confirmed');
    } catch (err) {
      setConfirmation(null);
      setBookingError(err instanceof Error ? err.message : String(err));
      setView('results');
    } finally {
      setBooking(false);
    }
  }

  async function addToCalendar(): Promise<void> {
    if (!app || !confirmation || calendarRequestRef.current || calendarState === 'added') return;

    calendarRequestRef.current = true;
    setCalendarError(null);
    setCalendarState('connecting');
    try {
      const callCalendarTool = () => app.callServerTool({
        name: 'add_booking_to_calendar',
        arguments: { bookingId: confirmation.bookingId },
      });
      let result = await callCalendarTool();
      const data = result.structuredContent as CalendarResult | undefined;

      if (result.isError && data?.error === 'connection_required' && data.connection === 'google-oauth2') {
        const connectResult = await app.callServerTool({
          name: 'auth0_connect_account',
          arguments: { connection: 'google-oauth2' },
        });
        const connectData = connectResult.structuredContent as { connectUrl?: unknown } | undefined;
        if (connectResult.isError || typeof connectData?.connectUrl !== 'string') {
          throw new Error('Unable to start the Google account connection.');
        }

        await app.openLink({ url: connectData.connectUrl });
        const controller = new AbortController();
        connectionAbortRef.current = controller;
        for (let attempt = 0; attempt < CONNECTION_POLL_MAX_ATTEMPTS; attempt += 1) {
          if (controller.signal.aborted) throw new Error('Google account connection was canceled.');
          await new Promise<void>((resolve, reject) => {
            const timer = window.setTimeout(resolve, CONNECTION_POLL_INTERVAL_MS);
            controller.signal.addEventListener('abort', () => {
              window.clearTimeout(timer);
              reject(new Error('Google account connection was canceled.'));
            }, { once: true });
          });
          if (controller.signal.aborted) throw new Error('Google account connection was canceled.');
          result = await callCalendarTool();
          const retryData = result.structuredContent as CalendarResult | undefined;
          if (!(result.isError && retryData?.error === 'connection_required')) break;
        }
        connectionAbortRef.current = null;
      }

      const finalData = result.structuredContent as CalendarResult | undefined;
      if (result.isError && finalData?.error === 'connection_required') {
        throw new Error('Google account connection timed out. Try again when you have completed the connection.');
      }
      if (result.isError || finalData?.status !== 'added') {
        throw new Error(resultErrorMessage(result, 'Unable to add this itinerary to Google Calendar.'));
      }
      setCalendarState('added');
    } catch (caughtError) {
      setCalendarState('error');
      setCalendarError(caughtError instanceof Error ? caughtError.message : 'Unable to add this itinerary to Google Calendar.');
    } finally {
      connectionAbortRef.current = null;
      calendarRequestRef.current = false;
    }
  }

  function dismissCalendarError(): void {
    connectionAbortRef.current?.abort();
    connectionAbortRef.current = null;
    if (calendarState !== 'added') setCalendarState('idle');
    setCalendarError(null);
  }

  async function viewTrips() {
    if (!app) return;
    await app.sendMessage({ role: 'user', content: [{ type: 'text', text: 'Show my travel history' }] });
    await app.requestTeardown();
  }

  if (error) return <div className="p-4"><Alert variant="destructive"><AlertDescription>Connection error: {error.message}</AlertDescription></Alert></div>;
  if (!isConnected || options === null) return <div className="bg-page p-4"><LoadingState label="Loading travel packages" /></div>;
  if (loadError) return <div className="p-4"><Alert variant="destructive"><AlertDescription>{loadError}</AlertDescription></Alert></div>;

  if (view === 'confirmed' && confirmation && selectedTrip) {
    return (
      <ConfirmedCard
        calendarError={calendarError}
        calendarState={calendarState}
        confirmation={confirmation}
        onAddToCalendar={() => void addToCalendar()}
        onDismissCalendarError={dismissCalendarError}
        onViewTrips={viewTrips}
        trip={selectedTrip}
      />
    );
  }

  if (view === 'review' && selectedTrip) {
    return <ReviewCard option={selectedTrip} onConfirm={confirmBooking} onBack={() => setView('results')} loading={booking} />;
  }

  if (options.length === 0) return <div className="bg-page p-4"><Card className="items-center p-6 text-center"><p className="text-sm text-muted-foreground">No packages found for this route.</p></Card></div>;

  return (
    <div className="space-y-5 rounded-4xl bg-page p-4">
      <div className="flex items-center justify-between">
        <h2 className="text-base font-semibold">{options.length} package{options.length === 1 ? '' : 's'} available</h2>
      </div>
      {bookingError && <Alert variant="destructive"><AlertDescription>{bookingError}</AlertDescription></Alert>}
      <Tabs defaultValue="price">
        <TabsList>
          <TabsTrigger value="price">By price</TabsTrigger>
          <TabsTrigger value="rating">By rating</TabsTrigger>
          <TabsTrigger value="duration">By duration</TabsTrigger>
        </TabsList>
        {(['price', 'rating', 'duration'] as SortKey[]).map((key) => (
          <TabsContent key={key} value={key} className="space-y-3">
            {sortOptions(options, key).map((o) => <TripCard key={o.tripId} option={o} onSelect={(t) => { setSelectedTrip(t); setView('review'); }} />)}
          </TabsContent>
        ))}
      </Tabs>
    </div>
  );
}

createRoot(document.getElementById('root')!).render(
  <div className="auth0-universal" data-theme="minimal">
    <UdsThemeBridge />
    <App />
  </div>,
);
