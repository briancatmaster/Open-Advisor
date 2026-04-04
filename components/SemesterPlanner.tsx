'use client'

import { useState } from 'react'
import { useDraggable, useDroppable, useDndMonitor } from '@dnd-kit/core'
import { Trash2, AlertTriangle, ChevronLeft, ChevronRight, Calendar, GripVertical, Lock, Download, ShieldCheck } from 'lucide-react'
import { useStore } from '@/lib/store'
import { useShallow } from 'zustand/react/shallow'
import { expandWithEquivalencies } from '@/lib/ap-equivalencies'
import type { PlannedCourse, PlannedSemester, PastSemester, CompletedCourse } from '@/lib/types'

// Normalize a course code for comparison: uppercase, insert space between dept and number.
// e.g. "MATH116" → "MATH 116", "math 116" → "MATH 116"
function normCode(code: string): string {
  return code.toUpperCase().trim().replace(/^([A-Z]+)(\d)/, '$1 $2')
}

const COURSE_CODE_RE = /^[A-Z]{2,8}\s\d{3}[A-Z]?$/
const CONJUNCTIONS = new Set(['OR', 'AND', 'OF', 'THE', 'IN', 'AT', 'TO', 'A', 'AN', 'NO', 'OP'])

function isValidCourseCode(p: string): boolean {
  if (!COURSE_CODE_RE.test(p)) return false
  const dept = p.split(' ')[0]
  return !CONJUNCTIONS.has(dept)
}

// Returns map of courseCode → unsatisfied AND groups (each group is an OR list).
// All returned groups need at least one prereq satisfied; anything returned is missing.
function computePrereqViolations(
  semesters: PlannedSemester[],
  completedCodes: Set<string>
): Map<string, string[][]> {
  const violations = new Map<string, string[][]>()

  for (let i = 0; i < semesters.length; i++) {
    const available = new Set<string>(Array.from(completedCodes).map(normCode))
    for (let j = 0; j < i; j++) {
      semesters[j].courses.forEach((c) => available.add(normCode(c.code)))
    }

    for (const course of semesters[i].courses) {
      const courseKey = normCode(course.code)

      // Prefer prereqGroups (AND-of-OR); fall back to flat prereqs as single OR group
      const groups: string[][] = course.prereqGroups && course.prereqGroups.length > 0
        ? course.prereqGroups
        : course.prereqs && course.prereqs.length > 0
          ? [course.prereqs]
          : []

      if (groups.length === 0) continue

      const unsatisfied = groups
        .map((group) => group.map(normCode).filter((p) => isValidCourseCode(p) && p !== courseKey))
        .filter((group) => group.length > 0)
        .filter((group) => !group.some((p) => available.has(p)))  // OR logic per group

      if (unsatisfied.length > 0) {
        violations.set(courseKey, unsatisfied)
      }
    }
  }
  return violations
}

const CREDIT_WARN = 18
const CREDIT_DANGER = 20

const SEASON_COLORS = {
  Fall: 'linear-gradient(90deg, #f59e0b 0%, #f97316 100%)',
  Winter: 'linear-gradient(90deg, #60a5fa 0%, #22d3ee 100%)',
  Summer: 'linear-gradient(90deg, #4ade80 0%, #10b981 100%)',
  Prior: 'linear-gradient(90deg, #a78bfa 0%, #8b5cf6 100%)',
  Default: 'linear-gradient(90deg, #9ca3af 0%, #6b7280 100%)',
}

function atlasUrl(course: PlannedCourse): string {
  if (course.atlasUrl) return course.atlasUrl
  const compact = course.code.replace(/\s+/g, '')
  return `https://atlas.ai.umich.edu/courses/${encodeURIComponent(compact)}/`
}

