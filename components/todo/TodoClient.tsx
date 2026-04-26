'use client'
import { useState, useCallback, useMemo } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Header } from '@/components/layout/Header'
import { Button } from '@/components/ui/button'
import { toast } from 'sonner'
import { Plus, CheckSquare, Square, Flame, AlertTriangle, Clock, Zap, Trash2, ChevronDown, ChevronUp, Filter } from 'lucide-react'
import { cn } from '@/lib/utils'
import { TaskForm } from './TaskForm'
import type { ProjectTask } from '@/types/database'

// Priority config
const PRIORITY = {
  critical: { label: 'Crítica', color: 'text-red-400', bg: 'bg-red-900/20 border-red-900/50', icon: Flame, dot: 'bg-red-500' },
  high:     { label: 'Alta',   color: 'text-orange-400', bg: 'bg-orange-900/20 border-orange-900/50', icon: AlertTriangle, dot: 'bg-orange-500' },
  medium:   { label: 'Media',  color: 'text-yellow-400', bg: 'bg-yellow-900/20 border-yellow-900/50', icon: Clock, dot: 'bg-yellow-500' },
  low:      { label: 'Baja',   color: 'text-[#666]',     bg: 'bg-[#1e1e1e] border-[#2a2a2a]',         icon: ChevronDown, dot: 'bg-[#444]' },
}

const URGENCY = {
  immediate: { label: 'Inmediata', badge: 'bg-red-500/20 text-red-400 border-red-900/50' },
  high:      { label: 'Alta',      badge: 'bg-orange-500/20 text-orange-400 border-orange-900/50' },
  medium:    { label: 'Media',     badge: 'bg-yellow-500/20 text-yellow-400 border-yellow-900/50' },
  low:       { label: 'Baja',      badge: 'bg-[#222] text-[#555] border-[#2a2a2a]' },
}

// Eisenhower matrix: urgency x priority → alert level
function getAlertLevel(task: ProjectTask): 'critical' | 'high' | 'medium' | 'low' {
  const p = task.priority
  const u = task.urgency
  if (p === 'critical' || u === 'immediate') return 'critical'
  if (p === 'high' || u === 'high') return 'high'
  if (p === 'medium' || u === 'medium') return 'medium'
  return 'low'
}

function sortScore(t: ProjectTask) {
  const ps = { critical: 4, high: 3, medium: 2, low: 1 }
  const us = { immediate: 4, high: 3, medium: 2, low: 1 }
  const due = t.due_date ? new Date(t.due_date).getTime() : Infinity
  return (ps[t.priority] + us[t.urgency]) * 10 - (due === Infinity ? 0 : 1 / due * 1e12)
}

interface Props {
  projectId: string
  initialTasks: ProjectTask[]
  userEmail: string
}

