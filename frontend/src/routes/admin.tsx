import { createFileRoute, Link } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import { useCallback, useEffect, useState, type ReactNode } from "react";
import {
  LayoutDashboard, Settings, Layers, Briefcase, FileText, Inbox, LogOut, Loader2, Plus, Trash2,
  Save, ExternalLink, Upload, Eye, EyeOff, Download, Wallet, Receipt, Tags, Banknote, BarChart3,
  Users, Shield,
} from "lucide-react";
import { AdminAccessProvider, useCan } from "@/components/admin/admin-access";
import { ExpenseCategoriesPanel } from "@/components/admin/expense-categories";
import { RolesPanel } from "@/components/admin/roles-panel";
import { UsersPanel } from "@/components/admin/users-panel";
import { supabase } from "@/integrations/supabase/client";
import { Logo } from "@/components/site/Logo";
import { PasswordInput } from "@/components/ui/password-input";
import { ExpensesPanel, VouchersPanel, type VoucherDraft } from "@/components/admin/finance";
import { PaymentsPanel } from "@/components/admin/payments-panel";
import { ReportsPanel } from "@/components/admin/reports-panel";
import { ICONS, contentQuery } from "@/lib/content";
import { DEFAULT_SETTINGS, type ServiceRow, type JobRow } from "@/lib/content.functions";
import { authApi } from "@/lib/auth-api";
import { apiErrorMessage, ApiError } from "@/lib/api";
import { clearAuthSession, getStoredUser, isAuthenticated } from "@/lib/auth-storage";
import type { AuthUser } from "@/lib/api-types";
import { siteContactApi } from "@/lib/site-contact-api";
import { servicesApi } from "@/lib/services-api";
import { applicationsApi, type JobApplication } from "@/lib/applications-api";
import { careersApi } from "@/lib/careers-api";
import {
  careerToJobRow,
  serviceToRow,
  settingsToSiteContact,
  siteContactToSettings,
  type SiteSettingsForm,
} from "@/lib/cms-mappers";
import { OG_IMAGE_URL, siteIconLinks } from "@/lib/site";
import {
  canEnterAdmin,
  canSeeAdminTab,
  type AdminAccess,
  type AdminTab,
} from "@/lib/permissions";

export const Route = createFileRoute("/admin")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "Admin — Credex" },
      { name: "description", content: "Credex website administration." },
      { name: "robots", content: "noindex, nofollow" },
      { property: "og:title", content: "Admin — Credex" },
      { property: "og:description", content: "Credex website administration." },
      { property: "og:image", content: OG_IMAGE_URL },
    ],
    links: [...siteIconLinks],
  }),
  component: AdminPage,
});

/* ---------------- auth shell ---------------- */

