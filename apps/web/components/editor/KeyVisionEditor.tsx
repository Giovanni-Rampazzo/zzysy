"use client"
import { useEffect, useRef, useState } from "react"
import { useRouter } from "next/navigation"
import { GeneratePiecesModal } from "./GeneratePiecesModal"
import { TextLayer } from "./TextLayer"

interface TextSpan {
  text: string
  styles: {
    fontSize?: number
    color?: string
    fontWeight?: string
    fontFamily?: string
  }
}

interface Asset {
  id: string
  type: string
  label: string
  value: string | null
  imageUrl: string | null
  content: TextSpan[] | null
  posX: number
  posY: number
  scaleX: number
  scaleY: number
  rotation: number
  width: number
  visible: boolean
}

interface Layer {
  assetId: string
  posX: number
  posY: number
  scaleX: number
  scaleY: number
  rotation: number
  zIndex: number
  width: number
}

interface Campaign {
  id: string
  name: string
  client: { id: string; name: string }
  assets: Asset[]
  keyVision: { id: string; bgColor: string; layers: Layer[] | null } | null
}

const CW = 1920, CH = 1080
const IMAGE_TYPES = ["PERSONA","PRODUTO","FUNDO","LOGOMARCA","CUSTOM_IMAGE"]
const LAYER_W = 220, PROPS_W = 260, TOP_H = 48, BAR_H = 44
const FONTS = ["Arial","Arial Black","Georgia","Times New Roman","Courier New","Verdana","Impact","Trebuchet MS"]

function getSpans(asset: Asset): TextSpan[] {
  if (asset.content && Array.isArray(asset.content) && asset.content.length > 0) {
    return asset.content as TextSpan[]
  }
  const text = asset.value?.trim() || `{{ ${asset.label} }}`
  return [{ text, styles: { fontSize: 80, color: "#111111", fontWeight: "normal", fontFamily: "Arial" } }]
}

