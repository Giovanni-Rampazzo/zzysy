"use client";
import Link from "next/link";
import { PlanCard } from "@/components/PlanCard";
import { colors, typography, spacing, borderRadius } from "@/lib/theme";

const f = "'Inter', sans-serif";

function Logo({ size = "1.4rem" }: { size?: string }) {
  return (
    <div style={{ display:"flex",alignItems:"center",gap:"1px",fontFamily:f,fontWeight:800,fontSize:size,letterSpacing:"-0.04em",color:colors.text }}>
      ZZ
      <span style={{ display:"inline-flex",alignItems:"center",justifyContent:"center",width:size,height:size,border:`2.5px solid ${colors.text}`,borderRadius:"50%",margin:"0 1px" }}>
        <span style={{ display:"flex",gap:"1.5px" }}>
          {["#F5C400","#34A853","#4285F4"].map(c=><span key={c} style={{ width:"4px",height:"4px",borderRadius:"50%",background:c }} />)}
        </span>
      </span>
      SY
    </div>
  );
}

export default function LandingPage() {
  return (
    <div style={{ fontFamily:f,background:colors.background,color:colors.text,minHeight:"100vh" }}>

      {/* NAV */}
      <nav style={{ display:"flex",justifyContent:"space-between",alignItems:"center",padding:"20px 48px",borderBottom:`1px solid ${colors.border}`,position:"sticky",top:0,background:"rgba(255,255,255,0.95)",backdropFilter:"blur(8px)",zIndex:100 }}>
        <Logo />
        <div style={{ display:"flex",alignItems:"center",gap:"32px" }}>
          <Link href="/plans" style={{ fontSize:"0.875rem",color:colors.textMuted,textDecoration:"none",fontWeight:500 }}>Planos</Link>
          <Link href="/login" style={{ fontSize:"0.875rem",color:colors.textMuted,textDecoration:"none",fontWeight:500 }}>Entrar</Link>
          <Link href="/register" style={{ fontSize:"0.875rem",background:colors.text,color:"#fff",padding:"10px 20px",borderRadius:"8px",textDecoration:"none",fontWeight:700 }}>Comece grátis</Link>
        </div>
      </nav>

      {/* HERO */}
      <div style={{ maxWidth:"1100px",margin:"0 auto",padding:"100px 48px 80px",display:"grid",gridTemplateColumns:"1fr 1fr",gap:"80px",alignItems:"center" }}>
        <div>
          <div style={{ display:"inline-flex",alignItems:"center",gap:"8px",border:`1px solid ${colors.border}`,borderRadius:"999px",padding:"6px 14px",fontSize:"0.72rem",fontWeight:700,color:colors.textMuted,letterSpacing:"0.06em",textTransform:"uppercase" as const,marginBottom:"28px" }}>
            <span style={{ width:"6px",height:"6px",borderRadius:"50%",background:colors.green }} />
            Automação de layout para agências
          </div>
          <h1 style={{ fontSize:"3.6rem",fontWeight:700,letterSpacing:"-0.03em",lineHeight:1.1,marginBottom:"24px" }}>
            Produza centenas de peças{" "}
            <span style={{ color:colors.yellow }}>sem retrabalho.</span>
          </h1>
          <p style={{ fontSize:"1.05rem",color:colors.textMuted,lineHeight:1.7,marginBottom:"36px" }}>
            Crie uma peça matriz, defina os formatos e o ZZYSY gera todas as versões automaticamente — em qualquer tamanho, para qualquer canal.
          </p>
          <div style={{ display:"flex",gap:"12px",flexWrap:"wrap" as const }}>
            <Link href="/register" style={{ background:colors.text,color:"#fff",padding:"14px 28px",borderRadius:"10px",textDecoration:"none",fontWeight:700,fontSize:"0.95rem" }}>Comece grátis →</Link>
            <Link href="/plans" style={{ background:colors.surface,color:colors.text,padding:"14px 28px",borderRadius:"10px",textDecoration:"none",fontWeight:600,fontSize:"0.95rem",border:`1.5px solid ${colors.border}` }}>Ver planos</Link>
          </div>
        </div>

      </div>

      {/* STATS */}
      <div style={{ borderTop:`1px solid ${colors.border}`,borderBottom:`1px solid ${colors.border}`,padding:"40px 48px" }}>
        <div style={{ maxWidth:"1100px",margin:"0 auto",display:"flex" }}>
          {[["10x","mais rápido que o processo manual"],["500+","peças no plano gratuito"],["100%","no browser, sem instalar nada"],["5min","para sua primeira campanha"]].map(([n,l],i)=>(
            <div key={n} style={{ flex:1,padding:"0 40px",borderRight:i<3?`1px solid ${colors.border}`:"none",paddingLeft:i===0?"0":"40px" }}>
              <div style={{ fontSize:"2.4rem",fontWeight:800,letterSpacing:"-0.04em",marginBottom:"4px" }}>{n}</div>
              <div style={{ fontSize:"0.85rem",color:colors.textMuted }}>{l}</div>
            </div>
          ))}
        </div>
      </div>

      {/* FEATURES */}
      <div style={{ padding:"100px 48px",maxWidth:"1100px",margin:"0 auto" }}>
        <div style={{ fontSize:"0.72rem",fontWeight:700,color:colors.textMuted,textTransform:"uppercase" as const,letterSpacing:"0.08em",marginBottom:"16px" }}>Produto</div>
        <div style={{ fontSize:"2.6rem",fontWeight:700,letterSpacing:"-0.03em",lineHeight:1.1,marginBottom:"56px" }}>Tudo que sua agência<br/>precisa em um lugar só.</div>
        <div style={{ display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:"2px",background:colors.border,borderRadius:"16px",overflow:"hidden" }}>
          {[
            { icon:"🎨",title:"Editor visual",desc:"Monte sua peça matriz com texto, imagens e formas. Tudo no browser, sem instalar nada." },
            { icon:"📐",title:"Múltiplos formatos",desc:"Feed, stories, banner, OOH — defina os formatos uma vez e gere todas as versões." },
            { icon:"⚡",title:"Exportação em escala",desc:"Exporte PNG, JPG ou TIFF com layers em segundos, pronto para entrega." },
            { icon:"👥",title:"Multiusuário",desc:"Convide seu time. Cada agência tem seu espaço isolado e seguro." },
            { icon:"🔄",title:"Versionamento",desc:"Histórico de versões por peça. Volte para qualquer estado anterior." },
            { icon:"💳",title:"Planos flexíveis",desc:"Do freelancer à grande agência — escolha o plano que cresce com você." },
          ].map(({icon,title,desc})=>(
            <div key={title} style={{ background:colors.background,padding:"36px 32px" }}>
              <div style={{ fontSize:"1.6rem",marginBottom:"16px" }}>{icon}</div>
              <div style={{ fontSize:"1rem",fontWeight:700,marginBottom:"8px" }}>{title}</div>
              <div style={{ fontSize:"0.875rem",color:colors.textMuted,lineHeight:1.6 }}>{desc}</div>
            </div>
          ))}
        </div>
      </div>

      {/* COMO FUNCIONA */}
      <div style={{ background:colors.surface,padding:"100px 48px" }}>
        <div style={{ maxWidth:"1100px",margin:"0 auto" }}>
          <div style={{ fontSize:"0.72rem",fontWeight:700,color:colors.textMuted,textTransform:"uppercase" as const,letterSpacing:"0.08em",marginBottom:"16px" }}>Como funciona</div>
          <div style={{ fontSize:"2.6rem",fontWeight:700,letterSpacing:"-0.03em",lineHeight:1.1,marginBottom:"56px" }}>Três passos para<br/>produzir em escala.</div>
          <div style={{ display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:"48px" }}>
            {[
              { n:"01",title:"Crie a peça matriz",desc:"Desenhe o layout principal no editor visual. Defina textos, imagens e elementos uma única vez." },
              { n:"02",title:"Defina os formatos",desc:"Selecione os formatos que sua campanha precisa: feed, stories, banners, OOH e muito mais." },
              { n:"03",title:"Exporte tudo",desc:"O ZZYSY adapta automaticamente cada elemento para cada formato e exporta todos os arquivos." },
            ].map(({n,title,desc})=>(
              <div key={n}>
                <div style={{ fontSize:"0.72rem",fontWeight:700,color:colors.textMuted,letterSpacing:"0.06em",marginBottom:"16px" }}>{n} —</div>
                <div style={{ fontSize:"1.2rem",fontWeight:700,marginBottom:"10px" }}>{title}</div>
                <div style={{ fontSize:"0.875rem",color:colors.textMuted,lineHeight:1.6 }}>{desc}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* PLANOS */}
      <div style={{ padding:"100px 48px",maxWidth:"1100px",margin:"0 auto" }}>
        <div style={{ fontSize:"0.72rem",fontWeight:700,color:colors.textMuted,textTransform:"uppercase" as const,letterSpacing:"0.08em",marginBottom:"16px" }}>Preços</div>
        <div style={{ fontSize:"2.6rem",fontWeight:700,letterSpacing:"-0.03em",marginBottom:"56px" }}>Simples e transparente.</div>
        <div style={{ display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:"16px" }}>
          {[
            { name:"Free",price:"R$ 0",desc:"Para experimentar a plataforma.",features:["1 campanha","500 peças/mês","Exportação PNG/JPG"],featured:false },
            { name:"Starter",price:"R$ 19",desc:"Para freelancers e pequenas equipes.",features:["4 campanhas","2.000 peças/mês","Exportação PNG/JPG/TIFF"],featured:true },
            { name:"Pro",price:"R$ 89",desc:"Para agências em crescimento.",features:["10 campanhas","5.000 peças/mês","Exportação com layers","Histórico de versões"],featured:false },
            { name:"Agency",price:"R$ 399",desc:"Para grandes operações criativas.",features:["Campanhas ilimitadas","Peças ilimitadas","Até 10 usuários","Suporte dedicado"],featured:false },
          ].map(({name,price,desc,features,featured})=>(
            <PlanCard key={name} name={name} price={price} desc={desc} features={features} featured={featured} />
          ))}
        </div>
      </div>

      {/* CTA FINAL */}
      <div style={{ padding:"100px 48px",textAlign:"center" as const,borderTop:`1px solid ${colors.border}` }}>
        <h2 style={{ fontSize:"3rem",fontWeight:700,letterSpacing:"-0.03em",marginBottom:"16px",lineHeight:1.1 }}>Pronto para produzir<br/>sem retrabalho?</h2>
        <p style={{ color:colors.textMuted,fontSize:"1.05rem",marginBottom:"40px" }}>Crie sua conta gratuitamente. Sem cartão de crédito.</p>
        <Link href="/register" style={{ display:"inline-block",background:colors.text,color:"#fff",padding:"16px 36px",borderRadius:"10px",textDecoration:"none",fontWeight:700,fontSize:"1rem" }}>Criar conta grátis →</Link>
      </div>

      {/* FOOTER */}
      <footer style={{ borderTop:`1px solid ${colors.border}`,padding:"32px 48px",display:"flex",justifyContent:"space-between",alignItems:"center",flexWrap:"wrap" as const,gap:"16px" }}>
        <Logo size="1.2rem" />
        <div style={{ display:"flex",gap:"24px" }}>
          {[["Planos","/plans"],["Entrar","/login"],["Cadastro","/register"]].map(([l,h])=>(
            <Link key={l} href={h} style={{ fontSize:"0.85rem",color:colors.textMuted,textDecoration:"none" }}>{l}</Link>
          ))}
        </div>
        <div style={{ fontSize:"0.8rem",color:colors.textMuted }}>© 2026 ZZYSY. Todos os direitos reservados.</div>
      </footer>

    </div>
  );
}
