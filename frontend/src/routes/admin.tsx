import { createFileRoute, Link } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import { useCallback, useEffect, useState, type ReactNode } from "react";
import type { Session } from "@supabase/supabase-js";
import {
  LayoutDashboard, Settings, Layers, Briefcase, FileText, Inbox, LogOut, Loader2, Plus, Trash2,
  Save, ExternalLink, Upload, Eye, EyeOff, Download, Wallet, Receipt,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Logo } from "@/components/site/Logo";
import { ExpensesPanel, VouchersPanel, type VoucherDraft } from "@/components/admin/finance";
import { ICONS, contentQuery } from "@/lib/content";
import { DEFAULT_SETTINGS, type SiteSettings, type ServiceRow, type JobRow } from "@/lib/content.functions";

export const Route = createFileRoute("/admin")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "Admin — Credex" },
      { name: "description", content: "Credex website administration." },
      { name: "robots", content: "noindex, nofollow" },
      { property: "og:title", content: "Admin — Credex" },
      { property: "og:description", content: "Credex website administration." },
    ],
  }),
  component: AdminPage,
});

/* ---------------- auth shell ---------------- */

function AdminPage() {
  const [session, setSession] = useState<Session | null>(null);
  const [ready, setReady] = useState(false);
  const [isAdmin, setIsAdmin] = useState<boolean | null>(null);

  useEffect(() => {
    const { data: sub } = supabase.auth.onAuthStateChange((_e, s) => setSession(s));
    supabase.auth.getSession().then(({ data }) => { setSession(data.session); setReady(true); });
    return () => sub.subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (!session) { setIsAdmin(null); return; }
    supabase.rpc("has_role", { _user_id: session.user.id, _role: "admin" }).then(({ data }) => setIsAdmin(!!data));
  }, [session]);

  if (!ready || (session && isAdmin === null))
    return <div className="flex min-h-screen items-center justify-center"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>;
  if (!session) return <Login />;
  if (!isAdmin)
    return (
      <Centered>
        <h1 className="text-2xl font-semibold">No admin access</h1>
        <p className="mt-2 text-muted-foreground">You're signed in as {session.user.email}, but this account isn't an administrator.</p>
        <button className="btn btn-outline mt-6" onClick={() => supabase.auth.signOut()}>Sign out</button>
      </Centered>
    );
  return <Dashboard email={session.user.email ?? ""} />;
}

function Centered({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-surface px-4">
      <div className="card-site w-full max-w-md p-8 md:p-10">
        <Link to="/" aria-label="Back to website"><Logo /></Link>
        <div className="mt-8">{children}</div>
      </div>
    </div>
  );
}

function Login() {
  const [mode, setMode] = useState<"in" | "up">("in");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true); setMsg(null);
    if (mode === "in") {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) setMsg({ ok: false, text: error.message });
    } else {
      const { data, error } = await supabase.auth.signUp({ email, password, options: { emailRedirectTo: `${window.location.origin}/admin` } });
      if (error) setMsg({ ok: false, text: error.message });
      else if (!data.session) setMsg({ ok: true, text: "Account created. Check your email to confirm, then sign in." });
    }
    setBusy(false);
  }

  return (
    <Centered>
      <h1 className="text-2xl font-semibold">{mode === "in" ? "Admin sign in" : "Create admin account"}</h1>
      <p className="mt-2 text-sm text-muted-foreground">Manage website content, careers and enquiries.</p>
      <form onSubmit={submit} className="mt-6 space-y-4">
        <div>
          <label htmlFor="a-email" className="mb-2 block text-sm font-semibold">Email</label>
          <input id="a-email" type="email" required autoComplete="email" className="field" value={email} onChange={(e) => setEmail(e.target.value)} />
        </div>
        <div>
          <label htmlFor="a-pass" className="mb-2 block text-sm font-semibold">Password</label>
          <input id="a-pass" type="password" required minLength={8} autoComplete={mode === "in" ? "current-password" : "new-password"} className="field" value={password} onChange={(e) => setPassword(e.target.value)} />
        </div>
        {msg && <p role="status" className={`text-sm ${msg.ok ? "text-success" : "text-destructive"}`}>{msg.text}</p>}
        <button className="btn btn-primary w-full" disabled={busy}>
          {busy && <Loader2 className="h-4 w-4 animate-spin" />}{mode === "in" ? "Sign in" : "Create account"}
        </button>
      </form>
      <button type="button" className="mt-5 text-sm font-medium text-primary" onClick={() => { setMode(mode === "in" ? "up" : "in"); setMsg(null); }}>
        {mode === "in" ? "First time? Create the admin account" : "Already have an account? Sign in"}
      </button>
    </Centered>
  );
}

