"use client"

interface Layer {
  id: string
  label: string
  type: string
  locked: boolean
  obj: any
}

interface Props {
  layers: Layer[]
  selectedObj: any
  onSelect: (id: string) => void
  onDelete: (id: string) => void
}

export function LayerPanel({ layers, selectedObj, onSelect, onDelete }: Props) {
  function getIcon(type: string) {
    if (type === "i-text" || type === "IText") return "T"
    if (type === "image") return "⬜"
    return "□"
  }

  function getDotColor(type: string) {
    if (type === "i-text" || type === "IText") return "#F5C400"
    if (type === "image") return "#93c5fd"
    return "#86efac"
  }

  return (
    <div className="w-[220px] bg-[#1a1a1a] border-r border-[#2a2a2a] flex flex-col flex-shrink-0">
      <div className="px-4 py-3 text-xs font-bold uppercase tracking-wider text-[#555555] border-b border-[#2a2a2a]">
        Layers
      </div>
      <div className="flex-1 overflow-y-auto py-1">
        {layers.length === 0 ? (
          <div className="text-xs text-[#444444] text-center py-8 px-4">
            Nenhum layer ainda.<br />Adicione assets acima.
          </div>
        ) : layers.map((layer) => {
          const isSelected = selectedObj?.layerId === layer.id
          return (
            <div
              key={layer.id}
              className={`flex items-center gap-2 px-3 py-2 cursor-pointer group transition-colors ${isSelected ? "bg-[#fef9c3]/10" : "hover:bg-[#ffffff]/5"}`}
              onClick={() => onSelect(layer.id)}
            >
              <div
                className="w-2 h-2 rounded-sm flex-shrink-0"
                style={{ background: getDotColor(layer.type) }}
              />
              <span className="text-xs text-[#888888] group-hover:text-white flex-1 truncate">
                {layer.label}
              </span>
              {layer.locked && (
                <span className="text-[9px] text-[#F5C400] font-bold">🔒</span>
              )}
              <button
                onClick={(e) => { e.stopPropagation(); onDelete(layer.id) }}
                className="text-[#444444] hover:text-red-400 bg-transparent border-0 cursor-pointer opacity-0 group-hover:opacity-100 text-xs px-1"
              >
                ✕
              </button>
            </div>
          )
        })}
      </div>
    </div>
  )
}
