import { createFileRoute, Link } from "@tanstack/react-router";
import {
  ArrowRight, ArrowUpRight, Code2, Smartphone, Globe, Cloud, Landmark, Workflow,
  PenTool, ShieldCheck, Database, Plug, LifeBuoy, Cpu, Check,
} from "lucide-react";
import { seo } from "@/lib/seo";
import { CtaBand, PageHero, SectionHeading, Reveal } from "@/components/site/blocks";

export const Route = createFileRoute("/services")({
  head: () =>
    seo({
      title: "Services | Software, Mobile, Web, Cloud & Automation — NEURAFORGE",
      description:
        "End-to-end software services from NEURAFORGE: custom software development, mobile app development, web platforms, SaaS, cloud & DevOps, UI/UX, QA, automation, API integration, fintech and ongoing support.",
      path: "/services",
    }),
  component: Services,
});

const services = [
  {
    id: "software",
    icon: Code2,
    title: "Custom software development",
    text: "Bespoke applications engineered around your exact workflows — from architecture and discovery to launch and long-term support.",
    tags: ["Enterprise apps", "Internal tools", "Legacy modernization"],
  },
  {
    id: "mobile",
    icon: Smartphone,
    title: "Mobile app development",
    text: "Native and cross-platform iOS & Android apps with offline support, push, and app-store delivery handled end to end.",
    tags: ["iOS & Android", "React Native / Flutter", "Field & ops apps"],
  },
  {
    id: "web",
    icon: Globe,
    title: "Web application development",
    text: "Fast, responsive, SEO-ready web platforms, portals and dashboards built on modern type-safe stacks.",
    tags: ["Portals & dashboards", "Marketing sites", "Progressive web apps"],
  },
  {
    id: "saas",
    icon: Cloud,
    title: "SaaS product engineering",
    text: "Multi-tenant platforms with roles, billing, and real-time analytics — engineered to scale cleanly with your users.",
    tags: ["Multi-tenancy", "Subscription billing", "Admin consoles"],
  },
  {
    id: "cloud",
    icon: Cpu,
    title: "Cloud & DevOps",
    text: "Cloud architecture, containerization, CI/CD pipelines and observability so releases are fast, safe and repeatable.",
    tags: ["AWS / Azure / GCP", "Docker & CI/CD", "Monitoring & scaling"],
  },
  {
    id: "design",
    icon: PenTool,
    title: "UI/UX design",
    text: "Research-led product design — clean interfaces, design systems and prototypes your stakeholders can validate early.",
    tags: ["Design systems", "Prototyping", "Usability testing"],
  },
  {
    id: "automation",
    icon: Workflow,
    title: "Business process automation",
    text: "Replace manual handoffs and spreadsheets with automated workflows that connect your existing tools.",
    tags: ["Workflow engines", "Document automation", "No manual rekeying"],
  },
  {
    id: "integration",
    icon: Plug,
    title: "API development & integration",
    text: "Robust APIs and third-party integrations — payments, KYC, messaging, ERPs and bureaus — wired into one system.",
    tags: ["REST & GraphQL", "Payment & KYC", "ERP / CRM sync"],
  },
  {
    id: "data",
    icon: Database,
    title: "Data & analytics solutions",
    text: "Data pipelines, warehousing and dashboards that turn operational data into decisions and MIS reporting.",
    tags: ["Pipelines & ETL", "BI dashboards", "Reporting & MIS"],
  },
  {
    id: "fintech",
    icon: Landmark,
    title: "NBFC & lending systems",
    text: "Regulated financial software and our flagship CREDEX loan management platform for India's NBFCs and MFIs.",
    tags: ["Loan origination (LOS)", "Loan management (LMS)", "RBI-ready reporting"],
  },
  {
    id: "qa",
    icon: ShieldCheck,
    title: "QA & test automation",
    text: "Manual and automated QA, regression suites and release testing so every ship is reliable and defensible.",
    tags: ["Automated regression", "Load & security testing", "Release QA"],
  },
  {
    id: "support",
    icon: LifeBuoy,
    title: "Maintenance & support",
    text: "Ongoing engineering, performance tuning and feature rollouts long after go-live — we stay engaged.",
    tags: ["SLA support", "Performance tuning", "Feature iterations"],
  },
];

