import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Não autorizado" }, { status: 403 });
  }

  const { id } = await params;
  const orderId = id;

  const order = await db.order.findUnique({
    where: { id: orderId },
    include: { raffle: true },
  });

  if (!order) {
    return NextResponse.json({ error: "Pedido não encontrado" }, { status: 404 });
  }

  // Verifica permissão (apenas Admin ou o Dono da Vaquinha)
  if (session.user.role !== "ADMIN" && order.raffle.sellerId !== session.user.id) {
    return NextResponse.json({ error: "Não autorizado" }, { status: 403 });
  }

  if (order.status === "PAID") {
    return NextResponse.json({ error: "Pedido já está pago" }, { status: 400 });
  }

  // Marcar como pago e atualizar os números
  try {
    await db.$transaction(async (tx) => {
      await tx.order.update({
        where: { id: orderId },
        data: {
          status: "PAID",
          paidAt: new Date(),
        },
      });

      await tx.number.updateMany({
        where: { orderId: orderId },
        data: {
          status: "SOLD",
        },
      });
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Erro ao confirmar pagamento:", error);
    return NextResponse.json({ error: "Erro interno" }, { status: 500 });
  }
}
