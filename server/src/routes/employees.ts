import { Router } from "express";
import type { Db } from "../db.ts";

export function employeesRouter(db: Db) {
  const router = Router();

  router.get("/", (_req, res) => {
    const rows = db
      .prepare(
        `SELECT e.*, m.first_name || ' ' || m.last_name AS manager_name,
                m.deleted_at IS NOT NULL AS manager_in_trash
         FROM employees e
         LEFT JOIN employees m ON m.id = e.manager_id
         WHERE e.deleted_at IS NULL
         ORDER BY e.last_name, e.first_name`,
      )
      .all();
    res.json(rows);
  });

  // Minimal create: just enough to prove the database enforces foreign keys. Ticket #3 adds full validation.
  router.post("/", (req, res) => {
    const b = req.body ?? {};
    try {
      const result = db
        .prepare(
          `INSERT INTO employees (first_name, last_name, email, phone, job_title, department, manager_id, hire_date)
           VALUES (@first_name, @last_name, @email, @phone, @job_title, @department, @manager_id, @hire_date)`,
        )
        .run({ phone: null, manager_id: null, ...b });
      res.status(201).json({ id: Number(result.lastInsertRowid) });
    } catch (err) {
      if ((err as { code?: string }).code === "SQLITE_CONSTRAINT_FOREIGNKEY") {
        res.status(400).json({ errors: { manager_id: "Manager does not exist" } });
        return;
      }
      throw err;
    }
  });

  return router;
}
