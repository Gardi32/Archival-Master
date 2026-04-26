'use client'
import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Select } from '@/components/ui/select'
import { Trash2, X } from 'lucide-react'
import type { GanttTask } from '@/types/database'

const STATUS_LABELS = {
  pending: 'Pendiente',
  in_progress: 'En progreso',
  done: 'Completado',
  blocked: 'Bloqueado',
}

const COLORS = [
  { value: '#f97316', label: 'Naranja' },
  { value: '#3b82f6', label: 'Azul' },
  { value: '#22c55e', label: 'Verde' },
  { value: '#a855f7', label: 'Violeta' },
  { value: '#ef4444', label: 'Rojo' },
  { value: '#eab308', label: 'Amarillo' },
  { value: '#06b6d4', label: 'Cian' },
  { value: '#ec4899', label: 'Rosa' },
]

interface Props {
  task: GanttTask | null
  tasks: GanttTask[]
  onSave: (data: Partial<GanttTask>) => Promise<void>
  onDelete?: () => void
  onClose: () => void
}

export function GanttTaskForm({ task, tasks, onSave, onDelete, onClose }: Props) {
  const today = new Date().toISOString().slice(0, 10)
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState({
    title: task?.title ?? '',
    description: task?.description ?? '',
    start_date: task?.start_date ?? today,
    end_date: task?.end_date ?? today,
    status: task?.status ?? 'pending',
    color: task?.color ?? '#f97316',
    parent_id: task?.parent_id ?? '',
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
      start_date: form.start_date,
      end_date: form.end_date < form.start_date ? form.start_date : form.end_date,
      status: form.status as GanttTask['status'],
      color: form.color,
      parent_id: form.parent_id || null,
      assignee: form.assignee || null,
    })
    setSaving(false)
  }

  const parentOptions = tasks.filter(t => t.id !== task?.id && !t.parent_id)

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
          placeholder="Nombre de la etapa..."
          required
          autoFocus
        />

        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <label className="text-xs text-[#888] uppercase tracking-wide">Inicio</label>
            <input
              type="date"
              value={form.start_date}
              onChange={e => set('start_date', e.target.value)}
              className="w-full h-9 rounded-lg border border-[#2a2a2a] bg-[#111] px-3 text-sm text-[#ededed] focus:outline-none focus:border-orange-500"
            />
          </div>
          <div className="space-y-1.5">
            <label className="text-xs text-[#888] uppercase tracking-wide">Fin</label>
            <input
              type="date"
              value={form.end_date}
              min={form.start_date}
              onChange={e => set('end_date', e.target.value)}
              className="w-full h-9 rounded-lg border border-[#2a2a2a] bg-[#111] px-3 text-sm text-[#ededed] focus:outline-none focus:border-orange-500"
            />
          </div>
        </div>

        <Select label="Estado" id="status" value={form.status} onChange={e => set('status', e.target.value)}>
          {Object.entries(STATUS_LABELS).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
        </Select>

        {parentOptions.length > 0 && (
          <Select label="Subtarea de" id="parent_id" value={form.parent_id} onChange={e => set('parent_id', e.target.value)}>
            <option value="">Tarea principal</option>
            {parentOptions.map(t => <option key={t.id} value={t.id}>{t.title}</option>)}
          </Select>
        )}

        <Input
          label="Responsable"
          id="assignee"
          value={form.assignee}
          onChange={e => set('assignee', e.target.value)}
          placeholder="Nombre..."
        />

        {/* Color picker */}
        <div className="space-y-1.5">
          <label className="text-xs text-[#888] uppercase tracking-wide">Color</label>
          <div className="flex gap-2 flex-wrap">
            {COLORS.map(c => (
              <button
                key={c.value}
                type="button"
                onClick={() => set('color', c.value)}
                className="h-7 w-7 rounded-full border-2 transition-all"
                style={{
                  backgroundColor: c.value,
                  borderColor: form.color === c.value ? '#fff' : 'transparent',
                  transform: form.color === c.value ? 'scale(1.15)' : 'scale(1)',
                }}
                title={c.label}
              />
            ))}
          </div>
        </div>

        <Textarea
          label="Descripción"
          id="description"
          value={form.description}
          onChange={e => set('description', e.target.value)}
          rows={3}
          placeholder="Notas sobre esta etapa..."
        />
      </div>

      {/* Footer */}
      <div className="px-5 py-4 border-t border-[#242424] flex gap-2">
        <Button type="submit" variant="primary" loading={saving} className="flex-1">
          {task ? 'Guardar cambios' : 'Crear tarea'}
        </Button>
        {onDelete && (
          <Button type="button" variant="ghost" onClick={onDelete} className="hover:text-red-400 hover:border-red-900/50">
            <Trash2 className="h-4 w-4" />
          </Button>
        )}
      </div>
    </form>
  )
}
