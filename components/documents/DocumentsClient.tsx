'use client'
import { useState, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Header } from '@/components/layout/Header'
import { Button } from '@/components/ui/button'
import { toast } from 'sonner'
import { Upload, FolderOpen, FileText, Trash2, Download, Filter } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { Document } from '@/types/database'

const TYPE_LABELS: Record<string, string> = {
  contract: 'Contrato',
  invoice: 'Factura',
  receipt: 'Recibo',
  other: 'Otro',
}

const TYPE_COLORS: Record<string, string> = {
  contract: 'bg-blue-900/30 text-blue-400 border-blue-900/50',
  invoice: 'bg-yellow-900/30 text-yellow-400 border-yellow-900/50',
  receipt: 'bg-green-900/30 text-green-400 border-green-900/50',
  other: 'bg-[#2a2a2a] text-[#888] border-[#3a3a3a]',
}

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!

interface Props {
  projectId: string
  initialDocuments: Document[]
  orders: { id: string; provider: { name: string } | null }[]
  userEmail: string
}

export function DocumentsClient({ projectId, initialDocuments, orders, userEmail }: Props) {
  const [documents, setDocuments] = useState(initialDocuments)
  const [uploading, setUploading] = useState(false)
  const [filterType, setFilterType] = useState<string>('all')
  const [filterOrder, setFilterOrder] = useState<string>('all')
  const [uploadForm, setUploadForm] = useState({ type: 'contract', order_id: '', notes: '' })
  const fileInputRef = useRef<HTMLInputElement>(null)

  async function handleUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const files = e.target.files
    if (!files?.length) return
    setUploading(true)
    const supabase = createClient()

    for (const file of Array.from(files)) {
      const ext = file.name.split('.').pop()
      const path = `${projectId}/${uploadForm.type}/${Date.now()}-${file.name}`
      const { error: uploadError } = await supabase.storage.from('documents').upload(path, file)
      if (uploadError) { toast.error(`Error subiendo ${file.name}`); continue }

      const { data, error } = await supabase
        .from('documents')
        .insert({
          project_id: projectId,
          order_id: uploadForm.order_id || null,
          type: uploadForm.type as Document['type'],
          filename: file.name,
          storage_path: path,
          notes: uploadForm.notes || null,
        })
        .select('*, order:orders(id, provider:providers(name))')
        .single()

      if (!error && data) {
        setDocuments(prev => [data, ...prev])
      }
    }

    setUploading(false)
    if (fileInputRef.current) fileInputRef.current.value = ''
    toast.success('Documento/s subido/s')
  }

  async function handleDelete(doc: Document) {
    if (!confirm(`¿Eliminar "${doc.filename}"?`)) return
    const supabase = createClient()
    await supabase.storage.from('documents').remove([doc.storage_path])
    await supabase.from('documents').delete().eq('id', doc.id)
    setDocuments(prev => prev.filter(d => d.id !== doc.id))
    toast.success('Documento eliminado')
  }

  function getDownloadUrl(doc: Document) {
    return `${SUPABASE_URL}/storage/v1/object/documents/${doc.storage_path}`
  }

  const filtered = documents.filter(d => {
    if (filterType !== 'all' && d.type !== filterType) return false
    if (filterOrder !== 'all' && d.order_id !== filterOrder) return false
    return true
  })

  // Group by order for checklist view
  const byOrder = orders.map(order => {
    const docs = documents.filter(d => d.order_id === order.id)
    return {
      order,
      docs,
      hasContract: docs.some(d => d.type === 'contract'),
      hasInvoice: docs.some(d => d.type === 'invoice'),
      hasReceipt: docs.some(d => d.type === 'receipt'),
    }
  })

  return (
    <div className="flex flex-col h-full">
      <Header title="Documentos" description="Contratos, facturas y recibos por pedido" email={userEmail} />

      <div className="flex-1 overflow-y-auto p-6">
        <div className="max-w-5xl space-y-6">
          {/* Upload panel */}
          <div className="bg-[#1a1a1a] border border-[#242424] rounded-xl p-5">
            <h3 className="text-sm font-semibold text-[#ededed] mb-4">Subir documento</h3>
            <div className="grid grid-cols-3 gap-3 mb-4">
              <div className="space-y-1.5">
                <label className="text-xs text-[#888] uppercase tracking-wide">Tipo</label>
                <select
                  value={uploadForm.type}
                  onChange={e => setUploadForm(f => ({ ...f, type: e.target.value }))}
                  className="w-full h-9 rounded-lg border border-[#2a2a2a] bg-[#111] px-3 text-sm text-[#ededed] focus:outline-none focus:border-orange-500"
                >
                  <option value="contract">Contrato</option>
                  <option value="invoice">Factura</option>
                  <option value="receipt">Recibo de pago</option>
                  <option value="other">Otro</option>
                </select>
              </div>
              <div className="space-y-1.5">
                <label className="text-xs text-[#888] uppercase tracking-wide">Pedido asociado</label>
                <select
                  value={uploadForm.order_id}
                  onChange={e => setUploadForm(f => ({ ...f, order_id: e.target.value }))}
                  className="w-full h-9 rounded-lg border border-[#2a2a2a] bg-[#111] px-3 text-sm text-[#ededed] focus:outline-none focus:border-orange-500"
                >
                  <option value="">Sin vincular</option>
                  {orders.map(o => <option key={o.id} value={o.id}>{o.provider?.name ?? o.id.slice(0, 8)}</option>)}
                </select>
              </div>
              <div className="space-y-1.5">
                <label className="text-xs text-[#888] uppercase tracking-wide">Notas</label>
                <input
                  value={uploadForm.notes}
                  onChange={e => setUploadForm(f => ({ ...f, notes: e.target.value }))}
                  placeholder="Opcional..."
                  className="w-full h-9 rounded-lg border border-[#2a2a2a] bg-[#111] px-3 text-sm text-[#ededed] placeholder:text-[#444] focus:outline-none focus:border-orange-500"
                />
              </div>
            </div>
            <label className="flex items-center justify-center gap-2 h-12 border border-dashed border-[#2a2a2a] rounded-lg cursor-pointer hover:border-orange-500/50 hover:bg-orange-500/5 transition-colors">
              <Upload className="h-4 w-4 text-[#666]" />
              <span className="text-sm text-[#666]">{uploading ? 'Subiendo...' : 'Seleccioná archivos (PDF, DOC, JPG...)'}</span>
              <input ref={fileInputRef} type="file" multiple className="hidden" onChange={handleUpload} disabled={uploading} />
            </label>
          </div>

          {/* Checklist by order */}
          {byOrder.length > 0 && (
            <div>
              <h3 className="text-xs font-semibold text-[#666] uppercase tracking-wider mb-3">Checklist por pedido</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {byOrder.map(({ order, hasContract, hasInvoice, hasReceipt }) => (
                  <div key={order.id} className="bg-[#1a1a1a] border border-[#242424] rounded-xl p-4">
                    <p className="text-sm font-medium text-[#ededed] mb-3">{order.provider?.name ?? 'Sin proveedor'}</p>
                    <div className="space-y-2">
                      <CheckRow label="Contrato" ok={hasContract} />
                      <CheckRow label="Factura" ok={hasInvoice} />
                      <CheckRow label="Recibo de pago" ok={hasReceipt} />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Filters */}
          <div className="flex items-center gap-2">
            <Filter className="h-3.5 w-3.5 text-[#555]" />
            <select
              value={filterType}
              onChange={e => setFilterType(e.target.value)}
              className="h-7 px-2 rounded-md border border-[#2a2a2a] bg-[#111] text-xs text-[#ededed] focus:outline-none"
            >
              <option value="all">Todos los tipos</option>
              <option value="contract">Contratos</option>
              <option value="invoice">Facturas</option>
              <option value="receipt">Recibos</option>
              <option value="other">Otros</option>
            </select>
            <select
              value={filterOrder}
              onChange={e => setFilterOrder(e.target.value)}
              className="h-7 px-2 rounded-md border border-[#2a2a2a] bg-[#111] text-xs text-[#ededed] focus:outline-none"
            >
              <option value="all">Todos los pedidos</option>
              <option value="">Sin pedido</option>
              {orders.map(o => <option key={o.id} value={o.id}>{o.provider?.name ?? o.id.slice(0, 8)}</option>)}
            </select>
          </div>

          {/* Document list */}
          {filtered.length === 0 ? (
            <div className="text-center py-12">
              <FolderOpen className="h-10 w-10 text-[#333] mx-auto mb-3" />
              <p className="text-sm text-[#666]">Sin documentos. Subí contratos, facturas y recibos arriba.</p>
            </div>
          ) : (
            <div className="space-y-2">
              {filtered.map(doc => {
                const order = doc as never as { order: { provider: { name: string } | null } | null }
                return (
                  <div key={doc.id} className="flex items-center gap-3 bg-[#1a1a1a] border border-[#242424] rounded-xl px-4 py-3 hover:border-[#333] transition-colors">
                    <FileText className="h-4 w-4 text-[#666] shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-[#ededed] truncate">{doc.filename}</p>
                      <div className="flex items-center gap-2 mt-0.5">
                        <span className={cn('text-xs px-1.5 py-0.5 rounded border', TYPE_COLORS[doc.type])}>
                          {TYPE_LABELS[doc.type]}
                        </span>
                        {(order as never as { order: { provider: { name: string } | null } | null }).order?.provider?.name && (
                          <span className="text-xs text-[#555]">{(order as never as { order: { provider: { name: string } | null } | null }).order?.provider?.name}</span>
                        )}
                        <span className="text-xs text-[#444]">
                          {new Date(doc.uploaded_at).toLocaleDateString('es-AR', { day: '2-digit', month: 'short', year: 'numeric' })}
                        </span>
                        {doc.notes && <span className="text-xs text-[#444] italic truncate max-w-xs">{doc.notes}</span>}
                      </div>
                    </div>
                    <div className="flex items-center gap-1 shrink-0">
                      <a
                        href={`${SUPABASE_URL}/storage/v1/object/documents/${doc.storage_path}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="h-7 w-7 flex items-center justify-center text-[#555] hover:text-orange-400 transition-colors"
                      >
                        <Download className="h-3.5 w-3.5" />
                      </a>
                      <Button variant="ghost" size="icon" onClick={() => handleDelete(doc)} className="hover:text-red-400">
                        <Trash2 className="h-3.5 w-3.5 text-[#555]" />
                      </Button>
                    </div>
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

function CheckRow({ label, ok }: { label: string; ok: boolean }) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-xs text-[#888]">{label}</span>
      <span className={cn('text-xs font-medium px-2 py-0.5 rounded-full', ok ? 'bg-green-900/30 text-green-400' : 'bg-[#222] text-[#555]')}>
        {ok ? '✓ OK' : 'Pendiente'}
      </span>
    </div>
  )
}