/* ---------------- dashboard ---------------- */

type Tab = "overview" | "settings" | "services" | "jobs" | "applications" | "enquiries" | "expenses" | "vouchers";
const TABS: { id: Tab; label: string; icon: typeof Settings }[] = [
  { id: "overview", label: "Overview", icon: LayoutDashboard },
  { id: "settings", label: "Site & Contact", icon: Settings },
  { id: "services", label: "Services", icon: Layers },
  { id: "jobs", label: "Careers", icon: Briefcase },
  { id: "applications", label: "Applications", icon: FileText },
  { id: "enquiries", label: "Enquiries", icon: Inbox },
  { id: "expenses", label: "Expenses", icon: Wallet },
  { id: "vouchers", label: "Vouchers", icon: Receipt },
];

function Dashboard({ email }: { email: string }) {
  const [tab, setTab] = useState<Tab>("overview");
  const [draft, setDraft] = useState<VoucherDraft | null>(null);
  const qc = useQueryClient();
  const refreshSite = useCallback(() => qc.invalidateQueries({ queryKey: contentQuery.queryKey }), [qc]);

  async function signOut() {
    await qc.cancelQueries();
    await supabase.auth.signOut();
  }

  return (
    <div className="min-h-screen bg-surface lg:grid lg:grid-cols-[260px_1fr]">
      <aside className="border-b border-border bg-card lg:sticky lg:top-0 lg:h-screen lg:border-b-0 lg:border-r">
        <div className="flex items-center justify-between p-5 lg:block">
          <Link to="/" aria-label="View website"><Logo /></Link>
          <p className="hidden truncate pt-6 text-xs text-muted-foreground lg:block">{email}</p>
        </div>
        <nav aria-label="Admin" className="flex gap-1 overflow-x-auto px-3 pb-3 lg:flex-col lg:pb-0">
          {TABS.map((t) => (
            <button key={t.id} onClick={() => setTab(t.id)}
              className={`flex shrink-0 items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors ${tab === t.id ? "bg-secondary text-primary" : "text-muted-foreground hover:bg-muted hover:text-foreground"}`}>
              <t.icon className="h-4 w-4" />{t.label}
            </button>
          ))}
        </nav>
        <div className="hidden space-y-1 p-3 lg:absolute lg:bottom-0 lg:block lg:w-full">
          <a href="/" target="_blank" rel="noreferrer" className="flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm text-muted-foreground hover:bg-muted"><ExternalLink className="h-4 w-4" />View website</a>
          <button onClick={signOut} className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm text-muted-foreground hover:bg-muted"><LogOut className="h-4 w-4" />Sign out</button>
        </div>
      </aside>
      <main className="p-5 md:p-10">
        <div className="mb-6 flex justify-end lg:hidden">
          <button onClick={signOut} className="btn btn-outline h-9 px-4 text-sm"><LogOut className="h-4 w-4" />Sign out</button>
        </div>
        {tab === "overview" && <Overview go={setTab} />}
        {tab === "settings" && <SettingsPanel onSaved={refreshSite} />}
        {tab === "services" && <ServicesPanel onSaved={refreshSite} />}
        {tab === "jobs" && <JobsPanel onSaved={refreshSite} />}
        {tab === "applications" && <ApplicationsPanel />}
        {tab === "enquiries" && <EnquiriesPanel />}
        {tab === "expenses" && <ExpensesPanel onVoucher={(x) => { setDraft({ expense_id: x.id, payee: x.paid_by, details: `${x.name} (${x.category})${x.notes ? " – " + x.notes : ""}`, amount: String(x.amount) }); setTab("vouchers"); }} />}
        {tab === "vouchers" && <VouchersPanel draft={draft} />}
      </main>
    </div>
  );
}

