import { createFileRoute, Link } from "@tanstack/react-router";
import {
  ArrowRight, ArrowUpRight, Landmark, Coins, Users, Car, Building2, Wallet, HandCoins,
  Layers, ShieldCheck, UserPlus, Gauge, BadgeIndianRupee, RefreshCw,
  Settings2, Network, Zap, BarChart3, Rocket, FileCheck2, Database, Fingerprint,
  Search, Sparkles, CheckCircle2, Cpu,
} from "lucide-react";
import { seo } from "@/lib/seo";
import { company } from "@/lib/site";
import { CtaBand, SectionHeading, Reveal } from "@/components/site/blocks";
import { LendingConsole } from "@/components/site/LendingConsole";
import { HeroIllustration } from "@/components/site/illustrations/HeroIllustration";
import { BuildSpectrum } from "@/components/site/illustrations/BuildSpectrum";
import { WorkflowPipeline } from "@/components/site/illustrations/WorkflowPipeline";
import { TrustShieldArt } from "@/components/site/illustrations/TrustShieldArt";
import { ImpactStats } from "@/components/site/illustrations/ImpactStats";

export const Route = createFileRoute("/")({
  head: () =>
    seo({
      title: "CREDEX | Next-Generation Lending OS for NBFCs & MFIs",
      description:
        "CREDEX is a next-generation lending operating system — unifying loan origination, KYC, branch & field collections, and the general ledger on one real-time core, purpose-built for India's NBFCs and MFIs.",
      path: "/",
    }),
  component: Home,
});

const heroMetrics = [
  { value: "Real-Time", label: "Unified Loan Core & Ledger" },
  { value: "6 Weeks", label: "Typical NBFC Go-Live" },
  { value: "100% Audit", label: "Maker-Checker & RBI Aligned" },
];

const whatWeDo = [
  {
    icon: Layers,
    tag: "01 // UNIFIED CORE",
    title: "One real-time loan record",
    text: "Origination, KYC, disbursal, collections, branch cash, and the general ledger run on a single live core — no end-of-day spreadsheet reconciliation.",
    highlights: ["Shared customer & accounting record", "Live book, PAR & NPA positions", "Zero reconciliation overhead"],
  },
  {
    icon: Network,
    tag: "02 // BRANCH & FIELD OPS",
    title: "Head office to the last mile",
    text: "Branches, field officers, and head office operate on one ledger — with mobile collections, branch cash control, and center-meeting workflows built in.",
    highlights: ["Mobile field collections & receipts", "Branch cash & vault control", "Role-based access for every team"],
  },
  {
    icon: ShieldCheck,
    tag: "03 // COMPLIANCE",
    title: "RBI-ready governance",
    text: "Regulatory reporting formats, immutable audit trails, and India data residency are first-class — so every disbursal stays inspection-ready.",
    highlights: ["IRAC/NPA classification & KFS", "Immutable maker-checker logs", "India cloud residency"],
  },
];

const approach = [
  { icon: Search, step: "01", title: "Discover", text: "We map your loan products, branches, and operating model to configure CREDEX to how you already work." },
  { icon: Settings2, step: "02", title: "Configure", text: "Schemes, interest slabs, approval hierarchies, and reports set up without vendor tickets or custom code." },
  { icon: Database, step: "03", title: "Migrate", text: "Structured, validated migration of your existing book, customers, and ledgers with reconciliation checks." },
  { icon: Rocket, step: "04", title: "Go-Live", text: "Branch rollout, team training, and hands-on support — most lenders are live in as little as six weeks." },
];

const builtFor = ["Gold-loan NBFCs", "MFIs & SFBs", "Vehicle finance", "Housing & asset lenders", "MSME & business books", "Multi-branch lenders"];

const lendingModules = [
  { icon: Coins, code: "MOD-01", title: "Gold loan", text: "Purity valuation, live LTV slabs, packet custody tracking, and same-day disbursal paths." },
  { icon: Users, code: "MOD-02", title: "Group & MFI lending", text: "Center meetings, joint liability groups (JLG), and mobile field collections on one unified book." },
  { icon: Car, code: "MOD-03", title: "Vehicle loan", text: "Dealer onboarding, hypothecation tracking, dynamic EMI schedules, and repossession workflows." },
  { icon: Building2, code: "MOD-04", title: "Asset & property", text: "Collateral valuation, legal & technical verification stages, and milestone tranche disbursements." },
  { icon: Wallet, code: "MOD-05", title: "Personal & business", text: "Bureau pulls, bank statement cash-flow assessment, and configurable credit rule engines." },
  { icon: HandCoins, code: "MOD-06", title: "Collections & recovery", text: "DPD buckets, field agent routing, digital receipts, promise-to-pay, and settlement approvals." },
];

