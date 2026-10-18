import { useCallback, useEffect, useMemo, useState, type ReactNode } from "react";
import { Download, Loader2, Plus, Trash2, Upload } from "lucide-react";
import { useCan } from "@/components/admin/admin-access";
import { LedgerPagination } from "@/components/admin/ledger-pagination";
import { apiErrorMessage } from "@/lib/api";
import { clampPage, dateRangeError } from "@/lib/expense-form";
import {
  CALL_OUTCOMES,
  INTEREST_TYPES,
  INTERESTED_MODULES,
  LEAD_PRIORITIES,
  LEAD_SOURCES,
  LEAD_STAGES,
  leadsApi,
  toCreatePayload,
  type Lead,
  type LeadActivity,
  type LeadAssignee,
  type LeadDraft,
  type LeadImportPreview,
  type LeadListQuery,
  type LeadSummary,
} from "@/lib/leads-api";
import {
  draftFromLead,
  emptyLeadDraft,
  formatLeadDate,
  isSpreadsheetName,
  stageLabel,
  validateLeadDraft,
} from "@/lib/leads-form";

function L({ id, label, children }: { id: string; label: string; children: ReactNode }) {
  return (
    <div>
      <label htmlFor={id} className="mb-2 block text-sm font-semibold">{label}</label>
      {children}
    </div>
  );
}

function Spin() {
  return <div className="flex justify-center py-20"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>;
}

function FieldError({ id, message }: { id: string; message?: string }) {
  if (!message) return null;
  return <p id={id} className="mt-1 text-sm text-destructive">{message}</p>;
}

function saveBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}

type View = "list" | "form" | "detail" | "import";