function AdminPage() {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [access, setAccess] = useState<AdminAccess | null>(null);
  const [ready, setReady] = useState(false);

  const loadAccess = useCallback(async () => {
    const profile = await authApi.profile();
    const nextAccess = await authApi.access();
    return { profile, nextAccess };
  }, []);

  useEffect(() => {
    let cancelled = false;

    async function bootstrap() {
      if (!isAuthenticated()) {
        if (!cancelled) {
          setUser(null);
          setAccess(null);
          setReady(true);
        }
        return;
      }

      try {
        const { profile, nextAccess } = await loadAccess();
        if (!cancelled) {
          setUser(profile);
          setAccess(nextAccess);
        }
      } catch (error) {
        if (error instanceof ApiError && error.status === 403) {
          if (!cancelled) {
            setUser(getStoredUser());
            setAccess({ superAdmin: false, permissions: [] });
          }
        } else {
          clearAuthSession();
          if (!cancelled) {
            setUser(null);
            setAccess(null);
          }
        }
      } finally {
        if (!cancelled) setReady(true);
      }
    }

    bootstrap();
    return () => { cancelled = true; };
  }, [loadAccess]);

  useEffect(() => {
    if (!user) return;
    function onFocus() {
      loadAccess()
        .then(({ profile, nextAccess }) => {
          setUser(profile);
          setAccess(nextAccess);
        })
        .catch((error) => {
          if (error instanceof ApiError && (error.status === 401 || error.status === 403)) {
            clearAuthSession();
            setUser(null);
            setAccess(null);
          }
        });
    }
    window.addEventListener("focus", onFocus);
    return () => window.removeEventListener("focus", onFocus);
  }, [user, loadAccess]);

  if (!ready || (user && !access))
    return <div className="flex min-h-screen items-center justify-center"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>;
  if (!user || !access) return <Login onSignedIn={() => window.location.reload()} />;
  if (!canEnterAdmin(access))
    return (
      <Centered>
        <h1 className="text-2xl font-semibold">No admin access</h1>
        <p className="mt-2 text-muted-foreground">You're signed in as {user.email}, but this account isn't an administrator.</p>
        <button className="btn btn-outline mt-6" onClick={() => authApi.logout().then(() => window.location.reload())}>Sign out</button>
      </Centered>
    );
  return (
    <AdminAccessProvider access={access}>
      <Dashboard user={user} access={access} onProfile={(p) => setUser(p)} />
    </AdminAccessProvider>
  );
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

function Login({ onSignedIn }: { onSignedIn: () => void }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true); setMsg(null);
    try {
      await authApi.login(email, password);
      onSignedIn();
    } catch (error) {
      setMsg(apiErrorMessage(error, "Sign in failed"));
    }
    setBusy(false);
  }

  return (
    <Centered>
      <h1 className="text-2xl font-semibold">Admin sign in</h1>
      <p className="mt-2 text-sm text-muted-foreground">Manage website content, careers and enquiries.</p>
      <form onSubmit={submit} className="mt-6 space-y-4">
        <div>
          <label htmlFor="a-email" className="mb-2 block text-sm font-semibold">Email</label>
          <input id="a-email" type="email" required autoComplete="email" className="field" value={email} onChange={(e) => setEmail(e.target.value)} />
        </div>
        <div>
          <label htmlFor="a-pass" className="mb-2 block text-sm font-semibold">Password</label>
          <PasswordInput id="a-pass" required minLength={8} autoComplete="current-password" value={password} onChange={(e) => setPassword(e.target.value)} />
        </div>
        {msg && <p role="status" className="text-sm text-destructive">{msg}</p>}
        <button className="btn btn-primary w-full" disabled={busy}>
          {busy && <Loader2 className="h-4 w-4 animate-spin" />}Sign in
        </button>
      </form>
    </Centered>
  );
}

/* ---------------- dashboard ---------------- */

type Tab = AdminTab;
const TAB_ICONS: Record<Tab, typeof Settings> = {
  overview: LayoutDashboard,
  settings: Settings,
  services: Layers,
  jobs: Briefcase,
  applications: FileText,
  enquiries: Inbox,
  expenses: Wallet,
  "expense-categories": Tags,
  vouchers: Receipt,
  payments: Banknote,
  reports: BarChart3,
  users: Users,
  roles: Shield,
};

