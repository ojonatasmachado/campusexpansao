import { readFile } from "fs/promises";
import path from "path";
import { checkAuth } from "../admin/actions";
import { supabaseAdmin } from "./supabase";

export const STUDIO_MODULE_FILES = {
  design: "CEX-Studio-Design.html",
  divulgacao: "CEX-Studio-Divulgacao.html",
  documentos: "CEX-Studio-Documentos.html",
  pdf: "CEX-Studio-PDF.html",
  slides: "CEX-Studio-Slides.html",
} as const;

export type StudioModule = keyof typeof STUDIO_MODULE_FILES;

const TEMPLATE_MODULES = new Set<StudioModule>(["documentos", "slides", "design"]);

export function isStudioModule(value: string): value is StudioModule {
  return value in STUDIO_MODULE_FILES;
}

export async function serveStudioModule(module: StudioModule) {
  const filePath = path.join(process.cwd(), "cex-studio", "editors", STUDIO_MODULE_FILES[module]);
  const html = await readFile(filePath, "utf8");
  const session = await checkAuth().catch(() => null);
  const templates = TEMPLATE_MODULES.has(module)
    ? await supabaseAdmin()
        .from("studio_templates")
        .select("id,module,name,description,status,payload,created_at,updated_at")
        .eq("module", module)
        .eq("status", "Ativo")
        .order("updated_at", { ascending: false })
        .then(({ data }) => data ?? [])
    : [];
  const boot = {
    module,
    canManageTemplates: !!session?.isMaster,
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
