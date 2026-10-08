import { createFileRoute, Link } from "@tanstack/react-router";
import {
  ArrowRight, ArrowUpRight, Search, PenTool, Hammer, TrendingUp,
  Minimize2, Hand, Gauge, Workflow, Network, BarChart3, Sprout, Building2, Check,
} from "lucide-react";
import hero from "@/assets/hero.jpg";
import team from "@/assets/team.jpg";
import { iconFor, useContent } from "@/lib/content";
import { seo } from "@/lib/seo";
import { CtaBand, SectionHeading } from "@/components/site/blocks";

export const Route = createFileRoute("/")({
  head: () =>
    seo({
      title: "Credex.in Tech Solutions Pvt. Ltd. | Technology Solutions for Businesses",
      description:
        "Credex builds custom software, SaaS solutions, web applications, business automation and digital transformation solutions for businesses.",
      path: "/",
    }),
  component: Home,
});

const why = [
  { icon: Search, title: "Understand", text: "We start by understanding your business, processes and challenges." },
  { icon: PenTool, title: "Design", text: "We design practical solutions around your actual requirements." },
  { icon: Hammer, title: "Build", text: "We develop reliable and scalable technology solutions." },
  { icon: TrendingUp, title: "Improve", text: "We continuously look for ways to improve efficiency and business value." },
];

const steps = ["Understand", "Plan", "Build", "Launch", "Improve"];

const value = [
  { icon: Minimize2, label: "Simplify Operations" },
  { icon: Hand, label: "Reduce Manual Work" },
  { icon: Gauge, label: "Improve Efficiency" },
  { icon: Workflow, label: "Automate Processes" },
  { icon: Network, label: "Connect Business Workflows" },
  { icon: BarChart3, label: "Make Better Use of Data" },
  { icon: Sprout, label: "Support Business Growth" },
  { icon: Building2, label: "Build for the Future" },
];

