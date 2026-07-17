-- ═══════════════════════════════════════════════════════════════════════════
-- CE.X · 0039 · SERVICE — ENDEREÇO NO CADASTRO DE MEMBRO
-- Aditiva: só cria colunas novas, não altera nada existente.
--
-- CEP, rua, cidade e estado do membro, preenchidos via consulta a uma API
-- gratuita de CEP no cadastro (ver /api/service/cep-lookup). Sem número:
-- só endereço aproximado. neighborhood (bairro) já existia e continua
-- editável manualmente.
-- ═══════════════════════════════════════════════════════════════════════════

alter table service.members
  add column postal_code text,
  add column street       text,
  add column city         text,
  add column state        text;

comment on column service.members.postal_code is 'CEP do membro (só dígitos ou formatado). Preenchido via consulta de CEP no cadastro.';
comment on column service.members.street is 'Rua/logradouro, vindo da consulta de CEP (sem número).';
comment on column service.members.city is 'Cidade, vinda da consulta de CEP.';
comment on column service.members.state is 'Estado (UF), vindo da consulta de CEP.';
