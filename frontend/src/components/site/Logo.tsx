export function Logo({ inverted = false }: { inverted?: boolean }) {
  return (
    <span className="group flex items-center gap-2.5">
      {/* Geometric monogram mark */}
      <span className="relative inline-flex h-8 w-8 shrink-0 items-center justify-center">
        <svg viewBox="0 0 32 32" className="h-8 w-8" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
          <rect
            x="1.25"
            y="1.25"
            width="29.5"
            height="29.5"
            rx="9"
            fill="var(--primary)"
          />
          <path
            d="M22 11.5a6.8 6.8 0 1 0 0 9"
            stroke="#fff"
            strokeWidth="2.6"
            strokeLinecap="round"
            fill="none"
          />
          <circle cx="22.5" cy="16" r="1.9" fill="#fff" />
        </svg>
      </span>
      <span
        className={`font-display text-[1.35rem] font-bold leading-none tracking-[-0.02em] ${
          inverted ? "text-ink-foreground" : "text-foreground"
        }`}
      >
        Credex<span className="text-primary">.</span>In
      </span>
    </span>
  );
}
