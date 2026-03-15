import Database from 'better-sqlite3'
import fs from 'fs'
import path from 'path'

export { splitCSV } from './utils'

const MASTER_DB_PATH = path.join(process.cwd(), 'courses_master.db')
const MAX_SQL_RESULT_ROWS = 50
const SEARCH_STOPWORDS = new Set([
  'a', 'an', 'and', 'are', 'as', 'at', 'be', 'best', 'class', 'classes', 'course', 'courses',
  'do', 'for', 'from', 'future', 'get', 'good', 'how', 'i', 'in', 'is', 'it', 'me', 'my',
  'next', 'of', 'on', 'or', 'semester', 'should', 'some', 'take', 'that', 'the', 'to',
  'want', 'we', 'what', 'which', 'with', 'would', 'you',
])

type Source = 'master'

export interface CourseRow {
  code: string
  name: string
  department: string
  credits: number
  description: string
  syllabus_summary: string
  prereqs: string
  raw_prerequisites: string
  raw_advisory_prerequisites: string
  advisory_prereqs: string
  difficulty: number
  avg_grade: string
  avg_weekly_hours: number
  class_size: number
  offered_fall: number
  offered_winter: number
  offered_summer: number
  professors: string
  tags: string
  source: Source
  atlas_url: string
  prereq_hard_codes: string
  prereq_advisory_text: string
  top_degrees: string
}

export interface SqlQueryResult {
  columns: string[]
  rows: Record<string, unknown>[]
  rowCount: number
  truncated: boolean
}

interface MasterCourseRaw {
  course_code: string
  term_code: string | null
  url: string | null
  title: string | null
  description: string | null
  prerequisites: string | null
  advisory_prerequisites: string | null
  credits: string | null
  workload: string | null
  median_grade: string | null
  top_degrees: string | null
}

let _masterDb: Database.Database | null = null
let _coursesCache: CourseRow[] | null = null

const COURSE_CODE_RE = /\b([A-Z]{2,8})\s?(\d{3}[A-Z]?)\b/g

function clamp(n: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, n))
}

export function normalizeCourseCode(raw: string): string {
  const upper = raw.toUpperCase().trim()
  const match = upper.match(/([A-Z]{2,8})\s*(\d{3}[A-Z]?)/)
  if (!match) return upper.replace(/\s+/g, ' ')
  return `${match[1]} ${match[2]}`
}

function compactCourseCode(raw: string): string {
  return normalizeCourseCode(raw).replace(/\s+/g, '')
}

function parseCreditValue(raw: string | null | undefined): number {
  if (!raw) return 4
  const matches = raw.replace(/[\u00a0\u2007\u202f]/g, ' ').match(/\d+(?:\.\d+)?/g)
  if (!matches || matches.length === 0) return 4
  const nums = matches.map((n) => Number(n)).filter((n) => Number.isFinite(n))
  if (nums.length === 0) return 4
  return Math.max(...nums)
}

function parseWorkloadPercent(raw: string | null | undefined): number | null {
  if (!raw) return null
  const match = raw.match(/\d+(?:\.\d+)?/)
  if (!match) return null
  const pct = Number(match[0])
  if (!Number.isFinite(pct)) return null
  return clamp(pct, 0, 100)
}

function workloadToHours(pct: number | null): number {
  if (pct == null) return 10
  return clamp(4 + Math.round(pct * 0.2), 4, 24)
}

function workloadToDifficulty(pct: number | null): number {
  if (pct == null) return 3
  return clamp(Math.round(pct / 20), 1, 5)
}

function extractCourseCodesFromText(text: string): string[] {
  const codes = new Set<string>()
  for (const match of Array.from(text.toUpperCase().matchAll(COURSE_CODE_RE))) {
    codes.add(`${match[1]} ${match[2]}`)
  }
  return Array.from(codes)
}

function removeCourseCodesFromText(text: string): string {
  return text
    .replace(COURSE_CODE_RE, '')
    .replace(/[\[\]()]/g, ' ')
    .replace(/\s+/g, ' ')
    .replace(/^[,;:\-|\s]+|[,;:\-|\s]+$/g, '')
    .trim()
}

function summarizeDescription(description: string): string {
  if (!description) return ''
  const firstSentence = description.split(/(?<=[.!?])\s+/)[0] ?? ''
  return firstSentence.slice(0, 220)
}