function PanelHead({ title, text, action }: { title: string; text: string; action?: ReactNode }) {
  return (
    <div className="mb-8 flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
      <div>
        <h1 className="text-3xl font-semibold">{title}</h1>
        <p className="mt-2 text-muted-foreground">{text}</p>
      </div>
      {action}
    </div>
  );
}

function Lbl({ id, label, children, hint }: { id: string; label: string; children: ReactNode; hint?: string }) {
  return (
    <div>
      <label htmlFor={id} className="mb-2 block text-sm font-semibold">{label}</label>
      {children}
      {hint && <p className="mt-1.5 text-xs text-muted-foreground">{hint}</p>}
    </div>
  );
}

function Toast({ msg }: { msg: { ok: boolean; text: string } | null }) {
  if (!msg) return null;
  return <p role="status" className={`text-sm font-medium ${msg.ok ? "text-success" : "text-destructive"}`}>{msg.text}</p>;
}

async function uploadImage(file: File): Promise<string> {
  const ext = file.name.split(".").pop() ?? "jpg";
  const path = `images/${crypto.randomUUID()}.${ext}`;
  const up = await supabase.storage.from("site-media").upload(path, file, { contentType: file.type || "image/jpeg" });
  if (up.error) throw up.error;
  const { data, error } = await supabase.storage.from("site-media").createSignedUrl(path, 60 * 60 * 24 * 365 * 10);
  if (error || !data) throw error ?? new Error("Could not create image link");
  return data.signedUrl;
}

function ImageField({ id, label, value, onChange }: { id: string; label: string; value: string; onChange: (v: string) => void }) {
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  return (
    <Lbl id={id} label={label} hint="JPG or PNG, up to 5 MB. Leave empty to use the default image.">
      <div className="flex items-center gap-4">
        <div className="h-20 w-28 shrink-0 overflow-hidden rounded-lg border border-border bg-muted">
          {value ? <img src={value} alt="" className="h-full w-full object-cover" /> : <span className="flex h-full items-center justify-center text-xs text-muted-foreground">Default</span>}
        </div>
        <div className="flex flex-wrap gap-2">
          <label htmlFor={id} className="btn btn-outline h-10 cursor-pointer px-4 text-sm">
            {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />} Upload
            <input id={id} type="file" accept="image/*" className="sr-only" disabled={busy}
              onChange={async (e) => {
                const f = e.target.files?.[0]; if (!f) return;
                setBusy(true); setErr("");
                try { onChange(await uploadImage(f)); } catch (x) { setErr(x instanceof Error ? x.message : "Upload failed"); }
                setBusy(false); e.target.value = "";
              }} />
          </label>
          {value && <button type="button" onClick={() => onChange("")} className="btn btn-outline h-10 px-4 text-sm">Remove</button>}
        </div>
      </div>
      {err && <p className="mt-2 text-sm text-destructive">{err}</p>}
    </Lbl>
  );
}

const lines = (s: string) => s.split("\n").map((l) => l.trim()).filter(Boolean);

/* ---------------- overview ---------------- */

