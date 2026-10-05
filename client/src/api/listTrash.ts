export type TrashedEmployee = {
  id: number;
  first_name: string;
  last_name: string;
  email: string;
  job_title: string;
  department: string;
  deleted_at: string;
  days_remaining: number;
};

export async function listTrash(): Promise<TrashedEmployee[]> {
  const res = await fetch("/api/trash");
  if (!res.ok) throw new Error(`Could not load the Trash (${res.status})`);
  return res.json();
}
