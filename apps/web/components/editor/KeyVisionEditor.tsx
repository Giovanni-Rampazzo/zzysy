"use client"
import { useEffect, useRef, useState } from "react"
import { useRouter } from "next/navigation"
import { GeneratePiecesModal } from "./GeneratePiecesModal"
import { PropertiesPanel } from "./PropertiesPanel"

interface Asset { id:string;type:string;label:string;value:string|null;imageUrl:string|null }
interface Campaign { id:string;name:string;client:{id:string;name:string};assets:Asset[] }

const CW=1920, CH=1080, BG="__background__"
const LAYER_W=200, PROPS_W=240, TOPBAR_H=48, ASSETBAR_H=44

export function KeyVisionEditor({ campaignId }: { campaignId: string }) {
  const router = useRouter()
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const fabricRef = useRef<any>(null)
  const bgRef = useRef<any>(null)
  const campaignRef = useRef<Campaign|null>(null)
  const assetIdRef = useRef<string>("")
  const saveTimer = useRef<any>()

  const [campaign, setCampaign] = useState<Campaign|null>(null)
  const [selected, setSelected] = useState<any>(null)
  const [layers, setLayers] = useState<any[]>([])
  const [zoom, setZoom] = useState(1)
  const [modal, setModal] = useState(false)
  const [saving, setSaving] = useState(false)
  const [assetId, setAssetId] = useState("")
  const [msg, setMsg] = useState("")
  const [canvasPos, setCanvasPos] = useState(() => {
    // Calcular posição inicial antes do primeiro render
    if(typeof window === "undefined") return { left: LAYER_W + 40, top: TOPBAR_H + ASSETBAR_H + 40 }
    const availW = window.innerWidth - LAYER_W - PROPS_W
    const availH = window.innerHeight - TOPBAR_H - ASSETBAR_H
    const initialZoom = Math.min(1, (availW-80)/CW, (availH-80)/CH)
    const z = Math.round(initialZoom * 10) / 10
    const cW = Math.round(CW * z)
    const cH = Math.round(CH * z)
    return {
      left: LAYER_W + Math.max(40, (availW - cW) / 2),
      top: TOPBAR_H + ASSETBAR_H + Math.max(40, (availH - cH) / 2)
    }
  })

  function setAsset(id: string) { setAssetId(id); assetIdRef.current = id }

  // Calcular posição do canvas no fullscreen
  function calcCanvasPos(z: number) {
    const availW = window.innerWidth - LAYER_W - PROPS_W
    const availH = window.innerHeight - TOPBAR_H - ASSETBAR_H
    const cW = Math.round(CW * z)
    const cH = Math.round(CH * z)
    const left = LAYER_W + Math.max(40, (availW - cW) / 2)
    const top = TOPBAR_H + ASSETBAR_H + Math.max(40, (availH - cH) / 2)
    return { left, top }
  }

  useEffect(() => {
    fetch(`/api/campaigns/${campaignId}`).then(r=>r.json()).then(d=>{
      setCampaign(d)
      campaignRef.current = d
      if(d.assets?.length>0){ setAssetId(d.assets[0].id); assetIdRef.current=d.assets[0].id }
    })
  },[campaignId])

  useEffect(()=>{
    if(!campaign||!canvasRef.current||fabricRef.current) return
    let alive=true
    ;(async()=>{
      const {Canvas,Rect,Textbox}=await import("fabric")
      if(!alive||!canvasRef.current) return

      // Calcular zoom inicial para caber na tela
      const availW = window.innerWidth - LAYER_W - PROPS_W - 80
      const availH = window.innerHeight - TOPBAR_H - ASSETBAR_H - 80
      const initialZoom = Math.min(1, availW/CW, availH/CH)
      const roundedZoom = Math.round(initialZoom * 10) / 10
      setZoom(roundedZoom)

      const pos = calcCanvasPos(roundedZoom)
      setCanvasPos(pos)

      const fc = new Canvas(canvasRef.current, {
        width: Math.round(CW * roundedZoom),
        height: Math.round(CH * roundedZoom),
      })
      fc.setZoom(roundedZoom)
      fabricRef.current = fc

      // Background
      const bg = new Rect({
        left:0, top:0, width:CW, height:CH, fill:"#ffffff",
        selectable:true, evented:true, hasControls:false, hasBorders:false,
        lockMovementX:true, lockMovementY:true, lockScalingX:true, lockScalingY:true, lockRotation:true
      })
      ;(bg as any).layerId=BG;(bg as any).layerLabel="Background";(bg as any).isBackground=true
      bgRef.current=bg; fc.add(bg); fc.sendObjectToBack(bg)

      fc.on("selection:created",(e:any)=>setSelected(e.selected?.[0]??null))
      fc.on("selection:updated",(e:any)=>setSelected(e.selected?.[0]??null))
      fc.on("selection:cleared",()=>setSelected(null))
      fc.on("object:modified",()=>doSave(fc))
      fc.on("object:added",()=>alive&&refresh(fc))
      fc.on("object:removed",()=>alive&&refresh(fc))
      fc.on("text:editing:exited",(e:any)=>{
        const obj=e.target; if(!obj) return
        const asset=campaignRef.current?.assets.find(a=>a.id===(obj as any).layerId)
        if(asset?.value?.trim()&&obj.text!==asset.value){obj.set("text",asset.value);fc.renderAll()}
        doSave(fc)
      })

      // Carregar KV salvo
      try{
        const kv=await fetch(`/api/campaigns/${campaignId}/key-vision`).then(r=>r.json())
        if(alive&&kv?.data?.objects?.length){
          const am:Record<string,Asset>={}
          for(const a of campaign.assets) am[a.id]=a
          for(const o of kv.data.objects){
            if(o.layerId===BG){bg.set("fill",o.fill??"#ffffff");continue}
            if(o.type==="textbox"||o.type==="i-text"||o.type==="IText"){
              const asset=am[o.layerId]
              const txt=asset?.value?.trim()?asset.value:(o.text??`{{ ${o.layerLabel} }}`)
              const t=new Textbox(txt,{
                left:o.left??100,top:o.top??100,width:o.width??600,
                fontSize:o.fontSize??80,fontFamily:o.fontFamily??"Arial",
                fontWeight:o.fontWeight??"normal",fill:o.fill??"#111",
                scaleX:o.scaleX??1,scaleY:o.scaleY??1,angle:o.angle??0,
                editable:true,splitByGrapheme:false
              })
              ;(t as any).layerId=o.layerId;(t as any).layerLabel=o.layerLabel
              fc.add(t)
            } else if(o.type==="rect"&&!o.isBackground){
              const r=new Rect({
                left:o.left??100,top:o.top??100,width:o.width??400,height:o.height??300,
                fill:o.fill??"#e8e8e8",stroke:o.stroke,strokeWidth:o.strokeWidth,
                strokeDashArray:o.strokeDashArray,scaleX:o.scaleX??1,scaleY:o.scaleY??1,angle:o.angle??0
              })
              ;(r as any).layerId=o.layerId;(r as any).layerLabel=o.layerLabel
              fc.add(r)
            }
          }
        }
      }catch(e){console.error(e)}

      fc.renderAll()
      if(alive) refresh(fc)
    })()
    return()=>{alive=false;if(fabricRef.current){fabricRef.current.dispose();fabricRef.current=null}}
  },[campaign])

  function refresh(fc:any){
    setLayers([...fc.getObjects()].reverse().map((o:any,i:number)=>({
      id:o.layerId??`obj-${i}`,label:o.layerLabel??o.type??"Layer",
      type:o.type,isBackground:o.isBackground??false,obj:o
    })))
  }

  function doSave(fc:any){
    clearTimeout(saveTimer.current)
    saveTimer.current=setTimeout(async()=>{
      setSaving(true)
      const objects=fc.getObjects().map((o:any)=>{
        if((o as any).isBackground) return{type:"rect",layerId:BG,layerLabel:"Background",isBackground:true,fill:o.fill,left:0,top:0,width:CW,height:CH}
        const isTxt=o.type==="textbox"||o.type==="i-text"||o.type==="IText"
        return{type:o.type,layerId:(o as any).layerId,layerLabel:(o as any).layerLabel,
          left:o.left,top:o.top,scaleX:o.scaleX,scaleY:o.scaleY,angle:o.angle,fill:o.fill,
          ...(isTxt?{text:(o as any).text,fontSize:o.fontSize,fontFamily:o.fontFamily,fontWeight:o.fontWeight,width:o.width}
            :{width:o.width,height:o.height,stroke:o.stroke,strokeWidth:o.strokeWidth,strokeDashArray:o.strokeDashArray})}
      })
      await fetch(`/api/campaigns/${campaignId}/key-vision`,{method:"PUT",headers:{"Content-Type":"application/json"},body:JSON.stringify({data:{objects}})})
      setSaving(false)
    },800)
  }

  async function add(){
    const fc=fabricRef.current; const c=campaignRef.current; const aid=assetIdRef.current
    if(!fc||!c||!aid) return
    const asset=c.assets.find(a=>a.id===aid); if(!asset) return
    const{Rect,Textbox}=await import("fabric")
    const isImg=["PERSONA","PRODUTO","FUNDO","LOGOMARCA","CUSTOM_IMAGE"].includes(asset.type)
    if(isImg){
      const r=new Rect({left:100,top:100,width:400,height:300,fill:"#e8e8e8",stroke:"#aaa",strokeWidth:2,strokeDashArray:[10,5]})
      ;(r as any).layerId=asset.id;(r as any).layerLabel=asset.label
      fc.add(r);fc.setActiveObject(r)
    } else {
      const txt=asset.value?.trim()?asset.value:`{{ ${asset.label} }}`
      const t=new Textbox(txt,{left:100,top:100,width:600,fontSize:80,fontFamily:"Arial",fontWeight:"normal",fill:"#111111",editable:true,splitByGrapheme:false})
      ;(t as any).layerId=asset.id;(t as any).layerLabel=asset.label
      fc.add(t);fc.setActiveObject(t)
    }
    fc.renderAll(); doSave(fc)
    setMsg(`✓ ${asset.label}`); setTimeout(()=>setMsg(""),2000)
  }

  function selLayer(lid:string){const fc=fabricRef.current;if(!fc)return;const o=fc.getObjects().find((x:any)=>x.layerId===lid);if(o){fc.setActiveObject(o);fc.renderAll();setSelected(o)}}
  function delLayer(lid:string){const fc=fabricRef.current;if(!fc)return;const o=fc.getObjects().find((x:any)=>x.layerId===lid&&!(x as any).isBackground);if(o){fc.remove(o);fc.renderAll();doSave(fc)}}

  function chZoom(delta:number){
    const fc=fabricRef.current; if(!fc) return
    const z=Math.min(2,Math.max(0.1,zoom+delta))
    setZoom(z)
    fc.setZoom(z)
    fc.setDimensions({width:Math.round(CW*z),height:Math.round(CH*z)})
    fc.renderAll()
    setCanvasPos(calcCanvasPos(z))
  }

  function undo(){const fc=fabricRef.current;if(!fc)return;const o=fc.getObjects().filter((x:any)=>!(x as any).isBackground);if(o.length>0){fc.remove(o[o.length-1]);fc.renderAll();doSave(fc)}}
  function bgColor(c:string){const bg=bgRef.current;const fc=fabricRef.current;if(!bg||!fc)return;bg.set("fill",c);fc.renderAll();doSave(fc);setSelected((p:any)=>p?{...p,fill:c}:p)}

  if(!campaign) return(
    <div style={{display:"flex",alignItems:"center",justifyContent:"center",height:"100vh",background:"#1a1a1a",color:"#888",fontSize:14}}>
      Carregando editor...
    </div>
  )

  const bS={background:"transparent",border:"none",cursor:"pointer",color:"#aaa",fontSize:18,lineHeight:1,padding:"0 4px"} as React.CSSProperties
  const panelStyle={position:"fixed" as const,top:0,bottom:0,background:"rgba(20,20,20,0.96)",backdropFilter:"blur(8px)",borderRight:"1px solid #2a2a2a",zIndex:100,display:"flex",flexDirection:"column" as const,overflowY:"auto" as const}

  return (
    <div style={{position:"fixed",inset:0,background:"#1e1e1e",overflow:"hidden"}}>

      {/* Canvas — fullscreen, posicionado matematicamente */}
      <div style={{
        position:"absolute",
        left: canvasPos.left,
        top: canvasPos.top,
        boxShadow:"0 8px 64px rgba(0,0,0,0.8)",
        lineHeight:0,
        zIndex:1,
      }}>
        <canvas ref={canvasRef}/>
      </div>

      {/* Topbar — fixed no topo */}
      <div style={{position:"fixed",top:0,left:0,right:0,height:TOPBAR_H,background:"rgba(17,17,17,0.98)",borderBottom:"1px solid #2a2a2a",display:"flex",alignItems:"center",padding:"0 16px",gap:12,zIndex:200}}>
        <button onClick={()=>router.push(`/campaigns/${campaignId}`)} style={{...bS,fontSize:13}}>← {campaign.name}</button>
        <div style={{flex:1}}/>
        {msg&&<span style={{fontSize:11,color:"#4ade80"}}>{msg}</span>}
        {saving&&<span style={{fontSize:11,color:"#555"}}>Salvando...</span>}
        <span style={{fontSize:11,color:"#555"}}>{Math.round(CW*zoom)} × {Math.round(CH*zoom)} px</span>
        <button onClick={()=>setModal(true)} style={{background:"#F5C400",border:"none",borderRadius:6,padding:"6px 16px",fontWeight:700,fontSize:13,cursor:"pointer",color:"#111"}}>▶ Gerar Peças</button>
      </div>

      {/* Asset bar — fixed abaixo do topbar */}
      <div style={{position:"fixed",top:TOPBAR_H,left:LAYER_W,right:PROPS_W,height:ASSETBAR_H,background:"rgba(26,26,26,0.98)",borderBottom:"1px solid #2a2a2a",display:"flex",alignItems:"center",padding:"0 16px",gap:10,zIndex:200}}>
        <span style={{fontSize:12,color:"#555",fontWeight:600}}>Asset:</span>
        <select value={assetId} onChange={e=>setAsset(e.target.value)}
          style={{background:"#222",color:"white",border:"1px solid #333",borderRadius:4,padding:"4px 8px",fontSize:12,fontFamily:"inherit",maxWidth:260}}>
          {campaign.assets.map(a=>(
            <option key={a.id} value={a.id}>{a.label}{a.value?` — "${a.value.substring(0,18)}"`:""}</option>
          ))}
        </select>
        <button onClick={add} style={{background:"#F5C400",color:"#111",border:"none",padding:"5px 14px",borderRadius:4,fontSize:12,fontWeight:700,cursor:"pointer"}}>+ Adicionar</button>
        <div style={{flex:1}}/>
        <button onClick={()=>chZoom(-0.1)} style={bS}>−</button>
        <span style={{fontSize:11,color:"#555",minWidth:44,textAlign:"center"}}>{Math.round(zoom*100)}%</span>
        <button onClick={()=>chZoom(+0.1)} style={bS}>+</button>
        <button onClick={undo} style={{...bS,padding:"0 8px"}}>↩</button>
      </div>

      {/* Layer Panel — flutuando à esquerda */}
      <div style={{...panelStyle,left:0,width:LAYER_W,paddingTop:TOPBAR_H}}>
        <div style={{padding:"10px 14px",fontSize:10,fontWeight:700,textTransform:"uppercase",letterSpacing:"0.8px",color:"#555",borderBottom:"1px solid #2a2a2a"}}>
          Layers
        </div>
        <div style={{flex:1,overflowY:"auto",padding:"4px 0"}}>
          {layers.length===0&&(
            <div style={{fontSize:11,color:"#444",textAlign:"center",padding:"24px 12px"}}>Sem layers</div>
          )}
          {layers.map(layer=>{
            const isSel=selected?.layerId===layer.id
            const dot=layer.isBackground?"#888":(layer.type==="textbox"||layer.type==="i-text")?"#F5C400":"#86efac"
            return(
              <div key={layer.id} onClick={()=>selLayer(layer.id)}
                style={{display:"flex",alignItems:"center",gap:8,padding:"8px 12px",cursor:"pointer",
                  background:isSel?"rgba(245,196,0,0.08)":"transparent",
                  borderLeft:isSel?"2px solid #F5C400":"2px solid transparent"}}>
                <div style={{width:7,height:7,borderRadius:2,background:dot,flexShrink:0}}/>
                <span style={{fontSize:12,color:isSel?"#fff":"#888",flex:1,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>
                  {layer.isBackground?"🎨 ":""}{layer.label}
                </span>
                {!layer.isBackground&&(
                  <button onClick={e=>{e.stopPropagation();delLayer(layer.id)}}
                    style={{color:"#555",background:"transparent",border:"none",cursor:"pointer",fontSize:12,opacity:0,transition:"opacity 0.1s",padding:"0 2px"}}
                    onMouseOver={e=>e.currentTarget.style.opacity="1"}
                    onMouseOut={e=>e.currentTarget.style.opacity="0"}>✕</button>
                )}
              </div>
            )
          })}
        </div>
      </div>

      {/* Properties Panel — flutuando à direita */}
      <div style={{...panelStyle,right:0,width:PROPS_W,paddingTop:TOPBAR_H,borderRight:"none",borderLeft:"1px solid #2a2a2a"}}>
        <PropertiesPanel selectedObj={selected} fabricRef={fabricRef} onUpdate={doSave} onBgColorChange={bgColor}/>
      </div>

      {modal&&(
        <GeneratePiecesModal campaignId={campaignId} fabricRef={fabricRef}
          onClose={()=>setModal(false)}
          onGenerated={()=>{setModal(false);router.push(`/pieces?campaignId=${campaignId}`)}}/>
      )}
    </div>
  )
}
