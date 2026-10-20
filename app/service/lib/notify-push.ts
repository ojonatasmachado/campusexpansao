import type { CategoriaAviso } from "../modules/define";

/* Push pelo servidor. A categoria (lei 9) vai junto: é ela que a pessoa pode
   desligar e é com ela que o aviso é medido (lei 11). */
export async function notifyPush(organizationId: string, recipientMemberIds: string[], title: string, body: string, categoria?: CategoriaAviso) {
  if (!recipientMemberIds.length) return;
  try {
    await fetch("/api/service/push/notify", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ organizationId, recipientMemberIds, title, body, categoria }),
    });
  } catch {
    /* push é um bônus opcional, nunca deve quebrar o envio da mensagem em si */
  }
}
