'use client'

import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type {
  AuditResult,
  UserProfile,
  PlannedSemester,
  PlannedCourse,
  PastSemester,
  ChatMessage,
  RankedCourse,
} from './types'
import { expandWithEquivalencies } from './ap-equivalencies'
// Term helpers (duplicated here to avoid importing server-only audit-parser)
const TERM_ABBR_TO_LABEL: Record<string, string> = {
  FA: 'Fall', WN: 'Winter', SS: 'Summer', SP: 'Spring', SU: 'Summer',
}
function termAbbrToLabel(termStr: string): string {
  const [abbr, year] = termStr.split(' ')
  return `${TERM_ABBR_TO_LABEL[abbr] ?? abbr} ${year}`
}
function seasonFromAbbr(abbr: string): 'Fall' | 'Winter' | 'Summer' {
  const map: Record<string, 'Fall' | 'Winter' | 'Summer'> = {
    FA: 'Fall', WN: 'Winter', SS: 'Summer', SP: 'Winter', SU: 'Summer',
  }
  return map[abbr] ?? 'Fall'
}

// ── Helper: generate semester sequence ───────────────────────
function generateSemesters(
  startSeason: 'Fall' | 'Winter',
  startYear: number,
  count = 4
): PlannedSemester[] {
  const semesters: PlannedSemester[] = []
  let season = startSeason
  let year = startYear
  for (let i = 0; i < count; i++) {
    semesters.push({
      id: `${season.toLowerCase()}-${year}`,
      label: `${season} ${year}`,
      season,
      year,
      courses: [],
    })
    if (season === 'Fall') {
      season = 'Winter'
      year += 1
    } else {
      season = 'Fall'
    }
  }
  return semesters
}

// ── Helper: build past semesters from audit data ─────────────
// TE (test/AP) and TR (transfer) credits go into a special "AP & Transfer Credit"
// section since they aren't tied to a real semester. EN/IT/OT completed courses
// go into their actual term. IP courses go into their term marked as current.
function buildPastSemesters(audit: AuditResult): PastSemester[] {
  const termMap = new Map<string, PastSemester>()

  // Bucket for AP/test/transfer credits (not a real semester)
  const priorCredit: PastSemester = {
    id: 'past-prior-credit',
    label: 'AP & Transfer Credit',
    season: 'Fall',
    year: 0, // sorts first
    courses: [],
    isCurrent: false,
  }

  function getOrCreate(termStr: string): PastSemester {
    if (termMap.has(termStr)) return termMap.get(termStr)!
    const [abbr, yearStr] = termStr.split(' ')
    const sem: PastSemester = {
      id: `past-${abbr.toLowerCase()}-${yearStr}`,
      label: termAbbrToLabel(termStr),
      season: seasonFromAbbr(abbr),
      year: parseInt(yearStr),
      courses: [],
      isCurrent: false,
    }
    termMap.set(termStr, sem)
    return sem
  }

  for (const c of audit.completedCourses) {
    // TE (test/AP) and TR (transfer) credits go in the prior credit bucket
    if (c.courseType === 'TE' || c.courseType === 'TR') {
      priorCredit.courses.push(c)
    } else {
      getOrCreate(c.term).courses.push(c)
    }
  }
  // IP courses are NOT included here — they go into the planning semesters
  // as draggable PlannedCourse cards so students can drop/move them.

  // Sort chronologically; prior credit first
  const seasonOrder: Record<string, number> = { Winter: 0, Summer: 1, Fall: 2 }
  const semesters = Array.from(termMap.values()).sort(
    (a, b) => a.year * 10 + (seasonOrder[a.season] ?? 0) - (b.year * 10 + (seasonOrder[b.season] ?? 0))
  )

  // Only include prior credit section if it has courses
  if (priorCredit.courses.length > 0) {
    semesters.unshift(priorCredit)
  }

  return semesters
}

interface AppState {
  // ── Audit ────────────────────────────────────────────────────
  auditResult: AuditResult | null
  setAuditResult: (r: AuditResult) => void
  clearAudit: () => void

  // ── Profile ──────────────────────────────────────────────────
  profile: UserProfile | null
  setProfile: (p: UserProfile) => void

  // ── Past Semesters (read-only, from audit) ──────────────────
  pastSemesters: PastSemester[]
  setPastSemesters: (semesters: PastSemester[]) => void

  // ── Planner ──────────────────────────────────────────────────
  semesters: PlannedSemester[]
  initSemesters: (startSeason: 'Fall' | 'Winter', startYear: number, count?: number) => void
  addCourseToSemester: (semesterId: string, course: PlannedCourse) => void
  removeCourseFromSemester: (semesterId: string, courseCode: string) => void
  moveCourse: (courseCode: string, fromId: string, toId: string) => void

  // ── Chat ─────────────────────────────────────────────────────
  messages: ChatMessage[]
  addMessage: (msg: ChatMessage) => void
  updateLastMessage: (content: string) => void
  clearMessages: () => void

  // ── Priority Course List ─────────────────────────────────────
  priorityCourses: RankedCourse[]
  setPriorityCourses: (courses: RankedCourse[]) => void
  upsertPriorityCourse: (course: RankedCourse) => void
  upsertPriorityCourses: (courses: RankedCourse[]) => void
  removePriorityCourse: (courseCode: string) => void

