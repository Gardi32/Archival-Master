'use client'
import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Header } from '@/components/layout/Header'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Dialog } from '@/components/ui/dialog'
import { toast } from 'sonner'
import {
  Plus, Building2, Mail, Phone, Globe, Film, Edit, Trash2,
  DollarSign, ChevronDown, ChevronUp, Link2, Unlink, Calendar, Copy,
} from 'lucide-react'
import type { Provider, ProviderRate } from '@/types/database'

interface Props {
  projectId: string
  initialProviders: Provider[]            // all global providers with their rates
  initialLinkedIds: string[]              // which ones are linked to this project
  userEmail: string
}

const EMPTY_PROVIDER = { name: '', code: '', contact_name: '', email: '', phone: '', website: '', notes: '' }
const EMPTY_RATE = { label: '', rate_value: '', rate_timing: '', rate_variables: '', effective_date: '', notes: '' }

function RateForm({
  initial, onSave, onCancel, saving,
}: {
  initial?: typeof EMPTY_RATE
  onSave: (r: typeof EMPTY_RATE) => void
  onCancel: () => void
  saving: boolean
}) {
  const [f, setF] = useState(initial ?? EMPTY_RATE)
  const set = (k: string, v: string) => setF(p => ({ ...p, [k]: v }))
  return (
    <form onSubmit={e => { e.preventDefault(); onSave(f) }} className="space-y-3 bg-[#111] border border-[#2a2a2a] rounded-lg p-3 mt-2">
      <Input label="Descripción de la tarifa *" id="rl" value={f.label} onChange={e => set('label', e.target.value)} placeholder="Ej: Material archivo deportivo" required />
      <div className="grid grid-cols-3 gap-2">
        <Input label="Valor (USD)" id="rv" type="number" step="0.01" min="0" value={f.rate_value} onChange={e => set('rate_value', e.target.value)} placeholder="0.00" />
        <Input label="Por timing" id="rt" value={f.rate_timing} onChange={e => set('rate_timing', e.target.value)} placeholder="por minuto" />
        <Input label="Variables" id="rvar" value={f.rate_variables} onChange={e => set('rate_variables', e.target.value)} placeholder="mín. 1 minuto" />
      </div>
      <div className="grid grid-cols-2 gap-2">
        <Input label="Vigencia desde" id="rdate" type="date" value={f.effective_date} onChange={e => set('effective_date', e.target.value)} />
        <Input label="Notas" id="rnotes" value={f.notes} onChange={e => set('notes', e.target.value)} placeholder="Condiciones especiales..." />
      </div>
      <div className="flex gap-2">
        <Button type="submit" variant="primary" size="sm" loading={saving}>Guardar tarifa</Button>
        <Button type="button" variant="ghost" size="sm" onClick={onCancel}>Cancelar</Button>
      </div>
    </form>
  )
}

