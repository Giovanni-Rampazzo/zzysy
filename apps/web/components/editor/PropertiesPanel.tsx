"use client"
import { useEffect, useState } from "react"

interface Props {
  selectedObj: any
  fabricRef: React.RefObject<any>
  onUpdate?: (fc: any) => void
  onBgColorChange?: (color: string) => void
}

const FONTS = [
  "Arial","Arial Black","Georgia","Times New Roman","Courier New",
  "Verdana","Trebuchet MS","Impact","Palatino","Tahoma","Helvetica",
]
const BG_SWATCHES = ["#ffffff","#111111","#F5C400","#e63946","#457b9d","#2a9d8f","#264653","#f4a261","#e9c46a","#2d6a4f","#8338ec","#ff006e"]
const TEXT_SWATCHES = ["#ffffff","#111111","#F5C400","#e63946","#457b9d","#2a9d8f","#f4a261","#264653"]

export function PropertiesPanel({ selectedObj, fabricRef, onUpdate, onBgColorChange }: Props) {
  const [fill, setFill] = useState("#111111")
  const [fontSize, setFontSize] = useState(80)
  const [fontFamily, setFontFamily] = useState("Arial")
  const [fontWeight, setFontWeight] = useState("normal")

  useEffect(() => {
    if(!selectedObj) return
    setFill(typeof selectedObj.fill==="string"?selectedObj.fill:"#111111")
    setFontSize(selectedObj.fontSize??80)
    setFontFamily(selectedObj.fontFamily??"Arial")
    setFontWeight(selectedObj.fontWeight??"normal")
  },[selectedObj])

  function apply(key:string, val:any){
    if(!selectedObj||!fabricRef.current) return
    const obj=fabricRef.current.getObjects().find((o:any)=>o===selectedObj||o.layerId===selectedObj.layerId)
    if(!obj) return
    if(key==="fill"){setFill(val);obj.set("fill",val)}
    else if(key==="fontSize"){setFontSize(+val);obj.set("fontSize",+val)}
    else if(key==="fontFamily"){setFontFamily(val);obj.set("fontFamily",val)}
    else if(key==="fontWeight"){setFontWeight(val);obj.set("fontWeight",val)}
    fabricRef.current.renderAll()
    onUpdate?.(fabricRef.current)
  }

  const isBg=selectedObj?.isBackground===true
  const isText=selectedObj?.type==="i-text"||selectedObj?.type==="IText"

  const sec={fontSize:10,fontWeight:700 as const,textTransform:"uppercase" as const,letterSpacing:"0.8px",color:"#555",marginBottom:10}
  const inp={width:"100%",background:"#111",border:"1px solid #2a2a2a",color:"white",fontSize:12,padding:"5px 8px",borderRadius:4,fontFamily:"inherit",outline:"none"} as React.CSSProperties

  return (
    <div style={{width:230,background:"#1a1a1a",borderLeft:"1px solid #222",display:"flex",flexDirection:"column",flexShrink:0,overflowY:"auto"}}>
      <div style={{padding:"12px 16px",fontSize:10,fontWeight:700,textTransform:"uppercase",letterSpacing:"0.8px",color:"#555",borderBottom:"1px solid #222"}}>
        Propriedades
      </div>

      {!selectedObj ? (
        <div style={{fontSize:11,color:"#444",textAlign:"center",padding:"32px 12px"}}>
          Selecione um elemento no canvas
        </div>
      ) : isBg ? (
        <div style={{padding:16}}>
          <div style={{...sec,color:"#F5C400",marginBottom:12}}>🎨 Cor do Background</div>
          <input type="color" value={fill}
            onChange={e=>{setFill(e.target.value);onBgColorChange?.(e.target.value)}}
            style={{width:"100%",height:52,cursor:"pointer",border:"none",borderRadius:8,padding:0,background:"transparent"}}
          />
          <div style={{display:"flex",flexWrap:"wrap",gap:6,marginTop:12}}>
            {BG_SWATCHES.map(c=>(
              <div key={c} onClick={()=>{setFill(c);onBgColorChange?.(c)}}
                style={{width:28,height:28,borderRadius:5,background:c,cursor:"pointer",border:fill===c?"2px solid #F5C400":"2px solid #2a2a2a"}}/>
            ))}
          </div>
        </div>
      ) : isText ? (
        <div style={{padding:16,display:"flex",flexDirection:"column",gap:16}}>
          <div style={{padding:8,background:"rgba(245,196,0,0.08)",borderRadius:6,border:"1px solid rgba(245,196,0,0.2)",fontSize:10,color:"#888"}}>
            💡 Duplo clique para editar o texto. Fonte e cor são salvas no layout.
          </div>

          <div>
            <div style={sec}>Fonte</div>
            <select value={fontFamily} onChange={e=>apply("fontFamily",e.target.value)}
              style={{...inp,fontFamily}}>
              {FONTS.map(f=><option key={f} value={f} style={{fontFamily:f}}>{f}</option>)}
            </select>
          </div>

          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8}}>
            <div>
              <div style={sec}>Tamanho</div>
              <input type="number" value={fontSize} onChange={e=>apply("fontSize",e.target.value)} style={inp}/>
            </div>
            <div>
              <div style={sec}>Peso</div>
              <select value={fontWeight} onChange={e=>apply("fontWeight",e.target.value)} style={inp}>
                <option value="normal">Regular</option>
                <option value="500">Medium</option>
                <option value="bold">Bold</option>
              </select>
            </div>
          </div>

          <div>
            <div style={sec}>Cor do texto</div>
            <input type="color" value={fill} onChange={e=>apply("fill",e.target.value)}
              style={{width:"100%",height:36,cursor:"pointer",border:"none",borderRadius:6,padding:0,background:"transparent"}}/>
            <div style={{display:"flex",flexWrap:"wrap",gap:5,marginTop:8}}>
              {TEXT_SWATCHES.map(c=>(
                <div key={c} onClick={()=>apply("fill",c)}
                  style={{width:24,height:24,borderRadius:4,background:c,cursor:"pointer",border:fill===c?"2px solid #F5C400":"2px solid #2a2a2a"}}/>
              ))}
            </div>
          </div>
        </div>
      ) : (
        <div style={{padding:16,fontSize:11,color:"#555",textAlign:"center"}}>
          Elemento selecionado.<br/>Mova e redimensione no canvas.
        </div>
      )}
    </div>
  )
}
