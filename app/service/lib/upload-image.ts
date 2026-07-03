import type { createServiceBrowserClient } from "./supabase-browser";

const BUCKET = "service-media";
const MAX_BYTES = 4 * 1024 * 1024;

export async function uploadServiceImage(
  supabase: ReturnType<typeof createServiceBrowserClient>,
  file: File,
  path: string,
): Promise<string> {
  if (!file.type.startsWith("image/")) {
    throw new Error("Envie um arquivo de imagem (PNG, JPG, WebP...).");
  }
  if (file.size > MAX_BYTES) {
    throw new Error("A imagem precisa ter até 4MB.");
  }

  const { error } = await supabase.storage.from(BUCKET).upload(path, file, {
    upsert: true,
    contentType: file.type,
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
