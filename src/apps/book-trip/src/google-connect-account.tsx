import { Check, X } from 'lucide-react';

import googleCalendarIcon from './assets/google-calendar.svg';
import { Alert, AlertDescription } from '../../components/ui/alert.tsx';
import { Button } from '../../components/ui/button.tsx';
import { Spinner } from '../../components/ui/spinner.tsx';

type GoogleConnectAccountProps = {
  error?: string | null;
  isConnecting?: boolean;
  isConnected?: boolean;
  onCancel?: () => void;
  onConnect: () => void;
};

export function GoogleConnectAccount({
  error,
  isConnecting = false,
  isConnected = false,
  onCancel,
  onConnect,
}: GoogleConnectAccountProps) {
  const state = isConnected ? 'connected' : isConnecting ? 'connecting' : error ? 'error' : 'idle';

  return (
    <section aria-label="Google Calendar action" className="space-y-3">
      <div
        className="flex min-w-0 flex-col gap-4 rounded-4xl border border-border bg-card p-5 text-card-foreground sm:flex-row sm:items-center sm:justify-between"
        data-state={state}
      >
        <div className="flex min-w-0 items-center gap-3">
          <span className="flex size-10 shrink-0 items-center justify-center rounded-2xl border border-border bg-background p-2">
            <img alt="" aria-hidden="true" className="size-6" src={googleCalendarIcon} />
          </span>
          <div className="min-w-0 flex-1">
            <p className="break-words text-sm font-semibold text-card-foreground">Google Calendar</p>
            <p className="mt-0.5 break-words text-sm text-muted-foreground">
              Connect Google to add this confirmed demo itinerary to your calendar.
            </p>
          </div>
        </div>

        <div className="flex w-full shrink-0 items-center gap-3 sm:w-auto">
          {isConnecting && onCancel && (
            <Button type="button" variant="ghost" size="sm" className="w-full sm:w-auto" onClick={onCancel}>
              Cancel
            </Button>
          )}
          {isConnected ? (
            <span className="flex items-center gap-1.5 text-sm font-medium text-success-foreground" data-state="connected" role="status">
              <Check className="size-4" aria-hidden="true" />
              Added to calendar
            </span>
          ) : (
            <Button
              type="button"
              variant="primary"
              className="travel0-action travel0-action-primary w-full sm:w-auto"
              disabled={isConnecting}
              aria-busy={isConnecting}
              data-state={state}
              onClick={onConnect}
            >
              {isConnecting && <Spinner size="sm" aria-hidden="true" />}
              {isConnecting ? 'Connecting to Google…' : 'Connect to Google'}
            </Button>
          )}
        </div>
      </div>

      <div aria-live="polite" aria-atomic="true">
        {isConnecting && <span className="sr-only">Connecting Google Calendar</span>}
        {isConnected && <span className="sr-only">Itinerary added to Google Calendar</span>}
        {error && (
          <Alert variant="destructive">
            <AlertDescription className="flex min-w-0 items-start justify-between gap-3">
              <span className="break-words">{error}</span>
              {onCancel && (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="-my-1 shrink-0 text-destructive-foreground hover:bg-destructive/15 hover:text-destructive-foreground"
                  onClick={onCancel}
                >
                  <X className="size-4" aria-hidden="true" />
                  Dismiss
                </Button>
              )}
            </AlertDescription>
          </Alert>
        )}
      </div>
    </section>
  );
}
