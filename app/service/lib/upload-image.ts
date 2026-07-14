import type { createServiceBrowserClient } from "./supabase-browser";

const BUCKET = "service-media";
const MAX_INPUT_BYTES = 15 * 1024 * 1024;
const MAX_DIMENSION = 1280;
const COMPRESS_QUALITY = 0.82;

/* Redimensiona/recomprime no navegador antes do upload : toda foto do
   Service (criança, responsável, logo, capítulo da história) só precisa
   ser reconhecível, não ter resolução de câmera. Isso reduz Storage e
   egress do Supabase em produção. Se a compressão falhar por qualquer
   motivo (formato não suportado pelo navegador, ex. HEIC no Chrome),
   cai de volta pro arquivo original em vez de bloquear o envio. */
async function compressImage(file: File): Promise<File> {
  if (!file.type.startsWith("image/") || file.type === "image/svg+xml") return file;
  try {
    const bitmap = await createImageBitmap(file);
    const scale = Math.min(1, MAX_DIMENSION / Math.max(bitmap.width, bitmap.height));
    const width = Math.round(bitmap.width * scale);
    const height = Math.round(bitmap.height * scale);
    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext("2d");
    if (!ctx) return file;
    ctx.drawImage(bitmap, 0, 0, width, height);
    bitmap.close?.();
    const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/webp", COMPRESS_QUALITY));
    if (!blob || blob.size >= file.size) return file;
    return new File([blob], file.name.replace(/\.\w+$/, ".webp"), { type: "image/webp" });
  } catch {
    return file;
  }
}

export async function uploadServiceImage(
  supabase: ReturnType<typeof createServiceBrowserClient>,
  file: File,
  path: string,
): Promise<string> {
  if (!file.type.startsWith("image/")) {
    throw new Error("Envie um arquivo de imagem (PNG, JPG, WebP...).");
  }
  if (file.size > MAX_INPUT_BYTES) {
    throw new Error("A imagem precisa ter até 15MB.");
  }

  const compressed = await compressImage(file);

  const { error } = await supabase.storage.from(BUCKET).upload(path, compressed, {
    upsert: true,
    contentType: compressed.type,
  });
  if (error) throw error;

  const { data } = supabase.storage.from(BUCKET).getPublicUrl(path);
  return data.publicUrl;
}

export function imageExtension(file: File): string {
  const fromName = file.name.split(".").pop();
  if (fromName && fromName.length <= 5) return fromName.toLowerCase();
  return file.type.split("/").pop() || "png";
}
