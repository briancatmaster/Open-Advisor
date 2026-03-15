'use client'

import { CheckCircle2, BookOpen, List, AlertTriangle, Clock } from 'lucide-react'
import type { AuditResult } from '@/lib/types'

interface Props {
  result: AuditResult
  onConfirm: () => void
  onRedo: () => void
}

export default function ParseResults({ result, onConfirm, onRedo }: Props) {
  const { completedCourses, inProgressCourses, remainingCourses, incompleteRequirements, studentName, major, parseConfidence } = result
  const lowConfidence = parseConfidence < 0.7

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start gap-3">
        <CheckCircle2 className="w-6 h-6 text-green-500 mt-0.5 shrink-0" />
        <div>
          <h3 className="font-semibold text-umblue text-lg">Audit parsed successfully</h3>
          {studentName && <p className="text-sm text-gray-500">Student: {studentName}</p>}
          {major && <p className="text-sm text-gray-500">Program: {major}</p>}
        </div>
      </div>

      {/* Low confidence warning */}
      {lowConfidence && (
        <div className="flex gap-2 p-3 bg-amber-50 border border-amber-200 rounded-xl text-sm">
          <AlertTriangle className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
          <p className="text-amber-700">
            The audit format wasn&apos;t fully recognized. We extracted what we could — please review below and edit manually if needed.
          </p>
        </div>
      )}

      {/* Stats row */}
      <div className="grid grid-cols-3 gap-3">
        <div className="bg-green-50 border border-green-200 rounded-xl p-3 text-center">
          <p className="text-2xl font-bold text-green-700">{completedCourses.length}</p>
          <p className="text-xs text-green-600 font-medium mt-1">Completed</p>
        </div>
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 text-center">
          <p className="text-2xl font-bold text-amber-600">{inProgressCourses.length}</p>
          <p className="text-xs text-amber-600 font-medium mt-1">In Progress</p>
        </div>
        <div className="bg-umblue-50 border border-umblue-100 rounded-xl p-3 text-center">
          <p className="text-2xl font-bold text-umblue">{incompleteRequirements.length}</p>
          <p className="text-xs text-umblue font-medium mt-1">Unmet Reqs</p>
        </div>
      </div>

      {/* Completed courses list */}
      {completedCourses.length > 0 && (
        <div>
          <div className="flex items-center gap-2 mb-2">
            <BookOpen className="w-4 h-4 text-green-500" />
            <h4 className="text-sm font-semibold text-gray-700">Completed</h4>
          </div>
          <div className="max-h-40 overflow-y-auto scrollbar-thin rounded-xl border border-gray-100 bg-white">
            {completedCourses.map((c) => (
              <div
                key={c.code}
                className="flex items-center justify-between px-3 py-2 border-b border-gray-50 last:border-0 text-sm"
              >
                <span className="font-medium text-umblue">{c.code}</span>
                <div className="flex gap-3 text-gray-400">
                  {c.grade && (
                    <span className="text-xs font-medium text-gray-600">{c.grade}</span>
                  )}
                  {c.term && <span className="text-xs">{c.term}</span>}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* In-progress courses */}
      {inProgressCourses.length > 0 && (
        <div>
          <div className="flex items-center gap-2 mb-2">
            <Clock className="w-4 h-4 text-amber-500" />
            <h4 className="text-sm font-semibold text-gray-700">In Progress</h4>
          </div>
          <div className="max-h-32 overflow-y-auto scrollbar-thin rounded-xl border border-gray-100 bg-white">
            {inProgressCourses.map((c) => (
              <div key={c.code} className="flex items-center justify-between px-3 py-2 border-b border-gray-50 last:border-0 text-sm">
                <span className="font-medium text-umblue">{c.code}</span>
                <div className="flex gap-3 text-gray-400">
                  <span className="text-xs">{c.term}</span>
                  <span className="text-xs">{c.credits} cr</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Incomplete requirements */}
      {incompleteRequirements.length > 0 && (
        <div>
          <div className="flex items-center gap-2 mb-2">
            <List className="w-4 h-4 text-red-400" />
            <h4 className="text-sm font-semibold text-gray-700">Unmet Requirements</h4>
          </div>
          <div className="max-h-36 overflow-y-auto scrollbar-thin rounded-xl border border-gray-100 bg-white">
            {incompleteRequirements.map((r, i) => (
              <div key={i} className="px-3 py-2 border-b border-gray-50 last:border-0">
                <p className="text-xs font-medium text-gray-700">{r.label}</p>
                {r.details.length > 0 && (
                  <p className="text-xs text-gray-400 mt-0.5">{r.details.join(' · ')}</p>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Remaining courses list */}
      {remainingCourses.length > 0 && (
        <div>
          <div className="flex items-center gap-2 mb-2">
            <List className="w-4 h-4 text-umblue" />
            <h4 className="text-sm font-semibold text-gray-700">Still needed</h4>
          </div>
          <div className="max-h-36 overflow-y-auto scrollbar-thin rounded-xl border border-gray-100 bg-white">
            {remainingCourses.map((c) => (
              <div
                key={c.code}
                className="flex items-center justify-between px-3 py-2 border-b border-gray-50 last:border-0 text-sm"
              >
                <span className="font-medium text-umblue">{c.code}</span>
                <span className="text-xs text-gray-400">{c.credits} cr</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Actions */}
      <div className="flex gap-3">
        <button
          onClick={onConfirm}
          className="flex-1 bg-umblue text-white font-semibold py-3 rounded-xl hover:bg-umblue-600 transition-colors"
        >
          Looks good — continue
        </button>
        <button
          onClick={onRedo}
          className="px-4 py-3 border border-gray-200 text-gray-600 font-medium rounded-xl hover:bg-gray-50 transition-colors text-sm"
        >
          Re-upload
        </button>
      </div>
    </div>
  )
}
