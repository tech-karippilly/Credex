export function Logo({ inverted = false }: { inverted?: boolean }) {
  return (
    <span className="flex items-center gap-2.5">
      <svg width="34" height="34" viewBox="0 0 34 34" aria-hidden="true">
        <rect width="34" height="34" rx="9" className={inverted ? "fill-ink-foreground" : "fill-primary"} />
        <path d="M22.5 11.5a8 8 0 1 0 0 11" fill="none" strokeWidth="3.2" strokeLinecap="round" className={inverted ? "stroke-ink" : "stroke-primary-foreground"} />
        <circle cx="23.5" cy="17" r="2.4" className="fill-cyan" />
      </svg>
      <span className="leading-none">
        <span className={`block font-display text-lg font-bold tracking-tight ${inverted ? "text-ink-foreground" : "text-foreground"}`}>
          Credex<span className="text-cyan">.</span>in
        </span>
        <span className={`block text-[10px] font-semibold uppercase tracking-[0.18em] ${inverted ? "text-ink-muted" : "text-muted-foreground"}`}>
          Tech Solutions
        </span>
      </span>
    </span>
  );
}
