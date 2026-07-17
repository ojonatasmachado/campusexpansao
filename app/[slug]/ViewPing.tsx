"use client";

import { useEffect } from "react";

/* Registra 1 view por carregamento de página, uma vez, sem bloquear nada. */

export default function ViewPing({ churchId }: { churchId: string }) {
  useEffect(() => {
    fetch("/api/igreja/track", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ churchId, kind: "view" }),
      keepalive: true,
    }).catch(() => {});
  }, [churchId]);

  return null;
}
