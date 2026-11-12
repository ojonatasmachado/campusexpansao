import assert from "node:assert/strict";
import { clearMemberLocation, memberNotificationUrl, readMemberLocation, writeMemberLocation } from "../app/service/lib/member-navigation";
const allowed = (tab: string, sub: string) => (tab === "caminhada" && sub === "cursos") || (tab === "mensagens" && sub === "mural") || (tab === "agenda" && sub === "tarefas");
const original = new URL("http://localhost:3003/service?modo=light#conteudo");
const aula = { tab: "caminhada" as const, sub: "cursos", segment: "minha" as const, announcement: null, card: null, chat: null, event: null };
const url = writeMemberLocation(original, aula);
assert.deepEqual(readMemberLocation(url, allowed), aula);
assert.equal(original.searchParams.has("maba"), false);
assert.equal(url.searchParams.get("modo"), "light");
assert.equal(url.hash, "#conteudo");
assert.equal(readMemberLocation(url, () => false).sub, null);
assert.equal(readMemberLocation(new URL("http://localhost/service?maba=perfil&mtela=cursos"), allowed).sub, null);
assert.equal(readMemberLocation(new URL("http://localhost/service?maba=financeiro&mtela=cursos"), allowed).tab, "inicio");
const aviso = writeMemberLocation(url, { ...aula, tab: "mensagens", sub: "mural", announcement: "an-3" });
assert.equal(readMemberLocation(aviso, allowed).announcement, "an-3");
assert.equal(readMemberLocation(new URL("http://localhost/service?maba=mensagens&mtela=mural&maviso=https://exemplo.com"), allowed).announcement, null);
const agenda = writeMemberLocation(aviso, { ...aula, tab: "agenda", sub: "tarefas", segment: "igreja", card: "c-1" });
assert.equal(agenda.searchParams.has("maviso"), false);
assert.equal(readMemberLocation(agenda, allowed).card, "c-1");
assert.equal(readMemberLocation(agenda, allowed).segment, "minha");
assert.equal(readMemberLocation(agenda, allowed).sub, null);
const embeddedTask = new URL("http://localhost/service?maba=agenda&mtarefa=c-1&msegmento=igreja");
assert.equal(readMemberLocation(embeddedTask, allowed).card, "c-1");
assert.equal(readMemberLocation(embeddedTask, allowed).segment, "minha");
assert.equal(readMemberLocation(embeddedTask, () => false).card, null);
const legacyTask = new URL("http://localhost/service?maba=agenda&mtela=tarefas&mtarefa=c-1");
assert.equal(readMemberLocation(legacyTask, allowed).sub, null);
assert.equal(readMemberLocation(legacyTask, allowed).card, "c-1");
const churchAgenda = writeMemberLocation(original, { ...aula, tab: "agenda", sub: null, segment: "igreja" });
assert.equal(readMemberLocation(churchAgenda, allowed).segment, "igreja");
console.log("Navegação: recarga, destinos permitidos, aba correta, IDs de aviso/tarefa e preservação de parâmetros independentes.");

for (const [category, tab] of [["escala", "agenda"], ["mensagens", "mensagens"], ["mural", "mensagens"], ["caminhada", "caminhada"]]) {
 const old = new URL(`http://localhost/service?aviso=${category}`);
 assert.equal(readMemberLocation(old, allowed).tab, tab);
 const current = new URL(memberNotificationUrl(category, "an-3"), "http://localhost");
 assert.equal(readMemberLocation(current, allowed).tab, tab);
 if (category === "mural") assert.equal(readMemberLocation(current, allowed).announcement, "an-3");
}
assert.equal(memberNotificationUrl("externo"), "/service");
assert.equal(clearMemberLocation(agenda).search, "?modo=light");
assert.equal(clearMemberLocation(agenda).hash, "#conteudo");

/* M3: conversa aberta e folha do evento voltam na recarga, só com ID e só onde cabem */
const conversa = writeMemberLocation(original, { tab: "mensagens", sub: null, segment: "minha", announcement: null, card: null, chat: "chat-1" });
assert.equal(conversa.searchParams.get("mconversa"), "chat-1");
assert.equal(readMemberLocation(conversa, allowed).chat, "chat-1");
assert.equal(writeMemberLocation(original, { tab: "inicio", sub: null, segment: "minha", announcement: null, card: null, chat: "chat-1" }).searchParams.has("mconversa"), false);
assert.equal(readMemberLocation(new URL("http://localhost/service?maba=inicio&mconversa=chat-1"), allowed).chat, null);
assert.equal(readMemberLocation(new URL("http://localhost/service?maba=mensagens&mtela=mural&mconversa=chat-1"), allowed).chat, null);
assert.equal(readMemberLocation(new URL("http://localhost/service?maba=mensagens&mconversa=Pedido%20de%20ora%C3%A7%C3%A3o"), allowed).chat, null);
const evento = writeMemberLocation(original, { tab: "agenda", sub: null, segment: "igreja", announcement: null, card: null, event: "ev_9" });
assert.equal(readMemberLocation(evento, allowed).event, "ev_9");
assert.equal(readMemberLocation(new URL("http://localhost/service?maba=agenda&mevento=https://x.y"), allowed).event, null);
assert.equal(clearMemberLocation(evento).searchParams.has("mevento"), false);
assert.equal(writeMemberLocation(evento, { tab: "inicio", sub: null, segment: "minha", announcement: null, card: null }).searchParams.has("mevento"), false);
