"use client";

import { useEffect, useRef, useState } from "react";

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
export default function CepInput({ value, onChange, onResult, placeholder, id, international = false, brazilLookup = true, onBusyChange }: { onBusyChange?: (busy: boolean) => void; brazilLookup?: boolean; international?: boolean; id?: string; value: string; onChange: (v: string) => void; onResult: (data: CepResult | null, error?: string) => void; placeholder?: string }) {
  const requestId = useRef(0);
  useEffect(() => () => { ++requestId.current; }, []);
  const [checking, setChecking] = useState(false);
  const [error, setError] = useState("");

  async function lookup(digits: string) {
    const current = ++requestId.current;
    setChecking(true);
    onBusyChange?.(true);
    setError("");
    try {
      const res = await fetch("/api/service/cep-lookup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ cep: digits }),
      });
      const data = (await res.json()) as { valid: boolean; error?: string } & CepResult;
      if (current !== requestId.current) return;
      if (data.valid) {
        onResult({ street: data.street, neighborhood: data.neighborhood, city: data.city, state: data.state });
      } else {
        const msg = data.error || "CEP não encontrado.";
        setError(msg);
        onResult(null, msg);
      }
    } catch {
      if (current !== requestId.current) return;
      const msg = "Não conseguimos consultar o CEP agora.";
      setError(msg);
      onResult(null, msg);
    } finally {
      if (current === requestId.current) { setChecking(false); onBusyChange?.(false); }
    }
  }

  return (
    <div>
      <input
        id={id}
        aria-label={id ? undefined : international ? "Código postal" : "CEP"}
        className="input"
        aria-busy={checking}
        aria-invalid={!!error}
        value={international ? value : formatCep(value)}
        placeholder={placeholder || (international ? "CEP ou código postal" : "00000-000")}
        inputMode={international ? "text" : "numeric"}
        autoComplete="postal-code"
        maxLength={international ? 32 : 9}
        onChange={(e) => {
          ++requestId.current;
          setChecking(false);
          onBusyChange?.(false);
          if (international) { onChange(e.target.value.slice(0, 32)); setError(""); return; }
          const digits = e.target.value.replace(/\D/g, "").slice(0, 8);
          onChange(digits);
          setError("");
          if (digits.length === 8) lookup(digits);
        }}
      />
      {international && brazilLookup && /^\d{5}-?\d{3}$/.test(value.trim()) && <button type="button" className="btn btn-sec btn-sm" disabled={checking} onClick={() => lookup(value.replace(/\D/g, ""))}>Buscar CEP do Brasil</button>}
      {checking && <div role="status" style={{ fontSize: "var(--fs-ui-sm)", color: "var(--muted)", marginTop: 4 }}>Buscando endereço...</div>}
      {error && <div role="alert" style={{ fontSize: "var(--fs-ui-sm)", color: "var(--amber)", marginTop: 4 }}>{error}</div>}
    </div>
  );
}
