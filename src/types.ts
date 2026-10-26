// src/types.ts — all TypeScript types. Compile-time only.

export type Section = {
  id: string;
  name: string;
  classes: string[];
  desc: string;
  inactive?: boolean;
};

export type Student = {
  id: string;
  reg_no: string;
  name: string;
  section: string;
  class_name: string;
  mode: "online" | "physical";
  status: "active" | "repeating" | "withdrawn" | "transferred" | "graduated";
  joined: string;
  dob?: string | null;
  gender?: "male" | "female" | null;
  nin?: string | null;
  guardian_name?: string | null;
  guardian_phone?: string | null;
  student_phone?: string | null;
  address?: string | null;
};

export type Assessment = {
  id: string;
  class_name: string;
  subject: string;
  label: string;
  max_marks: number;
  session_label: string;
  semester: number;
};

export type Mark = {
  id: string;
  assessment_id: string;
  student_id: string;
  value: number | null;
  updated_at: string;
};

export type Exam = {
  id: string;
  class_name: string;
  subject: string;
  student_id: string;
  session_label: string;
  semester: number;
  value: number | null;
};

export type Fee = {
  id: string;
  student_id: string;
  year: string;
  amount: number;
  status: "unpaid" | "partial" | "paid" | "scholarship";
};

export type FeePayment = {
  id: string;
  student_id: string;
  year: string;
  amount: number;
  method: "cash" | "transfer" | "pos" | "other";
  reference: string | null;
  note: string | null;
  paid_on: string;
  receipt_no: string | null;
  recorded_by: string | null;
  created_at: string;
};

export type Material = {
  id: string;
  title: string;
  class_name: string;
  subject: string;
  note: string | null;
  order_num: number | null;
  kind: "file" | "link";
  url: string | null;
  storage_path: string | null;
  file_name: string | null;
  file_size: number | null;
  published: boolean;
  created_at: string;
};

export type Grade = { min: number; label: string; tone: string; code: string };

export type SubjectResult = {
  subject: string;
  assessmentPct: number | null;
  examPct: number | null;
  final: number | null;
  grade: Grade;
  count: number;
};


export type Enrollment = {
  id: string;
  student_id: string;
  class_name: string;
  session_label: string;
  status: "active" | "repeating" | "withdrawn" | "graduated" | "completed";
  started: string | null;
  ended: string | null;
};
