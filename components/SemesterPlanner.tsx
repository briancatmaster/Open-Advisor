'use client'

import { useRef, useState } from 'react'
import { useDraggable, useDroppable, useDndMonitor } from '@dnd-kit/core'
import { Trash2, AlertTriangle, ChevronLeft, ChevronRight, Calendar, GripVertical } from 'lucide-react'
import { useStore } from '@/lib/store'
import { useShallow } from 'zustand/react/shallow'
import type { PlannedCourse, PlannedSemester } from '@/lib/types'

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
        // Cap each OR group to 3 options for display
        violations.set(courseKey, unsatisfied.map((g) => g.slice(0, 3)))
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
  Default: 'linear-gradient(90deg, #9ca3af 0%, #6b7280 100%)',
}

function DraggablePlannedCourse({
  semId,
  course,
  onRemove,
  onOpenAtlas,
  missingPrereqs,
}: {
  semId: string
  course: PlannedCourse
  onRemove: (code: string) => void
  onOpenAtlas: (course: PlannedCourse) => void
  missingPrereqs?: string[][]  // unsatisfied AND groups, each is an OR list
}) {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: `planned-course::${semId}::${encodeURIComponent(course.code)}`,
    data: {
      source: 'planner',
      fromSemesterId: semId,
      course,
    },
  })

  const hasViolation = missingPrereqs && missingPrereqs.length > 0

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
          <button
            type="button"
            onClick={() => onOpenAtlas(course)}
            className={`text-xs font-semibold truncate block hover:underline text-left ${hasViolation ? 'text-red-600' : 'text-umblue'}`}
            title="Open in Atlas"
          >
            {course.code}
          </button>
          <span className="text-xs text-gray-400 truncate block leading-tight">{course.credits}cr</span>
        </div>
        <button onClick={() => onRemove(course.code)} className="text-gray-300 hover:text-red-400 transition-colors opacity-0 group-hover:opacity-100 shrink-0">
          <Trash2 className="w-3 h-3" />
        </button>
      </div>
      {hasViolation && (
        <div className="flex items-start gap-1 text-[10px] text-red-500 leading-tight pl-4">
          <AlertTriangle className="w-2.5 h-2.5 mt-0.5 shrink-0" />
          <span>
            {missingPrereqs!.map((group, gi) => {
              const label = group.length === 1 ? group[0] : `one of ${group.join(', ')}`
              return gi === 0 ? label : ` and ${label}`
            }).join('')}{' '}first
          </span>
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
  onOpenAtlas,
  isOver,
  violations,
}: {
  semId: string
  label: string
  season: 'Fall' | 'Winter' | 'Summer'
  courses: PlannedCourse[]
  onRemove: (code: string) => void
  onOpenAtlas: (course: PlannedCourse) => void
  isOver: boolean
  violations: Map<string, string[][]>
}) {
  const totalCredits = courses.reduce((s, c) => s + c.credits, 0)
  const overload = totalCredits > CREDIT_WARN
  const danger = totalCredits > CREDIT_DANGER
  const normalizedSeason = (season ?? '').toString().trim() as keyof typeof SEASON_COLORS
  const headerGradient = SEASON_COLORS[normalizedSeason] ?? SEASON_COLORS.Default

  return (
    <div className={`flex flex-col min-h-0 rounded-2xl overflow-hidden border transition-all duration-150 ${isOver ? 'border-maize ring-2 ring-maize/40 bg-maize-50/30' : 'bg-gray-50 border-gray-100'}`}>
      <div className="p-3" style={{ backgroundImage: headerGradient }}>
        <p className="text-xs font-bold text-white">{label}</p>
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

      <div className="flex-1 overflow-y-auto scrollbar-thin p-2 space-y-1.5 min-h-[80px]">
        {courses.length === 0 ? (
          <div className={`h-full flex items-center justify-center text-xs text-center py-4 transition-colors ${isOver ? 'text-maize font-medium' : 'text-gray-400'}`}>
            {isOver ? 'Drop here' : 'Drag courses here'}
          </div>
        ) : (
          courses.map((course) => (
            <DraggablePlannedCourse
              key={course.code}
              semId={semId}
              course={course}
              onRemove={onRemove}
              onOpenAtlas={onOpenAtlas}
              missingPrereqs={violations.get(normCode(course.code))}
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

export default function SemesterPlanner() {
  const { semesters, removeCourseFromSemester, auditResult } = useStore(
    useShallow((s) => ({
      semesters: s.semesters,
      removeCourseFromSemester: s.removeCourseFromSemester,
      auditResult: s.auditResult,
    }))
  )

  const completedCodesRaw = (auditResult?.completedCourses ?? []).map((c) => normCode(c.code))
  const completedCodes = new Set<string>(completedCodesRaw)
  const violations = computePrereqViolations(semesters, completedCodes)

  const [page, setPage] = useState(0)
  const [isDragging, setIsDragging] = useState(false)
  const [scrollZone, setScrollZone] = useState<'prev' | 'next' | null>(null)
  const scrollTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const pageRef = useRef(page)
  pageRef.current = page

  useDndMonitor({
    onDragStart: () => setIsDragging(true),
    onDragEnd: () => { setIsDragging(false); setScrollZone(null); clearScrollTimer() },
    onDragCancel: () => { setIsDragging(false); setScrollZone(null); clearScrollTimer() },
    onDragMove: (event) => {
      const rect = containerRef.current?.getBoundingClientRect()
      if (!rect) return
      // Get current pointer position: activator position + cumulative delta
      const activator = event.activatorEvent as PointerEvent
      const x = activator.clientX + event.delta.x
      const edgeWidth = 56  // px zone on each side
      const inLeft = x < rect.left + edgeWidth
      const inRight = x > rect.right - edgeWidth
      const zone = inLeft ? 'prev' : inRight ? 'next' : null
      setScrollZone(zone)
    },
  })

  // Trigger page advance when pointer stays in a zone
  useState(() => {}) // placeholder — effect below handles it
  const prevZone = useRef<'prev' | 'next' | null>(null)
  if (prevZone.current !== scrollZone) {
    prevZone.current = scrollZone
    clearScrollTimer()
    if (scrollZone) {
      scrollTimerRef.current = setTimeout(() => {
        setPage((p) => {
          if (scrollZone === 'next') return Math.min(Math.ceil(semesters.length / 3) - 1, p + 1)
          return Math.max(0, p - 1)
        })
      }, 600)
    }
  }

  function clearScrollTimer() {
    if (scrollTimerRef.current) clearTimeout(scrollTimerRef.current)
    scrollTimerRef.current = null
  }
  const [atlasCache, setAtlasCache] = useState<Record<string, string>>({})
  const perPage = 3
  const totalPages = Math.ceil(semesters.length / perPage)
  const visible = semesters.slice(page * perPage, page * perPage + perPage)

  function fallbackAtlasUrl(code: string): string {
    const compact = code.replace(/\s+/g, '')
    return `https://atlas.ai.umich.edu/courses/${encodeURIComponent(compact)}/`
  }

  async function openAtlas(course: PlannedCourse) {
    const win = window.open('about:blank', '_blank', 'noopener,noreferrer')
    if (!win) return

    const cached = atlasCache[course.code]
    const initialUrl = course.atlasUrl || cached
    if (initialUrl) {
      win.location.href = initialUrl
      return
    }

    try {
      const res = await fetch(`/api/courses?q=${encodeURIComponent(course.code)}&limit=8`)
      const data = await res.json()
      const rows = (data.courses ?? []) as Array<{ code: string; atlas_url?: string }>
      const exact = rows.find((row) => row.code.toUpperCase() === course.code.toUpperCase())
      const atlasUrl = exact?.atlas_url || fallbackAtlasUrl(course.code)
      setAtlasCache((prev) => ({ ...prev, [course.code]: atlasUrl }))
      win.location.href = atlasUrl
    } catch {
      win.location.href = fallbackAtlasUrl(course.code)
    }
  }

  return (
    <div className="h-full flex flex-col bg-white rounded-3xl border border-gray-100 overflow-hidden">
      <div className="px-4 pt-4 pb-3 border-b border-gray-100 flex items-center gap-2">
        <Calendar className="w-4 h-4 text-umblue" />
        <h2 className="font-bold text-umblue text-sm">Semester Planner</h2>
        <div className="ml-auto flex items-center gap-1">
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
      </div>

      <div ref={containerRef} className="flex-1 overflow-hidden relative">
        {/* Drag-to-scroll edge zones — visual indicators, actual trigger is via onDragMove */}
        {isDragging && page > 0 && (
          <div
            className={`absolute left-0 top-0 bottom-0 w-14 z-20 pointer-events-none flex items-center justify-center transition-opacity ${scrollZone === 'prev' ? 'opacity-100' : 'opacity-40'}`}
            style={{ background: 'linear-gradient(to right, rgba(0,111,186,0.3), transparent)' }}
          >
            <ChevronLeft className="w-6 h-6 text-umblue drop-shadow" />
          </div>
        )}
        {isDragging && page < totalPages - 1 && (
          <div
            className={`absolute right-0 top-0 bottom-0 w-14 z-20 pointer-events-none flex items-center justify-center transition-opacity ${scrollZone === 'next' ? 'opacity-100' : 'opacity-40'}`}
            style={{ background: 'linear-gradient(to left, rgba(0,111,186,0.3), transparent)' }}
          >
            <ChevronRight className="w-6 h-6 text-umblue drop-shadow" />
          </div>
        )}
        <div className="h-full grid grid-cols-3 gap-3 p-3">
          {visible.map((sem) => (
            <DroppableWrapper key={sem.id} semId={sem.id}>
              {(isOver) => (
                <DroppableSemesterColumn
                  semId={sem.id}
                  label={sem.label}
                  season={sem.season}
                  courses={sem.courses}
                  onRemove={(code) => removeCourseFromSemester(sem.id, code)}
                  onOpenAtlas={openAtlas}
                  isOver={isOver}
                  violations={violations}
                />
              )}
            </DroppableWrapper>
          ))}
        </div>
      </div>
    </div>
  )
}
