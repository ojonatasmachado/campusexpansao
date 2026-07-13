import JSZip from "jszip";
import { XMLParser } from "fast-xml-parser";
import { supabaseAdmin } from "./supabase";

// Importador de PPTX pra Slides do Studio: "melhor esforço local", sem
// serviço externo de renderização. Texto, imagens e formas simples viram
// elementos editáveis de verdade (mesmo esquema que os presets nativos do
// Studio usam). O que não dá pra recriar com confiança (gráfico, SmartArt,
// tabela complexa, OLE) vira um aviso visual no lugar exato do original,
// pra o mentor saber que precisa revisar aquele trecho manualmente.

const BUCKET = "materiais-media";
const TARGET_W = 1920;
const TARGET_H = 1080;
const EMU_PER_POINT = 12700;

type AnyEl = Record<string, unknown>;
type SlidePage = { bg: { type: "color"; color: string }; els: AnyEl[] };

export type PptxImportResult = {
  pages: SlidePage[];
  warnings: string[];
};

const parser = new XMLParser({
  ignoreAttributes: false,
  attributeNamePrefix: "@_",
  textNodeName: "#text",
  removeNSPrefix: true,
  isArray: (name) => ["sldId", "sp", "pic", "grpSp", "cxnSp", "graphicFrame", "p", "r", "gridCol", "tr", "tc"].includes(name),
});

function arr<T>(v: T | T[] | undefined | null): T[] {
  if (v == null) return [];
  return Array.isArray(v) ? v : [v];
}

function num(v: unknown, fallback = 0): number {
  const n = typeof v === "string" ? parseFloat(v) : typeof v === "number" ? v : NaN;
  return Number.isFinite(n) ? n : fallback;
}

let uid = 0;
function nextId(prefix: string) {
  uid += 1;
  return `${prefix}${uid}`;
}

// ── tema (cores) ──────────────────────────────────────────────────────────

type Theme = Record<string, string>;

function srgbOrSys(node: AnyEl | undefined): string | null {
  if (!node) return null;
  const srgb = node["srgbClr"] as AnyEl | undefined;
  if (srgb?.["@_val"]) return "#" + String(srgb["@_val"]);
  const sys = node["sysClr"] as AnyEl | undefined;
  if (sys?.["@_lastClr"]) return "#" + String(sys["@_lastClr"]);
  return null;
}

async function loadTheme(zip: JSZip): Promise<Theme> {
  const theme: Theme = {
    dk1: "#000000", lt1: "#FFFFFF", dk2: "#1F1F1F", lt2: "#EEEEEE",
    accent1: "#7A9E3F", accent2: "#7A9E3F", accent3: "#7A9E3F",
    accent4: "#7A9E3F", accent5: "#7A9E3F", accent6: "#7A9E3F",
    hlink: "#7A9E3F", folHlink: "#7A9E3F",
  };
  const file = zip.file(/ppt\/theme\/theme1\.xml/i)[0];
  if (!file) return theme;
  try {
    const xml = parser.parse(await file.async("text"));
    const scheme = xml?.theme?.themeElements?.clrScheme;
    if (!scheme) return theme;
    for (const key of Object.keys(theme)) {
      const node = scheme[key];
      const resolved = srgbOrSys(node);
      if (resolved) theme[key] = resolved;
    }
  } catch {
    // tema ilegível: segue com o fallback quente da marca.
  }
  return theme;
}

function applyLumMod(hex: string, lumMod?: number, lumOff?: number): string {
  if (lumMod == null && lumOff == null) return hex;
  const m = /^#?([0-9a-f]{6})$/i.exec(hex.trim());
  if (!m) return hex;
  const n = parseInt(m[1], 16);
  let [r, g, b] = [(n >> 16) & 255, (n >> 8) & 255, n & 255];
  const mod = lumMod == null ? 1 : lumMod;
  const off = lumOff == null ? 0 : lumOff * 255;
  const f = (c: number) => Math.max(0, Math.min(255, Math.round(c * mod + off)));
  [r, g, b] = [f(r), f(g), f(b)];
  return "#" + [r, g, b].map((c) => c.toString(16).padStart(2, "0")).join("").toUpperCase();
}

