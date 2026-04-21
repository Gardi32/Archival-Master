'use client'
import { cn } from '@/lib/utils'
import { type ButtonHTMLAttributes, forwardRef } from 'react'

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger' | 'outline'
  size?: 'sm' | 'md' | 'lg' | 'icon'
  loading?: boolean
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = 'secondary', size = 'md', loading, children, disabled, ...props }, ref) => {
    return (
      <button
        ref={ref}
        disabled={disabled || loading}
        className={cn(
          'inline-flex items-center justify-center gap-2 rounded-md font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-500 disabled:opacity-50 disabled:pointer-events-none',
          {
            'bg-orange-500 text-white hover:bg-orange-600 active:bg-orange-700': variant === 'primary',
            'bg-[#2a2a2a] text-[#ededed] hover:bg-[#333] border border-[#3a3a3a]': variant === 'secondary',
            'text-[#aaa] hover:text-[#ededed] hover:bg-[#2a2a2a]': variant === 'ghost',
            'text-red-400 hover:text-red-300 hover:bg-red-900/20': variant === 'danger',
            'border border-[#3a3a3a] text-[#ededed] hover:bg-[#2a2a2a]': variant === 'outline',
          },
          {
            'h-7 px-2.5 text-xs': size === 'sm',
            'h-9 px-4 text-sm': size === 'md',
            'h-11 px-6 text-base': size === 'lg',
            'h-8 w-8 p-0': size === 'icon',
          },
          className
        )}
        {...props}
      >
        {loading ? <span className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" /> : null}
        {children}
      </button>
    )
  }
)
Button.displayName = 'Button'
