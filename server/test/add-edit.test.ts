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

  it("returns a field-level 400 for a hire date that is not a real YYYY-MM-DD date", async () => {
    for (const hire_date of ["garbage", "2025-02-30", "03/01/2025"]) {
      const res = await send("POST", "/api/employees", { ...valid, email: "bad.hire@example.com", hire_date });
      assert.equal(res.status, 400, hire_date);
      assert.deepEqual(await res.json(), { errors: { hire_date: "Enter a valid date (YYYY-MM-DD)" } }, hire_date);
    }
  });

  it("returns a field-level 400 for a termination date that is not a real YYYY-MM-DD date", async () => {
    const res = await send("POST", "/api/employees", { ...valid, email: "bad.end@example.com", status: "terminated", termination_date: "garbage" });
    assert.equal(res.status, 400);
    assert.deepEqual(await res.json(), { errors: { termination_date: "Enter a valid date (YYYY-MM-DD)" } });
  });

  it("returns a field-level 400 when the termination date is before the hire date", async () => {
    const res = await send("POST", "/api/employees", { ...valid, email: "early.end@example.com", status: "terminated", hire_date: "2025-03-01", termination_date: "2025-02-28" });
    assert.equal(res.status, 400);
    assert.deepEqual(await res.json(), { errors: { termination_date: "Termination date cannot be before the hire date" } });
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

  it("clears the termination date when a terminated employee is edited back to active", async () => {
    await send("POST", "/api/employees", { ...valid, email: "back.again@example.com", status: "terminated", termination_date: "2026-01-15" });
    const left = await byEmail("back.again@example.com");
    assert.equal(left.termination_date, "2026-01-15");
    const res = await send("PUT", `/api/employees/${left.id}`, { ...left, status: "active" });
    assert.equal(res.status, 200);
    const back = await byEmail("back.again@example.com");
    assert.equal(back.status, "active");
    assert.equal(back.termination_date, null);
  });

  it("returns a 409 when the edited email belongs to another live employee", async () => {
    const lena = await byEmail("lena.fischer@example.com");
    const res = await send("PUT", `/api/employees/${lena.id}`, { ...lena, email: "tomas.novak@example.com" });
    assert.equal(res.status, 409);
    assert.deepEqual(await res.json(), { errors: { email: "This email already belongs to Tomas Novak" } });
  });

  it("returns a different 409 when the edited email belongs to someone in the Trash", async () => {
    const lena = await byEmail("lena.fischer@example.com");
    const res = await send("PUT", `/api/employees/${lena.id}`, { ...lena, email: "patrick.hale@example.com" });
    assert.equal(res.status, 409);
    assert.deepEqual(await res.json(), {
      errors: { email: "This email belongs to Patrick Hale, who is in the Trash. Restore them instead." },
    });
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

describe("manager must be a live employee", () => {
  const own = startTestServer();
  after(() => own.close());
  const put = (id: number, body: unknown) =>
    fetch(`${own.baseUrl}/api/employees/${id}`, { method: "PUT", headers: { "content-type": "application/json" }, body: JSON.stringify(body) });
  const people = async () => (await (await fetch(`${own.baseUrl}/api/employees`)).json()) as Employee[];
  const trashedId = async (email: string) =>
    ((await (await fetch(`${own.baseUrl}/api/trash`)).json()) as Employee[]).find((e) => e.email === email)!.id;

  it("rejects adding an employee whose manager is in the Trash", async () => {
    const patrick = await trashedId("patrick.hale@example.com");
    const res = await fetch(`${own.baseUrl}/api/employees`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ ...valid, email: "reports.to.trash@example.com", manager_id: patrick }),
    });
    assert.equal(res.status, 400);
    assert.deepEqual(await res.json(), { errors: { manager_id: "This manager is in the Trash. Choose someone else." } });
  });

  it("still saves an employee whose existing manager was moved to the Trash later", async () => {
    const sofia = (await people()).find((e) => e.email === "sofia.marchetti@example.com")!;
    assert.equal((await fetch(`${own.baseUrl}/api/employees/${sofia.id}`, { method: "DELETE" })).status, 204);
    const lena = (await people()).find((e) => e.email === "lena.fischer@example.com")!;
    assert.equal(lena.manager_id, sofia.id);
    const res = await put(lena.id, { ...lena, job_title: "Principal Engineer" });
    assert.equal(res.status, 200);
  });

  it("rejects changing an employee's manager to someone in the Trash", async () => {
    const omar = (await people()).find((e) => e.email === "omar.haddad@example.com")!;
    const res = await put(omar.id, { ...omar, manager_id: await trashedId("isabel.moreau@example.com") });
    assert.equal(res.status, 400);
    assert.deepEqual(await res.json(), { errors: { manager_id: "This manager is in the Trash. Choose someone else." } });
  });
});
