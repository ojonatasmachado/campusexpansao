import { readFile } from "fs/promises";
import type { NextRequest } from "next/server";
import path from "path";
import { checkAuth } from "../(site)/admin/actions";
import { compraDoUsuarioPorMaterialId } from "./compras";
import { supabaseAdmin } from "./supabase";
import { createClient } from "./supabase-server";

export const STUDIO_MODULE_FILES = {
  design: "CEX-Studio-Design.html",
  divulgacao: "CEX-Studio-Divulgacao.html",
  documentos: "CEX-Studio-Documentos.html",
  pdf: "CEX-Studio-PDF.html",
  slides: "CEX-Studio-Slides.html",
} as const;

export type StudioModule = keyof typeof STUDIO_MODULE_FILES;

const TEMPLATE_MODULES = new Set<StudioModule>(["documentos", "slides", "design"]);
const USER_DRAFT_MODULES = new Set<StudioModule>(["slides", "design", "documentos", "pdf"]);

export function isStudioModule(value: string): value is StudioModule {
  return value in STUDIO_MODULE_FILES;
}

type ServeStudioModuleOptions = {
  allowTemplateManagement?: boolean;
  loadTemplates?: boolean;
  request?: NextRequest;
};

function studioDraftTtlDays() {
  const value = Number(process.env.STUDIO_USER_DRAFT_TTL_DAYS);
  return Number.isFinite(value) && value > 0 ? Math.floor(value) : 30;
}

async function loadUserDraft(module: StudioModule, material: string, mensagem: string, context: string) {
  if (context !== "comprador" || !material || !USER_DRAFT_MODULES.has(module)) return null;

  try {
    const supabase = await createClient();
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) return null;

    const compra = await compraDoUsuarioPorMaterialId(user, material);
    if (!compra) return null;

    const { data, error } = await supabaseAdmin()
      .from("studio_user_drafts")
      .select("id,module,material_id,mensagem,payload,expires_at,created_at,updated_at")
      .eq("user_id", user.id)
      .eq("material_id", material)
      .eq("module", module)
      .eq("mensagem", mensagem)
      .gt("expires_at", new Date().toISOString())
      .maybeSingle();

    if (error) {
      console.error("Erro ao buscar draft do Studio", error);
      return null;
    }

    return data ?? null;
  } catch (error) {
    console.error("Erro ao preparar draft do Studio", error);
    return null;
  }
}

async function loadPdfUrl(module: StudioModule, material: string, mensagem: string, context: string) {
  if (module !== "pdf" || context !== "comprador" || !material || !mensagem) return null;

  try {
    const supabase = await createClient();
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) return null;

    const compra = await compraDoUsuarioPorMaterialId(user, material);
    if (!compra) return null;

    const mensagemAtual = compra.mensagens.find((item) => item.id === mensagem);
    return mensagemAtual?.pdfUrl ?? null;
  } catch (error) {
    console.error("Erro ao preparar PDF do Studio", error);
    return null;
  }
}

export async function serveStudioModule(module: StudioModule, options: ServeStudioModuleOptions = {}) {
  const filePath = path.join(process.cwd(), "cex-studio", "editors", STUDIO_MODULE_FILES[module]);
  const html = await readFile(filePath, "utf8");
  const allowTemplateManagement = options.allowTemplateManagement ?? true;
  const loadTemplates = options.loadTemplates ?? true;
  const material = options.request?.nextUrl.searchParams.get("material")?.trim() ?? "";
  const mensagem = options.request?.nextUrl.searchParams.get("mensagem")?.trim() ?? "";
  const context = options.request?.nextUrl.searchParams.get("context")?.trim() ?? "";
  const draftTtlDays = studioDraftTtlDays();
  const session = allowTemplateManagement ? await checkAuth().catch(() => null) : null;
  const canManageTemplates = allowTemplateManagement
    && !!session?.isMaster
    && (!options.request || context === "template-admin");
  const templates = loadTemplates && TEMPLATE_MODULES.has(module)
    ? await supabaseAdmin()
        .from("studio_templates")
        .select("id,module,name,description,status,payload,created_at,updated_at")
        .eq("module", module)
        .eq("status", "Ativo")
        .order("updated_at", { ascending: false })
        .then(({ data }) => data ?? [])
    : [];
  const userDraft = await loadUserDraft(module, material, mensagem, context);
  const pdfUrl = await loadPdfUrl(module, material, mensagem, context);
  const boot = {
    module,
    material,
    mensagem,
    context,
    draftTtlDays,
    userDraft,
    pdfUrl,
    canManageTemplates,
    templates,
  };
  const bootScript = `<script>window.CEX_STUDIO_BOOT=${JSON.stringify(boot).replace(/</g, "\\u003c")};</script>`;
  const hydratedHtml = html.includes("</head>")
    ? html.replace("</head>", `${bootScript}\n</head>`)
    : `${bootScript}\n${html}`;

  return new Response(hydratedHtml, {
    headers: {
      "Content-Type": "text/html; charset=utf-8",
      "Cache-Control": "no-store, max-age=0",
    },
  });
}
