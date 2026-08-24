import { db } from "@/lib/db";
import { auth } from "@/lib/auth";
import { formatCurrency } from "@/lib/utils";
import Link from "next/link";
import { notFound } from "next/navigation";
import { SalesEvolutionChart, type SalesPoint } from "@/components/dashboard/sales-evolution-chart";
import { StatusDonutChart, type StatusSlice } from "@/components/dashboard/status-donut-chart";
import { TopRafflesChart, type RaffleRank } from "@/components/dashboard/top-raffles-chart";

const DAY_MS = 24 * 60 * 60 * 1000;

export default async function SellerDashboard() {
  const session = await auth();
  if (!session?.user || (session.user.role !== "SELLER" && session.user.role !== "ADMIN")) {
    notFound();
  }

  const sellerId = session.user.id;

  // Rifas do vendedor com contadores e receita
  const raffles = await db.raffle.findMany({
    where: { sellerId },
    include: {
      _count: {
        select: {
          orders: { where: { status: "PAID" } },
          numbers: { where: { status: "SOLD" } },
        },
      },
      orders: {
        where: { status: "PAID" },
        select: { sellerAmount: true, totalAmount: true },
      },
    },
    orderBy: { createdAt: "desc" },
  });

  // Todos os pedidos relevantes (para gráficos, conversão e leads)
  const allOrders = await db.order.findMany({
    where: { raffle: { sellerId }, status: { in: ["PAID", "PENDING", "EXPIRED"] } },
    select: {
      id: true,
      status: true,
      buyerName: true,
      quantity: true,
      totalAmount: true,
      createdAt: true,
      raffle: { select: { title: true } },
    },
    orderBy: { createdAt: "desc" },
  });

  // ===== KPIs =====
  const paidOrders = allOrders.filter((o) => o.status === "PAID");
  const leadOrders = allOrders.filter((o) => o.status !== "PAID");

  const grossRevenue = paidOrders.reduce((acc, o) => acc + Number(o.totalAmount), 0);

  const sellerNetRevenue = raffles.reduce(
    (acc, r) => acc + r.orders.reduce((sum, order) => sum + Number(order.sellerAmount), 0),
    0
  );

  const platformFees = grossRevenue - sellerNetRevenue;

  const now = Date.now();
  const startToday = new Date(new Date().setHours(0, 0, 0, 0));
  const last7Start = new Date(now - 7 * DAY_MS);
  const prev7Start = new Date(now - 14 * DAY_MS);

  const soldToday = paidOrders.filter((o) => o.createdAt >= startToday);
  const revenueLast7 = paidOrders
    .filter((o) => o.createdAt >= last7Start)
    .reduce((acc, o) => acc + Number(o.totalAmount), 0);
  const revenuePrev7 = paidOrders
    .filter((o) => o.createdAt >= prev7Start && o.createdAt < last7Start)
    .reduce((acc, o) => acc + Number(o.totalAmount), 0);
  const weekDelta =
    revenuePrev7 > 0 ? Math.round(((revenueLast7 - revenuePrev7) / revenuePrev7) * 100) : revenueLast7 > 0 ? 100 : 0;

  const conversion = allOrders.length > 0 ? Math.round((paidOrders.length / allOrders.length) * 100) : 0;
  const openValue = leadOrders.reduce((acc, o) => acc + Number(o.totalAmount), 0);

  const activeRaffles = raffles.filter((r) => r.status === "ACTIVE").length;
  const totalNumbersSold = raffles.reduce((acc, r) => acc + r._count.numbers, 0);
  const totalCapacity = raffles.filter((r) => r.status !== "DRAFT").reduce((acc, r) => acc + r.totalNumbers, 0);
  const fillRate = totalCapacity > 0 ? Math.round((totalNumbersSold / totalCapacity) * 100) : 0;

  // ===== Série diária (30 dias) =====
  const seriesMap = new Map<string, SalesPoint>();
  for (let i = 29; i >= 0; i--) {
    const d = new Date(now - i * DAY_MS);
    const key = d.toISOString().slice(0, 10);
    seriesMap.set(key, {
      date: key,
      label: d.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" }),
      valor: 0,
      vendas: 0,
    });
  }
  for (const o of paidOrders) {
    const key = o.createdAt.toISOString().slice(0, 10);
    const point = seriesMap.get(key);
    if (point) {
      point.valor += Number(o.totalAmount);
      point.vendas += 1;
    }
  }
  const salesSeries = Array.from(seriesMap.values());

  // ===== Donut de status =====
  const statusData: StatusSlice[] = [
    {
      name: "Pagos",
      value: paidOrders.length,
      valor: grossRevenue,
      color: "#10b981",
    },
    {
      name: "Pendentes",
      value: allOrders.filter((o) => o.status === "PENDING").length,
      valor: allOrders.filter((o) => o.status === "PENDING").reduce((a, o) => a + Number(o.totalAmount), 0),
      color: "#f59e0b",
    },
    {
      name: "Expirados",
      value: allOrders.filter((o) => o.status === "EXPIRED").length,
      valor: allOrders.filter((o) => o.status === "EXPIRED").reduce((a, o) => a + Number(o.totalAmount), 0),
      color: "#94a3b8",
    },
  ].filter((d) => d.value > 0);

  // ===== Ranking de rifas =====
  const ranking: RaffleRank[] = raffles
    .map((r) => ({
      title: r.title,
      receita: r.orders.reduce((sum, order) => sum + Number(order.sellerAmount), 0),
      sold: r._count.numbers,
    }))
    .sort((a, b) => b.receita - a.receita || b.sold - a.sold)
    .slice(0, 5);

  const recentOrders = allOrders.slice(0, 6);

  return (
    <div className="max-w-6xl mx-auto px-4 py-8 space-y-8">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between md:items-center gap-4">
        <div>
          <h1 className="font-display text-3xl font-bold">Meu Painel</h1>
          <p className="text-muted-foreground text-sm mt-1">
            Bem-vindo de volta, <span className="font-medium text-foreground">{session.user.name}</span> 👋
          </p>
        </div>
        <Link
          href="/dashboard/rifas/nova"
          className="inline-flex items-center gap-2 bg-primary hover:bg-primary/90 text-primary-foreground px-5 py-2.5 rounded-xl font-semibold shadow-sm transition-all hover:shadow-md active:scale-[0.98]"
        >
          ✨ Nova Rifa
        </Link>
      </div>

      {/* KPIs principais */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="relative overflow-hidden bg-card border border-border/60 rounded-2xl p-5 shadow-sm">
          <div className="absolute -right-6 -top-6 w-20 h-20 rounded-full bg-emerald-500/10 blur-xl" />
          <div className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-2">Receita Líquida</div>
          <div className="font-display text-2xl xl:text-3xl font-bold text-emerald-600 dark:text-emerald-400 truncate">
            {formatCurrency(sellerNetRevenue)}
          </div>
          <div className="text-[11px] text-muted-foreground mt-1.5">
            Bruto {formatCurrency(grossRevenue)} · taxa {formatCurrency(platformFees)}
          </div>
        </div>

        <div className="relative overflow-hidden bg-card border border-border/60 rounded-2xl p-5 shadow-sm">
          <div className="absolute -right-6 -top-6 w-20 h-20 rounded-full bg-blue-500/10 blur-xl" />
          <div className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-2">Vendas (7 dias)</div>
          <div className="flex items-baseline gap-2">
            <span className="font-display text-2xl xl:text-3xl font-bold">{formatCurrency(revenueLast7)}</span>
            {revenueLast7 > 0 && (
              <span
                className={`text-xs font-bold px-1.5 py-0.5 rounded-full ${
                  weekDelta >= 0 ? "bg-emerald-100 text-emerald-700" : "bg-red-100 text-red-700"
                }`}
              >
                {weekDelta >= 0 ? "▲" : "▼"} {Math.abs(weekDelta)}%
              </span>
            )}
          </div>
          <div className="text-[11px] text-muted-foreground mt-1.5">
            Hoje: {soldToday.length} pedido(s){soldToday.length > 0 && ` · ${formatCurrency(soldToday.reduce((a, o) => a + Number(o.totalAmount), 0))}`}
          </div>
        </div>

        <div className="relative overflow-hidden bg-card border border-border/60 rounded-2xl p-5 shadow-sm">
          <div className="absolute -right-6 -top-6 w-20 h-20 rounded-full bg-violet-500/10 blur-xl" />
          <div className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-2">Taxa de Conversão</div>
          <div className="font-display text-2xl xl:text-3xl font-bold text-violet-600 dark:text-violet-400">
            {conversion}%
          </div>
          <div className="h-1.5 bg-muted rounded-full mt-2.5 max-w-[110px] overflow-hidden">
            <div className="h-full bg-violet-500 rounded-full transition-all" style={{ width: `${conversion}%` }} />
          </div>
          <div className="text-[11px] text-muted-foreground mt-1.5">
            {paidOrders.length} de {allOrders.length} pedidos pagos
          </div>
        </div>

        <div className="relative overflow-hidden bg-card border border-border/60 rounded-2xl p-5 shadow-sm">
          <div className="absolute -right-6 -top-6 w-20 h-20 rounded-full bg-amber-500/10 blur-xl" />
          <div className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-2">Leads em Aberto</div>
          <div className="font-display text-2xl xl:text-3xl font-bold text-amber-600 dark:text-amber-400">
            {leadOrders.length}
          </div>
          <div className="text-[11px] text-muted-foreground mt-1.5">
            {formatCurrency(openValue)} para recuperar nos painéis das rifas
          </div>
        </div>
      </div>

      {/* Gráficos */}
      <div className="grid lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2">
          <SalesEvolutionChart data={salesSeries} />
        </div>
        <StatusDonutChart data={statusData} />
      </div>

      <div className="grid lg:grid-cols-2 gap-4">
        <TopRafflesChart data={ranking} />

        {/* Últimos pedidos */}
        <div className="bg-card border border-border/60 rounded-2xl p-6 shadow-sm flex flex-col">
          <div className="flex items-center justify-between mb-1">
            <h3 className="font-semibold">🕐 Atividade Recente</h3>
            <span className="text-xs text-muted-foreground">Últimos pedidos</span>
          </div>
          <p className="text-xs text-muted-foreground mb-4">Reservas, pagamentos e leads em tempo real</p>

          {recentOrders.length === 0 ? (
            <div className="flex-1 flex flex-col items-center justify-center text-muted-foreground text-sm gap-2 py-8">
              <span className="text-3xl opacity-40">🔔</span>
              Nenhum pedido ainda. Compartilhe suas rifas para começar!
            </div>
          ) : (
            <div className="space-y-2.5 flex-1">
              {recentOrders.map((o) => (
                <div key={o.id} className="flex items-center justify-between gap-3 py-1.5 border-b border-border/40 last:border-0">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <span
                        className={`w-2 h-2 rounded-full shrink-0 ${
                          o.status === "PAID" ? "bg-emerald-500" : o.status === "PENDING" ? "bg-amber-400 animate-pulse" : "bg-slate-300"
                        }`}
                      />
                      <span className="text-sm font-medium truncate">{o.buyerName}</span>
                      <span className="text-[11px] text-muted-foreground whitespace-nowrap">
                        {o.createdAt.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" })}{" "}
                        {o.createdAt.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}
                      </span>
                    </div>
                    <p className="text-[11px] text-muted-foreground truncate pl-4 mt-0.5">
                      {o.quantity} cota(s) · {o.raffle.title}
                    </p>
                  </div>
                  <span
                    className={`text-sm font-bold shrink-0 ${
                      o.status === "PAID" ? "text-emerald-600" : "text-amber-500"
                    }`}
                  >
                    {formatCurrency(Number(o.totalAmount))}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Ocupação geral */}
      <div className="bg-gradient-to-r from-navy-900 to-slate-900 border border-border/60 rounded-2xl p-6 shadow-sm text-white">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-3">
          <div>
            <h3 className="font-semibold">📦 Ocupação Geral das Cotas</h3>
            <p className="text-xs text-white/60 mt-0.5">Progresso consolidado de todas as rifas publicadas</p>
          </div>
          <div className="text-right">
            <span className="font-display text-3xl font-bold text-amber-400">{fillRate}%</span>
            <p className="text-[11px] text-white/60">
              {totalNumbersSold.toLocaleString("pt-BR")} / {totalCapacity.toLocaleString("pt-BR")} cotas
            </p>
          </div>
        </div>
        <div className="h-3 bg-white/10 rounded-full overflow-hidden">
          <div
            className="h-full rounded-full bg-gradient-to-r from-amber-500 to-emerald-400 transition-all duration-700"
            style={{ width: `${fillRate}%` }}
          />
        </div>
        <div className="grid grid-cols-3 gap-2 mt-4 text-center text-xs">
          <div>
            <div className="font-display text-lg font-bold">{raffles.length}</div>
            <div className="text-white/50">rifas criadas</div>
          </div>
          <div>
            <div className="font-display text-lg font-bold text-emerald-400">{activeRaffles}</div>
            <div className="text-white/50">ativas agora</div>
          </div>
          <div>
            <div className="font-display text-lg font-bold text-amber-400">{formatCurrency(grossRevenue)}</div>
            <div className="text-white/50">arrecadado</div>
          </div>
        </div>
      </div>

      {/* Lista de Rifas */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-display text-xl font-bold">Minhas Rifas</h2>
          <span className="text-xs text-muted-foreground">{raffles.length} no total</span>
        </div>

        {raffles.length === 0 ? (
          <div className="text-center py-16 border-2 border-dashed border-border rounded-2xl bg-muted/10">
            <span className="text-5xl mb-4 block opacity-40">🎫</span>
            <p className="text-muted-foreground mb-4">Você ainda não criou nenhuma rifa.</p>
            <Link href="/dashboard/rifas/nova" className="text-primary hover:underline font-semibold">
              Comece criando sua primeira rifa →
            </Link>
          </div>
        ) : (
          <div className="bg-card border border-border/60 rounded-2xl overflow-hidden shadow-sm">
            <table className="w-full text-sm text-left">
              <thead className="bg-muted/40 text-muted-foreground text-xs uppercase tracking-wide">
                <tr>
                  <th className="px-6 py-3.5 font-semibold">Rifa</th>
                  <th className="px-6 py-3.5 font-semibold">Status</th>
                  <th className="px-6 py-3.5 font-semibold hidden md:table-cell">Progresso</th>
                  <th className="px-6 py-3.5 font-semibold">Arrecadado</th>
                  <th className="px-6 py-3.5 font-semibold text-right">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/50">
                {raffles.map((raffle) => {
                  const sold = raffle._count.numbers;
                  const total = raffle.totalNumbers;
                  const progress = Math.round((sold / total) * 100);
                  const revenue = raffle.orders.reduce((sum, order) => sum + Number(order.sellerAmount), 0);

                  return (
                    <tr key={raffle.id} className="hover:bg-muted/20 transition-colors">
                      <td className="px-6 py-4">
                        <div className="font-medium line-clamp-1">{raffle.title}</div>
                        <div className="text-xs text-muted-foreground">
                          {formatCurrency(Number(raffle.pricePerNumber))}/cota
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <span
                          className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold uppercase tracking-wide ${
                            raffle.status === "ACTIVE"
                              ? "bg-emerald-100 text-emerald-800"
                              : raffle.status === "DRAFT"
                                ? "bg-gray-100 text-gray-600"
                                : raffle.status === "CLOSED"
                                  ? "bg-amber-100 text-amber-800"
                                  : "bg-purple-100 text-purple-800"
                          }`}
                        >
                          {raffle.status === "ACTIVE" && <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />}
                          {raffle.status === "ACTIVE" ? "Ativa" : raffle.status === "DRAFT" ? "Rascunho" : raffle.status === "CLOSED" ? "Encerrada" : "Sorteada"}
                        </span>
                      </td>
                      <td className="px-6 py-4 hidden md:table-cell">
                        <div className="flex items-center gap-2">
                          <div className="w-full h-2 bg-muted rounded-full max-w-[110px] overflow-hidden">
                            <div
                              className={`h-full rounded-full transition-all ${progress >= 80 ? "bg-emerald-500" : progress >= 30 ? "bg-amber-500" : "bg-slate-400"}`}
                              style={{ width: `${progress}%` }}
                            />
                          </div>
                          <span className="text-xs text-muted-foreground tabular-nums">{progress}%</span>
                        </div>
                      </td>
                      <td className="px-6 py-4 font-semibold tabular-nums">{formatCurrency(revenue)}</td>
                      <td className="px-6 py-4 text-right">
                        <Link
                          href={`/dashboard/rifas/${raffle.id}`}
                          className="inline-block bg-primary/10 hover:bg-primary/20 text-primary font-semibold px-3.5 py-1.5 rounded-lg text-xs transition-colors"
                        >
                          Gerenciar →
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
    </div>
  );
}
