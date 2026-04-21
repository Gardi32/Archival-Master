'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Film, Plus, Archive, CheckCircle, Clock, LogOut } from 'lucide-react'
import { toast } from 'sonner'
import type { Project } from '@/types/database'

const STATUS_ICON = {
  active: <Clock className="h-3.5 w-3.5 text-green-400" />,
  archived: <Archive className="h-3.5 w-3.5 text-[#666]" />,
  completed: <CheckCircle className="h-3.5 w-3.5 text-blue-400" />,
}

const STATUS_LABEL = { active: 'Activo', archived: 'Archivado', completed: 'Completado' }

interface Props {
  initialProjects: Project[]
  userEmail: string
}

export function ProjectsClient({ initialProjects, userEmail }: Props) {
  const [projects, setProjects] = useState(initialProjects)
  const [creating, setCreating] = useState(false)
  const [showForm, setShowForm] = useState(false)
  const [name, setName] = useState('')
  const [client, setClient] = useState('')
  const [description, setDescription] = useState('')
  const router = useRouter()

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault()
    if (!name.trim()) return
    setCreating(true)

    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    const { data, error } = await supabase
      .from('projects')
      .insert({ name: name.trim(), client: client.trim() || null, description: description.trim() || null, created_by: user.id } as never)
      .select()
      .single()

    if (error) {
      toast.error('Error al crear el proyecto')
    } else {
      const p = data as { id: string }
      setProjects(prev => [data as never, ...prev])
      setShowForm(false)
      setName('')
      setClient('')
      setDescription('')
      toast.success('Proyecto creado')
      router.push(`/projects/${p.id}/materials`)
    }
    setCreating(false)
  }

  async function handleSignOut() {
    const supabase = createClient()
    await supabase.auth.signOut()
    router.push('/auth/login')
  }

  return (
    <div className="min-h-screen bg-[#0f0f0f] flex flex-col">
      {/* Top bar */}
      <header className="flex items-center justify-between px-6 py-4 border-b border-[#242424] bg-[#161616]">
        <div className="flex items-center gap-2.5">
          <div className="h-8 w-8 rounded-lg bg-orange-500/20 border border-orange-500/30 flex items-center justify-center">
            <Film className="h-4 w-4 text-orange-400" />
          </div>
          <span className="font-bold text-[#ededed]">ArchivalMaster</span>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-xs text-[#666]">{userEmail}</span>
          <button
            onClick={handleSignOut}
            className="flex items-center gap-1.5 text-xs text-[#666] hover:text-[#aaa] transition-colors"
          >
            <LogOut className="h-3.5 w-3.5" />
            Salir
          </button>
        </div>
      </header>

      <main className="flex-1 max-w-4xl mx-auto w-full px-6 py-10">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-xl font-bold text-[#ededed]">Mis proyectos</h1>
            <p className="text-sm text-[#666] mt-1">{projects.length} proyecto{projects.length !== 1 ? 's' : ''}</p>
          </div>
          <button
            onClick={() => setShowForm(true)}
            className="flex items-center gap-2 h-9 px-4 rounded-lg bg-orange-500 text-white text-sm font-medium hover:bg-orange-600 transition-colors"
          >
            <Plus className="h-4 w-4" />
            Nuevo proyecto
          </button>
        </div>

        {/* New project form */}
        {showForm && (
          <div className="mb-6 bg-[#1a1a1a] border border-orange-500/30 rounded-xl p-5">
            <h3 className="text-sm font-semibold text-[#ededed] mb-4">Nuevo proyecto</h3>
            <form onSubmit={handleCreate} className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <label className="text-xs text-[#888] uppercase tracking-wide">Nombre del proyecto *</label>
                  <input
                    value={name}
                    onChange={e => setName(e.target.value)}
                    placeholder="Ej: Documental 2024"
                    required
                    className="w-full h-9 rounded-lg border border-[#2a2a2a] bg-[#111] px-3 text-sm text-[#ededed] placeholder:text-[#444] focus:outline-none focus:border-orange-500 focus:ring-1 focus:ring-orange-500"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs text-[#888] uppercase tracking-wide">Cliente / Productora</label>
                  <input
                    value={client}
                    onChange={e => setClient(e.target.value)}
                    placeholder="Ej: Canal 7"
                    className="w-full h-9 rounded-lg border border-[#2a2a2a] bg-[#111] px-3 text-sm text-[#ededed] placeholder:text-[#444] focus:outline-none focus:border-orange-500 focus:ring-1 focus:ring-orange-500"
                  />
                </div>
              </div>
              <div className="space-y-1.5">
                <label className="text-xs text-[#888] uppercase tracking-wide">Descripción</label>
                <textarea
                  value={description}
                  onChange={e => setDescription(e.target.value)}
                  placeholder="Descripción breve del proyecto..."
                  rows={2}
                  className="w-full rounded-lg border border-[#2a2a2a] bg-[#111] px-3 py-2 text-sm text-[#ededed] placeholder:text-[#444] focus:outline-none focus:border-orange-500 focus:ring-1 focus:ring-orange-500 resize-none"
                />
              </div>
              <div className="flex gap-2 pt-1">
                <button
                  type="submit"
                  disabled={creating}
                  className="h-9 px-4 rounded-lg bg-orange-500 text-white text-sm font-medium hover:bg-orange-600 disabled:opacity-50 flex items-center gap-2"
                >
                  {creating && <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-white border-t-transparent" />}
                  Crear proyecto
                </button>
                <button
                  type="button"
                  onClick={() => setShowForm(false)}
                  className="h-9 px-4 rounded-lg border border-[#2a2a2a] text-sm text-[#888] hover:text-[#ededed] hover:bg-[#2a2a2a] transition-colors"
                >
                  Cancelar
                </button>
              </div>
            </form>
          </div>
        )}

        {/* Project grid */}
        {projects.length === 0 && !showForm ? (
          <div className="text-center py-20">
            <div className="h-16 w-16 rounded-2xl bg-[#1a1a1a] border border-[#2a2a2a] flex items-center justify-center mx-auto mb-4">
              <Film className="h-8 w-8 text-[#444]" />
            </div>
            <h3 className="text-base font-medium text-[#888] mb-2">Sin proyectos todavía</h3>
            <p className="text-sm text-[#555]">Creá tu primer proyecto para empezar a registrar materiales.</p>
            <button
              onClick={() => setShowForm(true)}
              className="mt-5 inline-flex items-center gap-2 h-9 px-4 rounded-lg bg-orange-500 text-white text-sm font-medium hover:bg-orange-600 transition-colors"
            >
              <Plus className="h-4 w-4" />
              Crear proyecto
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {projects.map(project => (
              <button
                key={project.id}
                onClick={() => router.push(`/projects/${project.id}/materials`)}
                className="text-left bg-[#1a1a1a] border border-[#242424] rounded-xl p-5 hover:border-[#3a3a3a] hover:bg-[#1e1e1e] transition-all group"
              >
                <div className="flex items-start justify-between mb-3">
                  <div className="h-9 w-9 rounded-lg bg-orange-500/10 border border-orange-500/20 flex items-center justify-center group-hover:bg-orange-500/20 transition-colors">
                    <Film className="h-4.5 w-4.5 text-orange-400" />
                  </div>
                  <div className="flex items-center gap-1.5 text-xs text-[#666]">
                    {STATUS_ICON[project.status]}
                    {STATUS_LABEL[project.status]}
                  </div>
                </div>
                <h3 className="font-semibold text-[#ededed] text-sm mb-1 group-hover:text-white transition-colors">{project.name}</h3>
                {project.client && <p className="text-xs text-[#888]">{project.client}</p>}
                {project.description && <p className="text-xs text-[#555] mt-1.5 line-clamp-2">{project.description}</p>}
                <p className="text-xs text-[#444] mt-3">{new Date(project.created_at).toLocaleDateString('es-AR', { day: '2-digit', month: 'short', year: 'numeric' })}</p>
              </button>
            ))}
          </div>
        )}
      </main>
    </div>
  )
}
