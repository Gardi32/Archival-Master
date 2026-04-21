'use client'
import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Header } from '@/components/layout/Header'
import { Button } from '@/components/ui/button'
import { Dialog } from '@/components/ui/dialog'
import { toast } from 'sonner'
import { Plus, ShoppingCart, Building2, FileText, CheckCircle, Clock, Send, DollarSign, Trash2, Download } from 'lucide-react'
import { formatCost, ORDER_STATUS_LABELS } from '@/lib/utils'
import type { Order, Provider, Budget } from '@/types/database'

const STATUS_COLORS: Record<string, string> = {
  draft: 'bg-[#2a2a2a] text-[#888]',
  sent: 'bg-blue-900/30 text-blue-400',
  confirmed: 'bg-yellow-900/30 text-yellow-400',
  paid: 'bg-green-900/30 text-green-400',
}

const STATUS_ICON: Record<string, React.ReactNode> = {
  draft: <Clock className="h-3 w-3" />,
  sent: <Send className="h-3 w-3" />,
  confirmed: <CheckCircle className="h-3 w-3" />,
  paid: <DollarSign className="h-3 w-3" />,
}

interface Props {
  projectId: string
  initialOrders: Order[]
  providers: Pick<Provider, 'id' | 'name'>[]
  budgets: Pick<Budget, 'id' | 'name' | 'total_amount' | 'currency'>[]
  userEmail: string
}

