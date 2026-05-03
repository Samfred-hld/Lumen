// ══════════════════════════════════════════
// RATTIO — Lembrete de Fatura por Email
// ══════════════════════════════════════════
// Cron: diário
// Verifica cartões com vencimento próximo e envia email de lembrete.

export default async function handler({ entities, integrations }) {
  const today = new Date();
  const currentDay = today.getDate();
  let sent = 0;

  // Buscar cartões (via UserConfig key='cards')
  const configs = await entities.UserConfig.filter({ key: 'cards' });
  if (!configs || configs.length === 0) {
    return { sent: 0, message: 'Nenhum cartão configurado' };
  }

  let cards;
  try {
    cards = JSON.parse(configs[0].value);
  } catch {
    return { sent: 0, message: 'Config de cartões inválida' };
  }

  if (!Array.isArray(cards) || cards.length === 0) {
    return { sent: 0, message: 'Nenhum cartão encontrado' };
  }

  // Buscar email do usuário (do UserConfig ou do auth)
  const emailConfig = await entities.UserConfig.filter({ key: 'userEmail' });
  const userEmail = emailConfig?.[0]?.value;
  if (!userEmail) {
    return { sent: 0, message: 'Email do usuário não configurado' };
  }

  for (const card of cards) {
    const dueDay = parseInt(card.dueDay) || 10;
    const daysUntilDue = dueDay - currentDay;

    // Enviar lembrete 3 dias antes do vencimento
    if (daysUntilDue === 3 || daysUntilDue === 1) {
      try {
        await integrations.Core.SendEmail({
          to: userEmail,
          subject: `🔔 Fatura ${card.name} vence em ${daysUntilDue} dia(s)`,
          body: `Sua fatura do cartão ${card.name} vence no dia ${dueDay}.\n\nLembre-se de verificar o saldo e realizar o pagamento.\n\n— Rattio`,
        });
        sent++;
      } catch (e) {
        console.error(`Erro ao enviar lembrete para ${card.name}:`, e);
      }
    }
  }

  return { sent, cardsChecked: cards.length };
}
