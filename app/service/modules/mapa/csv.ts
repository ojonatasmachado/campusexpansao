/* CSV para o Excel brasileiro: separador ";" e BOM para os acentos. */
export function baixarCsv(nome: string, cabecalho: string[], linhas: string[][]) {
  /* texto que começa com = + - @ vira fórmula no Excel: entra como texto */
  const cel = (bruto: string) => { const v = /^[=+\-@\t\r]/.test(bruto) ? `'${bruto}` : bruto; return /[";\n]/.test(v) ? `"${v.replace(/"/g, '""')}"` : v; };
  const texto = "\uFEFF" + [cabecalho, ...linhas].map((l) => l.map(cel).join(";")).join("\r\n");
  const url = URL.createObjectURL(new Blob([texto], { type: "text/csv;charset=utf-8" }));
  const a = document.createElement("a");
  a.href = url;
  a.download = `${nome.normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-zA-Z0-9-]+/g, "-").toLowerCase()}.csv`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
