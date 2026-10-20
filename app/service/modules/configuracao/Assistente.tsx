"use client";

/* Configuração guiada em 3 fases (v7 4.12). Dá para pular e retomar; cada
   fase mostra o tempo estimado e termina num resumo em frase. As gravações
   são do painel (ServiceExactApp), que passa as ações prontas: este arquivo
   só desenha e decide a ordem. */
import { useState } from "react";
import CepInput from "../../CepInput";
import ChurchLockup from "../../ChurchLockup";
import { ImageUpload } from "../../ImageUpload";
import { Icon } from "../../lib/icons";
import { plural } from "../../lib/plural";
import { ACCENT_PRESETS, themeCss, type BrandCfg } from "../../lib/theme";
import { useTermos } from "../../lib/vocabulario-context";
import { FASES, HORARIOS, MODELOS_TIMES, datasDoHorario, fimDoAno, nomeDoCulto, resumoDosCultos, vagasDoModelo, type ModeloTime, type SetupEstado } from "./setup";

export type DadosIgreja = { nome: string; cep: string; endereco: string; bairro: string; cidade: string; estado: string };

export function Assistente({
  estado, onEstado, igreja, logoUrl, brand, onSalvarDados, onLogo, onRemoverLogo, onCor,
  timesExistentes, vagasExistentes, onCriarTimes, onCriarCultos, onDesfazer, onConvidar, onIr,
}: {
  estado: SetupEstado;
  onEstado: (e: SetupEstado) => Promise<void>;
  igreja: DadosIgreja;
  logoUrl?: string | null;
  brand: BrandCfg;
  onSalvarDados: (d: DadosIgreja) => Promise<string | null>;
  onLogo: (file: File) => Promise<void>;
  onRemoverLogo: () => Promise<void>;
  onCor: (hex: string) => Promise<string | null>;
  timesExistentes: string[];
  vagasExistentes: number;
  onCriarTimes: (modelos: ModeloTime[]) => Promise<{ ids: string[]; error?: string }>;
  onCriarCultos: (cultos: { nome: string; data: string; hora: string }[]) => Promise<{ ids: string[]; error?: string }>;
  onDesfazer: (tabela: "ministries" | "events", ids: string[]) => Promise<void>;
  onConvidar: (nome: string, telefone: string) => Promise<string | null>;
  onIr: (rota: "escalas" | "painel" | "times") => void;
}) {
  const { termo, comTermos: ct } = useTermos();
  const [fase, setFase] = useState<1 | 2 | 3>(estado.fase);
  const [resumo, setResumo] = useState<Record<number, string>>({});
  const [erro, setErro] = useState("");
  const [ocupado, setOcupado] = useState(false);

  /* fase 1 */
  const [dados, setDados] = useState<DadosIgreja>(igreja);
  const [cor, setCor] = useState<string>(brand.accent ?? "");
  /* fase 2 */
  const existe = (nome: string) => timesExistentes.some((t) => t.trim().toLowerCase() === nome.toLowerCase());
  const [horarios, setHorarios] = useState<string[]>([]);
  const [ate, setAte] = useState(fimDoAno());
  const [modelos, setModelos] = useState<string[]>(() => MODELOS_TIMES.filter((m) => !existe(m.nome)).map((m) => m.id));
  const [criados, setCriados] = useState<{ times: string[]; cultos: string[] } | null>(null);
  /* fase 3 */
  const [convNome, setConvNome] = useState("");
  const [convTel, setConvTel] = useState("");
  const [convidados, setConvidados] = useState<string[]>([]);

  const escolhidos = HORARIOS.filter((h) => horarios.includes(h.id));
  const modelosEscolhidos = MODELOS_TIMES.filter((m) => modelos.includes(m.id) && !existe(m.nome));
  const vagas = vagasExistentes + modelosEscolhidos.reduce((s, m) => s + vagasDoModelo(m), 0);
  const frase = resumoDosCultos(escolhidos, ate, vagas, termo("culto", { plural: true }).toLowerCase());

  const avancar = async (n: 1 | 2 | 3, texto: string, pulou = false) => {
    const feitas = pulou ? estado.feitas : [...new Set([...estado.feitas, n])];
    const prox = (n < 3 ? n + 1 : 3) as 1 | 2 | 3;
    setResumo((r) => ({ ...r, [n]: texto }));
    await onEstado({ fase: prox, feitas, pulou: pulou || estado.pulou, concluido: n === 3 ? true : estado.concluido });
    setErro("");
    if (n < 3) setFase(prox);
  };

  const salvarFase1 = async () => {
    if (!dados.nome.trim()) { setErro("Digite o nome da igreja."); return; }
    setOcupado(true);
    const e1 = await onSalvarDados(dados);
    const e2 = !e1 && cor && cor !== brand.accent ? await onCor(cor) : null;
    setOcupado(false);
    if (e1 || e2) { setErro(e1 ?? e2 ?? ""); return; }
    const corNome = ACCENT_PRESETS.find((p) => p.hex.toLowerCase() === (cor || "").toLowerCase())?.label;
    await avancar(1, `Pronto: ${dados.nome.trim()}${dados.cidade ? `, em ${dados.cidade}${dados.estado ? `/${dados.estado}` : ""}` : ""}${corNome ? `, com a cor ${corNome}` : ""}.`);
  };

  const criarFase2 = async () => {
    setOcupado(true);
    setErro("");
    const t = modelosEscolhidos.length ? await onCriarTimes(modelosEscolhidos) : { ids: [] as string[] };
    if (t.error) { setOcupado(false); setErro(t.error); return; }
    const lista = escolhidos.flatMap((h) => datasDoHorario(h, ate).map((data) => ({ nome: nomeDoCulto(h, termo("culto")), data, hora: h.hora })));
    const c = lista.length ? await onCriarCultos(lista) : { ids: [] as string[] };
    setOcupado(false);
    if (c.error) { setErro(c.error); if (t.ids.length) await onDesfazer("ministries", t.ids); return; }
    setCriados({ times: t.ids, cultos: c.ids });
  };
  const desfazerFase2 = async () => {
    if (!criados) return;
    setOcupado(true);
    await onDesfazer("events", criados.cultos);
    await onDesfazer("ministries", criados.times);
    setOcupado(false);
    setCriados(null);
  };

  const convidar = async () => {
    if (convNome.trim().split(/\s+/).length < 2) { setErro("Coloque nome e sobrenome."); return; }
    if (convTel.replace(/\D/g, "").length < 10) { setErro("Coloque o telefone com DDD."); return; }
    setOcupado(true);
    const e = await onConvidar(convNome.trim(), convTel);
    setOcupado(false);
    if (e) { setErro(e); return; }
    setErro("");
    setConvidados((l) => [...l, convNome.trim()]);
    setConvNome("");
    setConvTel("");
  };

  const faseInfo = FASES[fase - 1];
  return (
    <div className="content wide">
      {cor && <style dangerouslySetInnerHTML={{ __html: themeCss({ ...brand, accent: cor }) }} />}
      <div className="ph">
        <div>
          <div className="ph-eyebrow">Configuração</div>
          <h1 className="ph-title">Vamos deixar a igreja pronta</h1>
          <p className="ph-sub">Três fases curtas. Dá para pular qualquer uma e continuar depois do ponto em que parou.</p>
        </div>
        <div className="ph-actions"><button className="btn btn-sec" type="button" onClick={() => onIr("painel")}>Continuar depois</button></div>
      </div>

      <ol className="setup-fases">
        {FASES.map((f) => {
          const feita = estado.feitas.includes(f.n);
          return (
            <li key={f.n} className={`${fase === f.n ? "on" : ""}${feita ? " feita" : ""}`}>
              <button type="button" onClick={() => { setErro(""); setFase(f.n as 1 | 2 | 3); }} aria-current={fase === f.n ? "step" : undefined}>
                <span className="setup-n">{feita ? <Icon name="ok" size={14} /> : f.n}</span>
                <span className="setup-ft"><b>{ct(f.t)}</b><span>{feita ? "feita" : `cerca de ${plural(f.min, "minuto")}`}</span></span>
              </button>
            </li>
          );
        })}
      </ol>

      <div className="cfg-card setup-card">
        <div className="cfg-card-t">{`Fase ${fase} · ${ct(faseInfo.t)}`}</div>
        <div className="cfg-card-s">{`${ct(faseInfo.s)}. Cerca de ${plural(faseInfo.min, "minuto")}.`}</div>

        {fase === 1 && (
          <div className="setup-body">
            <div className="field"><label className="field-label req">Nome da igreja</label><input className="input" value={dados.nome} onChange={(e) => setDados((d) => ({ ...d, nome: e.target.value }))} /></div>
            <div className="field">
              <label className="field-label">CEP</label>
              <CepInput value={dados.cep} onChange={(v) => setDados((d) => ({ ...d, cep: v }))}
                onResult={(r) => { if (r) setDados((d) => ({ ...d, endereco: r.street ?? d.endereco, bairro: r.neighborhood ?? d.bairro, cidade: r.city ?? d.cidade, estado: r.state ?? d.estado })); }} />
              <div className="field-hint">O CEP preenche o endereço.</div>
            </div>
            <div className="field"><label className="field-label">Endereço</label><input className="input" value={dados.endereco} onChange={(e) => setDados((d) => ({ ...d, endereco: e.target.value }))} /></div>
            <div className="setup-2col">
              <div className="field"><label className="field-label">Cidade</label><input className="input" value={dados.cidade} onChange={(e) => setDados((d) => ({ ...d, cidade: e.target.value }))} /></div>
              <div className="field"><label className="field-label">Estado</label><input className="input" value={dados.estado} maxLength={2} onChange={(e) => setDados((d) => ({ ...d, estado: e.target.value.toUpperCase() }))} /></div>
            </div>
            <ImageUpload label="Logo" hint="Aparece ao lado de Service no app, no login e no convite." url={logoUrl} onUpload={onLogo} onRemove={onRemoverLogo} />
            <div className="field">
              <label className="field-label">Cor da igreja</label>
              <div className="setup-cores" role="radiogroup" aria-label="Cor da igreja">
                {ACCENT_PRESETS.map((p) => (
                  <button key={p.hex} type="button" role="radio" aria-checked={cor.toLowerCase() === p.hex.toLowerCase()} aria-label={p.label}
                    className={`setup-cor${cor.toLowerCase() === p.hex.toLowerCase() ? " on" : ""}`} style={{ background: p.hex }} onClick={() => setCor(p.hex)} />
                ))}
              </div>
              <div className="field-hint">A tela já mostra a cor escolhida. Ajuste fino em Configurações › Personalização.</div>
            </div>
            <div className="setup-previa" aria-hidden="true">
              <ChurchLockup size="sm" logoUrl={logoUrl} name={dados.nome || "Sua igreja"} />
              <span className="btn btn-pri btn-sm">{ct("Confirmar presença no {culto}")}</span>
            </div>
          </div>
        )}

        {fase === 2 && (
          <div className="setup-body">
            {!criados ? (
              <>
                <div className="field">
                  <label className="field-label">{ct("Quando acontecem os {cultos}")}</label>
                  <div className="seg-check">
                    {HORARIOS.map((h) => (
                      <button key={h.id} type="button" className={`seg-chip ${horarios.includes(h.id) ? "on" : ""}`} aria-pressed={horarios.includes(h.id)}
                        onClick={() => setHorarios((l) => (l.includes(h.id) ? l.filter((x) => x !== h.id) : [...l, h.id]))}>{h.rotulo}</button>
                    ))}
                  </div>
                </div>
                <div className="field"><label className="field-label">Criar até</label><input className="input" type="date" value={ate} onChange={(e) => setAte(e.target.value)} /></div>
                <div className="field">
                  <label className="field-label">Times a partir de modelos</label>
                  <div className="setup-modelos">
                    {MODELOS_TIMES.map((m) => {
                      const ja = existe(m.nome);
                      const on = modelos.includes(m.id) && !ja;
                      return (
                        <button key={m.id} type="button" className={`setup-modelo${on ? " on" : ""}`} aria-pressed={on} disabled={ja}
                          onClick={() => setModelos((l) => (l.includes(m.id) ? l.filter((x) => x !== m.id) : [...l, m.id]))}>
                          <Icon name={m.icone} size={18} />
                          <span><b>{m.nome}</b><span>{ja ? "já existe" : m.funcoes.map((f) => f.nome).join(", ")}</span></span>
                        </button>
                      );
                    })}
                  </div>
                </div>
                {(frase || modelosEscolhidos.length > 0) && (
                  <p className="setup-frase">{[frase, modelosEscolhidos.length ? `E os times ${modelosEscolhidos.map((m) => m.nome).join(", ").replace(/, ([^,]*)$/, " e $1")}, com as funções de cada um.` : ""].filter(Boolean).join(" ")}</p>
                )}
              </>
            ) : (
              <p className="setup-frase">{`Criamos ${plural(criados.cultos.length, termo("culto").toLowerCase(), termo("culto", { plural: true }).toLowerCase())} e ${plural(criados.times.length, "time")}.`}</p>
            )}
          </div>
        )}

        {fase === 3 && (
          <div className="setup-body">
            <p className="cfg-card-s" style={{ marginTop: 0 }}>Cadastre cada líder com nome e telefone. O convite abre no WhatsApp com o link de acesso; a pessoa cria o e-mail e a senha no link. Depois, marque quem lidera cada time em Times.</p>
            <div className="setup-2col">
              <div className="field"><label className="field-label">Nome e sobrenome</label><input className="input" value={convNome} onChange={(e) => setConvNome(e.target.value)} /></div>
              <div className="field"><label className="field-label">Telefone (WhatsApp)</label><input className="input" type="tel" value={convTel} placeholder="(11) 90000-0000" onChange={(e) => setConvTel(e.target.value)} /></div>
            </div>
            <button className="btn btn-sec" type="button" disabled={ocupado} onClick={convidar}><Icon name="whatsapp" size={15} /> Convidar pelo WhatsApp</button>
            {convidados.length > 0 && <p className="setup-frase">{`Convites enviados: ${convidados.join(", ")}.`}</p>}
            <div className="setup-2col" style={{ marginTop: 14 }}>
              <button className="btn btn-sec" type="button" onClick={() => onIr("times")}>Marcar os líderes em Times</button>
              <button className="btn btn-sec" type="button" onClick={() => onIr("escalas")}>Montar a primeira escala →</button>
            </div>
          </div>
        )}

        {resumo[fase] && <p className="setup-frase">{resumo[fase]}</p>}
        {erro && <p className="field-error">{erro}</p>}

        <div className="setup-foot">
          <button className="btn btn-ghost" type="button" disabled={ocupado} onClick={() => (fase < 3 ? avancar(fase, "", true) : onIr("painel"))}>{fase < 3 ? "Pular esta fase" : "Fazer depois"}</button>
          {fase === 1 && <button className="btn btn-pri" type="button" disabled={ocupado} onClick={salvarFase1}>{ocupado ? "Salvando..." : "Salvar e continuar →"}</button>}
          {fase === 2 && !criados && <button className="btn btn-pri" type="button" disabled={ocupado || (!escolhidos.length && !modelosEscolhidos.length)} onClick={criarFase2}>{ocupado ? "Criando..." : "Criar"}</button>}
          {fase === 2 && criados && (
            <>
              <button className="btn btn-sec" type="button" disabled={ocupado} onClick={desfazerFase2}>Desfazer</button>
              <button className="btn btn-pri" type="button" disabled={ocupado} onClick={() => avancar(2, `Criamos ${plural(criados.cultos.length, termo("culto").toLowerCase(), termo("culto", { plural: true }).toLowerCase())} e ${plural(criados.times.length, "time")}.`)}>Continuar →</button>
            </>
          )}
          {fase === 3 && <button className="btn btn-pri" type="button" disabled={ocupado} onClick={async () => { await avancar(3, `Você convidou ${plural(convidados.length, "líder", "líderes")}.`); onIr("painel"); }}>Concluir</button>}
        </div>
      </div>
    </div>
  );
}
