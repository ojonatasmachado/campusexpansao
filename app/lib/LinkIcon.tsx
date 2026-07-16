import { LINK_ICON_PATHS, DEFAULT_LINK_ICON } from "./link-icons";

/* Renderiza um ícone de app/lib/link-icons.ts. Fica em app/lib (não em
   app/igreja/[slug]) porque é reaproveitado tanto pela página pública quanto
   pelo seletor de ícone do editor em Configurações
   (app/service/PublicPageEditor.tsx) — os dois precisam enxergar exatamente
   o mesmo conjunto de ícones, senão o que a igreja escolhe no editor não bate
   com o que aparece na página publicada. */
export default function LinkIcon({ name, size = 18 }: { name: string; size?: number }) {
  const path = LINK_ICON_PATHS[name] ?? LINK_ICON_PATHS[DEFAULT_LINK_ICON];
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      dangerouslySetInnerHTML={{ __html: path }}
    />
  );
}
