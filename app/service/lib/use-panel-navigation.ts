"use client";

import { useCallback, useEffect, useMemo, useState, type Dispatch, type SetStateAction } from "react";
import type { RouteId } from "../painel/tipos";
import { PANEL_ROUTE_PARAM, panelRoute, writePanelLocation } from "./panel-navigation";

export function usePanelNavigation(initial: string | undefined, allowed: RouteId[], fallback: RouteId, available: boolean, active: boolean, setView: Dispatch<SetStateAction<"app" | "gestao">>) {
  const key = allowed.join("|");
  const routes = useMemo(() => key ? key.split("|") as RouteId[] : [], [key]);
  const [requested, setRequested] = useState(() => panelRoute(initial, routes, fallback));
  const route = panelRoute(requested, routes, fallback);

  const setRoute: Dispatch<SetStateAction<RouteId>> = useCallback((next) => {
    if (!available) return;
    const target = panelRoute(typeof next === "function" ? next(route) : next, routes, fallback);
    const url = writePanelLocation(new URL(window.location.href), target);
    if (url.href !== window.location.href) {
      // Preserva __NA e a árvore do Next. FormScreen mantém sua própria entrada.
      window.history.pushState(window.history.state, "", url.pathname + url.search + url.hash);
    }
    setRequested(target);
  }, [available, fallback, route, routes]);

  useEffect(() => {
    if (!active) return;
    const url = writePanelLocation(new URL(window.location.href), route);
    if (url.href !== window.location.href) window.history.replaceState(window.history.state, "", url.pathname + url.search + url.hash);
  }, [active, route]);

  useEffect(() => {
    const restore = () => {
      if (!available) return;
      const url = new URL(window.location.href);
      if (url.searchParams.has("maba") || url.searchParams.has("aviso")) { setView("app"); return; }
      if (!active && !url.searchParams.has(PANEL_ROUTE_PARAM)) return;
      const target = panelRoute(url.searchParams.get(PANEL_ROUTE_PARAM), routes, fallback);
      if (url.searchParams.has(PANEL_ROUTE_PARAM)) setView("gestao");
      const normalized = writePanelLocation(url, target);
      if (normalized.href !== url.href) window.history.replaceState(window.history.state, "", normalized.pathname + normalized.search + normalized.hash);
      setRequested(target);
    };
    window.addEventListener("popstate", restore);
    return () => window.removeEventListener("popstate", restore);
  }, [active, available, fallback, routes, setView]);

  return [route, setRoute] as const;
}
