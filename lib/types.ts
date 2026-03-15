// ─── Core Course Entity ───────────────────────────────────────────────────────
export interface Course {
  code: string                    // "EECS 281"
  name: string                    // "Data Structures and Algorithms"
  credits: number                 // 4
  department: string              // "EECS"
  prereqs: string[]               // hard prereqs
  rawPrerequisites: string
  rawAdvisoryPrerequisites: string
  advisoryPrereqs: string[]       // recommended but not enforced
  prereqHardCodes: string[]       // parsed from free-text prereq fields
  prereqAdvisoryText: string      // residual non-course prereq text
  estimatedHoursPerWeek: number   // from Atlas data
  offeredFall: boolean
  offeredWinter: boolean
  offeredSummer: boolean
  difficulty: number              // 1–5
  avgGrade: string                // "B+", "B", "A-"
  classSize: number               // approximate enrollment
  professors: string[]
  description: string
  tags: string[]                  // ["algorithms", "required", "upper-level"]
  source: "master"
  atlasUrl: string
  topDegrees: string
}

// ─── Audit Parsing ────────────────────────────────────────────────────────────
export interface AuditResult {
  studentName: string
  major: string
  completedCourses: CompletedCourse[]
  inProgressCourses: InProgressCourse[]
  remainingCourses: RemainingCourse[]
  incompleteRequirements: IncompleteRequirement[]
  rawText: string
  parseConfidence: number         // 0–1
}

export interface InProgressCourse {
  code: string
  name: string
  credits: number
  term: string
}

export interface IncompleteRequirement {
  label: string
  details: string[]
}

export interface CompletedCourse {
  code: string
  name: string
  credits: number
  grade: string
  term: string                    // "Fall 2023"
}

export interface RemainingCourse {
  code: string
  name: string
  credits: number
  category: string                // "Required", "Elective", "Cognate"
}

// ─── User Profile ─────────────────────────────────────────────────────────────
export type AcademicYear = "Freshman" | "Sophomore" | "Junior" | "Senior"
export type DifficultyPreference = "light" | "balanced" | "heavy"
export type HomeSchool =
  | "LSA"
  | "Engineering"
  | "Ross"
  | "Nursing"
  | "Kinesiology"
  | "Stamps"
  | "Taubman"
  | "UMSI"
  | "SMTD"
  | "Other"

export type CareerGoal =
  | "software-engineering"
  | "machine-learning"
  | "data-science"
  | "quantitative-finance"
  | "robotics"
  | "research-phd"
  | "product-management"
  | "undecided"

export interface UserProfile {
  name: string
  year: AcademicYear
  majors: string[]
  homeSchool: HomeSchool
  intendedProgram?: string
  careerGoal: string              // free-text: "data scientist at a hedge fund", etc.
  interests: string               // free-text: "minoring in stats, love algorithms"
  difficultyPreference: DifficultyPreference
  targetGradSemester: string      // "Winter 2026"
  currentSeason: "Fall" | "Winter" | "Summer"
  currentYear: number
}

// ─── Semester Planner ─────────────────────────────────────────────────────────
export interface PlannedSemester {
  id: string                      // "fall-2025"
  label: string                   // "Fall 2025"
  season: "Fall" | "Winter" | "Summer"
  year: number
  courses: PlannedCourse[]
}

export interface PlannedCourse {
  code: string
  name: string
  credits: number
  atlasUrl?: string
  prereqs?: string[]      // flat OR list (legacy/fallback)
  prereqGroups?: string[][] // AND-of-OR: [[EECS 203, MATH 465], [EECS 280]] — all groups must be satisfied
}

// ─── Course Ranking ───────────────────────────────────────────────────────────
export interface RankedCourse {
  course: Course
  score: number
  scoreBreakdown: ScoreBreakdown
  prereqStatus: PrereqStatus
  priorityNote?: string
  prioritySource?: "system" | "agent" | "user"
}

export interface ScoreBreakdown {
  careerRelevance: number         // 0–5
  prereqReady: number             // 0–3
  offeringMatch: number           // 0–2
  requirementPriority: number     // 0–3
}

export type PrereqStatus = "ready" | "partial" | "locked"

// ─── Chat / Advising ──────────────────────────────────────────────────────────
export interface ChatMessage {
  id: string
  role: "user" | "assistant"
  content: string
  timestamp: number
}

export interface SchoolWarning {
  id: string
  level: "info" | "warn" | "critical"
  message: string
}
