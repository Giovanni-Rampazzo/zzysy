"use client";
import { useState, useEffect, useRef } from "react";
import { useRouter, useParams } from "next/navigation";
import { Sidebar } from "@/components/Sidebar";

type FieldType = "TITULO"|"SUBTITULO"|"TEXTO"|"CTA"|"IMAGEM"|"LOGOMARCA";
type Field = { id: string; type: FieldType; label: string; value?: string; imageUrl?: string; layerId?: string; order: number; };

const TYPE_ICON: Record<FieldType, string> = {
  TITULO: "T", SUBTITULO: "T", TEXTO: "¶", CTA: "→", IMAGEM: "🖼", LOGOMARCA: "◎"
};
const TYPE_LABEL: Record<FieldType, string> = {
  TITULO: "Título", SUBTITULO: "Subtítulo", TEXTO: "Texto corrido", CTA: "CTA", IMAGEM: "Imagem", LOGOMARCA: "Logomarca"
};
const IS_IMAGE = (t: FieldType) => t === "IMAGEM" || t === "LOGOMARCA";
const IS_MULTILINE = (t: FieldType) => t === "TEXTO";

export default function CampaignItemsPage() {
  const router = useRouter();
  const params = useParams();
  const campaignId = params.id as string;

  const [fields, setFields] = useState<Field[]>([]);
  const [campaignName, setCampaignName] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  const [pieces, setPieces] = useState<any[]>([]);
  const [applying, setApplying] = useState(false);
  const fileRefs = useRef<Record<string, HTMLInputElement | null>>({});

  useEffect(() => {
    if (!campaignId) return;
    fetch(`/api/campaigns/${campaignId}/fields`)
      .then(r => r.json())
      .then(data => {
        if (Array.isArray(data)) setFields(data);
        else setFields([]);
        setLoading(false);
      })
      .catch(() => setLoading(false));
    fetch("/api/campaigns").then(r => r.json()).then(list => {
      const c = Array.isArray(list) ? list.find((x: any) => x.id === campaignId) : null;
      if (c) setCampaignName(c.name);
    });
    fetch(`/api/pieces?campaignId=${campaignId}`).then(r => r.json()).then(data => {
      if (Array.isArray(data)) setPieces(data);
    });
  }, [campaignId]);


  const update = (id: string, patch: Partial<Field>) =>
    setFields(prev => prev.map(f => f.id === id ? { ...f, ...patch } : f));

  const handleImageUpload = async (fieldId: string, file: File) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const dataUrl = e.target?.result as string;
      update(fieldId, { imageUrl: dataUrl });
    };
    reader.readAsDataURL(file);
  };

  const save = async () => {
    setSaving(true);
    await fetch(`/api/campaigns/${campaignId}/fields`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ fields: fields.map(f => ({ id: f.id, value: f.value, imageUrl: f.imageUrl })) })
    });
    setSaved(true);
    setSaving(false);
    setTimeout(() => setSaved(false), 2000);
  };

  const applyToAllPieces = async () => {
    setApplying(true);

    const textFields = fields.filter(f => !IS_IMAGE(f.type) && f.value);
    const imageFields = fields.filter(f => IS_IMAGE(f.type) && f.imageUrl);

    if (textFields.length === 0 && imageFields.length === 0) {
      setApplying(false);
      setShowPreview(false);
      return;
    }

    const draftPieces = pieces.filter(p => p.status === "DRAFT");

    // Usar Fabric no browser para trocar só o texto — preserva styles/formatação
    const { Canvas } = await import("fabric");

    await Promise.all(draftPieces.map(async (p: any) => {
      if (!p.data || Object.keys(p.data).length === 0) return;

      // Criar canvas temporário invisível
      const el = document.createElement("canvas");
      el.width = p.data.width || 1080;
      el.height = p.data.height || 1080;
      el.style.display = "none";
      document.body.appendChild(el);

      const fc = new Canvas(el);
      await new Promise<void>(res => {
        fc.loadFromJSON(p.data, () => { fc.renderAll(); res(); });
      });

      // Trocar texto nos objetos na ordem — só o texto, Fabric preserva tudo
      let tIdx = 0, iIdx = 0;
      fc.getObjects().forEach((obj: any) => {
        const isText = obj.type === "i-text" || obj.type === "text" || obj.type === "IText";
        const isImage = obj.type === "image";
        if (isText && tIdx < textFields.length) {
          const f = textFields[tIdx++];
          // set via Fabric API — preserva lineHeight, charSpacing, textAlign, etc
          obj.set("text", f.value || "");
        }
        if (isImage && iIdx < imageFields.length) {
          // imagens: apenas atualizar src no JSON diretamente
          iIdx++;
        }
      });

      fc.renderAll();
      const updatedJson = fc.toJSON();
      fc.dispose();
      document.body.removeChild(el);

      // Para imagens: atualizar src no JSON serializado
      let iIdx2 = 0;
      updatedJson.objects = updatedJson.objects.map((obj: any) => {
        if ((obj.type === "image") && iIdx2 < imageFields.length) {
          const f = imageFields[iIdx2++];
          return { ...obj, src: f.imageUrl, _element: undefined };
        }
        return obj;
      });

      return fetch(`/api/pieces/${p.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ data: updatedJson })
      });
    }));

    setApplying(false);
    setShowPreview(false);
    router.push(`/pieces?campaignId=${campaignId}`);
  };

  const addCustomField = async (type: FieldType) => {
    const res = await fetch(`/api/campaigns/${campaignId}/fields`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ type, label: TYPE_LABEL[type] })
    });
    const newField = await res.json();
    if (newField.id) setFields(prev => [...prev, newField]);
  };

  const scaleJson = (json: any, origW: number, origH: number, newW: number, newH: number) => {
    const factor = Math.min(newW / origW, newH / origH);
    const offsetX = (newW - origW * factor) / 2;
    const offsetY = (newH - origH * factor) / 2;
    const scaled = JSON.parse(JSON.stringify(json));
    scaled.width = newW; scaled.height = newH;
    scaled.objects = (scaled.objects || []).map((obj: any) => ({
      ...obj,
      left: (obj.left || 0) * factor + offsetX,
      top: (obj.top || 0) * factor + offsetY,
      scaleX: (obj.scaleX || 1) * factor,
      scaleY: (obj.scaleY || 1) * factor,
      fontSize: obj.fontSize ? Math.round(obj.fontSize * factor) : undefined,
    }));
    return scaled;
  };

  if (loading) return (
    <div style={{ display: "flex", height: "100vh" }}>
      <Sidebar active="/campaigns" />
      <div style={{ marginLeft: "220px", flex: 1, display: "flex", alignItems: "center", justifyContent: "center", color: "#888", fontFamily: "DM Sans, sans-serif" }}>Carregando...</div>
    </div>
  );

  return (
    <div style={{ display: "flex", height: "100vh", background: "#FAFAFA", fontFamily: "DM Sans, sans-serif" }}>
      <Sidebar active="/campaigns" />

      <div style={{ marginLeft: "var(--sidebar-w, 220px)", flex: 1, display: "flex", flexDirection: "column", overflow: "hidden" }}>
        {/* Header */}
        <div style={{ padding: "28px 40px 20px", borderBottom: "1px solid #E5E5E5", background: "#FFF", flexShrink: 0 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <div>
              <button onClick={() => router.back()} style={{ background: "none", border: "none", cursor: "pointer", color: "#888", fontSize: "0.85rem", fontWeight: 600, padding: 0, marginBottom: "8px" }}>← Voltar</button>
              <h1 style={{ fontSize: "1.5rem", fontWeight: 900, color: "#111", margin: 0, letterSpacing: "-0.03em" }}>Itens da Campanha</h1>
              <p style={{ color: "#888", fontSize: "0.875rem", margin: "4px 0 0" }}>{campaignName}</p>
            </div>
            <div style={{ display: "flex", gap: "10px" }}>
              <button onClick={save} disabled={saving}
                style={{ padding: "10px 24px", background: saving ? "#888" : saved ? "#34A853" : "#111", color: "#FFF", border: "none", borderRadius: "8px", fontSize: "0.875rem", fontWeight: 700, cursor: "pointer" }}>
                {saving ? "Salvando..." : saved ? "✓ Salvo" : "Salvar"}
              </button>
              <button onClick={() => { save(); setShowPreview(true); }}
                style={{ padding: "10px 24px", background: "#F5C400", color: "#111", border: "none", borderRadius: "8px", fontSize: "0.875rem", fontWeight: 700, cursor: "pointer" }}>
                Aplicar nas Peças →
              </button>
            </div>
          </div>
        </div>

        {/* Fields */}
        <div style={{ flex: 1, overflow: "auto", padding: "32px 40px" }}>
          <div style={{ maxWidth: "720px", display: "flex", flexDirection: "column", gap: "20px" }}>
            {fields.map(field => (
              <div key={field.id} style={{ background: "#FFF", border: "1.5px solid #E5E5E5", borderRadius: "12px", padding: "20px 24px" }}>
                <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "12px" }}>
                  <span style={{ width: "28px", height: "28px", background: "#F0F0F0", borderRadius: "6px", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "0.85rem", fontWeight: 700, color: "#555" }}>
                    {TYPE_ICON[field.type]}
                  </span>
                  <span style={{ fontSize: "0.8rem", fontWeight: 700, color: "#888", textTransform: "uppercase", letterSpacing: "0.06em" }}>
                    {TYPE_LABEL[field.type]}
                  </span>
                </div>

                {IS_IMAGE(field.type) ? (
                  <div>
                    <input ref={el => { fileRefs.current[field.id] = el; }} type="file" accept="image/*" style={{ display: "none" }}
                      onChange={e => { const f = e.target.files?.[0]; if (f) handleImageUpload(field.id, f); }} />
                    {field.imageUrl ? (
                      <div style={{ position: "relative", display: "inline-block" }}>
                        <img src={field.imageUrl} alt="" style={{ maxWidth: "100%", maxHeight: "200px", borderRadius: "8px", border: "1px solid #E5E5E5", display: "block" }} />
                        <button onClick={() => update(field.id, { imageUrl: undefined })}
                          style={{ position: "absolute", top: "6px", right: "6px", background: "rgba(0,0,0,0.6)", color: "#FFF", border: "none", borderRadius: "6px", padding: "4px 8px", cursor: "pointer", fontSize: "0.75rem" }}>
                          ✕ Remover
                        </button>
                      </div>
                    ) : (
                      <button onClick={() => fileRefs.current[field.id]?.click()}
                        style={{ width: "100%", padding: "32px", border: "2px dashed #E5E5E5", borderRadius: "8px", background: "#FAFAFA", cursor: "pointer", color: "#888", fontSize: "0.875rem", fontWeight: 600 }}>
                        + Clique para fazer upload
                      </button>
                    )}
                  </div>
                ) : IS_MULTILINE(field.type) ? (
                  <textarea
                    value={field.value || ""}
                    onChange={e => update(field.id, { value: e.target.value })}
                    placeholder={`Digite o ${TYPE_LABEL[field.type].toLowerCase()}...`}
                    rows={4}
                    style={{ width: "100%", padding: "10px 14px", border: "1.5px solid #E5E5E5", borderRadius: "8px", fontSize: "0.95rem", fontFamily: "DM Sans, sans-serif", outline: "none", resize: "vertical", boxSizing: "border-box" }}
                    onFocus={e => e.target.style.borderColor = "#111"}
                    onBlur={e => e.target.style.borderColor = "#E5E5E5"}
                  />
                ) : (
                  <input
                    type="text"
                    value={field.value || ""}
                    onChange={e => update(field.id, { value: e.target.value })}
                    placeholder={`Digite o ${TYPE_LABEL[field.type].toLowerCase()}...`}
                    style={{ width: "100%", padding: "10px 14px", border: "1.5px solid #E5E5E5", borderRadius: "8px", fontSize: "0.95rem", fontFamily: "DM Sans, sans-serif", outline: "none", boxSizing: "border-box" }}
                    onFocus={e => e.target.style.borderColor = "#111"}
                    onBlur={e => e.target.style.borderColor = "#E5E5E5"}
                  />
                )}
              </div>
            ))}
          {/* Adicionar campo */}
          <div style={{ maxWidth: "720px", display: "flex", gap: "10px", paddingTop: "8px" }}>
            <button onClick={() => addCustomField("TEXTO")}
              style={{ padding: "8px 16px", background: "#FFF", border: "1.5px dashed #E5E5E5", borderRadius: "8px", fontSize: "0.8rem", fontWeight: 600, cursor: "pointer", color: "#888" }}>
              + Texto
            </button>
            <button onClick={() => addCustomField("IMAGEM")}
              style={{ padding: "8px 16px", background: "#FFF", border: "1.5px dashed #E5E5E5", borderRadius: "8px", fontSize: "0.8rem", fontWeight: 600, cursor: "pointer", color: "#888" }}>
              + Imagem
            </button>
          </div>
          </div>
        </div>
      </div>

      {/* Modal de confirmação */}
      {showPreview && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000 }}>
          <div style={{ background: "#FFF", borderRadius: "16px", padding: "32px", width: "480px", fontFamily: "DM Sans, sans-serif", boxShadow: "0 16px 48px rgba(0,0,0,0.2)" }}>
            <h2 style={{ fontSize: "1.2rem", fontWeight: 800, color: "#111", margin: "0 0 8px" }}>Aplicar nas Peças</h2>
            <p style={{ color: "#666", fontSize: "0.875rem", marginBottom: "20px", lineHeight: 1.6 }}>
              Os campos serão aplicados em <strong>{pieces.filter(p => p.status === "DRAFT").length} peças</strong> com status <strong>Rascunho</strong>. Peças aprovadas ou em revisão não serão alteradas.
            </p>
            <div style={{ background: "#F7F7F7", borderRadius: "8px", padding: "16px", marginBottom: "24px" }}>
              {fields.filter(f => f.value || f.imageUrl).map(f => (
                <div key={f.id} style={{ display: "flex", gap: "10px", marginBottom: "8px", fontSize: "0.85rem" }}>
                  <span style={{ color: "#888", minWidth: "90px" }}>{TYPE_LABEL[f.type]}:</span>
                  {IS_IMAGE(f.type)
                    ? <img src={f.imageUrl} alt="" style={{ height: "40px", borderRadius: "4px" }} />
                    : <span style={{ color: "#111", fontWeight: 600 }}>{f.value}</span>
                  }
                </div>
              ))}
              {fields.filter(f => f.value || f.imageUrl).length === 0 && (
                <p style={{ color: "#888", fontSize: "0.85rem", margin: 0 }}>Nenhum campo preenchido ainda.</p>
              )}
            </div>
            <div style={{ display: "flex", gap: "10px", justifyContent: "flex-end" }}>
              <button onClick={() => setShowPreview(false)}
                style={{ padding: "10px 20px", background: "transparent", border: "1px solid #E5E5E5", borderRadius: "8px", cursor: "pointer", fontSize: "0.875rem", fontWeight: 600 }}>
                Cancelar
              </button>
              <button onClick={applyToAllPieces} disabled={applying}
                style={{ padding: "10px 24px", background: applying ? "#888" : "#111", color: "#FFF", border: "none", borderRadius: "8px", cursor: "pointer", fontSize: "0.875rem", fontWeight: 700 }}>
                {applying ? "Aplicando..." : "Confirmar e Aplicar"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
