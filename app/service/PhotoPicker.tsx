"use client";

import { useRef, useState } from "react";
import { createServiceBrowserClient } from "./lib/supabase-browser";
import { uploadServiceImage, imageExtension } from "./lib/upload-image";

/* Componente único de upload de foto : a "bolinha" circular. Usado em
   qualquer lugar do Service que capture uma foto (cadastro de voluntário,
   ficha da criança, foto do responsável...) — nunca reimplementar isso
   localmente numa tela nova, sempre importar daqui. */
export function PhotoPicker({
  photoUrl,
  path,
  onUploaded,
  placeholder = "Toque para enviar",
  label,
}: {
  photoUrl: string | null;
  path: string;
  onUploaded: (url: string) => void;
  placeholder?: string;
  label?: string;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const onChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    setBusy(true);
    setError("");
    try {
      const url = await uploadServiceImage(createServiceBrowserClient(), file, `${path}.${imageExtension(file)}`);
      onUploaded(url);
    } catch {
      setError("Não consegui enviar a foto agora.");
    }
    setBusy(false);
  };

  return (
    <div>
      {label ? <div className="field-label" style={{ marginBottom: 8 }}>{label}</div> : null}
      <div className="ob-foto-area" onClick={() => inputRef.current?.click()} style={{ cursor: "pointer" }}>
        {photoUrl ? (
          <img src={photoUrl} alt={label ?? "Foto"} className="ob-foto-img" />
        ) : (
          <div className="ob-foto-placeholder">
            <span>{busy ? "…" : "+"}</span>
            <small>{busy ? "Enviando..." : placeholder}</small>
          </div>
        )}
        <input ref={inputRef} type="file" accept="image/*" style={{ display: "none" }} onChange={onChange} />
      </div>
      {error ? <div style={{ fontSize: 11, color: "var(--danger)", marginTop: 6 }}>{error}</div> : null}
    </div>
  );
}
