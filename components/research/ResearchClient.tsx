'use client'
import { useState, useCallback, useMemo, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Header } from '@/components/layout/Header'
import { Button } from '@/components/ui/button'
import { ResearchGrid } from './ResearchGrid'
import { toast } from 'sonner'
import { Plus, Download, Search, Upload } from 'lucide-react'
import type { ResearchItem } from '@/types/database'

interface Props {
  projectId: string
  initialItems: ResearchItem[]
  userEmail: string
}

export function ResearchClient({ projectId, initialItems, userEmail }: Props) {
  const [items, setItems] = useState<ResearchItem[]>(initialItems)
  const [search, setSearch] = useState('')
  const fileInputRef = useRef<HTMLInputElement>(null)

  const filtered = useMemo(() => {
    if (!search) return items
    const q = search.toLowerCase()
    return items.filter(it =>
      it.subject.toLowerCase().includes(q) ||
      it.shot_code?.toLowerCase().includes(q) ||
      it.supplier_name?.toLowerCase().includes(q) ||
      it.scene?.toLowerCase().includes(q) ||
      it.description?.toLowerCase().includes(q) ||
      it.tags?.toLowerCase().includes(q)
    )
  }, [items, search])

  const nextIdNumber = useMemo(() => {
    if (!items.length) return 1
    const max = Math.max(...items.map(i => i.id_number ?? 0))
    return max + 1
  }, [items])

  const handleAdd = useCallback(async () => {
    const supabase = createClient()
    const { data, error } = await supabase
      .from('research_items')
      .insert({
        project_id: projectId,
        id_number: nextIdNumber,
        subject: 'Nueva entrada',
        send_scr: false,
        in_context_promo: false,
      } as never)
      .select()
      .single()

    if (error) { toast.error('Error al crear entrada'); return }
    setItems(prev => [...prev, data as ResearchItem])
    toast.success('Entrada creada — editá las celdas directamente')
  }, [projectId, nextIdNumber])

  const handleUpdate = useCallback(async (id: string, data: Partial<ResearchItem>) => {
    const supabase = createClient()
    const { data: updated, error } = await supabase
      .from('research_items')
      .update(data as never)
      .eq('id', id)
      .select()
      .single()

    if (error) { toast.error('Error al guardar'); return }
    setItems(prev => prev.map(it => it.id === id ? (updated as ResearchItem) : it))
  }, [])

  const handleDelete = useCallback(async (id: string) => {
    if (!confirm('¿Eliminar esta entrada?')) return
    const supabase = createClient()
    const { error } = await supabase.from('research_items').delete().eq('id', id)
    if (error) { toast.error('Error al eliminar'); return }
    setItems(prev => prev.filter(it => it.id !== id))
    toast.success('Entrada eliminada')
  }, [])

  function handleExport() {
    const headers = [
      '#', 'SHOT', 'SUBJECT', 'DATE', 'EP', 'SCENE',
      'SUPPLIER', 'DELIVERY TIMING', 'LOCATION',
      'FILE TYPE', 'ID SCREENER', 'SCREENER FILE',
      'DESCRIPTION', 'LOG', 'LINK SCR', 'TAGS',
      'USD', 'SPECIAL CONDITIONS',
      'SEND SCR', 'SUPPORT SUPPLIER', 'IMAGE/VOICE RIGHTS',
      'RIGHTS SUPPLIER', 'OTHER RIGHTS', 'MEDIA', 'TERRITORY',
      'DURATION', 'IN CONTEXT PROMO',
    ]
    const rows = items.map(it => [
      it.id_number ?? '', it.shot_code ?? '', it.subject, it.date ?? '', it.ep ?? '', it.scene ?? '',
      it.supplier_name ?? '', it.delivery_timing ?? '', it.location ?? '',
      it.file_type ?? '', it.supplier_clip_id ?? '', it.screener_filename ?? '',
      it.description ?? '', it.log ?? '', it.link_scr ?? '', it.tags ?? '',
      it.usd_cost ?? '', it.special_conditions ?? '',
      it.send_scr ? 'YES' : 'NO', it.support_supplier ?? '', it.image_voice_rights ?? '',
      it.rights_supplier ?? '', it.other_rights ?? '', it.media ?? '', it.territory ?? '',
      it.duration_rights ?? '', it.in_context_promo ? 'YES' : 'NO',
    ])
    const csv = [headers, ...rows].map(r => r.map(v => `"${String(v).replace(/"/g, '""')}"`).join(',')).join('\n')
    const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `research-${new Date().toISOString().slice(0, 10)}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  async function handleCsvImport(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    const text = await file.text()
    const lines = text.replace(/^\uFEFF/, '').split('\n').filter(Boolean)
    if (lines.length < 2) { toast.error('CSV vacío o inválido'); return }

    const headers = lines[0].split(',').map(h => h.trim().replace(/^"|"$/g, '').toLowerCase())
    const rows = lines.slice(1).map(line => {
      const values = line.match(/("(?:[^"]|"")*"|[^,]*)/g)?.map(v => v.trim().replace(/^"|"$/g, '').replace(/""/g, '"')) ?? []
      return Object.fromEntries(headers.map((h, i) => [h, values[i] ?? '']))
    })

    const supabase = createClient()
    let count = 0
    let num = items.length + 1
    for (const row of rows) {
      const subject = row['subject'] || row['subjects'] || ''
      if (!subject) continue
      await supabase.from('research_items').insert({
        project_id: projectId,
        id_number: Number(row['#']) || num++,
        shot_code: row['shot'] || null,
        subject,
        date: row['date'] || null,
        ep: row['ep'] || null,
        scene: row['scene'] || null,
        supplier_name: row['supplier'] || null,
        delivery_timing: row['delivery timing'] || null,
        location: row['location'] || null,
        file_type: row['file type'] || null,
        supplier_clip_id: row['id screener'] || null,
        screener_filename: row['screener file'] || null,
        description: row['description'] || null,
        log: row['log'] || null,
        link_scr: row['link scr'] || null,
        tags: row['tags'] || null,
        usd_cost: row['usd'] ? Number(row['usd'].replace(/[^0-9.]/g, '')) : null,
        special_conditions: row['special conditions'] || null,
        send_scr: row['send scr']?.toLowerCase() === 'yes',
        support_supplier: row['support supplier'] || null,
        image_voice_rights: row['image/voice rights'] || null,
        rights_supplier: row['rights supplier'] || null,
        other_rights: row['other rights'] || null,
        media: row['media'] || null,
        territory: row['territory'] || null,
        duration_rights: row['duration'] || null,
        in_context_promo: row['in context promo']?.toLowerCase() === 'yes',
      } as never)
      count++
    }

    const { data: refreshed } = await supabase
      .from('research_items')
      .select('*')
      .eq('project_id', projectId)
      .order('id_number', { ascending: true })
    setItems((refreshed ?? []) as ResearchItem[])
    toast.success(`${count} entradas importadas`)
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  return (
    <div className="flex flex-col h-full">
      <Header
        title="Research Footage"
        description={`${items.length} entrada${items.length !== 1 ? 's' : ''} registrada${items.length !== 1 ? 's' : ''}`}
        email={userEmail}
        actions={
          <div className="flex items-center gap-2">
            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-[#555]" />
              <input
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder="Buscar shots, escenas..."
                className="h-8 pl-8 pr-3 w-52 rounded-lg border border-[#2a2a2a] bg-[#111] text-sm text-[#ededed] placeholder:text-[#444] focus:outline-none focus:border-orange-500 focus:ring-1 focus:ring-orange-500"
              />
            </div>
            <Button variant="ghost" size="sm" onClick={() => fileInputRef.current?.click()}>
              <Upload className="h-3.5 w-3.5" />
              CSV
            </Button>
            <input ref={fileInputRef} type="file" accept=".csv" className="hidden" onChange={handleCsvImport} />
            <Button variant="ghost" size="sm" onClick={handleExport}>
              <Download className="h-3.5 w-3.5" />
              Exportar
            </Button>
            <Button variant="primary" size="sm" onClick={handleAdd}>
              <Plus className="h-3.5 w-3.5" />
              Nueva entrada
            </Button>
          </div>
        }
      />

      <div className="flex flex-1 min-h-0">
        <ResearchGrid
          items={filtered}
          onUpdate={handleUpdate}
          onDelete={handleDelete}
        />
      </div>
    </div>
  )
}
