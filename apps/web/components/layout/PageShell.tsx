"use client"
import { TopNav } from "./TopNav"

export function PageShell({ children }: { children: React.ReactNode }) {
  return (
    <div style={{display:"flex",flexDirection:"column",height:"100vh",overflow:"hidden"}}>
      <TopNav />
      <main style={{flex:1,overflowY:"auto",background:"#F5F5F0"}}>
        {children}
      </main>
    </div>
  )
}
