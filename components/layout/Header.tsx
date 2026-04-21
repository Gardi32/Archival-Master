'use client'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { LogOut, User } from 'lucide-react'

interface HeaderProps {
  title: string
  description?: string
  actions?: React.ReactNode
  email?: string
}

export function Header({ title, description, actions, email }: HeaderProps) {
  const router = useRouter()

  async function handleSignOut() {
    const supabase = createClient()
    await supabase.auth.signOut()
    router.push('/auth/login')
    router.refresh()
  }

  return (
    <header className="flex items-center justify-between px-6 py-4 border-b border-[#242424] bg-[#161616] shrink-0">
      <div>
        <h1 className="text-base font-semibold text-[#ededed]">{title}</h1>
        {description && <p className="text-xs text-[#666] mt-0.5">{description}</p>}
      </div>
      <div className="flex items-center gap-3">
        {actions}
        {email && (
          <div className="flex items-center gap-2 pl-3 border-l border-[#242424]">
            <div className="flex items-center gap-1.5 text-xs text-[#666]">
              <User className="h-3.5 w-3.5" />
              <span className="max-w-[140px] truncate">{email}</span>
            </div>
            <Button variant="ghost" size="icon" onClick={handleSignOut} title="Cerrar sesión">
              <LogOut className="h-3.5 w-3.5 text-[#666]" />
            </Button>
          </div>
        )}
      </div>
    </header>
  )
}
