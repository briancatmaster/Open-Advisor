import type {
  AuditResult,
  CompletedCourse,
  InProgressCourse,
  IncompleteRequirement,
} from './types'

// Student name: "For: Brian Guo  Generated On: ..."
const NAME_RE = /^For:\s*(.+?)(?:\s{2,}|Generated|$)/im

// "Not Complete: <label>" blocks
const NOT_COMPLETE_RE = /Not Complete:\s*([^\n]+)((?:\n(?!Not Complete:)[^\n]*)*)/gm

const GRADE_LABELS: Record<string, string> = {
  TE: 'Test Credit',
  TR: 'Transfer',
  IT: 'Internal Transfer',
  OT: 'Other Credit',
  EN: '',
  IP: '',
}

const TERM_ABBR_TO_LABEL: Record<string, string> = {
  FA: 'Fall', WN: 'Winter', SS: 'Summer', SP: 'Spring', SU: 'Summer',
}

export function termAbbrToLabel(termStr: string): string {
  const [abbr, year] = termStr.split(' ')
  return `${TERM_ABBR_TO_LABEL[abbr] ?? abbr} ${year}`
}

export function seasonFromAbbr(abbr: string): 'Fall' | 'Winter' | 'Summer' {
  const map: Record<string, 'Fall' | 'Winter' | 'Summer'> = {
    FA: 'Fall', WN: 'Winter', SS: 'Summer', SP: 'Winter', SU: 'Summer',
  }
  return map[abbr] ?? 'Fall'
}

// ── Robust segment parser ────────────────────────────────────
// pdf-parse often produces table columns with no spaces between them.
// Strategy: split the Course History text on term boundaries (FA/WN/etc + year),
// then parse each segment independently by anchoring on the unambiguous parts:
//   - term at the start
//   - TYPE + CREDITS at the end (EN|TR|TE|IP|IT|OT followed by digits)
//   - DEPT + CATALOG_NBR right after the term
//   - everything in between is the title

type COURSE_TYPE = 'EN' | 'TR' | 'TE' | 'IP' | 'IT' | 'OT'

interface ParsedCourse {
  term: string
  code: string
  name: string
  courseType: COURSE_TYPE
  credits: number
}

function parseCourseSegment(segment: string): ParsedCourse | null {
  // Term at start: "FA 2025" or "FA2025"
  const termMatch = segment.match(/^(FA|WN|SS|SP|SU)\s*(\d{4})/)
  if (!termMatch) return null
  const termAbbr = termMatch[1]
  const termYear = termMatch[2]
  const term = `${termAbbr} ${termYear}`
  let rest = segment.slice(termMatch[0].length).trim()

  // Type + credits anchored at the END: "IP 4.00" or "TE5.00T" or "TE 2.00 T"
  const endMatch = rest.match(/(EN|TR|TE|IP|IT|OT)\s*(\d+(?:\.\d+)?)\s*[T*]?\s*$/)
  if (!endMatch || endMatch.index == null) return null
  const courseType = endMatch[1] as COURSE_TYPE
  const credits = parseFloat(endMatch[2])
  rest = rest.slice(0, endMatch.index).trim()

  // Department code at start (2-8 uppercase letters, no digits)
  const deptMatch = rest.match(/^([A-Z]{2,8})/)
  if (!deptMatch) return null
  const dept = deptMatch[1]
  rest = rest.slice(deptMatch[0].length).trim()

  // Catalog number right after dept.
  // Only 'X' is a valid UMich suffix (departmental/exam credits like 101X, 102X).
  // Other letters after 3 digits are the start of the course title.
  const numMatch = rest.match(/^(\d{3}X?)/)
  if (!numMatch) return null
  const num = numMatch[1]
  rest = rest.slice(numMatch[0].length).trim()

  // Everything left is the title
  const name = rest.trim()
  const code = `${dept} ${num}`

  return { term, code, name, courseType, credits }
}

