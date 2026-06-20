"use client";

import html2canvas from "html2canvas";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { CSSProperties, MouseEvent as ReactMouseEvent, PointerEvent as ReactPointerEvent } from "react";
import type { Accent } from "../../lib/accents";
import type { Material } from "../../lib/materiais-data";
import styles from "./CreativeEditor.module.css";

type Format = "feed" | "story" | "slide";
type EditorMode = "artes" | "slides";
type Fx = "none" | "from" | "lumen" | "mist" | "halo" | "bloom";
type VisualFx = "none" | "distort";
type ModelId = "manchete" | "cartaz" | "editorial" | "convite" | "capa" | "titulo";
type FontId = "Inter" | "JetBrains Mono";
type Align = "left" | "center" | "right";

type TextBox = {
  id: string;
  text: string;
  x: number;
  y: number;
  width: number;
  size: number;
  color: string;
  bold: boolean;
  italic: boolean;
  underline: boolean;
  strike: boolean;
  uppercase: boolean;
  lineHeight: number;
  font: FontId;
  align: Align;
  highlight: string | null;
  gem: boolean;
};

type Deco = {
  type: "frame" | "bigframe";
  rect: Partial<Record<Format, [number, number, number, number]>>;
  sideTag?: string;
};

type PhotoState = {
  url: string | null;
  x: number;
  y: number;
  zoom: number;
};

type Scene = {
  bg: string;
  fxColor: string;
  fmt: Format;
  formats: Format[];
  model: ModelId;
  kind: "arte" | "ppt";
  selectedId: string | null;
  selectedIds: string[];
  boxes: TextBox[];
  photo: PhotoState;
  photoFx: Fx;
  visualFx: VisualFx;
  bgPhoto: boolean;
  blurBg: boolean;
  deco: Deco | null;
  counter: number;
};

type DragState =
  | { type: "move"; ids: string[]; id: string; startX: number; startY: number; boxes: { id: string; x: number; y: number }[]; moved: boolean; openEditOnClick: boolean; startScene: Scene }
  | { type: "resize"; ids: string[]; startX: number; startY: number; bounds: Bounds; boxes: ResizeBoxStart[]; startScene: Scene }
  | { type: "photo"; startX: number; startY: number; x: number; y: number }
  | { type: "select"; startX: number; startY: number; x: number; y: number; additive: boolean };

type Bounds = { x: number; y: number; w: number; h: number };

type ResizeBoxStart = {
  id: string;
  x: number;
  y: number;
  width: number;
  size: number;
  height: number;
};

type Popover =
  | { kind: "font"; x: number; y: number }
  | { kind: "textColor"; x: number; y: number }
  | { kind: "highlight"; x: number; y: number }
  | { kind: "bg"; x: number; y: number }
  | { kind: "lineHeight"; x: number; y: number }
  | { kind: "magic"; x: number; y: number }
  | null;

type CreativeEditorProps = {
  mode: EditorMode;
  material: Material;
  accent: Accent;
  backHref: string;
  templates?: StudioTemplateOption[];
};

type StudioTemplateOption = {
  id: string;
  module: "design" | "slides";
  name: string;
  description: string;
  payload: {
    modelId?: ModelId;
  };
};

const DIMS: Record<Format, { w: number; h: number; label: string }> = {
  feed: { w: 1080, h: 1350, label: "Feed 4:5" },
  story: { w: 1080, h: 1920, label: "Stories 9:16" },
  slide: { w: 1920, h: 1080, label: "Slide 16:9" },
};

const BRAND = {
  ink: "#0E110D",
  graphite: "#181B16",
  graphite2: "#14170F",
  border: "#25291F",
  border2: "#2E3327",
  cream: "#EDE6D3",
  light: "#E6E5DD",
  white: "#FAFAF7",
  muted: "#8B8C82",
  subtle: "#555650",
  olive: "#7A9E3F",
  oliveSoft: "#94B85C",
  oliveDeep: "#4F6B26",
  sand: "#E2D6B4",
  wheat: "#CBA95C",
  amber: "#D6A23E",
  clay: "#C5805A",
  terra: "#B5694A",
  rust: "#9C5A33",
  cocoa: "#6F523A",
};

const BRAND_COLORS = [
  { name: "Cream", value: BRAND.cream },
  { name: "White", value: BRAND.white },
  { name: "Light", value: BRAND.light },
  { name: "Muted", value: BRAND.muted },
  { name: "Subtle", value: BRAND.subtle },
  { name: "Ink", value: BRAND.ink },
  { name: "Graphite", value: BRAND.graphite },
  { name: "Olive", value: BRAND.olive },
  { name: "Sand", value: BRAND.sand },
  { name: "Wheat", value: BRAND.wheat },
  { name: "Amber", value: BRAND.amber },
  { name: "Clay", value: BRAND.clay },
  { name: "Terra", value: BRAND.terra },
  { name: "Rust", value: BRAND.rust },
  { name: "Cocoa", value: BRAND.cocoa },
];

const PHOTO_EFFECTS: { id: Exclude<Fx, "none">; label: string }[] = [
  { id: "from", label: "from" },
  { id: "lumen", label: "lumen" },
  { id: "mist", label: "mist" },
  { id: "halo", label: "halo" },
  { id: "bloom", label: "bloom" },
];

const VISUAL_EFFECTS: { id: Exclude<VisualFx, "none">; label: string }[] = [
  { id: "distort", label: "distorção" },
];

const MODELS_ARTE: { id: ModelId; label: string; desc: string }[] = [
  { id: "manchete", label: "Manchete", desc: "título sobre foto" },
  { id: "cartaz", label: "Cartaz", desc: "fundo acento + moldura" },
  { id: "editorial", label: "Editorial", desc: "foto emoldurada" },
  { id: "convite", label: "Convite", desc: "tipografia pura" },
];

const MODELS_PPT: { id: ModelId; label: string; desc: string }[] = [
  { id: "capa", label: "Capa", desc: "título grande" },
  { id: "titulo", label: "Título", desc: "fundo sólido" },
];

const FONTS: FontId[] = ["Inter", "JetBrains Mono"];
const LINE_HEIGHTS = [0.9, 1, 1.15, 1.3, 1.5];

function stripMessagePrefix(text: string) {
  return text.replace(/^Mensagem\s+\d+:\s*/i, "").replace(/^Lição\s+\d+:\s*/i, "");
}

function shortText(text: string, max = 108) {
  if (text.length <= max) return text;
  return `${text.slice(0, max - 1).trimEnd()}.`;
}

function cloneScene(scene: Scene): Scene {
  return {
    ...scene,
    selectedIds: [...scene.selectedIds],
    photo: { ...scene.photo },
    boxes: scene.boxes.map((item) => ({ ...item })),
    deco: scene.deco ? { ...scene.deco, rect: { ...scene.deco.rect } } : null,
  };
}

function clamp(value: number, min: number, max: number) {
  return Math.max(min, Math.min(max, value));
}

function boxHeight(item: TextBox) {
  const lines = Math.max(1, item.text.split("\n").length);
  return item.size * item.lineHeight * lines;
}

