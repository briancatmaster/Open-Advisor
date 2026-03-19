// Shared prerequisite parsing utilities.
// Used by both client (dashboard, advising panel) and server (API routes).

const PREREQ_SKIP = new Set([
  'OR', 'AND', 'OF', 'THE', 'IN', 'AT', 'TO', 'A', 'AN', 'NO', 'OP', 'C', 'F', 'BETTER',
])

/**
 * Extract course codes from a text fragment, inheriting dept prefix for bare numbers.
 * e.g. "EECS 203 or MATH 465 or 565" → ["EECS 203", "MATH 465", "MATH 565"]
 */
export function extractCodesFromSegment(text: string): string[] {
  const codes: string[] = []
  let lastDept = ''
  const tokens = text.toUpperCase().split(/[\s;,()/]+/).filter(Boolean)
  for (const token of tokens) {
    const deptNum = token.match(/^([A-Z]{2,8})(\d{3}[A-Z]?)$/)
    const deptOnly = token.match(/^([A-Z]{2,8})$/)
    const numOnly = token.match(/^(\d{3}[A-Z]?)$/)
    if (deptNum) {
      lastDept = deptNum[1]
      codes.push(`${deptNum[1]} ${deptNum[2]}`)
    } else if (deptOnly && !PREREQ_SKIP.has(token)) {
      lastDept = token
    } else if (numOnly && lastDept) {
      codes.push(`${lastDept} ${numOnly[1]}`)
    }
  }
  return Array.from(new Set(codes))
}

/**
 * Splits text on "and" (case-insensitive) at the top level (not inside parentheses).
 */
function splitOnAnd(text: string): string[] {
  const parts: string[] = []
  let depth = 0
  let current = ''
  const tokens = text.split(/\s+/)
  for (const token of tokens) {
    depth += (token.match(/\(/g) ?? []).length
    depth -= (token.match(/\)/g) ?? []).length
    if (token.toUpperCase() === 'AND' && depth === 0) {
      if (current.trim()) parts.push(current.trim())
      current = ''
    } else {
      current += ' ' + token
    }
  }
  if (current.trim()) parts.push(current.trim())
  return parts.length > 0 ? parts : [text]
}

/**
 * Parses raw prerequisite text into AND-of-OR groups.
 * "(EECS 203 or MATH 465 or 565) and EECS 280" →
 *   [["EECS 203", "MATH 465", "MATH 565"], ["EECS 280"]]
 */
export function parsePrereqGroups(raw: string): string[][] {
  if (!raw) return []
  // Strip grade notes like "(C or better, No OP/F)"
  const cleaned = raw
    .replace(/\([^)]*better[^)]*\)/gi, '')
    .replace(/no\s+op\/f/gi, '')
    .replace(/c\s+or\s+better/gi, '')
    .trim()
  if (!cleaned) return []
  const andParts = splitOnAnd(cleaned)
  return andParts
    .map((part) => extractCodesFromSegment(part))
    .filter((group) => group.length > 0)
}
