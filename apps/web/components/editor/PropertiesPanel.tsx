"use client"
import { useEffect, useState, useRef } from "react"

interface Props {
  selectedObj: any
  fabricRef: React.RefObject<any>
  onUpdate?: () => void
}

export function PropertiesPanel({ selectedObj, fabricRef, onUpdate }: Props) {
  const [fill, setFill] = useState("#ffffff")
  const [fontSize, setFontSize] = useState(80)
  const [fontWeight, setFontWeight] = useState("normal")
  const [x, setX] = useState(0)
  const [y, setY] = useState(0)
  const [w, setW] = useState(0)
  const [h, setH] = useState(0)

  useEffect(() => {
    if (!selectedObj) return
    setFill(selectedObj.fill ?? "#ffffff")
    setFontSize(selectedObj.fontSize ?? 80)
    setFontWeight(selectedObj.fontWeight ?? "normal")
    setX(Math.round(selectedObj.left ?? 0))
    setY(Math.round(selectedObj.top ?? 0))
    setW(Math.round((selectedObj.width ?? 0) * (selectedObj.scaleX ?? 1)))
    setH(Math.round((selectedObj.height ?? 0) * (selectedObj.scaleY ?? 1)))
  }, [selectedObj])

  function update(key: string, value: any) {
    if (!selectedObj || !fabricRef.current) return
    if (key === "fill") { setFill(value); selectedObj.set("fill", value) }
    else if (key === "fontSize") { setFontSize(+value); selectedObj.set("fontSize", +value) }
    else if (key === "fontWeight") { setFontWeight(value); selectedObj.set("fontWeight", value) }
    else if (key === "x") { setX(+value); selectedObj.set("left", +value) }
    else if (key === "y") { setY(+value); selectedObj.set("top", +value) }
    fabricRef.current.renderAll()
    onUpdate?.()
  }

  const isBackground = selectedObj?.isBackground === true
  const isText = selectedObj?.type === "i-text" || selectedObj?.type === "IText"
  const isLocked = selectedObj?.locked === true

  const sectionTitle = {fontSize:10,fontWeight:700,textTransform:"uppercase" as const,letterSpacing:"0.8px",color:"#555",marginBottom:10}
  const inputStyle = {width:"100%",background:"#111",border:"1px solid #333",color:"white",fontSize:12,padding:"5px 8px",borderRadius:4,fontFamily:"inherit",outline:"none"} as React.CSSProperties

  return (
    <div style={{width:220,background:"#1a1a1a",borderLeft:"1px solid #2a2a2a",display:"flex",flexDirection:"column",flexShrink:0,overflowY:"auto"}}>
      <div style={{padding:"12px 16px",fontSize:10,fontWeight:700,textTransform:"uppercase",letterSpacing:"0.8px",color:"#555",borderBottom:"1px solid #2a2a2a"}}>
        Propriedades
      </div>

      {!selectedObj ? (
        <div style={{fontSize:11,color:"#444",textAlign:"center",padding:"32px 16px"}}>
          Selecione um elemento no canvas
        </div>
      ) : isBackground ? (
        /* === BACKGROUND: só mostra color picker em destaque === */
        <div style={{padding:16}}>
          <div style={{...sectionTitle,color:"#F5C400"}}>🎨 Cor do Background</div>
          <div style={{marginBottom:16}}>
            <input
              type="color"
              value={fill}
              onChange={e => update("fill", e.target.value)}
              style={{width:"100%",height:48,cursor:"pointer",border:"none",borderRadius:8,background:"transparent",padding:0}}
            />
          </div>
          <div style={{display:"flex",flexWrap:"wrap",gap:6,marginBottom:16}}>
            {["#ffffff","#111111","#F5C400","#e63946","#457b9d","#2a9d8f","#264653","#f4a261","#e9c46a","#2d6a4f"].map(c => (
              <div
                key={c}
                onClick={() => update("fill", c)}
                style={{width:24,height:24,borderRadius:4,background:c,cursor:"pointer",border:fill===c?"2px solid #F5C400":"2px solid #333"}}
              />
            ))}
          </div>
          <div style={{padding:10,background:"#111",borderRadius:6,fontSize:10,color:"#555",textAlign:"center"}}>
            Arraste outros elementos por cima do background
          </div>
        </div>
      ) : (
        /* === OUTROS ELEMENTOS === */
        <div style={{padding:16,display:"flex",flexDirection:"column",gap:16}}>
          {/* Posição */}
          {!isLocked && (
            <div>
              <div style={sectionTitle}>Posição</div>
              <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:6}}>
                {[["X","x",x],["Y","y",y]].map(([l,k,v]) => (
                  <div key={k as string}>
                    <label style={{fontSize:9,color:"#555",display:"block",marginBottom:3}}>{l}</label>
                    <input type="number" value={v as number} onChange={e => update(k as string,e.target.value)} style={inputStyle} />
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Tamanho */}
          <div>
            <div style={sectionTitle}>Tamanho</div>
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:6}}>
              {[["W",w],["H",h]].map(([l,v]) => (
                <div key={l as string}>
                  <label style={{fontSize:9,color:"#555",display:"block",marginBottom:3}}>{l}</label>
                  <input type="number" value={v as number} readOnly style={{...inputStyle,color:"#555"}} />
                </div>
              ))}
            </div>
          </div>

          {/* Tipografia — só texto */}
          {isText && (
            <div>
              <div style={sectionTitle}>Tipografia</div>
              <div style={{display:"flex",flexDirection:"column",gap:6}}>
                <div>
                  <label style={{fontSize:9,color:"#555",display:"block",marginBottom:3}}>Tamanho</label>
                  <input type="number" value={fontSize} onChange={e => update("fontSize",e.target.value)} style={inputStyle} />
                </div>
                <div>
                  <label style={{fontSize:9,color:"#555",display:"block",marginBottom:3}}>Peso</label>
                  <select value={fontWeight} onChange={e => update("fontWeight",e.target.value)} style={inputStyle}>
                    <option value="normal">Regular</option>
                    <option value="500">Medium</option>
                    <option value="bold">Bold</option>
                  </select>
                </div>
              </div>
            </div>
          )}

          {/* Cor */}
          {isText && (
            <div>
              <div style={sectionTitle}>Cor do texto</div>
              <input type="color" value={fill} onChange={e => update("fill",e.target.value)} style={{width:"100%",height:36,cursor:"pointer",border:"none",borderRadius:6,background:"transparent",padding:0}} />
              <div style={{display:"flex",flexWrap:"wrap",gap:5,marginTop:8}}>
                {["#ffffff","#111111","#F5C400","#e63946","#457b9d","#2a9d8f"].map(c => (
                  <div key={c} onClick={() => update("fill",c)} style={{width:22,height:22,borderRadius:3,background:c,cursor:"pointer",border:fill===c?"2px solid #F5C400":"2px solid #333"}} />
                ))}
              </div>
            </div>
          )}

          {/* Lock warning */}
          {isLocked && (
            <div style={{padding:10,background:"rgba(245,196,0,0.1)",borderRadius:6,border:"1px solid rgba(245,196,0,0.3)"}}>
              <div style={{fontSize:10,fontWeight:700,color:"#F5C400",marginBottom:3}}>⚠ CONTEÚDO TRAVADO</div>
              <div style={{fontSize:10,color:"#888"}}>Edite em Campanha → Assets</div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
