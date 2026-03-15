import { NextRequest, NextResponse } from 'next/server'
import { searchCourses, getAllCourses, getCoursesByDept, getDepartments } from '@/lib/db'
import { rankCourses } from '@/lib/course-ranker'
import { normalizeCareerGoal } from '@/lib/career-goal'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const q = searchParams.get('q') ?? ''
    const dept = searchParams.get('dept') ?? ''
    const limit = parseInt(searchParams.get('limit') ?? '20', 10)

    // Ranked recommendations mode
    const careerGoalRaw = searchParams.get('careerGoal')
    const completed = searchParams.get('completed') ?? '' // comma-separated codes
    const planned = searchParams.get('planned') ?? ''
    const season = (searchParams.get('season') ?? 'Fall') as 'Fall' | 'Winter' | 'Summer'
    const departments = getDepartments()

    if (careerGoalRaw) {
      // Return ranked recommendations
      const allCourses = getAllCourses()
      const completedSet = new Set(completed.split(',').filter(Boolean))
      const plannedSet = new Set(planned.split(',').filter(Boolean))
      const careerGoal = normalizeCareerGoal(careerGoalRaw)
      const ranked = rankCourses(allCourses, completedSet, plannedSet, careerGoal, season)
      return NextResponse.json({
        courses: ranked.slice(0, limit).map((r) => r.row),
        departments,
      })
    }

    // Search / filter mode
    let courses
    if (q) {
      courses = searchCourses(q, limit)
    } else if (dept) {
      courses = getCoursesByDept(dept).slice(0, limit)
    } else {
      courses = getAllCourses().slice(0, limit)
    }

    return NextResponse.json({ courses, departments })
  } catch (err) {
    console.error('[courses]', err)
    return NextResponse.json({ error: 'Failed to fetch courses' }, { status: 500 })
  }
}
