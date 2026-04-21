'use client'
import { useCallback, useMemo } from 'react'
import { AgGridReact } from 'ag-grid-react'
import 'ag-grid-community/styles/ag-grid.css'
import 'ag-grid-community/styles/ag-theme-quartz.css'
import { AllCommunityModule, ModuleRegistry } from 'ag-grid-community'
import type { ColDef, GridReadyEvent, CellValueChangedEvent } from 'ag-grid-community'
import { cn, STATUS_LABELS, STATUS_COLORS, RIGHTS_LABELS, COST_UNIT_LABELS, formatCost, formatDuration } from '@/lib/utils'
import type { Material, Provider, MaterialStatus } from '@/types/database'
import Image from 'next/image'
import { createClient } from '@/lib/supabase/client'
import { ExternalLink, Trash2 } from 'lucide-react'

ModuleRegistry.registerModules([AllCommunityModule])

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!

function FrameCell({ value }: { value: { storage_path: string }[] | undefined }) {
  if (!value?.length) return <div className="h-full flex items-center justify-center text-[#444]">—</div>
  const url = `${SUPABASE_URL}/storage/v1/object/public/frames/${value[0].storage_path}`
  return (
    <div className="h-full flex items-center">
      <div className="relative h-8 w-14 rounded overflow-hidden bg-[#2a2a2a]">
        <Image src={url} alt="" fill className="object-cover" sizes="56px" />
      </div>
    </div>
  )
}

function StatusCell({ value }: { value: MaterialStatus }) {
  return (
    <span className={cn('inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium', STATUS_COLORS[value])}>
      {STATUS_LABELS[value]}
    </span>
  )
}

function LinkCell({ value }: { value: string | null }) {
  if (!value) return <span className="text-[#444]">—</span>
  return (
    <a href={value} target="_blank" rel="noopener noreferrer" onClick={e => e.stopPropagation()}
      className="flex items-center gap-1 text-orange-400 hover:text-orange-300 text-xs truncate max-w-full"
    >
      <ExternalLink className="h-3 w-3 shrink-0" />
      <span className="truncate">{value.replace(/^https?:\/\/(www\.)?/, '')}</span>
    </a>
  )
}

interface Props {
  materials: Material[]
  providers: Pick<Provider, 'id' | 'name'>[]
  projectId: string
  onUpdate: (id: string, data: Partial<Material>) => void
  onSelect: (m: Material) => void
  onDelete: (id: string) => void
}

