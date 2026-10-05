import type { Employee } from "./types";

// The fields the add and edit form sends to the API.
export type EmployeeInput = Pick<
  Employee,
  "first_name" | "last_name" | "email" | "phone" | "job_title" | "department" | "manager_id" | "status" | "hire_date" | "termination_date"
>;

// Field name to message, as returned by the API for 400 and 409 responses.
export type FieldErrors = Record<string, string>;

// Resolves to null when the save worked, or to field-level messages the form shows next to each field.
export async function saveResult(res: Response): Promise<FieldErrors | null> {
  if (res.ok) return null;
  if (res.status === 400 || res.status === 409) return ((await res.json()) as { errors: FieldErrors }).errors;
  throw new Error(`Could not save employee (${res.status})`);
}
