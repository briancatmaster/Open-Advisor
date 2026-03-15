import { NextRequest } from 'next/server'
import { openrouter, DEFAULT_MODEL } from '@/lib/openrouter'
import { executeCourseMasterReadOnlyQuery, searchCourses, getCourseByCode, getAllCourses, normalizeCourseCode } from '@/lib/db'
import { rankCourses } from '@/lib/course-ranker'
import type { ChatMessage } from '@/lib/types'
import { normalizeCareerGoal } from '@/lib/career-goal'
import fs from 'fs'
import path from 'path'

export const runtime = 'nodejs'
export const maxDuration = 60
const SCHEMA_MD_PATH = path.join(process.cwd(), 'schema.md')
const UMICH_SCHOOLS_GUIDE_PATH = path.join(process.cwd(), 'UMich_Different_Schools_Guide.md')
const COURSE_CODE_TOKEN_RE = /[A-Z]{2,8}\s?\d{3}[A-Z]?/g

let schemaMdCache: string | null = null
let schoolsGuideCache: string | null = null
let schoolsGuideSectionsCache: { heading: string; body: string }[] | null = null

function getSchemaMarkdownContext(): string {
  if (schemaMdCache !== null) return schemaMdCache
  try {
    schemaMdCache = fs.readFileSync(SCHEMA_MD_PATH, 'utf8')
  } catch {
    schemaMdCache = 'Schema markdown unavailable.'
  }
  return schemaMdCache
}

function getSchoolsGuideMarkdownContext(): string {
  if (schoolsGuideCache !== null) return schoolsGuideCache
  try {
    schoolsGuideCache = fs.readFileSync(UMICH_SCHOOLS_GUIDE_PATH, 'utf8')
  } catch {
    schoolsGuideCache = 'UMich_Different_Schools_Guide.md unavailable.'
  }
  return schoolsGuideCache
}

