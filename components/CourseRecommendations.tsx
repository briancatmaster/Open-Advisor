'use client'

import { useEffect, useMemo, useState } from 'react'
import { Search, SlidersHorizontal, Sparkles, Plus } from 'lucide-react'
import CourseCard from './CourseCard'
import { useStore } from '@/lib/store'
import type { RankedCourse } from '@/lib/types'
import type { CourseRow } from '@/lib/db'
import { splitCSV } from '@/lib/utils'

interface Props {
  semesterOptions: { id: string; label: string }[]
  onAddToSemester: (courseCode: string, semesterId: string) => void
  chatInterests?: string[]
}

function rowToPriorityCourse(
  row: CourseRow,
  completedCodes: Set<string>,
  priorityScore: number,
  prioritySource: RankedCourse['prioritySource'],
  priorityNote?: string
): RankedCourse {
  const prereqs = splitCSV(row.prereq_hard_codes || row.prereqs)
  const metCount = prereqs.filter((p) => completedCodes.has(p)).length
  const prereqStatus =
    prereqs.length === 0
      ? 'ready'
      : metCount === prereqs.length
      ? 'ready'
      : metCount > 0
      ? 'partial'
      : 'locked'

  return {
    course: {
      code: row.code,
      name: row.name,
      credits: row.credits,
      department: row.department,
      prereqs,
      rawPrerequisites: row.raw_prerequisites || '',
      rawAdvisoryPrerequisites: row.raw_advisory_prerequisites || '',
      advisoryPrereqs: row.advisory_prereqs.split(/[|,]/).map((v) => v.trim()).filter(Boolean),
      prereqHardCodes: prereqs,
      prereqAdvisoryText: row.prereq_advisory_text,
      estimatedHoursPerWeek: row.avg_weekly_hours,
      offeredFall: row.offered_fall === 1,
      offeredWinter: row.offered_winter === 1,
      offeredSummer: row.offered_summer === 1,
      difficulty: row.difficulty,
      avgGrade: row.avg_grade,
      classSize: row.class_size,
      professors: splitCSV(row.professors),
      description: row.description,
      tags: splitCSV(row.tags),
      source: row.source,
      atlasUrl: row.atlas_url,
      topDegrees: row.top_degrees,
    },
    score: Math.max(0, Math.min(100, Math.round(priorityScore))),
    scoreBreakdown: { careerRelevance: 0, prereqReady: 0, offeringMatch: 0, requirementPriority: 0 },
    prereqStatus,
    prioritySource,
    priorityNote,
  }
}

