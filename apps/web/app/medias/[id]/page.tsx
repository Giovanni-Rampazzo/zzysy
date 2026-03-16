"use client";
import { useState, useEffect, use } from "react";
import { useRouter } from "next/navigation";
import { Sidebar } from "@/components/Sidebar";

type Piece = { id:string; name:string; format:string; status:string; data?:any; createdAt:string; };
type Media = {
  id:string; name:string;
  campaign:{ id:string; name:string; fields:any[]; client?:{id:string;name:string}; matrixData?:any; };
  pieces:Piece[];
};

const STATUS_LABEL:Record<string,string>={DRAFT:"Rascunho",REVIEW:"Em revisão",APPROVED:"Aprovado",EXPORTED:"Exportado"};
const STATUS_COLOR:Record<string,string>={DRAFT:"#888",REVIEW:"#F5C400",APPROVED:"#34A853",EXPORTED:"#4285F4"};
const P="#E45804"; const b="1px solid #E5E5E5";

const CHANNELS = [
  { label:"Social Media", formats:[
    {value:"1080x1080",label:"Feed Quadrado"},{value:"1080x1350",label:"Feed Retrato"},
    {value:"1080x1920",label:"Story / Reels"},{value:"1080x566",label:"Feed Paisagem"},
    {value:"1200x628",label:"Post Twitter/X"},{value:"1200x627",label:"Post LinkedIn"},
  ]},
  { label:"Display / Banners", formats:[
    {value:"970x250",label:"Billboard"},{value:"300x250",label:"Medium Rectangle"},
    {value:"728x90",label:"Leaderboard"},{value:"300x600",label:"Half Page"},
    {value:"320x50",label:"Mobile Banner"},
  ]},
  { label:"OOH / Impresso", formats:[
    {value:"2700x900",label:"Outdoor 3x1"},{value:"6000x2000",label:"Outdoor 6x2"},
    {value:"600x600",label:"Placa Quadrada"},{value:"2480x3508",label:"A4 Retrato"},
    {value:"3508x2480",label:"A4 Paisagem"},
  ]},
];

