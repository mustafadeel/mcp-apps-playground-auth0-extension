import type { McpUiToolResultNotification } from '@modelcontextprotocol/ext-apps';
import { useApp, useHostStyles } from '@modelcontextprotocol/ext-apps/react';
import { ArrowLeft, CalendarDays, Hotel, Plane, ReceiptText, Users } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { createRoot } from 'react-dom/client';

import { parseBookings } from './state.ts';
import type { Invoice, TripBooking } from '../../../toolkits/history/types.ts';
import { LoadingState } from '../../components/loading-state.tsx';
import { UdsThemeBridge } from '../../components/uds-theme-bridge.tsx';
import { Alert, AlertDescription } from '../../components/ui/alert.tsx';
import { Badge } from '../../components/ui/badge.tsx';
import { Button } from '../../components/ui/button.tsx';
import { Spinner } from '../../components/ui/spinner.tsx';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '../../components/ui/table.tsx';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../../components/ui/tabs.tsx';
import '../../global.css';

type View = { type: 'list' } | { type: 'detail'; bookingId: string };

function statusVariant(status: TripBooking['status']) {
  if (status === 'upcoming') return 'info' as const;
  if (status === 'completed') return 'success' as const;
  return 'secondary' as const;
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}

function InvoiceDetail({
  booking,
  invoice,
  loading,
  error,
  onBack,
}: {
  booking: TripBooking;
  invoice: Invoice | null;
  loading: boolean;
  error: string | null;
  onBack: () => void;
}) {
  return (
    <div className="space-y-5 rounded-4xl bg-page p-4">
      <div className="flex items-center gap-2">
        <Button variant="ghost" size="sm" onClick={onBack} className="h-7 px-2 -ml-2">
          <ArrowLeft className="h-4 w-4 mr-1" />
          Back
        </Button>
      </div>

      <div className="space-y-1">
        <h2 className="text-base font-semibold text-foreground flex items-center gap-2">
          <ReceiptText className="h-4 w-4 text-primary" />
          {booking.destination}, {booking.country}
        </h2>
        <p className="text-sm text-muted-foreground">
          {formatDate(booking.checkIn)} — {formatDate(booking.checkOut)} · {booking.passengers} pax
        </p>
      </div>

      <div className="grid grid-cols-2 gap-3 text-sm">
        <div className="flex items-start gap-2">
          <Hotel className="h-3.5 w-3.5 mt-0.5 text-muted-foreground shrink-0" />
          <div>
            <p className="font-medium">{booking.hotel}</p>
            <p className="text-xs text-muted-foreground">{booking.hotelAddress}</p>
          </div>
        </div>
        <div className="flex items-start gap-2">
          <Plane className="h-3.5 w-3.5 mt-0.5 text-muted-foreground shrink-0" />
          <div>
            <p className="text-xs">{booking.flightOutbound.airline} {booking.flightOutbound.number}</p>
            <p className="text-xs text-muted-foreground">{booking.flightOutbound.departure} → {booking.flightOutbound.arrival}</p>
            <p className="text-xs mt-1">{booking.flightReturn.number}</p>
            <p className="text-xs text-muted-foreground">{booking.flightReturn.departure} → {booking.flightReturn.arrival}</p>
          </div>
        </div>
      </div>

      {loading && <div className="flex items-center gap-2 pt-2"><Spinner size="sm" /><span className="text-sm text-muted-foreground">Loading invoice</span></div>}
      {error && <Alert variant="destructive"><AlertDescription>{error}</AlertDescription></Alert>}

      {invoice && !loading && (
        <section className="space-y-4 pt-2" aria-label="Invoice">
          <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-1 text-xs text-muted-foreground">
            <span className="font-mono">{invoice.invoiceNumber}</span>
            <span>{invoice.paymentMethod}</span>
          </div>

          <dl className="space-y-3">
            {invoice.lineItems.map((item, i) => (
              <div key={i} className="flex items-start justify-between gap-3 text-sm">
                <dt className="flex-1 leading-snug text-muted-foreground">{item.description}</dt>
                <dd className="shrink-0 font-medium tabular-nums">
                  {invoice.currency} {item.amount.toFixed(2)}
                </dd>
              </div>
            ))}
          </dl>

          <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1 pt-1">
            <span className="text-sm font-semibold">Total</span>
            <span className="text-base font-bold text-primary tabular-nums">
              {invoice.currency} {invoice.total.toFixed(2)}
            </span>
          </div>

          <p className="text-xs text-muted-foreground">
            Issued {formatDate(invoice.issuedAt)} · {invoice.status.toUpperCase()}
          </p>
        </section>
      )}
    </div>
  );
}