function Overview({ go }: { go: (t: Tab) => void }) {
  const [c, setC] = useState({ services: 0, jobs: 0, applications: 0, enquiries: 0 });
  useEffect(() => {
    (async () => {
      const q = (t: "services" | "jobs" | "job_applications" | "enquiries") => supabase.from(t).select("*", { count: "exact", head: true });
      const [a, b, d, e] = await Promise.all([q("services"), q("jobs"), q("job_applications"), q("enquiries")]);
      setC({ services: a.count ?? 0, jobs: b.count ?? 0, applications: d.count ?? 0, enquiries: e.count ?? 0 });
    })();
  }, []);
  const cards: { label: string; value: number; tab: Tab; icon: typeof Settings }[] = [
    { label: "Services", value: c.services, tab: "services", icon: Layers },
    { label: "Job openings", value: c.jobs, tab: "jobs", icon: Briefcase },
    { label: "Applications", value: c.applications, tab: "applications", icon: FileText },
    { label: "Enquiries", value: c.enquiries, tab: "enquiries", icon: Inbox },
  ];
  return (
    <>
      <PanelHead title="Dashboard" text="Manage your website content, careers and incoming enquiries." />
      <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-4">
        {cards.map((k) => (
          <button key={k.label} onClick={() => go(k.tab)} className="card-site card-hover p-6 text-left">
            <k.icon className="h-5 w-5 text-primary" />
            <p className="mt-5 font-display text-4xl font-semibold">{k.value}</p>
            <p className="mt-1 text-sm text-muted-foreground">{k.label}</p>
          </button>
        ))}
      </div>
    </>
  );
}

/* ---------------- settings ---------------- */

function SettingsPanel({ onSaved }: { onSaved: () => void }) {
  const [s, setS] = useState<SiteSettings | null>(null);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);

  useEffect(() => {
    supabase.from("site_settings").select("data").eq("id", 1).maybeSingle().then(({ data }) =>
      setS({ ...DEFAULT_SETTINGS, ...((data?.data as Partial<SiteSettings>) ?? {}) }));
  }, []);

  if (!s) return <Loading />;
  const set = (k: keyof SiteSettings) => (v: string) => setS({ ...s, [k]: v });

  async function save() {
    setBusy(true); setMsg(null);
    const { error } = await supabase.from("site_settings").upsert({ id: 1, data: s, updated_at: new Date().toISOString() });
    setBusy(false);
    setMsg(error ? { ok: false, text: error.message } : { ok: true, text: "Saved. Your website is updated." });
    if (!error) onSaved();
  }

  const text = (k: keyof SiteSettings, label: string, type = "text", hint?: string) => (
    <Lbl id={k} label={label} {...(hint ? { hint } : {})}><input id={k} type={type} className="field" value={s[k]} onChange={(e) => set(k)(e.target.value)} /></Lbl>
  );

  return (
    <>
      <PanelHead title="Site & Contact" text="Contact details, social links, homepage text and images."
        action={<button onClick={save} disabled={busy} className="btn btn-primary">{busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}Save changes</button>} />
      <div className="space-y-6">
        <section className="card-site space-y-5 p-6 md:p-8">
          <h2 className="text-lg font-semibold">Contact information</h2>
          <div className="grid gap-5 md:grid-cols-2">
            {text("email", "Email", "email")}
            {text("phone", "Phone", "tel")}
            <div className="md:col-span-2">{text("location", "Location")}</div>
            {text("linkedin", "LinkedIn URL", "url", "Leave empty to hide the icon.")}
            {text("instagram", "Instagram URL", "url", "Leave empty to hide the icon.")}
          </div>
        </section>
        <section className="card-site space-y-5 p-6 md:p-8">
          <h2 className="text-lg font-semibold">Homepage</h2>
          {text("hero_title", "Main headline")}
          <Lbl id="hero_text" label="Supporting text"><textarea id="hero_text" rows={3} className="field h-auto py-3" value={s.hero_text} onChange={(e) => set("hero_text")(e.target.value)} /></Lbl>
          <div className="grid gap-6 md:grid-cols-2">
            <ImageField id="hero_image" label="Homepage main image" value={s.hero_image} onChange={set("hero_image")} />
            <ImageField id="about_image" label="About section image" value={s.about_image} onChange={set("about_image")} />
          </div>
        </section>
        <Toast msg={msg} />
      </div>
    </>
  );
}

/* ---------------- services ---------------- */

