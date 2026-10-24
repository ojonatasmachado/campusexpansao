import type { RouteId } from "../painel/tipos";
import { clearMemberLocation } from "./member-navigation";

export const PANEL_ROUTE_PARAM = "ptela";

/** A URL escolhe entre as telas já liberadas pelo registro. Nunca concede acesso. */
export function panelRoute(value: string | null | undefined, allowed: readonly RouteId[], fallback: RouteId): RouteId {
  return allowed.find((route) => route === value) ?? fallback;
}

export function writePanelLocation(url: URL, route: RouteId): URL {
  const next = clearMemberLocation(url);
  next.searchParams.set(PANEL_ROUTE_PARAM, route);
  return next;
}

export function clearPanelLocation(url: URL): URL {
  const next = new URL(url);
  next.searchParams.delete(PANEL_ROUTE_PARAM);
  return next;
}
