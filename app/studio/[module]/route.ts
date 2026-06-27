import type { NextRequest } from "next/server";
import { notFound } from "next/navigation";
import { isStudioModule, serveStudioModule } from "../../lib/studio-modules";

export async function GET(request: NextRequest, { params }: { params: Promise<{ module: string }> }) {
  const { module } = await params;

  if (!isStudioModule(module)) {
    notFound();
  }

  return serveStudioModule(module, { request });
}
