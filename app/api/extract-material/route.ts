import { NextRequest, NextResponse } from 'next/server'
import { GoogleGenerativeAI } from '@google/generative-ai'

const PROMPT = `Sos un asistente especializado en producción de archivo audiovisual.
Analizá el contenido HTML de esta página web de un proveedor de material de archivo y extraé toda la información disponible sobre el material audiovisual.

Devolvé SOLO un JSON válido con esta estructura (omitir campos si no hay información):
{
  "title": "título del clip o material",
  "description": "descripción del contenido del material",
  "duration_sec": número en segundos (si dice "00:01:23" = 83),
  "format": "MP4 | MOV | MXF | etc",
  "resolution": "1920x1080 | 4K | HD | etc",
  "fps": número (24 | 25 | 30 | etc),
  "aspect_ratio": "16:9 | 4:3 | etc",
  "timecode_in": "00:00:00:00",
  "timecode_out": "00:00:00:00",
  "rights_type": "free | licensed | restricted | unknown",
  "cost_amount": número (si hay precio indicado),
  "cost_currency": "USD | ARS | EUR",
  "cost_unit": "flat | per_sec | per_min",
  "link": "URL del material",
  "screener_url": "URL del preview/screener si existe",
  "notes": "cualquier información extra relevante (año, lugar, evento, etc)"
}

Reglas:
- Si el material tiene licencia de compra, rights_type = "licensed"
- Si es contenido de libre uso, rights_type = "free"
- Si dice "rights managed" o "editorial", rights_type = "restricted"
- duration_sec debe ser un número, no un string
- No incluyas campos con valor null o vacío
- Si hay precios en distintas monedas, tomá el primero que encuentres

Contenido de la página:`

export async function POST(request: NextRequest) {
  const apiKey = process.env.GOOGLE_AI_API_KEY
  if (!apiKey) {
    return NextResponse.json(
      { error: 'GOOGLE_AI_API_KEY no configurada. Agregala en .env.local' },
      { status: 503 }
    )
  }

  let url: string
  try {
    const body = await request.json()
    url = body.url
    if (!url) throw new Error('URL requerida')
    new URL(url) // validate URL format
  } catch {
    return NextResponse.json({ error: 'URL inválida' }, { status: 400 })
  }

  // Fetch the page content
  let html: string
  try {
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Accept-Language': 'es-AR,es;q=0.9,en;q=0.8',
      },
      signal: AbortSignal.timeout(10000),
    })
    if (!response.ok) {
      return NextResponse.json(
        { error: `No se pudo acceder a la página (${response.status}). Algunos sitios bloquean el acceso automático.` },
        { status: 422 }
      )
    }
    html = await response.text()
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : 'Error desconocido'
    return NextResponse.json(
      { error: `Error al acceder al sitio: ${msg}` },
      { status: 422 }
    )
  }

  // Strip heavy HTML, keep useful text
  const cleaned = html
    .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
    .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
    .replace(/<svg[^>]*>[\s\S]*?<\/svg>/gi, '')
    .replace(/<!--[\s\S]*?-->/g, '')
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 12000) // limit to ~12k chars for Gemini context

  // Call Gemini
  try {
    const genAI = new GoogleGenerativeAI(apiKey)
    const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' })

    const result = await model.generateContent(`${PROMPT}\n\nURL: ${url}\n\n${cleaned}`)
    const text = result.response.text()

    // Extract JSON from response (Gemini sometimes wraps it in ```json blocks)
    const jsonMatch = text.match(/```json\s*([\s\S]*?)\s*```/) ||
                      text.match(/```\s*([\s\S]*?)\s*```/) ||
                      text.match(/(\{[\s\S]*\})/)

    if (!jsonMatch) {
      return NextResponse.json({ error: 'Gemini no pudo extraer datos estructurados de esta página.' }, { status: 422 })
    }

    const parsed = JSON.parse(jsonMatch[1] ?? jsonMatch[0])

    // Always include the source URL
    if (!parsed.link) parsed.link = url

    return NextResponse.json({ data: parsed })
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : 'Error desconocido'
    if (msg.includes('API_KEY') || msg.includes('api key')) {
      return NextResponse.json({ error: 'API key de Google inválida. Verificala en .env.local' }, { status: 401 })
    }
    return NextResponse.json({ error: `Error de IA: ${msg}` }, { status: 500 })
  }
}
