"use client"
import { useEffect, useRef, useState, useCallback } from "react"
import { useRouter } from "next/navigation"
import { GeneratePiecesModal } from "./GeneratePiecesModal"
import { LexicalComposer } from "@lexical/react/LexicalComposer"
import { RichTextPlugin } from "@lexical/react/LexicalRichTextPlugin"
import { ContentEditable } from "@lexical/react/LexicalContentEditable"
import { useLexicalComposerContext } from "@lexical/react/LexicalComposerContext"
import {
  $getRoot, $getSelection, $isRangeSelection,
  $createParagraphNode, $createTextNode,
  TextNode, ElementNode
} from "lexical"

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
const FONTS = ["Arial","Arial Black","Georgia","Times New Roman","Courier New","Verdana","Impact","Trebuchet MS","DM Sans"]
const COLORS = ["#111111","#ffffff","#F5C400","#e63946","#457b9d","#2a9d8f","#264653","#f4a261","#8338ec","#ff006e","#06d6a0","#118ab2"]

function getSpans(asset: Asset): TextSpan[] {
  if (asset.content && Array.isArray(asset.content) && asset.content.length > 0)
    return asset.content as TextSpan[]
  const text = asset.value?.trim() || `{{ ${asset.label} }}`
  return [{ text, styles: { fontSize: 80, color: "#111111", fontWeight: "normal", fontFamily: "Arial" } }]
}

// ─── Plugin de controle do Lexical ───────────────────────────────
function LexicalController({
  spans, editing, zoom, baseStyles, onSave, onSelChange, applyCmd
}: {
  spans: TextSpan[]
  editing: boolean
  zoom: number
  baseStyles: TextSpan["styles"]
  onSave: (spans: TextSpan[]) => void
  onSelChange: (hasSel: boolean, color: string, size: number) => void
  applyCmd: { type: string; value: string } | null
}) {
  const [editor] = useLexicalComposerContext()
  const loaded = useRef(false)

  // Carregar conteúdo inicial uma vez
  useEffect(() => {
    if (loaded.current) return
    loaded.current = true
    editor.update(() => {
      const root = $getRoot()
      root.clear()
      const para = $createParagraphNode()
      spans.forEach(span => {
        const node = $createTextNode(span.text)
        const css = [
          `color:${span.styles.color ?? "#111"}`,
          `font-size:${span.styles.fontSize ?? 80}px`,
          `font-family:${span.styles.fontFamily ?? "Arial"}`,
          `font-weight:${span.styles.fontWeight ?? "normal"}`,
        ].join(";")
        node.setStyle(css)
        para.append(node)
      })
      root.append(para)
    })
  }, [])

  // Editar/readonly
  useEffect(() => {
    editor.setEditable(editing)
    if (editing) {
      setTimeout(() => editor.focus(), 30)
    }
  }, [editing])

  // Monitorar seleção
  useEffect(() => {
    return editor.registerUpdateListener(({ editorState }) => {
      editorState.read(() => {
        const sel = $getSelection()
        if ($isRangeSelection(sel) && !sel.isCollapsed()) {
          const nodes = sel.getNodes().filter(n => n instanceof TextNode) as TextNode[]
          if (nodes.length > 0) {
            const style = nodes[0].getStyle()
            const map = styleToMap(style)
            const color = map["color"] ?? baseStyles.color ?? "#111111"
            const size = parseInt(map["font-size"] ?? String(baseStyles.fontSize ?? 80))
            onSelChange(true, color, size)
          }
        } else {
          onSelChange(false, baseStyles.color ?? "#111111", baseStyles.fontSize ?? 80)
        }
      })
    })
  }, [baseStyles])

  // Aplicar comando (cor ou tamanho na seleção)
  useEffect(() => {
    if (!applyCmd) return
    editor.update(() => {
      const sel = $getSelection()
      if (!$isRangeSelection(sel)) return
      const nodes = sel.getNodes()
      nodes.forEach(node => {
        if (!(node instanceof TextNode)) return
        const map = styleToMap(node.getStyle())
        if (applyCmd.type === "color") map["color"] = applyCmd.value
        if (applyCmd.type === "fontSize") map["font-size"] = `${applyCmd.value}px`
        if (applyCmd.type === "fontFamily") map["font-family"] = applyCmd.value
        if (applyCmd.type === "fontWeight") map["font-weight"] = applyCmd.value
        node.setStyle(mapToStyle(map))
      })
    })
  }, [applyCmd])

  // Serializar estado para TextSpan[]
  function serialize(): TextSpan[] {
    const result: TextSpan[] = []
    editor.getEditorState().read(() => {
      $getRoot().getChildren().forEach((child: any) => {
        child.getChildren?.().forEach((node: any) => {
          if (!(node instanceof TextNode)) return
          const map = styleToMap(node.getStyle())
          result.push({
            text: node.getTextContent(),
            styles: {
              color: map["color"] ?? baseStyles.color ?? "#111111",
              fontSize: parseInt(map["font-size"] ?? String(baseStyles.fontSize ?? 80)),
              fontFamily: map["font-family"] ?? baseStyles.fontFamily ?? "Arial",
              fontWeight: map["font-weight"] ?? baseStyles.fontWeight ?? "normal",
            }
          })
        })
      })
    })
    return result.length ? result : spans
  }

  return (
    <RichTextPlugin
      contentEditable={
        <ContentEditable
          onBlur={() => onSave(serialize())}
          style={{
            outline: "none",
            minWidth: 50,
            lineHeight: 1.2,
            caretColor: "#F5C400",
            cursor: editing ? "text" : "default",
            userSelect: editing ? "text" : "none",
            pointerEvents: editing ? "auto" : "none",
          }}
        />
      }
      placeholder={null}
      ErrorBoundary={({ children }) => <>{children}</>}
    />
  )
}