function ServicesPanel({ onSaved }: { onSaved: () => void }) {
  const [rows, setRows] = useState<ServiceRow[] | null>(null);
  const load = useCallback(() => {
    supabase.from("services").select("*").order("sort").then(({ data }) => setRows(data ?? []));
  }, []);
  useEffect(load, [load]);

  async function add() {
    const id = `service-${Date.now().toString(36)}`;
    const sort = (rows?.reduce((m, r) => Math.max(m, r.sort), 0) ?? 0) + 1;
    await supabase.from("services").insert({ id, title: "New service", sort, published: false });
    load();
  }

  if (!rows) return <Loading />;
  return (
    <>
      <PanelHead title="Services" text="Edit service titles, descriptions, icons and images. Lower order numbers appear first."
        action={<button onClick={add} className="btn btn-primary"><Plus className="h-4 w-4" />Add service</button>} />
      <div className="space-y-5">
        {rows.map((r) => <ServiceEditor key={r.id} row={r} onChange={() => { load(); onSaved(); }} />)}
      </div>
    </>
  );
}

function ServiceEditor({ row, onChange }: { row: ServiceRow; onChange: () => void }) {
  const [r, setR] = useState(row);
  const [caps, setCaps] = useState(row.capabilities.join("\n"));
  const [bens, setBens] = useState(row.benefits.join("\n"));
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const Icon = ICONS[r.icon] ?? Layers;

  async function save() {
    setBusy(true); setMsg(null);
    const { error } = await supabase.from("services").update({
      title: r.title, short: r.short, description: r.description, icon: r.icon, image_url: r.image_url || null,
      capabilities: lines(caps), benefits: lines(bens), sort: r.sort, published: r.published,
    }).eq("id", r.id);
    setBusy(false);
    setMsg(error ? { ok: false, text: error.message } : { ok: true, text: "Saved." });
    if (!error) onChange();
  }
  async function del() {
    if (!confirm(`Delete "${r.title}"?`)) return;
    await supabase.from("services").delete().eq("id", r.id);
    onChange();
  }

  return (
    <article className="card-site overflow-hidden">
      <button onClick={() => setOpen(!open)} className="flex w-full items-center gap-4 p-5 text-left">
        <span className="inline-flex h-10 w-10 items-center justify-center rounded-lg bg-secondary text-primary"><Icon className="h-5 w-5" /></span>
        <span className="flex-1 font-semibold">{r.title}</span>
        {!r.published && <span className="rounded-full bg-muted px-2.5 py-1 text-xs text-muted-foreground">Hidden</span>}
        <span className="text-sm text-primary">{open ? "Close" : "Edit"}</span>
      </button>
      {open && (
        <div className="space-y-5 border-t border-border p-5 md:p-6">
          <div className="grid gap-5 md:grid-cols-[1fr_200px_120px]">
            <Lbl id={`t-${r.id}`} label="Title"><input id={`t-${r.id}`} className="field" value={r.title} onChange={(e) => setR({ ...r, title: e.target.value })} /></Lbl>
            <Lbl id={`i-${r.id}`} label="Icon">
              <select id={`i-${r.id}`} className="field" value={r.icon} onChange={(e) => setR({ ...r, icon: e.target.value })}>
                {Object.keys(ICONS).map((k) => <option key={k}>{k}</option>)}
              </select>
            </Lbl>
            <Lbl id={`o-${r.id}`} label="Order"><input id={`o-${r.id}`} type="number" className="field" value={r.sort} onChange={(e) => setR({ ...r, sort: Number(e.target.value) })} /></Lbl>
          </div>
          <Lbl id={`s-${r.id}`} label="Short description (cards)"><textarea id={`s-${r.id}`} rows={2} className="field h-auto py-3" value={r.short} onChange={(e) => setR({ ...r, short: e.target.value })} /></Lbl>
          <Lbl id={`d-${r.id}`} label="Full description (Services page)"><textarea id={`d-${r.id}`} rows={3} className="field h-auto py-3" value={r.description} onChange={(e) => setR({ ...r, description: e.target.value })} /></Lbl>
          <div className="grid gap-5 md:grid-cols-2">
            <Lbl id={`c-${r.id}`} label="Key capabilities" hint="One per line."><textarea id={`c-${r.id}`} rows={5} className="field h-auto py-3" value={caps} onChange={(e) => setCaps(e.target.value)} /></Lbl>
            <Lbl id={`b-${r.id}`} label="Business benefits" hint="One per line."><textarea id={`b-${r.id}`} rows={5} className="field h-auto py-3" value={bens} onChange={(e) => setBens(e.target.value)} /></Lbl>
          </div>
          <ImageField id={`img-${r.id}`} label="Image" value={r.image_url ?? ""} onChange={(v) => setR({ ...r, image_url: v })} />
          <div className="flex flex-wrap items-center gap-3 border-t border-border pt-5">
            <button onClick={save} disabled={busy} className="btn btn-primary h-10 px-5 text-sm">{busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}Save</button>
            <button onClick={() => setR({ ...r, published: !r.published })} className="btn btn-outline h-10 px-4 text-sm">
              {r.published ? <><EyeOff className="h-4 w-4" />Hide from site</> : <><Eye className="h-4 w-4" />Show on site</>}
            </button>
            <button onClick={del} className="btn btn-outline h-10 px-4 text-sm text-destructive"><Trash2 className="h-4 w-4" />Delete</button>
            <Toast msg={msg} />
          </div>
        </div>
      )}
    </article>
  );
}

