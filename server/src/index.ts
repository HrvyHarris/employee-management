import { mkdirSync } from "node:fs";
import { dirname } from "node:path";
import { createApp } from "./app.ts";
import { DB_PATH, openDb } from "./db.ts";
import { seed } from "./seed.ts";

mkdirSync(dirname(DB_PATH), { recursive: true });
const db = openDb(DB_PATH);

// First run: load the demo data so every screen is populated.
if ((db.prepare("SELECT COUNT(*) AS n FROM employees").get() as { n: number }).n === 0) seed(db);

const port = Number(process.env.PORT ?? 3001);
createApp(db).listen(port, () => console.log(`API listening on http://localhost:${port}`));
