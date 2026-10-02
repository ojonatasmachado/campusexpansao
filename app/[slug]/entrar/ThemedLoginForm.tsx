"use client";

import { useEffect } from "react";
import ServiceLoginForm from "../../service/login/LoginForm";

/* Login da igreja: a mesma UI do /service/login (variant "igreja"), sem
   "Cadastrar minha igreja" (aqui abriria uma organização nova sem relação
   com esta igreja). Zero duplicação: lógica no useServiceLoginForm, UI no
   LoginForm. */
export default function ThemedLoginForm({ slug, churchName, logoUrl }: { slug: string; churchName: string; logoUrl: string | null }) {
  /* lembra a igreja deste aparelho: quando a sessão cair, o /service manda
     de volta pra cá, e o /service/login já abre com a marca dela */
  useEffect(() => {
    document.cookie = `cex_church_slug=${slug}; path=/; max-age=31536000; samesite=lax`;
  }, [slug]);

  return <ServiceLoginForm variant="igreja" churchName={churchName} logoUrl={logoUrl} />;
}
