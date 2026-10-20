"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { CODIGO_RE, codigoLegivel, entradaPath, normalizarCodigo } from "../../lib/service-entrada";

export default function CodigoForm() {
  const router = useRouter();
  const [codigo, setCodigo] = useState("");
  const [error, setError] = useState<string | null>(null);
  const limpo = normalizarCodigo(codigo);

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    if (!CODIGO_RE.test(limpo)) return setError("Confira o código: são 8 letras e números.");
    router.push(entradaPath(limpo));
  };

  return (
    <form className="login-form" onSubmit={handleSubmit} noValidate>
      <label className="login-field">
        <span className="login-label">Código da igreja</span>
        <input
          className="login-input entrada-codigo"
          value={codigoLegivel(limpo)}
          onChange={(e) => { setError(null); setCodigo(e.target.value); }}
          autoCapitalize="characters"
          autoCorrect="off"
          autoComplete="off"
          spellCheck={false}
          enterKeyHint="go"
          placeholder="ABCD-2345"
          aria-describedby="codigo-ajuda"
        />
        <span className="login-help" id="codigo-ajuda">Pode digitar em letra minúscula. O código não usa 0, 1, O, I nem L.</span>
      </label>
      {error && (
        <div className="login-alert" role="alert">
          {error}
        </div>
      )}
      <button className="login-btn" type="submit">
        Continuar →
      </button>
    </form>
  );
}
