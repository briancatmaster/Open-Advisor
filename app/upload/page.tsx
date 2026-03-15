'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, Zap } from 'lucide-react'
import AuditUploader from '@/components/AuditUploader'
import ParseResults from '@/components/ParseResults'
import { useStore } from '@/lib/store'
import type { AuditResult } from '@/lib/types'

export default function UploadPage() {
  const router = useRouter()
  const setAuditResult = useStore((s) => s.setAuditResult)
  const [parsed, setParsed] = useState<AuditResult | null>(null)

  function handleParsed(result: AuditResult) {
    setParsed(result)
  }

  function handleConfirm() {
    if (!parsed) return
    setAuditResult(parsed)
    router.push('/profile')
  }

  function handleRedo() {
    setParsed(null)
  }

  // Allow skipping audit upload (manual course entry on profile page)
  function handleSkip() {
    setAuditResult({
      studentName: '',
      major: '',
      completedCourses: [],
      inProgressCourses: [],
      remainingCourses: [],
      incompleteRequirements: [],
      rawText: '',
      parseConfidence: 0,
    })
    router.push('/profile')
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-umblue-50 via-white to-maize-50">
      <div className="max-w-2xl mx-auto px-4 py-16">
        {/* Back */}
        <Link
          href="/"
          className="inline-flex items-center gap-2 text-sm text-gray-500 hover:text-umblue mb-8 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to home
        </Link>

        {/* Step indicator */}
        <div className="flex items-center gap-2 mb-8">
          {['Upload', 'Profile', 'Plan'].map((step, i) => (
            <div key={step} className="flex items-center gap-2">
              <div
                className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold
                  ${i === 0 ? 'bg-umblue text-white' : 'bg-gray-100 text-gray-400'}`}
              >
                {i + 1}
              </div>
              <span className={`text-sm font-medium ${i === 0 ? 'text-umblue' : 'text-gray-400'}`}>
                {step}
              </span>
              {i < 2 && <div className="w-8 h-px bg-gray-200" />}
            </div>
          ))}
        </div>

        {/* Card */}
        <div className="bg-white rounded-3xl shadow-xl border border-gray-100 p-8">
          {!parsed ? (
            <>
              <h1 className="text-2xl font-bold text-umblue mb-2">Upload your degree audit</h1>
              <p className="text-gray-500 text-sm mb-8">
                We&apos;ll extract your completed courses and remaining requirements automatically.
              </p>
              <AuditUploader onParsed={handleParsed} />

              <div className="mt-6 pt-6 border-t border-gray-100 text-center">
                <p className="text-xs text-gray-400 mb-2">Don&apos;t have your audit handy?</p>
                <button
                  onClick={handleSkip}
                  className="inline-flex items-center gap-1.5 text-sm text-umblue font-medium hover:underline"
                >
                  <Zap className="w-3.5 h-3.5" />
                  Skip and enter courses manually
              {/* eslint-disable-next-line react/no-unescaped-entities */}
                </button>
              </div>
            </>
          ) : (
            <>
              <h1 className="text-2xl font-bold text-umblue mb-6">Review your audit</h1>
              <ParseResults result={parsed} onConfirm={handleConfirm} onRedo={handleRedo} />
            </>
          )}
        </div>
      </div>
    </div>
  )
}
