"use client";

import { useMemo, useRef, useState } from "react";
import type { MensagemCompra } from "../../lib/perfil-data";
import type { Material } from "../../lib/materiais-data";
import styles from "./DocumentEditor.module.css";

type DocumentModelId = "branco" | "devocional" | "aula" | "mensagem";

type DocumentTemplateOption = {
  id: string;
  module: "documentos";
  name: string;
  description: string;
  payload: {
    modelId?: DocumentModelId;
  };
};

type DocumentEditorProps = {
  material: Material;
  mensagem: MensagemCompra;
  status: string;
  templates?: DocumentTemplateOption[];
};

const FALLBACK_TEMPLATES: DocumentTemplateOption[] = [
  {
    id: "doc-branco",
    module: "documentos",
    name: "Nenhum",
    description: "Documento livre para começar em branco.",
    payload: { modelId: "branco" },
  },
  {
    id: "doc-devocional",
    module: "documentos",
    name: "Devocional",
    description: "Estrutura para reflexão bíblica e aplicação prática.",
    payload: { modelId: "devocional" },
  },
  {
    id: "doc-aula",
    module: "documentos",
    name: "Aula / Plano",
    description: "Roteiro para ensinar, praticar e aplicar em grupo.",
    payload: { modelId: "aula" },
  },
  {
    id: "doc-mensagem",
    module: "documentos",
    name: "Mensagem",
    description: "Estrutura para pregação ou ministração.",
    payload: { modelId: "mensagem" },
  },
];

function isDocumentModelId(value: unknown): value is DocumentModelId {
  return value === "branco" || value === "devocional" || value === "aula" || value === "mensagem";
}

export function DocumentEditor({ material, mensagem, status, templates = [] }: DocumentEditorProps) {
  const docRef = useRef<HTMLDivElement>(null);
  const title = mensagem.titulo.replace(/^Mensagem\s+\d+:\s*/i, "");
  const activeTemplates = useMemo(() => {
    const normalized = templates
      .filter((template) => template.module === "documentos" && isDocumentModelId(template.payload?.modelId))
      .map((template) => ({
        ...template,
        payload: { modelId: template.payload.modelId as DocumentModelId },
      }));

    return normalized.length ? normalized : FALLBACK_TEMPLATES;
  }, [templates]);
  const [selectedTemplateId, setSelectedTemplateId] = useState(activeTemplates[0]?.id ?? "doc-branco");
  const selectedTemplate = activeTemplates.find((template) => template.id === selectedTemplateId) ?? activeTemplates[0];
  const selectedModel = selectedTemplate?.payload.modelId ?? "branco";

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

        <div className={styles.templates} aria-label="Modelos de documento">
          <label className={styles.templateLabel} htmlFor="document-template">
            Modelo
          </label>
          <select
            id="document-template"
            className={styles.templateSelect}
            value={selectedTemplateId}
            onChange={(event) => setSelectedTemplateId(event.target.value)}
          >
            {activeTemplates.map((template) => (
              <option key={template.id} value={template.id}>
                {template.name}
              </option>
            ))}
          </select>
          {selectedTemplate?.description ? (
            <p className={styles.templateHint}>{selectedTemplate.description}</p>
          ) : null}
        </div>

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

          <DocumentBody selectedModel={selectedModel} material={material} />

          <div className={styles.docFoot}>Material CE.X · adapte livremente para a sua igreja</div>
        </div>
      </section>
    </div>
  );
}

function DocumentBody({ selectedModel, material }: { selectedModel: DocumentModelId; material: Material }) {
  if (selectedModel === "branco") {
    return (
      <div className={styles.docSec}>
        <h2>Notas do material</h2>
        <div className={styles.docBody} contentEditable suppressContentEditableWarning>
          Comece a escrever aqui.
        </div>
      </div>
    );
  }

  if (selectedModel === "devocional") {
    return (
      <>
        <div className={styles.docVerse} contentEditable suppressContentEditableWarning>
          {material.promessa}
        </div>
        <DocSection title="Versículo">Cole aqui a passagem bíblica e a referência.</DocSection>
        <DocSection title="Reflexão">Desenvolva a meditação sobre o texto e conecte com a vida da igreja.</DocSection>
        <DocSection title="Aplicação">Mostre um passo prático para viver esta verdade durante a semana.</DocSection>
        <DocSection title="Oração">Conduza uma oração curta, simples e pastoral.</DocSection>
      </>
    );
  }

  if (selectedModel === "aula") {
    return (
      <>
        <DocSection title="Objetivo">Defina o que a turma precisa compreender, sentir e praticar.</DocSection>
        <DocSection title="Abertura">Crie uma pergunta ou dinâmica curta para iniciar a conversa.</DocSection>
        <DocSection title="Desenvolvimento">Organize os pontos principais da aula em sequência clara.</DocSection>
        <DocSection title="Atividade">Inclua uma prática em grupo, leitura guiada ou exercício de aplicação.</DocSection>
        <DocSection title="Fechamento">Retome a ideia central e indique o próximo passo.</DocSection>
      </>
    );
  }

  return (
    <>
      <div className={styles.docVerse} contentEditable suppressContentEditableWarning>
        {material.promessa}
      </div>
      <DocSection title="Introdução">Abra a mensagem com o problema, tensão ou pergunta principal.</DocSection>
      <DocSection title="Texto bíblico">Explique o texto e destaque a verdade central.</DocSection>
      <DocSection title="Desenvolvimento">Construa os argumentos, ilustrações e aplicações pastorais.</DocSection>
      <DocSection title="Aplicação">Mostre como a mensagem encontra a vida real da igreja.</DocSection>
      <DocSection title="Apelo e oração">Conduza uma resposta prática e uma oração final.</DocSection>
    </>
  );
}

function DocSection({ title, children }: { title: string; children: string }) {
  return (
    <div className={styles.docSec}>
      <h2>{title}</h2>
      <div className={styles.docBody} contentEditable suppressContentEditableWarning>
        {children}
      </div>
    </div>
  );
}
