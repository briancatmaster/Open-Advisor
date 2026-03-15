import type { AuditResult, PlannedSemester, SchoolWarning, UserProfile } from './types'

interface SchoolRuleSummary {
  minCredits: number
  minGpa: string
  residency: string
  languageRequired: boolean
}

const SCHOOL_BASELINES: Record<UserProfile['homeSchool'], SchoolRuleSummary> = {
  LSA: {
    minCredits: 120,
    minGpa: '2.0 overall / 2.0 major',
    residency: '60 in-residence and 30 of last 60 in-residence',
    languageRequired: true,
  },
  Engineering: {
    minCredits: 128,
    minGpa: '2.0 CoE / 2.0 department',
    residency: '50 UM-AA credits with CTP, including 30 upper-level technical credits',
    languageRequired: false,
  },
  Ross: {
    minCredits: 120,
    minGpa: '2.5 business + cumulative',
    residency: 'Core is cohort-sequenced and in-residence',
    languageRequired: true,
  },
  Nursing: {
    minCredits: 120,
    minGpa: 'Good academic standing',
    residency: 'Clinical and nursing sequence courses in-residence',
    languageRequired: false,
  },
  Kinesiology: {
    minCredits: 120,
    minGpa: '2.0 overall / 2.0 major',
    residency: 'Major core typically completed in-residence',
    languageRequired: false,
  },
  Stamps: {
    minCredits: 128,
    minGpa: '2.0+',
    residency: 'Studio milestones and sequencing are in-residence',
    languageRequired: false,
  },
  Taubman: {
    minCredits: 121,
    minGpa: 'Program dependent',
    residency: 'Distribution + studio progression in-residence',
    languageRequired: false,
  },
  UMSI: {
    minCredits: 120,
    minGpa: 'C- or higher in UMSI courses',
    residency: '54 credits must be UMSI coursework',
    languageRequired: false,
  },
  SMTD: {
    minCredits: 122,
    minGpa: 'Program dependent',
    residency: 'Performance/studio progression in-residence',
    languageRequired: false,
  },
  Other: {
    minCredits: 120,
    minGpa: 'Program dependent',
    residency: 'Confirm school-specific residency constraints',
    languageRequired: false,
  },
}

function getTakenAndPlannedCodes(audit: AuditResult | null, semesters: PlannedSemester[]): Set<string> {
  const codes = new Set<string>()
  for (const c of audit?.completedCourses ?? []) codes.add(c.code.toUpperCase())
  for (const c of audit?.inProgressCourses ?? []) codes.add(c.code.toUpperCase())
  for (const sem of semesters) {
    for (const c of sem.courses) codes.add(c.code.toUpperCase())
  }
  return codes
}

function creditsSoFar(audit: AuditResult | null, semesters: PlannedSemester[]): number {
  const completed = (audit?.completedCourses ?? []).reduce((sum, c) => sum + (c.credits || 0), 0)
  const inProgress = (audit?.inProgressCourses ?? []).reduce((sum, c) => sum + (c.credits || 0), 0)
  const planned = semesters.reduce(
    (sum, sem) => sum + sem.courses.reduce((s, c) => s + (c.credits || 0), 0),
    0
  )
  return Math.round((completed + inProgress + planned) * 10) / 10
}

function hasIncompleteReq(audit: AuditResult | null, pattern: RegExp): boolean {
  return (audit?.incompleteRequirements ?? []).some((req) => pattern.test(req.label) || req.details.some((d) => pattern.test(d)))
}

export function getSchoolPlanningWarnings(
  profile: UserProfile,
  audit: AuditResult | null,
  semesters: PlannedSemester[]
): SchoolWarning[] {
  const warnings: SchoolWarning[] = []
  const homeSchool = profile.homeSchool ?? 'LSA'
  const baseline = SCHOOL_BASELINES[homeSchool] ?? SCHOOL_BASELINES.Other
  const totalCreditsTracked = creditsSoFar(audit, semesters)
  const codes = getTakenAndPlannedCodes(audit, semesters)

  warnings.push({
    id: 'baseline-credits',
    level: totalCreditsTracked >= baseline.minCredits ? 'info' : 'warn',
    message: `${homeSchool}: tracked credits ${totalCreditsTracked}/${baseline.minCredits} minimum.`,
  })

  warnings.push({
    id: 'baseline-residency',
    level: 'info',
    message: `${homeSchool} residency reminder: ${baseline.residency}.`,
  })

  warnings.push({
    id: 'baseline-gpa',
    level: 'info',
    message: `${homeSchool} GPA floor reminder: ${baseline.minGpa}.`,
  })

  if (baseline.languageRequired) {
    warnings.push({
      id: 'baseline-language',
      level: 'warn',
      message: `${homeSchool} usually requires language proficiency (4th-term equivalent).`,
    })
  }

  if (homeSchool === 'LSA') {
    const apTransferCount = (audit?.completedCourses ?? []).filter((c) => /ap|transfer/i.test(c.grade)).length
    if (apTransferCount > 0) {
      warnings.push({
        id: 'lsa-ap-limits',
        level: 'warn',
        message: 'LSA reminder: AP/IB often helps prerequisites/electives but may not satisfy FYWR, ULWR, or distribution/QR requirements.',
      })
    }

    if (hasIncompleteReq(audit, /writing|fywr|ulwr/i)) {
      warnings.push({
        id: 'lsa-writing',
        level: 'critical',
        message: 'Audit indicates writing requirement gaps; schedule FYWR/ULWR early enough to avoid senior-year bottlenecks.',
      })
    }

    if (hasIncompleteReq(audit, /language|quantitative|distribution|race|ethnicity/i)) {
      warnings.push({
        id: 'lsa-distribution',
        level: 'warn',
        message: 'Audit still shows LSA distribution/language/QR-style gaps; keep those in the semester plan, not just major credits.',
      })
    }
  }

  if (homeSchool === 'Engineering') {
    const core = ['MATH 115', 'MATH 116', 'MATH 215', 'MATH 216']
    const missingCore = core.filter((code) => !codes.has(code))
    if (missingCore.length > 0) {
      warnings.push({
        id: 'coe-math-core',
        level: 'critical',
        message: `Engineering core sequence still missing: ${missingCore.join(', ')}.`,
      })
    }

    warnings.push({
      id: 'coe-c-rule',
      level: 'warn',
      message: 'Engineering reminder: many required math/science/engineering courses require C/C- minimums and may require retake if below threshold.',
    })
  }

  if (homeSchool === 'Ross') {
    const hasEcon101 = codes.has('ECON 101')
    const hasEcon102 = codes.has('ECON 102')
    if (!hasEcon101 || !hasEcon102) {
      warnings.push({
        id: 'ross-econ-prereqs',
        level: 'critical',
        message: 'Ross pathway reminder: ECON 101 and ECON 102 should be completed on time for cohort progression.',
      })
    }

    const bstratPlacements = semesters.flatMap((sem) =>
      sem.courses.filter((course) => course.code.toUpperCase() === 'BSTRAT 400').map(() => sem)
    )
    if (bstratPlacements.some((sem) => sem.season !== 'Winter')) {
      warnings.push({
        id: 'ross-bstrat-term',
        level: 'critical',
        message: 'Ross reminder: BSTRAT 400 is expected in Winter of senior year; current placement should be reviewed.',
      })
    }

    warnings.push({
      id: 'ross-sequence',
      level: 'warn',
      message: 'Ross core is cohort-sequenced (including RIS/ILP milestones). Verify sequence timing each term.',
    })
  }

  return warnings
}