function boundsForBoxes(boxes: TextBox[]): Bounds | null {
  if (!boxes.length) return null;
  const left = Math.min(...boxes.map((item) => item.x));
  const top = Math.min(...boxes.map((item) => item.y));
  const right = Math.max(...boxes.map((item) => item.x + item.width));
  const bottom = Math.max(...boxes.map((item) => item.y + boxHeight(item)));
  return { x: left, y: top, w: right - left, h: bottom - top };
}

function rectsIntersect(a: Bounds, b: Bounds) {
  return a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;
}

function box(partial: Partial<TextBox> & Pick<TextBox, "id" | "text">): TextBox {
  return {
    x: 96,
    y: 120,
    width: 820,
    size: 72,
    color: BRAND.cream,
    bold: false,
    italic: false,
    underline: false,
    strike: false,
    uppercase: false,
    lineHeight: 1,
    font: "Inter",
    align: "left",
    highlight: null,
    gem: false,
    ...partial,
  };
}

function scaled(value: number, fmt: Format) {
  return fmt === "slide" ? value : value * (DIMS[fmt].w / 1080);
}

function makeScene(model: ModelId, mode: EditorMode, material: Material, accent: Accent, fmt?: Format): Scene {
  const firstFormat: Format = fmt ?? (mode === "slides" ? "slide" : "feed");
  const first = stripMessagePrefix(material.conteudo[0] ?? material.promessa);
  const second = stripMessagePrefix(material.conteudo[1] ?? material.comoUsar);
  const base: Pick<Scene, "photo" | "selectedId" | "selectedIds" | "counter" | "visualFx"> = {
    photo: { url: null, x: 0, y: 0, zoom: 1 },
    selectedId: "title",
    selectedIds: ["title"],
    counter: 0,
    visualFx: "none",
  };

  if (model === "cartaz") {
    return {
      ...base,
      model,
      kind: "arte",
      formats: ["feed", "story"],
      fmt: firstFormat,
      bg: accent.base,
      fxColor: BRAND.ink,
      photoFx: "from",
      bgPhoto: false,
      blurBg: false,
      deco: {
        type: "frame",
        rect: {
          feed: [560, 360, 440, 640],
          story: [560, 560, 440, 820],
        },
      },
      boxes: [
        box({ id: "kicker", text: material.etiqueta, color: BRAND.ink, size: scaled(44, firstFormat), uppercase: true, gem: true, width: scaled(440, firstFormat), x: scaled(96, firstFormat), y: firstFormat === "story" ? 200 : 150 }),
        box({ id: "title", text: material.titulo, color: BRAND.ink, size: scaled(150, firstFormat), bold: true, lineHeight: 0.92, width: scaled(470, firstFormat), x: scaled(96, firstFormat), y: firstFormat === "story" ? 620 : 470 }),
        box({ id: "meta", text: shortText(material.promessa, 62), color: BRAND.ink, size: scaled(46, firstFormat), font: "JetBrains Mono", lineHeight: 1.5, width: scaled(500, firstFormat), x: scaled(96, firstFormat), y: firstFormat === "story" ? 1460 : 1040 }),
      ],
    };
  }

  if (model === "editorial") {
    return {
      ...base,
      model,
      kind: "arte",
      formats: ["feed", "story"],
      fmt: firstFormat,
      bg: BRAND.ink,
      fxColor: accent.base,
      photoFx: "from",
      bgPhoto: false,
      blurBg: true,
      deco: {
        type: "bigframe",
        rect: {
          feed: [150, 330, 780, 690],
          story: [150, 520, 780, 880],
        },
        sideTag: "CE.X · CAMPUS EXPANSÃO",
      },
      boxes: [
        box({ id: "title", text: material.titulo, color: BRAND.cream, size: scaled(118, firstFormat), bold: true, align: "center", lineHeight: 0.92, width: scaled(920, firstFormat), x: scaled(80, firstFormat), y: firstFormat === "story" ? 180 : 120 }),
        box({ id: "foot", text: material.etiqueta, color: BRAND.cream, size: scaled(30, firstFormat), font: "JetBrains Mono", uppercase: true, align: "center", width: scaled(920, firstFormat), x: scaled(80, firstFormat), y: firstFormat === "story" ? 1778 : 1238 }),
      ],
    };
  }

  if (model === "convite") {
    return {
      ...base,
      model,
      kind: "arte",
      formats: ["feed", "story"],
      fmt: firstFormat,
      bg: BRAND.ink,
      fxColor: accent.base,
      photoFx: "from",
      bgPhoto: false,
      blurBg: false,
      deco: null,
      boxes: [
        box({ id: "kicker", text: material.etiqueta, color: BRAND.white, size: scaled(38, firstFormat), uppercase: true, gem: true, width: scaled(700, firstFormat), x: scaled(96, firstFormat), y: firstFormat === "story" ? 150 : 120 }),
        box({ id: "title", text: material.titulo, color: BRAND.white, size: scaled(142, firstFormat), bold: true, lineHeight: 0.94, width: scaled(850, firstFormat), x: scaled(96, firstFormat), y: firstFormat === "story" ? 980 : 650 }),
        box({ id: "meta", text: `${material.meta.paginas} páginas\n${material.meta.formatos.join(" · ")}`, color: BRAND.cream, size: scaled(42, firstFormat), font: "JetBrains Mono", lineHeight: 1.5, width: scaled(780, firstFormat), x: scaled(96, firstFormat), y: firstFormat === "story" ? 1570 : 1110 }),
        box({ id: "foot", text: "Feito com CE.X", color: accent.base, size: scaled(28, firstFormat), font: "JetBrains Mono", uppercase: true, width: scaled(600, firstFormat), x: scaled(96, firstFormat), y: firstFormat === "story" ? 1825 : 1285 }),
      ],
    };
  }

  if (model === "capa") {
    return {
      ...base,
      model,
      kind: "ppt",
      formats: ["slide"],
      fmt: "slide",
      bg: BRAND.ink,
      fxColor: accent.base,
      photoFx: "from",
      bgPhoto: true,
      blurBg: false,
      deco: null,
      boxes: [
        box({ id: "kicker", text: material.etiqueta, color: BRAND.white, size: 40, uppercase: true, gem: true, width: 900, x: 110, y: 150 }),
        box({ id: "title", text: material.titulo, color: BRAND.white, size: 150, bold: true, lineHeight: 0.94, width: 1180, x: 110, y: 420 }),
        box({ id: "sub", text: shortText(material.promessa, 90), color: BRAND.cream, size: 46, font: "JetBrains Mono", width: 1100, x: 110, y: 760 }),
      ],
    };
  }

  if (model === "titulo") {
    return {
      ...base,
      model,
      kind: "ppt",
      formats: ["slide"],
      fmt: "slide",
      bg: BRAND.ink,
      fxColor: accent.base,
      photoFx: "from",
      bgPhoto: false,
      blurBg: false,
      deco: null,
      boxes: [
        box({ id: "kicker", text: material.etiqueta, color: accent.base, size: 38, uppercase: true, gem: true, width: 900, x: 130, y: 170 }),
        box({ id: "title", text: first, color: BRAND.cream, size: 130, bold: true, lineHeight: 0.94, width: 1200, x: 130, y: 400 }),
        box({ id: "sub", text: second, color: BRAND.muted, size: 44, font: "JetBrains Mono", width: 1080, x: 130, y: 720 }),
      ],
    };
  }

  return {
    ...base,
    model: "manchete",
    kind: "arte",
    formats: ["feed", "story"],
    fmt: firstFormat,
    bg: BRAND.ink,
    fxColor: accent.base,
    photoFx: "from",
    bgPhoto: true,
    blurBg: false,
    deco: null,
    boxes: [
      box({ id: "kicker", text: material.etiqueta, color: BRAND.white, size: scaled(40, firstFormat), uppercase: true, gem: true, width: scaled(800, firstFormat), x: scaled(96, firstFormat), y: firstFormat === "story" ? 150 : 120 }),
      box({ id: "title", text: first, color: BRAND.white, size: scaled(138, firstFormat), bold: true, lineHeight: 0.94, width: scaled(880, firstFormat), x: scaled(96, firstFormat), y: firstFormat === "story" ? 850 : 560 }),
      box({ id: "meta", text: shortText(material.promessa, 82), color: BRAND.cream, size: scaled(46, firstFormat), font: "JetBrains Mono", lineHeight: 1.5, width: scaled(820, firstFormat), x: scaled(96, firstFormat), y: firstFormat === "story" ? 1600 : 1130 }),
    ],
  };
}

