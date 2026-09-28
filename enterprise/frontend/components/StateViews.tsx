// Stati standard per liste/pannelli dati (loading/empty/error), coerenti in
// tutto il gestionale — usarli invece di improvvisare markup ad hoc pagina
// per pagina, così l'esperienza resta uniforme.

export function LoadingState({ label = "Caricamento…" }: { label?: string }) {
  return (
    <div className="flex items-center gap-2 rounded-xl border border-dashed border-surface-border p-6 text-sm text-white/50">
      <span
        className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-white/20 border-t-brand-500"
        aria-hidden
      />
      {label}
    </div>
  );
}

export function EmptyState({
  title = "Nessun elemento",
  description,
  action,
}: {
  title?: string;
  description?: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="rounded-xl border border-dashed border-surface-border p-6 text-center">
      <p className="text-sm font-medium text-white/70">{title}</p>
      {description && <p className="mt-1 text-xs text-white/50">{description}</p>}
      {action && <div className="mt-3">{action}</div>}
    </div>
  );
}

export function ErrorState({
  message = "Non è stato possibile caricare i dati.",
  onRetry,
}: {
  message?: string;
  onRetry?: () => void;
}) {
  return (
    <div className="rounded-xl border border-accent-rose/30 bg-accent-rose/10 p-4 text-sm text-accent-rose">
      <p>{message}</p>
      {onRetry && (
        <button onClick={onRetry} className="mt-2 text-xs font-semibold underline underline-offset-2">
          Riprova
        </button>
      )}
    </div>
  );
}
