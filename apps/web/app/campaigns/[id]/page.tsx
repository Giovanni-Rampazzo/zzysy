"use client"
import { useEffect, useState, useRef } from "react"
import { useParams, useRouter } from "next/navigation"
import TopNav from "@/components/TopNav"

const IMAGE_TYPES = ["IMAGE"]

interface Asset {
  id: string; type: string; label: string; value: string | null; imageUrl: string | null; order: number
}
interface Campaign {
  id: string; name: string; client: { id: string; name: string }; assets: Asset[]
}

export default function CampaignPage() {
  const { id } = useParams<{ id: string }>()
  const router = useRouter()
  const [campaign, setCampaign] = useState<Campaign | null>(null)
  const [loading, setLoading] = useState(true)
  const [values, setValues] = useState<Record<string,string>>({})
  const [savingFields, setSavingFields] = useState<Record<string,boolean>>({})
  const [uploadingId, setUploadingId] = useState<string | null>(null)
  const [showAdd, setShowAdd] = useState(false)
  const timers = useRef<Record<string,any>>({})
  const fileInputRef = useRef<HTMLInputElement>(null)
  const uploadingAssetId = useRef<string>("")

  async function load() {
    const res = await fetch(`/api/campaigns/${id}`)
    if (res.ok) {
      const data = await res.json()
      setCampaign(data)
      const init: Record<string,string> = {}
      for (const a of (data.assets ?? [])) init[a.id] = a.value ?? ""
      setValues(init)
    }
    setLoading(false)
  }

  useEffect(() => { load() }, [id])

  function handleTextChange(assetId: string, val: string) {
    setValues(prev => ({ ...prev, [assetId]: val }))
    clearTimeout(timers.current[assetId])
    timers.current[assetId] = setTimeout(async () => {
      setSavingFields(prev => ({ ...prev, [assetId]: true }))
      await fetch(`/api/campaigns/${id}/assets/${assetId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ value: val }),
      })
      setSavingFields(prev => ({ ...prev, [assetId]: false }))
    }, 1000)
  }

  function openUpload(assetId: string) {
    uploadingAssetId.current = assetId
    fileInputRef.current?.click()
  }

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    const assetId = uploadingAssetId.current
    setUploadingId(assetId)

    const formData = new FormData()
    formData.append("file", file)

    const res = await fetch("/api/upload", { method: "POST", body: formData })
    const data = await res.json()

    if (data.url) {
      await fetch(`/api/campaigns/${id}/assets/${assetId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ imageUrl: data.url }),
      })
      setCampaign(prev => prev ? {
        ...prev,
        assets: prev.assets.map(a => a.id === assetId ? { ...a, imageUrl: data.url } : a)
      } : prev)
    }

    setUploadingId(null)
    if (fileInputRef.current) fileInputRef.current.value = ""
  }

  async function addField(type: string) {
    const label = type === "CUSTOM_TEXT" ? "Texto personalizado" : "Imagem personalizada"
    const res = await fetch(`/api/campaigns/${id}/assets`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ type, label }),
    })
    const asset = await res.json()
    setCampaign(prev => prev ? { ...prev, assets: [...prev.assets, asset] } : prev)
    setValues(prev => ({ ...prev, [asset.id]: "" }))
    setShowAdd(false)
  }

  async function deleteAsset(assetId: string) {
    await fetch(`/api/campaigns/${id}/assets/${assetId}`, { method: "DELETE" })
    setCampaign(prev => prev ? { ...prev, assets: prev.assets.filter(a => a.id !== assetId) } : prev)
    setValues(prev => { const n = {...prev}; delete n[assetId]; return n })
  }

  if (loading) return <div style={{display:"flex",flexDirection:"column",height:"100vh"}}><TopNav /><div style={{padding:32,color:"#888"}}>Carregando...</div></div>
  if (!campaign) return <div style={{display:"flex",flexDirection:"column",height:"100vh"}}><TopNav /><div style={{padding:32,color:"#888"}}>Campanha não encontrada</div></div>

  const textAssets = campaign.assets.filter(a => TEXT_TYPES.includes(a.type))
  const imageAssets = campaign.assets.filter(a => IMAGE_TYPES.includes(a.type))
  const inp = {width:"100%",padding:"8px 12px",border:"1px solid #E0E0E0",borderRadius:6,fontSize:13,outline:"none",fontFamily:"inherit"} as React.CSSProperties

  return (
    <div style={{display:"flex",flexDirection:"column",height:"100vh"}}>
      <TopNav />
      {/* Input de arquivo oculto */}
      <input ref={fileInputRef} type="file" accept="image/*" style={{display:"none"}} onChange={handleFileChange}/>

      <div style={{flex:1,overflowY:"auto",padding:32,background:"#F5F5F0"}}>
        {/* Breadcrumb */}
        <div style={{display:"flex",alignItems:"center",gap:8,fontSize:11,color:"#888",marginBottom:20}}>
          <span style={{cursor:"pointer"}} onClick={() => router.push("/dashboard")}>Clientes</span>
          <span style={{color:"#ccc"}}>/</span>
          <span style={{cursor:"pointer"}} onClick={() => router.push(`/clients/${campaign.client.id}`)}>{campaign.client.name}</span>
          <span style={{color:"#ccc"}}>/</span>
          <span style={{fontWeight:600,color:"#111"}}>{campaign.name}</span>
        </div>

        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:32}}>
          <div>
            <h1 style={{fontSize:22,fontWeight:700,margin:0}}>{campaign.name}</h1>
            <p style={{fontSize:12,color:"#888",margin:"4px 0 0"}}>Assets — <span style={{color:"#16a34a"}}>salvo automaticamente</span></p>
          </div>
          <div style={{display:"flex",gap:8,alignItems:"center"}}>
            <PsdImporter campaignId={id} onImported={load} />
            <button
              onClick={() => router.push(`/editor?campaignId=${id}`)}
              style={{background:"#F5C400",border:"none",borderRadius:6,padding:"10px 24px",fontWeight:700,fontSize:14,cursor:"pointer"}}
            >
              ▶ Abrir Editor
            </button>
          </div>
        </div>

        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:24}}>
          {/* Texto */}
          <div style={{background:"white",borderRadius:10,border:"1px solid #E0E0E0",padding:24}}>
            <div style={{fontSize:11,fontWeight:700,textTransform:"uppercase",letterSpacing:"0.8px",color:"#888",marginBottom:20}}>Campos de Texto</div>
            <div style={{display:"flex",flexDirection:"column",gap:16}}>
              {textAssets.map(asset => (
                <div key={asset.id}>
                  <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:6}}>
                    <label style={{fontSize:11,fontWeight:600,textTransform:"uppercase" as const,letterSpacing:"0.5px",color:"#888"}}>{asset.label}</label>
                    <div style={{display:"flex",alignItems:"center",gap:6}}>
                      {savingFields[asset.id] && <span style={{fontSize:10,color:"#888"}}>Salvando...</span>}
                      {!TEXT_TYPES.slice(0,5).includes(asset.type) && (
                        <button onClick={() => deleteAsset(asset.id)} style={{fontSize:10,border:"none",background:"#f0f0f0",color:"#666",padding:"2px 6px",borderRadius:4,cursor:"pointer"}}>✕</button>
                      )}
                    </div>
                  </div>
                  {asset.type === "TEXTO" ? (
                    <textarea value={values[asset.id]??""} onChange={e=>handleTextChange(asset.id,e.target.value)} rows={3} placeholder={`Digite o ${asset.label.toLowerCase()}...`} style={{...inp,resize:"none"}}/>
                  ) : (
                    <input value={values[asset.id]??""} onChange={e=>handleTextChange(asset.id,e.target.value)} placeholder={`Digite o ${asset.label.toLowerCase()}...`} style={inp}/>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Imagens */}
          <div style={{display:"flex",flexDirection:"column",gap:16}}>
            <div style={{background:"white",borderRadius:10,border:"1px solid #E0E0E0",padding:24}}>
              <div style={{fontSize:11,fontWeight:700,textTransform:"uppercase",letterSpacing:"0.8px",color:"#888",marginBottom:20}}>Imagens</div>
              <div style={{display:"flex",flexDirection:"column",gap:10}}>
                {imageAssets.map(asset => (
                  <div key={asset.id} style={{background:"#F5F5F0",border:"1px dashed #E0E0E0",borderRadius:8,padding:"12px 14px",display:"flex",alignItems:"center",gap:12}}>
                    <div style={{width:48,height:48,background:"#ddd",borderRadius:6,overflow:"hidden",flexShrink:0,display:"flex",alignItems:"center",justifyContent:"center",fontSize:20}}>
                      {asset.imageUrl ? (
                        <img src={asset.imageUrl} alt="" style={{width:"100%",height:"100%",objectFit:"cover"}}/>
                      ) : (ICONS[asset.type]??"🖼")}
                    </div>
                    <div style={{flex:1,minWidth:0}}>
                      <div style={{fontWeight:600,fontSize:13}}>{asset.label}</div>
                      <div style={{fontSize:11,color:"#888",overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>
                        {asset.imageUrl ? "Imagem carregada ✓" : "Nenhuma imagem"}
                      </div>
                    </div>
                    <div style={{display:"flex",gap:6}}>
                      <button
                        onClick={() => openUpload(asset.id)}
                        disabled={uploadingId === asset.id}
                        style={{fontSize:11,fontWeight:600,border:"1px solid #E0E0E0",padding:"5px 10px",borderRadius:5,background:"white",cursor:"pointer",opacity:uploadingId===asset.id?0.5:1}}
                      >
                        {uploadingId === asset.id ? "..." : "📁 Upload"}
                      </button>
                      {!["LOGOMARCA","PERSONA","PRODUTO","FUNDO"].includes(asset.type) && (
                        <button onClick={() => deleteAsset(asset.id)} style={{fontSize:11,border:"none",padding:"5px 8px",borderRadius:5,background:"#f0f0f0",color:"#666",cursor:"pointer"}}>✕</button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div style={{position:"relative"}}>
              <button onClick={()=>setShowAdd(!showAdd)} style={{width:"100%",padding:"8px 16px",border:"1px solid #E0E0E0",borderRadius:6,background:"white",cursor:"pointer",fontSize:12,fontWeight:600}}>
                + Adicionar campo
              </button>
              {showAdd && (
                <div style={{position:"absolute",top:"100%",marginTop:4,left:0,right:0,background:"white",borderRadius:8,border:"1px solid #E0E0E0",boxShadow:"0 4px 12px rgba(0,0,0,0.1)",zIndex:10,overflow:"hidden"}}>
                  {[["CUSTOM_TEXT","📝 Campo de texto"],["CUSTOM_IMAGE","📎 Campo de imagem"]].map(([type,label])=>(
                    <button key={type} onClick={()=>addField(type)} style={{width:"100%",textAlign:"left",padding:"10px 16px",fontSize:13,background:"transparent",border:"none",borderBottom:"1px solid #f0f0f0",cursor:"pointer",display:"block"}}>{label}</button>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
