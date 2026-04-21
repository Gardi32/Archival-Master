'use client'
import { useState } from 'react'
import { Input } from '@/components/ui/input'
import { Select } from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { Button } from '@/components/ui/button'
import { toast } from 'sonner'
import { Sparkles, Link, X } from 'lucide-react'
import type { Material, Provider } from '@/types/database'

interface Props {
  projectId: string
  providers: Pick<Provider, 'id' | 'name'>[]
  initialData?: Partial<Material>
  onSave: (data: Partial<Material>) => Promise<void>
  onCancel: () => void
}

export function MaterialForm({ providers, initialData, onSave, onCancel }: Props) {
  const [saving, setSaving] = useState(false)
  const [extractUrl, setExtractUrl] = useState('')
  const [extracting, setExtracting] = useState(false)
  const [showExtract, setShowExtract] = useState(!initialData?.title)
  const [form, setForm] = useState({
    title: initialData?.title ?? '',
    code: initialData?.code ?? '',
    provider_id: initialData?.provider_id ?? '',
    description: initialData?.description ?? '',
    duration_sec: initialData?.duration_sec?.toString() ?? '',
    format: initialData?.format ?? '',
    resolution: initialData?.resolution ?? '',
    fps: initialData?.fps?.toString() ?? '',
    aspect_ratio: initialData?.aspect_ratio ?? '',
    timecode_in: initialData?.timecode_in ?? '',
    timecode_out: initialData?.timecode_out ?? '',
    rights_type: initialData?.rights_type ?? 'unknown',
    cost_amount: initialData?.cost_amount?.toString() ?? '',
    cost_currency: initialData?.cost_currency ?? 'USD',
    cost_unit: initialData?.cost_unit ?? 'flat',
    link: initialData?.link ?? '',
    screener_url: initialData?.screener_url ?? '',
    status: initialData?.status ?? 'searching',
    notes: initialData?.notes ?? '',
  })

  function set(key: string, value: string) {
    setForm(prev => ({ ...prev, [key]: value }))
  }

  async function handleExtract(e: React.FormEvent) {
    e.preventDefault()
    if (!extractUrl.trim()) return
    setExtracting(true)
    try {
      const res = await fetch('/api/extract-material', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: extractUrl }),
      })
      const json = await res.json()
      if (!res.ok || json.error) {
        toast.error(json.error ?? 'Error al extraer datos')
        setExtracting(false)
        return
      }
      const d = json.data
      setForm(prev => ({
        ...prev,
        title: d.title || prev.title,
        description: d.description || prev.description,
        duration_sec: d.duration_sec != null ? String(d.duration_sec) : prev.duration_sec,
        format: d.format || prev.format,
        resolution: d.resolution || prev.resolution,
        fps: d.fps != null ? String(d.fps) : prev.fps,
        aspect_ratio: d.aspect_ratio || prev.aspect_ratio,
        timecode_in: d.timecode_in || prev.timecode_in,
        timecode_out: d.timecode_out || prev.timecode_out,
        rights_type: d.rights_type || prev.rights_type,
        cost_amount: d.cost_amount != null ? String(d.cost_amount) : prev.cost_amount,
        cost_currency: d.cost_currency || prev.cost_currency,
        cost_unit: d.cost_unit || prev.cost_unit,
        link: d.link || prev.link,
        screener_url: d.screener_url || prev.screener_url,
        notes: d.notes ? (prev.notes ? `${prev.notes}\n${d.notes}` : d.notes) : prev.notes,
      }))
      setShowExtract(false)
      toast.success('¡Datos extraídos! Revisá y completá los campos faltantes.')
    } catch {
      toast.error('Error de conexión')
    }
    setExtracting(false)
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    await onSave({
      title: form.title,
      code: form.code || null,
      provider_id: form.provider_id || null,
      description: form.description || null,
      duration_sec: form.duration_sec ? Number(form.duration_sec) : null,
      format: form.format || null,
      resolution: form.resolution || null,
      fps: form.fps ? Number(form.fps) : null,
      aspect_ratio: form.aspect_ratio || null,
      timecode_in: form.timecode_in || null,
      timecode_out: form.timecode_out || null,
      rights_type: form.rights_type as Material['rights_type'],
      cost_amount: form.cost_amount ? Number(form.cost_amount) : null,
      cost_currency: form.cost_currency,
      cost_unit: form.cost_unit as Material['cost_unit'],
      link: form.link || null,
      screener_url: form.screener_url || null,
      status: form.status as Material['status'],
      notes: form.notes || null,
    })
    setSaving(false)
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      {/* IA Extractor */}
      {showExtract ? (
        <div className="bg-gradient-to-r from-purple-900/20 to-blue-900/20 border border-purple-500/30 rounded-xl p-4">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-purple-400" />
              <span className="text-sm font-medium text-purple-300">Completar con IA desde URL</span>
            </div>
            <button
              type="button"
              onClick={() => setShowExtract(false)}
              className="text-[#555] hover:text-[#aaa] transition-colors"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </div>
          <p className="text-xs text-[#666] mb-3">
            Pegá la URL de la página del proveedor (Getty, Corbis, AP Archive, etc.) y la IA va a extraer todos los datos automáticamente.
          </p>
          <div className="flex gap-2">
            <div className="relative flex-1">
              <Link className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-[#555]" />
              <input
                type="url"
                value={extractUrl}
                onChange={e => setExtractUrl(e.target.value)}
                placeholder="https://www.gettyimages.com/..."
                className="w-full h-9 pl-8 pr-3 rounded-lg border border-[#2a2a2a] bg-[#111] text-sm text-[#ededed] placeholder:text-[#444] focus:outline-none focus:border-purple-500 focus:ring-1 focus:ring-purple-500"
                onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); handleExtract(e as never) } }}
              />
            </div>
            <Button
              type="button"
              variant="primary"
              size="sm"
              loading={extracting}
              onClick={handleExtract}
              className="bg-purple-600 hover:bg-purple-700 whitespace-nowrap"
            >
              {!extracting && <Sparkles className="h-3.5 w-3.5" />}
              Extraer datos
            </Button>
          </div>
          {extracting && (
            <p className="text-xs text-purple-400 mt-2 animate-pulse">
              Analizando la página con Gemini AI...
            </p>
          )}
        </div>
      ) : (
        <button
          type="button"
          onClick={() => setShowExtract(true)}
          className="w-full flex items-center justify-center gap-2 h-8 rounded-lg border border-dashed border-purple-500/30 text-xs text-purple-400 hover:border-purple-500/60 hover:bg-purple-500/5 transition-colors"
        >
          <Sparkles className="h-3 w-3" />
          Completar automáticamente desde una URL con IA
        </button>
      )}

      {/* Identificación */}
      <div>
        <h3 className="text-xs font-semibold text-[#666] uppercase tracking-wider mb-3">Identificación</h3>
        <div className="grid grid-cols-3 gap-3">
          <Input label="Código" id="code" value={form.code} onChange={e => set('code', e.target.value)} placeholder="Ej: ARCH-001" />
          <div className="col-span-2">
            <Input label="Título *" id="title" value={form.title} onChange={e => set('title', e.target.value)} placeholder="Nombre del material" required />
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3 mt-3">
          <Select label="Proveedor" id="provider_id" value={form.provider_id} onChange={e => set('provider_id', e.target.value)}>
            <option value="">Sin asignar</option>
            {providers.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
          </Select>
          <Select label="Estado" id="status" value={form.status} onChange={e => set('status', e.target.value)}>
            <option value="searching">Buscando</option>
            <option value="screener_received">Screener recibido</option>
            <option value="approved">Aprobado</option>
            <option value="order_sent">Pedido enviado</option>
            <option value="purchased">Comprado</option>
          </Select>
        </div>
      </div>

      {/* Técnico */}
      <div>
        <h3 className="text-xs font-semibold text-[#666] uppercase tracking-wider mb-3">Datos técnicos</h3>
        <div className="grid grid-cols-4 gap-3">
          <Input label="Duración (seg)" id="duration_sec" type="number" value={form.duration_sec} onChange={e => set('duration_sec', e.target.value)} placeholder="0" />
          <Input label="Formato" id="format" value={form.format} onChange={e => set('format', e.target.value)} placeholder="MP4, MOV..." />
          <Input label="Resolución" id="resolution" value={form.resolution} onChange={e => set('resolution', e.target.value)} placeholder="1920x1080" />
          <Input label="FPS" id="fps" type="number" value={form.fps} onChange={e => set('fps', e.target.value)} placeholder="25" />
        </div>
        <div className="grid grid-cols-3 gap-3 mt-3">
          <Input label="Aspect Ratio" id="aspect_ratio" value={form.aspect_ratio} onChange={e => set('aspect_ratio', e.target.value)} placeholder="16:9" />
          <Input label="TC In" id="timecode_in" value={form.timecode_in} onChange={e => set('timecode_in', e.target.value)} placeholder="00:00:00:00" />
          <Input label="TC Out" id="timecode_out" value={form.timecode_out} onChange={e => set('timecode_out', e.target.value)} placeholder="00:00:00:00" />
        </div>
      </div>

      {/* Derechos y Costo */}
      <div>
        <h3 className="text-xs font-semibold text-[#666] uppercase tracking-wider mb-3">Derechos y costo</h3>
        <div className="grid grid-cols-4 gap-3">
          <Select label="Derechos" id="rights_type" value={form.rights_type} onChange={e => set('rights_type', e.target.value)}>
            <option value="unknown">Sin definir</option>
            <option value="free">Libre</option>
            <option value="licensed">Licenciado</option>
            <option value="restricted">Restringido</option>
          </Select>
          <Input label="Costo" id="cost_amount" type="number" value={form.cost_amount} onChange={e => set('cost_amount', e.target.value)} placeholder="0.00" />
          <Select label="Moneda" id="cost_currency" value={form.cost_currency} onChange={e => set('cost_currency', e.target.value)}>
            <option value="USD">USD</option>
            <option value="ARS">ARS</option>
            <option value="EUR">EUR</option>
            <option value="GBP">GBP</option>
          </Select>
          <Select label="Unidad" id="cost_unit" value={form.cost_unit} onChange={e => set('cost_unit', e.target.value)}>
            <option value="flat">Tarifa fija</option>
            <option value="per_sec">Por segundo</option>
            <option value="per_min">Por minuto</option>
          </Select>
        </div>
      </div>

      {/* Links */}
      <div>
        <h3 className="text-xs font-semibold text-[#666] uppercase tracking-wider mb-3">Links</h3>
        <div className="grid grid-cols-2 gap-3">
          <Input label="Link al material" id="link" type="url" value={form.link} onChange={e => set('link', e.target.value)} placeholder="https://..." />
          <Input label="Link screener" id="screener_url" type="url" value={form.screener_url} onChange={e => set('screener_url', e.target.value)} placeholder="https://..." />
        </div>
      </div>

      {/* Descripción y notas */}
      <div className="grid grid-cols-2 gap-3">
        <Textarea label="Descripción" id="description" value={form.description} onChange={e => set('description', e.target.value)} rows={3} placeholder="Descripción del contenido..." />
        <Textarea label="Notas internas" id="notes" value={form.notes} onChange={e => set('notes', e.target.value)} rows={3} placeholder="Notas de producción..." />
      </div>

      <div className="flex gap-2 pt-2 border-t border-[#2a2a2a]">
        <Button type="submit" variant="primary" loading={saving}>Guardar</Button>
        <Button type="button" variant="ghost" onClick={onCancel}>Cancelar</Button>
      </div>
    </form>
  )
}
