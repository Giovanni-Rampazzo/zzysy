"use client"
import { useEffect, useRef, useState } from "react"
import { useRouter } from "next/navigation"
import { GeneratePiecesModal } from "./GeneratePiecesModal"

// ─── Tipos ───────────────────────────────────────────────────────
interface TextSpan {
  text: string
  styles: { fontSize?: number; color?: string; fontWeight?: string; fontFamily?: string }
}
interface Asset {
  id: string; type: string; label: string; value: string | null
  imageUrl: string | null; content: TextSpan[] | null
  posX: number; posY: number; scaleX: number; scaleY: number
  rotation: number; width: number; visible: boolean
}
interface Layer {
  assetId: string; posX: number; posY: number
  scaleX: number; scaleY: number; rotation: number; zIndex: number; width: number
}
interface Campaign {
  id: string; name: string; client: { id: string; name: string }
  assets: Asset[]
  keyVision: { id: string; bgColor: string; layers: Layer[] | null } | null
}

// ─── Constantes ──────────────────────────────────────────────────
const CW = 1920, CH = 1080
const IMAGE_TYPES = ["PERSONA","PRODUTO","FUNDO","LOGOMARCA","CUSTOM_IMAGE"]
const LW = 220, PW = 260, TH = 48, BH = 44
const FONTS = ["Arial","Arial Black","Georgia","Times New Roman","Courier New","Verdana","Impact","Trebuchet MS"]
const COLORS = ["#111111","#ffffff","#F5C400","#e63946","#457b9d","#2a9d8f","#264653","#f4a261","#8338ec","#ff006e","#06d6a0","#118ab2"]

// ─── Helpers ─────────────────────────────────────────────────────
function getSpans(asset: Asset): TextSpan[] {
  if (asset.content && Array.isArray(asset.content) && asset.content.length > 0)
    return asset.content as TextSpan[]
  const text = asset.value?.trim() || `{{ ${asset.label} }}`
  return [{ text, styles: { fontSize: 80, color: "#111111", fontWeight: "normal", fontFamily: "Arial" } }]
}

// Converte spans para HTML para o contentEditable
function spansToHTML(spans: TextSpan[]): string {
  return spans.map(span => {
    const style = [
      `color:${span.styles.color ?? "#111111"}`,
      `font-size:${span.styles.fontSize ?? 80}px`,
      `font-family:${span.styles.fontFamily ?? "Arial"}`,
      `font-weight:${span.styles.fontWeight ?? "normal"}`,
    ].join(";")
    // Preservar quebras de linha
    const text = span.text.replace(/
/g, "<br>")
    return `<span style="${style}">${text}</span>`
  }).join("")
}