function parseDepartmentFromCodeOrTitle(courseCode: string, title: string): string {
  const fromCode = normalizeCourseCode(courseCode)
  const codeMatch = fromCode.match(/^([A-Z]{2,8})\s\d{3}[A-Z]?$/)
  if (codeMatch) return codeMatch[1]

  const titleMatch = title.toUpperCase().match(/^([A-Z]{2,8})\s\d{3}[A-Z]?$/)
  if (titleMatch) return titleMatch[1]
  return 'GEN'
}

function normalizeMasterRow(row: MasterCourseRaw): CourseRow {
  const code = normalizeCourseCode(row.course_code || row.title || '')
  const description = row.description ?? ''
  const hardCodes = extractCourseCodesFromText(row.prerequisites ?? '')
  const prereqRemainder = removeCourseCodesFromText(row.prerequisites ?? '')
  const advisoryParts = [prereqRemainder, row.advisory_prerequisites ?? '']
    .map((part) => part.trim())
    .filter(Boolean)

  const workloadPct = parseWorkloadPercent(row.workload)
  const topDegrees = row.top_degrees ?? ''

  return {
    code,
    name: (row.title ?? code).trim() || code,
    department: parseDepartmentFromCodeOrTitle(row.course_code ?? '', row.title ?? ''),
    credits: parseCreditValue(row.credits),
    description,
    syllabus_summary: summarizeDescription(description),
    prereqs: hardCodes.join(','),
    raw_prerequisites: (row.prerequisites ?? '').trim(),
    raw_advisory_prerequisites: (row.advisory_prerequisites ?? '').trim(),
    advisory_prereqs: advisoryParts.join(' | '),
    difficulty: workloadToDifficulty(workloadPct),
    avg_grade: (row.median_grade ?? '').trim(),
    avg_weekly_hours: workloadToHours(workloadPct),
    class_size: 0,
    offered_fall: -1,
    offered_winter: -1,
    offered_summer: -1,
    professors: '',
    tags: '',
    source: 'master',
    atlas_url: row.url ?? '',
    prereq_hard_codes: hardCodes.join(','),
    prereq_advisory_text: advisoryParts.join(' | '),
    top_degrees: topDegrees,
  }
}

function getMasterDb(): Database.Database {
  if (_masterDb) return _masterDb

  if (!fs.existsSync(MASTER_DB_PATH)) {
    throw new Error('courses_master.db not found in project root')
  }

  _masterDb = new Database(MASTER_DB_PATH, { readonly: true })
  return _masterDb
}

function isReadOnlySql(sql: string): boolean {
  const trimmed = sql.trim().replace(/;+\s*$/g, '')
  if (!trimmed) return false
  if (trimmed.includes(';')) return false

  const upper = trimmed.toUpperCase()
  if (!(upper.startsWith('SELECT') || upper.startsWith('WITH'))) return false

  const blocked = [
    'INSERT',
    'UPDATE',
    'DELETE',
    'DROP',
    'ALTER',
    'CREATE',
    'REPLACE',
    'TRUNCATE',
    'ATTACH',
    'DETACH',
    'VACUUM',
    'REINDEX',
    'ANALYZE',
    'PRAGMA',
  ]
  return !blocked.some((kw) => upper.includes(kw))
}

function loadMasterCourses(): CourseRow[] {
  const db = getMasterDb()

  const rows = db.prepare(`
    SELECT course_code, term_code, url, title, description, prerequisites,
           advisory_prerequisites, credits, workload, median_grade, top_degrees
    FROM courses
  `).all() as MasterCourseRaw[]

  const latestByCode = new Map<string, MasterCourseRaw>()
  for (const row of rows) {
    const key = compactCourseCode(row.course_code || row.title || '')
    if (!key) continue

    const prev = latestByCode.get(key)
    const prevTerm = Number(prev?.term_code ?? '0')
    const currentTerm = Number(row.term_code ?? '0')

    if (!prev || currentTerm >= prevTerm) latestByCode.set(key, row)
  }

  return Array.from(latestByCode.values())
    .map(normalizeMasterRow)
    .sort((a, b) => {
      if (a.department !== b.department) return a.department.localeCompare(b.department)
      return a.code.localeCompare(b.code)
    })
}

