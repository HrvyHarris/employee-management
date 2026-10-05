import { Router, type Response } from "express";
import type { Db } from "../db.ts";
import { validateEmployee, type EmployeeInput } from "../validateEmployee.ts";

export function employeesRouter(db: Db) {
  const router = Router();

  router.get("/", (_req, res) => {
    const rows = db
      .prepare(
        `SELECT e.*, m.first_name || ' ' || m.last_name AS manager_name
         FROM employees e
         LEFT JOIN employees m ON m.id = e.manager_id
         WHERE e.deleted_at IS NULL
         ORDER BY e.last_name, e.first_name`,
      )
      .all();
    res.json(rows);
  });

  // One employee, used to fill the edit form. The profile page ticket can extend this response.
  router.get("/:id", (req, res) => {
    const row = db
      .prepare(
        `SELECT e.*, m.first_name || ' ' || m.last_name AS manager_name
         FROM employees e
         LEFT JOIN employees m ON m.id = e.manager_id
         WHERE e.id = ? AND e.deleted_at IS NULL`,
      )
      .get(Number(req.params.id));
    if (!row) {
      res.status(404).json({ error: "Employee not found" });
      return;
    }
    res.json(row);
  });

  // Validates a submitted form for a new employee, or for employee `id` when editing.
  // Sends the 400 or 409 response and returns null when the form is rejected.
  function accept(body: Record<string, unknown>, res: Response, id?: number): EmployeeInput | null {
    const { values, errors } = validateEmployee(body);
    if (id !== undefined && values.manager_id === id) {
      errors.manager_id = "An employee cannot be their own manager";
    } else if (values.manager_id !== null) {
      const manager = db.prepare("SELECT id FROM employees WHERE id = ?").get(values.manager_id);
      if (!manager) errors.manager_id = "Manager does not exist";
    }
    if (Object.keys(errors).length) {
      res.status(400).json({ errors });
      return null;
    }
    const owner = db
      .prepare("SELECT first_name || ' ' || last_name AS name, deleted_at FROM employees WHERE email = ? AND id IS NOT ?")
      .get(values.email, id ?? null) as { name: string; deleted_at: string | null } | undefined;
    if (owner) {
      const email = owner.deleted_at
        ? `This email belongs to ${owner.name}, who is in the Trash. Restore them instead.`
        : `This email already belongs to ${owner.name}`;
      res.status(409).json({ errors: { email } });
      return null;
    }
    return values;
  }

  router.post("/", (req, res) => {
    const values = accept(req.body ?? {}, res);
    if (!values) return;
    const result = db
      .prepare(
        `INSERT INTO employees (first_name, last_name, email, phone, job_title, department, manager_id, status, hire_date, termination_date)
         VALUES (@first_name, @last_name, @email, @phone, @job_title, @department, @manager_id, @status, @hire_date, @termination_date)`,
      )
      .run(values);
    res.status(201).json({ id: Number(result.lastInsertRowid) });
  });

  router.put("/:id", (req, res) => {
    const id = Number(req.params.id);
    if (!db.prepare("SELECT id FROM employees WHERE id = ? AND deleted_at IS NULL").get(id)) {
      res.status(404).json({ error: "Employee not found" });
      return;
    }
    const values = accept(req.body ?? {}, res, id);
    if (!values) return;
    // Fractional seconds so an edit made in the same second as the last write still moves updated_at forward.
    db.prepare(
      `UPDATE employees SET first_name = @first_name, last_name = @last_name, email = @email, phone = @phone,
         job_title = @job_title, department = @department, manager_id = @manager_id, status = @status,
         hire_date = @hire_date, termination_date = @termination_date, updated_at = strftime('%Y-%m-%d %H:%M:%f', 'now')
       WHERE id = @id`,
    ).run({ ...values, id });
    res.json({ id });
  });

  return router;
}
