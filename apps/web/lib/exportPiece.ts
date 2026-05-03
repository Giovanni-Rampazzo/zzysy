"use client"
// Exportacao de pecas em multiplos formatos: PSD, PNG, JPG, PDF
// Roda 100% no browser usando Fabric.js (canvas) + ag-psd (PSD) + jsPDF (PDF)

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

function downloadDataUrl(dataUrl: string, filename: string) {
  const a = document.createElement("a")
  a.href = dataUrl
  a.download = filename
  document.body.appendChild(a)
  a.click()
  setTimeout(() => a.remove(), 100)
}

function safeName(s: string) {
  return s.replace(/[^a-zA-Z0-9_\-]/g, "_").substring(0, 80)
}

// Carrega o canvas Fabric a partir de canvasData JSON salvo na peca.
// Aguarda todas as imagens terminarem de carregar antes de retornar.
async function loadFabricFromJSON(canvasData: any, width: number, height: number): Promise<any> {
  const fabric = await import("fabric")
  const StaticCanvas = (fabric as any).StaticCanvas

  // Cria canvas offscreen com as dimensoes corretas
  const el = document.createElement("canvas")
  el.width = width
  el.height = height

  const fc = new StaticCanvas(el, { width, height, enableRetinaScaling: false })
  await new Promise<void>((resolve, reject) => {
    fc.loadFromJSON(canvasData, () => {
      fc.renderAll()
      resolve()
    })
  })
  // Aguarda todas imagens terminarem (loadFromJSON ja espera, mas garantia)
  await new Promise(r => setTimeout(r, 200))
  fc.renderAll()
  return fc
}

// Renderiza uma peca para um <canvas> offscreen no tamanho final solicitado.
async function renderToCanvas(piece: { data: any; width: number; height: number }): Promise<HTMLCanvasElement> {
  const data = typeof piece.data === "string" ? JSON.parse(piece.data) : piece.data
  const canvasData = data?.canvasData ?? data
  const sourceW = data?.sourceWidth ?? piece.width
  const sourceH = data?.sourceHeight ?? piece.height

  const fc = await loadFabricFromJSON(canvasData, sourceW, sourceH)

  // Cria canvas final no tamanho da peca, escalando proporcionalmente
  const out = document.createElement("canvas")
  out.width = piece.width
  out.height = piece.height
  const ctx = out.getContext("2d")!

  // Escala proporcional centralizada
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
  c.toBlob(b => { if (b) downloadBlob(b, `${safeName(piece.name)}.png`) }, "image/png")
}

export async function exportJPG(piece: { name: string; data: any; width: number; height: number }) {
  const c = await renderToCanvas(piece)
  c.toBlob(b => { if (b) downloadBlob(b, `${safeName(piece.name)}.jpg`) }, "image/jpeg", 0.92)
}

export async function exportPDF(piece: { name: string; data: any; width: number; height: number }) {
  const c = await renderToCanvas(piece)
  const { jsPDF } = await import("jspdf")
  const orientation = piece.width > piece.height ? "landscape" : "portrait"
  const pdf = new jsPDF({ orientation, unit: "px", format: [piece.width, piece.height], hotfixes: ["px_scaling"] })
  pdf.addImage(c.toDataURL("image/jpeg", 0.92), "JPEG", 0, 0, piece.width, piece.height)
  pdf.save(`${safeName(piece.name)}.pdf`)
}

// Exporta como PSD editavel: cada layer Fabric vira um layer PSD.
// Textos viram PSD text layers (editaveis no Photoshop), imagens viram raster layers.
export async function exportPSD(piece: { name: string; data: any; width: number; height: number; sourceWidth?: number; sourceHeight?: number }) {
  const data = typeof piece.data === "string" ? JSON.parse(piece.data) : piece.data
  const canvasData = data?.canvasData ?? data
  const sourceW = data?.sourceWidth ?? piece.sourceWidth ?? piece.width
  const sourceH = data?.sourceHeight ?? piece.sourceHeight ?? piece.height

  const fc = await loadFabricFromJSON(canvasData, sourceW, sourceH)
  const objects = fc.getObjects()

  // Escala de adaptacao para tamanho da peca
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
    const ox = (obj.left ?? 0)
    const oy = (obj.top ?? 0)
    const ow = (obj.width ?? 100) * (obj.scaleX ?? 1)
    const oh = (obj.height ?? 100) * (obj.scaleY ?? 1)

    // Posicao final na peca (com escala e offset)
    const left = Math.round(ox * scale + offsetX)
    const top = Math.round(oy * scale + offsetY)
    const right = Math.round((ox + ow) * scale + offsetX)
    const bottom = Math.round((oy + oh) * scale + offsetY)
    const w = Math.max(1, right - left)
    const h = Math.max(1, bottom - top)

    const name = (obj as any).__assetLabel ?? obj.type ?? "Layer"

    if (obj.type === "textbox" || obj.type === "i-text" || obj.type === "text") {
      const fontSize = Math.round((obj.fontSize ?? 48) * scale)
      const fillColor = parseColor(obj.fill ?? "#000000")
      psdLayers.push({
        name,
        top, left, bottom, right,
        text: {
          text: obj.text ?? "",
          transform: [1, 0, 0, 1, left, top + fontSize],
          style: {
            fontName: obj.fontFamily ?? "Arial",
            fontSize,
            fillColor,
            fauxBold: (obj.fontWeight === "bold" || obj.fontWeight === 700),
          },
          paragraphStyle: { justification: "left" },
        },
      })
    } else {
      // Renderiza esse objeto sozinho num canvas para virar raster layer
      const layerCanvas = document.createElement("canvas")
      layerCanvas.width = w
      layerCanvas.height = h
      const lctx = layerCanvas.getContext("2d")!

      // Render do objeto isolado
      try {
        const img = obj.toCanvasElement({ multiplier: scale })
        lctx.drawImage(img, 0, 0, w, h)
      } catch (e) {
        console.warn("falha ao rasterizar layer:", name, e)
      }

      psdLayers.push({
        name,
        top, left, bottom, right,
        canvas: layerCanvas,
      })
    }
  }

  const psd: any = {
    width: piece.width,
    height: piece.height,
    children: psdLayers,
  }

  const buffer = agpsd.writePsd(psd)
  const blob = new Blob([buffer], { type: "image/vnd.adobe.photoshop" })
  downloadBlob(blob, `${safeName(piece.name)}.psd`)
  fc.dispose()
}

function parseColor(c: string): { r: number; g: number; b: number } {
  if (typeof c !== "string") return { r: 0, g: 0, b: 0 }
  const hex = c.replace("#", "")
  if (hex.length === 6) {
    return {
      r: parseInt(hex.slice(0, 2), 16),
      g: parseInt(hex.slice(2, 4), 16),
      b: parseInt(hex.slice(4, 6), 16),
    }
  }
  if (hex.length === 3) {
    return {
      r: parseInt(hex[0] + hex[0], 16),
      g: parseInt(hex[1] + hex[1], 16),
      b: parseInt(hex[2] + hex[2], 16),
    }
  }
  // rgb(...)
  const m = c.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)/)
  if (m) return { r: +m[1], g: +m[2], b: +m[3] }
  return { r: 0, g: 0, b: 0 }
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
