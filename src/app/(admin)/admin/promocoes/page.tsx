import { db } from "@/lib/db";
import { auth } from "@/lib/auth";
import { notFound } from "next/navigation";
import { PromotionsManager } from "@/components/admin/promotions-manager";

export const metadata = { title: "Promoções — Admin RifaAI" };

export default async function AdminPromotionsPage() {
  const session = await auth();
  if (!session?.user || session.user.role !== "ADMIN") {
    notFound();
  }

  const promotions = await db.promotion.findMany({
    orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
    include: { raffle: { select: { id: true, title: true } } },
  });

  const raffles = await db.raffle.findMany({
    select: { id: true, title: true },
    orderBy: { createdAt: "desc" },
  });

  return (
    <div className="max-w-6xl mx-auto px-4 py-8">
      <div className="mb-8">
        <h1 className="font-display text-3xl font-bold">Promoções</h1>
        <p className="text-muted-foreground">
          Crie pacotes de números com preço promocional. Arraste para reordenar a exibição.
        </p>
      </div>

      <PromotionsManager
        initialPromotions={promotions.map((p) => ({
          id: p.id,
          name: p.name,
          quantity: p.quantity,
          promoPrice: Number(p.promoPrice),
          originalPrice: Number(p.originalPrice),
          sortOrder: p.sortOrder,
          active: p.active,
          featured: p.featured,
          startsAt: p.startsAt?.toISOString() ?? null,
          endsAt: p.endsAt?.toISOString() ?? null,
          usageCount: p.usageCount,
          raffleId: p.raffleId,
          raffleTitle: p.raffle?.title ?? null,
        }))}
        raffles={raffles}
      />
    </div>
  );
}
