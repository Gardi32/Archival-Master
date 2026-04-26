'use client'
import { useState, useCallback, useMemo } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Header } from '@/components/layout/Header'
import { Button } from '@/components/ui/button'
import { toast } from 'sonner'
import { Plus, ChevronRight, ChevronDown, Calendar } from 'lucide-react'
import { format, differenceInDays, addDays, eachMonthOfInterval, eachWeekOfInterval, getDaysInMonth, startOfMonth, startOfWeek, parseISO } from 'date-fns'
import { es } from 'date-fns/locale'
import { GanttTaskForm } from './GanttTaskForm'
import type { GanttTask } from '@/types/database'

const DAY_WIDTH = 28
const ROW_HEIGHT = 44

const STATUS_COLORS: Record<string, string> = {
  pending: '#6b7280',
  in_progress: '#f97316',
  done: '#22c55e',
  blocked: '#ef4444',
}

const STATUS_LABELS: Record<string, string> = {
  pending: 'Pendiente',
  in_progress: 'En progreso',
  done: 'Completado',
  blocked: 'Bloqueado',
}

function buildTree(tasks: GanttTask[]): GanttTask[] {
  const byId: Record<string, GanttTask> = {}
  tasks.forEach(t => { byId[t.id] = { ...t, children: [] } })
  const roots: GanttTask[] = []
  tasks.forEach(t => {
    if (t.parent_id && byId[t.parent_id]) {
      byId[t.parent_id].children!.push(byId[t.id])
    } else {
      roots.push(byId[t.id])
    }
  })
  return roots.sort((a, b) => a.order_index - b.order_index)
}

function flattenTree(nodes: GanttTask[], collapsed: Set<string>, depth = 0): { task: GanttTask; depth: number }[] {
  const result: { task: GanttTask; depth: number }[] = []
  for (const node of nodes) {
    result.push({ task: node, depth })
    if (node.children?.length && !collapsed.has(node.id)) {
      result.push(...flattenTree(node.children, collapsed, depth + 1))
    }
  }
  return result
}

interface Props {
  projectId: string
  initialTasks: GanttTask[]
  userEmail: string
}

