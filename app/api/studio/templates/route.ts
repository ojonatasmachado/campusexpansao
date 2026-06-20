import { NextRequest, NextResponse } from "next/server";
import { checkAuth } from "../../../admin/actions";
import { supabaseAdmin } from "../../../lib/supabase";

const MODULES = new Set(["documentos", "slides", "design"]);

function templateId(module: string, name: string) {
  const slug = name
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 48) || "modelo";
  return `tpl-${module}-${slug}-${Date.now()}`;
}

export async function GET(request: NextRequest) {
  const module = request.nextUrl.searchParams.get("module") ?? "";
  if (!MODULES.has(module)) {
    return NextResponse.json({ error: "Módulo inválido." }, { status: 400 });
  }

  const { data, error } = await supabaseAdmin()
    .from("studio_templates")
    .select("id,module,name,description,status,payload,created_at,updated_at")
    .eq("module", module)
    .eq("status", "Ativo")
    .order("updated_at", { ascending: false });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ templates: data ?? [] });
}

export async function POST(request: NextRequest) {
  const session = await checkAuth();
  if (!session?.isMaster) {
    return NextResponse.json({ error: "Somente o administrador master pode salvar modelos oficiais." }, { status: 403 });
  }

  const body = await request.json().catch(() => null) as {
    id?: string;
    module?: string;
    name?: string;
    description?: string;
    status?: "Ativo" | "Rascunho";
    payload?: Record<string, unknown>;
  } | null;

  const module = body?.module ?? "";
  const name = body?.name?.trim() ?? "";
  if (!MODULES.has(module) || !name) {
    return NextResponse.json({ error: "Informe módulo e nome do modelo." }, { status: 400 });
  }

  const row = {
    id: body?.id || templateId(module, name),
    module,
    name,
    description: body?.description?.trim() ?? "",
    status: body?.status === "Rascunho" ? "Rascunho" : "Ativo",
    payload: body?.payload && typeof body.payload === "object" ? body.payload : {},
    created_by: session.id,
    created_by_username: session.username,
    updated_at: new Date().toISOString(),
  };

  const { data, error } = await supabaseAdmin()
    .from("studio_templates")
    .upsert(row, { onConflict: "id" })
    .select("id,module,name,description,status,payload,created_by,created_by_username,created_at,updated_at")
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ template: data });
}
