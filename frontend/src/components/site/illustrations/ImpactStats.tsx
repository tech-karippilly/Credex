import { TrendingUp, Server, Boxes, Timer } from "lucide-react";
import { useReveal } from "@/lib/use-reveal";
import { useCountUp } from "@/lib/use-count-up";

type Stat = {
  icon: typeof TrendingUp;
  target: number;
  decimals: number;
  prefix?: string;
  suffix?: string;
  label: string;
  /** Normalized sparkline points (0..1), rendered left→right. */
  spark: number[];
};

const STATS: Stat[] = [
  { icon: TrendingUp, target: 1200, decimals: 0, prefix: "₹", suffix: " Cr+", label: "Loan book processed on CREDEX", spark: [0.2, 0.35, 0.3, 0.5, 0.62, 0.78, 0.95] },
  { icon: Server, target: 99.98, decimals: 2, suffix: "%", label: "Platform uptime across regions", spark: [0.7, 0.82, 0.76, 0.88, 0.84, 0.93, 0.98] },
  { icon: Boxes, target: 12, decimals: 0, suffix: "+", label: "Lending & software modules", spark: [0.1, 0.25, 0.4, 0.5, 0.68, 0.82, 1] },
  { icon: Timer, target: 6, decimals: 0, suffix: " wk", label: "Typical NBFC go-live", spark: [0.95, 0.8, 0.68, 0.55, 0.42, 0.3, 0.2] },
];

function sparkPath(points: number[], w = 96, h = 32) {
  const step = w / (points.length - 1);
  return points
    .map((p, i) => `${i === 0 ? "M" : "L"}${(i * step).toFixed(1)} ${(h - p * (h - 4) - 2).toFixed(1)}`)
    .join(" ");
}

function StatCard({ stat, index }: { stat: Stat; index: number }) {
  const { ref, playEntrance, animateCount } = useReveal<HTMLDivElement>();
  const value = useCountUp(stat.target, animateCount);
  const Icon = stat.icon;
  const d = sparkPath(stat.spark);

  return (
    <div
      ref={ref}
      className={`relative overflow-hidden p-6 sm:p-7${playEntrance ? " animate-rise" : ""}`}
      style={playEntrance ? { animationDelay: `${index * 90}ms` } : undefined}
    >
      <div className="flex items-center gap-2.5">
        <span className="inline-flex h-9 w-9 items-center justify-center rounded-xl border border-white/10 bg-white/[0.06] text-amber-300">
          <Icon className="h-4.5 w-4.5" strokeWidth={1.8} />
        </span>
        <svg viewBox="0 0 96 32" className="ml-auto h-8 w-24" fill="none" aria-hidden="true">
          <path d={`${d} L96 32 L0 32 Z`} fill="url(#spark-fill)" opacity="0.5" />
          <path d={d} stroke="var(--primary)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
          <defs>
            <linearGradient id="spark-fill" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="var(--primary)" stopOpacity="0.35" />
              <stop offset="100%" stopColor="var(--primary)" stopOpacity="0" />
            </linearGradient>
          </defs>
        </svg>
      </div>

      <p className="mt-5 font-display text-3xl font-semibold tabular-nums text-white sm:text-4xl">
        {stat.prefix}
        {value.toLocaleString("en-IN", { minimumFractionDigits: stat.decimals, maximumFractionDigits: stat.decimals })}
        {stat.suffix}
      </p>
      <p className="mt-1.5 text-sm leading-snug text-ink-muted">{stat.label}</p>
    </div>
  );
}

/** Full-bleed metrics band. Figures show their real values immediately; a count-up runs only as the band scrolls into view. */
export function ImpactStats() {
  return (
    <section className="container-site py-6 md:py-10">
      <div className="relative overflow-hidden rounded-[2rem] bg-ink text-ink-foreground shadow-2xl">
        <div className="grid-lines-dark absolute inset-0 opacity-40" aria-hidden="true" />
        <div
          className="pointer-events-none absolute -left-24 -top-24 h-72 w-72 rounded-full bg-primary/20 blur-3xl"
          aria-hidden="true"
        />
        <div
          className="pointer-events-none absolute -bottom-24 right-10 h-72 w-72 rounded-full bg-primary/12 blur-3xl"
          aria-hidden="true"
        />
        <div className="relative grid gap-px bg-white/[0.07] sm:grid-cols-2 lg:grid-cols-4">
          {STATS.map((s, i) => (
            <div key={s.label} className="bg-ink">
              <StatCard stat={s} index={i} />
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
