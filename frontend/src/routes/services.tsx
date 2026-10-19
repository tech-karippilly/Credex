import { createFileRoute, Link } from "@tanstack/react-router";
import {
  ArrowUpRight, Code2, Smartphone, Globe, Cloud, Landmark, Workflow,
  PenTool, ShieldCheck, Database, Plug, LifeBuoy, Cpu, Check,
} from "lucide-react";
import { seo } from "@/lib/seo";
import { CtaBand, PageHero, SectionHeading, Reveal } from "@/components/site/blocks";

export const Route = createFileRoute("/services")({
  head: () =>
    seo({
      title: "Platform | The CREDEX Lending OS Capabilities",
      description:
        "Everything inside CREDEX: loan origination, loan management, mobile field collections, integrated general ledger, compliance & RBI reporting, integrations, analytics and more — one unified lending operating system.",
      path: "/services",
    }),
  component: Services,
});

const services = [
  {
    id: "origination",
    icon: Workflow,
    title: "Loan origination (LOS)",
    text: "Lead-to-sanction origination with paperless KYC, bureau pulls, collateral checks and multi-tier credit workflows.",
    tags: ["eKYC & CKYC", "Bureau scorecards", "Multi-tier sanction"],
  },
  {
    id: "lms",
    icon: Landmark,
    title: "Loan management (LMS)",
    text: "The servicing core — dynamic EMI schedules, interest accrual, foreclosure, restructuring and part-payments.",
    tags: ["EMI schedules", "Foreclosure", "Restructuring"],
  },
  {
    id: "collections",
    icon: Smartphone,
    title: "Mobile field collections",
    text: "A field officer app for door-step recovery with digital receipts, promise-to-pay and offline sync.",
    tags: ["Field receipts", "Promise-to-pay", "Offline sync"],
  },
  {
    id: "ledger",
    icon: Database,
    title: "Integrated general ledger",
    text: "A real-time GL where every disbursal, receipt and voucher posts automatically — no spreadsheet reconciliation.",
    tags: ["Real-time GL", "Trial balance", "Auto vouchers"],
  },
  {
    id: "cloud",
    icon: Cloud,
    title: "Cloud & data residency",
    text: "Hosted on tier-1 Indian cloud regions with encryption at rest and in transit, and high-availability by default.",
    tags: ["India-hosted", "Encrypted", "High availability"],
  },
  {
    id: "compliance",
    icon: ShieldCheck,
    title: "Compliance & reporting",
    text: "RBI-aligned classification and returns, KFS generation and immutable maker-checker audit trails out of the box.",
    tags: ["IRAC / NPA", "KFS & returns", "Maker-checker logs"],
  },
  {
    id: "integrations",
    icon: Plug,
    title: "Integrations & APIs",
    text: "Payments, NACH/UPI, KYC, bureaus and messaging wired into one system through robust, documented APIs.",
    tags: ["NACH / UPI", "KYC & bureau", "REST APIs"],
  },
  {
    id: "config",
    icon: Code2,
    title: "Configurable products",
    text: "Launch new loan schemes, interest slabs and rules yourself — no vendor tickets, no custom code.",
    tags: ["Loan schemes", "Interest slabs", "Rule engine"],
  },
  {
    id: "branch",
    icon: Globe,
    title: "Multi-branch & roles",
    text: "Branches, field officers and head office on one ledger, with branch cash control and strict role-based access.",
    tags: ["Branch cash", "Role-based access", "Approval hierarchy"],
  },
  {
    id: "analytics",
    icon: Cpu,
    title: "Analytics & MIS",
    text: "Live portfolio health, PAR and NPA positions, and branch MIS dashboards for every stakeholder.",
    tags: ["PAR & NPA", "Branch MIS", "Portfolio dashboards"],
  },
  {
    id: "onboarding",
    icon: PenTool,
    title: "Customer onboarding",
    text: "Deduplicated, paperless customer onboarding with co-applicants, guarantors and group/center structures.",
    tags: ["Paperless KYC", "Dedup profiles", "Groups & co-applicants"],
  },
  {
    id: "support",
    icon: LifeBuoy,
    title: "Implementation & support",
    text: "Structured data migration, team training and SLA-backed support — before, during and long after go-live.",
    tags: ["Data migration", "Team training", "SLA support"],
  },
];

const engagement = [
  { step: "01", title: "Hosted SaaS", text: "We run CREDEX on secure Indian cloud — you simply log in and lend." },
  { step: "02", title: "Guided migration", text: "We migrate your existing book, customers and ledgers with full reconciliation." },
  { step: "03", title: "Ongoing partnership", text: "Updates, new modules and support as your book and products grow." },
];

function Services() {
  return (
    <>
      <PageHero
        eyebrow="Platform"
        title="Everything a modern lender needs, in one OS."
        text="From origination and collections to the general ledger and RBI reporting — CREDEX runs the entire lending lifecycle on a single real-time core."
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
            title="One platform, every lending workflow."
            text="Run a single credit line or a multi-product book — every capability shares the same customer, cash and ledger core."
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
                  Explore this capability
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
              eyebrow="How we deliver"
              title="Adopt CREDEX the way that fits."
              text="From hosted SaaS to guided migration and a long-term partnership — we shape the rollout around your book and branches."
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
              {["Discovery", "Configure", "Migrate", "Train", "Go-live", "Support"].map((p) => (
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
        title="See the platform in action."
        text="Tell us how you lend today and we'll tailor a live CREDEX walkthrough to your loan products and branch network."
        cta="Book a Demo"
      />
    </>
  );
}