export function MaterialGrid({ materials, providers, onUpdate, onSelect, onDelete }: Props) {
  const providerMap = useMemo(() =>
    Object.fromEntries(providers.map(p => [p.id, p.name])),
    [providers]
  )

  const colDefs = useMemo(() => [
    {
      field: 'frames',
      headerName: '',
      width: 72,
      pinned: 'left',
      editable: false,
      sortable: false,
      cellRenderer: FrameCell,
      cellStyle: { padding: '4px 8px' } as Record<string, string>,
    },
    {
      field: 'code',
      headerName: 'Código',
      width: 110,
      editable: true,
      pinned: 'left',
      cellStyle: { fontFamily: 'monospace', fontSize: '12px', color: '#888' } as Record<string, string>,
    },
    {
      field: 'title',
      headerName: 'Título',
      flex: 1,
      minWidth: 200,
      editable: true,
      cellStyle: { fontWeight: '500', color: '#ededed' } as Record<string, string>,
    },
    {
      field: 'provider_id',
      headerName: 'Proveedor',
      width: 150,
      editable: true,
      cellEditor: 'agSelectCellEditor',
      cellEditorParams: { values: ['', ...providers.map(p => p.id)] },
      valueFormatter: (p: { value: string }) => providerMap[p.value] ?? '—',
    },
    {
      field: 'status',
      headerName: 'Estado',
      width: 155,
      editable: true,
      cellEditor: 'agSelectCellEditor',
      cellEditorParams: { values: ['searching', 'screener_received', 'approved', 'order_sent', 'purchased'] },
      cellRenderer: StatusCell,
    },
    {
      field: 'duration_sec',
      headerName: 'Duración',
      width: 100,
      editable: true,
      type: 'numericColumn',
      valueFormatter: (p: { value: number }) => formatDuration(p.value),
      cellStyle: { fontFamily: 'monospace', fontSize: '12px' },
    },
    {
      field: 'format',
      headerName: 'Formato',
      width: 90,
      editable: true,
    },
    {
      field: 'resolution',
      headerName: 'Res.',
      width: 80,
      editable: true,
      cellStyle: { fontSize: '12px' },
    },
    {
      field: 'fps',
      headerName: 'FPS',
      width: 65,
      editable: true,
      type: 'numericColumn',
    },
    {
      field: 'aspect_ratio',
      headerName: 'Aspect',
      width: 80,
      editable: true,
      cellStyle: { fontSize: '12px' },
    },
    {
      field: 'rights_type',
      headerName: 'Derechos',
      width: 120,
      editable: true,
      cellEditor: 'agSelectCellEditor',
      cellEditorParams: { values: ['free', 'licensed', 'restricted', 'unknown'] },
      valueFormatter: (p: { value: string }) => RIGHTS_LABELS[p.value] ?? p.value,
    },
    {
      field: 'cost_amount',
      headerName: 'Costo',
      width: 100,
      editable: true,
      type: 'numericColumn',
      valueFormatter: (p: { value: number | null }) => p.value != null ? String(p.value) : '—',
    },
    {
      field: 'cost_currency',
      headerName: 'Moneda',
      width: 85,
      editable: true,
      cellEditor: 'agSelectCellEditor',
      cellEditorParams: { values: ['USD', 'ARS', 'EUR', 'GBP'] },
    },
    {
      field: 'cost_unit',
      headerName: 'Unidad',
      width: 120,
      editable: true,
      cellEditor: 'agSelectCellEditor',
      cellEditorParams: { values: ['per_sec', 'per_min', 'flat'] },
      valueFormatter: (p) => COST_UNIT_LABELS[p.value] ?? p.value,
    },
    {
      field: 'link',
      headerName: 'Link',
      width: 160,
      editable: true,
      cellRenderer: LinkCell,
    },
    {
      field: 'screener_url',
      headerName: 'Screener',
      width: 160,
      editable: true,
      cellRenderer: LinkCell,
    },
    {
      headerName: '',
      width: 48,
      pinned: 'right',
      sortable: false,
      editable: false,
      cellRenderer: ({ data }: { data: Material }) => (
        <button
          onClick={(e) => { e.stopPropagation(); onDelete(data.id) }}
          className="h-full flex items-center justify-center text-[#444] hover:text-red-400 transition-colors"
        >
          <Trash2 className="h-3.5 w-3.5" />
        </button>
      ),
    },
  ], [providers, providerMap, onDelete])

  const defaultColDef = useMemo<ColDef>(() => ({
    resizable: true,
    sortable: true,
    suppressMovable: false,
    cellStyle: { display: 'flex', alignItems: 'center', color: '#ccc', fontSize: '13px' } as Record<string, string>,
  }), [])

  const onCellValueChanged = useCallback((e: CellValueChangedEvent<Material>) => {
    const { data, colDef, newValue } = e
    if (!colDef.field || newValue === e.oldValue) return
    onUpdate(data.id, { [colDef.field]: newValue || null } as Partial<Material>)
  }, [onUpdate])

  const onRowClicked = useCallback((e: { data: Material }) => {
    onSelect(e.data)
  }, [onSelect])

  return (
    <div className="flex-1 min-w-0 ag-theme-archival" style={{ height: '100%' }}>
      <AgGridReact
        rowData={materials}
        columnDefs={colDefs as ColDef[]}
        defaultColDef={defaultColDef}
        onCellValueChanged={onCellValueChanged}
        onRowClicked={onRowClicked}
        rowSelection="single"
        suppressRowClickSelection={false}
        animateRows
        enableCellTextSelection
        stopEditingWhenCellsLoseFocus
        getRowId={(params) => params.data.id}
      />
    </div>
  )
}
