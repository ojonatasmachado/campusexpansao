"use client";
import { useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import type { User } from "@supabase/supabase-js";
import { createClient } from "../lib/supabase-browser";
import type { UserProfileForm } from "../lib/user-profile";
import Nav from "../components/Nav";
import Footer from "../components/Footer";

const STATES = [
  "AC", "AL", "AP", "AM", "BA", "CE", "DF", "ES", "GO", "MA", "MT", "MS", "MG",
  "PA", "PB", "PR", "PE", "PI", "RJ", "RN", "RS", "RO", "RR", "SC", "SP", "SE", "TO",
];

function countCompleted(form: UserProfileForm) {
  return Object.values(form).filter((value) => value.trim().length > 0).length;
}

export default function ContaClient({ user, initialProfile }: { user: User; initialProfile: UserProfileForm }) {
  const router = useRouter();
  const [form, setForm] = useState<UserProfileForm>(initialProfile);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [confirmDelete, setConfirmDelete] = useState(false);

  const completed = useMemo(() => countCompleted(form), [form]);
  const total = Object.keys(form).length;
  const displayName = form.full_name || user.email?.split("@")[0] || "Usuário";

  function setField<K extends keyof UserProfileForm>(field: K, value: UserProfileForm[K]) {
    setForm((current) => ({ ...current, [field]: value }));
    setError("");
    setSuccess("");
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError("");
    setSuccess("");

    try {
      const response = await fetch("/api/account/profile", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const result = await response.json();

      if (!response.ok) {
        setError(result.error || "Não conseguimos salvar seus dados agora.");
        return;
      }

      if (result.profile) setForm(result.profile);
      setSuccess("Perfil atualizado.");
      router.refresh();
    } catch {
      setError("Não conseguimos salvar seus dados agora.");
    } finally {
      setSaving(false);
    }
  }

  async function handleLogout() {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/");
    router.refresh();
  }

  async function handleDeleteAccount() {
    setDeleting(true);
    setError("");
    setSuccess("");

    try {
      const response = await fetch("/api/account/delete", { method: "POST" });
      const result = await response.json();

      if (!response.ok) {
        setError(result.error || "Não conseguimos cancelar sua conta agora.");
        setDeleting(false);
        return;
      }

      const supabase = createClient();
      await supabase.auth.signOut();
      router.push("/");
      router.refresh();
    } catch {
      setError("Não conseguimos cancelar sua conta agora.");
      setDeleting(false);
    }
  }

  return (
    <>
      <Nav />
      <main style={{ minHeight: "80vh", background: "var(--ink)", padding: "64px 24px 80px" }}>
        <div className="ld-wrap">
          <div className="account-layout" style={{
            display: "grid",
            gridTemplateColumns: "minmax(0, 0.8fr) minmax(0, 1.4fr)",
            gap: 28,
            alignItems: "start",
          }}>
            <aside style={{
              background: "var(--graphite)",
              border: "1px solid var(--border)",
              borderRadius: 10,
              padding: 28,
              position: "sticky",
              top: 96,
            }}>
              <p style={eyebrowStyle}>◆ Minha conta</p>
              <h1 style={{
                color: "var(--cream)",
                fontSize: 34,
                lineHeight: 1.02,
                letterSpacing: "-0.04em",
                margin: "0 0 10px",
              }}>
                {displayName}
              </h1>
              <p style={{ color: "var(--muted)", fontSize: 14, lineHeight: 1.6, margin: "0 0 24px" }}>
                {user.email}
              </p>

              <div style={{
                borderTop: "1px solid var(--border)",
                borderBottom: "1px solid var(--border)",
                padding: "18px 0",
                marginBottom: 22,
              }}>
                <span style={{ color: "var(--cream)", fontSize: 28, fontWeight: 700 }}>
                  {completed}/{total}
                </span>
                <p style={{ color: "var(--muted)", fontSize: 13, lineHeight: 1.5, margin: "6px 0 0" }}>
                  campos preenchidos. Isso ajuda a CE.X adaptar suporte, materiais e comunicação ao seu contexto.
                </p>
              </div>

              <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                <Link href="/perfil" style={sideLinkStyle}>Minhas compras →</Link>
                <button onClick={handleLogout} style={sideButtonStyle}>Sair da conta</button>
              </div>
            </aside>

            <section style={{
              background: "var(--graphite)",
              border: "1px solid var(--border)",
              borderRadius: 10,
              padding: 32,
            }}>
              <div style={{ marginBottom: 28 }}>
                <p style={eyebrowStyle}>◆ Dados do líder</p>
                <h2 style={{
                  color: "var(--cream)",
                  fontSize: 24,
                  lineHeight: 1.08,
                  letterSpacing: "-0.03em",
                  margin: "0 0 8px",
                }}>
                  Complete seu perfil
                </h2>
                <p style={{ color: "var(--muted)", fontSize: 14, lineHeight: 1.6, margin: 0 }}>
                  Você pode atualizar essas informações quando quiser.
                </p>
              </div>

              <form onSubmit={handleSave} style={{ display: "grid", gap: 18 }}>
                <div className="account-field-grid" style={gridStyle}>
                  <Field label="Nome completo">
                    <input value={form.full_name} onChange={(e) => setField("full_name", e.target.value)} style={inputStyle} placeholder="Seu nome" />
                  </Field>
                  <Field label="Celular com DDD">
                    <input value={form.phone} onChange={(e) => setField("phone", e.target.value)} style={inputStyle} placeholder="(11) 99999-9999" inputMode="tel" />
                  </Field>
                </div>

                <div className="account-field-grid" style={gridStyle}>
                  <Field label="Nome da igreja">
                    <input value={form.church_name} onChange={(e) => setField("church_name", e.target.value)} style={inputStyle} placeholder="Igreja local" />
                  </Field>
                  <Field label="Cargo ou função">
                    <input value={form.role} onChange={(e) => setField("role", e.target.value)} style={inputStyle} placeholder="Pastor, líder, coordenador..." />
                  </Field>
                </div>

                <div className="account-field-grid" style={gridStyle}>
                  <Field label="Área de atuação">
                    <input value={form.ministry_area} onChange={(e) => setField("ministry_area", e.target.value)} style={inputStyle} placeholder="Infantil, jovens, discipulado..." />
                  </Field>
                  <Field label="Denominação">
                    <input value={form.denomination} onChange={(e) => setField("denomination", e.target.value)} style={inputStyle} placeholder="Batista, Presbiteriana..." />
                  </Field>
                </div>

                <div className="account-field-grid" style={gridStyle}>
                  <Field label="Estado">
                    <select value={form.state} onChange={(e) => setField("state", e.target.value)} style={inputStyle}>
                      <option value="">Selecione</option>
                      {STATES.map((state) => <option key={state} value={state}>{state}</option>)}
                    </select>
                  </Field>
                  <Field label="Cidade">
                    <input value={form.city} onChange={(e) => setField("city", e.target.value)} style={inputStyle} placeholder="Sua cidade" />
                  </Field>
                </div>

                <Field label="Endereço da igreja">
                  <input value={form.church_address} onChange={(e) => setField("church_address", e.target.value)} style={inputStyle} placeholder="Rua, número, bairro" />
                </Field>

                {error && <p style={{ color: "var(--terra)", fontSize: 13, margin: 0 }}>{error}</p>}
                {success && <p style={{ color: "var(--olive)", fontSize: 13, margin: 0 }}>{success}</p>}

                <div style={{ display: "flex", gap: 12, flexWrap: "wrap", marginTop: 6 }}>
                  <button type="submit" disabled={saving} style={primaryButtonStyle}>
                    {saving ? "Salvando..." : "Salvar perfil"}
                  </button>
                  <Link href="/perfil" style={secondaryLinkStyle}>Voltar para compras</Link>
                </div>
              </form>

              <div style={{
                marginTop: 42,
                paddingTop: 28,
                borderTop: "1px solid var(--border)",
              }}>
                <p style={eyebrowStyle}>◆ Cancelar conta</p>
                <h3 style={{ color: "var(--cream)", fontSize: 18, margin: "0 0 8px" }}>
                  Encerrar acesso CE.X
                </h3>
                <p style={{ color: "var(--muted)", fontSize: 14, lineHeight: 1.6, margin: "0 0 18px" }}>
                  Ao cancelar, seu usuário é removido e você sai da plataforma. Essa ação não pode ser desfeita por aqui.
                </p>
                {!confirmDelete ? (
                  <button type="button" onClick={() => setConfirmDelete(true)} style={dangerGhostStyle}>
                    Quero cancelar minha conta
                  </button>
                ) : (
                  <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
                    <button type="button" onClick={handleDeleteAccount} disabled={deleting} style={dangerButtonStyle}>
                      {deleting ? "Cancelando..." : "Confirmar cancelamento"}
                    </button>
                    <button type="button" onClick={() => setConfirmDelete(false)} style={secondaryButtonStyle}>
                      Manter minha conta
                    </button>
                  </div>
                )}
              </div>
            </section>
          </div>
        </div>
      </main>
      <Footer />
    </>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label style={{ display: "block" }}>
      <span style={labelStyle}>{label}</span>
      {children}
    </label>
  );
}

const eyebrowStyle: React.CSSProperties = {
  color: "var(--olive)",
  fontFamily: "var(--mono)",
  fontSize: 11,
  fontWeight: 600,
  letterSpacing: "0.14em",
  textTransform: "uppercase",
  margin: "0 0 10px",
};

const labelStyle: React.CSSProperties = {
  display: "block",
  color: "var(--muted)",
  fontSize: 11,
  fontWeight: 700,
  letterSpacing: "0.1em",
  textTransform: "uppercase",
  marginBottom: 7,
};

const inputStyle: React.CSSProperties = {
  width: "100%",
  background: "var(--ink)",
  border: "1px solid var(--border-2)",
  borderRadius: 8,
  color: "var(--cream)",
  fontFamily: "inherit",
  fontSize: 14,
  outline: "none",
  padding: "12px 14px",
  boxSizing: "border-box",
};

const gridStyle: React.CSSProperties = {
  display: "grid",
  gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
  gap: 16,
};

const primaryButtonStyle: React.CSSProperties = {
  background: "var(--olive)",
  border: "none",
  borderRadius: 8,
  color: "var(--accent-ink, #0E110D)",
  cursor: "pointer",
  fontFamily: "inherit",
  fontSize: 14,
  fontWeight: 800,
  letterSpacing: "0.03em",
  padding: "13px 20px",
};

const secondaryButtonStyle: React.CSSProperties = {
  background: "transparent",
  border: "1px solid var(--border-2)",
  borderRadius: 8,
  color: "var(--cream)",
  cursor: "pointer",
  fontFamily: "inherit",
  fontSize: 14,
  fontWeight: 700,
  padding: "12px 18px",
};

const secondaryLinkStyle: React.CSSProperties = {
  ...secondaryButtonStyle,
  display: "inline-flex",
  alignItems: "center",
  textDecoration: "none",
};

const sideLinkStyle: React.CSSProperties = {
  border: "1px solid var(--border-2)",
  borderRadius: 8,
  color: "var(--cream)",
  fontSize: 14,
  fontWeight: 700,
  padding: "11px 14px",
  textDecoration: "none",
};

const sideButtonStyle: React.CSSProperties = {
  background: "transparent",
  border: "none",
  color: "var(--muted)",
  cursor: "pointer",
  fontFamily: "inherit",
  fontSize: 14,
  padding: "8px 0",
  textAlign: "left",
};

const dangerGhostStyle: React.CSSProperties = {
  background: "transparent",
  border: "1px solid var(--terra)",
  borderRadius: 8,
  color: "var(--terra)",
  cursor: "pointer",
  fontFamily: "inherit",
  fontSize: 14,
  fontWeight: 700,
  padding: "12px 18px",
};

const dangerButtonStyle: React.CSSProperties = {
  ...dangerGhostStyle,
  background: "var(--terra)",
  color: "var(--accent-ink, #0E110D)",
};