function Dashboard({ user, access, onProfile }: { user: AuthUser; access: AdminAccess; onProfile: (user: AuthUser) => void }) {
  const [tab, setTab] = useState<Tab>("overview");
  const tabs = [
    { id: "overview" as const, label: "Overview" },
    { id: "settings" as const, label: "Site & Contact" },
    { id: "services" as const, label: "Services" },
    { id: "jobs" as const, label: "Careers" },
    { id: "applications" as const, label: "Applications" },
    { id: "enquiries" as const, label: "Enquiries" },
    { id: "expenses" as const, label: "Expenses" },
    { id: "expense-categories" as const, label: "Expense Categories" },
    { id: "vouchers" as const, label: "Vouchers" },
    { id: "payments" as const, label: "Payments" },
    { id: "reports" as const, label: "Reports" },
    { id: "users" as const, label: "Users" },
    { id: "roles" as const, label: "Roles" },
  ].filter((item) => canSeeAdminTab(access, item.id));

  useEffect(() => {
    if (!canSeeAdminTab(access, tab)) setTab("overview");
  }, [access, tab]);
  const [draft, setDraft] = useState<Partial<VoucherDraft> | null>(null);
  const [paymentFocus, setPaymentFocus] = useState<string | null>(null);
  const [voucherSearch, setVoucherSearch] = useState<string | null>(null);
  const qc = useQueryClient();
  const refreshSite = useCallback(() => qc.invalidateQueries({ queryKey: contentQuery.queryKey }), [qc]);

  useEffect(() => {
    authApi.profile().then(onProfile).catch(() => undefined);
  }, [onProfile]);

  async function signOut() {
    await qc.cancelQueries();
    await authApi.logout();
    window.location.reload();
  }

  return (
    <div className="min-h-screen bg-surface lg:grid lg:grid-cols-[260px_1fr]">
      <aside className="border-b border-border bg-card lg:sticky lg:top-0 lg:h-screen lg:border-b-0 lg:border-r">
        <div className="flex items-center justify-between p-5 lg:block">
          <Link to="/" aria-label="View website"><Logo /></Link>
          <p className="hidden truncate pt-6 text-xs text-muted-foreground lg:block">{user.email}</p>
        </div>
        <nav aria-label="Admin" className="flex gap-1 overflow-x-auto px-3 pb-3 lg:flex-col lg:pb-0">
          {tabs.map((t) => {
            const Icon = TAB_ICONS[t.id];
            return (
            <button key={t.id} onClick={() => setTab(t.id)}
              className={`flex shrink-0 items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors ${tab === t.id ? "bg-secondary text-primary" : "text-muted-foreground hover:bg-muted hover:text-foreground"}`}>
              <Icon className="h-4 w-4" />{t.label}
            </button>
            );
          })}
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
        {tab === "overview" && <Overview go={setTab} access={access} />}
        {tab === "settings" && <SettingsPanel onSaved={refreshSite} />}
        {tab === "services" && <ServicesPanel onSaved={refreshSite} />}
        {tab === "jobs" && <JobsPanel onSaved={refreshSite} />}
        {tab === "applications" && <ApplicationsPanel />}
        {tab === "enquiries" && <EnquiriesPanel />}
        {tab === "expenses" && <ExpensesPanel onVoucher={(x) => {
          setDraft({
            expenseId: x.id,
            categoryId: x.categoryId,
            paidBy: x.paidBy,
            payee: "",
            title: x.expenseName,
            description: `${x.expenseName} (${x.category.name})${x.notes ? " – " + x.notes : ""}`,
            amount: String(x.amount),
            paymentMode: "BANK_TRANSFER",
          });
          setTab("vouchers");
        }} />}
        {tab === "expense-categories" && <ExpenseCategoriesPanel />}
        {tab === "vouchers" && (
          <VouchersPanel
            draft={draft}
            initialSearch={voucherSearch}
            onOpenPayment={(id) => {
              setPaymentFocus(id);
              setTab("payments");
            }}
          />
        )}
        {tab === "payments" && (
          <PaymentsPanel
            focusId={paymentFocus}
            onFocusHandled={() => setPaymentFocus(null)}
            onOpenVoucher={(voucherNumber) => {
              setVoucherSearch(voucherNumber);
              setTab("vouchers");
            }}
          />
        )}
        {tab === "reports" && (
          <ReportsPanel
            onOpenVoucher={(voucherNumber) => {
              setVoucherSearch(voucherNumber);
              setTab("vouchers");
            }}
            onOpenPayment={(id) => {
              setPaymentFocus(id);
              setTab("payments");
            }}
          />
        )}
        {tab === "users" && <UsersPanel />}
        {tab === "roles" && <RolesPanel />}
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

function ImageField({
  id,
  label,
  value,
  onChange,
  onUploadFile,
  onRemove,
  locked = false,
}: {
  id: string;
  label: string;
  value: string;
  onChange: (v: string) => void;
  onUploadFile: (file: File) => Promise<string>;
  onRemove?: () => void | Promise<void>;
  locked?: boolean;
}) {
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  return (
    <Lbl id={id} label={label} hint="JPG or PNG, up to 5 MB. Leave empty to use the default image.">
      <div className="flex items-center gap-4">
        <div className="h-20 w-28 shrink-0 overflow-hidden rounded-lg border border-border bg-muted">
          {value ? <img src={value} alt="" className="h-full w-full object-cover" /> : <span className="flex h-full items-center justify-center text-xs text-muted-foreground">Default</span>}
        </div>
        <div className="flex flex-wrap gap-2">
          {!locked && <label htmlFor={id} className="btn btn-outline h-10 cursor-pointer px-4 text-sm">
            {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />} Upload
            <input id={id} type="file" accept="image/*" className="sr-only" disabled={busy}
              onChange={async (e) => {
                const f = e.target.files?.[0]; if (!f) return;
                setBusy(true); setErr("");
                try { onChange(await onUploadFile(f)); } catch (x) { setErr(apiErrorMessage(x, "Upload failed")); }
                setBusy(false); e.target.value = "";
              }} />
          </label>}
          {!locked && value && <button type="button" onClick={async () => { if (onRemove) await onRemove(); else onChange(""); }} className="btn btn-outline h-10 px-4 text-sm">Remove</button>}
        </div>
      </div>
      {err && <p className="mt-2 text-sm text-destructive">{err}</p>}
    </Lbl>
  );
}

const lines = (s: string) => s.split("\n").map((l) => l.trim()).filter(Boolean);

/* ---------------- overview ---------------- */

function Overview({ go, access }: { go: (t: Tab) => void; access: AdminAccess }) {
  const [c, setC] = useState({ services: 0, jobs: 0, applications: 0, enquiries: 0 });
  useEffect(() => {
    let cancelled = false;
    (async () => {
      const services = canSeeAdminTab(access, "services") ? await servicesApi.list().catch(() => []) : [];
      const careers = canSeeAdminTab(access, "jobs") ? await careersApi.listAdmin().catch(() => []) : [];
      const applications = canSeeAdminTab(access, "applications") ? await applicationsApi.list().catch(() => []) : [];
      const enquiries = canSeeAdminTab(access, "enquiries")
        ? await supabase.from("enquiries").select("*", { count: "exact", head: true })
        : { count: 0 };
      if (!cancelled) {
        setC({
          services: services.length,
          jobs: careers.length,
          applications: applications.length,
          enquiries: enquiries.count ?? 0,
        });
      }
    })();
    return () => { cancelled = true; };
  }, [access]);
  const cards = (
    [
      { label: "Services", value: c.services, tab: "services" as const, icon: Layers },
      { label: "Job openings", value: c.jobs, tab: "jobs" as const, icon: Briefcase },
      { label: "Applications", value: c.applications, tab: "applications" as const, icon: FileText },
      { label: "Enquiries", value: c.enquiries, tab: "enquiries" as const, icon: Inbox },
    ] as const
  ).filter((card) => canSeeAdminTab(access, card.tab));
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
  const canUpdate = useCan()("site_contact.update");
  const [s, setS] = useState<SiteSettingsForm | null>(null);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);

  useEffect(() => {
    siteContactApi.get().then((data) => {
      const mapped = siteContactToSettings(data);
      setS({
        ...DEFAULT_SETTINGS,
        ...mapped,
        hero_image_publicId: mapped.hero_image_publicId,
        about_image_publicId: mapped.about_image_publicId,
      });
    }).catch((error) => setMsg({ ok: false, text: apiErrorMessage(error, "Could not load site settings") }));
  }, []);

  if (!s) return <Loading />;
  const set = (k: keyof SiteSettingsForm) => (v: string) => setS({ ...s, [k]: v });

  async function save() {
    setBusy(true); setMsg(null);
    try {
      await siteContactApi.update(settingsToSiteContact(s));
      setMsg({ ok: true, text: "Site & Contact updated successfully." });
      onSaved();
    } catch (error) {
      setMsg({ ok: false, text: apiErrorMessage(error, "Could not save changes") });
    }
    setBusy(false);
  }

  const text = (k: keyof SiteSettingsForm, label: string, type = "text", hint?: string) => (
    <Lbl id={k} label={label} {...(hint ? { hint } : {})}><input id={k} type={type} className="field" readOnly={!canUpdate} value={s[k] as string} onChange={(e) => set(k)(e.target.value)} /></Lbl>
  );

  return (
    <>
      <PanelHead title="Site & Contact" text="Contact details, social links, homepage text and images."
        action={canUpdate ? <button onClick={save} disabled={busy} className="btn btn-primary">{busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}Save changes</button> : undefined} />
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
          <Lbl id="hero_text" label="Supporting text"><textarea id="hero_text" rows={3} className="field h-auto py-3" readOnly={!canUpdate} value={s.hero_text} onChange={(e) => set("hero_text")(e.target.value)} /></Lbl>
          <div className="grid gap-6 md:grid-cols-2">
            <ImageField
              id="hero_image"
              label="Homepage main image"
              value={s.hero_image}
              onChange={set("hero_image")}
              onUploadFile={async (file) => {
                const img = await siteContactApi.uploadImage(file);
                setS({ ...s, hero_image: img.url, hero_image_publicId: img.publicId });
                return img.url;
              }}
              onRemove={() => setS({ ...s, hero_image: "", hero_image_publicId: "" })}
              locked={!canUpdate}
            />
            <ImageField
              id="about_image"
              label="About section image"
              value={s.about_image}
              onChange={set("about_image")}
              onUploadFile={async (file) => {
                const img = await siteContactApi.uploadImage(file);
                setS({ ...s, about_image: img.url, about_image_publicId: img.publicId });
                return img.url;
              }}
              onRemove={() => setS({ ...s, about_image: "", about_image_publicId: "" })}
              locked={!canUpdate}
            />
          </div>
        </section>
        <Toast msg={msg} />
      </div>
    </>
  );
}

/* ---------------- services ---------------- */

function ServicesPanel({ onSaved }: { onSaved: () => void }) {
  const can = useCan();
  const [rows, setRows] = useState<ServiceRow[] | null>(null);
  const [adding, setAdding] = useState(false);
  const load = useCallback(() => {
    servicesApi.list().then((data) => setRows(data.map(serviceToRow))).catch(() => setRows([]));
  }, []);
  useEffect(load, [load]);

  async function add() {
    setAdding(true);
    try {
      const sort = (rows?.reduce((m, r) => Math.max(m, r.sort), 0) ?? 0) + 1;
      await servicesApi.create({
        title: "New service",
        description: "",
        icon: "Layers",
        order: sort,
      });
      load();
      onSaved();
    } finally {
      setAdding(false);
    }
  }

  if (!rows) return <Loading />;
  return (
    <>
      <PanelHead title="Services" text="Edit service titles, descriptions, icons and images. Lower order numbers appear first."
        action={can("services.create") ? <button onClick={add} disabled={adding} className="btn btn-primary">{adding ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}Add service</button> : undefined} />
      <div className="space-y-5">
        {rows.map((r) => <ServiceEditor key={r.id} row={r} onChange={() => { load(); onSaved(); }} />)}
      </div>
    </>
  );
}

function ServiceEditor({ row, onChange }: { row: ServiceRow; onChange: () => void }) {
  const can = useCan();
  const [r, setR] = useState(row);
  const [caps, setCaps] = useState(row.capabilities.join("\n"));
  const [bens, setBens] = useState(row.benefits.join("\n"));
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const Icon = ICONS[r.icon] ?? Layers;

  async function save() {
    setBusy(true); setMsg(null);
    try {
      await servicesApi.update(r.id, {
        title: r.title,
        description: r.description,
        icon: r.icon,
        order: r.sort,
      });
      setMsg({ ok: true, text: "Service updated successfully." });
      onChange();
    } catch (error) {
      setMsg({ ok: false, text: apiErrorMessage(error, "Could not save service") });
    }
    setBusy(false);
  }
  async function del() {
    if (!confirm(`Delete "${r.title}"?`)) return;
    setBusy(true);
    try {
      await servicesApi.delete(r.id);
      onChange();
    } catch (error) {
      setMsg({ ok: false, text: apiErrorMessage(error, "Could not delete service") });
    }
    setBusy(false);
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
          <ImageField
            id={`img-${r.id}`}
            label="Image"
            value={r.image_url ?? ""}
            onChange={(v) => setR({ ...r, image_url: v })}
            onUploadFile={async (file) => {
              const updated = await servicesApi.uploadImage(r.id, file);
              setR({ ...r, image_url: updated.image?.url ?? "" });
              return updated.image?.url ?? "";
            }}
            onRemove={async () => {
              const updated = await servicesApi.deleteImage(r.id);
              setR({ ...r, image_url: updated.image?.url ?? "" });
            }}
            locked={!can("services.update")}
          />
          <div className="flex flex-wrap items-center gap-3 border-t border-border pt-5">
            {can("services.update") && <button onClick={save} disabled={busy} className="btn btn-primary h-10 px-5 text-sm">{busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}Save</button>}
            {can("services.update") && <button onClick={() => setR({ ...r, published: !r.published })} className="btn btn-outline h-10 px-4 text-sm">
              {r.published ? <><EyeOff className="h-4 w-4" />Hide from site</> : <><Eye className="h-4 w-4" />Show on site</>}
            </button>}
            {can("services.delete") && <button onClick={del} className="btn btn-outline h-10 px-4 text-sm text-destructive"><Trash2 className="h-4 w-4" />Delete</button>}
            <Toast msg={msg} />
          </div>
        </div>
      )}
    </article>
  );
}

