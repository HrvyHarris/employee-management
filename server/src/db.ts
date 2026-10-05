import Database from "better-sqlite3";

export type Db = Database.Database;

const SCHEMA = `
CREATE TABLE IF NOT EXISTS employees (
  id               INTEGER PRIMARY KEY AUTOINCREMENT,
  first_name       TEXT NOT NULL,
  last_name        TEXT NOT NULL,
  email            TEXT NOT NULL UNIQUE COLLATE NOCASE,
  phone            TEXT,
  job_title        TEXT NOT NULL,
  department       TEXT NOT NULL,
  manager_id       INTEGER REFERENCES employees(id) ON DELETE SET NULL
                   CHECK (manager_id IS NULL OR manager_id != id),
  status           TEXT NOT NULL DEFAULT 'active'
                   CHECK (status IN ('active', 'on_leave', 'terminated')),
  hire_date        TEXT NOT NULL,
  termination_date TEXT,
  deleted_at       TEXT,
  created_at       TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at       TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS time_off (
  id           INTEGER PRIMARY KEY AUTOINCREMENT,
  employee_id  INTEGER NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
  type         TEXT NOT NULL CHECK (type IN ('pto', 'sick', 'other')),
  start_date   TEXT NOT NULL,
  end_date     TEXT NOT NULL CHECK (end_date >= start_date)
);
`;

// Opens a database, switches foreign keys on (SQLite leaves them off by default) and ensures the schema exists.
export function openDb(path: string): Db {
  const db = new Database(path);
  db.pragma("foreign_keys = ON");
  db.exec(SCHEMA);
  return db;
}

export const DB_PATH = process.env.DATABASE_PATH ?? "data/employees.db";
