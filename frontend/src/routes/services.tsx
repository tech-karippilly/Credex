import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowRight, Check } from "lucide-react";
import hero from "@/assets/hero.jpg";
import build from "@/assets/build.jpg";
import team from "@/assets/team.jpg";
import { iconFor, useContent } from "@/lib/content";
import { seo } from "@/lib/seo";
import { CtaBand, PageHero } from "@/components/site/blocks";

export const Route = createFileRoute("/services")({
  head: () =>
    seo({
      title: "Services | Custom Software, SaaS & Business Automation — Credex",
      description: "Custom software development, SaaS solutions, web application development, business automation, data solutions, digital transformation and IT consulting from Credex, Kerala.",
      path: "/services",
    }),
  component: Services,
});

const images = [build, hero, team];

function Services() {
  const { services } = useContent();
  return (
    <>
      <PageHero eyebrow="Services" title="Technology services built around your business." text="Focused services that help you simplify operations, automate work and build digital solutions that last.">
        <nav aria-label="Services" className="flex flex-wrap gap-2">
          {services.map((s) => (
            <a key={s.id} href={`#${s.id}`} className="rounded-full border border-border bg-card px-4 py-2 text-sm font-medium hover:border-primary hover:text-primary">{s.title}</a>
          ))}
        </nav>
      </PageHero>

      <div className="container-site divide-y divide-border">
        {services.map((s, i) => { const Icon = iconFor(s.icon); return (
          <section key={s.id} id={s.id} className="scroll-mt-24 grid items-center gap-12 py-20 lg:grid-cols-2 lg:gap-20">
            <div className={i % 2 ? "lg:order-2" : ""}>
              <div className="relative">
                <img src={s.image_url || images[i % 3]} alt="" width={1408} height={1008} loading="lazy" className="aspect-[4/3] w-full rounded-3xl object-cover" />
                <span className="absolute left-5 top-5 inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-card text-primary shadow-[var(--shadow-card)]">
                  <Icon className="h-7 w-7" strokeWidth={1.6} />
                </span>
              </div>
            </div>
            <div>
              <span className="font-display text-sm font-semibold text-muted-foreground">{String(i + 1).padStart(2, "0")} / {String(services.length).padStart(2, "0")}</span>
              <h2 className="mt-3 text-3xl font-semibold leading-tight md:text-4xl">{s.title}</h2>
              <p className="mt-5 text-lg leading-relaxed text-muted-foreground">{s.description}</p>
              <div className="mt-8 grid gap-8 sm:grid-cols-2">
                <div>
                  <h3 className="text-xs font-bold uppercase tracking-[0.14em] text-primary">Key capabilities</h3>
                  <ul className="mt-4 space-y-2.5">
                    {s.capabilities.map((c) => <li key={c} className="flex gap-2.5 text-sm"><Check className="mt-0.5 h-4 w-4 shrink-0 text-primary" />{c}</li>)}
                  </ul>
                </div>
                <div>
                  <h3 className="text-xs font-bold uppercase tracking-[0.14em] text-primary">Business benefits</h3>
                  <ul className="mt-4 space-y-2.5">
                    {s.benefits.map((c) => <li key={c} className="flex gap-2.5 text-sm"><Check className="mt-0.5 h-4 w-4 shrink-0 text-cyan" />{c}</li>)}
                  </ul>
                </div>
              </div>
              <Link to="/contact" className="btn btn-primary mt-9">Discuss Your Requirement <ArrowRight className="h-4 w-4" /></Link>
            </div>
          </section>
        ); })}
      </div>

      <CtaBand title="Not sure which service fits?" text="Tell us about your business and we'll recommend a practical starting point." cta="Discuss Your Requirement" />
    </>
  );
}
