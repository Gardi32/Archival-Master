'use client'
import { useState } from 'react'
import { ExternalLink, Pencil, Trash2, ChevronDown, ChevronUp } from 'lucide-react'
import type { LogEntry } from '@/types/database'

interface Props {
  entry: LogEntry
  onEdit: () => void
  onDelete: () => void
}

export function EntryCard({ entry, onEdit, onDelete }: Props) {
  const [expanded, setExpanded] = useState(false)
  const links = entry.research_links ?? []
  const hasLinks = links.length > 0
  const time = new Date(entry.created_at).toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' })

  return (
    <div className="group relative bg-[#161616] border border-[#2a2a2a] rounded-xl p-4 hover:border-[#333] transition-colors">
      {/* Actions */}
      <div className="absolute top-3 right-3 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
        <button onClick={onEdit} className="p-1.5 rounded-lg text-[#555] hover:text-[#aaa] hover:bg-[#222] transition-colors">
          <Pencil className="h-3.5 w-3.5" />
        </button>
        <button onClick={onDelete} className="p-1.5 rounded-lg text-[#555] hover:text-red-400 hover:bg-[#222] transition-colors">
          <Trash2 className="h-3.5 w-3.5" />
        </button>
      </div>

      {/* Time */}
      <span className="text-[10px] text-[#444] font-mono mb-2 block">{time}</span>

      {/* Content */}
      <p className="text-sm text-[#ddd] leading-relaxed whitespace-pre-wrap pr-16">{entry.content}</p>

      {/* Link */}
      {entry.link && (
        <a
          href={entry.link}
          target="_blank"
          rel="noopener noreferrer"
          className="mt-2 inline-flex items-center gap-1 text-xs text-orange-400 hover:text-orange-300 transition-colors"
        >
          <ExternalLink className="h-3 w-3 shrink-0" />
          <span className="truncate max-w-xs">{entry.link.replace(/^https?:\/\/(www\.)?/, '')}</span>
        </a>
      )}

      {/* Research links */}
      {hasLinks && (
        <div className="mt-3 pt-3 border-t border-[#222]">
          <button
            onClick={() => setExpanded(v => !v)}
            className="flex items-center gap-1.5 text-xs text-[#666] hover:text-[#aaa] transition-colors mb-2"
          >
            {expanded ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
            {links.length} item{links.length !== 1 ? 's' : ''} de research vinculado{links.length !== 1 ? 's' : ''}
          </button>
          {expanded && (
            <div className="flex flex-wrap gap-1.5">
              {links.map(l => {
                const r = l.research_item
                const label = r ? (r.shot_code || r.subject?.slice(0, 40) || r.id.slice(0, 8)) : l.research_item_id.slice(0, 8)
                const sub = r?.supplier_name ? ` · ${r.supplier_name}` : ''
                return (
                  <span key={l.research_item_id} className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-[#1e1e1e] border border-[#333] text-xs text-[#aaa]">
                    <span className="w-1.5 h-1.5 rounded-full bg-orange-500/60 shrink-0" />
                    {label}{sub}
                  </span>
                )
              })}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
