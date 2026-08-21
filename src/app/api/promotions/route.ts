import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { auth } from "@/lib/auth";

const promotionSchema = z
  .object({
    name: z.string().min(3, "Nome muito curto").max(80),
    quantity: z.number().int().min(1).max(10000),
    promoPrice: z.number().min(0.01, "Preço promocional obrigatório"),
    originalPrice: z.number().min(0.01, "Preço original obrigatório"),
    sortOrder: z.number().int().default(0),
    active: z.boolean().default(true),
    featured: z.boolean().default(false),
    startsAt: z.string().datetime().optional().nullable(),
    endsAt: z.string().datetime().optional().nullable(),
    raffleId: z.string().optional().nullable(),
  })
  .refine((data) => data.promoPrice < data.originalPrice, {
    message: "O preço promocional deve ser menor que o preço original",
    path: ["promoPrice"],
  });

/**
 * GET /api/promotions?raffleId=xxx&all=1
 * - Público: lista promoções ativas e dentro da vigência.
 *   Com `raffleId`, retorna as globais (raffleId null) + as da rifa.
 * - Admin (com ?all=1): lista todas, incluindo inativas.
 */
export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl;
  const raffleId = searchParams.get("raffleId");
  const wantsAll = searchParams.get("all") === "1";

  if (wantsAll) {
    const session = await auth();
    if (!session?.user || session.user.role !== "ADMIN") {
      return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
    }
  }

  const now = new Date();

  const promotions = await db.promotion.findMany({
    where: {
      ...(wantsAll
        ? {}
        : {
            active: true,
            OR: [{ startsAt: null }, { startsAt: { lte: now } }],
            AND: [{ OR: [{ endsAt: null }, { endsAt: { gte: now } }] }],
          }),
      ...(raffleId ? { OR: [{ raffleId }, { raffleId: null }] } : {}),
    },
    orderBy: [{ sortOrder: "asc" }, { promoPrice: "asc" }],
    include: { raffle: { select: { title: true } } },
  });

  return NextResponse.json({ promotions });
}

/**
 * POST /api/promotions
 * Cria uma nova promoção (apenas ADMIN).
 */
export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user || session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
  }

  try {
    const body = await req.json();
    const parsed = promotionSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Dados inválidos", details: parsed.error.flatten().fieldErrors },
        { status: 400 }
      );
    }

    const { raffleId, ...data } = parsed.data;

    if (raffleId) {
      const raffleExists = await db.raffle.findUnique({ where: { id: raffleId } });
      if (!raffleExists) {
        return NextResponse.json({ error: "Rifa não encontrada" }, { status: 404 });
      }
    }

    // Garante sortOrder único no topo: novas promoções vão para o fim da lista
    const last = await db.promotion.findFirst({
      orderBy: { sortOrder: "desc" },
      select: { sortOrder: true },
    });
    const sortOrder = data.sortOrder ?? (last?.sortOrder ?? -1) + 1;

    const promotion = await db.promotion.create({
      data: {
        ...data,
        sortOrder,
        raffleId: raffleId ?? null,
        startsAt: data.startsAt ? new Date(data.startsAt) : null,
        endsAt: data.endsAt ? new Date(data.endsAt) : null,
      },
    });

    return NextResponse.json({ promotion }, { status: 201 });
  } catch (error) {
    console.error("[Promotions POST] Erro:", error);
    return NextResponse.json({ error: "Erro ao criar promoção" }, { status: 500 });
  }
}
