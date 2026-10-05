export type Employee = {
  id: number;
  first_name: string;
  last_name: string;
  email: string;
  phone: string | null;
  job_title: string;
  department: string;
  manager_id: number | null;
  manager_name: string | null;
  status: "active" | "on_leave" | "terminated";
  hire_date: string;
  termination_date: string | null;
  deleted_at: string | null;
};
