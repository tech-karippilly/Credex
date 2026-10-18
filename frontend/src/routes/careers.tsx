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
      title: "Careers at Credex | Jobs in Moonupeedika, Thrissur, Kerala",
      description: "Build your career with Credex.In. Openings for fullstack developers, UI/UX designers, marketing & sales, and junior/fresher fullstack programmers in Thrissur, Kerala.",
      path: "/careers",
    }),
  component: Careers,
});

const LOCATION = "Moonupeedika, Thrissur, Kerala";

const FALLBACK_JOBS: JobRow[] = [
  {
    id: "fullstack-developer",
    title: "Fullstack Developer",
    location: LOCATION,
    employment: "Full-time",
    experience: "2–5 years",
    workplace: "On-site",
    salary: "",
    responsibilities: [
      "Build and ship web applications across frontend and backend.",
      "Design clean APIs, data models and reusable components.",
      "Own features end to end — from scoping to production.",
      "Collaborate with design and QA to deliver reliable releases.",
    ],
    requirements: [
      "Strong JavaScript/TypeScript with React and Node.js (or .NET).",
      "Solid grasp of REST APIs, SQL databases and Git.",
      "Experience taking features from design to deployment.",
    ],
    good_to_have: "Exposure to cloud (AWS/Azure), CI/CD, or fintech/lending systems.",
    sort: 1,
    published: true,
  },
  {
    id: "ui-ux-designer",
    title: "UI/UX Designer",
    location: LOCATION,
    employment: "Full-time",
    experience: "1–4 years",
    workplace: "On-site",
    salary: "",
    responsibilities: [
      "Design intuitive interfaces for web and mobile products.",
      "Build and maintain design systems and component libraries.",
      "Create wireframes, prototypes and high-fidelity mockups.",
      "Partner with engineers to ship pixel-accurate experiences.",
    ],
    requirements: [
      "Strong portfolio of product/UX work.",
      "Proficiency in Figma and modern design tooling.",
      "Understanding of usability, accessibility and responsive design.",
    ],
    good_to_have: "Basic HTML/CSS understanding or motion/interaction design skills.",
    sort: 2,
    published: true,
  },
  {
    id: "marketing-sales",
    title: "Marketing & Sales Executive",
    location: LOCATION,
    employment: "Full-time",
    experience: "1–3 years",
    workplace: "On-site",
    salary: "",
    responsibilities: [
      "Generate and qualify leads for our software services and CREDEX platform.",
      "Run outreach, demos and follow-ups with prospective clients.",
      "Support digital marketing, content and campaign efforts.",
      "Maintain the pipeline and report on conversions.",
    ],
    requirements: [
      "Excellent communication and relationship-building skills.",
      "Comfort with B2B / software or fintech sales.",
      "Self-driven, organized and target-oriented.",
    ],
    good_to_have: "Experience selling SaaS, IT services, or to NBFCs/MFIs.",
    sort: 3,
    published: true,
  },
  {
    id: "junior-fullstack-fresher",
    title: "Junior Programmer / Fresher — Fullstack",
    location: LOCATION,
    employment: "Full-time",
    experience: "0–1 years",
    workplace: "On-site",
    salary: "",
    responsibilities: [
      "Learn and contribute to real projects alongside senior engineers.",
      "Write, test and debug features across the stack.",
      "Grow fundamentals in JavaScript/TypeScript, React and APIs.",
      "Take ownership of small modules with mentorship.",
    ],
    requirements: [
      "Fundamentals in programming and web technologies (HTML, CSS, JS).",
      "Eagerness to learn and a problem-solving mindset.",
      "Degree, diploma or strong self-taught projects welcome.",
    ],
    good_to_have: "Personal projects, internships, or familiarity with React/Node.js.",
    sort: 4,
    published: true,
  },
];

function Careers() {
  const { jobs: cmsJobs, settings } = useContent();
  const jobs = cmsJobs.length > 0 ? cmsJobs : FALLBACK_JOBS;
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
      <PageHero eyebrow="Careers" title="Build Your Career With Credex" text="We're building a team that believes technology should solve real problems and create real value — software, design, product and growth roles in Thrissur, Kerala." />

      <section className="container-site py-20">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <h2 className="eyebrow">{jobs.length === 1 ? "Current Opening" : "Current Openings"}</h2>
          <span className="font-mono text-xs text-muted-foreground">
            {jobs.length} role{jobs.length === 1 ? "" : "s"} open · {LOCATION}
          </span>
        </div>
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
        className="m-auto w-[calc(100%-2rem)] max-w-2xl rounded-2xl bg-card p-0 text-foreground backdrop:bg-foreground/25 backdrop:backdrop-blur-sm"
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
