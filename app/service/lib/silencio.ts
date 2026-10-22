import { FUSO_PADRAO, instantesNoFuso, partesNoFuso } from "./fuso";
import { somaDias } from "./date";

/** Silêncio das 22h às 7h no fuso da igreja da pessoa. */
export function emSilencio(d: Date = new Date(), fuso = FUSO_PADRAO): boolean {
  const h = Number(partesNoFuso(d, fuso).hora.slice(0, 2));
  return h >= 22 || h < 7;
}

/** O mesmo instante, ou a próxima abertura, respeitando mudanças de verão. */
export function foraDoSilencio(d: Date, fuso = FUSO_PADRAO): Date {
  if (!emSilencio(d, fuso)) return d;
  const local = partesNoFuso(d, fuso);
  const dia = local.hora >= "22:00" ? somaDias(local.data, 1) : local.data;
  // Uma mudança excepcional pode saltar as 7h ou até um dia civil inteiro.
  // Procura o primeiro minuto permitido existente, sem presumir um offset fixo.
  for (let dias = 0; dias < 3; dias++) {
    for (let minuto = 7 * 60; minuto < 22 * 60; minuto++) {
      const hora = `${String(Math.floor(minuto / 60)).padStart(2, "0")}:${String(minuto % 60).padStart(2, "0")}`;
      const instante = instantesNoFuso(somaDias(dia, dias), hora, fuso).find((x) => x >= d);
      if (instante) return instante;
    }
  }
  throw new Error("Não foi possível calcular o próximo horário de envio.");
}

export function quandoLembra(d: Date, agora: Date = new Date(), fuso = FUSO_PADRAO): string {
  const local = partesNoFuso(d, fuso);
  const hoje = partesNoFuso(agora, fuso).data;
  const amanha = somaDias(hoje, 1);
  const hora = `${Number(local.hora.slice(0, 2))}:${local.hora.slice(3)}`;
  const [, m, dd] = local.data.split("-");
  return local.data === hoje ? `hoje às ${hora}` : local.data === amanha ? `amanhã às ${hora}` : `em ${dd}/${m} às ${hora}`;
}
