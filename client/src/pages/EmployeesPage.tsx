import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { listEmployees, type Employee } from "../api";

const STATUS_LABEL = { active: "Active", on_leave: "On leave", terminated: "Terminated" } as const;

export function EmployeesPage() {
  const [employees, setEmployees] = useState<Employee[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    listEmployees().then(setEmployees, (e: Error) => setError(e.message));
  }, []);

  return (
    <>
      <header className="page-header">
        <h2>Employees</h2>
        {employees && <span className="muted">{employees.length} people</span>}
        <Link to="/employees/new" className="button header-action">Add employee</Link>
      </header>
      {error && <p className="error">{error}</p>}
      {!employees && !error && <p className="muted">Loading...</p>}
      {employees && (
        <div className="card">
          <table>
            <thead>
              <tr>
                <th>Name</th>
                <th>Email</th>
                <th>Job title</th>
                <th>Department</th>
                <th>Manager</th>
                <th>Status</th>
                <th><span className="visually-hidden">Actions</span></th>
              </tr>
            </thead>
            <tbody>
              {employees.map((e) => (
                <tr key={e.id}>
                  <td>{e.first_name} {e.last_name}</td>
                  <td>{e.email}</td>
                  <td>{e.job_title}</td>
                  <td>{e.department}</td>
                  <td>{e.manager_name ?? "None"}</td>
                  <td><span className={`badge ${e.status}`}>{STATUS_LABEL[e.status]}</span></td>
                  <td className="actions">
                    <Link to={`/employees/${e.id}/edit`}>Edit</Link>
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
