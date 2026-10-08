import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { auth } from "@/lib/auth";
import { z } from "zod";
import { revalidatePath } from "next/cache";

const updateRaffleSchema = z.object({
  title: z.string().min(3).max(100).optional(),
  description: z.string().optional().nullable(),
  prize: z.string().min(3).optional(),
  pricePerNumber: z.number().min(0.5).optional(),
  totalNumbers: z.number().min(10).max(100000).optional(),
  minNumbers: z.number().min(1).optional(),
  maxNumbers: z.number().min(1).optional(),
  whatsappNumber: z.string().optional().nullable(),
  coverImage: z.string().optional().nullable(),
  images: z.array(z.string()).optional().default([]),
  drawDate: z.string().datetime().optional().nullable(),
  status: z.enum(["DRAFT", "ACTIVE", "CLOSED", "DRAWN", "CANCELLED"]).optional(),
});

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await auth();

  if (!session?.user || (session.user.role !== "SELLER" && session.user.role !== "ADMIN")) {
    return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
  }

  try {
    const raffle = await db.raffle.findUnique({ 
      where: { id },
      include: { _count: { select: { numbers: true } } }
    });

    if (!raffle) {
      return NextResponse.json({ error: "Vaquinha não encontrada" }, { status: 404 });
    }

    if (raffle.sellerId !== session.user.id && session.user.role !== "ADMIN") {
      return NextResponse.json({ error: "Não autorizado" }, { status: 403 });
    }

    const body = await req.json();
    const parsed = updateRaffleSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Dados inválidos", details: parsed.error.flatten().fieldErrors },
        { status: 400 }
      );
    }

    const data = parsed.data;

    // Atualização dinâmica de cotas
    if (data.totalNumbers !== undefined && data.totalNumbers !== raffle.totalNumbers) {
      const newTotal = data.totalNumbers;
      const oldTotal = raffle.totalNumbers;
      
      // Se os números já foram gerados, precisamos criar os novos ou deletar os excedentes
      if (raffle._count.numbers > 0) {
        if (newTotal > oldTotal) {
          // Aumentou as cotas: gerar os números faltantes (do oldTotal até newTotal - 1)
          const batchSize = 10000;
          for (let i = oldTotal; i < newTotal; i += batchSize) {
            const currentBatchSize = Math.min(batchSize, newTotal - i);
            const batch = Array.from({ length: currentBatchSize }, (_, index) => ({
              raffleId: id,
              number: i + index,
              status: "AVAILABLE" as const,
            }));
            await db.number.createMany({ data: batch, skipDuplicates: true });
          }
        } else if (newTotal < oldTotal) {
          // Diminuiu as cotas: verificar se há cotas vendidas/reservadas no intervalo a ser deletado
          const soldOrReserved = await db.number.findFirst({
            where: {
              raffleId: id,
              number: { gte: newTotal },
              status: { in: ["SOLD", "RESERVED"] }
            }
          });
          
          if (soldOrReserved) {
            return NextResponse.json(
              { error: `Não é possível reduzir para ${newTotal} pois a cota nº ${soldOrReserved.number} já foi vendida ou reservada.` },
              { status: 400 }
            );
          }
          
          // Deletar os excedentes
          await db.number.deleteMany({
            where: {
              raffleId: id,
              number: { gte: newTotal }
            }
          });
        }
      }
    }

    const updated = await db.raffle.update({
      where: { id },
      data: {
        ...(data.title !== undefined && { title: data.title }),
        ...(data.description !== undefined && { description: data.description }),
        ...(data.prize !== undefined && { prize: data.prize }),
        ...(data.pricePerNumber !== undefined && { pricePerNumber: data.pricePerNumber }),
        ...(data.totalNumbers !== undefined && { totalNumbers: data.totalNumbers }),
        ...(data.minNumbers !== undefined && { minNumbers: data.minNumbers }),
        ...(data.maxNumbers !== undefined && { maxNumbers: data.maxNumbers }),
        ...(data.whatsappNumber !== undefined && { whatsappNumber: data.whatsappNumber?.replace(/\D/g, "") ?? null }),
        ...(data.coverImage !== undefined && { coverImage: data.coverImage }),
        ...(data.images !== undefined && { images: data.images }),
        ...(data.drawDate !== undefined && { drawDate: data.drawDate ? new Date(data.drawDate) : null }),
        ...(data.status !== undefined && { status: data.status }),
      },
    });

    // Invalidate public raffle page and dashboard caches
    revalidatePath(`/rifas/${raffle.slug}`);
    revalidatePath("/dashboard");
    revalidatePath("/admin/rifas");

    return NextResponse.json({ raffle: updated });
  } catch (error) {
    console.error("[Raffle Update] Erro:", error);
    return NextResponse.json({ error: "Erro ao atualizar vaquinha" }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await auth();

  if (!session?.user || (session.user.role !== "SELLER" && session.user.role !== "ADMIN")) {
    return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
  }

  try {
    const raffle = await db.raffle.findUnique({
      where: { id },
      include: {
        _count: {
          select: {
            orders: { where: { status: "PAID" } },
          },
        },
      },
    });

    if (!raffle) {
      return NextResponse.json({ error: "Vaquinha não encontrada" }, { status: 404 });
    }

    if (raffle.sellerId !== session.user.id && session.user.role !== "ADMIN") {
      return NextResponse.json({ error: "Não autorizado" }, { status: 403 });
    }

    // Se houver pedidos pagos e não for admin forçando, cancela ao invés de deletar
    if (raffle._count.orders > 0 && session.user.role !== "ADMIN") {
      await db.raffle.update({
        where: { id },
        data: { status: "CANCELLED" },
      });
      return NextResponse.json({ message: "Vaquinha cancelada com sucesso (possui pedidos pagos registrados)." });
    }

    // Deleta em cascata (orders, numbers, promotions)
    await db.$transaction([
      db.number.deleteMany({ where: { raffleId: id } }),
      db.order.deleteMany({ where: { raffleId: id } }),
      db.promotion.deleteMany({ where: { raffleId: id } }),
      db.raffle.delete({ where: { id } }),
    ]);

    return NextResponse.json({ message: "Vaquinha excluída com sucesso!" });
  } catch (error) {
    console.error("[Raffle Delete] Erro:", error);
    return NextResponse.json({ error: "Erro ao excluir vaquinha" }, { status: 500 });
  }
}
