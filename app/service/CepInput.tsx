"use client";

import { useState } from "react";

export function formatCep(value: string) {
  /* limpa não-dígitos antes de formatar : o valor pode já vir com traço do
     banco (postal_code salvo por um fluxo antigo, ex.: "01234-000"), não só
     dígitos crus digitados agora. */
  const d = value.replace(/\D/g, "").slice(0, 8);
  return d.replace(/^(\d{5})(\d)/, "$1-$2");
}

export type CepResult = { street?: string | null; neighborhood?: string | null; city?: string | null; state?: string | null };

/* CEP com autopreenchimento : ao completar 8 dígitos, consulta
   /api/service/cep-lookup (BrasilAPI, mesma API já usada pro CNPJ) e devolve
   o endereço via onResult, pra quem estiver usando decidir o que fazer com
   ele (sem número : o CEP não devolve número mesmo). Fonte única : usada
   pelo campo genérico de formulário (CepField, sistema FieldDef), pelo
   formulário da igreja (Configurações → Igreja) e pelo app do membro
   (primeiro acesso e perfil). */
export default function CepInput({ value, onChange, onResult, placeholder }: { value: string; onChange: (v: string) => void; onResult: (data: CepResult | null, error?: string) => void; placeholder?: string }) {
  const [checking, setChecking] = useState(false);
  const [error, setError] = useState("");

  async function lookup(digits: string) {
    setChecking(true);
    setError("");
    try {
      const res = await fetch("/api/service/cep-lookup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ cep: digits }),
      });
      const data = (await res.json()) as { valid: boolean; error?: string } & CepResult;
      if (data.valid) {
        onResult({ street: data.street, neighborhood: data.neighborhood, city: data.city, state: data.state });
      } else {
        const msg = data.error || "CEP não encontrado.";
        setError(msg);
        onResult(null, msg);
      }
    } catch {
      const msg = "Não conseguimos consultar o CEP agora.";
      setError(msg);
      onResult(null, msg);
    } finally {
      setChecking(false);
    }
  }

  return (
    <div>
      <input
        className="input"
        value={formatCep(value)}
        placeholder={placeholder || "00000-000"}
        inputMode="numeric"
        onChange={(e) => {
          const digits = e.target.value.replace(/\D/g, "").slice(0, 8);
          onChange(digits);
          setError("");
          if (digits.length === 8) lookup(digits);
        }}
      />
      {checking && <div style={{ fontSize: 11, color: "var(--subtle)", marginTop: 4 }}>Buscando endereço...</div>}
      {error && <div style={{ fontSize: 11, color: "var(--amber)", marginTop: 4 }}>{error}</div>}
    </div>
  );
}
