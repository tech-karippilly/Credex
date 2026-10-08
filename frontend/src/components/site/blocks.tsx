import { Link } from "@tanstack/react-router";
import { ArrowRight } from "lucide-react";
import type { ReactNode } from "react";

export function PageHero({ eyebrow, title, text, children }: { eyebrow: string; title: string; text: string; children?: ReactNode }) {
  return (
    <section className="relative overflow-hidden border-b border-border bg-surface">
      <div className="grid-lines absolute inset-0 [mask-image:radial-gradient(ellipse_at_top_right,black,transparent_70%)]" aria-hidden="true" />
      <div className="container-site relative py-20 md:py-28">
        <p className="eyebrow animate-rise">{eyebrow}</p>
        <h1 className="mt-5 max-w-4xl text-4xl font-semibold leading-[1.08] text-foreground animate-rise md:text-6xl">{title}</h1>
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
      <h2 className="mt-4 text-3xl font-semibold leading-tight text-foreground md:text-5xl">{title}</h2>
      {text && <p className="mt-5 text-lg leading-relaxed text-muted-foreground">{text}</p>}
    </div>
  );
}

export function CtaBand({ title, text, cta }: { title: string; text: string; cta: string }) {
  return (
    <section className="container-site py-20">
      <div className="relative overflow-hidden rounded-3xl bg-ink px-8 py-14 text-ink-foreground md:px-16 md:py-20">
        <div className="grid-lines-dark absolute inset-0" aria-hidden="true" />
        <div className="relative grid items-center gap-8 md:grid-cols-[1fr_auto]">
          <div>
            <h2 className="max-w-2xl text-3xl font-semibold leading-tight md:text-4xl">{title}</h2>
            <p className="mt-4 max-w-xl text-ink-muted">{text}</p>
          </div>
          <Link to="/contact" className="btn btn-light">{cta} <ArrowRight className="h-4 w-4" /></Link>
        </div>
      </div>
    </section>
  );
}
