import { createFileRoute } from "@tanstack/react-router";
import {
  Target, Eye, Lightbulb, Users, BadgeCheck, ScanEye, RefreshCw, Handshake,
  Code2, Cloud, Landmark, Boxes, Workflow, Database, Sparkles, ArrowUpRight,
} from "lucide-react";
import { seo } from "@/lib/seo";
import { company } from "@/lib/site";
import { CtaBand, PageHero, SectionHeading, Reveal } from "@/components/site/blocks";
import { Team } from "@/components/site/Team";

export const Route = createFileRoute("/about")({
  head: () =>
    seo({
      title: "About CREDEX | The Lending OS Team in Kerala",
      description: "CREDEX is a next-generation lending operating system built in Irinjalakuda, Thrissur, Kerala, for India's NBFCs and MFIs.",
      path: "/about",
    }),
  component: About,
});

const stats = [
  { value: "10+", label: "Engineers, designers & QA" },
  { value: "6 wk", label: "Typical NBFC go-live" },
  { value: "1", label: "Unified lending platform" },
  { value: "100%", label: "India-hosted & audit-ready" },
];

const values = [
  { icon: Lightbulb, title: "Practical Innovation", text: "New ideas, applied where they genuinely help." },
  { icon: Users, title: "Customer Focus", text: "Your goals shape every decision we make." },
  { icon: BadgeCheck, title: "Quality", text: "Reliable, well-built solutions that last." },
  { icon: ScanEye, title: "Transparency", text: "Clear communication at every stage." },
  { icon: RefreshCw, title: "Continuous Improvement", text: "Always refining how we work and what we deliver." },
  { icon: Handshake, title: "Long-Term Partnership", text: "Support that continues well beyond launch." },
];

const focus = [
  { icon: Code2, label: "Configurable loan schemes" },
  { icon: Cloud, label: "Cloud-native & India-hosted" },
  { icon: Boxes, label: "Modular lending engines" },
  { icon: Workflow, label: "Automated loan lifecycle" },
  { icon: Database, label: "Real-time general ledger" },
  { icon: Landmark, label: "NBFC & MFI focused" },
];

const choose = [
  { t: "Lending-first thinking", d: "We begin with your loan products and branch reality, not generic software." },
  { t: "Reliable by design", d: "A single real-time core built to be dependable and maintainable." },
  { t: "Clear communication", d: "You always know where your rollout stands." },
  { t: "Built to grow", d: "Add products and branches without re-platforming." },
];

