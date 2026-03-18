"use client"
import { useEffect, useState } from "react"
import { useParams, useRouter } from "next/navigation"
import { PageShell } from "@/components/layout/PageShell"

interface DeliveryFile { id: string; name: string; extension: string; size: number; url: string }
interface Delivery {
  id: string; number: number; status: string; totalSize: number | null; createdAt: string
  campaign: { id: string; name: string; client: { name: string } }
  files: DeliveryFile[]
  pieces: { id: string; name: string }[]
}

function formatSize(bytes: number) {
  if (bytes > 1024*1024) return `${(bytes/1024/1024).toFixed(1)} MB`
  return `${(bytes/1024).toFixed(0)} KB`
}

export default function DeliveryDetailPage() {
  const { id } = useParams<{ id: string }>()
  const router = useRouter()
  const [delivery, setDelivery] = useState<Delivery | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch(`/api/deliveries/${id}`).then(r => r.json()).then(d => { setDelivery(d); setLoading(false) })
  }, [id])

  if (loading) return <PageShell><div style={{padding:32,color:"#888"}}>Carregando...</div></PageShell>
  if (!delivery) return <PageShell><div style={{padding:32,color:"#888"}}>Entrega não encontrada</div></PageShell>

  return (
    <PageShell>
      <div style={{padding:32}}>
        <div style={{display:"flex",alignItems:"center",gap:8,fontSize:11,color:"#888",marginBottom:20}}>
          <span style={{cursor:"pointer"}} onClick={() => router.push("/deliveries")}>Entregas</span>
          <span style={{color:"#ccc"}}>/</span>
          <span style={{fontWeight:600,color:"#111"}}>{delivery.campaign.name}</span>
        </div>

        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:32}}>
          <div>
            <h1 style={{fontSize:22,fontWeight:700,margin:0}}>{delivery.campaign.name}</h1>
            <p style={{fontSize:12,color:"#888",margin:"4px 0 0"}}>Entregue em {new Date(delivery.createdAt).toLocaleDateString("pt-BR")}</p>
          </div>
          <button style={{padding:"8px 16px",background:"#F5C400",border:"none",borderRadius:6,fontWeight:600,fontSize:12,cursor:"pointer"}}>↓ Download ZIP</button>
        </div>

        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:24,alignItems:"start"}}>
          <div style={{background:"white",borderRadius:10,border:"1px solid #E0E0E0",padding:24}}>
            <div style={{fontSize:11,fontWeight:700,textTransform:"uppercase",letterSpacing:"0.8px",color:"#888",marginBottom:16}}>Resumo</div>
            <table style={{width:"100%"}}>
              <tbody>
                {[["Campanha",delivery.campaign.name],["Cliente",delivery.campaign.client.name],["Arquivos",delivery.files.length],["Peso",delivery.totalSize?formatSize(delivery.totalSize):"—"],["Data",new Date(delivery.createdAt).toLocaleDateString("pt-BR")]].map(([l,v]) => (
                  <tr key={l as string}>
                    <td style={{padding:"6px 0",fontSize:12,color:"#888",width:120}}>{l}</td>
                    <td style={{padding:"6px 0",fontSize:13,fontWeight:500}}>{v}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div style={{background:"white",borderRadius:10,border:"1px solid #E0E0E0",overflow:"hidden"}}>
            <div style={{padding:"12px 16px",borderBottom:"1px solid #E0E0E0"}}>
              <span style={{fontSize:11,fontWeight:700,textTransform:"uppercase",letterSpacing:"0.8px",color:"#888"}}>Arquivos</span>
            </div>
            <table style={{width:"100%",borderCollapse:"collapse"}}>
              <thead>
                <tr>
                  {["Nome","Ext.","Peso",""].map(h => (
                    <th key={h} style={{textAlign:"left",fontSize:11,fontWeight:600,color:"#888",textTransform:"uppercase",padding:"6px 16px",borderBottom:"1px solid #E0E0E0"}}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {delivery.files.length === 0 ? (
                  <tr><td colSpan={4} style={{textAlign:"center",padding:32,color:"#888",fontSize:13}}>Nenhum arquivo</td></tr>
                ) : delivery.files.map(f => (
                  <tr key={f.id} style={{borderBottom:"1px solid #f0f0f0"}}>
                    <td style={{padding:"8px 16px",fontSize:12,maxWidth:180,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{f.name}</td>
                    <td style={{padding:"8px 16px"}}><span style={{fontSize:10,padding:"2px 6px",background:"#f1f1f1",borderRadius:10,fontWeight:600}}>{f.extension.toUpperCase()}</span></td>
                    <td style={{padding:"8px 16px",fontSize:12,color:"#888"}}>{formatSize(f.size)}</td>
                    <td style={{padding:"8px 16px",textAlign:"right"}}><button style={{fontSize:11,fontWeight:600,border:"1px solid #E0E0E0",padding:"4px 8px",borderRadius:5,background:"white",cursor:"pointer"}}>↓</button></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </PageShell>
  )
}
