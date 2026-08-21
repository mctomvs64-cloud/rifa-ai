import { db } from "@/lib/db";
import { notFound } from "next/navigation";
import CheckoutSuccessClient from "./checkout-success-client";

export default async function CheckoutSuccessPage({
  params,
}: {
  params: Promise<{ orderId: string }>;
}) {
  const { orderId } = await params;

  const order = await db.order.findUnique({
    where: { id: orderId },
    include: {
      raffle: {
        select: { title: true, slug: true, whatsappNumber: true },
      },
      numbers: {
        select: { number: true },
        orderBy: { number: "asc" },
      },
    },
  });

  if (!order) notFound();

  // Serializa os dados para passar ao Client Component
  const initialOrder = {
    orderId: order.id,
    status: order.status as "PENDING" | "PAID" | "CANCELLED" | "EXPIRED",
    paidAt: order.paidAt?.toISOString() ?? null,
    expiresAt: order.expiresAt?.toISOString() ?? null,
    whatsappLink: order.whatsappLink ?? null,
    raffle: { title: order.raffle.title, slug: order.raffle.slug },
    numbers: order.numbers.map((n) => n.number),
  };

  return (
    <CheckoutSuccessClient
      initialOrder={initialOrder}
      totalAmount={Number(order.totalAmount)}
    />
  );
}
