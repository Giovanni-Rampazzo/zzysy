"use client"
// Exportacao de pecas: PSD editavel + PNG + JPG + PDF
// Tudo client-side, sem dependencias alem de ag-psd

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
  await new Promise(r => setTimeout(r, 250))
  fc.renderAll()
  return fc
}

async function renderToCanvas(piece: { data: any; width: number; height: number }): Promise<HTMLCanvasElement> {
  const data = typeof piece.data === "string" ? JSON.parse(piece.data) : piece.data
  const canvasData = data?.canvasData ?? data
  const sourceW = data?.sourceWidth ?? piece.width
  const sourceH = data?.sourceHeight ?? piece.height

  const fc = await loadFabricFromJSON(canvasData, sourceW, sourceH)

  const out = document.createElement("canvas")
  out.width = piece.width
  out.height = piece.height
  const ctx = out.getContext("2d")!

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

export async function exportPNG(piece: { name: string; data: any; width: number; height: number }) {
  const c = await renderToCanvas(piece)
  await new Promise<void>(resolve => {
    c.toBlob(b => { if (b) downloadBlob(b, safeName(piece.name) + ".png"); resolve() }, "image/png")
  })
}

export async function exportJPG(piece: { name: string; data: any; width: number; height: number }) {
  const c = await renderToCanvas(piece)
  await new Promise<void>(resolve => {
    c.toBlob(b => { if (b) downloadBlob(b, safeName(piece.name) + ".jpg"); resolve() }, "image/jpeg", 0.92)
  })
}

// PDF: monta um arquivo PDF minimo embedando JPEG, sem dependencias e sem popup
export async function exportPDF(piece: { name: string; data: any; width: number; height: number }) {
  const c = await renderToCanvas(piece)
  const jpegDataUrl = c.toDataURL("image/jpeg", 0.92)
  const jpegBase64 = jpegDataUrl.split(",")[1]
  const jpegBytes = atob(jpegBase64)
  const jpegBuf = new Uint8Array(jpegBytes.length)
  for (let i = 0; i < jpegBytes.length; i++) jpegBuf[i] = jpegBytes.charCodeAt(i)

  // Constroi PDF estruturado manualmente (1 pagina com 1 imagem)
  const W = piece.width
  const H = piece.height
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

  // Imagem (XObject)
  startObj(4)
  push(`<< /Type /XObject /Subtype /Image /Width ${W} /Height ${H} /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /DCTDecode /Length ${jpegBuf.length} >>\nstream\n`)
  push(jpegBuf)
  push("\nendstream")
  endObj()

  // Stream de conteudo
  const content = `q\n${W} 0 0 ${H} 0 0 cm\n/Im0 Do\nQ\n`
  startObj(5)
  push(`<< /Length ${content.length} >>\nstream\n${content}endstream`)
  endObj()

  // xref
  const xrefOffset = pos
  push(`xref\n0 6\n0000000000 65535 f \n`)
  for (let i = 1; i <= 5; i++) {
    push(offsets[i].toString().padStart(10, "0") + " 00000 n \n")
  }
  push(`trailer\n<< /Size 6 /Root 1 0 R >>\nstartxref\n${xrefOffset}\n%%EOF`)

  // Concatenar
  const total = parts.reduce((a, p) => a + p.length, 0)
  const buf = new Uint8Array(total)
  let off = 0
  for (const p of parts) { buf.set(p, off); off += p.length }
  downloadBlob(new Blob([buf], { type: "application/pdf" }), safeName(piece.name) + ".pdf")
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

// Helper: converte HTMLCanvasElement em ImageData (sem pre-multiplicacao de alfa)
function canvasToImageData(c: HTMLCanvasElement): ImageData {
  const ctx = c.getContext("2d")!
  return ctx.getImageData(0, 0, c.width, c.height)
}

export async function exportPSD(piece: { name: string; data: any; width: number; height: number; sourceWidth?: number; sourceHeight?: number }) {
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
  if (agpsd.initializeCanvas) {
    agpsd.initializeCanvas(
      (w: number, h: number) => { const c = document.createElement("canvas"); c.width = w; c.height = h; return c },
      (c: any) => (c as HTMLCanvasElement).getContext("2d")
    )
  }

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
      psdLayers.push({
        name, top, left, bottom, right,
        text: {
          text: obj.text ?? "",
          transform: [1, 0, 0, 1, left, top + fontSize],
          style: {
            fontName: obj.fontFamily ?? "Arial",
            fontSize,
            fillColor: parseColor(obj.fill ?? "#000000"),
            fauxBold: (obj.fontWeight === "bold" || obj.fontWeight === 700),
          },
          paragraphStyle: { justification: "left" },
        },
      })
    } else {
      // Renderiza objeto isolado e usa imageData (sem pre-multiplicacao)
      const layerCanvas = document.createElement("canvas")
      layerCanvas.width = w
      layerCanvas.height = h
      const lctx = layerCanvas.getContext("2d")!
      try {
        const img = obj.toCanvasElement({ multiplier: scale })
        lctx.drawImage(img, 0, 0, w, h)
        psdLayers.push({ name, top, left, bottom, right, imageData: canvasToImageData(layerCanvas) })
      } catch (e) {
        console.warn("falha rasterizar:", name, e)
      }
    }
  }

  // Composite final - usado pelo Photoshop como preview do documento
  const compositeCanvas = document.createElement("canvas")
  compositeCanvas.width = piece.width
  compositeCanvas.height = piece.height
  const cctx = compositeCanvas.getContext("2d")!
  cctx.fillStyle = "#ffffff"
  cctx.fillRect(0, 0, piece.width, piece.height)
  const drawW = sourceW * scale
  const drawH = sourceH * scale
  cctx.drawImage(fc.getElement(), offsetX, offsetY, drawW, drawH)

  const psd: any = {
    width: piece.width,
    height: piece.height,
    imageData: canvasToImageData(compositeCanvas),  // ImageData ao inves de canvas (evita pre-multiplicacao)
    children: psdLayers,
  }
  const buffer = agpsd.writePsd(psd)
  const blob = new Blob([buffer], { type: "image/vnd.adobe.photoshop" })
  downloadBlob(blob, safeName(piece.name) + ".psd")
  fc.dispose()
}

export async function exportPiece(
  piece: { name: string; data: any; width: number; height: number },
  format: ExportFormat
) {
  switch (format) {
    case "PNG": return exportPNG(piece)
    case "JPG": return exportJPG(piece)
    case "PDF": return exportPDF(piece)
    case "PSD": return exportPSD(piece)
  }
}