function preserveTexts(next: Scene, previous: Scene) {
  return {
    ...next,
    photo: { ...previous.photo },
    boxes: next.boxes.map((item) => {
      const old = previous.boxes.find((boxItem) => boxItem.id === item.id);
      return old ? { ...item, text: old.text } : item;
    }),
  };
}

function PhotoLayers({ scene }: { scene: Scene }) {
  const transform = `translate(${scene.photo.x}px, ${scene.photo.y}px) scale(${scene.photo.zoom})`;
  const photoStyle = scene.photo.url
    ? {
        backgroundImage: `url("${scene.photo.url}")`,
        transform,
      }
    : {
        background: BRAND.graphite,
        transform,
      };

  return (
    <div className={styles.photo}>
      <div className={styles.photoBase} style={photoStyle} />
      <div className={`${styles.overlay} ${styles.overlayTint}`} />
      <div className={`${styles.overlay} ${styles.overlayHalf}`} />
      <div className={`${styles.overlay} ${styles.overlayGrain}`} />
      <div className={`${styles.overlay} ${styles.overlayVignette}`} />
      <div className={`${styles.overlay} ${styles.overlayGlow}`} />
    </div>
  );
}

function VisualFxLayer({ scene }: { scene: Scene }) {
  if (scene.visualFx === "none") return null;
  const visualStyle = {
    "--distort-image": scene.photo.url ? `url("${scene.photo.url}")` : "none",
    "--distort-x": `${scene.photo.x}px`,
    "--distort-y": `${scene.photo.y}px`,
    "--distort-zoom": scene.photo.zoom,
  } as CSSProperties;

  return (
    <div className={styles.visualFx} data-visual-fx={scene.visualFx} style={visualStyle} aria-hidden="true">
      <span className={styles.fxWarpBottom} />
      <span className={styles.fxWarpLeft} />
      <span className={styles.fxWarpRight} />
      <span className={styles.fxWarpTop} />
      <span className={styles.fxWarpTunnel} />
      <span className={styles.fxWarpGrain} />
    </div>
  );
}

function DecoLayer({ scene, onPointerDown }: { scene: Scene; onPointerDown: (event: ReactPointerEvent) => void }) {
  if (!scene.deco) return null;

  const rect = scene.deco.rect[scene.fmt];
  if (!rect) return null;
  const [left, top, width, height] = rect;

  return (
    <>
      {scene.deco.type === "bigframe" ? (
        <>
          <div className={`${styles.sideTag} ${styles.sideTagLeft}`}>{scene.deco.sideTag}</div>
          <div className={`${styles.sideTag} ${styles.sideTagRight}`}>{scene.deco.sideTag}</div>
        </>
      ) : null}
      <div
        className={styles.decoFrame}
        data-photo="1"
        style={{ left, top, width, height, borderColor: scene.deco.type === "frame" ? scene.fxColor : "rgba(250, 250, 247, 0.66)" }}
        onPointerDown={onPointerDown}
      >
        <PhotoLayers scene={scene} />
      </div>
    </>
  );
}

