import type {
  UserProfile,
  CompletedCourse,
  InProgressCourse,
  IncompleteRequirement,
  PlannedSemester,
  SchoolWarning,
  RankedCourse,
  PlannedCourse,
} from './types'

// Mirrors the SemesterPlanner violation logic for system prompt context
function normCode(code: string): string {
  return code.toUpperCase().trim().replace(/^([A-Z]+)(\d)/, '$1 $2')
}
const CONJ = new Set(['OR', 'AND', 'OF', 'THE', 'IN', 'AT', 'TO', 'A', 'AN', 'NO', 'OP'])
function isValidCode(p: string): boolean {
  return /^[A-Z]{2,8}\s\d{3}[A-Z]?$/.test(p) && !CONJ.has(p.split(' ')[0])
}

function buildViolationSummary(semesters: PlannedSemester[], completedCourses: CompletedCourse[]): string {
  const violations: string[] = []
  const completedSet = new Set(completedCourses.map((c) => normCode(c.code)))

  for (let i = 0; i < semesters.length; i++) {
    const available = new Set<string>(completedSet)
    for (let j = 0; j < i; j++) {
      semesters[j].courses.forEach((c) => available.add(normCode(c.code)))
    }

    for (const course of semesters[i].courses) {
      const key = normCode(course.code)
      const groups: string[][] = course.prereqGroups && course.prereqGroups.length > 0
        ? course.prereqGroups
        : course.prereqs && course.prereqs.length > 0 ? [course.prereqs] : []
      if (groups.length === 0) continue

      const unsatisfied = groups
        .map((g) => g.map(normCode).filter((p) => isValidCode(p) && p !== key))
        .filter((g) => g.length > 0)
        .filter((g) => !g.some((p) => available.has(p)))

      if (unsatisfied.length > 0) {
        const desc = unsatisfied.map((g) =>
          g.length === 1 ? g[0] : `one of ${g.slice(0, 3).join('/')}`
        ).join(' AND ')
        violations.push(`• ${course.code} in ${semesters[i].label}: needs ${desc} completed in a PRIOR semester (not the same semester)`)
      }
    }
  }

  return violations.length > 0 ? violations.join('\n') : 'None detected'
}

const DIFFICULTY_LABELS: Record<string, string> = {
  light: 'light (0–15 hrs/week)',
  balanced: 'balanced (15–25 hrs/week)',
  heavy: 'heavy (25–40+ hrs/week)',
}

