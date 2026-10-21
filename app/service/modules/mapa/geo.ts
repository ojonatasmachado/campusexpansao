/* contas de distância usadas pelo "Onde" e pelo mapa da liderança */

export type Ponto = { latitude: number; longitude: number };

export function temPonto<T extends { latitude?: number | null; longitude?: number | null }>(x: T): x is T & Ponto {
  return typeof x.latitude === "number" && typeof x.longitude === "number";
}

/* distância em km entre dois pontos (haversine) */
export function distanciaKm(a: Ponto, b: Ponto): number {
  const r = 6371;
  const rad = (g: number) => (g * Math.PI) / 180;
  const dLat = rad(b.latitude - a.latitude);
  const dLng = rad(b.longitude - a.longitude);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(rad(a.latitude)) * Math.cos(rad(b.latitude)) * Math.sin(dLng / 2) ** 2;
  return 2 * r * Math.asin(Math.sqrt(h));
}

/* "450 m", "1,3 km", "12 km" */
export function formatarDistancia(km: number): string {
  if (km < 1) return `${Math.max(50, Math.round((km * 1000) / 50) * 50)} m`;
  if (km < 10) return `${km.toFixed(1).replace(".", ",")} km`;
  return `${Math.round(km)} km`;
}

/* caixa que cobre os pontos, para enquadrar o mapa */
export function caixaDosPontos(pontos: Ponto[]): [[number, number], [number, number]] | null {
  if (!pontos.length) return null;
  let w = Infinity, s = Infinity, e = -Infinity, n = -Infinity;
  for (const p of pontos) {
    w = Math.min(w, p.longitude); e = Math.max(e, p.longitude);
    s = Math.min(s, p.latitude); n = Math.max(n, p.latitude);
  }
  return [[w, s], [e, n]];
}

/* link para o app de mapas do celular (Como chegar) */
export function linkComoChegar(p: Ponto): string {
  return `https://www.google.com/maps/dir/?api=1&destination=${p.latitude},${p.longitude}`;
}

/* ponto dentro de polígono (GeoJSON Polygon/MultiPolygon), raio par-ímpar */
export function dentroDe(p: Ponto, g: GeoJSON.Geometry | null | undefined): boolean {
  if (!g) return false;
  const anel = (r: number[][]) => {
    let dentro = false;
    for (let i = 0, j = r.length - 1; i < r.length; j = i++) {
      const [xi, yi] = r[i], [xj, yj] = r[j];
      if ((yi > p.latitude) !== (yj > p.latitude) && p.longitude < ((xj - xi) * (p.latitude - yi)) / (yj - yi) + xi) dentro = !dentro;
    }
    return dentro;
  };
  const poli = (c: number[][][]) => anel(c[0]) && !c.slice(1).some(anel);
  if (g.type === "Polygon") return poli(g.coordinates);
  if (g.type === "MultiPolygon") return g.coordinates.some(poli);
  return false;
}

/* círculo aproximado (64 lados) em volta de um ponto, para raios de 1, 3 e 5 km */
export function circulo(c: Ponto, km: number): GeoJSON.Polygon {
  const pts: number[][] = [];
  for (let i = 0; i <= 64; i++) {
    const a = (i / 64) * 2 * Math.PI;
    const dLat = (km / 111.32) * Math.sin(a);
    const dLng = (km / (111.32 * Math.cos((c.latitude * Math.PI) / 180))) * Math.cos(a);
    pts.push([c.longitude + dLng, c.latitude + dLat]);
  }
  return { type: "Polygon", coordinates: [pts] };
}

/* máscara "o resto apagado": o mundo com a área recortada */
export function mascaraFora(g: GeoJSON.Geometry): GeoJSON.Polygon {
  const mundo = [[-180, -85], [180, -85], [180, 85], [-180, 85], [-180, -85]];
  const buracos = g.type === "Polygon" ? [g.coordinates[0]] : g.type === "MultiPolygon" ? g.coordinates.map((p) => p[0]) : [];
  return { type: "Polygon", coordinates: [mundo, ...buracos] };
}

/* caixa de uma geometria, para enquadrar */
export function caixaDaGeometria(g: GeoJSON.Geometry): [[number, number], [number, number]] | null {
  const pts: Ponto[] = [];
  const andar = (c: unknown): void => {
    if (Array.isArray(c) && typeof c[0] === "number") pts.push({ longitude: c[0] as number, latitude: c[1] as number });
    else if (Array.isArray(c)) c.forEach(andar);
  };
  if ("coordinates" in g) andar(g.coordinates);
  return caixaDosPontos(pts);
}
