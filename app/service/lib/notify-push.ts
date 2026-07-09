export async function notifyPush(organizationId: string, recipientMemberIds: string[], title: string, body: string) {
  if (!recipientMemberIds.length) return;
  try {
    await fetch("/api/service/push/notify", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ organizationId, recipientMemberIds, title, body }),
    });
  } catch {
    /* push é um bônus opcional, nunca deve quebrar o envio da mensagem em si */
  }
}
