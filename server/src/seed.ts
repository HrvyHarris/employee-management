import { fileURLToPath } from "node:url";
import { mkdirSync } from "node:fs";
import { dirname } from "node:path";
import { DB_PATH, openDb, type Db } from "./db.ts";

// All data below is fake. Emails use the reserved example.com domain and phones use the 555-01xx fiction range.
// Termination, Trash and time off dates are relative to today so the demo always looks current.

const DAY = 86_400_000;
const daysFromNow = (n: number) => new Date(Date.now() + n * DAY);
const isoDate = (n: number) => daysFromNow(n).toISOString().slice(0, 10);
const isoDateTime = (n: number) => daysFromNow(n).toISOString().slice(0, 19).replace("T", " ");

type Seed = {
  first: string;
  last: string;
  title: string;
  dept: string;
  manager?: string; // email of the manager (must appear earlier in the list)
  hired: string;
  status?: "active" | "on_leave" | "terminated";
  terminatedDaysAgo?: number;
  trashedDaysAgo?: number;
};

const email = (s: Seed) => `${s.first}.${s.last}`.toLowerCase().replace(/[^a-z.]/g, "") + "@example.com";

const E = (first: string, last: string, title: string, dept: string, manager: string | undefined, hired: string, extra: Partial<Seed> = {}): Seed =>
  ({ first, last, title, dept, manager, hired, ...extra });

const EMPLOYEES: Seed[] = [
  E("Amara", "Okafor", "Chief Executive Officer", "Executive", undefined, "2018-03-01"),
  E("Daniel", "Whitfield", "VP of Engineering", "Engineering", "amara.okafor@example.com", "2019-01-14"),
  E("Rachel", "Morgan", "VP of Sales", "Sales", "amara.okafor@example.com", "2019-04-08"),
  E("Victor", "Reyes", "Head of Marketing", "Marketing", "amara.okafor@example.com", "2019-09-30"),
  E("Naomi", "Brooks", "Head of People", "People", "amara.okafor@example.com", "2019-06-17"),
  E("George", "Papadakis", "Finance Manager", "Finance", "amara.okafor@example.com", "2020-01-20"),
  E("Callum", "Reid", "Support Lead", "Support", "amara.okafor@example.com", "2020-10-05"),
  E("Sofia", "Marchetti", "Engineering Manager", "Engineering", "daniel.whitfield@example.com", "2020-06-01"),
  E("Kenji", "Watanabe", "Engineering Manager", "Engineering", "daniel.whitfield@example.com", "2020-09-14"),
  E("Lena", "Fischer", "Senior Software Engineer", "Engineering", "sofia.marchetti@example.com", "2021-02-08"),
  E("Marcus", "Bell", "Software Engineer", "Engineering", "sofia.marchetti@example.com", "2022-05-16"),
  E("Priya", "Nair", "Software Engineer", "Engineering", "sofia.marchetti@example.com", "2023-01-09"),
  E("Hugo", "Larsen", "Software Engineer", "Engineering", "sofia.marchetti@example.com", "2022-09-12", { trashedDaysAgo: 29 }),
  E("Tomas", "Novak", "Software Engineer", "Engineering", "kenji.watanabe@example.com", "2022-10-03"),
  E("Hannah", "Cole", "QA Engineer", "Engineering", "kenji.watanabe@example.com", "2023-07-17", { status: "on_leave" }),
  E("Omar", "Haddad", "DevOps Engineer", "Engineering", "kenji.watanabe@example.com", "2021-11-22"),
  E("Ivy", "Chen", "Software Engineer", "Engineering", "kenji.watanabe@example.com", "2024-03-04"),
  E("Jorge", "Alvarez", "Sales Manager", "Sales", "rachel.morgan@example.com", "2020-02-17"),
  E("Chloe", "Dubois", "Account Executive", "Sales", "jorge.alvarez@example.com", "2021-08-23"),
  E("Ben", "Carter", "Account Executive", "Sales", "jorge.alvarez@example.com", "2022-03-14"),
  E("Aisha", "Khan", "Sales Development Rep", "Sales", "jorge.alvarez@example.com", "2023-09-11"),
  E("Liam", "O'Brien", "Sales Development Rep", "Sales", "jorge.alvarez@example.com", "2024-02-19"),
  E("Patrick", "Hale", "Sales Development Rep", "Sales", "jorge.alvarez@example.com", "2023-05-08", { trashedDaysAgo: 3 }),
  E("Nora", "Lindqvist", "Account Executive", "Sales", "rachel.morgan@example.com", "2021-05-03", { status: "terminated", terminatedDaysAgo: 180 }),
  E("Emma", "Johansson", "Content Marketer", "Marketing", "victor.reyes@example.com", "2022-01-10"),
  E("Raj", "Patel", "Growth Marketer", "Marketing", "victor.reyes@example.com", "2022-08-29"),
  E("Grace", "Kim", "Designer", "Marketing", "victor.reyes@example.com", "2023-04-03"),
  E("Isabel", "Moreau", "Designer", "Marketing", "victor.reyes@example.com", "2022-04-25", { trashedDaysAgo: 20 }),
  E("Felix", "Brandt", "Marketing Analyst", "Marketing", "victor.reyes@example.com", "2021-10-04", { status: "terminated", terminatedDaysAgo: 90 }),
  E("Sam", "Ortega", "HR Generalist", "People", "naomi.brooks@example.com", "2021-03-15"),
  E("Tara", "Singh", "Recruiter", "People", "naomi.brooks@example.com", "2022-11-07"),
  E("Yuki", "Tanaka", "Accountant", "Finance", "george.papadakis@example.com", "2021-09-06"),
  E("Elena", "Petrova", "Financial Analyst", "Finance", "george.papadakis@example.com", "2023-02-13", { status: "on_leave" }),
  E("Zara", "Ahmed", "Support Specialist", "Support", "callum.reid@example.com", "2022-06-20"),
  E("Diego", "Santos", "Support Specialist", "Support", "callum.reid@example.com", "2023-10-23"),
  E("Mei", "Lin", "Support Specialist", "Support", "callum.reid@example.com", "2024-06-03", { status: "terminated", terminatedDaysAgo: 40 }),
  E("Oscar", "Lund", "Support Specialist", "Support", "callum.reid@example.com", "2021-12-01", { status: "terminated", terminatedDaysAgo: 400 }),
];

