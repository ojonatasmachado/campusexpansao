import { NextRequest, NextResponse } from "next/server";
import { checkAuth } from "../../../(site)/admin/actions";
import { importPptx } from "../../../lib/pptx-import";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

function errorResponse(message: string, status: number) {
  return NextResponse.json({ error: message }, { status });
}

export async function POST(request: NextRequest) {
  const session = await checkAuth();
  if (!session) return errorResponse("Acesso administrativo expirado.", 401);

  const formData = await request.formData().catch(() => null);
  const file = formData?.get("file");
  if (!(file instanceof Blob)) {
    return errorResponse("Envie um arquivo .pptx.", 400);
  }
  if (!file.name?.toLowerCase().endsWith(".pptx")) {
    return errorResponse("Só arquivos .pptx são aceitos (PowerPoint 2007 ou mais recente).", 400);
  }

  const importId = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

  try {
    const buffer = Buffer.from(await file.arrayBuffer());
    const { pages, warnings } = await importPptx(buffer, importId);
    return NextResponse.json({ pages, warnings });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Não foi possível ler o arquivo.";
    return errorResponse(`Falha ao importar PowerPoint: ${message}`, 422);
  }
}