export function buildSystemPrompt(
  profile: UserProfile,
  completedCourses: CompletedCourse[],
  inProgressCourses: InProgressCourse[],
  incompleteRequirements: IncompleteRequirement[],
  plannedSemesters: PlannedSemester[],
  topRecommended: RankedCourse[],
  schoolWarnings: SchoolWarning[]
): string {
  const completedList =
    completedCourses.length > 0
      ? completedCourses.map((c) => `${c.code}${c.grade ? ` (${c.grade})` : ''}${c.term ? ` [${c.term}]` : ''}`).join(', ')
      : 'No courses completed yet'

  const inProgressList =
    inProgressCourses.length > 0
      ? inProgressCourses.map((c) => `${c.code} — ${c.name} (${c.credits} cr)`).join(', ')
      : 'None'

  const incompleteList =
    incompleteRequirements.length > 0
      ? incompleteRequirements.map((r) => `• ${r.label}${r.details.length > 0 ? ': ' + r.details.join(', ') : ''}`).join('\n')
      : 'All requirements complete or unknown'

  const plannedList =
    plannedSemesters.length > 0
      ? plannedSemesters
          .filter((s) => s.courses.length > 0)
          .map((s) => `${s.label}: ${s.courses.map((c) => c.code).join(', ')}`)
          .join(' | ')
      : 'No courses planned yet'

  const violationSummary = buildViolationSummary(plannedSemesters, completedCourses)

  const recommendedList = topRecommended
    .slice(0, 10)
    .map(
      (r) =>
        `• ${r.course.code} — ${r.course.name} (priority: ${Math.round(r.score)}/100, source: ${r.course.source}, prereqs: ${r.prereqStatus}, ~${r.course.estimatedHoursPerWeek}h/wk, difficulty: ${r.course.difficulty}/5${r.priorityNote ? `, note: ${r.priorityNote}` : ''})`
    )
    .join('\n')

  const warningList =
    schoolWarnings.length > 0
      ? schoolWarnings.map((w) => `• [${w.level.toUpperCase()}] ${w.message}`).join('\n')
      : 'No active school-specific warnings'

  return `You are a University of Michigan academic planning assistant.
You must be candid, concise, and source-grounded:
- Use tool output and provided context for facts.
- If data is missing, explicitly say what is unknown.
- Do not infer unavailable details from memory.

STUDENT PROFILE:
- Name: ${profile.name || 'Student'}
- Year: ${profile.year}
- Home School: ${profile.homeSchool}
- Intended Program: ${profile.intendedProgram || 'Not specified'}
- Major(s): ${profile.majors.join(', ') || 'Undeclared'}
- Career Goal: ${profile.careerGoal || 'Not specified'}
- Interests / Notes: ${profile.interests || 'Not specified'}
- Workload Preference: ${DIFFICULTY_LABELS[profile.difficultyPreference] ?? profile.difficultyPreference}
- Target Graduation: ${profile.targetGradSemester}
- Planning for: ${profile.currentSeason} ${profile.currentYear}

COMPLETED COURSES (${completedCourses.length} total):
${completedList}

IN-PROGRESS THIS SEMESTER:
${inProgressList}

INCOMPLETE DEGREE REQUIREMENTS:
${incompleteList}

SCHOOL-SPECIFIC WARNINGS:
${warningList}

CURRENTLY PLANNED COURSES:
${plannedList}

PREREQ VIOLATIONS IN CURRENT PLAN:
${violationSummary}

CURRENT PRIORITY COURSE LIST:
${recommendedList || 'No recommendations computed yet'}

CAPABILITY BOUNDARIES:
- You can use tools to search the local course database, update the left Course List priorities, and mutate the local planner (add/move/remove planned courses), including auto-building multi-semester schedules.
- You cannot access Wolverine Access, Atlas accounts, school backpack, registration systems, or any external student account.
- If asked to do something outside these capabilities, say so directly and briefly, then offer the closest actionable alternative.
- Do not claim scheduling/roadmap features are unavailable; use tools to perform them.

YOUR ADVISING GUIDELINES:
1. Always reference specific course codes (e.g., "EECS 445" not just "machine learning course").
2. Warn if a semester exceeds 18 credits or combines 2+ courses with difficulty ≥ 4.
3. Respect offering patterns — don't recommend Fall-only courses if student is planning for Winter.
4. Suggest internship prep timing based on the student's goal and timeline.
5. Be candid and concise. Do not make assumptions when data is missing; explicitly state uncertainty.
6. Prefer database-backed facts via tools. Do not invent prerequisites, offerings, policies, or URLs.
7. For direct course questions (e.g., "what is EECS 281"), use exact course lookup tools before answering.
8. For "next semester" or "first semester" planning, do not recommend locked courses unless you clearly label them as longer-term targets and provide immediate prerequisite alternatives.
9. For broad topic asks (e.g., "good classes for X"), run multiple search queries/paraphrases and synthesize from combined results.
10. If a tool call fails, retry with a simpler alternative query strategy before giving up.
11. If a request cannot be completed, clearly say it cannot be done and why.
12. When recommending courses, update the Course List with explicit priority scores using tool calls.
13. If the user asks to build a schedule/roadmap and does not provide full course-by-course details, proactively use scheduling tools to draft one; do not ask unnecessary follow-up questions.
14. Keep responses focused and concise — default to ~80–180 words unless asked for more detail.
15. When the user says "fix my schedule", "look at my schedule", "check my schedule", or similar vague review requests: immediately check the PREREQ VIOLATIONS section above. If violations exist, use move_planner_course to push each violating course to the earliest semester where its prereqs are satisfied — do NOT ask for clarification first. If no violations, say so and offer other improvements.
16. CRITICAL prerequisite rule: a prerequisite course must be fully completed in a PRIOR semester — never in the same semester as the course that requires it. If ECON 101 is a prereq for ECON 370, and ECON 101 is in Fall 2027, then ECON 370 must go in Winter 2028 or later — NOT Fall 2027.`
}