  // ── Derived helpers ───────────────────────────────────────────
  getCompletedCourseCodes: () => Set<string>
  getPlannedCourseCodes: () => Set<string>
}

export const useStore = create<AppState>()(
  persist(
    (set, get) => ({
      // ── Audit ──────────────────────────────────────────────────
      auditResult: null,
      setAuditResult: (r) => set({ auditResult: r, pastSemesters: buildPastSemesters(r) }),
      clearAudit: () => set({ auditResult: null, pastSemesters: [] }),

      // ── Profile ────────────────────────────────────────────────
      profile: null,
      setProfile: (p) => set({ profile: p, priorityCourses: [] }),

      // ── Past Semesters ──────────────────────────────────────────
      pastSemesters: [],
      setPastSemesters: (semesters) => set({ pastSemesters: semesters }),

      // ── Planner ────────────────────────────────────────────────
      semesters: [],
      initSemesters: (startSeason, startYear, count = 8) =>
        set((state) => {
          const semesters = generateSemesters(startSeason, startYear, count)
          // Auto-populate IP (in-progress) courses into their matching semester
          const ipCourses = state.auditResult?.inProgressCourses ?? []
          for (const c of ipCourses) {
            const [abbr, yearStr] = c.term.split(' ')
            const semId = `${seasonFromAbbr(abbr).toLowerCase()}-${yearStr}`
            const sem = semesters.find((s) => s.id === semId)
            if (sem && !sem.courses.some((x) => x.code === c.code)) {
              sem.courses.push({ code: c.code, name: c.name, credits: c.credits })
            }
          }
          return { semesters }
        }),

      addCourseToSemester: (semesterId, course) =>
        set((state) => {
          // Prevent duplicates across ALL semesters, not just the target
          const alreadyPlanned = state.semesters.some((s) =>
            s.courses.some((c) => c.code === course.code)
          )
          if (alreadyPlanned) return state
          return {
            semesters: state.semesters.map((s) =>
              s.id === semesterId ? { ...s, courses: [...s.courses, course] } : s
            ),
          }
        }),

      removeCourseFromSemester: (semesterId, courseCode) =>
        set((state) => ({
          semesters: state.semesters.map((s) =>
            s.id === semesterId
              ? { ...s, courses: s.courses.filter((c) => c.code !== courseCode) }
              : s
          ),
        })),

      moveCourse: (courseCode, fromId, toId) => {
        const state = get()
        const fromSem = state.semesters.find((s) => s.id === fromId)
        if (!fromSem) return
        const course = fromSem.courses.find((c) => c.code === courseCode)
        if (!course) return
        set((s) => ({
          semesters: s.semesters.map((sem) => {
            if (sem.id === fromId) {
              return { ...sem, courses: sem.courses.filter((c) => c.code !== courseCode) }
            }
            if (sem.id === toId && !sem.courses.find((c) => c.code === courseCode)) {
              return { ...sem, courses: [...sem.courses, course] }
            }
            return sem
          }),
        }))
      },

      // ── Chat ────────────────────────────────────────────────────
      messages: [],
      addMessage: (msg) => set((s) => ({ messages: [...s.messages, msg] })),
      updateLastMessage: (content) =>
        set((s) => {
          const msgs = [...s.messages]
          if (msgs.length === 0) return s
          msgs[msgs.length - 1] = { ...msgs[msgs.length - 1], content }
          return { messages: msgs }
        }),
      clearMessages: () => set({ messages: [] }),

      // ── Priority Course List ────────────────────────────────────
      priorityCourses: [],
      setPriorityCourses: (courses) =>
        set({ priorityCourses: [...courses].sort((a, b) => b.score - a.score) }),
      upsertPriorityCourse: (course) =>
        set((state) => {
          const existingIdx = state.priorityCourses.findIndex((c) => c.course.code === course.course.code)
          const next =
            existingIdx >= 0
              ? state.priorityCourses.map((c, idx) => (idx === existingIdx ? course : c))
              : [...state.priorityCourses, course]
          return { priorityCourses: next.sort((a, b) => b.score - a.score) }
        }),
      upsertPriorityCourses: (courses) =>
        set((state) => {
          const map = new Map(state.priorityCourses.map((c) => [c.course.code, c]))
          for (const course of courses) map.set(course.course.code, course)
          return { priorityCourses: Array.from(map.values()).sort((a, b) => b.score - a.score) }
        }),
      removePriorityCourse: (courseCode) =>
        set((state) => ({
          priorityCourses: state.priorityCourses.filter((c) => c.course.code !== courseCode),
        })),

      // ── Derived ─────────────────────────────────────────────────
      getCompletedCourseCodes: () => {
        const audit = get().auditResult
        const rawCodes: string[] = []
        audit?.completedCourses.forEach((c) => rawCodes.push(c.code))
        audit?.inProgressCourses.forEach((c) => rawCodes.push(c.code))
        return expandWithEquivalencies(rawCodes)
      },
      getPlannedCourseCodes: () => {
        const codes = new Set<string>()
        get().semesters.forEach((s) => s.courses.forEach((c) => codes.add(c.code)))
        return codes
      },
    }),
    {
      name: 'degree-advisor-storage',
      // Only persist audit result, profile, semesters — not messages
      partialize: (state) => ({
        auditResult: state.auditResult,
        profile: state.profile,
        semesters: state.semesters,
        pastSemesters: state.pastSemesters,
        priorityCourses: state.priorityCourses,
      }),
    }
  )
)
