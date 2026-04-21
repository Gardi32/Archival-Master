'use client'
import { cn } from '@/lib/utils'
import { type TextareaHTMLAttributes, forwardRef } from 'react'

interface TextareaProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string
  error?: string
}

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ className, label, error, id, ...props }, ref) => {
    return (
      <div className="flex flex-col gap-1">
        {label && <label htmlFor={id} className="text-xs text-[#888] font-medium uppercase tracking-wide">{label}</label>}
        <textarea
          ref={ref}
          id={id}
          className={cn(
            'w-full rounded-md border border-[#2a2a2a] bg-[#161616] px-3 py-2 text-sm text-[#ededed] placeholder:text-[#555] focus:outline-none focus:border-orange-500 focus:ring-1 focus:ring-orange-500 transition-colors disabled:opacity-50 resize-none',
            error && 'border-red-500',
            className
          )}
          {...props}
        />
        {error && <span className="text-xs text-red-400">{error}</span>}
      </div>
    )
  }
)
Textarea.displayName = 'Textarea'
