import { after, describe, it } from "node:test";
import assert from "node:assert/strict";
import { startTestServer } from "./helpers.ts";

describe("GET /api/employees", () => {
  const ctx = startTestServer();
  after(() => ctx.close());

  it("includes each employee's manager name for the directory", async () => {
    const employees = (await (await fetch(`${ctx.baseUrl}/api/employees`)).json()) as { email: string; manager_name: string | null }[];
    const byEmail = new Map(employees.map((e) => [e.email, e.manager_name]));
    assert.equal(byEmail.get("lena.fischer@example.com"), "Sofia Marchetti");
    assert.equal(byEmail.get("amara.okafor@example.com"), null);
  });

  it("lists seeded employees and leaves out the ones in the Trash", async () => {
    const res = await fetch(`${ctx.baseUrl}/api/employees`);
    assert.equal(res.status, 200);
    const employees = (await res.json()) as { first_name: string; last_name: string; email: string }[];

    // The known dataset has 37 people, 3 of whom are in the Trash.
    assert.equal(employees.length, 34);
    const emails = employees.map((e) => e.email);
    for (const trashed of ["patrick.hale", "isabel.moreau", "hugo.larsen"]) {
      assert.ok(!emails.includes(`${trashed}@example.com`), `${trashed} is in the Trash and must not be listed`);
    }
    assert.ok(employees.every((e) => e.email.endsWith("@example.com")), "seed emails must be fake");
  });
});

describe("foreign keys", () => {
  const ctx = startTestServer();
  after(() => ctx.close());

  it("rejects creating an employee whose manager does not exist", async () => {
    const res = await fetch(`${ctx.baseUrl}/api/employees`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        first_name: "Test",
        last_name: "Person",
        email: "test.person@example.com",
        job_title: "Tester",
        department: "Engineering",
        manager_id: 99999,
        hire_date: "2024-01-01",
      }),
    });
    assert.equal(res.status, 400);

    const list = (await (await fetch(`${ctx.baseUrl}/api/employees`)).json()) as { email: string }[];
    assert.ok(!list.some((e) => e.email === "test.person@example.com"));
  });
});

describe("seed", () => {
  const ctx = startTestServer();
  after(() => ctx.close());

  it("can be re-run to reset to the same known dataset", async () => {
    const list = async () => ((await (await fetch(`${ctx.baseUrl}/api/employees`)).json()) as { id: number; email: string }[]).map((e) => [e.id, e.email]);
    const before = await list();
    ctx.reseed();
    assert.deepEqual(await list(), before);
  });
});
