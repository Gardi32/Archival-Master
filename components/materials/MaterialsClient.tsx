'use client'
import { useState, useCallback, useMemo, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Header } from '@/components/layout/Header'
import { Button } from '@/components/ui/button'
import { Dialog } from '@/components/ui/dialog'
import { MaterialForm } from './MaterialForm'
import { MaterialDetail } from './MaterialDetail'
import { MaterialGrid } from './MaterialGrid'
import { buildNewFilename } from './MaterialDetail'
import { toast } from 'sonner'
import { Plus, Upload, Download, Search, FileCode, FileText } from 'lucide-react'
import type { Material, Provider, ProviderRate } from '@/types/database'

interface Props {
  projectId: string
  projectName: string
  initialMaterials: Material[]
  providers: Pick<Provider, 'id' | 'name' | 'code'>[]
  providerRates: Record<string, ProviderRate[]>
  userEmail: string
}

export function MaterialsClient({ projectId, projectName, initialMaterials, providers, providerRates, userEmail }: Props) {
  const [materials, setMaterials] = useState<Material[]>(initialMaterials)
  const [showAddForm, setShowAddForm] = useState(false)
  const [selected, setSelected] = useState<Material | null>(null)
  const [search, setSearch] = useState('')
  const fileInputRef = useRef<HTMLInputElement>(null)
  const txtInputRef = useRef<HTMLInputElement>(null)

  const filtered = useMemo(() => {
    if (!search) return materials
    const q = search.toLowerCase()
    return materials.filter(m =>
      m.title.toLowerCase().includes(q) ||
      m.code?.toLowerCase().includes(q) ||
      m.provider?.name.toLowerCase().includes(q) ||
      m.description?.toLowerCase().includes(q)
    )
  }, [materials, search])

  const handleAdd = useCallback(async (data: Partial<Material>) => {
    const supabase = createClient()
    // Auto-assign entry_code if not provided
    if (!data.entry_code) {
      const { data: existing } = await supabase
        .from('materials')
        .select('entry_code')
        .eq('project_id', projectId)
        .not('entry_code', 'is', null)
      const codes = (existing ?? []).map(m => parseInt(m.entry_code ?? '0', 10)).filter(n => !isNaN(n))
      const nextNum = codes.length > 0 ? Math.max(...codes) + 1 : 1
      data = { ...data, entry_code: String(nextNum).padStart(4, '0') }
    }

    const { data: created, error } = await supabase
      .from('materials')
      .insert({ ...data, project_id: projectId } as never)
      .select('*, provider:providers(id, name, code), frames:material_frames(id, storage_path, order_index)')
      .single()

    if (error) { toast.error('Error al crear material'); return }
    setMaterials(prev => [...prev, created])
    setShowAddForm(false)
    toast.success('Material agregado')
  }, [projectId])

  const handleUpdate = useCallback(async (id: string, data: Partial<Material>) => {
    const supabase = createClient()
    const { data: updated, error } = await supabase
      .from('materials')
      .update(data as never)
      .eq('id', id)
      .select('*, provider:providers(id, name, code), frames:material_frames(id, storage_path, order_index)')
      .single()

    if (error) { toast.error('Error al actualizar'); return }
    setMaterials(prev => prev.map(m => m.id === id ? updated : m))
    if (selected?.id === id) setSelected(updated)
    toast.success('Guardado')
  }, [selected])

  const handleDelete = useCallback(async (id: string) => {
    if (!confirm('¿Eliminar este material?')) return
    const supabase = createClient()
    const { error } = await supabase.from('materials').delete().eq('id', id)
    if (error) { toast.error('Error al eliminar'); return }
    setMaterials(prev => prev.filter(m => m.id !== id))
    if (selected?.id === id) setSelected(null)
    toast.success('Material eliminado')
  }, [selected])

  async function handleCsvImport(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    const text = await file.text()
    const lines = text.split('\n').filter(Boolean)
    if (lines.length < 2) { toast.error('CSV vacío o inválido'); return }

    const headers = lines[0].split(',').map(h => h.trim().replace(/"/g, ''))
    const rows = lines.slice(1).map(line => {
      const values = line.split(',').map(v => v.trim().replace(/"/g, ''))
      return Object.fromEntries(headers.map((h, i) => [h, values[i] ?? '']))
    })

    const supabase = createClient()
    let count = 0
    for (const row of rows) {
      if (!row.title && !row.titulo) continue
      await supabase.from('materials').insert({
        project_id: projectId,
        title: row.title || row.titulo || '',
        code: row.code || row.codigo || null,
        description: row.description || row.descripcion || null,
        format: row.format || row.formato || null,
        resolution: row.resolution || row.resolucion || null,
        link: row.link || null,
        notes: row.notes || row.notas || null,
        status: 'searching',
        rights_type: 'unknown',
        cost_currency: 'USD',
        cost_unit: 'flat',
      } as never)
      count++
    }

    const { data: refreshed } = await supabase
      .from('materials')
      .select('*, provider:providers(id, name), frames:material_frames(id, storage_path, order_index)')
      .eq('project_id', projectId)
    setMaterials(refreshed ?? [])
    toast.success(`${count} materiales importados`)
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  // ── PowerShell rename script ──────────────────────────────────────────────
  function handleGenerateScript() {
    const withFiles = materials.filter(m => m.original_filename && m.entry_code)
    if (withFiles.length === 0) {
      toast.error('Ningún material tiene nombre de archivo original cargado.')
      return
    }

    const slug = projectName.toLowerCase().replace(/[^a-z0-9]/g, '_').slice(0, 30)
    const fecha = new Date().toISOString().slice(0, 10)

    const mapLines = withFiles.map(m => {
      const newName = buildNewFilename(m) ?? m.original_filename!
      const from = m.original_filename!.replace(/'/g, "''")
      const to   = newName.replace(/'/g, "''")
      return `    [PSCustomObject]@{ Desde = '${from}'; Hacia = '${to}' }`
    }).join('\n')

    const script = `# ============================================================
# ArchivalMaster — Script de renombre masivo
# Proyecto : ${projectName}
# Generado : ${fecha}
# Materiales: ${withFiles.length}
# ============================================================
#
# CÓMO USAR:
#   1. Abrí PowerShell (clic derecho → "Abrir con PowerShell")
#   2. Ejecutá:
#        .\\rename_${slug}.ps1 -Carpeta "C:\\ruta\\de\\tus\\archivos"
#
#   Google Drive montado como unidad (ej. G:\\):
#        .\\rename_${slug}.ps1 -Carpeta "G:\\Mi unidad\\Carpeta proyecto"
#
#   Red local / NAS:
#        .\\rename_${slug}.ps1 -Carpeta "\\\\servidor\\carpeta"
#
#   Modo prueba (solo muestra cambios, NO renombra nada):
#        .\\rename_${slug}.ps1 -Carpeta "C:\\ruta" -DryRun
# ============================================================

param(
    [Parameter(Mandatory=$true)]
    [string]$Carpeta,
    [switch]$DryRun
)

$ErrorActionPreference = 'Continue'
$ok = 0; $skip = 0; $err = 0

$renombres = @(
${mapLines}
)

Write-Host ''
Write-Host '============================================================' -ForegroundColor Cyan
Write-Host "  ArchivalMaster — Renombre masivo" -ForegroundColor Cyan
Write-Host "  Proyecto : ${projectName}" -ForegroundColor Cyan
Write-Host "  Archivos : $($renombres.Count)" -ForegroundColor Cyan
Write-Host '============================================================' -ForegroundColor Cyan
Write-Host "  Carpeta  : $Carpeta"
if ($DryRun) { Write-Host '  [MODO PRUEBA — no se modificará nada]' -ForegroundColor Yellow }
Write-Host ''

if (-not (Test-Path $Carpeta)) {
    Write-Host "ERROR: La carpeta '$Carpeta' no existe." -ForegroundColor Red
    exit 1
}

foreach ($r in $renombres) {
    if ($r.Desde -eq $r.Hacia) { $skip++; continue }

    $origen  = Join-Path $Carpeta $r.Desde
    $destino = Join-Path $Carpeta $r.Hacia

    if (Test-Path $origen) {
        if (Test-Path $destino) {
            Write-Host "  ⚠  Ya existe destino: $($r.Hacia)" -ForegroundColor Yellow
            $skip++
        } elseif ($DryRun) {
            Write-Host "  ▸  $($r.Desde)  →  $($r.Hacia)" -ForegroundColor Yellow
            $ok++
        } else {
            try {
                Rename-Item -Path $origen -NewName $r.Hacia -ErrorAction Stop
                Write-Host "  ✓  $($r.Desde)  →  $($r.Hacia)" -ForegroundColor Green
                $ok++
            } catch {
                Write-Host "  ✗  ERROR: $($r.Desde)" -ForegroundColor Red
                Write-Host "     $($_.Exception.Message)" -ForegroundColor DarkRed
                $err++
            }
        }
    } else {
        Write-Host "  -  No encontrado: $($r.Desde)" -ForegroundColor DarkGray
        $skip++
    }
}

Write-Host ''
Write-Host '------------------------------------------------------------' -ForegroundColor Cyan
Write-Host "  Renombrados      : $ok" -ForegroundColor Green
Write-Host "  No encontrados   : $skip" -ForegroundColor Gray
if ($err -gt 0) {
    Write-Host "  Errores          : $err" -ForegroundColor Red
} else {
    Write-Host "  Errores          : 0" -ForegroundColor Gray
}
Write-Host '------------------------------------------------------------' -ForegroundColor Cyan
Write-Host ''
Read-Host 'Presioná ENTER para cerrar'
`
    const blob = new Blob([script], { type: 'text/plain;charset=utf-8' })
    const url  = URL.createObjectURL(blob)
    const a    = document.createElement('a')
    a.href     = url
    a.download = `rename_${slug}.ps1`
    a.click()
    URL.revokeObjectURL(url)
    toast.success(`Script generado con ${withFiles.length} archivos`)
  }

  // ── Import .txt con nombres de archivo ───────────────────────────────────
  // Formatos soportados (uno por línea):
  //   clip_0023.mp4                         → busca por título similar
  //   Getty-123456: clip_0023.mp4           → busca por original_id = "Getty-123456"
  //   Getty-123456 clip_0023.mp4            → ídem separado por espacio
  //   0001 clip_0023.mp4                    → busca por entry_code = "0001"
  async function handleTxtImport(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return

    const text = await file.text()
    const lines = text.split('\n').map(l => l.trim()).filter(Boolean)

    const supabase = createClient()
    let matched = 0, unmatched = 0

    for (const line of lines) {
      let originalId: string | null = null
      let entryCode: string | null  = null
      let filename: string          = line

      // Formato: "Getty-123456: clip_0023.mp4"  o  "Getty-123456 clip_0023.mp4"
      const colonMatch = line.match(/^([^:]+):\s*(.+)$/)
      const spaceMatch = !colonMatch && line.match(/^(\S+)\s+(\S+\.\w+)$/)

      if (colonMatch) {
        const key = colonMatch[1].trim()
        filename  = colonMatch[2].trim()
        if (/^\d{4}$/.test(key)) entryCode = key
        else originalId = key
      } else if (spaceMatch) {
        const key = spaceMatch[1].trim()
        filename  = spaceMatch[2].trim()
        if (/^\d{4}$/.test(key)) entryCode = key
        else originalId = key
      }

      // Buscar material coincidente
      let target: Material | undefined
      if (entryCode) {
        target = materials.find(m => m.entry_code === entryCode)
      } else if (originalId) {
        target = materials.find(m => m.original_id === originalId)
      }
      // fallback: sin clave → saltar
      if (!target) { unmatched++; continue }

      const { data: updated, error } = await supabase
        .from('materials')
        .update({ original_filename: filename } as never)
        .eq('id', target.id)
        .select('*, provider:providers(id, name), frames:material_frames(id, storage_path, order_index)')
        .single()

      if (!error && updated) {
        setMaterials(prev => prev.map(m => m.id === target!.id ? updated : m))
        matched++
      }
    }

    toast.success(`${matched} archivos vinculados${unmatched > 0 ? ` · ${unmatched} líneas sin coincidencia` : ''}`)
    if (txtInputRef.current) txtInputRef.current.value = ''
  }

  function handleCsvExport() {
    const headers = ['codigo', 'titulo', 'proveedor', 'duracion_seg', 'formato', 'resolucion', 'fps', 'aspect_ratio', 'tc_in', 'tc_out', 'derechos', 'costo', 'moneda', 'unidad_costo', 'link', 'screener', 'estado', 'notas']
    const rows = materials.map(m => [
      m.code ?? '', m.title, m.provider?.name ?? '',
      m.duration_sec ?? '', m.format ?? '', m.resolution ?? '', m.fps ?? '', m.aspect_ratio ?? '',
      m.timecode_in ?? '', m.timecode_out ?? '',
      m.rights_type, m.cost_amount ?? '', m.cost_currency, m.cost_unit,
      m.link ?? '', m.screener_url ?? '', m.status, m.notes ?? '',
    ])
    const csv = [headers, ...rows].map(r => r.map(v => `"${v}"`).join(',')).join('\n')
    const blob = new Blob([csv], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `materiales-${new Date().toISOString().slice(0, 10)}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  return (
    <div className="flex flex-col h-full">
      <Header
        title="Registro de Materiales"
        description={`${materials.length} material${materials.length !== 1 ? 'es' : ''} registrado${materials.length !== 1 ? 's' : ''}`}
        email={userEmail}
        actions={
          <div className="flex items-center gap-2">
            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-[#555]" />
              <input
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder="Buscar materiales..."
                className="h-8 pl-8 pr-3 w-48 rounded-lg border border-[#2a2a2a] bg-[#111] text-sm text-[#ededed] placeholder:text-[#444] focus:outline-none focus:border-orange-500 focus:ring-1 focus:ring-orange-500"
              />
            </div>
            <Button variant="ghost" size="sm" onClick={() => fileInputRef.current?.click()}>
              <Upload className="h-3.5 w-3.5" />
              CSV
            </Button>
            <input ref={fileInputRef} type="file" accept=".csv" className="hidden" onChange={handleCsvImport} />
            <Button variant="ghost" size="sm" onClick={handleCsvExport}>
              <Download className="h-3.5 w-3.5" />
              Exportar
            </Button>

            {/* Separador */}
            <div className="w-px h-4 bg-[#2a2a2a]" />

            <Button
              variant="ghost" size="sm"
              onClick={() => txtInputRef.current?.click()}
              title="Importar listado .txt con nombres de archivo originales"
            >
              <FileText className="h-3.5 w-3.5" />
              Importar .txt
            </Button>
            <input ref={txtInputRef} type="file" accept=".txt" className="hidden" onChange={handleTxtImport} />

            <Button
              variant="ghost" size="sm"
              onClick={handleGenerateScript}
              title="Descargar script PowerShell para renombrar archivos"
            >
              <FileCode className="h-3.5 w-3.5" />
              Script .ps1
            </Button>

            <Button variant="primary" size="sm" onClick={() => setShowAddForm(true)}>
              <Plus className="h-3.5 w-3.5" />
              Agregar
            </Button>
          </div>
        }
      />

      <div className="flex flex-1 min-h-0 overflow-hidden">
        <MaterialGrid
          materials={filtered}
          providers={providers as Pick<Provider, 'id' | 'name' | 'code'>[]}
          projectId={projectId}
          onUpdate={handleUpdate}
          onSelect={setSelected}
          onDelete={handleDelete}
        />

        {selected && (
          <div className="w-96 shrink-0 border-l border-[#242424] overflow-y-auto">
            <MaterialDetail
              material={selected}
              projectId={projectId}
              providers={providers}
              providerRates={providerRates}
              onUpdate={handleUpdate}
              onDelete={handleDelete}
              onClose={() => setSelected(null)}
            />
          </div>
        )}
      </div>

      <Dialog open={showAddForm} onClose={() => setShowAddForm(false)} title="Agregar material" size="lg">
        <div className="p-6">
          <MaterialForm
            projectId={projectId}
            providers={providers}
            providerRates={providerRates}
            onSave={handleAdd}
            onCancel={() => setShowAddForm(false)}
          />
        </div>
      </Dialog>
    </div>
  )
}