export function CreativeEditor({ mode, material, accent, backHref, templates = [] }: CreativeEditorProps) {
  const firstModel: ModelId = mode === "slides" ? "capa" : "manchete";
  const [scene, setScene] = useState(() => makeScene(firstModel, mode, material, accent));
  const [past, setPast] = useState<Scene[]>([]);
  const [scale, setScale] = useState(0.4);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [popover, setPopover] = useState<Popover>(null);
  const [toast, setToast] = useState("");
  const [clipboard, setClipboard] = useState<TextBox | null>(null);
  const [clipboardGroup, setClipboardGroup] = useState<TextBox[] | null>(null);
  const [paintBuffer, setPaintBuffer] = useState<Partial<TextBox> | null>(null);
  const [selectionRect, setSelectionRect] = useState<Bounds | null>(null);
  const stageRef = useRef<HTMLDivElement>(null);
  const boardRef = useRef<HTMLDivElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const dragRef = useRef<DragState | null>(null);
  const lastToast = useRef<number | null>(null);
  const dim = DIMS[scene.fmt];
  const selected = scene.boxes.find((item) => item.id === scene.selectedId) ?? null;
  const selectedIds = scene.selectedIds.length ? scene.selectedIds : (scene.selectedId ? [scene.selectedId] : []);
  const selectedIdSet = useMemo(() => new Set(selectedIds), [selectedIds]);
  const selectedBoxes = useMemo(
    () => scene.boxes.filter((item) => selectedIdSet.has(item.id)),
    [scene.boxes, selectedIdSet],
  );
  const selectedBounds = useMemo(() => boundsForBoxes(selectedBoxes), [selectedBoxes]);
  const fallbackModels = mode === "slides" ? MODELS_PPT : MODELS_ARTE;
  const templateModels = templates
    .filter((template) => template.module === (mode === "slides" ? "slides" : "design"))
    .map((template) => {
      const modelId = template.payload?.modelId;
      const fallback = fallbackModels.find((item) => item.id === modelId);
      if (!modelId || !fallback) return null;
      return {
        id: modelId,
        label: template.name || fallback.label,
        desc: template.description || fallback.desc,
        templateId: template.id,
      };
    })
    .filter((item): item is { id: ModelId; label: string; desc: string; templateId: string } => Boolean(item));
  const models = templateModels.length ? templateModels : fallbackModels;
  const title = mode === "slides" ? "Apresentação em slides" : "Artes para redes sociais";

  const showToast = useCallback((message: string) => {
    setToast(message);
    if (lastToast.current) window.clearTimeout(lastToast.current);
    lastToast.current = window.setTimeout(() => setToast(""), 1800);
  }, []);

  const commit = useCallback((mutator: (current: Scene) => Scene) => {
    setScene((current) => {
      setPast((items) => [...items.slice(-24), cloneScene(current)]);
      return mutator(cloneScene(current));
    });
  }, []);

  const updateWithoutHistory = useCallback((mutator: (current: Scene) => Scene) => {
    setScene((current) => mutator(cloneScene(current)));
  }, []);

  const selectedState = useMemo(() => ({
    bold: selected?.bold ?? false,
    italic: selected?.italic ?? false,
    underline: selected?.underline ?? false,
    strike: selected?.strike ?? false,
    uppercase: selected?.uppercase ?? false,
  }), [selected]);

  const openPopover = useCallback((event: ReactMouseEvent<HTMLElement>, kind: Exclude<Popover, null>["kind"]) => {
    event.preventDefault();
    const rect = event.currentTarget.getBoundingClientRect();
    setPopover((current) =>
      current?.kind === kind ? null : { kind, x: Math.min(rect.left, window.innerWidth - 280), y: rect.bottom + 8 },
    );
  }, []);

  const applySelected = useCallback((mutator: (box: TextBox) => TextBox) => {
    if (!selectedIds.length) return;
    commit((current) => ({
      ...current,
      boxes: current.boxes.map((item) => (selectedIds.includes(item.id) ? mutator({ ...item }) : item)),
    }));
  }, [commit, selectedIds]);

  const selectBox = useCallback((id: string, additive = false) => {
    if (paintBuffer) {
      commit((current) => ({
        ...current,
        selectedId: id,
        selectedIds: [id],
        boxes: current.boxes.map((item) => (item.id === id ? { ...item, ...paintBuffer } : item)),
      }));
      setPaintBuffer(null);
      showToast("Estilo aplicado");
      return;
    }
    updateWithoutHistory((current) => {
      if (!additive) return { ...current, selectedId: id, selectedIds: [id] };
      const exists = current.selectedIds.includes(id);
      const selectedIds = exists
        ? current.selectedIds.filter((itemId) => itemId !== id)
        : [...current.selectedIds, id];
      return { ...current, selectedId: selectedIds.at(-1) ?? null, selectedIds };
    });
  }, [commit, paintBuffer, showToast, updateWithoutHistory]);

  const undo = useCallback(() => {
    setPast((items) => {
      const previous = items.at(-1);
      if (!previous) return items;
      setScene((current) => ({
        ...previous,
        selectedId: previous.selectedId ?? current.selectedId,
        selectedIds: previous.selectedIds.length ? previous.selectedIds : current.selectedIds,
      }));
      return items.slice(0, -1);
    });
  }, []);

  const deleteSelected = useCallback(() => {
    if (!selectedIds.length) return;
    commit((current) => {
      const boxes = current.boxes.filter((item) => !selectedIds.includes(item.id));
      const selectedId = boxes.at(-1)?.id ?? null;
      return { ...current, boxes, selectedId, selectedIds: selectedId ? [selectedId] : [] };
    });
  }, [commit, selectedIds]);

  const pasteBox = useCallback(() => {
    const source = clipboardGroup?.length ? clipboardGroup : (clipboard ? [clipboard] : []);
    if (!source.length) return;
    const stamp = Date.now();
    const nextIds = source.map((_, index) => `box-${stamp}-${index}`);
    commit((current) => ({
      ...current,
      counter: current.counter + source.length,
      selectedId: nextIds.at(-1) ?? null,
      selectedIds: nextIds,
      boxes: [
        ...current.boxes,
        ...source.map((item, index) => ({
          ...item,
          id: nextIds[index],
          x: clamp(item.x + 40, 0, dim.w - item.width),
          y: clamp(item.y + 40, 0, dim.h - item.size),
        })),
      ],
    }));
  }, [clipboard, clipboardGroup, commit, dim.h, dim.w]);

  const duplicateSelected = useCallback(() => {
    if (!selectedBoxes.length) return;
    const stamp = Date.now();
    const nextIds = selectedBoxes.map((_, index) => `box-${stamp}-${index}`);
    commit((current) => ({
      ...current,
      counter: current.counter + selectedBoxes.length,
      selectedId: nextIds.at(-1) ?? null,
      selectedIds: nextIds,
      boxes: [
        ...current.boxes,
        ...selectedBoxes.map((item, index) => ({
          ...item,
          id: nextIds[index],
          x: clamp(item.x + 40, 0, dim.w - item.width),
          y: clamp(item.y + 40, 0, dim.h - item.size),
        })),
      ],
    }));
  }, [commit, dim.h, dim.w, selectedBoxes]);

  const addTextBox = useCallback(() => {
    const nextId = `box-${Date.now()}`;
    commit((current) => ({
      ...current,
      counter: current.counter + 1,
      selectedId: nextId,
      selectedIds: [nextId],
      boxes: [
        ...current.boxes,
        box({
          id: nextId,
          text: "Toque pra editar",
          x: Math.round(dim.w / 2 - 260),
          y: Math.round(dim.h / 2 - 50),
          width: Math.round(dim.w * 0.58),
          size: Math.round(dim.w * 0.067),
          color: BRAND.cream,
        }),
      ],
    }));
  }, [commit, dim.h, dim.w]);

  function chooseModel(model: ModelId) {
    commit((current) => preserveTexts(makeScene(model, mode, material, accent, current.fmt), current));
    setPopover(null);
  }

  function changeFormat(nextFmt: Format) {
    if (nextFmt === scene.fmt) return;
    const oldDim = DIMS[scene.fmt];
    const nextDim = DIMS[nextFmt];
    commit((current) => ({
      ...current,
      fmt: nextFmt,
      boxes: current.boxes.map((item) => ({
        ...item,
        x: Math.round((item.x / oldDim.w) * nextDim.w),
        y: Math.round((item.y / oldDim.h) * nextDim.h),
        width: Math.round((item.width / oldDim.w) * nextDim.w),
        size: Math.round(item.size * (nextDim.w / oldDim.w)),
      })),
      photo: {
        ...current.photo,
        x: Math.round((current.photo.x / oldDim.w) * nextDim.w),
        y: Math.round((current.photo.y / oldDim.h) * nextDim.h),
      },
    }));
  }

  function changePhotoFx(photoFx: Exclude<Fx, "none">) {
    commit((current) => ({ ...current, photoFx: current.photoFx === photoFx ? "none" : photoFx }));
  }

  function changeVisualFx(visualFx: Exclude<VisualFx, "none">) {
    commit((current) => ({ ...current, visualFx: current.visualFx === visualFx ? "none" : visualFx }));
  }

  function chooseColor(value: string, target: "text" | "highlight" | "bg") {
    if (target === "bg") {
      commit((current) => ({ ...current, bg: value }));
      setPopover(null);
      return;
    }

    applySelected((item) => ({ ...item, [target === "text" ? "color" : "highlight"]: value }));
    setPopover(null);
  }

  function applyMagic(value: string) {
    applySelected((item) => ({ ...item, text: value }));
    setPopover(null);
  }

  function setBackgroundPhoto(file: File | undefined) {
    if (!file) return;
    const url = URL.createObjectURL(file);
    commit((current) => ({
      ...current,
      photo: { ...current.photo, url },
      bgPhoto: true,
      blurBg: false,
    }));
    showToast("Foto carregada");
  }

  function startAreaSelection(event: ReactPointerEvent<HTMLElement>) {
    const target = event.target as HTMLElement;
    if (target.closest(`.${styles.textBox}, .${styles.resize}, [data-photo='1']`)) return;
    const board = boardRef.current;
    if (!board) return;
    const rect = board.getBoundingClientRect();
    const x = (event.clientX - rect.left) / scale;
    const y = (event.clientY - rect.top) / scale;
    dragRef.current = {
      type: "select",
      startX: event.clientX,
      startY: event.clientY,
      x,
      y,
      additive: event.shiftKey || event.metaKey || event.ctrlKey,
    };
    if (!event.shiftKey && !event.metaKey && !event.ctrlKey) {
      updateWithoutHistory((current) => ({ ...current, selectedId: null, selectedIds: [] }));
    }
    setSelectionRect({ x, y, w: 0, h: 0 });
    event.preventDefault();
  }

  async function exportPng() {
    if (!boardRef.current) return;
    const node = boardRef.current;
    const selectedId = scene.selectedId;
    const selectedIds = scene.selectedIds;
    const transform = node.style.transform;

    updateWithoutHistory((current) => ({ ...current, selectedId: null, selectedIds: [] }));
    await document.fonts?.ready;
    await new Promise((resolve) => window.setTimeout(resolve, 60));

    try {
      node.style.transform = "none";
      const canvas = await html2canvas(node, {
        backgroundColor: scene.bg,
        scale: 2,
        width: dim.w,
        height: dim.h,
      });
      const anchor = document.createElement("a");
      anchor.download = `${material.id}-${mode}-${scene.fmt}-cex.png`;
      anchor.href = canvas.toDataURL("image/png");
      anchor.click();
      showToast("Imagem baixada");
    } catch (error) {
      console.error(error);
      showToast("Erro ao exportar");
    } finally {
      node.style.transform = transform;
      updateWithoutHistory((current) => ({ ...current, selectedId, selectedIds }));
    }
  }

  useEffect(() => {
    function fit() {
      const host = stageRef.current;
      if (!host) return;
      const max = scene.fmt === "slide" ? Math.min(host.clientWidth, 680) : Math.min(host.clientWidth, 460);
      setScale(max / DIMS[scene.fmt].w);
    }

    fit();
    const observer = new ResizeObserver(fit);
    if (stageRef.current) observer.observe(stageRef.current);
    window.addEventListener("resize", fit);
    return () => {
      observer.disconnect();
      window.removeEventListener("resize", fit);
    };
  }, [scene.fmt]);

  useEffect(() => {
    function onPointerMove(event: PointerEvent) {
      const drag = dragRef.current;
      if (!drag) return;
      const dx = (event.clientX - drag.startX) / scale;
      const dy = "startY" in drag ? (event.clientY - drag.startY) / scale : 0;

      if (drag.type === "select") {
        const rect = {
          x: Math.min(drag.x, drag.x + dx),
          y: Math.min(drag.y, drag.y + dy),
          w: Math.abs(dx),
          h: Math.abs(dy),
        };
        setSelectionRect(rect);
        updateWithoutHistory((current) => {
          const matched = current.boxes
            .filter((item) => rectsIntersect(rect, { x: item.x, y: item.y, w: item.width, h: boxHeight(item) }))
            .map((item) => item.id);
          const selectedIds = drag.additive ? Array.from(new Set([...current.selectedIds, ...matched])) : matched;
          return { ...current, selectedId: selectedIds.at(-1) ?? null, selectedIds };
        });
        return;
      }

      updateWithoutHistory((current) => ({
        ...current,
        photo: drag.type === "photo"
          ? { ...current.photo, x: Math.round(drag.x + dx), y: Math.round(drag.y + dy) }
          : current.photo,
        boxes: current.boxes.map((item) => {
          if (drag.type === "photo") return item;
          if (drag.type === "resize") {
            const start = drag.boxes.find((boxItem) => boxItem.id === item.id);
            if (!start) return item;
            const proportional = event.shiftKey;
            if (proportional) {
              const scaleByX = clamp((drag.bounds.w + dx) / Math.max(1, drag.bounds.w), 0.2, 4);
              const scaleByY = clamp((drag.bounds.h + dy) / Math.max(1, drag.bounds.h), 0.2, 4);
              const factor = Math.max(scaleByX, scaleByY);
              const x = drag.bounds.x + (start.x - drag.bounds.x) * factor;
              const y = drag.bounds.y + (start.y - drag.bounds.y) * factor;
              return {
                ...item,
                x: Math.round(clamp(x, 0, dim.w - item.width)),
                y: Math.round(clamp(y, 0, dim.h - item.size)),
                width: Math.round(clamp(start.width * factor, 80, dim.w - x)),
                size: Math.round(clamp(start.size * factor, 10, 320)),
              };
            }
            const widthFactor = clamp((drag.bounds.w + dx) / Math.max(1, drag.bounds.w), 0.2, 4);
            const sizeFactor = clamp((drag.bounds.h + dy) / Math.max(1, drag.bounds.h), 0.2, 4);
            const x = drag.bounds.x + (start.x - drag.bounds.x) * widthFactor;
            const y = drag.bounds.y + (start.y - drag.bounds.y) * sizeFactor;
            return {
              ...item,
              x: Math.round(clamp(x, 0, dim.w - item.width)),
              y: Math.round(clamp(y, 0, dim.h - item.size)),
              width: Math.round(clamp(start.width * widthFactor, 80, dim.w - x)),
              size: Math.round(clamp(start.size * sizeFactor, 10, 320)),
            };
          }
          if (drag.type === "move") {
            const start = drag.boxes.find((boxItem) => boxItem.id === item.id);
            if (!start) return item;
            drag.moved = true;
            return {
              ...item,
              x: clamp(start.x + dx, 0, dim.w - item.width),
              y: clamp(start.y + dy, 0, dim.h - item.size),
            };
          }
          return item;
        }),
      }));
    }

    function onPointerUp() {
      const drag = dragRef.current;
      if (drag?.type === "move" && !drag.moved && drag.openEditOnClick) setEditingId(drag.id);
      if ((drag?.type === "move" && drag.moved) || drag?.type === "resize") {
        setPast((items) => [...items.slice(-24), cloneScene(drag.startScene)]);
      }
      dragRef.current = null;
      setSelectionRect(null);
    }

    window.addEventListener("pointermove", onPointerMove);
    window.addEventListener("pointerup", onPointerUp);
    return () => {
      window.removeEventListener("pointermove", onPointerMove);
      window.removeEventListener("pointerup", onPointerUp);
    };
  }, [dim.h, dim.w, scale, updateWithoutHistory]);

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      const target = event.target as HTMLElement | null;
      if (editingId || target?.isContentEditable || ["INPUT", "TEXTAREA", "SELECT"].includes(target?.tagName ?? "")) return;
      const meta = event.metaKey || event.ctrlKey;

      if (meta && event.key.toLowerCase() === "z") {
        event.preventDefault();
        undo();
        return;
      }

      if (meta && event.key.toLowerCase() === "c" && selected) {
        event.preventDefault();
        setClipboard({ ...selected });
        setClipboardGroup(selectedBoxes.map((item) => ({ ...item })));
        showToast(selectedBoxes.length > 1 ? "Grupo copiado" : "Caixa copiada");
        return;
      }

      if (meta && event.key.toLowerCase() === "v") {
        event.preventDefault();
        pasteBox();
        return;
      }

      if (meta && event.key.toLowerCase() === "d" && selected) {
        event.preventDefault();
        duplicateSelected();
        return;
      }

      if ((event.key === "Delete" || event.key === "Backspace") && selected) {
        event.preventDefault();
        deleteSelected();
        return;
      }

      const step = event.shiftKey ? 20 : 2;
      const moves: Record<string, [number, number]> = {
        ArrowLeft: [-step, 0],
        ArrowRight: [step, 0],
        ArrowUp: [0, -step],
        ArrowDown: [0, step],
      };
      const move = moves[event.key];
      if (move && selectedIds.length) {
        event.preventDefault();
        updateWithoutHistory((current) => ({
          ...current,
          boxes: current.boxes.map((item) =>
            selectedIds.includes(item.id)
              ? {
                  ...item,
                  x: clamp(item.x + move[0], 0, dim.w - item.width),
                  y: clamp(item.y + move[1], 0, dim.h - item.size),
                }
              : item,
          ),
        }));
      }
    }

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [deleteSelected, dim.h, dim.w, duplicateSelected, editingId, pasteBox, selected, selectedBoxes, selectedIds, showToast, undo, updateWithoutHistory]);

  useEffect(() => () => {
    if (lastToast.current) window.clearTimeout(lastToast.current);
  }, []);

  const magicSuggestions = useMemo(() => {
    const first = stripMessagePrefix(material.conteudo[0] ?? material.titulo);
    const second = stripMessagePrefix(material.conteudo[1] ?? material.promessa);
    const third = stripMessagePrefix(material.conteudo[2] ?? material.comoUsar);
    const common = [
      material.titulo,
      first,
      second,
      third,
      shortText(material.promessa, 72),
      `${material.etiqueta}\n${material.titulo}`,
    ].filter(Boolean);
    return common;
  }, [material]);

  const boxStyle = (item: TextBox): CSSProperties => ({
    left: item.x,
    top: item.y,
    width: item.width,
    color: item.color,
    fontSize: item.size,
    fontWeight: item.bold ? 900 : item.size >= 90 ? 800 : 600,
    fontStyle: item.italic ? "italic" : "normal",
    fontFamily: item.font === "JetBrains Mono" ? "var(--mono)" : "var(--font-inter), Inter, sans-serif",
    textDecoration: [
      item.underline ? "underline" : "",
      item.strike ? "line-through" : "",
    ].filter(Boolean).join(" ") || "none",
    lineHeight: item.lineHeight,
    letterSpacing: item.font === "JetBrains Mono" ? "0.04em" : item.uppercase ? "0.06em" : 0,
    textTransform: item.uppercase ? "uppercase" : "none",
    textAlign: item.align,
  });

  return (
    <div className={styles.shell}>
      <header className={styles.top}>
        <a href={backHref} className={styles.back}>Voltar ao material</a>
        <div>
          <p>◆ Editor visual</p>
          <h1>{title}</h1>
        </div>
      </header>

      <section className={styles.editor}>
        <aside className={styles.panel}>
          <p className={styles.sec}>◆ Modelo</p>
          <div className={styles.models}>
            {models.map((item) => (
              <button key={item.id} data-on={scene.model === item.id ? "1" : "0"} onClick={() => chooseModel(item.id)}>
                <strong>{item.label}</strong>
                <span>{item.desc}</span>
              </button>
            ))}
          </div>

          <p className={styles.sec}>◆ Edição <span>use a barra sobre a arte</span></p>
          <p className={styles.help}>
            Clique para selecionar. Clique novamente ou dê dois cliques para editar o texto. Arraste para mover. Use Ctrl+C, Ctrl+V, Delete e setas para posicionar.
          </p>
          <input ref={fileRef} className={styles.file} type="file" accept="image/*" onChange={(event) => setBackgroundPhoto(event.target.files?.[0])} />

          <p className={styles.sec}>◆ Filtro da foto <span>arraste a foto para mover</span></p>
          <div className={styles.effects}>
            {PHOTO_EFFECTS.map((item) => (
              <button
                key={item.id}
                aria-pressed={scene.photoFx === item.id}
                data-on={scene.photoFx === item.id ? "1" : "0"}
                title={scene.photoFx === item.id ? "Remover filtro" : "Aplicar filtro"}
                onClick={() => changePhotoFx(item.id)}
              >
                {item.label}
              </button>
            ))}
          </div>

          <p className={styles.sec}>◆ Efeito visual <span>camada sobre a arte</span></p>
          <div className={styles.effects}>
            {VISUAL_EFFECTS.map((item) => (
              <button
                key={item.id}
                aria-pressed={scene.visualFx === item.id}
                data-on={scene.visualFx === item.id ? "1" : "0"}
                title={scene.visualFx === item.id ? "Remover efeito" : "Aplicar efeito"}
                onClick={() => changeVisualFx(item.id)}
              >
                {item.label}
              </button>
            ))}
          </div>

          <label className={styles.label} htmlFor="photo-zoom">Zoom da foto</label>
          <div className={styles.slider}>
            <input
              id="photo-zoom"
              type="range"
              min="100"
              max="260"
              value={Math.round(scene.photo.zoom * 100)}
              onChange={(event) => updateWithoutHistory((current) => ({
                ...current,
                photo: { ...current.photo, zoom: Number(event.target.value) / 100 },
              }))}
            />
            <span>{scene.photo.zoom.toFixed(1)}x</span>
          </div>

          <div className={styles.exports}>
            <div>
              <strong>{mode === "slides" ? "Imagem do slide" : "Imagem"}</strong>
              <span>PNG · {dim.w}x{dim.h}</span>
            </div>
            <button onClick={exportPng}>Baixar</button>
          </div>
          {mode === "slides" ? (
            <div className={styles.exportsSecondary}>
              <strong>PowerPoint (.pptx)</strong>
              <span>em breve</span>
            </div>
          ) : (
            <div className={styles.exportsSecondary}>
              <strong>PDF impressão</strong>
              <span>em breve</span>
            </div>
          )}
        </aside>

        <section className={styles.stage} ref={stageRef}>
          <div className={styles.stageHead}>
            <div className={styles.formats}>
              {scene.formats.map((format) => (
                <button key={format} data-on={scene.fmt === format ? "1" : "0"} onClick={() => changeFormat(format)}>
                  {DIMS[format].label}
                </button>
              ))}
            </div>
            <p>clique para selecionar · clique novamente para editar · arraste para mover</p>
          </div>

          <div className={styles.toolbar} data-disabled={selectedIds.length ? "0" : "1"}>
            <span className={styles.brand}>CE<span>.X</span></span>
            <span className={styles.sep} />
            <button className={styles.magic} onMouseDown={(event) => openPopover(event, "magic")}>
              <WandIcon /> Texto Mágico
            </button>
            <span className={styles.sep} />
            <button onMouseDown={(event) => { event.preventDefault(); applySelected((item) => ({ ...item, size: Math.max(item.size, scene.fmt === "slide" ? 130 : 118), bold: true })); }}>H<sub>1</sub></button>
            <button onMouseDown={(event) => { event.preventDefault(); applySelected((item) => ({ ...item, size: scene.fmt === "slide" ? 72 : 64 })); }}>H<sub>2</sub></button>
            <button className={styles.selectButton} onMouseDown={(event) => openPopover(event, "font")}>
              <span>{selected?.font ?? "Inter"}</span>
              <ChevronIcon />
            </button>
            <div className={styles.stepper}>
              <button onMouseDown={(event) => { event.preventDefault(); applySelected((item) => ({ ...item, size: Math.max(14, item.size - 4) })); }}>-</button>
              <span>{selected?.size ?? 0}</span>
              <button onMouseDown={(event) => { event.preventDefault(); applySelected((item) => ({ ...item, size: item.size + 4 })); }}>+</button>
            </div>
            <button className={styles.colorButton} title="Cor da letra" onMouseDown={(event) => openPopover(event, "textColor")}>
              <span>A</span><i className={styles.colorLine} />
            </button>
            <button className={styles.colorButton} title="Marca-texto" onMouseDown={(event) => openPopover(event, "highlight")}>
              <MarkerIcon /><i className={styles.colorLine} />
            </button>
            <button className={styles.colorButton} title="Cor do fundo" onMouseDown={(event) => openPopover(event, "bg")}>
              <BucketIcon /><i style={{ background: scene.bg }} />
            </button>
            <button title="Foto de fundo" onMouseDown={(event) => { event.preventDefault(); fileRef.current?.click(); }}>
              <ImageIcon />
            </button>
            <span className={styles.sep} />
            <button data-on={selectedState.bold ? "1" : "0"} onMouseDown={(event) => { event.preventDefault(); applySelected((item) => ({ ...item, bold: !item.bold })); }}><strong>B</strong></button>
            <button data-on={selectedState.italic ? "1" : "0"} onMouseDown={(event) => { event.preventDefault(); applySelected((item) => ({ ...item, italic: !item.italic })); }}><em>I</em></button>
            <button data-on={selectedState.underline ? "1" : "0"} onMouseDown={(event) => { event.preventDefault(); applySelected((item) => ({ ...item, underline: !item.underline })); }}><span className={styles.underline}>U</span></button>
            <button data-on={selectedState.strike ? "1" : "0"} onMouseDown={(event) => { event.preventDefault(); applySelected((item) => ({ ...item, strike: !item.strike })); }}><span className={styles.strike}>S</span></button>
            <span className={styles.sep} />
            <button title="Alinhamento" onMouseDown={(event) => {
              event.preventDefault();
              applySelected((item) => ({ ...item, align: item.align === "left" ? "center" : item.align === "center" ? "right" : "left" }));
            }}>
              <AlignIcon />
            </button>
            <button title="Espaçamento entre linhas" onMouseDown={(event) => openPopover(event, "lineHeight")}><LineHeightIcon /></button>
            <span className={styles.sep} />
            <button title="Nova caixa de texto" onMouseDown={(event) => { event.preventDefault(); addTextBox(); }}><AddTextIcon /></button>
            <button data-on={paintBuffer ? "1" : "0"} title="Copiar estilo" onMouseDown={(event) => {
              event.preventDefault();
              if (!selected) return;
              setPaintBuffer((current) => current ? null : {
                color: selected.color,
                size: selected.size,
                font: selected.font,
                bold: selected.bold,
                italic: selected.italic,
                underline: selected.underline,
                strike: selected.strike,
                align: selected.align,
                lineHeight: selected.lineHeight,
                highlight: selected.highlight,
                uppercase: selected.uppercase,
              });
              showToast(paintBuffer ? "Pincel cancelado" : "Estilo copiado");
            }}>
              <PaintIcon />
            </button>
            <button disabled={!past.length} onMouseDown={(event) => { event.preventDefault(); undo(); }}>Desfazer</button>
            <button disabled={!selectedIds.length} onMouseDown={(event) => { event.preventDefault(); deleteSelected(); }}>Excluir</button>
          </div>

          <div className={styles.canvasTable} onPointerDown={startAreaSelection}>
            <div className={styles.scaler} style={{ width: dim.w * scale, height: dim.h * scale }}>
              <div
                ref={boardRef}
                className={styles.artboard}
                data-fx={scene.photoFx}
                style={{
                  width: dim.w,
                  height: dim.h,
                  background: scene.bg,
                  transform: `scale(${scale})`,
                  "--fxcolor": scene.fxColor,
                } as CSSProperties}
                onPointerDown={(event) => {
                  if ((event.target as HTMLElement).closest("[data-photo='1']")) {
                    updateWithoutHistory((current) => ({ ...current, selectedId: null, selectedIds: [] }));
                    dragRef.current = {
                      type: "photo",
                      startX: event.clientX,
                      startY: event.clientY,
                      x: scene.photo.x,
                      y: scene.photo.y,
                    };
                    event.preventDefault();
                    return;
                  }
                }}
              >
                {scene.bgPhoto ? (
                  <div data-photo="1" className={styles.bgPhoto}>
                    <PhotoLayers scene={scene} />
                  </div>
                ) : null}
                {scene.blurBg && scene.photo.url ? (
                  <div className={styles.blurPhoto}>
                    <PhotoLayers scene={scene} />
                  </div>
                ) : null}
                <DecoLayer
                  scene={scene}
                  onPointerDown={(event) => {
                    dragRef.current = {
                      type: "photo",
                      startX: event.clientX,
                      startY: event.clientY,
                      x: scene.photo.x,
                      y: scene.photo.y,
                    };
                    event.preventDefault();
                  }}
                />
                <VisualFxLayer scene={scene} />
                <div className={styles.watermark} aria-hidden="true">CE.X</div>
                <div className={styles.cutLine} aria-hidden="true" />
                {selectionRect ? (
                  <div
                    className={styles.selectionRect}
                    style={{
                      left: selectionRect.x,
                      top: selectionRect.y,
                      width: selectionRect.w,
                      height: selectionRect.h,
                    }}
                  />
                ) : null}
                {selectedBounds && selectedIds.length > 1 ? (
                  <div
                    className={styles.groupBounds}
                    style={{
                      left: selectedBounds.x,
                      top: selectedBounds.y,
                      width: selectedBounds.w,
                      height: selectedBounds.h,
                    }}
                  >
                    <button
                      className={styles.groupResize}
                      aria-label="Redimensionar grupo"
                      onPointerDown={(event) => {
                        event.stopPropagation();
                        event.preventDefault();
                        dragRef.current = {
                          type: "resize",
                          ids: selectedIds,
                          startX: event.clientX,
                          startY: event.clientY,
                          bounds: selectedBounds,
                          boxes: selectedBoxes.map((boxItem) => ({
                            id: boxItem.id,
                            x: boxItem.x,
                            y: boxItem.y,
                            width: boxItem.width,
                            size: boxItem.size,
                            height: boxHeight(boxItem),
                          })),
                          startScene: cloneScene(scene),
                        };
                      }}
                    />
                  </div>
                ) : null}
                {scene.boxes.map((item) => {
                  const active = selectedIdSet.has(item.id);
                  const isEditing = editingId === item.id;
                  return (
                    <div
                      key={item.id}
                      className={styles.textBox}
                      data-active={active ? "1" : "0"}
                      data-editing={isEditing ? "1" : "0"}
                      style={boxStyle(item)}
                      onPointerDown={(event) => {
                        if (isEditing) return;
                        const additive = event.shiftKey || event.metaKey || event.ctrlKey;
                        const alreadySelected = selectedIdSet.has(item.id);
                        const nextIds = additive
                          ? alreadySelected
                            ? selectedIds.filter((id) => id !== item.id)
                            : [...selectedIds, item.id]
                          : alreadySelected
                            ? selectedIds
                            : [item.id];
                        selectBox(item.id, additive);
                        if (!nextIds.includes(item.id)) {
                          event.preventDefault();
                          return;
                        }
                        dragRef.current = {
                          type: "move",
                          ids: nextIds,
                          id: item.id,
                          startX: event.clientX,
                          startY: event.clientY,
                          boxes: scene.boxes
                            .filter((boxItem) => nextIds.includes(boxItem.id))
                            .map((boxItem) => ({ id: boxItem.id, x: boxItem.x, y: boxItem.y })),
                          moved: false,
                          openEditOnClick: !additive && nextIds.length === 1,
                          startScene: cloneScene(scene),
                        };
                        event.preventDefault();
                      }}
                      onDoubleClick={() => setEditingId(item.id)}
                    >
                      {item.gem ? <span className={styles.gem}>◆ </span> : null}
                      <span
                        className={styles.boxText}
                        contentEditable={isEditing}
                        suppressContentEditableWarning
                        style={item.highlight ? {
                          background: item.highlight,
                          boxShadow: `0.14em 0 0 ${item.highlight}, -0.14em 0 0 ${item.highlight}`,
                        } : undefined}
                        onBlur={(event) => {
                          const text = event.currentTarget.innerText.replace(/\u00a0/g, " ").replace(/\n{3,}/g, "\n\n").trimEnd();
                          commit((current) => ({
                            ...current,
                            boxes: current.boxes.map((boxItem) => (boxItem.id === item.id ? { ...boxItem, text } : boxItem)),
                          }));
                          setEditingId(null);
                        }}
                      >
                        {item.text}
                      </span>
                      {active && selectedBounds && selectedIds.length === 1 ? (
                        <button
                          className={styles.resize}
                          aria-label={selectedIds.length > 1 ? "Redimensionar grupo" : "Redimensionar caixa"}
                          onPointerDown={(event) => {
                            event.stopPropagation();
                            const boxes = selectedBoxes.map((boxItem) => ({
                              id: boxItem.id,
                              x: boxItem.x,
                              y: boxItem.y,
                              width: boxItem.width,
                              size: boxItem.size,
                              height: boxHeight(boxItem),
                            }));
                            dragRef.current = {
                              type: "resize",
                              ids: selectedIds,
                              startX: event.clientX,
                              startY: event.clientY,
                              bounds: selectedBounds,
                              boxes,
                              startScene: cloneScene(scene),
                            };
                          }}
                        />
                      ) : null}
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </section>
      </section>

      <EditorPopover
        popover={popover}
        selected={selected}
        scene={scene}
        colors={BRAND_COLORS}
        magicSuggestions={magicSuggestions}
        onChooseColor={chooseColor}
        onChooseFont={(font) => {
          applySelected((item) => ({ ...item, font }));
          setPopover(null);
        }}
        onChooseLineHeight={(lineHeight) => {
          applySelected((item) => ({ ...item, lineHeight }));
          setPopover(null);
        }}
        onMagic={applyMagic}
        onClearHighlight={() => {
          applySelected((item) => ({ ...item, highlight: null }));
          setPopover(null);
        }}
      />
      <div className={styles.toast} data-on={toast ? "1" : "0"}>{toast}</div>
    </div>
  );
}

function EditorPopover({
  popover,
  selected,
  scene,
  colors,
  magicSuggestions,
  onChooseColor,
  onChooseFont,
  onChooseLineHeight,
  onMagic,
  onClearHighlight,
}: {
  popover: Popover;
  selected: TextBox | null;
  scene: Scene;
  colors: { name: string; value: string }[];
  magicSuggestions: string[];
  onChooseColor: (value: string, target: "text" | "highlight" | "bg") => void;
  onChooseFont: (font: FontId) => void;
  onChooseLineHeight: (lineHeight: number) => void;
  onMagic: (value: string) => void;
  onClearHighlight: () => void;
}) {
  if (!popover) return null;

  return (
    <div className={styles.popover} style={{ left: popover.x, top: popover.y }}>
      {popover.kind === "font" ? (
        FONTS.map((font) => (
          <button
            key={font}
            className={styles.popOption}
            data-on={selected?.font === font ? "1" : "0"}
            style={{ fontFamily: font === "JetBrains Mono" ? "var(--mono)" : "var(--font-inter), Inter, sans-serif" }}
            onClick={() => onChooseFont(font)}
          >
            {font}
          </button>
        ))
      ) : null}

      {popover.kind === "lineHeight" ? (
        LINE_HEIGHTS.map((lineHeight) => (
          <button key={lineHeight} className={styles.popOption} onClick={() => onChooseLineHeight(lineHeight)}>
            Espaçamento {lineHeight.toFixed(2)}
          </button>
        ))
      ) : null}

      {popover.kind === "magic" ? (
        <>
          <strong className={styles.popTitle}>Texto Mágico</strong>
          {magicSuggestions.map((item) => (
            <button key={item} className={styles.popOption} onClick={() => onMagic(item)}>
              {item.replace(/\n/g, " · ")}
            </button>
          ))}
        </>
      ) : null}

      {popover.kind === "textColor" || popover.kind === "highlight" || popover.kind === "bg" ? (
        <>
          <div className={styles.swatches}>
            {colors.map((color) => {
              const active =
                popover.kind === "bg"
                  ? scene.bg.toLowerCase() === color.value.toLowerCase()
                  : popover.kind === "textColor"
                    ? selected?.color.toLowerCase() === color.value.toLowerCase()
                    : selected?.highlight?.toLowerCase() === color.value.toLowerCase();
              return (
                <button
                  key={color.value}
                  aria-label={color.name}
                  title={color.name}
                  data-on={active ? "1" : "0"}
                  style={{ background: color.value }}
                  onClick={() => onChooseColor(color.value, popover.kind === "textColor" ? "text" : popover.kind === "highlight" ? "highlight" : "bg")}
                />
              );
            })}
          </div>
          {popover.kind === "highlight" ? (
            <button className={styles.popOption} onClick={onClearHighlight}>Sem marca-texto</button>
          ) : null}
        </>
      ) : null}
    </div>
  );
}

function WandIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M15 4V2M15 4v2M15 4h2M15 4h-2M5 14l9-9 5 5-9 9H5v-5z" />
      <path d="M4 20l2-2" />
    </svg>
  );
}

function ChevronIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M6 9l6 6 6-6" />
    </svg>
  );
}

function MarkerIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M9 11l-4 4v3h3l4-4M9 11l5-5 4 4-5 5M9 11l4 4" />
    </svg>
  );
}

function BucketIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M5 3v13a4 4 0 0 0 8 0V7l-4-4z" />
      <path d="M5 9h8" />
    </svg>
  );
}

function ImageIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <rect x="3" y="4" width="18" height="16" rx="2" />
      <path d="M3 16l5-5 4 4 3-3 6 6" />
      <circle cx="8.5" cy="9" r="1.4" />
    </svg>
  );
}

function AlignIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M3 6h18M3 12h12M3 18h16" />
    </svg>
  );
}

function LineHeightIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M5 4v16M5 4l-2 3M5 4l2 3M5 20l-2-3M5 20l2-3M10 6h11M10 12h11M10 18h11" />
    </svg>
  );
}

function AddTextIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M4 7V5h11v2M9.5 5v11M7.5 16h4" />
      <path d="M18.5 13v7M15 16.5h7" />
    </svg>
  );
}

function PaintIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <rect x="4" y="3" width="14" height="6" rx="1" />
      <path d="M18 6h2v4h-9v3M11 13h2v8h-2z" />
    </svg>
  );
}
