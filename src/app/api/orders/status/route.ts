import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { releaseExpiredReservations } from "@/lib/reservations";
import { checkoutRateLimiter } from "@/lib/security/rate-limit";
import { applySecurityHeaders } from "@/lib/security/headers";

/**
 * GET /api/orders/status?orderId=xxx
 * Polling endpoint — consultado pelo frontend a cada 5s para detectar pagamento confirmado.
 * Retorna o status atual do pedido no banco (atualizado pelo webhook do MP).
 */
export async function GET(req: NextRequest) {
  const rateLimitRes = await checkoutRateLimiter(req);
  if (rateLimitRes) return applySecurityHeaders(rateLimitRes);

  const orderId = req.nextUrl.searchParams.get("orderId");

  if (!orderId) {
    return applySecurityHeaders(NextResponse.json({ error: "orderId obrigatório" }, { status: 400 }));
  }

  let order = await db.order.findUnique({
    where: { id: orderId },
    select: {
      id: true,
      raffleId: true,
      status: true,
      paidAt: true,
      whatsappLink: true,
      expiresAt: true,
      mpPaymentId: true,
      raffle: { select: { title: true, slug: true } },
      numbers: { select: { number: true }, orderBy: { number: "asc" } },
    },
  });

  if (!order) {
    return NextResponse.json({ error: "Pedido não encontrado" }, { status: 404 });
  }

  // Se o pedido está pendente e o prazo venceu, libera imediatamente
  if (order.status === "PENDING" && order.expiresAt && new Date(order.expiresAt) < new Date()) {
    await releaseExpiredReservations(order.raffleId);
    order = { ...order, status: "EXPIRED" };
  }

  return applySecurityHeaders(
    NextResponse.json(
      {
        orderId: order.id,
        status: order.status,
        paidAt: order.paidAt?.toISOString() ?? null,
        expiresAt: order.expiresAt?.toISOString() ?? null,
        whatsappLink: order.whatsappLink,
        raffle: order.raffle,
        numbers: order.numbers.map((n) => n.number),
      },
      {
        headers: {
          "Cache-Control": "no-store, no-cache, must-revalidate",
        },
      }
    )
  );
}
