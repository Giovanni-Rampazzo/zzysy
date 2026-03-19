"use client"
import { Suspense } from "react"
import { useSearchParams } from "next/navigation"
import dynamic from "next/dynamic"

const KeyVisionEditor = dynamic(
  () => import("@/components/editor/KeyVisionEditor").then(m => m.KeyVisionEditor),
  { ssr: false, loading: () => (
    <div style={{display:"flex",alignItems:"center",justifyContent:"center",height:"100vh",background:"#2a2a2a",color:"#888",fontSize:14}}>
      Carregando editor...
    </div>
  )}
)

function EditorContent() {
  const searchParams = useSearchParams()
  const campaignId = searchParams.get("campaignId") ?? ""
  if (!campaignId) return (
    <div style={{display:"flex",alignItems:"center",justifyContent:"center",height:"100vh",background:"#111",color:"white"}}>
      Campaign ID não encontrado
    </div>
  )
  return <KeyVisionEditor campaignId={campaignId} />
}

export default function EditorPage() {
  return <Suspense><EditorContent /></Suspense>
}
