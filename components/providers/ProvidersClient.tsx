'use client'
import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Header } from '@/components/layout/Header'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Dialog } from '@/components/ui/dialog'
import { toast } from 'sonner'
import { Plus, Building2, Mail, Phone, Globe, Film, Edit, Trash2, ExternalLink } from 'lucide-react'
import type { Provider } from '@/types/database'

interface Props {
  projectId: string
  initialProviders: Provider[]
  materialCounts: Record<string, number>
  userEmail: string
}

const EMPTY_FORM = {
  name: '', contact_name: '', email: '', phone: '', website: '', notes: ''
}

export function ProvidersClient({ projectId, initialProviders, materialCounts, userEmail }: Props) {
  const [providers, setProviders] = useState(initialProviders)
  const [counts, setCounts] = useState(materialCounts)
  const [showForm, setShowForm] = useState(false)
  const [editing, setEditing] = useState<Provider | null>(null)
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState(EMPTY_FORM)

  function set(key: string, value: string) {
    setForm(prev => ({ ...prev, [key]: value }))
  }

  function openNew() {
    setEditing(null)
    setForm(EMPTY_FORM)
    setShowForm(true)
  }

  function openEdit(p: Provider) {
    setEditing(p)
    setForm({ name: p.name, contact_name: p.contact_name ?? '', email: p.email ?? '', phone: p.phone ?? '', website: p.website ?? '', notes: p.notes ?? '' })
    setShowForm(true)
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault()
    if (!form.name.trim()) return
    setSaving(true)
    const supabase = createClient()
    const payload = {
      name: form.name.trim(),
      contact_name: form.contact_name || null,
      email: form.email || null,
      phone: form.phone || null,
      website: form.website || null,
      notes: form.notes || null,
    }

    if (editing) {
      const { data, error } = await supabase.from('providers').update(payload).eq('id', editing.id).select().single()
      if (error) { toast.error('Error al guardar'); setSaving(false); return }
      setProviders(prev => prev.map(p => p.id === editing.id ? data : p))
      toast.success('Proveedor actualizado')
    } else {
      const { data, error } = await supabase.from('providers').insert({ ...payload, project_id: projectId }).select().single()
      if (error) { toast.error('Error al crear proveedor'); setSaving(false); return }
      setProviders(prev => [...prev, data])
      toast.success('Proveedor creado')
    }

    setShowForm(false)
    setSaving(false)
  }

  async function handleDelete(id: string) {
    if (!confirm('¿Eliminar este proveedor? Los materiales asociados quedarán sin proveedor.')) return
    const supabase = createClient()
    const { error } = await supabase.from('providers').delete().eq('id', id)
    if (error) { toast.error('Error al eliminar'); return }
    setProviders(prev => prev.filter(p => p.id !== id))
    toast.success('Proveedor eliminado')
  }

  return (
    <div className="flex flex-col h-full">
      <Header
        title="Proveedores"
        description={`${providers.length} proveedor${providers.length !== 1 ? 'es' : ''} registrado${providers.length !== 1 ? 's' : ''}`}
        email={userEmail}
        actions={
          <Button variant="primary" size="sm" onClick={openNew}>
            <Plus className="h-3.5 w-3.5" />
            Nuevo proveedor
          </Button>
        }
      />

      <div className="flex-1 overflow-y-auto p-6">
        {providers.length === 0 ? (
          <div className="text-center py-16">
            <Building2 className="h-12 w-12 text-[#333] mx-auto mb-4" />
            <p className="text-sm text-[#666] mb-4">Sin proveedores registrados</p>
            <Button variant="primary" size="sm" onClick={openNew}>
              <Plus className="h-3.5 w-3.5" />
              Agregar proveedor
            </Button>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 max-w-5xl">
            {providers.map(p => (
              <div key={p.id} className="bg-[#1a1a1a] border border-[#242424] rounded-xl p-4 hover:border-[#333] transition-colors">
                <div className="flex items-start justify-between mb-3">
                  <div className="h-9 w-9 rounded-lg bg-[#2a2a2a] flex items-center justify-center">
                    <Building2 className="h-4.5 w-4.5 text-[#888]" />
                  </div>
                  <div className="flex items-center gap-1">
                    <Button variant="ghost" size="icon" onClick={() => openEdit(p)}>
                      <Edit className="h-3.5 w-3.5 text-[#555]" />
                    </Button>
                    <Button variant="ghost" size="icon" onClick={() => handleDelete(p.id)} className="hover:text-red-400">
                      <Trash2 className="h-3.5 w-3.5 text-[#555]" />
                    </Button>
                  </div>
                </div>

                <h3 className="font-semibold text-[#ededed] text-sm mb-1">{p.name}</h3>
                {p.contact_name && <p className="text-xs text-[#888] mb-2">{p.contact_name}</p>}

                <div className="space-y-1.5 mt-2">
                  {p.email && (
                    <a href={`mailto:${p.email}`} className="flex items-center gap-1.5 text-xs text-[#666] hover:text-[#ccc] transition-colors">
                      <Mail className="h-3 w-3" />{p.email}
                    </a>
                  )}
                  {p.phone && (
                    <div className="flex items-center gap-1.5 text-xs text-[#666]">
                      <Phone className="h-3 w-3" />{p.phone}
                    </div>
                  )}
                  {p.website && (
                    <a href={p.website} target="_blank" rel="noopener noreferrer"
                      className="flex items-center gap-1.5 text-xs text-orange-400 hover:text-orange-300 transition-colors"
                    >
                      <Globe className="h-3 w-3" />
                      {p.website.replace(/^https?:\/\/(www\.)?/, '')}
                    </a>
                  )}
                </div>

                {p.notes && <p className="text-xs text-[#555] mt-2 pt-2 border-t border-[#222] line-clamp-2">{p.notes}</p>}

                <div className="flex items-center gap-1.5 mt-3 pt-3 border-t border-[#1f1f1f]">
                  <Film className="h-3 w-3 text-[#555]" />
                  <span className="text-xs text-[#555]">{counts[p.id] ?? 0} material{(counts[p.id] ?? 0) !== 1 ? 'es' : ''}</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <Dialog open={showForm} onClose={() => setShowForm(false)} title={editing ? 'Editar proveedor' : 'Nuevo proveedor'} size="md">
        <form onSubmit={handleSave} className="p-6 space-y-4">
          <Input label="Nombre *" id="p-name" value={form.name} onChange={e => set('name', e.target.value)} placeholder="Ej: Getty Images" required />
          <Input label="Contacto" id="p-contact" value={form.contact_name} onChange={e => set('contact_name', e.target.value)} placeholder="Nombre del contacto" />
          <div className="grid grid-cols-2 gap-3">
            <Input label="Email" id="p-email" type="email" value={form.email} onChange={e => set('email', e.target.value)} placeholder="mail@ejemplo.com" />
            <Input label="Teléfono" id="p-phone" value={form.phone} onChange={e => set('phone', e.target.value)} placeholder="+54 11 ..." />
          </div>
          <Input label="Sitio web" id="p-web" type="url" value={form.website} onChange={e => set('website', e.target.value)} placeholder="https://..." />
          <Textarea label="Notas" id="p-notes" value={form.notes} onChange={e => set('notes', e.target.value)} rows={3} placeholder="Condiciones, notas de contacto..." />
          <div className="flex gap-2 pt-2 border-t border-[#2a2a2a]">
            <Button type="submit" variant="primary" loading={saving}>Guardar</Button>
            <Button type="button" variant="ghost" onClick={() => setShowForm(false)}>Cancelar</Button>
          </div>
        </form>
      </Dialog>
    </div>
  )
}
