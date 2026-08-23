import { db } from "@/lib/db";
import { auth } from "@/lib/auth";
import { formatCurrency } from "@/lib/utils";
import { notFound } from "next/navigation";
import Link from "next/link";

export default async function MonitoramentoRifasPage() {
  const session = await auth();
  if (!session?.user || session.user.role !== "ADMIN") notFound();

  const raffles = await db.raffle.findMany({
    orderBy: { createdAt: "desc" },
    include: {
      seller: { select: { name: true, email: true } },
      _count: { select: { orders: { where: { status: "PAID" } }, numbers: { where: { status: "SOLD" } } } }
    }
  });

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      <div className="mb-8 flex justify-between items-end">
        <div>
          <h1 className="font-display text-3xl font-bold">Monitoramento de Rifas</h1>
          <p className="text-muted-foreground">Visão geral ("God Mode") de todas as rifas ativas, pendentes ou encerradas.</p>
        </div>
      </div>

      <div className="bg-card border rounded-xl overflow-hidden shadow-sm">
        <table className="w-full text-sm text-left">
          <thead className="bg-muted/50 text-muted-foreground">
            <tr>
              <th className="px-6 py-4 font-medium">Rifa</th>
              <th className="px-6 py-4 font-medium">Vendedor</th>
              <th className="px-6 py-4 font-medium">Preço (Cota)</th>
              <th className="px-6 py-4 font-medium">Vendas (Pagas)</th>
              <th className="px-6 py-4 font-medium">Status</th>
              <th className="px-6 py-4 font-medium text-right">Ações</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {raffles.map((raffle) => (
              <tr key={raffle.id} className="hover:bg-muted/20">
                <td className="px-6 py-4">
                  <div className="font-medium text-foreground max-w-[200px] truncate" title={raffle.title}>
                    {raffle.title}
                  </div>
                  <div className="text-xs text-muted-foreground mt-1">
                    {raffle._count.numbers} de {raffle.totalNumbers} cotas vendidas
                  </div>
                </td>
                <td className="px-6 py-4">
                  <div>{raffle.seller.name}</div>
                  <div className="text-xs text-muted-foreground">{raffle.seller.email}</div>
                </td>
                <td className="px-6 py-4 font-medium">{formatCurrency(Number(raffle.pricePerNumber))}</td>
                <td className="px-6 py-4">
                  <span className="inline-flex items-center justify-center px-2 py-1 rounded bg-muted text-xs font-bold">
                    {raffle._count.orders} pedidos
                  </span>
                </td>
                <td className="px-6 py-4">
                  <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider
                    ${raffle.status === 'ACTIVE' ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-400' : 
                      raffle.status === 'DRAFT' ? 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400' :
                      'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300'}
                  `}>
                    {raffle.status}
                  </span>
                </td>
                <td className="px-6 py-4 text-right">
                  <Link
                    href={`/rifas/${raffle.slug}`}
                    target="_blank"
                    className="text-primary hover:underline text-xs font-medium"
                  >
                    Ver Página
                  </Link>
                </td>
              </tr>
            ))}
            {raffles.length === 0 && (
              <tr>
                <td colSpan={6} className="px-6 py-8 text-center text-muted-foreground">
                  Nenhuma rifa encontrada na plataforma.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
