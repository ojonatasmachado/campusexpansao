import { readFile } from "fs/promises";
import path from "path";

export async function GET() {
  const filePath = path.join(process.cwd(), "cex-studio", "editors", "CEX-Studio-Documentos.html");
  const html = await readFile(filePath, "utf8");

  return new Response(html, {
    headers: {
      "Content-Type": "text/html; charset=utf-8",
    },
  });
}
