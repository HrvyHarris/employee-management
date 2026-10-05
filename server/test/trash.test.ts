import { after, describe, it } from "node:test";
import assert from "node:assert/strict";
import { startTestServer } from "./helpers.ts";

type Listed = { id: number; email: string; manager_id: number | null; manager_name: string | null; manager_in_trash: number };
type Trashed = { id: number; email: string; days_remaining: number };

function api(baseUrl: string) {
  const get = async <T>(path: string) => (await (await fetch(baseUrl + path)).json()) as T;
  return {
    directory: () => get<Listed[]>("/api/employees"),
    trash: () => get<Trashed[]>("/api/trash"),
    idOf: async (email: string) => (await get<Listed[]>("/api/employees")).find((e) => e.email === email)!.id,
    remove: (id: number) => fetch(`${baseUrl}/api/employees/${id}`, { method: "DELETE" }),
    restore: (id: number) => fetch(`${baseUrl}/api/employees/${id}/restore`, { method: "POST" }),
    deleteForever: (id: number) => fetch(`${baseUrl}/api/trash/${id}`, { method: "DELETE" }),
  };
}

describe("GET /api/trash", () => {
  const ctx = startTestServer();
  after(() => ctx.close());

  it("lists the seeded Trash with 30 minus whole days since removal", async () => {
    const trash = await api(ctx.baseUrl).trash();
    // Seed removed Patrick 3 days ago, Isabel 20 days ago and Hugo 29 days ago.
    assert.deepEqual(
      trash.map((e) => [e.email, e.days_remaining]),
      [
        ["patrick.hale@example.com", 27],
        ["isabel.moreau@example.com", 10],
        ["hugo.larsen@example.com", 1],
      ],
    );
  });
});

describe("remove", () => {
  const ctx = startTestServer();
  after(() => ctx.close());
  const a = api(ctx.baseUrl);

  it("moves an employee out of the directory and into the Trash with 30 days remaining", async () => {
    const id = await a.idOf("marcus.bell@example.com");
    const res = await a.remove(id);
    assert.equal(res.status, 204);

    assert.ok(!(await a.directory()).some((e) => e.email === "marcus.bell@example.com"));
    const trashed = (await a.trash()).find((e) => e.email === "marcus.bell@example.com");
    assert.equal(trashed?.days_remaining, 30);
  });
});

describe("restore", () => {
  const ctx = startTestServer();
  after(() => ctx.close());
  const a = api(ctx.baseUrl);

  it("returns a removed employee to the directory with their data unchanged", async () => {
    const before = (await a.directory()).find((e) => e.email === "priya.nair@example.com")!;
    await a.remove(before.id);

    const res = await a.restore(before.id);
    assert.equal(res.status, 200);

    const after = (await a.directory()).find((e) => e.email === "priya.nair@example.com");
    assert.deepEqual(after, before);
    assert.equal(after?.manager_name, "Sofia Marchetti");
    assert.ok(!(await a.trash()).some((e) => e.email === "priya.nair@example.com"));
  });

  it("returns 404 for someone who is not in the Trash", async () => {
    const res = await a.restore(await a.idOf("tomas.novak@example.com"));
    assert.equal(res.status, 404);
  });
});

describe("manager links", () => {
  const ctx = startTestServer();
  after(() => ctx.close());
  const a = api(ctx.baseUrl);

  it("keeps reports linked to a trashed manager and flags the manager as in the Trash", async () => {
    await a.remove(await a.idOf("sofia.marchetti@example.com"));

    const directory = await a.directory();
    const lena = directory.find((e) => e.email === "lena.fischer@example.com")!;
    assert.equal(lena.manager_name, "Sofia Marchetti");
    assert.equal(lena.manager_in_trash, 1);

    const tomas = directory.find((e) => e.email === "tomas.novak@example.com")!;
    assert.equal(tomas.manager_in_trash, 0);
  });

  it("delete forever removes the person and clears the manager link on their direct reports", async () => {
    const sofia = (await a.trash()).find((e) => e.email === "sofia.marchetti@example.com")!;
    const res = await a.deleteForever(sofia.id);
    assert.equal(res.status, 204);

    assert.ok(!(await a.trash()).some((e) => e.email === "sofia.marchetti@example.com"));
    assert.ok(!(await a.directory()).some((e) => e.email === "sofia.marchetti@example.com"));
    const directory = await a.directory();
    for (const report of ["lena.fischer", "marcus.bell", "priya.nair"]) {
      const e = directory.find((x) => x.email === `${report}@example.com`)!;
      assert.equal(e.manager_id, null, `${report} should have no manager`);
      assert.equal(e.manager_name, null);
    }
    assert.equal((await a.restore(sofia.id)).status, 404);
  });
});

describe("delete forever", () => {
  const ctx = startTestServer();
  after(() => ctx.close());
  const a = api(ctx.baseUrl);

  it("refuses to delete someone who is not in the Trash", async () => {
    const id = await a.idOf("omar.haddad@example.com");
    assert.equal((await a.deleteForever(id)).status, 404);
    assert.ok((await a.directory()).some((e) => e.email === "omar.haddad@example.com"));
  });
});

describe("non-numeric ids", () => {
  const ctx = startTestServer();
  after(() => ctx.close());

  it("return 404 from remove, restore and delete forever", async () => {
    for (const [method, path] of [["DELETE", "/api/employees/abc"], ["POST", "/api/employees/abc/restore"], ["DELETE", "/api/trash/abc"]]) {
      assert.equal((await fetch(ctx.baseUrl + path, { method })).status, 404, `${method} ${path}`);
    }
  });
});
