import Link from "next/link";
import { redirect } from "next/navigation";
import { createServiceSupabaseClient } from "../lib/supabase";
import { Icon } from "../lib/icons";
import AuthShell from "../AuthShell";
import BootstrapChurchForm from "./BootstrapChurchForm";
import ConvitesPendentes from "./ConvitesPendentes";

async function getOnboardingState() {
  const supabase = await createServiceSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/service/login");

  const { count } = await supabase
    .schema("service")
    .from("churches")
    .select("id", { count: "exact", head: true });

  const { data: invites } = await supabase.schema("core").rpc("my_pending_invites");
  const pending = ((invites ?? []) as { organization_id: string; church_name: string }[]).map((i) => ({
    organizationId: i.organization_id,
    churchName: i.church_name,
  }));

  return { count: count ?? 0, pending };
}

/* Quem chega aqui sem igreja pode ser um membro que se cadastrou sozinho em
   vez de usar o convite. Criar igreja só com escolha explícita (?nova=1):
   sem isso, membro acabava abrindo uma igreja nova sem querer.
   Mesma lógica e os mesmos 3 estados de antes; casca AuthShell (ainda sem
   igreja, então a marca é CE.X | Service) e texto sem termo técnico. */
export default async function ServiceOnboardingPage({ searchParams }: { searchParams: Promise<{ nova?: string }> }) {
  const { count: churchCount, pending } = await getOnboardingState();
  if (churchCount > 0) redirect("/service");
  const { nova } = await searchParams;

  if (pending.length > 0 && nova !== "1") {
    return (
      <AuthShell
        eyebrow="Convite"
        title={pending.length === 1 ? "Chegou um convite para você" : "Chegaram convites para você"}
        subtitle="Aceite para entrar no app da igreja com a conta que você já tem."
      >
        <ConvitesPendentes invites={pending} />
      </AuthShell>
    );
  }

  if (nova !== "1") {
    return (
      <AuthShell
        eyebrow="Primeiro acesso"
        title="Sua conta ainda não está ligada a uma igreja"
        subtitle="Escolha o que combina com você."
      >
        <div className="login-choices">
          <div className="login-choice">
            <span className="login-choice-ic"><Icon name="membros" size={17} /></span>
            <span>
              <b>Sou membro de uma igreja</b>
              <small>Peça ao seu líder o link de convite. Ele chega pelo WhatsApp e já coloca você dentro do app da sua igreja.</small>
            </span>
          </div>
          <Link href="/service/onboarding?nova=1" className="login-choice">
            <span className="login-choice-ic"><Icon name="identidade" size={17} /></span>
            <span>
              <b>Sou da liderança</b>
              <small>Quero cadastrar a minha igreja no Service.</small>
            </span>
            <span className="login-choice-go">Cadastrar →</span>
          </Link>
        </div>
      </AuthShell>
    );
  }

  return (
    <AuthShell
      eyebrow="Nova igreja"
      title="Cadastre sua igreja"
      subtitle="Leva um minuto. Você fica como responsável pelo Service da igreja e depois convida a liderança e os membros."
    >
      <BootstrapChurchForm />
    </AuthShell>
  );
}
