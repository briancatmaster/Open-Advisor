import Link from 'next/link'
import { GraduationCap, Upload, Sparkles, LayoutDashboard, ArrowRight, CheckCircle } from 'lucide-react'

const FEATURES = [
  {
    icon: Upload,
    title: 'Parse your audit',
    desc: 'Upload your UMich degree audit PDF and we automatically extract completed and remaining courses.',
  },
  {
    icon: Sparkles,
    title: 'AI-ranked pathways',
    desc: 'Courses are ranked by career relevance, prerequisite readiness, and offering patterns — not just alphabetically.',
  },
  {
    icon: LayoutDashboard,
    title: 'Build your 4-year plan',
    desc: 'Drag courses into semesters, get workload warnings, and see your full degree pathway visualized.',
  },
]

const BULLETS = [
  'Considers prerequisites, offering seasons, and difficulty',
  'Personalized to your career goal (SWE, ML, Quant Finance, Robotics…)',
  'AI advisor answers questions about your specific plan',
  'UMich course database with professor info & workload data',
]

export default function LandingPage() {
  return (
    <div
      className="min-h-screen"
      style={{
        backgroundImage:
          'radial-gradient(1200px 520px at 12% 48%, rgba(255,255,255,0.18), rgba(255,255,255,0) 60%), linear-gradient(120deg, #0b2f57 0%, #043b74 45%, #001a3d 100%)',
      }}
    >
      {/* Nav */}
      <nav className="flex items-center justify-between px-6 py-4 max-w-6xl mx-auto">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 bg-maize rounded-xl flex items-center justify-center">
            <GraduationCap className="w-5 h-5 text-umblue" />
          </div>
          <span className="font-bold text-white text-lg tracking-tight">OpenAdvisor</span>
        </div>
        <Link
          href="/upload"
          className="text-sm font-medium text-white/80 hover:text-white transition-colors"
        >
          Get started →
        </Link>
      </nav>

      {/* Hero */}
      <div className="max-w-6xl mx-auto px-6 pt-16 pb-24">
        <div className="max-w-3xl">
          {/* Badge */}
          <div className="inline-flex items-center gap-2 bg-white/10 border border-white/20 rounded-full px-4 py-1.5 mb-6">
            <span className="w-2 h-2 bg-maize rounded-full animate-pulse" />
            <span className="text-sm text-white/80 font-medium">University of Michigan · Powered by AI</span>
          </div>

          <h1 className="text-5xl font-extrabold text-white leading-tight mb-5">
            Plan your degree
            <span className="text-maize"> intelligently.</span>
          </h1>
          <p className="text-xl text-white/70 mb-8 leading-relaxed max-w-2xl">
            Upload your degree audit, set your career goals, and get a personalized course pathway —
            ranked by what matters: prerequisites, workload, and what gets you hired.
          </p>

          <div className="flex gap-4 items-center mb-12">
            <Link
              href="/upload"
              className="inline-flex items-center gap-2 bg-maize text-umblue font-bold px-8 py-4 rounded-2xl hover:bg-maize-600 transition-all hover:scale-[1.02] shadow-lg shadow-maize/20 text-base"
            >
              Start planning
              <ArrowRight className="w-5 h-5" />
            </Link>
            <Link
              href="/dashboard"
              className="inline-flex items-center gap-2 text-white/70 hover:text-white font-medium text-sm transition-colors"
            >
              Skip to dashboard →
            </Link>
          </div>

          {/* Bullets */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
            {BULLETS.map((b) => (
              <div key={b} className="flex items-start gap-2.5 text-white/70 text-sm">
                <CheckCircle className="w-4 h-4 text-maize shrink-0 mt-0.5" />
                <span>{b}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Feature cards */}
      <div className="bg-white/5 border-t border-white/10">
        <div className="max-w-6xl mx-auto px-6 py-16">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {FEATURES.map(({ icon: Icon, title, desc }, i) => (
              <div
                key={title}
                className="bg-white/10 backdrop-blur border border-white/20 rounded-3xl p-6 hover:bg-white/15 transition-colors"
              >
                <div className="w-11 h-11 bg-maize rounded-2xl flex items-center justify-center mb-4">
                  <Icon className="w-5 h-5 text-umblue" />
                </div>
                <div className="text-xs font-bold text-maize mb-1">Step {i + 1}</div>
                <h3 className="text-white font-bold text-lg mb-2">{title}</h3>
                <p className="text-white/60 text-sm leading-relaxed">{desc}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* CTA */}
      <div className="max-w-6xl mx-auto px-6 py-16 text-center">
        <h2 className="text-3xl font-bold text-white mb-4">Ready to plan smarter?</h2>
        <p className="text-white/60 mb-8">Takes less than 2 minutes to get your personalized pathway.</p>
        <Link
          href="/upload"
          className="inline-flex items-center gap-2 bg-maize text-umblue font-bold px-10 py-4 rounded-2xl hover:bg-maize-600 transition-all hover:scale-[1.02] shadow-xl shadow-maize/20 text-base"
        >
          Upload your audit
          <ArrowRight className="w-5 h-5" />
        </Link>
      </div>

      {/* Footer */}
      <footer className="border-t border-white/10 px-6 py-6 max-w-6xl mx-auto flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 bg-maize rounded-lg flex items-center justify-center">
            <GraduationCap className="w-3.5 h-3.5 text-umblue" />
          </div>
          <span className="text-white/40 text-sm">OpenAdvisor · University of Michigan</span>
        </div>
        <p className="text-white/30 text-xs">Built for students, by students.</p>
      </footer>
    </div>
  )
}