export function TodoClient({ projectId, initialTasks, userEmail }: Props) {
  const [tasks, setTasks] = useState<ProjectTask[]>(initialTasks)
  const [showForm, setShowForm] = useState(false)
  const [editingTask, setEditingTask] = useState<ProjectTask | null>(null)
  const [filterStatus, setFilterStatus] = useState<string>('active')

  const filtered = useMemo(() => {
    let list = tasks
    if (filterStatus === 'active') list = tasks.filter(t => t.status !== 'done')
    if (filterStatus === 'done') list = tasks.filter(t => t.status === 'done')
    return [...list].sort((a, b) => {
      if (a.status === 'done' && b.status !== 'done') return 1
      if (b.status === 'done' && a.status !== 'done') return -1
      return sortScore(b) - sortScore(a)
    })
  }, [tasks, filterStatus])

  const stats = useMemo(() => ({
    total: tasks.filter(t => t.status !== 'done').length,
    critical: tasks.filter(t => t.status !== 'done' && (t.priority === 'critical' || t.urgency === 'immediate')).length,
    overdue: tasks.filter(t => t.status !== 'done' && t.due_date && new Date(t.due_date) < new Date()).length,
  }), [tasks])

  const handleCreate = useCallback(async (data: Partial<ProjectTask>) => {
    const supabase = createClient()
    const { data: created, error } = await supabase
      .from('project_tasks')
      .insert({ ...data, project_id: projectId } as never)
      .select()
      .single()
    if (error) { toast.error('Error al crear tarea'); return }
    setTasks(prev => [created, ...prev])
    setShowForm(false)
    setEditingTask(null)
    toast.success('Tarea creada')
  }, [projectId])

  const handleUpdate = useCallback(async (id: string, data: Partial<ProjectTask>) => {
    const supabase = createClient()
    const { data: updated, error } = await supabase
      .from('project_tasks')
      .update(data as never)
      .eq('id', id)
      .select()
      .single()
    if (error) { toast.error('Error al actualizar'); return }
    setTasks(prev => prev.map(t => t.id === id ? updated : t))
    setEditingTask(null)
    setShowForm(false)
    toast.success('Guardado')
  }, [])

  const handleDelete = useCallback(async (id: string) => {
    if (!confirm('¿Eliminar tarea?')) return
    const supabase = createClient()
    await supabase.from('project_tasks').delete().eq('id', id)
    setTasks(prev => prev.filter(t => t.id !== id))
    setEditingTask(null)
    setShowForm(false)
    toast.success('Eliminado')
  }, [])

  async function toggleDone(task: ProjectTask) {
    const newStatus = task.status === 'done' ? 'pending' : 'done'
    await handleUpdate(task.id, { status: newStatus })
  }

  return (
    <div className="flex flex-col h-full">
      <Header
        title="To Do"
        description={
          stats.total > 0
            ? `${stats.total} pendiente${stats.total !== 1 ? 's' : ''}${stats.critical > 0 ? ` · ${stats.critical} crítica${stats.critical !== 1 ? 's' : ''}` : ''}${stats.overdue > 0 ? ` · ${stats.overdue} vencida${stats.overdue !== 1 ? 's' : ''}` : ''}`
            : 'Sin tareas pendientes'
        }
        email={userEmail}
        actions={
          <Button variant="primary" size="sm" onClick={() => { setEditingTask(null); setShowForm(true) }}>
            <Plus className="h-3.5 w-3.5" />
            Nueva tarea
          </Button>
        }
      />

      <div className="flex flex-1 min-h-0 overflow-hidden">
        {/* Main content */}
        <div className="flex-1 overflow-y-auto p-6">
          <div className="max-w-3xl space-y-6">

            {/* Alert banner */}
            {(stats.critical > 0 || stats.overdue > 0) && (
              <div className="flex flex-wrap gap-3">
                {stats.critical > 0 && (
                  <div className="flex items-center gap-2 px-4 py-2.5 bg-red-900/20 border border-red-900/50 rounded-xl">
                    <Flame className="h-4 w-4 text-red-400 shrink-0" />
                    <span className="text-sm text-red-300 font-medium">
                      {stats.critical} tarea{stats.critical !== 1 ? 's' : ''} crítica{stats.critical !== 1 ? 's' : ''} — requieren atención inmediata
                    </span>
                  </div>
                )}
                {stats.overdue > 0 && (
                  <div className="flex items-center gap-2 px-4 py-2.5 bg-orange-900/20 border border-orange-900/50 rounded-xl">
                    <AlertTriangle className="h-4 w-4 text-orange-400 shrink-0" />
                    <span className="text-sm text-orange-300 font-medium">
                      {stats.overdue} tarea{stats.overdue !== 1 ? 's' : ''} vencida{stats.overdue !== 1 ? 's' : ''}
                    </span>
                  </div>
                )}
              </div>
            )}

            {/* Filters */}
            <div className="flex items-center gap-2">
              <Filter className="h-3.5 w-3.5 text-[#555]" />
              {['active', 'all', 'done'].map(s => (
                <button
                  key={s}
                  onClick={() => setFilterStatus(s)}
                  className={cn(
                    'text-xs px-3 py-1.5 rounded-lg border transition-colors',
                    filterStatus === s
                      ? 'bg-orange-500/15 border-orange-500/30 text-orange-400'
                      : 'border-[#2a2a2a] text-[#666] hover:text-[#aaa] hover:border-[#333]'
                  )}
                >
                  {s === 'active' ? 'Pendientes' : s === 'done' ? 'Completadas' : 'Todas'}
                </button>
              ))}
            </div>

            {/* Task list */}
            {filtered.length === 0 ? (
              <div className="text-center py-16">
                <CheckSquare className="h-10 w-10 text-[#333] mx-auto mb-3" />
                <p className="text-sm text-[#666]">
                  {filterStatus === 'done' ? 'Ninguna tarea completada todavía.' : '¡Todo al día! Sin tareas pendientes.'}
                </p>
              </div>
            ) : (
              <div className="space-y-2">
                {filtered.map(task => {
                  const alertLevel = getAlertLevel(task)
                  const pri = PRIORITY[task.priority]
                  const urg = URGENCY[task.urgency]
                  const PriIcon = pri.icon
                  const isDone = task.status === 'done'
                  const isOverdue = !isDone && task.due_date && new Date(task.due_date) < new Date()

                  return (
                    <div
                      key={task.id}
                      className={cn(
                        'flex items-start gap-3 rounded-xl px-4 py-3.5 border transition-all',
                        isDone
                          ? 'bg-[#141414] border-[#1e1e1e] opacity-50'
                          : alertLevel === 'critical'
                            ? 'bg-red-900/10 border-red-900/40 hover:border-red-900/60'
                            : alertLevel === 'high'
                              ? 'bg-orange-900/10 border-orange-900/40 hover:border-orange-900/60'
                              : 'bg-[#1a1a1a] border-[#242424] hover:border-[#333]'
                      )}
                    >
                      {/* Checkbox */}
                      <button
                        onClick={() => toggleDone(task)}
                        className="shrink-0 mt-0.5 text-[#555] hover:text-orange-400 transition-colors"
                      >
                        {isDone
                          ? <CheckSquare className="h-4.5 w-4.5 text-green-500" />
                          : <Square className="h-4.5 w-4.5" />}
                      </button>

                      {/* Content */}
                      <div
                        className="flex-1 min-w-0 cursor-pointer"
                        onClick={() => { setEditingTask(task); setShowForm(true) }}
                      >
                        <p className={cn('text-sm font-medium', isDone ? 'line-through text-[#555]' : 'text-[#ededed]')}>
                          {task.title}
                        </p>
                        {task.description && (
                          <p className="text-xs text-[#555] mt-0.5 line-clamp-2">{task.description}</p>
                        )}
                        <div className="flex flex-wrap items-center gap-2 mt-2">
                          {/* Priority */}
                          <div className={cn('flex items-center gap-1 text-xs px-1.5 py-0.5 rounded border', pri.bg)}>
                            <PriIcon className={cn('h-3 w-3', pri.color)} />
                            <span className={pri.color}>{pri.label}</span>
                          </div>
                          {/* Urgency */}
                          <span className={cn('text-xs px-1.5 py-0.5 rounded border', urg.badge)}>
                            {urg.label}
                          </span>
                          {/* Due date */}
                          {task.due_date && (
                            <span className={cn('text-xs flex items-center gap-1', isOverdue ? 'text-red-400' : 'text-[#555]')}>
                              <Clock className="h-3 w-3" />
                              {new Date(task.due_date).toLocaleDateString('es-AR', { day: '2-digit', month: 'short' })}
                              {isOverdue && ' (vencida)'}
                            </span>
                          )}
                          {task.assignee && (
                            <span className="text-xs text-[#555]">→ {task.assignee}</span>
                          )}
                        </div>
                      </div>

                      {/* Delete */}
                      <button
                        onClick={() => handleDelete(task.id)}
                        className="shrink-0 text-[#333] hover:text-red-400 transition-colors mt-0.5"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        </div>

        {/* Form panel */}
        {showForm && (
          <div className="w-80 shrink-0 border-l border-[#242424] overflow-y-auto bg-[#161616]">
            <TaskForm
              task={editingTask}
              onSave={editingTask
                ? (data) => handleUpdate(editingTask.id, data)
                : handleCreate
              }
              onDelete={editingTask ? () => handleDelete(editingTask.id) : undefined}
              onClose={() => { setShowForm(false); setEditingTask(null) }}
            />
          </div>
        )}
      </div>
    </div>
  )
}
