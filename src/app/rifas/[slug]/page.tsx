import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { releaseExpiredReservations } from "@/lib/reservations";
import { RafflePageClient } from "@/components/raffle/raffle-page-client";
import { PublicNavbar } from "@/components/layout/public-navbar";
import { PublicFooter } from "@/components/layout/public-footer";
import type { Metadata } from "next";

interface RafflePageProps {
  params: Promise<{ slug: string }>;
}

async function getRaffle(slug: string) {
  // Encontra a rifa preliminarmente para obter o ID e liberar reservas
  const initial = await db.raffle.findUnique({
    where: { slug },
    select: { id: true },
  });

  if (initial?.id) {
    await releaseExpiredReservations(initial.id);
  }

  return db.raffle.findUnique({
    where: { slug },
    include: {
      seller: {
        select: { name: true, image: true, phone: true },
      },
      numbers: {
        select: { number: true, status: true },
        orderBy: { number: "asc" },
      },
    },
  });
}

async function getActivePromotions(raffleId: string) {
  const now = new Date();
  return db.promotion.findMany({
    where: {
      active: true,
      OR: [{ raffleId }, { raffleId: null }],
      AND: [
        { OR: [{ startsAt: null }, { startsAt: { lte: now } }] },
        { OR: [{ endsAt: null }, { endsAt: { gte: now } }] },
      ],
    },
    orderBy: [{ sortOrder: "asc" }, { promoPrice: "asc" }],
    select: {
      id: true,
      name: true,
      quantity: true,
      promoPrice: true,
      originalPrice: true,
      featured: true,
    },
  });
}

export async function generateMetadata({
  params,
}: RafflePageProps): Promise<Metadata> {
  const { slug } = await params;
  const raffle = await getRaffle(slug);

  if (!raffle) return { title: "Rifa não encontrada" };

  return {
    title: `${raffle.title} — RifaAI`,
    description: `${raffle.prize} | R$ ${Number(raffle.pricePerNumber).toFixed(2)} por número | ${raffle.totalNumbers} cotas`,
    openGraph: {
      images: raffle.coverImage ? [raffle.coverImage] : [],
    },
  };
}

export default async function RafflePage({ params }: RafflePageProps) {
  const { slug } = await params;
  const raffle = await getRaffle(slug);

  if (!raffle || raffle.status === "DRAFT") {
    notFound();
  }

  const promotions = await getActivePromotions(raffle.id);

  // Mapeia números para formato simples
  const numbers = raffle.numbers.map((n) => ({
    number: n.number,
    status: n.status,
  }));

  const soldCount = numbers.filter((n) => n.status === "SOLD").length;
  const reservedCount = numbers.filter((n) => n.status === "RESERVED").length;
  const availableCount = numbers.filter((n) => n.status === "AVAILABLE").length;

  return (
    <div className="min-h-screen flex flex-col">
      <PublicNavbar />

      <main className="flex-1 py-8 px-4">
        <div className="max-w-6xl mx-auto">
          <RafflePageClient
            raffle={{
              id: raffle.id,
              slug: raffle.slug,
              title: raffle.title,
              description: raffle.description,
              prize: raffle.prize,
              pricePerNumber: Number(raffle.pricePerNumber),
              totalNumbers: raffle.totalNumbers,
              minNumbers: raffle.minNumbers,
              maxNumbers: raffle.maxNumbers,
              drawDate: raffle.drawDate?.toISOString() ?? null,
              coverImage: raffle.coverImage,
              images: raffle.images,
              status: raffle.status,
              whatsappNumber: raffle.whatsappNumber,
              seller: raffle.seller,
            }}
            numbers={numbers}
            stats={{ soldCount, reservedCount, availableCount }}
            promotions={promotions.map((p) => ({
              id: p.id,
              name: p.name,
              quantity: p.quantity,
              promoPrice: Number(p.promoPrice),
              originalPrice: Number(p.originalPrice),
              featured: p.featured,
            }))}
          />
        </div>
      </main>

      <PublicFooter />
    </div>
  );
}
