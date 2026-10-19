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
            d="M21.5 11.2a7 7 0 1 0 0 9.6"
            stroke="#fff"
            strokeWidth="2.8"
            strokeLinecap="round"
            strokeLinejoin="round"
            fill="none"
          />
        </svg>
      </span>
      <span
        className={`font-display text-[1.35rem] font-bold leading-none tracking-[-0.02em] ${
          inverted ? "text-ink-foreground" : "text-foreground"
        }`}
      >
        CRED<span className="text-primary">EX</span>
      </span>
    </span>
  );
}
