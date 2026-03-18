"use client"
import { useEffect, useState } from "react"

interface Props {
  selectedObj: any
  fabricRef: React.RefObject<any>
}

export function PropertiesPanel({ selectedObj, fabricRef }: Props) {
  const [props, setProps] = useState({
    x: 0, y: 0, w: 0, h: 0,
    fontSize: 72, fontWeight: "normal",
    fill: "#111111",
  })

  useEffect(() => {
    if (!selectedObj) return
    setProps({
      x: Math.round(selectedObj.left ?? 0),
      y: Math.round(selectedObj.top ?? 0),
      w: Math.round(selectedObj.width * (selectedObj.scaleX ?? 1)),
      h: Math.round(selectedObj.height * (selectedObj.scaleY ?? 1)),
      fontSize: selectedObj.fontSize ?? 72,
      fontWeight: selectedObj.fontWeight ?? "normal",
      fill: selectedObj.fill ?? "#111111",
    })
  }, [selectedObj])

  function updateObj(key: string, value: any) {
    if (!selectedObj || !fabricRef.current) return
    setProps(p => ({ ...p, [key]: value }))
    if (key === "x") selectedObj.set("left", Number(value))
    else if (key === "y") selectedObj.set("top", Number(value))
    else if (key === "fontSize") selectedObj.set("fontSize", Number(value))
    else if (key === "fill") selectedObj.set("fill", value)
    else if (key === "fontWeight") selectedObj.set("fontWeight", value)
    fabricRef.current.renderAll()
  }

  const isLocked = selectedObj?.locked === true
  const isText = selectedObj?.type === "i-text" || selectedObj?.type === "IText"

  return (
    <div className="w-[220px] bg-[#1a1a1a] border-l border-[#2a2a2a] flex flex-col flex-shrink-0 overflow-y-auto">
      <div className="px-4 py-3 text-xs font-bold uppercase tracking-wider text-[#555555] border-b border-[#2a2a2a]">
        Propriedades
      </div>

      {!selectedObj ? (
        <div className="text-xs text-[#444444] text-center py-8 px-4">
          Selecione um elemento no canvas
        </div>
      ) : (
        <div className="p-4 flex flex-col gap-5">
          {/* Position */}
          <div>
            <div className="text-xs font-semibold uppercase tracking-wider text-[#555555] mb-2">Posição</div>
            <div className="grid grid-cols-2 gap-2">
              {[["X", "x"], ["Y", "y"]].map(([label, key]) => (
                <div key={key}>
                  <label className="text-[10px] text-[#555555] block mb-1">{label}</label>
                  <input
                    type="number"
                    value={(props as any)[key]}
                    onChange={e => updateObj(key, e.target.value)}
                    className="w-full bg-[#111111] border border-[#333333] text-white text-xs px-2 py-1.5 rounded outline-none focus:border-[#F5C400]"
                  />
                </div>
              ))}
            </div>
          </div>

          {/* Size */}
          <div>
            <div className="text-xs font-semibold uppercase tracking-wider text-[#555555] mb-2">Tamanho</div>
            <div className="grid grid-cols-2 gap-2">
              {[["W", "w"], ["H", "h"]].map(([label, key]) => (
                <div key={key}>
                  <label className="text-[10px] text-[#555555] block mb-1">{label}</label>
                  <input
                    type="number"
                    value={(props as any)[key]}
                    readOnly
                    className="w-full bg-[#111111] border border-[#333333] text-[#555555] text-xs px-2 py-1.5 rounded"
                  />
                </div>
              ))}
            </div>
          </div>

          {/* Typography (text only) */}
          {isText && (
            <div>
              <div className="text-xs font-semibold uppercase tracking-wider text-[#555555] mb-2">Tipografia</div>
              <div className="flex flex-col gap-2">
                <div>
                  <label className="text-[10px] text-[#555555] block mb-1">Tamanho</label>
                  <input
                    type="number"
                    value={props.fontSize}
                    onChange={e => updateObj("fontSize", e.target.value)}
                    className="w-full bg-[#111111] border border-[#333333] text-white text-xs px-2 py-1.5 rounded outline-none focus:border-[#F5C400]"
                  />
                </div>
                <div>
                  <label className="text-[10px] text-[#555555] block mb-1">Peso</label>
                  <select
                    value={props.fontWeight}
                    onChange={e => updateObj("fontWeight", e.target.value)}
                    className="w-full bg-[#111111] border border-[#333333] text-white text-xs px-2 py-1.5 rounded outline-none focus:border-[#F5C400]"
                  >
                    <option value="normal">Regular</option>
                    <option value="500">Medium</option>
                    <option value="bold">Bold</option>
                  </select>
                </div>
              </div>
            </div>
          )}

          {/* Color */}
          {isText && (
            <div>
              <div className="text-xs font-semibold uppercase tracking-wider text-[#555555] mb-2">Cor</div>
              <div className="flex gap-2 flex-wrap">
                {["#ffffff", "#111111", "#F5C400", "#e63946", "#457b9d", "#2a9d8f"].map(color => (
                  <div
                    key={color}
                    onClick={() => updateObj("fill", color)}
                    className={`w-6 h-6 rounded cursor-pointer border-2 ${props.fill === color ? "border-[#F5C400]" : "border-transparent"}`}
                    style={{ background: color }}
                  />
                ))}
              </div>
              <input
                type="color"
                value={props.fill}
                onChange={e => updateObj("fill", e.target.value)}
                className="w-full mt-2 h-7 rounded cursor-pointer border border-[#333333] bg-transparent"
              />
            </div>
          )}

          {/* Lock warning */}
          {isLocked && (
            <div className="bg-[#fef9c3]/10 border border-[#F5C400]/30 rounded-lg p-3">
              <div className="text-[10px] font-bold text-[#F5C400] mb-1">⚠ CONTEÚDO TRAVADO</div>
              <div className="text-[10px] text-[#888888]">Edite o texto em Campanha → Assets</div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
