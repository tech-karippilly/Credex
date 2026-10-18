import { useCallback, useEffect, useMemo, useState } from "react";
import { Loader2, Plus } from "lucide-react";
import { useCan } from "@/components/admin/admin-access";
import { apiErrorMessage } from "@/lib/api";
import { permissionActionLabel, permissionModuleLabel } from "@/lib/permissions";
import { rolesApi, type ManagedRoleDetail, type PermissionRecord } from "@/lib/roles-api";

export function RolesPanel() {
  const can = useCan();
  const [roles, setRoles] = useState<ManagedRoleDetail[] | null>(null);
  const [catalogue, setCatalogue] = useState<PermissionRecord[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [selectedKeys, setSelectedKeys] = useState<string[]>([]);
  const [creating, setCreating] = useState(false);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);

  const load = useCallback(() => {
    rolesApi
      .list()
      .then(setRoles)
      .catch((error) => {
        setRoles([]);
        setMsg({ ok: false, text: apiErrorMessage(error, "Could not load roles") });
      });
    rolesApi.catalogue().then(setCatalogue).catch(() => setCatalogue([]));
  }, []);

  useEffect(load, [load]);

  const selected = roles?.find((role) => role.id === selectedId) ?? null;
  const groups = useMemo(() => {
    const grouped = new Map<string, PermissionRecord[]>();
    for (const permission of catalogue) {
      const current = grouped.get(permission.module) ?? [];
      current.push(permission);
      grouped.set(permission.module, current);
    }
    return [...grouped.entries()];
  }, [catalogue]);

  function openRole(role: ManagedRoleDetail) {
    setCreating(false);
    setSelectedId(role.id);
    setName(role.name);
    setDescription(role.description);
    setMsg(null);
    rolesApi
      .get(role.id)
      .then((detail) => setSelectedKeys((detail.permissions ?? []).map((permission) => permission.key)))
      .catch((error) => setMsg({ ok: false, text: apiErrorMessage(error, "Could not load role") }));
  }

  async function saveRole(event: React.FormEvent) {
    event.preventDefault();
    const nextName = name.trim();
    const nextDescription = description.trim();
    if (!nextName || !nextDescription) {
      setMsg({ ok: false, text: "Name and description are required." });
      return;
    }
    setBusy(true);
    setMsg(null);
    try {
      if (creating) {
        const created = await rolesApi.create({ name: nextName, description: nextDescription });
        setSelectedId(created.id);
        setCreating(false);
        setMsg({ ok: true, text: "Role created." });
      } else if (selected) {
        await rolesApi.update(selected.id, { name: nextName, description: nextDescription });
        if (can("roles.permissions.update") && !selected.systemManaged) {
          await rolesApi.replacePermissions(selected.id, selectedKeys);
        }
        setMsg({ ok: true, text: "Role updated." });
      }
      load();
    } catch (error) {
      setMsg({ ok: false, text: apiErrorMessage(error, "Could not save the role") });
    } finally {
      setBusy(false);
    }
  }

  async function removeRole() {
    if (!selected || selected.systemManaged) return;
    if (!confirm(`Delete role "${selected.name}"?`)) return;
    setBusy(true);
    try {
      await rolesApi.remove(selected.id);
      setSelectedId(null);
      setMsg({ ok: true, text: "Role deleted." });
      load();
    } catch (error) {
      setMsg({ ok: false, text: apiErrorMessage(error, "Could not delete the role") });
    } finally {
      setBusy(false);
    }
  }

  const locked = Boolean(selected?.systemManaged) || !can("roles.permissions.update");

  return (
    <>
      <div className="mb-8 flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div>
          <h1 className="text-3xl font-semibold">Roles</h1>
          <p className="mt-2 text-muted-foreground">Create custom roles and choose the permissions each role can delegate.</p>
        </div>
        {can("roles.create") && (
          <button
            type="button"
            className="btn btn-primary"
            onClick={() => {
              setCreating(true);
              setSelectedId(null);
              setName("");
              setDescription("");
              setSelectedKeys([]);
              setMsg(null);
            }}
          >
            <Plus className="h-4 w-4" />
            Add role
          </button>
        )}
      </div>

      {msg && (
        <p role="status" className={`mb-4 text-sm ${msg.ok ? "text-success" : "text-destructive"}`}>{msg.text}</p>
      )}

      {!roles ? (
        <div className="flex justify-center py-20"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>
      ) : (
        <div className="grid gap-6 lg:grid-cols-[280px_1fr]">
          <div className="space-y-3">
            {roles.length === 0 && <div className="card-site p-6 text-sm text-muted-foreground">No roles yet.</div>}
            {roles.map((role) => (
              <button
                key={role.id}
                type="button"
                onClick={() => openRole(role)}
                className={`card-site w-full p-4 text-left ${selectedId === role.id ? "ring-2 ring-primary" : ""}`}
              >
                <span className="block font-semibold">{role.name}</span>
                <span className="mt-1 block text-sm text-muted-foreground">
                  {role.userCount} {role.userCount === 1 ? "user" : "users"} · {role.permissionCount} permissions
                </span>
                {role.systemManaged && <span className="mt-2 inline-block text-xs font-medium text-primary">System-managed</span>}
              </button>
            ))}
          </div>

          {(creating || selected) && (
            <form onSubmit={saveRole} className="card-site space-y-5 p-6">
              <div>
                <h2 className="text-xl font-semibold">{creating ? "New role" : selected?.name}</h2>
                {selected?.systemManaged && (
                  <p className="mt-2 text-sm text-muted-foreground">This system-managed role cannot be edited or deleted.</p>
                )}
              </div>
              <label className="block text-sm font-semibold" htmlFor="role-name">Name</label>
              <input id="role-name" className="field" value={name} disabled={Boolean(selected?.systemManaged) || (!creating && !can("roles.update"))} onChange={(event) => setName(event.target.value)} />
              <label className="block text-sm font-semibold" htmlFor="role-description">Description</label>
              <textarea id="role-description" className="field h-auto py-3" rows={3} value={description} disabled={Boolean(selected?.systemManaged) || (!creating && !can("roles.update"))} onChange={(event) => setDescription(event.target.value)} />

              {!creating && (
                <div className="space-y-4">
                  <h3 className="font-semibold">Permissions</h3>
                  {groups.map(([module, permissions]) => (
                    <fieldset key={module} className="rounded-lg border border-border p-4">
                      <legend className="px-1 text-sm font-semibold">{permissionModuleLabel(module)}</legend>
                      <div className="mt-2 space-y-2">
                        {permissions.map((permission) => (
                          <label key={permission.key} className="flex items-start gap-2 text-sm">
                            <input
                              type="checkbox"
                              className="mt-1"
                              disabled={locked}
                              checked={selectedKeys.includes(permission.key)}
                              onChange={(event) => {
                                setSelectedKeys((current) =>
                                  event.target.checked
                                    ? [...current, permission.key]
                                    : current.filter((key) => key !== permission.key),
                                );
                              }}
                            />
                            <span>
                              <span className="font-medium">{permissionActionLabel(permission.action)}</span>
                              <span className="mt-0.5 block text-muted-foreground">{permission.description}</span>
                              {permission.systemManaged && <span className="text-xs text-muted-foreground">Catalogue permission</span>}
                            </span>
                          </label>
                        ))}
                      </div>
                    </fieldset>
                  ))}
                </div>
              )}

              <div className="flex flex-wrap justify-end gap-2">
                {selected && can("roles.delete") && !selected.systemManaged && (
                  <button type="button" className="btn btn-outline text-destructive" disabled={busy} onClick={removeRole}>Delete role</button>
                )}
                {(creating ? can("roles.create") : can("roles.update") || can("roles.permissions.update")) && !selected?.systemManaged && (
                  <button type="submit" className="btn btn-primary" disabled={busy}>
                    {busy && <Loader2 className="h-4 w-4 animate-spin" />}
                    Save
                  </button>
                )}
              </div>
            </form>
          )}
        </div>
      )}
    </>
  );
}
