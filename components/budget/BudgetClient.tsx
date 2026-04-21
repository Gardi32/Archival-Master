'use client'
import { useState, useMemo } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Header } from '@/components/layout/Header'
import { Button } from '@/components/ui/button'
import { toast } from 'sonner'
import { Calculator, ChevronDown, ChevronRight, DollarSign, Building2, AlertTriangle } from 'lucide-react'
import { formatCost, COST_UNIT_LABELS } from '@/lib/utils'
import type { Budget, EdlImport } from '@/types/database'

interface Props {
  projectId: string
  edlImports: (EdlImport & { clips: { id: string; clip_name: string; duration_sec: number; material_id: string | null; material: { id: string; title: string; code: string | null; cost_amount: number | null; cost_currency: string; cost_unit: string; provider_id: string | null; provider: { id: string; name: string } | null } | null }[] })[]
  initialBudgets: Budget[]
  userEmail: string
}

interface LineItem {
  materialId: string
  title: string
  code: string | null
  providerName: string
  providerId: string | null
  durationSec: number
  costAmount: number | null
  costCurrency: string
  costUnit: string
  total: number
}

function calcTotal(item: LineItem): number {
  if (!item.costAmount) return 0
  if (item.costUnit === 'per_sec') return item.costAmount * item.durationSec
  if (item.costUnit === 'per_min') return item.costAmount * (item.durationSec / 60)
  return item.costAmount
}