export function OrdersClient({ projectId, initialOrders, providers, budgets, userEmail }: Props) {
  const [orders, setOrders] = useState(initialOrders)
  const [showNew, setShowNew] = useState(false)
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState({ provider_id: '', budget_id: '', notes: '' })

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault()
    if (!form.provider_id) return
    setSaving(true)
    const supabase = createClient()

    const { data, error } = await supabase
      .from('orders')
      .insert({
        project_id: projectId,
        provider_id: form.provider_id,
        budget_id: form.budget_id || null,
        notes: form.notes || null,
        status: 'draft',
      })
      .select(`
        *,
        provider:providers(id, name, email, contact_name),
        items:order_items(*, material:materials(id, title, code)),
        documents(id, type, filename)
      `)
      .single()

    if (error) { toast.error('Error al crear pedido'); setSaving(false); return }
    setOrders(prev => [data, ...prev])
    setShowNew(false)
    setForm({ provider_id: '', budget_id: '', notes: '' })
    toast.success('Pedido creado')
    setSaving(false)
  }

  async function handleStatusChange(id: string, status: Order['status']) {
    const supabase = createClient()
    const { error } = await supabase.from('orders').update({ status, sent_at: status === 'sent' ? new Date().toISOString() : undefined }).eq('id', id)
    if (error) { toast.error('Error'); return }
    setOrders(prev => prev.map(o => o.id === id ? { ...o, status } : o))
  }

  async function handleDelete(id: string) {
    if (!confirm('¿Eliminar este pedido?')) return
    const supabase = createClient()
    await supabase.from('orders').delete().eq('id', id)
    setOrders(prev => prev.filter(o => o.id !== id))
    toast.success('Pedido eliminado')
  }

  function handlePrint(order: Order) {
    const provider = order.provider as { name: string; email?: string; contact_name?: string } | null
    const items = order.items as { id: string; cost: number; duration_sec: number | null; material: { title: string; code: string | null } | null }[] | undefined
    const totalCost = items?.reduce((s, i) => s + i.cost, 0) ?? 0

    const html = `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="utf-8">
  <title>Pedido ${order.id.slice(0, 8).toUpperCase()}</title>
  <style>
    body { font-family: Arial, sans-serif; margin: 40px; color: #222; font-size: 14px; }
    h1 { font-size: 22px; margin-bottom: 4px; }
    .meta { color: #666; margin-bottom: 24px; font-size: 13px; }
    table { width: 100%; border-collapse: collapse; margin-top: 16px; }
    th { background: #f5f5f5; text-align: left; padding: 8px 12px; font-size: 12px; text-transform: uppercase; letter-spacing: 0.05em; }
    td { padding: 10px 12px; border-bottom: 1px solid #eee; }
    .total { font-weight: bold; font-size: 16px; }
    .notes { margin-top: 24px; padding: 12px; background: #f9f9f9; border-radius: 4px; font-size: 13px; color: #666; }
  </style>
</head>
<body>
  <h1>Pedido de Material de Archivo</h1>
  <div class="meta">
    <strong>Proveedor:</strong> ${provider?.name ?? '—'}<br/>
    ${provider?.contact_name ? `<strong>Contacto:</strong> ${provider.contact_name}<br/>` : ''}
    ${provider?.email ? `<strong>Email:</strong> ${provider.email}<br/>` : ''}
    <strong>Fecha:</strong> ${new Date().toLocaleDateString('es-AR')}<br/>
    <strong>Estado:</strong> ${ORDER_STATUS_LABELS[order.status]}
  </div>
  <table>
    <thead><tr><th>Material</th><th>Código</th><th>Duración (seg)</th><th>Costo</th></tr></thead>
    <tbody>
      ${(items ?? []).map(i => `<tr>
        <td>${i.material?.title ?? '—'}</td>
        <td>${i.material?.code ?? '—'}</td>
        <td>${i.duration_sec ?? '—'}</td>
        <td>$${i.cost.toFixed(2)}</td>
      </tr>`).join('')}
      <tr><td colspan="3" style="text-align:right;font-weight:bold">TOTAL</td><td class="total">$${totalCost.toFixed(2)}</td></tr>
    </tbody>
  </table>
  ${order.notes ? `<div class="notes"><strong>Notas:</strong> ${order.notes}</div>` : ''}
</body>
</html>`

    const w = window.open('', '_blank')
    if (!w) return
    w.document.write(html)
    w.document.close()
    w.print()
  }

  return (
    <div className="flex flex-col h-full">
      <Header
        title="Pedidos"
        description={`${orders.length} pedido${orders.length !== 1 ? 's' : ''}`}
        email={userEmail}
        actions={
          <Button variant="primary" size="sm" onClick={() => setShowNew(true)}>
            <Plus className="h-3.5 w-3.5" />
            Nuevo pedido
          </Button>
        }
      />

      <div className="flex-1 overflow-y-auto p-6">
        {orders.length === 0 ? (
          <div className="text-center py-16">
            <ShoppingCart className="h-12 w-12 text-[#333] mx-auto mb-4" />
            <p className="text-sm text-[#666] mb-4">Sin pedidos todavía. Creá uno desde el presupuesto calculado.</p>
            <Button variant="primary" size="sm" onClick={() => setShowNew(true)}>
              <Plus className="h-3.5 w-3.5" />
              Nuevo pedido
            </Button>
          </div>
        ) : (
          <div className="max-w-4xl space-y-3">
            {orders.map(order => {
              const provider = order.provider as { name: string; email?: string } | null
              const items = order.items as { id: string; cost: number }[] | undefined
              const docs = order.documents as { id: string; type: string }[] | undefined
              const hasContract = docs?.some(d => d.type === 'contract')
              const hasInvoice = docs?.some(d => d.type === 'invoice')
              const hasReceipt = docs?.some(d => d.type === 'receipt')
              const totalCost = items?.reduce((s, i) => s + i.cost, 0) ?? 0

              return (
                <div key={order.id} className="bg-[#1a1a1a] border border-[#242424] rounded-xl p-5">
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex items-center gap-3">
                      <div className="h-9 w-9 rounded-lg bg-[#2a2a2a] flex items-center justify-center">
                        <Building2 className="h-4.5 w-4.5 text-[#888]" />
                      </div>
                      <div>
                        <h3 className="text-sm font-semibold text-[#ededed]">{provider?.name ?? 'Sin proveedor'}</h3>
                        <p className="text-xs text-[#555]">{new Date(order.created_at).toLocaleDateString('es-AR')}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-medium ${STATUS_COLORS[order.status]}`}>
                        {STATUS_ICON[order.status]}
                        {ORDER_STATUS_LABELS[order.status]}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      {/* Doc checklist */}
                      <div className="flex items-center gap-2 text-xs">
                        <DocBadge label="Contrato" ok={hasContract} />
                        <DocBadge label="Factura" ok={hasInvoice} />
                        <DocBadge label="Recibo" ok={hasReceipt} />
                      </div>
                      {totalCost > 0 && (
                        <span className="text-sm font-semibold text-orange-400">{formatCost(totalCost)}</span>
                      )}
                    </div>

                    <div className="flex items-center gap-2">
                      {/* Status transitions */}
                      {order.status === 'draft' && (
                        <Button variant="outline" size="sm" onClick={() => handleStatusChange(order.id, 'sent')}>
                          <Send className="h-3.5 w-3.5" />
                          Marcar enviado
                        </Button>
                      )}
                      {order.status === 'sent' && (
                        <Button variant="outline" size="sm" onClick={() => handleStatusChange(order.id, 'confirmed')}>
                          <CheckCircle className="h-3.5 w-3.5" />
                          Confirmar
                        </Button>
                      )}
                      {order.status === 'confirmed' && (
                        <Button variant="outline" size="sm" onClick={() => handleStatusChange(order.id, 'paid')}>
                          <DollarSign className="h-3.5 w-3.5" />
                          Marcar pagado
                        </Button>
                      )}
                      <Button variant="ghost" size="sm" onClick={() => handlePrint(order)}>
                        <Download className="h-3.5 w-3.5" />
                        PDF
                      </Button>
                      <Button variant="ghost" size="icon" onClick={() => handleDelete(order.id)} className="hover:text-red-400">
                        <Trash2 className="h-3.5 w-3.5 text-[#555]" />
                      </Button>
                    </div>
                  </div>

                  {order.notes && <p className="mt-3 text-xs text-[#555] border-t border-[#1f1f1f] pt-3">{order.notes}</p>}
                </div>
              )
            })}
          </div>
        )}
      </div>

      <Dialog open={showNew} onClose={() => setShowNew(false)} title="Nuevo pedido" size="sm">
        <form onSubmit={handleCreate} className="p-6 space-y-4">
          <div className="space-y-1.5">
            <label className="text-xs text-[#888] uppercase tracking-wide">Proveedor *</label>
            <select
              value={form.provider_id}
              onChange={e => setForm(f => ({ ...f, provider_id: e.target.value }))}
              required
              className="w-full h-9 rounded-lg border border-[#2a2a2a] bg-[#111] px-3 text-sm text-[#ededed] focus:outline-none focus:border-orange-500"
            >
              <option value="">Seleccioná un proveedor</option>
              {providers.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
            </select>
          </div>

          {budgets.length > 0 && (
            <div className="space-y-1.5">
              <label className="text-xs text-[#888] uppercase tracking-wide">Presupuesto asociado</label>
              <select
                value={form.budget_id}
                onChange={e => setForm(f => ({ ...f, budget_id: e.target.value }))}
                className="w-full h-9 rounded-lg border border-[#2a2a2a] bg-[#111] px-3 text-sm text-[#ededed] focus:outline-none focus:border-orange-500"
              >
                <option value="">Sin vincular</option>
                {budgets.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
              </select>
            </div>
          )}

          <div className="space-y-1.5">
            <label className="text-xs text-[#888] uppercase tracking-wide">Notas</label>
            <textarea
              value={form.notes}
              onChange={e => setForm(f => ({ ...f, notes: e.target.value }))}
              rows={3}
              placeholder="Instrucciones especiales, plazos, etc."
              className="w-full rounded-lg border border-[#2a2a2a] bg-[#111] px-3 py-2 text-sm text-[#ededed] placeholder:text-[#444] focus:outline-none focus:border-orange-500 resize-none"
            />
          </div>

          <div className="flex gap-2 pt-2 border-t border-[#2a2a2a]">
            <Button type="submit" variant="primary" loading={saving}>Crear pedido</Button>
            <Button type="button" variant="ghost" onClick={() => setShowNew(false)}>Cancelar</Button>
          </div>
        </form>
      </Dialog>
    </div>
  )
}

function DocBadge({ label, ok }: { label: string; ok?: boolean }) {
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs ${ok ? 'bg-green-900/30 text-green-400' : 'bg-[#2a2a2a] text-[#555]'}`}>
      {ok ? <CheckCircle className="h-2.5 w-2.5" /> : <FileText className="h-2.5 w-2.5" />}
      {label}
    </span>
  )
}
