'use client'

import { useState } from 'react'
import { useDraggable, useDroppable } from '@dnd-kit/core'
import { Trash2, AlertTriangle, ChevronLeft, ChevronRight, Calendar, GripVertical } from 'lucide-react'
import { useStore } from '@/lib/store'
import { useShallow } from 'zustand/react/shallow'
import type { PlannedCourse } from '@/lib/types'

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
}: {
  semId: string
  course: PlannedCourse
  onRemove: (code: string) => void
  onOpenAtlas: (course: PlannedCourse) => void
}) {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: `planned-course::${semId}::${encodeURIComponent(course.code)}`,
    data: {
      source: 'planner',
      fromSemesterId: semId,
      course,
    },
  })

  return (
    <div
      ref={setNodeRef}
      className={`flex items-center justify-between gap-1 bg-umblue-50 border rounded-lg px-2.5 py-1.5 group transition-colors ${
        isDragging ? 'opacity-40 border-maize' : 'border-umblue-100 hover:border-red-200'
      }`}
    >
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
          className="text-xs font-semibold text-umblue truncate block hover:underline text-left"
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
}: {
  semId: string
  label: string
  season: 'Fall' | 'Winter' | 'Summer'
  courses: PlannedCourse[]
  onRemove: (code: string) => void
  onOpenAtlas: (course: PlannedCourse) => void
  isOver: boolean
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
  const { semesters, removeCourseFromSemester } = useStore(
    useShallow((s) => ({
      semesters: s.semesters,
      removeCourseFromSemester: s.removeCourseFromSemester,
    }))
  )

  const [page, setPage] = useState(0)
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

      <div className="flex-1 overflow-hidden grid grid-cols-3 gap-3 p-3">
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
              />
            )}
          </DroppableWrapper>
        ))}
      </div>
    </div>
  )
}
