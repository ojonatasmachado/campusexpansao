/* Conta da rota sem serviço externo: melhor ordem pelo vizinho mais próximo
   a partir da saída, distância em linha reta e tempo estimado. Usada quando
   não há chave do OpenRouteService (ORS_API_KEY) ou ele não responde. */

export type Lnglat = [number, number];

export function km(a: Lnglat, b: Lnglat): number {
  const r = 6371, rad = (g: number) => (g * Math.PI) / 180;
  const dLat = rad(b[1] - a[1]), dLng = rad(b[0] - a[0]);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(rad(a[1])) * Math.cos(rad(b[1])) * Math.sin(dLng / 2) ** 2;
  return 2 * r * Math.asin(Math.sqrt(h));
}

/* a saída (índice 0) fica no lugar; o resto vai pelo mais perto */
export function ordemMaisPerto(pts: Lnglat[]): number[] {
  if (pts.length < 3) return pts.map((_, i) => i);
  const ordem = [0];
  const falta = new Set(pts.map((_, i) => i).slice(1));
  while (falta.size) {
    const ult = pts[ordem[ordem.length - 1]];
    let melhor = -1, dist = Infinity;
    for (const i of falta) { const d = km(ult, pts[i]); if (d < dist) { dist = d; melhor = i; } }
    ordem.push(melhor);
    falta.delete(melhor);
  }
  return ordem;
}

export function trajetoReto(pts: Lnglat[], como: "pe" | "carro") {
  let total = 0;
  for (let i = 1; i < pts.length; i++) total += km(pts[i - 1], pts[i]);
  /* rua não é linha reta: +30% */
  const distancia = total * 1.3;
  const kmh = como === "pe" ? 4.5 : 25;
  return { trajeto: { type: "LineString" as const, coordinates: pts }, distancia_km: Math.round(distancia * 10) / 10, duracao_min: Math.max(1, Math.round((distancia / kmh) * 60)), aproximado: true };
}
