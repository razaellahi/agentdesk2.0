export function StartupSplash() {
  return (
    <div className="grid h-full place-items-center bg-canvas" role="status" aria-live="polite">
      <div className="flex flex-col items-center gap-4">
        <div className="size-10 animate-spin rounded-full border-4 border-primary-soft border-t-primary" />
        <span className="text-sm text-muted-foreground">Starting Agent Desk…</span>
      </div>
    </div>
  );
}
