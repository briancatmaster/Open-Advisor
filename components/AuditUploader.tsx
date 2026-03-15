'use client'

import { useCallback, useState } from 'react'
import { useDropzone } from 'react-dropzone'
import { Upload, FileText, CheckCircle, AlertCircle, Loader2 } from 'lucide-react'
import type { AuditResult } from '@/lib/types'

type UploadState = 'idle' | 'uploading' | 'success' | 'error'

interface Props {
  onParsed: (result: AuditResult) => void
}

export default function AuditUploader({ onParsed }: Props) {
  const [state, setState] = useState<UploadState>('idle')
  const [error, setError] = useState('')
  const [fileName, setFileName] = useState('')

  const upload = useCallback(
    async (file: File) => {
      setState('uploading')
      setError('')
      setFileName(file.name)

      const formData = new FormData()
      formData.append('file', file)

      try {
        const res = await fetch('/api/parse-audit', { method: 'POST', body: formData })
        const data = await res.json()

        if (!res.ok || data.error) {
          setError(data.error ?? 'Upload failed')
          setState('error')
          return
        }

        setState('success')
        onParsed(data.auditResult)
      } catch {
        setError('Network error. Please try again.')
        setState('error')
      }
    },
    [onParsed]
  )

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    accept: { 'application/pdf': ['.pdf'], 'text/plain': ['.txt'] },
    maxFiles: 1,
    maxSize: 15 * 1024 * 1024,
    onDropAccepted: (files) => upload(files[0]),
    onDropRejected: (fileRejections) => {
      setError(fileRejections[0]?.errors[0]?.message ?? 'Invalid file')
      setState('error')
    },
  })

  return (
    <div className="w-full">
      <div
        {...getRootProps()}
        className={`
          relative border-2 border-dashed rounded-2xl p-12 text-center cursor-pointer
          transition-all duration-200 group
          ${isDragActive ? 'border-maize bg-maize-50 scale-[1.01]' : 'border-umblue-200 hover:border-maize hover:bg-maize-50'}
          ${state === 'success' ? 'border-green-400 bg-green-50' : ''}
          ${state === 'error' ? 'border-red-300 bg-red-50' : ''}
          ${state === 'uploading' ? 'pointer-events-none opacity-75' : ''}
        `}
      >
        <input {...getInputProps()} />

        {state === 'idle' && (
          <>
            <div className="w-16 h-16 bg-umblue-50 rounded-2xl flex items-center justify-center mx-auto mb-4 group-hover:bg-maize transition-colors">
              <Upload className="w-8 h-8 text-umblue group-hover:text-umblue transition-colors" />
            </div>
            <p className="text-lg font-semibold text-umblue mb-1">
              {isDragActive ? 'Drop it here!' : 'Upload your degree audit'}
            </p>
            <p className="text-sm text-gray-500">
              Drag & drop your PDF or{' '}
              <span className="text-umblue font-medium underline">browse files</span>
            </p>
            <p className="text-xs text-gray-400 mt-2">PDF or TXT · Max 15MB</p>
          </>
        )}

        {state === 'uploading' && (
          <>
            <Loader2 className="w-12 h-12 text-umblue mx-auto mb-4 animate-spin" />
            <p className="text-lg font-semibold text-umblue mb-1">Parsing audit…</p>
            <p className="text-sm text-gray-500">{fileName}</p>
          </>
        )}

        {state === 'success' && (
          <>
            <CheckCircle className="w-12 h-12 text-green-500 mx-auto mb-4" />
            <p className="text-lg font-semibold text-green-700 mb-1">Audit verified!</p>
            <p className="text-sm text-gray-500">{fileName}</p>
          </>
        )}

        {state === 'error' && (
          <>
            <AlertCircle className="w-10 h-10 text-red-400 mx-auto mb-3" />
            <p className="text-base font-semibold text-red-600 mb-1">Upload failed</p>
            <p className="text-sm text-red-500 mb-3">{error}</p>
            <button
              onClick={(e) => {
                e.stopPropagation()
                setState('idle')
                setError('')
              }}
              className="text-sm text-umblue underline"
            >
              Try again
            </button>
          </>
        )}
      </div>

      {/* Hint for getting the audit */}
      {state === 'idle' && (
        <div className="mt-4 p-4 bg-umblue-50 rounded-xl border border-umblue-100">
          <div className="flex gap-2">
            <FileText className="w-4 h-4 text-umblue mt-0.5 shrink-0" />
            <div>
              <p className="text-xs font-medium text-umblue">Where to get your audit</p>
              <p className="text-xs text-gray-500 mt-0.5">
                Wolverine Access → Student Business → Student Records → Degree Audit → Print/Save as PDF
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
