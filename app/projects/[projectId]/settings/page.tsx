import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { Header } from '@/components/layout/Header'

interface Member {
  id: string
  role: string
  user_id: string
  invited_at: string
}

export default async function SettingsPage({ params }: { params: Promise<{ projectId: string }> }) {
  const { projectId } = await params
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')

  const { data: members } = await supabase
    .from('project_members')
    .select('id, role, user_id, invited_at')
    .eq('project_id', projectId)

  return (
    <div className="flex flex-col h-full">
      <Header title="Configuración" description="Equipo y ajustes del proyecto" email={user.email ?? ''} />
      <div className="flex-1 overflow-y-auto p-6 max-w-2xl">
        <div className="bg-[#1a1a1a] border border-[#242424] rounded-xl p-6">
          <h3 className="text-sm font-semibold text-[#ededed] mb-4">Miembros del proyecto</h3>
          <div className="space-y-3">
            {((members ?? []) as Member[]).map(m => (
              <div key={m.id} className="flex items-center justify-between py-2 border-b border-[#1f1f1f]">
                <div>
                  <p className="text-sm text-[#ccc]">{m.user_id}</p>
                  <p className="text-xs text-[#555]">{new Date(m.invited_at).toLocaleDateString('es-AR')}</p>
                </div>
                <span className="text-xs bg-[#2a2a2a] text-[#888] px-2 py-1 rounded-full capitalize">{m.role}</span>
              </div>
            ))}
          </div>
          <p className="text-xs text-[#555] mt-4">Para invitar miembros, usá el panel de administración de Supabase Auth mientras se desarrolla el sistema de invitaciones por email.</p>
        </div>
      </div>
    </div>
  )
}
