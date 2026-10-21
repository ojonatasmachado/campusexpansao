import type { DbAddressData } from "../../lib/types";

export function coordenadas(latitude: unknown, longitude: unknown): { latitude: number; longitude: number } | null {
  const numero = (v: unknown) => typeof v === "number" ? v : typeof v === "string" && v.trim() ? Number(v) : NaN;
  const lat = numero(latitude), lng = numero(longitude);
  return Number.isFinite(lat) && Number.isFinite(lng) && Math.abs(lat) <= 90 && Math.abs(lng) <= 180 ? { latitude: lat, longitude: lng } : null;
}
export const textoEndereco = (v: unknown): string | null => typeof v === "string" && v.trim() ? v.trim() : typeof v === "number" && Number.isFinite(v) ? String(v) : null;

export function enderecoDoCep(raw: Record<string, unknown>): DbAddressData {
  const location = raw.location as { coordinates?: { latitude?: unknown; longitude?: unknown } } | undefined;
  const geo = coordenadas(location?.coordinates?.latitude, location?.coordinates?.longitude);
  return {
    postalCode: textoEndereco(raw.cep), street: textoEndereco(raw.street), streetNumber: null, complement: null,
    neighborhood: textoEndereco(raw.neighborhood), city: textoEndereco(raw.city), state: textoEndereco(raw.state), country: "Brasil",
    municipalityIbge: textoEndereco(raw.city_ibge_code ?? raw.codigo_municipio_ibge ?? raw.ibge),
    latitude: geo?.latitude ?? null, longitude: geo?.longitude ?? null,
    geoSource: geo ? "brasilapi:cep:v2" : null, geoPrecision: geo ? "postal_code" : null,
  };
}
export function enderecoDoCnpj(raw: Record<string, unknown>, cep?: DbAddressData | null): DbAddressData {
  const direto = coordenadas(raw.latitude, raw.longitude);
  return {
    postalCode: textoEndereco(raw.cep), street: textoEndereco(raw.logradouro), streetNumber: textoEndereco(raw.numero), complement: textoEndereco(raw.complemento),
    neighborhood: textoEndereco(raw.bairro), city: textoEndereco(raw.municipio), state: textoEndereco(raw.uf), country: textoEndereco(raw.pais) ?? "Brasil",
    municipalityIbge: textoEndereco(raw.codigo_municipio_ibge) ?? cep?.municipalityIbge ?? null,
    latitude: direto?.latitude ?? cep?.latitude ?? null, longitude: direto?.longitude ?? cep?.longitude ?? null,
    geoSource: direto ? "brasilapi:cnpj:v1" : cep?.geoSource ?? null, geoPrecision: direto ? "address" : cep?.geoPrecision ?? null,
  };
}