const productWhy = [
  { icon: Layers, title: "One unified loan record", text: "Origination, KYC, collections, branch cash, and general ledger — zero end-of-day spreadsheet reconciliation." },
  { icon: Landmark, title: "Purpose-built for India", text: "Gold packets, JLG center sheets, RTO hypothecation, and maker-checker approvals as first-class flows." },
  { icon: ShieldCheck, title: "RBI-ready from day one", text: "Regulatory reporting formats, immutable user audit logs, and India data residency out of the box." },
];

const moves = [
  { icon: UserPlus, title: "Onboard", text: "Paperless eKYC, CKYC, and deduplicated customer profiles before credit evaluation begins." },
  { icon: Gauge, title: "Assess", text: "Automated LTV, bureau scorecards, collateral checks, and multi-tier sanction workflows." },
  { icon: BadgeIndianRupee, title: "Disburse", text: "Digital e-sign, sanction letters, and instant payout rails — same-day for gold and group loans." },
  { icon: RefreshCw, title: "Service", text: "NACH/UPI collections, field receipts, automated ledger posting, and real-time NPA tagging." },
];

const advantages = [
  { icon: Settings2, label: "Configure loan schemes & interest slabs without vendor tickets" },
  { icon: Network, label: "Branches, field officers, and head office live on one ledger" },
  { icon: Zap, label: "Same-day turnaround for gold and micro-group disbursals" },
  { icon: BarChart3, label: "Real-time trial balance, PAR, and branch MIS reports" },
  { icon: Users, label: "Granular role-based access for credit, cash, and audit teams" },
  { icon: Rocket, label: "Structured data migration & go-live in as little as six weeks" },
];

const compliance = [
  { icon: ShieldCheck, title: "RBI-aligned norms", text: "IRAC/NPA classification, KFS generation, and regulatory returns mapped to current guidelines." },
  { icon: FileCheck2, title: "Immutable audit trail", text: "Every field edit, sanction approval, and voucher entry is timestamped with maker-checker logs." },
  { icon: Database, title: "India data residency", text: "Hosted on tier-1 Indian cloud regions with encryption at rest and in transit." },
  { icon: Fingerprint, title: "Zero-trust access", text: "Branch-scoped permissions, IP/session controls, and strict approval hierarchies." },
];

