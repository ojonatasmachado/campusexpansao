/** Identidade estável da frase completa. O catálogo verifica colisões. */
export function messageKey(source: string): string {
  let hash = 2166136261;
  const text = source.normalize("NFC");
  for (let i = 0; i < text.length; i++) hash = Math.imul(hash ^ text.charCodeAt(i), 16777619);
  return `m${(hash >>> 0).toString(36)}`;
}
