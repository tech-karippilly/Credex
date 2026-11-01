import { useCallback, useEffect, useState } from "react";
import { Loader2, Plus } from "lucide-react";
import { useCan } from "@/components/admin/admin-access";
import { apiErrorMessage } from "@/lib/api";
import {
  employeesApi,
  type EmployeeDepartmentOption,
  type EmployeeDesignation,
} from "@/lib/employees-api";

export function DepartmentsPanel() {
  const can = useCan();
  const canEdit = can("employees.update");
  const [departments, setDepartments] = useState<EmployeeDepartmentOption[] | null>(null);
  const [departmentName, setDepartmentName] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);

  const load = useCallback(() => {
    employeesApi
      .setup()
      .then((data) => setDepartments(data.departments))
      .catch((error) => {
        setDepartments([]);
        setMsg({ ok: false, text: apiErrorMessage(error, "Could not load departments") });
      });
  }, []);

  useEffect(load, [load]);

  async function addDepartment(event: React.FormEvent) {
    event.preventDefault();
    const next = departmentName.trim();
    if (!next) {
      setMsg({ ok: false, text: "Enter a department." });
      return;
    }
    setBusy(true);
    setMsg(null);
    try {
      await employeesApi.createDepartment(next);
      setDepartmentName("");
      setMsg({ ok: true, text: "Department added." });
      load();
    } catch (error) {
      setMsg({ ok: false, text: apiErrorMessage(error, "Could not add department") });
    }
    setBusy(false);
  }

  async function saveDepartment(event: React.FormEvent) {
    event.preventDefault();
    if (!editingId) return;
    const next = editName.trim();
    if (!next) {
      setMsg({ ok: false, text: "Enter a department." });
      return;
    }
    setBusy(true);
    setMsg(null);
    try {
      await employeesApi.updateDepartment(editingId, next);
      setEditingId(null);
      setEditName("");
      setMsg({ ok: true, text: "Department updated." });
      load();
    } catch (error) {
      setMsg({ ok: false, text: apiErrorMessage(error, "Could not update department") });
    }
    setBusy(false);
  }

  async function removeDepartment(department: EmployeeDepartmentOption) {
    if (!confirm(`Remove department "${department.name}"?`)) return;
    setBusy(true);
    setMsg(null);
    try {
      await employeesApi.deleteDepartment(department.id);
      setMsg({ ok: true, text: "Department removed." });
      load();
    } catch (error) {
      setMsg({ ok: false, text: apiErrorMessage(error, "Could not remove department") });
    }
    setBusy(false);
  }

  return (
    <>
      <div className="mb-8">
        <h1 className="text-3xl font-semibold">Departments</h1>
        <p className="mt-2 text-muted-foreground">
          Add or rename departments, then choose them when you add an employee. Renaming a department
          updates people already in it.
        </p>
      </div>

      {msg && (
        <p role="status" className={`mb-4 text-sm ${msg.ok ? "text-success" : "text-destructive"}`}>
          {msg.text}
        </p>
      )}

      <section className="card-site space-y-4 p-6 md:p-8">
        {canEdit && (
          <form className="flex flex-col gap-3 sm:flex-row" onSubmit={addDepartment}>
            <label className="sr-only" htmlFor="department-name">
              Department
            </label>
            <input
              id="department-name"
              className="field"
              value={departmentName}
              placeholder="Department name"
              onChange={(event) => setDepartmentName(event.target.value)}
            />
            <button type="submit" className="btn btn-primary" disabled={busy}>
              {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
              Add department
            </button>
          </form>
        )}
        {!departments ? (
          <div className="flex justify-center py-10">
            <Loader2 className="h-6 w-6 animate-spin text-primary" />
          </div>
        ) : departments.length === 0 ? (
          <p className="text-sm text-muted-foreground">No departments yet.</p>
        ) : (
          <ul className="divide-y divide-border">
            {departments.map((department) => (
              <li key={department.id} className="flex items-center justify-between gap-3 py-3">
                {editingId === department.id ? (
                  <form
                    className="flex flex-1 flex-col gap-2 sm:flex-row"
                    onSubmit={saveDepartment}
                  >
                    <label className="sr-only" htmlFor={`edit-department-${department.id}`}>
                      Department name
                    </label>
                    <input
                      id={`edit-department-${department.id}`}
                      className="field"
                      value={editName}
                      onChange={(event) => setEditName(event.target.value)}
                    />
                    <button
                      type="submit"
                      className="btn btn-primary h-10 px-4 text-sm"
                      disabled={busy}
                    >
                      Save
                    </button>
                    <button
                      type="button"
                      className="btn btn-outline h-10 px-4 text-sm"
                      onClick={() => setEditingId(null)}
                    >
                      Cancel
                    </button>
                  </form>
                ) : (
                  <>
                    <span className="font-medium">{department.name}</span>
                    {canEdit && (
                      <div className="flex gap-2">
                        <button
                          type="button"
                          className="btn btn-outline h-9 px-3 text-sm"
                          onClick={() => {
                            setEditingId(department.id);
                            setEditName(department.name);
                          }}
                        >
                          Edit
                        </button>
                        <button
                          type="button"
                          className="btn btn-outline h-9 px-3 text-sm"
                          onClick={() => removeDepartment(department)}
                        >
                          Remove
                        </button>
                      </div>
                    )}
                  </>
                )}
              </li>
            ))}
          </ul>
        )}
      </section>
    </>
  );
}

