// Acentos, plurais e rótulos do Service (texto visível apenas).
// Uso, na raiz do projeto:
//   node scripts/acentos-service.mjs            → só mostra o que vai trocar
//   node scripts/acentos-service.mjs --aplicar  → grava
// Cada troca é exata. Se o arquivo mudou e uma troca não bate, o script
// avisa e pula aquela (nada é trocado "mais ou menos"). Valores de banco
// (ex.: relationship: "responsavel") e identificadores não estão na lista.
import { readFileSync, writeFileSync } from "node:fs";

const APLICAR = process.argv.includes("--aplicar");

// [de, para, trocarTodas?]
const ARQUIVOS = {
  "app/service/MobileApp.tsx": [
  [">Sua proxima escala<", ">Sua próxima escala<"],
  ["Nenhuma escala agendada para voce.", "Nenhuma escala agendada para você."],
  ["Em quais cultos voce pode servir", "Em quais cultos você pode servir"],
  ["✓ Voce confirmou", "✓ Você confirmou"],
  ["Voce recusou", "Você recusou"],
  ["Vamos avisar o seu lider para aprovar a troca de posicao.", "Vamos avisar o seu líder para aprovar a troca de posição."],
  ["Tarefas com voce · {pending.length} aberta(s)", "Tarefas com você · {pending.length} {pending.length === 1 ? \"aberta\" : \"abertas\"}"],
  ["O que a lideranca deixou no quadro para voce. Atualize e comente.", "O que a liderança deixou no quadro para você. Atualize e comente."],
  ["Nada pendente com voce agora.", "Nada pendente com você agora."],
  ["\"Fale com o seu lider ou com um pastor.\"", "\"Fale com o seu líder ou com um pastor.\""],
  ["Nenhum lider disponivel ainda.", "Nenhum líder disponível ainda."],
  ["← Inicio</button>", "← Início</button>", true],
  ["Baixando a Biblia...", "Baixando a Bíblia..."],
  ["{searchResults.length} resultado(s)", "{searchResults.length} {searchResults.length === 1 ? \"resultado\" : \"resultados\"}"],
  ["<b>Minhas marcacoes</b><small>{bibleMarks.length} versiculo(s) marcado(s) ou anotado(s)</small>", "<b>Minhas marcações</b><small>{bibleMarks.length} {bibleMarks.length === 1 ? \"versículo marcado ou anotado\" : \"versículos marcados ou anotados\"}</small>"],
  [">Minhas marcacoes</div>", ">Minhas marcações</div>"],
  ["Toque num versiculo na leitura pra marcar ou anotar.", "Toque num versículo na leitura pra marcar ou anotar."],
  ["\"Copiar versiculo\"", "\"Copiar versículo\""],
  ["O que esse versiculo significa pra voce?", "O que esse versículo significa pra você?"],
  [">Remover marcacao</button>", ">Remover marcação</button>"],
  ["\"Nao encontrei um contato de app pra esse responsavel.\"", "\"Não encontrei um contato no app para esse responsável.\""],
  ["\"Sua crianca\"} precisa de voce na sala Kids.", "\"Sua criança\"} precisa de você na sala Kids."],
  ["\"A foto da crianca e obrigatoria.\"", "\"A foto da criança é obrigatória.\"", true],
  ["\"A foto do responsavel e obrigatoria.\"", "\"A foto do responsável é obrigatória.\""],
  ["\"Nao foi possivel salvar a ficha agora.\"", "\"Não foi possível salvar a ficha agora.\""],
  ["Nenhuma sessao Kids aberta agora. Peca pra liderança abrir o QR do culto de hoje em Cultos & Agenda.", "Nenhuma sessão Kids aberta agora. Peça para a liderança abrir o QR do culto de hoje em Cultos & Agenda."],
  ["Compare o responsavel na porta antes de confirmar.", "Compare o responsável na porta antes de confirmar."],
  ["Nenhuma crianca na sala ainda.", "Nenhuma criança na sala ainda."],
  ["Buscar crianca pra check-in manual...", "Buscar criança para check-in manual..."],
  ["\"Nome da crianca\"", "\"Nome da criança\"", true],
  ["\"Foto da crianca (obrigatoria)\"", "\"Foto da criança (obrigatória)\"", true],
  ["\"Nome do responsavel\"", "\"Nome do responsável\""],
  ["\"Foto do responsavel (obrigatoria)\"", "\"Foto do responsável (obrigatória)\""],
  ["\"Telefone do responsavel\"", "\"Telefone do responsável\""],
  ["\"Parentesco (mae, avo...)\"", "\"Parentesco (mãe, avó...)\""],
  ["faca o curso pre-batismo.", "faça o curso pré-batismo."],
  ["label=\"Inscricoes abertas\"", "label=\"Inscrições abertas\""],
  ["label=\"Em preparacao\"", "label=\"Em preparação\""],
  [">Proximos batismos<", ">Próximos batismos<"],
  [">Pedir oracao</div>", ">Pedir oração</div>"],
  ["A lideranca recebeu e vai te responder.", "A liderança recebeu e vai te responder."],
  ["<span>Notificacoes push</span>", "<span>Notificações push</span>"],
  ["Disponivel quando instalado como app.", "Disponível quando instalado como app."],
  ["<span>Conheca o app</span>", "<span>Conheça o app</span>"],
  ["t: \"Inicio\", s: \"Sua caminhada, avisos e o que precisa da sua atencao.\"", "t: \"Início\", s: \"Sua caminhada, avisos e o que precisa da sua atenção.\""],
  ["Veja onde voce foi escalado e confirme ou peca troca.", "Veja onde você foi escalado e confirme ou peça troca."],
  ["Fale com seu time e sua lideranca direto por aqui.", "Fale com seu time e sua liderança direto por aqui."],
  ["Suas trilhas de formacao, no seu tempo.", "Suas trilhas de formação, no seu tempo."],
  ["Seus dados, tema do app e pedidos de oracao.", "Seus dados, tema do app e pedidos de oração."],
  [">Conheca o app</div>", ">Conheça o app</div>"],
  ["t: churchName ? `Bem-vindo(a) a ${churchName}` : \"Bem-vindo(a) a casa\",", "t: `Bem-vindo(a), ${nome}`,"],
  ["s: `Que bom ter voce aqui, ${nome}. Vamos completar seu cadastro em um minuto.`,", "s: \"Que bom ter você aqui. Vamos completar seu cadastro, leva um minuto.\","],
  ["ok: \"Comecar →\",", "ok: \"Começar →\","],
  ["t: \"Conheca o app\",", "t: \"Conheça o app\","],
  ["veja pra que serve cada aba la embaixo da tela.", "veja para que serve cada aba lá embaixo da tela."],
  ["\"Nao consegui salvar agora.\"", "\"Não consegui salvar agora.\"", true],
  ["\"Pessoa nao encontrada. Precisa ja ter cadastro no Service.\"", "\"Pessoa não encontrada. Ela precisa já ter cadastro no Service.\""],
  ["\"Voce ja e responsavel.\"", "\"Você já é responsável.\""],
  ["\"Essa pessoa ja e responsavel.\"", "\"Essa pessoa já é responsável.\""],
  ["\"O co-responsavel precisa ter uma foto (envie abaixo).\"", "\"O corresponsável precisa ter uma foto (envie abaixo).\""],
  ["\"Nao consegui adicionar agora.\"", "\"Não consegui adicionar agora.\""],
  ["\"Restricoes alimentares\"", "\"Restrições alimentares\""],
  ["\"Plano de saude / convenio\"", "\"Plano de saúde ou convênio\""],
  [">Sua foto de responsavel<", ">Sua foto de responsável<"],
  ["label=\"Foto do responsavel\"", "label=\"Foto do responsável\""],
  ["Só voce, como responsavel principal, pode adicionar co-responsaveis.", "Só você, como responsável principal, pode adicionar corresponsáveis."],
  ["\"Nome (ja precisa ter cadastro)\"", "\"Nome (já precisa ter cadastro)\""],
  ["\"Parentesco (mae, avo, tio...)\"", "\"Parentesco (mãe, avó, tio...)\""],
  ["\"Foto do co-responsavel (obrigatoria)\"", "\"Foto do corresponsável (obrigatória)\""],
  ["+ Adicionar co-responsavel", "+ Adicionar corresponsável"],
  ["Só o responsavel principal pode adicionar outros co-responsaveis.", "Só o responsável principal pode adicionar outros corresponsáveis."],
  [">Eventos de criancas<", ">Eventos de crianças<"],
  ["l: \"Inicio\"", "l: \"Início\""],
  ["Ola, <em>", "Olá, <em>"],
  [">App do voluntario<", ">App do voluntário<"],
  ["\"Nenhum voluntario ativo\"", "\"Nenhum voluntário ativo\""],
  ["\"Cadastre voluntarios em Pessoas para pre-visualizar o app deles aqui.\"", "\"Cadastre voluntários em Pessoas para pré-visualizar o app deles aqui.\""],
  ["conversa com o time e o lider, faz cursos e pede oracao, tudo pelo celular.", "conversa com o time e o líder, faz cursos e pede oração, tudo pelo celular."],
  ["Mesma conta · outra superficie", "Mesma conta · outra superfície"],
  [">Pre-visualizar como<", ">Pré-visualizar como<"],
  ["O voluntario da Recepcao ve o modulo de visitantes no lugar de Cursos.", "O voluntário da Recepção vê o módulo de visitantes no lugar de Cursos."],
  ["{pending.length} escala(s) pra confirmar", "{pending.length} {pending.length === 1 ? \"escala para confirmar\" : \"escalas para confirmar\"}"],
  ["{myCards.length} tarefa(s) com voce", "{myCards.length} {myCards.length === 1 ? \"tarefa com você\" : \"tarefas com você\"}"],
  ["`${lateTasks.length} atrasada(s)`", "`${lateTasks.length} ${lateTasks.length === 1 ? \"atrasada\" : \"atrasadas\"}`"],
  ["Proximo: <em>{nextStep}</em>", "Próximo: <em>{nextStep}</em>"],
  ["</span>Biblia", "</span>Bíblia"],
  ["</span>Pedir oracao", "</span>Pedir oração", true],
  ["{openClasses.length} turma(s)", "{openClasses.length} {openClasses.length === 1 ? \"turma\" : \"turmas\"}"],
  ["{done}/5 etapas", "{done} de 5 etapas", true],
  ],
  "app/service/ServiceExactApp.tsx": [
  ["{gap.event.weekday} · {gap.event.time} · 1 vaga(s)", "{gap.event.weekday} · {gap.event.time}"],
  ["`${gaps.length} pendência(s) nesta semana`", "`${gaps.length} ${gaps.length === 1 ? \"pendência\" : \"pendências\"} nesta semana`"],
  ["{journeyRequests.length} pedido(s)", "{journeyRequests.length} {journeyRequests.length === 1 ? \"pedido\" : \"pedidos\"}"],
  ["{position.need_count} vaga(s)", "{position.need_count} {position.need_count === 1 ? \"vaga\" : \"vagas\"}"],
  ["Nenhuma pendência no recorte atual.", "Nenhuma vaga aberta nesta semana."],
  ["<Kpi icon=\"identidade\" label=\"Taxa de confirmação\"", "<Kpi icon=\"ok\" label=\"Taxa de confirmação\""],
  ["<Kpi icon=\"config\" label=\"Vagas em aberto\"", "<Kpi icon=\"alerta\" label=\"Vagas em aberto\""],
  ],
};

let total = 0;
let pulados = 0;
for (const [arquivo, trocas] of Object.entries(ARQUIVOS)) {
  let texto = readFileSync(arquivo, "utf8");
  for (const [de, para, todas] of trocas) {
    const n = texto.split(de).length - 1;
    if (n === 0) { console.log(`  pulei (não achei) · ${arquivo} · ${de}`); pulados++; continue; }
    if (n > 1 && !todas) { console.log(`  pulei (aparece ${n} vezes) · ${arquivo} · ${de}`); pulados++; continue; }
    texto = texto.split(de).join(para);
    total += n;
    console.log(`  ok × ${n} · ${de.slice(0, 70)}`);
  }
  if (APLICAR) writeFileSync(arquivo, texto);
}
console.log(`\n${total} trocas${APLICAR ? " gravadas" : " prontas (rode com --aplicar para gravar)"}. ${pulados} puladas.`);
