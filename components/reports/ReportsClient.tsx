'use client'
import { useState, useMemo } from 'react'
import { Header } from '@/components/layout/Header'
import { BarChart3, TrendingUp, Package, DollarSign, CheckCircle2, Clock, Search } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { Material, Provider } from '@/types/database'

const STATUS_LABELS: Record<string, string> = {
  searching: 'Buscando',
  screener_received: 'Screener recibido',
  approved: 'Aprobado',
  order_sent: 'Pedido enviado',
  purchased: 'Comprado',
}

const STATUS_COLORS: Record<string, string> = {
  searching: 'bg-[#333] text-[#888]',
  screener_received: 'bg-blue-900/30 text-blue-400',
  approved: 'bg-yellow-900/30 text-yellow-400',
  order_sent: 'bg-orange-900/30 text-orange-400',
  purchased: 'bg-green-900/30 text-green-400',
}

interface ProviderSummary {
  provider: Pick<Provider, 'id' | 'name' | 'code'> | null
  materials: Material[]
  totalCostUSD: number
  byStatus: Record<string, number>
}

interface Props {
  projectId: string
  materials: Material[]
  providers: Pick<Provider, 'id' | 'name' | 'code'>[]
  userEmail: string
}

export function ReportsClient({ materials, providers, userEmail }: Props) {
  const [search, setSearch] = useState('')

  // Group materials by provider
  const summaries = useMemo<ProviderSummary[]>(() => {
    const map = new Map<string | null, Material[]>()

    for (const m of materials) {
      const key = m.provider_id ?? null
      if (!map.has(key)) map.set(key, [])
      map.get(key)!.push(m)
    }

    const result: ProviderSummary[] = []

    for (const [providerId, mats] of map.entries()) {
      const provider = providerId
        ? (providers.find(p => p.id === providerId) ?? null)
        : null

      const totalCostUSD = mats.reduce((sum, m) => {
        if (!m.cost_amount) return sum
        let val = m.cost_amount
        if (m.cost_currency === 'ARS') val = val / 1000 // rough conversion placeholder
        if (m.cost_unit === 'per_sec' && m.duration_sec) val = val * m.duration_sec
        if (m.cost_unit === 'per_min' && m.duration_sec) val = val * m.duration_sec / 60
        return sum + val
      }, 0)

      const byStatus: Record<string, number> = {}
      for (const m of mats) {
        byStatus[m.status] = (byStatus[m.status] ?? 0) + 1
      }

      result.push({ provider, materials: mats, totalCostUSD, byStatus })
    }

    return result.sort((a, b) => b.materials.length - a.materials.length)
  }, [materials, providers])

  const filtered = useMemo(() => {
    if (!search) return summaries
    const q = search.toLowerCase()
    return summaries.filter(s =>
      s.provider?.name.toLowerCase().includes(q) ||
      s.provider?.code?.toLowerCase().includes(q) ||
      !s.provider
    )
  }, [summaries, search])

  // Global stats
  const globalStats = useMemo(() => ({
    totalMaterials: materials.length,
    purchased: materials.filter(m => m.status === 'purchased').length,
    totalCostUSD: summaries.reduce((s, r) => s + r.totalCostUSD, 0),
    providers: summaries.length,
  }), [materials, summaries])

  return (
    <div className="flex flex-col h-full">
      <Header
        title="Reportes"
        description="Resumen por proveedor"
        email={userEmail}
        actions={
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-[#555]" />
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Buscar proveedor..."
              className="h-8 pl-8 pr-3 w-44 rounded-lg border border-[#2a2a2a] bg-[#111] text-sm text-[#ededed] placeholder:text-[#444] focus:outline-none focus:border-orange-500"
            />
          </div>
        }
      />

      <div className="flex-1 overflow-y-auto p-6">
        <div className="max-w-5xl space-y-6">

          {/* Global KPIs */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <KpiCard icon={Package} label="Total materiales" value={globalStats.totalMaterials} color="text-orange-400" />
            <KpiCard icon={CheckCircle2} label="Comprados" value={globalStats.purchased} color="text-green-400" />
            <KpiCard icon={BarChart3} label="Proveedores" value={globalStats.providers} color="text-blue-400" />
            <KpiCard
              icon={DollarSign}
              label="Costo estimado"
              value={`USD ${globalStats.totalCostUSD.toLocaleString('es-AR', { maximumFractionDigits: 0 })}`}
              color="text-yellow-400"
            />
          </div>

          {/* Per-provider cards */}
          {filtered.length === 0 ? (
            <div className="text-center py-16">
              <BarChart3 className="h-10 w-10 text-[#333] mx-auto mb-3" />
              <p className="text-sm text-[#666]">Sin materiales registrados todavía.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {filtered.map((summary, i) => {
                const name = summary.provider?.name ?? 'Sin proveedor'
                const code = summary.provider?.code
                const total = summary.materials.length
                const purchased = summary.byStatus['purchased'] ?? 0
                const progress = total > 0 ? (purchased / total) * 100 : 0

                return (
                  <div
                    key={summary.provider?.id ?? `noprovider-${i}`}
                    className="bg-[#1a1a1a] border border-[#242424] rounded-xl p-5 hover:border-[#333] transition-colors"
                  >
                    {/* Header */}
                    <div className="flex items-start justify-between mb-4">
                      <div className="flex items-center gap-3">
                        <div className="h-9 w-9 rounded-lg bg-[#222] border border-[#333] flex items-center justify-center shrink-0">
                          {code
                            ? <span className="text-xs font-bold text-orange-400 font-mono">{code}</span>
                            : <Package className="h-4 w-4 text-[#555]" />
                          }
                        </div>
                        <div>
                          <p className="text-sm font-semibold text-[#ededed]">{name}</p>
                          <p className="text-xs text-[#555]">{total} material{total !== 1 ? 'es' : ''}</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-semibold text-yellow-400">
                          {summary.totalCostUSD > 0
                            ? `USD ${summary.totalCostUSD.toLocaleString('es-AR', { maximumFractionDigits: 0 })}`
                            : '—'}
                        </p>
                        <p className="text-xs text-[#555]">costo estimado</p>
                      </div>
                    </div>

                    {/* Progress bar */}
                    <div className="mb-4">
                      <div className="flex items-center justify-between mb-1.5">
                        <span className="text-xs text-[#555]">Avance de compra</span>
                        <span className="text-xs text-[#888] font-mono">{purchased}/{total} comprado{purchased !== 1 ? 's' : ''}</span>
                      </div>
                      <div className="h-1.5 bg-[#222] rounded-full overflow-hidden">
                        <div
                          className="h-full bg-green-500 rounded-full transition-all"
                          style={{ width: `${progress}%` }}
                        />
                      </div>
                    </div>

                    {/* Status breakdown */}
                    <div className="flex flex-wrap gap-2">
                      {Object.entries(STATUS_LABELS).map(([status, label]) => {
                        const count = summary.byStatus[status] ?? 0
                        if (count === 0) return null
                        return (
                          <div
                            key={status}
                            className={cn('flex items-center gap-1.5 text-xs px-2 py-1 rounded-lg', STATUS_COLORS[status])}
                          >
                            <span className="font-semibold">{count}</span>
                            <span className="opacity-80">{label}</span>
                          </div>
                        )
                      })}
                    </div>

                    {/* Material list (collapsed — show top 5) */}
                    {summary.materials.length > 0 && (
                      <details className="mt-4 group">
                        <summary className="cursor-pointer text-xs text-[#555] hover:text-[#888] transition-colors list-none flex items-center gap-1.5 select-none">
                          <TrendingUp className="h-3.5 w-3.5" />
                          Ver materiales ({total})
                        </summary>
                        <div className="mt-3 space-y-1.5">
                          {summary.materials.map(m => (
                            <div key={m.id} className="flex items-center gap-2 px-3 py-2 bg-[#111] rounded-lg border border-[#1e1e1e]">
                              {m.entry_code && (
                                <span className="text-[10px] font-mono text-orange-400 shrink-0 w-10">{m.entry_code}</span>
                              )}
                              <span className="text-xs text-[#ddd] flex-1 truncate">{m.title}</span>
                              {m.duration_sec && (
                                <span className="text-[10px] text-[#555] shrink-0">
                                  {Math.floor(m.duration_sec / 60)}:{String(m.duration_sec % 60).padStart(2, '0')}
                                </span>
                              )}
                              <span className={cn('text-[10px] px-1.5 py-0.5 rounded shrink-0', STATUS_COLORS[m.status])}>
                                {STATUS_LABELS[m.status]}
                              </span>
                              {m.cost_amount && (
                                <span className="text-[10px] text-yellow-400 shrink-0 font-mono">
                                  {m.cost_currency} {m.cost_amount}
                                </span>
                              )}
                            </div>
                          ))}
                        </div>
                      </details>
                    )}
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

function KpiCard({
  icon: Icon,
  label,
  value,
  color,
}: {
  icon: React.ComponentType<{ className?: string }>
  label: string
  value: string | number
  color: string
}) {
  return (
    <div className="bg-[#1a1a1a] border border-[#242424] rounded-xl p-4">
      <div className="flex items-center gap-2 mb-2">
        <Icon className={cn('h-4 w-4', color)} />
        <span className="text-xs text-[#555]">{label}</span>
      </div>
      <p className={cn('text-xl font-bold', color)}>{value}</p>
    </div>
  )
}
