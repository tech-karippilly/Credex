import { createFileRoute } from "@tanstack/react-router";
import { Workflow, GitBranch, AppWindow, Layers, BarChart3, RefreshCcw } from "lucide-react";
import { seo } from "@/lib/seo";
import { CtaBand, PageHero } from "@/components/site/blocks";

export const Route = createFileRoute("/solutions")({
  head: () =>
    seo({
      title: "Business Technology Solutions | Automation, SaaS & Data — Credex",
      description: "Business process automation, digital workflows, custom business applications, SaaS platforms, data & reporting and digital transformation solutions focused on outcomes.",
      path: "/solutions",
    }),
  component: Solutions,
});

const items = [
  { icon: Workflow, title: "Business Process Automation", problem: "Teams lose hours to repetitive, manual tasks.", outcome: "Automated processes that run reliably, reduce errors and free up your people." },
  { icon: GitBranch, title: "Digital Workflow Solutions", problem: "Approvals and handoffs get stuck in email and paper.", outcome: "Structured digital workflows with clear ownership, status and accountability." },
  { icon: AppWindow, title: "Custom Business Applications", problem: "Off-the-shelf tools don't match how you work.", outcome: "Applications designed around your processes, data and users." },
  { icon: Layers, title: "SaaS Platforms", problem: "You need software that serves many customers at scale.", outcome: "Scalable, cloud-based platforms built to evolve with your market." },
  { icon: BarChart3, title: "Data & Reporting Solutions", problem: "Information is scattered and reports take too long.", outcome: "Connected data and clear dashboards that support better decisions." },
  { icon: RefreshCcw, title: "Digital Transformation", problem: "Legacy systems and spreadsheets slow growth.", outcome: "A practical, step-by-step move to modern digital operations." },
];

function Solutions() {
  return (
    <>
      <PageHero eyebrow="Solutions" title="Solutions focused on business outcomes." text="We start with the problem you need solved — then apply the right technology to deliver a result you can measure." />
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
                  <dt className="text-xs font-bold uppercase tracking-[0.14em] text-primary">The outcome</dt>
                  <dd className="mt-2 text-sm leading-relaxed">{it.outcome}</dd>
                </div>
              </dl>
            </article>
          ))}
        </div>
      </section>
      <CtaBand title="Every business challenge is different." text="Share yours and we'll help you identify the most practical solution." cta="Tell Us About Your Business Challenge" />
    </>
  );
}
