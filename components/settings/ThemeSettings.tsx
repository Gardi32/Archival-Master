'use client'
import { useTheme, type AppTheme } from '@/components/ThemeProvider'

const THEMES: { id: AppTheme; label: string; accent: string; preview: string }[] = [
  { id: 'orange', label: 'Naranja',  accent: '#f97316', preview: 'rgba(249,115,22,0.15)' },
  { id: 'blue',   label: 'Azul',     accent: '#3b82f6', preview: 'rgba(59,130,246,0.15)' },
  { id: 'purple', label: 'Violeta',  accent: '#a855f7', preview: 'rgba(168,85,247,0.15)' },
  { id: 'green',  label: 'Verde',    accent: '#22c55e', preview: 'rgba(34,197,94,0.15)' },
  { id: 'cyan',   label: 'Cyan',     accent: '#06b6d4', preview: 'rgba(6,182,212,0.15)' },
  { id: 'rose',   label: 'Rosa',     accent: '#f43f5e', preview: 'rgba(244,63,94,0.15)' },
]

export function ThemeSettings() {
  const { theme, setTheme } = useTheme()

  return (
    <div className="bg-[#1a1a1a] border border-[#242424] rounded-xl p-6">
      <h3 className="text-sm font-semibold text-[#ededed] mb-1">Apariencia</h3>
      <p className="text-xs text-[#555] mb-5">Color de acento de la interfaz</p>

      <div className="grid grid-cols-3 gap-3">
        {THEMES.map(t => {
          const active = theme === t.id
          return (
            <button
              key={t.id}
              onClick={() => setTheme(t.id)}
              className="relative flex flex-col gap-3 p-3 rounded-xl border transition-all text-left"
              style={{
                borderColor: active ? t.accent : '#2a2a2a',
                backgroundColor: active ? t.preview : '#141414',
              }}
            >
              {/* Mini preview */}
              <div className="flex gap-1.5 items-center">
                {/* Sidebar dot */}
                <div className="w-2 h-2 rounded-full" style={{ backgroundColor: t.accent }} />
                {/* Bar */}
                <div className="flex-1 h-1.5 rounded-full" style={{ backgroundColor: t.preview, border: `1px solid ${t.accent}55` }} />
                {/* Button */}
                <div className="w-3 h-3 rounded" style={{ backgroundColor: t.accent }} />
              </div>

              {/* Label */}
              <span
                className="text-xs font-medium"
                style={{ color: active ? t.accent : '#666' }}
              >
                {t.label}
              </span>

              {/* Active check */}
              {active && (
                <div
                  className="absolute top-2 right-2 w-4 h-4 rounded-full flex items-center justify-center"
                  style={{ backgroundColor: t.accent }}
                >
                  <svg width="8" height="8" viewBox="0 0 8 8" fill="none">
                    <path d="M1.5 4L3.5 6L6.5 2" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </div>
              )}
            </button>
          )
        })}
      </div>

      <p className="text-[10px] text-[#3a3a3a] mt-4">
        Los cambios se aplican inmediatamente y se guardan en este navegador.
      </p>
    </div>
  )
}
