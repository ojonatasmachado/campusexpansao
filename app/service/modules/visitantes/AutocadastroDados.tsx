"use client";

import { useTermos } from "../../lib/vocabulario-context";
import { rotuloComoConheceu, rotulosInteresses } from "./autocadastro";
import { useTexto } from "../../lib/internacional/contexto";


/* Linhas extras do "Contato" na gaveta do visitante: o que a pessoa contou
   no autocadastro (ou que a equipe preencheu). Sem dado, a linha some. Vai
   dentro do <dl className="kv"> da gaveta. */
export default function AutocadastroDados({
  visitor,
}: {
  visitor: { email?: string | null; heard_from?: string | null; invited_by?: string | null; interests?: string[] | null; consent_at?: string | null };
}) {
  const traduzirUi = useTexto();
  const { vocab } = useTermos();
  const interesses = rotulosInteresses(visitor.interests, vocab);
  const conheceu = rotuloComoConheceu(visitor.heard_from);
  const consent = visitor.consent_at ? new Date(visitor.consent_at).toLocaleDateString("pt-BR") : null;
  return (
    <>
      {visitor.email ? <><dt>{traduzirUi("E-mail")}</dt><dd className="vis-break">{visitor.email}</dd></> : null}
      {conheceu ? <><dt>{traduzirUi("Conheceu por")}</dt><dd>{conheceu}</dd></> : null}
      {visitor.invited_by ? <><dt>{traduzirUi("Quem convidou")}</dt><dd>{visitor.invited_by}</dd></> : null}
      {interesses.length ? <><dt>{traduzirUi("Quer saber de")}</dt><dd>{interesses.join(" · ")}</dd></> : null}
      {consent ? <><dt>{traduzirUi("Autorizou contato")}</dt><dd>{traduzirUi("em {data}", { data: consent })}</dd></> : null}
    </>
  );
}