function splitGuideIntoSections(markdown: string): { heading: string; body: string }[] {
  const lines = markdown.split(/\r?\n/)
  const sections: { heading: string; body: string }[] = []
  let currentHeading = 'Overview'
  let currentBody: string[] = []

  for (const line of lines) {
    if (line.startsWith('## ')) {
      if (currentBody.length > 0) {
        sections.push({ heading: currentHeading, body: currentBody.join('\n').trim() })
      }
      currentHeading = line.replace(/^##\s+/, '').trim()
      currentBody = []
      continue
    }
    currentBody.push(line)
  }

  if (currentBody.length > 0) {
    sections.push({ heading: currentHeading, body: currentBody.join('\n').trim() })
  }

  return sections
}

function getSchoolsGuideSections(): { heading: string; body: string }[] {
  if (schoolsGuideSectionsCache !== null) return schoolsGuideSectionsCache
  schoolsGuideSectionsCache = splitGuideIntoSections(getSchoolsGuideMarkdownContext())
  return schoolsGuideSectionsCache
}

function compactWhitespace(value: string): string {
  return value.replace(/\s+/g, ' ').trim()
}

function tokenizeGuideQuery(query: string): string[] {
  const normalized = query.toUpperCase()
  const courseTokens = (normalized.match(COURSE_CODE_TOKEN_RE) ?? []).map((m) => compactWhitespace(m))
  const wordTokens = query
    .toLowerCase()
    .split(/[^a-z0-9+/-]+/)
    .map((token) => token.trim())
    .filter((token) => token.length >= 2)

  return Array.from(new Set([...wordTokens, ...courseTokens]))
}

function queryUmichSchoolsGuide(query: string, limit: number): { heading: string; excerpt: string; score: number }[] {
  const tokens = tokenizeGuideQuery(query)
  const sections = getSchoolsGuideSections()
  const boundedLimit = Math.min(Math.max(limit, 1), 5)
  const scored = sections
    .map((section) => {
      const headingLower = section.heading.toLowerCase()
      const bodyLower = section.body.toLowerCase()
      let score = 0
      for (const token of tokens) {
        const tokenLower = token.toLowerCase()
        if (headingLower.includes(tokenLower)) score += 5
        if (bodyLower.includes(tokenLower)) score += 1
      }
      return { section, score }
    })
    .filter((item) => item.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, boundedLimit)
    .map((item) => ({
      heading: item.section.heading,
      excerpt: compactWhitespace(item.section.body).slice(0, 900),
      score: item.score,
    }))

  if (scored.length > 0) return scored

  return sections.slice(0, boundedLimit).map((section) => ({
    heading: section.heading,
    excerpt: compactWhitespace(section.body).slice(0, 900),
    score: 0,
  }))
}

function getSchoolsGuideQuickContext(): string {
  const markdown = getSchoolsGuideMarkdownContext()
  const start = markdown.indexOf('## Cross-College Quick Comparison')
  if (start < 0) {
    return compactWhitespace(markdown).slice(0, 1400)
  }
  const nextHeader = markdown.indexOf('\n## ', start + 1)
  const chunk = nextHeader > start ? markdown.slice(start, nextHeader) : markdown.slice(start)
  return compactWhitespace(chunk).slice(0, 1400)
}

function splitCsv(raw: string): string[] {
  return raw
    .split(/[|,]/)
    .map((value) => value.trim())
    .filter(Boolean)
}

function sanitizeSqlInput(raw: string): string {
  let sql = raw.trim()
  if (sql.startsWith('```')) {
    sql = sql.replace(/^```[a-zA-Z]*\s*/i, '').replace(/\s*```$/i, '').trim()
  }
  return sql
}

function isToolErrorResult(result: string): boolean {
  const lower = result.toLowerCase()
  return (
    lower.startsWith('sql query failed') ||
    lower.startsWith('missing ') ||
    lower.startsWith('invalid ') ||
    lower.includes('unknown course') ||
    lower.includes('unknown semester')
  )
}

function isRetrievalSuccess(toolName: string, result: string): boolean {
  if (!['search_courses', 'get_course_details', 'query_course_master_sql'].includes(toolName)) return false
  const lower = result.toLowerCase()
  if (lower.startsWith('no courses found')) return false
  if (lower.startsWith('no exact course found')) return false
  if (lower.startsWith('query executed successfully but returned 0 rows')) return false
  if (isToolErrorResult(result)) return false
  return true
}

function inferSearchFallbackFromSql(sql: string): string[] {
  const terms = new Set<string>()
  for (const m of Array.from(sql.matchAll(/like\s+['"]%?([^%'"]+)%?['"]/gi))) {
    const token = String(m[1] ?? '').trim()
    if (token.length >= 2) terms.add(token)
  }
  for (const m of Array.from(sql.matchAll(/=\s*['"]([a-zA-Z0-9\s-]{2,})['"]/g))) {
    const token = String(m[1] ?? '').trim()
    if (token.length >= 2) terms.add(token)
  }
  return Array.from(terms).slice(0, 4)
}

function workloadPercentToHours(raw: string): number | null {
  const match = raw.match(/\d+(?:\.\d+)?/)
  if (!match) return null
  const pct = Number(match[0])
  if (!Number.isFinite(pct)) return null
  return Math.max(4, Math.min(24, 4 + Math.round(pct * 0.2)))
}

function buildPriorityCoursePayload(
  row: ReturnType<typeof getCourseByCode>,
  completedCodes: string[],
  priorityScore: number,
  priorityNote = ''
) {
  if (!row) return null

  const hardPrereqs = splitCsv(row.prereq_hard_codes || row.prereqs)
  const completed = new Set(completedCodes.map((code) => code.toUpperCase()))
  const metCount = hardPrereqs.filter((p) => completed.has(p.toUpperCase())).length
  const prereqStatus =
    hardPrereqs.length === 0
      ? 'ready'
      : metCount === hardPrereqs.length
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
      prereqs: hardPrereqs,
      rawPrerequisites: row.raw_prerequisites,
      rawAdvisoryPrerequisites: row.raw_advisory_prerequisites,
      advisoryPrereqs: splitCsv(row.advisory_prereqs),
      prereqHardCodes: hardPrereqs,
      prereqAdvisoryText: row.prereq_advisory_text,
      estimatedHoursPerWeek: row.avg_weekly_hours,
      offeredFall: row.offered_fall === 1,
      offeredWinter: row.offered_winter === 1,
      offeredSummer: row.offered_summer === 1,
      difficulty: row.difficulty,
      avgGrade: row.avg_grade,
      classSize: row.class_size,
      professors: splitCsv(row.professors),
      description: row.description,
      tags: splitCsv(row.tags),
      source: row.source,
      atlasUrl: row.atlas_url,
      topDegrees: row.top_degrees,
    },
    score: Math.max(0, Math.min(100, Math.round(priorityScore))),
    scoreBreakdown: { careerRelevance: 0, prereqReady: 0, offeringMatch: 0, requirementPriority: 0 },
    prereqStatus,
    priorityNote,
    prioritySource: 'agent',
  }
}

interface PlannerSemesterContext {
  id: string
  label: string
  courses?: string[]
}

interface PriorityCourseContext {
  code: string
  priority: number
}

interface ToolContext {
  completedCodes: string[]
  careerGoal: string
  semesters: PlannerSemesterContext[]
  priorityCourses: PriorityCourseContext[]
}

function clampInt(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, Math.round(value)))
}

function parseNumericCourseLevel(code: string): number {
  const m = code.match(/\b(\d{3})[A-Z]?$/)
  return m ? Number(m[1]) : 999
}

