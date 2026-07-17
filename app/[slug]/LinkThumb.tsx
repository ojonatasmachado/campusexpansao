import LinkIcon from "../lib/LinkIcon";

/* Miniatura de um link : foto pequena enviada pela igreja, se houver, senão
   o ícone escolhido. Fonte única pros 3 templates não repetirem essa
   condicional cada um do seu jeito. */
export default function LinkThumb({ imageUrl, icon, label }: { imageUrl: string | null; icon: string; label: string }) {
  if (imageUrl) {
    return <img src={imageUrl} alt={label} className="cx-link-photo" />;
  }
  return (
    <span className="cx-link-icon">
      <LinkIcon name={icon} />
    </span>
  );
}