function styleToMap(style: string): Record<string, string> {
  const map: Record<string, string> = {}
  style.split(";").forEach(s => {
    const [k, v] = s.split(":").map(x => x.trim())
    if (k && v) map[k] = v
  })
  return map
}
function mapToStyle(map: Record<string, string>) {
  return Object.entries(map).map(([k, v]) => `${k}:${v}`).join(";")
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
  // Estado do painel para tipografia
  const [hasSel, setHasSel] = useState(false)
  const [selColor, setSelColor] = useState("#111111")
  const [selSize, setSelSize] = useState(80)
  const [applyCmd, setApplyCmd] = useState<{type:string;value:string}|null>(null)
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

  function apply(type: string, value: string) {
    setApplyCmd({type,value})
    setTimeout(()=>setApplyCmd(null),100)
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
        onClick={e=>{ if(e.target===e.currentTarget){setSelectedIdx(null);setEditingIdx(null)} }}
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
              onDoubleClick={e=>{
                e.stopPropagation()
                if (!isImg){ setSelectedIdx(idx); setEditingIdx(idx) }
              }}
              style={{
                position:"absolute",
                left:layer.posX*zoom,
                top:layer.posY*zoom,
                width:(isImg?400:layer.width)*zoom,
                cursor:dragging?.idx===idx?"grabbing":(isEdit?"text":"grab"),
                outline:isSel&&!isEdit?"2px solid #F5C400":"2px solid transparent",
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
                <div style={{outline:isEdit?"2px dashed #F5C400":"none",outlineOffset:2,padding:isEdit?4:0}}>
                  <LexicalComposer initialConfig={{
                    namespace:`layer-${idx}`,
                    theme:{},
                    onError:(e:Error)=>console.error(e),
                    editable:false,
                  }}>
                    <LexicalController
                      spans={spans}
                      editing={isEdit}
                      zoom={zoom}
                      baseStyles={base}
                      onSave={newSpans=>{ setEditingIdx(null); saveAssetContent(asset.id,newSpans) }}
                      onSelChange={(has,color,size)=>{ if(isEdit){setHasSel(has);setSelColor(color);setSelSize(size)} }}
                      applyCmd={isEdit?applyCmd:null}
                    />
                  </LexicalComposer>
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
      <div style={{...pS,left:0,width:LW,borderRight:"1px solid #2a2a2a",paddingTop:TH}}>
        <div style={{padding:"10px 14px",...secS,borderBottom:"1px solid #2a2a2a",marginBottom:0}}>Layers</div>
        <div style={{flex:1,overflowY:"auto" as const,padding:"4px 0"}}>
          <div onClick={()=>{setSelectedIdx(null);setEditingIdx(null)}}
            style={{display:"flex",alignItems:"center",gap:8,padding:"8px 12px",cursor:"pointer",borderLeft:selectedIdx===null?"2px solid #F5C400":"2px solid transparent",background:selectedIdx===null?"rgba(245,196,0,0.08)":"transparent"}}>
            <div style={{width:7,height:7,borderRadius:2,background:bgColor,border:"1px solid #555",flexShrink:0}}/>
            <span style={{fontSize:12,color:selectedIdx===null?"#fff":"#888"}}>🎨 Background</span>
          </div>
          {[...layers].reverse().map((_,ri)=>{
            const idx=layers.length-1-ri; const layer=layers[idx]
            const asset=campaign.assets.find(a=>a.id===layer.assetId)
            const isSel=selectedIdx===idx
            return (
              <div key={idx} onClick={()=>{setSelectedIdx(idx);setEditingIdx(null)}}
                style={{display:"flex",alignItems:"center",gap:8,padding:"8px 12px",cursor:"pointer",borderLeft:isSel?"2px solid #F5C400":"2px solid transparent",background:isSel?"rgba(245,196,0,0.08)":"transparent"}}>
                <div style={{width:7,height:7,borderRadius:2,background:IMAGE_TYPES.includes(asset?.type??"")?"#86efac":"#F5C400",flexShrink:0}}/>
                <span style={{fontSize:12,color:isSel?"#fff":"#888",flex:1,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap" as const}}>
                  {asset?.label??"Layer"}
                </span>
                <button onClick={e=>{e.stopPropagation();removeLayer(idx)}}
                  style={{color:"#555",background:"transparent",border:"none",cursor:"pointer",fontSize:12,padding:"0 2px"}}
                  onMouseOver={e=>e.currentTarget.style.color="#f87171"}
                  onMouseOut={e=>e.currentTarget.style.color="#555"}>✕</button>
              </div>
            )
          })}
        </div>
      </div>

      {/* PROPERTIES PANEL */}
      <div style={{...pS,right:0,width:PW,borderLeft:"1px solid #2a2a2a",paddingTop:TH}}>
        <div style={{padding:"12px 16px",...secS,borderBottom:"1px solid #2a2a2a",marginBottom:0}}>Propriedades</div>

        {selectedIdx===null ? (
          // Background
          <div style={{padding:16}}>
            <div style={{...secS,color:"#F5C400",marginBottom:12}}>🎨 Background</div>
            <input type="color" value={bgColor} onChange={e=>updateBg(e.target.value)}
              style={{width:"100%",height:52,cursor:"pointer",border:"none",borderRadius:8,padding:0}}/>
            <div style={{display:"flex",flexWrap:"wrap" as const,gap:6,marginTop:12}}>
              {COLORS.map(c=>(
                <div key={c} onClick={()=>updateBg(c)}
                  style={{width:26,height:26,borderRadius:5,background:c,cursor:"pointer",border:bgColor===c?"2px solid #F5C400":"2px solid #2a2a2a"}}/>
              ))}
            </div>
          </div>
        ) : isSelText && sel ? (
          // Text layer
          <div style={{padding:16,display:"flex",flexDirection:"column" as const,gap:14}}>
            {/* Hint */}
            {editingIdx===selectedIdx ? (
              <div style={{padding:8,background:"rgba(245,196,0,0.08)",borderRadius:6,border:"1px solid rgba(245,196,0,0.2)",fontSize:10,color:"#F5C400",lineHeight:1.5}}>
                {hasSel ? "✓ Letras selecionadas — aplique cor/tamanho abaixo" : "Selecione letras para mudar individualmente ou aplique ao texto todo"}
              </div>
            ) : (
              <div style={{padding:8,background:"#111",borderRadius:6,fontSize:10,color:"#555",lineHeight:1.5}}>
                Duplo clique no texto para editar.<br/>Selecione letras para mudar cor/tamanho individual.
              </div>
            )}

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
            <div>
              <div style={secS}>Fonte</div>
              <select
                value={hasSel ? (selAsset ? getSpans(selAsset)[0]?.styles.fontFamily??"Arial" : "Arial") : "Arial"}
                onChange={e=>apply("fontFamily",e.target.value)}
                style={inpS}>
                {FONTS.map(f=><option key={f} value={f}>{f}</option>)}
              </select>
            </div>

            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8}}>
              <div>
                <div style={secS}>Tamanho</div>
                <input type="number"
                  value={hasSel ? selSize : (selAsset ? getSpans(selAsset)[0]?.styles.fontSize??80 : 80)}
                  onChange={e=>apply("fontSize",e.target.value)}
                  style={inpS}/>
              </div>
              <div>
                <div style={secS}>Peso</div>
                <select onChange={e=>apply("fontWeight",e.target.value)} style={inpS}>
                  <option value="normal">Regular</option>
                  <option value="500">Medium</option>
                  <option value="bold">Bold</option>
                </select>
              </div>
            </div>

            {/* Cor */}
            <div>
              <div style={secS}>Cor {hasSel?"(seleção)":"(texto todo)"}</div>
              <input type="color"
                value={hasSel ? selColor : (selAsset ? getSpans(selAsset)[0]?.styles.color??"#111111" : "#111111")}
                onChange={e=>apply("color",e.target.value)}
                style={{width:"100%",height:44,cursor:"pointer",border:"none",borderRadius:6,padding:0}}/>
              <div style={{display:"flex",flexWrap:"wrap" as const,gap:5,marginTop:8}}>
                {COLORS.map(c=>(
                  <div key={c} onClick={()=>apply("color",c)}
                    style={{width:24,height:24,borderRadius:4,background:c,cursor:"pointer",border:(hasSel?selColor:(selAsset?getSpans(selAsset)[0]?.styles.color??"#111":"#111"))===c?"2px solid #F5C400":"2px solid #2a2a2a"}}/>
                ))}
              </div>
            </div>
          </div>
        ) : selAsset ? (
          // Image
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