// Converte HTML do contentEditable de volta para spans
function htmlToSpans(html: string, baseStyles: TextSpan["styles"]): TextSpan[] {
  const div = document.createElement("div")
  div.innerHTML = html
  const result: TextSpan[] = []

  function extractFromNode(node: Node) {
    if (node.nodeType === Node.TEXT_NODE) {
      const text = node.textContent ?? ""
      if (text) {
        const parent = node.parentElement
        const style = parent?.style
        result.push({
          text,
          styles: {
            color: style?.color || baseStyles.color || "#111111",
            fontSize: style?.fontSize ? parseInt(style.fontSize) : (baseStyles.fontSize ?? 80),
            fontFamily: style?.fontFamily?.replace(/['"]/g,"") || baseStyles.fontFamily || "Arial",
            fontWeight: style?.fontWeight || baseStyles.fontWeight || "normal",
          }
        })
      }
    } else if (node.nodeName === "BR") {
      result.push({ text: "
", styles: baseStyles })
    } else {
      node.childNodes.forEach(extractFromNode)
    }
  }

  div.childNodes.forEach(extractFromNode)
  return result.length ? result : [{ text: div.innerText || "", styles: baseStyles }]
}

// ─── Editor Principal ─────────────────────────────────────────────
export function KeyVisionEditor({ campaignId }: { campaignId: string }) {
  const router = useRouter()
  const [campaign, setCampaign] = useState<Campaign | null>(null)
  const [layers, setLayers] = useState<Layer[]>([])
  const [bgColor, setBgColor] = useState("#ffffff")
  const [zoom, setZoom] = useState(0.5)
  const [selectedIdx, setSelectedIdx] = useState<number | null>(null)
  const [editingIdx, setEditingIdx] = useState<number | null>(null)
  const [dragging, setDragging] = useState<{idx:number;sx:number;sy:number;ox:number;oy:number}|null>(null)
  const [modal, setModal] = useState(false)
  const [saving, setSaving] = useState(false)
  const [canvasPos, setCanvasPos] = useState({left:LW+40,top:TH+BH+40})
  const [hasSel, setHasSel] = useState(false)
  const editableRefs = useRef<Record<number, HTMLDivElement | null>>({})
  const saveTimer = useRef<any>()

  function calcPos(z: number) {
    if (typeof window === "undefined") return {left:LW+40,top:TH+BH+40}
    const availW = window.innerWidth - LW - PW
    const availH = window.innerHeight - TH - BH
    return {
      left: LW + Math.max(40, (availW - Math.round(CW*z)) / 2),
      top: TH + BH + Math.max(40, (availH - Math.round(CH*z)) / 2)
    }
  }

  useEffect(() => {
    if (typeof window === "undefined") return
    const aw = window.innerWidth - LW - PW - 80
    const ah = window.innerHeight - TH - BH - 80
    const z = Math.round(Math.min(0.7, aw/CW, ah/CH) * 10) / 10
    setZoom(z); setCanvasPos(calcPos(z))
  }, [])

  useEffect(() => {
    fetch(`/api/campaigns/${campaignId}`).then(r=>r.json()).then((d:Campaign) => {
      setCampaign(d)
      setBgColor(d.keyVision?.bgColor ?? "#ffffff")
      if (d.keyVision?.layers?.length) setLayers(d.keyVision.layers)
    })
  }, [campaignId])

  // Monitorar seleção de texto
  useEffect(() => {
    function onSelChange() {
      const sel = window.getSelection()
      setHasSel(!!(sel && !sel.isCollapsed && sel.toString().length > 0))
    }
    document.addEventListener("selectionchange", onSelChange)
    return () => document.removeEventListener("selectionchange", onSelChange)
  }, [])

  function doSave(l: Layer[], bg: string) {
    clearTimeout(saveTimer.current)
    saveTimer.current = setTimeout(async () => {
      setSaving(true)
      await fetch(`/api/campaigns/${campaignId}/key-vision`, {
        method:"PUT", headers:{"Content-Type":"application/json"},
        body: JSON.stringify({bgColor:bg,layers:l})
      })
      setSaving(false)
    }, 800)
  }

  async function saveAssetContent(assetId: string, content: TextSpan[]) {
    await fetch(`/api/campaigns/${campaignId}/assets/${assetId}`, {
      method:"PUT", headers:{"Content-Type":"application/json"},
      body: JSON.stringify({content})
    })
    setCampaign(prev => prev ? {
      ...prev, assets: prev.assets.map(a => a.id===assetId ? {...a,content} : a)
    } : prev)
  }

  function addLayer(asset: Asset) {
    const l: Layer = {assetId:asset.id,posX:100,posY:100,scaleX:1,scaleY:1,rotation:0,zIndex:layers.length,width:900}
    const nl = [...layers,l]
    setLayers(nl); setSelectedIdx(nl.length-1); doSave(nl,bgColor)
  }
  function removeLayer(idx: number) {
    const nl = layers.filter((_,i)=>i!==idx)
    setLayers(nl); setSelectedIdx(null); setEditingIdx(null); doSave(nl,bgColor)
  }
  function updateBg(c: string) { setBgColor(c); doSave(layers,c) }
  function updateLayer(idx: number, patch: Partial<Layer>) {
    const nl = layers.map((l,i)=>i===idx?{...l,...patch}:l)
    setLayers(nl); doSave(nl,bgColor)
  }

  // Entrar em modo de edição
  function startEdit(idx: number) {
    const asset = campaign?.assets.find(a=>a.id===layers[idx].assetId)
    if (!asset) return
    setEditingIdx(idx)
    setSelectedIdx(idx)
    setTimeout(() => {
      const el = editableRefs.current[idx]
      if (!el) return
      el.innerHTML = spansToHTML(getSpans(asset))
      el.focus()
      // Cursor no final
      const range = document.createRange()
      range.selectNodeContents(el)
      range.collapse(false)
      window.getSelection()?.removeAllRanges()
      window.getSelection()?.addRange(range)
    }, 20)
  }

  // Sair do modo de edição e salvar
  function endEdit(idx: number) {
    const el = editableRefs.current[idx]
    const asset = campaign?.assets.find(a=>a.id===layers[idx].assetId)
    if (!el || !asset) { setEditingIdx(null); return }
    const baseStyles = getSpans(asset)[0]?.styles ?? {}
    const spans = htmlToSpans(el.innerHTML, baseStyles)
    setEditingIdx(null)
    saveAssetContent(asset.id, spans)
  }

  // Aplicar estilo via execCommand (mantém foco no editor)
  function applyStyle(cmd: string, value?: string) {
    const el = editingIdx !== null ? editableRefs.current[editingIdx] : null
    if (!el) return
    el.focus()
    document.execCommand(cmd, false, value)
  }

  // Aplicar cor: usa execCommand foreColor
  function applyColor(color: string) {
    applyStyle("foreColor", color)
  }

  // Aplicar fonte
  function applyFont(font: string) {
    applyStyle("fontName", font)
  }

  // Aplicar tamanho (1-7 para execCommand, mas usamos span inline)
  function applyFontSize(size: number) {
    if (editingIdx === null) return
    const el = editableRefs.current[editingIdx]
    if (!el) return
    el.focus()
    // execCommand fontSize só aceita 1-7, então usamos um workaround
    document.execCommand("fontSize", false, "7")
    // Substituir o font-size do elemento criado
    el.querySelectorAll("font[size='7']").forEach(node => {
      const span = document.createElement("span")
      span.style.fontSize = `${size}px`
      span.innerHTML = (node as HTMLElement).innerHTML
      node.parentNode?.replaceChild(span, node)
    })
  }

  // Drag
  function onMouseDown(e: React.MouseEvent, idx: number) {
    if (editingIdx === idx) return
    e.stopPropagation()
    setSelectedIdx(idx)
    setDragging({idx,sx:e.clientX,sy:e.clientY,ox:layers[idx].posX,oy:layers[idx].posY})
  }
  useEffect(() => {
    function onMove(e: MouseEvent) {
      if (!dragging) return
      const dx = (e.clientX-dragging.sx)/zoom
      const dy = (e.clientY-dragging.sy)/zoom
      setLayers(prev=>prev.map((l,i)=>i===dragging.idx?{...l,posX:dragging.ox+dx,posY:dragging.oy+dy}:l))
    }
    function onUp() { if(dragging) doSave(layers,bgColor); setDragging(null) }
    window.addEventListener("mousemove",onMove); window.addEventListener("mouseup",onUp)
    return () => { window.removeEventListener("mousemove",onMove); window.removeEventListener("mouseup",onUp) }
  }, [dragging,layers,zoom])

  function chZoom(d: number) {
    const z = Math.min(2,Math.max(0.1,zoom+d))
    setZoom(z); setCanvasPos(calcPos(z))
  }

  if (!campaign) return (
    <div style={{display:"flex",alignItems:"center",justifyContent:"center",height:"100vh",background:"#1a1a1a",color:"#888",fontSize:14}}>
      Carregando editor...
    </div>
  )

  const sel = selectedIdx !== null ? layers[selectedIdx] : null
  const selAsset = sel ? campaign.assets.find(a=>a.id===sel.assetId) : null
  const isSelText = selAsset && !IMAGE_TYPES.includes(selAsset.type)

  const pS = {position:"fixed" as const,top:0,bottom:0,background:"rgba(18,18,18,0.97)",backdropFilter:"blur(12px)",zIndex:100,display:"flex",flexDirection:"column" as const,overflowY:"auto" as const}
  const bS = {background:"transparent",border:"none",cursor:"pointer",color:"#aaa",fontSize:18,padding:"0 4px"} as React.CSSProperties
  const inpS = {width:"100%",background:"#111",border:"1px solid #2a2a2a",color:"white",fontSize:12,padding:"5px 8px",borderRadius:4,fontFamily:"inherit",outline:"none"} as React.CSSProperties
  const secS = {fontSize:10,fontWeight:700 as const,textTransform:"uppercase" as const,letterSpacing:"0.8px",color:"#555",marginBottom:8}

  return (
    <div style={{position:"fixed",inset:0,background:"#1e1e1e",overflow:"hidden"}}>

      {/* CANVAS */}
      <div
        style={{position:"absolute",left:canvasPos.left,top:canvasPos.top,width:Math.round(CW*zoom),height:Math.round(CH*zoom),background:bgColor,boxShadow:"0 8px 64px rgba(0,0,0,0.8)",overflow:"hidden"}}
        onMouseDown={e=>{ if(e.target===e.currentTarget){setSelectedIdx(null);if(editingIdx!==null)endEdit(editingIdx)} }}
      >
        {[...layers].sort((a,b)=>a.zIndex-b.zIndex).map((layer,idx)=>{
          const asset = campaign.assets.find(a=>a.id===layer.assetId)
          if (!asset) return null
          const isImg = IMAGE_TYPES.includes(asset.type)
          const isSel = selectedIdx===idx
          const isEdit = editingIdx===idx
          const spans = getSpans(asset)
          const base = spans[0]?.styles ?? {}

          return (
            <div key={`${layer.assetId}-${idx}`}
              onMouseDown={e=>onMouseDown(e,idx)}
              onDoubleClick={e=>{ e.stopPropagation(); if(!isImg) startEdit(idx) }}
              style={{
                position:"absolute",
                left:layer.posX*zoom,
                top:layer.posY*zoom,
                width:(isImg?400:layer.width)*zoom,
                cursor:dragging?.idx===idx?"grabbing":(isEdit?"text":"grab"),
                outline:isSel&&!isEdit?"2px solid #F5C400":"2px solid transparent",
                outlineOffset:2,
              }}
            >
              {isImg ? (
                <div style={{width:400*zoom,height:300*zoom,background:"#e8e8e8",border:`${2*zoom}px dashed #aaa`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:14*zoom,color:"#888",overflow:"hidden"}}>
                  {asset.imageUrl
                    ? <img src={asset.imageUrl} style={{width:"100%",height:"100%",objectFit:"cover"}}/>
                    : <span>{asset.label}</span>}
                </div>
              ) : isEdit ? (
                // Modo de edição: contentEditable com HTML rico
                <div
                  ref={el=>editableRefs.current[idx]=el}
                  contentEditable
                  suppressContentEditableWarning
                  onBlur={e=>{
                    // Não sair se o foco foi para o painel
                    const related = e.relatedTarget as HTMLElement|null
                    if(related?.closest("[data-panel]")) return
                    endEdit(idx)
                  }}
                  style={{
                    outline:"2px dashed #F5C400",
                    outlineOffset:2,
                    padding:4,
                    minWidth:50,
                    lineHeight:1.2,
                    fontSize:(base.fontSize??80)*zoom,
                    fontFamily:base.fontFamily??"Arial",
                    fontWeight:base.fontWeight??"normal",
                    color:base.color??"#111",
                    caretColor:"#F5C400",
                    whiteSpace:"pre-wrap",
                    wordBreak:"break-word",
                    userSelect:"text",
                  }}
                />
              ) : (
                // Modo de visualização: spans com estilos
                <div style={{lineHeight:1.2,pointerEvents:"none",whiteSpace:"pre-wrap",wordBreak:"break-word"}}>
                  {spans.map((span,si)=>(
                    <span key={si} style={{
                      fontSize:(span.styles.fontSize??80)*zoom,
                      color:span.styles.color??"#111",
                      fontWeight:span.styles.fontWeight??"normal",
                      fontFamily:span.styles.fontFamily??"Arial",
                    }}>{span.text === "
" ? <br/> : span.text}</span>
                  ))}
                </div>
              )}
            </div>
          )
        })}
      </div>

      {/* TOPBAR */}
      <div style={{position:"fixed",top:0,left:0,right:0,height:TH,background:"rgba(17,17,17,0.98)",borderBottom:"1px solid #2a2a2a",display:"flex",alignItems:"center",padding:"0 16px",gap:12,zIndex:200}}>
        <button onClick={()=>router.push(`/campaigns/${campaignId}`)} style={{...bS,fontSize:13}}>← {campaign.name}</button>
        <div style={{flex:1}}/>
        {saving&&<span style={{fontSize:11,color:"#555"}}>Salvando...</span>}
        <span style={{fontSize:11,color:"#555"}}>1920 × 1080</span>
        <button onClick={()=>setModal(true)} style={{background:"#F5C400",border:"none",borderRadius:6,padding:"6px 16px",fontWeight:700,fontSize:13,cursor:"pointer",color:"#111"}}>▶ Gerar Peças</button>
      </div>

      {/* ASSET BAR */}
      <div style={{position:"fixed",top:TH,left:LW,right:PW,height:BH,background:"rgba(26,26,26,0.98)",borderBottom:"1px solid #2a2a2a",display:"flex",alignItems:"center",padding:"0 16px",gap:8,zIndex:200,overflowX:"auto" as const}}>
        <span style={{fontSize:11,color:"#555",fontWeight:600,flexShrink:0}}>+ Adicionar:</span>
        {campaign.assets.map(asset=>(
          <button key={asset.id} onClick={()=>addLayer(asset)}
            style={{fontSize:11,padding:"4px 10px",borderRadius:4,border:"1px solid #333",background:"#222",color:"#aaa",cursor:"pointer",flexShrink:0,whiteSpace:"nowrap" as const}}>
            {asset.label}{asset.value?` "${asset.value.substring(0,10)}"` : ""}
          </button>
        ))}
        <div style={{flex:1}}/>
        <button onClick={()=>chZoom(-0.1)} style={bS}>−</button>
        <span style={{fontSize:11,color:"#555",minWidth:40,textAlign:"center"}}>{Math.round(zoom*100)}%</span>
        <button onClick={()=>chZoom(+0.1)} style={bS}>+</button>
      </div>

      {/* LAYER PANEL */}
      <div data-panel="true" style={{...pS,left:0,width:LW,borderRight:"1px solid #2a2a2a",paddingTop:TH}}>
        <div style={{padding:"10px 14px",...secS,borderBottom:"1px solid #2a2a2a",marginBottom:0}}>Layers</div>
        <div style={{flex:1,overflowY:"auto" as const,padding:"4px 0"}}>
          <div
            onMouseDown={e=>e.preventDefault()}
            onClick={()=>{if(editingIdx!==null)endEdit(editingIdx);setSelectedIdx(null)}}
            style={{display:"flex",alignItems:"center",gap:8,padding:"8px 12px",cursor:"pointer",borderLeft:selectedIdx===null?"2px solid #F5C400":"2px solid transparent",background:selectedIdx===null?"rgba(245,196,0,0.08)":"transparent"}}>
            <div style={{width:7,height:7,borderRadius:2,background:bgColor,border:"1px solid #555",flexShrink:0}}/>
            <span style={{fontSize:12,color:selectedIdx===null?"#fff":"#888"}}>🎨 Background</span>
          </div>
          {[...layers].reverse().map((_,ri)=>{
            const idx=layers.length-1-ri; const layer=layers[idx]
            const asset=campaign.assets.find(a=>a.id===layer.assetId)
            const isSel=selectedIdx===idx
            return (
              <div key={idx}
                onMouseDown={e=>e.preventDefault()}
                onClick={()=>{if(editingIdx!==null&&editingIdx!==idx)endEdit(editingIdx);setSelectedIdx(idx)}}
                style={{display:"flex",alignItems:"center",gap:8,padding:"8px 12px",cursor:"pointer",borderLeft:isSel?"2px solid #F5C400":"2px solid transparent",background:isSel?"rgba(245,196,0,0.08)":"transparent"}}>
                <div style={{width:7,height:7,borderRadius:2,background:IMAGE_TYPES.includes(asset?.type??"")?"#86efac":"#F5C400",flexShrink:0}}/>
                <span style={{fontSize:12,color:isSel?"#fff":"#888",flex:1,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap" as const}}>
                  {asset?.label??"Layer"}
                </span>
                <button
                  onMouseDown={e=>e.preventDefault()}
                  onClick={e=>{e.stopPropagation();removeLayer(idx)}}
                  style={{color:"#555",background:"transparent",border:"none",cursor:"pointer",fontSize:12,padding:"0 2px"}}
                  onMouseOver={e=>e.currentTarget.style.color="#f87171"}
                  onMouseOut={e=>e.currentTarget.style.color="#555"}>✕</button>
              </div>
            )
          })}
        </div>
      </div>

      {/* PROPERTIES PANEL */}
      <div data-panel="true" style={{...pS,right:0,width:PW,borderLeft:"1px solid #2a2a2a",paddingTop:TH}}>
        <div style={{padding:"12px 16px",...secS,borderBottom:"1px solid #2a2a2a",marginBottom:0}}>Propriedades</div>

        {selectedIdx===null ? (
          <div style={{padding:16}}>
            <div style={{...secS,color:"#F5C400",marginBottom:12}}>🎨 Background</div>
            <input type="color" value={bgColor} onChange={e=>updateBg(e.target.value)}
              style={{width:"100%",height:52,cursor:"pointer",border:"none",borderRadius:8,padding:0}}/>
            <div style={{display:"flex",flexWrap:"wrap" as const,gap:6,marginTop:12}}>
              {COLORS.map(c=>(
                <div key={c}
                  onMouseDown={e=>e.preventDefault()}
                  onClick={()=>updateBg(c)}
                  style={{width:26,height:26,borderRadius:5,background:c,cursor:"pointer",border:bgColor===c?"2px solid #F5C400":"2px solid #2a2a2a"}}/>
              ))}
            </div>
          </div>
        ) : isSelText && sel ? (
          <div style={{padding:16,display:"flex",flexDirection:"column" as const,gap:14}}>
            {editingIdx===selectedIdx ? (
              <div style={{padding:8,background:"rgba(245,196,0,0.08)",borderRadius:6,border:"1px solid rgba(245,196,0,0.2)",fontSize:10,color:"#F5C400",lineHeight:1.6}}>
                {hasSel
                  ? "✓ Letras selecionadas — aplique cor/tamanho abaixo"
                  : "Selecione letras para editar individualmente"}
              </div>
            ) : (
              <div style={{padding:8,background:"#111",borderRadius:6,fontSize:10,color:"#555",lineHeight:1.6}}>
                Duplo clique para editar o texto
              </div>
            )}

            <div>
              <div style={secS}>Posição</div>
              <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8}}>
                {[["X","posX"],["Y","posY"]].map(([l,k])=>(
                  <div key={k}>
                    <label style={{fontSize:9,color:"#555",display:"block",marginBottom:3}}>{l}</label>
                    <input type="number" value={Math.round(sel[k as keyof Layer] as number)}
                      onMouseDown={e=>e.stopPropagation()}
                      onChange={e=>updateLayer(selectedIdx,{[k]:+e.target.value})} style={inpS}/>
                  </div>
                ))}
              </div>
            </div>

            <div>
              <div style={secS}>Fonte</div>
              <select
                onMouseDown={e=>e.preventDefault()}
                onChange={e=>applyFont(e.target.value)}
                defaultValue="Arial"
                style={inpS}>
                {FONTS.map(f=><option key={f} value={f}>{f}</option>)}
              </select>
            </div>

            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8}}>
              <div>
                <div style={secS}>Tamanho</div>
                <input type="number" defaultValue={80}
                  onMouseDown={e=>e.stopPropagation()}
                  onChange={e=>applyFontSize(+e.target.value)}
                  style={inpS}/>
              </div>
              <div>
                <div style={secS}>Peso</div>
                <select
                  onMouseDown={e=>e.preventDefault()}
                  onChange={e=>applyStyle("bold", e.target.value==="bold"?"":"bold")}
                  style={inpS}>
                  <option value="normal">Regular</option>
                  <option value="bold">Bold</option>
                </select>
              </div>
            </div>

            <div>
              <div style={secS}>Cor {hasSel?"(seleção)":"(texto todo)"}</div>
              <input type="color" defaultValue="#111111"
                onMouseDown={e=>e.stopPropagation()}
                onChange={e=>applyColor(e.target.value)}
                style={{width:"100%",height:44,cursor:"pointer",border:"none",borderRadius:6,padding:0}}/>
              <div style={{display:"flex",flexWrap:"wrap" as const,gap:5,marginTop:8}}>
                {COLORS.map(c=>(
                  <div key={c}
                    onMouseDown={e=>{ e.preventDefault(); e.stopPropagation() }}
                    onClick={()=>applyColor(c)}
                    style={{width:24,height:24,borderRadius:4,background:c,cursor:"pointer",border:"2px solid #2a2a2a"}}/>
                ))}
              </div>
            </div>
          </div>
        ) : selAsset ? (
          <div style={{padding:16}}>
            <div style={{fontWeight:600,color:"#888",marginBottom:8,fontSize:13}}>{selAsset.label}</div>
            {selAsset.imageUrl
              ? <img src={selAsset.imageUrl} style={{width:"100%",borderRadius:6}}/>
              : <div style={{padding:"24px 0",textAlign:"center" as const,color:"#444",fontSize:12}}>Sem imagem — faça upload na página de Assets</div>}
          </div>
        ) : null}
      </div>

      {modal&&<GeneratePiecesModal campaignId={campaignId} fabricRef={{current:null}}
        onClose={()=>setModal(false)}
        onGenerated={()=>{setModal(false);router.push(`/pieces?campaignId=${campaignId}`)}}/>}
    </div>
  )
}
