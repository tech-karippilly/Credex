/** Decorative animated pipeline connecting the four delivery / loan lifecycle steps. */
export function WorkflowPipeline() {
  return (
    <div className="pointer-events-none absolute inset-x-0 top-7 hidden h-28 md:block" aria-hidden="true">
      <svg viewBox="0 0 1200 90" className="h-full w-full" preserveAspectRatio="none" fill="none">
        <defs>
          <linearGradient id="pipe-grad" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="var(--primary)" stopOpacity="0.05" />
            <stop offset="50%" stopColor="var(--accent)" stopOpacity="0.9" />
            <stop offset="100%" stopColor="var(--primary)" stopOpacity="0.05" />
          </linearGradient>
          <radialGradient id="pipe-pulse" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="var(--accent)" stopOpacity="0.9" />
            <stop offset="100%" stopColor="var(--accent)" stopOpacity="0" />
          </radialGradient>
        </defs>

        {/* Base rail */}
        <path d="M0 45 Q300 12 600 45 T1200 45" stroke="var(--border)" strokeWidth="1.5" />
        {/* Glowing flow */}
        <path
          d="M0 45 Q300 12 600 45 T1200 45"
          stroke="url(#pipe-grad)"
          strokeWidth="2.5"
          strokeDasharray="10 14"
          className="animate-dash-flow"
        />

        {/* Travelling data packet */}
        <circle r="18" fill="url(#pipe-pulse)">
          <animateMotion dur="5s" repeatCount="indefinite" path="M0 45 Q300 12 600 45 T1200 45" />
        </circle>
        <circle r="3.5" fill="var(--accent)">
          <animateMotion dur="5s" repeatCount="indefinite" path="M0 45 Q300 12 600 45 T1200 45" />
        </circle>

        {/* Node markers at each step position */}
        {[150, 450, 750, 1050].map((cx) => (
          <g key={cx}>
            <circle cx={cx} cy="45" r="6" fill="var(--background)" stroke="var(--primary)" strokeWidth="1.5" />
            <circle cx={cx} cy="45" r="2.5" fill="var(--primary)" className="animate-glow" />
          </g>
        ))}
      </svg>
    </div>
  );
}
