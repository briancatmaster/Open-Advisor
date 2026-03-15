import type { CareerGoal } from './types'

const GOAL_KEYWORDS: Array<{ goal: CareerGoal; terms: string[] }> = [
  { goal: 'software-engineering', terms: ['software', 'swe', 'full stack', 'backend', 'frontend', 'web'] },
  { goal: 'machine-learning', terms: ['machine learning', 'ml', 'ai', 'deep learning', 'neural'] },
  { goal: 'data-science', terms: ['data science', 'analytics', 'analyst', 'bi', 'statistics'] },
  { goal: 'quantitative-finance', terms: ['quant', 'quant finance', 'trading', 'hedge fund', 'finance'] },
  { goal: 'robotics', terms: ['robotics', 'autonomous', 'controls', 'perception'] },
  { goal: 'research-phd', terms: ['phd', 'research', 'graduate school', 'academia'] },
  { goal: 'product-management', terms: ['product manager', 'pm', 'product management'] },
]

export function normalizeCareerGoal(input: string): CareerGoal {
  const raw = input.trim().toLowerCase()
  if (!raw) return 'undecided'

  const exact = GOAL_KEYWORDS.find((entry) => entry.goal === raw)
  if (exact) return exact.goal

  for (const entry of GOAL_KEYWORDS) {
    if (entry.terms.some((term) => raw.includes(term))) {
      return entry.goal
    }
  }

  return 'undecided'
}
