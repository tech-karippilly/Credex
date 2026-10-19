import { Lightbulb, PenTool, Code2, Rocket, TrendingUp } from "lucide-react";

const STAGES = [
  { label: "Ideate", icon: Lightbulb, caption: "Discovery & scope" },
  { label: "Design", icon: PenTool, caption: "UX & architecture" },
  { label: "Develop", icon: Code2, caption: "Build & test" },
  { label: "Deploy", icon: Rocket, caption: "Ship to prod" },
  { label: "Scale", icon: TrendingUp, caption: "Grow & optimize" },
];

/** Delivery pipeline banner above the "What we build" cards. */
export function BuildSpectrum() {
  return (
    <div className="relative mt-10 overflow-hidden rounded-3xl border border-border bg-gradient-to-br from-card via-card to-surface/60 shadow-[var(--shadow-card)]">
      <div className="dot-matrix absolute inset-0 opacity-50" aria-hidden="true" />
      <div
        className="pointer-events-none absolute -right-20 -top-20 h-56 w-56 rounded-full bg-primary/10 blur-3xl"
        aria-hidden="true"
      />

      {/* Header row */}
      <div className="relative flex items-center justify-between border-b border-border px-6 py-4 sm:px-8">
        <span className="font-mono text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
          Delivery Pipeline
        </span>
        <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-500/30 bg-emerald-500/12 px-2.5 py-1 font-mono text-[10px] font-semibold uppercase tracking-wider text-emerald-400">
          <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
          Continuous
        </span>
      </div>

      {/* Stage track */}
      <div className="relative px-6 py-10 sm:px-8 sm:py-12">
        {/* Connecting rail */}
        <div className="absolute left-6 right-6 top-[3.85rem] hidden h-0.5 sm:left-8 sm:right-8 md:block" aria-hidden="true">
          <div className="h-full w-full rounded-full bg-border" />
          <div className="animate-dash-flow absolute inset-0 rounded-full bg-[length:16px_2px] bg-repeat-x opacity-70"
            style={{ backgroundImage: "linear-gradient(90deg, var(--primary) 0 8px, transparent 8px 16px)" }}
          />
        </div>

        <ol className="relative grid grid-cols-2 gap-x-4 gap-y-10 sm:grid-cols-3 md:grid-cols-5 md:gap-y-0">
          {STAGES.map((s, i) => (
            <li key={s.label} className="flex flex-col items-center text-center">
              <span
                className="relative z-10 inline-flex h-14 w-14 items-center justify-center rounded-2xl border border-primary/20 bg-card text-primary shadow-[var(--shadow-card)] transition-transform duration-300 hover:-translate-y-1 animate-float"
                style={{ animationDelay: `${i * 0.35}s` }}
              >
                <s.icon className="h-6 w-6" strokeWidth={1.7} />
                <span className="absolute -right-1 -top-1 flex h-5 w-5 items-center justify-center rounded-full bg-primary font-mono text-[10px] font-bold text-primary-foreground">
                  {i + 1}
                </span>
              </span>
              <span className="mt-4 font-display text-sm font-semibold text-foreground">{s.label}</span>
              <span className="mt-0.5 font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
                {s.caption}
              </span>
            </li>
          ))}
        </ol>
      </div>
    </div>
  );
}
