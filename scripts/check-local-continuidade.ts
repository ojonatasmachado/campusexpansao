// O4: cadeias autenticadas no banco descartável. Não é prova de tela, push ou família real.
import assert from "node:assert/strict";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { spawnSync } from "node:child_process";
import { withDisposableSupabase } from "./check-local-rls";

const checks: string[] = [];
const ok = (value: unknown, name: string) => { assert.ok(value, name); checks.push(name); console.log(`ok ${name}`); };
withDisposableSupabase(async (db) => {
  async function login(account: string) {
    const client = createClient(db.url, db.anonKey, { auth: { persistSession: false, autoRefreshToken: false } });
    assert.equal((await client.auth.signInWithPassword({ email: `${account}@teste.local`, password: "TesteLocal123" })).error, null);
    return client;
  }
  const pastor = await login("master"), equipe = await login("lider"), familia = await login("membro"), estranho = await login("membro2"), outra = await login("outra");
  const church = await pastor.schema("service").from("churches").select("id,organization_id").eq("name", "Igreja Teste Local").single();
  assert.equal(church.error, null);
  const org = church.data!.organization_id, churchId = church.data!.id;
  const people = await pastor.schema("service").from("people").select("id,email").eq("organization_id", org);
  assert.equal(people.error, null);
  const person = (account: string) => people.data!.find((p) => p.email === `${account}@teste.local`)!.id as string;
  const member = await familia.schema("service").from("members").select("id").eq("email", "membro@teste.local").single();
  assert.equal(member.error, null);
  const memberId = member.data!.id;
  async function create(client: SupabaseClient, table: string, values: Record<string, unknown>) {
    const result = await client.schema("service").from(table).insert({ organization_id: org, ...values }).select("id").single();
    assert.equal(result.error, null, `${table}: ${result.error?.message}`);
    assert.ok(result.data?.id);
    return result.data.id as string;
  }
  async function hidden(client: SupabaseClient, table: string, id: string) {
    const result = await client.schema("service").from(table).select("id").eq("id", id);
    assert.equal(result.error, null);
    return result.data.length === 0;
  }

  const visit = await create(pastor, "visitors", { church_id: churchId, name: "Visitante O4", responsible_id: person("lider"), stage: "novo", visited_on: "2026-10-25" });
  const assigned = await equipe.schema("service").from("visitors").select("id,name,responsible_id,stage").eq("responsible_id", person("lider")).eq("id", visit).single();
  ok(!assigned.error && assigned.data?.name === "Visitante O4", "Visitantes: atribuição da gestão chega ao responsável autenticado");
  ok(await hidden(estranho, "visitors", visit), "Visitantes: pessoa sem liberação não lê acompanhamento");
  const reply = await equipe.schema("service").from("visitors").update({ stage: "contato", reply_status: "respondeu" }).eq("id", visit).select("id");
  ok(!reply.error && reply.data?.length === 1, "Visitantes: responsável registra resposta e avança etapa");
  await create(equipe, "visitor_notes", { visitor_id: visit, body: "Contato O4 respondido", author: "Lucas Líder" });
  const seen = await pastor.schema("service").from("visitors").select("stage,reply_status").eq("id", visit).single();
  const notes = await pastor.schema("service").from("visitor_notes").select("body").eq("visitor_id", visit);
  ok(!seen.error && seen.data?.stage === "contato" && seen.data?.reply_status === "respondeu" && notes.data?.[0]?.body === "Contato O4 respondido", "Visitantes: resposta e histórico voltam à gestão");
  ok(await hidden(outra, "visitors", visit), "Visitantes: outra igreja não recebe atribuição nem resposta");

  const turma = await create(pastor, "kids_classes", { church_id: churchId, name: "Turma O4" });
  const child = await create(pastor, "children", { church_id: churchId, class_id: turma, name: "Criança O4" });
  await create(pastor, "child_guardians", { child_id: child, guardian_person_id: person("membro"), can_pickup: true, is_primary: true });
  const event = await create(pastor, "events", { church_id: churchId, name: "Culto O4", event_date: "2026-10-25" });
  const session = await create(pastor, "kids_sessions", { event_id: event, class_id: turma, checkin_active: true });
  const attendance = await create(equipe, "kids_attendance", { session_id: session, child_id: child, status: "presente", dropped_off_via: "manual" });
  const parentView = await familia.schema("service").from("kids_attendance").select("status").eq("id", attendance).single();
  ok(!parentView.error && parentView.data?.status === "presente", "Kids: check-in da equipe chega ao responsável correto");
  ok(await hidden(estranho, "kids_attendance", attendance), "Kids: outra família não recebe presença da criança");
  const request = await familia.schema("service").from("kids_attendance").update({ status: "retirada_pendente", pickup_requested_by: person("membro"), pickup_requested_at: new Date().toISOString() }).eq("id", attendance).select("id");
  ok(!request.error && request.data?.length === 1, "Kids: responsável pede retirada");
  const pending = await equipe.schema("service").from("kids_attendance").select("status,pickup_requested_by").eq("id", attendance).single();
  ok(!pending.error && pending.data?.status === "retirada_pendente" && pending.data?.pickup_requested_by === person("membro"), "Kids: pedido volta à equipe com responsável identificado");
  const alone = await familia.schema("service").from("kids_attendance").update({ status: "retirado" }).eq("id", attendance).select("id");
  const stillPending = await equipe.schema("service").from("kids_attendance").select("status").eq("id", attendance).single();
  ok((!!alone.error || alone.data?.length === 0) && !stillPending.error && stillPending.data?.status === "retirada_pendente", "Kids: família não confirma sozinha a entrega");
  const confirmed = await equipe.schema("service").from("kids_attendance").update({ status: "retirado", picked_up_confirmed_by: person("lider"), picked_up_by: person("membro"), picked_up_at: new Date().toISOString(), picked_up_via: "manual" }).eq("id", attendance).select("id");
  ok(!confirmed.error && confirmed.data?.length === 1, "Kids: equipe confirma entrega");
  const finalParent = await familia.schema("service").from("kids_attendance").select("status,picked_up_confirmed_by").eq("id", attendance).single();
  ok(!finalParent.error && finalParent.data?.status === "retirado" && finalParent.data?.picked_up_confirmed_by === person("lider"), "Kids: confirmação retorna à família");
  ok(await hidden(outra, "kids_attendance", attendance), "Kids: outra igreja não lê a cadeia");

  const course = await create(pastor, "courses", { church_id: churchId, name: "Curso O4", kind: "presencial" });
  const courseModule = await create(pastor, "course_modules", { course_id: course, name: "Módulo O4" });
  const lesson = await create(pastor, "course_lessons", { module_id: courseModule, name: "Aula O4", kind: "presencial", checkin_active: true });
  const offered = await familia.schema("service").from("courses").select("name").eq("id", course).single();
  ok(!offered.error && offered.data?.name === "Curso O4", "Cursos: oferta da gestão chega ao membro");
  const enrolled = await familia.schema("service").rpc("enroll_me", { p_course: course });
  ok(!enrolled.error && enrolled.data === "ok", "Cursos: membro se inscreve pela RPC real");
  const received = await pastor.schema("service").from("enrollments").select("id,member_id,status").eq("course_id", course).eq("member_id", memberId).single();
  ok(!received.error && received.data?.member_id === memberId && received.data?.status === "cursando", "Cursos: inscrição retorna à gestão");
  const attendanceId = await create(familia, "lesson_attendance", { course_id: course, lesson_id: lesson, member_id: memberId, via: "qr" });
  const sawAttendance = await pastor.schema("service").from("lesson_attendance").select("member_id").eq("id", attendanceId).single();
  ok(!sawAttendance.error && sawAttendance.data?.member_id === memberId, "Cursos: presença do membro chega à gestão");
  await familia.schema("service").from("enrollments").update({ done_count: 1, status: "concluido" }).eq("id", received.data!.id);
  const progress = await familia.schema("service").from("enrollments").select("done_count,status").eq("id", received.data!.id);
  ok(!progress.error && progress.data?.[0]?.done_count === 1 && progress.data?.[0]?.status === "concluido", "Cursos: conclusão pelo fluxo do membro persiste e volta ao app");
  const duplicate = await familia.schema("service").from("lesson_attendance").insert({ organization_id: org, course_id: course, lesson_id: lesson, member_id: memberId, via: "qr" });
  ok(duplicate.error?.code === "23505", "Cursos: repetir presença não duplica conclusão");
  const forged = await estranho.schema("service").from("lesson_attendance").insert({ organization_id: org, course_id: course, lesson_id: lesson, member_id: memberId, via: "qr" });
  ok(forged.error?.code === "42501", "Cursos: colega não registra presença por outra pessoa");
  await familia.schema("service").from("enrollments").update({ done_count: 100, status: "concluido" }).eq("id", received.data!.id);
  const protectedProgress = await pastor.schema("service").from("enrollments").select("done_count,status").eq("id", received.data!.id).single();
  ok(!protectedProgress.error && protectedProgress.data?.done_count === 1, "Cursos: membro não inventa contagem diretamente");

  const nextCourse = await create(pastor, "courses", { church_id: churchId, name: "Curso O4 paralelo", kind: "presencial" });
  const nextModule = await create(pastor, "course_modules", { course_id: nextCourse, name: "Módulo paralelo" });
  const nextLessons = await Promise.all(["A", "B"].map((name) => create(pastor, "course_lessons", { module_id: nextModule, name, kind: "presencial", checkin_active: true })));
  const noEnrollment = await familia.schema("service").from("lesson_attendance").insert({ organization_id: org, course_id: nextCourse, lesson_id: nextLessons[0], member_id: memberId, via: "qr" });
  ok(noEnrollment.error?.code === "23514", "Cursos: presença exige matrícula antes de gerar progresso");
  const mismatch = await familia.schema("service").from("lesson_attendance").insert({ organization_id: org, course_id: course, lesson_id: nextLessons[0], member_id: memberId, via: "qr" });
  ok(mismatch.error?.code === "23514", "Cursos: aula de outro curso não conta como conclusão");
  assert.equal((await familia.schema("service").rpc("enroll_me", { p_course: nextCourse })).data, "ok");
  const concurrent = await Promise.all(nextLessons.map((id) => familia.schema("service").from("lesson_attendance").insert({ organization_id: org, course_id: nextCourse, lesson_id: id, member_id: memberId, via: "qr" }).select("id").single()));
  ok(concurrent.every((r) => !r.error), "Cursos: duas presenças simultâneas são aceitas");
  const complete = await pastor.schema("service").from("enrollments").select("id,done_count,status").eq("course_id", nextCourse).eq("member_id", memberId).single();
  ok(!complete.error && complete.data?.done_count === 2 && complete.data?.status === "concluido", "Cursos: concorrência não perde progresso nem conclusão");
  const removed = await equipe.schema("service").from("lesson_attendance").delete().eq("id", concurrent[0].data!.id).select("id");
  assert.equal(removed.error, null);
  assert.equal(removed.data?.length, 1);
  const corrected = await familia.schema("service").from("enrollments").select("done_count,status").eq("id", complete.data!.id).single();
  ok(!corrected.error && corrected.data?.done_count === 1 && corrected.data?.status === "cursando", "Cursos: correção da presença pela equipe retorna ao membro");
  await create(equipe, "lesson_attendance", { course_id: nextCourse, lesson_id: nextLessons[0], member_id: memberId, via: "manual" });
  const manual = await familia.schema("service").from("enrollments").select("done_count,status").eq("id", complete.data!.id).single();
  ok(!manual.error && manual.data?.done_count === 2 && manual.data?.status === "concluido", "Cursos: presença manual também conclui sem segunda escrita");

  // Simula exclusivamente neste banco a situação anterior à correção e reaplica
  // a migração para provar recuperação sem reduzir conclusões manuais/importadas.
  const admin = createClient(db.url, db.serviceRoleKey, { auth: { persistSession: false } });
  assert.equal((await admin.schema("service").from("enrollments").update({ done_count: 0, status: "cursando" }).eq("id", received.data!.id)).error, null);
  const importedCourse = await create(pastor, "courses", { church_id: churchId, name: "Conclusão importada O4", kind: "trilha" });
  const imported = await create(pastor, "enrollments", { course_id: importedCourse, member_id: memberId, done_count: 8, status: "concluido" });
  const migration = spawnSync("docker", ["exec", "-i", `supabase_db_${db.projectId}`, "psql", "-U", "postgres", "-d", "postgres", "-v", "ON_ERROR_STOP=1"], { input: readFileSync(resolve(__dirname, "../supabase/migrations/0097_service_course_progress.sql"), "utf8"), encoding: "utf8" });
  assert.equal(migration.status, 0, migration.stderr);
  const recovered = await familia.schema("service").from("enrollments").select("done_count,status").eq("id", received.data!.id).single();
  const untouched = await familia.schema("service").from("enrollments").select("done_count,status").eq("id", imported).single();
  ok(!recovered.error && recovered.data?.done_count === 1 && recovered.data?.status === "concluido", "Cursos: migração recupera progresso comprovado de presença antiga");
  ok(!untouched.error && untouched.data?.done_count === 8 && untouched.data?.status === "concluido", "Cursos: migração preserva conclusão importada sem presença");
  ok(await hidden(estranho, "enrollments", received.data!.id), "Cursos: colega não vê inscrição alheia");
  ok(await hidden(outra, "courses", course), "Cursos: outra igreja não recebe curso");

  const dir = resolve(__dirname, "../prints/o4-continuidade");
  mkdirSync(dir, { recursive: true });
  writeFileSync(resolve(dir, "resultado.json"), JSON.stringify({ executedAt: new Date().toISOString(), scope: "cadeias-autenticadas-banco", checks, success: true }, null, 2) + "\n");
}).catch((error) => { console.error(String(error.message).replace(/eyJ[\w.-]+/g, "[token omitido]")); process.exitCode = 1; });
