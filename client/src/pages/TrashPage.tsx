import { useEffect, useState } from "react";
import { deleteForever, listTrash, restoreEmployee, type TrashedEmployee } from "../api";

export function TrashPage() {
  const [items, setItems] = useState<TrashedEmployee[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = () => listTrash().then(setItems, (e: Error) => setError(e.message));
  useEffect(() => {
    load();
  }, []);

  const run = (action: Promise<void>) => action.then(load, (e: Error) => setError(e.message));

  const onDelete = (e: TrashedEmployee) => {
    if (confirm(`Delete ${e.first_name} ${e.last_name} forever? This cannot be undone.`)) run(deleteForever(e.id));
  };

  return (
    <>
      <header className="page-header">
        <h2>Trash</h2>
        {items && <span className="muted">{items.length} people</span>}
      </header>
      <p className="banner">
        Removed employees are kept for 30 days before permanent removal. This is a demo: nobody is ever purged automatically.
      </p>
      {error && <p className="error">{error}</p>}
      {!items && !error && <p className="muted">Loading...</p>}
      {items && items.length === 0 && <p className="muted">The Trash is empty.</p>}
      {items && items.length > 0 && (
        <div className="card">
          <table>
            <thead>
              <tr>
                <th>Name</th>
                <th>Email</th>
                <th>Job title</th>
                <th>Department</th>
                <th>Days remaining</th>
                <th aria-label="Actions" />
              </tr>
            </thead>
            <tbody>
              {items.map((e) => (
                <tr key={e.id}>
                  <td>{e.first_name} {e.last_name}</td>
                  <td>{e.email}</td>
                  <td>{e.job_title}</td>
                  <td>{e.department}</td>
                  <td>{e.days_remaining} {e.days_remaining === 1 ? "day" : "days"}</td>
                  <td className="actions">
                    <button className="btn" onClick={() => run(restoreEmployee(e.id))}>Restore</button>
                    <button className="btn danger" onClick={() => onDelete(e)}>Delete forever</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </>
  );
}
