/**
 * Gerador de links WhatsApp pré-formatados (wa.me).
 * Zero API, zero custo — apenas abre o WhatsApp com mensagem pronta.
 */

interface GenerateWhatsAppLinkParams {
  phone: string;       // Número do destinatário (55119...): vendedor
  raffleName: string;  // Nome da rifa
  numbers: number[];   // Números comprados
  buyerName: string;   // Nome do comprador
  orderId: string;     // ID do pedido para referência
}

/**
 * Gera um link wa.me para o comprador confirmar com o vendedor.
 * Ao clicar, abre o WhatsApp com uma mensagem pré-formatada.
 */
export function generateBuyerToSellerLink(
  params: GenerateWhatsAppLinkParams
): string {
  const { phone, raffleName, numbers, buyerName, orderId } = params;

  // Formata os números bonito: 001, 002, 045...
  const formattedNumbers = numbers
    .sort((a, b) => a - b)
    .map((n) => String(n).padStart(3, "0"))
    .join(", ");

  const message = [
    `🎫 *Confirmação de Compra — ${raffleName}*`,
    ``,
    `Olá! Acabei de pagar minha cota na rifa! ✅`,
    ``,
    `👤 *Nome:* ${buyerName}`,
    `🎯 *Números:* ${formattedNumbers}`,
    `📋 *Pedido:* #${orderId.slice(-8).toUpperCase()}`,
    ``,
    `Boa sorte a todos! 🍀🏆`,
  ].join("\n");

  const encodedMessage = encodeURIComponent(message);

  // Remove formatação do número (só dígitos)
  const cleanPhone = phone.replace(/\D/g, "");

  return `https://wa.me/${cleanPhone}?text=${encodedMessage}`;
}

/**
 * Gera um link de compartilhamento da rifa para WhatsApp.
 * Para o vendedor divulgar a rifa.
 */
export function generateShareRaffleLink(params: {
  raffleUrl: string;
  raffleName: string;
  pricePerNumber: number;
  availableNumbers: number;
  drawDate?: Date;
}): string {
  const { raffleUrl, raffleName, pricePerNumber, availableNumbers, drawDate } =
    params;

  const formattedPrice = new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(pricePerNumber);

  const drawInfo = drawDate
    ? `📅 *Sorteio:* ${drawDate.toLocaleDateString("pt-BR")}`
    : "";

  const message = [
    `🎉 *${raffleName}*`,
    ``,
    `💰 Apenas ${formattedPrice} por número!`,
    `🎟️ ${availableNumbers} números disponíveis`,
    drawInfo,
    ``,
    `👆 Clique no link e garanta o seu:`,
    raffleUrl,
    ``,
    `Boa sorte! 🍀`,
  ]
    .filter(Boolean)
    .join("\n");

  const encodedMessage = encodeURIComponent(message);
  return `https://wa.me/?text=${encodedMessage}`;
}

/**
 * Gera um link para o comprador consultar os próprios números.
 */
export function generateMyNumbersLink(params: {
  appUrl: string;
  buyerPhone: string;
}): string {
  const { appUrl, buyerPhone } = params;
  const cleanPhone = buyerPhone.replace(/\D/g, "");
  return `${appUrl}/meus-numeros?phone=${cleanPhone}`;
}
