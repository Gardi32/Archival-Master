'use client'
import { cn } from '@/lib/utils'
import { type SelectHTMLAttributes, forwardRef } from 'react'

interface SelectProps extends SelectHTMLAttributes<HTMLSelectElement> {
  label?: string
  error?: string
}

export const Select = forwardRef<HTMLSelectElement, SelectProps>(
  ({ className, label, error, id, children, ...props }, ref) => {
    return (
      <div className="flex flex-col gap-1">
        {label && <label htmlFor={id} className="text-xs text-[#888] font-medium uppercase tracking-wide">{label}</label>}
        <select
          ref={ref}
          id={id}
          className={cn(
            'h-9 w-full rounded-md border border-[#2a2a2a] bg-[#161616] px-3 text-sm text-[#ededed] focus:outline-none focus:border-orange-500 focus:ring-1 focus:ring-orange-500 transition-colors disabled:opacity-50 cursor-pointer',
            error && 'border-red-500',
            className
          )}
          {...props}
        >
          {children}
        </select>
        {error && <span className="text-xs text-red-400">{error}</span>}
      </div>
    )
  }
)
Select.displayName = 'Select'
