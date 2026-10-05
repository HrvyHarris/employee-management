import { saveResult, type EmployeeInput, type FieldErrors } from "./employeeInput";

export async function updateEmployee(id: number, input: EmployeeInput): Promise<FieldErrors | null> {
  const res = await fetch(`/api/employees/${id}`, {
    method: "PUT",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(input),
  });
  return saveResult(res);
}
