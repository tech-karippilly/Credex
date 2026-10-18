import { ShieldCheck, Lock, Server, FileCheck2 } from "lucide-react";

/** Futuristic compliance & security telemetry banner above the governance cards. */
export function TrustShieldArt() {
  return (
    <div className="mt-8 overflow-hidden rounded-2xl border border-border bg-gradient-to-br from-card via-surface/80 to-secondary/50 p-5 shadow-[var(--shadow-card)]" aria-hidden="true">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3.5">
          <div className="relative flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-primary text-primary-foreground shadow-md shadow-primary/25">
            <ShieldCheck className="h-6 w-6" strokeWidth={1.8} />
            <span className="absolute -right-1 -top-1 flex h-3.5 w-3.5 items-center justify-center rounded-full border-2 border-card bg-emerald-500" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-display text-sm font-semibold text-foreground">
                Regulatory &amp; Security Posture
              </span>
              <span className="rounded-full bg-emerald-500/12 px-2 py-0.5 font-mono text-[10px] font-semibold uppercase tracking-wider text-emerald-700">
                VERIFIED
              </span>
            </div>
            <p className="mt-0.5 font-mono text-[11px] text-muted-foreground">
              Continuous maker-checker &amp; inspection telemetry
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <span className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-card px-2.5 py-1.5 font-mono text-[11px] font-medium text-foreground">
            <FileCheck2 className="h-3.5 w-3.5 text-primary" />
            RBI IRAC
          </span>
          <span className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-card px-2.5 py-1.5 font-mono text-[11px] font-medium text-foreground">
            <Lock className="h-3.5 w-3.5 text-primary" />
            AES-256
          </span>
          <span className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-card px-2.5 py-1.5 font-mono text-[11px] font-medium text-foreground">
            <Server className="h-3.5 w-3.5 text-primary" />
            IN-SOUTH
          </span>
        </div>
      </div>
    </div>
  );
}
