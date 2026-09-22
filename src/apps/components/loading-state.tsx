import { Spinner } from '@/components/ui/spinner.tsx';

type LoadingStateProps = {
  label?: string;
};

function LoadingState({ label = 'Loading' }: LoadingStateProps) {
  return (
    <div
      className="flex min-h-32 flex-col items-center justify-center gap-3 rounded-4xl bg-background p-6 text-center"
      role="status"
    >
      <Spinner size="sm" aria-hidden="true" />
      <span className="text-sm text-muted-foreground">{label}</span>
    </div>
  );
}

export { LoadingState };
