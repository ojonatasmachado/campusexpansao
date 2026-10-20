"use client";

/* Cartão do Início do app (lei 5, tipo "destaque", prioridade baixa): no dia,
   o líder vê quem dos times que lidera faz aniversário e manda parabéns pelo
   WhatsApp. Só o nome aparece: nem data, nem idade.
   O membro comum não recebe nada disso, nem "faz aniversário hoje" de colegas:
   a data entra no cadastro para o cuidado da liderança, não há como a pessoa
   dizer se quer o aniversário mostrado ao time, e a própria leitura da ficha
   dos colegas é fechada para quem não lidera. O líder decide se comenta com o
   time.
   Só times: o app do membro não recebe quem lidera cada grupo; o líder de
   grupo vê os aniversariantes do grupo no painel. */
import { formatarTelefone } from "../../lib/telefone";
import { MENSAGEM_PADRAO, comData, daSemana, linkWhatsapp, mensagemPara, primeiroNome } from "./aniversarios";

type Membro = { id: string; name: string; phone: string; birth: string | null; groupId?: string | null; volunteerId: string | null };
type Pessoa = { id: string; name: string; phone?: string; meta?: { birthday?: string } };
type Time = { id: string; name: string; people: Array<{ personId: string; isLeader: boolean }> };

export type AniversarioNoTime = { id: string; nome: string; telefone: string; time: string };

/** Quem dos times que a pessoa lidera faz aniversário hoje (sem ela mesma). */
export function aniversariosHojeNoMeuTime({ personId, membros, pessoas, times, hoje }: {
  personId: string; membros: Membro[]; pessoas: Pessoa[]; times: Time[]; hoje: string;
}): AniversarioNoTime[] {
  const lidero = times.filter((t) => t.people.some((p) => p.personId === personId && p.isLeader));
  if (lidero.length === 0) return [];
  const base = comData(
    membros.map((m) => ({ ...m, groupId: m.groupId ?? null })),
    pessoas.map((p) => ({ ...p, phone: p.phone ?? "" })),
    lidero,
  ).filter((p) => p.times.length > 0);
  const eu = new Set([personId, ...membros.filter((m) => m.volunteerId === personId).map((m) => m.id)]);
  return daSemana(base, hoje, false, 0)
    .filter((p) => !eu.has(p.id))
    .map((p) => ({ id: p.id, nome: p.nome, telefone: p.telefone, time: lidero.find((t) => p.times.includes(t.id))?.name ?? "" }));
}

/* botão (não link): a casca mede card_acted pelo clique em botão do cartão (lei 11) */
const abrir = (url: string) => window.open(url, "_blank", "noopener");

const nomes = (l: AniversarioNoTime[]) => {
  const n = l.map((p) => primeiroNome(p.nome));
  return n.length <= 2 ? n.join(" e ") : `${n.slice(0, 2).join(", ")} e mais ${n.length - 2}`;
};

export function CartaoAniversario({ pessoas, destaque, onAgoraNao }: { pessoas: AniversarioNoTime[]; destaque: boolean; onAgoraNao: () => void }) {
  const btn = `m6-btn ${destaque ? "pri" : "sec"}`;
  const um = pessoas.length === 1 ? pessoas[0] : null;
  const link = um ? linkWhatsapp(um.telefone, mensagemPara(MENSAGEM_PADRAO, um.nome)) : null;
  const times = [...new Set(pessoas.map((p) => p.time).filter(Boolean))];
  return (
    <div className="m6-card">
      <div className="m6-kick">{times.length === 1 ? `Aniversário · ${times[0]}` : "Aniversário nos seus times"}</div>
      <div className="m6-ct">{um ? `Hoje é aniversário de ${primeiroNome(um.nome)}` : `Hoje fazem aniversário: ${nomes(pessoas)}`}</div>
      {um ? (
        <div className="m6-meta">{link ? "Uma mensagem sua faz diferença no dia." : `Sem celular no cadastro de ${primeiroNome(um.nome)}.`}</div>
      ) : (
        <ul className="m6-aniv">
          {pessoas.slice(0, 6).map((p) => {
            const l = linkWhatsapp(p.telefone, mensagemPara(MENSAGEM_PADRAO, p.nome));
            return (
              <li key={p.id}>
                <span className="m6-aniv-n">{p.nome}</span>
                {l ? <button className="m6-link" type="button" onClick={() => abrir(l)} aria-label={`Mandar parabéns para ${p.nome}, ${formatarTelefone(p.telefone)}`}>Parabéns</button> : <span className="m6-meta">sem celular</span>}
              </li>
            );
          })}
        </ul>
      )}
      <div className="m6-btns">
        {link && <button className={btn} type="button" onClick={() => abrir(link)}>Mandar parabéns</button>}
        <button className="m6-link" type="button" data-dispensa="1" onClick={onAgoraNao}>Agora não</button>
      </div>
    </div>
  );
}