function About() {
  return (
    <>
      <PageHero
        eyebrow="About CREDEX"
        title="The team building India's next-generation lending OS."
        text="CREDEX is a modern loan management operating system for India's NBFCs and MFIs — unifying origination, collections and the general ledger on one real-time core."
      />

      {/* Who We Are — text + facts panel (no image) */}
      <section className="container-site py-20 md:py-24">
        <div className="grid items-center gap-14 lg:grid-cols-[1.1fr_1fr]">
          <Reveal>
            <SectionHeading eyebrow="Who We Are" title="A product team for India's lenders" />
            <p className="mt-6 text-lg leading-relaxed text-muted-foreground">
              {company.brand} is a lending-technology company based in Irinjalakuda, Thrissur, Kerala, building the operating system for India&apos;s NBFCs and MFIs — origination, collections and the ledger on one real-time platform.
            </p>
            <p className="mt-4 text-lg leading-relaxed text-muted-foreground">
              We work closely with lenders to understand how their branches and field teams actually operate, then shape CREDEX to remove friction, enforce controls, and create measurable value.
            </p>
          </Reveal>

          {/* Futuristic facts panel */}
          <Reveal delay={120}>
            <div className="card-bento relative overflow-hidden p-7 sm:p-8">
              <div className="dot-matrix absolute inset-0 opacity-50" aria-hidden="true" />
              <div
                className="pointer-events-none absolute -right-16 -top-16 h-44 w-44 rounded-full bg-primary/10 blur-3xl"
                aria-hidden="true"
              />
              <div className="relative flex items-center gap-2 font-mono text-[11px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
                <Sparkles className="h-3.5 w-3.5 text-primary" />
                Company at a glance
              </div>
              <div className="relative mt-6 grid grid-cols-2 gap-px overflow-hidden rounded-2xl border border-border bg-border">
                {stats.map((s) => (
                  <div key={s.label} className="bg-card p-5">
                    <p className="font-display text-3xl font-semibold text-foreground">{s.value}</p>
                    <p className="mt-1 text-xs leading-snug text-muted-foreground">{s.label}</p>
                  </div>
                ))}
              </div>
              <p className="relative mt-5 font-mono text-xs text-muted-foreground">
                HQ · Irinjalakuda, Thrissur, Kerala
              </p>
            </div>
          </Reveal>
        </div>
      </section>

      {/* Mission & Vision */}
      <section className="border-y border-border bg-surface/70">
        <div className="container-site grid gap-6 py-20 md:grid-cols-2">
          {[
            { icon: Target, label: "Mission", text: "To give every lender a modern, reliable operating system that makes lending faster, safer and fully auditable." },
            { icon: Eye, label: "Vision", text: "To become the default lending OS for India's NBFCs and MFIs — from single-branch lenders to multi-product books." },
          ].map((m, i) => (
            <Reveal key={m.label} delay={i * 90}>
              <div className="card-bento h-full p-9">
                <span className="inline-flex h-12 w-12 items-center justify-center rounded-2xl border border-primary/20 bg-primary/10 text-primary">
                  <m.icon className="h-6 w-6" strokeWidth={1.7} />
                </span>
                <h2 className="mt-6 font-mono text-xs font-bold uppercase tracking-[0.18em] text-muted-foreground">{m.label}</h2>
                <p className="mt-3 font-display text-2xl leading-snug text-foreground">{m.text}</p>
              </div>
            </Reveal>
          ))}
        </div>
      </section>

      {/* What We Believe — values */}
      <section className="container-site py-24">
        <Reveal>
          <SectionHeading
            eyebrow="What We Believe"
            title="Technology should do more than just work."
            text="It should solve real business problems, simplify complex processes, and create meaningful value. These values guide how we work."
          />
        </Reveal>
        <div className="mt-12 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {values.map((v, i) => (
            <Reveal key={v.title} delay={i * 60}>
              <div className="card-bento group h-full p-7">
                <span className="inline-flex h-11 w-11 items-center justify-center rounded-xl bg-secondary text-primary transition-colors group-hover:bg-primary group-hover:text-white">
                  <v.icon className="h-5 w-5" strokeWidth={1.7} />
                </span>
                <h3 className="mt-5 text-lg font-semibold text-foreground">{v.title}</h3>
                <p className="mt-2 text-muted-foreground">{v.text}</p>
              </div>
            </Reveal>
          ))}
        </div>
      </section>

      {/* Approach + Focus */}
      <section className="border-y border-border bg-surface/70">
        <div className="container-site grid gap-14 py-24 lg:grid-cols-[1fr_1.05fr]">
          <Reveal>
            <SectionHeading
              eyebrow="Our Approach"
              title="Understand. Configure. Migrate. Go live. Improve."
              text="We take time to understand your loan products and operating model before rollout — then deliver in clear stages, with continuous improvement after go-live."
            />
          </Reveal>
          <Reveal delay={120}>
            <p className="eyebrow">Our Focus</p>
            <div className="mt-6 grid gap-3 sm:grid-cols-2">
              {focus.map((f) => (
                <div key={f.label} className="card-site flex items-center gap-3.5 p-4">
                  <span className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-secondary text-primary">
                    <f.icon className="h-5 w-5" strokeWidth={1.7} />
                  </span>
                  <span className="font-display text-sm font-semibold text-foreground">{f.label}</span>
                </div>
              ))}
            </div>
          </Reveal>
        </div>
      </section>

      {/* Why Businesses Choose Us */}
      <section className="container-site py-24">
        <Reveal>
          <SectionHeading eyebrow="Why Lenders Choose Us" title="A serious, modern lending-tech partner" />
        </Reveal>
        <div className="mt-12 grid gap-5 md:grid-cols-2 lg:grid-cols-4">
          {choose.map((c, i) => (
            <Reveal key={c.t} delay={i * 70}>
              <div className="card-bento group h-full p-6">
                <div className="flex items-center justify-between">
                  <span className="font-display text-2xl font-semibold text-primary">0{i + 1}</span>
                  <ArrowUpRight className="h-5 w-5 text-muted-foreground transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5 group-hover:text-primary" />
                </div>
                <h3 className="mt-4 text-lg font-semibold text-foreground">{c.t}</h3>
                <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{c.d}</p>
              </div>
            </Reveal>
          ))}
        </div>
      </section>

      <Team />

      <CtaBand title="Let's talk about your lending book." text="Share how you lend today and we'll show you how CREDEX fits." cta="Get in Touch" />
    </>
  );
}