function resolveColor(fillNode: AnyEl | undefined, theme: Theme, fallback: string): string {
  if (!fillNode) return fallback;
  const solid = (fillNode["solidFill"] ?? fillNode) as AnyEl | undefined;
  if (!solid) return fallback;
  const srgb = solid["srgbClr"] as AnyEl | undefined;
  if (srgb?.["@_val"]) return "#" + String(srgb["@_val"]);
  const scheme = solid["schemeClr"] as AnyEl | undefined;
  if (scheme?.["@_val"]) {
    const key = String(scheme["@_val"]).replace(/^(bg1)$/, "lt1").replace(/^(tx1)$/, "dk1")
      .replace(/^(bg2)$/, "lt2").replace(/^(tx2)$/, "dk2");
    const base = theme[key] ?? fallback;
    const lumModNode = scheme["lumMod"] as AnyEl | undefined;
    const lumOffNode = scheme["lumOff"] as AnyEl | undefined;
    const lumMod = lumModNode ? num(lumModNode["@_val"]) / 100000 : undefined;
    const lumOff = lumOffNode ? num(lumOffNode["@_val"]) / 100000 : undefined;
    return applyLumMod(base, lumMod, lumOff);
  }
  return fallback;
}

// ── geometria ─────────────────────────────────────────────────────────────

type Box = { x: number; y: number; w: number; h: number; rot: number; flipH: boolean; flipV: boolean };

function readXfrm(spPr: AnyEl | undefined): Box | null {
  const xfrm = spPr?.["xfrm"] as AnyEl | undefined;
  const off = xfrm?.["off"] as AnyEl | undefined;
  const ext = xfrm?.["ext"] as AnyEl | undefined;
  if (!off || !ext) return null;
  return {
    x: num(off["@_x"]),
    y: num(off["@_y"]),
    w: num(ext["@_cx"]),
    h: num(ext["@_cy"]),
    rot: num(xfrm?.["@_rot"]) / 60000,
    flipH: xfrm?.["@_flipH"] === "1",
    flipV: xfrm?.["@_flipV"] === "1",
  };
}

// converte um retângulo filho (em EMU, espaço interno do grupo) pro
// espaço absoluto do slide (também em EMU), aplicando a transformação do
// grupo (offset + escala entre a extensão declarada e a extensão real).
function applyGroupTransform(child: Box, group: { off: Box; chOff: { x: number; y: number; w: number; h: number } }): Box {
  const sx = group.chOff.w ? group.off.w / group.chOff.w : 1;
  const sy = group.chOff.h ? group.off.h / group.chOff.h : 1;
  return {
    x: group.off.x + (child.x - group.chOff.x) * sx,
    y: group.off.y + (child.y - group.chOff.y) * sy,
    w: child.w * sx,
    h: child.h * sy,
    rot: child.rot,
    flipH: child.flipH,
    flipV: child.flipV,
  };
}

// ── texto ─────────────────────────────────────────────────────────────────

function paragraphText(p: AnyEl): string {
  const runs = arr(p["r"] as AnyEl[] | AnyEl | undefined);
  if (runs.length) return runs.map((r) => String((r["t"] as string) ?? "")).join("");
  const t = p["fld"] as AnyEl | undefined;
  return t?.["t"] ? String(t["t"]) : "";
}

function firstRunProps(p: AnyEl): AnyEl | null {
  const runs = arr(p["r"] as AnyEl[] | AnyEl | undefined);
  const runProps = runs[0]?.["rPr"] as AnyEl | undefined;
  if (runProps) return runProps;
  // sem rPr na run (raro em PPTX real, comum em arquivos gerados por
  // script): cai pro defRPr do parágrafo, que é onde ferramentas como
  // python-pptx costumam gravar bold/itálico/tamanho "soltos".
  const pPr = p["pPr"] as AnyEl | undefined;
  return (pPr?.["defRPr"] as AnyEl) ?? null;
}

