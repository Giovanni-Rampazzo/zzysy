"use client";

import { useEffect, useRef, useState, useCallback, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { Canvas, IText, Rect, Circle, FabricImage } from "fabric";

type LayerType = "title"|"subtitle"|"body"|"subtext"|"cta"|"image"|"rect"|"circle";
interface Layer { id: string; type: LayerType; name: string; visible: boolean; locked: boolean; }

const MAX_HISTORY = 20;

function Logo() {
  return <div style={{display:"flex",alignItems:"center",fontFamily:"DM Sans",fontWeight:900,fontSize:"1.2rem",color:"#111"}}>ZZYSY</div>;
}

function LayerItem({ layer, selected, onSelect, onToggleVisible, onToggleLock }: {
  layer: Layer; selected: boolean; onSelect: () => void; onToggleVisible: () => void; onToggleLock: () => void;
}) {
  return (
    <div onClick={onSelect} style={{display:"flex",alignItems:"center",gap:"8px",padding:"7px 10px",borderRadius:"6px",cursor:"pointer",background:selected?"#EBEBEB":"transparent"}}>
      <span style={{flex:1,fontSize:"0.8rem",color:"#111",overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{layer.name}</span>
      <button onClick={e=>{e.stopPropagation();onToggleVisible();}} style={{background:"none",border:"none",cursor:"pointer",color:layer.visible?"#888":"#DDD",fontSize:"0.75rem",padding:0}} title="Visibilidade">👁</button>
      <button onClick={e=>{e.stopPropagation();onToggleLock();}} style={{background:"none",border:"none",cursor:"pointer",color:layer.locked?"#111":"#CCC",fontSize:"0.75rem",padding:0}} title="Travar">🔒</button>
    </div>
  );
}

const textTypes = [
  { type:"title" as LayerType, label:"Título", fontSize:48, fontWeight:"900" },
  { type:"subtitle" as LayerType, label:"Subtítulo", fontSize:28, fontWeight:"700" },
  { type:"body" as LayerType, label:"Texto corrido", fontSize:16, fontWeight:"400" },
  { type:"subtext" as LayerType, label:"Subtexto", fontSize:12, fontWeight:"400" },
  { type:"cta" as LayerType, label:"CTA", fontSize:16, fontWeight:"700" },
];

const CHANNELS = [
  { label:"Social Media", icon:"📱", formats:[
    { value:"1080x1080", label:"Feed Quadrado",   sub:"1080×1080" },
    { value:"1080x1350", label:"Feed Retrato",    sub:"1080×1350" },
    { value:"1080x1920", label:"Story / Reels",   sub:"1080×1920" },
    { value:"820x312",   label:"Capa Facebook",   sub:"820×312" },
    { value:"1200x628",  label:"Post Twitter/X",  sub:"1200×628" },
    { value:"1200x627",  label:"Post LinkedIn",   sub:"1200×627" },
    { value:"1080x566",  label:"Feed Paisagem",   sub:"1080×566" },
  ]},
  { label:"Display / Banner", icon:"🖥", formats:[
    { value:"728x90",  label:"Leaderboard",       sub:"728×90" },
    { value:"300x250", label:"Retângulo Médio",   sub:"300×250" },
    { value:"300x600", label:"Half Page",         sub:"300×600" },
    { value:"970x250", label:"Billboard",         sub:"970×250" },
    { value:"160x600", label:"Wide Skyscraper",   sub:"160×600" },
    { value:"320x50",  label:"Mobile Banner",     sub:"320×50" },
    { value:"468x60",  label:"Full Banner",       sub:"468×60" },
  ]},
  { label:"OOH / Impresso", icon:"🏙", formats:[
    { value:"2480x3508",  label:"A4 Retrato",     sub:"2480×3508" },
    { value:"3508x2480",  label:"A4 Paisagem",    sub:"3508×2480" },
    { value:"4961x3508",  label:"A3 Paisagem",    sub:"4961×3508" },
    { value:"14400x4800", label:"Outdoor 14×48",  sub:"14400×4800" },
    { value:"3500x1200",  label:"Busdoor",        sub:"3500×1200" },
    { value:"1000x1400",  label:"Roll-up",        sub:"1000×1400" },
    { value:"2000x2000",  label:"Totem Quadrado", sub:"2000×2000" },
  ]},
  { label:"YouTube", icon:"▶️", formats:[
    { value:"1280x720",  label:"Thumbnail",       sub:"1280×720" },
    { value:"2560x1440", label:"Banner do Canal", sub:"2560×1440" },
    { value:"1920x1080", label:"End Screen",      sub:"1920×1080" },
    { value:"300x250",   label:"Overlay Ad",      sub:"300×250" },
    { value:"728x90",    label:"Banner Superior", sub:"728×90" },
  ]},
];

const ALL_FORMATS = CHANNELS.flatMap(c=>c.formats);

const FONTS = [
  "DM Sans","Inter","Roboto","Open Sans","Lato","Montserrat","Oswald","Raleway",
  "Playfair Display","Merriweather","Nunito","Poppins","Source Sans Pro","Ubuntu",
  "PT Sans","Bebas Neue","Anton","Barlow","Mulish","Work Sans",
  "Arial","Georgia","Times New Roman","Courier New","Verdana","Helvetica"
];

async function loadGoogleFont(family: string) {
  if (["Arial","Georgia","Times New Roman","Courier New","Verdana","Helvetica"].includes(family)) return;
  const existing = document.querySelector(`link[data-font="${family}"]`);
  if (existing) return;
  const link = document.createElement("link");
  link.rel = "stylesheet";
  link.href = `https://fonts.googleapis.com/css2?family=${family.replace(/ /g,"+")}:wght@400;700&display=swap`;
  link.setAttribute("data-font", family);
  document.head.appendChild(link);
  await new Promise(r => setTimeout(r, 500));
}

function getCanvasJson(canvas: Canvas, w: number, h: number) {
  const z = canvas.getZoom();
  canvas.setZoom(1); canvas.setDimensions({width:w,height:h});
  // Garante layerId em todos objetos antes de serializar
  canvas.getObjects().forEach((obj: any, i: number) => {
    if (!obj.layerId) obj.layerId = "layer_" + Date.now() + "_" + i;
  });
  const json = (canvas as any).toJSON(["layerId"]);
  canvas.setZoom(z); canvas.setDimensions({width:w*z,height:h*z});
  return { ...json, width: w, height: h };
}

function scaleJsonToFormat(json: any, origW: number, origH: number, newW: number, newH: number) {
  const factor = Math.min(newW/origW, newH/origH);
  const offsetX = (newW-origW*factor)/2, offsetY = (newH-origH*factor)/2;
  const scaled = JSON.parse(JSON.stringify(json));
  scaled.width = newW; scaled.height = newH;
  scaled.objects = (scaled.objects??[]).map((obj:any)=>({
    ...obj,
    left:(obj.left??0)*factor+offsetX,
    top:(obj.top??0)*factor+offsetY,
    scaleX:(obj.scaleX??1)*factor,
    scaleY:(obj.scaleY??1)*factor,
    fontSize:obj.fontSize?Math.round(obj.fontSize*factor):undefined,
  }));
  return scaled;
}

const btn = {padding:"6px 12px",border:"1px solid #E5E5E5",borderRadius:"8px",background:"#FFF",fontSize:"0.8rem",fontWeight:600,cursor:"pointer",color:"#111"} as const;
const sep = {width:"1px",height:"24px",background:"#E5E5E5"} as const;

// ─── EXPORT DIALOG ───────────────────────────────────────────────
function ExportDialog({ onClose, onGenerate, generating }: {
  onClose: () => void; onGenerate: (formats: string[]) => void; generating: boolean;
}) {
  const [selected, setSelected] = useState<string[]>([]);
  const toggle = (val: string) => setSelected(prev => prev.includes(val) ? prev.filter(v=>v!==val) : [...prev, val]);
  const toggleChannel = (formats: {value:string}[]) => {
    const vals = formats.map(f=>f.value);
    const allSel = vals.every(v=>selected.includes(v));
    setSelected(prev => allSel ? prev.filter(v=>!vals.includes(v)) : prev.concat(vals.filter(v=>prev.indexOf(v)===-1)));
  };
  return (
    <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.5)",display:"flex",alignItems:"center",justifyContent:"center",zIndex:1000}}>
      <div style={{background:"#FFF",borderRadius:"16px",width:"700px",maxHeight:"82vh",display:"flex",flexDirection:"column",boxShadow:"0 16px 48px rgba(0,0,0,0.2)",fontFamily:"DM Sans, sans-serif"}}>
        <div style={{padding:"24px 28px 18px",borderBottom:"1px solid #E5E5E5",display:"flex",justifyContent:"space-between",alignItems:"flex-start"}}>
          <div>
            <h2 style={{fontSize:"1.1rem",fontWeight:700,color:"#111",margin:"0 0 4px"}}>Exportar Peças</h2>
            <p style={{fontSize:"0.82rem",color:"#888",margin:0}}>Selecione os formatos. A matriz será adaptada automaticamente para cada um.</p>
          </div>
          <button onClick={onClose} style={{background:"none",border:"none",cursor:"pointer",fontSize:"1.4rem",color:"#888",lineHeight:1,padding:0}}>×</button>
        </div>
        <div style={{flex:1,overflowY:"auto",padding:"20px 28px",display:"flex",flexDirection:"column",gap:"28px"}}>
          {CHANNELS.map(ch => {
            const allSel = ch.formats.every(f=>selected.includes(f.value));
            return (
              <div key={ch.label}>
                <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:"12px"}}>
                  <div style={{display:"flex",alignItems:"center",gap:"8px"}}>
                    <span>{ch.icon}</span>
                    <span style={{fontSize:"0.78rem",fontWeight:700,color:"#111",textTransform:"uppercase",letterSpacing:"0.07em"}}>{ch.label}</span>
                  </div>
                  <button onClick={()=>toggleChannel(ch.formats)} style={{fontSize:"0.75rem",color:"#4285F4",background:"none",border:"none",cursor:"pointer",fontWeight:600,padding:0}}>
                    {allSel?"Desmarcar todos":"Selecionar todos"}
                  </button>
                </div>
                <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:"8px"}}>
                  {ch.formats.map(fmt => {
                    const checked = selected.includes(fmt.value);
                    return (
                      <label key={fmt.value+ch.label} style={{display:"flex",alignItems:"center",gap:"10px",padding:"10px 12px",border:`1.5px solid ${checked?"#111":"#E5E5E5"}`,borderRadius:"8px",cursor:"pointer",background:checked?"#F7F7F7":"#FFF",transition:"border-color 0.1s"}}>
                        <input type="checkbox" checked={checked} onChange={()=>toggle(fmt.value)} style={{width:"15px",height:"15px",cursor:"pointer",accentColor:"#111"}}/>
                        <div>
                          <div style={{fontSize:"0.82rem",fontWeight:600,color:"#111"}}>{fmt.label}</div>
                          <div style={{fontSize:"0.72rem",color:"#AAA"}}>{fmt.sub}</div>
                        </div>
                      </label>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
        <div style={{padding:"16px 28px",borderTop:"1px solid #E5E5E5",display:"flex",justifyContent:"space-between",alignItems:"center"}}>
          <span style={{fontSize:"0.82rem",color:"#888"}}>{selected.length} formato{selected.length!==1?"s":""} selecionado{selected.length!==1?"s":""}</span>
          <div style={{display:"flex",gap:"8px"}}>
            <button onClick={onClose} style={{padding:"9px 20px",border:"1px solid #E5E5E5",borderRadius:"8px",background:"#FFF",color:"#555",fontSize:"0.85rem",fontWeight:600,cursor:"pointer"}}>Cancelar</button>
            <button onClick={()=>onGenerate(selected)} disabled={selected.length===0||generating} style={{padding:"9px 20px",border:"none",borderRadius:"8px",background:selected.length===0?"#CCC":"#F5C400",color:"#111",fontSize:"0.85rem",fontWeight:700,cursor:selected.length===0?"not-allowed":"pointer"}}>
              {generating?"Gerando...":"Gerar Peças →"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── EDITOR ──────────────────────────────────────────────────────
function EditorPageInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const campaignId = searchParams.get("campaign");
  const pieceId = searchParams.get("pieceId");
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const fabricRef = useRef<Canvas|null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [layers, setLayers] = useState<Layer[]>([]);
  const [campaignName, setCampaignName] = useState("");
  const [selectedId, setSelectedId] = useState<string|null>(null);
  const [selectedType, setSelectedType] = useState<string|null>(null);
  const formatParam = searchParams.get("format");
  const fromPiece = searchParams.get("fromPiece");
  const fromPieces = searchParams.get("fromPieces");
  const initSize = formatParam ? { w: parseInt(formatParam.split("x")[0])||1080, h: parseInt(formatParam.split("x")[1])||1080 } : {w:1080,h:1080};
  const [canvasSize, setCanvasSize] = useState(initSize);
  const calcZoom = (w: number, h: number) => {
    if (typeof window === 'undefined') return 0.45;
    const availW = window.innerWidth - 280 - 80;
    const availH = window.innerHeight - 48 - 60 - 80;
    return Math.min(availW/w, availH/h, 1) * 0.9;
  };
  const [zoom, setZoom] = useState(0.45);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [isDirty, setIsDirty] = useState(false);
  const [canvasReady, setCanvasReady] = useState(false);
  useEffect(() => { setZoom(calcZoom(canvasSize.w, canvasSize.h)); }, []);
  const [showTextMenu, setShowTextMenu] = useState(false);
  const [showExportDialog, setShowExportDialog] = useState(false);
  const [showCloseConfirm, setShowCloseConfirm] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [textProps, setTextProps] = useState({fontSize:16,fontFamily:"DM Sans",fill:"#111111",fontWeight:"400",textAlign:"left"});
  const [shapeColor, setShapeColor] = useState("#4285F4");
  const [activeCampaignId, setActiveCampaignId] = useState<string|null>(campaignId);

  // ─── UNDO/REDO ───────────────────────────────────────────────
  const historyRef = useRef<string[]>([]);
  const historyIndexRef = useRef<number>(-1);
  const isApplyingHistoryRef = useRef(false);
  const [canUndo, setCanUndo] = useState(false);
  const [canRedo, setCanRedo] = useState(false);
  const syncHistory = () => { setCanUndo(historyIndexRef.current>0); setCanRedo(historyIndexRef.current<historyRef.current.length-1); };

  const pushHistory = useCallback(() => {
    const canvas = fabricRef.current; if (!canvas||isApplyingHistoryRef.current) return;
    const json = JSON.stringify(getCanvasJson(canvas,canvasSize.w,canvasSize.h));
    historyRef.current = historyRef.current.slice(0,historyIndexRef.current+1);
    historyRef.current.push(json);
    if (historyRef.current.length>MAX_HISTORY) historyRef.current.shift();
    historyIndexRef.current = historyRef.current.length-1;
    syncHistory();
  },[canvasSize]);

  const applyHistory = useCallback((json: string) => {
    const canvas = fabricRef.current; if (!canvas) return;
    isApplyingHistoryRef.current = true;
    canvas.loadFromJSON(JSON.parse(json), () => {
      canvas.setZoom(zoom); canvas.setDimensions({width:canvasSize.w*zoom,height:canvasSize.h*zoom}); canvas.requestRenderAll();
      const objs = canvas.getObjects() as any[];
      setLayers(objs.map((o,i) => {
        if (!o.layerId) o.layerId="loaded-"+i;
        const t = (o.type??"").toLowerCase();
        return {id:o.layerId,type:(t==="i-text"?"text":t) as LayerType,name:o.text?o.text.substring(0,20):t==="rect"?"Retângulo":t==="circle"?"Círculo":"Imagem",visible:o.visible!==false,locked:!!o.lockMovementX};
      }));
      setIsDirty(true); isApplyingHistoryRef.current=false;
    });
  },[zoom,canvasSize]);

  const undo = useCallback(() => { if (historyIndexRef.current<=0) return; historyIndexRef.current--; applyHistory(historyRef.current[historyIndexRef.current]); syncHistory(); },[applyHistory]);
  const redo = useCallback(() => { if (historyIndexRef.current>=historyRef.current.length-1) return; historyIndexRef.current++; applyHistory(historyRef.current[historyIndexRef.current]); syncHistory(); },[applyHistory]);

  const updateTextProp = (prop: string, value: any) => {
    const canvas = fabricRef.current; if (!canvas) return;
    const obj = canvas.getActiveObject() as any; if (!obj) return;
    obj.set({[prop]:value}); canvas.renderAll();
    setTextProps(prev=>({...prev,[prop]:value})); setIsDirty(true);
  };

  const updateShapeColor = (color: string) => {
    const canvas = fabricRef.current; if (!canvas) return;
    const obj = canvas.getActiveObject() as any; if (!obj) return;
    obj.set({fill:color}); canvas.renderAll(); setShapeColor(color); setIsDirty(true);
  };

  // ─── CANVAS INIT ─────────────────────────────────────────────
  useEffect(() => {
    if (!canvasRef.current||fabricRef.current) return;
    const canvas = new Canvas(canvasRef.current,{width:1080,height:1080,backgroundColor:"#FFFFFF"});
    canvas.setZoom(0.45); canvas.setDimensions({width:1080*0.45,height:1080*0.45});
    fabricRef.current = canvas; setCanvasReady(true);
    const sync = (obj: any) => {
      if (!obj) return;
      setSelectedId(obj.layerId??null); setSelectedType(obj.type??null);
      if (obj.fontSize) setTextProps({fontSize:obj.fontSize,fontFamily:obj.fontFamily??"DM Sans",fill:obj.fill??"#111111",fontWeight:String(obj.fontWeight??"400"),textAlign:obj.textAlign??"left"});
      if (obj.fill&&typeof obj.fill==="string"&&!obj.fontSize) setShapeColor(obj.fill);
    };
    canvas.on("selection:created",(e:any)=>sync(e.selected?.[0]));
    canvas.on("selection:updated",(e:any)=>sync(e.selected?.[0]));
    canvas.on("selection:cleared",()=>{setSelectedId(null);setSelectedType(null);});
    canvas.on("object:modified",()=>{ if(!isApplyingHistoryRef.current){setIsDirty(true);setSaved(false);pushHistory();} });
    canvas.on("object:added",()=>{ if(!isApplyingHistoryRef.current){setIsDirty(true);setSaved(false);pushHistory();} });
    canvas.on("object:removed",()=>{ if(!isApplyingHistoryRef.current){setIsDirty(true);setSaved(false);pushHistory();} });
    return () => {canvas.dispose();fabricRef.current=null;};
  },[]);

  const loadLayers = (canvas: Canvas) => {
    const objs = canvas.getObjects() as any[];
    setLayers(objs.map((o,i) => {
      if (!o.layerId) o.layerId="loaded-"+i;
      const t = (o.type??"").toLowerCase();
      return {id:o.layerId,type:(t==="i-text"?"text":t) as LayerType,name:o.text?o.text.substring(0,20):t==="rect"?"Retângulo":t==="circle"?"Círculo":"Imagem",visible:o.visible!==false,locked:!!o.lockMovementX};
    }));
  };

  useEffect(() => {
    const canvas = fabricRef.current; if (!canvas||!canvasReady||pieceId||!campaignId) return;
    fetch("/api/campaigns").then(r=>r.json()).then(list=>{
      const c = Array.isArray(list)?list.find((x:any)=>x.id===campaignId):null;
      if (c) setCampaignName(c.name);
    });
    fetch(`/api/campaigns/${campaignId}/matrix`).then(r=>r.ok?r.json():null).then(res=>{
      const data = res?.data; if (!data) return;
      isApplyingHistoryRef.current = true;
      canvas.loadFromJSON(data, () => {
        canvas.requestRenderAll();
        setTimeout(() => { canvas.requestRenderAll(); loadLayers(canvas); setIsDirty(false); historyRef.current=[JSON.stringify(data)]; historyIndexRef.current=0; syncHistory(); isApplyingHistoryRef.current=false; }, 150);
      });
    });
  },[campaignId,canvasReady,pieceId]);

  useEffect(() => {
    const canvas = fabricRef.current; if (!canvas||!canvasReady||!pieceId) return;
    fetch(`/api/pieces/${pieceId}`).then(r=>r.ok?r.json():null).then(res=>{
      if (!res) return;
      setActiveCampaignId(res.campaignId); setCampaignName(res.campaign?.name??"");
      const data = res.data;
      if (res.format) {
        const [fw,fh]=res.format.split("x").map(Number);
        if(fw&&fh){
          const z = calcZoom(fw,fh);
          setCanvasSize({w:fw,h:fh});
          setZoom(z);
          canvas.setZoom(z);
          canvas.setDimensions({width:fw*z,height:fh*z});
        }
      }
      if (!data||Object.keys(data).length===0){setIsDirty(false);return;}
      isApplyingHistoryRef.current = true;
      setTimeout(() => {
        canvas.loadFromJSON(data, () => {
          canvas.requestRenderAll();
          setTimeout(() => { canvas.requestRenderAll(); loadLayers(canvas); setIsDirty(false); historyRef.current=[JSON.stringify(data)]; historyIndexRef.current=0; syncHistory(); isApplyingHistoryRef.current=false; }, 150);
        });
      }, 100);
    });
  },[pieceId,canvasReady]);

  useEffect(() => {
    const canvas = fabricRef.current; if (!canvas) return;
    canvas.setZoom(zoom); canvas.setDimensions({width:canvasSize.w*zoom,height:canvasSize.h*zoom}); canvas.renderAll();
  },[zoom,canvasSize]);

  const addText = useCallback((type: LayerType, label: string, fontSize: number, fontWeight: string) => {
    const canvas = fabricRef.current; if (!canvas) return;
    const id = `layer_${Date.now()}`;
    const defaults: Record<string,string> = {title:"Título da campanha",subtitle:"Subtítulo aqui",body:"Texto corrido",subtext:"Subtexto",cta:"SAIBA MAIS"};
    const padding = Math.max(6,Math.round(canvasSize.w*0.05));
    let fs = Math.max(10,Math.round(fontSize*Math.sqrt(canvasSize.w*canvasSize.h)/1080));
    const text = new IText(defaults[type]??label,{left:padding,top:padding,fontSize:fs,fontWeight,fontFamily:"DM Sans, sans-serif",fill:"#111111",textAlign:"left"});
    (text as any).layerId = id; canvas.add(text);
    for (let i=0;i<40;i++){canvas.renderAll();if(text.getBoundingRect().width<=canvasSize.w-padding*2)break;fs=Math.max(10,fs-1);text.set({fontSize:fs});if(fs<=10)break;}
    canvas.setActiveObject(text); canvas.renderAll();
    setLayers(prev=>[...prev,{id,type,name:label,visible:true,locked:false}]);
    setSelectedId(id); setShowTextMenu(false);
  },[canvasSize]);

  const addShape = useCallback((type: "rect"|"circle") => {
    const canvas = fabricRef.current; if (!canvas) return;
    const id = `layer_${Date.now()}`;
    const shape = type==="rect" ? new Rect({left:100,top:100,width:200,height:120,fill:"#4285F4",rx:8}) : new Circle({left:100,top:100,radius:80,fill:"#34A853"});
    (shape as any).layerId = id; canvas.add(shape); canvas.setActiveObject(shape); canvas.renderAll();
    setLayers(prev=>[...prev,{id,type,name:type==="rect"?"Retângulo":"Círculo",visible:true,locked:false}]);
    setSelectedId(id);
  },[]);

  const addImage = useCallback(async (file: File) => {
    const canvas = fabricRef.current; if (!canvas) return;
    const id = `layer_${Date.now()}`;
    const img = await FabricImage.fromURL(URL.createObjectURL(file));
    if (img.width&&img.width>canvasSize.w*0.6) img.scaleToWidth(canvasSize.w*0.6);
    img.set({left:100,top:100}); (img as any).layerId = id;
    canvas.add(img); canvas.setActiveObject(img); canvas.renderAll();
    setLayers(prev=>[...prev,{id,type:"image",name:file.name,visible:true,locked:false}]);
    setSelectedId(id);
  },[canvasSize]);

  const deleteSelected = useCallback(() => {
    const canvas = fabricRef.current; if (!canvas) return;
    const obj = canvas.getActiveObject(); if (!obj) return;
    const lid = (obj as any).layerId; canvas.remove(obj); canvas.renderAll();
    if (lid) setLayers(prev=>prev.filter(l=>l.id!==lid)); setSelectedId(null);
  },[]);

  const toggleVisible = useCallback((id: string) => {
    const canvas = fabricRef.current; if (!canvas) return;
    canvas.getObjects().forEach((o:any)=>{if(o.layerId===id)o.visible=!o.visible;});
    canvas.renderAll(); setLayers(prev=>prev.map(l=>l.id===id?{...l,visible:!l.visible}:l));
  },[]);

  const toggleLock = useCallback((id: string) => {
    const canvas = fabricRef.current; if (!canvas) return;
    canvas.getObjects().forEach((o:any)=>{if(o.layerId===id){const lock=!o.lockMovementX;o.set({lockMovementX:lock,lockMovementY:lock,lockScalingX:lock,lockScalingY:lock,selectable:!lock});}});
    canvas.renderAll(); setLayers(prev=>prev.map(l=>l.id===id?{...l,locked:!l.locked}:l));
  },[]);

  const save = useCallback(async () => {
    const canvas = fabricRef.current; if (!canvas) return;
    const cid = activeCampaignId??campaignId; setSaving(true);
    const json = getCanvasJson(canvas,canvasSize.w,canvasSize.h);
    try {
      if (pieceId) { const res=await fetch(`/api/pieces/${pieceId}`,{method:"PATCH",headers:{"Content-Type":"application/json"},body:JSON.stringify({data:json})}); if(!res.ok)throw new Error(); }
      else if (cid) { const res=await fetch(`/api/campaigns/${cid}/matrix`,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({data:json})}); if(!res.ok)throw new Error(); }
      setSaved(true); setIsDirty(false);
    } catch(e){alert("Erro ao salvar.");} finally{setSaving(false);}
  },[campaignId,activeCampaignId,pieceId,canvasSize]);

  const fromExports = false;
  const reorderLayer = (fromId: string, toId: string) => {
    if (fromId === toId) return;
    const canvas = fabricRef.current; if (!canvas) return;
    setLayers(prev => {
      const arr = [...prev];
      const fromIdx = arr.findIndex(l => l.id === fromId);
      const toIdx = arr.findIndex(l => l.id === toId);
      const [moved] = arr.splice(fromIdx, 1);
      arr.splice(toIdx, 0, moved);
      // Reordena objetos no canvas
      const objs = canvas.getObjects();
      const fromObj = objs.find((o:any) => o.layerId === fromId);
      const toObj = objs.find((o:any) => o.layerId === toId);
      if (fromObj && toObj) {
        const fi = objs.indexOf(fromObj), ti = objs.indexOf(toObj);
        canvas.moveObjectTo(fromObj, ti);
        canvas.requestRenderAll();
      }
      pushHistory();
      return arr;
    });
  };
  const closeUrl = fromPiece
    ? `/editor?pieceId=${fromPiece}&format=${formatParam||"1080x1080"}`
    : fromPieces
    ? `/pieces?campaignId=${fromPieces}`
    : pieceId
    ? `/pieces?campaignId=${activeCampaignId??""}`
    : "/campaigns";

  const handleClose = useCallback(async () => {
    if (isDirty) {
      await save();
    }
    window.location.href = closeUrl + (closeUrl.includes("?") ? "&" : "?") + "ts=" + Date.now();
  },[isDirty,closeUrl,save]);

  const handleGenerate = useCallback(async (formats: string[]) => {
    const cid = activeCampaignId??campaignId; if (!cid||formats.length===0) return;
    setGenerating(true);
    const canvas = fabricRef.current; if (!canvas) return;
    const json = getCanvasJson(canvas,canvasSize.w,canvasSize.h);
    // Salva matriz
    await fetch(`/api/campaigns/${cid}/matrix`,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({data:json})});
    // Cria peças vinculadas à campanha
    await Promise.all(formats.map(async(fmt) => {
      const [w,h] = fmt.split("x").map(Number);
      const scaled = scaleJsonToFormat(json,canvasSize.w,canvasSize.h,w,h);
      const label = ALL_FORMATS.find(f=>f.value===fmt)?.label??fmt;
      return fetch("/api/pieces",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({campaignId:cid,name:`${campaignName} — ${label}`,format:fmt,data:scaled,upsert:true})});
    }));
    setGenerating(false); setShowExportDialog(false);
    router.push(`/pieces?campaignId=${cid}`);
  },[campaignId,activeCampaignId,campaignName,canvasSize]);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      const isEditing = (fabricRef.current?.getActiveObject() as any)?.isEditing;
      const tag = (e.target as HTMLElement).tagName;
      const ctrl = e.metaKey||e.ctrlKey;
      if ((e.key==="Delete"||e.key==="Backspace")&&tag!=="INPUT"&&tag!=="TEXTAREA"&&!isEditing) deleteSelected();
      if (ctrl&&e.key==="s"){e.preventDefault();save();}
      if (ctrl&&e.key==="z"&&!e.shiftKey){e.preventDefault();undo();}
      if ((ctrl&&e.shiftKey&&e.key==="z")||(ctrl&&e.key==="y")){e.preventDefault();redo();}
    };
    window.addEventListener("keydown",handler);
    return () => window.removeEventListener("keydown",handler);
  },[deleteSelected,save,undo,redo]);

  const isText = selectedType==="i-text";
  const isShape = ["rect","Rect","circle","Circle"].includes(selectedType??"");
  const isPiece = !!pieceId;

  return (
    <div style={{display:"flex",flexDirection:"column",height:"100vh",background:"#F7F7F7",fontFamily:"DM Sans, sans-serif"}}>

      {/* TOP BAR */}
      <div style={{height:"48px",background:"#FFF",borderBottom:"1px solid #E5E5E5",display:"flex",alignItems:"center",padding:"0 16px",gap:"12px",zIndex:10,flexShrink:0}}>
        <a href="/campaigns" style={{textDecoration:"none"}}><Logo /></a>
        <div style={sep}/>
        <div style={{display:"flex",alignItems:"center",gap:"8px"}}>
          {!isPiece && <span style={{fontSize:"0.68rem",fontWeight:700,background:"#F5C400",color:"#111",padding:"2px 8px",borderRadius:"99px",textTransform:"uppercase",letterSpacing:"0.06em"}}>Matriz</span>}
          <span style={{fontSize:"0.9rem",fontWeight:700,color:"#111"}}>{campaignName||"Editor"}</span>
        </div>
        <div style={{flex:1}}/>
        <button onClick={undo} disabled={!canUndo} title="Desfazer (Ctrl+Z)" style={{...btn,opacity:canUndo?1:0.35,cursor:canUndo?"pointer":"not-allowed",padding:"5px 10px"}}>↩</button>
        <button onClick={redo} disabled={!canRedo} title="Refazer (Ctrl+Shift+Z)" style={{...btn,opacity:canRedo?1:0.35,cursor:canRedo?"pointer":"not-allowed",padding:"5px 10px"}}>↪</button>
        <div style={sep}/>
        <button onClick={save} style={{padding:"6px 16px",border:"none",borderRadius:"8px",background:saved?"#34A853":"#111",color:"#FFF",fontSize:"0.8rem",fontWeight:700,cursor:"pointer",transition:"background 0.2s"}}>
          {saving?"Salvando...":saved?"✓ Salvo":"Salvar"}
        </button>
        {!isPiece && (
          <button onClick={()=>setShowExportDialog(true)} style={{padding:"6px 20px",border:"none",borderRadius:"8px",background:"#F5C400",color:"#111",fontSize:"0.8rem",fontWeight:700,cursor:"pointer"}}>
            Gerar Peças →
          </button>
        )}
        {isPiece && activeCampaignId && (
          <button onClick={()=>{ window.location.href="/editor?campaign="+activeCampaignId+(pieceId?"&fromPiece="+pieceId:""); }} style={{padding:"6px 16px",border:"none",borderRadius:"8px",background:"#F5C400",color:"#111",fontSize:"0.8rem",fontWeight:700,cursor:"pointer"}}>
            ✏️ Editar Matriz
          </button>
        )}
        {isPiece && (
          <button onClick={()=>{ window.location.href="/pieces?campaignId="+(activeCampaignId??"")+"&export="+pieceId; }} style={{padding:"6px 16px",border:"none",borderRadius:"8px",background:"#111",color:"#FFF",fontSize:"0.8rem",fontWeight:700,cursor:"pointer"}}>
            ⬆ Exportar
          </button>
        )}

        <button onClick={handleClose} style={{padding:"6px 16px",border:"1.5px solid #E5E5E5",borderRadius:"8px",background:"#FFF",fontSize:"0.8rem",fontWeight:700,cursor:"pointer",color:"#111"}}>← Voltar</button>
      </div>

      {/* TOOLBAR */}
      <div style={{height:"46px",background:"#FFF",borderBottom:"1px solid #E5E5E5",display:"flex",alignItems:"center",padding:"0 16px",gap:"8px",zIndex:9,flexShrink:0}}>
        <div style={{position:"relative"}}>
          <button onClick={()=>setShowTextMenu(v=>!v)} style={btn}>T Texto</button>
          {showTextMenu && (
            <div style={{position:"absolute",top:"calc(100% + 6px)",left:0,background:"#FFF",border:"1px solid #E5E5E5",borderRadius:"10px",boxShadow:"0 4px 16px rgba(0,0,0,0.1)",padding:"6px",zIndex:100,minWidth:"180px"}}>
              {textTypes.map(t=>(
                <button key={t.type} onClick={()=>addText(t.type,t.label,t.fontSize,t.fontWeight)} style={{display:"block",width:"100%",textAlign:"left",padding:"8px 12px",border:"none",borderRadius:"6px",background:"transparent",cursor:"pointer",fontSize:"0.82rem",color:"#111"}}>
                  {t.label}
                </button>
              ))}
            </div>
          )}
        </div>
        <button onClick={()=>addShape("rect")} style={btn}>▭ Rect</button>
        <button onClick={()=>addShape("circle")} style={btn}>○ Círculo</button>
        <button onClick={()=>fileInputRef.current?.click()} style={btn}>🖼 Imagem</button>
        <input ref={fileInputRef} type="file" accept="image/*" style={{display:"none"}} onChange={e=>{const f=e.target.files?.[0];if(f)addImage(f);}}/>
        {selectedId && <button onClick={deleteSelected} style={{...btn,color:"#E53935"}}>🗑 Apagar</button>}
        <div style={{flex:1}}/>
        <button onClick={()=>setZoom(z=>Math.max(0.1,+(z-0.05).toFixed(2)))} style={{width:"28px",height:"28px",border:"1px solid #E5E5E5",borderRadius:"6px",background:"#FFF",cursor:"pointer"}}>-</button>
        <span style={{fontSize:"0.8rem",color:"#666",minWidth:"40px",textAlign:"center"}}>{Math.round(zoom*100)}%</span>
        <button onClick={()=>setZoom(z=>Math.min(2,+(z+0.05).toFixed(2)))} style={{width:"28px",height:"28px",border:"1px solid #E5E5E5",borderRadius:"6px",background:"#FFF",cursor:"pointer"}}>+</button>
      </div>

      {/* CANVAS + PAINEL */}
      <div style={{display:"flex",flex:1,overflow:"hidden"}}>
        <div style={{flex:1,display:"flex",alignItems:"center",justifyContent:"center",overflow:"auto",background:"#EBEBEB",position:"relative"}}>
          {!isPiece && (
            <div style={{position:"absolute",top:"16px",left:"50%",transform:"translateX(-50%)",pointerEvents:"none",zIndex:1}}>
              <div style={{background:"rgba(245,196,0,0.15)",border:"1px solid #F5C400",borderRadius:"8px",padding:"5px 14px",fontSize:"0.75rem",fontWeight:600,color:"#8a6f00",whiteSpace:"nowrap"}}>
                ✏️ Editando a Matriz — todas as peças serão geradas a partir daqui
              </div>
            </div>
          )}
          <div style={{boxShadow:"0 8px 32px rgba(0,0,0,0.15)",borderRadius:"2px"}}>
            <canvas ref={canvasRef}/>
          </div>
        </div>

        {/* PAINEL DIREITO */}
        <aside style={{width:"240px",background:"#FFF",borderLeft:"1px solid #E5E5E5",display:"flex",flexDirection:"column",flexShrink:0,overflowY:"auto"}}>

          {/* PROPRIEDADES TEXTO */}
          {isText && (
            <div style={{padding:"12px",borderBottom:"1px solid #E5E5E5"}}>
              <span style={{fontSize:"0.72rem",fontWeight:700,color:"#888",textTransform:"uppercase",letterSpacing:"0.05em",display:"block",marginBottom:"10px"}}>Texto</span>
              <div style={{display:"flex",flexDirection:"column",gap:"8px"}}>

                <div>
                  <label style={{fontSize:"0.72rem",color:"#888",display:"block",marginBottom:"3px"}}>Fonte</label>
                  <select value={textProps.fontFamily} onChange={e=>updateTextProp("fontFamily",e.target.value)} style={{width:"100%",padding:"5px 8px",border:"1px solid #E5E5E5",borderRadius:"6px",fontSize:"0.8rem",color:"#111"}}>
                    {FONTS.map(f=><option key={f} value={f} style={{fontFamily:f}}>{f}</option>)}
                  </select>
                  <label style={{display:"block",marginTop:"6px",fontSize:"0.72rem",color:"#4285F4",cursor:"pointer"}}>
                    + Upload fonte (.ttf/.otf)
                    <input type="file" accept=".ttf,.otf,.woff,.woff2" style={{display:"none"}} onChange={async(e)=>{
                      const file=e.target.files?.[0]; if(!file) return;
                      const name=file.name.replace(/\.[^.]+$/,"");
                      const url=URL.createObjectURL(file);
                      const font=new FontFace(name,`url(${url})`);
                      await font.load();
                      (document.fonts as any).add(font);
                      updateTextProp("fontFamily",name);
                    }}/>
                  </label>
                </div>

                <div style={{display:"flex",gap:"8px"}}>
                  <div style={{flex:1}}>
                    <label style={{fontSize:"0.72rem",color:"#888",display:"block",marginBottom:"3px"}}>Tamanho</label>
                    <input type="number" value={textProps.fontSize} min={8} max={500} onChange={e=>updateTextProp("fontSize",Number(e.target.value))} style={{width:"100%",padding:"5px 8px",border:"1px solid #E5E5E5",borderRadius:"6px",fontSize:"0.8rem",boxSizing:"border-box"}}/>
                  </div>
                  <div style={{flex:1}}>
                    <label style={{fontSize:"0.72rem",color:"#888",display:"block",marginBottom:"3px"}}>Cor</label>
                    <input type="color" value={textProps.fill} onChange={e=>updateTextProp("fill",e.target.value)} style={{width:"100%",height:"29px",padding:"2px",border:"1px solid #E5E5E5",borderRadius:"6px",cursor:"pointer"}}/>
                  </div>
                </div>

                <div>
                  <label style={{fontSize:"0.72rem",color:"#888",display:"block",marginBottom:"3px"}}>Peso</label>
                  <div style={{display:"flex",gap:"4px"}}>
                    {["400","700","900"].map(w=>(
                      <button key={w} onClick={()=>updateTextProp("fontWeight",w)} style={{flex:1,padding:"4px",border:"1px solid #E5E5E5",borderRadius:"6px",background:textProps.fontWeight===w?"#111":"#FFF",color:textProps.fontWeight===w?"#FFF":"#111",fontSize:"0.75rem",cursor:"pointer"}}>
                        {w==="400"?"Normal":w==="700"?"Bold":"Black"}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label style={{fontSize:"0.72rem",color:"#888",display:"block",marginBottom:"3px"}}>Alinhamento</label>
                  <div style={{display:"flex",gap:"4px"}}>
                    {(["left","center","right"] as const).map(a=>(
                      <button key={a} onClick={()=>updateTextProp("textAlign",a)} title={a==="left"?"Esquerda":a==="center"?"Centro":"Direita"} style={{flex:1,padding:"5px 4px",border:"1px solid #E5E5E5",borderRadius:"6px",background:textProps.textAlign===a?"#111":"#FFF",color:textProps.textAlign===a?"#FFF":"#111",fontSize:"0.85rem",cursor:"pointer",fontWeight:600}}>
                        {a==="left"?"←":a==="center"?"≡":"→"}
                      </button>
                    ))}
                  </div>
                </div>

              </div>
            </div>
          )}

          {/* PROPRIEDADES FORMA */}
          {isShape && (
            <div style={{padding:"12px",borderBottom:"1px solid #E5E5E5"}}>
              <span style={{fontSize:"0.72rem",fontWeight:700,color:"#888",textTransform:"uppercase",display:"block",marginBottom:"10px"}}>Forma</span>
              <label style={{fontSize:"0.72rem",color:"#888",display:"block",marginBottom:"3px"}}>Cor</label>
              <input type="color" value={shapeColor} onChange={e=>{setShapeColor(e.target.value);updateShapeColor(e.target.value);}} style={{width:"100%",height:"32px",padding:"2px",border:"1px solid #E5E5E5",borderRadius:"6px",cursor:"pointer"}}/>
            </div>
          )}

          {/* CAMADAS */}
          <div style={{padding:"12px 10px 8px",borderBottom:"1px solid #E5E5E5",flexShrink:0}}>
            <span style={{fontSize:"0.75rem",fontWeight:700,color:"#888",textTransform:"uppercase",letterSpacing:"0.05em"}}>Camadas</span>
          </div>
          <div style={{flex:1,overflow:"auto",padding:"6px"}}>
            {layers.length===0 && <p style={{fontSize:"0.78rem",color:"#BBB",textAlign:"center",marginTop:"24px"}}>Nenhuma camada</p>}
            {[...layers].reverse().map(layer=>(
              <div key={layer.id} draggable
                onDragStart={e=>e.dataTransfer.setData('layerId',layer.id)}
                onDragOver={e=>e.preventDefault()}
                onDrop={e=>{e.preventDefault();reorderLayer(e.dataTransfer.getData('layerId'),layer.id);}}
                style={{cursor:'grab'}}>
              <LayerItem layer={layer} selected={selectedId===layer.id}
                onSelect={()=>{
                  setSelectedId(layer.id);
                  const canvas=fabricRef.current; if (!canvas) return;
                  const obj=canvas.getObjects().find((o:any)=>o.layerId===layer.id);
                  if (obj){canvas.setActiveObject(obj);canvas.renderAll();}
                }}
                onToggleVisible={()=>toggleVisible(layer.id)}
                onToggleLock={()=>toggleLock(layer.id)}
              />
              </div>
            ))}
          </div>

        </aside>
      </div>

      {/* MODAIS */}
      {showExportDialog && <ExportDialog onClose={()=>setShowExportDialog(false)} onGenerate={handleGenerate} generating={generating}/>}
      {showCloseConfirm && (
        <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.4)",display:"flex",alignItems:"center",justifyContent:"center",zIndex:1000}}>
          <div style={{background:"#FFF",borderRadius:"12px",padding:"28px 32px",width:"340px",boxShadow:"0 8px 32px rgba(0,0,0,0.18)"}}>
            <div style={{fontWeight:700,fontSize:"1rem",color:"#111",marginBottom:"8px"}}>ZZYSY</div>
            <p style={{fontSize:"0.9rem",color:"#444",marginBottom:"24px"}}>Deseja salvar antes de fechar?</p>
            <div style={{display:"flex",gap:"8px",justifyContent:"flex-end"}}>
              <button onClick={()=>{window.location.href=closeUrl;}} style={{padding:"7px 16px",border:"1px solid #E5E5E5",borderRadius:"8px",background:"#FFF",color:"#555",fontSize:"0.85rem",fontWeight:600,cursor:"pointer"}}>Não salvar</button>
              <button onClick={()=>{save().then(()=>{window.location.href=closeUrl;});}} style={{padding:"7px 16px",border:"none",borderRadius:"8px",background:"#111",color:"#FFF",fontSize:"0.85rem",fontWeight:700,cursor:"pointer"}}>Salvar e fechar</button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}

export default function EditorPage() {
  return (
    <Suspense fallback={<div style={{display:"flex",alignItems:"center",justifyContent:"center",height:"100vh",fontFamily:"DM Sans"}}>Carregando...</div>}>
      <EditorPageInner />
    </Suspense>
  );
}
