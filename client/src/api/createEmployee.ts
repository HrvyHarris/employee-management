import { saveResult, type EmployeeInput, type FieldErrors } from "./employeeInput";

export async function createEmployee(input: EmployeeInput): Promise<FieldErrors | null> {
  const res = await fetch("/api/employees", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(input),
  });
  return saveResult(res);
}
