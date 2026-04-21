'use client'
import { useState, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { MaterialForm } from './MaterialForm'
import { cn, STATUS_LABELS, STATUS_COLORS, RIGHTS_LABELS, COST_UNIT_LABELS, formatDuration, formatCost } from '@/lib/utils'
import { X, Edit, Trash2, Upload, ExternalLink, Image as ImageIcon, ChevronLeft, ChevronRight } from 'lucide-react'
import { toast } from 'sonner'
import Image from 'next/image'
import type { Material, Provider } from '@/types/database'

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!

interface Props {
  material: Material
  projectId: string
  providers: Pick<Provider, 'id' | 'name'>[]
  onUpdate: (id: string, data: Partial<Material>) => void
  onDelete: (id: string) => void
  onClose: () => void
}

export function MaterialDetail({ material, projectId, providers, onUpdate, onDelete, onClose }: Props) {
  const [editing, setEditing] = useState(false)
  const [frameIdx, setFrameIdx] = useState(0)
  const [uploadingFrame, setUploadingFrame] = useState(false)
  const frameInputRef = useRef<HTMLInputElement>(null)

  const frames = material.frames ?? []
  const currentFrame = frames[frameIdx]
  const frameUrl = currentFrame ? `${SUPABASE_URL}/storage/v1/object/public/frames/${currentFrame.storage_path}` : null

  async function handleFrameUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const files = e.target.files
    if (!files?.length) return
    setUploadingFrame(true)
    const supabase = createClient()

    for (const file of Array.from(files)) {
      const ext = file.name.split('.').pop()
      const path = `${projectId}/${material.id}/${Date.now()}.${ext}`
      const { error: uploadError } = await supabase.storage.from('frames').upload(path, file)
      if (uploadError) { toast.error('Error subiendo frame'); continue }
      await supabase.from('material_frames').insert({
        material_id: material.id,
        storage_path: path,
        order_index: frames.length,
      })
    }

    // Refresh frames
    const { data: updatedFrames } = await supabase
      .from('material_frames')
      .select('*')
      .eq('material_id', material.id)
      .order('order_index')

    onUpdate(material.id, { frames: updatedFrames ?? [] } as never)
    setUploadingFrame(false)
    if (frameInputRef.current) frameInputRef.current.value = ''
    toast.success('Frame/s subido/s')
  }

  async function handleFrameDelete(frameId: string) {
    const supabase = createClient()
    const frame = frames.find(f => f.id === frameId)
    if (frame) await supabase.storage.from('frames').remove([frame.storage_path])
    await supabase.from('material_frames').delete().eq('id', frameId)
    const newFrames = frames.filter(f => f.id !== frameId)
    onUpdate(material.id, { frames: newFrames } as never)
    setFrameIdx(Math.min(frameIdx, newFrames.length - 1))
    toast.success('Frame eliminado')
  }

  if (editing) {
    return (
      <div className="w-[420px] shrink-0 flex flex-col border-l border-[#242424] bg-[#161616]">
        <div className="flex items-center justify-between px-5 py-4 border-b border-[#242424]">
          <h2 className="text-sm font-semibold text-[#ededed]">Editar material</h2>
          <Button variant="ghost" size="icon" onClick={() => setEditing(false)}><X className="h-4 w-4" /></Button>
        </div>
        <div className="flex-1 overflow-y-auto p-5">
          <MaterialForm
            projectId={projectId}
            providers={providers}
            initialData={material}
            onSave={async (data) => { await onUpdate(material.id, data); setEditing(false) }}
            onCancel={() => setEditing(false)}
          />
        </div>
      </div>
    )
  }

  return (
    <div className="w-[380px] shrink-0 flex flex-col border-l border-[#242424] bg-[#161616] overflow-y-auto">
      {/* Header */}
      <div className="flex items-center justify-between px-5 py-4 border-b border-[#242424] shrink-0">
        <div className="flex items-center gap-2">
          {material.code && <span className="text-xs font-mono text-[#666] bg-[#2a2a2a] px-2 py-0.5 rounded">{material.code}</span>}
          <span className={cn('inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium', STATUS_COLORS[material.status])}>
            {STATUS_LABELS[material.status]}
          </span>
        </div>
        <div className="flex items-center gap-1">
          <Button variant="ghost" size="icon" onClick={() => setEditing(true)} title="Editar"><Edit className="h-3.5 w-3.5" /></Button>
          <Button variant="ghost" size="icon" onClick={() => onDelete(material.id)} title="Eliminar" className="text-[#555] hover:text-red-400">
            <Trash2 className="h-3.5 w-3.5" />
          </Button>
          <Button variant="ghost" size="icon" onClick={onClose}><X className="h-4 w-4" /></Button>
        </div>
      </div>

      {/* Frames */}
      <div className="shrink-0">
        {frameUrl ? (
          <div className="relative bg-black aspect-video">
            <Image src={frameUrl} alt="frame" fill className="object-contain" sizes="380px" />
            {frames.length > 1 && (
              <>
                <button
                  onClick={() => setFrameIdx(i => Math.max(0, i - 1))}
                  disabled={frameIdx === 0}
                  className="absolute left-2 top-1/2 -translate-y-1/2 h-7 w-7 bg-black/60 rounded-full flex items-center justify-center text-white disabled:opacity-30"
                >
                  <ChevronLeft className="h-4 w-4" />
                </button>
                <button
                  onClick={() => setFrameIdx(i => Math.min(frames.length - 1, i + 1))}
                  disabled={frameIdx === frames.length - 1}
                  className="absolute right-2 top-1/2 -translate-y-1/2 h-7 w-7 bg-black/60 rounded-full flex items-center justify-center text-white disabled:opacity-30"
                >
                  <ChevronRight className="h-4 w-4" />
                </button>
                <div className="absolute bottom-2 left-1/2 -translate-x-1/2 text-xs text-white/70 bg-black/50 px-2 py-0.5 rounded-full">
                  {frameIdx + 1}/{frames.length}
                </div>
              </>
            )}
            <button
              onClick={() => handleFrameDelete(currentFrame.id)}
              className="absolute top-2 right-2 h-6 w-6 bg-black/60 rounded-full flex items-center justify-center text-red-400 hover:text-red-300"
            >
              <X className="h-3 w-3" />
            </button>
          </div>
        ) : (
          <div className="aspect-video bg-[#111] flex flex-col items-center justify-center gap-2 text-[#444]">
            <ImageIcon className="h-10 w-10" />
            <span className="text-xs">Sin frames</span>
          </div>
        )}

        {/* Thumbnail strip */}
        {frames.length > 0 && (
          <div className="flex gap-1.5 p-2 overflow-x-auto bg-[#111]">
            {frames.map((f, i) => (
              <button
                key={f.id}
                onClick={() => setFrameIdx(i)}
                className={cn('relative h-10 w-16 shrink-0 rounded overflow-hidden border-2 transition-colors',
                  i === frameIdx ? 'border-orange-500' : 'border-transparent')}
              >
                <Image
                  src={`${SUPABASE_URL}/storage/v1/object/public/frames/${f.storage_path}`}
                  alt=""
                  fill
                  className="object-cover"
                  sizes="64px"
                />
              </button>
            ))}
          </div>
        )}

        <div className="flex gap-2 px-3 py-2 bg-[#111] border-b border-[#242424]">
          <Button variant="ghost" size="sm" className="flex-1" onClick={() => frameInputRef.current?.click()} loading={uploadingFrame}>
            <Upload className="h-3.5 w-3.5" />
            {frames.length ? 'Agregar frames' : 'Subir frames'}
          </Button>
          <input ref={frameInputRef} type="file" accept="image/*" multiple className="hidden" onChange={handleFrameUpload} />
        </div>
      </div>

      {/* Info */}
      <div className="flex-1 px-5 py-4 space-y-4">
        <div>
          <h2 className="text-base font-semibold text-[#ededed] leading-snug">{material.title}</h2>
          {material.provider && <p className="text-xs text-orange-400 mt-1">{material.provider.name}</p>}
          {material.description && <p className="text-sm text-[#888] mt-2 leading-relaxed">{material.description}</p>}
        </div>

        <div className="space-y-3">
          <Section title="Técnico">
            <Row label="Duración" value={formatDuration(material.duration_sec)} />
            <Row label="Formato" value={material.format} />
            <Row label="Resolución" value={material.resolution} />
            <Row label="FPS" value={material.fps?.toString()} />
            <Row label="Aspect Ratio" value={material.aspect_ratio} />
            <Row label="TC In" value={material.timecode_in} mono />
            <Row label="TC Out" value={material.timecode_out} mono />
          </Section>

          <Section title="Derechos y costo">
            <Row label="Derechos" value={RIGHTS_LABELS[material.rights_type]} />
            <Row label="Costo" value={material.cost_amount != null
              ? `${material.cost_amount} ${material.cost_currency} (${COST_UNIT_LABELS[material.cost_unit]})`
              : undefined} />
          </Section>

          <Section title="Links">
            {material.link && (
              <a href={material.link} target="_blank" rel="noopener noreferrer"
                className="flex items-center gap-1.5 text-xs text-orange-400 hover:text-orange-300 break-all"
              >
                <ExternalLink className="h-3 w-3 shrink-0" />
                Material original
              </a>
            )}
            {material.screener_url && (
              <a href={material.screener_url} target="_blank" rel="noopener noreferrer"
                className="flex items-center gap-1.5 text-xs text-blue-400 hover:text-blue-300 break-all"
              >
                <ExternalLink className="h-3 w-3 shrink-0" />
                Screener
              </a>
            )}
            {!material.link && !material.screener_url && <span className="text-xs text-[#444]">Sin links cargados</span>}
          </Section>

          {material.notes && (
            <Section title="Notas">
              <p className="text-xs text-[#888] leading-relaxed">{material.notes}</p>
            </Section>
          )}
        </div>
      </div>
    </div>
  )
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <h4 className="text-[10px] font-semibold text-[#555] uppercase tracking-wider mb-2">{title}</h4>
      <div className="space-y-1.5 bg-[#111] rounded-lg p-3 border border-[#222]">{children}</div>
    </div>
  )
}

function Row({ label, value, mono }: { label: string; value: string | null | undefined; mono?: boolean }) {
  if (!value) return null
  return (
    <div className="flex justify-between items-start gap-3">
      <span className="text-xs text-[#666] shrink-0">{label}</span>
      <span className={cn('text-xs text-[#ccc] text-right', mono && 'font-mono')}>{value}</span>
    </div>
  )
}
