"use client"
import { useEffect, useState } from "react"

interface Props {
  selectedObj: any
  fabricRef: React.RefObject<any>
  onUpdate?: (fc: any) => void
  onBgColorChange?: (color: string) => void
}

export function PropertiesPanel({ selectedObj, fabricRef, onUpdate, onBgColorChange }: Props) {
  const [fill, setFill] = useState("#ffffff")
  const [fontSize, setFontSize] = useState(80)
  const [fontWeight, setFontWeight] = useState("normal")
  const [x, setX] = useState(0)
  const [y, setY] = useState(0)

  useEffect(() => {
    if (!selectedObj) return
    setFill(typeof selectedObj.fill === "string" ? selectedObj.fill : "#111111")
    setFontSize(selectedObj.fontSize ?? 80)
    setFontWeight(selectedObj.fontWeight ?? "normal")
    setX(Math.round(selectedObj.left ?? 0))
    setY(Math.round(selectedObj.top ?? 0))
  }, [selectedObj])

  function apply(key: string, val: any) {
    if (!selectedObj || !fabricRef.current) return
    const obj = fabricRef.current.getObjects().find((o: any) => o === selectedObj || o.layerId === selectedObj.layerId)
    if (!obj) return
    if (key==="fill") { setFill(val); obj.set("fill", val) }
    else if (key==="fontSize") { setFontSize(+val); obj.set("fontSize", +val) }
    else if (key==="fontWeight") { setFontWeight(val); obj.set("fontWeight", val) }
    else if (key==="x") { setX(+val); obj.set("left", +val) }
    else if (key==="y") { setY(+val); obj.set("top", +val) }
    fabricRef.current.renderAll()
    onUpdate?.(fabricRef.current)
  }

  const isBg = selectedObj?.isBackground === true
  const isText = selectedObj?.type === "i-text" || selectedObj?.type === "IText"
  const isLocked = selectedObj?.locked === true

  const sec = {fontSize:10,fontWeight:700,textTransform:"uppercase" as const,letterSpacing:"0.8px",color:"#555",marginBottom:10}
  const inp = {width:"100%",background:"#111",border:"1px solid #2a2a2a",color:"white",fontSize:12,padding:"5px 8px",borderRadius:4,fontFamily:"inherit",outline:"none"} as React.CSSProperties
  const swatches = ["#ffffff","#111111","#F5C400","#e63946","#457b9d","#2a9d8f","#264653","#f4a261","#e9c46a","#2d6a4f"]

  return (
    <div style={{width:220,background:"#1a1a1a",borderLeft:"1px solid #222",display:"flex",flexDirection:"column",flexShrink:0,overflowY:"auto"}}>
      <div style={{padding:"12px 16px",fontSize:10,fontWeight:700,textTransform:"uppercase",letterSpacing:"0.8px",color:"#555",borderBottom:"1px solid #222"}}>
        Propriedades
      </div>

      {!selectedObj ? (
        <div style={{fontSize:11,color:"#444",textAlign:"center",padding:"32px 12px"}}>Selecione um elemento no canvas</div>
      ) : isBg ? (
        <div style={{padding:16}}>
          <div style={{...sec,color:"#F5C400",marginBottom:12}}>🎨 Cor do Background</div>
          <input type="color" value={fill}
            onChange={e => { setFill(e.target.value); onBgColorChange?.(e.target.value) }}
            style={{width:"100%",height:52,cursor:"pointer",border:"none",borderRadius:8,padding:0,background:"transparent"}}
          />
          <div style={{display:"flex",flexWrap:"wrap",gap:6,marginTop:12}}>
            {swatches.map(c=>(
              <div key={c} onClick={()=>{ setFill(c); onBgColorChange?.(c) }}
                style={{width:26,height:26,borderRadius:5,background:c,cursor:"pointer",border:fill===c?"2px solid #F5C400":"2px solid #2a2a2a"}}/>
            ))}
          </div>
          <div style={{marginTop:16,padding:10,background:"#111",borderRadius:6,fontSize:10,color:"#444",textAlign:"center"}}>
            Clique para mudar a cor do fundo
          </div>
        </div>
      ) : (
        <div style={{padding:16,display:"flex",flexDirection:"column",gap:16}}>
          {!isLocked && (
            <div>
              <div style={sec}>Posição</div>
              <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:6}}>
                {[["X","x",x],["Y","y",y]].map(([l,k,v])=>(
                  <div key={k as string}>
                    <label style={{fontSize:9,color:"#555",display:"block",marginBottom:3}}>{l}</label>
                    <input type="number" value={v as number} onChange={e=>apply(k as string,e.target.value)} style={inp}/>
                  </div>
                ))}
              </div>
            </div>
          )}

          {isText && (
            <div>
              <div style={sec}>Tipografia</div>
              <div style={{display:"flex",flexDirection:"column",gap:6}}>
                <div>
                  <label style={{fontSize:9,color:"#555",display:"block",marginBottom:3}}>Tamanho (px)</label>
                  <input type="number" value={fontSize} onChange={e=>apply("fontSize",e.target.value)} style={inp}/>
                </div>
                <div>
                  <label style={{fontSize:9,color:"#555",display:"block",marginBottom:3}}>Peso</label>
                  <select value={fontWeight} onChange={e=>apply("fontWeight",e.target.value)} style={inp}>
                    <option value="normal">Regular</option>
                    <option value="500">Medium</option>
                    <option value="bold">Bold</option>
                  </select>
                </div>
              </div>
            </div>
          )}

          {isText && (
            <div>
              <div style={sec}>Cor</div>
              <input type="color" value={fill} onChange={e=>apply("fill",e.target.value)}
                style={{width:"100%",height:36,cursor:"pointer",border:"none",borderRadius:6,padding:0,background:"transparent"}}/>
              <div style={{display:"flex",flexWrap:"wrap",gap:5,marginTop:8}}>
                {["#ffffff","#111111","#F5C400","#e63946","#457b9d","#2a9d8f"].map(c=>(
                  <div key={c} onClick={()=>apply("fill",c)} style={{width:22,height:22,borderRadius:3,background:c,cursor:"pointer",border:fill===c?"2px solid #F5C400":"2px solid #2a2a2a"}}/>
                ))}
              </div>
            </div>
          )}

          {isLocked && (
            <div style={{padding:10,background:"rgba(245,196,0,0.08)",borderRadius:6,border:"1px solid rgba(245,196,0,0.2)"}}>
              <div style={{fontSize:10,fontWeight:700,color:"#F5C400",marginBottom:3}}>⚠ TRAVADO</div>
              <div style={{fontSize:10,color:"#666"}}>Edite em Campanha → Assets</div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