function TripTable({
  bookings,
  onRowClick,
}: {
  bookings: TripBooking[];
  onRowClick: (b: TripBooking) => void;
}) {
  if (bookings.length === 0) {
    return <p className="py-8 text-center text-sm text-muted-foreground">No trips here yet.</p>;
  }

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Destination</TableHead>
          <TableHead>Dates</TableHead>
          <TableHead>Hotel</TableHead>
          <TableHead>
            <Users className="h-3.5 w-3.5" />
          </TableHead>
          <TableHead className="text-right">Total</TableHead>
          <TableHead>Status</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {bookings.map((b) => (
          <TableRow key={b.bookingId} className="cursor-pointer" onClick={() => onRowClick(b)}>
            <TableCell>
              <div className="font-medium">{b.destination}</div>
              <div className="text-xs text-muted-foreground">{b.country}</div>
            </TableCell>
            <TableCell>
              <div className="flex items-center gap-1 text-xs text-muted-foreground">
                <CalendarDays className="h-3 w-3" />
                {formatDate(b.checkIn)}
              </div>
              <div className="text-xs text-muted-foreground ml-4">→ {formatDate(b.checkOut)}</div>
            </TableCell>
            <TableCell>
              <div className="flex items-center gap-1 text-xs">
                <Hotel className="h-3 w-3 text-muted-foreground" />
                <span className="line-clamp-1 max-w-32">{b.hotel}</span>
              </div>
              <div className="flex items-center gap-1 mt-0.5 text-xs text-muted-foreground">
                <Plane className="h-3 w-3" />
                {b.flightOutbound.number}
              </div>
            </TableCell>
            <TableCell className="text-sm">{b.passengers}</TableCell>
            <TableCell className="text-right">
              <span className="font-medium tabular-nums text-sm">
                {b.currency} {b.totalAmount.toLocaleString()}
              </span>
            </TableCell>
            <TableCell>
              <Badge variant={statusVariant(b.status)} className="capitalize text-xs">
                {b.status}
              </Badge>
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}

function App() {
  const [bookings, setBookings] = useState<TripBooking[] | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [view, setView] = useState<View>({ type: 'list' });
  const [invoice, setInvoice] = useState<Invoice | null>(null);
  const [invoiceLoading, setInvoiceLoading] = useState(false);
  const [invoiceError, setInvoiceError] = useState<string | null>(null);
  const invoiceRequestRef = useRef(0);

  const { app, isConnected, error } = useApp({
    appInfo: { name: 'travel-history', version: '1.0.0' },
    capabilities: {},
    onAppCreated: (a) => {
      a.ontoolresult = (params: McpUiToolResultNotification['params']) => {
        if (params.isError) {
          setBookings(null);
          setLoadError('Travel history could not be loaded.');
          return;
        }

        const data = params.structuredContent as { bookings?: unknown } | undefined;
        const nextBookings = parseBookings(data?.bookings);
        if (!nextBookings) {
          setBookings(null);
          setLoadError('No valid booking data received.');
          return;
        }
        setLoadError(null);
        setBookings(nextBookings);
      };
    },
  });
  useHostStyles(app, app?.getHostContext());

  async function openDetail(booking: TripBooking) {
    if (!app) return;
    const requestId = invoiceRequestRef.current + 1;
    invoiceRequestRef.current = requestId;
    setInvoice(null);
    setInvoiceError(null);
    setInvoiceLoading(true);
    setView({ type: 'detail', bookingId: booking.bookingId });
    try {
      const result = await app.callServerTool({
        name: 'get_invoice',
        arguments: { bookingId: booking.bookingId },
      });
      if (invoiceRequestRef.current === requestId) {
        setInvoice(result.structuredContent as Invoice);
      }
    } catch (err) {
      if (invoiceRequestRef.current === requestId) {
        setInvoiceError(err instanceof Error ? err.message : String(err));
      }
    } finally {
      if (invoiceRequestRef.current === requestId) {
        setInvoiceLoading(false);
      }
    }
  }

  function backToList() {
    invoiceRequestRef.current += 1;
    setView({ type: 'list' });
    setInvoice(null);
    setInvoiceLoading(false);
    setInvoiceError(null);
  }

  useEffect(() => {
    if (view.type === 'detail' && bookings !== null
      && !bookings.some((booking) => booking.bookingId === view.bookingId)) {
      invoiceRequestRef.current += 1;
      setView({ type: 'list' });
      setInvoice(null);
      setInvoiceLoading(false);
      setInvoiceError(null);
    }
  }, [bookings, view]);

  if (error) {
    return <div className="p-4"><Alert variant="destructive"><AlertDescription>Connection error: {error.message}</AlertDescription></Alert></div>;
  }

  if (loadError) {
    return <div className="p-4"><Alert variant="destructive"><AlertDescription>{loadError}</AlertDescription></Alert></div>;
  }

  if (!isConnected || bookings === null) {
    return <div className="bg-page p-4"><LoadingState label="Loading your trips" /></div>;
  }

  if (view.type === 'detail') {
    const booking = bookings.find((candidate) => candidate.bookingId === view.bookingId);
    if (!booking) {
      return <LoadingState />;
    }
    return (
      <InvoiceDetail
        booking={booking}
        invoice={invoice}
        loading={invoiceLoading}
        error={invoiceError}
        onBack={backToList}
      />
    );
  }

  const upcoming = bookings.filter((b) => b.status === 'upcoming');
  const completed = bookings.filter((b) => b.status === 'completed');

  return (
    <div className="space-y-5 rounded-4xl bg-page p-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold tracking-tight text-foreground">My trips</h2>
        <span className="text-xs text-muted-foreground">
          {bookings.length} booking{bookings.length === 1 ? '' : 's'} · click any row for invoice
        </span>
      </div>

      <Tabs defaultValue="upcoming">
        <TabsList>
          <TabsTrigger value="upcoming">
            Upcoming{' '}
            <span className="ml-1.5 rounded-full bg-primary/10 px-1.5 py-0.5 text-xs text-primary">
              {upcoming.length}
            </span>
          </TabsTrigger>
          <TabsTrigger value="past">
            Past{' '}
            <span className="ml-1.5 rounded-full bg-muted px-1.5 py-0.5 text-xs">
              {completed.length}
            </span>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="upcoming">
          <TripTable bookings={upcoming} onRowClick={openDetail} />
        </TabsContent>

        <TabsContent value="past">
          <TripTable bookings={completed} onRowClick={openDetail} />
        </TabsContent>
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
