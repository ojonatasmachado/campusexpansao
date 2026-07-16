"use client";

import { useEffect, useRef, useState } from "react";

/* Corte + zoom antes de enviar qualquer imagem do Service (logo, capa da
   Página pública, imagem de notícia...). Arrasta pra reposicionar, controla
   o zoom no slider, e só sai daqui uma imagem já no enquadramento certo —
   sem precisar de editor externo. Sem dependência nova : só canvas nativo.

   Formatos que o navegador não sabe decodificar (ex.: .heic direto do
   iPhone sem converter) travavam aqui em silêncio : img.onload nunca
   disparava, imgSize ficava em 0 pra sempre e "Aplicar" virava um botão
   morto, sem nenhum aviso. Agora tem estado de carregando/erro explícito. */

const FRAME_W = 320;

export function ImageCropper({
  file,
  aspectRatio = 1,
  round = false,
  outputWidth = 960,
  onConfirm,
  onCancel,
}: {
  file: File;
  aspectRatio?: number;
  round?: boolean;
  outputWidth?: number;
  onConfirm: (file: File) => void;
  onCancel: () => void;
}) {
  const [imgUrl, setImgUrl] = useState<string | null>(null);
  const [imgSize, setImgSize] = useState({ w: 0, h: 0 });
  const [status, setStatus] = useState<"loading" | "ready" | "error">("loading");
  const [zoom, setZoom] = useState(1);
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const [busy, setBusy] = useState(false);
  const dragRef = useRef<{ startX: number; startY: number; offX: number; offY: number } | null>(null);

  const frameH = Math.round(FRAME_W / aspectRatio);

  useEffect(() => {
    let cancelled = false;
    let objectUrl: string | null = null;
    setStatus("loading");
    setImgSize({ w: 0, h: 0 });

    const load = async () => {
      /* HEIC/HEIF (padrão das fotos do iPhone) : nenhum navegador fora do
         próprio Safari/WebKit sabe decodificar isso em <img>/canvas. Sem
         conversão, a pessoa precisaria saber exportar em JPEG antes de
         enviar — não dá pra esperar isso de quem só quer subir uma foto.
         Convertemos em JPEG no próprio navegador antes de seguir. */
      let source: File | Blob = file;
      const pareceHeic = file.type === "image/heic" || file.type === "image/heif" || /\.hei[cf]$/i.test(file.name);
      if (pareceHeic) {
        try {
          const heic2any = (await import("heic2any")).default;
          const result = await heic2any({ blob: file, toType: "image/jpeg", quality: 0.9 });
          source = Array.isArray(result) ? result[0] : result;
        } catch {
          /* não era HEIC de verdade ou a conversão falhou : segue com o
             arquivo original, o <img> abaixo ainda pode dar conta dele. */
        }
      }
      if (cancelled) return;

      const url = URL.createObjectURL(source);
      objectUrl = url;
      setImgUrl(url);
      const img = new window.Image();
      img.onload = () => {
        if (cancelled) return;
        setImgSize({ w: img.naturalWidth, h: img.naturalHeight });
        setZoom(1);
        setOffset({ x: 0, y: 0 });
        setStatus("ready");
      };
      img.onerror = () => { if (!cancelled) setStatus("error"); };
      img.src = url;
    };
    load();

    return () => {
      cancelled = true;
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [file]);

  const baseScale = imgSize.w && imgSize.h ? Math.max(FRAME_W / imgSize.w, frameH / imgSize.h) : 1;
  const effectiveScale = baseScale * zoom;
  const displayW = imgSize.w * effectiveScale;
  const displayH = imgSize.h * effectiveScale;

  const clamp = (off: { x: number; y: number }, dW: number, dH: number) => ({
    x: Math.min(0, Math.max(FRAME_W - dW, off.x)),
    y: Math.min(0, Math.max(frameH - dH, off.y)),
  });

  useEffect(() => {
    setOffset((prev) => clamp(prev, displayW, displayH));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [displayW, displayH]);

  const onPointerDown = (e: React.PointerEvent) => {
    if (status !== "ready") return;
    (e.currentTarget as Element).setPointerCapture(e.pointerId);
    dragRef.current = { startX: e.clientX, startY: e.clientY, offX: offset.x, offY: offset.y };
  };
  const onPointerMove = (e: React.PointerEvent) => {
    if (!dragRef.current) return;
    const dx = e.clientX - dragRef.current.startX;
    const dy = e.clientY - dragRef.current.startY;
    setOffset(clamp({ x: dragRef.current.offX + dx, y: dragRef.current.offY + dy }, displayW, displayH));
  };
  const onPointerUp = () => { dragRef.current = null; };

  const confirmar = async () => {
    if (status !== "ready" || !imgUrl || !imgSize.w) return;
    setBusy(true);
    try {
      const img = new window.Image();
      img.src = imgUrl;
      await img.decode();

      const outW = outputWidth;
      const outH = Math.round(outW / aspectRatio);
      const canvas = document.createElement("canvas");
      canvas.width = outW;
      canvas.height = outH;
      const ctx = canvas.getContext("2d");
      if (!ctx) { setBusy(false); setStatus("error"); return; }

      if (round) {
        ctx.beginPath();
        ctx.arc(outW / 2, outH / 2, Math.min(outW, outH) / 2, 0, Math.PI * 2);
        ctx.clip();
      }

      const sx = -offset.x / effectiveScale;
      const sy = -offset.y / effectiveScale;
      const sw = FRAME_W / effectiveScale;
      const sh = frameH / effectiveScale;
      ctx.drawImage(img, sx, sy, sw, sh, 0, 0, outW, outH);

      canvas.toBlob((blob) => {
        setBusy(false);
        if (!blob) { setStatus("error"); return; }
        const cropped = new File([blob], file.name.replace(/\.\w+$/, "") + ".webp", { type: "image/webp" });
        onConfirm(cropped);
      }, "image/webp", 0.9);
    } catch {
      setBusy(false);
      setStatus("error");
    }
  };

  return (
    <div className="modal-bg" onClick={onCancel}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-head">
          <div className="modal-eyebrow">Ajustar imagem</div>
          <div className="modal-title">Corte e zoom</div>
          <div className="modal-sub">Arraste pra reposicionar e use o zoom pra enquadrar melhor.</div>
        </div>
        <div className="modal-body" style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 16 }}>
          <div
            style={{
              width: FRAME_W,
              height: frameH,
              overflow: "hidden",
              position: "relative",
              borderRadius: round ? 999 : 12,
              background: "#000",
              touchAction: "none",
              cursor: status === "ready" ? "grab" : "default",
              border: "1px solid var(--border-2)",
            }}
            onPointerDown={onPointerDown}
            onPointerMove={onPointerMove}
            onPointerUp={onPointerUp}
            onPointerLeave={onPointerUp}
          >
            {status === "loading" && (
              <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 12.5, color: "var(--subtle)" }}>
                Carregando imagem...
              </div>
            )}
            {status === "error" && (
              <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center", textAlign: "center", padding: 16, fontSize: 12.5, color: "var(--danger)" }}>
                Não consegui abrir essa imagem. Tente outro arquivo (JPG, PNG ou WEBP).
              </div>
            )}
            {imgUrl && status !== "error" && (
              <img
                src={imgUrl}
                alt=""
                draggable={false}
                style={{
                  position: "absolute",
                  left: offset.x,
                  top: offset.y,
                  width: displayW || undefined,
                  height: displayH || undefined,
                  maxWidth: "none",
                  userSelect: "none",
                  pointerEvents: "none",
                  opacity: status === "ready" ? 1 : 0,
                }}
              />
            )}
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 10, width: FRAME_W }}>
            <span style={{ fontSize: 12, color: "var(--subtle)" }}>Zoom</span>
            <input
              type="range"
              min={1}
              max={3}
              step={0.01}
              value={zoom}
              disabled={status !== "ready"}
              onChange={(e) => setZoom(Number(e.target.value))}
              style={{ flex: 1 }}
            />
          </div>
        </div>
        <div className="modal-foot">
          <button className="btn btn-sec" type="button" onClick={onCancel}>Cancelar</button>
          <button className="btn btn-pri" type="button" disabled={busy || status !== "ready"} onClick={confirmar}>
            {busy ? "Aplicando..." : "Aplicar"}
          </button>
        </div>
      </div>
    </div>
  );
}
