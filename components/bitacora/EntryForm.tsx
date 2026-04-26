'use client'
import { useState, useMemo } from 'react'
import { X, Search, Link, FileText } from 'lucide-react'
import type { LogEntry, ResearchItem } from '@/types/database'

type ResearchSummary = Pick<ResearchItem, 'id' | 'id_number' | 'shot_code' | 'subject' | 'supplier_name' | 'file_type'>

interface SaveData {
  entry_date: string
  content: string
  link: string | null
  researchIds: string[]
}

interface Props {
  initialData?: LogEntry
  researchItems: ResearchSummary[]
  onSave: (data: SaveData) => Promise<void>
  onCancel: () => void
}

export function EntryForm({ initialData, researchItems, onSave, onCancel }: Props) {
  const today = new Date().toISOString().slice(0, 10)
  const [saving, setSaving] = useState(false)
  const [date, setDate] = useState(initialData?.entry_date ?? today)
  const [content, setContent] = useState(initialData?.content ?? '')
  const [link, setLink] = useState(initialData?.link ?? '')
  const [search, setSearch] = useState('')
  const [selectedIds, setSelectedIds] = useState<string[]>(
    () => (initialData?.research_links ?? []).map(l => l.research_item_id)
  )

  const filtered = useMemo(() => {
    const q = search.toLowerCase()
    if (!q) return researchItems
    return researchItems.filter(r =>
      r.subject?.toLowerCase().includes(q) ||
      r.shot_code?.toLowerCase().includes(q) ||
      r.supplier_name?.toLowerCase().includes(q) ||
      String(r.id_number ?? '').includes(q)
    )
  }, [researchItems, search])

  function toggle(id: string) {
    setSelectedIds(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id])
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!content.trim()) return
    setSaving(true)
    await onSave({ entry_date: date, content: content.trim(), link: link.trim() || null, researchIds: selectedIds })
    setSaving(false)
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col h-full">
      <div className="flex items-center justify-between px-5 py-4 border-b border-[#242424]">
        <span className="text-sm font-medium text-[#ededed]">
          {initialData ? 'Editar entrada' : 'Nueva entrada'}
        </span>
        <button type="button" onClick={onCancel} className="text-[#555] hover:text-[#aaa] transition-colors">
          <X className="h-4 w-4" />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto px-5 py-4 space-y-4">
        {/* Date */}
        <div>
          <label className="block text-xs text-[#666] mb-1.5 uppercase tracking-wider font-medium">Fecha</label>
          <input
            type="date"
            value={date}
            onChange={e => setDate(e.target.value)}
            required
            className="w-full h-9 px-3 rounded-lg border border-[#2a2a2a] bg-[#111] text-sm text-[#ededed] focus:outline-none focus:border-orange-500 focus:ring-1 focus:ring-orange-500"
          />
        </div>

        {/* Content */}
        <div>
          <label className="block text-xs text-[#666] mb-1.5 uppercase tracking-wider font-medium">
            <FileText className="inline h-3 w-3 mr-1" />
            Nota
          </label>
          <textarea
            value={content}
            onChange={e => setContent(e.target.value)}
            rows={5}
            required
            placeholder="¿Qué hiciste hoy? Contactos, reuniones, decisiones, avances..."
            className="w-full px-3 py-2 rounded-lg border border-[#2a2a2a] bg-[#111] text-sm text-[#ededed] placeholder:text-[#444] focus:outline-none focus:border-orange-500 focus:ring-1 focus:ring-orange-500 resize-none leading-relaxed"
          />
        </div>

        {/* Link */}
        <div>
          <label className="block text-xs text-[#666] mb-1.5 uppercase tracking-wider font-medium">
            <Link className="inline h-3 w-3 mr-1" />
            Link (opcional)
          </label>
          <input
            type="url"
            value={link}
            onChange={e => setLink(e.target.value)}
            placeholder="https://..."
            className="w-full h-9 px-3 rounded-lg border border-[#2a2a2a] bg-[#111] text-sm text-[#ededed] placeholder:text-[#444] focus:outline-none focus:border-orange-500 focus:ring-1 focus:ring-orange-500"
          />
        </div>

        {/* Research items */}
        {researchItems.length > 0 && (
          <div>
            <label className="block text-xs text-[#666] mb-1.5 uppercase tracking-wider font-medium">
              Vincular items de research
              {selectedIds.length > 0 && (
                <span className="ml-2 text-orange-400 normal-case">{selectedIds.length} seleccionado{selectedIds.length !== 1 ? 's' : ''}</span>
              )}
            </label>
            <div className="relative mb-2">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-[#555]" />
              <input
                type="text"
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder="Buscar por subject, shot code, proveedor..."
                className="w-full h-8 pl-8 pr-3 rounded-lg border border-[#2a2a2a] bg-[#111] text-xs text-[#ededed] placeholder:text-[#444] focus:outline-none focus:border-orange-500"
              />
            </div>
            <div className="max-h-48 overflow-y-auto rounded-lg border border-[#2a2a2a] divide-y divide-[#1e1e1e]">
              {filtered.length === 0 ? (
                <p className="text-xs text-[#555] px-3 py-4 text-center">Sin resultados</p>
              ) : filtered.map(r => {
                const selected = selectedIds.includes(r.id)
                return (
                  <button
                    key={r.id}
                    type="button"
                    onClick={() => toggle(r.id)}
                    className={`w-full flex items-start gap-2.5 px-3 py-2 text-left transition-colors ${selected ? 'bg-orange-500/10' : 'hover:bg-[#1a1a1a]'}`}
                  >
                    <div className={`mt-0.5 h-4 w-4 rounded border flex items-center justify-center shrink-0 transition-colors ${selected ? 'bg-orange-500 border-orange-500' : 'border-[#444] bg-transparent'}`}>
                      {selected && <span className="text-white text-[10px] font-bold">✓</span>}
                    </div>
                    <div className="min-w-0">
                      <p className="text-xs text-[#ddd] truncate font-medium">{r.subject || '(sin título)'}</p>
                      <p className="text-[11px] text-[#555] truncate">
                        {[r.shot_code, r.supplier_name, r.id_number ? `#${r.id_number}` : null].filter(Boolean).join(' · ')}
                      </p>
                    </div>
                  </button>
                )
              })}
            </div>
          </div>
        )}
      </div>

      <div className="px-5 py-4 border-t border-[#242424] flex gap-2 shrink-0">
        <button
          type="submit"
          disabled={saving || !content.trim()}
          className="flex-1 h-9 rounded-lg bg-orange-500 hover:bg-orange-600 disabled:opacity-40 text-white text-sm font-medium transition-colors"
        >
          {saving ? 'Guardando...' : initialData ? 'Actualizar' : 'Guardar entrada'}
        </button>
        <button
          type="button"
          onClick={onCancel}
          className="h-9 px-4 rounded-lg border border-[#2a2a2a] text-[#888] hover:text-[#ededed] text-sm transition-colors"
        >
          Cancelar
        </button>
      </div>
    </form>
  )
}
