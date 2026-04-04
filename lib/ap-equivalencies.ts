// AP & Test Credit Equivalency Map
// Maps test/exam course codes (from UMich audit) to the regular course codes
// they satisfy for prerequisite purposes.
//
// Derived from:
//   - umich-ap-credit-guide.md (official UMich AP credit guidelines 2026)
//   - UMich_Different_Schools_Guide.md (school-specific requirements)
//
// Format: { 'AP_CODE': ['SATISFIES_1', 'SATISFIES_2', ...] }
// When a student has AP_CODE in their completed courses, the prereq system
// treats them as also having completed each course in the array.

export const AP_EQUIVALENCIES: Record<string, string[]> = {
  // ── Mathematics ────────────────────────────────────────────────
  // AP Calc AB (5) or BC (4): MATH 120 ≈ MATH 115
  'MATH 120': ['MATH 115'],
  // AP Calc BC (5): MATH 121 ≈ MATH 116
  'MATH 121': ['MATH 116'],

  // ── Computer Science ───────────────────────────────────────────
  // AP CS A (5): EECS 180 → placement into EECS 280
  // EECS 180 satisfies same prereqs as EECS 183 (intro programming)
  'EECS 180': ['EECS 183'],
  // AP CS Principles: EECS 101X departmental
  'EECS 101X': [],

  // ── Sciences ───────────────────────────────────────────────────
  // AP Biology (4+): BIOLOGY 195 ≈ BIO 171 + 172
  'BIOLOGY 195': ['BIOLOGY 171', 'BIOLOGY 172', 'BIO 171', 'BIO 172'],
  // AP Biology (5): BIOLOGY 196 additional credit
  'BIOLOGY 196': [],

  // AP Chemistry (4+): CHEM 130 + 125/126 already exact codes
  // These are the actual course codes, no mapping needed

  // AP Physics C Mechanics (5): PHYS 139 ≈ PHYS 140 + 141
  'PHYS 139': ['PHYS 140', 'PHYS 141', 'PHYSICS 140', 'PHYSICS 141'],
  // AP Physics C E&M (5): PHYS 239 ≈ PHYS 240 + 241
  'PHYS 239': ['PHYS 240', 'PHYS 241', 'PHYSICS 240', 'PHYSICS 241'],
  // AP Physics 1+2 (algebra-based): PHYS 125+127+126+128
  'PHYS 125': ['PHYSICS 125'],
  'PHYS 126': ['PHYSICS 126'],
  'PHYS 127': [],
  'PHYS 128': [],

  // AP Environmental Science: EARTH 219 + 218
  'EARTH 219': [],
  'EARTH 218': [],

  // ── Social Sciences ────────────────────────────────────────────
  // AP Micro/Macro: departmental credit only, does NOT satisfy ECON 101/102
  'ECON 102X': [],
  'ECON 101X': [],

  // AP Psychology (4+): PSYCH 111
  // Already exact code, no mapping needed

  // AP US Gov: POLSCI 111 — already exact code
  // AP Comparative Gov: POLSCI 140 — already exact code

  // AP Statistics (4+): STATS 180
  'STATS 180': ['STATS 250'],

  // ── Humanities / Languages ─────────────────────────────────────
  // AP English: departmental credit only, does NOT satisfy FYWR
  'ENGLISH 101X': [],

  // AP History: 100-level departmental, does NOT count toward History major
  'HISTORY 101X': [],
  'HISTORY 103X': [],

  // ENGCMPTC departmental
  'ENGCMPTC 101X': [],
}

/**
 * Given a set of course codes the student has completed (including AP/test codes),
 * returns an expanded set that includes all equivalent courses those codes satisfy.
 *
 * Example: if student has 'MATH 120', the expanded set also includes 'MATH 115'.
 */
export function expandWithEquivalencies(codes: string[]): Set<string> {
  const expanded = new Set<string>()
  for (const code of codes) {
    const norm = code.toUpperCase().trim().replace(/^([A-Z]+)(\d)/, '$1 $2')
    expanded.add(norm)
    const equivs = AP_EQUIVALENCIES[norm]
    if (equivs) {
      for (const eq of equivs) {
        expanded.add(eq.toUpperCase().trim().replace(/^([A-Z]+)(\d)/, '$1 $2'))
      }
    }
  }
  return expanded
}
