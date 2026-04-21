'use client'
import { useEffect, useRef } from 'react'
import { cn } from '@/lib/utils'
import { X } from 'lucide-react'

interface DialogProps {
  open: boolean
  onClose: () => void
  title?: string
  children: React.ReactNode
  className?: string
  size?: 'sm' | 'md' | 'lg' | 'xl'
}

export function Dialog({ open, onClose, title, children, className, size = 'md' }: DialogProps) {
  const overlayRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    document.addEventListener('keydown', handler)
    return () => document.removeEventListener('keydown', handler)
  }, [open, onClose])

  if (!open) return null

  return (
    <div
      ref={overlayRef}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4"
      onClick={(e) => { if (e.target === overlayRef.current) onClose() }}
    >
      <div className={cn(
        'relative flex flex-col bg-[#1a1a1a] border border-[#2a2a2a] rounded-xl shadow-2xl animate-fade-in max-h-[90vh] overflow-hidden',
        {
          'w-full max-w-sm': size === 'sm',
          'w-full max-w-lg': size === 'md',
          'w-full max-w-2xl': size === 'lg',
          'w-full max-w-4xl': size === 'xl',
        },
        className
      )}>
        {title && (
          <div className="flex items-center justify-between px-6 py-4 border-b border-[#2a2a2a] shrink-0">
            <h2 className="text-base font-semibold text-[#ededed]">{title}</h2>
            <button onClick={onClose} className="text-[#666] hover:text-[#ededed] transition-colors p-1 rounded-md hover:bg-[#2a2a2a]">
              <X className="h-4 w-4" />
            </button>
          </div>
        )}
        <div className="flex-1 overflow-y-auto">{children}</div>
      </div>
    </div>
  )
}