function Home() {
  return (
    <>
      {/* Daylight Futuristic Hero */}
      <section className="relative overflow-hidden border-b border-border bg-gradient-to-b from-surface/80 via-background to-background">
        <div className="grid-lines absolute inset-0 [mask-image:radial-gradient(ellipse_80%_70%_at_50%_0%,black,transparent)]" aria-hidden="true" />
        <div
          className="pointer-events-none absolute -right-40 -top-40 h-[32rem] w-[32rem] rounded-full bg-primary/10 blur-3xl"
          aria-hidden="true"
        />
        <div className="container-site relative py-14 md:py-20 lg:py-24">
          <div className="grid items-center gap-12 lg:grid-cols-[1.06fr_1fr] lg:gap-16">
            <div>
              <div className="inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/[0.06] py-1 pl-1 pr-3.5 font-mono text-xs font-medium text-primary animate-rise">
                <span className="inline-flex items-center gap-1.5 rounded-full bg-primary px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wider text-primary-foreground">
                  <Sparkles className="h-3 w-3" />
                  Lending OS
                </span>
                <span className="text-foreground/70">Purpose-built for India&apos;s NBFCs &amp; MFIs</span>
              </div>

              <h1 className="mt-5 text-[2.5rem] font-semibold leading-[0.98] tracking-[-0.035em] text-foreground animate-rise sm:text-5xl lg:text-[3.6rem]">
                The next-generation lending OS for{" "}
                <span className="relative whitespace-nowrap">
                  <span className="text-gradient">modern NBFCs</span>
                  <svg
                    className="absolute -bottom-1 left-0 h-2 w-full text-primary/35"
                    viewBox="0 0 300 12"
                    fill="none"
                    preserveAspectRatio="none"
                    aria-hidden="true"
                  >
                    <path d="M2 9C60 3 180 2 298 6" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
                  </svg>
                </span>
                .
              </h1>

              <p className="mt-6 max-w-xl text-lg leading-relaxed text-muted-foreground animate-rise">
                <strong className="font-semibold text-primary">{company.brand}</strong> runs your entire loan book on one real-time core — origination, KYC, branch &amp; field collections, and an integrated general ledger — engineered for India&apos;s lenders across gold, vehicle, group, property, and MSME credit.
              </p>

              <div className="mt-8 flex flex-wrap items-center gap-3.5 animate-rise">
                <Link to="/contact" className="btn btn-primary group">
                  Book a live demo
                  <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
                </Link>
                <a href="#flagship-credex" className="btn btn-outline">
                  Explore the platform
                </a>
              </div>

              {/* Hero Telemetry Strip */}
              <div className="mt-12 grid max-w-xl grid-cols-3 divide-x divide-border rounded-2xl border border-border bg-card/60 py-5 animate-rise">
                {heroMetrics.map((m) => (
                  <div key={m.value} className="px-5 text-center first:text-left last:text-right sm:text-left">
                    <p className="font-display text-xl font-semibold text-foreground">{m.value}</p>
                    <p className="mt-1 text-xs leading-snug text-muted-foreground">{m.label}</p>
                  </div>
                ))}
              </div>
            </div>

            <div className="animate-rise lg:justify-self-end">
              <HeroIllustration />
            </div>
          </div>
        </div>
      </section>

      {/* What we build — Bento Grid */}
      <section className="container-site py-24">
        <Reveal>
          <SectionHeading
            eyebrow="Why CREDEX"
            title="One platform for every lending workflow."
            text="CREDEX replaces brittle spreadsheets and disconnected tools with a single, unified operating system — from the branch counter to the general ledger."
          />
        </Reveal>

        <BuildSpectrum />

        <div className="mt-12 grid gap-6 lg:grid-cols-3">
          {whatWeDo.map((item, i) => (
            <Reveal key={item.title} delay={i * 80}>
              <article className="card-bento group flex h-full flex-col justify-between p-8">
                <div>
                  <div className="flex items-center justify-between">
                    <span className="inline-flex h-12 w-12 items-center justify-center rounded-2xl border border-primary/20 bg-primary/10 text-primary transition-transform duration-300 group-hover:scale-105">
                      <item.icon className="h-6 w-6" strokeWidth={1.7} />
                    </span>
                    <span className="font-mono text-[11px] font-medium tracking-wider text-muted-foreground">
                      {item.tag}
                    </span>
                  </div>
                  <h3 className="mt-6 text-2xl font-semibold text-foreground">{item.title}</h3>
                  <p className="mt-3 leading-relaxed text-muted-foreground">{item.text}</p>
                </div>

                <ul className="mt-7 space-y-2.5 border-t border-border pt-5">
                  {item.highlights.map((h) => (
                    <li key={h} className="flex items-center gap-2.5 text-sm font-medium text-foreground/90">
                      <CheckCircle2 className="h-4 w-4 shrink-0 text-primary" />
                      <span>{h}</span>
                    </li>
                  ))}
                </ul>
              </article>
            </Reveal>
          ))}
        </div>
      </section>

      {/* How we work — Futuristic Step Cards */}
      <section className="border-y border-border bg-surface/70">
        <div className="container-site relative py-24">
          <Reveal>
            <SectionHeading
              center
              eyebrow="Implementation"
              title="From kickoff to go-live in weeks."
              text="A transparent rollout cadence — we configure CREDEX to your loan products, migrate your existing book, and get every branch live with hands-on support."
            />
          </Reveal>
          <WorkflowPipeline />
          <div className="relative mt-14 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {approach.map((step, i) => (
              <Reveal key={step.title} delay={i * 70}>
                <div className="card-site card-hover group relative h-full overflow-hidden p-7">
                  <span
                    className="pointer-events-none absolute -bottom-6 -right-2 font-display text-8xl font-bold leading-none text-primary/[0.06] transition-all duration-500 group-hover:-bottom-4 group-hover:text-primary/[0.1]"
                    aria-hidden="true"
                  >
                    {step.step}
                  </span>
                  <div className="relative flex items-center justify-between">
                    <span className="inline-flex h-11 w-11 items-center justify-center rounded-xl bg-secondary text-primary transition-colors group-hover:bg-primary group-hover:text-white">
                      <step.icon className="h-5 w-5" strokeWidth={1.7} />
                    </span>
                    <span className="font-mono text-xs font-semibold tracking-widest text-primary/70">
                      STEP {step.step}
                    </span>
                  </div>
                  <h3 className="relative mt-5 font-display text-xl font-semibold text-foreground">{step.title}</h3>
                  <p className="relative mt-2.5 text-sm leading-relaxed text-muted-foreground">{step.text}</p>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* Flagship Product Spotlight — High-Contrast Obsidian Command Stage */}
      <section id="flagship-credex" className="container-site py-20 md:py-24">
        <div className="relative overflow-hidden rounded-[2rem] bg-ink text-ink-foreground shadow-2xl">
          <div className="grid-lines-dark absolute inset-0 opacity-45" aria-hidden="true" />
          <div
            className="pointer-events-none absolute -right-24 -top-24 h-96 w-96 rounded-full bg-primary/25 blur-3xl"
            aria-hidden="true"
          />
          <div
            className="pointer-events-none absolute -bottom-24 left-12 h-80 w-80 rounded-full bg-primary/15 blur-3xl"
            aria-hidden="true"
          />

          <div className="relative grid items-center gap-12 px-6 py-14 sm:px-10 md:px-14 md:py-20 lg:grid-cols-[1.02fr_1fr] lg:gap-14">
            <div>
              <div className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/[0.06] px-3.5 py-1.5 font-mono text-xs font-semibold uppercase tracking-widest text-amber-300">
                <Cpu className="h-3.5 w-3.5 text-primary" />
                <span>The Platform // CREDEX OS</span>
              </div>

              <h2 className="mt-5 font-display text-3xl font-semibold leading-[1.08] text-white sm:text-4xl md:text-5xl">
                The operating system for India&apos;s NBFCs &amp; MFIs.
              </h2>

              <p className="mt-5 text-lg leading-relaxed text-ink-muted">
                CREDEX unifies loan origination, KYC, branch &amp; field collections, and the general ledger on a single real-time core. Gold, vehicle, JLG group, property, and MSME loans share one customer and accounting record.
              </p>

              <div className="mt-7 flex flex-wrap gap-2">
                {builtFor.map((b) => (
                  <span
                    key={b}
                    className="rounded-full border border-white/12 bg-white/[0.05] px-3 py-1 font-mono text-xs text-white/90"
                  >
                    {b}
                  </span>
                ))}
              </div>

              <div className="mt-9 flex flex-wrap gap-3.5">
                <Link to="/contact" className="btn btn-light">
                  Book a live lending demo <ArrowRight className="h-4 w-4" />
                </Link>
                <Link to="/solutions" className="btn btn-ghost-light">
                  Explore platform architecture
                </Link>
              </div>
            </div>

            {/* Light console card floating on dark obsidian stage */}
            <div className="relative text-foreground">
              <LendingConsole />
            </div>
          </div>

          {/* Why Lenders Choose CREDEX — Integrated bottom bar */}
          <div className="relative border-t border-white/10 bg-black/20 px-6 py-10 sm:px-10 md:px-14">
            <div className="grid gap-8 md:grid-cols-3">
              {productWhy.map((w) => (
                <div key={w.title} className="flex gap-4">
                  <span className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-white/15 bg-white/[0.06] text-amber-300">
                    <w.icon className="h-5 w-5" strokeWidth={1.7} />
                  </span>
                  <div>
                    <h3 className="font-display text-base font-semibold text-white">{w.title}</h3>
                    <p className="mt-1 text-sm leading-relaxed text-ink-muted">{w.text}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Animated impact metrics */}
      <ImpactStats />

      {/* Lending Modules Bento Grid */}
      <section className="container-site py-20">
        <Reveal>
          <SectionHeading
            eyebrow="Inside CREDEX"
            title="Modular lending engines for every credit product."
            text="Launch a single credit line or run a multi-product book — every module shares customer KYC, cash management, collections, and the general ledger."
          />
        </Reveal>
        <div className="mt-14 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {lendingModules.map((p, i) => (
            <Reveal key={p.title} delay={i * 60}>
              <article className="card-bento group relative flex h-full flex-col overflow-hidden p-7">
                {/* Texture + watermark motif */}
                <div className="dot-matrix pointer-events-none absolute inset-0 opacity-40" aria-hidden="true" />
                <p.icon
                  className="pointer-events-none absolute -right-5 -top-5 h-28 w-28 text-primary/[0.06] transition-all duration-500 group-hover:-right-3 group-hover:-top-3 group-hover:text-primary/[0.1]"
                  strokeWidth={1}
                  aria-hidden="true"
                />
                <div className="relative flex items-center justify-between">
                  <span className="inline-flex h-12 w-12 shrink-0 items-center justify-center rounded-xl border border-primary/20 bg-secondary text-primary transition-colors group-hover:bg-primary group-hover:text-white">
                    <p.icon className="h-6 w-6" strokeWidth={1.6} />
                  </span>
                  <span className="rounded-md border border-border bg-surface px-2 py-1 font-mono text-[10px] font-semibold tracking-wider text-muted-foreground">
                    {p.code}
                  </span>
                </div>
                <div className="relative mt-6 flex-1">
                  <h3 className="text-xl font-semibold text-foreground">{p.title}</h3>
                  <p className="mt-2.5 text-sm leading-relaxed text-muted-foreground">{p.text}</p>
                </div>
                <Link
                  to="/solutions"
                  className="relative mt-6 inline-flex items-center gap-1.5 text-sm font-semibold text-primary"
                >
                  Module specifications{" "}
                  <ArrowUpRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
                </Link>
              </article>
            </Reveal>
          ))}
        </div>
      </section>

      {/* Loan Lifecycle */}
      <section className="border-y border-border bg-surface/60">
        <div className="container-site relative py-24">
          <Reveal>
            <SectionHeading
              center
              eyebrow="End-to-end loan lifecycle"
              title="From lead to ledger in four automated moves."
              text="Onboard, assess, disburse, and service — with digital documents and maker-checker controls enforced at every transition."
            />
          </Reveal>
          <WorkflowPipeline />
          <div className="relative mt-16 grid gap-6 md:grid-cols-4">
            {moves.map((m, i) => (
              <Reveal key={m.title} delay={i * 90}>
                <div className="card-site relative flex h-full flex-col justify-between p-6">
                  <div>
                    <div className="flex items-center justify-between">
                      <span className="inline-flex h-12 w-12 items-center justify-center rounded-full border border-primary/25 bg-primary/10 text-primary">
                        <m.icon className="h-5 w-5" strokeWidth={1.7} />
                      </span>
                      <span className="font-mono text-xs font-bold text-muted-foreground">
                        0{i + 1} //
                      </span>
                    </div>
                    <h3 className="mt-5 font-display text-lg font-semibold text-foreground">{m.title}</h3>
                    <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{m.text}</p>
                  </div>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* Product Advantages + Compliance */}
      <section className="container-site py-24">
        <div className="grid items-start gap-16 lg:grid-cols-[1fr_1.15fr]">
          <div>
            <Reveal>
              <SectionHeading
                eyebrow="Operational edge"
                title="What NBFC teams notice in week one."
                text="Built alongside branch managers, credit officers, and internal auditors — so daily operations feel fast and structured."
              />
            </Reveal>
            <div className="mt-9 space-y-3">
              {advantages.map((a, i) => (
                <Reveal key={a.label} delay={i * 50}>
                  <div className="card-site group relative flex items-center gap-4 overflow-hidden p-4">
                    <span className="absolute inset-y-0 left-0 w-0.5 bg-primary opacity-0 transition-opacity duration-300 group-hover:opacity-100" aria-hidden="true" />
                    <span className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-secondary text-primary transition-colors group-hover:bg-primary group-hover:text-white">
                      <a.icon className="h-5 w-5" strokeWidth={1.7} />
                    </span>
                    <span className="flex-1 text-sm font-semibold text-foreground sm:text-base">{a.label}</span>
                    <span className="font-mono text-xs font-semibold text-muted-foreground/60">0{i + 1}</span>
                  </div>
                </Reveal>
              ))}
            </div>
          </div>

          <div>
            <Reveal>
              <SectionHeading
                eyebrow="Governance & trust"
                title="Built for supervision, not bolted on later."
                text="RBI-aligned reporting, immutable audit trails, and India cloud residency keep every disbursal inspection-ready."
              />
            </Reveal>
            <TrustShieldArt />
            <div className="mt-8 grid gap-4 sm:grid-cols-2">
              {compliance.map((c, i) => (
                <Reveal key={c.title} delay={i * 70}>
                  <div className="card-bento h-full p-6">
                    <c.icon className="h-6 w-6 text-primary" strokeWidth={1.7} />
                    <h3 className="mt-4 text-lg font-semibold text-foreground">{c.title}</h3>
                    <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{c.text}</p>
                  </div>
                </Reveal>
              ))}
            </div>
          </div>
        </div>
      </section>

      <CtaBand
        title="Ready to modernize your lending stack?"
        text="Book a live walkthrough of CREDEX — we'll tailor the session to your loan products, branch network, and reporting needs."
        cta="Talk to the CREDEX team"
      />
    </>
  );
}