function buildTextElement(txBody: AnyEl, box: Box, scale: number, theme: Theme, offset: { x: number; y: number }): AnyEl | null {
  const paragraphs = arr(txBody["p"] as AnyEl[] | AnyEl | undefined);
  const lines = paragraphs.map((p) => paragraphText(p).replace(/\v/g, "\n"));
  const text = lines.join("\n").trim();
  if (!text) return null;

  const firstP = paragraphs[0] ?? {};
  const pPr = (firstP["pPr"] as AnyEl) ?? {};
  const rPr = firstRunProps(firstP);
  const algn = String(pPr["@_algn"] ?? "").toLowerCase();
  const align = algn === "ctr" ? "center" : algn === "r" ? "right" : "left";

  const szRaw = rPr?.["@_sz"];
  const sizePt = szRaw ? num(szRaw) / 100 : 18;
  const sizePx = Math.max(6, Math.round(sizePt * EMU_PER_POINT * scale));

  const color = resolveColor(rPr?.["solidFill"] as AnyEl | undefined, theme, "#0E110D");
  const bold = rPr?.["@_b"] === "1";
  const italic = rPr?.["@_i"] === "1";
  const latin = (rPr?.["latin"] as AnyEl | undefined)?.["@_typeface"];

  return {
    id: nextId("t"),
    type: "text",
    x: box.x * scale + offset.x,
    y: box.y * scale + offset.y,
    w: box.w * scale,
    h: box.h * scale,
    text,
    size: sizePx,
    weight: bold ? 700 : 400,
    color,
    align,
    valign: "flex-start",
    lh: 1.2,
    ls: 0,
    italic,
    upper: false,
    font: typeof latin === "string" && latin.trim() ? latin : "Inter",
    opacity: 1,
    accent: false,
    rot: box.rot || undefined,
  };
}

// ── formas ────────────────────────────────────────────────────────────────

const ELLIPSE_PRESETS = new Set(["ellipse", "circle"]);
const ROUND_RECT_PRESETS = new Set(["roundRect", "round2SameRect", "round2DiagRect", "snip1Rect", "snipRoundRect"]);

function buildShapeElement(spPr: AnyEl, box: Box, scale: number, theme: Theme, offset: { x: number; y: number }): AnyEl | null {
  const geom = spPr["prstGeom"] as AnyEl | undefined;
  const prst = String(geom?.["@_prst"] ?? "rect");
  const fill = resolveColor(spPr["solidFill"] as AnyEl | undefined, theme, "transparent");
  const ln = spPr["ln"] as AnyEl | undefined;
  const hasFill = !!(spPr["solidFill"] as AnyEl | undefined);
  const noFill = "noFill" in spPr;
  if (noFill && !ln) return null; // forma totalmente invisível (só usada como âncora de layout)

  const stroke = ln ? resolveColor(ln["solidFill"] as AnyEl | undefined, theme, "#000000") : "#000000";
  const strokeW = ln?.["@_w"] ? Math.max(0, num(ln["@_w"]) * scale) : 0;

  const common = {
    x: box.x * scale + offset.x,
    y: box.y * scale + offset.y,
    w: box.w * scale,
    h: box.h * scale,
    opacity: 1,
    accent: false,
    rot: box.rot || undefined,
  };

  if (ELLIPSE_PRESETS.has(prst)) {
    return { id: nextId("e"), type: "ellipse", fill: hasFill ? fill : "transparent", stroke, strokeW, ...common };
  }
  return {
    id: nextId("r"),
    type: "rect",
    fill: hasFill ? fill : "transparent",
    radius: ROUND_RECT_PRESETS.has(prst) ? Math.round(Math.min(box.w, box.h) * scale * 0.12) : 0,
    stroke,
    strokeW,
    ...common,
  };
}