export default function CourseRecommendations({ semesterOptions, onAddToSemester }: Props) {
  const priorityCourses = useStore((s) => s.priorityCourses)
  const upsertPriorityCourse = useStore((s) => s.upsertPriorityCourse)

  const [query, setQuery] = useState('')
  const [searchResults, setSearchResults] = useState<CourseRow[]>([])
  const [searching, setSearching] = useState(false)
  const [showFilters, setShowFilters] = useState(false)
  const [deptFilter, setDeptFilter] = useState('')

  // Search across DB so user can add any course to the list.
  useEffect(() => {
    const q = query.trim()
    if (q.length < 2) {
      setSearchResults([])
      return
    }

    const id = window.setTimeout(async () => {
      setSearching(true)
      try {
        const res = await fetch(`/api/courses?q=${encodeURIComponent(q)}&limit=25`)
        const data = await res.json()
        const existing = new Set(priorityCourses.map((c) => c.course.code))
        setSearchResults((data.courses ?? []).filter((row: CourseRow) => !existing.has(row.code)))
      } catch {
        setSearchResults([])
      } finally {
        setSearching(false)
      }
    }, 220)

    return () => window.clearTimeout(id)
  }, [query, priorityCourses])

  const plannedCodes = useStore.getState().getPlannedCourseCodes()
  const visibleCourses = priorityCourses
    .filter((ranked) => !plannedCodes.has(ranked.course.code))
    .filter((ranked) => (deptFilter ? ranked.course.department === deptFilter : true))
    .sort((a, b) => b.score - a.score)

  const departments = useMemo(
    () =>
      Array.from(new Set(priorityCourses.map((c) => c.course.department)))
        .sort(),
    [priorityCourses]
  )

  function addSearchResultToList(row: CourseRow) {
    const completed = useStore.getState().getCompletedCourseCodes()
    upsertPriorityCourse(rowToPriorityCourse(row, completed, 60, 'user', 'Added from search'))
  }

  return (
    <div className="h-full flex flex-col bg-white rounded-3xl border border-gray-100 overflow-hidden">
      <div className="px-4 pt-4 pb-3 border-b border-gray-100">
        <div className="flex items-center gap-2 mb-3">
          <Sparkles className="w-4 h-4 text-maize" />
          <h2 className="font-bold text-umblue text-sm">Course List</h2>
          <span className="ml-auto text-xs text-gray-400 bg-gray-100 px-2 py-0.5 rounded-full">
            {visibleCourses.length} courses
          </span>
        </div>

        <div className="relative">
          <Search className="absolute left-3 top-2.5 w-3.5 h-3.5 text-gray-400" />
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search courses and add to list…"
            className="w-full pl-8 pr-8 py-2 bg-gray-50 border border-gray-100 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-maize/40 focus:border-maize/40"
          />
          <button
            onClick={() => setShowFilters(!showFilters)}
            className={`absolute right-2.5 top-2 transition-colors ${showFilters ? 'text-umblue' : 'text-gray-400 hover:text-umblue'}`}
            title="Filter by department"
          >
            <SlidersHorizontal className="w-3.5 h-3.5" />
          </button>
        </div>

        {showFilters && (
          <div className="flex gap-1.5 mt-2 flex-wrap">
            {departments.map((d) => (
              <button
                key={d}
                onClick={() => setDeptFilter(deptFilter === d ? '' : d)}
                className={`text-xs px-2.5 py-1 rounded-full border font-medium transition-colors
                  ${deptFilter === d ? 'bg-umblue text-white border-umblue' : 'bg-gray-50 text-gray-600 border-gray-200 hover:border-umblue'}`}
              >
                {d}
              </button>
            ))}
          </div>
        )}

        {query.trim().length >= 2 && (
          <div className="mt-2 rounded-xl border border-gray-100 bg-gray-50/80 max-h-40 overflow-y-auto">
            {searching ? (
              <p className="text-xs text-gray-400 px-3 py-2">Searching courses…</p>
            ) : searchResults.length === 0 ? (
              <p className="text-xs text-gray-400 px-3 py-2">No matching courses to add.</p>
            ) : (
              searchResults.slice(0, 8).map((row) => (
                <div key={row.code} className="px-3 py-2 border-b border-gray-100 last:border-0 flex items-center gap-2">
                  <div className="min-w-0 flex-1">
                    <p className="text-xs font-semibold text-umblue">{row.code}</p>
                    <p className="text-xs text-gray-500 truncate">{row.name}</p>
                  </div>
                  <button
                    onClick={() => addSearchResultToList(row)}
                    className="text-xs px-2 py-1 rounded-lg bg-umblue text-white hover:bg-umblue-600 transition-colors flex items-center gap-1"
                    title="Add to course list"
                  >
                    <Plus className="w-3 h-3" />
                    Add
                  </button>
                </div>
              ))
            )}
          </div>
        )}
      </div>

      <div className="flex-1 overflow-y-auto scrollbar-thin px-3 py-3 space-y-2">
        {visibleCourses.length === 0 ? (
          <div className="text-center py-8 text-gray-400 text-sm">
            <p>No courses in the list yet.</p>
            <p className="text-xs mt-1">Use search to add courses.</p>
          </div>
        ) : (
          visibleCourses.map((ranked) => (
            <CourseCard
              key={ranked.course.code}
              ranked={ranked}
              semesterOptions={semesterOptions}
              onAdd={(semId) => onAddToSemester(ranked.course.code, semId)}
            />
          ))
        )}
      </div>
    </div>
  )
}
