import type {
  AuditResult,
  CompletedCourse,
  InProgressCourse,
  IncompleteRequirement,
} from './types'

// Course line in UMich Degree Audit Checklist format:
// "  FA 2025MATH   115Calculus I4.00*"
// "  FA 2025EECS   101XDepartmental4.00T"
// "  FA 2025EECS   280Prog&Data Struct4"
const COURSE_LINE_RE =
  /^\s+((?:FA|WN|SS|SP|SU)\s+\d{4})([A-Z]{2,8})\s+(\d{3}[A-Z]?)(.+?)(\d+(?:\.\d+)?)([T*]*)\s*$/gm

// Student name: "For: Brian Guo  Generated On: ..."
const NAME_RE = /^For:\s*(.+?)(?:\s{2,}|Generated|$)/im

// "Not Complete: <label>" blocks
const NOT_COMPLETE_RE = /Not Complete:\s*([^\n]+)((?:\n(?!Not Complete:)[^\n]*)*)/gm

// ── Term ordering helpers ────────────────────────────────────
function termKey(abbr: string, year: number): number {
  const order: Record<string, number> = { WN: 0, SS: 1, FA: 2 }
  return year * 10 + (order[abbr] ?? 0)
}

function getCurrentTermKey(): number {
  const month = new Date().getMonth() + 1
  const year = new Date().getFullYear()
  const abbr = month <= 4 ? 'WN' : month <= 8 ? 'SS' : 'FA'
  return termKey(abbr, year)
}

function parseAuditFromText(raw: string): AuditResult {
  const text = raw.replace(/\t/g, '  ')
  const currentKey = getCurrentTermKey()

  // ── Student info ─────────────────────────────────────────────
  const studentName = NAME_RE.exec(text)?.[1]?.trim() ?? ''

  // Major: grab the line after "LSA" that isn't a section header
  let major = ''
  const majorMatch = text.match(/LSA\s+([\w]+(?:\s+[\w]+){0,4}?)\s*(?:Fall|Winter|Spring|Summer)/i)
  if (majorMatch) major = majorMatch[1].trim()

  // ── Parse course lines ───────────────────────────────────────
  const completedCourses: CompletedCourse[] = []
  const inProgressCourses: InProgressCourse[] = []
  const seenCodes = new Set<string>()

  const re = new RegExp(COURSE_LINE_RE.source, 'gm')
  let m: RegExpExecArray | null
  while ((m = re.exec(text)) !== null) {
    const termStr = m[1].trim()   // "FA 2025"
    const dept    = m[2]          // "MATH"
    const num     = m[3]          // "115" or "101X"
    const name    = m[4].trim()   // "Calculus I"
    const credits = parseFloat(m[5])
    const flags   = m[6]          // "*", "T", "", "T*", etc.

    const code = `${dept} ${num}`
    if (seenCodes.has(code)) continue
    seenCodes.add(code)

    const [termAbbr, termYearStr] = termStr.split(' ')
    const key = termKey(termAbbr, parseInt(termYearStr))

    const isTransfer = flags.includes('T')

    if (isTransfer || key < currentKey) {
      completedCourses.push({
        code,
        name,
        credits,
        grade: isTransfer ? 'Transfer' : '',
        term: termStr,
      })
    } else if (key === currentKey) {
      inProgressCourses.push({ code, name, credits, term: termStr })
    }
    // Future term = skip (not yet planned in our system)
  }

  // ── Extract "Not Complete" requirement blocks ────────────────
  const incompleteRequirements: IncompleteRequirement[] = []
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

  const parseConfidence =
    completedCourses.length + inProgressCourses.length > 0 ? 0.85 : 0.4

  return {
    studentName,
    major,
    completedCourses,
    inProgressCourses,
    remainingCourses: [],   // specific remaining course codes not in this audit format
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
