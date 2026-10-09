import { useCallback, useEffect, useState } from "react";
import { Loader2, Pencil, Plus, Trash2 } from "lucide-react";
import { apiErrorMessage, ApiError } from "@/lib/api";
import {
  expenseCategoriesApi,
  type ExpenseCategoryAdmin,
} from "@/lib/expense-categories-api";

function Head({ title, text }: { title: string; text: string }) {
  return (
    <div className="mb-8 flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
      <div>
        <h1 className="text-3xl font-semibold">{title}</h1>
        <p className="mt-2 text-muted-foreground">{text}</p>
      </div>
    </div>
  );
}

type FormState = {
  name: string;
  description: string;
  order: string;
};

const emptyForm = (): FormState => ({ name: "", description: "", order: "" });

export function ExpenseCategoriesPanel() {
  const [rows, setRows] = useState<ExpenseCategoryAdmin[] | null>(null);
  const [modal, setModal] = useState<"add" | "edit" | null>(null);
  const [editing, setEditing] = useState<ExpenseCategoryAdmin | null>(null);
  const [form, setForm] = useState<FormState>(emptyForm());
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  const load = useCallback(() => {
    expenseCategoriesApi
      .listAdmin()
      .then(setRows)
      .catch(() => setRows([]));
  }, []);

  useEffect(load, [load]);

  function openAdd() {
    setEditing(null);
    setForm(emptyForm());
    setModal("add");
    setMsg(null);
  }

  function openEdit(category: ExpenseCategoryAdmin) {
    setEditing(category);
    setForm({
      name: category.name,
      description: category.description ?? "",
      order: String(category.order),
    });
    setModal("edit");
    setMsg(null);
  }

  function closeModal() {
    setModal(null);
    setEditing(null);
    setForm(emptyForm());
  }

  async function save(e: React.FormEvent) {
    e.preventDefault();
    const name = form.name.trim();
    if (!name) {
      setMsg("Category name is required.");
      return;
    }

    const orderText = form.order.trim();
    let order: number | undefined;
    if (orderText) {
      const parsed = Number(orderText);
      if (!Number.isInteger(parsed) || parsed < 1) {
        setMsg("Order must be a positive whole number.");
        return;
      }
      order = parsed;
    }

    setBusy(true);
    setMsg(null);
    try {
      if (modal === "add") {
        await expenseCategoriesApi.create({
          name,
          description: form.description.trim() || undefined,
          order,
        });
      } else if (editing) {
        await expenseCategoriesApi.update(editing.id, {
          name,
          description: form.description.trim(),
          order,
        });
      }
      closeModal();
      load();
    } catch (error) {
      setMsg(apiErrorMessage(error, "Could not save category."));
    } finally {
      setBusy(false);
    }
  }

  async function toggleStatus(category: ExpenseCategoryAdmin) {
    setMsg(null);
    try {
      await expenseCategoriesApi.updateStatus(category.id, !category.isActive);
      load();
    } catch (error) {
      setMsg(apiErrorMessage(error, "Could not update category status."));
    }
  }

  async function remove(category: ExpenseCategoryAdmin) {
    if (!confirm(`Delete category "${category.name}"?`)) return;
    setMsg(null);
    try {
      await expenseCategoriesApi.delete(category.id);
      load();
    } catch (error) {
      if (error instanceof ApiError && error.status === 409) {
        setMsg(
          "This category cannot be deleted because it is used by existing expenses. You can disable it instead.",
        );
        return;
      }
      setMsg(apiErrorMessage(error, "Could not delete category."));
    }
  }

  return (
    <>
      <Head
        title="Expense Categories"
        text="Manage categories used for company expenses."
      />
      <div className="mb-6 flex justify-end">
        <button type="button" onClick={openAdd} className="btn btn-primary">
          <Plus className="h-4 w-4" />
          Add category
        </button>
      </div>

      {msg && (
        <p role="status" className="mb-4 text-sm text-destructive">{msg}</p>
      )}

      {!rows ? (
        <div className="flex justify-center py-20">
          <Loader2 className="h-6 w-6 animate-spin text-primary" />
        </div>
      ) : rows.length === 0 ? (
        <div className="card-site p-10 text-center text-muted-foreground">
          No expense categories yet. Add one to use in expenses.
        </div>
      ) : (
        <div className="space-y-4">
          {rows.map((category) => (
            <article key={category.id} className="card-site p-5 md:p-6">
              <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
                <div>
                  <h2 className="text-lg font-semibold">{category.name}</h2>
                  {category.description && (
                    <p className="mt-1 text-sm text-muted-foreground">
                      {category.description}
                    </p>
                  )}
                  <p className="mt-3 text-sm text-muted-foreground">
                    Order: {category.order}
                  </p>
                  <p className="mt-1 text-sm font-medium">
                    {category.isActive ? "Active" : "Inactive"}
                  </p>
                </div>
                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() => openEdit(category)}
                    className="btn btn-outline h-9 px-3 text-sm"
                  >
                    <Pencil className="h-4 w-4" />
                    Edit
                  </button>
                  <button
                    type="button"
                    onClick={() => toggleStatus(category)}
                    className="btn btn-outline h-9 px-3 text-sm"
                  >
                    {category.isActive ? "Disable" : "Enable"}
                  </button>
                  {!category.isActive && (
                    <button
                      type="button"
                      onClick={() => remove(category)}
                      className="btn btn-outline h-9 px-3 text-sm text-destructive"
                    >
                      <Trash2 className="h-4 w-4" />
                      Delete
                    </button>
                  )}
                </div>
              </div>
            </article>
          ))}
        </div>
      )}

      {modal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby="category-modal-title"
        >
          <form
            onSubmit={save}
            className="card-site w-full max-w-lg p-6"
            onClick={(e) => e.stopPropagation()}
          >
            <h2 id="category-modal-title" className="text-xl font-semibold">
              {modal === "add" ? "Add category" : "Edit category"}
            </h2>
            <div className="mt-5 space-y-4">
              <div>
                <label htmlFor="cat-name" className="mb-2 block text-sm font-semibold">
                  Category name *
                </label>
                <input
                  id="cat-name"
                  className="field"
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  required
                />
              </div>
              <div>
                <label htmlFor="cat-desc" className="mb-2 block text-sm font-semibold">
                  Description
                </label>
                <textarea
                  id="cat-desc"
                  rows={2}
                  className="field h-auto py-3"
                  value={form.description}
                  onChange={(e) =>
                    setForm({ ...form, description: e.target.value })
                  }
                />
              </div>
              <div>
                <label htmlFor="cat-order" className="mb-2 block text-sm font-semibold">
                  Order
                </label>
                <input
                  id="cat-order"
                  type="number"
                  min={1}
                  step={1}
                  className="field"
                  value={form.order}
                  onChange={(e) => setForm({ ...form, order: e.target.value })}
                  placeholder="Auto if empty"
                />
              </div>
            </div>
            <div className="mt-6 flex flex-wrap gap-3">
              <button type="button" onClick={closeModal} className="btn btn-outline">
                Cancel
              </button>
              <button type="submit" disabled={busy} className="btn btn-primary">
                {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                Save
              </button>
            </div>
            {msg && modal && (
              <p role="status" className="mt-3 text-sm text-destructive">{msg}</p>
            )}
          </form>
        </div>
      )}
    </>
  );
}
