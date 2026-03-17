"use client";
import { Suspense } from "react";
import { useEffect, useState, useRef } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Sidebar } from "@/components/Sidebar";
import { colors } from "@/lib/theme";

type Piece = {
  id: string; name: string; format: string;
  status: "DRAFT"|"REVIEW"|"APPROVED"|"EXPORTED";
  data?: any;
  createdAt: string; updatedAt: string;
  campaign: { id: string; name: string };
};
type Campaign = { id: string; name: string };

const STATUS_LABEL: Record<string,string> = { DRAFT:"Rascunho", REVIEW:"Em revisão", APPROVED:"Aprovado", EXPORTED:"Exportado" };
const STATUS_COLOR: Record<string,string> = { DRAFT:"#888", REVIEW:"#4285F4", APPROVED:"#34A853", EXPORTED:"#F5C400" };

// ─── EXPORT FORMATS ──────────────────────────────────────────────
const EXPORT_FORMATS = [
  { id:"png",  label:"PNG",  desc:"Web, social media — com transparência" },
  { id:"svg",  label:"SVG",  desc:"Vetorial, editável" },
  { id:"psd",  label:"PSD",  desc:"Photoshop com layers editáveis" },
];

// ─── EXPORT DIALOG ───────────────────────────────────────────────
function ExportDialog({ pieces, campaignId, campaignName, onClose }: {
  pieces: Piece[];
  campaignId: string;
  campaignName: string;
  onClose: () => void;
}) {
  const router = useRouter();
  const [formats, setFormats] = useState<string[]>([]);
  const [quality, setQuality] = useState(100); // 100 = máxima, 60 = reduzida
  const [exporting, setExporting] = useState(false);

  const toggleFormat = (id: string) =>
    setFormats(prev => prev.includes(id) ? prev.filter(f=>f!==id) : [...prev, id]);

  const handleExport = async () => {
    if (formats.length === 0) return;
    setExporting(true);
    try {
      const { default: JSZip } = await import("jszip");
      const { Canvas } = await import("fabric");
      const zip = new JSZip();
      const folder = zip.folder(campaignName.replace(/[^a-zA-Z0-9]/g,"_"))!;

      for (const piece of pieces) {
        const [fw, fh] = piece.format.split("x").map(Number);
        const el = document.createElement("canvas");
        const canvW = fw || 1080;
        const canvH = fh || 1080;
        const fc = new Canvas(el, { width:canvW, height:canvH, backgroundColor:"transparent" });
        if (piece.data && Object.keys(piece.data).length > 0) {
          await new Promise<void>(res => {
            fc.loadFromJSON(piece.data, () => {
              fc.setZoom(1);
              fc.setDimensions({width:canvW, height:canvH});
              fc.requestRenderAll();
              setTimeout(() => { fc.requestRenderAll(); res(); }, 300);
            });
          });
        }
        // Usa só a parte após " — " (nome do formato) + formato como nome do arquivo
        const pieceLabelRaw = piece.name.includes(" — ") ? piece.name.split(" — ").slice(1).join("_") : piece.name;
        const safeName = (pieceLabelRaw + "_" + piece.format).replace(/[^a-zA-Z0-9\-_]/g,"_").replace(/_+/g,"_").replace(/^_|_$/g,"");

        for (const fmt of formats) {
          try {
          if (fmt === "png") {
            const dataUrl = fc.toDataURL({ format:"png", multiplier:quality/100 });
            const base64 = dataUrl.replace(/^data:image\/png;base64,/,"");
            folder.file(`${safeName}.png`, base64, { base64:true });
          }
          if (fmt === "svg") {
            const svg = fc.toSVG();
            folder.file(`${safeName}.svg`, svg);
          }
          if (fmt === "psd") {
            try {
              const { writePsd } = await import("ag-psd");
              const objects = fc.getObjects();
              const psdLayers: any[] = [];
              const origVisible = objects.map((o:any) => o.visible);
              const origBg = (fc as any).backgroundColor;

              // fundo como layer pixel
              const bgCanvas = document.createElement('canvas');
              bgCanvas.width = canvW; bgCanvas.height = canvH;
              const bgCtx = bgCanvas.getContext('2d')!;
              bgCtx.fillStyle = (origBg && origBg !== 'transparent') ? origBg : '#FFFFFF';
              bgCtx.fillRect(0, 0, canvW, canvH);
              psdLayers.push({ name: 'Background', imageData: bgCtx.getImageData(0,0,canvW,canvH), top:0, left:0, bottom:canvH, right:canvW });
              (fc as any).backgroundColor = 'transparent';

              // Garantir zoom=1 para export correto
              const origZoom = fc.getZoom();
              fc.setZoom(1);
              fc.setDimensions({width:canvW, height:canvH});
              fc.requestRenderAll();

              for (let oi = 0; oi < objects.length; oi++) {
                const obj = objects[oi] as any;
                const name = obj.text?.substring(0,40) || obj.layerId || obj.type || 'layer';
                const isText = obj.type === 'i-text' || obj.type === 'text' || obj.type === 'IText';

                if (isText) {
                  // cor: parse hex ou rgb(), valores 0-255
                  const rawFill = (obj.fill && typeof obj.fill === 'string') ? obj.fill.trim() : '#000000';
                  let hexFill = '000000';
                  if (rawFill.startsWith('#')) { hexFill = rawFill.replace('#','').padEnd(6,'0'); }
                  else if (rawFill.startsWith('rgb')) { const m=rawFill.match(/[0-9]+/g); if(m&&m.length>=3) hexFill=[m[0],m[1],m[2]].map((n:string)=>parseInt(n).toString(16).padStart(2,'0')).join(''); }
                  const cr=parseInt(hexFill.substring(0,2),16), cg=parseInt(hexFill.substring(2,4),16), cb=parseInt(hexFill.substring(4,6),16);

                  // dimensões e posição reais — calcular a partir das propriedades do objeto
                  const scX=obj.scaleX||1, scY=obj.scaleY||1;
                  // calcObjLeft/Top: posição real no canvas (zoom=1) levando em conta originX/Y
                  const objW = Math.round((obj.width||100)*scX);
                  const objH = Math.round((obj.height||30)*scY);
                  const cx = obj.left||0, cy = obj.top||0;
                  const ox = obj.originX||'left', oy = obj.originY||'top';
                  const objLeft = Math.round(ox==='center' ? cx-objW/2 : ox==='right' ? cx-objW : cx);
                  const objTop  = Math.round(oy==='center' ? cy-objH/2 : oy==='bottom' ? cy-objH : cy);

                  // fonte
                  const rawFamily=(obj.fontFamily||'Arial').replace(/,.*$/,'').trim();
                  const isBold=obj.fontWeight==='bold'||obj.fontWeight==='700'||obj.fontWeight==='900'||Number(obj.fontWeight)>=700;
                  const isItalic=obj.fontStyle==='italic';
                  const safeFontSize=Math.max(1,Math.round((obj.fontSize||16)*scX)); // fontSize visual = fontSize * scaleX
                  const PS_MAP: Record<string,{r:string;b:string;i:string;bi:string}> = {
                    'Arial':{r:'ArialMT',b:'Arial-BoldMT',i:'Arial-ItalicMT',bi:'Arial-BoldItalicMT'},
                    'Verdana':{r:'Verdana',b:'Verdana-Bold',i:'Verdana-Italic',bi:'Verdana-BoldItalic'},
                    'Georgia':{r:'Georgia',b:'Georgia-Bold',i:'Georgia-Italic',bi:'Georgia-BoldItalic'},
                    'Times New Roman':{r:'TimesNewRomanPSMT',b:'TimesNewRomanPS-BoldMT',i:'TimesNewRomanPS-ItalicMT',bi:'TimesNewRomanPS-BoldItalicMT'},
                    'Courier New':{r:'CourierNewPSMT',b:'CourierNewPS-BoldMT',i:'CourierNewPS-ItalicMT',bi:'CourierNewPS-BoldItalicMT'},
                    'Helvetica':{r:'Helvetica',b:'Helvetica-Bold',i:'Helvetica-Oblique',bi:'Helvetica-BoldOblique'},
                    'DM Sans':{r:'DMSans-Regular',b:'DMSans-Bold',i:'DMSans-Italic',bi:'DMSans-BoldItalic'},
                    'Inter':{r:'Inter-Regular',b:'Inter-Bold',i:'Inter-Italic',bi:'Inter-BoldItalic'},
                    'Roboto':{r:'Roboto-Regular',b:'Roboto-Bold',i:'Roboto-Italic',bi:'Roboto-BoldItalic'},
                    'Montserrat':{r:'Montserrat-Regular',b:'Montserrat-Bold',i:'Montserrat-Italic',bi:'Montserrat-BoldItalic'},
                    'Poppins':{r:'Poppins-Regular',b:'Poppins-Bold',i:'Poppins-Italic',bi:'Poppins-BoldItalic'},
                    'Lato':{r:'Lato-Regular',b:'Lato-Bold',i:'Lato-Italic',bi:'Lato-BoldItalic'},
                    'Open Sans':{r:'OpenSans-Regular',b:'OpenSans-Bold',i:'OpenSans-Italic',bi:'OpenSans-BoldItalic'},
                    'Oswald':{r:'Oswald-Regular',b:'Oswald-Bold',i:'Oswald-Regular',bi:'Oswald-Bold'},
                    'Raleway':{r:'Raleway-Regular',b:'Raleway-Bold',i:'Raleway-Italic',bi:'Raleway-BoldItalic'},
                    'Nunito':{r:'Nunito-Regular',b:'Nunito-Bold',i:'Nunito-Italic',bi:'Nunito-BoldItalic'},
                    'Playfair Display':{r:'PlayfairDisplay-Regular',b:'PlayfairDisplay-Bold',i:'PlayfairDisplay-Italic',bi:'PlayfairDisplay-BoldItalic'},
                    'Bebas Neue':{r:'BebasNeue-Regular',b:'BebasNeue-Regular',i:'BebasNeue-Regular',bi:'BebasNeue-Regular'},
                    'Anton':{r:'Anton-Regular',b:'Anton-Regular',i:'Anton-Regular',bi:'Anton-Regular'},
                    'Source Sans Pro':{r:'SourceSansPro-Regular',b:'SourceSansPro-Bold',i:'SourceSansPro-Italic',bi:'SourceSansPro-BoldItalic'},
                    'Ubuntu':{r:'Ubuntu-Regular',b:'Ubuntu-Bold',i:'Ubuntu-Italic',bi:'Ubuntu-BoldItalic'},
                    'PT Sans':{r:'PTSans-Regular',b:'PTSans-Bold',i:'PTSans-Italic',bi:'PTSans-BoldItalic'},
                    'Barlow':{r:'Barlow-Regular',b:'Barlow-Bold',i:'Barlow-Italic',bi:'Barlow-BoldItalic'},
                    'Mulish':{r:'Mulish-Regular',b:'Mulish-Bold',i:'Mulish-Italic',bi:'Mulish-BoldItalic'},
                    'Work Sans':{r:'WorkSans-Regular',b:'WorkSans-Bold',i:'WorkSans-Italic',bi:'WorkSans-BoldItalic'},
                    'Merriweather':{r:'Merriweather-Regular',b:'Merriweather-Bold',i:'Merriweather-Italic',bi:'Merriweather-BoldItalic'},
                  };
                  const psEntry=PS_MAP[rawFamily];
                  const psName=psEntry?(isBold&&isItalic?psEntry.bi:isBold?psEntry.b:isItalic?psEntry.i:psEntry.r):rawFamily;

                  const textContent=(obj.text||'').replace(/\r\n/g,'\n').replace(/\r/g,'\n');
                  const baseStyle={ font:{name:psName}, fontSize:safeFontSize, fillColor:{r:cr,g:cg,b:cb}, fauxBold:isBold, fauxItalic:isItalic };
                  const fabricStyles=obj.styles||{};
                  const styleRuns: any[]=[];
                  if (Object.keys(fabricStyles).length===0) {
                    styleRuns.push({ length:textContent.length, style:baseStyle });
                  } else {
                    let runStart=0, prevKey='', prevSt=baseStyle, lIdx=0, cIdx=0;
                    for (let ci=0;ci<textContent.length;ci++) {
                      if (textContent[ci]==='\n'){lIdx++;cIdx=0;continue;}
                      const cs=(fabricStyles[lIdx]&&fabricStyles[lIdx][cIdx])||{};
                      const f2=(cs.fill&&typeof cs.fill==='string')?cs.fill.trim():rawFill;
                      let h2='000000';
                      if(f2.startsWith('#'))h2=f2.replace('#','').padEnd(6,'0');
                      else if(f2.startsWith('rgb')){const m2=f2.match(/[0-9]+/g);if(m2&&m2.length>=3)h2=[m2[0],m2[1],m2[2]].map((n:string)=>parseInt(n).toString(16).padStart(2,'0')).join('');}
                      const b2=cs.fontWeight?(cs.fontWeight==='bold'||cs.fontWeight==='700'||cs.fontWeight==='900'||Number(cs.fontWeight)>=700):isBold;
                      const i2=cs.fontStyle?cs.fontStyle==='italic':isItalic;
                      const fs2=Math.max(1,Math.round((cs.fontSize||obj.fontSize||16)*scX)); // fontSize visual = fontSize * scaleX
                      const st={font:{name:psName},fontSize:fs2,fillColor:{r:parseInt(h2.substring(0,2),16),g:parseInt(h2.substring(2,4),16),b:parseInt(h2.substring(4,6),16)},fauxBold:b2,fauxItalic:i2};
                      const k=JSON.stringify(st);
                      if(k!==prevKey){if(ci>runStart)styleRuns.push({length:ci-runStart,style:prevSt});prevSt=st;prevKey=k;runStart=ci;}
                      cIdx++;
                    }
                    if(runStart<textContent.length)styleRuns.push({length:textContent.length-runStart,style:prevSt});
                    if(!styleRuns.length)styleRuns.push({length:textContent.length,style:baseStyle});
                  }
                  // Renderizar texto como imageData para preview correto no Photoshop
                  objects.forEach((o:any,idx2:number)=>{o.visible=idx2===oi;});
                  fc.renderAll();
                  await new Promise<void>(res2=>setTimeout(res2,30));
                  fc.renderAll();
                  const nativeEl2=(fc as any).lowerCanvasEl as HTMLCanvasElement;
                  const tmp2=document.createElement('canvas');
                  tmp2.width=canvW;tmp2.height=canvH;
                  const ctx2dText=tmp2.getContext('2d')!;
                  ctx2dText.clearRect(0,0,canvW,canvH);
                  ctx2dText.drawImage(nativeEl2,0,0,nativeEl2.width,nativeEl2.height,0,0,canvW,canvH);
                  const textImgData=ctx2dText.getImageData(0,0,canvW,canvH);
                  psdLayers.push({ name, imageData:textImgData, top:0, left:0, bottom:canvH, right:canvW, text:{ text:textContent, transform:[1,0,0,1,objLeft,objTop], style:baseStyle, styleRuns, paragraphStyle:{justification:obj.textAlign==='center'?'center':obj.textAlign==='right'?'right':'left'} } });
                } else {
                  // layer pixel — renderiza objeto isolado e captura via toDataURL
                  objects.forEach((o:any,idx2:number)=>{o.visible=idx2===oi;});
                  (fc as any).backgroundColor='transparent';
                  fc.renderAll();
                  await new Promise<void>(res=>setTimeout(res,150));
                  fc.renderAll();
                  // toDataURL com multiplier garante resolução correta independente de devicePixelRatio
                  const dataUrlLayer=fc.toDataURL({format:'png',multiplier:1,width:canvW,height:canvH});
                  const imgElLayer=new Image();
                  await new Promise<void>(res=>{imgElLayer.onload=()=>res();imgElLayer.src=dataUrlLayer;});
                  const tmpLayer=document.createElement('canvas');
                  tmpLayer.width=canvW; tmpLayer.height=canvH;
                  const ctx2d=tmpLayer.getContext('2d')!;
                  ctx2d.clearRect(0,0,canvW,canvH);
                  // Desenhar na resolução lógica (não física) para evitar escala Retina
                  ctx2d.drawImage(imgElLayer,0,0,canvW,canvH);
                  const imgData=ctx2d.getImageData(0,0,canvW,canvH);
                  psdLayers.push({name,imageData:imgData,top:0,left:0,bottom:canvH,right:canvW});
                }
              }

              objects.forEach((o:any,idx:number)=>{o.visible=origVisible[idx];});
              (fc as any).backgroundColor=origBg;
              fc.setZoom(origZoom);
              fc.renderAll();
              const buffer=writePsd({width:canvW,height:canvH,children:psdLayers});
              folder.file(`${safeName}.psd`,buffer);
            } catch(psdErr){console.error('PSD error:',psdErr);}
          }
          if (fmt === "pdf") {
            try {
              const { PDFDocument, rgb } = await import("pdf-lib");
              const pdfDoc = await PDFDocument.create();
              const page = pdfDoc.addPage([canvW, canvH]);
              const dataUrl = fc.toDataURL({ format:"png", multiplier:1 });
              const pngData = dataUrl.replace(/^data:image\/png;base64,/, "");
              const pngImage = await pdfDoc.embedPng(Uint8Array.from(atob(pngData), c => c.charCodeAt(0)));
              page.drawImage(pngImage, { x:0, y:0, width:canvW, height:canvH });
              const pdfBytes = await pdfDoc.save();
              folder.file(`${safeName}.pdf`, pdfBytes);
            } catch(pdfErr) { console.error("PDF error:", pdfErr); }
          }
          } catch(fmtErr) { console.error('Erro formato', fmt, fmtErr); }
        }
        fc.dispose();
      }

      // Gera ZIP e cria Delivery
      const blob = await zip.generateAsync({ type:"blob" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `ZZYSY_${campaignName.replace(/[^a-zA-Z0-9]/g,"_")}_Entrega.zip`;
      document.body.appendChild(a); a.click(); document.body.removeChild(a);
      URL.revokeObjectURL(url);

      // Cria Delivery no banco
      const formatsPayload = pieces.map(p => {
        const label = p.name;
        return { value: p.format, label, data: p.data ?? {} };
      });
      await fetch("/api/deliveries", {
        method:"POST",
        headers:{"Content-Type":"application/json"},
        body: JSON.stringify({ campaignId, formats: formatsPayload, campaignName }),
      });

      onClose();
      router.push(`/pieces?campaignId=${campaignId}`);
    } catch(e) {
      console.error(e);
      alert("Erro ao exportar.");
    } finally {
      setExporting(false);
    }
  };

  return (
    <div style={{ position:"fixed",inset:0,background:"rgba(0,0,0,0.5)",display:"flex",alignItems:"center",justifyContent:"center",zIndex:1000 }}>
      <div style={{ background:"#FFF",borderRadius:"16px",width:"480px",fontFamily:"'DM Sans',sans-serif",boxShadow:"0 16px 48px rgba(0,0,0,0.2)" }}>
        {/* Header */}
        <div style={{ padding:"24px 28px 18px",borderBottom:"1px solid #E5E5E5",display:"flex",justifyContent:"space-between",alignItems:"flex-start" }}>
          <div>
            <h2 style={{ fontSize:"1.1rem",fontWeight:700,color:"#111",margin:"0 0 4px" }}>Exportar Peças</h2>
            <p style={{ fontSize:"0.82rem",color:"#888",margin:0 }}>{pieces.length} peça{pieces.length!==1?"s":""} selecionada{pieces.length!==1?"s":""}</p>
          </div>
          <button onClick={onClose} style={{ background:"none",border:"none",cursor:"pointer",fontSize:"1.4rem",color:"#888",lineHeight:1,padding:0 }}>×</button>
        </div>

        {/* Formatos */}
        <div style={{ padding:"20px 28px",borderBottom:"1px solid #E5E5E5" }}>
          <div style={{ fontSize:"0.72rem",fontWeight:700,color:"#888",textTransform:"uppercase",letterSpacing:"0.06em",marginBottom:"12px" }}>Formatos</div>
          <div style={{ display:"flex",flexDirection:"column",gap:"8px" }}>
            {EXPORT_FORMATS.map(f=>{
              const checked = formats.includes(f.id);
              return (
                <label key={f.id} style={{ display:"flex",alignItems:"center",gap:"12px",padding:"10px 14px",border:`1.5px solid ${checked?"#111":"#E5E5E5"}`,borderRadius:"8px",cursor:"pointer",background:checked?"#F7F7F7":"#FFF",transition:"border-color 0.1s" }}>
                  <input type="checkbox" checked={checked} onChange={()=>toggleFormat(f.id)} style={{ width:"15px",height:"15px",cursor:"pointer",accentColor:"#111" }}/>
                  <div>
                    <div style={{ fontSize:"0.85rem",fontWeight:700,color:"#111" }}>{f.label}</div>
                    <div style={{ fontSize:"0.72rem",color:"#888" }}>{f.desc}</div>
                  </div>
                </label>
              );
            })}
          </div>
        </div>

        {/* Qualidade PNG */}
        {formats.includes("png") && (
          <div style={{ padding:"20px 28px",borderBottom:"1px solid #E5E5E5" }}>
            <div style={{ display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:"10px" }}>
              <div style={{ fontSize:"0.72rem",fontWeight:700,color:"#888",textTransform:"uppercase",letterSpacing:"0.06em" }}>Qualidade PNG</div>
              <span style={{ fontSize:"0.82rem",fontWeight:700,color:"#111" }}>
                {quality === 100 ? "Alta (sem compressão)" : quality >= 80 ? "Boa" : quality >= 60 ? "Reduzida" : "Baixa"}
                {" "}— {quality}%
              </span>
            </div>
            <input type="range" min={40} max={100} step={5} value={quality} onChange={e=>setQuality(Number(e.target.value))}
              style={{ width:"100%",accentColor:"#111",cursor:"pointer" }} />
            <div style={{ display:"flex",justifyContent:"space-between",fontSize:"0.7rem",color:"#AAA",marginTop:"4px" }}>
              <span>Menor peso</span>
              <span>Maior qualidade</span>
            </div>
          </div>
        )}

        {/* Footer */}
        <div style={{ padding:"16px 28px",display:"flex",justifyContent:"space-between",alignItems:"center" }}>
          <span style={{ fontSize:"0.78rem",color:"#888" }}>ZIP + registro na aba Exportações</span>
          <div style={{ display:"flex",gap:"8px" }}>
            <button onClick={onClose} style={{ padding:"9px 20px",border:"1px solid #E5E5E5",borderRadius:"8px",background:"#FFF",color:"#555",fontSize:"0.85rem",fontWeight:600,cursor:"pointer" }}>Cancelar</button>
            <button onClick={handleExport} disabled={formats.length===0||exporting}
              style={{ padding:"9px 20px",border:"none",borderRadius:"8px",background:formats.length===0?"#CCC":"#111",color:"#FFF",fontSize:"0.85rem",fontWeight:700,cursor:formats.length===0?"not-allowed":"pointer",opacity:exporting?0.7:1 }}>
              {exporting?"Gerando ZIP...":"⬆ Exportar ZIP"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── PIECE PREVIEW ───────────────────────────────────────────────
function PiecePreview({ piece, onClick }: { piece: Piece; onClick: () => void }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [rendered, setRendered] = useState(false);

  useEffect(() => {
    if (!piece.data || Object.keys(piece.data).length === 0) return;
    let fc: any = null;
    let cancelled = false;
    setRendered(false);
    const run = async () => {
      await new Promise<void>(r => setTimeout(r, 100));
      if (cancelled || !canvasRef.current) return;
      const mod = await import("fabric");
      const FabricCanvas = mod.Canvas;
      if (cancelled || !canvasRef.current) return;
      const parts = piece.format.split("x").map(Number);
      const srcW = parts[0] || 1080; const srcH = parts[1] || 1080;
      const scale = Math.min(228/srcW, 148/srcH); // margem 26px cada lado
      const w = Math.round(srcW*scale); const h2 = Math.round(srcH*scale);
      fc = new FabricCanvas(canvasRef.current, { width:w, height:h2, backgroundColor:"#FFF", selection:false });
      fc.setZoom(scale); fc.setDimensions({width:w, height:h2});
      await new Promise<void>(res => { fc.loadFromJSON(piece.data, () => { fc.requestRenderAll(); res(); }); });
      if (!cancelled) { fc.getObjects().forEach((o: any) => {o.selectable=false;o.evented=false;}); setRendered(true); }
    };
    run().catch(console.error);
    return () => { cancelled = true; try { if(fc) fc.dispose(); } catch(e) {} };
  }, [piece.data, piece.format]);
  const parts2=piece.format.split("x").map(Number);
  const ratio=(parts2[1]||1080)/(parts2[0]||1080);
  const h=Math.max(80,Math.min(200,Math.round(240*ratio)));
  return (
    <div onClick={onClick} style={{ background:"#E8E8E8",display:"flex",alignItems:"center",justifyContent:"center",cursor:"pointer",overflow:"hidden",minHeight:"120px",flex:1,borderBottom:"1px solid "+colors.border }}>
      {!rendered && <div style={{ textAlign:"center",color:colors.textMuted }}><div style={{ fontSize:"1.8rem" }}>🎨</div><div style={{ fontSize:"0.7rem",marginTop:"4px" }}>{piece.format}</div></div>}
      <canvas ref={canvasRef} style={{ display:rendered?"block":"none",maxWidth:"100%",maxHeight:"100%" }} />
    </div>
  );
}

// ─── PIECE CARD ──────────────────────────────────────────────────
function PieceCard({ piece, selected, onSelect, onEdit, onDelete, onDuplicate, onStatusChange, selectMode }: {
  piece: Piece; selected: boolean; onSelect: () => void; selectMode: boolean;
  onEdit:()=>void; onDelete:()=>void; onDuplicate:()=>void; onStatusChange:(s:string)=>void;
}) {
  const [hover, setHover] = useState(false);
  return (
    <div onMouseEnter={()=>setHover(true)} onMouseLeave={()=>setHover(false)}
      style={{ border:`1.5px solid ${selected?"#111":hover?"#555":colors.border}`,borderRadius:"12px",overflow:"hidden",background:"#FFF",transition:"border-color 0.15s, box-shadow 0.15s",boxShadow:selected?"0 0 0 3px rgba(0,0,0,0.08)":hover?"0 4px 16px rgba(0,0,0,0.1)":"none",position:"relative",display:"flex",flexDirection:"column",height:"100%" }}>
      {/* Checkbox de seleção + botão apagar rápido */}
      <div style={{ position:"absolute",top:"8px",right:"8px",zIndex:2,display:"flex",gap:"4px",alignItems:"center" }}>

        <div onClick={e=>{e.stopPropagation();onSelect();}} style={{ width:"18px",height:"18px",borderRadius:"3px",border:`1.5px solid ${selected?"#111":"#CCC"}`,background:selected?"#111":"rgba(255,255,255,0.9)",cursor:"pointer",display:selectMode?"flex":"none",alignItems:"center",justifyContent:"center",boxShadow:"0 1px 4px rgba(0,0,0,0.15)" }}>
          {selected && <span style={{ color:"#FFF",fontSize:"12px",lineHeight:1 }}>✓</span>}
        </div>
      </div>
      <PiecePreview key={piece.id+"-"+(piece.updatedAt||"0")} piece={piece} onClick={onEdit} />
      <div style={{ padding:"12px 14px",flexShrink:0 }}>
        <div style={{ fontSize:"0.85rem",fontWeight:700,color:colors.text,marginBottom:"3px",whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis" }} title={piece.name.includes(" — ") ? piece.name.split(" — ").pop()! : piece.name}>{piece.name.includes(" — ") ? piece.name.split(" — ").pop()! : piece.name}</div>
        <div style={{ fontSize:"0.72rem",color:colors.textMuted,marginBottom:"10px" }}>{piece.format} · {new Date(piece.updatedAt).toLocaleDateString("pt-BR")}</div>
        <div style={{ display:"flex",alignItems:"center",justifyContent:"space-between" }}>
          <select value={piece.status} onChange={e=>{e.stopPropagation();onStatusChange(e.target.value);}}
            style={{ padding:"3px 8px",borderRadius:"6px",fontSize:"0.72rem",fontWeight:700,background:STATUS_COLOR[piece.status]+"22",color:STATUS_COLOR[piece.status],border:"none",cursor:"pointer",fontFamily:"'DM Sans',sans-serif" }}>
            {Object.entries(STATUS_LABEL).map(([k,v])=><option key={k} value={k}>{v}</option>)}
          </select>
          <div style={{ display:"flex",gap:"4px" }}>
            <button onClick={onDuplicate} title="Duplicar" style={{ padding:"4px 8px",border:"1px solid "+colors.border,borderRadius:"6px",background:"#FFF",fontSize:"0.72rem",cursor:"pointer" }}>⧉</button>
            <button onClick={onDelete} title="Deletar" style={{ padding:"4px 8px",border:"1px solid "+colors.border,borderRadius:"6px",background:"#FFF",fontSize:"0.72rem",cursor:"pointer",color:"#E53935" }}>🗑</button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── MAIN ────────────────────────────────────────────────────────
function PiecesPageInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [pieces, setPieces] = useState<Piece[]>([]);
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [search, setSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState("");
  const [filterCampaign, setFilterCampaign] = useState(searchParams.get("campaignId") ?? "");
  const [loading, setLoading] = useState(true);
  const [refreshKey, setRefreshKey] = useState(0);
  const [view, setView] = useState<"grid"|"list">("grid");
  const [sortField, setSortField] = useState<"name"|"format"|"updatedAt"|"status">("updatedAt");
  const [sortDir, setSortDir] = useState<"asc"|"desc">("desc");
  const [selected, setSelected] = useState<string[]>([]);
  const [showExport, setShowExport] = useState(false);
  const exportParam = searchParams.get("export");
  useEffect(() => {
    if (exportParam && pieces.length > 0) {
      setSelected([exportParam]);
      setShowExport(true);
    }
  }, [exportParam, pieces.length]);
  const [selectMode, setSelectMode] = useState(false);

  useEffect(() => { fetch("/api/campaigns").then(r=>r.json()).then(setCampaigns); }, []);
  // Re-fetch quando volta para a página
  useEffect(() => {
    const onVisible = () => {
      if (document.visibilityState === "visible") {
        const qs = filterCampaign ? "?campaignId="+filterCampaign : "";
        fetch("/api/pieces"+qs).then(r=>r.json()).then(data=>{ setPieces(Array.isArray(data)?data:[]); setRefreshKey(k=>k+1); });
      }
    };
    document.addEventListener("visibilitychange", onVisible);
    return () => document.removeEventListener("visibilitychange", onVisible);
  }, [filterCampaign]);
  useEffect(() => {
    setLoading(true);
    const qs = filterCampaign ? "?campaignId="+filterCampaign : "";
    fetch("/api/pieces"+qs).then(r=>r.json()).then(async (data) => {
      const list: any[] = Array.isArray(data) ? data : [];
      setPieces(list);
      setLoading(false);
      setRefreshKey(k=>k+1);

      // Auto-aplicar matriz nas peças sem data (criadas com schema antigo)
      if (filterCampaign && list.length > 0) {
        const emptyPieces = list.filter((p: any) => !p.data || Object.keys(p.data).length === 0);
        if (emptyPieces.length > 0) {
          try {
            const matrixRes = await fetch(`/api/campaigns/${filterCampaign}/matrix`);
            if (matrixRes.ok) {
              const matrix = await matrixRes.json();
              if (matrix?.data && Object.keys(matrix.data).length > 0) {
                // Importar scaleJsonToFormat inline
                const scaleJson = (json: any, origW: number, origH: number, newW: number, newH: number) => {
                  const factor = Math.min(newW/origW, newH/origH);
                  const offsetX = (newW - origW*factor)/2;
                  const offsetY = (newH - origH*factor)/2;
                  const scaled = JSON.parse(JSON.stringify(json));
                  scaled.width = newW; scaled.height = newH;
                  scaled.objects = (scaled.objects||[]).map((obj: any) => ({
                    ...obj,
                    left: (obj.left||0)*factor + offsetX,
                    top: (obj.top||0)*factor + offsetY,
                    scaleX: (obj.scaleX||1)*factor,
                    scaleY: (obj.scaleY||1)*factor,
                    fontSize: obj.fontSize ? Math.round(obj.fontSize*factor) : undefined,
                  }));
                  return scaled;
                };
                const matW = matrix.data.width || 1080;
                const matH = matrix.data.height || 1080;
                await Promise.all(emptyPieces.map(async (p: any) => {
                  const [pw, ph] = p.format.split("x").map(Number);
                  if (!pw || !ph) return;
                  const scaled = scaleJson(matrix.data, matW, matH, pw, ph);
                  const res = await fetch(`/api/pieces/${p.id}`, {
                    method: "PATCH",
                    headers: {"Content-Type": "application/json"},
                    body: JSON.stringify({data: scaled})
                  });
                  if (res.ok) {
                    const updated = await res.json();
                    setPieces(prev => prev.map(x => x.id === p.id ? {...x, data: updated.data} : x));
                    setRefreshKey(k=>k+1);
                  }
                }));
              }
            }
          } catch(e) { console.error("Auto-apply matrix failed:", e); }
        }
      }
    });
  }, [filterCampaign]);

  async function deletePiece(id: string) {
    if (!confirm("Deletar esta peça?")) return;
    await fetch("/api/pieces/"+id, {method:"DELETE"});
    setPieces(p=>p.filter(x=>x.id!==id));
    setSelected(s=>s.filter(x=>x!==id));
  }
  async function changeStatus(id: string, status: string) {
    await fetch("/api/pieces/"+id, { method:"PATCH", headers:{"Content-Type":"application/json"}, body:JSON.stringify({status}) });
    setPieces(p=>p.map(x=>x.id===id?{...x,status:status as Piece["status"]}:x));
  }
  const [applying, setApplying] = useState(false);

  async function applyCampaign(toCampaignId: string) {
    if (!toCampaignId) return;
    setApplying(true);
    try {
      const pieceIds = filtered.map(p=>p.id);
      if (!pieceIds.length) return;
      const res = await fetch("/api/pieces/apply-campaign", {
        method:"POST",
        headers:{"Content-Type":"application/json"},
        body:JSON.stringify({ pieceIds, campaignId: toCampaignId })
      });
      const result = await res.json();
      if (res.status===422) {
        alert("Campanha sem fields. Va em Campanhas > Campos para adicionar.");
        return;
      }
      if (!res.ok) { alert("Erro ao aplicar."); return; }
      // Atualizar dados locais
      if (result.results) {
        result.results.forEach((r: any) => {
          setPieces(prev=>prev.map(p=>p.id===r.id?{...p,data:r.data}:p));
        });
      }
      setFilterCampaign(toCampaignId);
    } catch(e) {
      console.error(e);
    } finally {
      setApplying(false);
    }
  }

  async function deleteSelected() {
    if (!confirm('Deletar '+selected.length+' peca(s)?')) return;
    await Promise.all(selected.map(id => fetch("/api/pieces/"+id, {method:"DELETE"})));
    setPieces(p=>p.filter(x=>!selected.includes(x.id)));
    setSelected([]);
  }
  async function duplicatePiece(piece: Piece) {
    const res = await fetch("/api/pieces", { method:"POST", headers:{"Content-Type":"application/json"}, body:JSON.stringify({campaignId:piece.campaign.id, name:piece.name+" (cópia)", format:piece.format, data:piece.data??{}}) });
    const created = await res.json();
    setPieces(p=>[created, ...p]);
  }

  const toggleSort = (field: "name"|"format"|"updatedAt"|"status") => {
    if (sortField===field) setSortDir(d=>d==="asc"?"desc":"asc");
    else { setSortField(field); setSortDir("asc"); }
  };
  const sortIcon = (field: string) => sortField===field ? (sortDir==="asc"?"↑":"↓") : "⇅";

  const toggleSelect = (id: string) => setSelected(prev=>prev.includes(id)?prev.filter(x=>x!==id):[...prev,id]);
  const toggleSelectAll = (ids: string[]) => {
    const allSelected = ids.every(id=>selected.includes(id));
    setSelected(prev=>allSelected?prev.filter(id=>!ids.includes(id)):prev.concat(ids.filter(id=>prev.indexOf(id)===-1)));
  };

  const filtered = pieces.filter(p =>
    (p.name.toLowerCase().includes(search.toLowerCase()) || p.format.toLowerCase().includes(search.toLowerCase())) &&
    (filterStatus ? p.status===filterStatus : true)
  ).sort((a,b) => {
    const dir = sortDir==="asc" ? 1 : -1;
    if (sortField==="name") return a.name.localeCompare(b.name)*dir;
    if (sortField==="format") return a.format.localeCompare(b.format)*dir;
    if (sortField==="status") return a.status.localeCompare(b.status)*dir;
    return (new Date(a.updatedAt).getTime()-new Date(b.updatedAt).getTime())*dir;
  });

  const grouped = filterCampaign
    ? { [filterCampaign]: filtered }
    : filtered.reduce((acc, p) => { acc[p.campaign.id]=acc[p.campaign.id]??[]; acc[p.campaign.id].push(p); return acc; }, {} as Record<string,Piece[]>);

  const campaignMap = Object.fromEntries(campaigns.map(c=>[c.id,c.name]));
  const b = "1.5px solid "+colors.border;

  const selectedPieces = pieces.filter(p=>selected.includes(p.id));
  const selectedCampaignId = selectedPieces[0]?.campaign.id ?? filterCampaign;
  const selectedCampaignName = selectedPieces[0]?.campaign.name ?? campaignMap[filterCampaign] ?? "";

  return (
    <div style={{ display:"flex",height:"100vh",background:"#FFF",fontFamily:"'DM Sans', sans-serif" }}>
      <Sidebar active="/pieces" />
      <div style={{ marginLeft:"var(--sidebar-w, 220px)",flex:1,display:"flex",flexDirection:"column",overflow:"hidden" }}>

        {/* HEADER */}
        <div style={{ padding:"28px 40px 0",borderBottom:b,flexShrink:0 }}>
          <div style={{ display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:"20px" }}>
            <div>
              <div style={{display:"flex",alignItems:"center",gap:"12px"}}><button onClick={()=>router.push("/campaigns")} style={{background:"none",border:"none",cursor:"pointer",color:"#888",fontSize:"0.85rem",fontWeight:600,padding:0}}>← Campanhas</button><h1 style={{ fontSize:"1.5rem",fontWeight:900,color:colors.text,margin:0,letterSpacing:"-0.03em" }}>Peças</h1>{filterCampaign&&<button onClick={()=>{ window.location.href="/editor?campaign="+filterCampaign+"&fromPieces="+filterCampaign; }} style={{padding:"5px 12px",background:"#F5C400",border:"none",borderRadius:"6px",fontSize:"0.78rem",fontWeight:700,cursor:"pointer"}}>✏️ Editar Matriz</button>}</div>
              <p style={{ fontSize:"0.875rem",color:colors.textMuted,margin:0 }}>{filtered.length} peça{filtered.length!==1?"s":""}{selected.length>0?" · "+selected.length+" selecionada"+(selected.length!==1?"s":""):""}</p>
            </div>
            <div style={{ display:"flex",gap:"8px",alignItems:"center" }}>
              {selectMode && selected.length>0 && (
                <>
                  <button onClick={deleteSelected}
                    style={{ padding:"10px 16px",background:"transparent",color:"#E53935",border:"1.5px solid #E53935",borderRadius:"8px",fontSize:"0.875rem",fontWeight:700,cursor:"pointer" }}>
                    🗑 Apagar {selected.length}
                  </button>
                  <button onClick={()=>setShowExport(true)}
                    style={{ padding:"10px 20px",background:"#E45804",color:"#FFFFFF",border:"none",borderRadius:"8px",fontSize:"0.875rem",fontWeight:700,cursor:"pointer" }}>
                    ⬆ Exportar {selected.length} peça{selected.length!==1?"s":""}
                  </button>
                </>
              )}
              <button onClick={()=>{setSelectMode(v=>{if(v){setSelected([]);}return !v;})}}
                style={{ padding:"10px 16px",background:selectMode?"transparent":"#E45804",color:selectMode?"#E53935":"#FFFFFF",border:"1.5px solid "+(selectMode?"#E5E5E5":"#E45804"),borderRadius:"8px",fontSize:"0.875rem",fontWeight:700,cursor:"pointer" }}>
                {selectMode?"✕ Cancelar":"⬆ Exportar"}
              </button>
            </div>
          </div>
          {/* APLICAR CAMPANHA */}
        <div style={{ display:"flex",gap:"10px",paddingBottom:"12px",alignItems:"center",flexWrap:"wrap" }}>
          <span style={{fontSize:"0.78rem",fontWeight:700,color:"#888",textTransform:"uppercase",letterSpacing:"0.05em"}}>Aplicar campos de:</span>
          <select onChange={e=>e.target.value&&applyCampaign(e.target.value)} defaultValue=""
            disabled={applying}
            style={{border:"1.5px solid #E45804",borderRadius:"8px",padding:"7px 12px",fontSize:"0.875rem",outline:"none",fontFamily:"'DM Sans',sans-serif",color:"#E45804",fontWeight:700,cursor:"pointer",background:"#FFF"}}>
            <option value="">Selecionar campanha...</option>
            {campaigns.map(c=><option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
          {applying && <span style={{fontSize:"0.8rem",color:"#888"}}>Aplicando...</span>}
        </div>
        <div style={{ display:"flex",gap:"10px",paddingBottom:"20px",flexWrap:"wrap",alignItems:"center" }}>
            <button onClick={()=>setView("grid")} title="Grade" style={{ width:"32px",height:"32px",border:"1.5px solid "+(view==="grid"?"#111":colors.border),borderRadius:"8px",background:view==="grid"?"#111":"#FFF",color:view==="grid"?"#FFF":"#888",cursor:"pointer",fontSize:"1rem",display:"flex",alignItems:"center",justifyContent:"center" }}>⊞</button>
            <button onClick={()=>setView("list")} title="Lista" style={{ width:"32px",height:"32px",border:"1.5px solid "+(view==="list"?"#111":colors.border),borderRadius:"8px",background:view==="list"?"#111":"#FFF",color:view==="list"?"#FFF":"#888",cursor:"pointer",fontSize:"1rem",display:"flex",alignItems:"center",justifyContent:"center" }}>☰</button>
            <input style={{ border:b,borderRadius:"8px",padding:"8px 14px",fontSize:"0.875rem",outline:"none",fontFamily:"'DM Sans', sans-serif",background:"#FFF",color:colors.text,width:"220px" }} placeholder="🔍 Buscar peças..." value={search} onChange={e=>setSearch(e.target.value)} />
            <select style={{ border:b,borderRadius:"8px",padding:"8px 12px",fontSize:"0.875rem",outline:"none",fontFamily:"'DM Sans', sans-serif",background:"#FFF",color:colors.text }} value={filterCampaign} onChange={e=>setFilterCampaign(e.target.value)}>
              <option value="">Todas as campanhas</option>
              {campaigns.map(c=><option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
            <select style={{ border:b,borderRadius:"8px",padding:"8px 12px",fontSize:"0.875rem",outline:"none",fontFamily:"'DM Sans', sans-serif",background:"#FFF",color:colors.text }} value={filterStatus} onChange={e=>setFilterStatus(e.target.value)}>
              <option value="">Todos os status</option>
              {Object.entries(STATUS_LABEL).map(([k,v])=><option key={k} value={k}>{v}</option>)}
            </select>
            {selected.length>0 && (
              <button onClick={()=>setSelected([])} style={{ fontSize:"0.78rem",color:"#888",background:"none",border:"none",cursor:"pointer",padding:0 }}>Limpar seleção</button>
            )}
          </div>
        </div>

        {/* CONTEÚDO */}
        <div style={{ flex:1,overflowY:"auto",padding:"32px 40px" }}>
          {loading ? (
            <div style={{ textAlign:"center",padding:"80px 0",color:colors.textMuted }}>Carregando...</div>
          ) : filtered.length===0 ? (
            <div style={{ textAlign:"center",padding:"80px 0",color:colors.textMuted }}>
              <div style={{ fontSize:"2.5rem",marginBottom:"16px" }}>🎨</div>
              <div style={{ fontWeight:700,marginBottom:"8px" }}>Nenhuma peça encontrada</div>
              <div style={{ fontSize:"0.875rem",marginBottom:"24px" }}>Esta campanha ainda não tem peças. Crie a matriz primeiro.</div>
              <div style={{display:"flex",gap:"12px",justifyContent:"center"}}><button onClick={()=>router.push("/campaigns")} style={{ padding:"10px 24px",background:"#FFF",color:"#111",border:"1.5px solid #E5E5E5",borderRadius:"8px",fontSize:"0.875rem",fontWeight:600,cursor:"pointer" }}>← Campanhas</button>{filterCampaign&&<button onClick={()=>router.push("/editor?campaign="+filterCampaign)} style={{ padding:"10px 24px",background:"#111",color:"#FFF",border:"none",borderRadius:"8px",fontSize:"0.875rem",fontWeight:700,cursor:"pointer" }}>✏️ Criar Matriz</button>}</div>
            </div>
          ) : (
            <div style={{ display:"flex",flexDirection:"column",gap:"40px" }}>
              {Object.entries(grouped).map(([cid,cpieces])=>{
                const ids = cpieces.map(p=>p.id);
                const allSelected = ids.every(id=>selected.includes(id));
                return (
                  <div key={cid}>
                    <div style={{ display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:"16px" }}>
                      <div style={{ display:"flex",alignItems:"center",gap:"12px" }}>
                        {!filterCampaign && <h2 style={{ fontSize:"1rem",fontWeight:700,color:colors.text,margin:0 }}>{campaignMap[cid]??"Campanha"}</h2>}
                        <button onClick={()=>toggleSelectAll(ids)} style={{ fontSize:"0.75rem",color:"#4285F4",background:"none",border:"none",cursor:"pointer",fontWeight:600,padding:0 }}>
                          {allSelected?"Desmarcar todos":"Selecionar todos"}
                        </button>
                      </div>
                      
                    </div>

                    {view==="list" ? (
                      <table style={{ width:"100%",borderCollapse:"collapse" }}>
                        <thead><tr>
                          <th style={{ width:"40px",padding:"8px 12px",borderBottom:"1.5px solid #E5E5E5" }}>
                            <input type="checkbox" checked={allSelected} onChange={()=>toggleSelectAll(ids)} style={{ cursor:"pointer",accentColor:"#111" }}/>
                          </th>
                          {[{label:"Preview",field:null},{label:"Nome",field:"name"},{label:"Formato",field:"format"},{label:"Data",field:"updatedAt"},{label:"Status",field:"status"},{label:"Ações",field:null}].map(({label,field})=>(
                            <th key={label} onClick={field?(()=>toggleSort(field as any)):undefined}
                              style={{ textAlign:"left",fontSize:"0.72rem",fontWeight:700,color:"#888",padding:"8px 12px",borderBottom:"1.5px solid #E5E5E5",textTransform:"uppercase",letterSpacing:"0.04em",cursor:field?"pointer":"default",userSelect:"none",whiteSpace:"nowrap" }}>
                              {label}{field?" "+sortIcon(field):""}
                            </th>
                          ))}
                        </tr></thead>
                        <tbody>
                          {cpieces.map(piece=>(
                            <tr key={piece.id} style={{ borderBottom:"1px solid #E5E5E5",background:selected.includes(piece.id)?"#FAFAFA":"transparent" }}>
                              <td style={{ padding:"10px 12px",verticalAlign:"middle" }}>
                                <input type="checkbox" checked={selected.includes(piece.id)} onChange={()=>toggleSelect(piece.id)} style={{ cursor:"pointer",accentColor:"#111",width:"16px",height:"16px",display:"block" }}/>
                              </td>
                              <td style={{ padding:"10px 12px",width:"80px" }}><div style={{ width:"72px",height:"48px",overflow:"hidden",borderRadius:"4px",cursor:"pointer" }} onClick={()=>router.push("/editor?pieceId="+piece.id+"&format="+piece.format+"&ts="+Date.now())}><PiecePreview piece={piece} onClick={()=>router.push("/editor?pieceId="+piece.id+"&format="+piece.format+"&ts="+Date.now())} /></div></td>
                              <td style={{ padding:"10px 12px",fontSize:"0.85rem",fontWeight:600,color:"#111",maxWidth:"200px",overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap" }}>{piece.name.includes(" — ") ? piece.name.split(" — ").pop()! : piece.name}</td>
                              <td style={{ padding:"10px 12px",fontSize:"0.8rem",color:"#888" }}>{piece.format}</td>
                              <td style={{ padding:"10px 12px",fontSize:"0.8rem",color:"#888" }}>{new Date(piece.updatedAt).toLocaleDateString("pt-BR")}</td>
                              <td style={{ padding:"10px 12px" }}><span style={{ padding:"2px 8px",borderRadius:"99px",fontSize:"0.7rem",fontWeight:700,background:STATUS_COLOR[piece.status]+"22",color:STATUS_COLOR[piece.status] }}>{STATUS_LABEL[piece.status]}</span></td>
                              <td style={{ padding:"10px 12px",whiteSpace:"nowrap",minWidth:"120px" }}>
                                <div style={{ display:"flex",gap:"4px",flexWrap:"nowrap" }}>
                                  <button onClick={()=>router.push("/editor?pieceId="+piece.id+"&format="+piece.format+"&ts="+Date.now())} style={{ padding:"4px 10px",border:"1.5px solid #E45804",borderRadius:"6px",background:"transparent",fontSize:"0.72rem",cursor:"pointer",fontWeight:700,color:"#E45804" }}>Editar</button>
                                  <button onClick={()=>duplicatePiece(piece)} style={{ padding:"4px 8px",border:"1px solid #E5E5E5",borderRadius:"6px",background:"#FFF",fontSize:"0.72rem",cursor:"pointer" }}>⧉</button>
                                  <button onClick={()=>deletePiece(piece.id)} style={{ padding:"4px 8px",border:"1px solid #E5E5E5",borderRadius:"6px",background:"#FFF",fontSize:"0.72rem",cursor:"pointer",color:"#E53935" }}>🗑</button>
                                </div>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    ) : (
                      <div style={{ display:"grid",gridTemplateColumns:"repeat(auto-fill, minmax(180px, 1fr))",gap:"12px" }}>
                        {cpieces.map(piece=>(
                          <PieceCard key={piece.id} piece={piece}
                            selected={selected.includes(piece.id)}
                            onSelect={()=>toggleSelect(piece.id)}
                            onEdit={()=>router.push("/editor?pieceId="+piece.id+"&format="+piece.format+"&ts="+Date.now())}
                            onDelete={()=>deletePiece(piece.id)}
                            onDuplicate={()=>duplicatePiece(piece)}
                            onStatusChange={(s)=>changeStatus(piece.id,s)}
                            selectMode={selectMode}
                          />
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {showExport && (
        <ExportDialog
          pieces={selectedPieces}
          campaignId={selectedCampaignId}
          campaignName={selectedCampaignName}
          onClose={()=>{ setShowExport(false); setSelected([]); setSelectMode(false); }}
        />
      )}
    </div>
  );
}

export default function PiecesPage() {
  return <Suspense fallback={<div>Carregando...</div>}><PiecesPageInner /></Suspense>;
}

