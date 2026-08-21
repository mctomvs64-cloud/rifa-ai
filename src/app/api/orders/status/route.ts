import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { db } from "@/lib/db";

/**
 * GET /api/orders/status?orderId=xxx
 * Polling endpoint — consultado pelo frontend a cada 5s para detectar pagamento confirmado.
 * Retorna o status atual do pedido no banco (atualizado pelo webhook do MP).
 */
export async function GET(req: NextRequest) {
  const orderId = req.nextUrl.searchParams.get("orderId");

  if (!orderId) {
    return NextResponse.json({ error: "orderId obrigatório" }, { status: 400 });
  }

  const order = await db.order.findUnique({
    where: { id: orderId },
    select: {
      id: true,
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

  return NextResponse.json(
    {
      orderId: order.id,
      status: order.status,   // "PENDING" | "PAID" | "CANCELLED" | "EXPIRED"
      paidAt: order.paidAt?.toISOString() ?? null,
      expiresAt: order.expiresAt?.toISOString() ?? null,
      whatsappLink: order.whatsappLink,
      raffle: order.raffle,
      numbers: order.numbers.map((n) => n.number),
    },
    {
      headers: {
        // Sem cache — precisa ser sempre fresco
        "Cache-Control": "no-store, no-cache, must-revalidate",
      },
    }
  );
}