function buildLineElement(spPr: AnyEl, box: Box, scale: number, theme: Theme, offset: { x: number; y: number }): AnyEl {
  const ln = spPr["ln"] as AnyEl | undefined;
  const color = ln ? resolveColor(ln["solidFill"] as AnyEl | undefined, theme, "#0E110D") : "#0E110D";
  const thicknessEmu = ln?.["@_w"] ? num(ln["@_w"]) : 12700;
  const thicknessPx = Math.max(1, thicknessEmu * scale);

  const wPx = box.w * scale;
  const hPx = box.h * scale;
  const isDiagonal = wPx > 1 && hPx > 1;

  if (!isDiagonal) {
    // linha reta horizontal ou vertical: já é essencialmente uma barra fina.
    return {
      id: nextId("l"),
      type: "line",
      x: box.x * scale + offset.x,
      y: box.y * scale + offset.y,
      w: Math.max(wPx, thicknessPx),
      h: Math.max(hPx, thicknessPx),
      fill: color,
      opacity: 1,
    };
  }

  const length = Math.sqrt(wPx * wPx + hPx * hPx);
  const angle = (Math.atan2(hPx, wPx) * 180) / Math.PI * (box.flipV ? -1 : 1);
  return {
    id: nextId("l"),
    type: "line",
    x: box.x * scale + offset.x,
    y: box.y * scale + offset.y + hPx / 2 - thicknessPx / 2,
    w: length,
    h: thicknessPx,
    fill: color,
    opacity: 1,
    rot: angle,
  };
}

function placeholderElement(box: Box, scale: number, offset: { x: number; y: number }, label: string): AnyEl[] {
  const x = box.x * scale + offset.x;
  const y = box.y * scale + offset.y;
  const w = Math.max(40, box.w * scale);
  const h = Math.max(40, box.h * scale);
  return [
    { id: nextId("r"), type: "rect", x, y, w, h, fill: "transparent", radius: 6, stroke: "#B5694A", strokeW: 2, opacity: 1, accent: false },
    {
      id: nextId("t"), type: "text", x: x + 10, y: y + 10, w: Math.max(20, w - 20), h: Math.max(20, h - 20),
      text: `⚠ Não migrado automaticamente: ${label}. Revise manualmente.`,
      size: Math.max(14, Math.round(Math.min(w, h) * 0.08)),
      weight: 600, color: "#B5694A", align: "left", valign: "flex-start", lh: 1.3, ls: 0,
      italic: false, upper: false, font: "Inter", opacity: 1, accent: false,
    },
  ];
}

// ── imagens ───────────────────────────────────────────────────────────────

function extFromPath(path: string): string {
  const m = /\.([a-z0-9]+)$/i.exec(path);
  return (m?.[1] ?? "png").toLowerCase();
}

function mimeFromExt(ext: string): string {
  if (ext === "jpg" || ext === "jpeg") return "image/jpeg";
  if (ext === "gif") return "image/gif";
  if (ext === "svg") return "image/svg+xml";
  if (ext === "bmp") return "image/bmp";
  return "image/png";
}

async function uploadImage(zip: JSZip, mediaPath: string, importId: string, warnings: string[]): Promise<string | null> {
  const file = zip.file(mediaPath);
  if (!file) {
    warnings.push(`Imagem não encontrada no arquivo: ${mediaPath}`);
    return null;
  }
  try {
    const bytes = await file.async("nodebuffer");
    const ext = extFromPath(mediaPath);
    const path = `pptx-import/${importId}/${nextId("img")}.${ext}`;
    const { error } = await supabaseAdmin().storage.from(BUCKET).upload(path, bytes, {
      contentType: mimeFromExt(ext),
      upsert: true,
    });
    if (error) {
      warnings.push(`Falha ao subir imagem ${mediaPath}: ${error.message}`);
      return null;
    }
    const { data } = supabaseAdmin().storage.from(BUCKET).getPublicUrl(path);
    return data.publicUrl;
  } catch (err) {
    warnings.push(`Falha ao ler imagem ${mediaPath}: ${err instanceof Error ? err.message : String(err)}`);
    return null;
  }
}

