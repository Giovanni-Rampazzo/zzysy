"use client";
import { useState } from "react";
import Link from "next/link";

export function PlanCard({ name, price, desc, features, featured }: {
  name: string; price: string; desc: string; features: string[]; featured: boolean;
}) {
  const [hovered, setHovered] = useState(false);
  const colors = { yellow:"#F5C400", border:"#E5E5E5", text:"#111111", surface:"#F7F7F7", textMuted:"#888" };
  const active = featured || hovered;
  return (
    <div
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{ border:`1.5px solid ${active ? colors.yellow : colors.border}`, borderRadius:"16px", padding:"28px", background: active ? "#FFFDF0" : "#fff", transition:"all 0.2s", transform: hovered && !featured ? "translateY(-4px)" : "none", boxShadow: active ? "0 8px 24px rgba(245,196,0,0.15)" : "none" }}
    >
      {featured && <div style={{ fontSize:"0.68rem", fontWeight:700, color:colors.yellow, textTransform:"uppercase", letterSpacing:"0.08em", marginBottom:"12px" }}>Mais popular</div>}
      <div style={{ fontSize:"1.1rem", fontWeight:700, marginBottom:"4px" }}>{name}</div>
      <div style={{ fontSize:"2rem", fontWeight:800, marginBottom:"4px" }}>{price}<span style={{ fontSize:"0.8rem", fontWeight:400, color:colors.textMuted }}>/mês</span></div>
      <p style={{ fontSize:"0.85rem", color:colors.textMuted, marginBottom:"20px" }}>{desc}</p>
      <hr style={{ border:"none", borderTop:`1px solid ${colors.border}`, marginBottom:"16px" }} />
      <ul style={{ listStyle:"none", padding:0, margin:"0 0 24px", display:"flex", flexDirection:"column", gap:"8px" }}>
        {features.map(f => <li key={f} style={{ fontSize:"0.875rem", display:"flex", gap:"8px" }}><span style={{ color:"#34A853" }}>✓</span>{f}</li>)}
      </ul>
      <Link href="/register" style={{ display:"block", textAlign:"center", padding:"12px", borderRadius:"8px", textDecoration:"none", fontWeight:700, fontSize:"0.875rem", background: active ? colors.text : colors.surface, color: active ? "#fff" : colors.text, border:`1.5px solid ${active ? colors.text : colors.border}`, transition:"all 0.2s" }}>Começar</Link>
    </div>
  );
}
