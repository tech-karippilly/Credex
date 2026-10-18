import { useCallback, useEffect, useMemo, useState, type ReactNode } from "react";
import {
  Eye,
  EyeOff,
  Loader2,
  Plus,
  Save,
  Search,
  Trash2,
  Upload,
  UserCircle,
} from "lucide-react";
import { useCan } from "@/components/admin/admin-access";
import { apiErrorMessage } from "@/lib/api";
import {
  teamMemberAdminToRow,
  type TeamMemberAdminRow,
} from "@/lib/cms-mappers";
import { teamMembersApi, type TeamMemberStatus } from "@/lib/team-members-api";
import { TeamMemberPublicCard } from "@/components/site/team-member-card";
import type { TeamMemberRow } from "@/lib/content.functions";

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

function Loading() {
  return (
    <div className="flex justify-center py-16">
      <Loader2 className="h-6 w-6 animate-spin text-primary" />
    </div>
  );
}

function statusLabel(status: TeamMemberStatus) {
  if (status === "published") return "Published";
  if (status === "inactive") return "Inactive";
  return "Draft";
}

function statusClass(status: TeamMemberStatus) {
  if (status === "published") return "bg-secondary text-primary";
  if (status === "inactive") return "bg-muted text-muted-foreground";
  return "bg-amber-100 text-amber-900 dark:bg-amber-950 dark:text-amber-100";
}

function PhotoField({
  id,
  value,
  locked,
  onUploadFile,
  onRemove,
}: {
  id: string;
  value: string;
  locked: boolean;
  onUploadFile: (file: File) => Promise<string>;
  onRemove?: () => void | Promise<void>;
}) {
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");

  return (
    <Lbl id={id} label="Profile photo" hint="Required before publishing. JPG or PNG, up to 5 MB.">
      <div className="flex items-center gap-4">
        <div className="h-20 w-20 shrink-0 overflow-hidden rounded-full border border-border bg-muted">
          {value ? (
            <img src={value} alt="" className="h-full w-full object-cover" />
          ) : (
            <span className="flex h-full items-center justify-center text-xs text-muted-foreground">No photo</span>
          )}
        </div>
        <div className="flex flex-wrap gap-2">
          {!locked && (
            <label htmlFor={id} className="btn btn-outline h-10 cursor-pointer px-4 text-sm">
              {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />} Upload
              <input
                id={id}
                type="file"
                accept="image/*"
                className="sr-only"
                disabled={busy}
                onChange={async (e) => {
                  const f = e.target.files?.[0];
                  if (!f) return;
                  setBusy(true);
                  setErr("");
                  try {
                    await onUploadFile(f);
                  } catch (x) {
                    setErr(apiErrorMessage(x, "Upload failed"));
                  }
                  setBusy(false);
                  e.target.value = "";
                }}
              />
            </label>
          )}
          {!locked && value && onRemove && (
            <button type="button" onClick={() => void onRemove()} className="btn btn-outline h-10 px-4 text-sm">
              Remove
            </button>
          )}
        </div>
      </div>
      {err && <p className="mt-2 text-sm text-destructive">{err}</p>}
    </Lbl>
  );
}

function PreviewModal({ member, onClose }: { member: TeamMemberRow; onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" role="dialog" aria-modal="true">
      <div className="w-full max-w-sm rounded-2xl bg-card p-4 shadow-lg">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold">Profile preview</h2>
          <button type="button" className="btn btn-outline h-9 px-3 text-sm" onClick={onClose}>Close</button>
        </div>
        <TeamMemberPublicCard member={member} />
      </div>
    </div>
  );
}

