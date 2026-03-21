"use client"
import { useRef, useState } from "react"

interface Props {
  campaignId: string
  onImported: () => void
}

function colorToHex(color: any): string {
  if (!color) return "#000000"
  // ag-psd retorna cores como { r, g, b } com valores 0-255
  const r = Math.round(color.r ?? 0)
  const g = Math.round(color.g ?? 0)
  const b = Math.round(color.b ?? 0)
  return "#" + [r, g, b].map(v => v.toString(16).padStart(2, "0")).join("")
}

function flattenLayers(layer: any, result: any[] = [], depth = 0): any[] {
  if (layer.children?.length) {
    for (const child of layer.children) {
      flattenLayers(child, result, depth + 1)
    }
  }
  // Incluir o layer se tiver conteúdo (texto ou imagem)
  if (depth > 0 && (layer.text || layer.imageData || layer.canvas)) {
    result.push(layer)
  }
  return result
}

export function PsdImporter({ campaignId, onImported }: Props) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")
  const [confirm, setConfirm] = useState(false)
  const [pending, setPending] = useState<any>(null)

  async function handleFile(file: File) {
    setLoading(true)
    setError("")
    try {
      const { readPsd, initializeCanvas } = await import("ag-psd")

      // Inicializar canvas para extração de imagens
      const { createCanvas } = await import("ag-psd").then(m => ({ createCanvas: null })).catch(() => ({ createCanvas: null }))

      const buffer = await file.arrayBuffer()

      // Ler com imageData para capturar layers de imagem
      const psd = readPsd(buffer, {
        skipLayerImageData: false,
        skipCompositeImageData: true,
        skipThumbnail: true,
      })

      const canvasWidth = psd.width
      const canvasHeight = psd.height

      const allLayers = flattenLayers(psd)
      const assets: any[] = []
      let zIndex = allLayers.length

      for (const layer of allLayers) {
        const name = layer.name ?? ""
        if (!name || name === "Background" || name.startsWith("<")) continue

        const left = layer.left ?? 0
        const top = layer.top ?? 0
        const right = layer.right ?? left
        const bottom = layer.bottom ?? top
        const width = Math.max(right - left, 10)
        const height = Math.max(bottom - top, 10)

        if (layer.text) {
          const td = layer.text
          // Pegar estilo do primeiro characterStyle se disponível
          const style = td.styleRuns?.[0]?.style ?? td.style ?? {}
          const fontSize = style.fontSize ?? td.fontSize ?? 48
          const fillColor = style.fillColor ?? td.fillColor
          const color = fillColor ? colorToHex(fillColor) : "#000000"
          const fontName = style.font?.name ?? td.font?.name ?? "Arial"
          const fontWeight = (style.faux_bold || fontName.toLowerCase().includes("bold")) ? "bold" : "normal"
          const rawText = td.text ?? name

          assets.push({
            label: name,
            type: "TEXT",
            content: [{ text: rawText, style: { color, fontSize, fontWeight, fontFamily: fontName } }],
            posX: left, posY: top, width: Math.max(width, 200), height, zIndex,
          })
        } else if (layer.canvas) {
          // Layer com canvas — converter para base64
          try {
            const canvas = layer.canvas as HTMLCanvasElement
            const imageUrl = canvas.toDataURL("image/png")
            assets.push({
              label: name,
              type: "IMAGE",
              imageUrl,
              posX: left, posY: top, width, height, zIndex,
            })
          } catch {
            // Ignorar layers de imagem que não conseguimos converter
          }
        }
        zIndex--
      }

      if (assets.length === 0) {
        setError("Nenhum layer de texto ou imagem encontrado no PSD.")
        return
      }

      setPending({ canvasWidth, canvasHeight, bgColor: "#ffffff", assets })
      setConfirm(true)
    } catch (e: any) {
      console.error("PSD import error:", e)
      setError("Erro ao ler o PSD: " + (e?.message ?? "formato inválido"))
    } finally {
      setLoading(false)
    }
  }

  async function confirmImport() {
    if (!pending) return
    setLoading(true)
    setConfirm(false)
    try {
      const res = await fetch(`/api/campaigns/${campaignId}/import-psd`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(pending),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? "Falha ao importar")
      onImported()
    } catch (e: any) {
      setError(e?.message ?? "Erro ao importar")
    } finally {
      setLoading(false)
      setPending(null)
    }
  }

  const btnStyle = {
    background: "#1a1a1a", border: "1px solid #333", color: "#aaa",
    padding: "8px 16px", borderRadius: 6, fontSize: 13, cursor: "pointer",
    display: "flex", alignItems: "center", gap: 8,
  } as React.CSSProperties

  return (
    <>
      <input ref={inputRef} type="file" accept=".psd" style={{ display: "none" }}
        onChange={e => { const f = e.target.files?.[0]; if (f) handleFile(f); e.target.value = "" }} />

      <button style={btnStyle} onClick={() => inputRef.current?.click()} disabled={loading}>
        {loading ? "⏳ Processando..." : "📂 Importar PSD"}
      </button>

      {error && (
        <span style={{ fontSize: 12, color: "#f87171", maxWidth: 300, display: "block" }}>
          {error}
        </span>
      )}

      {confirm && pending && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.7)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000 }}>
          <div style={{ background: "#1a1a1a", border: "1px solid #333", borderRadius: 12, padding: 32, maxWidth: 420, width: "90%" }}>
            <div style={{ fontSize: 18, fontWeight: 700, color: "#fff", marginBottom: 12 }}>Importar PSD</div>
            <div style={{ fontSize: 13, color: "#888", marginBottom: 8 }}>
              <strong style={{ color: "#fff" }}>{pending.assets.length} layers</strong> encontrados
            </div>
            <div style={{ fontSize: 13, color: "#888", marginBottom: 8 }}>
              Dimensões: <strong style={{ color: "#fff" }}>{pending.canvasWidth} × {pending.canvasHeight}px</strong>
            </div>
            <div style={{ fontSize: 11, color: "#888", marginBottom: 8, maxHeight: 120, overflowY: "auto" as const }}>
              {pending.assets.map((a: any, i: number) => (
                <div key={i} style={{ padding: "2px 0", borderBottom: "1px solid #222" }}>
                  {a.type === "TEXT" ? "T" : "🖼"} {a.label}
                </div>
              ))}
            </div>
            <div style={{ fontSize: 12, color: "#f87171", marginBottom: 24, padding: "8px 12px", background: "rgba(248,113,113,0.1)", borderRadius: 6 }}>
              ⚠️ Assets existentes serão substituídos pelos layers do PSD.
            </div>
            <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
              <button onClick={() => { setConfirm(false); setPending(null) }}
                style={{ background: "transparent", border: "1px solid #333", color: "#888", padding: "8px 16px", borderRadius: 6, cursor: "pointer", fontSize: 13 }}>
                Cancelar
              </button>
              <button onClick={confirmImport}
                style={{ background: "#F5C400", border: "none", color: "#111", padding: "8px 20px", borderRadius: 6, cursor: "pointer", fontSize: 13, fontWeight: 700 }}>
                Confirmar importação
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
