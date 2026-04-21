'use client'
import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Header } from '@/components/layout/Header'
import { Button } from '@/components/ui/button'
import { detectAndParse, type ParsedClip } from '@/lib/edl-parser'
import { toast } from 'sonner'
import { Upload, FileText, ChevronDown, ChevronRight, CheckCircle, AlertCircle, Link } from 'lucide-react'
import { cn, formatDuration } from '@/lib/utils'
import type { EdlImport, Material } from '@/types/database'

interface Props {
  projectId: string
  initialImports: EdlImport[]
  materials: (Pick<Material, 'id' | 'title' | 'code'> & { provider: { name: string } | null })[]
  userEmail: string
}

interface MatchedClip extends ParsedClip {
  suggestedMaterialId: string | null
  materialId: string | null
}

type Step = 'upload' | 'match' | 'done'

export function EdlClient({ projectId, initialImports, materials, userEmail }: Props) {
  const [imports, setImports] = useState(initialImports)
  const [step, setStep] = useState<Step>('upload')
  const [edlName, setEdlName] = useState('')
  const [parsedClips, setParsedClips] = useState<MatchedClip[]>([])
  const [detectedFormat, setDetectedFormat] = useState('')
  const [rawContent, setRawContent] = useState('')
  const [saving, setSaving] = useState(false)
  const [expanded, setExpanded] = useState<string | null>(null)

  function suggestMatch(clipName: string): string | null {
    const q = clipName.toLowerCase()
    const m = materials.find(m =>
      m.title.toLowerCase().includes(q) ||
      q.includes(m.title.toLowerCase()) ||
      (m.code && (m.code.toLowerCase() === q || q.includes(m.code.toLowerCase())))
    )
    return m?.id ?? null
  }

  async function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setEdlName(edlName || file.name.replace(/\.\w+$/, ''))
    const text = await file.text()
    setRawContent(text)
    processText(text)
  }

  function handleTextPaste(text: string) {
    setRawContent(text)
    processText(text)
  }

  function processText(text: string) {
    const { format, clips } = detectAndParse(text)
    setDetectedFormat(format)
    const matched: MatchedClip[] = clips.map(c => {
      const sugg = suggestMatch(c.clipName)
      return { ...c, suggestedMaterialId: sugg, materialId: sugg }
    })
    setParsedClips(matched)
    if (clips.length > 0) setStep('match')
    else toast.error('No se encontraron clips en el EDL')
  }

  async function handleSave() {
    if (!edlName.trim()) { toast.error('Asigná un nombre al EDL'); return }
    setSaving(true)
    const supabase = createClient()

    const { data: importRow, error } = await supabase
      .from('edl_imports')
      .insert({
        project_id: projectId,
        name: edlName,
        format: detectedFormat as 'cmx3600' | 'fcp_xml' | 'premiere_xml' | 'csv',
        raw_content: rawContent,
        imported_at: new Date().toISOString(),
      })
      .select()
      .single()

    if (error || !importRow) { toast.error('Error al guardar EDL'); setSaving(false); return }

    await supabase.from('edl_clips').insert(
      parsedClips.map(c => ({
        edl_import_id: importRow.id,
        material_id: c.materialId ?? null,
        clip_name: c.clipName,
        reel: c.reel || null,
        record_in: c.recordIn,
        record_out: c.recordOut,
        source_in: c.sourceIn,
        source_out: c.sourceOut,
        duration_sec: c.durationSec,
      }))
    )

    const { data: full } = await supabase
      .from('edl_imports')
      .select('*, clips:edl_clips(*, material:materials(id, title, code, provider:providers(name)))')
      .eq('id', importRow.id)
      .single()

    setImports(prev => [full, ...prev])
    setStep('done')
    setSaving(false)
    toast.success(`EDL guardado: ${parsedClips.length} clips`)
  }

  const matchedCount = parsedClips.filter(c => c.materialId).length

  return (
    <div className="flex flex-col h-full">
      <Header
        title="Import EDL"
        description="Importá y matcheá clips del EDL con tu registro de materiales"
        email={userEmail}
        actions={step !== 'upload' && (
          <Button variant="ghost" size="sm" onClick={() => { setStep('upload'); setParsedClips([]); setRawContent(''); setEdlName('') }}>
            Nuevo import
          </Button>
        )}
      />

      <div className="flex-1 overflow-y-auto p-6">
        {/* Upload step */}
        {step === 'upload' && (
          <div className="max-w-2xl space-y-6">
            <div>
              <p className="text-sm text-[#888] mb-4">Soporta CMX3600 (.edl), FCP XML, Premiere XML y CSV exportado desde tu sistema de edición.</p>
              <label className="flex flex-col items-center justify-center h-40 border-2 border-dashed border-[#2a2a2a] rounded-xl cursor-pointer hover:border-orange-500/50 hover:bg-orange-500/5 transition-colors">
                <Upload className="h-8 w-8 text-[#444] mb-2" />
                <span className="text-sm text-[#666]">Arrastrá o hacé click para subir el EDL</span>
                <span className="text-xs text-[#444] mt-1">.edl, .xml, .csv</span>
                <input type="file" accept=".edl,.xml,.csv,.txt" className="hidden" onChange={handleFile} />
              </label>
            </div>

            <div>
              <p className="text-xs text-[#666] uppercase tracking-wider mb-2">O pegá el contenido directamente</p>
              <textarea
                placeholder="Pegá el contenido del EDL aquí..."
                rows={8}
                className="w-full rounded-lg border border-[#2a2a2a] bg-[#111] px-3 py-2 text-sm text-[#ededed] placeholder:text-[#444] focus:outline-none focus:border-orange-500 font-mono resize-none"
                onChange={e => { if (e.target.value.trim()) handleTextPaste(e.target.value) }}
              />
            </div>
          </div>
        )}

        {/* Match step */}
        {step === 'match' && (
          <div className="max-w-4xl space-y-4">
            <div className="flex items-center justify-between bg-[#1a1a1a] border border-[#2a2a2a] rounded-xl p-4">
              <div>
                <div className="flex items-center gap-3">
                  <div>
                    <p className="text-xs text-[#666] uppercase tracking-wider">Formato detectado</p>
                    <p className="text-sm font-mono text-orange-400">{detectedFormat.toUpperCase()}</p>
                  </div>
                  <div className="w-px h-8 bg-[#2a2a2a]" />
                  <div>
                    <p className="text-xs text-[#666] uppercase tracking-wider">Clips</p>
                    <p className="text-sm font-semibold text-[#ededed]">{parsedClips.length}</p>
                  </div>
                  <div className="w-px h-8 bg-[#2a2a2a]" />
                  <div>
                    <p className="text-xs text-[#666] uppercase tracking-wider">Matcheados</p>
                    <p className="text-sm font-semibold text-green-400">{matchedCount}/{parsedClips.length}</p>
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <input
                  value={edlName}
                  onChange={e => setEdlName(e.target.value)}
                  placeholder="Nombre del EDL..."
                  className="h-9 px-3 rounded-lg border border-[#2a2a2a] bg-[#111] text-sm text-[#ededed] placeholder:text-[#444] focus:outline-none focus:border-orange-500"
                />
                <Button variant="primary" size="md" onClick={handleSave} loading={saving}>
                  Guardar EDL
                </Button>
              </div>
            </div>

            <div className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-xl overflow-hidden">
              <div className="grid grid-cols-[24px_1fr_1fr_100px_100px_180px] gap-3 px-4 py-2.5 border-b border-[#2a2a2a] text-xs text-[#555] uppercase tracking-wider">
                <div />
                <div>Clip</div>
                <div>Reel</div>
                <div>Duración</div>
                <div>TC In / Out</div>
                <div>Material</div>
              </div>
              {parsedClips.map((clip, i) => (
                <div key={i} className="grid grid-cols-[24px_1fr_1fr_100px_100px_180px] gap-3 px-4 py-3 border-b border-[#1f1f1f] items-center hover:bg-[#1e1e1e]">
                  <div>
                    {clip.materialId
                      ? <CheckCircle className="h-4 w-4 text-green-500" />
                      : <AlertCircle className="h-4 w-4 text-yellow-500/60" />}
                  </div>
                  <div className="truncate">
                    <p className="text-sm text-[#ededed] truncate">{clip.clipName}</p>
                  </div>
                  <div className="text-xs font-mono text-[#666] truncate">{clip.reel || '—'}</div>
                  <div className="text-xs font-mono text-[#888]">{formatDuration(clip.durationSec)}</div>
                  <div className="text-xs font-mono text-[#666] truncate">{clip.sourceIn}</div>
                  <div>
                    <select
                      value={clip.materialId ?? ''}
                      onChange={e => {
                        const val = e.target.value || null
                        setParsedClips(prev => prev.map((c, j) => j === i ? { ...c, materialId: val } : c))
                      }}
                      className="w-full h-7 rounded-md border border-[#2a2a2a] bg-[#111] px-2 text-xs text-[#ededed] focus:outline-none focus:border-orange-500"
                    >
                      <option value="">Sin asignar</option>
                      {materials.map(m => (
                        <option key={m.id} value={m.id}>
                          {m.code ? `[${m.code}] ` : ''}{m.title}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Done / History */}
        {(step === 'done' || imports.length > 0) && (
          <div className={cn('max-w-4xl', step === 'match' && 'mt-8')}>
            <h3 className="text-sm font-semibold text-[#888] uppercase tracking-wider mb-4">Historial de imports</h3>
            <div className="space-y-3">
              {imports.map(imp => (
                <div key={imp.id} className="bg-[#1a1a1a] border border-[#242424] rounded-xl overflow-hidden">
                  <button
                    className="w-full flex items-center justify-between px-5 py-4 text-left hover:bg-[#1e1e1e] transition-colors"
                    onClick={() => setExpanded(expanded === imp.id ? null : imp.id)}
                  >
                    <div className="flex items-center gap-3">
                      <FileText className="h-4 w-4 text-[#666]" />
                      <div>
                        <p className="text-sm font-medium text-[#ededed]">{imp.name}</p>
                        <p className="text-xs text-[#555]">
                          {new Date(imp.imported_at).toLocaleDateString('es-AR', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                          {' · '}{imp.format?.toUpperCase()}
                          {' · '}{(imp as never as { clips?: { id: string }[] }).clips?.length ?? 0} clips
                        </p>
                      </div>
                    </div>
                    {expanded === imp.id ? <ChevronDown className="h-4 w-4 text-[#555]" /> : <ChevronRight className="h-4 w-4 text-[#555]" />}
                  </button>

                  {expanded === imp.id && (
                    <div className="border-t border-[#242424]">
                      <div className="grid grid-cols-[1fr_1fr_80px_120px_200px] gap-3 px-5 py-2 text-xs text-[#555] uppercase tracking-wider bg-[#161616]">
                        <div>Clip</div>
                        <div>Reel</div>
                        <div>Duración</div>
                        <div>TC Fuente</div>
                        <div>Material</div>
                      </div>
                      {(imp as never as { clips?: { id: string; clip_name: string; reel: string | null; duration_sec: number; source_in: string; material: { title: string; code: string | null } | null }[] }).clips?.map((clip) => (
                        <div key={clip.id} className="grid grid-cols-[1fr_1fr_80px_120px_200px] gap-3 px-5 py-3 border-t border-[#1a1a1a] items-center text-sm">
                          <div className="truncate text-[#ccc]">{clip.clip_name}</div>
                          <div className="text-xs font-mono text-[#666] truncate">{clip.reel || '—'}</div>
                          <div className="text-xs font-mono text-[#888]">{formatDuration(clip.duration_sec)}</div>
                          <div className="text-xs font-mono text-[#666]">{clip.source_in}</div>
                          <div className="text-xs">
                            {clip.material
                              ? <span className="text-green-400">{clip.material.code ? `[${clip.material.code}] ` : ''}{clip.material.title}</span>
                              : <span className="text-[#444] flex items-center gap-1"><Link className="h-3 w-3" />Sin asignar</span>}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
