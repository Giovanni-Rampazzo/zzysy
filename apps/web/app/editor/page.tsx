"use client"
import { Suspense } from "react"
import { useSearchParams } from "next/navigation"
import { KeyVisionEditor } from "@/components/editor/KeyVisionEditor"

function EditorContent() {
  const searchParams = useSearchParams()
  const campaignId = searchParams.get("campaignId") ?? ""
  if (!campaignId) return <div className="flex items-center justify-center h-screen bg-[#111111] text-white">Campaign ID não encontrado</div>
  return <KeyVisionEditor campaignId={campaignId} />
}

export default function EditorPage() {
  return <Suspense><EditorContent /></Suspense>
}
