-- ═══════════════════════════════════════════════════════════════════════════
-- CE.X · 0040 · SERVICE — BAIRRO E ESTADO NA IGREJA
-- Aditiva: só cria colunas novas, não altera nada existente.
--
-- Completa o endereço da igreja (que já tinha address/postal_code/city) com
-- bairro e estado, preenchidos via a mesma consulta de CEP usada no cadastro
-- de membro (ver /api/service/cep-lookup).
-- ═══════════════════════════════════════════════════════════════════════════

alter table service.churches
  add column neighborhood text,
  add column state        text;

comment on column service.churches.neighborhood is 'Bairro da igreja, vindo da consulta de CEP.';
comment on column service.churches.state is 'Estado (UF) da igreja, vindo da consulta de CEP.';
