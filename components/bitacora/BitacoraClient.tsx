'use client'
import { useState, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { toast } from 'sonner'
import { Plus, BookOpen } from 'lucide-react'
import type { LogEntry, ResearchItem } from '@/types/database'
import { EntryCard } from './EntryCard'
import { EntryForm } from './EntryForm'

type ResearchSummary = Pick<ResearchItem, 'id' | 'id_number' | 'shot_code' | 'subject' | 'supplier_name' | 'file_type'>

interface Props {
  projectId: string
  initialEntries: LogEntry[]
  researchItems: ResearchSummary[]
}

export function BitacoraClient({ projectId, initialEntries, researchItems }: Props) {
  const supabase = createClient()
  const [entries, setEntries] = useState<LogEntry[]>(initialEntries)
  const [showForm, setShowForm] = useState(false)
  const [editing, setEditing] = useState<LogEntry | null>(null)

  const handleAdd = useCallback(async (data: { entry_date: string; content: string; link: string | null; researchIds: string[] }) => {
    const { data: entry, error } = await supabase
      .from('log_entries')
      .insert({ project_id: projectId, entry_date: data.entry_date, content: data.content, link: data.link })
      .select()
      .single()
    if (error || !entry) { toast.error('Error al guardar'); return }

    if (data.researchIds.length > 0) {
      await supabase.from('log_entry_research_links').insert(
        data.researchIds.map(rid => ({ log_entry_id: entry.id, research_item_id: rid }))
      )
    }

    const linked = researchItems.filter(r => data.researchIds.includes(r.id))
    const full: LogEntry = {
      ...entry,
      research_links: linked.map(r => ({ log_entry_id: entry.id, research_item_id: r.id, research_item: r as ResearchItem })),
    }
    setEntries(prev => [full, ...prev].sort((a, b) => {
      const d = b.entry_date.localeCompare(a.entry_date)
      return d !== 0 ? d : b.created_at.localeCompare(a.created_at)
    }))
    setShowForm(false)
    toast.success('Entrada guardada')
  }, [projectId, researchItems, supabase])

  const handleUpdate = useCallback(async (id: string, data: { entry_date: string; content: string; link: string | null; researchIds: string[] }) => {
    const { error } = await supabase
      .from('log_entries')
      .update({ entry_date: data.entry_date, content: data.content, link: data.link })
      .eq('id', id)
    if (error) { toast.error('Error al actualizar'); return }

    // Replace research links
    await supabase.from('log_entry_research_links').delete().eq('log_entry_id', id)
    if (data.researchIds.length > 0) {
      await supabase.from('log_entry_research_links').insert(
        data.researchIds.map(rid => ({ log_entry_id: id, research_item_id: rid }))
      )
    }

    const linked = researchItems.filter(r => data.researchIds.includes(r.id))
    setEntries(prev => prev.map(e => e.id !== id ? e : {
      ...e,
      entry_date: data.entry_date,
      content: data.content,
      link: data.link,
      research_links: linked.map(r => ({ log_entry_id: id, research_item_id: r.id, research_item: r as ResearchItem })),
    }).sort((a, b) => {
      const d = b.entry_date.localeCompare(a.entry_date)
      return d !== 0 ? d : b.created_at.localeCompare(a.created_at)
    }))
    setEditing(null)
    toast.success('Entrada actualizada')
  }, [researchItems, supabase])

  const handleDelete = useCallback(async (id: string) => {
    const { error } = await supabase.from('log_entries').delete().eq('id', id)
    if (error) { toast.error('Error al eliminar'); return }
    setEntries(prev => prev.filter(e => e.id !== id))
    toast.success('Entrada eliminada')
  }, [supabase])

  const activeForm = showForm || editing !== null

  return (
    <div className="flex flex-col h-full bg-[#0f0f0f]">
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-4 border-b border-[#242424] shrink-0">
        <div className="flex items-center gap-2.5">
          <BookOpen className="h-5 w-5 text-orange-400" />
          <h1 className="text-base font-semibold text-[#ededed]">Bitácora</h1>
          <span className="text-xs text-[#555] ml-1">{entries.length} entrada{entries.length !== 1 ? 's' : ''}</span>
        </div>
        <button
          onClick={() => { setEditing(null); setShowForm(true) }}
          className="flex items-center gap-1.5 h-8 px-3 rounded-lg bg-orange-500 hover:bg-orange-600 text-white text-xs font-medium transition-colors"
        >
          <Plus className="h-3.5 w-3.5" />
          Nueva entrada
        </button>
      </div>

      <div className="flex flex-1 min-h-0">
        {/* Timeline */}
        <div className="flex-1 overflow-y-auto px-6 py-6">
          {entries.length === 0 && !activeForm ? (
            <div className="flex flex-col items-center justify-center h-full text-center py-24">
              <BookOpen className="h-10 w-10 text-[#333] mb-4" />
              <p className="text-[#555] text-sm">No hay entradas aún.</p>
              <p className="text-[#444] text-xs mt-1">Registrá lo que hiciste hoy con el proyecto.</p>
            </div>
          ) : (
            <div className="max-w-2xl mx-auto space-y-1">
              {entries.map((entry, i) => {
                const prevDate = i > 0 ? entries[i - 1].entry_date : null
                const showDate = entry.entry_date !== prevDate
                return (
                  <div key={entry.id}>
                    {showDate && (
                      <div className="flex items-center gap-3 py-3 first:pt-0">
                        <span className="text-xs font-semibold text-[#555] uppercase tracking-wider whitespace-nowrap">
                          {formatDate(entry.entry_date)}
                        </span>
                        <div className="flex-1 h-px bg-[#222]" />
                      </div>
                    )}
                    <EntryCard
                      entry={entry}
                      onEdit={() => { setShowForm(false); setEditing(entry) }}
                      onDelete={() => handleDelete(entry.id)}
                    />
                  </div>
                )
              })}
            </div>
          )}
        </div>

        {/* Form panel */}
        {activeForm && (
          <div className="w-96 shrink-0 border-l border-[#242424] overflow-y-auto">
            <EntryForm
              initialData={editing ?? undefined}
              researchItems={researchItems}
              onSave={editing
                ? (d) => handleUpdate(editing.id, d)
                : handleAdd
              }
              onCancel={() => { setShowForm(false); setEditing(null) }}
            />
          </div>
        )}
      </div>
    </div>
  )
}

function formatDate(iso: string) {
  const d = new Date(iso + 'T12:00:00')
  return d.toLocaleDateString('es-AR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })
}
