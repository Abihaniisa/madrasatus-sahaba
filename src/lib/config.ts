import type { Section } from "./types";

export const CONFIG = {
  name: "Madrasatus Sahaba Li Tahfizul Qur'an",
  short: "Madrasatus Sahaba",
  sub: "Li Tahfizul Qur'an",
  code: "MS",
  founded: "2020",
  founder: "Sheikh Abdullahi Babayo",
  founderRole: "Founder & Spiritual Guide",
  founderImage: "https://cxjdisguniygctcznpjs.supabase.co/storage/v1/object/public/images/Sheikh%20Abdullahi%20Babayo.jpg",
  whatsapp: "2348000000000",
  assessmentMax: 10,
  examMax: 100,
  assessmentWeight: 0.30,
  examWeight: 0.70,
  regYear: "2026",
  registrationFee: 5000,
  sessionLabel: "2026/2027",
  semesterLabel: "Semester 1",
  studentLoginEnabled: true,
  builder: {
    name: "Abihani Isa",
    fullName: "Isa Yahya Bayero",
    phone: "2347013927783",
    email: "abihaniisa@gmail.com",
    image: "https://cxjdisguniygctcznpjs.supabase.co/storage/v1/object/public/images/Isa%20Yahya%20Bayero.jpg",
    role: "Founder, Abihani Express · Founder, Veritas",
    bio: "A student at Madrasatus Sahaba Li Tahfizul Qur'an. Founder of Abihani Express and Veritas.",
    projects: [
      { name: "Abihani Express", url: "https://abihaniexpress.com.ng" },
      { name: "Veritas",         url: "https://veritas-verify.vercel.app" },
    ],
    prayer: "Sadaqatul jariya. Built sincerely for the sake of Allah alone. If this benefits you — or if you simply pass by — please make du'a that Allah grants me Jannatul Firdaus.",
    regNo: "2026/MS/001",
  },
  grades: [
    { min: 75, label: "Distinction", tone: "success", code: "A" },
    { min: 60, label: "Credit",      tone: "primary", code: "B" },
    { min: 50, label: "Pass",        tone: "info",    code: "C" },
    { min: 0,  label: "Fail",        tone: "danger",  code: "D" },
  ],
  subjects: ["Qur'an", "Hadith", "Fiqh", "Arabic", "Tajweed"],
  calendar: {
    sessionStart: "2026-03-28",
    ramadanStart: "2027-02-20",
    blocks: [
      { type: "teaching", weeks: 18, label: "First Semester" },
      { type: "exam",     weeks: 1,  label: "First Semester Exam" },
      { type: "holiday",  weeks: 1,  label: "First Semester Break" },
      { type: "teaching", weeks: 18, label: "Second Semester" },
      { type: "exam",     weeks: 1,  label: "Second Semester Exam" },
      { type: "holiday",  weeks: 1,  label: "Second Semester Break" },
      { type: "daura",    weeks: 6,  label: "Daura" },
      { type: "holiday",  weeks: 1,  label: "Post-Daura Holiday" },
      { type: "ramadan",  weeks: 5,  label: "Ramadan" },
    ] as const,
  },
};

export const SECTIONS: Section[] = [
  { id: "foundation", name: "Foundation", classes: ["Tamhid", "I'idad"], desc: "Reading, writing, and Qur'anic foundations." },
  { id: "secondary",  name: "Secondary",  classes: ["Thanawiyyah 1","Thanawiyyah 2","Thanawiyyah 3","Thanawiyyah 4","Thanawiyyah 5","Thanawiyyah 6"], desc: "Six years of structured study." },
  { id: "higher",     name: "Higher",     classes: ["Aliyyah 1","Aliyyah 2","Aliyyah 3","Aliyyah 4"], desc: "Advanced study. Opening when the school authorises it.", inactive: true },
];

export const ALL_CLASSES = SECTIONS.filter(s => !s.inactive).flatMap(s => s.classes);

export const TRANSCRIPT_GROUPS: Record<string, string[]> = {
  "Foundation":         ["Tamhid", "I'idad"],
  "Junior Secondary":   ["Thanawiyyah 1", "Thanawiyyah 2", "Thanawiyyah 3"],
  "Senior Secondary":   ["Thanawiyyah 4", "Thanawiyyah 5", "Thanawiyyah 6"],
  "Higher":             ["Aliyyah 1", "Aliyyah 2", "Aliyyah 3", "Aliyyah 4"],
};
