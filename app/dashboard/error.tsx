'use client'

export default function DashboardError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  return (
    <div className="h-screen flex items-center justify-center bg-gray-50">
      <div className="bg-white rounded-2xl p-8 max-w-lg w-full shadow border border-red-100">
        <h2 className="text-lg font-bold text-red-600 mb-2">Dashboard Error</h2>
        <pre className="text-xs bg-red-50 rounded-xl p-4 overflow-auto text-red-800 mb-4 max-h-60">
          {error.message}
          {'\n\n'}
          {error.stack}
        </pre>
        <button
          onClick={reset}
          className="px-4 py-2 bg-umblue text-white rounded-xl text-sm font-medium"
        >
          Try again
        </button>
      </div>
    </div>
  )
}