function TeamMemberEditor({
  row,
  onChange,
}: {
  row: TeamMemberAdminRow;
  onChange: () => void;
}) {
  const can = useCan();
  const [r, setR] = useState(row);
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [preview, setPreview] = useState(false);

  useEffect(() => {
    if (!open) return;
    teamMembersApi.getAdmin(r.id).then((member) => {
      setR(teamMemberAdminToRow(member));
    }).catch((error) => setMsg({ ok: false, text: apiErrorMessage(error, "Could not load team member") }));
  }, [open, r.id]);

  async function save() {
    setBusy(true);
    setMsg(null);
    try {
      await teamMembersApi.update(r.id, {
        fullName: r.fullName.trim(),
        designation: r.designation.trim(),
        department: r.department.trim(),
        positionInCompany: r.positionInCompany.trim(),
        bio: r.bio.trim(),
        order: r.sort,
      });
      setMsg({ ok: true, text: "Team member updated." });
      onChange();
    } catch (error) {
      setMsg({ ok: false, text: apiErrorMessage(error, "Could not save team member") });
    }
    setBusy(false);
  }

  async function setStatus(status: TeamMemberStatus) {
    setBusy(true);
    setMsg(null);
    try {
      const result = await teamMembersApi.updateStatus(r.id, status);
      setR({ ...r, status: result.status });
      setMsg({ ok: true, text: `Status set to ${statusLabel(result.status)}.` });
      onChange();
    } catch (error) {
      setMsg({ ok: false, text: apiErrorMessage(error, "Could not update status") });
    }
    setBusy(false);
  }

  async function del() {
    if (!confirm(`Delete "${r.fullName}"? This cannot be undone.`)) return;
    setBusy(true);
    try {
      await teamMembersApi.delete(r.id);
      onChange();
    } catch (error) {
      setMsg({ ok: false, text: apiErrorMessage(error, "Could not delete team member") });
    }
    setBusy(false);
  }

  const previewRow: TeamMemberRow = {
    id: r.id,
    fullName: r.fullName,
    designation: r.designation,
    department: r.department,
    positionInCompany: r.positionInCompany,
    bio: r.bio,
    photoUrl: r.photoUrl || "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg'/%3E",
    sort: r.sort,
  };

  return (
    <article className="card-site overflow-hidden">
      <button type="button" onClick={() => setOpen(!open)} className="flex w-full items-center gap-4 p-5 text-left">
        <span className="h-12 w-12 shrink-0 overflow-hidden rounded-full bg-muted">
          {r.photoUrl ? (
            <img src={r.photoUrl} alt="" className="h-full w-full object-cover" />
          ) : (
            <span className="flex h-full items-center justify-center text-muted-foreground">
              <UserCircle className="h-6 w-6" />
            </span>
          )}
        </span>
        <span className="flex-1 min-w-0">
          <span className="block truncate font-semibold">{r.fullName}</span>
          <span className="block truncate text-sm text-muted-foreground">{r.designation}</span>
        </span>
        <span className={`rounded-full px-2.5 py-1 text-xs ${statusClass(r.status)}`}>{statusLabel(r.status)}</span>
        <span className="text-sm text-primary">{open ? "Close" : "Edit"}</span>
      </button>
      {open && (
        <div className="space-y-5 border-t border-border p-5 md:p-6">
          <div className="grid gap-5 md:grid-cols-[1fr_120px]">
            <Lbl id={`name-${r.id}`} label="Full name">
              <input id={`name-${r.id}`} className="field" value={r.fullName} onChange={(e) => setR({ ...r, fullName: e.target.value })} required />
            </Lbl>
            <Lbl id={`order-${r.id}`} label="Display order">
              <input id={`order-${r.id}`} type="number" min={1} className="field" value={r.sort} onChange={(e) => setR({ ...r, sort: Number(e.target.value) })} />
            </Lbl>
          </div>
          <div className="grid gap-5 md:grid-cols-3">
            <Lbl id={`des-${r.id}`} label="Designation">
              <input id={`des-${r.id}`} className="field" value={r.designation} onChange={(e) => setR({ ...r, designation: e.target.value })} required />
            </Lbl>
            <Lbl id={`dep-${r.id}`} label="Department">
              <input id={`dep-${r.id}`} className="field" value={r.department} onChange={(e) => setR({ ...r, department: e.target.value })} required />
            </Lbl>
            <Lbl id={`pos-${r.id}`} label="Position in company">
              <input id={`pos-${r.id}`} className="field" value={r.positionInCompany} onChange={(e) => setR({ ...r, positionInCompany: e.target.value })} required />
            </Lbl>
          </div>
          <Lbl id={`bio-${r.id}`} label="Short bio" hint="Optional. Up to 500 characters.">
            <textarea id={`bio-${r.id}`} rows={3} maxLength={500} className="field h-auto py-3" value={r.bio} onChange={(e) => setR({ ...r, bio: e.target.value })} />
          </Lbl>
          <PhotoField
            id={`photo-${r.id}`}
            value={r.photoUrl}
            locked={!can("team_members.update")}
            onUploadFile={async (file) => {
              const updated = await teamMembersApi.uploadPhoto(r.id, file);
              const mapped = teamMemberAdminToRow(updated);
              setR(mapped);
              return mapped.photoUrl;
            }}
            onRemove={async () => {
              const updated = await teamMembersApi.deletePhoto(r.id);
              setR(teamMemberAdminToRow(updated));
            }}
          />
          <div className="flex flex-wrap items-center gap-3 border-t border-border pt-5">
            {can("team_members.update") && (
              <button type="button" onClick={save} disabled={busy} className="btn btn-primary h-10 px-5 text-sm">
                {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}Save
              </button>
            )}
            <button type="button" onClick={() => setPreview(true)} className="btn btn-outline h-10 px-4 text-sm">
              <Eye className="h-4 w-4" />Preview
            </button>
            {can("team_members.status.update") && r.status !== "published" && (
              <button type="button" onClick={() => setStatus("published")} disabled={busy} className="btn btn-outline h-10 px-4 text-sm">
                <Eye className="h-4 w-4" />Publish
              </button>
            )}
            {can("team_members.status.update") && r.status === "published" && (
              <button type="button" onClick={() => setStatus("draft")} disabled={busy} className="btn btn-outline h-10 px-4 text-sm">
                <EyeOff className="h-4 w-4" />Unpublish
              </button>
            )}
            {can("team_members.status.update") && r.status !== "inactive" && (
              <button type="button" onClick={() => setStatus("inactive")} disabled={busy} className="btn btn-outline h-10 px-4 text-sm">
                Mark inactive
              </button>
            )}
            {can("team_members.delete") && (
              <button type="button" onClick={del} disabled={busy} className="btn btn-outline h-10 px-4 text-sm text-destructive">
                <Trash2 className="h-4 w-4" />Delete
              </button>
            )}
            <Toast msg={msg} />
          </div>
        </div>
      )}
      {preview && <PreviewModal member={previewRow} onClose={() => setPreview(false)} />}
    </article>
  );
}

