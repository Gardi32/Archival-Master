'use client'
import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Select } from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { Trash2, X } from 'lucide-react'
import type { ProjectTask } from '@/types/database'

interface Props {
  task: ProjectTask | null
  onSave: (data: Partial<ProjectTask>) => Promise<void>
  onDelete?: () => void
  onClose: () => void
}

export function TaskForm({ task, onSave, onDelete, onClose }: Props) {
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState({
    title: task?.title ?? '',
    description: task?.description ?? '',
    priority: task?.priority ?? 'medium',
    urgency: task?.urgency ?? 'medium',
    due_date: task?.due_date ?? '',
    status: task?.status ?? 'pending',
    assignee: task?.assignee ?? '',
  })

  function set(key: string, value: string) {
    setForm(prev => ({ ...prev, [key]: value }))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!form.title.trim()) return
    setSaving(true)
    await onSave({
      title: form.title.trim(),
      description: form.description || null,
      priority: form.priority as ProjectTask['priority'],
      urgency: form.urgency as ProjectTask['urgency'],
      due_date: form.due_date || null,
      status: form.status as ProjectTask['status'],
      assignee: form.assignee || null,
    })
    setSaving(false)
  }

  return (
    <form onSubmit={handleSubmit} className="h-full flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between px-5 py-4 border-b border-[#242424]">
        <h3 className="text-sm font-semibold text-[#ededed]">
          {task ? 'Editar tarea' : 'Nueva tarea'}
        </h3>
        <button type="button" onClick={onClose} className="text-[#555] hover:text-[#aaa] transition-colors">
          <X className="h-4 w-4" />
        </button>
      </div>

      {/* Fields */}
      <div className="flex-1 overflow-y-auto p-5 space-y-4">
        <Input
          label="Título *"
          id="title"
          value={form.title}
          onChange={e => set('title', e.target.value)}
          placeholder="¿Qué hay que hacer?"
          required
          autoFocus
        />

        <div className="grid grid-cols-2 gap-3">
          <Select label="Prioridad" id="priority" value={form.priority} onChange={e => set('priority', e.target.value)}>
            <option value="critical">🔴 Crítica</option>
            <option value="high">🟠 Alta</option>
            <option value="medium">🟡 Media</option>
            <option value="low">⚪ Baja</option>
          </Select>

          <Select label="Urgencia" id="urgency" value={form.urgency} onChange={e => set('urgency', e.target.value)}>
            <option value="immediate">⚡ Inmediata</option>
            <option value="high">🔥 Alta</option>
            <option value="medium">⏳ Media</option>
            <option value="low">💤 Baja</option>
          </Select>
        </div>

        <Select label="Estado" id="status" value={form.status} onChange={e => set('status', e.target.value)}>
          <option value="pending">Pendiente</option>
          <option value="in_progress">En progreso</option>
          <option value="done">Completada</option>
        </Select>

        <div className="space-y-1.5">
          <label className="text-xs text-[#888] uppercase tracking-wide">Fecha límite</label>
          <input
            type="date"
            value={form.due_date}
            onChange={e => set('due_date', e.target.value)}
            className="w-full h-9 rounded-lg border border-[#2a2a2a] bg-[#111] px-3 text-sm text-[#ededed] focus:outline-none focus:border-orange-500"
          />
        </div>

        <Input
          label="Responsable"
          id="assignee"
          value={form.assignee}
          onChange={e => set('assignee', e.target.value)}
          placeholder="Nombre..."
        />

        <Textarea
          label="Descripción / notas"
          id="description"
          value={form.description}
          onChange={e => set('description', e.target.value)}
          rows={4}
          placeholder="Contexto, links, detalles..."
        />

        {/* Priority matrix hint */}
        <div className="bg-[#111] border border-[#2a2a2a] rounded-xl p-3">
          <p className="text-[10px] text-[#444] uppercase tracking-wider mb-2 font-semibold">Matriz de Eisenhower</p>
          <div className="grid grid-cols-2 gap-1.5 text-[10px]">
            <div className="bg-red-900/20 border border-red-900/40 rounded p-1.5 text-red-400">
              <p className="font-semibold">Importante + Urgente</p>
              <p className="text-red-400/70">Hacer ahora</p>
            </div>
            <div className="bg-orange-900/20 border border-orange-900/40 rounded p-1.5 text-orange-400">
              <p className="font-semibold">Importante + No urgente</p>
              <p className="text-orange-400/70">Planificar</p>
            </div>
            <div className="bg-yellow-900/20 border border-yellow-900/40 rounded p-1.5 text-yellow-400">
              <p className="font-semibold">Poco importante + Urgente</p>
              <p className="text-yellow-400/70">Delegar</p>
            </div>
            <div className="bg-[#1a1a1a] border border-[#2a2a2a] rounded p-1.5 text-[#555]">
              <p className="font-semibold">Poco importante + No urgente</p>
              <p className="text-[#444]">Eliminar / diferir</p>
            </div>
          </div>
        </div>
      </div>

      {/* Footer */}
      <div className="px-5 py-4 border-t border-[#242424] flex gap-2">
        <Button type="submit" variant="primary" loading={saving} className="flex-1">
          {task ? 'Guardar cambios' : 'Crear tarea'}
        </Button>
        {onDelete && (
          <Button type="button" variant="ghost" onClick={onDelete} className="hover:text-red-400">
            <Trash2 className="h-4 w-4" />
          </Button>
        )}
      </div>
    </form>
  )
}