/* ---------------- jobs ---------------- */

function JobsPanel({ onSaved }: { onSaved: () => void }) {
  const [rows, setRows] = useState<JobRow[] | null>(null);
  const load = useCallback(() => {
    supabase.from("jobs").select("*").order("sort").then(({ data }) => setRows(data ?? []));
  }, []);
  useEffect(load, [load]);

  async function add() {
    const sort = (rows?.reduce((m, r) => Math.max(m, r.sort), 0) ?? 0) + 1;
    await supabase.from("jobs").insert({ title: "New position", sort, published: false });
    load();
  }

  if (!rows) return <Loading />;
  return (
    <>
      <PanelHead title="Careers" text="Add, edit, hide or remove job openings shown on the Careers page."
        action={<button onClick={add} className="btn btn-primary"><Plus className="h-4 w-4" />Add opening</button>} />
      {rows.length === 0 && <p className="text-muted-foreground">No openings yet.</p>}
      <div className="space-y-5">
        {rows.map((r) => <JobEditor key={r.id} row={r} onChange={() => { load(); onSaved(); }} />)}
      </div>
    </>
  );
}

function JobEditor({ row, onChange }: { row: JobRow; onChange: () => void }) {
  const [r, setR] = useState(row);
  const [resp, setResp] = useState(row.responsibilities.join("\n"));
  const [reqs, setReqs] = useState(row.requirements.join("\n"));
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);

  async function save() {
    setBusy(true); setMsg(null);
    const { error } = await supabase.from("jobs").update({
      title: r.title, location: r.location, employment: r.employment, experience: r.experience, workplace: r.workplace,
      salary: r.salary, good_to_have: r.good_to_have, responsibilities: lines(resp), requirements: lines(reqs),
      sort: r.sort, published: r.published,
    }).eq("id", r.id);
    setBusy(false);
    setMsg(error ? { ok: false, text: error.message } : { ok: true, text: "Saved." });
    if (!error) onChange();
  }
  async function del() {
    if (!confirm(`Delete "${r.title}"?`)) return;
    await supabase.from("jobs").delete().eq("id", r.id);
    onChange();
  }
  const f = (k: "title" | "location" | "employment" | "experience" | "workplace" | "salary", label: string) => (
    <Lbl id={`${k}-${r.id}`} label={label}><input id={`${k}-${r.id}`} className="field" value={r[k]} onChange={(e) => setR({ ...r, [k]: e.target.value })} /></Lbl>
  );

  return (
    <article className="card-site overflow-hidden">
      <button onClick={() => setOpen(!open)} className="flex w-full items-center gap-4 p-5 text-left">
        <span className="inline-flex h-10 w-10 items-center justify-center rounded-lg bg-secondary text-primary"><Briefcase className="h-5 w-5" /></span>
        <span className="flex-1">
          <span className="block font-semibold">{r.title}</span>
          <span className="block text-sm text-muted-foreground">{[r.location, r.employment].filter(Boolean).join(" · ")}</span>
        </span>
        <span className={`rounded-full px-2.5 py-1 text-xs ${r.published ? "bg-secondary text-primary" : "bg-muted text-muted-foreground"}`}>{r.published ? "Live" : "Hidden"}</span>
        <span className="text-sm text-primary">{open ? "Close" : "Edit"}</span>
      </button>
      {open && (
        <div className="space-y-5 border-t border-border p-5 md:p-6">
          <div className="grid gap-5 md:grid-cols-[1fr_120px]">
            {f("title", "Job title")}
            <Lbl id={`o-${r.id}`} label="Order"><input id={`o-${r.id}`} type="number" className="field" value={r.sort} onChange={(e) => setR({ ...r, sort: Number(e.target.value) })} /></Lbl>
          </div>
          <div className="grid gap-5 md:grid-cols-3">
            {f("location", "Location")}{f("employment", "Employment type")}{f("experience", "Experience")}
            {f("workplace", "Workplace")}{f("salary", "Salary")}
          </div>
          <div className="grid gap-5 md:grid-cols-2">
            <Lbl id={`r-${r.id}`} label="Responsibilities" hint="One per line."><textarea id={`r-${r.id}`} rows={7} className="field h-auto py-3" value={resp} onChange={(e) => setResp(e.target.value)} /></Lbl>
            <Lbl id={`q-${r.id}`} label="Requirements" hint="One per line."><textarea id={`q-${r.id}`} rows={7} className="field h-auto py-3" value={reqs} onChange={(e) => setReqs(e.target.value)} /></Lbl>
          </div>
          <Lbl id={`g-${r.id}`} label="Good to have"><textarea id={`g-${r.id}`} rows={2} className="field h-auto py-3" value={r.good_to_have} onChange={(e) => setR({ ...r, good_to_have: e.target.value })} /></Lbl>
          <div className="flex flex-wrap items-center gap-3 border-t border-border pt-5">
            <button onClick={save} disabled={busy} className="btn btn-primary h-10 px-5 text-sm">{busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}Save</button>
            <button onClick={() => setR({ ...r, published: !r.published })} className="btn btn-outline h-10 px-4 text-sm">
              {r.published ? <><EyeOff className="h-4 w-4" />Hide from site</> : <><Eye className="h-4 w-4" />Show on site</>}
            </button>
            <button onClick={del} className="btn btn-outline h-10 px-4 text-sm text-destructive"><Trash2 className="h-4 w-4" />Delete</button>
            <Toast msg={msg} />
          </div>
        </div>
      )}
    </article>
  );
}