function Home() {
  const { services, settings } = useContent();
  const last = services.length - 1;
  const wideLast = services.length % 3 === 1;
  return (
    <>
      {/* Hero */}
      <section className="relative overflow-hidden bg-surface">
        <div className="grid-lines absolute inset-0 [mask-image:radial-gradient(ellipse_at_top_left,black,transparent_65%)]" aria-hidden="true" />
        <div className="container-site relative grid items-center gap-14 py-16 md:py-24 lg:grid-cols-[1.05fr_1fr]">
          <div>
            <p className="eyebrow animate-rise">Ideas. Technology. Real Impact.</p>
            <h1 className="mt-6 text-4xl font-semibold leading-[1.05] text-foreground animate-rise sm:text-5xl lg:text-[4rem]">
              {settings.hero_title}
            </h1>
            <p className="mt-6 max-w-xl text-lg leading-relaxed text-muted-foreground animate-rise">
              {settings.hero_text}
            </p>
            <div className="mt-9 flex flex-wrap gap-3 animate-rise">
              <Link to="/services" className="btn btn-primary">Explore Our Services <ArrowRight className="h-4 w-4" /></Link>
              <Link to="/contact" className="btn btn-outline">Talk to Us</Link>
            </div>
          </div>
          <div className="relative animate-rise">
            <div className="overflow-hidden rounded-3xl shadow-[var(--shadow-lift)]">
              <img src={settings.hero_image || hero} alt="Credex team reviewing a business workflow dashboard" width={1600} height={1200} className="aspect-[4/3] w-full object-cover" fetchPriority="high" />
            </div>
            <div className="card-site absolute -bottom-6 left-4 hidden max-w-[260px] p-5 sm:block md:-left-8">
              <p className="text-xs font-bold uppercase tracking-[0.14em] text-muted-foreground">Our focus</p>
              <ul className="mt-3 space-y-2 text-sm font-medium">
                {["Custom software", "Business automation", "SaaS platforms"].map((t) => (
                  <li key={t} className="flex items-center gap-2"><Check className="h-4 w-4 text-primary" />{t}</li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* What we do */}
      <section className="container-site py-24">
        <SectionHeading eyebrow="What We Do" title="What We Do" text="At Credex, we build technology around real business needs — from understanding the challenge to designing, developing and supporting practical digital solutions." />
        <div className="mt-14 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {services.map((s, i) => { const Icon = iconFor(s.icon); const wide = wideLast && i === last; return (
            <article key={s.id} className={`card-site card-hover group flex flex-col p-7 ${wide ? "lg:col-span-3 lg:flex-row lg:items-center lg:gap-10" : ""}`}>
              <span className="inline-flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-secondary text-primary">
                <Icon className="h-6 w-6" strokeWidth={1.6} />
              </span>
              <div className={`mt-6 flex-1 ${wide ? "lg:mt-0" : ""}`}>
                <h3 className="text-xl font-semibold">{s.title}</h3>
                <p className="mt-3 leading-relaxed text-muted-foreground">{s.short}</p>
              </div>
              <Link to="/services" hash={s.id} className="mt-6 inline-flex items-center gap-1.5 text-sm font-semibold text-primary lg:mt-6">
                Learn More <ArrowUpRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
              </Link>
            </article>
          ); })}
        </div>
      </section>

      {/* Why Credex */}
      <section className="bg-ink text-ink-foreground">
        <div className="container-site grid gap-14 py-24 lg:grid-cols-[1fr_1.4fr]">
          <div>
            <p className="eyebrow text-cyan">Why Credex</p>
            <h2 className="mt-4 text-3xl font-semibold leading-tight md:text-5xl">Technology Built Around Your Business</h2>
            <p className="mt-5 text-lg text-ink-muted">Technology should fit the way your business works — not the other way around.</p>
          </div>
          <div className="grid gap-px overflow-hidden rounded-2xl border border-ink-border bg-ink-border sm:grid-cols-2">
            {why.map((w) => (
              <div key={w.title} className="bg-ink p-8">
                <w.icon className="h-6 w-6 text-cyan" strokeWidth={1.6} />
                <h3 className="mt-5 text-xl font-semibold">{w.title}</h3>
                <p className="mt-2 text-ink-muted">{w.text}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Approach */}
      <section className="container-site py-24">
        <SectionHeading center eyebrow="Our Approach" title="From Challenge to Solution" text="We combine business understanding with technology expertise to turn complex requirements into practical digital solutions." />
        <ol className="relative mt-16 grid gap-6 md:grid-cols-5">
          <div className="absolute left-0 right-0 top-7 hidden h-px bg-border md:block" aria-hidden="true" />
          {steps.map((s, i) => (
            <li key={s} className="relative flex items-center gap-4 md:flex-col md:text-center">
              <span className="relative z-10 inline-flex h-14 w-14 shrink-0 items-center justify-center rounded-full border border-border bg-card font-display text-lg font-semibold text-primary shadow-[var(--shadow-card)]">
                {String(i + 1).padStart(2, "0")}
              </span>
              <span className="font-display text-lg font-semibold">{s}</span>
            </li>
          ))}
        </ol>
      </section>

      {/* Business value */}
      <section className="border-y border-border bg-surface">
        <div className="container-site py-24">
          <SectionHeading eyebrow="Business Value" title="Technology That Creates Real Business Value" />
          <ul className="mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {value.map((v) => (
              <li key={v.label} className="card-site flex items-center gap-4 p-5">
                <v.icon className="h-5 w-5 shrink-0 text-primary" strokeWidth={1.7} />
                <span className="font-semibold">{v.label}</span>
              </li>
            ))}
          </ul>
        </div>
      </section>

      {/* About */}
      <section className="container-site grid items-center gap-14 py-24 lg:grid-cols-2">
        <img src={settings.about_image || team} alt="Credex team planning a business process on a whiteboard" width={1408} height={1008} loading="lazy" className="aspect-[4/3] w-full rounded-3xl object-cover" />
        <div>
          <SectionHeading eyebrow="About Credex" title="Building Technology With Purpose" />
          <p className="mt-6 text-lg leading-relaxed text-muted-foreground">
            Credex.in Tech Solutions Pvt. Ltd. is a technology company focused on building modern software, digital solutions, SaaS platforms, and technology services that help businesses simplify operations and grow with confidence.
          </p>
          <p className="mt-4 text-lg leading-relaxed text-muted-foreground">
            At Credex, we believe technology should do more than just work. It should solve real business problems, simplify complex processes, and create meaningful value.
          </p>
          <Link to="/about" className="btn btn-primary mt-8">Learn More About Credex <ArrowRight className="h-4 w-4" /></Link>
        </div>
      </section>

      <CtaBand title="Have a business challenge in mind?" text="Tell us what you're working on. We'll help you find a practical way forward." cta="Let's Talk" />
    </>
  );
}
