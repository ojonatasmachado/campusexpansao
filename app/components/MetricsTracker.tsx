"use client";

import { useEffect } from "react";
import { usePathname, useSearchParams } from "next/navigation";
import { trackMetricEvent } from "../lib/metrics-client";

function materialIdFromPath(pathname: string) {
  const match = pathname.match(/^\/materiais\/([^/?#]+)/);
  return match ? decodeURIComponent(match[1]) : undefined;
}

function cursoSlugFromPath(pathname: string) {
  const match = pathname.match(/^\/cursos\/([^/?#]+)/);
  return match ? decodeURIComponent(match[1]) : undefined;
}

export default function MetricsTracker() {
  const pathname = usePathname();
  const searchParams = useSearchParams();

  useEffect(() => {
    if (!pathname || pathname.startsWith("/admin") || pathname.startsWith("/api")) return;
    const query = searchParams.toString();
    const path = query ? `${pathname}?${query}` : pathname;
    const materialId = materialIdFromPath(pathname);
    const cursoSlug = cursoSlugFromPath(pathname);

    trackMetricEvent({ eventName: "page_view", path, materialId, cursoSlug });
    if (materialId) trackMetricEvent({ eventName: "material_view", path, materialId });
    if (cursoSlug) trackMetricEvent({ eventName: "curso_view", path, cursoSlug });
  }, [pathname, searchParams]);

  return null;
}
