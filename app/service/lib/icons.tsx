"use client";

/* Biblioteca de ícones do CE.X Service : traço fino, grade 24x24, cantos
   arredondados (mesmo estilo dos ícones que já existiam no produto).
   Fonte única : ServiceExactApp.tsx e MobileApp.tsx importam daqui, ninguém
   redeclara um mapa de ícones local. */

import { useMemo, useState } from "react";

export type IconName = string;

export const ICON_PATHS: Record<string, string> = {
  // ── navegação & estrutura ──────────────────────────────────────────────
  menu: '<path d="M3 6h18"/><path d="M3 12h18"/><path d="M3 18h18"/>',
  painel: '<path d="M3 10.5 12 3l9 7.5"/><path d="M5 9.5V20a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1V9.5"/><path d="M9.5 21v-6h5v6"/>',
  inicio: '<path d="M3 10.5 12 3l9 7.5"/><path d="M5 9.5V20a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1V9.5"/>',
  relatorios: '<path d="M3 3v18h18"/><path d="M7 16v-4"/><path d="M12 16V8"/><path d="M17 16v-6"/>',
  config: '<path d="M4 21v-7"/><path d="M4 10V3"/><path d="M12 21v-9"/><path d="M12 8V3"/><path d="M20 21v-5"/><path d="M20 12V3"/><path d="M2 14h4"/><path d="M10 8h4"/><path d="M18 16h4"/>',
  tarefas: '<path d="m9 11 3 3 8-8"/><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"/>',
  lista: '<path d="M8 6h13"/><path d="M8 12h13"/><path d="M8 18h13"/><path d="M3 6h.01"/><path d="M3 12h.01"/><path d="M3 18h.01"/>',

  // ── pessoas ──────────────────────────────────────────────────────────────
  membros: '<path d="M16 19v-1a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v1"/><circle cx="9" cy="7.5" r="3.5"/><path d="M22 19v-1a4 4 0 0 0-3-3.87"/><path d="M16 3.63a4 4 0 0 1 0 7.75"/>',
  pessoa: '<path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/>',
  perfil: '<path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/>',
  visitante: '<path d="M15 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="8.5" cy="7" r="4"/><path d="M19 8v6"/><path d="M22 11h-6"/>',
  usuarioadd: '<circle cx="9" cy="8" r="4"/><path d="M2 21v-1a6 6 0 0 1 6-6h2a6 6 0 0 1 6 6v1"/><path d="M18 8v6"/><path d="M15 11h6"/>',
  jovens: '<path d="M8.5 14.5A4.5 4.5 0 0 1 13 10c0-2-1-3.5-1-3.5s3 1 3 5.5c1 0 2-1 2-2.5 1.5 1.5 2.5 3.5 2.5 5.5A6.5 6.5 0 0 1 6 15c0-1 .3-2 1-2.8.3.9.8 1.6 1.5 2.3Z"/>',
  casais: '<circle cx="9" cy="14.5" r="4.3"/><circle cx="15" cy="14.5" r="4.3"/>',
  kids: '<circle cx="12" cy="12" r="9.5"/><path d="M9 10h.01"/><path d="M15 10h.01"/><path d="M8.5 15a4 4 0 0 0 7 0"/>',
  bercario: '<path d="M9 3v3"/><path d="M15 3v3"/><path d="M6 8h12l-1 11a2 2 0 0 1-2 1.8H9A2 2 0 0 1 7 19Z"/><path d="M9 12v4"/><path d="M15 12v4"/>',

  // ── times & ministérios ──────────────────────────────────────────────────
  times: '<rect x="3" y="3" width="7.5" height="7.5" rx="1.2"/><rect x="13.5" y="3" width="7.5" height="7.5" rx="1.2"/><rect x="13.5" y="13.5" width="7.5" height="7.5" rx="1.2"/><rect x="3" y="13.5" width="7.5" height="7.5" rx="1.2"/>',
  louvor: '<path d="M9 18V6l11-2v12"/><circle cx="6" cy="18" r="3"/><circle cx="17" cy="16" r="3"/>',
  midia: '<rect x="2" y="6" width="14" height="12" rx="2"/><path d="m16 10 6-3v10l-6-3Z"/>',
  recepcao: '<path d="M12 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8Z"/><path d="M4 21a8 8 0 0 1 16 0"/>',
  diaconia: '<path d="M3 7h18l-1.2 13a1 1 0 0 1-1 .9H5.2a1 1 0 0 1-1-.9Z"/><path d="M8 7V5a4 4 0 0 1 8 0v2"/>',
  intercessao: '<path d="M12 3v9"/><path d="M8 7c0-2 1.8-4 4-4s4 2 4 4c0 3-4 5-4 5s-4-2-4-5Z"/><path d="M5 21c1.5-3 4-4.5 7-4.5s5.5 1.5 7 4.5"/>',
  oracao: '<path d="M12 3v9"/><path d="M8 7c0-2 1.8-4 4-4s4 2 4 4c0 3-4 5-4 5s-4-2-4-5Z"/><path d="M5 21c1.5-3 4-4.5 7-4.5s5.5 1.5 7 4.5"/>',
  missoes: '<circle cx="10" cy="12" r="7.5"/><path d="M4 12h13"/><path d="M10 4.5a11 11 0 0 1 0 15 11 11 0 0 1 0-15Z"/><path d="m17 9 4-4"/><path d="M17.5 5h3.5v3.5"/>',
  seguranca: '<path d="M12 3 4 6v6c0 5 3.5 8.5 8 9.5 4.5-1 8-4.5 8-9.5V6Z"/>',
  estacionamento: '<rect x="3" y="3" width="18" height="18" rx="2"/><path d="M9 16V8h4a3 3 0 0 1 0 6H9"/>',
  som: '<path d="M4 9v6h4l5 4V5L8 9Z"/><path d="M16.5 8.5a5 5 0 0 1 0 7"/><path d="M19 6a9 9 0 0 1 0 12"/>',
  transmissao: '<circle cx="12" cy="12" r="2.3"/><path d="M7.5 9a7 7 0 0 0 0 6"/><path d="M16.5 9a7 7 0 0 1 0 6"/><path d="M4 6a11 11 0 0 0 0 12"/><path d="M20 6a11 11 0 0 1 0 12"/>',
  fotografia: '<path d="M4 8h3l1.5-2h7L17 8h3a1 1 0 0 1 1 1v10a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V9a1 1 0 0 1 1-1Z"/><circle cx="12" cy="14" r="3.5"/>',
  limpeza: '<path d="M12 3v4"/><path d="M12 17v4"/><path d="M3 12h4"/><path d="M17 12h4"/><path d="m6 6 2.5 2.5"/><path d="m15.5 15.5 2.5 2.5"/><path d="m18 6-2.5 2.5"/><path d="m8.5 15.5-2.5 2.5"/>',
  manutencao: '<path d="M14.7 6.3a4 4 0 0 0-5.4 5.4L3 18l3 3 6.3-6.3a4 4 0 0 0 5.4-5.4l-2.6 2.6-2-2Z"/>',
  transporte: '<path d="M3 16V9a1 1 0 0 1 1-1h9l4 4h3a1 1 0 0 1 1 1v3"/><path d="M3 16h17"/><circle cx="7.5" cy="17.5" r="1.8"/><circle cx="16.5" cy="17.5" r="1.8"/>',
  copa: '<path d="M4 8h13v5a5 5 0 0 1-5 5H9a5 5 0 0 1-5-5Z"/><path d="M17 9h2a2.5 2.5 0 0 1 0 5h-2"/><path d="M7 3c0 1-1 1-1 2"/><path d="M11 3c0 1-1 1-1 2"/>',
  microfone: '<rect x="9" y="2" width="6" height="12" rx="3"/><path d="M5 11a7 7 0 0 0 14 0"/><path d="M12 18v4"/><path d="M8 22h8"/>',
  pincel: '<path d="M14 4c3 1 5 3 6 6-3 1-6 0-8-2Z"/><path d="M13 10c-2 2-3 4-3 7 0 1 1 2 2 2 3 0 5-1 7-3"/><path d="M3 21c1-4 3-6 6-7"/>',
  codigo: '<path d="m9 8-5 4 5 4"/><path d="m15 8 5 4-5 4"/>',
  wifi: '<path d="M2 8.5a15.3 15.3 0 0 1 20 0"/><path d="M5.5 12a10.5 10.5 0 0 1 13 0"/><path d="M9 15.5a5.8 5.8 0 0 1 6 0"/><path d="M12 19h.01"/>',

  // ── jornada, cursos, agenda ──────────────────────────────────────────────
  decisoes: '<path d="M20.8 5.6a5 5 0 0 0-7.1 0L12 7.3l-1.7-1.7A5 5 0 1 0 3.2 12.7l8.8 8.8 8.8-8.8a5 5 0 0 0 0-7.1Z"/>',
  batismos: '<path d="M12 3s6 5.7 6 10a6 6 0 0 1-12 0c0-4.3 6-10 6-10Z"/>',
  cursos: '<path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2Z"/>',
  biblia: '<path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2Z"/><path d="M13 6v6"/><path d="M10 9h6"/>',
  escalas: '<path d="M8 2v4"/><path d="M16 2v4"/><rect x="3" y="5" width="18" height="16" rx="1.5"/><path d="M3 10h18"/><path d="m9 15 2 2 4-4"/>',
  cultos: '<path d="M8 2v4"/><path d="M16 2v4"/><rect x="3" y="5" width="18" height="16" rx="1.5"/><path d="M3 10h18"/>',
  agenda: '<path d="M8 2v4"/><path d="M16 2v4"/><rect x="3" y="5" width="18" height="16" rx="1.5"/><path d="M3 10h18"/><path d="M8 14h.01"/><path d="M12 14h.01"/><path d="M16 14h.01"/><path d="M8 18h.01"/><path d="M12 18h.01"/>',
  reunioes: '<path d="M9 4h6a1 1 0 0 1 1 1v1H8V5a1 1 0 0 1 1-1Z"/><path d="M8 5H6a1 1 0 0 0-1 1v14a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1V6a1 1 0 0 0-1-1h-2"/><path d="m9 14 2 2 4-4"/>',
  ensaios: '<path d="M9 18V6l11-2v12"/><circle cx="6" cy="18" r="3"/><circle cx="17" cy="16" r="3"/>',
  quadros: '<rect x="3" y="5" width="18" height="14" rx="1.5"/><path d="M9 5v14"/><path d="M15 5v14"/>',
  espacos: '<path d="M3 21V5a1 1 0 0 1 1-1h10a1 1 0 0 1 1 1v16"/><path d="M15 9h4a1 1 0 0 1 1 1v11"/><path d="M2 21h20"/><path d="M11 8h.01"/>',
  comunicacao: '<path d="M3 11 18 5v14L3 13Z"/><path d="M7 12.5V18a1 1 0 0 0 1 1h2"/><path d="M18 9a3 3 0 0 1 0 6"/>',
  conversas: '<path d="M21 15a2 2 0 0 1-2 2H8l-5 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2Z"/>',
  identidade: '<circle cx="12" cy="12" r="9.5"/><path d="m15.8 8.2-2.6 5-5 2.6 2.6-5 5-2.6Z"/>',
  historia: '<circle cx="12" cy="12" r="9.5"/><path d="M12 6.5V12l3.5 2"/>',

  // ── fé & crescimento ───────────────────────────────────────────────────
  cruz: '<path d="M12 2v20"/><path d="M6 8h12"/>',
  estrela: '<path d="M12 3 14.12 9.09 20.56 9.22 15.42 13.11 17.29 19.28 12 15.6 6.71 19.28 8.58 13.11 3.44 9.22 9.88 9.09Z"/>',
  reacao: '<circle cx="12" cy="12" r="9.5"/><path d="M8.5 10h.01"/><path d="M15.5 10h.01"/><path d="M8 14.5c1 1.3 2.4 2 4 2s3-.7 4-2"/>',
  coracao: '<path d="M12 20.5s-7-4.5-9.5-9A5 5 0 0 1 12 6a5 5 0 0 1 9.5 5.5c-2.5 4.5-9.5 9-9.5 9Z"/>',
  semente: '<path d="M12 21v-7"/><path d="M12 14c-4.5 0-8-3.5-8-8 4.5 0 8 3.5 8 8Z"/><path d="M12 14c4.5 0 8-3.5 8-8-4.5 0-8 3.5-8 8Z"/>',
  arvore: '<path d="M12 2 6 10h3l-4 6h4v6h6v-6h4l-4-6h3Z"/>',
  escada: '<path d="M6 2v20"/><path d="M18 2v20"/><path d="M6 6h12"/><path d="M6 11h12"/><path d="M6 16h12"/>',
  multiplicar: '<path d="M12 2v6"/><path d="m8 5 4 3 4-3"/><path d="M4 14l4 8"/><path d="M4 22v-5h5"/><path d="M20 14l-4 8"/><path d="M20 22v-5h-5"/>',

  // ── financeiro ───────────────────────────────────────────────────────────
  moeda: '<circle cx="12" cy="12" r="9.5"/><path d="M12 7v10"/><path d="M9.5 9a2.5 2.5 0 0 1 2.5-1.5c1.5 0 2.5.8 2.5 2s-1 1.7-2.5 2-2.5.8-2.5 2 1 2 2.5 2a2.5 2.5 0 0 0 2.5-1.5"/>',
  carteira: '<path d="M3 7a2 2 0 0 1 2-2h11a2 2 0 0 1 2 2v1H5"/><rect x="3" y="7" width="18" height="13" rx="2"/><path d="M15 13.5h4"/>',
  presente: '<rect x="3" y="9" width="18" height="12" rx="1"/><path d="M3 9h18v3H3Z"/><path d="M12 9v12"/><path d="M12 9c0-3-2-5-4-5s-2 3 0 4 4 1 4 1Z"/><path d="M12 9c0-3 2-5 4-5s2 3 0 4-4 1-4 1Z"/>',
  trofeu: '<path d="M8 4h8v4a4 4 0 0 1-8 0Z"/><path d="M8 5H4v2a4 4 0 0 0 4 4"/><path d="M16 5h4v2a4 4 0 0 1-4 4"/><path d="M12 12v4"/><path d="M8 20h8"/><path d="M10 16h4v4h-4Z"/>',
  meta: '<circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="5"/><circle cx="12" cy="12" r="1.2"/>',

  // ── interface / ações ────────────────────────────────────────────────────
  ok: '<circle cx="12" cy="12" r="9.5"/><path d="m8.5 12 2.5 2.5 4.5-4.5"/>',
  pendente: '<circle cx="12" cy="12" r="9.5"/><path d="M12 7v5l3 2"/>',
  recusou: '<circle cx="12" cy="12" r="9.5"/><path d="m9 9 6 6"/><path d="m15 9-6 6"/>',
  alerta: '<path d="M10.3 3.8 1.8 18a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 3.8a2 2 0 0 0-3.4 0Z"/><path d="M12 9v4"/><path d="M12 17h.01"/>',
  add: '<path d="M12 5v14"/><path d="M5 12h14"/>',
  editar: '<path d="M11 4H5a2 2 0 0 0-2 2v13a2 2 0 0 0 2 2h13a2 2 0 0 0 2-2v-6"/><path d="M18.5 2.5a2.12 2.12 0 0 1 3 3L12 15l-4 1 1-4Z"/>',
  buscar: '<circle cx="11" cy="11" r="7"/><path d="m21 21-4.3-4.3"/>',
  filtro: '<path d="M22 3H2l8 9.5V19l4 2v-8.5Z"/>',
  voltar: '<path d="M19 12H5"/><path d="m12 19-7-7 7-7"/>',
  avancar: '<path d="M5 12h14"/><path d="m12 5 7 7-7 7"/>',
  sino: '<path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9"/><path d="M10.3 21a1.94 1.94 0 0 0 3.4 0"/>',
  enviar: '<path d="M22 2 11 13"/><path d="M22 2 15 22l-4-9-9-4Z"/>',
  telefone: '<path d="M22 16.9v3a2 2 0 0 1-2.2 2 19.8 19.8 0 0 1-8.6-3 19.5 19.5 0 0 1-6-6 19.8 19.8 0 0 1-3-8.6A2 2 0 0 1 4.1 2h3a2 2 0 0 1 2 1.7c.1.9.3 1.8.7 2.7a2 2 0 0 1-.5 2.1L8.1 9.9a16 16 0 0 0 6 6l1.4-1.2a2 2 0 0 1 2.1-.5c.9.4 1.8.6 2.7.7a2 2 0 0 1 1.7 2Z"/>',
  whatsapp: '<path fill="currentColor" stroke="none" d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z"/>',
  globo: '<circle cx="12" cy="12" r="9.5"/><path d="M2.5 12h19"/><path d="M12 2.5a14.5 14.5 0 0 1 0 19 14.5 14.5 0 0 1 0-19Z"/>',
  instagram: '<rect x="2" y="2" width="20" height="20" rx="5" ry="5"/><path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z"/><line x1="17.5" y1="6.5" x2="17.51" y2="6.5"/>',
  youtube: '<path d="M22.54 6.42a2.78 2.78 0 0 0-1.94-2C18.88 4 12 4 12 4s-6.88 0-8.6.46a2.78 2.78 0 0 0-1.94 2A29 29 0 0 0 1 11.75a29 29 0 0 0 .46 5.33A2.78 2.78 0 0 0 3.4 19c1.72.46 8.6.46 8.6.46s6.88 0 8.6-.46a2.78 2.78 0 0 0 1.94-2 29 29 0 0 0 .46-5.25 29 29 0 0 0-.46-5.33z"/><polygon points="9.75 15.02 15.5 11.75 9.75 8.48 9.75 15.02"/>',
  facebook: '<path d="M18 2h-3a5 5 0 0 0-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 0 1 1-1h3z"/>',
  tiktok: '<path d="M9 12a4 4 0 1 0 4 4V2h4a5 5 0 0 0 5 5v4a9 9 0 0 1-5-1.5V16a8 8 0 1 1-8-8"/>',
  sair: '<path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><path d="m16 17 5-5-5-5"/><path d="M21 12H9"/>',
  sol: '<circle cx="12" cy="12" r="4"/><path d="M12 2v2"/><path d="M12 20v2"/><path d="m4.9 4.9 1.4 1.4"/><path d="m17.7 17.7 1.4 1.4"/><path d="M2 12h2"/><path d="M20 12h2"/><path d="m6.3 17.7-1.4 1.4"/><path d="m19.1 4.9-1.4 1.4"/>',
  lua: '<path d="M12 3a6.5 6.5 0 0 0 9 9 9 9 0 1 1-9-9Z"/>',
  lixeira: '<path d="M4 7h16"/><path d="M10 11v6"/><path d="M14 11v6"/><path d="M6 7l1 13a1 1 0 0 0 1 1h8a1 1 0 0 0 1-1l1-13"/><path d="M9 7V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v3"/>',
  copiar: '<rect x="9" y="9" width="12" height="12" rx="1.5"/><path d="M5 15H4a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1h10a1 1 0 0 1 1 1v1"/>',
  compartilhar: '<circle cx="18" cy="5" r="2.5"/><circle cx="6" cy="12" r="2.5"/><circle cx="18" cy="19" r="2.5"/><path d="m8.2 10.8 7.6-4.6"/><path d="m8.2 13.2 7.6 4.6"/>',
  baixar: '<path d="M12 3v12"/><path d="m7 10 5 5 5-5"/><path d="M4 21h16"/>',
  imagem: '<rect x="3" y="4" width="18" height="16" rx="1.5"/><circle cx="9" cy="10" r="1.8"/><path d="m4 18 5-5 4 4 3-3 4 4"/>',
  documento: '<path d="M7 3h7l4 4v14a1 1 0 0 1-1 1H7a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1Z"/><path d="M14 3v4h4"/>',
  pasta: '<path d="M3 6a1 1 0 0 1 1-1h5l2 2h9a1 1 0 0 1 1 1v10a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1Z"/>',
  lampada: '<path d="M9 18h6"/><path d="M10 21h4"/><path d="M12 3a6 6 0 0 0-4 10.5c.6.6 1 1.4 1 2.5h6c0-1.1.4-1.9 1-2.5A6 6 0 0 0 12 3Z"/>',
  chave: '<circle cx="8" cy="15" r="4"/><path d="m11 12 9-9"/><path d="m17 6 3 3"/><path d="m14 9 3 3"/>',
  cadeado: '<rect x="5" y="11" width="14" height="9" rx="1.5"/><path d="M8 11V7a4 4 0 0 1 8 0v4"/>',
  bandeira: '<path d="M5 21V4"/><path d="M5 4h13l-3 4 3 4H5"/>',
  mapapin: '<path d="M12 21s7-6.5 7-11.5A7 7 0 0 0 5 9.5C5 14.5 12 21 12 21Z"/><circle cx="12" cy="9.5" r="2.3"/>',
  play: '<circle cx="12" cy="12" r="9.5"/><path d="M10 8.5 16 12l-6 3.5Z"/>',
  link: '<path d="M9.5 14.5 14.5 9.5"/><path d="M11 6l1.5-1.5a4 4 0 0 1 5.7 5.7L16.5 12"/><path d="M13 18l-1.5 1.5a4 4 0 0 1-5.7-5.7L7.5 12"/>',
  anexo: '<path d="M8 12.5V6a3 3 0 0 1 6 0v9a5 5 0 0 1-10 0V8"/>',
  circulo: '<circle cx="12" cy="12" r="9.5"/>',
  quadrado: '<rect x="3" y="3" width="18" height="18" rx="2"/>',
  triangulo: '<path d="M12 3.5 21.5 20h-19Z"/>',
};

