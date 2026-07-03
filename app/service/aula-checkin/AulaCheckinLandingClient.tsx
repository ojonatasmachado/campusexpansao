"use client";

import { useRouter } from "next/navigation";
import { AulaCheckinLanding } from "../AulaCheckin";

type MemberView = { id: string; name: string };

type CheckinResult = {
  ok: boolean;
  dup?: boolean;
  bloq?: boolean;
  motivo?: string;
};

export default function AulaCheckinLandingClient({
  courseName, lessonName, person, result,
}: {
  courseName: string;
  lessonName: string;
  person: MemberView | null;
  result: CheckinResult;
}) {
  const router = useRouter();
  return (
    <AulaCheckinLanding
      courseName={courseName}
      lessonName={lessonName}
      person={person}
      result={result}
      onDone={() => router.push("/service")}
    />
  );
}
