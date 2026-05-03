"use client"
// Exportacao de pecas: PSD editavel + PNG + JPG + PDF
// Suporta agrupamento em ZIP quando ha mais de 1 arquivo

export type ExportFormat = "PSD" | "PNG" | "JPG" | "PDF"

function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob)
  const a = document.createElement("a")
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  setTimeout(() => { URL.revokeObjectURL(url); a.remove() }, 100)
}

function safeName(s: string) {
  return s.replace(/[^a-zA-Z0-9_\-]/g, "_").substring(0, 80)
}

async function loadFabricFromJSON(canvasData: any, width: number, height: number): Promise<any> {
  const fabric = await import("fabric")
  const StaticCanvas = (fabric as any).StaticCanvas
  const el = document.createElement("canvas")
  el.width = width; el.height = height
  const fc = new StaticCanvas(el, { width, height, enableRetinaScaling: false })
  await new Promise<void>((resolve) => {
    try {
      const r = fc.loadFromJSON(canvasData, () => { fc.renderAll(); resolve() })
      if (r && typeof r.then === "function") r.then(() => { fc.renderAll(); resolve() })
    } catch (e) { console.error(e); resolve() }
  })
  // Garantia extra: aguarda imagens HTML do canvas terminarem de carregar
  await new Promise(r => setTimeout(r, 350))
  fc.renderAll()
  return fc
}

async function renderToCanvas(piece: { data: any; width: number; height: number }): Promise<HTMLCanvasElement> {
  const data = typeof piece.data === "string" ? JSON.parse(piece.data) : piece.data
  const canvasData = data?.canvasData ?? data
  const sourceW = data?.sourceWidth ?? piece.width
  const sourceH = data?.sourceHeight ?? piece.height

  const fc = await loadFabricFromJSON(canvasData, sourceW, sourceH)

  // Canvas opaco (sem alpha) para evitar pre-multiplicacao
  const out = document.createElement("canvas")
  out.width = piece.width
  out.height = piece.height
  const ctx = out.getContext("2d", { alpha: false } as any)!

  const scale = Math.min(piece.width / sourceW, piece.height / sourceH)
  const drawW = sourceW * scale
  const drawH = sourceH * scale
  const dx = (piece.width - drawW) / 2
  const dy = (piece.height - drawH) / 2

  ctx.fillStyle = "#ffffff"
  ctx.fillRect(0, 0, piece.width, piece.height)
  const sourceCanvas = fc.getElement() as HTMLCanvasElement
  ctx.drawImage(sourceCanvas, dx, dy, drawW, drawH)
  fc.dispose()
  return out
}

export async function exportPNGBlob(piece: { name: string; data: any; width: number; height: number }): Promise<Blob> {
  const c = await renderToCanvas(piece)
  return await new Promise<Blob>((resolve, reject) => {
    c.toBlob(b => b ? resolve(b) : reject(new Error("toBlob PNG falhou")), "image/png")
  })
}

export async function exportJPGBlob(piece: { name: string; data: any; width: number; height: number }): Promise<Blob> {
  const c = await renderToCanvas(piece)
  return await new Promise<Blob>((resolve, reject) => {
    c.toBlob(b => b ? resolve(b) : reject(new Error("toBlob JPG falhou")), "image/jpeg", 0.92)
  })
}

