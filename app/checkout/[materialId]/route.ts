import { NextResponse } from "next/server";
import { liberarCompraTeste } from "../../lib/compras";
import { createClient } from "../../lib/supabase-server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ materialId: string }> },
) {
  const { materialId } = await params;
  const url = new URL(request.url);
  const materialPath = `/perfil/${encodeURIComponent(materialId)}`;
  const checkoutPath = `/checkout/${encodeURIComponent(materialId)}`;

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.redirect(
      new URL(`/login?redirect=${encodeURIComponent(checkoutPath)}`, url.origin),
    );
  }

  const result = await liberarCompraTeste(user, materialId);
  if (!result.ok) {
    const errorUrl = new URL("/perfil", url.origin);
    errorUrl.searchParams.set("checkout", "erro");
    if (result.error) errorUrl.searchParams.set("motivo", result.error);
    return NextResponse.redirect(errorUrl);
  }

  return NextResponse.redirect(new URL(materialPath, url.origin));
}
