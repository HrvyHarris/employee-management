import type { Employee } from "./types";

export async function getEmployee(id: number): Promise<Employee> {
  const res = await fetch(`/api/employees/${id}`);
  if (!res.ok) throw new Error(`Could not load employee (${res.status})`);
  return res.json();
}
