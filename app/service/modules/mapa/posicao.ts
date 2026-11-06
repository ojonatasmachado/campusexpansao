import { useCallback, useEffect, useState } from "react";
import type { Map as MlMap } from "maplibre-gl";

/* posição de um ponto do mapa na tela, que acompanha o mapa quando ele se
   move (o balão preso ao marcador). Fora da tela: fora = true, para o balão
   ficar escondido mas montado (não puxa o foco de volta). */
export function usePosicaoNoMapa(map: MlMap, onde: [number, number]) {
  const [lng, lat] = onde;
  const projetar = useCallback(() => {
    const p = map.project([lng, lat]);
    const c = map.getContainer();
    return { x: p.x, y: p.y, fora: p.x < 0 || p.y < 0 || p.x > c.clientWidth || p.y > c.clientHeight };
  }, [map, lng, lat]);
  const [pos, setPos] = useState(projetar);
  useEffect(() => {
    const mexeu = () => setPos(projetar());
    mexeu();
    map.on("move", mexeu);
    return () => { map.off("move", mexeu); };
  }, [map, projetar]);
  return pos;
}
