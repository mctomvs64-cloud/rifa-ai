import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { checkoutRateLimiter } from "@/lib/security/rate-limit";
import { applySecurityHeaders } from "@/lib/security/headers";

export async function GET(req: NextRequest) {
  const rateLimitRes = await checkoutRateLimiter(req);
  if (rateLimitRes) return applySecurityHeaders(rateLimitRes);

  const phone = req.nextUrl.searchParams.get("phone");

  if (!phone) {
    return applySecurityHeaders(NextResponse.json({ error: "Telefone obrigatório" }, { status: 400 }));
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

    return applySecurityHeaders(NextResponse.json({ orders }));
  } catch (error) {
    return applySecurityHeaders(NextResponse.json({ error: "Erro ao buscar pedidos" }, { status: 500 }));
  }
}
