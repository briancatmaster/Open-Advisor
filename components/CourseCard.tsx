'use client'

import { useState } from 'react'
import { useDraggable } from '@dnd-kit/core'
import { Clock, Users, TrendingUp, ChevronDown, ChevronUp, Plus, GripVertical } from 'lucide-react'
import PrereqBadge from './PrereqBadge'
import type { RankedCourse } from '@/lib/types'

interface Props {
  ranked: RankedCourse
  onAdd?: (semesterId: string) => void
  semesterOptions?: { id: string; label: string }[]
  compact?: boolean
}

const DIFFICULTY_COLORS = [
  '',
  'bg-green-400',
  'bg-lime-400',
  'bg-amber-400',
  'bg-orange-400',
  'bg-red-400',
]

export default function CourseCard({ ranked, onAdd, semesterOptions = [], compact = false }: Props) {
  const [expanded, setExpanded] = useState(false)
  const [showSemMenu, setShowSemMenu] = useState(false)
  const { course, prereqStatus } = ranked

  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: `course::${course.code}`,
    data: { course },
  })

  const diffColor = DIFFICULTY_COLORS[Math.round(course.difficulty)] ?? 'bg-gray-300'

  // Offering chips
  const offered: string[] = [
    course.offeredFall ? 'F' : '',
    course.offeredWinter ? 'W' : '',
    course.offeredSummer ? 'Su' : '',
  ].filter(Boolean)

  return (
    <div
      ref={setNodeRef}
      className={`bg-white rounded-2xl border transition-all duration-150 ${compact ? 'p-3' : 'p-4'} ${isDragging ? 'opacity-40 scale-95 border-maize shadow-lg' : 'border-gray-100 hover:border-maize/60 hover:shadow-md'}`}
    >
      {/* Top row */}
      <div className="flex items-start justify-between gap-2">
        {/* Drag handle */}
        <div {...attributes} {...listeners} className="cursor-grab active:cursor-grabbing text-gray-300 hover:text-gray-400 mt-0.5 shrink-0 touch-none">
          <GripVertical className="w-3.5 h-3.5" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-bold text-umblue text-sm">{course.code}</span>
            <PrereqBadge status={prereqStatus} size="sm" />
            {/* Offering chips */}
            <div className="flex gap-1">
              {offered.map((s) => (
                <span key={s} className="text-xs bg-umblue-50 text-umblue-500 px-1.5 py-0.5 rounded font-medium">
                  {s}
                </span>
              ))}
            </div>
          </div>
          <p className="text-xs text-gray-600 mt-0.5 leading-tight truncate">{course.name}</p>
        </div>

        <div className="flex items-center gap-1.5 shrink-0">
          <span className="text-xs font-semibold text-gray-500 bg-gray-100 px-2 py-0.5 rounded-full">
            {course.credits}cr
          </span>
          <span className="text-xs font-semibold text-umblue bg-umblue-50 px-2 py-0.5 rounded-full">
            P{Math.round(ranked.score)}
          </span>
          {onAdd && semesterOptions.length > 0 && (
            <div className="relative">
              <button
                onClick={() => setShowSemMenu(!showSemMenu)}
                className="w-7 h-7 bg-umblue text-white rounded-lg flex items-center justify-center hover:bg-umblue-600 transition-colors"
                title="Add to semester"
              >
                <Plus className="w-3.5 h-3.5" />
              </button>
              {showSemMenu && (
                <div className="absolute right-0 top-8 z-20 bg-white rounded-xl shadow-lg border border-gray-100 py-1 min-w-[140px]">
                  {semesterOptions.map((sem) => (
                    <button
                      key={sem.id}
                      onClick={() => {
                        onAdd(sem.id)
                        setShowSemMenu(false)
                      }}
                      className="w-full text-left px-3 py-2 text-xs text-gray-700 hover:bg-umblue-50 hover:text-umblue transition-colors"
                    >
                      {sem.label}
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}
          {!compact && (
            <button
              onClick={() => setExpanded(!expanded)}
              className="text-gray-400 hover:text-umblue transition-colors"
            >
              {expanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
            </button>
          )}
        </div>
      </div>

      {/* Metrics row */}
      <div className="flex items-center gap-3 mt-2">
        {/* Difficulty dots */}
        <div className="flex items-center gap-0.5">
          {[1, 2, 3, 4, 5].map((d) => (
            <div
              key={d}
              className={`w-2 h-2 rounded-full ${d <= Math.round(course.difficulty) ? diffColor : 'bg-gray-100'}`}
            />
          ))}
        </div>
        <div className="flex items-center gap-1 text-xs text-gray-400">
          <Clock className="w-3 h-3" />
          <span>{course.estimatedHoursPerWeek}h/wk</span>
        </div>
        {course.classSize > 0 && (
          <div className="flex items-center gap-1 text-xs text-gray-400">
            <Users className="w-3 h-3" />
            <span>{course.classSize > 500 ? '500+' : course.classSize}</span>
          </div>
        )}
        {course.avgGrade && (
          <div className="flex items-center gap-1 text-xs text-gray-400">
            <TrendingUp className="w-3 h-3" />
            <span>Avg {course.avgGrade}</span>
          </div>
        )}
      </div>

      {/* Expanded section */}
      {expanded && (
        <div className="mt-3 pt-3 border-t border-gray-50 space-y-2">
          {course.description && (
            <div className="text-xs">
              <span className="text-gray-400">Description: </span>
              <span className="text-gray-600 leading-relaxed">{course.description}</span>
            </div>
          )}
          <div className="text-xs">
            <span className="text-gray-400">Workload / avg grade: </span>
            <span className="text-gray-600">{course.estimatedHoursPerWeek}h/week • {course.avgGrade || 'N/A'}</span>
          </div>
          <div className="text-xs">
            <span className="text-gray-400">Prerequisites: </span>
            <span className="text-gray-600">{course.rawPrerequisites || 'None listed'}</span>
          </div>
          {course.rawAdvisoryPrerequisites && (
            <div className="text-xs">
              <span className="text-gray-400">Advisory prerequisites: </span>
              <span className="text-gray-600">{course.rawAdvisoryPrerequisites}</span>
            </div>
          )}
          {ranked.priorityNote && (
            <div className="text-xs">
              <span className="text-gray-400">Priority note: </span>
              <span className="text-gray-600">{ranked.priorityNote}</span>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
