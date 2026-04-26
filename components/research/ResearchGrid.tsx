'use client'
import { useCallback, useMemo } from 'react'
import { AgGridReact } from 'ag-grid-react'
import { AllCommunityModule, ModuleRegistry, themeQuartz } from 'ag-grid-community'
import type { ColDef, CellValueChangedEvent, ICellRendererParams } from 'ag-grid-community'

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
import { ExternalLink, Trash2, Check, X, Copy, ArrowUpRight } from 'lucide-react'
import type { ResearchItem, Provider, ProviderRate } from '@/types/database'

ModuleRegistry.registerModules([AllCommunityModule])

const FILE_TYPES = ['SOURCE ON LINE VIDEO', 'REQUESTED VIDEO', 'REQUESTED GRAPHIC', 'SOURCE ON LINE AUDIO', 'OTHER']

const FILE_TYPE_ABBREV: Record<string, string> = {
  'SOURCE ON LINE VIDEO': 'SOV',
  'REQUESTED VIDEO': 'RQV',
  'REQUESTED GRAPHIC': 'RQG',
  'SOURCE ON LINE AUDIO': 'SOA',
  'OTHER': 'OTR',
}

function buildGeneratedId(item: ResearchItem): string {
  const typeAbbrev = (item.file_type && FILE_TYPE_ABBREV[item.file_type]) || 'MAT'
  const quality = item.file_quality || 'SCR'
  const supplier = (item.supplier_name || '')
    .replace(/\s+/g, '')
    .toUpperCase()
    .slice(0, 3) || '---'
  const title = (item.subject || '')
    .toUpperCase()
    .replace(/[^A-Z0-9\s]/g, '')
    .trim()
    .replace(/\s+/g, '_')
    .slice(0, 30) || 'UNTITLED'
  return `${typeAbbrev}_${quality}_${supplier}_${title}`
}

