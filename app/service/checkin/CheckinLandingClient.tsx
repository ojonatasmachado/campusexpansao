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
}: {
  event: EventView;
  person: PersonView | null;
  result: CheckinResult;
}) {
  const router = useRouter();
  return (
    <CheckinLanding
      event={event}
      person={person}
      result={result}
      onDone={() => router.push("/service")}
    />
  );
}
