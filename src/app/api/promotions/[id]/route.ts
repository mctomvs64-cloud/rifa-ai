import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { auth } from "@/lib/auth";

const updatePromotionSchema = z
  .object({
    name: z.string().min(3).max(80).optional(),
    quantity: z.number().int().min(1).max(10000).optional(),
    promoPrice: z.number().min(0.01).optional(),
    originalPrice: z.number().min(0.01).optional(),
    active: z.boolean().optional(),
    featured: z.boolean().optional(),
    startsAt: z.string().datetime().optional().nullable(),
    endsAt: z.string().datetime().optional().nullable(),
    raffleId: z.string().optional().nullable(),
  })
  .refine(
    (data) =>
      data.promoPrice === undefined ||
      data.originalPrice === undefined ||
      data.promoPrice < data.originalPrice,
    {
      message: "O preço promocional deve ser menor que o preço original",
      path: ["promoPrice"],
    }
  );

interface RouteContext {
  params: Promise<{ id: string }>;
}

/**
 * PATCH /api/promotions/[id]
 * Atualiza campos de uma promoção (apenas ADMIN).
 * Aceita atualizações parciais (ex: só { active: false } para desativar).
 */
export async function PATCH(req: NextRequest, context: RouteContext) {
  const session = await auth();
  if (!session?.user || session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
  }

  const { id } = await context.params;

  try {
    const body = await req.json();
    const parsed = updatePromotionSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Dados inválidos", details: parsed.error.flatten().fieldErrors },
        { status: 400 }
      );
    }

    const existing = await db.promotion.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json({ error: "Promoção não encontrada" }, { status: 404 });
    }

    // Validação cruzada quando apenas um dos preços é alterado
    const finalPromo = parsed.data.promoPrice ?? Number(existing.promoPrice);
    const finalOriginal = parsed.data.originalPrice ?? Number(existing.originalPrice);
    if (finalPromo >= finalOriginal) {
      return NextResponse.json(
        { error: "O preço promocional deve ser menor que o preço original" },
        { status: 400 }
      );
    }

    const { raffleId, ...data } = parsed.data;

    const promotion = await db.promotion.update({
      where: { id },
      data: {
        ...data,
        ...(raffleId !== undefined ? { raffleId: raffleId ?? null } : {}),
        ...(data.startsAt !== undefined
          ? { startsAt: data.startsAt ? new Date(data.startsAt) : null }
          : {}),
        ...(data.endsAt !== undefined
          ? { endsAt: data.endsAt ? new Date(data.endsAt) : null }
          : {}),
      },
    });

    return NextResponse.json({ promotion });
  } catch (error) {
    console.error("[Promotions PATCH] Erro:", error);
    return NextResponse.json({ error: "Erro ao atualizar promoção" }, { status: 500 });
  }
}

/**
 * DELETE /api/promotions/[id]
 * Remove uma promoção (apenas ADMIN).
 * Pedidos antigos mantêm o registro via SET NULL.
 */
export async function DELETE(_req: NextRequest, context: RouteContext) {
  const session = await auth();
  if (!session?.user || session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
  }

  const { id } = await context.params;

  try {
    await db.promotion.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("[Promotions DELETE] Erro:", error);
    return NextResponse.json({ error: "Erro ao excluir promoção" }, { status: 500 });
  }
}