/* categorias pra organizar o seletor visual (ordem de exibição) */
export const ICON_CATEGORIES: { label: string; icons: IconName[] }[] = [
  { label: "Times & ministérios", icons: ["times", "louvor", "midia", "recepcao", "diaconia", "intercessao", "missoes", "jovens", "casais", "kids", "bercario", "seguranca", "estacionamento", "som", "transmissao", "fotografia", "limpeza", "manutencao", "transporte", "copa", "microfone", "pincel", "codigo", "wifi"] },
  { label: "Fé & crescimento", icons: ["cruz", "biblia", "oracao", "coracao", "estrela", "semente", "arvore", "escada", "multiplicar", "batismos"] },
  { label: "Pessoas", icons: ["pessoa", "membros", "visitante", "usuarioadd", "perfil"] },
  { label: "Jornada & agenda", icons: ["decisoes", "cursos", "escalas", "cultos", "reunioes", "ensaios", "quadros", "espacos", "agenda", "identidade", "historia"] },
  { label: "Financeiro", icons: ["moeda", "carteira", "presente", "trofeu", "meta"] },
  { label: "Interface", icons: ["comunicacao", "conversas", "sino", "enviar", "telefone", "whatsapp", "instagram", "youtube", "facebook", "tiktok", "globo", "lixeira", "copiar", "compartilhar", "baixar", "imagem", "documento", "pasta", "lampada", "chave", "cadeado", "bandeira", "mapapin", "play", "link", "anexo", "lista", "circulo", "quadrado", "triangulo"] },
];