export function KeyVisionEditor({ campaignId }: { campaignId: string }) {
  const router = useRouter()
  const [campaign, setCampaign] = useState<Campaign | null>(null)
  const [layers, setLayers] = useState<Layer[]>([])
  const [bgColor, setBgColor] = useState("#ffffff")
  const [zoom, setZoom] = useState(0.5)
  const [selectedIdx, setSelectedIdx] = useState<number | null>(null)
  const [dragging, setDragging] = useState<{idx:number;sx:number;sy:number;ox:number;oy:number}|null>(null)
  const [modal, setModal] = useState(false)
  const [saving, setSaving] = useState(false)
  const [editingLayerIdx, setEditingLayerIdx] = useState<number | null>(null)
  const [hasTextSelection, setHasTextSelection] = useState(false)
  const [applyColorSignal, setApplyColorSignal] = useState("")
  const [applyFontSizeSignal, setApplyFontSizeSignal] = useState("")
  const [pendingSpans, setPendingSpans] = useState<Record<string, TextSpan[]>>({})
  const [canvasPos, setCanvasPos] = useState({left:LAYER_W+40,top:TOP_H+BAR_H+40})
  const saveTimer = useRef<any>()

  function calcPos(z: number) {
    if (typeof window === "undefined") return {left:LAYER_W+40,top:TOP_H+BAR_H+40}
    const availW = window.innerWidth - LAYER_W - PROPS_W
    const availH = window.innerHeight - TOP_H - BAR_H
    return {
      left: LAYER_W + Math.max(40, (availW - Math.round(CW*z)) / 2),
      top: TOP_H + BAR_H + Math.max(40, (availH - Math.round(CH*z)) / 2)
    }
  }

  useEffect(() => {
    if (typeof window === "undefined") return
    const availW = window.innerWidth - LAYER_W - PROPS_W - 80
    const availH = window.innerHeight - TOP_H - BAR_H - 80
    const z = Math.round(Math.min(0.7, availW/CW, availH/CH) * 10) / 10
    setZoom(z)
    setCanvasPos(calcPos(z))
  }, [])

  useEffect(() => {
    fetch(`/api/campaigns/${campaignId}`).then(r=>r.json()).then((d:Campaign) => {
      setCampaign(d)
      setBgColor(d.keyVision?.bgColor ?? "#ffffff")
      if (d.keyVision?.layers?.length) setLayers(d.keyVision.layers)
    })
  }, [campaignId])

  function doSave(l: Layer[], bg: string) {
    clearTimeout(saveTimer.current)
    saveTimer.current = setTimeout(async () => {
      setSaving(true)
      await fetch(`/api/campaigns/${campaignId}/key-vision`, {
        method: "PUT", headers: {"Content-Type":"application/json"},
        body: JSON.stringify({bgColor: bg, layers: l})
      })
      setSaving(false)
    }, 800)
  }

  function addLayer(asset: Asset) {
    const l: Layer = {assetId:asset.id,posX:100,posY:100,scaleX:1,scaleY:1,rotation:0,zIndex:layers.length,width:900}
    const nl = [...layers, l]
    setLayers(nl); setSelectedIdx(nl.length-1); doSave(nl, bgColor)
  }

  function removeLayer(idx: number) {
    const nl = layers.filter((_,i)=>i!==idx)
    setLayers(nl); setSelectedIdx(null); doSave(nl, bgColor)
  }

  function updateBg(c: string) { setBgColor(c); doSave(layers, c) }

  function updateLayer(idx: number, patch: Partial<Layer>) {
    const nl = layers.map((l,i)=>i===idx?{...l,...patch}:l)
    setLayers(nl); doSave(nl, bgColor)
  }

  // Drag
  function onMouseDown(e: React.MouseEvent, idx: number) {
    e.stopPropagation()
    setSelectedIdx(idx)
    setDragging({idx,sx:e.clientX,sy:e.clientY,ox:layers[idx].posX,oy:layers[idx].posY})
  }

  useEffect(() => {
    function onMove(e: MouseEvent) {
      if (!dragging) return
      const dx = (e.clientX - dragging.sx) / zoom
      const dy = (e.clientY - dragging.sy) / zoom
      setLayers(prev => prev.map((l,i)=>i===dragging.idx?{...l,posX:dragging.ox+dx,posY:dragging.oy+dy}:l))
    }
    function onUp() {
      if (dragging) doSave(layers, bgColor)
      setDragging(null)
    }
    window.addEventListener("mousemove", onMove)
    window.addEventListener("mouseup", onUp)
    return () => { window.removeEventListener("mousemove", onMove); window.removeEventListener("mouseup", onUp) }
  }, [dragging, layers, zoom])

  function chZoom(d: number) {
    const z = Math.min(2, Math.max(0.1, zoom+d))
    setZoom(z); setCanvasPos(calcPos(z))
  }

  // Salvar edição de texto
  async function saveEditText() {
    if (!editText || !campaign) return
    const asset = campaign.assets.find(a=>a.id===editText.assetId)
    if (!asset) return
    // Converter texto plano de volta para spans mantendo os estilos do primeiro span
    const baseStyles = editText.spans[0]?.styles ?? {fontSize:80,color:"#111111"}
    const newContent: TextSpan[] = [{text: editText.text, styles: baseStyles}]
    await fetch(`/api/campaigns/${campaignId}/assets/${editText.assetId}`, {
      method: "PUT", headers: {"Content-Type":"application/json"},
      body: JSON.stringify({content: newContent})
    })
    setCampaign(prev => prev ? {
      ...prev,
      assets: prev.assets.map(a => a.id === editText.assetId ? {...a, content: newContent} : a)
    } : prev)
    setEditText(null)
  }

  if (!campaign) return (
    <div style={{display:"flex",alignItems:"center",justifyContent:"center",height:"100vh",background:"#1a1a1a",color:"#888",fontSize:14}}>
      Carregando editor...
    </div>
  )

  const sel = selectedIdx !== null ? layers[selectedIdx] : null
  const selAsset = sel ? campaign.assets.find(a=>a.id===sel.assetId) : null
  const isSelText = selAsset && !IMAGE_TYPES.includes(selAsset.type)

  const panelS = {position:"fixed" as const,top:0,bottom:0,background:"rgba(18,18,18,0.97)",backdropFilter:"blur(12px)",zIndex:100,display:"flex",flexDirection:"column" as const,overflowY:"auto" as const}
  const bS = {background:"transparent",border:"none",cursor:"pointer",color:"#aaa",fontSize:18,padding:"0 4px"} as React.CSSProperties
  const inpS = {width:"100%",background:"#111",border:"1px solid #2a2a2a",color:"white",fontSize:12,padding:"5px 8px",borderRadius:4,fontFamily:"inherit",outline:"none"} as React.CSSProperties
  const secS = {fontSize:10,fontWeight:700 as const,textTransform:"uppercase" as const,letterSpacing:"0.8px",color:"#555",marginBottom:8}

  return (
    <div style={{position:"fixed",inset:0,background:"#1e1e1e",overflow:"hidden"}}>

      {/* CANVAS */}
      <div
        style={{position:"absolute",left:canvasPos.left,top:canvasPos.top,width:Math.round(CW*zoom),height:Math.round(CH*zoom),background:bgColor,boxShadow:"0 8px 64px rgba(0,0,0,0.8)",overflow:"hidden"}}
        onClick={()=>setSelectedIdx(null)}
      >
        {[...layers].sort((a,b)=>a.zIndex-b.zIndex).map((layer,idx)=>{
          const asset = campaign.assets.find(a=>a.id===layer.assetId)
          if (!asset) return null
          const isImg = IMAGE_TYPES.includes(asset.type)
          const isSel = selectedIdx===idx
          const spans = getSpans(asset)

          return (
            <div key={`${layer.assetId}-${idx}`}
              onMouseDown={e=>onMouseDown(e,idx)}
              onDoubleClick={e=>{
                e.stopPropagation()
                if (!isImg) setEditText({assetId:asset.id,text:spans.map(s=>s.text).join(""),spans})
              }}
              style={{
                position:"absolute",
                left:layer.posX*zoom,
                top:layer.posY*zoom,
                width:(isImg?400:layer.width)*zoom,
                cursor:dragging?.idx===idx?"grabbing":"grab",
                outline:isSel?"2px solid #F5C400":"2px solid transparent",
                outlineOffset:2,
                userSelect:"none",
              }}
            >
              {isImg ? (
                <div style={{width:400*zoom,height:300*zoom,background:"#e8e8e8",border:`${2*zoom}px dashed #aaa`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:14*zoom,color:"#888",overflow:"hidden"}}>
                  {asset.imageUrl
                    ? <img src={asset.imageUrl} style={{width:"100%",height:"100%",objectFit:"cover"}}/>
                    : <span>{asset.label}</span>
                  }
                </div>
              ) : (
                <TextLayer
                  spans={spans}
                  zoom={zoom}
                  editing={editingLayerIdx === idx}
                  onStartEdit={() => { setEditingLayerIdx(idx); setSelectedIdx(idx) }}
                  onEndEdit={async (newSpans) => {
                    setEditingLayerIdx(null)
                    await fetch(`/api/campaigns/${campaignId}/assets/${asset.id}`, {
                      method: "PUT", headers: {"Content-Type":"application/json"},
                      body: JSON.stringify({content: newSpans})
                    })
                    setCampaign(prev => prev ? {
                      ...prev,
                      assets: prev.assets.map(a => a.id === asset.id ? {...a, content: newSpans} : a)
                    } : prev)
                  }}
                  onSelectionChange={setHasTextSelection}
                  selectedColor={selAsset?.id === asset.id ? (getSpans(selAsset)[0]?.styles.color) : undefined}
                  selectedFontSize={selAsset?.id === asset.id ? (getSpans(selAsset)[0]?.styles.fontSize) : undefined}
                  applyColorSignal={selAsset?.id === asset.id ? applyColorSignal : undefined}
                  applyFontSizeSignal={selAsset?.id === asset.id ? applyFontSizeSignal : undefined}
                />
              )}
            </div>
          )
        })}
      </div>

      {/* TOPBAR */}
      <div style={{position:"fixed",top:0,left:0,right:0,height:TOP_H,background:"rgba(17,17,17,0.98)",borderBottom:"1px solid #2a2a2a",display:"flex",alignItems:"center",padding:"0 16px",gap:12,zIndex:200}}>
        <button onClick={()=>router.push(`/campaigns/${campaignId}`)} style={{...bS,fontSize:13}}>← {campaign.name}</button>
        <div style={{flex:1}}/>
        {saving&&<span style={{fontSize:11,color:"#555"}}>Salvando...</span>}
        <span style={{fontSize:11,color:"#555"}}>1920 × 1080</span>
        <button onClick={()=>setModal(true)} style={{background:"#F5C400",border:"none",borderRadius:6,padding:"6px 16px",fontWeight:700,fontSize:13,cursor:"pointer",color:"#111"}}>▶ Gerar Peças</button>
      </div>

      {/* ASSET BAR */}
      <div style={{position:"fixed",top:TOP_H,left:LAYER_W,right:PROPS_W,height:BAR_H,background:"rgba(26,26,26,0.98)",borderBottom:"1px solid #2a2a2a",display:"flex",alignItems:"center",padding:"0 16px",gap:8,zIndex:200,overflowX:"auto" as const}}>
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
      <div style={{...panelS,left:0,width:LAYER_W,borderRight:"1px solid #2a2a2a",paddingTop:TOP_H}}>
        <div style={{padding:"10px 14px",fontSize:10,fontWeight:700,textTransform:"uppercase" as const,letterSpacing:"0.8px",color:"#555",borderBottom:"1px solid #2a2a2a"}}>Layers</div>
        <div style={{flex:1,overflowY:"auto" as const,padding:"4px 0"}}>
          <div onClick={()=>setSelectedIdx(null)}
            style={{display:"flex",alignItems:"center",gap:8,padding:"8px 12px",cursor:"pointer",borderLeft:selectedIdx===null?"2px solid #F5C400":"2px solid transparent",background:selectedIdx===null?"rgba(245,196,0,0.08)":"transparent"}}>
            <div style={{width:7,height:7,borderRadius:2,background:bgColor,border:"1px solid #555",flexShrink:0}}/>
            <span style={{fontSize:12,color:selectedIdx===null?"#fff":"#888"}}>🎨 Background</span>
          </div>
          {[...layers].reverse().map((_,ri)=>{
            const idx = layers.length-1-ri
            const layer = layers[idx]
            const asset = campaign.assets.find(a=>a.id===layer.assetId)
            const isSel = selectedIdx===idx
            return (
              <div key={idx} onClick={()=>setSelectedIdx(idx)}
                style={{display:"flex",alignItems:"center",gap:8,padding:"8px 12px",cursor:"pointer",borderLeft:isSel?"2px solid #F5C400":"2px solid transparent",background:isSel?"rgba(245,196,0,0.08)":"transparent"}}>
                <div style={{width:7,height:7,borderRadius:2,background:IMAGE_TYPES.includes(asset?.type??"")?"#86efac":"#F5C400",flexShrink:0}}/>
                <span style={{fontSize:12,color:isSel?"#fff":"#888",flex:1,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap" as const}}>
                  {asset?.label??"Layer"}
                </span>
                <button onClick={e=>{e.stopPropagation();removeLayer(idx)}}
                  style={{color:"#555",background:"transparent",border:"none",cursor:"pointer",fontSize:12,padding:"0 2px"}}
                  onMouseOver={e=>e.currentTarget.style.color="#fff"}
                  onMouseOut={e=>e.currentTarget.style.color="#555"}>✕</button>
              </div>
            )
          })}
        </div>
      </div>

      {/* PROPERTIES PANEL */}
      <div style={{...panelS,right:0,width:PROPS_W,borderLeft:"1px solid #2a2a2a",paddingTop:TOP_H}}>
        <div style={{padding:"12px 16px",...secS,borderBottom:"1px solid #2a2a2a",marginBottom:0}}>Propriedades</div>

        {selectedIdx===null ? (
          <div style={{padding:16}}>
            <div style={{...secS,color:"#F5C400",marginBottom:12}}>🎨 Background</div>
            <input type="color" value={bgColor} onChange={e=>updateBg(e.target.value)}
              style={{width:"100%",height:52,cursor:"pointer",border:"none",borderRadius:8,padding:0}}/>
            <div style={{display:"flex",flexWrap:"wrap" as const,gap:6,marginTop:12}}>
              {["#ffffff","#111111","#F5C400","#e63946","#457b9d","#2a9d8f","#264653","#f4a261","#8338ec","#ff006e"].map(c=>(
                <div key={c} onClick={()=>updateBg(c)}
                  style={{width:28,height:28,borderRadius:5,background:c,cursor:"pointer",border:bgColor===c?"2px solid #F5C400":"2px solid #2a2a2a"}}/>
              ))}
            </div>
          </div>
        ) : isSelText && sel ? (
          <div style={{padding:16,display:"flex",flexDirection:"column" as const,gap:14}}>
            {/* Hint de edição */}
            <div style={{padding:8,background:"rgba(245,196,0,0.08)",borderRadius:6,border:"1px solid rgba(245,196,0,0.2)",fontSize:10,color:"#F5C400"}}>
              Duplo clique no texto para editar.<br/>
              {hasTextSelection ? "✓ Texto selecionado — mude a cor abaixo" : "Selecione letras para mudar cor/tamanho individual."}
            </div>

            {/* Posição */}
            <div>
              <div style={secS}>Posição</div>
              <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8}}>
                {[["X","posX"],["Y","posY"]].map(([l,k])=>(
                  <div key={k}>
                    <label style={{fontSize:9,color:"#555",display:"block",marginBottom:3}}>{l}</label>
                    <input type="number" value={Math.round(sel[k as keyof Layer] as number)}
                      onChange={e=>updateLayer(selectedIdx,{[k]:+e.target.value})} style={inpS}/>
                  </div>
                ))}
              </div>
            </div>

            {/* Tipografia */}
            {selAsset && (()=>{
              const spans = getSpans(selAsset)
              const s = spans[0]?.styles ?? {}

              async function updateStyle(key: string, val: any) {
                // Se tem seleção de texto ativa → aplica via signal no Lexical
                if (hasTextSelection && editingLayerIdx !== null) {
                  if (key === "color") setApplyColorSignal(`${val}-${Date.now()}`)
                  if (key === "fontSize") setApplyFontSizeSignal(`${val}-${Date.now()}`)
                  return
                }
                // Sem seleção → aplica no objeto todo
                const newContent = spans.map(sp=>({...sp,styles:{...sp.styles,[key]:val}}))
                await fetch(`/api/campaigns/${campaignId}/assets/${selAsset!.id}`,{
                  method:"PUT",headers:{"Content-Type":"application/json"},
                  body:JSON.stringify({content:newContent})
                })
                setCampaign(prev=>prev?{...prev,assets:prev.assets.map(a=>a.id===selAsset!.id?{...a,content:newContent}:a)}:prev)
              }

              return (
                <>
                  <div>
                    <div style={secS}>Tipografia</div>
                    <div style={{display:"flex",flexDirection:"column" as const,gap:8}}>
                      <select value={s.fontFamily??"Arial"} onChange={e=>updateStyle("fontFamily",e.target.value)} style={inpS}>
                        {FONTS.map(f=><option key={f} value={f}>{f}</option>)}
                      </select>
                      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8}}>
                        <input type="number" value={s.fontSize??80} onChange={e=>updateStyle("fontSize",+e.target.value)} style={inpS} placeholder="Tamanho"/>
                        <select value={s.fontWeight??"normal"} onChange={e=>updateStyle("fontWeight",e.target.value)} style={inpS}>
                          <option value="normal">Regular</option>
                          <option value="500">Medium</option>
                          <option value="bold">Bold</option>
                        </select>
                      </div>
                    </div>
                  </div>
                  <div>
                    <div style={secS}>Cor</div>
                    <input type="color" value={s.color??"#111111"} onChange={e=>updateStyle("color",e.target.value)}
                      style={{width:"100%",height:40,cursor:"pointer",border:"none",borderRadius:6,padding:0}}/>
                    <div style={{display:"flex",flexWrap:"wrap" as const,gap:5,marginTop:8}}>
                      {["#ffffff","#111111","#F5C400","#e63946","#457b9d","#2a9d8f"].map(c=>(
                        <div key={c} onClick={()=>updateStyle("color",c)}
                          style={{width:24,height:24,borderRadius:4,background:c,cursor:"pointer",border:(s.color??"#111")===c?"2px solid #F5C400":"2px solid #2a2a2a"}}/>
                      ))}
                    </div>
                  </div>
                </>
              )
            })()}
          </div>
        ) : selAsset ? (
          <div style={{padding:16}}>
            <div style={{fontWeight:600,color:"#888",marginBottom:8,fontSize:13}}>{selAsset.label}</div>
            {selAsset.imageUrl
              ? <img src={selAsset.imageUrl} style={{width:"100%",borderRadius:6}}/>
              : <div style={{padding:"24px 0",textAlign:"center" as const,color:"#444",fontSize:12}}>Sem imagem — faça upload na página de Assets</div>
            }
          </div>
        ) : null}
      </div>



      {modal&&<GeneratePiecesModal campaignId={campaignId} fabricRef={{current:null}}
        onClose={()=>setModal(false)}
        onGenerated={()=>{setModal(false);router.push(`/pieces?campaignId=${campaignId}`)}}/>}
    </div>
  )
}