function GeneratedIdCell({ data }: { data: ResearchItem }) {
  const id = buildGeneratedId(data)
  const isEmpty = !data.file_type && !data.supplier_name && !data.subject
  if (isEmpty) return <span className="text-[#444]">—</span>
  return (
    <div className="flex items-center gap-1.5 min-w-0">
      <span className="font-mono text-[11px] text-amber-400 truncate">{id}</span>
      <button
        onClick={(e) => {
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

function LinkCell({ value }: { value: string | null }) {
  if (!value) return <span className="text-[#444]">—</span>
  return (
    <a
      href={value} target="_blank" rel="noopener noreferrer"
      onClick={e => e.stopPropagation()}
      className="flex items-center gap-1 text-orange-400 hover:text-orange-300 text-xs truncate max-w-full"
    >
      <ExternalLink className="h-3 w-3 shrink-0" />
      <span className="truncate">{value.replace(/^https?:\/\/(www\.)?/, '')}</span>
    </a>
  )
}

function BoolCell({ value }: { value: boolean }) {
  return value
    ? <span className="inline-flex items-center gap-1 text-xs text-emerald-400 font-medium"><Check className="h-3 w-3" /> YES</span>
    : <span className="inline-flex items-center gap-1 text-xs text-[#555]"><X className="h-3 w-3" /> NO</span>
}

function TextareaCell({ value }: { value: string | null }) {
  if (!value) return <span className="text-[#444]">—</span>
  return (
    <span className="text-xs text-[#aaa] leading-tight line-clamp-2 whitespace-pre-wrap">
      {value.length > 120 ? value.slice(0, 120) + '…' : value}
    </span>
  )
}

interface Props {
  items: ResearchItem[]
  providers: Pick<Provider, 'id' | 'name'>[]
  providerRates: Record<string, ProviderRate[]>
  onUpdate: (id: string, data: Partial<ResearchItem>) => void
  onDelete: (id: string) => void
  onPromote: (item: ResearchItem) => void
}

export function ResearchGrid({ items, providers, providerRates, onUpdate, onDelete, onPromote }: Props) {
  const providerMap = useMemo(
    () => Object.fromEntries(providers.map(p => [p.id, p.name])),
    [providers]
  )

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const colDefs = useMemo<ColDef<ResearchItem, any>[]>(() => ([
    // ── Identification ──────────────────────────────────────────────────────
    {
      field: 'id_number',
      headerName: '#',
      width: 52,
      pinned: 'left',
      editable: true,
      type: 'numericColumn',
      cellStyle: { color: '#555', fontSize: '11px', fontFamily: 'monospace', justifyContent: 'center' },
    },
    {
      field: 'shot_code',
      headerName: 'SHOT',
      width: 180,
      pinned: 'left',
      editable: true,
      cellStyle: { fontFamily: 'monospace', fontSize: '11px', color: '#888', letterSpacing: '0.02em' },
    },
    {
      field: 'subject',
      headerName: 'SUBJECT',
      flex: 1,
      minWidth: 220,
      editable: true,
      cellStyle: { fontWeight: '500', color: '#e8e8e8', whiteSpace: 'normal', lineHeight: '1.4', paddingTop: '8px', paddingBottom: '8px' },
      wrapText: true,
      autoHeight: true,
    },
    {
      field: 'date',
      headerName: 'DATE',
      width: 118,
      editable: true,
      cellEditor: 'agDateStringCellEditor',
      valueFormatter: (p) => p.value ? String(p.value).slice(0, 10) : '—',
      cellStyle: { fontFamily: 'monospace', fontSize: '12px', color: '#888' },
    },
    {
      field: 'ep',
      headerName: 'EP',
      width: 80,
      editable: true,
      cellStyle: { fontSize: '12px', color: '#888' },
    },
    {
      field: 'scene',
      headerName: 'SCENE',
      width: 180,
      editable: true,
      cellStyle: { fontSize: '12px', color: '#bbb' },
      wrapText: true,
      autoHeight: true,
    },

    // ── Supplier ────────────────────────────────────────────────────────────
    {
      field: 'supplier_name',
      headerName: 'SUPPLIER',
      width: 120,
      editable: true,
      cellStyle: { fontSize: '12px', color: '#f97316', fontWeight: '500' },
    },
    {
      field: 'provider_id',
      headerName: 'PROVEEDOR',
      width: 150,
      editable: true,
      cellEditor: 'agSelectCellEditor',
      cellEditorParams: { values: ['', ...providers.map(p => p.id)] },
      valueFormatter: (p: { value: string }) => providerMap[p.value] ?? '—',
      cellStyle: { fontSize: '12px', color: '#f97316', fontWeight: '500' },
    },
    {
      field: 'provider_rate_id',
      headerName: 'TARIFA',
      width: 180,
      editable: true,
      cellEditor: 'agSelectCellEditor',
      cellEditorParams: (p: { data: ResearchItem }) => {
        const rates = (p.data?.provider_id ? providerRates[p.data.provider_id] : undefined) ?? []
        return { values: ['', ...rates.map(r => r.id)] }
      },
      valueFormatter: (p: { value: string; data: ResearchItem }) => {
        const rates = p.data?.provider_id ? (providerRates[p.data.provider_id] ?? []) : []
        const rate = rates.find(r => r.id === p.value)
        if (!rate) return '—'
        return `${rate.label}${rate.rate_value != null ? ` · $${rate.rate_value}` : ''}${rate.rate_timing ? `/${rate.rate_timing}` : ''}`
      },
      cellStyle: { fontSize: '11px', color: '#aaa' },
    },
    {
      field: 'delivery_timing',
      headerName: 'DELIVERY TIMING',
      width: 200,
      editable: true,
      cellRenderer: TextareaCell,
      cellEditor: 'agLargeTextCellEditor',
      cellEditorPopup: true,
      cellEditorParams: { rows: 5, cols: 40 },
      wrapText: true,
      autoHeight: true,
      cellStyle: { paddingTop: '6px', paddingBottom: '6px' },
    },
    {
      field: 'location',
      headerName: 'LOCATION',
      width: 160,
      editable: true,
      cellStyle: { fontSize: '12px', color: '#aaa' },
    },

    // ── File / Screener ─────────────────────────────────────────────────────
    {
      field: 'file_type',
      headerName: 'FILE TYPE',
      width: 180,
      editable: true,
      cellEditor: 'agSelectCellEditor',
      cellEditorParams: { values: ['', ...FILE_TYPES] },
      cellStyle: { fontSize: '11px', color: '#888' },
    },
    {
      field: 'file_quality',
      headerName: 'QUALITY',
      width: 95,
      editable: true,
      cellEditor: 'agSelectCellEditor',
      cellEditorParams: { values: ['SCR', 'HQD'] },
      valueFormatter: (p: { value: string | null }) => p.value || 'SCR',
      cellStyle: { fontSize: '11px', color: '#aaa', fontFamily: 'monospace' },
    },
    {
      field: 'supplier_clip_id',
      headerName: 'ID SCREENER',
      width: 130,
      editable: true,
      cellStyle: { fontFamily: 'monospace', fontSize: '11px', color: '#888' },
    },
    {
      field: 'screener_filename',
      headerName: 'SCREENER FILE',
      width: 220,
      editable: true,
      cellStyle: { fontFamily: 'monospace', fontSize: '11px', color: '#888' },
    },

    // ── Content ─────────────────────────────────────────────────────────────
    {
      field: 'description',
      headerName: 'DESCRIPTION',
      width: 260,
      editable: true,
      cellRenderer: TextareaCell,
      cellEditor: 'agLargeTextCellEditor',
      cellEditorPopup: true,
      cellEditorParams: { rows: 6, cols: 50 },
      wrapText: true,
      autoHeight: true,
      cellStyle: { paddingTop: '6px', paddingBottom: '6px' },
    },
    {
      field: 'log',
      headerName: 'LOG',
      width: 280,
      editable: true,
      cellRenderer: TextareaCell,
      cellEditor: 'agLargeTextCellEditor',
      cellEditorPopup: true,
      cellEditorParams: { rows: 10, cols: 60 },
      wrapText: true,
      autoHeight: true,
      cellStyle: { paddingTop: '6px', paddingBottom: '6px' },
    },
    {
      field: 'link_scr',
      headerName: 'LINK SCR',
      width: 180,
      editable: true,
      cellRenderer: LinkCell,
    },
    {
      field: 'tags',
      headerName: 'TAGS',
      width: 160,
      editable: true,
      cellStyle: { fontSize: '12px', color: '#888' },
    },

    // ── Pricing ─────────────────────────────────────────────────────────────
    {
      field: 'usd_cost',
      headerName: 'USD',
      width: 90,
      editable: true,
      type: 'numericColumn',
      valueFormatter: (p) => p.value != null ? `$${Number(p.value).toFixed(2)}` : '—',
      cellStyle: { fontFamily: 'monospace', fontSize: '12px', color: '#4ade80', fontWeight: '500' },
    },
    {
      field: 'special_conditions',
      headerName: 'SPECIAL CONDITIONS',
      width: 240,
      editable: true,
      cellRenderer: TextareaCell,
      cellEditor: 'agLargeTextCellEditor',
      cellEditorPopup: true,
      cellEditorParams: { rows: 6, cols: 50 },
      wrapText: true,
      autoHeight: true,
      cellStyle: { paddingTop: '6px', paddingBottom: '6px' },
    },

    // ── Rights Management ────────────────────────────────────────────────────
    {
      field: 'send_scr',
      headerName: 'SEND SCR',
      width: 95,
      editable: true,
      cellEditor: 'agSelectCellEditor',
      cellEditorParams: { values: [true, false] },
      cellRenderer: BoolCell,
      valueFormatter: (p) => p.value ? 'YES' : 'NO',
    },
    {
      field: 'support_supplier',
      headerName: 'SUPPORT SUPPLIER',
      width: 150,
      editable: true,
      cellStyle: { fontSize: '12px', color: '#aaa' },
    },
    {
      field: 'image_voice_rights',
      headerName: 'IMAGE/VOICE RIGHTS',
      width: 160,
      editable: true,
      cellStyle: { fontSize: '12px', color: '#aaa' },
    },
    {
      field: 'rights_supplier',
      headerName: 'RIGHTS SUPPLIER',
      width: 140,
      editable: true,
      cellStyle: { fontSize: '12px', color: '#aaa' },
    },
    {
      field: 'other_rights',
      headerName: 'OTHER RIGHTS / BRANDS',
      width: 170,
      editable: true,
      cellStyle: { fontSize: '12px', color: '#aaa' },
    },
    {
      field: 'media',
      headerName: 'MEDIA',
      width: 120,
      editable: true,
      cellStyle: { fontSize: '12px', color: '#aaa' },
    },
    {
      field: 'territory',
      headerName: 'TERRITORY',
      width: 130,
      editable: true,
      cellStyle: { fontSize: '12px', color: '#aaa' },
    },
    {
      field: 'duration_rights',
      headerName: 'DURATION',
      width: 120,
      editable: true,
      cellStyle: { fontSize: '12px', color: '#aaa' },
    },
    {
      field: 'in_context_promo',
      headerName: 'IN CONTEXT PROMO',
      width: 150,
      editable: true,
      cellEditor: 'agSelectCellEditor',
      cellEditorParams: { values: [true, false] },
      cellRenderer: BoolCell,
      valueFormatter: (p) => p.value ? 'YES' : 'NO',
    },

    // ── Generated ID ────────────────────────────────────────────────────────
    {
      headerName: 'ID GENERADO',
      width: 340,
      editable: false,
      sortable: false,
      pinned: 'right',
      cellRenderer: (p: ICellRendererParams<ResearchItem>) => p.data ? <GeneratedIdCell data={p.data} /> : null,
      cellStyle: { paddingRight: '4px' },
    },

    // ── Actions ──────────────────────────────────────────────────────────────
    {
      headerName: '',
      width: 80,
      pinned: 'right',
      sortable: false,
      editable: false,
      cellRenderer: (p: ICellRendererParams<ResearchItem>) => (
        <div className="h-full flex items-center justify-center gap-1">
          <button
            onClick={(e) => { e.stopPropagation(); if (p.data) onPromote(p.data) }}
            title="Promover a Material"
            className="p-1 rounded text-[#444] hover:text-orange-400 hover:bg-orange-500/10 transition-colors"
          >
            <ArrowUpRight className="h-3.5 w-3.5" />
          </button>
          <button
            onClick={(e) => { e.stopPropagation(); if (p.data) onDelete(p.data.id) }}
            title="Eliminar"
            className="p-1 rounded text-[#444] hover:text-red-400 hover:bg-red-500/10 transition-colors"
          >
            <Trash2 className="h-3.5 w-3.5" />
          </button>
        </div>
      ),
    },
  ] as ColDef<ResearchItem, any>[]), [providers, providerMap, providerRates, onDelete, onPromote])

  const defaultColDef = useMemo<ColDef>(() => ({
    resizable: true,
    sortable: true,
    suppressMovable: false,
    cellStyle: { display: 'flex', alignItems: 'center', color: '#bbb', fontSize: '12px', borderColor: '#1e1e1e' },
  }), [])

  const onCellValueChanged = useCallback((e: CellValueChangedEvent<ResearchItem>) => {
    const { data, colDef, newValue, oldValue } = e
    if (!colDef.field || newValue === oldValue) return
    onUpdate(data.id, { [colDef.field]: newValue === '' ? null : newValue } as Partial<ResearchItem>)
  }, [onUpdate])

  return (
    <div className="flex-1 min-w-0" style={{ height: '100%' }}>
      <AgGridReact<ResearchItem>
        theme={darkTheme}
        rowData={items}
        columnDefs={colDefs}
        defaultColDef={defaultColDef}
        onCellValueChanged={onCellValueChanged}
        animateRows
        enableCellTextSelection
        stopEditingWhenCellsLoseFocus
        getRowId={(p) => p.data.id}
        rowHeight={48}
        headerHeight={38}
      />
    </div>
  )
}
