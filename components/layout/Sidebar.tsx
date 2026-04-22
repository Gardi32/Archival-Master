'use client'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { cn } from '@/lib/utils'
import {
  Film, Building2, FileText, Calculator, ShoppingCart, FolderOpen, Settings, ChevronLeft, LayoutGrid, LayoutDashboard, ClipboardList
} from 'lucide-react'

const NAV_ITEMS = [
  { href: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { href: 'research', label: 'Research', icon: ClipboardList },
  { href: 'materials', label: 'Materiales', icon: Film },
  { href: 'providers', label: 'Proveedores', icon: Building2 },
  { href: 'edl', label: 'EDL Import', icon: FileText },
  { href: 'budget', label: 'Presupuesto', icon: Calculator },
  { href: 'orders', label: 'Pedidos', icon: ShoppingCart },
  { href: 'documents', label: 'Documentos', icon: FolderOpen },
  { href: 'settings', label: 'Configuración', icon: Settings },
]

interface SidebarProps {
  projectId: string
  projectName: string
}

export function Sidebar({ projectId, projectName }: SidebarProps) {
  const pathname = usePathname()
  const base = `/projects/${projectId}`

  return (
    <aside className="w-56 shrink-0 flex flex-col border-r border-[#242424] bg-[#161616] h-full">
      {/* Logo + back */}
      <div className="flex flex-col px-4 pt-5 pb-4 border-b border-[#242424]">
        <Link href="/projects" className="flex items-center gap-1.5 text-[#666] hover:text-[#aaa] transition-colors text-xs mb-3">
          <ChevronLeft className="h-3.5 w-3.5" />
          Proyectos
        </Link>
        <div className="flex items-center gap-2">
          <div className="h-7 w-7 rounded bg-orange-500/20 flex items-center justify-center">
            <Film className="h-4 w-4 text-orange-400" />
          </div>
          <span className="font-semibold text-sm text-[#ededed] truncate">{projectName}</span>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-2 py-3 space-y-0.5 overflow-y-auto">
        {NAV_ITEMS.map(({ href, label, icon: Icon }) => {
          const fullHref = `${base}/${href}`
          const active = pathname.startsWith(fullHref)
          return (
            <Link
              key={href}
              href={fullHref}
              className={cn(
                'flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm transition-colors',
                active
                  ? 'bg-orange-500/15 text-orange-400 font-medium'
                  : 'text-[#888] hover:text-[#ededed] hover:bg-[#222]'
              )}
            >
              <Icon className="h-4 w-4 shrink-0" />
              {label}
            </Link>
          )
        })}
      </nav>

      {/* Footer */}
      <div className="px-4 py-3 border-t border-[#242424]">
        <Link href="/projects" className="flex items-center gap-2 text-xs text-[#555] hover:text-[#888] transition-colors">
          <LayoutGrid className="h-3.5 w-3.5" />
          Todos los proyectos
        </Link>
      </div>
    </aside>
  )
}