export function DesignationsPanel() {
  const can = useCan();
  const canEdit = can("employees.update");
  const [designations, setDesignations] = useState<EmployeeDesignation[] | null>(null);
  const [designationName, setDesignationName] = useState("");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);

  const load = useCallback(() => {
    employeesApi
      .setup()
      .then((data) => setDesignations(data.designations))
      .catch((error) => {
        setDesignations([]);
        setMsg({ ok: false, text: apiErrorMessage(error, "Could not load designations") });
      });
  }, []);

  useEffect(load, [load]);

  async function addDesignation(event: React.FormEvent) {
    event.preventDefault();
    const next = designationName.trim();
    if (!next) {
      setMsg({ ok: false, text: "Enter a designation." });
      return;
    }
    setBusy(true);
    setMsg(null);
    try {
      await employeesApi.createDesignation(next);
      setDesignationName("");
      setMsg({ ok: true, text: "Designation added." });
      load();
    } catch (error) {
      setMsg({ ok: false, text: apiErrorMessage(error, "Could not add designation") });
    }
    setBusy(false);
  }

  async function removeDesignation(designation: EmployeeDesignation) {
    if (!confirm(`Remove designation "${designation.name}"?`)) return;
    setBusy(true);
    setMsg(null);
    try {
      await employeesApi.deleteDesignation(designation.id);
      setMsg({ ok: true, text: "Designation removed." });
      load();
    } catch (error) {
      setMsg({ ok: false, text: apiErrorMessage(error, "Could not remove designation") });
    }
    setBusy(false);
  }

  return (
    <>
      <div className="mb-8">
        <h1 className="text-3xl font-semibold">Designations</h1>
        <p className="mt-2 text-muted-foreground">
          Add job titles and roles, then assign them when you add an employee.
        </p>
      </div>

      {msg && (
        <p role="status" className={`mb-4 text-sm ${msg.ok ? "text-success" : "text-destructive"}`}>
          {msg.text}
        </p>
      )}

      <section className="card-site space-y-4 p-6 md:p-8">
        {canEdit && (
          <form className="flex flex-col gap-3 sm:flex-row" onSubmit={addDesignation}>
            <label className="sr-only" htmlFor="designation-name">
              Designation
            </label>
            <input
              id="designation-name"
              className="field"
              value={designationName}
              placeholder="Designation name"
              onChange={(event) => setDesignationName(event.target.value)}
            />
            <button type="submit" className="btn btn-primary" disabled={busy}>
              {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
              Add designation
            </button>
          </form>
        )}
        {!designations ? (
          <div className="flex justify-center py-10">
            <Loader2 className="h-6 w-6 animate-spin text-primary" />
          </div>
        ) : designations.length === 0 ? (
          <p className="text-sm text-muted-foreground">No designations yet.</p>
        ) : (
          <ul className="divide-y divide-border">
            {designations.map((designation) => (
              <li key={designation.id} className="flex items-center justify-between py-3">
                <span className="font-medium">{designation.name}</span>
                {canEdit && (
                  <button
                    type="button"
                    className="btn btn-outline h-9 px-3 text-sm"
                    onClick={() => removeDesignation(designation)}
                  >
                    Remove
                  </button>
                )}
              </li>
            ))}
          </ul>
        )}
      </section>
    </>
  );
}