/* ---------------- inbox panels ---------------- */

type AppRow = { id: string; job_title: string; full_name: string; email: string; phone: string; experience: string; location: string; message: string | null; resume_path: string | null; created_at: string };
type EnqRow = { id: string; name: string; company: string | null; email: string; phone: string; service: string; message: string; created_at: string };

const fmt = (d: string) => new Date(d).toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short" });

function ApplicationsPanel() {
  const [rows, setRows] = useState<AppRow[] | null>(null);
  const load = useCallback(() => {
    supabase.from("job_applications").select("*").order("created_at", { ascending: false }).then(({ data }) => setRows(data ?? []));
  }, []);
  useEffect(load, [load]);

  async function resume(path: string) {
    const { data, error } = await supabase.storage.from("resumes").createSignedUrl(path, 300);
    if (error || !data) { alert("Could not open resume."); return; }
    window.open(data.signedUrl, "_blank", "noopener");
  }
  async function del(id: string) {
    if (!confirm("Delete this application?")) return;
    await supabase.from("job_applications").delete().eq("id", id);
    load();
  }

  if (!rows) return <Loading />;
  return (
    <>
      <PanelHead title="Applications" text="Job applications submitted through the Careers page." />
      {rows.length === 0 && <Empty text="No applications yet." />}
      <div className="space-y-4">
        {rows.map((a) => (
          <article key={a.id} className="card-site p-6">
            <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
              <div>
                <h2 className="text-lg font-semibold">{a.full_name}</h2>
                <p className="text-sm text-primary">{a.job_title}</p>
              </div>
              <p className="text-xs text-muted-foreground">{fmt(a.created_at)}</p>
            </div>
            <dl className="mt-4 grid gap-3 text-sm sm:grid-cols-2 lg:grid-cols-4">
              <Info k="Email" v={<a className="text-primary" href={`mailto:${a.email}`}>{a.email}</a>} />
              <Info k="Phone" v={<a className="text-primary" href={`tel:${a.phone}`}>{a.phone}</a>} />
              <Info k="Experience" v={`${a.experience} yrs`} />
              <Info k="Location" v={a.location} />
            </dl>
            {a.message && <p className="mt-4 whitespace-pre-line rounded-lg bg-surface p-4 text-sm">{a.message}</p>}
            <div className="mt-4 flex gap-2">
              {a.resume_path && <button onClick={() => resume(a.resume_path!)} className="btn btn-outline h-9 px-4 text-sm"><Download className="h-4 w-4" />Resume</button>}
              <button onClick={() => del(a.id)} className="btn btn-outline h-9 px-4 text-sm text-destructive"><Trash2 className="h-4 w-4" />Delete</button>
            </div>
          </article>
        ))}
      </div>
    </>
  );
}