/* ---------------- jobs ---------------- */

function JobsPanel({ onSaved }: { onSaved: () => void }) {
  const can = useCan();
  const [rows, setRows] = useState<JobRow[] | null>(null);
  const [adding, setAdding] = useState(false);
  const load = useCallback(() => {
    careersApi.listAdmin().then((data) => setRows(data.map(careerToJobRow))).catch(() => setRows([]));
  }, []);
  useEffect(load, [load]);

  async function add() {
    setAdding(true);
    try {
      const sort = (rows?.reduce((m, r) => Math.max(m, r.sort), 0) ?? 0) + 1;
      await careersApi.create({
        title: "New position",
        location: "TBD",
        employmentType: "Full-time",
        experience: "TBD",
        workplace: "On-site",
        salary: "TBD",
        responsibilities: [],
        requirements: [],
        goodToHave: [],
        order: sort,
        isVisible: false,
      });
      load();
      onSaved();
    } finally {
      setAdding(false);
    }
  }

  if (!rows) return <Loading />;
  return (
    <>
      <PanelHead title="Careers" text="Add, edit, hide or remove job openings shown on the Careers page."
        action={can("careers.create") ? <button onClick={add} disabled={adding} className="btn btn-primary">{adding ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}Add opening</button> : undefined} />
      {rows.length === 0 && <p className="text-muted-foreground">No openings yet.</p>}
      <div className="space-y-5">
        {rows.map((r) => <JobEditor key={r.id} row={r} onChange={() => { load(); onSaved(); }} />)}
      </div>
    </>
  );
}