export async function exportPDFBlob(piece: { name: string; data: any; width: number; height: number }): Promise<Blob> {
  const c = await renderToCanvas(piece)
  const jpegDataUrl = c.toDataURL("image/jpeg", 0.92)
  const jpegBase64 = jpegDataUrl.split(",")[1]
  const jpegBytes = atob(jpegBase64)
  const jpegBuf = new Uint8Array(jpegBytes.length)
  for (let i = 0; i < jpegBytes.length; i++) jpegBuf[i] = jpegBytes.charCodeAt(i)

  const W = piece.width, H = piece.height
  const enc = new TextEncoder()
  const parts: Array<Uint8Array> = []
  const offsets: number[] = []
  let pos = 0
  function push(s: string | Uint8Array) {
    const u = typeof s === "string" ? enc.encode(s) : s
    parts.push(u); pos += u.length
  }
  function startObj(idx: number) { offsets[idx] = pos; push(`${idx} 0 obj\n`) }
  function endObj() { push("\nendobj\n") }

  push("%PDF-1.4\n%\xe2\xe3\xcf\xd3\n")
  startObj(1); push("<< /Type /Catalog /Pages 2 0 R >>"); endObj()
  startObj(2); push("<< /Type /Pages /Kids [3 0 R] /Count 1 >>"); endObj()
  startObj(3); push(`<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${W} ${H}] /Resources << /XObject << /Im0 4 0 R >> /ProcSet [/PDF /ImageC] >> /Contents 5 0 R >>`); endObj()
  startObj(4)
  push(`<< /Type /XObject /Subtype /Image /Width ${W} /Height ${H} /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /DCTDecode /Length ${jpegBuf.length} >>\nstream\n`)
  push(jpegBuf)
  push("\nendstream")
  endObj()
  const content = `q\n${W} 0 0 ${H} 0 0 cm\n/Im0 Do\nQ\n`
  startObj(5)
  push(`<< /Length ${content.length} >>\nstream\n${content}endstream`)
  endObj()
  const xrefOffset = pos
  push(`xref\n0 6\n0000000000 65535 f \n`)
  for (let i = 1; i <= 5; i++) push(offsets[i].toString().padStart(10, "0") + " 00000 n \n")
  push(`trailer\n<< /Size 6 /Root 1 0 R >>\nstartxref\n${xrefOffset}\n%%EOF`)

  const total = parts.reduce((a, p) => a + p.length, 0)
  const buf = new Uint8Array(total)
  let off = 0
  for (const p of parts) { buf.set(p, off); off += p.length }
  return new Blob([buf], { type: "application/pdf" })
}

function parseColor(c: string): { r: number; g: number; b: number } {
  if (typeof c !== "string") return { r: 0, g: 0, b: 0 }
  const hex = c.replace("#", "")
  if (hex.length === 6) return { r: parseInt(hex.slice(0,2),16), g: parseInt(hex.slice(2,4),16), b: parseInt(hex.slice(4,6),16) }
  if (hex.length === 3) return { r: parseInt(hex[0]+hex[0],16), g: parseInt(hex[1]+hex[1],16), b: parseInt(hex[2]+hex[2],16) }
  const m = c.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)/)
  if (m) return { r: +m[1], g: +m[2], b: +m[3] }
  return { r: 0, g: 0, b: 0 }
}

// Converte os styles per-character do Fabric Textbox em styleRuns do ag-psd
function buildStyleRuns(textbox: any, fullText: string, scale: number): any[] {
  const runs: any[] = []
  const styles = textbox.styles ?? {}
  const lines = fullText.split("\n")

  let charIdx = 0
  for (let lineNum = 0; lineNum < lines.length; lineNum++) {
    const line = lines[lineNum]
    const lineStyles = styles[lineNum] ?? {}
    let prevStyleKey = ""
    let runStart = charIdx
    let runStyle: any = null

    for (let col = 0; col <= line.length; col++) {
      const cs = col < line.length ? lineStyles[col] : null
      const fill = cs?.fill ?? textbox.fill ?? "#000000"
      const fontSize = cs?.fontSize ?? textbox.fontSize ?? 48
      const fontFamily = cs?.fontFamily ?? textbox.fontFamily ?? "Arial"
      const fontWeight = cs?.fontWeight ?? textbox.fontWeight ?? "normal"
      const styleKey = `${fill}|${fontSize}|${fontFamily}|${fontWeight}`

      if (styleKey !== prevStyleKey && col > 0) {
        runs.push({
          length: charIdx + col - 1 - runStart + 1,
          style: runStyle
        })
        runStart = charIdx + col
      }
      if (styleKey !== prevStyleKey) {
        runStyle = {
          fontName: fontFamily,
          fontSize: Math.round(fontSize * scale),
          fillColor: parseColor(fill),
          fauxBold: (fontWeight === "bold" || fontWeight === 700),
        }
        prevStyleKey = styleKey
      }
    }
    // Fechar ultimo run da linha + quebra
    runs.push({
      length: charIdx + line.length - runStart,
      style: runStyle
    })
    charIdx += line.length
    if (lineNum < lines.length - 1) {
      // adiciona o \n ao ultimo run
      const last = runs[runs.length - 1]
      if (last) last.length += 1
      charIdx += 1
    }
  }
  return runs.filter(r => r.length > 0)
}