// ── Read-only past semester column ───────────────────────────
function PastSemesterColumn({ semester, compact = false }: { semester: PastSemester; compact?: boolean }) {
  const isPrior = semester.id === 'past-prior-credit'
  const normalizedSeason = isPrior ? 'Prior' : (semester.season ?? '').toString().trim() as keyof typeof SEASON_COLORS
  const headerGradient = SEASON_COLORS[normalizedSeason] ?? SEASON_COLORS.Default
  const totalCredits = semester.courses.reduce((s, c) => s + c.credits, 0)

  return (
    <div className="flex flex-col min-h-0 rounded-2xl overflow-hidden border bg-gray-50/60 border-gray-200 opacity-75">
      <div className={compact ? 'p-2' : 'p-3'} style={{ backgroundImage: headerGradient }}>
        <div className="flex items-center gap-1">
          <p className="text-xs font-bold text-white truncate">{semester.label}</p>
          {semester.isCurrent ? (
            <span className="text-[10px] bg-white/30 px-1.5 py-0.5 rounded text-white font-medium ml-auto shrink-0">Current</span>
          ) : (
            <Lock className="w-3 h-3 text-white/60 ml-auto shrink-0" />
          )}
        </div>
        <span className="text-xs text-white/80 font-semibold">{totalCredits} cr</span>
      </div>
      <div className={`flex-1 overflow-y-auto scrollbar-thin ${compact ? 'p-1.5 space-y-0.5' : 'p-2 space-y-1'}`}>
        {semester.courses.map((c) => {
          const isIP = 'courseType' in c && c.courseType === 'IP'
          const isTE = 'courseType' in c && (c as CompletedCourse).courseType === 'TE'
          return (
            <div key={c.code} className={`flex items-center gap-1 border rounded ${compact ? 'px-1 py-0.5' : 'px-2 py-1'} bg-white/60 border-gray-200`}>
              <span className={`${compact ? 'text-[10px]' : 'text-xs'} font-semibold text-gray-600 truncate`}>{c.code}</span>
              {isTE && <span className="text-[9px] bg-purple-100 text-purple-600 px-1 rounded shrink-0">AP</span>}
              {isIP && <span className="text-[9px] bg-amber-100 text-amber-600 px-1 rounded shrink-0">IP</span>}
            </div>
          )
        })}
      </div>
    </div>
  )
}

