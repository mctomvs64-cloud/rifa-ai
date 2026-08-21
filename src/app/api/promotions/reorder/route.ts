import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { auth } from "@/lib/auth";

const reorderSchema = z.object({
  orderedIds: z.array(z.string()).min(1),
});

/**
 * PATCH /api/promotions/reorder
 * Recebe os IDs na nova ordem e persiste sortOrder sequencial.
 */
export async function PATCH(req: NextRequest) {
  const session = await auth();
  if (!session?.user || session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
  }

  try {
    const body = await req.json();
    const parsed = reorderSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json({ error: "Dados inválidos" }, { status: 400 });
    }

    const { orderedIds } = parsed.data;

    await db.$transaction(
      orderedIds.map((id, index) =>
        db.promotion.update({ where: { id }, data: { sortOrder: index } })
      )
    );

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("[Promotions REORDER] Erro:", error);
    return NextResponse.json({ error: "Erro ao reordenar promoções" }, { status: 500 });
  }
}
