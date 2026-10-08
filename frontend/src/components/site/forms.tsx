import { useState, type ReactNode } from "react";
import { z } from "zod";
import { CheckCircle2, Loader2, Upload, AlertCircle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useContent } from "@/lib/content";

type Errors = Partial<Record<"name"|"company"|"email"|"phone"|"service"|"message"|"fullName"|"experience"|"location"|"resume", string>>;

function Field({ id, label, error, required, children }: { id: string; label: string; error?: string | undefined; required?: boolean; children: ReactNode }) {
  return (
    <div>
      <label htmlFor={id} className="mb-2 block text-sm font-semibold text-foreground">
        {label} {required && <span className="text-destructive" aria-hidden="true">*</span>}
      </label>
      {children}
      {error && <p id={`${id}-error`} className="mt-1.5 text-sm text-destructive">{error}</p>}
    </div>
  );
}

const phoneRe = /^[+\d][\d\s-]{7,16}$/;

function collectErrors(result: z.SafeParseReturnType<unknown, unknown>): Errors {
  if (result.success) return {};
  const e: Record<string, string> = {};
  for (const issue of result.error.issues) {
    const k = String(issue.path[0]);
    if (!e[k]) e[k] = issue.message;
  }
  return e as Errors;
}

function Success({ title, text, onReset }: { title: string; text: string; onReset: () => void }) {
  return (
    <div role="status" className="flex flex-col items-start gap-4 py-6">
      <span className="inline-flex h-12 w-12 items-center justify-center rounded-full bg-secondary text-success">
        <CheckCircle2 className="h-6 w-6" />
      </span>
      <h3 className="text-2xl font-semibold">{title}</h3>
      <p className="text-muted-foreground">{text}</p>
      <button type="button" onClick={onReset} className="btn btn-outline mt-2">Send another</button>
    </div>
  );
}


const contactSchema = z.object({
  name: z.string().trim().min(2, "Please enter your name").max(100),
  company: z.string().trim().max(120).optional(),
  email: z.string().trim().email("Please enter a valid email").max(255),
  phone: z.string().trim().regex(phoneRe, "Please enter a valid phone number"),
  service: z.string({ required_error: "Please select a requirement" }).min(1, "Please select a requirement"),
  message: z.string().trim().min(10, "Please share a few details (min. 10 characters)").max(2000),
});

export function ContactForm() {
  const { services, settings } = useContent();
  const [errors, setErrors] = useState<Errors>({});
  const [state, setState] = useState<"idle" | "loading" | "done" | "error">("idle");

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const data = Object.fromEntries(new FormData(e.currentTarget));
    const res = contactSchema.safeParse(data);
    const errs = collectErrors(res);
    setErrors(errs);
    if (!res.success) return;
    setState("loading");
    const d = res.data;
    const { error } = await supabase.from("enquiries").insert({
      name: d.name, company: d.company || null, email: d.email, phone: d.phone, service: d.service, message: d.message,
    });
    setState(error ? "error" : "done");
  }

  if (state === "done")
    return <Success title="Thank you for reaching out." text="Your enquiry has been received. A member of the Credex team will get back to you shortly." onReset={() => setState("idle")} />;

  const inv = (k: keyof Errors) => ({ "aria-invalid": !!errors[k], "aria-describedby": errors[k] ? `${k}-error` : undefined });

  return (
    <form noValidate onSubmit={onSubmit} className="grid gap-5 sm:grid-cols-2">
      <Field id="name" label="Name" required error={errors.name}><input id="name" name="name" autoComplete="name" className="field" {...inv("name")} /></Field>
      <Field id="company" label="Company" error={errors.company}><input id="company" name="company" autoComplete="organization" className="field" /></Field>
      <Field id="email" label="Email" required error={errors.email}><input id="email" name="email" type="email" autoComplete="email" className="field" {...inv("email")} /></Field>
      <Field id="phone" label="Phone" required error={errors.phone}><input id="phone" name="phone" type="tel" autoComplete="tel" className="field" {...inv("phone")} /></Field>
      <div className="sm:col-span-2">
        <Field id="service" label="Service / Requirement" required error={errors.service}>
          <select id="service" name="service" defaultValue="" className="field" {...inv("service")}>
            <option value="" disabled>Select a service</option>
            {services.map((s) => <option key={s.id}>{s.title}</option>)}
            <option>Other / Not sure yet</option>
          </select>
        </Field>
      </div>
      <div className="sm:col-span-2">
        <Field id="message" label="Message" required error={errors.message}>
          <textarea id="message" name="message" rows={5} className="field h-auto py-3" {...inv("message")} />
        </Field>
      </div>
      {state === "error" && (
        <p role="alert" className="flex items-center gap-2 text-sm text-destructive sm:col-span-2"><AlertCircle className="h-4 w-4" /> Something went wrong. Please try again or email {settings.email}.</p>
      )}
      <div className="sm:col-span-2">
        <button type="submit" disabled={state === "loading"} className="btn btn-primary w-full sm:w-auto">
          {state === "loading" ? <><Loader2 className="h-4 w-4 animate-spin" /> Sending…</> : "Submit Enquiry"}
        </button>
      </div>
    </form>
  );
}

