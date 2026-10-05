import { after, describe, it } from "node:test";
import assert from "node:assert/strict";
import { startTestServer } from "./helpers.ts";

const ctx = startTestServer();
after(() => ctx.close());

type Employee = { id: number; email: string; first_name: string; status: string; manager_id: number | null; termination_date: string | null; updated_at: string };

const valid = {
  first_name: "Jordan",
  last_name: "Avery",
  email: "jordan.avery@example.com",
  phone: "555-0100",
  job_title: "Designer",
  department: "Product",
  manager_id: null,
  status: "active",
  hire_date: "2025-03-01",
  termination_date: null,
};

const send = (method: string, path: string, body: unknown) =>
  fetch(`${ctx.baseUrl}${path}`, { method, headers: { "content-type": "application/json" }, body: JSON.stringify(body) });

const directory = async () => (await (await fetch(`${ctx.baseUrl}/api/employees`)).json()) as Employee[];
const byEmail = async (email: string) => (await directory()).find((e) => e.email === email)!;

describe("POST /api/employees", () => {
  it("adds an employee who then appears in the directory", async () => {
    const res = await send("POST", "/api/employees", valid);
    assert.equal(res.status, 201);
    const added = await byEmail("jordan.avery@example.com");
    assert.equal(added.first_name, "Jordan");
  });

  it("returns a field-level 400 for each missing required field", async () => {
    const res = await send("POST", "/api/employees", { ...valid, email: "missing.fields@example.com", first_name: "", last_name: "  ", job_title: undefined, department: "", hire_date: "" });
    assert.equal(res.status, 400);
    const { errors } = (await res.json()) as { errors: Record<string, string> };
    assert.deepEqual(Object.keys(errors).sort(), ["department", "first_name", "hire_date", "job_title", "last_name"]);
    assert.equal(errors.first_name, "First name is required");
    assert.ok(!(await directory()).some((e) => e.email === "missing.fields@example.com"));
  });

  it("returns a field-level 400 for a malformed email", async () => {
    const res = await send("POST", "/api/employees", { ...valid, email: "not-an-email" });
    assert.equal(res.status, 400);
    assert.deepEqual(await res.json(), { errors: { email: "Enter a valid email address" } });
  });

  it("returns a 409 naming the live employee who already has the email, ignoring case", async () => {
    const res = await send("POST", "/api/employees", { ...valid, email: "Lena.Fischer@Example.com" });
    assert.equal(res.status, 409);
    assert.deepEqual(await res.json(), { errors: { email: "This email already belongs to Lena Fischer" } });
  });

  it("returns a different 409 when the email belongs to someone in the Trash", async () => {
    const res = await send("POST", "/api/employees", { ...valid, email: "patrick.hale@example.com" });
    assert.equal(res.status, 409);
    assert.deepEqual(await res.json(), {
      errors: { email: "This email belongs to Patrick Hale, who is in the Trash. Restore them instead." },
    });
  });

  it("requires a termination date when the status is terminated", async () => {
    const res = await send("POST", "/api/employees", { ...valid, email: "no.end.date@example.com", status: "terminated" });
    assert.equal(res.status, 400);
    assert.deepEqual(await res.json(), { errors: { termination_date: "Termination date is required when status is terminated" } });
  });

  it("returns a field-level 400 for an unknown status", async () => {
    const res = await send("POST", "/api/employees", { ...valid, email: "odd.status@example.com", status: "retired" });
    assert.equal(res.status, 400);
    assert.deepEqual(await res.json(), { errors: { status: "Choose a valid status" } });
  });

  it("stores the termination date for a terminated employee", async () => {
    const res = await send("POST", "/api/employees", { ...valid, email: "left.us@example.com", status: "terminated", termination_date: "2026-01-15" });
    assert.equal(res.status, 201);
    const added = await byEmail("left.us@example.com");
    assert.equal(added.status, "terminated");
    assert.equal(added.termination_date, "2026-01-15");
  });

  it("ignores the termination date for other statuses", async () => {
    const res = await send("POST", "/api/employees", { ...valid, email: "on.leave@example.com", status: "on_leave", termination_date: "2026-01-15" });
    assert.equal(res.status, 201);
    const added = await byEmail("on.leave@example.com");
    assert.equal(added.status, "on_leave");
    assert.equal(added.termination_date, null);
  });
});

describe("PUT /api/employees/:id", () => {
  it("saves every edited field and updates the updated-at time", async () => {
    const before = await byEmail("amara.okafor@example.com");
    const edited = {
      ...valid,
      first_name: "Amara",
      last_name: "Okafor-Reid",
      email: "amara.reid@example.com",
      phone: "555-0199",
      job_title: "Chief People Officer",
      department: "People",
      status: "on_leave",
    };
    const res = await send("PUT", `/api/employees/${before.id}`, edited);
    assert.equal(res.status, 200);

    const after = (await directory()).find((e) => e.id === before.id)! as Employee & Record<string, unknown>;
    for (const field of ["first_name", "last_name", "email", "phone", "job_title", "department", "status", "hire_date"] as const) {
      assert.equal(after[field], edited[field], field);
    }
    assert.ok(after.updated_at > before.updated_at, `updated_at ${after.updated_at} should be later than ${before.updated_at}`);
  });

  it("returns 404 for an employee who does not exist", async () => {
    const res = await send("PUT", "/api/employees/99999", { ...valid, email: "ghost@example.com" });
    assert.equal(res.status, 404);
  });

  it("rejects making someone their own manager", async () => {
    const lena = await byEmail("lena.fischer@example.com");
    const res = await send("PUT", `/api/employees/${lena.id}`, { ...lena, manager_id: lena.id });
    assert.equal(res.status, 400);
    assert.deepEqual(await res.json(), { errors: { manager_id: "An employee cannot be their own manager" } });
  });

  it("lets an employee keep their own email when other fields change", async () => {
    const lena = await byEmail("lena.fischer@example.com");
    const res = await send("PUT", `/api/employees/${lena.id}`, { ...lena, job_title: "Staff Engineer" });
    assert.equal(res.status, 200);
  });
});

describe("GET /api/employees/:id", () => {
  it("returns one employee for the edit form", async () => {
    const lena = await byEmail("lena.fischer@example.com");
    const res = await fetch(`${ctx.baseUrl}/api/employees/${lena.id}`);
    assert.equal(res.status, 200);
    const body = (await res.json()) as Employee & { manager_name: string };
    assert.equal(body.email, "lena.fischer@example.com");
    assert.equal(body.manager_name, "Sofia Marchetti");
  });

  it("returns 404 for someone in the Trash", async () => {
    const all = (await (await fetch(`${ctx.baseUrl}/api/employees`)).json()) as Employee[];
    const maxId = Math.max(...all.map((e) => e.id));
    // Live ids come from the directory, so any seeded id missing from it belongs to someone in the Trash.
    const trashedId = Array.from({ length: maxId }, (_, i) => i + 1).find((id) => !all.some((e) => e.id === id))!;
    const res = await fetch(`${ctx.baseUrl}/api/employees/${trashedId}`);
    assert.equal(res.status, 404);
  });
});
