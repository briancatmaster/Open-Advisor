'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, ArrowRight, User, GraduationCap, Target, BookOpen, Plus, X, ChevronDown } from 'lucide-react'
import { useStore } from '@/lib/store'
import { useShallow } from 'zustand/react/shallow'
import type { AcademicYear, DifficultyPreference, HomeSchool, UserProfile } from '@/lib/types'

const DIFFICULTY_OPTIONS: { value: DifficultyPreference; label: string; sub: string }[] = [
  { value: 'light', label: 'Light', sub: '< 15 hrs/week' },
  { value: 'balanced', label: 'Balanced', sub: '15–25 hrs/week' },
  { value: 'heavy', label: 'Heavy', sub: '25–40+ hrs/week' },
]

const POPULAR_MAJORS = [
  'Computer Science (CoE)', 'Computer Science (LSA)', 'Data Science',
  'Electrical Engineering', 'Mechanical Engineering', 'Mathematics',
  'Statistics', 'Ross Business', 'Robotics', 'Cognitive Science',
  'Economics', 'Physics', 'Bioinformatics',
]

const COMMON_AP_COURSES = [
  'MATH 115', 'MATH 116', 'STATS 250', 'EECS 183',
  'CHEM 130', 'PHYSICS 140', 'ENGLISH 125',
]

const HOME_SCHOOLS: HomeSchool[] = [
  'LSA',
  'Engineering',
  'Ross',
  'Nursing',
  'Kinesiology',
  'Stamps',
  'Taubman',
  'UMSI',
  'SMTD',
  'Other',
]

const SEASONS = ['Fall', 'Winter'] as const
const GRAD_SEMESTERS = SEASONS.flatMap((s) =>
  [2025, 2026, 2027, 2028, 2029, 2030].map((y) => `${s} ${y}`)
)

