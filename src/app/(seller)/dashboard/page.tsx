import { db } from "@/lib/db";
import { auth } from "@/lib/auth";
import { formatCurrency } from "@/lib/utils";
import Link from "next/link";
import { notFound } from "next/navigation";

export default async function SellerDashboard() {
  const session = await auth();
  if (!session?.user || (session.user.role !== "SELLER" && session.user.role !== "ADMIN")) {
    notFound();
  }

  // Busca estatísticas gerais do vendedor
  const raffles = await db.raffle.findMany({
    where: { sellerId: session.user.id },
    include: {
      _count: {
        select: {
          orders: { where: { status: "PAID" } },
          numbers: { where: { status: "SOLD" } },
        },
      },
      orders: {
        where: { status: "PAID" },
        select: { sellerAmount: true },
      },
    },
    orderBy: { createdAt: "desc" },
  });

  const totalRevenue = raffles.reduce((acc, raffle) => {
    return acc + raffle.orders.reduce((sum, order) => sum + Number(order.sellerAmount), 0);
  }, 0);

  const activeRaffles = raffles.filter((r) => r.status === "ACTIVE").length;
  const totalNumbersSold = raffles.reduce((acc, r) => acc + r._count.numbers, 0);

  return (
    <div className="max-w-6xl mx-auto px-4 py-8">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="font-display text-3xl font-bold">Meu Painel</h1>
          <p className="text-muted-foreground">Bem-vindo de volta, {session.user.name}</p>
        </div>
        <Link
          href="/dashboard/rifas/nova"
          className="bg-primary hover:bg-primary/90 text-primary-foreground px-6 py-2 rounded-lg font-medium transition-colors"
        >
          + Nova Rifa
        </Link>
      </div>

      {/* Cards de Métricas */}
      <div className="grid sm:grid-cols-3 gap-6 mb-12">
        <div className="bg-card border rounded-xl p-6 shadow-sm">
          <div className="text-sm font-medium text-muted-foreground mb-2">Renda Líquida Total</div>
          <div className="font-display text-3xl font-bold text-green-600 dark:text-green-400">
            {formatCurrency(totalRevenue)}
          </div>
        </div>
        <div className="bg-card border rounded-xl p-6 shadow-sm">
          <div className="text-sm font-medium text-muted-foreground mb-2">Rifas Ativas</div>
          <div className="font-display text-3xl font-bold text-primary">
            {activeRaffles}
          </div>
        </div>
        <div className="bg-card border rounded-xl p-6 shadow-sm">
          <div className="text-sm font-medium text-muted-foreground mb-2">Números Vendidos</div>
          <div className="font-display text-3xl font-bold text-accent">
            {totalNumbersSold}
          </div>
        </div>
      </div>

      {/* Lista de Rifas */}
      <h2 className="font-display text-xl font-bold mb-4">Minhas Rifas</h2>
      
      {raffles.length === 0 ? (
        <div className="text-center py-16 border rounded-xl bg-muted/20 border-dashed">
          <p className="text-muted-foreground mb-4">Você ainda não criou nenhuma rifa.</p>
          <Link
            href="/dashboard/rifas/nova"
            className="text-primary hover:underline font-medium"
          >
            Comece criando sua primeira rifa →
          </Link>
        </div>
      ) : (
        <div className="bg-card border rounded-xl overflow-hidden shadow-sm">
          <table className="w-full text-sm text-left">
            <thead className="bg-muted/50 text-muted-foreground">
              <tr>
                <th className="px-6 py-4 font-medium">Rifa</th>
                <th className="px-6 py-4 font-medium">Status</th>
                <th className="px-6 py-4 font-medium">Progresso</th>
                <th className="px-6 py-4 font-medium">Arrecadado</th>
                <th className="px-6 py-4 font-medium text-right">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {raffles.map((raffle) => {
                const sold = raffle._count.numbers;
                const total = raffle.totalNumbers;
                const progress = Math.round((sold / total) * 100);
                const revenue = raffle.orders.reduce((sum, order) => sum + Number(order.sellerAmount), 0);

                return (
                  <tr key={raffle.id} className="hover:bg-muted/20 transition-colors">
                    <td className="px-6 py-4">
                      <div className="font-medium text-foreground line-clamp-1">{raffle.title}</div>
                      <div className="text-xs text-muted-foreground">R$ {Number(raffle.pricePerNumber).toFixed(2)}/número</div>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium
                        ${raffle.status === 'ACTIVE' ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400' : ''}
                        ${raffle.status === 'DRAFT' ? 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-400' : ''}
                        ${raffle.status === 'CLOSED' ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400' : ''}
                      `}>
                        {raffle.status}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        <div className="w-full h-2 bg-muted rounded-full max-w-[100px]">
                          <div className="h-full bg-primary rounded-full" style={{ width: `${progress}%` }} />
                        </div>
                        <span className="text-xs text-muted-foreground">{progress}%</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 font-medium">
                      {formatCurrency(revenue)}
                    </td>
                    <td className="px-6 py-4 text-right">
                      <Link
                        href={`/dashboard/rifas/${raffle.id}`}
                        className="text-primary hover:underline text-sm font-medium"
                      >
                        Gerenciar
                      </Link>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
