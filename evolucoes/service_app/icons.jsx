/* ════════════════════════════════════════════════════════════════
   CE.X SERVICE · BIBLIOTECA DE ÍCONES (linha, 24×24, currentColor)
   Ícones de traço limpo no lugar dos glifos ◆◇→▷. Use:
     <Icon name="painel" />   ·   <Icon name="conversas" size={20} stroke={2} />
   Organizados por seção. Render por dangerouslySetInnerHTML no <svg>.
   ════════════════════════════════════════════════════════════════ */

const CEX_ICONS = {
  /* ── Visão geral / navegação ── */
  painel: '<path d="M3 10.5 12 3l9 7.5"/><path d="M5 9.5V20a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1V9.5"/><path d="M9.5 21v-6h5v6"/>',
  relatorios: '<path d="M3 3v18h18"/><path d="M7 16v-4"/><path d="M12 16V8"/><path d="M17 16v-6"/>',
  config: '<path d="M4 21v-7"/><path d="M4 10V3"/><path d="M12 21v-9"/><path d="M12 8V3"/><path d="M20 21v-5"/><path d="M20 12V3"/><path d="M2 14h4"/><path d="M10 8h4"/><path d="M18 16h4"/>',
  identidade: '<circle cx="12" cy="12" r="9.5"/><path d="m15.8 8.2-2.6 5-5 2.6 2.6-5 5-2.6Z"/>',
  historia: '<circle cx="12" cy="12" r="9.5"/><path d="M12 6.5V12l3.5 2"/>',

  /* ── Pessoas ── */
  membros: '<path d="M16 19v-1a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v1"/><circle cx="9" cy="7.5" r="3.5"/><path d="M22 19v-1a4 4 0 0 0-3-3.87"/><path d="M16 3.63a4 4 0 0 1 0 7.75"/>',
  pessoa: '<path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/>',
  times: '<rect x="3" y="3" width="7.5" height="7.5" rx="1.2"/><rect x="13.5" y="3" width="7.5" height="7.5" rx="1.2"/><rect x="13.5" y="13.5" width="7.5" height="7.5" rx="1.2"/><rect x="3" y="13.5" width="7.5" height="7.5" rx="1.2"/>',
  visitante: '<path d="M15 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="8.5" cy="7" r="4"/><path d="M19 8v6"/><path d="M22 11h-6"/>',

  /* ── Jornada ── */
  decisoes: '<path d="M20.8 5.6a5 5 0 0 0-7.1 0L12 7.3l-1.7-1.7A5 5 0 1 0 3.2 12.7l8.8 8.8 8.8-8.8a5 5 0 0 0 0-7.1Z"/>',
  batismos: '<path d="M12 3s6 5.7 6 10a6 6 0 0 1-12 0c0-4.3 6-10 6-10Z"/>',
  cursos: '<path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2Z"/>',

  /* ── Operação / agenda ── */
  escalas: '<path d="M8 2v4"/><path d="M16 2v4"/><rect x="3" y="5" width="18" height="16" rx="1.5"/><path d="M3 10h18"/><path d="m9 15 2 2 4-4"/>',
  cultos: '<path d="M8 2v4"/><path d="M16 2v4"/><rect x="3" y="5" width="18" height="16" rx="1.5"/><path d="M3 10h18"/>',
  reunioes: '<path d="M9 4h6a1 1 0 0 1 1 1v1H8V5a1 1 0 0 1 1-1Z"/><path d="M8 5H6a1 1 0 0 0-1 1v14a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1V6a1 1 0 0 0-1-1h-2"/><path d="m9 14 2 2 4-4"/>',
  ensaios: '<path d="M9 18V6l11-2v12"/><circle cx="6" cy="18" r="3"/><circle cx="17" cy="16" r="3"/>',
  quadros: '<rect x="3" y="5" width="18" height="14" rx="1.5"/><path d="M9 5v14"/><path d="M15 5v14"/>',
  espacos: '<path d="M3 21V5a1 1 0 0 1 1-1h10a1 1 0 0 1 1 1v16"/><path d="M15 9h4a1 1 0 0 1 1 1v11"/><path d="M2 21h20"/><path d="M11 8h.01"/>',
  agenda: '<path d="M8 2v4"/><path d="M16 2v4"/><rect x="3" y="5" width="18" height="16" rx="1.5"/><path d="M3 10h18"/><path d="M8 14h.01"/><path d="M12 14h.01"/><path d="M16 14h.01"/><path d="M8 18h.01"/><path d="M12 18h.01"/>',
  comunicacao: '<path d="M3 11 18 5v14L3 13Z"/><path d="M7 12.5V18a1 1 0 0 0 1 1h2"/><path d="M18 9a3 3 0 0 1 0 6"/>',
  conversas: '<path d="M21 15a2 2 0 0 1-2 2H8l-5 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2Z"/>',

  /* ── App do membro ── */
  inicio: '<path d="M3 10.5 12 3l9 7.5"/><path d="M5 9.5V20a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1V9.5"/>',
  tarefas: '<path d="m9 11 3 3 8-8"/><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"/>',
  perfil: '<path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/>',
  oracao: '<path d="M12 3v9"/><path d="M8 7c0-2 1.8-4 4-4s4 2 4 4c0 3-4 5-4 5s-4-2-4-5Z"/><path d="M5 21c1.5-3 4-4.5 7-4.5s5.5 1.5 7 4.5"/>',

  /* ── Ministérios (marcas de time) ── */
  louvor: '<path d="M9 18V6l11-2v12"/><circle cx="6" cy="18" r="3"/><circle cx="17" cy="16" r="3"/>',
  recepcao: '<path d="M12 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8Z"/><path d="M4 21a8 8 0 0 1 16 0"/>',
  kids: '<circle cx="12" cy="12" r="9.5"/><path d="M9 10h.01"/><path d="M15 10h.01"/><path d="M8.5 15a4 4 0 0 0 7 0"/>',
  midia: '<rect x="2" y="6" width="14" height="12" rx="2"/><path d="m16 10 6-3v10l-6-3Z"/>',
  diaconia: '<path d="M3 7h18l-1.2 13a1 1 0 0 1-1 .9H5.2a1 1 0 0 1-1-.9Z"/><path d="M8 7V5a4 4 0 0 1 8 0v2"/>',
  intercessao: '<path d="M12 3v9"/><path d="M8 7c0-2 1.8-4 4-4s4 2 4 4c0 3-4 5-4 5s-4-2-4-5Z"/><path d="M5 21c1.5-3 4-4.5 7-4.5s5.5 1.5 7 4.5"/>',

  /* ── Status ── */
  ok: '<circle cx="12" cy="12" r="9.5"/><path d="m8.5 12 2.5 2.5 4.5-4.5"/>',
  pendente: '<circle cx="12" cy="12" r="9.5"/><path d="M12 7v5l3 2"/>',
  recusou: '<circle cx="12" cy="12" r="9.5"/><path d="m9 9 6 6"/><path d="m15 9-6 6"/>',
  alerta: '<path d="M10.3 3.8 1.8 18a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 3.8a2 2 0 0 0-3.4 0Z"/><path d="M12 9v4"/><path d="M12 17h.01"/>',

  /* ── Ações / navegação ── */
  add: '<path d="M12 5v14"/><path d="M5 12h14"/>',
  editar: '<path d="M11 4H5a2 2 0 0 0-2 2v13a2 2 0 0 0 2 2h13a2 2 0 0 0 2-2v-6"/><path d="M18.5 2.5a2.12 2.12 0 0 1 3 3L12 15l-4 1 1-4Z"/>',
  buscar: '<circle cx="11" cy="11" r="7"/><path d="m21 21-4.3-4.3"/>',
  filtro: '<path d="M22 3H2l8 9.5V19l4 2v-8.5Z"/>',
  voltar: '<path d="M19 12H5"/><path d="m12 19-7-7 7-7"/>',
  avancar: '<path d="M5 12h14"/><path d="m12 5 7 7-7 7"/>',
  sino: '<path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9"/><path d="M10.3 21a1.94 1.94 0 0 0 3.4 0"/>',
  enviar: '<path d="M22 2 11 13"/><path d="M22 2 15 22l-4-9-9-4Z"/>',
  telefone: '<path d="M22 16.9v3a2 2 0 0 1-2.2 2 19.8 19.8 0 0 1-8.6-3 19.5 19.5 0 0 1-6-6 19.8 19.8 0 0 1-3-8.6A2 2 0 0 1 4.1 2h3a2 2 0 0 1 2 1.7c.1.9.3 1.8.7 2.7a2 2 0 0 1-.5 2.1L8.1 9.9a16 16 0 0 0 6 6l1.4-1.2a2 2 0 0 1 2.1-.5c.9.4 1.8.6 2.7.7a2 2 0 0 1 1.7 2Z"/>',
  globo: '<circle cx="12" cy="12" r="9.5"/><path d="M2.5 12h19"/><path d="M12 2.5a14.5 14.5 0 0 1 0 19 14.5 14.5 0 0 1 0-19Z"/>',
  sair: '<path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><path d="m16 17 5-5-5-5"/><path d="M21 12H9"/>',
  sol: '<circle cx="12" cy="12" r="4"/><path d="M12 2v2"/><path d="M12 20v2"/><path d="m4.9 4.9 1.4 1.4"/><path d="m17.7 17.7 1.4 1.4"/><path d="M2 12h2"/><path d="M20 12h2"/><path d="m6.3 17.7-1.4 1.4"/><path d="m19.1 4.9-1.4 1.4"/>',
  lua: '<path d="M12 3a6.5 6.5 0 0 0 9 9 9 9 0 1 1-9-9Z"/>',
};