export default function ProfilePage() {
  const router = useRouter()
  const { setProfile, initSemesters, auditResult } = useStore(
    useShallow((s) => ({
      setProfile: s.setProfile,
      initSemesters: s.initSemesters,
      auditResult: s.auditResult,
    }))
  )

  const [name, setName] = useState(auditResult?.studentName ?? '')
  const [year, setYear] = useState<AcademicYear>('Freshman')
  const [majors, setMajors] = useState<string[]>(
    auditResult?.major ? [auditResult.major] : []
  )
  const [majorInput, setMajorInput] = useState('')
  const [careerGoal, setCareerGoal] = useState('')
  const [interests, setInterests] = useState('')
  const [homeSchool, setHomeSchool] = useState<HomeSchool>('LSA')
  const [intendedProgram, setIntendedProgram] = useState('')
  const [difficulty, setDifficulty] = useState<DifficultyPreference>('balanced')
  const [gradSemester, setGradSemester] = useState('Winter 2029')
  const [currentSeason, setCurrentSeason] = useState<'Fall' | 'Winter'>('Winter')
  const [currentYear, setCurrentYear] = useState(2026)
  const [pastCourseInput, setPastCourseInput] = useState('')
  const [manualCourses, setManualCourses] = useState<string[]>([])

  function addMajor(m: string) {
    const trimmed = m.trim()
    if (trimmed && !majors.includes(trimmed)) setMajors((prev) => [...prev, trimmed])
    setMajorInput('')
  }

  function addManualCourse(code: string) {
    const trimmed = code.trim().toUpperCase()
    if (trimmed && !manualCourses.includes(trimmed)) setManualCourses((prev) => [...prev, trimmed])
    setPastCourseInput('')
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()

    if (manualCourses.length > 0 && auditResult) {
      const existing = new Set(auditResult.completedCourses.map((c) => c.code))
      const extra = manualCourses.filter((c) => !existing.has(c)).map((code) => ({
        code, name: '', credits: 3, grade: 'AP/Transfer', term: 'Prior',
      }))
      useStore.setState((s) => ({
        auditResult: s.auditResult
          ? { ...s.auditResult, completedCourses: [...s.auditResult.completedCourses, ...extra] }
          : s.auditResult,
      }))
    }

    const profile: UserProfile = {
      name,
      year,
      majors: majors.length > 0 ? majors : ['Undeclared'],
      homeSchool,
      intendedProgram: intendedProgram.trim() || undefined,
      careerGoal,
      interests,
      difficultyPreference: difficulty,
      targetGradSemester: gradSemester,
      currentSeason,
      currentYear,
    }

    setProfile(profile)
    initSemesters(currentSeason, currentYear)
    router.push('/dashboard')
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-umblue-50 via-white to-maize-50">
      <div className="max-w-2xl mx-auto px-4 py-16">
        <Link href="/upload" className="inline-flex items-center gap-2 text-sm text-gray-500 hover:text-umblue mb-8 transition-colors">
          <ArrowLeft className="w-4 h-4" />Back
        </Link>

        <div className="flex items-center gap-2 mb-8">
          {['Upload', 'Profile', 'Plan'].map((step, i) => (
            <div key={step} className="flex items-center gap-2">
              <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold ${i === 1 ? 'bg-umblue text-white' : i === 0 ? 'bg-green-500 text-white' : 'bg-gray-100 text-gray-400'}`}>
                {i === 0 ? '✓' : i + 1}
              </div>
              <span className={`text-sm font-medium ${i === 1 ? 'text-umblue' : i === 0 ? 'text-green-600' : 'text-gray-400'}`}>{step}</span>
              {i < 2 && <div className="w-8 h-px bg-gray-200" />}
            </div>
          ))}
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* About You */}
          <div className="bg-white rounded-3xl shadow-sm border border-gray-100 p-6">
            <div className="flex items-center gap-2 mb-5">
              <User className="w-5 h-5 text-umblue" />
              <h2 className="font-bold text-umblue text-lg">About you</h2>
            </div>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Name <span className="text-gray-400 font-normal">(optional)</span></label>
                <input type="text" value={name} onChange={(e) => setName(e.target.value)} placeholder="Your name"
                  className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-maize" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Academic year</label>
                <div className="grid grid-cols-4 gap-2">
                  {(['Freshman', 'Sophomore', 'Junior', 'Senior'] as AcademicYear[]).map((y) => (
                    <button key={y} type="button" onClick={() => setYear(y)}
                      className={`py-2 rounded-xl text-sm font-medium border transition-colors ${year === y ? 'bg-umblue text-white border-umblue' : 'bg-white text-gray-600 border-gray-200 hover:border-umblue'}`}>
                      {y}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Academic Plan */}
          <div className="bg-white rounded-3xl shadow-sm border border-gray-100 p-6">
            <div className="flex items-center gap-2 mb-5">
              <GraduationCap className="w-5 h-5 text-umblue" />
              <h2 className="font-bold text-umblue text-lg">Academic plan</h2>
            </div>
            <div className="space-y-4">
              {/* Majors */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Home school</label>
                <div className="relative mb-3">
                  <select
                    value={homeSchool}
                    onChange={(e) => setHomeSchool(e.target.value as HomeSchool)}
                    className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-maize appearance-none bg-white"
                  >
                    {HOME_SCHOOLS.map((school) => (
                      <option key={school} value={school}>
                        {school}
                      </option>
                    ))}
                  </select>
                  <ChevronDown className="absolute right-3 top-3 w-4 h-4 text-gray-400 pointer-events-none" />
                </div>

                <label className="block text-sm font-medium text-gray-700 mb-1.5">Major(s)</label>
                <div className="flex gap-2 mb-2">
                  <div className="relative flex-1">
                    <input type="text" value={majorInput} onChange={(e) => setMajorInput(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), addMajor(majorInput))}
                      placeholder="e.g. Computer Science, Statistics" list="major-suggestions"
                      className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-maize" />
                    <datalist id="major-suggestions">{POPULAR_MAJORS.map((m) => <option key={m} value={m} />)}</datalist>
                  </div>
                  <button type="button" onClick={() => addMajor(majorInput)} disabled={!majorInput.trim()}
                    className="p-2.5 bg-umblue text-white rounded-xl hover:bg-umblue-600 disabled:opacity-40 transition-colors">
                    <Plus className="w-4 h-4" />
                  </button>
                </div>
                {majors.length > 0 && (
                  <div className="flex flex-wrap gap-2">
                    {majors.map((m) => (
                      <span key={m} className="flex items-center gap-1.5 bg-umblue-50 text-umblue text-xs font-medium px-3 py-1.5 rounded-full">
                        {m}
                        <button type="button" onClick={() => setMajors((prev) => prev.filter((x) => x !== m))}><X className="w-3 h-3" /></button>
                      </span>
                    ))}
                  </div>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">
                  Intended program <span className="text-gray-400 font-normal">(optional)</span>
                </label>
                <input
                  type="text"
                  value={intendedProgram}
                  onChange={(e) => setIntendedProgram(e.target.value)}
                  placeholder="e.g. Computer Science BSE, Economics BA, BBA"
                  className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-maize"
                />
              </div>

              {/* Grad + Planning */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">Target graduation</label>
                  <div className="relative">
                    <select value={gradSemester} onChange={(e) => setGradSemester(e.target.value)}
                      className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-maize appearance-none bg-white">
                      {GRAD_SEMESTERS.map((s) => <option key={s} value={s}>{s}</option>)}
                    </select>
                    <ChevronDown className="absolute right-3 top-3 w-4 h-4 text-gray-400 pointer-events-none" />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">Planning for</label>
                  <div className="flex gap-2">
                    {SEASONS.map((s) => (
                      <button key={s} type="button" onClick={() => setCurrentSeason(s)}
                        className={`flex-1 py-2.5 rounded-xl text-sm font-medium border transition-colors ${currentSeason === s ? 'bg-umblue text-white border-umblue' : 'bg-white text-gray-600 border-gray-200 hover:border-umblue'}`}>
                        {s}
                      </button>
                    ))}
                  </div>
                  <div className="flex gap-2 mt-2">
                    {[2025, 2026].map((y) => (
                      <button key={y} type="button" onClick={() => setCurrentYear(y)}
                        className={`flex-1 py-2 rounded-xl text-sm font-medium border transition-colors ${currentYear === y ? 'bg-umblue text-white border-umblue' : 'bg-white text-gray-600 border-gray-200 hover:border-umblue'}`}>
                        {y}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Goals */}
          <div className="bg-white rounded-3xl shadow-sm border border-gray-100 p-6">
            <div className="flex items-center gap-2 mb-5">
              <Target className="w-5 h-5 text-umblue" />
              <h2 className="font-bold text-umblue text-lg">Goals & interests</h2>
            </div>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">
                  Career goal <span className="text-gray-400 font-normal">(in your own words)</span>
                </label>
                <input type="text" value={careerGoal} onChange={(e) => setCareerGoal(e.target.value)}
                  placeholder="e.g. ML engineer at a startup, quant researcher, PhD in CS, undecided"
                  className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-maize" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">
                  Interests & notes <span className="text-gray-400 font-normal">(optional)</span>
                </label>
                <textarea value={interests} onChange={(e) => setInterests(e.target.value)} rows={2}
                  placeholder="e.g. interested in a stats minor, love algorithms, want to do research"
                  className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-maize resize-none" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Preferred workload</label>
                <div className="grid grid-cols-3 gap-2">
                  {DIFFICULTY_OPTIONS.map((opt) => (
                    <button key={opt.value} type="button" onClick={() => setDifficulty(opt.value)}
                      className={`py-3 rounded-xl border text-center transition-colors ${difficulty === opt.value ? 'bg-maize border-maize text-umblue' : 'bg-white text-gray-600 border-gray-200 hover:border-maize'}`}>
                      <p className="text-sm font-semibold">{opt.label}</p>
                      <p className="text-xs text-gray-500 mt-0.5">{opt.sub}</p>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* AP / Transfer credits */}
          <div className="bg-white rounded-3xl shadow-sm border border-gray-100 p-6">
            <div className="flex items-center gap-2 mb-2">
              <BookOpen className="w-5 h-5 text-umblue" />
              <h2 className="font-bold text-umblue text-lg">AP / transfer credits</h2>
            </div>
            <p className="text-xs text-gray-400 mb-4">Add any credits not captured in your audit.</p>
            <div className="flex gap-2 mb-3">
              <input type="text" value={pastCourseInput} onChange={(e) => setPastCourseInput(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), addManualCourse(pastCourseInput))}
                placeholder="e.g. MATH 115" list="ap-suggestions"
                className="flex-1 border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-maize" />
              <datalist id="ap-suggestions">{COMMON_AP_COURSES.map((c) => <option key={c} value={c} />)}</datalist>
              <button type="button" onClick={() => addManualCourse(pastCourseInput)} disabled={!pastCourseInput.trim()}
                className="p-2.5 bg-umblue text-white rounded-xl hover:bg-umblue-600 disabled:opacity-40 transition-colors">
                <Plus className="w-4 h-4" />
              </button>
            </div>
            <div className="flex flex-wrap gap-2">
              {auditResult?.completedCourses.slice(0, 12).map((c) => (
                <span key={c.code} className="bg-green-50 text-green-700 text-xs font-medium px-2.5 py-1 rounded-full border border-green-200">{c.code} ✓</span>
              ))}
              {manualCourses.map((c) => (
                <span key={c} className="flex items-center gap-1 bg-maize-50 text-umblue text-xs font-medium px-2.5 py-1 rounded-full border border-maize-200">
                  {c} (AP)
                  <button type="button" onClick={() => setManualCourses((prev) => prev.filter((x) => x !== c))}><X className="w-3 h-3" /></button>
                </span>
              ))}
              {(auditResult?.completedCourses.length ?? 0) > 12 && (
                <span className="bg-gray-100 text-gray-500 text-xs px-2.5 py-1 rounded-full">+{(auditResult?.completedCourses.length ?? 0) - 12} more</span>
              )}
            </div>
          </div>

          <button type="submit"
            className="w-full bg-umblue text-white font-bold py-4 rounded-2xl hover:bg-umblue-600 transition-colors flex items-center justify-center gap-2 text-base shadow-lg shadow-umblue/20">
            Build my course pathway
            <ArrowRight className="w-5 h-5" />
          </button>
        </form>
      </div>
    </div>
  )
}
