"use client"
import { useEffect, useState } from "react"
import { useParams, useRouter } from "next/navigation"
import TopNav from "@/components/TopNav"
import { NewCampaignModal } from "./NewCampaignModal"

interface Campaign {
  id: string
  name: string
  createdAt: string
  _count: { pieces: number }
}

interface Client {
  id: string
  name: string
  contact: string | null
  email: string | null
  phone: string | null
  address: string | null
  campaigns: Campaign[]
}

export default function ClientPage() {
  const { id } = useParams<{ id: string }>()
  const router = useRouter()
  const [client, setClient] = useState<Client | null>(null)
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [activeTab, setActiveTab] = useState("campaigns")

  async function load() {
    const res = await fetch(`/api/clients/${id}`)
    if (res.ok) setClient(await res.json())
    setLoading(false)
  }

  useEffect(() => { load() }, [id])

  if (loading) return <div style={{display:"flex",flexDirection:"column",height:"100vh"}}><TopNav /><div style={{padding:32,color:"#888"}}>Carregando...</div></div>
  if (!client) return <div style={{display:"flex",flexDirection:"column",height:"100vh"}}><TopNav /><div style={{padding:32,color:"#888"}}>Cliente não encontrado</div></div>

  const tabs = ["campaigns","pieces","deliveries","medias"]
  const tabLabels: Record<string,string> = {campaigns:"Campanhas",pieces:"Peças",deliveries:"Entregas",medias:"Mídias"}

  return (
    <div style={{display:"flex",flexDirection:"column",height:"100vh"}}>
      <TopNav />
      <div style={{flex:1,overflowY:"auto",padding:32,background:"#F5F5F0"}}>
        {/* Breadcrumb */}
        <div style={{display:"flex",alignItems:"center",gap:8,fontSize:11,color:"#888",marginBottom:20}}>
          <span style={{cursor:"pointer"}} onClick={() => router.push("/dashboard")}>Clientes</span>
          <span style={{color:"#ccc"}}>/</span>
          <span style={{fontWeight:600,color:"#111"}}>{client.name}</span>
        </div>

        {/* Header */}
        <div style={{background:"white",borderRadius:10,border:"1px solid #E0E0E0",padding:24,marginBottom:24}}>
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:20}}>
            <div>
              <div style={{fontSize:20,fontWeight:700}}>{client.name}</div>
              {client.address && <div style={{color:"#888",fontSize:12,marginTop:4}}>{client.address}</div>}
            </div>
            <button
              onClick={() => setShowModal(true)}
              style={{background:"#F5C400",border:"none",borderRadius:6,padding:"8px 16px",fontWeight:600,fontSize:12,cursor:"pointer"}}
            >
              + Nova Campanha
            </button>
          </div>
          <div style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:16}}>
            {[["Contato",client.contact],["E-mail",client.email],["Telefone",client.phone]].map(([l,v]) => (
              <div key={l as string}>
                <div style={{fontSize:11,color:"#888",marginBottom:2}}>{l}</div>
                <div style={{fontSize:13}}>{v ?? "—"}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Tabs */}
        <div style={{display:"flex",borderBottom:"1px solid #E0E0E0",marginBottom:24}}>
          {tabs.map(tab => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              style={{
                padding:"10px 20px",fontSize:13,fontWeight:500,cursor:"pointer",
                background:"transparent",border:"none",
                color: activeTab===tab ? "#111" : "#888",
                borderBottom: activeTab===tab ? "2px solid #F5C400" : "2px solid transparent",
                marginBottom:-1,
              }}
            >
              {tabLabels[tab]}
            </button>
          ))}
        </div>

        {activeTab === "campaigns" && (
          <div style={{background:"white",borderRadius:10,border:"1px solid #E0E0E0",overflow:"hidden"}}>
            <table style={{width:"100%",borderCollapse:"collapse"}}>
              <thead>
                <tr>
                  {["Campanha","Peças","Criada em",""].map(h => (
                    <th key={h} style={{textAlign:"left",fontSize:11,fontWeight:600,color:"#888",textTransform:"uppercase",letterSpacing:"0.5px",padding:"8px 16px",borderBottom:"1px solid #E0E0E0"}}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {client.campaigns.length === 0 ? (
                  <tr><td colSpan={4} style={{textAlign:"center",padding:"48px",color:"#888",fontSize:13}}>Nenhuma campanha criada</td></tr>
                ) : client.campaigns.map(c => (
                  <tr
                    key={c.id}
                    style={{borderBottom:"1px solid #f0f0f0",cursor:"pointer"}}
                    onClick={() => router.push(`/campaigns/${c.id}`)}
                    onMouseOver={e => (e.currentTarget.style.background="#fafafa")}
                    onMouseOut={e => (e.currentTarget.style.background="white")}
                  >
                    <td style={{padding:"12px 16px",fontWeight:600,fontSize:13}}>{c.name}</td>
                    <td style={{padding:"12px 16px",color:"#888",fontSize:13}}>{c._count.pieces}</td>
                    <td style={{padding:"12px 16px",color:"#888",fontSize:13}}>{new Date(c.createdAt).toLocaleDateString("pt-BR")}</td>
                    <td style={{padding:"12px 16px",textAlign:"right"}}>
                      <button
                        onClick={e => { e.stopPropagation(); router.push(`/campaigns/${c.id}`) }}
                        style={{fontSize:11,fontWeight:600,border:"1px solid #E0E0E0",padding:"5px 12px",borderRadius:6,background:"white",cursor:"pointer"}}
                      >
                        Abrir
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {activeTab !== "campaigns" && (
          <div style={{textAlign:"center",padding:"64px 0",color:"#888"}}>Em breve</div>
        )}
      </div>

      {showModal && (
        <NewCampaignModal
          clientId={id}
          onClose={() => setShowModal(false)}
          onCreated={campaignId => router.push(`/campaigns/${campaignId}`)}
        />
      )}
    </div>
  )
}
