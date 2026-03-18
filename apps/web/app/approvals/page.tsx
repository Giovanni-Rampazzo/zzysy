"use client"
import { useEffect, useState } from "react"
import { PageShell } from "@/components/layout/PageShell"

interface Piece {
  id: string
  name: string
  format: string
  width: number
  height: number
  status: string
}

export default function ApprovalsPage() {
  const [pieces, setPieces] = useState<Piece[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch("/api/pieces").then(r => r.json()).then(d => {
      setPieces(Array.isArray(d) ? d.filter((p: Piece) => p.status === "REVIEW" || p.status === "APPROVED") : [])
      setLoading(false)
    })
  }, [])

  async function updateStatus(id: string, status: string) {
    await fetch(`/api/pieces/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
    })
    setPieces(prev => prev.map(p => p.id === id ? { ...p, status } : p))
  }

  const pending = pieces.filter(p => p.status === "REVIEW")
  const approved = pieces.filter(p => p.status === "APPROVED")

  return (
    <PageShell>
      <div style={{padding:32}}>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:32}}>
          <div>
            <h1 style={{fontSize:22,fontWeight:700,margin:0}}>Aprovação</h1>
            <p style={{fontSize:12,color:"#888",margin:"4px 0 0"}}>Peças aguardando aprovação do cliente</p>
          </div>
          <div style={{display:"flex",gap:12}}>
            <span style={{fontSize:11,fontWeight:600,padding:"6px 12px",borderRadius:20,background:"#fef9c3",color:"#ca8a04"}}>{pending.length} pendentes</span>
            <span style={{fontSize:11,fontWeight:600,padding:"6px 12px",borderRadius:20,background:"#dcfce7",color:"#16a34a"}}>{approved.length} aprovadas</span>
          </div>
        </div>

        {loading ? (
          <div style={{textAlign:"center",padding:"64px 0",color:"#888"}}>Carregando...</div>
        ) : pieces.length === 0 ? (
          <div style={{textAlign:"center",padding:"64px 0",color:"#888"}}>Nenhuma peça em aprovação</div>
        ) : (
          <div style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:20}}>
            {pieces.map(p => (
              <div key={p.id} style={{background:"white",borderRadius:10,border:"1px solid #E0E0E0",overflow:"hidden"}}>
                <div style={{height:160,background:"#F5F5F0",display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",borderBottom:"1px solid #E0E0E0"}}>
                  <div style={{fontSize:12,fontWeight:600,color:"#888"}}>{p.format}</div>
                  <div style={{fontSize:11,color:"#aaa",marginTop:4}}>{p.width}×{p.height}</div>
                </div>
                <div style={{padding:14}}>
                  <div style={{fontWeight:600,fontSize:13}}>{p.name}</div>
                  <div style={{fontSize:11,color:"#888",marginTop:4}}>{p.width}×{p.height} px</div>
                  <div style={{marginTop:10}}>
                    <span style={{fontSize:10,fontWeight:600,padding:"2px 8px",borderRadius:20,background:p.status==="APPROVED"?"#dcfce7":"#fef9c3",color:p.status==="APPROVED"?"#16a34a":"#ca8a04"}}>
                      {p.status==="APPROVED"?"Aprovada":"Pendente"}
                    </span>
                  </div>
                </div>
                <div style={{display:"flex",gap:8,padding:"12px 14px",borderTop:"1px solid #f5f5f5",background:"#fafafa"}}>
                  <button style={{padding:"4px 10px",border:"1px solid #E0E0E0",borderRadius:5,background:"white",cursor:"pointer",fontSize:11,fontWeight:600}}>👁 Ver</button>
                  {p.status === "REVIEW" && (
                    <>
                      <button onClick={() => updateStatus(p.id,"APPROVED")} style={{marginLeft:"auto",padding:"4px 10px",background:"#F5C400",border:"none",borderRadius:5,cursor:"pointer",fontSize:11,fontWeight:600}}>✓ Aprovar</button>
                      <button onClick={() => updateStatus(p.id,"DRAFT")} style={{padding:"4px 10px",border:"1px solid #E0E0E0",borderRadius:5,background:"white",cursor:"pointer",fontSize:11,fontWeight:600}}>↩</button>
                    </>
                  )}
                  {p.status === "APPROVED" && (
                    <button style={{marginLeft:"auto",padding:"4px 10px",border:"1px solid #E0E0E0",borderRadius:5,background:"white",cursor:"pointer",fontSize:11,fontWeight:600}}>↓ Download</button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </PageShell>
  )
}
