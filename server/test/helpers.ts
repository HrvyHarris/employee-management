import type { Server } from "node:http";
import type { AddressInfo } from "node:net";
import { createApp } from "../src/app.ts";
import { openDb } from "../src/db.ts";
import { seed } from "../src/seed.ts";

// Starts the real HTTP app against a fresh in-memory database loaded with the seed data.
export function startTestServer() {
  const db = openDb(":memory:");
  seed(db);
  const server: Server = createApp(db).listen(0);
  const baseUrl = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
  return {
    baseUrl,
    reseed: () => seed(db),
    close: () => new Promise<void>((resolve) => server.close(() => resolve())),
  };
}
