'use client'
import { useCallback, useMemo } from 'react'
import { AgGridReact } from 'ag-grid-react'
import { AllCommunityModule, ModuleRegistry, themeQuartz } from 'ag-grid-community'
import type { ColDef, CellValueChangedEvent, ICellRendererParams, RowClickedEvent } from 'ag-grid-community'
import { cn, STATUS_LABELS, STATUS_COLORS, RIGHTS_LABELS, COST_UNIT_LABELS, formatDuration } from '@/lib/utils'
import type { Material, Provider, MaterialStatus } from '@/types/database'
import Image from 'next/image'
import { ExternalLink, Trash2, Copy } from 'lucide-react'

ModuleRegistry.registerModules([AllCommunityModule])

// ─── Theme ───────────────────────────────────────────────────────────────────

const darkTheme = themeQuartz.withParams({
  backgroundColor: '#1a1a1a',
  foregroundColor: '#cccccc',
  headerBackgroundColor: '#111111',
  headerTextColor: '#888888',
  headerColumnResizeHandleColor: '#333333',
  rowHoverColor: '#222222',
  oddRowBackgroundColor: '#161616',
  selectedRowBackgroundColor: '#2a1a0a',
  borderColor: '#2a2a2a',
  inputFocusBorder: { color: '#f97316', width: 1, style: 'solid' },
  rangeSelectionBorderColor: '#f97316',
  rangeSelectionBackgroundColor: 'rgba(249,115,22,0.08)',
  accentColor: '#f97316',
  fontSize: 12,
  rowHeight: 48,
  headerHeight: 38,
  wrapperBorderRadius: 0,
  popupShadow: '0 4px 24px rgba(0,0,0,0.7)',
  cardShadow: '0 4px 24px rgba(0,0,0,0.5)',
})

// ─── Constants ────────────────────────────────────────────────────────────────

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!

const MATERIAL_TYPES = ['video', 'foto', 'grafico', 'social_media', 'audio', 'otro']
const MATERIAL_TYPE_LABELS: Record<string, string> = {
  video: 'Video', foto: 'Foto', grafico: 'Gráfico',
  social_media: 'Social Media', audio: 'Audio', otro: 'Otro',
}
const MATERIAL_TYPE_INITIAL: Record<string, string> = {
  video: 'V', foto: 'F', grafico: 'G', social_media: 'S', audio: 'A', otro: 'O',
}

// ─── ID generation ────────────────────────────────────────────────────────────

function buildGeneratedId(
  material: Material,
  providerCode: string | undefined,
  providerName: string | undefined,
): string {
  const typeInitial = (material.material_type && MATERIAL_TYPE_INITIAL[material.material_type]) || 'M'
  const entryCode = material.entry_code || '----'
  const prov = (
    providerCode ||
    (providerName || '').replace(/\s+/g, '').toUpperCase().slice(0, 3) ||
    '---'
  ).toUpperCase().slice(0, 3)
  const quality = material.file_quality || 'SCR'
  const origId = (material.original_id || '').replace(/\s+/g, '_')
  const tags = (material.tags || '').trim().replace(/\s+/g, '_')

  const parts = [`${typeInitial}${entryCode}`, prov, quality]
  if (origId) parts.push(origId)
  if (tags) parts.push(tags)
  return parts.join('_')
}

// ─── Cell renderers ───────────────────────────────────────────────────────────

function FrameCell({ value }: { value: { storage_path: string }[] | undefined }) {
  if (!value?.length) return <div className="h-full flex items-center justify-center text-[#333]">—</div>
  const url = `${SUPABASE_URL}/storage/v1/object/public/frames/${value[0].storage_path}`
  return (
    <div className="h-full flex items-center pl-1">
      <div className="relative h-8 w-14 rounded overflow-hidden bg-[#2a2a2a]">
        <Image src={url} alt="" fill className="object-cover" sizes="56px" />
      </div>
    </div>
  )
}

