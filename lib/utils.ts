import { type ClassValue, clsx } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatDuration(seconds: number | null | undefined): string {
  if (!seconds) return '--'
  const h = Math.floor(seconds / 3600)
  const m = Math.floor((seconds % 3600) / 60)
  const s = Math.floor(seconds % 60)
  if (h > 0) return `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
  return `${m}:${String(s).padStart(2, '0')}`
}

export function formatCost(amount: number | null | undefined, currency = 'USD'): string {
  if (amount == null) return '--'
  return new Intl.NumberFormat('es-AR', { style: 'currency', currency, minimumFractionDigits: 2 }).format(amount)
}

export function tcToSeconds(tc: string): number {
  const parts = tc.split(':').map(Number)
  if (parts.length === 4) {
    const [h, m, s] = parts
    return h * 3600 + m * 60 + s
  }
  if (parts.length === 3) {
    const [h, m, s] = parts
    return h * 3600 + m * 60 + s
  }
  return 0
}

export function secondsToTc(seconds: number, fps = 25): string {
  const h = Math.floor(seconds / 3600)
  const m = Math.floor((seconds % 3600) / 60)
  const s = Math.floor(seconds % 60)
  const f = Math.floor((seconds % 1) * fps)
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}:${String(f).padStart(2, '0')}`
}

export const STATUS_LABELS: Record<string, string> = {
  searching: 'Buscando',
  screener_received: 'Screener recibido',
  approved: 'Aprobado',
  order_sent: 'Pedido enviado',
  purchased: 'Comprado',
}

export const STATUS_COLORS: Record<string, string> = {
  searching: 'bg-gray-100 text-gray-700',
  screener_received: 'bg-blue-100 text-blue-700',
  approved: 'bg-green-100 text-green-700',
  order_sent: 'bg-yellow-100 text-yellow-700',
  purchased: 'bg-emerald-100 text-emerald-700',
}

export const ORDER_STATUS_LABELS: Record<string, string> = {
  draft: 'Borrador',
  sent: 'Enviado',
  confirmed: 'Confirmado',
  paid: 'Pagado',
}

export const RIGHTS_LABELS: Record<string, string> = {
  free: 'Libre',
  licensed: 'Licenciado',
  restricted: 'Restringido',
  unknown: 'Sin definir',
}

export const COST_UNIT_LABELS: Record<string, string> = {
  per_sec: 'por segundo',
  per_min: 'por minuto',
  flat: 'tarifa fija',
}
