"use client";

import { useRouter } from "next/navigation";
import { CheckinLanding } from "../CheckIn";

type EventView = {
  id: string;
  organizationId: string;
  name: string;
  weekday: string;
  eventDate: string;
  time: string;
  location: string;
  checkinToken: string | null;
  checkinActive: boolean;
};

type PersonView = {
  id: string;
  name: string;
  status: "ativo" | "pausa" | "ferias";
  tags: string[];
};

type CheckinResult = {
  ok: boolean;
  dup?: boolean;
  extra?: boolean;
  bloq?: boolean;
  motivo?: string;
};

export default function CheckinLandingClient({
  event,
  person,
  result,
  churchName,
  logoUrl,
}: {
  event: EventView;
  person: PersonView | null;
  result: CheckinResult;
  churchName?: string;
  logoUrl?: string | null;
}) {
  const router = useRouter();
  return (
    <CheckinLanding
      event={event}
      person={person}
      result={result}
      churchName={churchName}
      logoUrl={logoUrl}
      onDone={() => router.push("/service")}
    />
  );
}
