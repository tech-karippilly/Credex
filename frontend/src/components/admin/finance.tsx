import { useCallback, useEffect, useState, type ReactNode } from "react";
import { Loader2, Plus, Trash2, Download, Printer, Receipt, Upload } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";
import { company as COMPANY } from "@/lib/site";

type Expense = Database["public"]["Tables"]["expenses"]["Row"];
type Voucher = Database["public"]["Tables"]["vouchers"]["Row"];

export const CATEGORIES = ["Server", "Domain", "Other services"];
const inr = (n: number) => new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR" }).format(Number(n));
const day = (d: string) => new Date(d).toLocaleDateString("en-IN", { dateStyle: "medium" });

function Head({ title, text }: { title: string; text: string }) {
  return (
    <div className="mb-8">
      <h1 className="text-3xl font-semibold">{title}</h1>
      <p className="mt-2 text-muted-foreground">{text}</p>
    </div>
  );
}
function L({ id, label, children }: { id: string; label: string; children: ReactNode }) {
  return <div><label htmlFor={id} className="mb-2 block text-sm font-semibold">{label}</label>{children}</div>;
}
function Spin() {
  return <div className="flex justify-center py-20"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>;
}

/* ---------------- expenses ---------------- */

export function ExpensesPanel({ onVoucher }: { onVoucher: (e: Expense) => void }) {
  const [rows, setRows] = useState<Expense[] | null>(null);
  const [filter, setFilter] = useState("All");
  const [file, setFile] = useState<File | null>(null);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  const load = useCallback(() => {
    supabase.from("expenses").select("*").order("expense_date", { ascending: false }).order("created_at", { ascending: false })
      .then(({ data }) => setRows(data ?? []));
  }, []);
  useEffect(load, [load]);

  async function add(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget;
    const fd = new FormData(form); const g = (k: string) => String(fd.get(k) ?? "");
    const f = { name: g("name"), category: g("category") || "Other services", paid_by: g("paid_by"), amount: g("amount"), expense_date: g("expense_date"), notes: g("notes") };
    const amount = Number(f.amount);
    if (!f.name.trim() || !f.paid_by.trim() || !(amount > 0)) { setMsg("Please fill name, who paid and a valid amount."); return; }
    setBusy(true); setMsg(null);
    let receipt_path: string | null = null;
    if (file) {
      const ext = file.name.split(".").pop() ?? "pdf";
      receipt_path = `${crypto.randomUUID()}.${ext}`;
      const up = await supabase.storage.from("receipts").upload(receipt_path, file, { contentType: file.type || "application/octet-stream" });
      if (up.error) { setBusy(false); setMsg("Receipt upload failed."); return; }
    }
    const { error } = await supabase.from("expenses").insert({
      name: f.name.trim(), category: f.category, paid_by: f.paid_by.trim(), amount,
      ...(f.expense_date ? { expense_date: f.expense_date } : {}), notes: f.notes.trim(), receipt_path,
    });
    setBusy(false);
    if (error) { setMsg("Could not save expense."); return; }
    form.reset(); setFile(null); setMsg("Expense saved."); load();
  }

  async function receipt(path: string) {
    const { data } = await supabase.storage.from("receipts").createSignedUrl(path, 300);
    if (data) window.open(data.signedUrl, "_blank", "noopener"); else alert("Could not open receipt.");
  }
  async function del(x: Expense) {
    if (!confirm(`Delete expense "${x.name}"?`)) return;
    if (x.receipt_path) await supabase.storage.from("receipts").remove([x.receipt_path]);
    await supabase.from("expenses").delete().eq("id", x.id);
    load();
  }

  const shown = (rows ?? []).filter((r) => filter === "All" || r.category === filter);
  const total = shown.reduce((s, r) => s + Number(r.amount), 0);

  return (
    <>
      <Head title="Expenses" text="Record company expenses with receipts." />
      <form onSubmit={add} className="card-site grid gap-5 p-6 md:grid-cols-2">
        <L id="x-name" label="Expense name *"><input id="x-name" name="name" className="field" placeholder="e.g. AWS hosting – October" /></L>
        <L id="x-cat" label="Category *">
          <select id="x-cat" name="category" className="field" defaultValue="Server">{CATEGORIES.map((c) => <option key={c}>{c}</option>)}</select>
        </L>
        <L id="x-paid" label="Who paid *"><input id="x-paid" name="paid_by" className="field" placeholder="Person or Company account" /></L>
        <L id="x-amt" label="Amount (INR) *"><input id="x-amt" name="amount" type="number" step="0.01" min="0" className="field" /></L>
        <L id="x-date" label="Date"><input id="x-date" name="expense_date" type="date" className="field" defaultValue={new Date().toISOString().slice(0, 10)} /></L>
        <L id="x-rec" label="Receipt">
          <label htmlFor="x-rec" className="field flex cursor-pointer items-center gap-2 text-sm">
            <Upload className="h-4 w-4 text-primary" /><span className="truncate text-muted-foreground">{file ? file.name : "Upload image or PDF (max 10 MB)"}</span>
            <input id="x-rec" type="file" accept="image/*,.pdf" className="sr-only" onChange={(e) => setFile(e.target.files?.[0] ?? null)} />
          </label>
        </L>
        <div className="md:col-span-2"><L id="x-notes" label="Notes"><textarea id="x-notes" name="notes" rows={2} className="field h-auto py-3" /></L></div>
        <div className="flex items-center gap-4 md:col-span-2">
          <button disabled={busy} className="btn btn-primary">{busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}Add expense</button>
          {msg && <p role="status" className="text-sm text-muted-foreground">{msg}</p>}
        </div>
      </form>

      <div className="mt-10 flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap gap-2">
          {["All", ...CATEGORIES].map((c) => (
            <button key={c} onClick={() => setFilter(c)} className={`btn h-9 px-4 text-sm ${filter === c ? "btn-primary" : "btn-outline"}`}>{c}</button>
          ))}
        </div>
        <p className="text-sm">Total: <span className="font-semibold">{inr(total)}</span></p>
      </div>

      {!rows ? <Spin /> : shown.length === 0 ? (
        <div className="card-site mt-4 p-10 text-center text-muted-foreground">No expenses yet.</div>
      ) : (
        <div className="card-site mt-4 overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="border-b border-border text-left text-xs uppercase tracking-wider text-muted-foreground">
              <tr><th className="p-4">Date</th><th className="p-4">Expense</th><th className="p-4">Category</th><th className="p-4">Paid by</th><th className="p-4 text-right">Amount</th><th className="p-4" /></tr>
            </thead>
            <tbody>
              {shown.map((r) => (
                <tr key={r.id} className="border-b border-border last:border-0">
                  <td className="whitespace-nowrap p-4">{day(r.expense_date)}</td>
                  <td className="p-4"><div className="font-medium">{r.name}</div>{r.notes && <div className="text-xs text-muted-foreground">{r.notes}</div>}</td>
                  <td className="p-4">{r.category}</td>
                  <td className="p-4">{r.paid_by}</td>
                  <td className="whitespace-nowrap p-4 text-right font-semibold">{inr(Number(r.amount))}</td>
                  <td className="p-4">
                    <div className="flex justify-end gap-1">
                      {r.receipt_path && <button title="Receipt" aria-label="View receipt" onClick={() => receipt(r.receipt_path!)} className="btn btn-outline h-8 px-2"><Download className="h-4 w-4" /></button>}
                      <button title="Create voucher" aria-label="Create voucher" onClick={() => onVoucher(r)} className="btn btn-outline h-8 px-2"><Receipt className="h-4 w-4" /></button>
                      <button title="Delete" aria-label="Delete expense" onClick={() => del(r)} className="btn btn-outline h-8 px-2 text-destructive"><Trash2 className="h-4 w-4" /></button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </>
  );
}

/* ---------------- vouchers ---------------- */

export type VoucherDraft = { expense_id: string | null; payee: string; details: string; amount: string };

export function VouchersPanel({ draft }: { draft: VoucherDraft | null }) {
  const [rows, setRows] = useState<Voucher[] | null>(null);
  const [v, setV] = useState<VoucherDraft>(draft ?? { expense_id: null, payee: "", details: "", amount: "" });
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  const load = useCallback(() => {
    supabase.from("vouchers").select("*").order("voucher_no", { ascending: false }).then(({ data }) => setRows(data ?? []));
  }, []);
  useEffect(load, [load]);
  useEffect(() => { if (draft) setV(draft); }, [draft]);

  async function create(e: React.FormEvent) {
    e.preventDefault();
    const amount = Number(v.amount);
    if (!v.payee.trim() || !(amount > 0)) { setMsg("Please enter payee name and a valid amount."); return; }
    setBusy(true); setMsg(null);
    const { data, error } = await supabase.from("vouchers").insert({
      expense_id: v.expense_id, payee: v.payee.trim(), details: v.details.trim(), amount, voucher_date: date,
    }).select().single();
    setBusy(false);
    if (error || !data) { setMsg("Could not create voucher."); return; }
    setV({ expense_id: null, payee: "", details: "", amount: "" });
    setMsg(`Voucher #${data.voucher_no} created.`);
    load();
    printVoucher(data);
  }
  async function del(x: Voucher) {
    if (!confirm(`Delete voucher #${x.voucher_no}?`)) return;
    await supabase.from("vouchers").delete().eq("id", x.id);
    load();
  }

  return (
    <>
      <Head title="Vouchers" text="Create payment vouchers when someone pays on behalf of the company." />
      <form onSubmit={create} className="card-site grid gap-5 p-6 md:grid-cols-2">
        {v.expense_id && <p className="rounded-lg bg-secondary p-3 text-sm text-primary md:col-span-2">Filled in from an expense. You can edit before creating.</p>}
        <L id="v-payee" label="Paid by (name) *"><input id="v-payee" className="field" value={v.payee} onChange={(e) => setV({ ...v, payee: e.target.value })} /></L>
        <L id="v-amt" label="Amount (INR) *"><input id="v-amt" type="number" step="0.01" min="0" className="field" value={v.amount} onChange={(e) => setV({ ...v, amount: e.target.value })} /></L>
        <L id="v-date" label="Voucher date"><input id="v-date" type="date" className="field" value={date} onChange={(e) => setDate(e.target.value)} /></L>
        <div className="md:col-span-2"><L id="v-det" label="Details"><textarea id="v-det" rows={3} className="field h-auto py-3" value={v.details} onChange={(e) => setV({ ...v, details: e.target.value })} /></L></div>
        <div className="flex items-center gap-4 md:col-span-2">
          <button disabled={busy} className="btn btn-primary">{busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Receipt className="h-4 w-4" />}Create & print voucher</button>
          {msg && <p role="status" className="text-sm text-muted-foreground">{msg}</p>}
        </div>
      </form>

      <h2 className="mt-10 text-xl font-semibold">Issued vouchers</h2>
      {!rows ? <Spin /> : rows.length === 0 ? (
        <div className="card-site mt-4 p-10 text-center text-muted-foreground">No vouchers yet.</div>
      ) : (
        <div className="card-site mt-4 overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="border-b border-border text-left text-xs uppercase tracking-wider text-muted-foreground">
              <tr><th className="p-4">No.</th><th className="p-4">Date</th><th className="p-4">Paid by</th><th className="p-4">Details</th><th className="p-4 text-right">Amount</th><th className="p-4" /></tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.id} className="border-b border-border last:border-0">
                  <td className="p-4 font-semibold">#{r.voucher_no}</td>
                  <td className="whitespace-nowrap p-4">{day(r.voucher_date)}</td>
                  <td className="p-4">{r.payee}</td>
                  <td className="p-4 text-muted-foreground">{r.details}</td>
                  <td className="whitespace-nowrap p-4 text-right font-semibold">{inr(Number(r.amount))}</td>
                  <td className="p-4">
                    <div className="flex justify-end gap-1">
                      <button aria-label="Print voucher" title="Print" onClick={() => printVoucher(r)} className="btn btn-outline h-8 px-2"><Printer className="h-4 w-4" /></button>
                      <button aria-label="Delete voucher" title="Delete" onClick={() => del(r)} className="btn btn-outline h-8 px-2 text-destructive"><Trash2 className="h-4 w-4" /></button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </>
  );
}

/* ---------------- printable voucher ---------------- */

const esc = (s: string) => s.replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]!);

function words(n: number): string {
  const a = ["", "One", "Two", "Three", "Four", "Five", "Six", "Seven", "Eight", "Nine", "Ten", "Eleven", "Twelve", "Thirteen", "Fourteen", "Fifteen", "Sixteen", "Seventeen", "Eighteen", "Nineteen"];
  const b = ["", "", "Twenty", "Thirty", "Forty", "Fifty", "Sixty", "Seventy", "Eighty", "Ninety"];
  const two = (x: number) => (x < 20 ? a[x] : `${b[Math.floor(x / 10)]}${x % 10 ? " " + a[x % 10] : ""}`)!;
  const three = (x: number) => `${x >= 100 ? a[Math.floor(x / 100)] + " Hundred" + (x % 100 ? " " : "") : ""}${x % 100 ? two(x % 100) : ""}`;
  if (n === 0) return "Zero";
  let out = ""; const cr = Math.floor(n / 1e7); n %= 1e7; const lk = Math.floor(n / 1e5); n %= 1e5; const th = Math.floor(n / 1000); n %= 1000;
  if (cr) out += three(cr) + " Crore "; if (lk) out += two(lk) + " Lakh "; if (th) out += two(th) + " Thousand "; if (n) out += three(n);
  return out.trim();
}

export function printVoucher(v: Voucher) {
  const amt = Number(v.amount);
  const rupees = Math.floor(amt); const paise = Math.round((amt - rupees) * 100);
  const inWords = `Rupees ${words(rupees)}${paise ? ` and ${words(paise)} Paise` : ""} Only`;
  const w = window.open("", "_blank", "width=820,height=900");
  if (!w) { alert("Please allow pop-ups to print the voucher."); return; }
  w.document.write(`<!doctype html><html><head><title>Voucher #${v.voucher_no}</title><style>
  body{font-family:Arial,Helvetica,sans-serif;color:#00142B;margin:40px}
  .box{border:2px solid #003C82;padding:32px;max-width:720px;margin:auto}
  h1{margin:0;color:#003C82;font-size:22px} .sub{font-size:12px;color:#555}
  .title{text-align:center;letter-spacing:4px;font-weight:bold;margin:24px 0;padding:8px;background:#F6F9FB;border:1px solid #ddd}
  .row{display:flex;justify-content:space-between;margin:6px 0;font-size:14px}
  table{width:100%;border-collapse:collapse;margin-top:16px;font-size:14px}
  td,th{border:1px solid #ccc;padding:10px;text-align:left} th{background:#F6F9FB}
  .r{text-align:right} .sig{display:flex;justify-content:space-between;margin-top:70px;font-size:13px}
  .sig div{border-top:1px solid #00142B;padding-top:6px;width:30%;text-align:center}
  @media print{body{margin:0}}
  </style></head><body><div class="box">
  <h1>${esc(COMPANY.legalName)}</h1><div class="sub">${esc("CIN: " + COMPANY.cin + " · " + COMPANY.location)}</div>
  <div class="title">PAYMENT VOUCHER</div>
  <div class="row"><span><b>Voucher No:</b> ${v.voucher_no}</span><span><b>Date:</b> ${esc(day(v.voucher_date))}</span></div>
  <div class="row"><span><b>Paid by:</b> ${esc(v.payee)}</span><span><b>Mode:</b> ${esc(v.payment_mode)}</span></div>
  <table><tr><th>Particulars</th><th class="r">Amount (INR)</th></tr>
  <tr><td>${esc(v.details || "-")}</td><td class="r">${esc(inr(amt))}</td></tr>
  <tr><th>Total</th><th class="r">${esc(inr(amt))}</th></tr></table>
  <p style="font-size:14px;margin-top:16px"><b>Amount in words:</b> ${esc(inWords)}</p>
  <div class="sig"><div>Prepared by</div><div>Approved by</div><div>Receiver's signature</div></div>
  </div><script>window.onload=()=>setTimeout(()=>window.print(),200)</script></body></html>`);
  w.document.close();
}
