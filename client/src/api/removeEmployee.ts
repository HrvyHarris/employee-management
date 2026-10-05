export async function removeEmployee(id: number): Promise<void> {
  const res = await fetch(`/api/employees/${id}`, { method: "DELETE" });
  if (!res.ok) throw new Error(`Could not remove employee (${res.status})`);
}