function StatusCell({ value }: { value: MaterialStatus }) {
  if (!value) return <span className="text-[#444]">—</span>
  return (
    <span className={cn('inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium', STATUS_COLORS[value])}>
      {STATUS_LABELS[value]}
    </span>
  )
}

// Link cell: button-based so it doesn't intercept grid edit clicks
function LinkCell({ value }: { value: string | null }) {
  if (!value) return <span className="text-[#444]">—</span>
  return (
    <div className="flex items-center gap-1 min-w-0 w-full">
      <span className="truncate text-xs text-[#aaa]">
        {value.replace(/^https?:\/\/(www\.)?/, '')}
      </span>
      <button
        onMouseDown={e => e.stopPropagation()}
        onClick={e => {
          e.stopPropagation()
          window.open(value, '_blank', 'noopener,noreferrer')
        }}
        className="shrink-0 text-[#555] hover:text-orange-400 transition-colors"
        title="Abrir link"
      >
        <ExternalLink className="h-3 w-3" />
      </button>
    </div>
  )
}

function GeneratedIdCell({
  data,
  providerCodeMap,
  providerNameMap,
}: {
  data: Material
  providerCodeMap: Record<string, string>
  providerNameMap: Record<string, string>
}) {
  const providerCode = data.provider_id ? providerCodeMap[data.provider_id] : undefined
  const providerName = data.provider_id ? providerNameMap[data.provider_id] : undefined
  const id = buildGeneratedId(data, providerCode, providerName)
  return (
    <div className="flex items-center gap-1.5 min-w-0 w-full">
      <span className="font-mono text-[11px] text-amber-400 truncate flex-1">{id}</span>
      <button
        onMouseDown={e => e.stopPropagation()}
        onClick={e => {
          e.stopPropagation()
          navigator.clipboard.writeText(id)
        }}
        className="shrink-0 text-[#444] hover:text-amber-400 transition-colors"
        title="Copiar ID"
      >
        <Copy className="h-3 w-3" />
      </button>
    </div>
  )
}

// ─── Props ────────────────────────────────────────────────────────────────────

interface Props {
  materials: Material[]
  providers: Pick<Provider, 'id' | 'name' | 'code'>[]
  projectId: string
  onUpdate: (id: string, data: Partial<Material>) => void
  onSelect: (m: Material) => void
  onDelete: (id: string) => void
}

// ─── Grid ─────────────────────────────────────────────────────────────────────

