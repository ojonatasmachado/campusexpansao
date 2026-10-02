import Logo from "../components/Logo";

/* Marca do app, a mesma do protótipo: logo da igreja | Service (Inter 700).
   Sem logo: o nome da igreja em texto. Sem igreja conhecida (login sem
   cookie, primeiro acesso da conta): CE.X | Service. Fonte única pra barra
   lateral, app do membro, telas de entrada e check-in. Sem hooks: serve em
   componente de servidor e de cliente.
   CSS: .brand .brand-img .brand-lg .sb-logo (service.css),
        .brand-row .brand-div .brand-service (service-v2.css),
        .brand-name .brand-sm (service-v5.css). */
export default function ChurchLockup({
  logoUrl,
  name,
  size = "md",
}: {
  logoUrl?: string | null;
  name?: string | null;
  size?: "sm" | "md" | "lg";
}) {
  const cls = `brand brand-row${size === "lg" ? " brand-lg" : ""}${size === "sm" ? " brand-sm" : ""}`;
  return (
    <div className={cls}>
      {logoUrl ? (
        <img className="brand-img" src={logoUrl} alt={name || "Logo da igreja"} />
      ) : name ? (
        <span className="brand-name">{name}</span>
      ) : (
        <span className="sb-logo"><Logo /></span>
      )}
      <span className="brand-div" aria-hidden="true" />
      <span className="brand-service">Service</span>
    </div>
  );
}
