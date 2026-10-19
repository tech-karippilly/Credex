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
      title: "About NEURAFORGE | Software Development Company in Kerala",
      description: "NEURAFORGE is a technology company in Irinjalakuda, Thrissur, Kerala, building the lending OS for India's NBFCs and MFIs.",
      path: "/about",
    }),
  component: About,
});

const stats = [
  { value: "10+", label: "Engineers, designers & QA" },
  { value: "6 wk", label: "Typical CREDEX go-live" },
  { value: "1", label: "Flagship lending platform" },
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
  { icon: Code2, label: "Custom software development" },
  { icon: Cloud, label: "SaaS platforms" },
  { icon: Boxes, label: "Web & digital applications" },
  { icon: Workflow, label: "Business automation" },
  { icon: Database, label: "Data & technology solutions" },
  { icon: Landmark, label: "NBFC & lending systems" },
];

const choose = [
  { t: "Business-first thinking", d: "We begin with your problem, not with a technology." },
  { t: "Practical solutions", d: "We build what is useful, reliable and maintainable." },
  { t: "Clear communication", d: "You always know where your project stands." },
  { t: "Built to grow", d: "Solutions designed to scale with your business." },
];

function About() {
  return (
    <>
      <PageHero
        eyebrow="About NEURAFORGE"
        title="A software team that ships real products."
        text="We design and build custom software, SaaS and automation — and we run CREDEX, our loan management platform for India's NBFCs and MFIs."
      />

      {/* Who We Are — text + facts panel (no image) */}
      <section className="container-site py-20 md:py-24">
        <div className="grid items-center gap-14 lg:grid-cols-[1.1fr_1fr]">
          <Reveal>
            <SectionHeading eyebrow="Who We Are" title="A technology partner for growing businesses" />
            <p className="mt-6 text-lg leading-relaxed text-muted-foreground">
              {company.brand} is a software company based in Irinjalakuda, Thrissur, Kerala, focused on building the lending operating system for India&apos;s NBFCs and MFIs — origination, collections and the ledger on one platform.
            </p>
            <p className="mt-4 text-lg leading-relaxed text-muted-foreground">
              We work closely with businesses to understand how they operate, then design and build technology that removes friction, saves time and creates measurable value.
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
            { icon: Target, label: "Mission", text: "To build practical technology solutions that solve real business problems and create measurable value." },
            { icon: Eye, label: "Vision", text: "To become a trusted technology partner for businesses looking to simplify, transform and grow through technology." },
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
              title="Understand. Plan. Build. Launch. Improve."
              text="We take time to understand your business before writing a line of code — then deliver in clear stages, with continuous improvement after launch."
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
          <SectionHeading eyebrow="Why Businesses Choose Us" title="A serious, modern technology partner" />
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

      <CtaBand title="Let's talk about your business." text="Share your challenge and we'll explore how technology can help." cta="Get in Touch" />
    </>
  );
}
