export async function deleteForever(id: number): Promise<void> {
  const res = await fetch(`/api/trash/${id}`, { method: "DELETE" });
  if (!res.ok) throw new Error(`Could not delete employee (${res.status})`);
}