// ── tabela (melhor esforço) ─────────────────────────────────────────────

function buildTableElements(tbl: AnyEl, box: Box, scale: number, theme: Theme, offset: { x: number; y: number }): AnyEl[] {
  const grid = arr(tbl["tblGrid"] && (tbl["tblGrid"] as AnyEl)["gridCol"]) as AnyEl[];
  const colWidths = grid.length ? grid.map((c) => num(c["@_w"])) : [box.w];
  const totalW = colWidths.reduce((a, b) => a + b, 0) || box.w;
  const rows = arr(tbl["tr"] as AnyEl[] | AnyEl | undefined);
  const totalH = rows.reduce((sum, r) => sum + num(r["@_h"]), 0) || box.h;

  const els: AnyEl[] = [];
  let yCursor = 0;
  for (const row of rows) {
    const rowH = num(row["@_h"]) || totalH / Math.max(1, rows.length);
    let xCursor = 0;
    const cells = arr(row["tc"] as AnyEl[] | AnyEl | undefined);
    for (let i = 0; i < cells.length; i++) {
      const cell = cells[i];
      const colW = colWidths[i] ?? totalW / Math.max(1, cells.length);
      const cellBox: Box = { x: box.x + xCursor, y: box.y + yCursor, w: colW, h: rowH, rot: 0, flipH: false, flipV: false };
      const tcPr = cell["tcPr"] as AnyEl | undefined;
      const fill = tcPr ? resolveColor(tcPr["solidFill"] as AnyEl | undefined, theme, "transparent") : "transparent";
      els.push({
        id: nextId("r"), type: "rect",
        x: cellBox.x * scale + offset.x, y: cellBox.y * scale + offset.y, w: cellBox.w * scale, h: cellBox.h * scale,
        fill, radius: 0, stroke: "#00000022", strokeW: 1, opacity: 1, accent: false,
      });
      const txBody = cell["txBody"] as AnyEl | undefined;
      if (txBody) {
        const textEl = buildTextElement(txBody, cellBox, scale, theme, offset);
        if (textEl) {
          textEl.w = cellBox.w * scale - 12;
          textEl.h = cellBox.h * scale - 8;
          textEl.x = (textEl.x as number) + 6;
          textEl.y = (textEl.y as number) + 4;
          els.push(textEl);
        }
      }
      xCursor += colW;
    }
    yCursor += rowH;
  }
  return els;
}

// ── caminhada na árvore de formas ───────────────────────────────────────

