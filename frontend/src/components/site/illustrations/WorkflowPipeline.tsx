/** Decorative pipeline connecting the four delivery / loan lifecycle steps. */
export function WorkflowPipeline() {
  return (
    <div className="pointer-events-none absolute inset-x-0 top-8 hidden h-24 md:block" aria-hidden="true">
      <svg viewBox="0 0 1200 80" className="h-full w-full" preserveAspectRatio="none" fill="none">
        <defs>
          <linearGradient id="pipe-grad" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="var(--primary)" stopOpacity="0.15" />
            <stop offset="50%" stopColor="var(--accent)" stopOpacity="0.85" />
            <stop offset="100%" stopColor="var(--primary)" stopOpacity="0.15" />
          </linearGradient>
        </defs>
        <path
          d="M0 40 Q300 10 600 40 T1200 40"
          stroke="url(#pipe-grad)"
          strokeWidth="2"
          strokeDasharray="8 12"
          className="animate-dash-flow"
        />
      </svg>
    </div>
  );
}
