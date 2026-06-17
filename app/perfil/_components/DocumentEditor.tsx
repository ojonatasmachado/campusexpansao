"use client";

import { useRef } from "react";
import type { MensagemCompra } from "../../lib/perfil-data";
import type { Material } from "../../lib/materiais-data";
import styles from "./DocumentEditor.module.css";

type DocumentEditorProps = {
  material: Material;
  mensagem: MensagemCompra;
  status: string;
};

export function DocumentEditor({ material, mensagem, status }: DocumentEditorProps) {
  const docRef = useRef<HTMLDivElement>(null);
  const title = mensagem.titulo.replace(/^Mensagem\s+\d+:\s*/i, "");

  function formatDoc(event: React.MouseEvent<HTMLButtonElement>, command: string) {
    event.preventDefault();
    document.execCommand(command, false);
  }

  function printPdf() {
    window.print();
  }

  function downloadWord() {
    const content = docRef.current?.innerHTML;
    if (!content) return;

    const html = [
      "<html xmlns:o='urn:schemas-microsoft-com:office:office' xmlns:w='urn:schemas-microsoft-com:office:word' xmlns='http://www.w3.org/TR/REC-html40'>",
      "<head><meta charset='utf-8'><style>",
      "body{font-family:Inter,Arial,sans-serif;color:#0E110D;line-height:1.6;}",
      "h1{font-family:Inter,Arial,sans-serif;font-size:26pt;line-height:1.1;}",
      "h2{font-family:Inter,Arial,sans-serif;font-size:11pt;text-transform:uppercase;color:#4F6B26;letter-spacing:1px;}",
      ".doc-verse{font-style:italic;color:#555650;border-left:3px solid #7A9E3F;padding-left:12px;}",
      "</style></head><body>",
      content,
      "</body></html>",
    ].join("");

    const blob = new Blob(["\ufeff", html], { type: "application/msword" });
    const anchor = document.createElement("a");
    anchor.href = URL.createObjectURL(blob);
    anchor.download = `${material.titulo.replace(/\s+/g, "-").toLowerCase()}-${mensagem.id}-cex.doc`;
    anchor.click();
    URL.revokeObjectURL(anchor.href);
  }

  return (
    <div className={styles.wrap}>
      <aside className={styles.panel}>
        <p className={styles.sec}>◆ Editor do documento</p>
        <p className={styles.help}>
          Clique direto no documento para alterar os textos. A moldura visual permanece travada.
        </p>

        <div className={styles.docTools} aria-label="Formatação do documento">
          <button onMouseDown={(event) => formatDoc(event, "bold")} aria-label="Negrito">
            <strong>B</strong>
          </button>
          <button onMouseDown={(event) => formatDoc(event, "italic")} aria-label="Itálico">
            <em>I</em>
          </button>
          <button className={styles.wide} onMouseDown={(event) => formatDoc(event, "insertUnorderedList")}>
            Lista
          </button>
        </div>

        <div className={styles.exports}>
          <div className={styles.exp}>
            <div className={styles.lab}>
              PDF
              <small>pronto para imprimir</small>
            </div>
            <button onClick={printPdf}>Baixar</button>
          </div>
          <div className={styles.exp}>
            <div className={styles.lab}>
              Word (.doc)
              <small>continuar editando no Word</small>
            </div>
            <button onClick={downloadWord}>Baixar</button>
          </div>
        </div>
      </aside>

      <section className={styles.stage} aria-label="Documento editável">
        <div className={styles.docPage} id="doc-page" ref={docRef}>
          <div className={styles.docTop}>
            <div className={styles.docBrand}>◆ {mensagem.meta.toUpperCase()}</div>
            <div className={styles.docChurch} contentEditable suppressContentEditableWarning>
              CE.X
              <br />
              {status}
            </div>
          </div>

          <h1 className={styles.docTitle} contentEditable suppressContentEditableWarning>
            {title}
          </h1>

          <div className={styles.docVerse} contentEditable suppressContentEditableWarning>
            {material.promessa}
          </div>

          <div className={styles.docSec}>
            <h2>Para quem</h2>
            <div className={styles.docBody} contentEditable suppressContentEditableWarning>
              {material.praQuem}
            </div>
          </div>

          <div className={styles.docSec}>
            <h2>Roteiro base</h2>
            <div className={styles.docBody} contentEditable suppressContentEditableWarning>
              Desenvolva a abertura, o texto bíblico, a explicação central e a aplicação prática desta mensagem.
            </div>
          </div>

          <div className={styles.docSec}>
            <h2>Perguntas de grupo</h2>
            <div className={styles.docBody} contentEditable suppressContentEditableWarning>
              O que esta mensagem confronta? Como ela aponta para Jesus? Qual passo prático a pessoa deve dar nesta semana?
            </div>
          </div>

          <div className={styles.docSec}>
            <h2>Como usar</h2>
            <div className={styles.docBody} contentEditable suppressContentEditableWarning>
              {material.comoUsar}
            </div>
          </div>

          <div className={styles.docFoot}>Material CE.X · adapte livremente para a sua igreja</div>
        </div>
      </section>
    </div>
  );
}
