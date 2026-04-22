import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { formatCost, STATUS_LABELS, RIGHTS_LABELS, ORDER_STATUS_LABELS } from '@/lib/utils'
import {
  Film, Building2, FileText, Calculator, ShoppingCart,
  AlertTriangle, CheckCircle2, Clock, TrendingUp, ArrowRight
} from 'lucide-react'
import type { MaterialStatus, RightsType, OrderStatus } from '@/types/database'

const STATUS_ORDER: MaterialStatus[] = ['searching', 'screener_received', 'approved', 'order_sent', 'purchased']

const STATUS_BAR_COLORS: Record<MaterialStatus, string> = {
  searching: 'bg-[#555]',
  screener_received: 'bg-blue-500',
  approved: 'bg-green-500',
  order_sent: 'bg-yellow-500',
  purchased: 'bg-emerald-500',
}

const STATUS_BADGE_COLORS: Record<MaterialStatus, string> = {
  searching: 'bg-[#333] text-[#aaa]',
  screener_received: 'bg-blue-500/15 text-blue-400',
  approved: 'bg-green-500/15 text-green-400',
  order_sent: 'bg-yellow-500/15 text-yellow-400',
  purchased: 'bg-emerald-500/15 text-emerald-400',
}

const RIGHTS_COLORS: Record<RightsType, string> = {
  free: 'text-green-400',
  licensed: 'text-blue-400',
  restricted: 'text-red-400',
  unknown: 'text-[#888]',
}