const engagement = [
  { step: "01", title: "Dedicated team", text: "An embedded squad that works as an extension of your business." },
  { step: "02", title: "Fixed-scope project", text: "A defined deliverable, timeline and budget for a clear outcome." },
  { step: "03", title: "Product partnership", text: "We co-build and evolve your product over the long term." },
];

function Services() {
  return (
    <>
      <PageHero
        eyebrow="Services"
        title="Every kind of software your business needs."
        text="From custom software and mobile apps to SaaS, cloud, automation and regulated fintech — one engineering team across the full build lifecycle."
      >
        <nav aria-label="Services" className="flex flex-wrap gap-2">
          {services.slice(0, 6).map((s) => (
            <a
              key={s.id}
              href={`#${s.id}`}
              className="rounded-full border border-border bg-card px-4 py-2 text-sm font-medium hover:border-primary hover:text-primary"
            >
              {s.title}
            </a>
          ))}
        </nav>
      </PageHero>

      {/* Services bento grid */}
      <section className="container-site py-20 md:py-24">
        <Reveal>
          <SectionHeading
            eyebrow="Capabilities"
            title="A full-stack software partner."
            text="Pick a single service or an end-to-end build — every engagement shares the same engineering standards, documentation and long-term support."
          />
        </Reveal>
        <div className="mt-12 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {services.map((s, i) => (
            <Reveal key={s.id} delay={(i % 3) * 70}>
              <article id={s.id} className="card-bento group flex h-full scroll-mt-24 flex-col p-7">
                <div className="flex items-center justify-between">
                  <span className="inline-flex h-12 w-12 items-center justify-center rounded-2xl border border-primary/20 bg-primary/10 text-primary transition-colors group-hover:bg-primary group-hover:text-white">
                    <s.icon className="h-6 w-6" strokeWidth={1.7} />
                  </span>
                  <span className="font-mono text-[11px] font-medium tracking-wider text-muted-foreground">
                    {String(i + 1).padStart(2, "0")}
                  </span>
                </div>
                <h3 className="mt-6 text-xl font-semibold text-foreground">{s.title}</h3>
                <p className="mt-2.5 flex-1 text-sm leading-relaxed text-muted-foreground">{s.text}</p>
                <ul className="mt-5 flex flex-wrap gap-1.5">
                  {s.tags.map((t) => (
                    <li
                      key={t}
                      className="rounded-full border border-border bg-surface px-2.5 py-1 font-mono text-[10px] font-medium text-muted-foreground"
                    >
                      {t}
                    </li>
                  ))}
                </ul>
                <Link
                  to="/contact"
                  className="mt-6 inline-flex items-center gap-1.5 text-sm font-semibold text-primary"
                >
                  Discuss this service
                  <ArrowUpRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
                </Link>
              </article>
            </Reveal>
          ))}
        </div>
      </section>

      {/* Engagement models */}
      <section className="border-y border-border bg-surface/70">
        <div className="container-site py-24">
          <Reveal>
            <SectionHeading
              center
              eyebrow="How we engage"
              title="Work with us the way that fits."
              text="Whether you need a full product team, a fixed deliverable, or a long-term partner — we shape the engagement around your goals."
            />
          </Reveal>
          <div className="mt-14 grid gap-5 md:grid-cols-3">
            {engagement.map((e, i) => (
              <Reveal key={e.step} delay={i * 80}>
                <div className="card-bento h-full p-8">
                  <span className="font-display text-3xl font-semibold text-primary">{e.step}</span>
                  <h3 className="mt-4 text-xl font-semibold text-foreground">{e.title}</h3>
                  <p className="mt-2.5 leading-relaxed text-muted-foreground">{e.text}</p>
                </div>
              </Reveal>
            ))}
          </div>

          <Reveal delay={120}>
            <div className="mt-10 flex flex-wrap items-center justify-center gap-3 text-center">
              {["Discovery", "Design", "Build", "Test", "Launch", "Support"].map((p) => (
                <span key={p} className="inline-flex items-center gap-2 font-mono text-xs text-muted-foreground">
                  <Check className="h-4 w-4 text-primary" />
                  {p}
                </span>
              ))}
            </div>
          </Reveal>
        </div>
      </section>

      <CtaBand
        title="Not sure which service fits?"
        text="Tell us about your business and we'll recommend a practical starting point — from a quick build to a full product partnership."
        cta="Discuss Your Requirement"
      />
    </>
  );
}