function buildScheduleFromPriorityList(
  context: ToolContext,
  args: Record<string, unknown>
): {
  addToPlanner: { semesterId: string; courseCode: string; courseName: string; credits: number; atlasUrl: string; prereqs: string[] }[]
  message: string
} {
  const sems = context.semesters
  if (sems.length === 0) {
    return { addToPlanner: [], message: 'No planner semesters available.' }
  }

  const maxCoursesPerSemester = clampInt(Number(args.maxCoursesPerSemester ?? 4), 1, 6)
  const includeLocked = Boolean(args.includeLocked ?? false)
  const requestedSemesters = Number(args.semestersToFill ?? 0)
  const requestedCount = Number.isFinite(requestedSemesters) && requestedSemesters > 0
    ? clampInt(requestedSemesters, 1, sems.length)
    : Math.min(3, sems.length)
  const upToSemesterLabel = String(args.upToSemesterLabel ?? '').trim().toLowerCase()

  let targetSems = sems.slice(0, requestedCount)
  if (upToSemesterLabel) {
    const idx = sems.findIndex((s) => s.label.toLowerCase() === upToSemesterLabel)
    if (idx >= 0) targetSems = sems.slice(0, idx + 1)
  }

  const existingBySem = new Map<string, Set<string>>()
  const existingGlobal = new Set<string>()
  const semesterIndex = new Map<string, number>()
  sems.forEach((sem, idx) => {
    semesterIndex.set(sem.id, idx)
    const codes = new Set((sem.courses ?? []).map((code) => normalizeCourseCode(code).toUpperCase()))
    existingBySem.set(sem.id, codes)
    Array.from(codes).forEach((code) => existingGlobal.add(code))
  })

  const completedBase = new Set(context.completedCodes.map((code) => normalizeCourseCode(code).toUpperCase()))
  const usedGlobal = new Set<string>([...Array.from(existingGlobal), ...Array.from(completedBase)])

  let priorityCourses = context.priorityCourses
    .filter((p) => p.code)
    .map((p) => ({ code: normalizeCourseCode(p.code).toUpperCase(), priority: Number(p.priority) || 0 }))

  if (priorityCourses.length === 0) {
    const rankedFallback = rankCourses(
      getAllCourses(),
      new Set(context.completedCodes.map((c) => normalizeCourseCode(c).toUpperCase())),
      new Set(existingGlobal),
      normalizeCareerGoal(context.careerGoal),
      'Fall'
    )
    priorityCourses = rankedFallback.slice(0, 30).map((r) => ({ code: normalizeCourseCode(r.course.code).toUpperCase(), priority: r.score }))
  }

  const uniquePriority = Array.from(
    new Map(priorityCourses.map((p) => [p.code, p])).values()
  )
    .sort((a, b) => {
      if (a.priority !== b.priority) return b.priority - a.priority
      return parseNumericCourseLevel(a.code) - parseNumericCourseLevel(b.code)
    })

  const added: { semesterId: string; courseCode: string; courseName: string; credits: number; atlasUrl: string; prereqs: string[] }[] = []
  const addedBySemIndex = new Map<number, string[]>()
  const unmetCounts = new Map<string, number>()

  for (const sem of targetSems) {
    const semIdx = semesterIndex.get(sem.id) ?? 0
    const existingCount = existingBySem.get(sem.id)?.size ?? 0
    let remainingSlots = Math.max(0, maxCoursesPerSemester - existingCount)
    if (remainingSlots === 0) continue

    const available = new Set<string>(completedBase)
    for (const [idx, codes] of Array.from(addedBySemIndex.entries())) {
      if (idx < semIdx) {
        codes.forEach((code) => available.add(code))
      }
    }
    for (const [id, codes] of Array.from(existingBySem.entries())) {
      const idx = semesterIndex.get(id) ?? 0
      if (idx < semIdx) {
        Array.from(codes).forEach((code) => available.add(code))
      }
    }

    for (const item of uniquePriority) {
      if (remainingSlots <= 0) break
      if (usedGlobal.has(item.code)) continue

      const row = getCourseByCode(item.code)
      if (!row) continue
      const prereqs = splitCsv(row.prereq_hard_codes || row.prereqs).map((p) => normalizeCourseCode(p).toUpperCase())
      const ready = prereqs.length === 0 || prereqs.every((p) => available.has(p))
      if (!ready && !includeLocked) {
        unmetCounts.set(item.code, (unmetCounts.get(item.code) ?? 0) + 1)
        continue
      }

      added.push({
        semesterId: sem.id,
        courseCode: row.code,
        courseName: row.name,
        credits: row.credits,
        atlasUrl: row.atlas_url || '',
        prereqs: splitCsv(row.prereq_hard_codes || row.prereqs),
      })
      usedGlobal.add(item.code)
      const semAdds = addedBySemIndex.get(semIdx) ?? []
      semAdds.push(item.code)
      addedBySemIndex.set(semIdx, semAdds)
      remainingSlots -= 1
    }
  }

  if (added.length === 0) {
    const blocked = Array.from(unmetCounts.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 3)
      .map(([code]) => code)
    const blockMsg = blocked.length > 0 ? ` Most candidates were blocked by prerequisites (e.g., ${blocked.join(', ')}).` : ''
    return {
      addToPlanner: [],
      message: `Could not auto-build a schedule from the current priority list.${blockMsg}`,
    }
  }

  const grouped = new Map<string, string[]>()
  for (const item of added) {
    const list = grouped.get(item.semesterId) ?? []
    list.push(item.courseCode)
    grouped.set(item.semesterId, list)
  }
  const summary = targetSems
    .map((sem) => {
      const list = grouped.get(sem.id)
      if (!list || list.length === 0) return null
      return `${sem.label}: ${list.join(', ')}`
    })
    .filter(Boolean)
    .join(' | ')

  return {
    addToPlanner: added,
    message: `Auto-built schedule using priority courses${upToSemesterLabel ? ` through ${targetSems[targetSems.length - 1]?.label ?? ''}` : ''}: ${summary}`,
  }
}

