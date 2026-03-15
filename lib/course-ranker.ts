import type { CareerGoal, PrereqStatus, RankedCourse, ScoreBreakdown } from './types'
import type { CourseRow } from './db'
import { splitCSV } from './utils'

const CAREER_KEYWORDS: Record<CareerGoal, Array<{ phrase: string; weight: number }>> = {
  'software-engineering': [
    { phrase: 'software', weight: 5 },
    { phrase: 'algorithms', weight: 5 },
    { phrase: 'systems', weight: 4 },
    { phrase: 'operating system', weight: 4 },
    { phrase: 'database', weight: 3 },
    { phrase: 'web', weight: 3 },
  ],
  'machine-learning': [
    { phrase: 'machine learning', weight: 5 },
    { phrase: 'artificial intelligence', weight: 5 },
    { phrase: 'neural', weight: 5 },
    { phrase: 'data science', weight: 4 },
    { phrase: 'probability', weight: 4 },
    { phrase: 'linear algebra', weight: 4 },
  ],
  'data-science': [
    { phrase: 'data science', weight: 5 },
    { phrase: 'statistics', weight: 5 },
    { phrase: 'regression', weight: 4 },
    { phrase: 'probability', weight: 4 },
    { phrase: 'analytics', weight: 4 },
    { phrase: 'database', weight: 3 },
  ],
  'quantitative-finance': [
    { phrase: 'quant', weight: 5 },
    { phrase: 'finance', weight: 5 },
    { phrase: 'stochastic', weight: 5 },
    { phrase: 'probability', weight: 4 },
    { phrase: 'time series', weight: 4 },
    { phrase: 'optimization', weight: 4 },
  ],
  robotics: [
    { phrase: 'robotics', weight: 5 },
    { phrase: 'control', weight: 4 },
    { phrase: 'vision', weight: 4 },
    { phrase: 'perception', weight: 4 },
    { phrase: 'linear algebra', weight: 3 },
  ],
  'research-phd': [
    { phrase: 'proof', weight: 5 },
    { phrase: 'theory', weight: 5 },
    { phrase: 'research', weight: 4 },
    { phrase: 'advanced', weight: 3 },
    { phrase: 'graduate', weight: 3 },
  ],
  'product-management': [
    { phrase: 'product', weight: 5 },
    { phrase: 'user', weight: 4 },
    { phrase: 'design', weight: 4 },
    { phrase: 'communication', weight: 4 },
    { phrase: 'analytics', weight: 3 },
  ],
  undecided: [
    { phrase: 'intro', weight: 3 },
    { phrase: 'fundamentals', weight: 3 },
    { phrase: 'gateway', weight: 3 },
  ],
}

function getHardPrereqs(course: CourseRow): string[] {
  const parsed = splitCSV(course.prereq_hard_codes)
  if (parsed.length > 0) return parsed
  return splitCSV(course.prereqs)
}

export function computePrereqStatus(course: CourseRow, completedCodes: Set<string>): PrereqStatus {
  const prereqs = getHardPrereqs(course)
  if (prereqs.length === 0) return 'ready'
  const metCount = prereqs.filter((p) => completedCodes.has(p)).length
  if (metCount === prereqs.length) return 'ready'
  if (metCount > 0) return 'partial'
  return 'locked'
}

function computeCareerRelevance(course: CourseRow, goal: CareerGoal): number {
  const text = [
    course.code,
    course.name,
    course.description,
    course.tags,
    course.top_degrees,
  ]
    .join(' ')
    .toLowerCase()

  const keywords = CAREER_KEYWORDS[goal] ?? []
  let maxScore = 0
  for (const keyword of keywords) {
    if (text.includes(keyword.phrase)) {
      maxScore = Math.max(maxScore, keyword.weight)
    }
  }

  return maxScore
}

function computeRequirementPriority(course: CourseRow): number {
  const tags = splitCSV(course.tags).map((t) => t.toLowerCase())
  if (tags.includes('required')) return 3
  if (tags.includes('gateway')) return 2

  const codeMatch = course.code.match(/\b(\d{3})[A-Z]?$/)
  const level = codeMatch ? Number(codeMatch[1]) : 400
  if (Number.isFinite(level) && level < 200) return 2

  if (/required|core|fundamental/i.test(course.description)) return 2
  return 1
}

function computeOfferingMatch(
  course: CourseRow,
  currentSeason: 'Fall' | 'Winter' | 'Summer'
): number {
  const hasSeasonality =
    course.offered_fall >= 0 || course.offered_winter >= 0 || course.offered_summer >= 0

  if (!hasSeasonality) return 1

  const offered =
    (currentSeason === 'Fall' && course.offered_fall === 1) ||
    (currentSeason === 'Winter' && course.offered_winter === 1) ||
    (currentSeason === 'Summer' && course.offered_summer === 1)

  return offered ? 2 : 0
}

export interface RankedCourseWithRow extends RankedCourse {
  row: CourseRow
}

export function rankCourses(
  courses: CourseRow[],
  completedCodes: Set<string>,
  plannedCodes: Set<string>,
  careerGoal: CareerGoal,
  currentSeason: 'Fall' | 'Winter' | 'Summer'
): RankedCourseWithRow[] {
  return courses
    .filter((c) => !completedCodes.has(c.code) && !plannedCodes.has(c.code))
    .map((row) => {
      const prereqStatus = computePrereqStatus(row, completedCodes)

      const careerRelevance = computeCareerRelevance(row, careerGoal)
      const prereqReady = prereqStatus === 'ready' ? 3 : prereqStatus === 'partial' ? 1 : 0
      const offeringMatch = computeOfferingMatch(row, currentSeason)
      const requirementPriority = computeRequirementPriority(row)

      const score = careerRelevance + prereqReady + offeringMatch + requirementPriority

      const breakdown: ScoreBreakdown = {
        careerRelevance,
        prereqReady,
        offeringMatch,
        requirementPriority,
      }

      return {
        row,
        course: {
          code: row.code,
          name: row.name,
          credits: row.credits,
          department: row.department,
          prereqs: getHardPrereqs(row),
          rawPrerequisites: row.raw_prerequisites,
          rawAdvisoryPrerequisites: row.raw_advisory_prerequisites,
          advisoryPrereqs: splitCSV(row.advisory_prereqs),
          prereqHardCodes: getHardPrereqs(row),
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
        score,
        scoreBreakdown: breakdown,
        prereqStatus,
      }
    })
    .sort((a, b) => b.score - a.score)
}