// [email, type, start offset in days from today, end offset in days from today]
const TIME_OFF: [string, "pto" | "sick" | "other", number, number][] = [
  ["hannah.cole@example.com", "sick", -10, 14],
  ["elena.petrova@example.com", "other", -30, 60],
  ["grace.kim@example.com", "pto", -1, 2],
  ["lena.fischer@example.com", "pto", -40, -36],
  ["marcus.bell@example.com", "pto", 20, 24],
  ["omar.haddad@example.com", "sick", -15, -14],
  ["chloe.dubois@example.com", "pto", -90, -86],
];

// Resets the database to the known demo dataset. Safe to run repeatedly.
export function seed(db: Db) {
  const insertEmployee = db.prepare(
    `INSERT INTO employees (first_name, last_name, email, phone, job_title, department, manager_id, status, hire_date, termination_date, deleted_at)
     VALUES (@first, @last, @email, @phone, @title, @dept, @managerId, @status, @hired, @terminationDate, @deletedAt)`,
  );
  const insertTimeOff = db.prepare(
    "INSERT INTO time_off (employee_id, type, start_date, end_date) VALUES (?, ?, ?, ?)",
  );

  db.transaction(() => {
    db.exec("DELETE FROM time_off; DELETE FROM employees; DELETE FROM sqlite_sequence;");
    const ids = new Map<string, number>();
    EMPLOYEES.forEach((s, i) => {
      const result = insertEmployee.run({
        first: s.first,
        last: s.last,
        email: email(s),
        phone: `+1 555-01${String(i).padStart(2, "0")}`,
        title: s.title,
        dept: s.dept,
        managerId: s.manager ? ids.get(s.manager) : null,
        status: s.status ?? "active",
        hired: s.hired,
        terminationDate: s.terminatedDaysAgo === undefined ? null : isoDate(-s.terminatedDaysAgo),
        deletedAt: s.trashedDaysAgo === undefined ? null : isoDateTime(-s.trashedDaysAgo),
      });
      ids.set(email(s), Number(result.lastInsertRowid));
    });
    for (const [who, type, start, end] of TIME_OFF) insertTimeOff.run(ids.get(who), type, isoDate(start), isoDate(end));
  })();
}

// `npm run seed`
if (process.argv[1] === fileURLToPath(import.meta.url)) {
  mkdirSync(dirname(DB_PATH), { recursive: true });
  const db = openDb(DB_PATH);
  seed(db);
  const { n } = db.prepare("SELECT COUNT(*) AS n FROM employees").get() as { n: number };
  console.log(`Seeded ${n} employees into ${DB_PATH}`);
}