function canvasToImageData(c: HTMLCanvasElement): ImageData {
  const ctx = c.getContext("2d", { alpha: false } as any)!
  return ctx.getImageData(0, 0, c.width, c.height)
}

export async function exportPSDBlob(piece: { name: string; data: any; width: number; height: number; sourceWidth?: number; sourceHeight?: number }): Promise<Blob> {
  const data = typeof piece.data === "string" ? JSON.parse(piece.data) : piece.data
  const canvasData = data?.canvasData ?? data
  const sourceW = data?.sourceWidth ?? piece.sourceWidth ?? piece.width
  const sourceH = data?.sourceHeight ?? piece.sourceHeight ?? piece.height

  const fc = await loadFabricFromJSON(canvasData, sourceW, sourceH)
  const objects = fc.getObjects()
  const scale = Math.min(piece.width / sourceW, piece.height / sourceH)
  const offsetX = (piece.width - sourceW * scale) / 2
  const offsetY = (piece.height - sourceH * scale) / 2

  const agpsd = await import("ag-psd") as any
  // ag-psd no browser ja vem inicializado; nao precisa initializeCanvas manual

  const psdLayers: any[] = []
  for (const obj of objects) {
    if ((obj as any).__isBg) continue
    const ox = obj.left ?? 0
    const oy = obj.top ?? 0
    const ow = (obj.width ?? 100) * (obj.scaleX ?? 1)
    const oh = (obj.height ?? 100) * (obj.scaleY ?? 1)
    const left = Math.round(ox * scale + offsetX)
    const top = Math.round(oy * scale + offsetY)
    const right = Math.round((ox + ow) * scale + offsetX)
    const bottom = Math.round((oy + oh) * scale + offsetY)
    const w = Math.max(1, right - left)
    const h = Math.max(1, bottom - top)
    const name = (obj as any).__assetLabel ?? obj.type ?? "Layer"

    if (obj.type === "textbox" || obj.type === "i-text" || obj.type === "text") {
      const fontSize = Math.round((obj.fontSize ?? 48) * scale)
      const fullText = obj.text ?? ""
      const styleRuns = buildStyleRuns(obj, fullText, scale)

      psdLayers.push({
        name, top, left, bottom, right,
        text: {
          text: fullText,
          transform: [1, 0, 0, 1, left, top + fontSize],
          style: {
            fontName: obj.fontFamily ?? "Arial",
            fontSize,
            fillColor: parseColor(obj.fill ?? "#000000"),
            fauxBold: (obj.fontWeight === "bold" || obj.fontWeight === 700),
          },
          styleRuns,
          paragraphStyle: { justification: "left" },
        },
      })
    } else {
      const layerCanvas = document.createElement("canvas")
      layerCanvas.width = w
      layerCanvas.height = h
      const lctx = layerCanvas.getContext("2d", { alpha: false } as any)!
      lctx.fillStyle = "#ffffff"
      lctx.fillRect(0, 0, w, h)
      try {
        const img = obj.toCanvasElement({ multiplier: scale })
        lctx.drawImage(img, 0, 0, w, h)
        psdLayers.push({ name, top, left, bottom, right, canvas: layerCanvas })
      } catch (e) {
        console.warn("falha rasterizar:", name, e)
      }
    }
  }

  // Composite final - usado pelo Photoshop como preview do documento
  const compositeCanvas = document.createElement("canvas")
  compositeCanvas.width = piece.width
  compositeCanvas.height = piece.height
  const cctx = compositeCanvas.getContext("2d", { alpha: false } as any)!
  cctx.fillStyle = "#ffffff"
  cctx.fillRect(0, 0, piece.width, piece.height)
  const drawW = sourceW * scale
  const drawH = sourceH * scale
  cctx.drawImage(fc.getElement(), offsetX, offsetY, drawW, drawH)

  // Thumbnail menor para o Finder/Bridge mostrar preview correto
  const thumbCanvas = document.createElement("canvas")
  const thumbScale = Math.min(256 / piece.width, 256 / piece.height)
  thumbCanvas.width = Math.round(piece.width * thumbScale)
  thumbCanvas.height = Math.round(piece.height * thumbScale)
  const tctx = thumbCanvas.getContext("2d", { alpha: false } as any)!
  tctx.fillStyle = "#ffffff"
  tctx.fillRect(0, 0, thumbCanvas.width, thumbCanvas.height)
  tctx.drawImage(compositeCanvas, 0, 0, thumbCanvas.width, thumbCanvas.height)

  const psd: any = {
    width: piece.width,
    height: piece.height,
    canvas: compositeCanvas,
    children: psdLayers,
    imageResources: { thumbnail: thumbCanvas },
  }
  const buffer = agpsd.writePsd(psd, { generateThumbnail: false })
  fc.dispose()
  return new Blob([buffer], { type: "image/vnd.adobe.photoshop" })
}

