/** Feedback leve, renderizado no servidor e animado sem depender de JavaScript. */
export default function Carregando({
  texto = "Carregando…",
  telaInteira = false,
}: {
  texto?: string;
  telaInteira?: boolean;
}) {
  return (
    <div
      className={`svc-carregando${telaInteira ? " svc-carregando-tela" : ""}`}
      role="status"
      aria-live="polite"
    >
      <span className="svc-carregando-anel" aria-hidden="true" />
      <p>{texto}</p>
    </div>
  );
}
