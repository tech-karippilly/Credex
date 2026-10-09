import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { MapPin, Briefcase, Clock, Building, IndianRupee, X, Mail, Phone } from "lucide-react";
import { seo } from "@/lib/seo";
import { telHref, useContent } from "@/lib/content";
import type { JobRow } from "@/lib/content.functions";
import { PageHero } from "@/components/site/blocks";
import { ApplyForm } from "@/components/site/forms";

export const Route = createFileRoute("/careers")({
  head: () =>
    seo({
      title: "Careers at Credex | Jobs in Irinjalakuda, Kerala",
      description: "Build your career with Credex. See current openings at Credex.in Tech Solutions in Irinjalakuda, Kerala.",
      path: "/careers",
    }),
  component: Careers,
});

function Careers() {
  const { jobs, settings } = useContent();
  const [applyJob, setApplyJob] = useState<{ id: string; title: string } | null>(null);
  const dialogRef = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const d = dialogRef.current;
    if (!d) return;
    if (applyJob && !d.open) d.showModal();
    if (!applyJob && d.open) d.close();
  }, [applyJob]);

  return (
    <>
      <PageHero eyebrow="Careers" title="Build Your Career With Credex" text="We're building a team that believes technology should solve real problems and create real value." />

      <section className="container-site py-20">
        <h2 className="eyebrow">{jobs.length === 1 ? "Current Opening" : "Current Openings"}</h2>
        {jobs.length === 0 && (
          <div className="card-site mt-6 p-10 text-center">
            <h3 className="text-xl font-semibold">No open positions right now</h3>
            <p className="mt-2 text-muted-foreground">
              We're always happy to hear from great people. Send your resume to{" "}
              <a className="font-semibold text-primary" href={`mailto:${settings.email}`}>{settings.email}</a>.
            </p>
          </div>
        )}
        <div className="mt-6 space-y-8">
          {jobs.map((job) => (
            <JobCard key={job.id} job={job} email={settings.email} phone={settings.phone} onApply={() => setApplyJob({ id: job.id, title: job.title })} />
          ))}
        </div>
      </section>

      <dialog
        ref={dialogRef}
        onClose={() => setApplyJob(null)}
        onClick={(e) => { if (e.target === dialogRef.current) setApplyJob(null); }}
        aria-labelledby="apply-title"
        className="m-auto w-[calc(100%-2rem)] max-w-2xl rounded-2xl bg-card p-0 text-foreground backdrop:bg-ink/60 backdrop:backdrop-blur-sm"
      >
        <div className="max-h-[90vh] overflow-y-auto p-6 md:p-10">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="eyebrow">Apply</p>
              <h2 id="apply-title" className="mt-3 text-2xl font-semibold">{applyJob?.title}</h2>
            </div>
            <button type="button" onClick={() => setApplyJob(null)} aria-label="Close application form" className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-border hover:border-primary">
              <X className="h-5 w-5" />
            </button>
          </div>
          <div className="mt-8">{applyJob && <ApplyForm careerId={applyJob.id} role={applyJob.title} />}</div>
        </div>
      </dialog>
    </>
  );
}

function JobCard({ job, email, phone, onApply }: { job: JobRow; email: string; phone: string; onApply: () => void }) {
  const meta = [
    { icon: MapPin, label: "Location", value: job.location },
    { icon: Clock, label: "Employment", value: job.employment },
    { icon: Briefcase, label: "Experience", value: job.experience },
    { icon: Building, label: "Workplace", value: job.workplace },
    { icon: IndianRupee, label: "Salary", value: job.salary },
  ].filter((m) => m.value);

  return (
    <article className="card-site overflow-hidden">
      <div className="flex flex-col gap-6 border-b border-border p-8 md:flex-row md:items-center md:justify-between md:p-10">
        <div>
          <h3 className="text-2xl font-semibold md:text-3xl">{job.title}</h3>
          <ul className="mt-5 flex flex-wrap gap-2">
            {meta.map((m) => (
              <li key={m.label} className="inline-flex items-center gap-2 rounded-full bg-secondary px-3.5 py-1.5 text-sm">
                <m.icon className="h-4 w-4 text-primary" /><span className="sr-only">{m.label}: </span>{m.value}
              </li>
            ))}
          </ul>
        </div>
        <button type="button" onClick={onApply} className="btn btn-primary shrink-0">Apply Now</button>
      </div>
      <div className="grid gap-10 p-8 md:p-10 lg:grid-cols-2">
        {job.responsibilities.length > 0 && (
          <div>
            <h4 className="text-xs font-bold uppercase tracking-[0.14em] text-primary">Responsibilities</h4>
            <ul className="mt-4 space-y-3">
              {job.responsibilities.map((r) => <li key={r} className="flex gap-3 text-muted-foreground"><span className="mt-2.5 h-1.5 w-1.5 shrink-0 rounded-full bg-cyan" />{r}</li>)}
            </ul>
          </div>
        )}
        <div>
          {job.requirements.length > 0 && (
            <>
              <h4 className="text-xs font-bold uppercase tracking-[0.14em] text-primary">Requirements</h4>
              <ul className="mt-4 space-y-3">
                {job.requirements.map((r) => <li key={r} className="flex gap-3 text-muted-foreground"><span className="mt-2.5 h-1.5 w-1.5 shrink-0 rounded-full bg-cyan" />{r}</li>)}
              </ul>
            </>
          )}
          {job.good_to_have && (
            <>
              <h4 className="mt-8 text-xs font-bold uppercase tracking-[0.14em] text-primary">Good to have</h4>
              <p className="mt-3 text-muted-foreground">{job.good_to_have}</p>
            </>
          )}
          <div className="mt-8 rounded-xl bg-surface p-5 text-sm">
            <p className="font-semibold">You can also apply directly:</p>
            <p className="mt-2 flex items-center gap-2"><Mail className="h-4 w-4 text-primary" /><a className="hover:text-primary" href={`mailto:${email}?subject=${encodeURIComponent("Application: " + job.title)}`}>{email}</a></p>
            <p className="mt-1 flex items-center gap-2"><Phone className="h-4 w-4 text-primary" /><a className="hover:text-primary" href={telHref(phone)}>{phone}</a></p>
          </div>
        </div>
      </div>
    </article>
  );
}
