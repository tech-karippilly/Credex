import { Link } from "@tanstack/react-router";
import { ArrowRight } from "lucide-react";
import type { ReactNode } from "react";
import { useReveal } from "@/lib/use-reveal";

export function Reveal({ children, delay = 0, className = "" }: { children: ReactNode; delay?: number; className?: string }) {
  const { ref, inView } = useReveal<HTMLDivElement>();
  return (
    <div
      ref={ref}
      className={`${inView ? "animate-rise" : "opacity-0"} ${className}`}
      style={inView && delay ? { animationDelay: `${delay}ms` } : undefined}
    >
      {children}
    </div>
  );
}

export function PageHero({ eyebrow, title, text, children }: { eyebrow: string; title: string; text: string; children?: ReactNode }) {
  return (
    <section className="relative overflow-hidden border-b border-border bg-surface">
      <div className="grid-lines absolute inset-0 [mask-image:radial-gradient(ellipse_at_top_right,black,transparent_70%)]" aria-hidden="true" />
      <div className="container-site relative py-20 md:py-28">
        <p className="eyebrow animate-rise">{eyebrow}</p>
        <h1 className="text-gradient mt-5 max-w-4xl text-4xl font-semibold leading-[1.08] animate-rise md:text-6xl">{title}</h1>
        <p className="mt-6 max-w-2xl text-lg leading-relaxed text-muted-foreground animate-rise">{text}</p>
        {children && <div className="mt-8 flex flex-wrap gap-3">{children}</div>}
      </div>
    </section>
  );
}

export function SectionHeading({ eyebrow, title, text, center = false }: { eyebrow: string; title: string; text?: string; center?: boolean }) {
  return (
    <div className={center ? "mx-auto max-w-3xl text-center" : "max-w-3xl"}>
      <p className="eyebrow">{eyebrow}</p>
      <h2 className="text-gradient mt-4 text-3xl font-semibold leading-tight md:text-5xl">{title}</h2>
      {text && <p className="mt-5 text-lg leading-relaxed text-muted-foreground">{text}</p>}
    </div>
  );
}

export function CtaBand({ title, text, cta }: { title: string; text: string; cta: string }) {
  return (
    <section className="container-site py-20">
      <div className="relative overflow-hidden rounded-[2rem] bg-ink px-8 py-16 text-ink-foreground shadow-2xl md:px-16 md:py-20">
        {/* Ambient copper glows */}
        <div
          className="pointer-events-none absolute -right-28 -top-28 h-80 w-80 rounded-full bg-primary/30 blur-3xl"
          aria-hidden="true"
        />
        <div
          className="pointer-events-none absolute -bottom-32 -left-20 h-80 w-80 rounded-full bg-primary/15 blur-3xl"
          aria-hidden="true"
        />
        <div className="grid-lines-dark absolute inset-0 opacity-40" aria-hidden="true" />

        <div className="relative grid items-center gap-10 md:grid-cols-[1fr_auto]">
          <div className="max-w-2xl">
            <span className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/[0.06] px-3.5 py-1.5 font-mono text-[11px] font-semibold uppercase tracking-widest text-amber-300">
              <span className="relative flex h-2 w-2">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-amber-300 opacity-60" />
                <span className="relative inline-flex h-2 w-2 rounded-full bg-amber-300" />
              </span>
              Let&apos;s build together
            </span>
            <h2 className="mt-5 font-display text-3xl font-semibold leading-[1.1] text-white md:text-[2.75rem]">
              {title}
            </h2>
            <p className="mt-4 text-lg leading-relaxed text-ink-muted">{text}</p>
          </div>

          <div className="flex flex-col items-start gap-4 md:items-end">
            <Link to="/contact" className="btn btn-light group w-full justify-center sm:w-auto">
              {cta}
              <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
            </Link>
            <p className="font-mono text-xs text-ink-muted">
              Response within 1 business day
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}
