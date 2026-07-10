import { NextRequest, NextResponse } from "next/server";
import { checkAuth } from "../../../../(site)/admin/actions";
import { supabaseAdmin } from "../../../../lib/supabase";

export const dynamic = "force-dynamic";

const BUCKET = "materiais-media";

function errorResponse(message: string, status: number) {
  return NextResponse.json({ error: message }, { status });
}

export async function POST(request: NextRequest) {
  const session = await checkAuth();
  if (!session) return errorResponse("Acesso administrativo expirado.", 401);

  const formData = await request.formData().catch(() => null);
  const file = formData?.get("file");
  const materialId = formData?.get("materialId");

  if (!(file instanceof Blob) || typeof materialId !== "string" || !materialId.trim()) {
    return errorResponse("Envie o arquivo e o material.", 400);
  }

  const path = `${materialId.trim()}/${Date.now()}.pdf`;
  const { error } = await supabaseAdmin()
    .storage
    .from(BUCKET)
    .upload(path, file, { contentType: "application/pdf", upsert: true });

  if (error) return errorResponse(error.message, 500);

  const { data } = supabaseAdmin().storage.from(BUCKET).getPublicUrl(path);
  return NextResponse.json({ url: data.publicUrl });
}