// ── Tool definitions ──────────────────────────────────────────
const TOOLS = [
  {
    type: 'function' as const,
    function: {
      name: 'search_courses',
      description: 'Search the UMich course database by keyword, course code, or topic across code/title/description/tags/top_degrees. Use for broad topic discovery and specific course lookups.',
      parameters: {
        type: 'object',
        properties: {
          query: { type: 'string', description: 'Search term, e.g. "machine learning", "EECS 445", "algorithms"' },
          limit: { type: 'number', description: 'Optional max number of results (1-30).' },
          departmentPrefixes: {
            type: 'array',
            description: 'Optional department prefixes to filter by course code, e.g. ["EECS","MATH","ENGLISH","AAS"]',
            items: { type: 'string' },
          },
          excludeLocked: { type: 'boolean', description: 'Optional: when true, only return courses whose hard prerequisites are satisfied by completed courses.' },
        },
        required: ['query'],
      },
    },
  },
  {
    type: 'function' as const,
    function: {
      name: 'get_course_details',
      description: 'Get exact details for one course code from courses_master.db. Use for questions like "what is EECS 281" or "prereqs for MATH 474".',
      parameters: {
        type: 'object',
        properties: {
          courseCode: { type: 'string', description: 'Course code, e.g. "EECS 281" or "MATH474"' },
        },
        required: ['courseCode'],
      },
    },
  },
  {
    type: 'function' as const,
    function: {
      name: 'generate_roadmap',
      description: 'Generate a semester-by-semester roadmap summary using ranked courses. Use for planning narratives.',
      parameters: {
        type: 'object',
        properties: {
          goal: { type: 'string', description: 'The student\'s goal or focus area, e.g. "machine learning internship", "graduate in 3 years"' },
          semestersRemaining: { type: 'number', description: 'How many semesters the student has left' },
        },
        required: ['goal'],
      },
    },
  },
  {
    type: 'function' as const,
    function: {
      name: 'build_schedule_from_priority_list',
      description: 'Automatically place priority-list courses into upcoming planner semesters while respecting prerequisites when possible.',
      parameters: {
        type: 'object',
        properties: {
          upToSemesterLabel: { type: 'string', description: 'Optional end semester label (inclusive), e.g. "Winter 2027".' },
          semestersToFill: { type: 'number', description: 'Optional number of upcoming semesters to fill when upToSemesterLabel is not provided.' },
          maxCoursesPerSemester: { type: 'number', description: 'Optional cap per semester (default 4).' },
          includeLocked: { type: 'boolean', description: 'Optional: allow prerequisite-locked courses if true (default false).' },
        },
      },
    },
  },
  {
    type: 'function' as const,
    function: {
      name: 'add_to_planner',
      description: 'Actually add courses to the student\'s semester planner UI. Use this when the student explicitly asks to add, schedule, or put courses into their planner/calendar. Takes a list of course codes with the semester label they belong to.',
      parameters: {
        type: 'object',
        properties: {
          entries: {
            type: 'array',
            description: 'List of courses to add',
            items: {
              type: 'object',
              properties: {
                semesterLabel: { type: 'string', description: 'The semester label exactly as shown, e.g. "Winter 2026", "Fall 2026"' },
                courseCode: { type: 'string', description: 'Course code, e.g. "EECS 281"' },
              },
              required: ['semesterLabel', 'courseCode'],
            },
          },
        },
        required: ['entries'],
      },
    },
  },
  {
    type: 'function' as const,
    function: {
      name: 'move_planner_course',
      description: 'Move a course that is already in the planner from one semester to another.',
      parameters: {
        type: 'object',
        properties: {
          courseCode: { type: 'string', description: 'Course code, e.g. "EECS 281"' },
          fromSemesterLabel: { type: 'string', description: 'Source semester label exactly as shown, e.g. "Winter 2026"' },
          toSemesterLabel: { type: 'string', description: 'Target semester label exactly as shown, e.g. "Fall 2026"' },
        },
        required: ['courseCode', 'fromSemesterLabel', 'toSemesterLabel'],
      },
    },
  },
  {
    type: 'function' as const,
    function: {
      name: 'remove_from_planner',
      description: 'Remove a course from a specific semester in the planner.',
      parameters: {
        type: 'object',
        properties: {
          courseCode: { type: 'string', description: 'Course code, e.g. "EECS 281"' },
          semesterLabel: { type: 'string', description: 'Semester label exactly as shown, e.g. "Winter 2026"' },
        },
        required: ['courseCode', 'semesterLabel'],
      },
    },
  },
  {
    type: 'function' as const,
    function: {
      name: 'query_course_master_sql',
      description: 'Run a read-only SQL query against courses_master.db for robust lookup and aggregation. Only single SELECT/WITH statements are allowed.',
      parameters: {
        type: 'object',
        properties: {
          sql: {
            type: 'string',
            description: 'A single read-only SQL statement (SELECT/WITH only), e.g. SELECT course_code, title FROM courses WHERE title LIKE \"%MATH%\" LIMIT 10',
          },
        },
        required: ['sql'],
      },
    },
  },
  {
    type: 'function' as const,
    function: {
      name: 'query_umich_schools_guide',
      description: 'Search UMich_Different_Schools_Guide.md for school-specific requirements, AP/IB/transfer rules, and sequencing constraints.',
      parameters: {
        type: 'object',
        properties: {
          query: {
            type: 'string',
            description: 'What to look up in the school guide, e.g. "LSA language requirement", "Ross in-residence", "Engineering credit minimum"',
          },
          limit: {
            type: 'number',
            description: 'Optional number of sections to return (1-5).',
          },
        },
        required: ['query'],
      },
    },
  },
  {
    type: 'function' as const,
    function: {
      name: 'upsert_course_priority_list',
      description: 'Add or update courses in the left Course List and assign explicit priority scores (0-100). Use this when recommending courses.',
      parameters: {
        type: 'object',
        properties: {
          entries: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                courseCode: { type: 'string', description: 'Course code, e.g. "MATH 423"' },
                priorityScore: { type: 'number', description: 'Priority score from 0 to 100; higher means stronger recommendation.' },
                priorityNote: { type: 'string', description: 'Short reason for this priority assignment.' },
              },
              required: ['courseCode', 'priorityScore'],
            },
          },
        },
        required: ['entries'],
      },
    },
  },
  {
    type: 'function' as const,
    function: {
      name: 'remove_from_course_priority_list',
      description: 'Remove a course from the left Course List by course code.',
      parameters: {
        type: 'object',
        properties: {
          courseCode: { type: 'string', description: 'Course code to remove, e.g. "MATH 423"' },
        },
        required: ['courseCode'],
      },
    },
  },
]