export function GanttClient({ projectId, initialTasks, userEmail }: Props) {
  const [tasks, setTasks] = useState<GanttTask[]>(initialTasks)
  const [editingTask, setEditingTask] = useState<GanttTask | null>(null)
  const [showForm, setShowForm] = useState(false)
  const [collapsed, setCollapsed] = useState<Set<string>>(new Set())

  const { rangeStart, rangeEnd } = useMemo(() => {
    const today = new Date()
    if (tasks.length === 0) {
      return { rangeStart: addDays(today, -7), rangeEnd: addDays(today, 60) }
    }
    const starts = tasks.map(t => parseISO(t.start_date).getTime())
    const ends = tasks.map(t => parseISO(t.end_date).getTime())
    return {
      rangeStart: addDays(new Date(Math.min(...starts)), -7),
      rangeEnd: addDays(new Date(Math.max(...ends)), 14),
    }
  }, [tasks])

  const tree = useMemo(() => buildTree(tasks), [tasks])
  const flatRows = useMemo(() => flattenTree(tree, collapsed), [tree, collapsed])

  const totalDays = differenceInDays(rangeEnd, rangeStart) + 1
  const totalWidth = totalDays * DAY_WIDTH
  const todayLeft = differenceInDays(new Date(), rangeStart) * DAY_WIDTH

  const months = useMemo(
    () => eachMonthOfInterval({ start: rangeStart, end: rangeEnd }),
    [rangeStart, rangeEnd]
  )

  const weeks = useMemo(
    () => eachWeekOfInterval({ start: rangeStart, end: rangeEnd }, { weekStartsOn: 1 }),
    [rangeStart, rangeEnd]
  )

  const handleCreate = useCallback(async (data: Partial<GanttTask>) => {
    const supabase = createClient()
    const maxOrder = tasks.reduce((m, t) => Math.max(m, t.order_index), 0)
    const { data: created, error } = await supabase
      .from('gantt_tasks')
      .insert({ ...data, project_id: projectId, order_index: maxOrder + 1 } as never)
      .select()
      .single()
    if (error) { toast.error('Error al crear'); return }
    setTasks(prev => [...prev, created])
    setShowForm(false)
    setEditingTask(null)
    toast.success('Tarea creada')
  }, [projectId, tasks])

  const handleUpdate = useCallback(async (id: string, data: Partial<GanttTask>) => {
    const supabase = createClient()
    const { data: updated, error } = await supabase
      .from('gantt_tasks')
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
    if (!confirm('¿Eliminar esta tarea?')) return
    const supabase = createClient()
    await supabase.from('gantt_tasks').delete().eq('id', id)
    setTasks(prev => prev.filter(t => t.id !== id && t.parent_id !== id))
    setEditingTask(null)
    setShowForm(false)
    toast.success('Eliminado')
  }, [])

  function openNew() { setEditingTask(null); setShowForm(true) }
  function openEdit(task: GanttTask) { setEditingTask(task); setShowForm(true) }
  function toggleCollapse(id: string) {
    setCollapsed(prev => { const s = new Set(prev); if (s.has(id)) s.delete(id); else s.add(id); return s })
  }

  const stats = {
    total: tasks.length,
    done: tasks.filter(t => t.status === 'done').length,
    inProgress: tasks.filter(t => t.status === 'in_progress').length,
    blocked: tasks.filter(t => t.status === 'blocked').length,
  }

  return (
    <div className="flex flex-col h-full">
      <Header
        title="Gantt del Proyecto"
        description={`${stats.total} etapa${stats.total !== 1 ? 's' : ''} · ${stats.done} completada${stats.done !== 1 ? 's' : ''} · ${stats.inProgress} en progreso`}
        email={userEmail}
        actions={
          <Button variant="primary" size="sm" onClick={openNew}>
            <Plus className="h-3.5 w-3.5" />
            Nueva etapa
          </Button>
        }
      />

      <div className="flex flex-1 min-h-0 overflow-hidden">
        {/* Gantt main area */}
        <div className="flex flex-1 min-w-0 overflow-hidden">

          {/* Left: task list */}
          <div className="w-72 shrink-0 border-r border-[#242424] flex flex-col bg-[#161616]">
            {/* Column header */}
            <div className="h-[64px] flex items-center px-4 border-b border-[#2a2a2a] bg-[#161616] shrink-0">
              <span className="text-xs font-semibold text-[#555] uppercase tracking-wider">Etapa / Tarea</span>
            </div>

            {/* Rows */}
            <div className="flex-1 overflow-y-auto">
              {flatRows.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full text-center px-6 py-16">
                  <Calendar className="h-8 w-8 text-[#333] mx-auto mb-3" />
                  <p className="text-sm text-[#555] mb-4">Sin etapas todavía</p>
                  <Button variant="ghost" size="sm" onClick={openNew}>
                    <Plus className="h-3.5 w-3.5" />
                    Agregar primera etapa
                  </Button>
                </div>
              ) : (
                flatRows.map(({ task, depth }) => (
                  <div
                    key={task.id}
                    className="flex items-center gap-2 border-b border-[#1e1e1e] cursor-pointer hover:bg-[#1f1f1f] transition-colors group"
                    style={{ height: ROW_HEIGHT, paddingLeft: 12 + depth * 18 }}
                    onClick={() => openEdit(task)}
                  >
                    {/* Collapse toggle */}
                    {task.children && task.children.length > 0 ? (
                      <button
                        className="text-[#444] hover:text-[#aaa] transition-colors shrink-0"
                        onClick={e => { e.stopPropagation(); toggleCollapse(task.id) }}
                      >
                        {collapsed.has(task.id)
                          ? <ChevronRight className="h-3.5 w-3.5" />
                          : <ChevronDown className="h-3.5 w-3.5" />}
                      </button>
                    ) : <div className="w-3.5 shrink-0" />}

                    {/* Status indicator */}
                    <div
                      className="h-2 w-2 rounded-full shrink-0"
                      style={{ backgroundColor: STATUS_COLORS[task.status] }}
                    />

                    {/* Title */}
                    <span className="text-sm text-[#ddd] truncate flex-1 group-hover:text-white transition-colors">
                      {task.title}
                    </span>

                    {/* Date range */}
                    <span className="text-[10px] text-[#444] shrink-0 pr-3 font-mono">
                      {format(parseISO(task.start_date), 'dd/MM')}–{format(parseISO(task.end_date), 'dd/MM')}
                    </span>
                  </div>
                ))
              )}
            </div>

            {/* Status legend */}
            <div className="px-4 py-3 border-t border-[#242424] flex flex-wrap gap-3">
              {Object.entries(STATUS_LABELS).map(([s, label]) => (
                <div key={s} className="flex items-center gap-1.5">
                  <div className="h-2 w-2 rounded-full" style={{ backgroundColor: STATUS_COLORS[s] }} />
                  <span className="text-[10px] text-[#555]">{label}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Right: timeline */}
          <div className="flex-1 min-w-0 overflow-x-auto overflow-y-auto bg-[#111]">
            <div style={{ width: Math.max(totalWidth, 800), minWidth: '100%' }}>

              {/* Three-row header: months / weeks / days */}
              <div className="sticky top-0 z-10 bg-[#161616] border-b border-[#2a2a2a]">

                {/* Row 1: Months */}
                <div className="flex h-[22px] border-b border-[#242424]">
                  {months.map(month => {
                    const ms = startOfMonth(month)
                    const daysInMo = getDaysInMonth(month)
                    const visStart = ms < rangeStart ? rangeStart : ms
                    const visEnd2 = (addDays(ms, daysInMo - 1) > rangeEnd) ? rangeEnd : addDays(ms, daysInMo - 1)
                    const width = differenceInDays(visEnd2, visStart) * DAY_WIDTH + DAY_WIDTH
                    return (
                      <div
                        key={month.toISOString()}
                        style={{ width, minWidth: width }}
                        className="border-r border-[#2a2a2a] flex items-center px-2 shrink-0"
                      >
                        <span className="text-[10px] font-bold text-[#888] uppercase tracking-wider">
                          {format(month, 'MMM yyyy', { locale: es })}
                        </span>
                      </div>
                    )
                  })}
                </div>

                {/* Row 2: Weeks */}
                <div className="flex h-[22px] border-b border-[#252525]">
                  {weeks.map(weekStart => {
                    const clampedStart = weekStart < rangeStart ? rangeStart : weekStart
                    const weekEnd = addDays(weekStart, 6)
                    const clampedEnd = weekEnd > rangeEnd ? rangeEnd : weekEnd
                    const visDays = differenceInDays(clampedEnd, clampedStart) + 1
                    const width = visDays * DAY_WIDTH
                    if (width <= 0) return null
                    return (
                      <div
                        key={weekStart.toISOString()}
                        style={{ width, minWidth: width }}
                        className="border-r border-[#252525] flex items-center px-2 gap-1.5 shrink-0"
                      >
                        <span className="text-[10px] text-[#666] font-semibold leading-none">
                          S{format(clampedStart, 'w')}
                        </span>
                        <span className="text-[10px] text-[#555] font-mono leading-none">
                          {format(clampedStart, 'dd/MM')}
                        </span>
                      </div>
                    )
                  })}
                </div>

                {/* Row 3: Days */}
                <div className="flex h-[20px]">
                  {Array.from({ length: totalDays }).map((_, i) => {
                    const day = addDays(rangeStart, i)
                    const isToday = format(day, 'yyyy-MM-dd') === format(new Date(), 'yyyy-MM-dd')
                    const dow = day.getDay()
                    const isWeekend = dow === 0 || dow === 6
                    return (
                      <div
                        key={i}
                        style={{
                          width: DAY_WIDTH,
                          minWidth: DAY_WIDTH,
                          backgroundColor: isWeekend ? '#121212' : '#151515',
                        }}
                        className="border-r border-[#1e1e1e] flex items-center justify-center shrink-0"
                      >
                        <span
                          className="text-[9px] font-mono leading-none"
                          style={{ color: isToday ? 'var(--accent)' : isWeekend ? '#444' : '#555' }}
                        >
                          {format(day, 'd')}
                        </span>
                      </div>
                    )
                  })}
                </div>
              </div>

              {/* Task rows */}
              <div className="relative">
                {/* Week grid lines */}
                {Array.from({ length: Math.ceil(totalDays / 7) + 1 }).map((_, i) => (
                  <div
                    key={i}
                    className="absolute top-0 bottom-0 border-l border-[#1c1c1c] pointer-events-none"
                    style={{ left: i * 7 * DAY_WIDTH }}
                  />
                ))}

                {/* Today line */}
                {todayLeft >= 0 && todayLeft <= totalWidth && (
                  <div
                    className="absolute top-0 bottom-0 w-px z-10 pointer-events-none"
                    style={{ left: todayLeft + DAY_WIDTH / 2, background: 'var(--accent-ring)' }}
                  >
                    <div className="absolute -top-0 left-1/2 -translate-x-1/2 text-[9px] font-mono px-1 bg-[#161616] rounded" style={{ color: 'var(--accent)' }}>
                      hoy
                    </div>
                  </div>
                )}

                {flatRows.length === 0 ? (
                  <div style={{ height: 200 }} />
                ) : (
                  flatRows.map(({ task }) => {
                    const taskStart = parseISO(task.start_date)
                    const taskEnd = parseISO(task.end_date)
                    const left = Math.max(0, differenceInDays(taskStart, rangeStart)) * DAY_WIDTH
                    const barDays = Math.max(1, differenceInDays(taskEnd, taskStart) + 1)
                    const width = barDays * DAY_WIDTH
                    const barColor = task.color ?? STATUS_COLORS[task.status]
                    const isParent = (task.children?.length ?? 0) > 0

                    return (
                      <div
                        key={task.id}
                        className="relative border-b border-[#1c1c1c]"
                        style={{ height: ROW_HEIGHT }}
                      >
                        <div
                          className="absolute top-1/2 -translate-y-1/2 rounded cursor-pointer flex items-center px-2 gap-1 transition-all hover:brightness-125"
                          style={{
                            left: left + 2,
                            width: Math.max(width - 4, 20),
                            height: isParent ? 28 : 24,
                            backgroundColor: barColor + '28',
                            border: `1.5px solid ${barColor}55`,
                          }}
                          onClick={() => openEdit(task)}
                          title={`${task.title} · ${format(taskStart, 'dd/MM/yy')} → ${format(taskEnd, 'dd/MM/yy')}`}
                        >
                          {width > 60 && (
                            <span
                              className="text-[11px] font-medium truncate"
                              style={{ color: barColor }}
                            >
                              {task.title}
                            </span>
                          )}
                        </div>
                      </div>
                    )
                  })
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Right: form panel */}
        {showForm && (
          <div className="w-80 shrink-0 border-l border-[#242424] overflow-y-auto bg-[#161616]">
            <GanttTaskForm
              task={editingTask}
              tasks={tasks}
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
