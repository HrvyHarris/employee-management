import { useEffect, useState, type FormEvent, type ReactNode } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { createEmployee, getEmployee, listEmployees, updateEmployee, type Employee, type EmployeeInput, type FieldErrors } from "../api";

const EMPTY: EmployeeInput = {
  first_name: "",
  last_name: "",
  email: "",
  phone: "",
  job_title: "",
  department: "",
  manager_id: null,
  status: "active",
  hire_date: "",
  termination_date: null,
};

// Add (at /employees/new) and edit (at /employees/:id/edit) share this form.
export function EmployeeFormPage() {
  const params = useParams();
  const id = params.id ? Number(params.id) : null;
  const navigate = useNavigate();

  const [form, setForm] = useState<EmployeeInput | null>(id ? null : EMPTY);
  const [currentManagerName, setCurrentManagerName] = useState<string | null>(null);
  const [people, setPeople] = useState<Employee[]>([]);
  const [errors, setErrors] = useState<FieldErrors>({});
  const [loadError, setLoadError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    listEmployees().then(setPeople, (e: Error) => setLoadError(e.message));
    if (id) {
      getEmployee(id).then(
        (e) => {
          setForm(e); // Extra fields like id are ignored by the API.
          setCurrentManagerName(e.manager_name);
        },
        (e: Error) => setLoadError(e.message),
      );
    }
  }, [id]);

  // Manager picker: everyone in the directory (which already leaves out the Trash) except the person being edited.
  const managers = people.filter((p) => p.id !== id);
  const departments = [...new Set(people.map((p) => p.department))].sort();

  function set<K extends keyof EmployeeInput>(field: K, value: EmployeeInput[K]) {
    setForm((f) => (f ? { ...f, [field]: value } : f));
  }

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    if (!form) return;
    setSaving(true);
    try {
      const result = id ? await updateEmployee(id, form) : await createEmployee(form);
      if (result) setErrors(result);
      else navigate("/employees");
    } catch (e) {
      setErrors({ form: (e as Error).message });
    } finally {
      setSaving(false);
    }
  }

  const title = id ? "Edit employee" : "Add employee";
  if (loadError) return <Page title={title}><p className="error">{loadError}</p></Page>;
  if (!form) return <Page title={title}><p className="muted">Loading...</p></Page>;

  const input = (field: "first_name" | "last_name" | "email" | "phone" | "job_title" | "hire_date", label: string, type = "text") => (
    <Field label={label} error={errors[field]}>
      <input type={type} value={form[field] ?? ""} onChange={(e) => set(field, e.target.value)} aria-invalid={!!errors[field]} />
    </Field>
  );

  return (
    <Page title={title}>
      <form className="card form" onSubmit={onSubmit} noValidate>
        {errors.form && <p className="error">{errors.form}</p>}
        <div className="form-grid">
          {input("first_name", "First name")}
          {input("last_name", "Last name")}
          {input("email", "Email", "email")}
          {input("phone", "Phone (optional)", "tel")}
          {input("job_title", "Job title")}
          <Field label="Department" error={errors.department}>
            <input list="departments" value={form.department} onChange={(e) => set("department", e.target.value)} aria-invalid={!!errors.department} />
            <datalist id="departments">
              {departments.map((d) => <option key={d} value={d} />)}
            </datalist>
          </Field>
          <Field label="Manager" error={errors.manager_id}>
            <select value={form.manager_id ?? ""} onChange={(e) => set("manager_id", e.target.value ? Number(e.target.value) : null)}>
              <option value="">None</option>
              {form.manager_id !== null && !managers.some((m) => m.id === form.manager_id) && (
                <option value={form.manager_id}>{currentManagerName ?? "Current manager"} (not in the directory)</option>
              )}
              {managers.map((m) => (
                <option key={m.id} value={m.id}>{m.first_name} {m.last_name}</option>
              ))}
            </select>
          </Field>
          <Field label="Status" error={errors.status}>
            <select value={form.status} onChange={(e) => set("status", e.target.value as EmployeeInput["status"])}>
              <option value="active">Active</option>
              <option value="on_leave">On leave</option>
              <option value="terminated">Terminated</option>
            </select>
          </Field>
          {input("hire_date", "Hire date", "date")}
          {form.status === "terminated" && (
            <Field label="Termination date" error={errors.termination_date}>
              <input type="date" value={form.termination_date ?? ""} onChange={(e) => set("termination_date", e.target.value || null)} aria-invalid={!!errors.termination_date} />
            </Field>
          )}
        </div>
        <div className="form-actions">
          <Link to="/employees" className="button secondary">Cancel</Link>
          <button type="submit" className="button" disabled={saving}>{saving ? "Saving..." : id ? "Save changes" : "Add employee"}</button>
        </div>
      </form>
    </Page>
  );
}

function Page({ title, children }: { title: string; children: ReactNode }) {
  return (
    <>
      <header className="page-header">
        <h2>{title}</h2>
      </header>
      {children}
    </>
  );
}

function Field({ label, error, children }: { label: string; error?: string; children: ReactNode }) {
  return (
    <label className="field">
      <span className="field-label">{label}</span>
      {children}
      {error && <span className="field-error">{error}</span>}
    </label>
  );
}