function EnquiriesPanel() {
  const [rows, setRows] = useState<EnqRow[] | null>(null);
  const load = useCallback(() => {
    supabase.from("enquiries").select("*").order("created_at", { ascending: false }).then(({ data }) => setRows(data ?? []));
  }, []);
  useEffect(load, [load]);
  async function del(id: string) {
    if (!confirm("Delete this enquiry?")) return;
    await supabase.from("enquiries").delete().eq("id", id);
    load();
  }
  if (!rows) return <Loading />;
  return (
    <>
      <PanelHead title="Enquiries" text="Messages submitted through the Contact page." />
      {rows.length === 0 && <Empty text="No enquiries yet." />}
      <div className="space-y-4">
        {rows.map((q) => (
          <article key={q.id} className="card-site p-6">
            <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
              <div>
                <h2 className="text-lg font-semibold">{q.name}{q.company && <span className="font-normal text-muted-foreground"> · {q.company}</span>}</h2>
                <p className="text-sm text-primary">{q.service}</p>
              </div>
              <p className="text-xs text-muted-foreground">{fmt(q.created_at)}</p>
            </div>
            <dl className="mt-4 grid gap-3 text-sm sm:grid-cols-2">
              <Info k="Email" v={<a className="text-primary" href={`mailto:${q.email}`}>{q.email}</a>} />
              <Info k="Phone" v={<a className="text-primary" href={`tel:${q.phone}`}>{q.phone}</a>} />
            </dl>
            <p className="mt-4 whitespace-pre-line rounded-lg bg-surface p-4 text-sm">{q.message}</p>
            <button onClick={() => del(q.id)} className="btn btn-outline mt-4 h-9 px-4 text-sm text-destructive"><Trash2 className="h-4 w-4" />Delete</button>
          </article>
        ))}
      </div>
    </>
  );
}

function Info({ k, v }: { k: string; v: ReactNode }) {
  return <div><dt className="text-xs font-bold uppercase tracking-[0.12em] text-muted-foreground">{k}</dt><dd className="mt-1">{v}</dd></div>;
}
function Empty({ text }: { text: string }) {
  return <div className="card-site p-10 text-center text-muted-foreground">{text}</div>;
}
function Loading() {
  return <div className="flex justify-center py-20"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>;
}
