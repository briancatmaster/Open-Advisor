'use client'

import { useEffect, useRef, useState } from 'react'
import { Send, Bot, User, Sparkles, RefreshCw } from 'lucide-react'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import { useStore } from '@/lib/store'
import { useShallow } from 'zustand/react/shallow'
import { buildSystemPrompt } from '@/lib/claude'
import { getSchoolPlanningWarnings } from '@/lib/school-rules'
import type { ChatMessage, RankedCourse } from '@/lib/types'

// Minimal ranked type for prompt building
type MinRanked = Parameters<typeof buildSystemPrompt>[5]

interface Props {
  topRecommended: MinRanked
  onInterestsChange?: (interests: string[]) => void
}

function MessageBubble({ msg }: { msg: ChatMessage }) {
  const isUser = msg.role === 'user'
  return (
    <div className={`flex gap-2 ${isUser ? 'flex-row-reverse' : 'flex-row'}`}>
      <div className={`w-6 h-6 rounded-full flex items-center justify-center shrink-0 mt-0.5 ${isUser ? 'bg-umblue' : 'bg-maize'}`}>
        {isUser ? <User className="w-3 h-3 text-white" /> : <Bot className="w-3 h-3 text-umblue" />}
      </div>
      <div
        className={`max-w-[80%] px-3 py-2 rounded-2xl text-xs leading-relaxed ${
          isUser
            ? 'bg-umblue text-white rounded-tr-sm'
            : 'bg-gray-50 text-gray-800 rounded-tl-sm border border-gray-100'
        }`}
      >
        {!msg.content ? (
          <span className="flex gap-1 items-center text-gray-400">
            <span className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce [animation-delay:0ms]" />
            <span className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce [animation-delay:150ms]" />
            <span className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce [animation-delay:300ms]" />
          </span>
        ) : isUser ? (
          <span>{msg.content}</span>
        ) : (
          <ReactMarkdown
            remarkPlugins={[remarkGfm]}
            components={{
              p: ({ children }) => <p className="mb-1 last:mb-0">{children}</p>,
              ul: ({ children }) => <ul className="list-disc pl-4 mb-1 space-y-0.5">{children}</ul>,
              ol: ({ children }) => <ol className="list-decimal pl-4 mb-1 space-y-0.5">{children}</ol>,
              li: ({ children }) => <li className="leading-snug">{children}</li>,
              strong: ({ children }) => <strong className="font-semibold text-umblue">{children}</strong>,
              code: ({ children }) => <code className="bg-gray-200 rounded px-1 font-mono text-[11px]">{children}</code>,
              h1: ({ children }) => <p className="font-bold text-umblue mb-1">{children}</p>,
              h2: ({ children }) => <p className="font-semibold text-umblue mb-0.5">{children}</p>,
              h3: ({ children }) => <p className="font-semibold mb-0.5">{children}</p>,
            }}
          >
            {msg.content}
          </ReactMarkdown>
        )}
      </div>
    </div>
  )
}

const STARTER_PROMPTS = [
  'What courses should I take next semester?',
  'How do I prepare for ML internships?',
  'Is taking EECS 281 and MATH 217 together too hard?',
  "What's the best path to quant finance?",
]

// Extract course codes and topic keywords mentioned in text
function extractInterests(text: string): string[] {
  const interests: string[] = []
  // Course codes like EECS 445, STATS 415
  const courseRe = /\b([A-Z]{2,8})\s+(\d{3}[A-Z]?)\b/g
  let m: RegExpExecArray | null
  while ((m = courseRe.exec(text)) !== null) interests.push(`${m[1]} ${m[2]}`)
  // Topic keywords
  const topics = ['machine learning', 'ml', 'data science', 'software engineering', 'robotics',
    'quant', 'finance', 'algorithms', 'systems', 'web', 'ai', 'deep learning', 'statistics',
    'minor', 'double major', 'research', 'phd', 'internship']
  const lower = text.toLowerCase()
  topics.forEach((t) => { if (lower.includes(t)) interests.push(t) })
  return Array.from(new Set(interests))
}

