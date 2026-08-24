import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { calculateFees } from "@/lib/utils";
import { releaseExpiredReservations } from "@/lib/reservations";
import { checkoutRateLimiter } from "@/lib/security/rate-limit";
import { applySecurityHeaders } from "@/lib/security/headers";

const createOrderSchema = z.object({
  raffleId: z.string(),
  numbers: z.array(z.number().int().min(0)).min(1).max(200),
  buyerName: z.string().min(2),
  buyerPhone: z.string().min(10),
  buyerEmail: z.string().email().optional(),
  promotionId: z.string().optional(),
});

/**
 * POST /api/orders
 * Cria um novo pedido: reserva os números e cria preferência no Mercado Pago.
 *
 * Fluxo:
 * 1. Valida entrada
 * 2. Verifica disponibilidade dos números (com lock otimista)
 * 3. Reserva os números (status RESERVED, expira em 15min)
 * 4. Cria o pedido
 * 5. Cria a preferência PIX no Mercado Pago
 * 6. Retorna QR Code + copia-e-cola
 */
export async function POST(req: NextRequest) {
  const rateLimitRes = await checkoutRateLimiter(req);
  if (rateLimitRes) return applySecurityHeaders(rateLimitRes);

  try {
    const body = await req.json();
    const parsed = createOrderSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Dados inválidos", details: parsed.error.flatten().fieldErrors },
        { status: 400 }
      );
    }

    const { raffleId, numbers, buyerName, buyerPhone, buyerEmail, promotionId } = parsed.data;

    // Libera reservas expiradas antes de validar disponibilidade
    await releaseExpiredReservations(raffleId);

    // Busca a rifa
    const raffle = await db.raffle.findUnique({
      where: { id: raffleId, status: "ACTIVE" },
    });

    if (!raffle) {
      return NextResponse.json({ error: "Rifa não encontrada ou inativa" }, { status: 404 });
    }

    // Valida a promoção (se o pedido veio de um pacote)
    let promotion = null;
    if (promotionId) {
      const now = new Date();
      promotion = await db.promotion.findFirst({
        where: {
          id: promotionId,
          active: true,
          OR: [{ raffleId }, { raffleId: null }],
          AND: [
            { OR: [{ startsAt: null }, { startsAt: { lte: now } }] },
            { OR: [{ endsAt: null }, { endsAt: { gte: now } }] },
          ],
        },
      });

      if (!promotion) {
        return NextResponse.json(
          { error: "Promoção indisponível ou expirada" },
          { status: 400 }
        );
      }

      if (numbers.length !== promotion.quantity) {
        return NextResponse.json(
          { error: `Este pacote inclui exatamente ${promotion.quantity} números` },
          { status: 400 }
        );
      }
    } else if (numbers.length < raffle.minNumbers || numbers.length > raffle.maxNumbers) {
      // Compra avulsa — respeita limites da rifa
      return NextResponse.json(
        {
          error: `Selecione entre ${raffle.minNumbers} e ${raffle.maxNumbers} números`,
        },
        { status: 400 }
      );
    }

    // Usa transação para garantir atomicidade na reserva dos números
    const result = await db.$transaction(async (tx) => {
      // Verifica disponibilidade dos números solicitados
      const availableNumbers = await tx.number.findMany({
        where: {
          raffleId,
          number: { in: numbers },
          status: "AVAILABLE",
        },
        select: { id: true, number: true },
      });

      // Verifica se todos os números solicitados estão disponíveis
      if (availableNumbers.length !== numbers.length) {
        const availableNums = availableNumbers.map((n) => n.number);
        const unavailable = numbers.filter((n) => !availableNums.includes(n));
        throw new Error(`Números indisponíveis: ${unavailable.join(", ")}`);
      }

      const reservationMinutes = parseInt(
        process.env.RESERVATION_MINUTES ?? "15"
      );
      const expiresAt = new Date(
        Date.now() + reservationMinutes * 60 * 1000
      );

      // Calcula valores financeiros (pacote usa o preço promocional)
      const totalAmount = promotion
        ? Number(promotion.promoPrice)
        : numbers.length * Number(raffle.pricePerNumber);
      const { platformFee, sellerAmount } = calculateFees(
        totalAmount,
        Number(raffle.platformFeePercent)
      );

      // Cria o pedido
      const order = await tx.order.create({
        data: {
          raffleId,
          buyerName,
          buyerPhone: buyerPhone.replace(/\D/g, ""),
          buyerEmail,
          quantity: numbers.length,
          totalAmount,
          platformFee,
          sellerAmount,
          status: "PENDING",
          expiresAt,
          ...(promotion ? { promotionId: promotion.id } : {}),
        },
      });

      // Reserva os números vinculando ao pedido
      await tx.number.updateMany({
        where: {
          raffleId,
          number: { in: numbers },
        },
        data: {
          status: "RESERVED",
          orderId: order.id,
          reservedAt: new Date(),
          expiresAt,
        },
      });

      return { order, expiresAt };
    });

    // Cria o pagamento PIX no Mercado Pago (fora da transação DB)
    let qrCode = null;
    let qrCodeBase64 = null;
    let pixCopyPaste = null;
    let mpPaymentId = null;

    try {
      const { createPixPayment } = await import("@/lib/mercadopago");
      const orderWithRaffle = await db.order.findUnique({
        where: { id: result.order.id },
        include: { raffle: true },
      });

      if (orderWithRaffle) {
        const pixData = await createPixPayment({
          order: orderWithRaffle,
          numbers,
          buyerName,
          buyerEmail: buyerEmail ?? `comprador.${result.order.id.slice(0, 8)}@rifaai.com.br`,
          buyerPhone: buyerPhone.replace(/\D/g, ""),
        });

        qrCode = pixData.qrCode;
        qrCodeBase64 = pixData.qrCodeBase64;
        pixCopyPaste = pixData.pixCopyPaste;
        mpPaymentId = pixData.paymentId;

        // Salva o payment ID e QR Code no pedido
        await db.order.update({
          where: { id: result.order.id },
          data: {
            mpPaymentId,
            mpQrCode: qrCodeBase64,
            mpQrCodeText: pixCopyPaste,
          },
        });
      }
    } catch (mpError) {
      console.error("[Orders] Erro ao criar pagamento PIX no MP:", mpError);
      // Não cancela o pedido — comprador pode tentar novamente ou pagar manualmente
    }

    return applySecurityHeaders(
      NextResponse.json(
        {
          orderId: result.order.id,
          totalAmount: Number(result.order.totalAmount),
          expiresAt: result.expiresAt.toISOString(),
          numbers,
          pix: {
            qrCode,
            qrCodeBase64,
            copyPaste: pixCopyPaste,
            paymentId: mpPaymentId,
          },
        },
        { status: 201 }
      )
    );
  } catch (error) {
    if (error instanceof Error && error.message.includes("indisponíveis")) {
      return applySecurityHeaders(NextResponse.json({ error: error.message }, { status: 409 }));
    }
    console.error("[Orders POST] Erro:", error);
    return applySecurityHeaders(NextResponse.json({ error: "Erro ao criar pedido" }, { status: 500 }));
  }
}

/**
 * GET /api/orders?orderId=xxx
 * Consulta o status de um pedido.
 */
export async function GET(req: NextRequest) {
  const rateLimitRes = await checkoutRateLimiter(req);
  if (rateLimitRes) return applySecurityHeaders(rateLimitRes);

  const orderId = req.nextUrl.searchParams.get("orderId");

  if (!orderId) {
    return applySecurityHeaders(NextResponse.json({ error: "orderId obrigatório" }, { status: 400 }));
  }

  const order = await db.order.findUnique({
    where: { id: orderId },
    select: {
      id: true,
      status: true,
      totalAmount: true,
      quantity: true,
      buyerName: true,
      buyerPhone: true,
      whatsappLink: true,
      expiresAt: true,
      paidAt: true,
      numbers: { select: { number: true } },
      raffle: { select: { title: true, slug: true } },
    },
  });

  if (!order) {
    return applySecurityHeaders(NextResponse.json({ error: "Pedido não encontrado" }, { status: 404 }));
  }

  return applySecurityHeaders(NextResponse.json({ order }));
}
