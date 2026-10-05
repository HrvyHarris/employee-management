import { NavLink, Navigate, Route, Routes } from "react-router-dom";
import { EmployeesPage } from "./pages/EmployeesPage";

// Sidebar entries: add one line per screen.
const NAV = [
  { to: "/employees", label: "Employees" },
];

export function App() {
  return (
    <div className="layout">
      <aside className="sidebar">
        <h1 className="brand">People</h1>
        <nav>
          {NAV.map((item) => (
            <NavLink key={item.to} to={item.to} className={({ isActive }) => (isActive ? "nav-link active" : "nav-link")}>
              {item.label}
            </NavLink>
          ))}
        </nav>
      </aside>
      <main className="content">
        <Routes>
          {/* Routes: add one line per screen. */}
          <Route path="/employees" element={<EmployeesPage />} />
          <Route path="*" element={<Navigate to="/employees" replace />} />
        </Routes>
      </main>
    </div>
  );
}
