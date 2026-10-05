import type { Employee } from "./types";

export async function listEmployees(): Promise<Employee[]> {
  const res = await fetch("/api/employees");
  if (!res.ok) throw new Error(`Could not load employees (${res.status})`);
  return res.json();
}
