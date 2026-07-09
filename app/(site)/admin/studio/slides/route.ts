import { serveStudioModule } from "../../../../lib/studio-modules";

export async function GET() {
  return serveStudioModule("slides");
}
