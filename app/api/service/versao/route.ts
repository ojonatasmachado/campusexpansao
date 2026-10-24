import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/* Versão publicada do app (commit do deploy na Vercel). O app instalado no
   celular compara com a versão que abriu e recarrega quando há uma nova
   (PwaBootstrap). Sem segredo: é o mesmo commit que aparece no GitHub. */
export function GET() {
  const versao = process.env.NEXT_PUBLIC_SERVICE_VERSION || "local";
  return NextResponse.json({ versao }, { headers: { "Cache-Control": "no-store, max-age=0" } });
}
