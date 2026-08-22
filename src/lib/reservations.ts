import { db } from "./db";

/**
 * Libera reservas expiradas de cotas/números.
 * 
 * Regra:
 * Se um pedido está em status 'PENDING' e seu expiresAt já passou (ou expiresAt dos números),
 * os números vinculados voltam para status 'AVAILABLE' e o pedido é marcado como 'EXPIRED'.
 *
 * @param raffleId Opcional. Se passado, limpa apenas a rifa especificada.
 */
export async function releaseExpiredReservations(raffleId?: string) {
  try {
    const now = new Date();

    // 1. Encontra pedidos pendentes cujo prazo de reserva expirou
    const expiredOrders = await db.order.findMany({
      where: {
        status: "PENDING",
        expiresAt: { lt: now },
        ...(raffleId ? { raffleId } : {}),
      },
      select: { id: true },
    });

    const expiredOrderIds = expiredOrders.map((o) => o.id);

    // 2. Executa transação para atualizar pedidos e liberar números
    const result = await db.$transaction(async (tx) => {
      let ordersUpdated = 0;
      if (expiredOrderIds.length > 0) {
        const updateOrders = await tx.order.updateMany({
          where: { id: { in: expiredOrderIds } },
          data: { status: "EXPIRED" },
        });
        ordersUpdated = updateOrders.count;
      }

      // Libera todos os números reservados cujo expiresAt já venceu
      // ou que estão vinculados aos pedidos expirados
      const updateNumbers = await tx.number.updateMany({
        where: {
          status: "RESERVED",
          OR: [
            { expiresAt: { lt: now } },
            ...(expiredOrderIds.length > 0
              ? [{ orderId: { in: expiredOrderIds } }]
              : []),
          ],
          ...(raffleId ? { raffleId } : {}),
        },
        data: {
          status: "AVAILABLE",
          orderId: null,
          reservedAt: null,
          expiresAt: null,
        },
      });

      return {
        expiredOrdersCount: ordersUpdated,
        releasedNumbersCount: updateNumbers.count,
      };
    });

    if (result.releasedNumbersCount > 0) {
      console.log(
        `[Reservations] 🔄 Liberadas ${result.releasedNumbersCount} cotas expiradas em ${result.expiredOrdersCount} pedidos.`
      );
    }

    return result;
  } catch (error) {
    console.error("[Reservations] Erro ao liberar reservas expiradas:", error);
    return { expiredOrdersCount: 0, releasedNumbersCount: 0 };
  }
}
