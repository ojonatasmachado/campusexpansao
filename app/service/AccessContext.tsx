"use client";

import { createContext, useContext } from "react";
import type { RequirementRow } from "./lib/requirements";

/* Requisitos e liberações da igreja, disponíveis pra qualquer tela do painel
   sem precisar passar prop por prop (Config, modal de time, editor de curso). */
export type PersonGrant = { personId: string; code: string };

export type ServiceAccessData = {
  organizationId: string;
  currentPersonId: string | null;
  requirements: RequirementRow[];
  personGrants: PersonGrant[];
  courses: { id: string; name: string }[];
  events: { id: string; name: string; eventDate?: string }[];
  groupsLabel: string;
};

const ServiceAccessContext = createContext<ServiceAccessData>({
  organizationId: "",
  currentPersonId: null,
  requirements: [],
  personGrants: [],
  courses: [],
  events: [],
  groupsLabel: "GC",
});

export const ServiceAccessProvider = ServiceAccessContext.Provider;

export function useServiceAccess() {
  return useContext(ServiceAccessContext);
}
