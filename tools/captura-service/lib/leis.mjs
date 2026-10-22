// Critérios puros: a coleta acontece no navegador; ausência de prova também falha.
export function avaliar(aud, antes = null, membro = false) {
  const falhas = [];
  const exigir = (ok, regra) => { if (!ok) falhas.push(regra); };
  exigir(!aud.erro_medicao, 'medição disponível');
  exigir(!!aud.densidade, 'densidade medida');
  exigir(!aud.axe?.erro && !!aud.axe, 'axe executado');
  exigir((aud[membro ? 'textos_menores_que_13px' : 'textos_menores_que_12px'] ?? 1) === 0, 'texto mínimo');
  exigir((aud.alvos_menores_que_24px ?? 1) === 0, 'alvo mínimo 24px');
  exigir(aud.rolagem_lateral === false, 'sem rolagem lateral');
  exigir((aud.erros_console ?? []).length === 0, 'sem erro de console');
  exigir((aud.requisicoes_com_falha ?? []).length === 0, 'sem falha de rede');
  const contraste = aud.axe?.contraste_nos_total ?? 1;
  exigir(contraste <= (antes?.axe?.contraste_nos_total ?? 0), 'contraste não piora');
  const d = aud.densidade;
  if (d) {
    for (const [campo, max] of Object.entries({ acoes: membro ? 12 : 25, palavrasNaDobra: membro ? 80 : 100, botoesCheiosCor: 1, molduraMaxAninhada: 2, nSobre: 0 })) {
      exigir(Number.isFinite(d[campo]) && d[campo] <= max, `densidade ${campo} <= ${max}`);
      if (antes?.densidade && Number.isFinite(antes.densidade[campo])) exigir(d[campo] <= antes.densidade[campo], `densidade ${campo} não piora`);
    }
  }
  return falhas;
}
