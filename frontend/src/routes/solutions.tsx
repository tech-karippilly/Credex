import { createFileRoute } from "@tanstack/react-router";
import { Coins, Users, Car, Building2, Wallet, HandCoins } from "lucide-react";
import { seo } from "@/lib/seo";
import { CtaBand, PageHero } from "@/components/site/blocks";

export const Route = createFileRoute("/solutions")({
  head: () =>
    seo({
      title: "Lending Modules | Gold, Group, Vehicle, Property & MSME — CREDEX",
      description: "CREDEX lending modules for every credit product: gold loans, group & MFI lending, vehicle finance, asset & property, personal & business loans, and collections & recovery — all on one core.",
      path: "/solutions",
    }),
  component: Solutions,
});

const items = [
  { icon: Coins, title: "Gold Loan", problem: "Packet custody, purity valuation and LTV slabs tracked on paper and spreadsheets.", outcome: "Purity valuation, live LTV slabs, packet custody tracking and same-day disbursal on one screen." },
  { icon: Users, title: "Group & MFI Lending", problem: "Center meetings and joint-liability groups are hard to run at scale.", outcome: "JLG groups, center meetings and mobile field collections on one unified book." },
  { icon: Car, title: "Vehicle Finance", problem: "Dealer onboarding, hypothecation and EMI tracking live in disconnected tools.", outcome: "Dealer onboarding, hypothecation tracking, dynamic EMI schedules and repossession workflows." },
  { icon: Building2, title: "Asset & Property", problem: "Collateral valuation and tranche disbursals need tight legal/technical control.", outcome: "Collateral valuation, legal & technical verification stages and milestone tranche disbursements." },
  { icon: Wallet, title: "Personal & Business", problem: "Underwriting unsecured credit demands fast, data-driven assessment.", outcome: "Bureau pulls, bank-statement cash-flow analysis and configurable credit rule engines." },
  { icon: HandCoins, title: "Collections & Recovery", problem: "Overdue follow-up, field routing and receipts are manual and leaky.", outcome: "DPD buckets, field agent routing, digital receipts, promise-to-pay and settlement approvals." },
];

function Solutions() {
  return (
    <>
      <PageHero eyebrow="Modules" title="Modular lending engines for every credit product." text="Launch a single credit line or run a multi-product book — every CREDEX module shares customer KYC, cash management, collections and the general ledger." />
      <section className="container-site py-24">
        <div className="grid gap-5 md:grid-cols-2">
          {items.map((it, i) => (
            <article key={it.title} className="card-site card-hover p-8 md:p-10">
              <div className="flex items-start justify-between">
                <span className="inline-flex h-12 w-12 items-center justify-center rounded-xl bg-secondary text-primary"><it.icon className="h-6 w-6" strokeWidth={1.6} /></span>
                <span className="font-display text-sm text-muted-foreground">{String(i + 1).padStart(2, "0")}</span>
              </div>
              <h2 className="mt-6 text-2xl font-semibold">{it.title}</h2>
              <dl className="mt-6 grid gap-5 border-t border-border pt-6 sm:grid-cols-2">
                <div>
                  <dt className="text-xs font-bold uppercase tracking-[0.14em] text-muted-foreground">The challenge</dt>
                  <dd className="mt-2 text-sm leading-relaxed">{it.problem}</dd>
                </div>
                <div>
                  <dt className="text-xs font-bold uppercase tracking-[0.14em] text-primary">With CREDEX</dt>
                  <dd className="mt-2 text-sm leading-relaxed">{it.outcome}</dd>
                </div>
              </dl>
            </article>
          ))}
        </div>
      </section>
      <CtaBand title="Run every credit product on one core." text="Tell us which loan products you offer and we'll show you the matching CREDEX modules." cta="Book a Demo" />
    </>
  );
}