function queryableText(row: CourseRow): string {
  return [
    row.code,
    compactCourseCode(row.code),
    row.name,
    row.department,
    row.description,
    row.raw_prerequisites,
    row.raw_advisory_prerequisites,
    row.tags,
    row.prereq_hard_codes,
    row.prereq_advisory_text,
    row.top_degrees,
  ]
    .join(' ')
    .toLowerCase()
}

function normalizeSearchText(value: string): string {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim()
}

function compactSearchText(value: string): string {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, '')
}

function tokenizeSearchQuery(query: string): string[] {
  return normalizeSearchText(query)
    .split(/\s+/)
    .map((token) => token.trim())
    .filter((token) => token.length >= 2 && !SEARCH_STOPWORDS.has(token))
}

export function getAllCourses(): CourseRow[] {
  if (_coursesCache) return _coursesCache
  _coursesCache = loadMasterCourses()
  return _coursesCache
}

export function searchCourses(query: string, limit = 20): CourseRow[] {
  const q = query.trim().toLowerCase()
  if (!q) return getAllCourses().slice(0, limit)

  const qCompact = compactSearchText(q)
  const tokens = tokenizeSearchQuery(q)
  const effectiveTokens = tokens.length > 0 ? tokens : [q]

  const scored = getAllCourses()
    .map((row) => {
      const searchable = queryableText(row)
      const searchableCompact = compactSearchText(searchable)
      const codeLower = row.code.toLowerCase()
      const codeCompact = compactCourseCode(row.code).toLowerCase()
      const nameLower = row.name.toLowerCase()
      const descLower = row.description.toLowerCase()
      const tagLower = row.tags.toLowerCase()
      const degreeLower = row.top_degrees.toLowerCase()
      const deptLower = row.department.toLowerCase()

      let score = 0
      if (searchable.includes(q)) score += 16
      if (qCompact && searchableCompact.includes(qCompact)) score += 12

      for (const token of effectiveTokens) {
        const tokenCompact = compactSearchText(token)
        if (!tokenCompact) continue

        if (codeLower.includes(token) || codeCompact.includes(tokenCompact)) score += 10
        if (nameLower.includes(token)) score += 8
        if (descLower.includes(token)) score += 4
        if (tagLower.includes(token) || degreeLower.includes(token)) score += 3
        if (deptLower === token) score += 6
        if (tokenCompact.length >= 4 && searchableCompact.includes(tokenCompact)) score += 2
      }

      return { row, score }
    })
    .filter((entry) => entry.score > 0)
    .sort((a, b) => {
      if (a.score !== b.score) return b.score - a.score
      return a.row.code.localeCompare(b.row.code)
    })

  return scored.slice(0, limit).map((entry) => entry.row)
}

export function getCourseByCode(code: string): CourseRow | undefined {
  const key = compactCourseCode(code)
  return getAllCourses().find((row) => compactCourseCode(row.code) === key)
}

export function getCoursesByDept(dept: string): CourseRow[] {
  const normalizedDept = dept.toUpperCase().trim()
  return getAllCourses().filter((row) => row.department === normalizedDept)
}

export function getCoursesByCodes(codes: string[]): CourseRow[] {
  if (codes.length === 0) return []
  const wanted = new Set(codes.map(compactCourseCode))
  return getAllCourses().filter((row) => wanted.has(compactCourseCode(row.code)))
}

export function getDepartments(): string[] {
  return Array.from(new Set(getAllCourses().map((row) => row.department))).sort()
}

export function executeCourseMasterReadOnlyQuery(sql: string): SqlQueryResult {
  const db = getMasterDb()

  if (!isReadOnlySql(sql)) {
    throw new Error('Only single SELECT/WITH read-only SQL statements are allowed')
  }

  const stmt = db.prepare(sql)
  if (!stmt.reader) {
    throw new Error('Query must be read-only and return rows')
  }

  const rows = stmt.all() as Record<string, unknown>[]
  const limited = rows.slice(0, MAX_SQL_RESULT_ROWS)
  const columns = stmt.columns().map((c) => c.name)

  return {
    columns,
    rows: limited,
    rowCount: rows.length,
    truncated: rows.length > MAX_SQL_RESULT_ROWS,
  }
}

export function clearCourseCache(): void {
  _coursesCache = null
}
