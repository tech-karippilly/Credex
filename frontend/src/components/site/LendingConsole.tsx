import { useEffect, useState } from "react";
import { Coins, Car, Users, ArrowUpRight } from "lucide-react";
import { useReveal, prefersReducedMotion } from "@/lib/use-reveal";
import { useCountUp } from "@/lib/use-count-up";

const R = 54;
const C = 2 * Math.PI * R;

const SEGMENTS = [
  { label: "Gold", pct: 0.46, color: "var(--primary)" },
  { label: "Group", pct: 0.28, color: "var(--accent)" },
  { label: "Vehicle", pct: 0.18, color: "oklch(0.72 0.03 255)" },
  { label: "Other", pct: 0.08, color: "oklch(0.78 0.02 265)" },
];

const QUEUE = [
  { name: "Meena K.", step: "Gold Assess", icon: Coins, status: "74% LTV" },
  { name: "Ravi S.", step: "Vehicle KYC", icon: Car, status: "In review" },
  { name: "SHG-19", step: "Group Sanction", icon: Users, status: "11 / 12" },
];

export function LendingConsole() {
  const { ref, inView } = useReveal<HTMLDivElement>();
  const book = useCountUp(4.82, inView);
  const efficiency = useCountUp(98.6, inView);
  const [active, setActive] = useState(0);

  useEffect(() => {
    if (!inView || prefersReducedMotion()) return;
    const id = setInterval(() => setActive((i) => (i + 1) % QUEUE.length), 2200);
    return () => clearInterval(id);
  }, [inView]);

  let cumulative = 0;

  return (
    <div ref={ref} className="card-site glow-dot relative p-5 sm:p-6">
      {/* Window chrome */}
      <div className="flex items-center justify-between border-b border-border pb-4">
        <div className="flex items-center gap-2.5">
          <span className="relative flex h-2.5 w-2.5">
            <span className="absolute inline-flex h-full w-full rounded-full bg-primary opacity-70 animate-glow" />
            <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-primary" />
          </span>
          <span className="font-mono text-xs tracking-wide text-muted-foreground">app.credex / branch</span>
        </div>
        <span className="font-mono text-xs text-muted-foreground">Koramangala</span>
      </div>

      {/* Today's book + portfolio donut */}
      <div className="mt-5 grid grid-cols-2 gap-5">
        <div>
          <p className="font-mono text-[0.7rem] uppercase tracking-[0.18em] text-muted-foreground">Today&apos;s book</p>
          <p className="mt-2 font-display text-3xl font-semibold tabular-nums text-foreground">
            ₹{book.toFixed(2)} <span className="text-xl text-muted-foreground">Cr</span>
          </p>
          <span className="mt-2 inline-flex items-center gap-1 rounded-full bg-primary/15 px-2 py-0.5 text-xs font-semibold text-accent">
            <ArrowUpRight className="h-3 w-3" /> +2.4% today
          </span>
          <p className="mt-5 font-mono text-[0.7rem] uppercase tracking-[0.18em] text-muted-foreground">Collection</p>
          <p className="mt-1 font-display text-xl font-semibold tabular-nums text-foreground">{efficiency.toFixed(1)}%</p>
        </div>

        <div className="flex flex-col items-center justify-center">
          <p className="mb-2 self-start font-mono text-[0.7rem] uppercase tracking-[0.18em] text-muted-foreground">Book mix</p>
          <svg viewBox="0 0 140 140" className="h-28 w-28 -rotate-90">
            <circle cx="70" cy="70" r={R} fill="none" stroke="var(--border)" strokeWidth="12" />
            {SEGMENTS.map((seg) => {
              const len = seg.pct * C;
              const dashoffset = inView ? 0 : len;
              const rotate = cumulative * 360;
              cumulative += seg.pct;
              return (
                <circle
                  key={seg.label}
                  cx="70"
                  cy="70"
                  r={R}
                  fill="none"
                  stroke={seg.color}
                  strokeWidth="12"
                  strokeLinecap="round"
                  strokeDasharray={`${len} ${C - len}`}
                  strokeDashoffset={dashoffset}
                  style={{
                    transformOrigin: "center",
                    transform: `rotate(${rotate}deg)`,
                    transition: "stroke-dashoffset .9s cubic-bezier(.2,.7,.2,1)",
                  }}
                />
              );
            })}
          </svg>
        </div>
      </div>

      {/* Legend */}
      <div className="mt-4 flex flex-wrap gap-x-4 gap-y-1.5">
        {SEGMENTS.map((seg) => (
          <span key={seg.label} className="inline-flex items-center gap-1.5 font-mono text-[0.7rem] text-muted-foreground">
            <span className="h-2 w-2 rounded-full" style={{ background: seg.color }} />
            {seg.label} {Math.round(seg.pct * 100)}%
          </span>
        ))}
      </div>

      {/* Highlighted packet */}
      <div className="mt-5 flex items-center justify-between rounded-xl border border-primary/30 bg-primary/10 px-4 py-3">
        <div>
          <p className="font-mono text-xs text-accent">Gold packet GL-4821</p>
          <p className="mt-0.5 text-xs text-muted-foreground">22 ct · 48 g · same-day path</p>
        </div>
        <span className="font-display text-lg font-semibold text-foreground">74%<span className="ml-1 text-xs text-muted-foreground">LTV</span></span>
      </div>

      {/* Origination queue */}
      <div className="mt-5">
        <p className="font-mono text-[0.7rem] uppercase tracking-[0.18em] text-muted-foreground">Origination queue</p>
        <ul className="mt-3 space-y-2">
          {QUEUE.map((row, i) => {
            const Icon = row.icon;
            const isActive = i === active;
            return (
              <li
                key={row.name}
                className={`flex items-center gap-3 rounded-lg border px-3 py-2.5 transition-all duration-500 ${
                  isActive ? "border-primary/40 bg-secondary/60" : "border-transparent bg-transparent opacity-70"
                }`}
              >
                <span className={`inline-flex h-8 w-8 items-center justify-center rounded-lg transition-colors ${isActive ? "bg-primary/20 text-accent" : "bg-secondary text-muted-foreground"}`}>
                  <Icon className="h-4 w-4" strokeWidth={1.7} />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold text-foreground">{row.name}</p>
                  <p className="truncate font-mono text-[0.7rem] text-muted-foreground">{row.step}</p>
                </div>
                <span className={`shrink-0 font-mono text-xs ${isActive ? "text-accent" : "text-muted-foreground"}`}>{row.status}</span>
              </li>
            );
          })}
        </ul>
      </div>
    </div>
  );
}
