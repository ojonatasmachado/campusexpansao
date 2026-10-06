/* Baixa uma tabela como .csv no navegador, sem servidor e sem dependência.
   BOM no início para o Excel abrir os acentos certos. */
export function baixarCsv(nomeArquivo: string, linhas: (string | number)[][]) {
  const csv = linhas.map((linha) => linha.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(",")).join("\n");
  const a = document.createElement("a");
  const url = URL.createObjectURL(new Blob(["﻿" + csv], { type: "text/csv;charset=utf-8;" }));
  a.href = url;
  a.download = nomeArquivo;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
