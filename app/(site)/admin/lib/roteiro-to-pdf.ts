"use client";

import html2canvas from "html2canvas";
import jsPDF from "jspdf";

const PAGE_CSS = `
  * { box-sizing: border-box; }
  body { font-family: Georgia, 'Times New Roman', serif; font-size: 12pt; line-height: 1.7; color: #1a1a1a; margin: 0; }
  h1 { font-family: 'Segoe UI', Arial, sans-serif; font-size: 26pt; font-weight: 800; color: #0E110D; margin: 0 0 6pt; }
  h2 { font-family: 'Segoe UI', Arial, sans-serif; font-size: 16pt; font-weight: 700; color: #0E110D; margin: 22pt 0 6pt; }
  h3 { font-family: 'Segoe UI', Arial, sans-serif; font-size: 11pt; font-weight: 700; letter-spacing: .04em; text-transform: uppercase; color: #4F6B26; margin: 18pt 0 4pt; }
  p { margin: 0 0 10pt; }
  ul, ol { margin: 0 0 12pt; padding-left: 24pt; }
  li { margin: 0 0 5pt; }
  blockquote { margin: 14pt 0; padding: 4pt 0 4pt 16pt; border-left: 3px solid #7A9E3F; font-style: italic; color: #3a3a3a; }
  a { color: #4F6B26; }
`;

// Renderiza o roteiro (HTML do editor Documentos) num container fora da
// tela, tira um "print" com html2canvas e monta um PDF paginado com jsPDF.
// Roda inteiro no navegador do admin: não precisa de headless browser no
// servidor.
export async function roteiroToPdfBlob(titulo: string, roteiroHtml: string): Promise<Blob> {
  const container = document.createElement("div");
  container.style.cssText = "position:fixed; left:-10000px; top:0; width:794px; background:#ffffff; padding:56px;";

  const style = document.createElement("style");
  style.textContent = PAGE_CSS;
  container.appendChild(style);

  const content = document.createElement("div");
  content.innerHTML = roteiroHtml?.trim() ? roteiroHtml : `<h1>${titulo}</h1>`;
  container.appendChild(content);

  document.body.appendChild(container);

  try {
    const canvas = await html2canvas(container, { scale: 2, backgroundColor: "#ffffff" });
    const pdf = new jsPDF({ unit: "pt", format: "a4" });
    const pageWidth = pdf.internal.pageSize.getWidth();
    const pageHeight = pdf.internal.pageSize.getHeight();
    const imgWidth = pageWidth;
    const imgHeight = (canvas.height * imgWidth) / canvas.width;
    const imgData = canvas.toDataURL("image/jpeg", 0.92);

    let heightLeft = imgHeight;
    let position = 0;
    pdf.addImage(imgData, "JPEG", 0, position, imgWidth, imgHeight);
    heightLeft -= pageHeight;

    while (heightLeft > 0) {
      position = heightLeft - imgHeight;
      pdf.addPage();
      pdf.addImage(imgData, "JPEG", 0, position, imgWidth, imgHeight);
      heightLeft -= pageHeight;
    }

    return pdf.output("blob");
  } finally {
    document.body.removeChild(container);
  }
}
