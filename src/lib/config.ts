// src/lib/config.ts — school constants + derived settings.
import type { Section } from "../types";

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
  registrationFee: 10000,
  sessionLabel: "2026/2027",
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
    ] as const,
  },
};

// Public site imagery — replace any URL with your own photograph.
// Fallback gradients render automatically if a URL fails.
export const SITE_IMAGES = {
  hero: "https://images.unsplash.com/photo-1509062522246-3755977927d7?auto=format&fit=crop&w=1800&q=88",
  foundation: "https://images.unsplash.com/photo-1503676260728-1c00da094a0b?auto=format&fit=crop&w=900&q=88",
  secondary: "https://images.unsplash.com/photo-1427504494785-3a9ca7044f45?auto=format&fit=crop&w=900&q=88",
  higher: "https://images.unsplash.com/photo-1523240795612-9a054b0db644?auto=format&fit=crop&w=900&q=88",
} as const;

export type SiteImageKey = keyof typeof SITE_IMAGES;

export const SITE_IMAGE_FALLBACKS: Record<SiteImageKey | "founder", string> = {
  hero: "linear-gradient(135deg,#315b40,#102f21)",
  foundation: "linear-gradient(135deg,#e2eadf,#a8bea9)",
  secondary: "linear-gradient(135deg,#dce7df,#8fa995)",
  higher: "linear-gradient(135deg,#e9e1d1,#b9a77d)",
  founder: "linear-gradient(135deg,#e8e0cf,#b8a77f)",
};

export const SECTIONS: Section[] = [
  { id: "foundation", name: "Foundation", classes: ["Tamhid", "I'idad"], desc: "Reading, writing, and Qur'anic foundations." },
  { id: "secondary",  name: "Secondary",  classes: ["Thanawiyyah 1","Thanawiyyah 2","Thanawiyyah 3","Thanawiyyah 4","Thanawiyyah 5","Thanawiyyah 6"], desc: "Six years of structured study." },
  { id: "higher",     name: "Higher",     classes: ["Aliyyah 1","Aliyyah 2","Aliyyah 3","Aliyyah 4"], desc: "Advanced study. Opening when the school authorises it.", inactive: true },
];

export const ALL_CLASSES = SECTIONS.filter(s => !s.inactive).flatMap(s => s.classes);

export const TRANSCRIPT_GROUPS: Record<string, string[]> = {
  "Foundation":       ["Tamhid", "I'idad"],
  "Junior Secondary": ["Thanawiyyah 1", "Thanawiyyah 2", "Thanawiyyah 3"],
  "Senior Secondary": ["Thanawiyyah 4", "Thanawiyyah 5", "Thanawiyyah 6"],
  "Higher":           ["Aliyyah 1", "Aliyyah 2", "Aliyyah 3", "Aliyyah 4"],
};

// ═══ Promotion & graduation (Batch 3) ═══
// Promotion covers all 12 classes. Higher (Aliyyah 1–4) is entry-via-promotion only —
// you reach it from Thanawiyyah 6, never by direct registration.
// Kept separate from ALL_CLASSES so that new assessments and StudentForm enrollment
// remain scoped to the 8 active classes until Higher is officially opened for direct intake.
export const PROMOTION_CLASSES = [
  "Tamhid", "I'idad",
  "Thanawiyyah 1", "Thanawiyyah 2", "Thanawiyyah 3",
  "Thanawiyyah 4", "Thanawiyyah 5", "Thanawiyyah 6",
  "Aliyyah 1", "Aliyyah 2", "Aliyyah 3", "Aliyyah 4",
] as const;

// Classes at which promotion triggers automatic stage graduation.
export const GRADUATION_BOUNDARIES = ["I'idad", "Thanawiyyah 6", "Aliyyah 4"] as const;
export type GraduationBoundary = typeof GRADUATION_BOUNDARIES[number];

// Class -> milestone label when graduation happens at that class.
export const GRADUATION_MILESTONES: Record<string, "Foundation" | "Secondary" | "Higher"> = {
  "I'idad": "Foundation",
  "Thanawiyyah 6": "Secondary",
  "Aliyyah 4": "Higher",
};

// Class -> next class after promotion. null = graduate from school (no further enrollment).
export const NEXT_CLASS: Record<string, string | null> = {
  "Tamhid": "I'idad",
  "I'idad": "Thanawiyyah 1",
  "Thanawiyyah 1": "Thanawiyyah 2",
  "Thanawiyyah 2": "Thanawiyyah 3",
  "Thanawiyyah 3": "Thanawiyyah 4",
  "Thanawiyyah 4": "Thanawiyyah 5",
  "Thanawiyyah 5": "Thanawiyyah 6",
  "Thanawiyyah 6": "Aliyyah 1",
  "Aliyyah 1": "Aliyyah 2",
  "Aliyyah 2": "Aliyyah 3",
  "Aliyyah 3": "Aliyyah 4",
  "Aliyyah 4": null,
};
