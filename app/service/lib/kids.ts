/* Idade e turma da criança são sempre calculadas a partir do nascimento,
   nunca escolhidas na mão : fonte única pra admin, professor e responsável
   não divergirem. */

export function ageInMonths(birth: string | null): number | null {
  if (!birth) return null;
  const b = new Date(birth);
  if (Number.isNaN(b.getTime())) return null;
  const now = new Date();
  let months = (now.getFullYear() - b.getFullYear()) * 12 + (now.getMonth() - b.getMonth());
  if (now.getDate() < b.getDate()) months -= 1;
  return Math.max(months, 0);
}

export function suggestKidsClassId(
  birth: string | null,
  classes: { id: string; min_age_months: number | null; max_age_months: number | null }[],
): string | null {
  const months = ageInMonths(birth);
  if (months === null) return null;
  const match = classes.find(
    (c) => months >= (c.min_age_months ?? 0) && months <= (c.max_age_months ?? Number.POSITIVE_INFINITY),
  );
  return match?.id ?? null;
}
