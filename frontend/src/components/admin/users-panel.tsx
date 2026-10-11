import { useCallback, useEffect, useState } from "react";
import { Loader2, Plus } from "lucide-react";
import { LedgerPagination } from "@/components/admin/ledger-pagination";
import { PasswordInput } from "@/components/ui/password-input";
import { useCan } from "@/components/admin/admin-access";
import { apiErrorMessage } from "@/lib/api";
import { rolesApi, type ManagedRoleDetail } from "@/lib/roles-api";
import { usersApi, type ManagedUser } from "@/lib/users-api";

type Editor = {
  id: string | null;
  name: string;
  email: string;
  password: string;
  roleIds: string[];
};

const emptyEditor = (): Editor => ({
  id: null,
  name: "",
  email: "",
  password: "",
  roleIds: [],
});

export function UsersPanel() {
  const can = useCan();
  const [rows, setRows] = useState<ManagedUser[] | null>(null);
  const [roles, setRoles] = useState<ManagedRoleDetail[]>([]);
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(20);
  const [totalPages, setTotalPages] = useState(0);
  const [search, setSearch] = useState("");
  const [appliedSearch, setAppliedSearch] = useState("");
  const [status, setStatus] = useState("all");
  const [editor, setEditor] = useState<Editor | null>(null);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);

  const load = useCallback(() => {
    usersApi
      .list({ search: appliedSearch, status, page, limit })
      .then((data) => {
        setRows(data.items);
        setTotalPages(data.totalPages);
      })
      .catch((error) => {
        setRows([]);
        setMsg({ ok: false, text: apiErrorMessage(error, "Could not load users") });
      });
  }, [appliedSearch, status, page, limit]);

  useEffect(load, [load]);

  const canReadRoles = can("roles.read");
  useEffect(() => {
    if (!canReadRoles) return;
    rolesApi.list().then(setRoles).catch(() => setRoles([]));
  }, [canReadRoles]);

  function openCreate() {
    setEditor(emptyEditor());
    setMsg(null);
  }

  function openEdit(user: ManagedUser) {
    setEditor({
      id: user.id,
      name: user.name,
      email: user.email,
      password: "",
      roleIds: user.roles.map((role) => role.id),
    });
    setMsg(null);
  }

  async function save(event: React.FormEvent) {
    event.preventDefault();
    if (!editor) return;
    const name = editor.name.trim();
    const email = editor.email.trim();
    if (!name || !email) {
      setMsg({ ok: false, text: "Name and email are required." });
      return;
    }

    setBusy(true);
    setMsg(null);
    try {
      if (!editor.id) {
        if (editor.password.length < 8) {
          setMsg({ ok: false, text: "Password must be at least 8 characters." });
          setBusy(false);
          return;
        }
        const created = await usersApi.create({ name, email, password: editor.password });
        for (const roleId of editor.roleIds) {
          await usersApi.assignRole(created.id, roleId);
        }
        setMsg({ ok: true, text: "User created." });
      } else {
        await usersApi.update(editor.id, {
          name,
          email,
          ...(editor.password ? { password: editor.password } : {}),
        });
        const current = rows?.find((user) => user.id === editor.id);
        const currentIds = new Set(current?.roles.map((role) => role.id) ?? []);
        const nextIds = new Set(editor.roleIds);
        for (const roleId of editor.roleIds) {
          if (!currentIds.has(roleId)) await usersApi.assignRole(editor.id, roleId);
        }
        for (const roleId of currentIds) {
          if (!nextIds.has(roleId)) await usersApi.removeRole(editor.id, roleId);
        }
        setMsg({ ok: true, text: "User updated." });
      }
      setEditor(null);
      load();
    } catch (error) {
      setMsg({ ok: false, text: apiErrorMessage(error, "Could not save the user") });
    } finally {
      setBusy(false);
    }
  }

  async function setActive(user: ManagedUser) {
    const next = !user.isActive;
    const verb = next ? "Activate" : "Deactivate";
    if (!confirm(`${verb} ${user.email}?`)) return;
    try {
      await usersApi.setStatus(user.id, next);
      setMsg({ ok: true, text: `${verb}d ${user.email}.` });
      load();
    } catch (error) {
      setMsg({ ok: false, text: apiErrorMessage(error, `Could not ${verb.toLowerCase()} the user`) });
    }
  }

  async function remove(user: ManagedUser) {
    if (!confirm(`Delete ${user.email}? Financial records keep their stored actor details.`)) return;
    try {
      await usersApi.remove(user.id);
      setMsg({ ok: true, text: "User deleted." });
      load();
    } catch (error) {
      setMsg({ ok: false, text: apiErrorMessage(error, "Could not delete the user") });
    }
  }

  return (
    <>
      <div className="mb-8 flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div>
          <h1 className="text-3xl font-semibold">Users</h1>
          <p className="mt-2 text-muted-foreground">Create accounts, assign roles, and activate or deactivate access.</p>
        </div>
        {can("users.create") && (
          <button type="button" className="btn btn-primary" onClick={openCreate}>
            <Plus className="h-4 w-4" />
            Add user
          </button>
        )}
      </div>

      <form
        className="mb-4 flex flex-col gap-3 sm:flex-row"
        onSubmit={(event) => {
          event.preventDefault();
          setPage(1);
          setAppliedSearch(search.trim());
        }}
      >
        <input
          className="field"
          placeholder="Search name or email"
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          aria-label="Search users"
        />
        <select
          className="field sm:w-40"
          value={status}
          aria-label="Account status"
          onChange={(event) => {
            setStatus(event.target.value);
            setPage(1);
          }}
        >
          <option value="all">All statuses</option>
          <option value="active">Active</option>
          <option value="inactive">Inactive</option>
        </select>
        <button type="submit" className="btn btn-outline">Search</button>
      </form>

      {msg && (
        <p role="status" className={`mb-4 text-sm ${msg.ok ? "text-success" : "text-destructive"}`}>{msg.text}</p>
      )}

      {!rows ? (
        <div className="flex justify-center py-20"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>
      ) : rows.length === 0 ? (
        <div className="card-site p-10 text-center text-muted-foreground">No users match this search.</div>
      ) : (
        <div className="card-site overflow-x-auto">
          <table className="w-full min-w-[760px] text-sm">
            <thead className="border-b border-border text-left text-xs uppercase tracking-wider text-muted-foreground">
              <tr>
                <th className="p-4">Name</th>
                <th className="p-4">Email</th>
                <th className="p-4">Status</th>
                <th className="p-4">Roles</th>
                <th className="p-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((user) => (
                <tr key={user.id} className="border-b border-border last:border-0">
                  <td className="p-4 font-medium">
                    {user.name}
                    {user.isSuperAdmin && <span className="ml-2 rounded-full bg-secondary px-2 py-0.5 text-xs text-primary">Super administrator</span>}
                  </td>
                  <td className="p-4">{user.email}</td>
                  <td className="p-4">{user.isActive ? "Active" : "Inactive"}</td>
                  <td className="p-4">{user.roles.map((role) => role.name).join(", ") || "—"}</td>
                  <td className="p-4">
                    <div className="flex justify-end gap-2">
                      {can("users.update") && !user.isSuperAdmin && (
                        <button type="button" className="btn btn-outline h-9 px-3 text-sm" onClick={() => openEdit(user)}>Edit</button>
                      )}
                      {can("users.status.update") && !user.isSuperAdmin && (
                        <button type="button" className="btn btn-outline h-9 px-3 text-sm" onClick={() => setActive(user)}>
                          {user.isActive ? "Deactivate" : "Activate"}
                        </button>
                      )}
                      {can("users.delete") && !user.isSuperAdmin && (
                        <button type="button" className="btn btn-outline h-9 px-3 text-sm text-destructive" onClick={() => remove(user)}>Delete</button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <LedgerPagination
        pageSizeId="users-page-size"
        page={page}
        totalPages={totalPages}
        limit={limit}
        onPageChange={setPage}
        onLimitChange={(next) => {
          setLimit(next);
          setPage(1);
        }}
      />

      {editor && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <form onSubmit={save} className="card-site max-h-[90vh] w-full max-w-lg space-y-4 overflow-y-auto p-6">
            <h2 className="text-xl font-semibold">{editor.id ? "Edit user" : "Add user"}</h2>
            <label className="block text-sm font-semibold" htmlFor="user-name">Name</label>
            <input id="user-name" className="field" value={editor.name} onChange={(event) => setEditor({ ...editor, name: event.target.value })} />
            <label className="block text-sm font-semibold" htmlFor="user-email">Email</label>
            <input id="user-email" type="email" className="field" value={editor.email} onChange={(event) => setEditor({ ...editor, email: event.target.value })} />
            <label className="block text-sm font-semibold" htmlFor="user-password">
              {editor.id ? "New password" : "Password"}
            </label>
            <PasswordInput id="user-password" autoComplete="new-password" value={editor.password} onChange={(event) => setEditor({ ...editor, password: event.target.value })} />
            {canReadRoles && can("users.update") && roles.length > 0 && (
              <fieldset>
                <legend className="mb-2 text-sm font-semibold">Roles</legend>
                <div className="space-y-2">
                  {roles.filter((role) => !role.systemManaged).map((role) => (
                    <label key={role.id} className="flex items-center gap-2 text-sm">
                      <input
                        type="checkbox"
                        checked={editor.roleIds.includes(role.id)}
                        onChange={(event) => {
                          const roleIds = event.target.checked
                            ? [...editor.roleIds, role.id]
                            : editor.roleIds.filter((id) => id !== role.id);
                          setEditor({ ...editor, roleIds });
                        }}
                      />
                      {role.name}
                    </label>
                  ))}
                </div>
              </fieldset>
            )}
            <div className="flex justify-end gap-2">
              <button type="button" className="btn btn-outline" onClick={() => setEditor(null)}>Cancel</button>
              <button type="submit" className="btn btn-primary" disabled={busy}>
                {busy && <Loader2 className="h-4 w-4 animate-spin" />}
                Save
              </button>
            </div>
          </form>
        </div>
      )}
    </>
  );
}