function ProviderCard({
  provider, projectId, isLinked, onToggleLink, onUpdateProvider, onDeleteProvider,
}: {
  provider: Provider
  projectId: string
  isLinked: boolean
  onToggleLink: (id: string, link: boolean) => void
  onUpdateProvider: (p: Provider) => void
  onDeleteProvider: (id: string) => void
}) {
  const [expanded, setExpanded] = useState(false)
  const [rates, setRates] = useState<ProviderRate[]>(provider.rates ?? [])
  const [editingProvider, setEditingProvider] = useState(false)
  const [addingRate, setAddingRate] = useState<null | 'global' | 'project'>(null)
  const [editingRate, setEditingRate] = useState<ProviderRate | null>(null)
  const [saving, setSaving] = useState(false)
  const [pForm, setPForm] = useState({
    name: provider.name,
    code: provider.code ?? '',
    contact_name: provider.contact_name ?? '',
    email: provider.email ?? '',
    phone: provider.phone ?? '',
    website: provider.website ?? '',
    notes: provider.notes ?? '',
  })

  async function saveProvider(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    const supabase = createClient()
    const { data, error } = await supabase
      .from('providers')
      .update({
        name: pForm.name.trim(),
        code: pForm.code.trim().toUpperCase().slice(0, 3) || null,
        contact_name: pForm.contact_name || null,
        email: pForm.email || null,
        phone: pForm.phone || null,
        website: pForm.website || null,
        notes: pForm.notes || null,
      })
      .eq('id', provider.id)
      .select()
      .single()
    setSaving(false)
    if (error) { toast.error('Error al guardar'); return }
    onUpdateProvider({ ...provider, ...data, rates })
    setEditingProvider(false)
    toast.success('Proveedor actualizado')
  }

  async function saveRate(f: typeof EMPTY_RATE) {
    setSaving(true)
    const supabase = createClient()
    const payload = {
      provider_id: provider.id,
      project_id: addingRate === 'project' ? projectId : null,
      label: f.label.trim(),
      rate_value: f.rate_value !== '' ? parseFloat(f.rate_value) : null,
      rate_timing: f.rate_timing || null,
      rate_variables: f.rate_variables || null,
      effective_date: f.effective_date || null,
      notes: f.notes || null,
    }
    const { data, error } = await supabase.from('provider_rates').insert(payload).select().single()
    setSaving(false)
    if (error) { toast.error('Error al guardar tarifa'); return }
    setRates(prev => [...prev, data as ProviderRate])
    setAddingRate(null)
    toast.success('Tarifa agregada')
  }

  async function updateRate(f: typeof EMPTY_RATE) {
    if (!editingRate) return
    setSaving(true)
    const supabase = createClient()
    const { data, error } = await supabase
      .from('provider_rates')
      .update({
        label: f.label.trim(),
        rate_value: f.rate_value !== '' ? parseFloat(f.rate_value) : null,
        rate_timing: f.rate_timing || null,
        rate_variables: f.rate_variables || null,
        effective_date: f.effective_date || null,
        notes: f.notes || null,
      })
      .eq('id', editingRate.id)
      .select()
      .single()
    setSaving(false)
    if (error) { toast.error('Error al actualizar tarifa'); return }
    setRates(prev => prev.map(r => r.id === editingRate.id ? data as ProviderRate : r))
    setEditingRate(null)
    toast.success('Tarifa actualizada')
  }

  async function deleteRate(rateId: string) {
    if (!confirm('¿Eliminar esta tarifa?')) return
    const supabase = createClient()
    const { error } = await supabase.from('provider_rates').delete().eq('id', rateId)
    if (error) { toast.error('Error al eliminar tarifa'); return }
    setRates(prev => prev.filter(r => r.id !== rateId))
    toast.success('Tarifa eliminada')
  }

  async function copyRateToProject(rate: ProviderRate) {
    setSaving(true)
    const supabase = createClient()
    const { data, error } = await supabase.from('provider_rates').insert({
      provider_id: provider.id,
      project_id: projectId,
      label: rate.label,
      rate_value: rate.rate_value,
      rate_timing: rate.rate_timing,
      rate_variables: rate.rate_variables,
      effective_date: rate.effective_date,
      notes: rate.notes,
    }).select().single()
    setSaving(false)
    if (error) { toast.error('Error al copiar tarifa'); return }
    setRates(prev => [...prev, data as ProviderRate])
    toast.success('Tarifa copiada al proyecto — podés editarla para ajustar el valor')
  }

  const globalRates = rates.filter(r => r.project_id === null)
  const projectRates = rates.filter(r => r.project_id === projectId)

  return (
    <div className={`bg-[#1a1a1a] border rounded-xl transition-colors ${isLinked ? 'border-orange-500/30' : 'border-[#242424]'}`}>
      {/* Card header */}
      <div className="p-4">
        <div className="flex items-start justify-between mb-3">
          <div className="flex items-center gap-2">
            <div className={`h-9 w-9 rounded-lg flex items-center justify-center ${isLinked ? 'bg-orange-500/15 border border-orange-500/20' : 'bg-[#2a2a2a]'}`}>
              <Building2 className={`h-4.5 w-4.5 ${isLinked ? 'text-orange-400' : 'text-[#888]'}`} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-semibold text-[#ededed] text-sm">{provider.name}</h3>
                {provider.code && (
                  <span className="font-mono text-[10px] font-bold px-1.5 py-0.5 rounded bg-orange-500/15 text-orange-400 border border-orange-500/20 tracking-wider">
                    {provider.code}
                  </span>
                )}
              </div>
              {provider.contact_name && <p className="text-xs text-[#888]">{provider.contact_name}</p>}
            </div>
          </div>
          <div className="flex items-center gap-1">
            <button
              onClick={() => onToggleLink(provider.id, !isLinked)}
              title={isLinked ? 'Quitar del proyecto' : 'Agregar al proyecto'}
              className={`flex items-center gap-1 px-2 py-1 rounded text-xs transition-colors ${
                isLinked
                  ? 'text-orange-400 hover:text-orange-300 hover:bg-orange-500/10'
                  : 'text-[#555] hover:text-[#aaa] hover:bg-[#2a2a2a]'
              }`}
            >
              {isLinked ? <Unlink className="h-3 w-3" /> : <Link2 className="h-3 w-3" />}
              {isLinked ? 'Quitar' : 'Vincular'}
            </button>
            <Button variant="ghost" size="icon" onClick={() => setEditingProvider(true)}>
              <Edit className="h-3.5 w-3.5 text-[#555]" />
            </Button>
            <Button variant="ghost" size="icon" onClick={() => onDeleteProvider(provider.id)} className="hover:text-red-400">
              <Trash2 className="h-3.5 w-3.5 text-[#555]" />
            </Button>
          </div>
        </div>

        {/* Contact info */}
        <div className="space-y-1">
          {provider.email && (
            <a href={`mailto:${provider.email}`} className="flex items-center gap-1.5 text-xs text-[#666] hover:text-[#ccc] transition-colors">
              <Mail className="h-3 w-3" />{provider.email}
            </a>
          )}
          {provider.phone && (
            <div className="flex items-center gap-1.5 text-xs text-[#666]">
              <Phone className="h-3 w-3" />{provider.phone}
            </div>
          )}
          {provider.website && (
            <a href={provider.website} target="_blank" rel="noopener noreferrer"
              className="flex items-center gap-1.5 text-xs text-orange-400 hover:text-orange-300 transition-colors"
            >
              <Globe className="h-3 w-3" />
              {provider.website.replace(/^https?:\/\/(www\.)?/, '')}
            </a>
          )}
        </div>
        {provider.notes && <p className="text-xs text-[#555] mt-2 pt-2 border-t border-[#222] line-clamp-2">{provider.notes}</p>}

        {/* Rates summary + expand toggle */}
        <button
          onClick={() => setExpanded(p => !p)}
          className="mt-3 pt-3 border-t border-[#1f1f1f] w-full flex items-center justify-between text-xs text-[#555] hover:text-[#888] transition-colors"
        >
          <span className="flex items-center gap-1.5">
            <DollarSign className="h-3 w-3" />
            {rates.length} tarifa{rates.length !== 1 ? 's' : ''}
          </span>
          {expanded ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
        </button>
      </div>

      {/* Rates panel */}
      {expanded && (
        <div className="px-4 pb-4 border-t border-[#1f1f1f] pt-3 space-y-4">
          {/* Global rates */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-[10px] uppercase tracking-widest text-[#555] font-medium">Tarifas globales</span>
              <button
                onClick={() => { setAddingRate('global'); setEditingRate(null) }}
                className="text-[10px] text-[#555] hover:text-orange-400 flex items-center gap-0.5 transition-colors"
              >
                <Plus className="h-3 w-3" /> Agregar
              </button>
            </div>
            {globalRates.length === 0 && addingRate !== 'global' && (
              <p className="text-xs text-[#444] italic">Sin tarifas globales</p>
            )}
            {globalRates.map(r => (
              <RateRow
                key={r.id} rate={r}
                onEdit={() => { setEditingRate(r); setAddingRate(null) }}
                onDelete={() => deleteRate(r.id)}
                onCopyToProject={() => copyRateToProject(r)}
              />
            ))}
            {addingRate === 'global' && (
              <RateForm onSave={saveRate} onCancel={() => setAddingRate(null)} saving={saving} />
            )}
            {editingRate && editingRate.project_id === null && (
              <RateForm
                initial={{ label: editingRate.label, rate_value: editingRate.rate_value != null ? String(editingRate.rate_value) : '', rate_timing: editingRate.rate_timing ?? '', rate_variables: editingRate.rate_variables ?? '', effective_date: editingRate.effective_date ?? '', notes: editingRate.notes ?? '' }}
                onSave={updateRate} onCancel={() => setEditingRate(null)} saving={saving}
              />
            )}
          </div>

          {/* Project-specific rates */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-[10px] uppercase tracking-widest text-orange-500/70 font-medium">Tarifas de este proyecto</span>
              <button
                onClick={() => { setAddingRate('project'); setEditingRate(null) }}
                className="text-[10px] text-[#555] hover:text-orange-400 flex items-center gap-0.5 transition-colors"
              >
                <Plus className="h-3 w-3" /> Agregar
              </button>
            </div>
            {projectRates.length === 0 && addingRate !== 'project' && (
              <p className="text-xs text-[#444] italic">Sin tarifas específicas para este proyecto</p>
            )}
            {projectRates.map(r => (
              <RateRow key={r.id} rate={r} onEdit={() => { setEditingRate(r); setAddingRate(null) }} onDelete={() => deleteRate(r.id)} accent />
            ))}
            {addingRate === 'project' && (
              <RateForm onSave={saveRate} onCancel={() => setAddingRate(null)} saving={saving} />
            )}
            {editingRate && editingRate.project_id !== null && (
              <RateForm
                initial={{ label: editingRate.label, rate_value: editingRate.rate_value != null ? String(editingRate.rate_value) : '', rate_timing: editingRate.rate_timing ?? '', rate_variables: editingRate.rate_variables ?? '', effective_date: editingRate.effective_date ?? '', notes: editingRate.notes ?? '' }}
                onSave={updateRate} onCancel={() => setEditingRate(null)} saving={saving}
              />
            )}
          </div>
        </div>
      )}

      {/* Edit provider dialog */}
      <Dialog open={editingProvider} onClose={() => setEditingProvider(false)} title="Editar proveedor" size="md">
        <form onSubmit={saveProvider} className="p-6 space-y-4">
          <div className="grid grid-cols-3 gap-3">
            <div className="col-span-2">
              <Input label="Nombre *" id="ep-name" value={pForm.name} onChange={e => setPForm(p => ({ ...p, name: e.target.value }))} required />
            </div>
            <div>
              <Input
                label="Código (3 letras)"
                id="ep-code"
                value={pForm.code}
                onChange={e => setPForm(p => ({ ...p, code: e.target.value.toUpperCase().slice(0, 3) }))}
                placeholder="GET"
                maxLength={3}
              />
            </div>
          </div>
          <Input label="Contacto" id="ep-contact" value={pForm.contact_name} onChange={e => setPForm(p => ({ ...p, contact_name: e.target.value }))} />
          <div className="grid grid-cols-2 gap-3">
            <Input label="Email" id="ep-email" type="email" value={pForm.email} onChange={e => setPForm(p => ({ ...p, email: e.target.value }))} />
            <Input label="Teléfono" id="ep-phone" value={pForm.phone} onChange={e => setPForm(p => ({ ...p, phone: e.target.value }))} />
          </div>
          <Input label="Sitio web" id="ep-web" type="url" value={pForm.website} onChange={e => setPForm(p => ({ ...p, website: e.target.value }))} />
          <Textarea label="Notas" id="ep-notes" value={pForm.notes} onChange={e => setPForm(p => ({ ...p, notes: e.target.value }))} rows={3} />
          <div className="flex gap-2 pt-2 border-t border-[#2a2a2a]">
            <Button type="submit" variant="primary" loading={saving}>Guardar</Button>
            <Button type="button" variant="ghost" onClick={() => setEditingProvider(false)}>Cancelar</Button>
          </div>
        </form>
      </Dialog>
    </div>
  )
}

function RateRow({ rate, onEdit, onDelete, onCopyToProject, accent }: {
  rate: ProviderRate
  onEdit: () => void
  onDelete: () => void
  onCopyToProject?: () => void
  accent?: boolean
}) {
  return (
    <div className={`flex items-start justify-between py-2 px-2 rounded-lg group hover:bg-[#1f1f1f] transition-colors ${accent ? 'border-l-2 border-orange-500/40 pl-3' : ''}`}>
      <div className="flex-1 min-w-0">
        <p className="text-xs font-medium text-[#ccc]">{rate.label || '—'}</p>
        <div className="flex items-center gap-2 mt-0.5 flex-wrap">
          {rate.rate_value != null && (
            <span className="text-xs text-orange-400 font-medium">
              USD {rate.rate_value.toLocaleString('en-US', { minimumFractionDigits: 2 })}
              {rate.rate_timing ? ` / ${rate.rate_timing}` : ''}
            </span>
          )}
          {rate.rate_variables && <span className="text-xs text-[#666]">{rate.rate_variables}</span>}
          {rate.effective_date && (
            <span className="flex items-center gap-0.5 text-[10px] text-[#555]">
              <Calendar className="h-2.5 w-2.5" />
              desde {rate.effective_date}
            </span>
          )}
        </div>
        {rate.notes && <p className="text-[10px] text-[#555] mt-0.5">{rate.notes}</p>}
      </div>
      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
        {onCopyToProject && (
          <button
            onClick={onCopyToProject}
            title="Copiar al proyecto actual"
            className="p-1 text-[#555] hover:text-orange-400 transition-colors"
          >
            <Copy className="h-3 w-3" />
          </button>
        )}
        <button onClick={onEdit} className="p-1 text-[#555] hover:text-[#aaa] transition-colors">
          <Edit className="h-3 w-3" />
        </button>
        <button onClick={onDelete} className="p-1 text-[#555] hover:text-red-400 transition-colors">
          <Trash2 className="h-3 w-3" />
        </button>
      </div>
    </div>
  )
}

export function ProvidersClient({ projectId, initialProviders, initialLinkedIds, userEmail }: Props) {
  const [providers, setProviders] = useState<Provider[]>(initialProviders)
  const [linkedIds, setLinkedIds] = useState<Set<string>>(new Set(initialLinkedIds))
  const [showForm, setShowForm] = useState(false)
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState(EMPTY_PROVIDER)
  const [filter, setFilter] = useState<'linked' | 'all'>('linked')

  const set = (k: string, v: string) => setForm(p => ({ ...p, [k]: v }))

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault()
    if (!form.name.trim()) return
    setSaving(true)
    const supabase = createClient()
    const { data, error } = await supabase
      .from('providers')
      .insert({
        name: form.name.trim(),
        code: form.code.trim().toUpperCase().slice(0, 3) || null,
        contact_name: form.contact_name || null,
        email: form.email || null,
        phone: form.phone || null,
        website: form.website || null,
        notes: form.notes || null,
      })
      .select()
      .single()
    if (error) { toast.error('Error al crear proveedor'); setSaving(false); return }

    // Auto-link to this project
    await supabase.from('project_providers').insert({ project_id: projectId, provider_id: data.id })

    const newProvider: Provider = { ...data, rates: [] }
    setProviders(prev => [newProvider, ...prev])
    setLinkedIds(prev => new Set([...prev, data.id]))
    setForm(EMPTY_PROVIDER)
    setShowForm(false)
    setSaving(false)
    toast.success('Proveedor creado y vinculado al proyecto')
  }

  async function handleToggleLink(providerId: string, link: boolean) {
    const supabase = createClient()
    if (link) {
      const { error } = await supabase.from('project_providers').insert({ project_id: projectId, provider_id: providerId })
      if (error) { toast.error('Error al vincular'); return }
      setLinkedIds(prev => new Set([...prev, providerId]))
      toast.success('Proveedor vinculado al proyecto')
    } else {
      const { error } = await supabase.from('project_providers').delete().eq('project_id', projectId).eq('provider_id', providerId)
      if (error) { toast.error('Error al desvincular'); return }
      setLinkedIds(prev => { const s = new Set(prev); s.delete(providerId); return s })
      toast.success('Proveedor desvinculado')
    }
  }

  async function handleDelete(id: string) {
    if (!confirm('¿Eliminar este proveedor del catálogo global? Se perderán todas sus tarifas.')) return
    const supabase = createClient()
    const { error } = await supabase.from('providers').delete().eq('id', id)
    if (error) { toast.error('Error al eliminar'); return }
    setProviders(prev => prev.filter(p => p.id !== id))
    setLinkedIds(prev => { const s = new Set(prev); s.delete(id); return s })
    toast.success('Proveedor eliminado')
  }

  const displayed = filter === 'linked'
    ? providers.filter(p => linkedIds.has(p.id))
    : providers

  const linkedCount = linkedIds.size

  return (
    <div className="flex flex-col h-full">
      <Header
        title="Proveedores"
        description={`${linkedCount} vinculado${linkedCount !== 1 ? 's' : ''} · ${providers.length} en catálogo global`}
        email={userEmail}
        actions={
          <Button variant="primary" size="sm" onClick={() => setShowForm(true)}>
            <Plus className="h-3.5 w-3.5" />
            Nuevo proveedor
          </Button>
        }
      />

      <div className="flex-1 overflow-y-auto p-6">
        {/* Filter tabs */}
        <div className="flex items-center gap-1 mb-5 bg-[#1a1a1a] border border-[#242424] rounded-lg p-1 w-fit">
          <button
            onClick={() => setFilter('linked')}
            className={`px-3 py-1.5 rounded text-xs font-medium transition-colors ${filter === 'linked' ? 'bg-orange-500/20 text-orange-400' : 'text-[#666] hover:text-[#aaa]'}`}
          >
            <Film className="h-3 w-3 inline mr-1" />
            Este proyecto ({linkedCount})
          </button>
          <button
            onClick={() => setFilter('all')}
            className={`px-3 py-1.5 rounded text-xs font-medium transition-colors ${filter === 'all' ? 'bg-orange-500/20 text-orange-400' : 'text-[#666] hover:text-[#aaa]'}`}
          >
            <Building2 className="h-3 w-3 inline mr-1" />
            Catálogo global ({providers.length})
          </button>
        </div>

        {displayed.length === 0 ? (
          <div className="text-center py-16">
            <Building2 className="h-12 w-12 text-[#333] mx-auto mb-4" />
            <p className="text-sm text-[#666] mb-4">
              {filter === 'linked' ? 'No hay proveedores vinculados a este proyecto' : 'Sin proveedores en el catálogo'}
            </p>
            <Button variant="primary" size="sm" onClick={() => setShowForm(true)}>
              <Plus className="h-3.5 w-3.5" />
              {filter === 'linked' ? 'Agregar proveedor' : 'Crear primer proveedor'}
            </Button>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 max-w-6xl">
            {displayed.map(p => (
              <ProviderCard
                key={p.id}
                provider={p}
                projectId={projectId}
                isLinked={linkedIds.has(p.id)}
                onToggleLink={handleToggleLink}
                onUpdateProvider={updated => setProviders(prev => prev.map(x => x.id === updated.id ? updated : x))}
                onDeleteProvider={handleDelete}
              />
            ))}
          </div>
        )}
      </div>

      {/* New provider dialog */}
      <Dialog open={showForm} onClose={() => setShowForm(false)} title="Nuevo proveedor" size="md">
        <form onSubmit={handleCreate} className="p-6 space-y-4">
          <div className="grid grid-cols-3 gap-3">
            <div className="col-span-2">
              <Input label="Nombre *" id="p-name" value={form.name} onChange={e => set('name', e.target.value)} placeholder="Ej: Getty Images" required />
            </div>
            <div>
              <Input
                label="Código (3 letras)"
                id="p-code"
                value={form.code}
                onChange={e => set('code', e.target.value.toUpperCase().slice(0, 3))}
                placeholder="GET"
                maxLength={3}
              />
            </div>
          </div>
          <Input label="Contacto" id="p-contact" value={form.contact_name} onChange={e => set('contact_name', e.target.value)} placeholder="Nombre del contacto" />
          <div className="grid grid-cols-2 gap-3">
            <Input label="Email" id="p-email" type="email" value={form.email} onChange={e => set('email', e.target.value)} placeholder="mail@ejemplo.com" />
            <Input label="Teléfono" id="p-phone" value={form.phone} onChange={e => set('phone', e.target.value)} placeholder="+54 11 ..." />
          </div>
          <Input label="Sitio web" id="p-web" type="url" value={form.website} onChange={e => set('website', e.target.value)} placeholder="https://..." />
          <Textarea label="Notas" id="p-notes" value={form.notes} onChange={e => set('notes', e.target.value)} rows={3} placeholder="Condiciones, notas de contacto..." />
          <p className="text-xs text-[#555]">El proveedor se agregará al catálogo global y se vinculará automáticamente a este proyecto.</p>
          <div className="flex gap-2 pt-2 border-t border-[#2a2a2a]">
            <Button type="submit" variant="primary" loading={saving}>Crear proveedor</Button>
            <Button type="button" variant="ghost" onClick={() => setShowForm(false)}>Cancelar</Button>
          </div>
        </form>
      </Dialog>
    </div>
  )
}
