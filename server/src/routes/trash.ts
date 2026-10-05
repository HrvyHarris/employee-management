import { Router } from "express";
import type { Db } from "../db.ts";

// Soft delete, Trash listing, restore and delete forever. Mounted at /api.
export function trashRouter(db: Db) {
  const router = Router();

  router.delete("/employees/:id", (req, res) => {
    const result = db
      .prepare("UPDATE employees SET deleted_at = datetime('now') WHERE id = ? AND deleted_at IS NULL")
      .run(req.params.id);
    res.status(result.changes ? 204 : 404).end();
  });

  router.post("/employees/:id/restore", (req, res) => {
    const result = db
      .prepare("UPDATE employees SET deleted_at = NULL WHERE id = ? AND deleted_at IS NOT NULL")
      .run(req.params.id);
    if (!result.changes) {
      res.status(404).json({ error: "Not in the Trash" });
      return;
    }
    res.json({ id: Number(req.params.id) });
  });

  router.get("/trash", (_req, res) => {
    const rows = db
      .prepare(
        `SELECT id, first_name, last_name, email, job_title, department, deleted_at,
                MAX(0, 30 - CAST(julianday('now') - julianday(deleted_at) AS INTEGER)) AS days_remaining
         FROM employees
         WHERE deleted_at IS NOT NULL
         ORDER BY deleted_at DESC`,
      )
      .all();
    res.json(rows);
  });

  // Reports' manager_id is cleared by ON DELETE SET NULL. Time off goes with the row via ON DELETE CASCADE.
  router.delete("/trash/:id", (req, res) => {
    const result = db.prepare("DELETE FROM employees WHERE id = ? AND deleted_at IS NOT NULL").run(req.params.id);
    res.status(result.changes ? 204 : 404).end();
  });

  return router;
}
