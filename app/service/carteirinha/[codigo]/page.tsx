import { cookies } from "next/headers";
import AuthShell from "../../AuthShell";
import ServiceTheme from "../../ServiceTheme";
import { getChurchBrandByOrg } from "../../lib/auth-church";
import { formatDateBR } from "../../lib/date";
import { createServiceSupabaseClient } from "../../lib/supabase";
import { resolveMode, THEME_COOKIE } from "../../lib/theme";

/* Verificação pública da carteirinha (QR do verso). Sem login e sem dado
   sensível: igreja, nome abreviado, situação e validade (0078). */

type Verificacao = { organizacao: string; nome: string; situacao: "valida" | "vencida" | "revogada" | "desligado"; validade: string };

const SITUACAO: Record<Verificacao["situacao"], { titulo: string; texto: (v: Verificacao) => string; cls: string }> = {
  valida: { titulo: "Carteirinha válida", texto: (v) => `Membro da igreja. Válida até ${formatDateBR(v.validade)}.`, cls: "chip-ok" },
  vencida: { titulo: "Carteirinha vencida", texto: (v) => `A validade terminou em ${formatDateBR(v.validade)}. A secretaria da igreja emite uma nova.`, cls: "chip-wait" },
  revogada: { titulo: "Carteirinha substituída", texto: () => "Esta carteirinha foi cancelada ou trocada por uma mais nova. Confira a carteirinha atual.", cls: "chip-no" },
  desligado: { titulo: "Não é mais membro", texto: () => "A pessoa não consta mais no rol de membros desta igreja.", cls: "chip-no" },
};

export const metadata = { title: "Verificar carteirinha · Service", robots: { index: false, follow: false } };

export default async function VerificarCarteirinha({ params }: { params: Promise<{ codigo: string }> }) {
  const { codigo } = await params;
  const supabase = await createServiceSupabaseClient();
  const { data } = await supabase.schema("service").rpc("verificar_carteirinha", { p_codigo: codigo });
  const v = (data ?? null) as Verificacao | null;
  const marca = v ? await getChurchBrandByOrg(v.organizacao) : null;
  const mode = resolveMode((await cookies()).get(THEME_COOKIE)?.value, marca?.brand);
  const s = v ? SITUACAO[v.situacao] : null;

  return (
    <>
      <ServiceTheme brand={marca?.brand} mode={mode} />
      <AuthShell
        logoUrl={marca?.logoUrl}
        churchName={marca?.name}
        eyebrow="Verificação de carteirinha"
        title={v ? v.nome : "Carteirinha não encontrada"}
        subtitle={v && s ? s.texto(v) : "O código deste QR não corresponde a nenhuma carteirinha. Confira se a imagem está inteira ou fale com a secretaria da igreja."}
        footer={marca?.name ? `Emitida por ${marca.name}` : undefined}
      >
        {s ? <p><span className={`chip ${s.cls}`}>{s.titulo}</span></p> : null}
      </AuthShell>
    </>
  );
}
