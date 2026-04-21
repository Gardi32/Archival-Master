export interface ParsedClip {
  clipName: string
  reel: string
  recordIn: string
  recordOut: string
  sourceIn: string
  sourceOut: string
  durationSec: number
}

export type EdlParseFormat = 'cmx3600' | 'xml' | 'csv'

function tcToSec(tc: string): number {
  if (!tc) return 0
  const parts = tc.split(':').map(Number)
  if (parts.length >= 3) return parts[0] * 3600 + parts[1] * 60 + parts[2]
  return 0
}

function tcDiff(a: string, b: string): number {
  return Math.max(0, tcToSec(b) - tcToSec(a))
}

// CMX3600: standard EDL format from Premiere, Resolve, Avid
export function parseCMX3600(text: string): ParsedClip[] {
  const clips: ParsedClip[] = []
  const lines = text.split('\n')

  let i = 0
  while (i < lines.length) {
    const line = lines[i].trim()

    // Event line: "001  REEL  V  C  00:00:00:00 00:00:10:00 00:00:00:00 00:00:10:00"
    const eventMatch = line.match(/^(\d+)\s+(\S+)\s+\S+\s+C\s+([\d:]+)\s+([\d:]+)\s+([\d:]+)\s+([\d:]+)/)
    if (eventMatch) {
      const [, , reel, srcIn, srcOut, recIn, recOut] = eventMatch
      const clip: ParsedClip = {
        clipName: reel,
        reel,
        sourceIn: srcIn,
        sourceOut: srcOut,
        recordIn: recIn,
        recordOut: recOut,
        durationSec: tcDiff(srcIn, srcOut),
      }

      // Look ahead for FROM CLIP NAME comment
      if (i + 1 < lines.length) {
        const next = lines[i + 1].trim()
        const nameMatch = next.match(/^\*\s*FROM CLIP NAME:\s*(.+)/) ||
                          next.match(/^\*\s*CLIP NAME:\s*(.+)/) ||
                          next.match(/^\*\s*(.+)/)
        if (nameMatch) {
          clip.clipName = nameMatch[1].trim()
          i++
        }
      }

      clips.push(clip)
    }
    i++
  }

  return clips
}

// FCP/Premiere XML
export function parseFCPXML(text: string): ParsedClip[] {
  const clips: ParsedClip[] = []

  // Try to find clip-item or clipitem elements
  const clipRegex = /<(?:clipitem|clip-item|asset-clip)[^>]*>([\s\S]*?)<\/(?:clipitem|clip-item|asset-clip)>/gi
  let match

  while ((match = clipRegex.exec(text)) !== null) {
    const content = match[1]
    const name = content.match(/<name>(.*?)<\/name>/)?.[1]?.trim() ?? 'Sin nombre'
    const start = content.match(/<start>(.*?)<\/start>/)?.[1]?.trim()
    const end = content.match(/<end>(.*?)<\/end>/)?.[1]?.trim()
    const inPoint = content.match(/<in>(.*?)<\/in>/)?.[1]?.trim()
    const outPoint = content.match(/<out>(.*?)<\/out>/)?.[1]?.trim()

    // FCP XML uses frame numbers, convert assuming 25fps
    const fps = 25
    function framesToTc(frames: string | undefined): string {
      if (!frames || frames === '-1') return '00:00:00:00'
      const f = parseInt(frames)
      const h = Math.floor(f / (fps * 3600))
      const m = Math.floor((f % (fps * 3600)) / (fps * 60))
      const s = Math.floor((f % (fps * 60)) / fps)
      const fr = f % fps
      return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}:${String(fr).padStart(2, '0')}`
    }

    const srcIn = framesToTc(inPoint)
    const srcOut = framesToTc(outPoint)
    const recIn = framesToTc(start)
    const recOut = framesToTc(end)

    clips.push({
      clipName: name,
      reel: name,
      sourceIn: srcIn,
      sourceOut: srcOut,
      recordIn: recIn,
      recordOut: recOut,
      durationSec: tcDiff(srcIn, srcOut),
    })
  }

  return clips
}

// CSV: flexible column detection
export function parseCSV(text: string): ParsedClip[] {
  const lines = text.split('\n').filter(Boolean)
  if (lines.length < 2) return []

  const headers = lines[0].split(',').map(h => h.trim().toLowerCase().replace(/"/g, ''))
  const idx = (keys: string[]) => {
    for (const k of keys) {
      const i = headers.findIndex(h => h.includes(k))
      if (i >= 0) return i
    }
    return -1
  }

  const nameIdx = idx(['name', 'nombre', 'clip', 'titulo', 'title'])
  const reelIdx = idx(['reel', 'tape', 'source'])
  const srcInIdx = idx(['src_in', 'source_in', 'tc_in', 'in'])
  const srcOutIdx = idx(['src_out', 'source_out', 'tc_out', 'out'])
  const recInIdx = idx(['rec_in', 'record_in', 'record in'])
  const recOutIdx = idx(['rec_out', 'record_out', 'record out'])
  const durationIdx = idx(['duration', 'duracion', 'dur'])

  return lines.slice(1).map(line => {
    const vals = line.split(',').map(v => v.trim().replace(/"/g, ''))
    const srcIn = vals[srcInIdx] ?? '00:00:00:00'
    const srcOut = vals[srcOutIdx] ?? '00:00:00:00'
    const durationSec = durationIdx >= 0 && vals[durationIdx]
      ? parseFloat(vals[durationIdx])
      : tcDiff(srcIn, srcOut)

    return {
      clipName: vals[nameIdx] ?? 'Clip sin nombre',
      reel: vals[reelIdx] ?? '',
      sourceIn: srcIn,
      sourceOut: srcOut,
      recordIn: vals[recInIdx] ?? '00:00:00:00',
      recordOut: vals[recOutIdx] ?? '00:00:00:00',
      durationSec,
    }
  }).filter(c => c.clipName && c.clipName !== 'Clip sin nombre' || c.durationSec > 0)
}

export function detectAndParse(content: string): { format: EdlParseFormat; clips: ParsedClip[] } {
  const trimmed = content.trim()

  if (trimmed.startsWith('<?xml') || trimmed.startsWith('<xmeml') || trimmed.includes('<clipitem') || trimmed.includes('<clip-item')) {
    return { format: 'xml', clips: parseFCPXML(trimmed) }
  }

  if (trimmed.match(/^TITLE:|^FCM:|^\d{3}\s+\S+\s+[AV]/m)) {
    return { format: 'cmx3600', clips: parseCMX3600(trimmed) }
  }

  return { format: 'csv', clips: parseCSV(trimmed) }
}