export default async function DashboardPage({ params }: { params: Promise<{ projectId: string }> }) {
  const { projectId } = await params
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')

  const [
    { data: project },
    { data: materials },
    { data: providers },
    { data: budgets },
    { data: orders },
    { data: edlImports },
  ] = await Promise.all([
    supabase.from('projects').select('*').eq('id', projectId).single(),
    supabase.from('materials').select('id, status, rights_type, cost_amount, cost_currency, cost_unit, title').eq('project_id', projectId),
    supabase.from('providers').select('id, name').eq('project_id', projectId),
    supabase.from('budgets').select('id, name, total_amount, currency, status, created_at').eq('project_id', projectId).order('created_at', { ascending: false }).limit(3),
    supabase.from('orders').select('id, status, provider_id, providers(name)').eq('project_id', projectId),
    supabase.from('edl_imports').select('id, name, imported_at').eq('project_id', projectId).order('imported_at', { ascending: false }).limit(1),
  ])

  if (!project) redirect('/projects')

  const mats = materials ?? []
  const total = mats.length

  // Status counts
  const statusCounts = STATUS_ORDER.reduce((acc, s) => {
    acc[s] = mats.filter(m => m.status === s).length
    return acc
  }, {} as Record<MaterialStatus, number>)

  // Rights counts
  const rightsCounts: Record<RightsType, number> = {
    free: mats.filter(m => m.rights_type === 'free').length,
    licensed: mats.filter(m => m.rights_type === 'licensed').length,
    restricted: mats.filter(m => m.rights_type === 'restricted').length,
    unknown: mats.filter(m => m.rights_type === 'unknown').length,
  }

  const restrictedMats = mats.filter(m => m.rights_type === 'restricted')
  const pendingScreeners = statusCounts.searching + statusCounts.screener_received
  const purchased = statusCounts.purchased

  // Order counts
  const orderCounts: Record<OrderStatus, number> = {
    draft: (orders ?? []).filter(o => o.status === 'draft').length,
    sent: (orders ?? []).filter(o => o.status === 'sent').length,
    confirmed: (orders ?? []).filter(o => o.status === 'confirmed').length,
    paid: (orders ?? []).filter(o => o.status === 'paid').length,
  }

  const latestBudget = budgets?.[0] ?? null

  return (
    <div className="flex-1 overflow-y-auto bg-[#0e0e0e]">
      {/* Header */}
      <div className="px-8 pt-7 pb-5 border-b border-[#1e1e1e]">
        <p className="text-xs text-[#555] uppercase tracking-widest mb-1">Overview del proyecto</p>
        <h1 className="text-2xl font-semibold text-[#ededed]">{(project as { name: string }).name}</h1>
        {(project as { client?: string | null }).client && (
          <p className="text-sm text-[#666] mt-0.5">Cliente: {(project as { client: string }).client}</p>
        )}
      </div>

      <div className="px-8 py-6 space-y-6">

        {/* Alerts */}
        {(restrictedMats.length > 0 || statusCounts.searching > 0) && (
          <div className="space-y-2">
            {restrictedMats.length > 0 && (
              <div className="flex items-start gap-3 bg-red-500/8 border border-red-500/20 rounded-xl px-4 py-3">
                <AlertTriangle className="h-4 w-4 text-red-400 mt-0.5 shrink-0" />
                <div>
                  <p className="text-sm font-medium text-red-300">
                    {restrictedMats.length} material{restrictedMats.length > 1 ? 'es' : ''} con derechos restringidos
                  </p>
                  <p className="text-xs text-red-400/70 mt-0.5">
                    {restrictedMats.slice(0, 3).map(m => m.title).join(', ')}
                    {restrictedMats.length > 3 ? ` y ${restrictedMats.length - 3} más` : ''}
                  </p>
                </div>
              </div>
            )}
            {statusCounts.searching > 0 && (
              <div className="flex items-center gap-3 bg-[#1a1a1a] border border-[#2a2a2a] rounded-xl px-4 py-3">
                <Clock className="h-4 w-4 text-[#888] shrink-0" />
                <p className="text-sm text-[#888]">
                  <span className="text-[#ccc] font-medium">{statusCounts.searching}</span> material{statusCounts.searching > 1 ? 'es' : ''} todavía en búsqueda
                </p>
              </div>
            )}
          </div>
        )}

        {/* Top stats */}
        <div className="grid grid-cols-4 gap-3">
          <StatCard
            href={`/projects/${projectId}/materials`}
            icon={<Film className="h-4 w-4 text-orange-400" />}
            label="Materiales"
            value={total}
            sub={`${purchased} comprados`}
          />
          <StatCard
            href={`/projects/${projectId}/providers`}
            icon={<Building2 className="h-4 w-4 text-blue-400" />}
            label="Proveedores"
            value={(providers ?? []).length}
            sub="activos"
          />
          <StatCard
            href={`/projects/${projectId}/budget`}
            icon={<Calculator className="h-4 w-4 text-green-400" />}
            label="Presupuesto"
            value={latestBudget ? formatCost(latestBudget.total_amount, latestBudget.currency) : '--'}
            sub={latestBudget ? latestBudget.name : 'Sin presupuesto'}
            valueSmall={!!latestBudget}
          />
          <StatCard
            href={`/projects/${projectId}/orders`}
            icon={<ShoppingCart className="h-4 w-4 text-yellow-400" />}
            label="Pedidos"
            value={(orders ?? []).length}
            sub={`${orderCounts.paid} pagados`}
          />
        </div>

        {/* Materials progress */}
        <div className="bg-[#141414] border border-[#1e1e1e] rounded-xl p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-medium text-[#ccc]">Progreso de materiales</h2>
            <Link href={`/projects/${projectId}/materials`} className="flex items-center gap-1 text-xs text-[#555] hover:text-[#888] transition-colors">
              Ver todos <ArrowRight className="h-3 w-3" />
            </Link>
          </div>

          {total === 0 ? (
            <p className="text-sm text-[#555] py-2">Todavía no hay materiales cargados.</p>
          ) : (
            <>
              {/* Progress bar */}
              <div className="flex h-2 rounded-full overflow-hidden gap-px mb-4">
                {STATUS_ORDER.map(s => (
                  statusCounts[s] > 0 && (
                    <div
                      key={s}
                      className={`${STATUS_BAR_COLORS[s]} transition-all`}
                      style={{ width: `${(statusCounts[s] / total) * 100}%` }}
                      title={`${STATUS_LABELS[s]}: ${statusCounts[s]}`}
                    />
                  )
                ))}
              </div>

              {/* Status breakdown */}
              <div className="grid grid-cols-5 gap-2">
                {STATUS_ORDER.map(s => (
                  <div key={s} className="text-center">
                    <p className="text-lg font-semibold text-[#ededed]">{statusCounts[s]}</p>
                    <span className={`inline-block text-[10px] px-1.5 py-0.5 rounded-full font-medium ${STATUS_BADGE_COLORS[s]}`}>
                      {STATUS_LABELS[s]}
                    </span>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>

        {/* Rights + Orders row */}
        <div className="grid grid-cols-2 gap-3">
          {/* Rights breakdown */}
          <div className="bg-[#141414] border border-[#1e1e1e] rounded-xl p-5">
            <h2 className="text-sm font-medium text-[#ccc] mb-4">Derechos por tipo</h2>
            {total === 0 ? (
              <p className="text-sm text-[#555]">Sin materiales.</p>
            ) : (
              <div className="space-y-2.5">
                {(Object.entries(rightsCounts) as [RightsType, number][]).map(([type, count]) => (
                  <div key={type} className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className={`w-2 h-2 rounded-full ${type === 'free' ? 'bg-green-400' : type === 'licensed' ? 'bg-blue-400' : type === 'restricted' ? 'bg-red-400' : 'bg-[#555]'}`} />
                      <span className="text-sm text-[#999]">{RIGHTS_LABELS[type]}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="w-20 h-1.5 bg-[#222] rounded-full overflow-hidden">
                        <div
                          className={`h-full rounded-full ${type === 'free' ? 'bg-green-400' : type === 'licensed' ? 'bg-blue-400' : type === 'restricted' ? 'bg-red-400' : 'bg-[#555]'}`}
                          style={{ width: total > 0 ? `${(count / total) * 100}%` : '0%' }}
                        />
                      </div>
                      <span className={`text-sm font-medium w-4 text-right ${RIGHTS_COLORS[type]}`}>{count}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Orders status */}
          <div className="bg-[#141414] border border-[#1e1e1e] rounded-xl p-5">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-sm font-medium text-[#ccc]">Estado de pedidos</h2>
              <Link href={`/projects/${projectId}/orders`} className="flex items-center gap-1 text-xs text-[#555] hover:text-[#888] transition-colors">
                Ver todos <ArrowRight className="h-3 w-3" />
              </Link>
            </div>
            {(orders ?? []).length === 0 ? (
              <p className="text-sm text-[#555]">Sin pedidos generados.</p>
            ) : (
              <div className="space-y-2.5">
                {(['draft', 'sent', 'confirmed', 'paid'] as OrderStatus[]).map(s => (
                  orderCounts[s] > 0 && (
                    <div key={s} className="flex items-center justify-between">
                      <span className="text-sm text-[#999]">{ORDER_STATUS_LABELS[s]}</span>
                      <span className="text-sm font-medium text-[#ededed]">{orderCounts[s]}</span>
                    </div>
                  )
                ))}
              </div>
            )}
          </div>
        </div>

        {/* EDL + Budget row */}
        <div className="grid grid-cols-2 gap-3">
          {/* Last EDL */}
          <div className="bg-[#141414] border border-[#1e1e1e] rounded-xl p-5">
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-sm font-medium text-[#ccc]">Último EDL importado</h2>
              <Link href={`/projects/${projectId}/edl`} className="flex items-center gap-1 text-xs text-[#555] hover:text-[#888] transition-colors">
                Importar <ArrowRight className="h-3 w-3" />
              </Link>
            </div>
            {edlImports?.[0] ? (
              <div>
                <p className="text-sm font-medium text-[#ededed]">{edlImports[0].name}</p>
                <p className="text-xs text-[#555] mt-0.5">
                  {new Date(edlImports[0].imported_at).toLocaleDateString('es-AR', { day: '2-digit', month: 'short', year: 'numeric' })}
                </p>
              </div>
            ) : (
              <p className="text-sm text-[#555]">Ningún EDL importado aún.</p>
            )}
          </div>

          {/* Recent budgets */}
          <div className="bg-[#141414] border border-[#1e1e1e] rounded-xl p-5">
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-sm font-medium text-[#ccc]">Presupuestos recientes</h2>
              <Link href={`/projects/${projectId}/budget`} className="flex items-center gap-1 text-xs text-[#555] hover:text-[#888] transition-colors">
                Ver todos <ArrowRight className="h-3 w-3" />
              </Link>
            </div>
            {(budgets ?? []).length === 0 ? (
              <p className="text-sm text-[#555]">Sin presupuestos generados.</p>
            ) : (
              <div className="space-y-2">
                {budgets!.map(b => (
                  <div key={b.id} className="flex items-center justify-between">
                    <span className="text-sm text-[#999] truncate max-w-[140px]">{b.name}</span>
                    <span className="text-sm font-medium text-[#ededed]">{formatCost(b.total_amount, b.currency)}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Quick actions */}
        <div>
          <p className="text-xs text-[#444] uppercase tracking-widest mb-3">Acciones rápidas</p>
          <div className="grid grid-cols-3 gap-2">
            <QuickAction href={`/projects/${projectId}/materials`} icon={<Film className="h-4 w-4" />} label="Agregar material" />
            <QuickAction href={`/projects/${projectId}/edl`} icon={<FileText className="h-4 w-4" />} label="Importar EDL" />
            <QuickAction href={`/projects/${projectId}/orders`} icon={<ShoppingCart className="h-4 w-4" />} label="Crear pedido" />
          </div>
        </div>

      </div>
    </div>
  )
}

function StatCard({
  href, icon, label, value, sub, valueSmall
}: {
  href: string
  icon: React.ReactNode
  label: string
  value: string | number
  sub: string
  valueSmall?: boolean
}) {
  return (
    <Link href={href} className="bg-[#141414] border border-[#1e1e1e] rounded-xl p-4 hover:border-[#2e2e2e] transition-colors group">
      <div className="flex items-center gap-2 mb-2">
        {icon}
        <span className="text-xs text-[#666]">{label}</span>
      </div>
      <p className={`font-semibold text-[#ededed] group-hover:text-white transition-colors ${valueSmall ? 'text-lg' : 'text-2xl'}`}>{value}</p>
      <p className="text-xs text-[#555] mt-0.5">{sub}</p>
    </Link>
  )
}

function QuickAction({ href, icon, label }: { href: string; icon: React.ReactNode; label: string }) {
  return (
    <Link
      href={href}
      className="flex items-center gap-2.5 px-4 py-3 bg-[#141414] border border-[#1e1e1e] rounded-xl text-sm text-[#888] hover:text-[#ccc] hover:border-[#2e2e2e] transition-colors"
    >
      <span className="text-[#555]">{icon}</span>
      {label}
    </Link>
  )
}
