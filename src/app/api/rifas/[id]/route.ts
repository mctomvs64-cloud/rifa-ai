import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { auth } from "@/lib/auth";

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await auth();

  if (!session?.user || (session.user.role !== "SELLER" && session.user.role !== "ADMIN")) {
    return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
  }

  try {
    const raffle = await db.raffle.findUnique({ where: { id } });

    if (!raffle) {
      return NextResponse.json({ error: "Rifa não encontrada" }, { status: 404 });
    }

    if (raffle.sellerId !== session.user.id && session.user.role !== "ADMIN") {
      return NextResponse.json({ error: "Não autorizado" }, { status: 403 });
    }

    const body = await req.json();

    const updated = await db.raffle.update({
      where: { id },
      data: {
        coverImage: body.coverImage,
      },
    });

    return NextResponse.json({ raffle: updated });
  } catch (error) {
    console.error("[Raffle Update] Erro:", error);
    return NextResponse.json({ error: "Erro ao atualizar rifa" }, { status: 500 });
  }
}
