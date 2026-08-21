import { MercadoPagoConfig, Payment } from "mercadopago";
import type { Order, Raffle } from "@prisma/client";
import crypto from "crypto";

// Inicializa o cliente do Mercado Pago com o access token real
const client = new MercadoPagoConfig({
  accessToken: process.env.MP_ACCESS_TOKEN!,
  options: { timeout: 8000 },
});

const paymentClient = new Payment(client);

interface CreatePixPaymentParams {
  order: Order & { raffle: Raffle };
  numbers: number[];
  buyerName: string;
  buyerEmail: string;
  buyerPhone: string;
}

interface PixPaymentResult {
  paymentId: string;
  qrCode: string;
  qrCodeBase64: string;
  pixCopyPaste: string;
  expiresAt: string;
}

/**
 * Cria um pagamento PIX diretamente no Mercado Pago.
 * Retorna o QR Code e o código copia-e-cola para o comprador.
 *
 * Documentação: https://www.mercadopago.com.br/developers/pt/docs/checkout-api/payment-methods/other-payment-methods/brasil/pix
 */
export async function createPixPayment(
  params: CreatePixPaymentParams
): Promise<PixPaymentResult> {
  const { order, numbers, buyerName, buyerEmail, buyerPhone } = params;

  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";

  // Formata o telefone no padrão do MP: +5511999999999
  const cleanPhone = buyerPhone.replace(/\D/g, "");
  const areaCode = cleanPhone.length >= 11 ? cleanPhone.slice(0, 2) : "11";
  const phoneNumber = cleanPhone.length >= 11 ? cleanPhone.slice(2) : cleanPhone;

  // Garante que o email não seja vazio (MP exige)
  const safeEmail = buyerEmail?.trim() || `comprador.${order.id.slice(0, 8)}@rifaai.com.br`;

  const expirationDate = order.expiresAt
    ? order.expiresAt.toISOString()
    : new Date(Date.now() + 15 * 60 * 1000).toISOString();

  const response = await paymentClient.create({
    body: {
      transaction_amount: Number(order.totalAmount),
      description: `${order.raffle.title} — ${numbers.length} número(s): ${numbers.slice(0, 5).join(", ")}${numbers.length > 5 ? "..." : ""}`,
      payment_method_id: "pix",
      external_reference: order.id,
      payer: {
        email: safeEmail,
        first_name: buyerName.split(" ")[0] ?? buyerName,
        last_name: buyerName.split(" ").slice(1).join(" ") || ".",
        identification: {
          type: "CPF",
          number: "00000000000", // CPF não é obrigatório para PIX no MP
        },
        phone: {
          area_code: areaCode,
          number: phoneNumber,
        },
      },
      notification_url: `${appUrl}/api/webhooks/mercadopago`,
      date_of_expiration: expirationDate,
    },
  });

  const txData = response.point_of_interaction?.transaction_data;

  if (!txData?.qr_code) {
    throw new Error(
      `Mercado Pago não retornou QR Code. Status: ${response.status}. Detalhe: ${response.status_detail}`
    );
  }

  return {
    paymentId: String(response.id),
    qrCode: txData.qr_code,
    qrCodeBase64: txData.qr_code_base64 ?? "",
    pixCopyPaste: txData.qr_code,
    expiresAt: expirationDate,
  };
}

/**
 * Busca os detalhes de um pagamento no Mercado Pago pelo ID.
 */
export async function getPaymentDetails(paymentId: string) {
  const response = await paymentClient.get({ id: paymentId });
  return response;
}

/**
 * Consulta o status de um pagamento usando o external_reference (orderId).
 * Usado pelo polling do frontend para verificar se o PIX foi pago.
 */
export async function getPaymentByReference(orderId: string) {
  const url = `https://api.mercadopago.com/v1/payments/search?external_reference=${orderId}&sort=date_created&criteria=desc&range=date_created&begin_date=NOW-1DAYS&end_date=NOW`;

  const res = await fetch(url, {
    headers: {
      Authorization: `Bearer ${process.env.MP_ACCESS_TOKEN}`,
      "Content-Type": "application/json",
    },
    cache: "no-store",
  });

  if (!res.ok) return null;

  const data = await res.json();
  const results = data.results as Array<{ id: number; status: string; status_detail: string }>;

  if (!results || results.length === 0) return null;

  // Retorna o pagamento mais recente
  return results[0];
}

/**
 * Verifica a assinatura HMAC-SHA256 do webhook do Mercado Pago.
 * Formato esperado: "ts=<timestamp>,v1=<hash>"
 */
export function verifyWebhookSignature(
  xSignature: string,
  xRequestId: string,
  dataId: string,
  secret: string
): boolean {
  if (!secret) return true; // Sem secret configurado, aceita tudo (dev mode)

  // Extrai ts e v1 do header x-signature
  const parts: Record<string, string> = {};
  xSignature.split(",").forEach((part) => {
    const [key, value] = part.split("=");
    if (key && value) parts[key.trim()] = value.trim();
  });

  const ts = parts["ts"];
  const v1 = parts["v1"];

  if (!ts || !v1) return false;

  // Manifesto de assinatura: "id:<dataId>;request-id:<xRequestId>;ts:<ts>;"
  const manifest = `id:${dataId};request-id:${xRequestId};ts:${ts};`;

  const expected = crypto
    .createHmac("sha256", secret)
    .update(manifest)
    .digest("hex");

  return expected === v1;
}

export { client as mercadoPagoClient };
