import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { auth } from "@/lib/auth";
import { generateUniqueSlug, calculateFees } from "@/lib/utils";

const createRaffleSchema = z.object({
  title: z.string().min(3, "Título muito curto").max(100),
  description: z.string().optional(),
  prize: z.string().min(3, "Descreva o prêmio"),
  pricePerNumber: z.number().min(0.5, "Preço mínimo: R$ 0,50"),
  totalNumbers: z.number().min(10).max(100000),
  minNumbers: z.number().min(1).default(1),
  maxNumbers: z.number().min(1).default(50),
  drawDate: z.string().datetime().optional().nullable(),
  coverImage: z.string().url().optional().nullable(),
  images: z.array(z.string().url()).default([]),
  whatsappNumber: z.string().optional().nullable(),
  promotions: z.array(z.object({
    quantity: z.number().min(2),
    promoPrice: z.number().min(0.5)
  })).optional().default([]),
});

/**
 * GET /api/rifas
 * Lista rifas do vendedor autenticado.
 */
export async function GET(req: NextRequest) {
  const session = await auth();

  if (!session?.user) {
    return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
  }

  const raffles = await db.raffle.findMany({
    where: {
      sellerId: session.user.role === "ADMIN" ? undefined : session.user.id,
    },
    include: {
      _count: {
        select: {
          numbers: { where: { status: "SOLD" } },
          orders: { where: { status: "PAID" } },
        },
      },
    },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json({ raffles });
}

/**
 * POST /api/rifas
 * Cria uma nova rifa para o vendedor autenticado.
 */
export async function POST(req: NextRequest) {
  const session = await auth();

  if (!session?.user) {
    return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
  }

  if (session.user.role !== "SELLER" && session.user.role !== "ADMIN") {
    return NextResponse.json(
      { error: "Apenas vendedores podem criar rifas" },
      { status: 403 }
    );
  }

  try {
    const body = await req.json();
    const parsed = createRaffleSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Dados inválidos", details: parsed.error.flatten().fieldErrors },
        { status: 400 }
      );
    }

    const data = parsed.data;

    // Busca a taxa padrão da plataforma nas configurações
    const feeConfig = await db.settings.findUnique({
      where: { key: "platform_fee_percent" },
    });
    const platformFeePercent = feeConfig ? parseFloat(feeConfig.value) : 5;

    // Gera slug único baseado no título
    const slug = generateUniqueSlug(data.title);

    // Cria a rifa em DRAFT (não publicada ainda)
    const raffle = await db.raffle.create({
      data: {
        slug,
        title: data.title,
        description: data.description,
        prize: data.prize,
        pricePerNumber: data.pricePerNumber,
        totalNumbers: data.totalNumbers,
        minNumbers: data.minNumbers,
        maxNumbers: data.maxNumbers,
        drawDate: data.drawDate ? new Date(data.drawDate) : null,
        coverImage: data.coverImage,
        images: data.images,
        whatsappNumber: data.whatsappNumber?.replace(/\D/g, "") ?? null,
        platformFeePercent,
        sellerId: session.user.id,
        status: "DRAFT",
        promotions: data.promotions && data.promotions.length > 0 ? {
          create: data.promotions.map(p => ({
            name: `Pacote ${p.quantity} números`,
            quantity: p.quantity,
            promoPrice: p.promoPrice,
            originalPrice: p.quantity * data.pricePerNumber,
            active: true
          }))
        } : undefined,
      },
    });

    return NextResponse.json({ raffle }, { status: 201 });
  } catch (error) {
    console.error("[Rifas POST] Erro:", error);
    return NextResponse.json({ error: "Erro ao criar rifa" }, { status: 500 });
  }
}
