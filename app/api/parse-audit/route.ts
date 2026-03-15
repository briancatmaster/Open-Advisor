import { NextRequest, NextResponse } from 'next/server'
import { parseAudit, parseAuditText } from '@/lib/audit-parser'

export const runtime = 'nodejs'
export const maxDuration = 30

const AUDIT_HINTS = [
  'Completed',
  'Not Complete',
  'Degree Audit',
  'Credits',
  'Generated On',
]

function hasAuditLikeContent(text: string): boolean {
  const hintHits = AUDIT_HINTS.filter((hint) => text.includes(hint)).length
  const hasCourseCodes = /\b[A-Z]{2,8}\s+\d{3}[A-Z]?\b/.test(text)
  return hintHits >= 2 && hasCourseCodes
}

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData()
    const file = formData.get('file') as File | null

    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 })
    }

    const allowedTypes = ['application/pdf', 'text/plain']
    if (!allowedTypes.includes(file.type)) {
      return NextResponse.json(
        { error: 'Invalid file type. Please upload a PDF or text file.' },
        { status: 400 }
      )
    }

    if (file.size > 15 * 1024 * 1024) {
      return NextResponse.json({ error: 'File too large (max 15MB)' }, { status: 400 })
    }

    let result

    if (file.type === 'text/plain') {
      const text = await file.text()
      if (!hasAuditLikeContent(text)) {
        return NextResponse.json(
          { error: 'Invalid audit format. Please upload a valid UMich degree audit text file.' },
          { status: 400 }
        )
      }
      result = parseAuditText(text)
    } else {
      const buffer = Buffer.from(await file.arrayBuffer())
      console.log('[parse-audit] buffer size:', buffer.length, 'type:', file.type)
      result = await parseAudit(buffer)
    }

    console.log('[parse-audit] success — completed:', result.completedCourses.length, 'in-progress:', result.inProgressCourses.length, 'unmet reqs:', result.incompleteRequirements.length)

    return NextResponse.json({ auditResult: result })
  } catch (err) {
    console.error('[parse-audit] error:', err instanceof Error ? err.message : err)
    console.error('[parse-audit] stack:', err instanceof Error ? err.stack : '')
    return NextResponse.json(
      { error: 'Failed to parse audit. Please try a different file format.' },
      { status: 500 }
    )
  }
}
