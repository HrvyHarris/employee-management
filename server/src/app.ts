import express from "express";
import type { Db } from "./db.ts";
import { employeesRouter } from "./routes/employees.ts";
import { trashRouter } from "./routes/trash.ts";

// One line per route module. Add new routers below.
export function createApp(db: Db) {
  const app = express();
  app.use(express.json());
  app.use("/api/employees", employeesRouter(db));
  app.use("/api", trashRouter(db));
  return app;
}