export function BudgetClient({ projectId, edlImports, initialBudgets, userEmail }: Props) {
  const [budgets, setBudgets] = useState(initialBudgets)
  const [selectedEdlId, setSelectedEdlId] = useState(edlImports[0]?.id ?? '')
  const [saving, setSaving] = useState(false)
  const [expanded, setExpanded] = useState<string | null>(null)

  const selectedEdl = edlImports.find(e => e.id === selectedEdlId)

  const lineItems = useMemo<LineItem[]>(() => {
    if (!selectedEdl) return []
    const map = new Map<string, LineItem>()

    for (const clip of selectedEdl.clips) {
      const m = clip.material
      if (!m) continue
      const key = m.id

      if (map.has(key)) {
        const existing = map.get(key)!
        existing.durationSec += clip.duration_sec
        existing.total = calcTotal({ ...existing, durationSec: existing.durationSec })
      } else {
        const item: LineItem = {
          materialId: m.id,
          title: m.title,
          code: m.code,
          providerName: m.provider?.name ?? 'Sin proveedor',
          providerId: m.provider?.id ?? null,
          durationSec: clip.duration_sec,
          costAmount: m.cost_amount,
          costCurrency: m.cost_currency,
          costUnit: m.cost_unit,
          total: 0,
        }
        item.total = calcTotal(item)
        map.set(key, item)
      }
    }
    return Array.from(map.values()).sort((a, b) => a.providerName.localeCompare(b.providerName))
  }, [selectedEdl])

  const unmatched = selectedEdl?.clips.filter(c => !c.material_id).length ?? 0

  const byProvider = useMemo(() => {
    const map = new Map<string, { name: string; items: LineItem[]; total: number }>()
    for (const item of lineItems) {
      const key = item.providerId ?? 'sin-proveedor'
      if (!map.has(key)) map.set(key, { name: item.providerName, items: [], total: 0 })
      const g = map.get(key)!
      g.items.push(item)
      g.total += item.total
    }
    return Array.from(map.values())
  }, [lineItems])

  const grandTotal = lineItems.reduce((s, i) => s + i.total, 0)
  const mainCurrency = lineItems[0]?.costCurrency ?? 'USD'

  async function handleSaveBudget() {
    if (!selectedEdl) return
    setSaving(true)
    const supabase = createClient()

    const { data: budget, error } = await supabase
      .from('budgets')
      .insert({
        project_id: projectId,
        edl_import_id: selectedEdl.id,
        name: `Presupuesto ${selectedEdl.name}`,
        total_amount: grandTotal,
        currency: mainCurrency,
        status: 'draft',
      })
      .select()
      .single()

    if (error || !budget) { toast.error('Error al guardar'); setSaving(false); return }

    await supabase.from('budget_items').insert(
      lineItems.map(item => ({
        budget_id: budget.id,
        material_id: item.materialId,
        duration_sec: item.durationSec,
        unit_cost: item.costAmount ?? 0,
        total: item.total,
      }))
    )

    const { data: full } = await supabase
      .from('budgets')
      .select('*, items:budget_items(*, material:materials(id, title, code, provider:providers(name)))')
      .eq('id', budget.id)
      .single()

    setBudgets(prev => [full, ...prev])
    toast.success('Presupuesto guardado')
    setSaving(false)
  }

  return (
    <div className="flex flex-col h-full">
      <Header title="Presupuesto" description="Calculá costos automáticamente desde el EDL" email={userEmail} />

      <div className="flex-1 overflow-y-auto p-6 space-y-6 max-w-5xl">
        {/* EDL selector */}
        {edlImports.length === 0 ? (
          <div className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-xl p-8 text-center">
            <Calculator className="h-10 w-10 text-[#333] mx-auto mb-3" />
            <p className="text-sm text-[#666]">Primero importá un EDL para calcular el presupuesto.</p>
          </div>
        ) : (
          <>
            <div className="flex items-center gap-4">
              <div className="flex-1">
                <label className="text-xs text-[#666] uppercase tracking-wider block mb-1.5">EDL a presupuestar</label>
                <select
                  value={selectedEdlId}
                  onChange={e => setSelectedEdlId(e.target.value)}
                  className="h-9 px-3 rounded-lg border border-[#2a2a2a] bg-[#161616] text-sm text-[#ededed] focus:outline-none focus:border-orange-500 w-full max-w-md"
                >
                  {edlImports.map(e => (
                    <option key={e.id} value={e.id}>{e.name} ({new Date(e.imported_at).toLocaleDateString('es-AR')})</option>
                  ))}
                </select>
              </div>
              <div className="pt-5">
                <Button variant="primary" onClick={handleSaveBudget} loading={saving} disabled={lineItems.length === 0}>
                  Guardar presupuesto
                </Button>
              </div>
            </div>

            {unmatched > 0 && (
              <div className="flex items-center gap-2 text-xs text-yellow-400 bg-yellow-900/20 border border-yellow-900/40 rounded-lg px-4 py-2.5">
                <AlertTriangle className="h-3.5 w-3.5 shrink-0" />
                {unmatched} clip{unmatched !== 1 ? 's' : ''} sin material asignado — no se incluye{unmatched !== 1 ? 'n' : ''} en el presupuesto.
              </div>
            )}

            {/* Summary */}
            <div className="grid grid-cols-3 gap-3">
              <StatCard label="Total materiales" value={lineItems.length.toString()} icon={<Calculator className="h-4 w-4" />} />
              <StatCard label="Proveedores" value={byProvider.length.toString()} icon={<Building2 className="h-4 w-4" />} />
              <StatCard label="Total estimado" value={formatCost(grandTotal, mainCurrency)} icon={<DollarSign className="h-4 w-4" />} accent />
            </div>

            {/* By provider */}
            {byProvider.length > 0 && (
              <div className="space-y-3">
                <h3 className="text-xs font-semibold text-[#666] uppercase tracking-wider">Desglose por proveedor</h3>
                {byProvider.map(group => (
                  <div key={group.name} className="bg-[#1a1a1a] border border-[#242424] rounded-xl overflow-hidden">
                    <button
                      className="w-full flex items-center justify-between px-5 py-4 hover:bg-[#1e1e1e] transition-colors"
                      onClick={() => setExpanded(expanded === group.name ? null : group.name)}
                    >
                      <div className="flex items-center gap-3">
                        <Building2 className="h-4 w-4 text-[#666]" />
                        <span className="text-sm font-medium text-[#ededed]">{group.name}</span>
                        <span className="text-xs text-[#555]">{group.items.length} material{group.items.length !== 1 ? 'es' : ''}</span>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className="text-sm font-semibold text-orange-400">{formatCost(group.total, mainCurrency)}</span>
                        {expanded === group.name ? <ChevronDown className="h-4 w-4 text-[#555]" /> : <ChevronRight className="h-4 w-4 text-[#555]" />}
                      </div>
                    </button>

                    {expanded === group.name && (
                      <div className="border-t border-[#242424]">
                        <div className="grid grid-cols-[1fr_80px_100px_100px_100px] gap-3 px-5 py-2 text-xs text-[#555] uppercase tracking-wider bg-[#161616]">
                          <div>Material</div>
                          <div>Duración</div>
                          <div>Tarifa</div>
                          <div>Unidad</div>
                          <div className="text-right">Total</div>
                        </div>
                        {group.items.map(item => (
                          <div key={item.materialId} className="grid grid-cols-[1fr_80px_100px_100px_100px] gap-3 px-5 py-3 border-t border-[#1a1a1a] items-center">
                            <div>
                              {item.code && <span className="text-xs font-mono text-[#666] mr-2">[{item.code}]</span>}
                              <span className="text-sm text-[#ccc]">{item.title}</span>
                            </div>
                            <div className="text-xs font-mono text-[#888]">{Math.round(item.durationSec)}s</div>
                            <div className="text-xs text-[#888]">{item.costAmount != null ? formatCost(item.costAmount, item.costCurrency) : <span className="text-yellow-500">Sin costo</span>}</div>
                            <div className="text-xs text-[#555]">{COST_UNIT_LABELS[item.costUnit]}</div>
                            <div className="text-right text-sm font-medium text-[#ededed]">{formatCost(item.total, mainCurrency)}</div>
                          </div>
                        ))}
                        <div className="flex justify-between items-center px-5 py-3 border-t border-[#2a2a2a] bg-[#161616]">
                          <span className="text-xs text-[#666]">Subtotal {group.name}</span>
                          <span className="text-sm font-bold text-orange-400">{formatCost(group.total, mainCurrency)}</span>
                        </div>
                      </div>
                    )}
                  </div>
                ))}

                <div className="flex justify-between items-center px-5 py-4 bg-orange-500/10 border border-orange-500/30 rounded-xl">
                  <span className="text-sm font-semibold text-[#ededed]">Total general</span>
                  <span className="text-lg font-bold text-orange-400">{formatCost(grandTotal, mainCurrency)}</span>
                </div>
              </div>
            )}
          </>
        )}

        {/* Saved budgets */}
        {budgets.length > 0 && (
          <div className="mt-8 space-y-3">
            <h3 className="text-xs font-semibold text-[#666] uppercase tracking-wider">Presupuestos guardados</h3>
            {budgets.map(b => (
              <div key={b.id} className="bg-[#1a1a1a] border border-[#242424] rounded-xl px-5 py-4 flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-[#ededed]">{b.name}</p>
                  <p className="text-xs text-[#555] mt-0.5">{new Date(b.created_at).toLocaleDateString('es-AR')} · {b.status}</p>
                </div>
                <span className="text-base font-bold text-orange-400">{formatCost(b.total_amount, b.currency)}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

function StatCard({ label, value, icon, accent }: { label: string; value: string; icon: React.ReactNode; accent?: boolean }) {
  return (
    <div className={`bg-[#1a1a1a] border rounded-xl px-4 py-4 flex items-center gap-3 ${accent ? 'border-orange-500/30' : 'border-[#242424]'}`}>
      <div className={`h-8 w-8 rounded-lg flex items-center justify-center ${accent ? 'bg-orange-500/20 text-orange-400' : 'bg-[#2a2a2a] text-[#666]'}`}>
        {icon}
      </div>
      <div>
        <p className="text-xs text-[#555]">{label}</p>
        <p className={`text-base font-bold ${accent ? 'text-orange-400' : 'text-[#ededed]'}`}>{value}</p>
      </div>
    </div>
  )
}