function DraggablePlannedCourse({
  semId,
  course,
  onRemove,
  onOverride,
  missingPrereqs,
  compact = false,
}: {
  semId: string
  course: PlannedCourse
  onRemove: (code: string) => void
  onOverride: (code: string) => void
  missingPrereqs?: string[][]
  compact?: boolean
}) {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: `planned-course::${semId}::${encodeURIComponent(course.code)}`,
    data: { source: 'planner', fromSemesterId: semId, course },
  })

  const hasViolation = missingPrereqs && missingPrereqs.length > 0
  const href = atlasUrl(course)

  if (compact) {
    return (
      <div
        ref={setNodeRef}
        className={`flex items-center gap-1 border rounded px-1.5 py-0.5 transition-all ${
          isDragging
            ? 'opacity-40'
            : hasViolation
            ? 'border-red-300 bg-red-50'
            : 'bg-umblue-50 border-umblue-100'
        }`}
      >
        <div {...attributes} {...listeners} className="cursor-grab active:cursor-grabbing touch-none">
          <GripVertical className="w-2.5 h-2.5 text-gray-300" />
        </div>
        <a
          href={href}
          target="_blank"
          rel="noopener noreferrer"
          className={`text-[10px] font-semibold truncate hover:underline ${hasViolation ? 'text-red-600' : 'text-umblue'}`}
          title="Open in Atlas"
        >
          {course.code}
        </a>
        {hasViolation && <AlertTriangle className="w-2.5 h-2.5 text-red-400 shrink-0" />}
      </div>
    )
  }

  return (
    <div
      ref={setNodeRef}
      className={`flex flex-col gap-0.5 border rounded-lg px-2.5 py-1.5 group transition-all ${
        isDragging
          ? 'opacity-40'
          : hasViolation
          ? 'border-red-300 bg-gradient-to-r from-red-50 to-orange-50 hover:border-red-400'
          : 'bg-umblue-50 border-umblue-100 hover:border-red-200'
      }`}
    >
      <div className="flex items-center justify-between gap-1">
        <div
          {...attributes}
          {...listeners}
          className="cursor-grab active:cursor-grabbing text-gray-300 hover:text-gray-400 shrink-0 touch-none"
          title="Drag to another semester"
        >
          <GripVertical className="w-3 h-3" />
        </div>
        <div className="min-w-0 flex-1">
          <a
            href={href}
            target="_blank"
            rel="noopener noreferrer"
            className={`text-xs font-semibold truncate block hover:underline text-left ${hasViolation ? 'text-red-600' : 'text-umblue'}`}
            title="Open in Atlas"
          >
            {course.code}
          </a>
          <span className="text-xs text-gray-400 truncate block leading-tight">{course.credits}cr</span>
        </div>
        <button onClick={() => onRemove(course.code)} className="text-gray-300 hover:text-red-400 transition-colors opacity-0 group-hover:opacity-100 shrink-0">
          <Trash2 className="w-3 h-3" />
        </button>
      </div>
      {hasViolation && (
        <div className="pl-4 space-y-0.5">
          <div className="flex items-start gap-1 text-[10px] text-red-500 leading-tight">
            <AlertTriangle className="w-2.5 h-2.5 mt-0.5 shrink-0" />
            <span>
              {missingPrereqs!.map((group, gi) => {
                const label = group.length === 1 ? group[0] : `one of ${group.join(', ')}`
                return gi === 0 ? label : ` and ${label}`
              }).join('')}{' '}first
            </span>
          </div>
          <button
            onClick={() => onOverride(course.code)}
            className="flex items-center gap-0.5 text-[9px] text-gray-400 hover:text-green-600 transition-colors"
            title="Override prerequisite warning (e.g. placement test, departmental approval)"
          >
            <ShieldCheck className="w-2.5 h-2.5" />
            Override
          </button>
        </div>
      )}
    </div>
  )
}

function DroppableSemesterColumn({
  semId,
  label,
  season,
  courses,
  onRemove,
  onOverride,
  isOver,
  violations,
  compact = false,
}: {
  semId: string
  label: string
  season: 'Fall' | 'Winter' | 'Summer'
  courses: PlannedCourse[]
  onRemove: (code: string) => void
  onOverride: (code: string) => void
  isOver: boolean
  violations: Map<string, string[][]>
  compact?: boolean
}) {
  const totalCredits = courses.reduce((s, c) => s + c.credits, 0)
  const overload = totalCredits > CREDIT_WARN
  const danger = totalCredits > CREDIT_DANGER
  const normalizedSeason = (season ?? '').toString().trim() as keyof typeof SEASON_COLORS
  const headerGradient = SEASON_COLORS[normalizedSeason] ?? SEASON_COLORS.Default

  return (
    <div className={`flex flex-col min-h-0 rounded-2xl overflow-hidden border transition-all duration-150 ${isOver ? 'border-maize ring-2 ring-maize/40 bg-maize-50/30' : 'bg-gray-50 border-gray-100'}`}>
      <div className={compact ? 'p-2' : 'p-3'} style={{ backgroundImage: headerGradient }}>
        <p className="text-xs font-bold text-white truncate">{label}</p>
        <div className="flex items-center justify-between mt-0.5">
          <span className={`text-xs font-semibold ${danger ? 'text-red-100' : overload ? 'text-amber-100' : 'text-white/80'}`}>
            {totalCredits} cr
          </span>
          {overload && <AlertTriangle className={`w-3.5 h-3.5 ${danger ? 'text-red-200' : 'text-amber-200'}`} />}
        </div>
        <div className="mt-1.5 h-1 bg-white/30 rounded-full overflow-hidden">
          <div className={`h-full rounded-full transition-all ${danger ? 'bg-red-300' : overload ? 'bg-amber-300' : 'bg-white/70'}`}
            style={{ width: `${Math.min((totalCredits / 20) * 100, 100)}%` }} />
        </div>
      </div>

      <div className={`flex-1 overflow-y-auto scrollbar-thin ${compact ? 'p-1.5 space-y-1' : 'p-2 space-y-1.5'} min-h-[40px]`}>
        {courses.length === 0 ? (
          <div className={`h-full flex items-center justify-center text-center transition-colors ${compact ? 'text-[10px] py-2' : 'text-xs py-4'} ${isOver ? 'text-maize font-medium' : 'text-gray-400'}`}>
            {isOver ? 'Drop here' : compact ? '—' : 'Drag courses here'}
          </div>
        ) : (
          courses.map((course) => (
            <DraggablePlannedCourse
              key={course.code}
              semId={semId}
              course={course}
              onRemove={onRemove}
              onOverride={onOverride}
              missingPrereqs={violations.get(normCode(course.code))}
              compact={compact}
            />
          ))
        )}
      </div>

      {overload && (
        <div className={`px-2 py-1.5 text-xs font-medium text-center ${danger ? 'bg-red-50 text-red-500' : 'bg-amber-50 text-amber-600'}`}>
          {danger ? '⚠ Credit overload' : '⚡ Near limit'}
        </div>
      )}
    </div>
  )
}

