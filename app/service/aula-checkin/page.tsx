import { redirect } from "next/navigation";
import { createServiceSupabaseClient } from "../lib/supabase";
import AulaCheckinLandingClient from "./AulaCheckinLandingClient";

type CheckinResult = {
  ok: boolean;
  dup?: boolean;
  bloq?: boolean;
  motivo?: string;
};

/* rota pública lida por quem escaneia o QR físico de uma aula presencial/ao vivo.
   Mesmo padrão de app/service/checkin/page.tsx, mas ligado a
   service.enrollments/service.members em vez de roster/people, porque
   check-in de aula exige matrícula no curso, não escala. */
export default async function AulaCheckinPage({
  searchParams,
}: {
  searchParams: Promise<{ curso?: string; aula?: string; t?: string }>;
}) {
  const { curso: courseId, aula: lessonId, t: token } = await searchParams;
  if (!courseId || !lessonId) redirect("/service");

  const supabase = await createServiceSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    const back = `/service/aula-checkin?curso=${encodeURIComponent(courseId)}&aula=${encodeURIComponent(lessonId)}${token ? `&t=${encodeURIComponent(token)}` : ""}`;
    redirect(`/service/login?redirect=${encodeURIComponent(back)}`);
  }

  const { data: lessonRow } = await supabase
    .schema("service")
    .from("course_lessons")
    .select("id,module_id,name,kind,checkin_token,checkin_active")
    .eq("id", lessonId)
    .maybeSingle();

  const { data: moduleRow } = lessonRow
    ? await supabase.schema("service").from("course_modules").select("id,course_id").eq("id", lessonRow.module_id).maybeSingle()
    : { data: null };

  const { data: courseRow } = moduleRow
    ? await supabase.schema("service").from("courses").select("id,organization_id,name").eq("id", moduleRow.course_id).maybeSingle()
    : { data: null };

  const { data: personRow } = await supabase
    .schema("service")
    .from("people")
    .select("id")
    .eq("user_id", user.id)
    .maybeSingle();

  const { data: memberRow } = personRow
    ? await supabase.schema("service").from("members").select("id,name").eq("volunteer_id", personRow.id).maybeSingle()
    : { data: null };

  let result: CheckinResult;

  if (!lessonRow || !moduleRow || !courseRow || moduleRow.course_id !== courseId) {
    result = { ok: false, motivo: "Este QR Code não aponta para uma aula válida." };
  } else if (!memberRow) {
    result = { ok: false, bloq: true, motivo: "Você não tem um cadastro de membro nesta igreja. Fale com a liderança." };
  } else if (!lessonRow.checkin_active) {
    result = { ok: false, motivo: "Este QR Code está desativado. Procure a liderança." };
  } else if (token && lessonRow.checkin_token && token !== lessonRow.checkin_token) {
    result = { ok: false, motivo: "QR Code inválido ou expirado. Peça o atual à liderança." };
  } else {
    const { data: enrollmentRow } = await supabase
      .schema("service")
      .from("enrollments")
      .select("id,done_count")
      .eq("course_id", courseRow.id)
      .eq("member_id", memberRow.id)
      .maybeSingle();

    if (!enrollmentRow) {
      result = { ok: false, bloq: true, motivo: "Você não está matriculado neste curso. Fale com a liderança." };
    } else {
      const { error: insertError } = await supabase
        .schema("service")
        .from("lesson_attendance")
        .insert({ organization_id: courseRow.organization_id, course_id: courseRow.id, lesson_id: lessonId, member_id: memberRow.id, via: "qr" });

      if (insertError && (insertError as { code?: string }).code !== "23505") {
        result = { ok: false, motivo: "Não foi possível registrar agora." };
      } else if (insertError) {
        result = { ok: false, dup: true, motivo: "Seu check-in nesta aula já foi registrado." };
      } else {
        const { data: courseModuleRows } = await supabase.schema("service").from("course_modules").select("id").eq("course_id", courseRow.id);
        const moduleIds = (courseModuleRows ?? []).map((m) => m.id as string);
        const { data: courseLessonRows } = moduleIds.length
          ? await supabase.schema("service").from("course_lessons").select("id").in("module_id", moduleIds)
          : { data: [] };
        const lessonIds = (courseLessonRows ?? []).map((l) => l.id as string);

        const { data: attendanceRows } = lessonIds.length
          ? await supabase.schema("service").from("lesson_attendance").select("lesson_id").eq("member_id", memberRow.id).in("lesson_id", lessonIds)
          : { data: [] };
        const doneCount = new Set((attendanceRows ?? []).map((a) => a.lesson_id as string)).size;

        await supabase.schema("service").from("enrollments").update({
          done_count: doneCount,
          status: lessonIds.length > 0 && doneCount >= lessonIds.length ? "concluido" : "cursando",
        }).eq("id", enrollmentRow.id);

        result = { ok: true };
      }
    }
  }

  return (
    <AulaCheckinLandingClient
      courseName={courseRow?.name ?? "Curso"}
      lessonName={lessonRow?.name ?? "Aula"}
      person={memberRow ? { id: memberRow.id, name: memberRow.name } : null}
      result={result}
    />
  );
}
