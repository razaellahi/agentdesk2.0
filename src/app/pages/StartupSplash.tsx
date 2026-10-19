export function StartupSplash() {
  return (
    <div className="desk-canvas grid h-full place-items-center" role="status" aria-live="polite">
      <div className="desk-enter flex flex-col items-center gap-5">
        <div className="desk-panel desk-shine grid size-16 place-items-center rounded-2xl">
          <div className="size-8 animate-spin rounded-full border-[3px] border-primary-soft border-t-primary" />
        </div>
        <div className="text-center">
          <p className="font-display text-lg tracking-tight">Agent Desk</p>
          <p className="mt-1 text-sm text-muted-foreground">Starting…</p>
        </div>
      </div>
    </div>
  );
}
