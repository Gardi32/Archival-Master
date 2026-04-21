'use client'
import { cn } from '@/lib/utils'
import { type InputHTMLAttributes, forwardRef } from 'react'

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string
  error?: string
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ className, label, error, id, ...props }, ref) => {
    return (
      <div className="flex flex-col gap-1">
        {label && <label htmlFor={id} className="text-xs text-[#888] font-medium uppercase tracking-wide">{label}</label>}
        <input
          ref={ref}
          id={id}
          className={cn(
            'h-9 w-full rounded-md border border-[#2a2a2a] bg-[#161616] px-3 text-sm text-[#ededed] placeholder:text-[#555] focus:outline-none focus:border-orange-500 focus:ring-1 focus:ring-orange-500 transition-colors disabled:opacity-50',
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
Input.displayName = 'Input'
