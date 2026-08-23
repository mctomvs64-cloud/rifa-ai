import { db } from "@/lib/db";
import { auth } from "@/lib/auth";
import { formatCurrency } from "@/lib/utils";
import { notFound } from "next/navigation";

export default async function RepassesPage() {
  const session = await auth();
  if (!session?.user || session.user.role !== "ADMIN") notFound();

  // Buscar pedidos pagos
  const paidOrders = await db.order.findMany({
    where: { status: "PAID" },
    include: {
      raffle: {
        select: { title: true, seller: { select: { name: true, email: true } } }
      }
    },
    orderBy: { paidAt: "desc" }
  });

  const totalPlatform = paidOrders.reduce((sum, order) => sum + Number(order.platformFee), 0);
  const totalSeller = paidOrders.reduce((sum, order) => sum + Number(order.sellerAmount), 0);
  const totalVolume = paidOrders.reduce((sum, order) => sum + Number(order.totalAmount), 0);

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      <div className="mb-8">
        <h1 className="font-display text-3xl font-bold">Gestão de Repasses</h1>
        <p className="text-muted-foreground">Monitore a divisão financeira entre plataforma e vendedores.</p>
      </div>

      <div className="grid sm:grid-cols-3 gap-6 mb-8">
        <div className="bg-navy-900 text-white rounded-xl p-6 shadow-md hero-bg">
          <div className="text-sm font-medium text-blue-200 mb-2">Lucro da Plataforma</div>
          <div className="font-display text-3xl font-bold text-yellow-400">
            {formatCurrency(totalPlatform)}
          </div>
        </div>
        <div className="bg-card border rounded-xl p-6 shadow-sm">
          <div className="text-sm font-medium text-muted-foreground mb-2">Repassado aos Vendedores</div>
          <div className="font-display text-3xl font-bold text-emerald-600">
            {formatCurrency(totalSeller)}
          </div>
        </div>
        <div className="bg-card border rounded-xl p-6 shadow-sm">
          <div className="text-sm font-medium text-muted-foreground mb-2">Volume Total (Vendas)</div>
          <div className="font-display text-3xl font-bold text-foreground">
            {formatCurrency(totalVolume)}
          </div>
        </div>
      </div>

      <div className="bg-card border rounded-xl overflow-hidden shadow-sm">
        <div className="p-4 border-b bg-muted/30">
          <h2 className="font-semibold text-lg">Histórico de Transações</h2>
        </div>
        <table className="w-full text-sm text-left">
          <thead className="bg-muted/50 text-muted-foreground">
            <tr>
              <th className="px-6 py-4 font-medium">Data</th>
              <th className="px-6 py-4 font-medium">Rifa / Vendedor</th>
              <th className="px-6 py-4 font-medium">Valor Total</th>
              <th className="px-6 py-4 font-medium">Plataforma (Taxa)</th>
              <th className="px-6 py-4 font-medium">Vendedor (Líquido)</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {paidOrders.map((order) => (
              <tr key={order.id} className="hover:bg-muted/20">
                <td className="px-6 py-4 text-muted-foreground">
                  {order.paidAt ? new Date(order.paidAt).toLocaleDateString("pt-BR") : "-"}
                </td>
                <td className="px-6 py-4">
                  <div className="font-medium text-foreground">{order.raffle.title}</div>
                  <div className="text-xs text-muted-foreground">{order.raffle.seller.name}</div>
                </td>
                <td className="px-6 py-4 font-medium">{formatCurrency(Number(order.totalAmount))}</td>
                <td className="px-6 py-4 text-amber-600 font-medium">+{formatCurrency(Number(order.platformFee))}</td>
                <td className="px-6 py-4 text-emerald-600 font-medium">{formatCurrency(Number(order.sellerAmount))}</td>
              </tr>
            ))}
            {paidOrders.length === 0 && (
              <tr>
                <td colSpan={5} className="px-6 py-8 text-center text-muted-foreground">
                  Nenhuma transação paga encontrada.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