export default function AdvisingPanel({ topRecommended, onInterestsChange }: Props) {
  const { profile, auditResult, semesters, messages, addMessage, updateLastMessage, clearMessages, addCourseToSemester, moveCourse, removeCourseFromSemester } = useStore(
    useShallow((s) => ({
      profile: s.profile,
      auditResult: s.auditResult,
      semesters: s.semesters,
      messages: s.messages,
      addMessage: s.addMessage,
      updateLastMessage: s.updateLastMessage,
      clearMessages: s.clearMessages,
      addCourseToSemester: s.addCourseToSemester,
      moveCourse: s.moveCourse,
      removeCourseFromSemester: s.removeCourseFromSemester,
    }))
  )

  const upsertPriorityCourses = useStore((s) => s.upsertPriorityCourses)
  const removePriorityCourse = useStore((s) => s.removePriorityCourse)

  const [input, setInput] = useState('')
  const [streaming, setStreaming] = useState(false)
  const [toolStatus, setToolStatus] = useState<string | null>(null)
  const scrollRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const bufferRef = useRef('')
  const flushTimer = useRef<ReturnType<typeof setInterval> | null>(null)

  // Auto-scroll on new messages
  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' })
  }, [messages])

  async function sendMessage(text: string) {
    if (!text.trim() || streaming || !profile) return
    setInput('')
    setStreaming(true)
    bufferRef.current = ''

    const userMsg: ChatMessage = {
      id: crypto.randomUUID(),
      role: 'user',
      content: text.trim(),
      timestamp: Date.now(),
    }
    addMessage(userMsg)

    // Placeholder assistant message
    addMessage({
      id: crypto.randomUUID(),
      role: 'assistant',
      content: '',
      timestamp: Date.now(),
    })

    const schoolWarnings = getSchoolPlanningWarnings(profile, auditResult, semesters)

    const systemPrompt = buildSystemPrompt(
      profile,
      auditResult?.completedCourses ?? [],
      auditResult?.inProgressCourses ?? [],
      auditResult?.incompleteRequirements ?? [],
      semesters,
      topRecommended,
      schoolWarnings
    )

    // Flush buffer to store every 50ms to avoid excessive re-renders
    flushTimer.current = setInterval(() => {
      if (bufferRef.current) {
        updateLastMessage(bufferRef.current)
      }
    }, 50)

    const state = useStore.getState()
    const completedCodes = Array.from(state.getCompletedCourseCodes())
    const careerGoal = state.profile?.careerGoal ?? ''
    const semesterList = state.semesters.map((s) => ({
      id: s.id,
      label: s.label,
      courses: s.courses.map((c) => c.code),
    }))
    const priorityCourses = topRecommended.map((r) => ({
      code: r.course.code,
      priority: Math.round(r.score),
    }))

    try {
      const res = await fetch('/api/advise', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: [...messages, userMsg],
          systemPrompt,
          completedCodes,
          careerGoal,
          semesters: semesterList,
          priorityCourses,
        }),
      })

      if (!res.ok || !res.body) throw new Error('Stream failed')

      const reader = res.body.getReader()
      const decoder = new TextDecoder()

      while (true) {
        const { done, value } = await reader.read()
        if (done) break
        const chunk = decoder.decode(value, { stream: true })
        for (const line of chunk.split('\n')) {
          if (!line.startsWith('data: ')) continue
          const raw = line.slice(6)
          if (raw === '[DONE]') break
          try {
            const parsed = JSON.parse(raw) as {
              text?: string
              error?: string
              toolCall?: { name: string; args: Record<string, unknown> }
              addToPlanner?: { semesterId: string; courseCode: string; courseName: string; credits: number; atlasUrl?: string; prereqs?: string[] }[]
              moveInPlanner?: { courseCode: string; fromSemesterId: string; toSemesterId: string }
              removeFromPlanner?: { courseCode: string; semesterId: string }
              upsertCourseList?: RankedCourse[]
              removeFromCourseList?: { courseCode: string }
              done?: boolean
            }
            if (parsed.error) throw new Error(parsed.error)
            if (parsed.toolCall) {
              const label = parsed.toolCall.name === 'generate_roadmap'
                ? '📋 Generating roadmap…'
                : parsed.toolCall.name === 'build_schedule_from_priority_list'
                ? '🧠 Building schedule…'
                : parsed.toolCall.name === 'add_to_planner'
                ? '📅 Adding to planner…'
                : parsed.toolCall.name === 'move_planner_course'
                ? '↔️ Moving course…'
                : parsed.toolCall.name === 'remove_from_planner'
                ? '🗑️ Removing course…'
                : parsed.toolCall.name === 'get_course_details'
                ? '📘 Loading course details…'
                : parsed.toolCall.name === 'query_umich_schools_guide'
                ? '🏫 Checking school requirements…'
                : parsed.toolCall.name === 'upsert_course_priority_list'
                ? '⭐ Updating course list priorities…'
                : parsed.toolCall.name === 'remove_from_course_priority_list'
                ? '🧹 Removing from course list…'
                : '🔍 Searching courses…'
              setToolStatus(label)
            }
            if (parsed.addToPlanner) {
              for (const entry of parsed.addToPlanner) {
                addCourseToSemester(entry.semesterId, {
                  code: entry.courseCode,
                  name: entry.courseName,
                  credits: entry.credits,
                  atlasUrl: entry.atlasUrl,
                  prereqs: entry.prereqs ?? [],
                })
              }
            }
            if (parsed.moveInPlanner) {
              moveCourse(
                parsed.moveInPlanner.courseCode,
                parsed.moveInPlanner.fromSemesterId,
                parsed.moveInPlanner.toSemesterId
              )
            }
            if (parsed.removeFromPlanner) {
              removeCourseFromSemester(
                parsed.removeFromPlanner.semesterId,
                parsed.removeFromPlanner.courseCode
              )
            }
            if (parsed.upsertCourseList && parsed.upsertCourseList.length > 0) {
              upsertPriorityCourses(parsed.upsertCourseList)
            }
            if (parsed.removeFromCourseList?.courseCode) {
              removePriorityCourse(parsed.removeFromCourseList.courseCode)
            }
            if (parsed.text) {
              setToolStatus(null)
              bufferRef.current += parsed.text
            }
          } catch {
            // ignore malformed chunks
          }
        }
      }
      setToolStatus(null)
      // Final flush
      updateLastMessage(bufferRef.current)
      // Extract interests from both the user message and AI response
      if (onInterestsChange) {
        const interests = extractInterests(text + ' ' + bufferRef.current)
        if (interests.length > 0) onInterestsChange(interests)
      }
    } catch {
      updateLastMessage('Sorry, I had trouble connecting. Please check your API key and try again.')
    } finally {
      if (flushTimer.current) clearInterval(flushTimer.current)
      setToolStatus(null)
      setStreaming(false)
      inputRef.current?.focus()
    }
  }

  return (
    <div className="h-full flex flex-col bg-white rounded-3xl border border-gray-100 overflow-hidden">
      {/* Header */}
      <div className="px-4 pt-4 pb-3 border-b border-gray-100 flex items-center gap-2">
        <Sparkles className="w-4 h-4 text-maize" />
        <h2 className="font-bold text-umblue text-sm">AI Advisor</h2>
        {profile && (
          <span className="text-xs text-gray-400 ml-1">
            for {profile.name || profile.year}
          </span>
        )}
        {messages.length > 0 && (
          <button
            onClick={clearMessages}
            className="ml-auto text-gray-300 hover:text-gray-500 transition-colors"
            title="Clear chat"
          >
            <RefreshCw className="w-3.5 h-3.5" />
          </button>
        )}
      </div>

      {/* Messages */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto scrollbar-thin px-4 py-3 space-y-3">
        {messages.length === 0 ? (
          <div className="space-y-3">
            <div className="text-center py-2">
              <div className="w-10 h-10 bg-gradient-to-br from-umblue to-blue-400 rounded-2xl flex items-center justify-center mx-auto mb-2">
                <Bot className="w-5 h-5 text-white" />
              </div>
              <p className="text-xs font-semibold text-umblue">Your UMich Advisor</p>
              <p className="text-xs text-gray-400 mt-1">
                Ask me anything about your course pathway, internships, or academic planning.
              </p>
            </div>
            {/* Starter prompts */}
            <div className="space-y-1.5">
              {STARTER_PROMPTS.map((p) => (
                <button
                  key={p}
                  onClick={() => sendMessage(p)}
                  disabled={!profile}
                  className="w-full text-left text-xs text-gray-600 bg-gray-50 hover:bg-maize-50 hover:text-umblue border border-gray-100 hover:border-maize/40 rounded-xl px-3 py-2 transition-colors disabled:opacity-40"
                >
                  {p}
                </button>
              ))}
            </div>
            {!profile && (
              <p className="text-xs text-center text-amber-500">Complete your profile to enable advising.</p>
            )}
          </div>
        ) : (
          messages.map((msg) => <MessageBubble key={msg.id} msg={msg} />)
        )}
      </div>

      {/* Tool status indicator */}
      {toolStatus && (
        <div className="px-4 py-1.5 text-xs text-umblue bg-maize/10 border-t border-maize/20 flex items-center gap-1.5">
          <span className="w-1.5 h-1.5 bg-umblue rounded-full animate-pulse shrink-0" />
          {toolStatus}
        </div>
      )}

      {/* Input */}
      <div className="px-3 pb-3 pt-2 border-t border-gray-50">
        <form
          onSubmit={(e) => {
            e.preventDefault()
            sendMessage(input)
          }}
          className="flex gap-2"
        >
          <input
            ref={inputRef}
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder={profile ? 'Ask about courses, internships, planning…' : 'Complete profile first'}
            disabled={!profile || streaming}
            className="flex-1 bg-gray-50 border border-gray-100 rounded-xl px-3 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-maize/40 disabled:opacity-50"
          />
          <button
            type="submit"
            disabled={!profile || !input.trim() || streaming}
            className="p-2 bg-umblue text-white rounded-xl hover:bg-umblue-600 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
          >
            <Send className="w-3.5 h-3.5" />
          </button>
        </form>
      </div>
    </div>
  )
}
