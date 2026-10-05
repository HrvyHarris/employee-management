export async function restoreEmployee(id: number): Promise<void> {
  const res = await fetch(`/api/employees/${id}/restore`, { method: "POST" });
  if (!res.ok) throw new Error(`Could not restore employee (${res.status})`);
}
