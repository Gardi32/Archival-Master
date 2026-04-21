'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Film } from 'lucide-react'

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [mode, setMode] = useState<'login' | 'signup'>('login')
  const [sent, setSent] = useState(false)
  const router = useRouter()

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError('')

    const supabase = createClient()

    if (mode === 'login') {
      const { error } = await supabase.auth.signInWithPassword({ email, password })
      if (error) {
        setError(error.message === 'Invalid login credentials' ? 'Email o contraseña incorrectos.' : error.message)
      } else {
        router.push('/projects')
        router.refresh()
      }
    } else {
      const { error } = await supabase.auth.signUp({ email, password })
      if (error) {
        setError(error.message)
      } else {
        setSent(true)
      }
    }

    setLoading(false)
  }

  if (sent) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#0f0f0f]">
        <div className="text-center space-y-3">
          <div className="h-12 w-12 rounded-xl bg-orange-500/20 flex items-center justify-center mx-auto">
            <Film className="h-6 w-6 text-orange-400" />
          </div>
          <h2 className="text-lg font-semibold text-[#ededed]">Revisá tu email</h2>
          <p className="text-sm text-[#888] max-w-xs">Te enviamos un link de confirmación a <strong className="text-[#ccc]">{email}</strong>. Confirmalo para acceder.</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#0f0f0f] p-4">
      <div className="w-full max-w-sm">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="h-14 w-14 rounded-2xl bg-orange-500/20 border border-orange-500/30 flex items-center justify-center mx-auto mb-4">
            <Film className="h-7 w-7 text-orange-400" />
          </div>
          <h1 className="text-2xl font-bold text-[#ededed]">ArchivalMaster</h1>
          <p className="text-sm text-[#666] mt-1">Producción de archivo profesional</p>
        </div>

        {/* Card */}
        <div className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-2xl p-6 shadow-2xl">
          <h2 className="text-sm font-semibold text-[#ededed] mb-5">
            {mode === 'login' ? 'Iniciar sesión' : 'Crear cuenta'}
          </h2>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-1.5">
              <label className="text-xs text-[#888] font-medium uppercase tracking-wide">Email</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="tu@email.com"
                required
                className="w-full h-10 rounded-lg border border-[#2a2a2a] bg-[#111] px-3 text-sm text-[#ededed] placeholder:text-[#444] focus:outline-none focus:border-orange-500 focus:ring-1 focus:ring-orange-500 transition-colors"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs text-[#888] font-medium uppercase tracking-wide">Contraseña</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                required
                minLength={6}
                className="w-full h-10 rounded-lg border border-[#2a2a2a] bg-[#111] px-3 text-sm text-[#ededed] placeholder:text-[#444] focus:outline-none focus:border-orange-500 focus:ring-1 focus:ring-orange-500 transition-colors"
              />
            </div>

            {error && (
              <div className="text-xs text-red-400 bg-red-900/20 border border-red-900/40 rounded-lg px-3 py-2">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full h-10 rounded-lg bg-orange-500 text-white text-sm font-semibold hover:bg-orange-600 active:bg-orange-700 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {loading && <span className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />}
              {mode === 'login' ? 'Entrar' : 'Crear cuenta'}
            </button>
          </form>

          <div className="mt-4 pt-4 border-t border-[#242424] text-center">
            <button
              onClick={() => { setMode(mode === 'login' ? 'signup' : 'login'); setError('') }}
              className="text-xs text-[#666] hover:text-orange-400 transition-colors"
            >
              {mode === 'login' ? '¿No tenés cuenta? Registrate' : '¿Ya tenés cuenta? Iniciá sesión'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
