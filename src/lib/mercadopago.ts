import { MercadoPagoConfig, Preference, Payment } from "mercadopago";
import type { Order, Raffle } from "@prisma/client";

// Inicializa o cliente do Mercado Pago com o access token da plataforma
const client = new MercadoPagoConfig({
  accessToken: process.env.MP_ACCESS_TOKEN!,
  options: { timeout: 5000 },
});

const preference = new Preference(client);
const payment = new Payment(client);

interface CreatePixPreferenceParams {
  order: Order & { raffle: Raffle };
  numbers: number[];
  buyerName: string;
  buyerEmail: string;
  buyerPhone: string;
}

interface PixPreferenceResult {
  preferenceId: string;
  qrCode: string;
  qrCodeBase64: string;
  pixCopyPaste: string;
}

/**
 * Cria uma preferência de pagamento PIX no Mercado Pago.
 * Retorna o QR Code e o código copia-e-cola para o comprador.
 */
export async function createPixPreference(
  params: CreatePixPreferenceParams
): Promise<PixPreferenceResult> {
  const { order, numbers, buyerName, buyerEmail, buyerPhone } = params;

  const externalReference = order.id;
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";

  // Cria a preferência de pagamento com PIX como método prioritário
  const response = await preference.create({
    body: {
      external_reference: externalReference,
      items: [
        {
          id: order.raffleId,
          title: `Rifa: ${order.raffle.title}`,
          description: `${numbers.length} número(s): ${numbers.join(", ")}`,
          quantity: 1,
          unit_price: Number(order.totalAmount),
          currency_id: "BRL",
        },
      ],
      payer: {
        name: buyerName,
        email: buyerEmail,
        phone: {
          area_code: buyerPhone.slice(2, 4), // DDD
          number: buyerPhone.slice(4),        // Número
        },
      },
      payment_methods: {
        // Priorizar PIX
        default_payment_method_id: "pix",
        excluded_payment_types: [],
        installments: 1,
      },
      back_urls: {
        success: `${appUrl}/checkout/sucesso?order=${order.id}`,
        failure: `${appUrl}/checkout/erro?order=${order.id}`,
        pending: `${appUrl}/checkout/pendente?order=${order.id}`,
      },
      auto_return: "approved",
      notification_url: `${appUrl}/api/webhooks/mercadopago`,
      expires: true,
      expiration_date_to: order.expiresAt?.toISOString(),
    },
  });

  // Para pagamento PIX, criar o payment point of interaction
  const pixPayment = await payment.create({
    body: {
      transaction_amount: Number(order.totalAmount),
      description: `Rifa: ${order.raffle.title} - ${numbers.length} número(s)`,
      payment_method_id: "pix",
      external_reference: externalReference,
      payer: {
        email: buyerEmail,
        first_name: buyerName.split(" ")[0],
        last_name: buyerName.split(" ").slice(1).join(" ") || ".",
        identification: { type: "CPF", number: "00000000000" }, // Comprador informa depois
      },
      notification_url: `${appUrl}/api/webhooks/mercadopago`,
      date_of_expiration: order.expiresAt?.toISOString(),
    },
  });

  const pointOfInteraction = pixPayment.point_of_interaction;
  const transactionData = pointOfInteraction?.transaction_data;

  return {
    preferenceId: response.id!,
    qrCode: transactionData?.qr_code ?? "",
    qrCodeBase64: transactionData?.qr_code_base64 ?? "",
    pixCopyPaste: transactionData?.qr_code ?? "",
  };
}

/**
 * Busca os detalhes de um pagamento no Mercado Pago pelo ID.
 */
export async function getPaymentDetails(paymentId: string) {
  const response = await payment.get({ id: paymentId });
  return response;
}

/**
 * Verifica a assinatura do webhook do Mercado Pago.
 * Previne requisições falsas.
 */
export function verifyWebhookSignature(
  signature: string,
  body: string,
  secret: string
): boolean {
  const crypto = require("crypto");
  const expectedSignature = crypto
    .createHmac("sha256", secret)
    .update(body)
    .digest("hex");
  return signature === expectedSignature;
}

export { client as mercadoPagoClient };