const applySchema = z.object({
  fullName: z.string().trim().min(2, "Please enter your full name").max(100),
  email: z.string().trim().email("Please enter a valid email").max(255),
  phone: z.string().trim().regex(phoneRe, "Please enter a valid phone number"),
  experience: z.string().trim().min(1, "Please enter your experience").max(20),
  location: z.string().trim().min(2, "Please enter your current location").max(100),
  message: z.string().trim().max(2000).optional(),
});

export function ApplyForm({ role }: { role: string }) {
  const { settings } = useContent();
  const [errors, setErrors] = useState<Errors>({});
  const [file, setFile] = useState<File | null>(null);
  const [state, setState] = useState<"idle" | "loading" | "done" | "error">("idle");

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const res = applySchema.safeParse(Object.fromEntries(fd));
    const errs = collectErrors(res);
    if (!file) errs.resume = "Please upload your resume";
    else if (file.size > 5 * 1024 * 1024) errs.resume = "File must be under 5 MB";
    else if (!/\.(pdf|docx?)$/i.test(file.name)) errs.resume = "Please upload a PDF or Word document";
    setErrors(errs);
    if (Object.values(errs).some(Boolean)) return;
    if (!res.success || !file) return;
    setState("loading");
    const ext = file.name.split(".").pop() ?? "pdf";
    const path = `${crypto.randomUUID()}.${ext}`;
    const up = await supabase.storage.from("resumes").upload(path, file, { contentType: file.type || "application/octet-stream" });
    if (up.error) { setState("error"); return; }
    const d = res.data;
    const { error } = await supabase.from("job_applications").insert({
      job_title: role, full_name: d.fullName, email: d.email, phone: d.phone, experience: d.experience,
      location: d.location, message: d.message || null, resume_path: path,
    });
    setState(error ? "error" : "done");
  }

  if (state === "done")
    return <Success title="Application submitted." text={`Thank you for applying for the ${role} role. Our HR team will review your profile and contact you if shortlisted.`} onReset={() => { setFile(null); setState("idle"); }} />;

  const inv = (k: keyof Errors) => ({ "aria-invalid": !!errors[k], "aria-describedby": errors[k] ? `${k}-error` : undefined });

  return (
    <form noValidate onSubmit={onSubmit} className="grid gap-5 sm:grid-cols-2">
      <div className="sm:col-span-2"><Field id="fullName" label="Full Name" required error={errors.fullName}><input id="fullName" name="fullName" autoComplete="name" className="field" {...inv("fullName")} /></Field></div>
      <Field id="a-email" label="Email" required error={errors.email}><input id="a-email" name="email" type="email" autoComplete="email" className="field" {...inv("email")} /></Field>
      <Field id="a-phone" label="Phone" required error={errors.phone}><input id="a-phone" name="phone" type="tel" autoComplete="tel" className="field" {...inv("phone")} /></Field>
      <Field id="experience" label="Years of Experience" required error={errors.experience}><input id="experience" name="experience" inputMode="decimal" placeholder="e.g. 2" className="field" {...inv("experience")} /></Field>
      <Field id="location" label="Current Location" required error={errors.location}><input id="location" name="location" className="field" {...inv("location")} /></Field>
      <div className="sm:col-span-2">
        <Field id="resume" label="Resume" required error={errors.resume}>
          <label htmlFor="resume" className="flex cursor-pointer items-center gap-3 rounded-lg border border-dashed border-input bg-surface px-4 py-5 text-sm hover:border-primary focus-within:border-primary">
            <Upload className="h-5 w-5 text-primary" />
            <span className="text-muted-foreground">{file ? <span className="font-medium text-foreground">{file.name}</span> : "Upload PDF or Word document (max 5 MB)"}</span>
            <input id="resume" name="resume" type="file" accept=".pdf,.doc,.docx" className="sr-only" onChange={(e) => setFile(e.target.files?.[0] ?? null)} {...inv("resume")} />
          </label>
        </Field>
      </div>
      <div className="sm:col-span-2"><Field id="a-message" label="Cover Message"><textarea id="a-message" name="message" rows={4} className="field h-auto py-3" /></Field></div>
      {state === "error" && <p role="alert" className="text-sm text-destructive sm:col-span-2">Something went wrong. Please try again or email {settings.email}.</p>}
      <div className="sm:col-span-2">
        <button type="submit" disabled={state === "loading"} className="btn btn-primary w-full sm:w-auto">
          {state === "loading" ? <><Loader2 className="h-4 w-4 animate-spin" /> Submitting…</> : "Submit Application"}
        </button>
      </div>
    </form>
  );
}