/* mapa: nome de rota / time → ícone */
const CEX_ICON_FOR = {
  painel: 'painel', membros: 'membros', pessoas: 'pessoa', times: 'times', visitantes: 'visitante',
  decisoes: 'decisoes', batismos: 'batismos', cursos: 'cursos',
  escalas: 'escalas', reunioes: 'reunioes', ensaios: 'ensaios', quadros: 'quadros', espacos: 'espacos',
  cultos: 'cultos', comunicacao: 'comunicacao', conversas: 'conversas',
  relatorios: 'relatorios', config: 'config', identidade: 'identidade', historia: 'historia',
};
const CEX_TEAM_ICON = { louvor: 'louvor', recepcao: 'recepcao', kids: 'kids', midia: 'midia', diaconia: 'diaconia', intercessao: 'intercessao' };

function Icon({ name, size = 18, stroke = 1.75, className, style }) {
  const inner = CEX_ICONS[name];
  if (!inner) return <span className={className} style={style}>◆</span>;
  return (
    <svg className={`cex-ic ${className || ''}`} width={size} height={size} viewBox="0 0 24 24"
      fill="none" stroke="currentColor" strokeWidth={stroke} strokeLinecap="round" strokeLinejoin="round"
      style={style} aria-hidden="true" dangerouslySetInnerHTML={{ __html: inner }} />
  );
}

/* resolve o ícone de um time: pelo mapa de ministério, senão genérico.
   Substitui os glifos soltos (♪ ◇ ◆ ▷) por ícones de traço consistentes. */
function teamIconName(t) {
  if (!t) return 'times';
  return CEX_TEAM_ICON[t.id] || CEX_ICONS[t.ic] && t.ic || 'times';
}

/* marca de um time — use no lugar de {t.ic} em qualquer lista/coluna */
function TeamMark({ t, size = 16, stroke = 1.75, className, style }) {
  return <Icon name={teamIconName(t)} size={size} stroke={stroke} className={className} style={style} />;
}

Object.assign(window, { Icon, TeamMark, teamIconName, CEX_ICONS, CEX_ICON_FOR, CEX_TEAM_ICON });
