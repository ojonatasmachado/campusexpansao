"use client";

import { Gaveta } from "../ui/Janela";

// Compatibilidade para os consumidores existentes; implementação canônica em form/.
export { FField, CepField, SelectField, DatePicker, TimePicker, DP_MESES_FULL, DP_DIAS_MES } from "./form/FField";

/* gaveta do painel: a peça é Gaveta (app/service/ui/Janela.tsx) */
export function DrawerShell({ children, onClose, wide }: { children: React.ReactNode; onClose: () => void; wide?: boolean }) {
  return <Gaveta aoFechar={onClose} larga={wide}>{children}</Gaveta>;
}

/* id: opcional, para outra tela rolar até esta seção e pôr o foco nela. */
export function DrawerSection({ title, id, children }: { title: string; id?: string; children: React.ReactNode }) {
  return (
    <div className="dsec" id={id} tabIndex={id ? -1 : undefined}>
      <div className="dsec-title">{title}</div>
      {children}
    </div>
  );
}
