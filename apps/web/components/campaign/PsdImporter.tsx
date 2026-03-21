"use client"
import { useRef, useState } from "react"

interface Props {
  campaignId: string
  onImported: () => void
}

function colorToHex(color: any): string {
  if (!color) return "#000000"
  const r = Math.round((color.r ?? 0) * 255)
  const g = Math.round((color.g ?? 0) * 255)
  const b = Math.round((color.b ?? 0) * 255)
  return "#" + [r, g, b].map(v => v.toString(16).padStart(2, "0")).join("")
}

function flattenLayers(layer: any, result: any[] = []): any[] {
  if (layer.children) {
    for (const child of layer.children) {
      flattenLayers(child, result)
    }
  } else {
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
      const { readPsd } = await import("ag-psd")
      const buffer = await file.arrayBuffer()
      const psd = readPsd(buffer, { skipLayerImageData: false, useImageData: false })

      const canvasWidth = psd.width
      const canvasHeight = psd.height

      // Detectar cor de fundo (primeiro layer sólido ou branco)
      let bgColor = "#ffffff"
      const allLayers = flattenLayers(psd)

      const assets: any[] = []
      let zIndex = 0

      for (const layer of allLayers) {
        if (!layer.name || layer.name === "Background") {
          // Tentar extrair cor de fundo
          if (layer.fillOpacity !== undefined && layer.canvas) {
            bgColor = "#ffffff"
          }
          continue
        }

        const left = layer.left ?? 0
        const top = layer.top ?? 0
        const width = (layer.right ?? 0) - left
        const height = (layer.bottom ?? 0) - top

        if (layer.text) {
          // Layer de texto
          const textData = layer.text
          const rawText = textData.text ?? layer.name
          const fontSize = textData.style?.fontSize ?? 80
          const color = colorToHex(textData.style?.fillColor)
          const fontName = textData.style?.font?.name ?? "Arial"
          const fontWeight = fontName.toLowerCase().includes("bold") ? "bold" : "normal"

          assets.push({
            label: layer.name,
            type: "TEXT",
            content: [{ text: rawText, style: { color, fontSize, fontWeight, fontFamily: fontName } }],
            posX: left, posY: top, width: Math.max(width, 200), height, zIndex,
          })
        } else if (layer.canvas) {
          // Layer de imagem
          const canvas = layer.canvas as HTMLCanvasElement
          const imageUrl = canvas.toDataURL("image/png")
          assets.push({
            label: layer.name,
            type: "IMAGE",
            imageUrl,
            posX: left, posY: top, width: Math.max(width, 100), height, zIndex,
          })
        }
        zIndex++
      }

      setPending({ canvasWidth, canvasHeight, bgColor, assets })
      setConfirm(true)
    } catch (e: any) {
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
      if (!res.ok) throw new Error("Falha ao importar")
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
        onChange={e => { const f = e.target.files?.[0]; if (f) handleFile(f) }} />

      <button style={btnStyle} onClick={() => inputRef.current?.click()} disabled={loading}>
        {loading ? "⏳ Processando..." : "📂 Importar PSD"}
      </button>

      {error && <span style={{ fontSize: 12, color: "#f87171" }}>{error}</span>}

      {/* Modal de confirmação */}
      {confirm && pending && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.7)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000 }}>
          <div style={{ background: "#1a1a1a", border: "1px solid #333", borderRadius: 12, padding: 32, maxWidth: 420, width: "90%" }}>
            <div style={{ fontSize: 18, fontWeight: 700, color: "#fff", marginBottom: 12 }}>Importar PSD</div>
            <div style={{ fontSize: 13, color: "#888", marginBottom: 8 }}>
              Encontramos <strong style={{ color: "#fff" }}>{pending.assets.length} layers</strong> no arquivo.
            </div>
            <div style={{ fontSize: 13, color: "#888", marginBottom: 8 }}>
              Dimensões: <strong style={{ color: "#fff" }}>{pending.canvasWidth} × {pending.canvasHeight}px</strong>
            </div>
            <div style={{ fontSize: 12, color: "#f87171", marginBottom: 24, padding: "8px 12px", background: "rgba(248,113,113,0.1)", borderRadius: 6 }}>
              ⚠️ Os assets existentes desta campanha serão apagados e substituídos pelos layers do PSD.
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
