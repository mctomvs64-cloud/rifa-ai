import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { db } from "@/lib/db";

export async function GET(req: NextRequest) {
  const phone = req.nextUrl.searchParams.get("phone");

  if (!phone) {
    return NextResponse.json({ error: "Telefone obrigatório" }, { status: 400 });
  }

  try {
    const orders = await db.order.findMany({
      where: { buyerPhone: phone },
      include: {
        raffle: { select: { title: true, slug: true } },
        numbers: { select: { number: true }, orderBy: { number: "asc" } },
      },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json({ orders });
  } catch (error) {
    return NextResponse.json({ error: "Erro ao buscar pedidos" }, { status: 500 });
  }
}
