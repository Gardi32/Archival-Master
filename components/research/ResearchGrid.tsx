'use client'
import { useCallback, useMemo } from 'react'
import { AgGridReact } from 'ag-grid-react'
import 'ag-grid-community/styles/ag-grid.css'
import 'ag-grid-community/styles/ag-theme-quartz.css'
import { AllCommunityModule, ModuleRegistry } from 'ag-grid-community'
import type { ColDef, CellValueChangedEvent, ICellRendererParams } from 'ag-grid-community'
import { ExternalLink, Trash2, Check, X } from 'lucide-react'
import type { ResearchItem } from '@/types/database'

ModuleRegistry.registerModules([AllCommunityModule])

const FILE_TYPES = ['SOURCE ON LINE VIDEO', 'REQUESTED VIDEO', 'REQUESTED GRAPHIC', 'SOURCE ON LINE AUDIO', 'OTHER']

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
  onUpdate: (id: string, data: Partial<ResearchItem>) => void
  onDelete: (id: string) => void
}

export function ResearchGrid({ items, onUpdate, onDelete }: Props) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const colDefs = useMemo<ColDef<ResearchItem, any>[]>(() => ([
    // ── Identification ──────────────────────────────────────────────────────
    {
      field: 'id_number',
      headerName: '#',
      width: 56,
      pinned: 'left',
      editable: true,
      type: 'numericColumn',
      cellStyle: { color: '#666', fontSize: '12px', fontFamily: 'monospace' },
    },
    {
      field: 'shot_code',
      headerName: 'SHOT',
      width: 210,
      pinned: 'left',
      editable: true,
      cellStyle: { fontFamily: 'monospace', fontSize: '11px', color: '#aaa' },
    },
    {
      field: 'subject',
      headerName: 'SUBJECT',
      flex: 1,
      minWidth: 220,
      editable: true,
      cellStyle: { fontWeight: '500', color: '#ededed', whiteSpace: 'normal', lineHeight: '1.35' },
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
      width: 110,
      editable: true,
      cellStyle: { fontSize: '12px', color: '#ededed', fontWeight: '500' },
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
      width: 88,
      editable: true,
      type: 'numericColumn',
      valueFormatter: (p) => p.value != null ? `$${Number(p.value).toFixed(2)}` : '—',
      cellStyle: { fontFamily: 'monospace', fontSize: '12px', color: '#ededed' },
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

    // ── Actions ──────────────────────────────────────────────────────────────
    {
      headerName: '',
      width: 44,
      pinned: 'right',
      sortable: false,
      editable: false,
      cellRenderer: (p: ICellRendererParams<ResearchItem>) => (
        <button
          onClick={(e) => { e.stopPropagation(); if (p.data) onDelete(p.data.id) }}
          className="h-full flex items-center justify-center text-[#444] hover:text-red-400 transition-colors"
        >
          <Trash2 className="h-3.5 w-3.5" />
        </button>
      ),
    },
  ] as ColDef<ResearchItem, any>[]), [onDelete])

  const defaultColDef = useMemo<ColDef>(() => ({
    resizable: true,
    sortable: true,
    suppressMovable: false,
    cellStyle: { display: 'flex', alignItems: 'center', color: '#ccc', fontSize: '13px' },
  }), [])

  const onCellValueChanged = useCallback((e: CellValueChangedEvent<ResearchItem>) => {
    const { data, colDef, newValue, oldValue } = e
    if (!colDef.field || newValue === oldValue) return
    onUpdate(data.id, { [colDef.field]: newValue === '' ? null : newValue } as Partial<ResearchItem>)
  }, [onUpdate])

  return (
    <div className="flex-1 min-w-0 ag-theme-archival" style={{ height: '100%' }}>
      <AgGridReact<ResearchItem>
        rowData={items}
        columnDefs={colDefs}
        defaultColDef={defaultColDef}
        onCellValueChanged={onCellValueChanged}
        animateRows
        enableCellTextSelection
        stopEditingWhenCellsLoseFocus
        getRowId={(p) => p.data.id}
        rowHeight={48}
      />
    </div>
  )
}
