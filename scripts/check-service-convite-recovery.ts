import assert from "node:assert/strict";
import { openMemberInviteWhatsapp } from "../app/service/painel/comum";

async function main() {
  const fetchAnterior = globalThis.fetch;
  const janelaAnterior = Object.getOwnPropertyDescriptor(globalThis, "window");
  let fechadas = 0;
  let destino = "";
  const tab = { closed: false, close: () => { fechadas += 1; }, location: { set href(url: string) { destino = url; } } } as unknown as Window;
  const base = { memberId: "fixture", name: "Pessoa Teste", phone: "11900000000", churchName: "Igreja de teste", tab };
  try {
    Object.defineProperty(globalThis, "window", { configurable: true, value: { open: () => null } });
    globalThis.fetch = async () => { throw new Error("offline simulado"); };
    assert.match((await openMemberInviteWhatsapp(base)).error ?? "", /cadastro foi preservado/);
    assert.equal(fechadas, 1);
    assert.equal(destino, "", "falha de rede não abre destino externo");

    globalThis.fetch = async () => new Response(JSON.stringify({ link: "https://example.invalid/acesso", alreadyHasAccess: false }), { status: 200 });
    assert.match((await openMemberInviteWhatsapp({ ...base, tab: null })).error ?? "", /bloqueou/);

    globalThis.fetch = async () => new Response(JSON.stringify({ link: "https://example.invalid/entrar", alreadyHasAccess: true }), { status: 200 });
    const existente = await openMemberInviteWhatsapp(base);
    assert.equal(existente.error, undefined);
    assert.equal(existente.alreadyHasAccess, true);
    assert.ok(destino.startsWith("https://wa.me/5511900000000?text="));

    await openMemberInviteWhatsapp({ ...base, phone: "+1 202 555 0123" });
    assert.ok(destino.startsWith("https://wa.me/12025550123?text="));
    await openMemberInviteWhatsapp({ ...base, phone: "+351 912 345 678" });
    assert.ok(destino.startsWith("https://wa.me/351912345678?text="));

    destino = "";
    globalThis.fetch = async () => new Response(JSON.stringify({ error: "Sem permissão" }), { status: 403 });
    assert.equal((await openMemberInviteWhatsapp(base)).error, "Sem permissão");
    assert.equal(destino, "");
    console.log("Convite: rede indisponível, janela bloqueada, acesso existente e permissão recusada verificados sem rede externa.");
  } finally {
    globalThis.fetch = fetchAnterior;
    if (janelaAnterior) Object.defineProperty(globalThis, "window", janelaAnterior);
    else Reflect.deleteProperty(globalThis, "window");
  }
}
void main().catch((e) => { console.error(e); process.exitCode = 1; });