export const DEFAULT_ICON: IconName = "times";

export function Icon({ name, size = 18, stroke = 1.75, className }: { name: string; size?: number; stroke?: number; className?: string }) {
  const inner = ICON_PATHS[name] ?? ICON_PATHS[DEFAULT_ICON];
  return (
    <svg
      className={className ? `cex-ic ${className}` : "cex-ic"}
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={stroke}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      dangerouslySetInnerHTML={{ __html: inner }}
    />
  );
}

/* seletor visual de ícone : grade categorizada + busca. Usado em qualquer
   formulário que precise de um ícone (criação/edição de time, quadro,
   frente...). Controlado : recebe o nome atual e devolve o escolhido. */
export function IconPicker({ value, onChange }: { value: string; onChange: (name: IconName) => void }) {
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState("");

  const groups = useMemo(() => {
    const term = q.trim().toLowerCase();
    if (!term) return ICON_CATEGORIES;
    const icons = Object.keys(ICON_PATHS).filter((name) => name.includes(term));
    return [{ label: "Resultado da busca", icons }];
  }, [q]);

  return (
    <div className="icon-picker">
      <button type="button" className="icon-picker-trigger" onClick={() => setOpen((o) => !o)}>
        <Icon name={value || DEFAULT_ICON} size={20} />
        <span>{value || "Escolher ícone"}</span>
        <span className="icon-picker-trigger-x">{open ? "Fechar ▴" : "Trocar ▾"}</span>
      </button>
      {open && (
        <div className="icon-picker-panel">
          <input
            className="input icon-picker-search"
            placeholder="Buscar ícone..."
            value={q}
            onChange={(e) => setQ(e.target.value)}
            autoFocus
          />
          <div className="icon-picker-scroll">
            {groups.map((group) => (
              <div key={group.label} className="icon-picker-group">
                <div className="icon-picker-group-t">{group.label}</div>
                <div className="icon-picker-grid">
                  {group.icons.map((name) => (
                    <button
                      key={name}
                      type="button"
                      className={`icon-picker-opt${value === name ? " on" : ""}`}
                      title={name}
                      onClick={() => { onChange(name); setOpen(false); setQ(""); }}
                    >
                      <Icon name={name} size={19} />
                    </button>
                  ))}
                </div>
              </div>
            ))}
            {groups.every((g) => g.icons.length === 0) && (
              <div className="icon-picker-empty">Nenhum ícone encontrado.</div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
