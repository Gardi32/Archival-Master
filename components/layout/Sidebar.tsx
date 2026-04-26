'use client'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { cn } from '@/lib/utils'
import {
  Film, Building2, FileText, Calculator, ShoppingCart, FolderOpen, Settings,
  ChevronLeft, LayoutGrid, LayoutDashboard, BookOpen, CheckSquare, BarChart2,
  BarChart3, GanttChartSquare,
} from 'lucide-react'

interface NavItem {
  href: string
  label: string
  icon: React.ComponentType<{ className?: string }>
}

interface NavSection {
  label: string | null
  items: NavItem[]
}

const NAV_SECTIONS: NavSection[] = [
  {
    label: null,
    items: [
      { href: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    ],
  },
  {
    label: 'Tareas',
    items: [
      { href: 'todo', label: 'To Do', icon: CheckSquare },
      { href: 'gantt', label: 'Gantt', icon: GanttChartSquare },
      { href: 'bitacora', label: 'Bitácora', icon: BookOpen },
    ],
  },
  {
    label: 'Producción',
    items: [
      { href: 'materials', label: 'Materiales', icon: Film },
      { href: 'providers', label: 'Proveedores', icon: Building2 },
    ],
  },
  {
    label: 'Licensing',
    items: [
      { href: 'edl', label: 'EDL', icon: FileText },
      { href: 'reports', label: 'Reportes', icon: BarChart3 },
    ],
  },
  {
    label: 'Compras',
    items: [
      { href: 'budget', label: 'Presupuesto', icon: Calculator },
      { href: 'orders', label: 'Pedidos', icon: ShoppingCart },
      { href: 'documents', label: 'Documentos', icon: FolderOpen },
    ],
  },
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
          <div className="h-7 w-7 rounded flex items-center justify-center" style={{ backgroundColor: 'var(--accent-bg)' }}>
            <Film className="h-4 w-4" style={{ color: 'var(--accent)' }} />
          </div>
          <span className="font-semibold text-sm text-[#ededed] truncate">{projectName}</span>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-2 py-3 overflow-y-auto space-y-4">
        {NAV_SECTIONS.map((section, si) => (
          <div key={si}>
            {section.label && (
              <p className="px-3 mb-1 text-[10px] font-semibold text-[#444] uppercase tracking-widest">
                {section.label}
              </p>
            )}
            <div className="space-y-0.5">
              {section.items.map(({ href, label, icon: Icon }) => {
                const fullHref = `${base}/${href}`
                const active = pathname.startsWith(fullHref)
                return (
                  <Link
                    key={href}
                    href={fullHref}
                    className={cn(
                      'flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm transition-colors',
                      active ? 'font-medium' : 'text-[#888] hover:text-[#ededed] hover:bg-[#222]'
                    )}
                    style={active ? { backgroundColor: 'var(--accent-bg)', color: 'var(--accent)' } : {}}
                  >
                    <Icon className="h-4 w-4 shrink-0" />
                    {label}
                  </Link>
                )
              })}
            </div>
          </div>
        ))}
      </nav>

      {/* Footer */}
      <div className="px-4 py-3 border-t border-[#242424] space-y-1">
        <Link href="/projects" className="flex items-center gap-2 text-xs text-[#555] hover:text-[#888] transition-colors py-1">
          <LayoutGrid className="h-3.5 w-3.5" />
          Todos los proyectos
        </Link>
        <Link
          href={`${base}/settings`}
          className="flex items-center gap-2 text-xs transition-colors py-1 text-[#555] hover:text-[#888]"
          style={pathname.startsWith(`${base}/settings`) ? { color: 'var(--accent)' } : {}}
        >
          <Settings className="h-3.5 w-3.5" />
          Configuración
        </Link>
      </div>
    </aside>
  )
}
