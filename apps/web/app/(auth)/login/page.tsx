"use client";

import { useState } from "react";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";
import Link from "next/link";

// Logo component matching ZZYSY brand
function Logo() {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: "2px", fontFamily: "'DM Sans', sans-serif", fontWeight: 900, fontSize: "2rem", letterSpacing: "-0.04em", color: "#111111" }}>
      ZZ
      <span style={{ position: "relative", display: "inline-flex", alignItems: "center", justifyContent: "center", width: "2rem", height: "2rem", border: "3px solid #111111", borderRadius: "50%", margin: "0 1px" }}>
        <span style={{ display: "flex", gap: "2px" }}>
          <span style={{ width: "5px", height: "5px", borderRadius: "50%", background: "#F5C400" }} />
          <span style={{ width: "5px", height: "5px", borderRadius: "50%", background: "#34A853" }} />
          <span style={{ width: "5px", height: "5px", borderRadius: "50%", background: "#4285F4" }} />
        </span>
      </span>
      SY
    </div>
  );
}

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    const result = await signIn("credentials", {
      email,
      password,
      redirect: false,
    });

    setLoading(false);

    if (result?.error) {
      setError(result.error === "BLOCKED" ? "Sua conta foi bloqueada. Entre em contato com o suporte." : "E-mail ou senha incorretos.");
    } else {
      router.push("/dashboard");
    }
  };

  return (
    <div style={{
      minHeight: "100vh",
      background: "#FFFFFF",
      display: "flex",
      fontFamily: "'DM Sans', sans-serif",
    }}>
      {/* Left panel */}
      <div style={{
        flex: 1,
        display: "flex",
        flexDirection: "column",
        justifyContent: "space-between",
        padding: "48px",
        borderRight: "1px solid #E5E5E5",
        background: "#F7F7F7",
      }}>
        <Logo />
        <div>
          <p style={{ fontSize: "1.5rem", fontWeight: 700, color: "#111111", lineHeight: 1.3, marginBottom: "16px" }}>
            Automação de layout para campanhas publicitárias.
          </p>
          <p style={{ fontSize: "0.95rem", color: "#888888", lineHeight: 1.6 }}>
            Crie, desdoble e exporte peças em escala — sem retrabalho.
          </p>
        </div>
        <div style={{ display: "flex", gap: "8px" }}>
          {["#F5C400", "#34A853", "#4285F4"].map((color) => (
            <span key={color} style={{ width: "8px", height: "8px", borderRadius: "50%", background: color }} />
          ))}
        </div>
      </div>

      {/* Right panel — form */}
      <div style={{
        flex: 1,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "48px",
      }}>
        <div style={{ width: "100%", maxWidth: "360px" }}>
          <h1 style={{ fontSize: "1.75rem", fontWeight: 700, color: "#111111", marginBottom: "8px" }}>
            Entrar
          </h1>
          <p style={{ fontSize: "0.875rem", color: "#888888", marginBottom: "32px" }}>
            Não tem conta?{" "}
            <Link href="/register" style={{ color: "#111111", fontWeight: 600, textDecoration: "underline" }}>
              Cadastre-se
            </Link>
          </p>

          <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
            <div>
              <label style={{ display: "block", fontSize: "0.8rem", fontWeight: 600, color: "#111111", marginBottom: "6px", textTransform: "uppercase", letterSpacing: "0.05em" }}>
                E-mail
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                placeholder="voce@agencia.com"
                style={{
                  width: "100%",
                  padding: "12px 14px",
                  border: "1px solid #E5E5E5",
                  borderRadius: "8px",
                  fontSize: "0.95rem",
                  color: "#111111",
                  background: "#FFFFFF",
                  outline: "none",
                  boxSizing: "border-box",
                  transition: "border-color 0.15s",
                }}
                onFocus={(e) => e.target.style.borderColor = "#111111"}
                onBlur={(e) => e.target.style.borderColor = "#E5E5E5"}
              />
            </div>

            <div>
              <label style={{ display: "block", fontSize: "0.8rem", fontWeight: 600, color: "#111111", marginBottom: "6px", textTransform: "uppercase", letterSpacing: "0.05em" }}>
                Senha
              </label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                placeholder="••••••••"
                style={{
                  width: "100%",
                  padding: "12px 14px",
                  border: "1px solid #E5E5E5",
                  borderRadius: "8px",
                  fontSize: "0.95rem",
                  color: "#111111",
                  background: "#FFFFFF",
                  outline: "none",
                  boxSizing: "border-box",
                  transition: "border-color 0.15s",
                }}
                onFocus={(e) => e.target.style.borderColor = "#111111"}
                onBlur={(e) => e.target.style.borderColor = "#E5E5E5"}
              />
            </div>

            {error && (
              <p style={{ fontSize: "0.85rem", color: "#E53935", margin: 0 }}>{error}</p>
            )}

            <button
              type="submit"
              disabled={loading}
              style={{
                width: "100%",
                padding: "13px",
                background: loading ? "#888888" : "#111111",
                color: "#FFFFFF",
                border: "none",
                borderRadius: "8px",
                fontSize: "0.95rem",
                fontWeight: 700,
                cursor: loading ? "not-allowed" : "pointer",
                marginTop: "8px",
                transition: "background 0.15s",
                fontFamily: "'DM Sans', sans-serif",
              }}
            >
              {loading ? "Entrando..." : "Entrar"}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
