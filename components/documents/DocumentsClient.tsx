'use client'
import { useState, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Header } from '@/components/layout/Header'
import { Button } from '@/components/ui/button'
import { Dialog } from '@/components/ui/dialog'
import { toast } from 'sonner'
import { Upload, FolderOpen, FileText, Trash2, Download, Filter, Eye, X, Loader2, ExternalLink } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { Document } from '@/types/database'

const TYPE_LABELS: Record<string, string> = {
  contract: 'Contrato',
  invoice: 'Factura',
  receipt: 'Recibo',
  script: 'Guion',
  brief: 'Brief',
  storyboard: 'Storyboard',
  other: 'Otro',
}

const TYPE_COLORS: Record<string, string> = {
  contract: 'bg-blue-900/30 text-blue-400 border-blue-900/50',
  invoice: 'bg-yellow-900/30 text-yellow-400 border-yellow-900/50',
  receipt: 'bg-green-900/30 text-green-400 border-green-900/50',
  script: 'bg-purple-900/30 text-purple-400 border-purple-900/50',
  brief: 'bg-cyan-900/30 text-cyan-400 border-cyan-900/50',
  storyboard: 'bg-pink-900/30 text-pink-400 border-pink-900/50',
  other: 'bg-[#2a2a2a] text-[#888] border-[#3a3a3a]',
}

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!

function getFileExt(filename: string) {
  return filename.split('.').pop()?.toLowerCase() ?? ''
}

function isImage(filename: string) {
  return ['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg'].includes(getFileExt(filename))
}

