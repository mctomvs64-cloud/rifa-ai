import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { verifyWebhookSignature } from "@/lib/mercadopago";
import { generateBuyerToSellerLink } from "@/lib/whatsapp";

/**
 * Webhook do Mercado Pago.
 * Recebe notificações de pagamento e atualiza o status dos pedidos.
 *
 * Segurança: verifica a assinatura HMAC do Mercado Pago antes de processar.
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.text();
    const signature = req.headers.get("x-signature") ?? "";
    const secret = process.env.MP_WEBHOOK_SECRET ?? "";

    // Verifica assinatura do webhook (opcional mas recomendado)
    if (secret && !verifyWebhookSignature(signature, body, secret)) {
      console.warn("[Webhook MP] Assinatura inválida recebida");
      return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
    }

    const data = JSON.parse(body);

    // Mercado Pago envia vários tipos de eventos — só processamos "payment"
    if (data.type !== "payment" || !data.data?.id) {
      return NextResponse.json({ received: true });
    }

    const paymentId = String(data.data.id);

    // Busca os detalhes do pagamento na API do Mercado Pago
    const mpResponse = await fetch(
      `https://api.mercadopago.com/v1/payments/${paymentId}`,
      {
        headers: {
          Authorization: `Bearer ${process.env.MP_ACCESS_TOKEN}`,
        },
      }
    );

    if (!mpResponse.ok) {
      console.error("[Webhook MP] Falha ao buscar pagamento:", paymentId);
      return NextResponse.json({ error: "Payment fetch failed" }, { status: 500 });
    }

    const mpPayment = await mpResponse.json();
    const externalReference = mpPayment.external_reference; // === order.id
    const status = mpPayment.status; // "approved" | "pending" | "rejected"

    if (!externalReference) {
      return NextResponse.json({ received: true });
    }

    // Busca o pedido no banco pelo external_reference
    const order = await db.order.findUnique({
      where: { id: externalReference },
      include: {
        raffle: { select: { title: true, whatsappNumber: true } },
        numbers: { select: { number: true } },
      },
    });

    if (!order) {
      console.warn("[Webhook MP] Pedido não encontrado:", externalReference);
      return NextResponse.json({ received: true });
    }

    // Evita reprocessar pedidos já confirmados
    if (order.status === "PAID") {
      return NextResponse.json({ received: true });
    }

    // ── Pagamento APROVADO ──
    if (status === "approved") {
      const numbers = order.numbers.map((n) => n.number);

      // Gera o link WhatsApp para o comprador confirmar com o vendedor
      const sellerPhone =
        order.raffle.whatsappNumber ?? process.env.NEXT_PUBLIC_ADMIN_WHATSAPP ?? "";

      const whatsappLink = sellerPhone
        ? generateBuyerToSellerLink({
            phone: sellerPhone,
            raffleName: order.raffle.title,
            numbers,
            buyerName: order.buyerName,
            orderId: order.id,
          })
        : null;

      // Atualiza o pedido e os números em transação atômica
      await db.$transaction([
        // Marca o pedido como PAGO
        db.order.update({
          where: { id: order.id },
          data: {
            status: "PAID",
            mpPaymentId: paymentId,
            mpStatus: status,
            whatsappLink,
            paidAt: new Date(),
          },
        }),
        // Marca todos os números do pedido como VENDIDOS
        db.number.updateMany({
          where: { orderId: order.id },
          data: {
            status: "SOLD",
            soldAt: new Date(),
          },
        }),
        // Histórico de uso da promoção
        ...(order.promotionId
          ? [
              db.promotion.update({
                where: { id: order.promotionId },
                data: { usageCount: { increment: 1 } },
              }),
            ]
          : []),
      ]);

      console.log(
        `[Webhook MP] ✅ Pedido ${order.id} confirmado — ${numbers.length} número(s)`
      );
    }

    // ── Pagamento REJEITADO / CANCELADO ──
    if (status === "rejected" || status === "cancelled") {
      await db.$transaction([
        db.order.update({
          where: { id: order.id },
          data: {
            status: "CANCELLED",
            mpPaymentId: paymentId,
            mpStatus: status,
            cancelledAt: new Date(),
          },
        }),
        // Libera os números para outros compradores
        db.number.updateMany({
          where: { orderId: order.id },
          data: {
            status: "AVAILABLE",
            orderId: null,
            reservedAt: null,
            expiresAt: null,
          },
        }),
      ]);

      console.log(`[Webhook MP] ❌ Pedido ${order.id} cancelado/rejeitado`);
    }

    return NextResponse.json({ received: true });
  } catch (error) {
    console.error("[Webhook MP] Erro:", error);
    // Retorna 200 mesmo em erros para evitar retentativas excessivas do MP
    return NextResponse.json({ received: true });
  }
}

// O MP faz GET para validar o endpoint na configuração
export async function GET() {
  return NextResponse.json({ status: "Webhook ativo" });
}