function DroppableWrapper({ semId, children }: { semId: string; children: (isOver: boolean) => React.ReactNode }) {
  const { isOver, setNodeRef } = useDroppable({ id: `semester::${semId}` })
  return <div ref={setNodeRef} className="flex flex-col min-h-0">{children(isOver)}</div>
}

export default function SemesterPlanner({
  completedCount = 0,
  plannedCount = 0,
  remainingCount = 0,
  onExport,
}: {
  completedCount?: number
  plannedCount?: number
  remainingCount?: number
  onExport?: () => void
}) {
  const { semesters, pastSemesters, removeCourseFromSemester, auditResult } = useStore(
    useShallow((s) => ({
      semesters: s.semesters,
      pastSemesters: s.pastSemesters,
      removeCourseFromSemester: s.removeCourseFromSemester,
      auditResult: s.auditResult,
    }))
  )

  // Prereq overrides: set of course codes the user has manually cleared
  const [overrides, setOverrides] = useState<Set<string>>(new Set())
  const handleOverride = (code: string) =>
    setOverrides((prev) => new Set(Array.from(prev).concat(normCode(code))))

  // Include both completed AND in-progress courses for prereq checking.
  // Expand through AP equivalencies so MATH 120 also satisfies MATH 115, etc.
  const rawCodes = [
    ...(auditResult?.completedCourses ?? []).map((c) => c.code),
    ...(auditResult?.inProgressCourses ?? []).map((c) => c.code),
  ]
  const completedCodes = expandWithEquivalencies(rawCodes)
  const rawViolations = computePrereqViolations(semesters, completedCodes)
  // Remove overridden courses from violations
  const violations = new Map(
    Array.from(rawViolations).filter(([code]) => !overrides.has(code))
  )

  // Combine past + planning semesters for unified pagination
  type SemItem = { type: 'past'; data: PastSemester } | { type: 'plan'; data: PlannedSemester }
  const allItems: SemItem[] = [
    ...(pastSemesters ?? []).map((s): SemItem => ({ type: 'past', data: s })),
    ...semesters.map((s): SemItem => ({ type: 'plan', data: s })),
  ]

  const perPage = 3
  // Start on the page containing the first planning semester
  const firstPlanIdx = allItems.findIndex((item) => item.type === 'plan')
  const defaultPage = firstPlanIdx >= 0 ? Math.floor(firstPlanIdx / perPage) : 0
  const [page, setPage] = useState(defaultPage)
  const [isDragging, setIsDragging] = useState(false)

  useDndMonitor({
    onDragStart: () => setIsDragging(true),
    onDragEnd: () => setIsDragging(false),
    onDragCancel: () => setIsDragging(false),
  })
  const totalPages = Math.ceil(allItems.length / perPage)
  const visible = isDragging
    ? semesters.map((s): SemItem => ({ type: 'plan', data: s })) // GTA zoom: only planning semesters
    : allItems.slice(page * perPage, page * perPage + perPage)

  const isCompact = isDragging
  const isViewingPast = !isDragging && allItems.slice(page * perPage, page * perPage + perPage).some((i) => i.type === 'past')

  return (
    <div className="h-full flex flex-col bg-white rounded-3xl border border-gray-100 overflow-hidden">
      <div className="px-4 pt-3 pb-2 border-b border-gray-100 flex items-center gap-2 flex-wrap">
        <Calendar className="w-4 h-4 text-umblue shrink-0" />
        <h2 className="font-bold text-umblue text-sm shrink-0">Semester Planner</h2>
        {isViewingPast && (
          <span className="text-[10px] bg-gray-100 text-gray-500 px-2 py-0.5 rounded-full font-medium">Past</span>
        )}
        {/* Inline stat pills */}
        <div className="flex items-center gap-1.5 ml-1">
          <span className="text-[10px] font-semibold text-green-600 bg-green-50 px-2 py-0.5 rounded-full border border-green-100">{completedCount} done</span>
          <span className="text-[10px] font-semibold text-umblue bg-umblue/8 px-2 py-0.5 rounded-full border border-umblue/15">{plannedCount} planned</span>
          {remainingCount > 0 && (
            <span className="text-[10px] font-semibold text-amber-600 bg-amber-50 px-2 py-0.5 rounded-full border border-amber-100">{remainingCount} left</span>
          )}
        </div>
        {!isDragging && (
          <div className="ml-auto flex items-center gap-1">
            {onExport && (
              <button onClick={onExport} title="Export to Excel"
                className="p-1 rounded-lg hover:bg-gray-100 transition-colors text-gray-400 hover:text-umblue">
                <Download className="w-3.5 h-3.5" />
              </button>
            )}
            <button onClick={() => setPage(Math.max(0, page - 1))} disabled={page === 0}
              className="p-1 rounded-lg hover:bg-gray-100 disabled:opacity-30 transition-colors">
              <ChevronLeft className="w-4 h-4 text-gray-500" />
            </button>
            <span className="text-xs text-gray-400 px-1">{page + 1}/{Math.max(totalPages, 1)}</span>
            <button onClick={() => setPage(Math.min(totalPages - 1, page + 1))} disabled={page >= totalPages - 1}
              className="p-1 rounded-lg hover:bg-gray-100 disabled:opacity-30 transition-colors">
              <ChevronRight className="w-4 h-4 text-gray-500" />
            </button>
          </div>
        )}
        {isDragging && (
          <span className="ml-auto text-[10px] text-umblue/60 font-medium">drop on any semester</span>
        )}
      </div>

      <div className={`flex-1 overflow-y-auto grid gap-2 p-2 transition-all duration-200 ${isCompact ? 'grid-cols-4' : 'grid-cols-3 gap-3 p-3'}`}>
        {visible.map((item) => {
          if (item.type === 'past') {
            return <PastSemesterColumn key={item.data.id} semester={item.data} compact={isCompact} />
          }
          const sem = item.data
          return (
            <DroppableWrapper key={sem.id} semId={sem.id}>
              {(isOver) => (
                <DroppableSemesterColumn
                  semId={sem.id}
                  label={sem.label}
                  season={sem.season}
                  courses={sem.courses}
                  onRemove={(code) => removeCourseFromSemester(sem.id, code)}
                  onOverride={handleOverride}
                  isOver={isOver}
                  violations={violations}
                  compact={isCompact}
                />
              )}
            </DroppableWrapper>
          )
        })}
      </div>
    </div>
  )
}