function JobEditor({ row, onChange }: { row: JobRow; onChange: () => void }) {
  const can = useCan();
  const [r, setR] = useState(row);
  const [resp, setResp] = useState(row.responsibilities.join("\n"));
  const [reqs, setReqs] = useState(row.requirements.join("\n"));
  const [good, setGood] = useState(row.good_to_have);
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);

  useEffect(() => {
    if (!open) return;
    careersApi.getAdmin(r.id).then((career) => {
      const mapped = careerToJobRow(career);
      setR(mapped);
      setResp(mapped.responsibilities.join("\n"));
      setReqs(mapped.requirements.join("\n"));
      setGood(mapped.good_to_have);
    }).catch((error) => setMsg({ ok: false, text: apiErrorMessage(error, "Could not load career") }));
  }, [open, r.id]);

  async function save() {
    setBusy(true); setMsg(null);
    try {
      await careersApi.update(r.id, {
        title: r.title,
        location: r.location,
        employmentType: r.employment,
        experience: r.experience,
        workplace: r.workplace,
        salary: r.salary,
        responsibilities: lines(resp),
        requirements: lines(reqs),
        goodToHave: lines(good),
        order: r.sort,
      });
      setMsg({ ok: true, text: "Career updated successfully." });
      onChange();
    } catch (error) {
      setMsg({ ok: false, text: apiErrorMessage(error, "Could not save career") });
    }
    setBusy(false);
  }
  async function del() {
    if (!confirm(`Delete "${r.title}"?`)) return;
    setBusy(true);
    try {
      await careersApi.delete(r.id);
      onChange();
    } catch (error) {
      setMsg({ ok: false, text: apiErrorMessage(error, "Could not delete career") });
    }
    setBusy(false);
  }
  async function toggleVisibility() {
    setBusy(true); setMsg(null);
    const next = !r.published;
    try {
      const updated = await careersApi.updateVisibility(r.id, next);
      setR({ ...r, published: updated.isVisible });
      setMsg({ ok: true, text: "Career visibility updated successfully." });
      onChange();
    } catch (error) {
      setMsg({ ok: false, text: apiErrorMessage(error, "Could not update visibility") });
    }
    setBusy(false);
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
          <Lbl id={`g-${r.id}`} label="Good to have" hint="One per line."><textarea id={`g-${r.id}`} rows={2} className="field h-auto py-3" value={good} onChange={(e) => setGood(e.target.value)} /></Lbl>
          <div className="flex flex-wrap items-center gap-3 border-t border-border pt-5">
            {can("careers.update") && <button onClick={save} disabled={busy} className="btn btn-primary h-10 px-5 text-sm">{busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}Save</button>}
            {can("careers.status.update") && <button onClick={toggleVisibility} disabled={busy} className="btn btn-outline h-10 px-4 text-sm">
              {r.published ? <><EyeOff className="h-4 w-4" />Hide from site</> : <><Eye className="h-4 w-4" />Show on site</>}
            </button>}
            {can("careers.delete") && <button onClick={del} disabled={busy} className="btn btn-outline h-10 px-4 text-sm text-destructive"><Trash2 className="h-4 w-4" />Delete</button>}
            <Toast msg={msg} />
          </div>
        </div>
      )}
    </article>
  );
}