function parseCourseHistory(historyText: string): ParsedCourse[] {
  // Strip the legend line that appears at the end of the Course History section
  const legendIdx = historyText.search(/EN:\s*Courses\s*Taken/)
  const cleanText = legendIdx >= 0 ? historyText.slice(0, legendIdx) : historyText

  // Split on each occurrence of a term abbreviation to get per-course segments
  const TERM_SPLIT_RE = /(?=(?:FA|WN|SS|SP|SU)\s*\d{4})/g
  const segments = cleanText.split(TERM_SPLIT_RE)
  const results: ParsedCourse[] = []
  const seen = new Set<string>()


  for (const seg of segments) {
    const trimmed = seg.replace(/[\r\n·]+/g, ' ').replace(/\s{2,}/g, ' ').trim()
    const parsed = parseCourseSegment(trimmed)
    if (!parsed) continue
    if (seen.has(parsed.code)) continue
    // Skip header row artifacts and the legend line
    if (parsed.code.startsWith('EN ') || parsed.code === 'EN ') continue
    seen.add(parsed.code)
    results.push(parsed)
  }

  return results
}

function parseAuditFromText(raw: string): AuditResult {
  const text = raw.replace(/\t/g, '  ')

  // ── Student info ─────────────────────────────────────────────
  const studentName = NAME_RE.exec(text)?.[1]?.trim() ?? ''

  let major = ''
  const majorMatch = text.match(/LSA\s+([\w]+(?:\s+[\w]+){0,4}?)\s*(?:Fall|Winter|Spring|Summer)/i)
  if (majorMatch) major = majorMatch[1].trim()

  // ── Restrict to Course History section only ──────────────────
  // Prevents false matches from requirement sections which have
  // different formatting and cause garbled course codes.
  const courseHistoryStart = text.search(/Course\s*History/)
  const courseHistorySection = courseHistoryStart >= 0
    ? text.slice(courseHistoryStart)
    : text

  // ── Parse all course rows ────────────────────────────────────
  const completedCourses: CompletedCourse[] = []
  const inProgressCourses: InProgressCourse[] = []

  const parsedCourses = parseCourseHistory(courseHistorySection)

  for (const c of parsedCourses) {
    if (c.courseType === 'IP') {
      inProgressCourses.push({
        code: c.code,
        name: c.name,
        credits: c.credits,
        term: c.term,
        courseType: 'IP',
      })
    } else {
      completedCourses.push({
        code: c.code,
        name: c.name,
        credits: c.credits,
        grade: GRADE_LABELS[c.courseType] ?? '',
        term: c.term,
        courseType: c.courseType as 'EN' | 'TR' | 'TE' | 'IT' | 'OT',
      })
    }
  }

  // ── Extract "Not Complete" requirement blocks ────────────────
  const incompleteRequirements: IncompleteRequirement[] = []
  let m: RegExpExecArray | null
  const ncRe = new RegExp(NOT_COMPLETE_RE.source, 'gm')
  while ((m = ncRe.exec(text)) !== null) {
    const label = m[1].trim()
    const body = m[2] ?? ''
    const details = body
      .split('\n')
      .map((l) => l.trim())
      .filter((l) => l.length > 0 && !l.startsWith('FA') && !l.startsWith('WN') && !l.startsWith('SS'))
    incompleteRequirements.push({ label, details })
  }

  const parseConfidence = completedCourses.length + inProgressCourses.length > 0 ? 0.85 : 0.4

  return {
    studentName,
    major,
    completedCourses,
    inProgressCourses,
    remainingCourses: [],
    incompleteRequirements,
    rawText: raw,
    parseConfidence,
  }
}

export async function parseAudit(pdfBuffer: Buffer): Promise<AuditResult> {
  // eslint-disable-next-line @typescript-eslint/no-require-imports, @typescript-eslint/no-explicit-any
  const pdfParse = require('pdf-parse') as (buf: Buffer, opts?: any) => Promise<{ text: string }>
  const parsed = await pdfParse(pdfBuffer)
  return parseAuditFromText(parsed.text)
}

export function parseAuditText(rawText: string): AuditResult {
  return parseAuditFromText(rawText)
}

/** Parse a plain text course list (manual input fallback) */
export function parseTextInput(text: string): { codes: string[] } {
  const COURSE_CODE_RE = /\b([A-Z]{2,8})\s+(\d{3}[A-Z]?)\b/g
  const codes = new Set<string>()
  let m: RegExpExecArray | null
  while ((m = COURSE_CODE_RE.exec(text)) !== null) {
    codes.add(`${m[1]} ${m[2]}`)
  }
  return { codes: Array.from(codes) }
}
