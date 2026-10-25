"use client";

import { useState } from "react";

import { Acao } from "./ui/Acao";
import { useTexto } from "./lib/internacional/contexto";

/* Campo de senha com "Mostrar": quem é leigo erra menos quando consegue
   conferir o que digitou (principalmente no celular). Visual de .login-input
   (service-v5.css: .login-pass, .login-pass-tog). */
export default function PasswordInput({
  value,
  onChange,
  autoComplete,
  placeholder,
}: {
  value: string;
  onChange: (value: string) => void;
  autoComplete: "current-password" | "new-password";
  placeholder?: string;
}) {
  const traduzirUi = useTexto();

  const [show, setShow] = useState(false);
  return (
    <div className="login-pass">
      <input
        className="login-input"
        type={show ? "text" : "password"}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        autoComplete={autoComplete}
        autoCapitalize="none"
        autoCorrect="off"
        spellCheck={false}
        placeholder={placeholder}
      />
      <Acao className="login-pass-tog" onClick={() => setShow((s) => !s)} aria-pressed={show}>
        {show ? traduzirUi("Ocultar") : traduzirUi("Mostrar")}
      </Acao>
    </div>
  );
}