const EXT_MAP: Record<ExportFormat, string> = { PSD: "psd", PNG: "png", JPG: "jpg", PDF: "pdf" }

async function buildBlob(piece: { name: string; data: any; width: number; height: number }, format: ExportFormat): Promise<Blob> {
  switch (format) {
    case "PNG": return exportPNGBlob(piece)
    case "JPG": return exportJPGBlob(piece)
    case "PDF": return exportPDFBlob(piece)
    case "PSD": return exportPSDBlob(piece)
  }
}

// Exporta uma ou mais pecas em um ou mais formatos.
// Se total > 1 arquivo, agrupa tudo num zip e baixa uma vez so.
export async function exportPieces(
  pieces: Array<{ name: string; data: any; width: number; height: number }>,
  formats: ExportFormat[],
  onProgress?: (msg: string) => void
): Promise<void> {
  const total = pieces.length * formats.length
  if (total === 0) return

  // Caso simples: 1 arquivo so, baixa direto
  if (total === 1) {
    const piece = pieces[0]
    const fmt = formats[0]
    onProgress?.(`Gerando ${piece.name} (${fmt})`)
    const blob = await buildBlob(piece, fmt)
    downloadBlob(blob, `${safeName(piece.name)}.${EXT_MAP[fmt]}`)
    return
  }

  // Caso multiplo: empacota em zip
  const JSZip = (await import("jszip")).default
  const zip = new JSZip()
  let done = 0
  for (const piece of pieces) {
    // Se ha varias pecas, organiza em pastas por peca
    const folder = pieces.length > 1 ? zip.folder(safeName(piece.name)) ?? zip : zip
    for (const fmt of formats) {
      done++
      onProgress?.(`${done}/${total} — ${piece.name} (${fmt})`)
      try {
        const blob = await buildBlob(piece, fmt)
        const buf = await blob.arrayBuffer()
        folder.file(`${safeName(piece.name)}.${EXT_MAP[fmt]}`, buf)
      } catch (e) {
        console.error("Falha ao exportar", piece.name, fmt, e)
      }
    }
  }

  onProgress?.(`Empacotando zip...`)
  const zipBlob = await zip.generateAsync({ type: "blob" })
  const zipName = pieces.length === 1
    ? `${safeName(pieces[0].name)}.zip`
    : `pecas-${new Date().toISOString().slice(0, 10)}.zip`
  downloadBlob(zipBlob, zipName)
}

// Compat antiga
export async function exportPiece(
  piece: { name: string; data: any; width: number; height: number },
  format: ExportFormat
) {
  return exportPieces([piece], [format])
}