export function MaterialGrid({ materials, providers, onUpdate, onSelect, onDelete }: Props) {
  const providerNameMap = useMemo(
    () => Object.fromEntries(providers.map(p => [p.id, p.name])),
    [providers],
  )
  const providerCodeMap = useMemo(
    () => Object.fromEntries(providers.filter(p => p.code).map(p => [p.id, p.code!])),
    [providers],
  )

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const colDefs = useMemo<ColDef<Material, any>[]>(() => ([
    // ── Pinned left ────────────────────────────────────────────────────────────
    {
      field: 'frames' as keyof Material,
      headerName: '',
      width: 72,
      pinned: 'left',
      editable: false,
      sortable: false,
      resizable: false,
      cellRenderer: FrameCell,
      cellStyle: { padding: '4px 6px' },
    },
    {
      field: 'entry_code',
      headerName: 'N°',
      width: 68,
      pinned: 'left',
      editable: true,
      sortable: true,
      cellStyle: { fontFamily: 'monospace', fontSize: '13px', color: '#f97316', fontWeight: '700', justifyContent: 'center' },
    },
    {
      field: 'title',
      headerName: 'Título',
      width: 220,
      pinned: 'left',
      editable: true,
      cellStyle: { fontWeight: '500', color: '#ededed' },
    },

    // ── Clasificación ──────────────────────────────────────────────────────────
    {
      field: 'material_type',
      headerName: 'Tipo',
      width: 130,
      editable: true,
      cellEditor: 'agSelectCellEditor',
      cellEditorParams: { values: ['', ...MATERIAL_TYPES] },
      valueFormatter: (p: { value: string }) => MATERIAL_TYPE_LABELS[p.value] ?? (p.value || '—'),
      cellStyle: { fontSize: '12px', color: '#aaa' },
    },
    {
      field: 'file_quality',
      headerName: 'Calidad',
      width: 88,
      editable: true,
      cellEditor: 'agSelectCellEditor',
      cellEditorParams: { values: ['SCR', 'HQD'] },
      valueFormatter: (p: { value: string | null }) => p.value || 'SCR',
      cellStyle: { fontFamily: 'monospace', fontSize: '12px', color: '#aaa' },
    },
    {
      field: 'status',
      headerName: 'Estado',
      width: 160,
      editable: true,
      cellEditor: 'agSelectCellEditor',
      cellEditorParams: { values: ['searching', 'screener_received', 'approved', 'order_sent', 'purchased'] },
      cellRenderer: StatusCell,
    },

    // ── Proveedor (read-only en grid — editar en el panel lateral) ─────────────
    {
      field: 'provider_id',
      headerName: 'Proveedor',
      width: 140,
      editable: false,
      sortable: true,
      valueFormatter: (p: { value: string }) => providerNameMap[p.value] ?? '—',
      cellStyle: { fontSize: '12px', color: '#f97316' },
      tooltipValueGetter: () => 'Doble clic en la fila para editar el proveedor en el panel',
    },

    // ── Técnico ────────────────────────────────────────────────────────────────
    {
      field: 'duration_sec',
      headerName: 'Duración',
      width: 95,
      editable: true,
      type: 'numericColumn',
      valueFormatter: (p: { value: number }) => formatDuration(p.value),
      cellStyle: { fontFamily: 'monospace', fontSize: '12px' },
    },
    {
      field: 'format',
      headerName: 'Formato',
      width: 88,
      editable: true,
      cellStyle: { fontSize: '12px' },
    },
    {
      field: 'resolution',
      headerName: 'Resolución',
      width: 95,
      editable: true,
      cellStyle: { fontSize: '12px' },
    },
    {
      field: 'fps',
      headerName: 'FPS',
      width: 60,
      editable: true,
      type: 'numericColumn',
      cellStyle: { fontFamily: 'monospace', fontSize: '12px' },
    },
    {
      field: 'aspect_ratio',
      headerName: 'Aspect',
      width: 75,
      editable: true,
      cellStyle: { fontSize: '12px' },
    },

    // ── Derechos y costo ───────────────────────────────────────────────────────
    {
      field: 'rights_type',
      headerName: 'Derechos',
      width: 115,
      editable: true,
      cellEditor: 'agSelectCellEditor',
      cellEditorParams: { values: ['unknown', 'free', 'licensed', 'restricted'] },
      valueFormatter: (p: { value: string }) => RIGHTS_LABELS[p.value] ?? p.value,
      cellStyle: { fontSize: '12px' },
    },
    {
      field: 'cost_amount',
      headerName: 'Costo',
      width: 90,
      editable: true,
      type: 'numericColumn',
      valueFormatter: (p: { value: number | null }) => p.value != null ? `$${p.value}` : '—',
      cellStyle: { fontFamily: 'monospace', fontSize: '12px', color: '#4ade80' },
    },
    {
      field: 'cost_currency',
      headerName: 'Moneda',
      width: 80,
      editable: true,
      cellEditor: 'agSelectCellEditor',
      cellEditorParams: { values: ['USD', 'ARS', 'EUR', 'GBP'] },
      cellStyle: { fontSize: '12px' },
    },
    {
      field: 'cost_unit',
      headerName: 'Unidad',
      width: 110,
      editable: true,
      cellEditor: 'agSelectCellEditor',
      cellEditorParams: { values: ['flat', 'per_sec', 'per_min'] },
      valueFormatter: (p: { value: string }) => COST_UNIT_LABELS[p.value] ?? p.value,
      cellStyle: { fontSize: '12px' },
    },

    // ── Identificación del archivo ─────────────────────────────────────────────
    {
      field: 'code',
      headerName: 'Cód. interno',
      width: 115,
      editable: true,
      cellStyle: { fontFamily: 'monospace', fontSize: '12px', color: '#888' },
    },
    {
      field: 'original_id',
      headerName: 'ID Original',
      width: 145,
      editable: true,
      cellStyle: { fontFamily: 'monospace', fontSize: '12px', color: '#888' },
    },
    {
      field: 'tags',
      headerName: 'Tags',
      width: 180,
      editable: true,
      cellStyle: { fontSize: '12px', color: '#888' },
    },

    // ── Links ──────────────────────────────────────────────────────────────────
    {
      field: 'link',
      headerName: 'Link',
      width: 190,
      editable: true,
      cellRenderer: LinkCell,
    },
    {
      field: 'screener_url',
      headerName: 'Screener URL',
      width: 190,
      editable: true,
      cellRenderer: LinkCell,
    },

    // ── Notas ─────────────────────────────────────────────────────────────────
    {
      field: 'notes',
      headerName: 'Notas',
      width: 220,
      editable: true,
      cellStyle: { fontSize: '12px', color: '#888' },
    },

    // ── Pinned right ───────────────────────────────────────────────────────────
    {
      headerName: 'ID GENERADO',
      width: 300,
      pinned: 'right',
      sortable: false,
      editable: false,
      resizable: true,
      cellRenderer: (p: ICellRendererParams<Material>) =>
        p.data ? (
          <GeneratedIdCell
            data={p.data}
            providerCodeMap={providerCodeMap}
            providerNameMap={providerNameMap}
          />
        ) : null,
      cellStyle: { paddingLeft: '8px', paddingRight: '4px' },
    },
    {
      headerName: '',
      width: 44,
      pinned: 'right',
      sortable: false,
      editable: false,
      resizable: false,
      cellRenderer: ({ data }: { data: Material }) => (
        <button
          onMouseDown={e => e.stopPropagation()}
          onClick={e => { e.stopPropagation(); onDelete(data.id) }}
          className="h-full w-full flex items-center justify-center text-[#444] hover:text-red-400 transition-colors"
        >
          <Trash2 className="h-3.5 w-3.5" />
        </button>
      ),
    },
  ] as ColDef<Material, any>[]), [providers, providerNameMap, providerCodeMap, onDelete])

  const defaultColDef = useMemo<ColDef>(() => ({
    resizable: true,
    sortable: true,
    suppressMovable: false,
    cellStyle: { display: 'flex', alignItems: 'center', color: '#ccc', fontSize: '13px' },
  }), [])

  const onCellValueChanged = useCallback((e: CellValueChangedEvent<Material>) => {
    const { data, colDef, newValue, oldValue } = e
    if (!colDef.field || newValue === oldValue) return
    // Convert empty string to null for nullable fields
    const val = (newValue === '' || newValue === undefined) ? null : newValue
    onUpdate(data.id, { [colDef.field]: val } as Partial<Material>)
  }, [onUpdate])

  const onRowClicked = useCallback((e: RowClickedEvent<Material>) => {
    if (e.data) onSelect(e.data)
  }, [onSelect])

  return (
    <div className="flex-1 min-w-0 min-h-0 overflow-hidden" style={{ height: '100%' }}>
      <AgGridReact<Material>
        theme={darkTheme}
        rowData={materials}
        columnDefs={colDefs}
        defaultColDef={defaultColDef}
        onCellValueChanged={onCellValueChanged}
        onRowClicked={onRowClicked}
        rowSelection="single"
        suppressRowClickSelection={false}
        animateRows={false}
        enableCellTextSelection={false}
        stopEditingWhenCellsLoseFocus
        singleClickEdit={false}
        getRowId={params => params.data.id}
        tooltipShowDelay={800}
      />
    </div>
  )
}
