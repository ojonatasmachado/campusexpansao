import LinkIcon from "../lib/LinkIcon";
import type { PaginaSocial } from "../lib/church-page";

const ORDER: (keyof PaginaSocial)[] = ["whatsapp", "instagram", "youtube", "facebook", "tiktok", "site"];

export default function SocialRow({ social }: { social: PaginaSocial }) {
  const items = ORDER.map((key) => {
    const value = social[key];
    if (!value) return null;
    const href = key === "whatsapp" ? `https://wa.me/${value.replace(/\D/g, "")}` : value;
    return { key, href };
  }).filter((item): item is { key: keyof PaginaSocial; href: string } => item !== null);

  if (items.length === 0) return null;

  return (
    <div className="cx-social">
      {items.map((item) => (
        <a key={item.key} href={item.href} target="_blank" rel="noopener noreferrer" className="cx-social-btn" aria-label={item.key}>
          <LinkIcon name={item.key} size={18} />
        </a>
      ))}
    </div>
  );
}
