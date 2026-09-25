import Link from "next/link";
import Logo from "../../components/Logo";
import { supabaseAdmin } from "../../lib/supabase";
import { isInviteValid } from "../../lib/service-invite";
import ConviteForm from "./ConviteForm";

export const dynamic = "force-dynamic";

async function resolveInvite(u?: string, t?: string) {
  if (!u || !t) return null;
  const { data, error } = await supabaseAdmin().auth.admin.getUserById(u);
  if (error || !data.user || !isInviteValid(data.user, t)) return null;
  const name = (data.user.user_metadata as { full_name?: string } | undefined)?.full_name ?? "";
  return { email: data.user.email ?? "", firstName: name.split(" ")[0] };
}

export default async function ServiceConvitePage({ searchParams }: { searchParams: Promise<{ u?: string; t?: string }> }) {
  const { u, t } = await searchParams;
  const invite = await resolveInvite(u, t);

  return (
    <main className="ld-sec" style={{ minHeight: "100vh", background: "var(--ink)" }}>
      <div className="ld-wrap">
        <section className="card" style={{ maxWidth: 520, margin: "0 auto" }}>
          <div className="card-body">
            <Link href="/" className="nav-logo" style={{ textDecoration: "none" }}>
              <Logo />
            </Link>
            <p className="eyebrow" style={{ color: "var(--wheat)", marginTop: 28 }}>
              SERVICE · CONVITE
            </p>
            {invite && u && t ? (
              <>
                <h1 className="t-h1" style={{ color: "var(--cream)", marginTop: 12 }}>
                  {invite.firstName ? `Bem-vindo, ${invite.firstName}` : "Bem-vindo"}
                </h1>
                <p className="t-body" style={{ color: "var(--light)", marginTop: 10 }}>
                  Crie a sua senha para entrar no app da sua igreja. Só você vai saber essa senha.
                </p>
                <ConviteForm u={u} t={t} email={invite.email} />
              </>
            ) : (
              <>
                <h1 className="t-h1" style={{ color: "var(--cream)", marginTop: 12 }}>
                  Este convite não vale mais
                </h1>
                <p className="t-body" style={{ color: "var(--light)", marginTop: 10 }}>
                  O link já foi usado ou passou do prazo de 7 dias. Peça um novo link ao líder da sua igreja.
                  Se você já criou sua senha, é só entrar.
                </p>
                <Link href="/service/login" className="btn btn-primary btn-lg" style={{ marginTop: 24 }}>
                  Entrar no app →
                </Link>
              </>
            )}
          </div>
        </section>
      </div>
    </main>
  );
}
