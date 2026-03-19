"use client"
import { useEffect, useRef, useState } from "react"
import { useRouter } from "next/navigation"
import { GeneratePiecesModal } from "./GeneratePiecesModal"
import { LayerPanel } from "./LayerPanel"
import { PropertiesPanel } from "./PropertiesPanel"

interface Asset { id:string;type:string;label:string;value:string|null;imageUrl:string|null }
interface Campaign { id:string;name:string;client:{id:string;name:string};assets:Asset[] }

const CW=1920, CH=1080, BG="__background__"

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
  const [zoom, setZoom] = useState(0.5)
  const [modal, setModal] = useState(false)
  const [saving, setSaving] = useState(false)
  const [assetId, setAssetId] = useState("")
  const [msg, setMsg] = useState("")

  // Sync assetIdRef com state
  function setAsset(id: string) {
    setAssetId(id)
    assetIdRef.current = id
  }

  useEffect(() => {
    fetch(`/api/campaigns/${campaignId}`).then(r=>r.json()).then(d=>{
      setCampaign(d)
      campaignRef.current = d
      if(d.assets?.length>0) {
        setAssetId(d.assets[0].id)
        assetIdRef.current = d.assets[0].id
      }
    })
  },[campaignId])

  useEffect(()=>{
    if(!campaign||!canvasRef.current||fabricRef.current) return
    let alive=true
    ;(async()=>{
      const {Canvas,Rect,Textbox}=await import("fabric")
      if(!alive||!canvasRef.current) return

      const fc=new Canvas(canvasRef.current,{width:Math.round(CW*zoom),height:Math.round(CH*zoom)})
      fc.setZoom(zoom)
      fabricRef.current=fc

      const bg=new Rect({left:0,top:0,width:CW,height:CH,fill:"#ffffff",selectable:true,evented:true,hasControls:false,hasBorders:false,lockMovementX:true,lockMovementY:true,lockScalingX:true,lockScalingY:true,lockRotation:true})
      ;(bg as any).layerId=BG;(bg as any).layerLabel="Background";(bg as any).isBackground=true
      bgRef.current=bg;fc.add(bg);fc.sendObjectToBack(bg)

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
              const t=new Textbox(txt,{left:o.left??80,top:o.top??80,width:o.width??800,fontSize:o.fontSize??80,fontFamily:o.fontFamily??"Arial",fontWeight:o.fontWeight??"normal",fill:o.fill??"#111",scaleX:o.scaleX??1,scaleY:o.scaleY??1,angle:o.angle??0,editable:true})
              ;(t as any).layerId=o.layerId;(t as any).layerLabel=o.layerLabel
              fc.add(t)
            } else if(o.type==="rect"&&!o.isBackground){
              const r=new Rect({left:o.left??100,top:o.top??100,width:o.width??400,height:o.height??300,fill:o.fill??"#e8e8e8",stroke:o.stroke,strokeWidth:o.strokeWidth,strokeDashArray:o.strokeDashArray,scaleX:o.scaleX??1,scaleY:o.scaleY??1,angle:o.angle??0})
              ;(r as any).layerId=o.layerId;(r as any).layerLabel=o.layerLabel
              fc.add(r)
            }
          }
        }
      }catch{}
      fc.renderAll()
      if(alive){
        refresh(fc)
        // Centralizar canvas no scroll container
        setTimeout(()=>{
          const container = canvasRef.current?.closest(".canvas-scroll-container") as HTMLElement
          const canvas = canvasRef.current?.parentElement as HTMLElement
          if(container && canvas){
            const left = (canvas.offsetWidth - container.clientWidth) / 2
            const top = (canvas.offsetHeight - container.clientHeight) / 2
            container.scrollLeft = left > 0 ? left : 0
            container.scrollTop = top > 0 ? top : 0
          }
        }, 200)
      }
    })()
    return()=>{alive=false;if(fabricRef.current){fabricRef.current.dispose();fabricRef.current=null}}
  },[campaign])

  function refresh(fc:any){
    setLayers([...fc.getObjects()].reverse().map((o:any,i:number)=>({
      id:o.layerId??`obj-${i}`,label:o.layerLabel??o.type??"Layer",
      type:o.type,locked:false,isBackground:o.isBackground??false,obj:o
    })))
  }

  function doSave(fc:any){
    clearTimeout(saveTimer.current)
    saveTimer.current=setTimeout(async()=>{
      setSaving(true)
      const objects=fc.getObjects().map((o:any)=>{
        if((o as any).isBackground) return{type:"rect",layerId:BG,layerLabel:"Background",isBackground:true,fill:o.fill,left:0,top:0,width:CW,height:CH}
        const isTxt=o.type==="textbox"||o.type==="i-text"||o.type==="IText"
        return{type:o.type,layerId:(o as any).layerId,layerLabel:(o as any).layerLabel,left:o.left,top:o.top,scaleX:o.scaleX,scaleY:o.scaleY,angle:o.angle,fill:o.fill,
          ...(isTxt?{text:(o as any).text,fontSize:o.fontSize,fontFamily:o.fontFamily,fontWeight:o.fontWeight,width:o.width}:{width:o.width,height:o.height,stroke:o.stroke,strokeWidth:o.strokeWidth,strokeDashArray:o.strokeDashArray})}
      })
      await fetch(`/api/campaigns/${campaignId}/key-vision`,{method:"PUT",headers:{"Content-Type":"application/json"},body:JSON.stringify({data:{objects}})})
      setSaving(false)
    },800)
  }

  async function add(){
    const fc=fabricRef.current
    const c=campaignRef.current
    const aid=assetIdRef.current
    if(!fc){ setMsg("Fabric não iniciado — recarregue a página"); return }
    if(!c){ setMsg("Campanha não carregada"); return }
    if(!aid){ setMsg("Nenhum asset selecionado"); return }
    const asset=c.assets.find(a=>a.id===aid)
    if(!asset){ setMsg(`Asset ${aid} não encontrado`); return }
    const{Rect,Textbox}=await import("fabric")
    const isImg=["PERSONA","PRODUTO","FUNDO","LOGOMARCA","CUSTOM_IMAGE"].includes(asset.type)
    if(isImg){
      const r=new Rect({left:100,top:100,width:400,height:300,fill:"#e8e8e8",stroke:"#aaa",strokeWidth:2,strokeDashArray:[10,5]})
      ;(r as any).layerId=asset.id;(r as any).layerLabel=asset.label
      fc.add(r);fc.setActiveObject(r)
    } else {
      const txt=asset.value?.trim()?asset.value:`{{ ${asset.label} }}`
      const t=new Textbox(txt,{left:200,top:200,width:1520,fontSize:100,fontFamily:"Arial",fontWeight:"normal",fill:"#111111",editable:true,textAlign:"left"})
      ;(t as any).layerId=asset.id;(t as any).layerLabel=asset.label
      fc.add(t);fc.setActiveObject(t)
    }
    fc.renderAll()
    doSave(fc)
    setMsg(`✓ ${asset.label}`)
    setTimeout(()=>setMsg(""),2000)
  }

  function selLayer(lid:string){const fc=fabricRef.current;if(!fc)return;const o=fc.getObjects().find((x:any)=>x.layerId===lid);if(o){fc.setActiveObject(o);fc.renderAll();setSelected(o)}}
  function delLayer(lid:string){const fc=fabricRef.current;if(!fc)return;const o=fc.getObjects().find((x:any)=>x.layerId===lid&&!(x as any).isBackground);if(o){fc.remove(o);fc.renderAll();doSave(fc)}}
  function chZoom(d:number){const fc=fabricRef.current;if(!fc)return;const z=Math.min(2,Math.max(0.1,zoom+d));setZoom(z);fc.setZoom(z);fc.setDimensions({width:Math.round(CW*z),height:Math.round(CH*z)});fc.renderAll()}
  function undo(){const fc=fabricRef.current;if(!fc)return;const o=fc.getObjects().filter((x:any)=>!(x as any).isBackground);if(o.length>0){fc.remove(o[o.length-1]);fc.renderAll();doSave(fc)}}
  function bgColor(c:string){const bg=bgRef.current;const fc=fabricRef.current;if(!bg||!fc)return;bg.set("fill",c);fc.renderAll();doSave(fc);setSelected((p:any)=>p?{...p,fill:c}:p)}

  if(!campaign) return <div style={{display:"flex",alignItems:"center",justifyContent:"center",height:"100vh",background:"#1a1a1a",color:"#888",fontSize:14}}>Carregando...</div>

  const bS={background:"transparent",border:"none",cursor:"pointer",color:"#888",fontSize:18,lineHeight:1,padding:"0 4px"} as React.CSSProperties

  return(
    <div style={{display:"flex",flexDirection:"column",height:"100vh",overflow:"hidden",background:"#111"}}>
      <div style={{height:48,background:"#111",borderBottom:"1px solid #222",display:"flex",alignItems:"center",padding:"0 16px",gap:12,flexShrink:0}}>
        <button onClick={()=>router.push(`/campaigns/${campaignId}`)} style={{...bS,fontSize:13,color:"#666"}}>← {campaign.name}</button>
        <div style={{flex:1}}/>
        {msg&&<span style={{fontSize:11,color:msg.startsWith("✓")?"#4ade80":"#f87171"}}>{msg}</span>}
        {saving&&<span style={{fontSize:11,color:"#444"}}>Salvando...</span>}
        <span style={{fontSize:11,color:"#444"}}>1920 × 1080 px</span>
        <button onClick={()=>setModal(true)} style={{background:"#F5C400",border:"none",borderRadius:6,padding:"6px 16px",fontWeight:700,fontSize:13,cursor:"pointer"}}>▶ Gerar Peças</button>
      </div>

      <div style={{display:"flex",flex:1,overflow:"hidden"}}>
        <LayerPanel layers={layers} selectedObj={selected} onSelect={selLayer} onDelete={delLayer}/>
        <div style={{display:"flex",flexDirection:"column",flex:1,overflow:"hidden"}}>
          <div style={{height:44,background:"#1a1a1a",borderBottom:"1px solid #222",display:"flex",alignItems:"center",padding:"0 16px",gap:10,flexShrink:0}}>
            <span style={{fontSize:12,color:"#555",fontWeight:600}}>Asset:</span>
            <select value={assetId} onChange={e=>setAsset(e.target.value)} style={{background:"#222",color:"white",border:"1px solid #333",borderRadius:4,padding:"4px 8px",fontSize:12,fontFamily:"inherit",maxWidth:260}}>
              {campaign.assets.map(a=><option key={a.id} value={a.id}>{a.label}{a.value?` — "${a.value.substring(0,18)}"`:""}</option>)}
            </select>
            <button onClick={add} style={{background:"#F5C400",color:"#111",border:"none",padding:"5px 14px",borderRadius:4,fontSize:12,fontWeight:700,cursor:"pointer"}}>+ Adicionar</button>
            <div style={{flex:1}}/>
            <button onClick={()=>chZoom(-0.1)} style={bS}>−</button>
            <span style={{fontSize:11,color:"#555",minWidth:40,textAlign:"center"}}>{Math.round(zoom*100)}%</span>
            <button onClick={()=>chZoom(+0.1)} style={bS}>+</button>
            <button onClick={undo} style={{...bS,padding:"0 8px"}}>↩</button>
          </div>

          <div style={{flex:1,overflow:"auto",background:"#2a2a2a",display:"flex",alignItems:"center",justifyContent:"center",padding:"40px",boxSizing:"border-box" as const}}>
            <div style={{
              boxShadow:"0 8px 48px rgba(0,0,0,0.7)",
              lineHeight:0,
              flexShrink:0,
              width:Math.round(CW*zoom)+"px",
              height:Math.round(CH*zoom)+"px",
              position:"relative" as const,
              overflow:"hidden",
            }}>
              <canvas ref={canvasRef} style={{position:"absolute",top:0,left:0}}/>
            </div>
          </div>
        </div>
        <PropertiesPanel selectedObj={selected} fabricRef={fabricRef} onUpdate={doSave} onBgColorChange={bgColor}/>
      </div>

      {modal&&<GeneratePiecesModal campaignId={campaignId} fabricRef={fabricRef} onClose={()=>setModal(false)} onGenerated={()=>{setModal(false);router.push(`/pieces?campaignId=${campaignId}`)}}/>}
    </div>
  )
}
