'use client'

import { useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { GraduationCap, Settings } from 'lucide-react'
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragStartEvent,
} from '@dnd-kit/core'
import CourseRecommendations from '@/components/CourseRecommendations'
import SemesterPlanner from '@/components/SemesterPlanner'
import AdvisingPanel from '@/components/AdvisingPanel'
import { useStore } from '@/lib/store'
import { parsePrereqGroups } from '@/lib/prereq-parser'
import type { RankedCourse } from '@/lib/types'

function exportScheduleToCSV(semesters: { label: string; courses: { code: string; name: string; credits: number }[] }[]) {
  const rows = [['Semester', 'Course Code', 'Course Name', 'Credits']]
  for (const sem of semesters) {
    for (const c of sem.courses) {
      rows.push([sem.label, c.code, c.name, String(c.credits)])
    }
  }
  const csv = rows.map((r) => r.map((v) => `"${v.replace(/"/g, '""')}"`).join(',')).join('\n')
  const blob = new Blob([csv], { type: 'text/csv' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = 'my-schedule.csv'
  a.click()
  URL.revokeObjectURL(url)
}

export default function DashboardPage() {
  const router = useRouter()
  const profile = useStore((s) => s.profile)
  const auditResult = useStore((s) => s.auditResult)
  const semesters = useStore((s) => s.semesters)
  const priorityCourses = useStore((s) => s.priorityCourses)
  const addCourseToSemester = useStore((s) => s.addCourseToSemester)
  const moveCourse = useStore((s) => s.moveCourse)

  const [mounted, setMounted] = useState(false)
  const [topRecommended, setTopRecommended] = useState<RankedCourse[]>([])
  const [chatInterests, setChatInterests] = useState<string[]>([])
  const [activeDragCourse, setActiveDragCourse] = useState<{ code: string; name: string; credits: number; atlasUrl?: string } | null>(null)

  // Panel resize state
  const [leftWidth, setLeftWidth] = useState(360)
  const [rightWidth, setRightWidth] = useState(320)
  const resizing = useRef<{ side: 'left' | 'right'; startX: number; startWidth: number } | null>(null)

  useEffect(() => {
    function onMouseMove(e: MouseEvent) {
      if (!resizing.current) return
      const dx = e.clientX - resizing.current.startX
      if (resizing.current.side === 'left') {
        setLeftWidth(Math.max(260, Math.min(560, resizing.current.startWidth + dx)))
      } else {
        setRightWidth(Math.max(260, Math.min(560, resizing.current.startWidth - dx)))
      }
    }
    function onMouseUp() {
      if (!resizing.current) return
      resizing.current = null
      document.body.style.cursor = ''
      document.body.style.userSelect = ''
    }
    window.addEventListener('mousemove', onMouseMove)
    window.addEventListener('mouseup', onMouseUp)
    return () => {
      window.removeEventListener('mousemove', onMouseMove)
      window.removeEventListener('mouseup', onMouseUp)
    }
  }, [])

  function startResize(side: 'left' | 'right', e: React.MouseEvent) {
    e.preventDefault()
    resizing.current = { side, startX: e.clientX, startWidth: side === 'left' ? leftWidth : rightWidth }
    document.body.style.cursor = 'col-resize'
    document.body.style.userSelect = 'none'
  }

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 8 } }))

  useEffect(() => {
    setMounted(true)
  }, [])

  // Redirect if no profile
  useEffect(() => {
    if (mounted && !profile) {
      router.replace('/profile')
    }
  }, [mounted, profile, router])

  // Keep advising context aligned with the left-side priority course list.
  useEffect(() => {
    setTopRecommended(priorityCourses)
  }, [priorityCourses])

  function handleDragStart(event: DragStartEvent) {
    const data = event.active.data.current as { course: { code: string; name: string; credits: number; atlasUrl?: string } } | undefined
    if (data?.course) setActiveDragCourse(data.course)
  }

  function handleDragEnd(event: DragEndEvent) {
    setActiveDragCourse(null)
    const { active, over } = event
    if (!over) return
    const overId = over.id as string
    if (!overId.startsWith('semester::')) return
    const semesterId = overId.replace('semester::', '')
    const activeId = active.id as string
    const activeData = active.data.current as
      | { source?: string; fromSemesterId?: string; course?: { code: string } }
      | undefined
    if (activeId.startsWith('course::')) {
      const courseCode = activeId.replace('course::', '')
      handleAddToSemester(courseCode, semesterId)
      return
    }

    if (activeData?.source === 'planner' && activeData.fromSemesterId && activeData.course?.code) {
      if (activeData.fromSemesterId === semesterId) return
      moveCourse(activeData.course.code, activeData.fromSemesterId, semesterId)
    }
  }

  function handleAddToSemester(courseCode: string, semesterId: string) {
    // Find course details from topRecommended or fetch
    const found = topRecommended.find((r) => r.course.code === courseCode)
    if (found) {
      const prereqGroups = parsePrereqGroups(found.course.rawPrerequisites ?? '')
      addCourseToSemester(semesterId, {
        code: found.course.code,
        name: found.course.name,
        credits: found.course.credits,
        atlasUrl: found.course.atlasUrl,
        prereqGroups,
      })
      return
    }
    // Fallback: fetch and add
    fetch(`/api/courses?q=${encodeURIComponent(courseCode)}&limit=1`)
      .then((r) => r.json())
      .then((data) => {
        const row = data.courses?.[0]
        if (row) {
          const prereqGroups = parsePrereqGroups(String(row.raw_prerequisites ?? ''))
          addCourseToSemester(semesterId, {
            code: row.code,
            name: row.name,
            credits: row.credits,
            atlasUrl: row.atlas_url || undefined,
            prereqGroups,
          })
        }
      })
  }

  const semesterOptions = semesters.map((s) => ({ id: s.id, label: s.label }))

  if (!mounted || !profile) {
    return (
      <div className="h-screen flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-umblue border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  const completedCount = auditResult?.completedCourses.length ?? 0
  const totalNeeded = (auditResult?.remainingCourses.length ?? 0) + completedCount
  const progressPct = totalNeeded > 0 ? Math.round((completedCount / totalNeeded) * 100) : 0

  return (
    <div className="h-screen flex flex-col bg-gray-50 overflow-hidden">
      {/* Top nav bar */}
      <header className="h-14 bg-umblue flex items-center px-4 gap-3 shrink-0">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 bg-maize rounded-lg flex items-center justify-center">
            <GraduationCap className="w-4 h-4 text-umblue" />
          </div>
          <span className="font-bold text-white text-sm">OpenAdvisor</span>
        </div>

        <div className="h-5 w-px bg-white/20 mx-1" />

        {/* Progress bar */}
        <div className="flex items-center gap-2 flex-1 max-w-xs">
          <span className="text-xs text-white/60 shrink-0">Progress</span>
          <div className="flex-1 h-1.5 bg-white/20 rounded-full overflow-hidden">
            <div
              className="h-full bg-maize rounded-full transition-all"
              style={{ width: `${progressPct}%` }}
            />
          </div>
          <span className="text-xs text-maize font-semibold shrink-0">{progressPct}%</span>
        </div>

        <div className="ml-auto flex items-center gap-2">
          <span className="text-xs text-white/60">
            {profile.name || profile.year} · {profile.majors.join(', ')}
          </span>
          <Link
            href="/profile"
            className="p-1.5 text-white/60 hover:text-white transition-colors"
            title="Edit profile"
          >
            <Settings className="w-4 h-4" />
          </Link>
        </div>
      </header>

      {/* 3-panel flex layout with drag-to-resize handles */}
      <DndContext sensors={sensors} onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
      <div className="flex-1 overflow-hidden flex p-3 gap-0 min-h-0">

        {/* Left: Course recommendations */}
        <div style={{ width: leftWidth }} className="shrink-0 min-w-0 h-full">
          <CourseRecommendations
            semesterOptions={semesterOptions}
            onAddToSemester={handleAddToSemester}
            chatInterests={chatInterests}
          />
        </div>

        {/* Left resize handle */}
        <div
          className="w-2 shrink-0 flex items-center justify-center cursor-col-resize group mx-1"
          onMouseDown={(e) => startResize('left', e)}
        >
          <div className="w-0.5 h-10 rounded-full bg-gray-200 group-hover:bg-umblue/50 group-active:bg-umblue transition-colors" />
        </div>

        {/* Center: Semester planner */}
        <div className="flex-1 min-w-0 h-full">
          <SemesterPlanner
            completedCount={completedCount}
            plannedCount={semesters.reduce((s, sem) => s + sem.courses.length, 0)}
            remainingCount={auditResult?.remainingCourses.length ?? 0}
            onExport={() => exportScheduleToCSV(semesters)}
          />
        </div>

        {/* Right resize handle */}
        <div
          className="w-2 shrink-0 flex items-center justify-center cursor-col-resize group mx-1"
          onMouseDown={(e) => startResize('right', e)}
        >
          <div className="w-0.5 h-10 rounded-full bg-gray-200 group-hover:bg-umblue/50 group-active:bg-umblue transition-colors" />
        </div>

        {/* Right: AI Advising */}
        <div style={{ width: rightWidth }} className="shrink-0 min-w-0 h-full">
          <AdvisingPanel topRecommended={topRecommended} onInterestsChange={setChatInterests} />
        </div>
      </div>

      {/* Drag overlay — floating ghost card */}
      <DragOverlay>
        {activeDragCourse && (
          <div className="bg-umblue text-white text-xs font-bold px-3 py-2 rounded-xl shadow-xl flex items-center gap-2 opacity-90">
            <span>{activeDragCourse.code}</span>
            <span className="text-white/60">{activeDragCourse.credits}cr</span>
          </div>
        )}
      </DragOverlay>
      </DndContext>
    </div>
  )
}