function isPdf(filename: string) {
  return getFileExt(filename) === 'pdf'
}

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
  const [uploadForm, setUploadForm] = useState({ type: 'script', order_id: '', notes: '' })
  const [viewerDoc, setViewerDoc] = useState<Document | null>(null)
  const [viewerUrl, setViewerUrl] = useState<string | null>(null)
  const [loadingViewer, setLoadingViewer] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  async function handleUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const files = e.target.files
    if (!files?.length) return
    setUploading(true)
    const supabase = createClient()

    for (const file of Array.from(files)) {
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

      if (!error && data) setDocuments(prev => [data, ...prev])
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

  async function handleView(doc: Document) {
    setViewerDoc(doc)
    setViewerUrl(null)
    setLoadingViewer(true)
    const supabase = createClient()
    const { data, error } = await supabase.storage.from('documents').createSignedUrl(doc.storage_path, 3600)
    if (error || !data) {
      toast.error('No se pudo obtener el enlace')
      setLoadingViewer(false)
      setViewerDoc(null)
      return
    }
    setViewerUrl(data.signedUrl)
    setLoadingViewer(false)
  }

  const filtered = documents.filter(d => {
    if (filterType !== 'all' && d.type !== filterType) return false
    if (filterOrder !== 'all' && d.order_id !== filterOrder) return false
    return true
  })

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

  // group creative docs (not tied to orders)
  const creativeDocs = documents.filter(d => ['script', 'brief', 'storyboard'].includes(d.type))

  return (
    <div className="flex flex-col h-full">
      <Header title="Documentos" description="Guiones, briefs, contratos y archivos del proyecto" email={userEmail} />

      <div className="flex-1 overflow-y-auto p-6">
        <div className="max-w-5xl space-y-6">

          {/* Creative docs highlight */}
          {creativeDocs.length > 0 && (
            <div className="bg-[#1a1a1a] border border-[#242424] rounded-xl p-5">
              <h3 className="text-xs font-semibold text-[#666] uppercase tracking-wider mb-3">Guiones y Briefs</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {creativeDocs.map(doc => (
                  <button
                    key={doc.id}
                    onClick={() => handleView(doc)}
                    className="flex items-start gap-3 bg-[#111] border border-[#2a2a2a] rounded-xl p-4 text-left hover:border-orange-500/40 hover:bg-[#1a1a1a] transition-all group"
                  >
                    <div className="h-10 w-10 rounded-lg bg-[#1f1f1f] border border-[#333] flex items-center justify-center shrink-0 group-hover:border-orange-500/40 transition-colors">
                      <FileText className="h-5 w-5 text-[#555] group-hover:text-orange-400 transition-colors" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-[#ededed] truncate">{doc.filename}</p>
                      <span className={cn('text-xs px-1.5 py-0.5 rounded border mt-1 inline-block', TYPE_COLORS[doc.type])}>
                        {TYPE_LABELS[doc.type]}
                      </span>
                    </div>
                    <Eye className="h-4 w-4 text-[#444] group-hover:text-orange-400 transition-colors shrink-0 mt-0.5" />
                  </button>
                ))}
              </div>
            </div>
          )}

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
                  <optgroup label="Producción creativa">
                    <option value="script">Guion</option>
                    <option value="brief">Brief</option>
                    <option value="storyboard">Storyboard</option>
                  </optgroup>
                  <optgroup label="Compras / Legales">
                    <option value="contract">Contrato</option>
                    <option value="invoice">Factura</option>
                    <option value="receipt">Recibo de pago</option>
                  </optgroup>
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

          {/* Filters + list */}
          <div>
            <div className="flex items-center gap-2 mb-3">
              <Filter className="h-3.5 w-3.5 text-[#555]" />
              <select
                value={filterType}
                onChange={e => setFilterType(e.target.value)}
                className="h-7 px-2 rounded-md border border-[#2a2a2a] bg-[#111] text-xs text-[#ededed] focus:outline-none"
              >
                <option value="all">Todos los tipos</option>
                <option value="script">Guiones</option>
                <option value="brief">Briefs</option>
                <option value="storyboard">Storyboards</option>
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

            {filtered.length === 0 ? (
              <div className="text-center py-12">
                <FolderOpen className="h-10 w-10 text-[#333] mx-auto mb-3" />
                <p className="text-sm text-[#666]">Sin documentos. Subí guiones, briefs, contratos y más arriba.</p>
              </div>
            ) : (
              <div className="space-y-2">
                {filtered.map(doc => {
                  const withOrder = doc as never as { order: { provider: { name: string } | null } | null }
                  const canView = isImage(doc.filename) || isPdf(doc.filename)
                  return (
                    <div key={doc.id} className="flex items-center gap-3 bg-[#1a1a1a] border border-[#242424] rounded-xl px-4 py-3 hover:border-[#333] transition-colors">
                      <FileText className="h-4 w-4 text-[#666] shrink-0" />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm text-[#ededed] truncate">{doc.filename}</p>
                        <div className="flex items-center gap-2 mt-0.5">
                          <span className={cn('text-xs px-1.5 py-0.5 rounded border', TYPE_COLORS[doc.type])}>
                            {TYPE_LABELS[doc.type]}
                          </span>
                          {(withOrder as never as { order: { provider: { name: string } | null } | null }).order?.provider?.name && (
                            <span className="text-xs text-[#555]">{(withOrder as never as { order: { provider: { name: string } | null } | null }).order?.provider?.name}</span>
                          )}
                          <span className="text-xs text-[#444]">
                            {new Date(doc.uploaded_at).toLocaleDateString('es-AR', { day: '2-digit', month: 'short', year: 'numeric' })}
                          </span>
                          {doc.notes && <span className="text-xs text-[#444] italic truncate max-w-xs">{doc.notes}</span>}
                        </div>
                      </div>
                      <div className="flex items-center gap-1 shrink-0">
                        {canView && (
                          <Button variant="ghost" size="icon" onClick={() => handleView(doc)} title="Visualizar">
                            <Eye className="h-3.5 w-3.5 text-[#555] hover:text-orange-400" />
                          </Button>
                        )}
                        <a
                          href={`${SUPABASE_URL}/storage/v1/object/documents/${doc.storage_path}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="h-7 w-7 flex items-center justify-center text-[#555] hover:text-orange-400 transition-colors"
                          title="Descargar"
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

      {/* Document Viewer */}
      <Dialog
        open={!!viewerDoc}
        onClose={() => { setViewerDoc(null); setViewerUrl(null) }}
        title={viewerDoc?.filename ?? ''}
        size="xl"
        className="h-[90vh]"
      >
        <div className="flex flex-col h-full">
          {/* Toolbar */}
          {viewerDoc && (
            <div className="flex items-center justify-between px-4 py-2 border-b border-[#2a2a2a] bg-[#161616] shrink-0">
              <span className={cn('text-xs px-2 py-0.5 rounded border', TYPE_COLORS[viewerDoc.type])}>
                {TYPE_LABELS[viewerDoc.type]}
              </span>
              <div className="flex items-center gap-2">
                {viewerUrl && (
                  <a
                    href={viewerUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-1.5 text-xs text-[#888] hover:text-orange-400 transition-colors"
                  >
                    <ExternalLink className="h-3.5 w-3.5" />
                    Abrir en nueva pestaña
                  </a>
                )}
              </div>
            </div>
          )}

          {/* Viewer area */}
          <div className="flex-1 min-h-0 bg-[#111] flex items-center justify-center">
            {loadingViewer ? (
              <div className="flex flex-col items-center gap-3">
                <Loader2 className="h-8 w-8 text-orange-400 animate-spin" />
                <p className="text-sm text-[#666]">Cargando documento...</p>
              </div>
            ) : viewerUrl && viewerDoc ? (
              isPdf(viewerDoc.filename) ? (
                <iframe
                  src={viewerUrl}
                  className="w-full h-full border-0"
                  title={viewerDoc.filename}
                />
              ) : isImage(viewerDoc.filename) ? (
                <img
                  src={viewerUrl}
                  alt={viewerDoc.filename}
                  className="max-w-full max-h-full object-contain p-4"
                />
              ) : (
                <div className="text-center p-8">
                  <FileText className="h-12 w-12 text-[#333] mx-auto mb-3" />
                  <p className="text-sm text-[#666] mb-4">Este formato no se puede previsualizar directamente.</p>
                  <a
                    href={viewerUrl}
                    download={viewerDoc.filename}
                    className="inline-flex items-center gap-2 px-4 py-2 bg-orange-500 text-white text-sm rounded-lg hover:bg-orange-600 transition-colors"
                  >
                    <Download className="h-4 w-4" />
                    Descargar archivo
                  </a>
                </div>
              )
            ) : null}
          </div>
        </div>
      </Dialog>
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
