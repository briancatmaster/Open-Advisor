'use client'

import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type {
  AuditResult,
  UserProfile,
  PlannedSemester,
  PlannedCourse,
  ChatMessage,
  RankedCourse,
} from './types'

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

interface AppState {
  // ── Audit ────────────────────────────────────────────────────
  auditResult: AuditResult | null
  setAuditResult: (r: AuditResult) => void
  clearAudit: () => void

  // ── Profile ──────────────────────────────────────────────────
  profile: UserProfile | null
  setProfile: (p: UserProfile) => void

  // ── Planner ──────────────────────────────────────────────────
  semesters: PlannedSemester[]
  initSemesters: (startSeason: 'Fall' | 'Winter', startYear: number) => void
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
      setAuditResult: (r) => set({ auditResult: r }),
      clearAudit: () => set({ auditResult: null }),

      // ── Profile ────────────────────────────────────────────────
      profile: null,
      setProfile: (p) => set({ profile: p, priorityCourses: [] }),

      // ── Planner ────────────────────────────────────────────────
      semesters: [],
      initSemesters: (startSeason, startYear) =>
        set({ semesters: generateSemesters(startSeason, startYear, 8) }),

      addCourseToSemester: (semesterId, course) =>
        set((state) => ({
          semesters: state.semesters.map((s) =>
            s.id === semesterId && !s.courses.find((c) => c.code === course.code)
              ? { ...s, courses: [...s.courses, course] }
              : s
          ),
        })),

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
        const codes = new Set<string>()
        audit?.completedCourses.forEach((c) => codes.add(c.code))
        return codes
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
        priorityCourses: state.priorityCourses,
      }),
    }
  )
)
