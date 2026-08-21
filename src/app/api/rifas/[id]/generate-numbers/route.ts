import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { auth } from "@/lib/auth";

/**
 * POST /api/rifas/[id]/generate-numbers
 * Gera os números no banco de dados para uma rifa em rascunho.
 */
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
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
          select: { numbers: true },
        },
      },
    });

    if (!raffle) {
      return NextResponse.json({ error: "Rifa não encontrada" }, { status: 404 });
    }

    if (raffle.sellerId !== session.user.id && session.user.role !== "ADMIN") {
      return NextResponse.json({ error: "Não autorizado" }, { status: 403 });
    }

    if (raffle.status !== "DRAFT") {
      return NextResponse.json({ error: "Rifa já publicada" }, { status: 400 });
    }

    if (raffle._count.numbers > 0) {
      return NextResponse.json({ error: "Números já foram gerados" }, { status: 400 });
    }

    // Gera os números em lotes para evitar sobrecarga de memória no banco
    const total = raffle.totalNumbers;
    const batchSize = 10000;
    
    for (let i = 0; i < total; i += batchSize) {
      const currentBatchSize = Math.min(batchSize, total - i);
      const numbersBatch = Array.from({ length: currentBatchSize }, (_, index) => ({
        raffleId: id,
        number: i + index,
        status: "AVAILABLE" as const,
      }));

      await db.number.createMany({
        data: numbersBatch,
        skipDuplicates: true, // Segurança extra
      });
    }

    // Atualiza status da rifa para ACTIVE (pronta para vender)
    await db.raffle.update({
      where: { id },
      data: { status: "ACTIVE" },
    });

    return NextResponse.json({ message: "Números gerados com sucesso", total });
  } catch (error) {
    console.error("[Generate Numbers] Erro:", error);
    return NextResponse.json({ error: "Erro ao gerar números" }, { status: 500 });
  }
}