async function walkTree(
  nodes: AnyEl[],
  zip: JSZip,
  rels: Map<string, string>,
  theme: Theme,
  scale: number,
  offset: { x: number; y: number },
  importId: string,
  warnings: string[],
  parentTransform: { off: Box; chOff: { x: number; y: number; w: number; h: number } } | null,
): Promise<AnyEl[]> {
  const out: AnyEl[] = [];

  for (const node of nodes) {
    // formas simples com texto e/ou preenchimento
    for (const sp of arr(node["sp"] as AnyEl[] | AnyEl | undefined)) {
      const spPr = (sp["spPr"] as AnyEl) ?? {};
      let box = readXfrm(spPr);
      if (!box) continue;
      if (parentTransform) box = applyGroupTransform(box, parentTransform);

      const txBody = sp["txBody"] as AnyEl | undefined;
      const hasGeomFill = "prstGeom" in spPr || "solidFill" in spPr || "ln" in spPr;
      if (hasGeomFill) {
        const geom = spPr["prstGeom"] as AnyEl | undefined;
        const prst = String(geom?.["@_prst"] ?? "");
        if (prst === "line" || prst === "straightConnector1") {
          out.push(buildLineElement(spPr, box, scale, theme, offset));
        } else {
          const shapeEl = buildShapeElement(spPr, box, scale, theme, offset);
          if (shapeEl) out.push(shapeEl);
        }
      }
      if (txBody) {
        const textEl = buildTextElement(txBody, box, scale, theme, offset);
        if (textEl) out.push(textEl);
      }
    }

    // conectores (linhas retas ou diagonais)
    for (const cx of arr(node["cxnSp"] as AnyEl[] | AnyEl | undefined)) {
      const spPr = (cx["spPr"] as AnyEl) ?? {};
      let box = readXfrm(spPr);
      if (!box) continue;
      if (parentTransform) box = applyGroupTransform(box, parentTransform);
      out.push(buildLineElement(spPr, box, scale, theme, offset));
    }

    // imagens
    for (const pic of arr(node["pic"] as AnyEl[] | AnyEl | undefined)) {
      const spPr = (pic["spPr"] as AnyEl) ?? {};
      let box = readXfrm(spPr);
      if (!box) continue;
      if (parentTransform) box = applyGroupTransform(box, parentTransform);

      const blip = (pic["blipFill"] as AnyEl | undefined)?.["blip"] as AnyEl | undefined;
      const rId = blip?.["@_embed"];
      const mediaPath = typeof rId === "string" ? rels.get(rId) : undefined;
      const url = mediaPath ? await uploadImage(zip, mediaPath, importId, warnings) : null;

      if (url) {
        out.push({
          id: nextId("i"), type: "image",
          x: box.x * scale + offset.x, y: box.y * scale + offset.y, w: box.w * scale, h: box.h * scale,
          src: url, fit: "cover", radius: 0, opacity: 1, accent: false, rot: box.rot || undefined,
        });
      } else {
        out.push(...placeholderElement(box, scale, offset, "imagem"));
      }
    }

    // grupos: resolve a transformação e desce recursivamente (achatando)
    for (const grp of arr(node["grpSp"] as AnyEl[] | AnyEl | undefined)) {
      const grpSpPr = (grp["grpSpPr"] as AnyEl) ?? {};
      let groupBox = readXfrm(grpSpPr);
      if (!groupBox) continue;
      if (parentTransform) groupBox = applyGroupTransform(groupBox, parentTransform);

      const xfrm = grpSpPr["xfrm"] as AnyEl | undefined;
      const chOffNode = xfrm?.["chOff"] as AnyEl | undefined;
      const chExtNode = xfrm?.["chExt"] as AnyEl | undefined;
      const chOff = {
        x: num(chOffNode?.["@_x"]),
        y: num(chOffNode?.["@_y"]),
        w: num(chExtNode?.["@_cx"]) || 1,
        h: num(chExtNode?.["@_cy"]) || 1,
      };

      const children = await walkTree([grp], zip, rels, theme, scale, offset, importId, warnings, { off: groupBox, chOff });
      out.push(...children);
    }

    // tabelas, gráficos, SmartArt, OLE
    for (const gf of arr(node["graphicFrame"] as AnyEl[] | AnyEl | undefined)) {
      const gfXfrm = gf["xfrm"] as AnyEl | undefined;
      const off = gfXfrm?.["off"] as AnyEl | undefined;
      const ext = gfXfrm?.["ext"] as AnyEl | undefined;
      let box: Box = {
        x: num(off?.["@_x"]), y: num(off?.["@_y"]), w: num(ext?.["@_cx"]), h: num(ext?.["@_cy"]),
        rot: 0, flipH: false, flipV: false,
      };
      if (parentTransform) box = applyGroupTransform(box, parentTransform);

      const graphicData = (gf["graphic"] as AnyEl | undefined)?.["graphicData"] as AnyEl | undefined;
      const tbl = graphicData?.["tbl"] as AnyEl | undefined;
      if (tbl) {
        out.push(...buildTableElements(tbl, box, scale, theme, offset));
      } else {
        const uri = String(graphicData?.["@_uri"] ?? "");
        const label = uri.includes("chart") ? "gráfico" : uri.includes("diagram") ? "SmartArt" : "objeto incorporado";
        out.push(...placeholderElement(box, scale, offset, label));
        warnings.push(`Slide com ${label} não migrado automaticamente (posição preservada como aviso).`);
      }
    }
  }

  return out;
}

