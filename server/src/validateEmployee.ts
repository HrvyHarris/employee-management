// Checks a submitted employee form. Returns clean values for the database, or field-level messages.
export type EmployeeInput = {
  first_name: string;
  last_name: string;
  email: string;
  phone: string | null;
  job_title: string;
  department: string;
  manager_id: number | null;
  status: string;
  hire_date: string;
  termination_date: string | null;
};

const REQUIRED = {
  first_name: "First name",
  last_name: "Last name",
  email: "Email",
  job_title: "Job title",
  department: "Department",
  hire_date: "Hire date",
} as const;

const STATUSES = ["active", "on_leave", "terminated"];
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const text = (v: unknown) => (typeof v === "string" ? v.trim() : "");
// A real calendar date written as YYYY-MM-DD. Date rolls 2025-02-30 over to March, so it fails the round trip.
const isDate = (v: string) => /^\d{4}-\d{2}-\d{2}$/.test(v) && !isNaN(Date.parse(v)) && new Date(v).toISOString().startsWith(v);

export function validateEmployee(body: Record<string, unknown>): { values: EmployeeInput; errors: Record<string, string> } {
  const errors: Record<string, string> = {};
  for (const [field, label] of Object.entries(REQUIRED)) {
    if (!text(body[field])) errors[field] = `${label} is required`;
  }
  const hireDate = text(body.hire_date);
  if (hireDate && !isDate(hireDate)) errors.hire_date = "Enter a valid date (YYYY-MM-DD)";
  const email = text(body.email);
  if (email && !EMAIL.test(email)) errors.email = "Enter a valid email address";
  const status = text(body.status) || "active";
  if (!STATUSES.includes(status)) errors.status = "Choose a valid status";
  const terminationDate = status === "terminated" ? text(body.termination_date) || null : null;
  if (status === "terminated" && !terminationDate) errors.termination_date = "Termination date is required when status is terminated";
  else if (terminationDate && !isDate(terminationDate)) errors.termination_date = "Enter a valid date (YYYY-MM-DD)";
  // YYYY-MM-DD strings sort the same as the dates they name.
  else if (terminationDate && !errors.hire_date && terminationDate < hireDate) {
    errors.termination_date = "Termination date cannot be before the hire date";
  }

  const values: EmployeeInput = {
    first_name: text(body.first_name),
    last_name: text(body.last_name),
    email,
    phone: text(body.phone) || null,
    job_title: text(body.job_title),
    department: text(body.department),
    manager_id: body.manager_id == null || body.manager_id === "" ? null : Number(body.manager_id),
    status,
    hire_date: hireDate,
    termination_date: terminationDate,
  };
  return { values, errors };
}