/* ---------------- inbox panels ---------------- */

type EnqRow = { id: string; name: string; company: string | null; email: string; phone: string; service: string; message: string; created_at: string };

const fmt = (d: string) => new Date(d).toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short" });

function ApplicationsPanel() {
  const can = useCan();
  const [rows, setRows] = useState<JobApplication[] | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const load = useCallback(() => {
    setLoadError(null);
    applicationsApi
      .list()
      .then((data) => setRows(data))
      .catch((error) => {
        setRows([]);
        setLoadError(apiErrorMessage(error, "Could not load applications."));
      });
  }, []);
  useEffect(load, [load]);

  async function del(id: string) {
    if (!confirm("Delete this application?")) return;
    try {
      await applicationsApi.delete(id);
      load();
    } catch (error) {
      alert(apiErrorMessage(error, "Could not delete application."));
    }
  }

  if (!rows) return <Loading />;
  return (
    <>
      <PanelHead title="Applications" text="Job applications submitted through the Careers page." />
      {loadError && <p role="alert" className="mb-4 text-sm text-destructive">{loadError}</p>}
      {rows.length === 0 && !loadError && <Empty text="No applications yet." />}
      <div className="space-y-4">
        {rows.map((a) => (
          <article key={a.id} className="card-site p-6">
            <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
              <div>
                <h2 className="text-lg font-semibold">{a.candidate.name}</h2>
                <p className="text-sm text-primary">{a.career?.title ?? "Role"}</p>
              </div>
              <p className="text-xs text-muted-foreground">{fmt(a.createdAt)}</p>
            </div>
            <dl className="mt-4 grid gap-3 text-sm sm:grid-cols-2 lg:grid-cols-4">
              <Info k="Email" v={<a className="text-primary" href={`mailto:${a.candidate.email}`}>{a.candidate.email}</a>} />
              <Info k="Phone" v={<a className="text-primary" href={`tel:${a.candidate.phone}`}>{a.candidate.phone}</a>} />
              <Info k="Experience" v={`${a.candidate.experience} yrs`} />
              <Info k="Location" v={a.candidate.location} />
            </dl>
            {a.coverLetter && <p className="mt-4 whitespace-pre-line rounded-lg bg-surface p-4 text-sm">{a.coverLetter}</p>}
            <div className="mt-4 flex gap-2">
              {a.resume?.url && (
                <a href={a.resume.url} target="_blank" rel="noopener noreferrer" className="btn btn-outline h-9 px-4 text-sm">
                  <Download className="h-4 w-4" />Resume
                </a>
              )}
              {can("applications.delete") && <button onClick={() => del(a.id)} className="btn btn-outline h-9 px-4 text-sm text-destructive"><Trash2 className="h-4 w-4" />Delete</button>}
            </div>
          </article>
        ))}
      </div>
    </>
  );
}

function EnquiriesPanel() {
  const can = useCan();
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
      <PanelHead title="Enquiries" text="Messages submitted through the Contact page. Enquiry storage still uses its existing database rules; these controls follow your Credex permissions." />
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
            {can("enquiries.delete") && <button onClick={() => del(q.id)} className="btn btn-outline mt-4 h-9 px-4 text-sm text-destructive"><Trash2 className="h-4 w-4" />Delete</button>}
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