export function TeamPanel({ onSaved }: { onSaved: () => void }) {
  const can = useCan();
  const [rows, setRows] = useState<TeamMemberAdminRow[] | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [composer, setComposer] = useState(false);
  const [adding, setAdding] = useState(false);
  const [addError, setAddError] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<"all" | TeamMemberStatus>("all");
  const [search, setSearch] = useState("");
  const [draft, setDraft] = useState({
    fullName: "",
    designation: "",
    department: "",
    positionInCompany: "",
    bio: "",
  });

  const load = useCallback(() => {
    setLoadError(null);
    teamMembersApi
      .listAdmin()
      .then((data) => setRows(data.map(teamMemberAdminToRow)))
      .catch((error) => {
        setRows([]);
        setLoadError(apiErrorMessage(error, "Could not load team members"));
      });
  }, []);

  useEffect(load, [load]);

  const filtered = useMemo(() => {
    if (!rows) return [];
    const q = search.trim().toLowerCase();
    return rows.filter((row) => {
      if (statusFilter !== "all" && row.status !== statusFilter) return false;
      if (!q) return true;
      return (
        row.fullName.toLowerCase().includes(q) ||
        row.designation.toLowerCase().includes(q)
      );
    });
  }, [rows, search, statusFilter]);

  async function add(e: React.FormEvent) {
    e.preventDefault();
    const fullName = draft.fullName.trim();
    const designation = draft.designation.trim();
    const department = draft.department.trim();
    const positionInCompany = draft.positionInCompany.trim();
    if (!fullName || !designation || !department || !positionInCompany) {
      setAddError("Full name, designation, department and position are required.");
      return;
    }
    setAdding(true);
    setAddError(null);
    try {
      const sort = (rows?.reduce((m, r) => Math.max(m, r.sort), 0) ?? 0) + 1;
      await teamMembersApi.create({
        fullName,
        designation,
        department,
        positionInCompany,
        bio: draft.bio.trim(),
        order: sort,
      });
      setDraft({ fullName: "", designation: "", department: "", positionInCompany: "", bio: "" });
      setComposer(false);
      load();
      onSaved();
    } catch (error) {
      setAddError(apiErrorMessage(error, "Could not add team member"));
    } finally {
      setAdding(false);
    }
  }

  if (!rows) return <Loading />;

  return (
    <>
      <PanelHead
        title="Team"
        text="Manage team profiles shown in the Our Team section on the About page. New profiles start as drafts until you publish them with a photo."
        action={
          can("team_members.create") ? (
            <button
              type="button"
              onClick={() => {
                setComposer((open) => !open);
                setAddError(null);
              }}
              className="btn btn-primary"
            >
              <Plus className="h-4 w-4" />Add member
            </button>
          ) : undefined
        }
      />
      {loadError && <p role="alert" className="mb-4 text-sm text-destructive">{loadError}</p>}
      <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <input
            type="search"
            placeholder="Search by name or designation"
            className="field pl-10"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <select className="field sm:w-48" value={statusFilter} onChange={(e) => setStatusFilter(e.target.value as "all" | TeamMemberStatus)}>
          <option value="all">All statuses</option>
          <option value="draft">Draft</option>
          <option value="published">Published</option>
          <option value="inactive">Inactive</option>
        </select>
      </div>
      {composer && can("team_members.create") && (
        <form onSubmit={add} className="card-site mb-5 space-y-4 p-5">
          <div className="grid gap-4 md:grid-cols-2">
            <Lbl id="new-team-name" label="Full name">
              <input id="new-team-name" className="field" value={draft.fullName} onChange={(e) => setDraft({ ...draft, fullName: e.target.value })} required />
            </Lbl>
            <Lbl id="new-team-des" label="Designation">
              <input id="new-team-des" className="field" value={draft.designation} onChange={(e) => setDraft({ ...draft, designation: e.target.value })} required />
            </Lbl>
            <Lbl id="new-team-dep" label="Department">
              <input id="new-team-dep" className="field" value={draft.department} onChange={(e) => setDraft({ ...draft, department: e.target.value })} required />
            </Lbl>
            <Lbl id="new-team-pos" label="Position in company">
              <input id="new-team-pos" className="field" value={draft.positionInCompany} onChange={(e) => setDraft({ ...draft, positionInCompany: e.target.value })} required />
            </Lbl>
          </div>
          <Lbl id="new-team-bio" label="Short bio">
            <textarea id="new-team-bio" rows={2} maxLength={500} className="field h-auto py-3" value={draft.bio} onChange={(e) => setDraft({ ...draft, bio: e.target.value })} />
          </Lbl>
          {addError && <p role="alert" className="text-sm text-destructive">{addError}</p>}
          <button type="submit" className="btn btn-primary" disabled={adding}>
            {adding ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}Save draft
          </button>
        </form>
      )}
      {filtered.length === 0 && !loadError && (
        <p className="text-muted-foreground">{rows.length === 0 ? "No team members yet." : "No members match your filters."}</p>
      )}
      <div className="space-y-5">
        {filtered.map((r) => (
          <TeamMemberEditor key={r.id} row={r} onChange={() => { load(); onSaved(); }} />
        ))}
      </div>
    </>
  );
}