// ── Tool execution ────────────────────────────────────────────
function runTool(name: string, args: Record<string, unknown>, context: ToolContext): string {
  if (name === 'search_courses') {
    const query = String(args.query ?? '').trim()
    const requestedLimit = Number(args.limit ?? 8)
    const limit = Number.isFinite(requestedLimit) ? Math.max(1, Math.min(30, Math.round(requestedLimit))) : 8
    const prefixes = Array.isArray(args.departmentPrefixes)
      ? Array.from(new Set((args.departmentPrefixes as unknown[]).map((v) => String(v).toUpperCase().replace(/[^A-Z]/g, '').trim()).filter((v) => v.length >= 2)))
      : []
    const excludeLocked = Boolean(args.excludeLocked ?? false)
    if (!query) return 'Missing query.'

    let results = searchCourses(query, 40)
    if (results.length === 0) return `No courses found matching "${query}".`
    const completed = new Set(context.completedCodes.map((code) => code.toUpperCase()))

    if (prefixes.length > 0) {
      results = results.filter((r) => prefixes.some((prefix) => r.code.toUpperCase().startsWith(prefix)))
    }
    if (excludeLocked) {
      results = results.filter((r) => {
        const prereqs = splitCsv(r.prereq_hard_codes || r.prereqs)
        if (prereqs.length === 0) return true
        return prereqs.every((p) => completed.has(p.toUpperCase()))
      })
    }
    results = results.slice(0, limit)
    if (results.length === 0) {
      return `No courses matched the requested filters for "${query}".`
    }

    return results.map((r) =>
      `**${r.code}** — ${r.name} (${r.credits}cr, difficulty ${r.difficulty}/5, ~${r.avg_weekly_hours}h/wk, source: ${r.source})\n  Parsed prereq status: ${splitCsv(r.prereq_hard_codes).length === 0 ? 'ready' : splitCsv(r.prereq_hard_codes).every((p) => completed.has(p.toUpperCase())) ? 'ready' : splitCsv(r.prereq_hard_codes).some((p) => completed.has(p.toUpperCase())) ? 'partial' : 'locked'}\n  Prerequisites (raw): ${r.raw_prerequisites || 'none'}\n  Advisory prerequisites (raw): ${r.raw_advisory_prerequisites || 'none'}`
    ).join('\n\n')
  }

  if (name === 'get_course_details') {
    const courseCode = String(args.courseCode ?? '').trim()
    if (!courseCode) return 'Missing courseCode.'
    const compactCode = courseCode.toUpperCase().replace(/\s+/g, '')
    if (!/^[A-Z]{2,8}\d{3}[A-Z]?$/.test(compactCode)) {
      return `Invalid course code format "${courseCode}".`
    }

    try {
      const raw = executeCourseMasterReadOnlyQuery(
        `SELECT course_code, title, credits, description, prerequisites, advisory_prerequisites, workload, median_grade, url, top_degrees
         FROM courses
         WHERE REPLACE(UPPER(course_code), ' ', '') = '${compactCode}'
         ORDER BY COALESCE(CAST(term_code AS INTEGER), 0) DESC
         LIMIT 1`
      )

      if (raw.rowCount > 0) {
        const row = raw.rows[0]
        const workloadRaw = String(row.workload ?? '')
        const estimated = workloadPercentToHours(workloadRaw)
        return JSON.stringify({
          code: String(row.course_code ?? compactCode),
          name: String(row.title ?? ''),
          credits: String(row.credits ?? ''),
          description: String(row.description ?? ''),
          prerequisites: String(row.prerequisites ?? ''),
          advisoryPrerequisites: String(row.advisory_prerequisites ?? ''),
          workload: workloadRaw,
          estimatedHoursPerWeek: estimated,
          medianGrade: String(row.median_grade ?? ''),
          atlasUrl: String(row.url ?? ''),
          topDegrees: String(row.top_degrees ?? ''),
          source: 'master',
        })
      }
    } catch {
      // fall back to normalized cache lookup below
    }

    const fallback = getCourseByCode(courseCode)
    if (!fallback) return `No exact course found for "${courseCode}".`
    return JSON.stringify({
      code: fallback.code,
      name: fallback.name,
      credits: fallback.credits,
      description: fallback.description,
      prerequisites: fallback.raw_prerequisites || fallback.prereq_hard_codes || fallback.prereqs || '',
      advisoryPrerequisites: fallback.raw_advisory_prerequisites || fallback.advisory_prereqs || '',
      workload: `${fallback.avg_weekly_hours}h/week (estimated)`,
      estimatedHoursPerWeek: fallback.avg_weekly_hours,
      medianGrade: fallback.avg_grade,
      atlasUrl: fallback.atlas_url || '',
      topDegrees: fallback.top_degrees || '',
      source: fallback.source,
    })
  }

  if (name === 'generate_roadmap') {
    const goal = args.goal as string
    const semestersRemaining = (args.semestersRemaining as number) ?? 6
    const completedSet = new Set(context.completedCodes)
    const all = getAllCourses()
    const ranked = rankCourses(all, completedSet, new Set(), normalizeCareerGoal(context.careerGoal), 'Fall')

    const semesterSize = 4  // courses per semester
    const semesters: string[][] = []
    const added = new Set<string>()

    for (let i = 0; i < Math.min(semestersRemaining, 6); i++) {
      const batch: string[] = []
      for (const r of ranked) {
        if (added.has(r.course.code)) continue
        if (r.prereqStatus === 'locked') continue
        if (batch.length >= semesterSize) break
        batch.push(`${r.course.code} (${r.course.credits}cr)`)
        added.add(r.course.code)
        completedSet.add(r.course.code)
      }
      if (batch.length > 0) semesters.push(batch)
    }

    if (semesters.length === 0) return 'Not enough course data to generate a roadmap.'

    return `Suggested roadmap toward "${goal}":\n\n` +
      semesters.map((courses, i) => `**Semester ${i + 1}:** ${courses.join(', ')}`).join('\n')
  }

  if (name === 'build_schedule_from_priority_list') {
    const built = buildScheduleFromPriorityList(context, args)
    return JSON.stringify({
      __addToPlanner: built.addToPlanner,
      message: built.message,
    })
  }

  if (name === 'add_to_planner') {
    const entries = args.entries as { semesterLabel: string; courseCode: string }[]
    const semMap = new Map(context.semesters.map((s) => [s.label.toLowerCase(), s.id]))
    const resolved: { semesterId: string; courseCode: string; courseName: string; credits: number; atlasUrl: string; prereqs: string[] }[] = []
    const missing: string[] = []

    for (const e of entries) {
      const semId = semMap.get(e.semesterLabel.toLowerCase())
      if (!semId) { missing.push(`unknown semester "${e.semesterLabel}"`); continue }
      const row = getCourseByCode(e.courseCode)
      if (!row) { missing.push(`unknown course "${e.courseCode}"`); continue }
      resolved.push({
        semesterId: semId,
        courseCode: row.code,
        courseName: row.name,
        credits: row.credits,
        atlasUrl: row.atlas_url || '',
        prereqs: splitCsv(row.prereq_hard_codes || row.prereqs),
      })
    }

    // Return structured payload the client will intercept
    return JSON.stringify({ __addToPlanner: resolved, missing })
  }

  if (name === 'move_planner_course') {
    const courseCode = String(args.courseCode ?? '').trim().toUpperCase()
    const fromSemesterLabel = String(args.fromSemesterLabel ?? '').trim()
    const toSemesterLabel = String(args.toSemesterLabel ?? '').trim()
    const semMap = new Map(context.semesters.map((s) => [s.label.toLowerCase(), s.id]))

    const fromSemesterId = semMap.get(fromSemesterLabel.toLowerCase())
    const toSemesterId = semMap.get(toSemesterLabel.toLowerCase())
    const missing: string[] = []
    if (!fromSemesterId) missing.push(`unknown semester "${fromSemesterLabel}"`)
    if (!toSemesterId) missing.push(`unknown semester "${toSemesterLabel}"`)

    if (!courseCode) missing.push('missing courseCode')
    if (missing.length > 0) return JSON.stringify({ __moveInPlanner: null, missing })

    return JSON.stringify({
      __moveInPlanner: {
        courseCode,
        fromSemesterId,
        toSemesterId,
      },
      missing,
    })
  }

  if (name === 'remove_from_planner') {
    const courseCode = String(args.courseCode ?? '').trim().toUpperCase()
    const semesterLabel = String(args.semesterLabel ?? '').trim()
    const semMap = new Map(context.semesters.map((s) => [s.label.toLowerCase(), s.id]))
    const semesterId = semMap.get(semesterLabel.toLowerCase())
    const missing: string[] = []
    if (!semesterId) missing.push(`unknown semester "${semesterLabel}"`)
    if (!courseCode) missing.push('missing courseCode')
    if (missing.length > 0) return JSON.stringify({ __removeFromPlanner: null, missing })

    return JSON.stringify({
      __removeFromPlanner: {
        courseCode,
        semesterId,
      },
      missing,
    })
  }

  if (name === 'query_course_master_sql') {
    const sql = sanitizeSqlInput(String(args.sql ?? ''))
    if (!sql) return 'Missing SQL.'
    try {
      const result = executeCourseMasterReadOnlyQuery(sql)
      if (result.rowCount === 0) {
        return 'Query executed successfully but returned 0 rows.'
      }

      const payload = {
        columns: result.columns,
        rowCount: result.rowCount,
        truncated: result.truncated,
        rows: result.rows,
      }
      return JSON.stringify(payload)
    } catch (err) {
      const fallbackTerms = inferSearchFallbackFromSql(sql)
      const fallbackResults = fallbackTerms.length > 0
        ? searchCourses(fallbackTerms.join(' '), 5)
        : []
      const fallbackText = fallbackResults.length > 0
        ? `\nFallback matches from inferred terms (${fallbackTerms.join(', ')}):\n${fallbackResults.map((r) => `- ${r.code} — ${r.name}`).join('\n')}`
        : ''
      return `SQL query failed: ${err instanceof Error ? err.message : 'Unknown error'}. Use a single SELECT/WITH over table courses.${fallbackText}`
    }
  }

  if (name === 'query_umich_schools_guide') {
    const query = String(args.query ?? '').trim()
    if (!query) return 'Missing guide query.'
    const requestedLimit = Number(args.limit ?? 3)
    const results = queryUmichSchoolsGuide(query, Number.isFinite(requestedLimit) ? requestedLimit : 3)
    return JSON.stringify({
      query,
      source: 'UMich_Different_Schools_Guide.md',
      resultCount: results.length,
      results,
    })
  }

  if (name === 'upsert_course_priority_list') {
    const entries = Array.isArray(args.entries) ? args.entries as Array<Record<string, unknown>> : []
    if (entries.length === 0) return 'Missing entries.'

    const resolved: unknown[] = []
    const missing: string[] = []

    for (const entry of entries) {
      const courseCode = String(entry.courseCode ?? '').trim()
      const priorityScore = Number(entry.priorityScore ?? 50)
      const priorityNote = String(entry.priorityNote ?? '').trim()
      if (!courseCode) {
        missing.push('missing courseCode')
        continue
      }
      const row = getCourseByCode(courseCode)
      if (!row) {
        missing.push(`unknown course "${courseCode}"`)
        continue
      }
      const payload = buildPriorityCoursePayload(row, context.completedCodes, priorityScore, priorityNote)
      if (payload) resolved.push(payload)
    }

    return JSON.stringify({ __upsertCourseList: resolved, missing })
  }

  if (name === 'remove_from_course_priority_list') {
    const rawCourseCode = String(args.courseCode ?? '').trim()
    const canonical = getCourseByCode(rawCourseCode)?.code ?? rawCourseCode.toUpperCase()
    const courseCode = canonical
    if (!courseCode) return JSON.stringify({ __removeFromCourseList: null, missing: ['missing courseCode'] })
    return JSON.stringify({ __removeFromCourseList: { courseCode }, missing: [] })
  }

  return 'Unknown tool.'
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json() as {
      messages: ChatMessage[]
      systemPrompt: string
      completedCodes?: string[]
      careerGoal?: string
      semesters?: PlannerSemesterContext[]
      priorityCourses?: PriorityCourseContext[]
    }
    const {
      messages,
      systemPrompt,
      completedCodes = [],
      careerGoal = '',
      semesters: semesterList = [],
      priorityCourses = [],
    } = body

    if (!messages || messages.length === 0) {
      return new Response(JSON.stringify({ error: 'No messages provided' }), {
        status: 400, headers: { 'Content-Type': 'application/json' },
      })
    }

    const encoder = new TextEncoder()

    const stream = new ReadableStream({
      async start(controller) {
        function send(payload: object) {
          controller.enqueue(encoder.encode(`data: ${JSON.stringify(payload)}\n\n`))
        }

        try {
          const schemaMd = getSchemaMarkdownContext()
          const schoolsGuideSummary = getSchoolsGuideQuickContext()
          const systemPromptWithSchema = `${systemPrompt}

DATABASE SCHEMA MARKDOWN (schema.md):
${schemaMd}

UMICH SCHOOL GUIDE QUICK CONTEXT:
${schoolsGuideSummary}

GROUNDING REQUIREMENTS:
- Course facts (title, credits, prerequisites, workload, grading, terms, URLs): use get_course_details first when a course code is known; otherwise use search_courses and/or query_course_master_sql.
- School policy facts (LSA/Engineering/Ross rules, AP/IB/transfer constraints, residency, language, GPA floors): use query_umich_schools_guide.
- For broad or vague topic questions, run multiple search passes (2+ queries/paraphrases) and combine results before recommending courses.
- For schedule-building requests, prefer build_schedule_from_priority_list to create a draft plan before asking for more details.
- If tools do not return supporting evidence, say the information is unavailable instead of guessing.
- Do not invent database rows, prerequisites, offerings, or school policies.
- When using SQL, query only the 'courses' table from courses_master.db with a single read-only SELECT/WITH statement.`

          const apiMessages = [
            { role: 'system' as const, content: systemPromptWithSchema },
            ...messages.map((m) => ({ role: m.role as 'user' | 'assistant', content: m.content })),
          ]

          const modelMessages: Array<Record<string, unknown>> = [...apiMessages]
          let finalAnswer = ''
          let toolFailureCount = 0
          let retrievalSuccessCount = 0
          let recoveryPromptInjected = false

          for (let step = 0; step < 6; step++) {
            const response = await openrouter.chat.completions.create({
              model: DEFAULT_MODEL,
              max_tokens: step === 0 ? 1024 : 1536,
              stream: false,
              tools: TOOLS,
              tool_choice: 'auto',
              messages: modelMessages as never,
            })

            const msg = response.choices[0]?.message
            if (!msg) break

            const assistantPayload: Record<string, unknown> = {
              role: 'assistant',
              content: msg.content ?? '',
            }
            if (msg.tool_calls) assistantPayload.tool_calls = msg.tool_calls
            modelMessages.push(assistantPayload)

            if (!msg.tool_calls || msg.tool_calls.length === 0) {
              finalAnswer = msg.content ?? ''
              if (toolFailureCount > 0 && retrievalSuccessCount === 0 && !recoveryPromptInjected) {
                recoveryPromptInjected = true
                modelMessages.push({
                  role: 'system',
                  content:
                    'Tool attempts failed without retrieving usable course data. Do not stop yet. Retry with alternative strategy: simplify the query, call search_courses with broader terms and optional department filters, then answer from retrieved results.',
                })
                continue
              }
              break
            }

            send({ text: '' })
            for (const tc of msg.tool_calls) {
              if (tc.type !== 'function') continue
              let args: Record<string, unknown> = {}
              try {
                args = JSON.parse(tc.function.arguments || '{}') as Record<string, unknown>
              } catch {
                args = {}
              }
              send({ toolCall: { name: tc.function.name, args } })
              const result = runTool(tc.function.name, args, {
                completedCodes,
                careerGoal,
                semesters: semesterList,
                priorityCourses,
              })
              if (isToolErrorResult(result)) toolFailureCount += 1
              if (isRetrievalSuccess(tc.function.name, result)) retrievalSuccessCount += 1

              if (tc.function.name === 'add_to_planner') {
                try {
                  const parsed = JSON.parse(result) as { __addToPlanner: unknown[]; missing: string[] }
                  if (parsed.__addToPlanner) send({ addToPlanner: parsed.__addToPlanner })
                } catch { /* non-JSON result, ignore */ }
              }
              if (tc.function.name === 'build_schedule_from_priority_list') {
                try {
                  const parsed = JSON.parse(result) as { __addToPlanner: unknown[]; message?: string }
                  if (parsed.__addToPlanner) send({ addToPlanner: parsed.__addToPlanner })
                } catch { /* non-JSON result, ignore */ }
              }
              if (tc.function.name === 'move_planner_course') {
                try {
                  const parsed = JSON.parse(result) as { __moveInPlanner: unknown; missing: string[] }
                  if (parsed.__moveInPlanner) send({ moveInPlanner: parsed.__moveInPlanner })
                } catch { /* non-JSON result, ignore */ }
              }
              if (tc.function.name === 'remove_from_planner') {
                try {
                  const parsed = JSON.parse(result) as { __removeFromPlanner: unknown; missing: string[] }
                  if (parsed.__removeFromPlanner) send({ removeFromPlanner: parsed.__removeFromPlanner })
                } catch { /* non-JSON result, ignore */ }
              }
              if (tc.function.name === 'upsert_course_priority_list') {
                try {
                  const parsed = JSON.parse(result) as { __upsertCourseList: unknown[]; missing: string[] }
                  if (parsed.__upsertCourseList) send({ upsertCourseList: parsed.__upsertCourseList })
                } catch { /* non-JSON result, ignore */ }
              }
              if (tc.function.name === 'remove_from_course_priority_list') {
                try {
                  const parsed = JSON.parse(result) as { __removeFromCourseList: unknown; missing: string[] }
                  if (parsed.__removeFromCourseList) send({ removeFromCourseList: parsed.__removeFromCourseList })
                } catch { /* non-JSON result, ignore */ }
              }

              modelMessages.push({
                role: 'tool',
                tool_call_id: tc.id,
                content: result,
              })
            }
          }

          if (finalAnswer) {
            send({ text: finalAnswer })
          } else {
            send({ text: 'I could not complete that request with reliable data from available tools.' })
          }

        } catch (err) {
          send({ error: err instanceof Error ? err.message : 'Unknown error' })
        } finally {
          send({ done: true })
          controller.enqueue(encoder.encode('data: [DONE]\n\n'))
          controller.close()
        }
      },
    })

    return new Response(stream, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        Connection: 'keep-alive',
      },
    })
  } catch (err) {
    console.error('[advise]', err)
    return new Response(JSON.stringify({ error: 'Internal server error' }), {
      status: 500, headers: { 'Content-Type': 'application/json' },
    })
  }
}