// ── slide → página ──────────────────────────────────────────────────────

function resolveRelPath(basePath: string, target: string): string {
  if (target.startsWith("/")) return target.slice(1);
  const baseParts = basePath.split("/").slice(0, -1);
  const targetParts = target.split("/");
  for (const part of targetParts) {
    if (part === "..") baseParts.pop();
    else if (part !== ".") baseParts.push(part);
  }
  return baseParts.join("/");
}

// relsPath = caminho do arquivo .rels; ownerPath = caminho da parte dona
// desse .rels (os alvos dentro do .rels são relativos à PASTA dessa parte,
// não à pasta _rels/ onde o .rels em si mora).
async function loadRels(zip: JSZip, relsPath: string, ownerPath: string): Promise<Map<string, string>> {
  const map = new Map<string, string>();
  const file = zip.file(relsPath);
  if (!file) return map;
  try {
    const xml = parser.parse(await file.async("text"));
    const rels = arr(xml?.Relationships?.Relationship as AnyEl[] | AnyEl | undefined);
    for (const rel of rels) {
      const id = rel["@_Id"];
      const target = rel["@_Target"];
      const mode = rel["@_TargetMode"];
      if (typeof id === "string" && typeof target === "string" && mode !== "External") {
        map.set(id, resolveRelPath(ownerPath, target));
      }
    }
  } catch {
    // sem rels: segue sem imagens resolvidas nesse slide.
  }
  return map;
}

export async function importPptx(buffer: Buffer, importId: string): Promise<PptxImportResult> {
  const warnings: string[] = [];
  const zip = await JSZip.loadAsync(buffer);

  const presentationXmlPath = "ppt/presentation.xml";
  const presentationFile = zip.file(presentationXmlPath);
  if (!presentationFile) throw new Error("Arquivo .pptx inválido: presentation.xml não encontrado.");

  const presentation = parser.parse(await presentationFile.async("text"));
  const sldSz = presentation?.presentation?.sldSz;
  const slideW = num(sldSz?.["@_cx"], 12192000);
  const slideH = num(sldSz?.["@_cy"], 6858000);

  const scale = Math.min(TARGET_W / slideW, TARGET_H / slideH);
  const offset = { x: (TARGET_W - slideW * scale) / 2, y: (TARGET_H - slideH * scale) / 2 };

  const theme = await loadTheme(zip);
  const presRels = await loadRels(zip, "ppt/_rels/presentation.xml.rels", presentationXmlPath);

  const sldIds = arr(presentation?.presentation?.sldIdLst?.sldId as AnyEl[] | AnyEl | undefined);
  const slidePaths: string[] = [];
  for (const sldId of sldIds) {
    const rId = sldId["@_id"];
    const target = typeof rId === "string" ? presRels.get(rId) : undefined;
    if (target) slidePaths.push(target);
  }

  const pages: SlidePage[] = [];

  for (const slidePath of slidePaths) {
    const slideFile = zip.file(slidePath);
    if (!slideFile) continue;
    const slideXml = parser.parse(await slideFile.async("text"));
    const slideParts = slidePath.split("/");
    const relsPath = [...slideParts.slice(0, -1), "_rels", `${slideParts[slideParts.length - 1]}.rels`].join("/");
    const rels = await loadRels(zip, relsPath, slidePath);

    const cSld = slideXml?.sld?.cSld;
    const spTree = cSld?.spTree;

    const bgFill = cSld?.bg?.bgPr as AnyEl | undefined;
    const bgColor = bgFill ? resolveColor(bgFill["solidFill"] as AnyEl | undefined, theme, "#FFFFFF") : "#FFFFFF";

    const els = spTree ? await walkTree([spTree], zip, rels, theme, scale, offset, importId, warnings, null) : [];

    pages.push({ bg: { type: "color", color: bgColor }, els });
  }

  if (!pages.length) throw new Error("Nenhum slide encontrado no arquivo.");

  return { pages, warnings };
}