export function LeadsPanel() {
  const can = useCan();
  const [view, setView] = useState<View>("list");
  const [rows, setRows] = useState<Lead[]>([]);
  const [summary, setSummary] = useState<LeadSummary | null>(null);
  const [assignees, setAssignees] = useState<LeadAssignee[]>([]);
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(20);
  const [totalPages, setTotalPages] = useState(0);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [listError, setListError] = useState<string | null>(null);
  const [notice, setNotice] = useState<{ ok: boolean; text: string } | null>(null);
  const [searchDraft, setSearchDraft] = useState("");
  const [search, setSearch] = useState("");
  const [stage, setStage] = useState("");
  const [source, setSource] = useState("");
  const [priority, setPriority] = useState("");
  const [assignedUserId, setAssignedUserId] = useState("");
  const [followUp, setFollowUp] = useState("");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [filterError, setFilterError] = useState<string | null>(null);
  const [editing, setEditing] = useState<Lead | null>(null);
  const [draft, setDraft] = useState<LeadDraft>(emptyLeadDraft());
  const [formErrors, setFormErrors] = useState<Partial<Record<keyof LeadDraft, string>>>({});
  const [formBusy, setFormBusy] = useState(false);
  const [cardUrl, setCardUrl] = useState<string | null>(null);
  const [detail, setDetail] = useState<Lead | null>(null);
  const [activities, setActivities] = useState<LeadActivity[]>([]);
  const [activityType, setActivityType] = useState("NOTE");
  const [activityNotes, setActivityNotes] = useState("");
  const [callOutcome, setCallOutcome] = useState("CONNECTED");
  const [nextFollowUp, setNextFollowUp] = useState("");
  const [importFile, setImportFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<LeadImportPreview | null>(null);
  const [importBusy, setImportBusy] = useState(false);

  const query: LeadListQuery = useMemo(
    () => ({
      search: search || undefined,
      stage: stage || undefined,
      source: source || undefined,
      priority: priority || undefined,
      assignedUserId: assignedUserId || undefined,
      followUp: followUp || undefined,
      from: from || undefined,
      to: to || undefined,
      page,
      limit,
    }),
    [search, stage, source, priority, assignedUserId, followUp, from, to, page, limit],
  );

  const loadList = useCallback(async () => {
    setLoading(true);
    setListError(null);
    try {
      const [list, metrics, people] = await Promise.all([
        leadsApi.list(query),
        leadsApi.summary(),
        leadsApi.assignees(),
      ]);
      setRows(list.items);
      setTotal(list.pagination.total);
      setTotalPages(list.pagination.totalPages);
      setPage(clampPage(list.pagination.page, list.pagination.totalPages));
      setSummary(metrics);
      setAssignees(people);
    } catch (error) {
      setRows([]);
      setListError(apiErrorMessage(error, "Could not load leads."));
    } finally {
      setLoading(false);
    }
  }, [query]);

  useEffect(() => {
    if (view === "list") void loadList();
  }, [loadList, view]);

  useEffect(() => () => {
    if (cardUrl) URL.revokeObjectURL(cardUrl);
  }, [cardUrl]);

  function applyFilters() {
    const range = dateRangeError(from, to);
    if (range) {
      setFilterError(range);
      return;
    }
    setFilterError(null);
    setPage(1);
    setSearch(searchDraft.trim());
  }

  function clearFilters() {
    setSearchDraft("");
    setSearch("");
    setStage("");
    setSource("");
    setPriority("");
    setAssignedUserId("");
    setFollowUp("");
    setFrom("");
    setTo("");
    setFilterError(null);
    setPage(1);
  }

  function openCreate() {
    setEditing(null);
    setDraft(emptyLeadDraft());
    setFormErrors({});
    clearCard();
    setView("form");
  }

  function openEdit(lead: Lead) {
    setEditing(lead);
    setDraft(draftFromLead(lead));
    setFormErrors({});
    clearCard();
    setView("form");
  }

  async function openDetail(lead: Lead) {
    try {
      const [full, timeline] = await Promise.all([leadsApi.get(lead.id), leadsApi.activities(lead.id)]);
      setDetail(full);
      setActivities(timeline.items);
      setActivityType("NOTE");
      setActivityNotes("");
      setCallOutcome("CONNECTED");
      setNextFollowUp("");
      setView("detail");
    } catch (error) {
      setNotice({ ok: false, text: apiErrorMessage(error, "Could not load lead.") });
    }
  }

  function clearCard() {
    if (cardUrl) URL.revokeObjectURL(cardUrl);
    setCardUrl(null);
  }

  function onCardFile(file: File | undefined) {
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      setNotice({ ok: false, text: "Choose a JPG or PNG visiting card to preview." });
      return;
    }
    if (cardUrl) URL.revokeObjectURL(cardUrl);
    setCardUrl(URL.createObjectURL(file));
  }

  async function submitForm(event: React.FormEvent) {
    event.preventDefault();
    const errors = validateLeadDraft(draft);
    setFormErrors(errors);
    if (Object.keys(errors).length > 0) return;
    setFormBusy(true);
    try {
    const payload = toCreatePayload(draft);
    if (!can("leads.assign")) delete payload.assignedUserId;
    if (editing) await leadsApi.update(editing.id, payload);
    else await leadsApi.create(payload);
      setNotice({ ok: true, text: editing ? "Lead updated." : "Lead created." });
      clearCard();
      setView("list");
    } catch (error) {
      setNotice({ ok: false, text: apiErrorMessage(error, "Could not save lead.") });
    } finally {
      setFormBusy(false);
    }
  }

  async function changeStage(lead: Lead, nextStage: string) {
    try {
      await leadsApi.updateStage(lead.id, nextStage);
      setNotice({ ok: true, text: "Stage updated." });
      if (view === "detail" && detail?.id === lead.id) {
        const full = await leadsApi.get(lead.id);
        const timeline = await leadsApi.activities(lead.id);
        setDetail(full);
        setActivities(timeline.items);
      } else {
        await loadList();
      }
    } catch (error) {
      setNotice({ ok: false, text: apiErrorMessage(error, "Could not update stage.") });
    }
  }

  async function removeLead(lead: Lead) {
    if (!confirm(`Delete lead ${lead.companyName}?`)) return;
    try {
      await leadsApi.remove(lead.id);
      setNotice({ ok: true, text: "Lead deleted." });
      setView("list");
    } catch (error) {
      setNotice({ ok: false, text: apiErrorMessage(error, "Could not delete lead.") });
    }
  }

  async function submitActivity(event: React.FormEvent) {
    event.preventDefault();
    if (!detail) return;
    try {
      const payload: Record<string, unknown> = {};
      if (activityNotes.trim()) payload.notes = activityNotes.trim();
      if (nextFollowUp) payload.nextFollowUpAt = nextFollowUp;
      if (activityType === "CALL") payload.outcome = callOutcome;
      if (activityType === "FOLLOW_UP") payload.followUpStatus = "COMPLETED";
      await leadsApi.addActivity(detail.id, { type: activityType, payload });
      const [full, timeline] = await Promise.all([leadsApi.get(detail.id), leadsApi.activities(detail.id)]);
      setDetail(full);
      setActivities(timeline.items);
      setActivityNotes("");
      setNotice({ ok: true, text: "Activity recorded." });
    } catch (error) {
      setNotice({ ok: false, text: apiErrorMessage(error, "Could not record activity.") });
    }
  }

  async function runPreview(file: File) {
    const check = isSpreadsheetName(file.name);
    if (!check.ok) {
      setNotice({ ok: false, text: check.message });
      setPreview(null);
      return;
    }
    setImportBusy(true);
    setNotice(null);
    try {
      setImportFile(file);
      setPreview(await leadsApi.previewImport(file));
    } catch (error) {
      setPreview(null);
      setNotice({ ok: false, text: apiErrorMessage(error, "Could not preview import.") });
    } finally {
      setImportBusy(false);
    }
  }

  async function confirmImport() {
    if (!importFile) return;
    setImportBusy(true);
    try {
      const result = await leadsApi.commitImport(importFile);
      setPreview(result);
      setNotice({ ok: true, text: `Imported ${result.inserted ?? 0} lead(s).` });
    } catch (error) {
      setNotice({ ok: false, text: apiErrorMessage(error, "Import failed.") });
    } finally {
      setImportBusy(false);
    }
  }

  async function exportLeads() {
    try {
      const file = await leadsApi.export({ ...query, format: "xlsx" });
      saveBlob(file.blob, file.filename);
    } catch (error) {
      setNotice({ ok: false, text: apiErrorMessage(error, "Could not export leads.") });
    }
  }

  const metrics = [
    { label: "Total leads", value: summary?.total },
    { label: "New", value: summary?.new },
    { label: "Qualified", value: summary?.qualified },
    { label: "Demos scheduled", value: summary?.demoScheduled },
    { label: "Won", value: summary?.won },
    { label: "Lost", value: summary?.lost },
    { label: "Follow-ups today", value: summary?.followUpsDueToday },
    { label: "Overdue follow-ups", value: summary?.overdueFollowUps },
  ];

  if (view === "form") {
    return (
      <form onSubmit={submitForm} className="space-y-6">
        <div className="mb-2 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h1 className="text-3xl font-semibold">{editing ? "Edit lead" : "New lead"}</h1>
            <p className="mt-2 text-muted-foreground">Enter contact details manually. A visiting-card image is optional and stays on this device.</p>
          </div>
          <button type="button" className="btn btn-outline" onClick={() => { clearCard(); setView("list"); }}>Back to list</button>
        </div>
        {notice && <p role="status" className={`text-sm ${notice.ok ? "text-success" : "text-destructive"}`}>{notice.text}</p>}
        <section className="card-site p-6">
          <h2 className="text-lg font-semibold">Visiting card (optional)</h2>
          <p className="mt-1 text-sm text-muted-foreground">The image is not uploaded or saved with the lead. Use it only as a reference while typing.</p>
          <div className="mt-4 flex flex-wrap items-start gap-4">
            {cardUrl ? <img src={cardUrl} alt="Visiting card preview" className="h-36 w-56 rounded-lg border border-border object-cover" /> : null}
            <div className="flex flex-wrap gap-2">
              <label className="btn btn-outline h-10 cursor-pointer px-4 text-sm">
                Choose image
                <input type="file" accept="image/jpeg,image/png" className="sr-only" onChange={(event) => onCardFile(event.target.files?.[0])} />
              </label>
              {cardUrl && <button type="button" className="btn btn-outline h-10 px-4 text-sm" onClick={clearCard}>Remove preview</button>}
            </div>
          </div>
        </section>
        <section className="card-site grid gap-4 p-6 sm:grid-cols-2">
          <h2 className="text-lg font-semibold sm:col-span-2">Contact details</h2>
          <L id="l-company" label="Company name">
            <input id="l-company" className="field" value={draft.companyName} onChange={(e) => setDraft({ ...draft, companyName: e.target.value })} />
            <FieldError id="l-company-error" message={formErrors.companyName} />
          </L>
          <L id="l-contact" label="Contact name">
            <input id="l-contact" className="field" value={draft.contactName} onChange={(e) => setDraft({ ...draft, contactName: e.target.value })} />
            <FieldError id="l-contact-error" message={formErrors.contactName} />
          </L>
          <L id="l-phone" label="Phone">
            <input id="l-phone" className="field" value={draft.phone} onChange={(e) => setDraft({ ...draft, phone: e.target.value })} />
            <FieldError id="l-phone-error" message={formErrors.phone} />
          </L>
          <L id="l-alt" label="Alternate phone">
            <input id="l-alt" className="field" value={draft.alternatePhone} onChange={(e) => setDraft({ ...draft, alternatePhone: e.target.value })} />
            <FieldError id="l-alt-error" message={formErrors.alternatePhone} />
          </L>
          <L id="l-email" label="Email">
            <input id="l-email" className="field" value={draft.email} onChange={(e) => setDraft({ ...draft, email: e.target.value })} />
            <FieldError id="l-email-error" message={formErrors.email} />
          </L>
          <L id="l-web" label="Website"><input id="l-web" className="field" value={draft.website} onChange={(e) => setDraft({ ...draft, website: e.target.value })} /></L>
          <L id="l-loc" label="Location"><input id="l-loc" className="field" value={draft.location} onChange={(e) => setDraft({ ...draft, location: e.target.value })} /></L>
        </section>
        <section className="card-site grid gap-4 p-6 sm:grid-cols-2">
          <h2 className="text-lg font-semibold sm:col-span-2">Classification</h2>
          <L id="l-source" label="Source">
            <select id="l-source" className="field" value={draft.source} onChange={(e) => setDraft({ ...draft, source: e.target.value })}>
              {LEAD_SOURCES.map((item) => <option key={item} value={item}>{stageLabel(item)}</option>)}
            </select>
          </L>
          <L id="l-stage" label="Stage">
            <select id="l-stage" className="field" value={draft.stage} onChange={(e) => setDraft({ ...draft, stage: e.target.value })}>
              {LEAD_STAGES.map((item) => <option key={item} value={item}>{stageLabel(item)}</option>)}
            </select>
          </L>
          <L id="l-priority" label="Priority">
            <select id="l-priority" className="field" value={draft.priority} onChange={(e) => setDraft({ ...draft, priority: e.target.value })}>
              {LEAD_PRIORITIES.map((item) => <option key={item} value={item}>{stageLabel(item)}</option>)}
            </select>
          </L>
          {can("leads.assign") && (
            <L id="l-assignee" label="Assigned user">
              <select id="l-assignee" className="field" value={draft.assignedUserId} onChange={(e) => setDraft({ ...draft, assignedUserId: e.target.value })}>
                <option value="">Unassigned</option>
                {assignees.map((person) => <option key={person.id} value={person.id}>{person.name} ({person.email})</option>)}
              </select>
            </L>
          )}
        </section>
        <section className="card-site grid gap-4 p-6 sm:grid-cols-2">
          <h2 className="text-lg font-semibold sm:col-span-2">Interest and requirements</h2>
          <L id="l-interest" label="Interest type">
            <select id="l-interest" className="field" value={draft.interestType} onChange={(e) => setDraft({ ...draft, interestType: e.target.value })}>
              <option value="">Not specified</option>
              {INTEREST_TYPES.map((item) => <option key={item} value={item}>{stageLabel(item)}</option>)}
            </select>
          </L>
          <div>
            <p className="mb-2 text-sm font-semibold">Interested modules</p>
            <div className="flex flex-wrap gap-2">
              {INTERESTED_MODULES.map((item) => {
                const checked = draft.interestedModules.includes(item);
                return (
                  <label key={item} className="inline-flex items-center gap-2 text-sm">
                    <input
                      type="checkbox"
                      checked={checked}
                      onChange={() => setDraft({
                        ...draft,
                        interestedModules: checked
                          ? draft.interestedModules.filter((module) => module !== item)
                          : [...draft.interestedModules, item],
                      })}
                    />
                    {item}
                  </label>
                );
              })}
            </div>
          </div>
          <L id="l-features" label="Requested features"><textarea id="l-features" className="field h-auto py-3" rows={3} value={draft.requestedFeatures} onChange={(e) => setDraft({ ...draft, requestedFeatures: e.target.value })} /></L>
          <L id="l-changes" label="Change requests"><textarea id="l-changes" className="field h-auto py-3" rows={3} value={draft.changeRequests} onChange={(e) => setDraft({ ...draft, changeRequests: e.target.value })} /></L>
          <L id="l-req" label="Business requirements"><textarea id="l-req" className="field h-auto py-3 sm:col-span-2" rows={3} value={draft.businessRequirements} onChange={(e) => setDraft({ ...draft, businessRequirements: e.target.value })} /></L>
          <L id="l-budget" label="Estimated budget (INR)">
            <input id="l-budget" className="field" value={draft.estimatedBudget} onChange={(e) => setDraft({ ...draft, estimatedBudget: e.target.value })} />
            <FieldError id="l-budget-error" message={formErrors.estimatedBudget} />
          </L>
          <L id="l-time" label="Expected timeline"><input id="l-time" className="field" value={draft.expectedTimeline} onChange={(e) => setDraft({ ...draft, expectedTimeline: e.target.value })} /></L>
          <L id="l-dm" label="Decision maker"><input id="l-dm" className="field" value={draft.decisionMaker} onChange={(e) => setDraft({ ...draft, decisionMaker: e.target.value })} /></L>
        </section>
        <section className="card-site grid gap-4 p-6 sm:grid-cols-2">
          <h2 className="text-lg font-semibold sm:col-span-2">Follow-up</h2>
          <L id="l-follow" label="Next follow-up"><input id="l-follow" type="date" className="field" value={draft.nextFollowUpAt} onChange={(e) => setDraft({ ...draft, nextFollowUpAt: e.target.value })} /></L>
          <L id="l-next" label="Next action"><input id="l-next" className="field" value={draft.nextAction} onChange={(e) => setDraft({ ...draft, nextAction: e.target.value })} /></L>
          <div className="sm:col-span-2">
            <L id="l-notes" label="Notes"><textarea id="l-notes" className="field h-auto py-3" rows={4} value={draft.notes} onChange={(e) => setDraft({ ...draft, notes: e.target.value })} /></L>
          </div>
        </section>
        <button className="btn btn-primary" disabled={formBusy}>
          {formBusy && <Loader2 className="h-4 w-4 animate-spin" />}
          {editing ? "Save lead" : "Create lead"}
        </button>
      </form>
    );
  }

  if (view === "detail" && detail) {
    return (
      <div className="space-y-6">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h1 className="text-3xl font-semibold">{detail.companyName}</h1>
            <p className="mt-2 text-muted-foreground">{detail.contactName}</p>
          </div>
          <div className="flex flex-wrap gap-2">
            {can("leads.update") && <button type="button" className="btn btn-outline" onClick={() => openEdit(detail)}>Edit</button>}
            {can("leads.delete") && <button type="button" className="btn btn-outline text-destructive" onClick={() => removeLead(detail)}><Trash2 className="h-4 w-4" />Delete</button>}
            <button type="button" className="btn btn-outline" onClick={() => setView("list")}>Back</button>
          </div>
        </div>
        {notice && <p role="status" className={`text-sm ${notice.ok ? "text-success" : "text-destructive"}`}>{notice.text}</p>}
        <dl className="card-site grid gap-4 p-6 sm:grid-cols-2 lg:grid-cols-3">
          <div><dt className="text-xs font-bold uppercase tracking-[0.12em] text-muted-foreground">Phone</dt><dd className="mt-1"><a className="text-primary" href={`tel:${detail.phone}`}>{detail.phone}</a></dd></div>
          <div><dt className="text-xs font-bold uppercase tracking-[0.12em] text-muted-foreground">Email</dt><dd className="mt-1">{detail.email ? <a className="text-primary" href={`mailto:${detail.email}`}>{detail.email}</a> : "—"}</dd></div>
          <div><dt className="text-xs font-bold uppercase tracking-[0.12em] text-muted-foreground">Source</dt><dd className="mt-1">{stageLabel(detail.source)}</dd></div>
          <div>
            <dt className="text-xs font-bold uppercase tracking-[0.12em] text-muted-foreground">Stage</dt>
            <dd className="mt-1">
              {can("leads.update") ? (
                <select className="field h-9" value={detail.stage} onChange={(event) => changeStage(detail, event.target.value)} aria-label="Pipeline stage">
                  {LEAD_STAGES.map((item) => <option key={item} value={item}>{stageLabel(item)}</option>)}
                </select>
              ) : stageLabel(detail.stage)}
            </dd>
          </div>
          <div><dt className="text-xs font-bold uppercase tracking-[0.12em] text-muted-foreground">Priority</dt><dd className="mt-1">{stageLabel(detail.priority)}</dd></div>
          <div><dt className="text-xs font-bold uppercase tracking-[0.12em] text-muted-foreground">Assigned</dt><dd className="mt-1">{detail.assignedUserName ?? "Unassigned"}</dd></div>
          <div><dt className="text-xs font-bold uppercase tracking-[0.12em] text-muted-foreground">Next follow-up</dt><dd className="mt-1">{formatLeadDate(detail.nextFollowUpAt)}</dd></div>
          <div className="sm:col-span-2"><dt className="text-xs font-bold uppercase tracking-[0.12em] text-muted-foreground">Notes</dt><dd className="mt-1 whitespace-pre-line">{detail.notes || "—"}</dd></div>
        </dl>
        {can("leads.update") && (
          <form onSubmit={submitActivity} className="card-site grid gap-4 p-6 sm:grid-cols-2">
            <h2 className="text-lg font-semibold sm:col-span-2">Record activity</h2>
            <L id="a-type" label="Type">
              <select id="a-type" className="field" value={activityType} onChange={(e) => setActivityType(e.target.value)}>
                <option value="NOTE">Note</option>
                <option value="CALL">Call</option>
                <option value="FOLLOW_UP">Follow-up</option>
                <option value="DEMO_SCHEDULED">Demo scheduled</option>
                <option value="DEMO_COMPLETED">Demo completed</option>
              </select>
            </L>
            {activityType === "CALL" && (
              <L id="a-outcome" label="Call outcome">
                <select id="a-outcome" className="field" value={callOutcome} onChange={(e) => setCallOutcome(e.target.value)}>
                  {CALL_OUTCOMES.map((item) => <option key={item} value={item}>{stageLabel(item)}</option>)}
                </select>
              </L>
            )}
            <L id="a-follow" label="Next follow-up"><input id="a-follow" type="date" className="field" value={nextFollowUp} onChange={(e) => setNextFollowUp(e.target.value)} /></L>
            <div className="sm:col-span-2">
              <L id="a-notes" label="Notes"><textarea id="a-notes" className="field h-auto py-3" rows={3} value={activityNotes} onChange={(e) => setActivityNotes(e.target.value)} /></L>
            </div>
            <button className="btn btn-primary">Save activity</button>
          </form>
        )}
        <section className="card-site p-6">
          <h2 className="text-lg font-semibold">Activity</h2>
          {activities.length === 0 ? <p className="mt-3 text-sm text-muted-foreground">No activity yet.</p> : (
            <ol className="mt-4 space-y-4">
              {activities.map((item) => (
                <li key={item.id} className="border-b border-border pb-3 last:border-0">
                  <p className="text-sm font-semibold">{item.summary}</p>
                  <p className="mt-1 text-xs text-muted-foreground">{item.actorName} · {item.actorEmail} · {new Date(item.createdAt).toLocaleString("en-IN")}</p>
                </li>
              ))}
            </ol>
          )}
        </section>
      </div>
    );
  }

  if (view === "import") {
    return (
      <div className="space-y-6">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h1 className="text-3xl font-semibold">Import leads</h1>
            <p className="mt-2 text-muted-foreground">Upload an .xlsx or .csv file, review the preview, then confirm. .xls files are not supported.</p>
          </div>
          <button type="button" className="btn btn-outline" onClick={() => { setPreview(null); setImportFile(null); setView("list"); }}>Back</button>
        </div>
        {notice && <p role="status" className={`text-sm ${notice.ok ? "text-success" : "text-destructive"}`}>{notice.text}</p>}
        <div className="flex flex-wrap gap-2">
          <button type="button" className="btn btn-outline" onClick={async () => {
            try {
              const file = await leadsApi.downloadTemplate();
              saveBlob(file.blob, file.filename);
            } catch (error) {
              setNotice({ ok: false, text: apiErrorMessage(error, "Could not download template.") });
            }
          }}><Download className="h-4 w-4" />Template</button>
          <label className="btn btn-primary cursor-pointer">
            <Upload className="h-4 w-4" />Choose file
            <input type="file" accept=".xlsx,.csv,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,text/csv" className="sr-only" onChange={(event) => {
              const file = event.target.files?.[0];
              event.target.value = "";
              if (file) void runPreview(file);
            }} />
          </label>
        </div>
        {importBusy && <Spin />}
        {preview && (
          <div className="card-site space-y-4 p-6">
            <p className="text-sm">{preview.filename}: {preview.validRows} valid, {preview.invalidRows} invalid, {preview.duplicateRows} duplicate, {preview.totalRows} total.</p>
            {typeof preview.inserted === "number" && <p className="text-sm">Inserted {preview.inserted}, skipped {preview.skipped}.</p>}
            {preview.issues.slice(0, 20).map((issue) => (
              <p key={`${issue.rowNumber}-${issue.message}`} className="text-sm text-destructive">Row {issue.rowNumber}: {issue.message}</p>
            ))}
            {preview.validRows > 0 && preview.inserted === undefined && (
              <button type="button" className="btn btn-primary" disabled={importBusy} onClick={() => void confirmImport()}>Confirm import</button>
            )}
          </div>
        )}
      </div>
    );
  }

  return (
    <div>
      <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-3xl font-semibold">Leads</h1>
          <p className="mt-2 text-muted-foreground">
            {listError ? "Leads could not be loaded." : `${total} lead${total === 1 ? " matches" : "s match"} the current filters.`}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          {can("leads.export") && <button type="button" className="btn btn-outline" onClick={() => void exportLeads()}><Download className="h-4 w-4" />Export</button>}
          {can("leads.import") && <button type="button" className="btn btn-outline" onClick={() => setView("import")}><Upload className="h-4 w-4" />Import</button>}
          {can("leads.create") && <button type="button" className="btn btn-primary" onClick={openCreate}><Plus className="h-4 w-4" />Add lead</button>}
        </div>
      </div>
      {notice && <p role="status" className={`mb-4 text-sm ${notice.ok ? "text-success" : "text-destructive"}`}>{notice.text}</p>}
      <div className="mb-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {metrics.map((metric) => (
          <div key={metric.label} className="card-site p-5">
            <p className="font-display text-3xl font-semibold">{metric.value ?? "—"}</p>
            <p className="mt-1 text-sm text-muted-foreground">{metric.label}</p>
          </div>
        ))}
      </div>
      <div className="flex flex-wrap items-end gap-3">
        <L id="lead-search" label="Search">
          <input id="lead-search" className="field h-9" value={searchDraft} onChange={(e) => setSearchDraft(e.target.value)} />
        </L>
        <L id="lead-stage" label="Stage">
          <select id="lead-stage" className="field h-9" value={stage} onChange={(e) => { setStage(e.target.value); setPage(1); }}>
            <option value="">All</option>
            {LEAD_STAGES.map((item) => <option key={item} value={item}>{stageLabel(item)}</option>)}
          </select>
        </L>
        <L id="lead-source" label="Source">
          <select id="lead-source" className="field h-9" value={source} onChange={(e) => { setSource(e.target.value); setPage(1); }}>
            <option value="">All</option>
            {LEAD_SOURCES.map((item) => <option key={item} value={item}>{stageLabel(item)}</option>)}
          </select>
        </L>
        <L id="lead-priority" label="Priority">
          <select id="lead-priority" className="field h-9" value={priority} onChange={(e) => { setPriority(e.target.value); setPage(1); }}>
            <option value="">All</option>
            {LEAD_PRIORITIES.map((item) => <option key={item} value={item}>{stageLabel(item)}</option>)}
          </select>
        </L>
        <L id="lead-assignee" label="Assignee">
          <select id="lead-assignee" className="field h-9" value={assignedUserId} onChange={(e) => { setAssignedUserId(e.target.value); setPage(1); }}>
            <option value="">All</option>
            {assignees.map((person) => <option key={person.id} value={person.id}>{person.name}</option>)}
          </select>
        </L>
        <L id="lead-follow" label="Follow-up">
          <select id="lead-follow" className="field h-9" value={followUp} onChange={(e) => { setFollowUp(e.target.value); setPage(1); }}>
            <option value="">All</option>
            <option value="today">Due today</option>
            <option value="overdue">Overdue</option>
            <option value="upcoming">Upcoming</option>
          </select>
        </L>
        <L id="lead-from" label="From"><input id="lead-from" type="date" className="field h-9" value={from} onChange={(e) => setFrom(e.target.value)} /></L>
        <L id="lead-to" label="To"><input id="lead-to" type="date" className="field h-9" value={to} onChange={(e) => setTo(e.target.value)} /></L>
        <button type="button" className="btn btn-primary h-9" onClick={applyFilters}>Apply</button>
        <button type="button" className="btn btn-outline h-9" onClick={clearFilters}>Clear</button>
      </div>
      {filterError && <p className="mt-2 text-sm text-destructive">{filterError}</p>}
      {loading ? <Spin /> : listError ? (
        <p role="alert" className="mt-6 text-sm text-destructive">{listError}</p>
      ) : rows.length === 0 ? (
        <div className="card-site mt-6 p-10 text-center text-muted-foreground">No leads match the current filters.</div>
      ) : (
        <div className="mt-6 overflow-x-auto">
          <table className="w-full min-w-[720px] text-left text-sm">
            <thead>
              <tr className="border-b border-border text-xs uppercase tracking-[0.12em] text-muted-foreground">
                <th className="py-3 pr-3 font-semibold">Company</th>
                <th className="py-3 pr-3 font-semibold">Contact</th>
                <th className="py-3 pr-3 font-semibold">Stage</th>
                <th className="py-3 pr-3 font-semibold">Priority</th>
                <th className="py-3 pr-3 font-semibold">Assigned</th>
                <th className="py-3 pr-3 font-semibold">Follow-up</th>
                <th className="py-3 font-semibold">Actions</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((lead) => (
                <tr key={lead.id} className="border-b border-border">
                  <td className="py-3 pr-3">
                    <button type="button" className="font-semibold text-primary" onClick={() => void openDetail(lead)}>{lead.companyName}</button>
                    <p className="text-xs text-muted-foreground">{stageLabel(lead.source)}</p>
                  </td>
                  <td className="py-3 pr-3">
                    <p>{lead.contactName}</p>
                    <p className="text-xs text-muted-foreground">{lead.phone}{lead.email ? ` · ${lead.email}` : ""}</p>
                  </td>
                  <td className="py-3 pr-3">
                    {can("leads.update") ? (
                      <select className="field h-9 w-auto" aria-label={`Stage for ${lead.companyName}`} value={lead.stage} onChange={(event) => void changeStage(lead, event.target.value)}>
                        {LEAD_STAGES.map((item) => <option key={item} value={item}>{stageLabel(item)}</option>)}
                      </select>
                    ) : stageLabel(lead.stage)}
                  </td>
                  <td className="py-3 pr-3">{stageLabel(lead.priority)}</td>
                  <td className="py-3 pr-3">{lead.assignedUserName ?? "Unassigned"}</td>
                  <td className="py-3 pr-3">{formatLeadDate(lead.nextFollowUpAt)}</td>
                  <td className="py-3">
                    <div className="flex flex-wrap gap-2">
                      {can("leads.update") && <button type="button" className="btn btn-outline h-9 px-3" onClick={() => openEdit(lead)}>Edit</button>}
                      {can("leads.delete") && <button type="button" className="btn btn-outline h-9 px-3 text-destructive" onClick={() => void removeLead(lead)}>Delete</button>}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          <LedgerPagination
            pageSizeId="leads-page-size"
            page={page}
            totalPages={totalPages}
            limit={limit}
            loading={loading}
            onPageChange={setPage}
            onLimitChange={(next) => { setLimit(next); setPage(1); }}
          />
        </div>
      )}
    </div>
  );
}