export default function MediaPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const [media,setMedia]=useState<Media|null>(null);
  const [loading,setLoading]=useState(true);
  const [generating,setGenerating]=useState(false);
  const [showFormats,setShowFormats]=useState(false);
  const [selectedFormats,setSelectedFormats]=useState<string[]>([]);
  const [applying,setApplying]=useState(false);

  useEffect(()=>{
    fetch("/api/medias/"+id).then(r=>r.json()).then(d=>{setMedia(d);setLoading(false);});
  },[id]);

  const toggleFormat=(v:string)=>setSelectedFormats(prev=>prev.includes(v)?prev.filter(x=>x!==v):[...prev,v]);

  const generatePieces=async()=>{
    if (!media||selectedFormats.length===0) return;
    setGenerating(true);
    const matrixData=media.campaign.matrixData;
    for (const format of selectedFormats) {
      const [w,h]=format.split("x").map(Number);
      const name=media.name+" — "+format;
      await fetch("/api/pieces",{method:"POST",headers:{"Content-Type":"application/json"},
        body:JSON.stringify({name,format,mediaId:id,data:matrixData||{}})});
    }
    const updated=await fetch("/api/medias/"+id).then(r=>r.json());
    setMedia(updated); setSelectedFormats([]); setShowFormats(false); setGenerating(false);
  };

  const applyFields=async()=>{
    if (!media||!media.campaign.fields.length||!media.pieces.length) return;
    setApplying(true);
    const textFields=media.campaign.fields.filter(f=>f.type!=="imagem"&&f.value);
    const imageFields=media.campaign.fields.filter(f=>f.type==="imagem"&&f.imageUrl);
    for (const piece of media.pieces) {
      const data=piece.data as any;
      if (!data||!data.objects) continue;
      let tIdx=0,iIdx=0;
      const newObjects=data.objects.map((obj:any)=>{
        const isText=obj.type==="i-text"||obj.type==="text"||obj.type==="IText";
        const isImg=obj.type==="image";
        if (isText&&tIdx<textFields.length){const f=textFields[tIdx++];return{...obj,text:f.value||f.label||""};}
        if (isImg&&iIdx<imageFields.length){const f=imageFields[iIdx++];return{...obj,src:f.imageUrl};}
        return obj;
      });
      await fetch("/api/pieces/"+piece.id,{method:"PATCH",headers:{"Content-Type":"application/json"},body:JSON.stringify({data:{...data,objects:newObjects}})});
    }
    const updated=await fetch("/api/medias/"+id).then(r=>r.json());
    setMedia(updated); setApplying(false);
    alert("Campos aplicados!");
  };

  const deletePiece=async(pieceId:string)=>{
    if (!confirm("Deletar esta peça?")) return;
    await fetch("/api/pieces/"+pieceId,{method:"DELETE"});
    setMedia(prev=>prev?{...prev,pieces:prev.pieces.filter(p=>p.id!==pieceId)}:prev);
  };

  if (loading) return <div style={{display:"flex",height:"100vh",fontFamily:"'DM Sans',sans-serif"}}><Sidebar active="/clients"/><div style={{marginLeft:"220px",padding:"40px",color:"#888"}}>Carregando...</div></div>;
  if (!media) return <div style={{display:"flex",height:"100vh"}}><Sidebar active="/clients"/><div style={{marginLeft:"220px",padding:"40px"}}>Não encontrado</div></div>;

  return (
    <div style={{display:"flex",height:"100vh",background:"#FFF",fontFamily:"'DM Sans',sans-serif"}}>
      <Sidebar active="/clients"/>
      <div style={{marginLeft:"var(--sidebar-w,220px)",flex:1,display:"flex",flexDirection:"column",overflow:"hidden"}}>
        {/* HEADER */}
        <div style={{padding:"20px 40px",borderBottom:b,flexShrink:0}}>
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"center"}}>
            <div>
              <div style={{display:"flex",alignItems:"center",gap:"8px",marginBottom:"4px",fontSize:"0.8rem",color:"#888"}}>
                {media.campaign.client&&<><span style={{cursor:"pointer"}} onClick={()=>router.push("/clients/"+media.campaign.client!.id)}>{media.campaign.client.name}</span><span>/</span></>}
                <span style={{cursor:"pointer"}} onClick={()=>router.push("/campaigns/"+media.campaign.id)}>{media.campaign.name}</span>
                <span>/</span><span style={{color:"#111",fontWeight:600}}>{media.name}</span>
              </div>
              <h1 style={{fontSize:"1.3rem",fontWeight:900,color:"#111",margin:0,letterSpacing:"-0.02em"}}>{media.name}</h1>
              <p style={{fontSize:"0.8rem",color:"#888",margin:"2px 0 0"}}>{media.pieces.length} peça{media.pieces.length!==1?"s":""}</p>
            </div>
            <div style={{display:"flex",gap:"8px"}}>
              {media.campaign.fields.some(f=>f.value) && (
                <button onClick={applyFields} disabled={applying}
                  style={{padding:"7px 14px",background:"transparent",color:P,border:"1.5px solid "+P,borderRadius:"8px",fontSize:"0.8rem",fontWeight:700,cursor:"pointer"}}>
                  {applying?"Aplicando...":"⚡ Aplicar campos"}
                </button>
              )}
              <button onClick={()=>setShowFormats(!showFormats)}
                style={{padding:"7px 14px",background:P,color:"#FFF",border:"none",borderRadius:"8px",fontSize:"0.8rem",fontWeight:700,cursor:"pointer"}}>
                + Gerar peças
              </button>
            </div>
          </div>

          {/* SELECTOR DE FORMATOS */}
          {showFormats&&(
            <div style={{marginTop:"16px",padding:"16px",background:"#FAFAFA",borderRadius:"10px",border:b}}>
              {CHANNELS.map(ch=>(
                <div key={ch.label} style={{marginBottom:"12px"}}>
                  <p style={{fontSize:"0.72rem",fontWeight:700,color:"#888",margin:"0 0 8px",textTransform:"uppercase",letterSpacing:"0.05em"}}>{ch.label}</p>
                  <div style={{display:"flex",gap:"6px",flexWrap:"wrap"}}>
                    {ch.formats.map(f=>(
                      <button key={f.value} onClick={()=>toggleFormat(f.value)}
                        style={{padding:"5px 10px",borderRadius:"6px",border:"1.5px solid "+(selectedFormats.includes(f.value)?P:"#E5E5E5"),background:selectedFormats.includes(f.value)?"#FFF3EC":"#FFF",color:selectedFormats.includes(f.value)?P:"#555",fontSize:"0.75rem",fontWeight:600,cursor:"pointer"}}>
                        {f.label} <span style={{color:"#AAA",fontSize:"0.68rem"}}>{f.value}</span>
                      </button>
                    ))}
                  </div>
                </div>
              ))}
              <div style={{display:"flex",gap:"8px",justifyContent:"flex-end",marginTop:"8px"}}>
                <button onClick={()=>{setShowFormats(false);setSelectedFormats([]);}} style={{padding:"6px 14px",border:b,borderRadius:"8px",cursor:"pointer",fontSize:"0.8rem"}}>Cancelar</button>
                <button onClick={generatePieces} disabled={selectedFormats.length===0||generating}
                  style={{padding:"6px 16px",background:P,color:"#FFF",border:"none",borderRadius:"8px",fontSize:"0.8rem",fontWeight:700,cursor:"pointer"}}>
                  {generating?"Gerando...":"Gerar "+selectedFormats.length+" peça"+(selectedFormats.length!==1?"s":"")}
                </button>
              </div>
            </div>
          )}
        </div>

        {/* PEÇAS */}
        <div style={{flex:1,overflow:"auto",padding:"24px 40px"}}>
          {media.pieces.length===0?(
            <div style={{textAlign:"center",padding:"80px 0",color:"#888"}}>
              <div style={{fontSize:"2.5rem",marginBottom:"12px"}}>🖼</div>
              <p style={{fontWeight:600,color:"#111",margin:"0 0 8px"}}>Nenhuma peça ainda</p>
              <p style={{fontSize:"0.875rem",margin:"0 0 20px"}}>Clique em "Gerar peças" para criar os formatos desta mídia.</p>
              <button onClick={()=>setShowFormats(true)} style={{padding:"10px 24px",background:P,color:"#FFF",border:"none",borderRadius:"8px",fontWeight:700,cursor:"pointer",fontFamily:"'DM Sans',sans-serif"}}>Gerar peças</button>
            </div>
          ):(
            <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(220px,1fr))",gap:"16px"}}>
              {media.pieces.map(p=>{
                const [pw,ph]=(p.format||"1080x1080").split("x").map(Number);
                const ratio=ph/pw;
                return (
                  <div key={p.id} style={{border:b,borderRadius:"12px",overflow:"hidden",cursor:"pointer"}}
                    onClick={()=>router.push("/editor?pieceId="+p.id+"&format="+p.format+"&ts="+Date.now())}
                    onMouseEnter={e=>(e.currentTarget as HTMLElement).style.boxShadow="0 4px 16px rgba(0,0,0,0.1)"}
                    onMouseLeave={e=>(e.currentTarget as HTMLElement).style.boxShadow="none"}>
                    <div style={{background:"#F7F7F7",aspectRatio:pw+"/"+ph,display:"flex",alignItems:"center",justifyContent:"center",overflow:"hidden"}}>
                      {p.data&&(p.data as any).objects?
                        <canvas style={{width:"100%",height:"100%"}}/>:
                        <span style={{color:"#CCC",fontSize:"0.75rem"}}>{p.format}</span>
                      }
                    </div>
                    <div style={{padding:"12px 14px"}}>
                      <p style={{fontWeight:700,color:"#111",margin:"0 0 2px",fontSize:"0.875rem"}}>{p.name.includes("—")?p.name.split("—").slice(-1)[0].trim():p.name}</p>
                      <p style={{fontSize:"0.72rem",color:"#888",margin:"0 0 10px"}}>{p.format} · {new Date(p.createdAt).toLocaleDateString("pt-BR")}</p>
                      <div style={{display:"flex",alignItems:"center",justifyContent:"space-between"}}>
                        <span style={{fontSize:"0.72rem",color:STATUS_COLOR[p.status]||"#888",fontWeight:600}}>{STATUS_LABEL[p.status]||p.status}</span>
                        <button onClick={e=>{e.stopPropagation();deletePiece(p.id);}}
                          style={{background:"none",border:"none",cursor:"pointer",color:"#CCC",fontSize:"0.85rem"}}
                          onMouseEnter={e=>(e.currentTarget as HTMLElement).style.color="#E53935"}
                          onMouseLeave={e=>(e.currentTarget as HTMLElement).style.color="#CCC"}>🗑</button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
