-- CE.X Service · 0067 · Aula presencial/ao vivo com dia, hora e sala (v7 2.2)
-- A aula com data aparece na Agenda do aluno e no cartão do curso, com a
-- instrução da presença por QR. Aditiva e idempotente.
-- Era a 0051 no branch service-v7; renumerada porque o main já tem uma 0051
-- (bootstrap_lider_telas_v6). Independente das outras: pode rodar em qualquer ordem.

alter table service.course_lessons add column if not exists lesson_date date;
alter table service.course_lessons add column if not exists lesson_time text;
alter table service.course_lessons add column if not exists location text;

comment on column service.course_lessons.lesson_date is 'Dia da aula presencial/ao vivo (opcional). Com data, a aula aparece na Agenda de quem está matriculado.';
comment on column service.course_lessons.lesson_time is 'Hora da aula, "HH:MM" (opcional).';
comment on column service.course_lessons.location is 'Sala ou local da aula (opcional).';
