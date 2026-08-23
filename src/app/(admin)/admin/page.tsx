import { db } from "@/lib/db";
import { auth } from "@/lib/auth";
import { formatCurrency } from "@/lib/utils";
import Link from "next/link";
import { notFound } from "next/navigation";

export default async function AdminDashboard() {
  const session = await auth();
  
  // Apenas Super Admin pode acessar
  if (!session?.user || session.user.role !== "ADMIN") {
    notFound();
  }

  // Estatísticas Globais da Plataforma
  const [
    totalUsers,
    totalSellers,
    totalRaffles,
    activeRaffles,
    orders,
  ] = await Promise.all([
    db.user.count(),
    db.user.count({ where: { role: "SELLER" } }),
    db.raffle.count(),
    db.raffle.count({ where: { status: "ACTIVE" } }),
    db.order.findMany({
      where: { status: "PAID" },
      select: { totalAmount: true, platformFee: true },
    }),
  ]);

  const totalVolume = orders.reduce((sum, order) => sum + Number(order.totalAmount), 0);
  const platformRevenue = orders.reduce((sum, order) => sum + Number(order.platformFee), 0);

  // Últimas Rifas Criadas
  const recentRaffles = await db.raffle.findMany({
    take: 5,
    orderBy: { createdAt: "desc" },
    include: { seller: { select: { name: true, email: true } } },
  });

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="font-display text-3xl font-bold">Admin: Visão Geral</h1>
          <p className="text-muted-foreground">Controle central da plataforma RifaAI</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link
            href="/admin/rifas"
            className="bg-primary/10 hover:bg-primary/20 text-primary border border-primary/30 px-3.5 py-2 rounded-lg font-medium text-sm transition-colors"
          >
            🎟️ Rifas
          </Link>
          <Link
            href="/admin/repasses"
            className="bg-emerald-600 hover:bg-emerald-700 text-white px-3.5 py-2 rounded-lg font-medium text-sm transition-colors shadow-sm"
          >
            💰 Repasses
          </Link>
          <Link
            href="/admin/promocoes"
            className="bg-accent hover:bg-accent/90 text-white px-3.5 py-2 rounded-lg font-medium text-sm transition-colors shadow-sm"
          >
            🎁 Promoções
          </Link>
          <Link
            href="/admin/vendedores"
            className="bg-secondary hover:bg-secondary/80 text-secondary-foreground px-3.5 py-2 rounded-lg font-medium text-sm transition-colors border"
          >
            👥 Vendedores
          </Link>
          <Link
            href="/admin/configuracoes"
            className="bg-primary hover:bg-primary/90 text-primary-foreground px-3.5 py-2 rounded-lg font-medium text-sm transition-colors shadow-sm"
          >
            ⚙️ Configurações
          </Link>
        </div>
      </div>

      {/* Métricas Principais (Financeiro) */}
      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <div className="bg-navy-900 text-white rounded-xl p-6 shadow-md hero-bg">
          <div className="text-sm font-medium text-blue-200 mb-2">Receita da Plataforma (Taxas)</div>
          <div className="font-display text-3xl font-bold text-yellow-400">
            {formatCurrency(platformRevenue)}
          </div>
        </div>
        <div className="bg-card border rounded-xl p-6 shadow-sm">
          <div className="text-sm font-medium text-muted-foreground mb-2">Volume Total Movimentado</div>
          <div className="font-display text-3xl font-bold text-foreground">
            {formatCurrency(totalVolume)}
          </div>
        </div>
        <div className="bg-card border rounded-xl p-6 shadow-sm">
          <div className="text-sm font-medium text-muted-foreground mb-2">Rifas Ativas / Total</div>
          <div className="font-display text-3xl font-bold text-foreground flex items-baseline gap-2">
            <span className="text-green-600 dark:text-green-400">{activeRaffles}</span>
            <span className="text-xl text-muted-foreground">/ {totalRaffles}</span>
          </div>
        </div>
        <div className="bg-card border rounded-xl p-6 shadow-sm">
          <div className="text-sm font-medium text-muted-foreground mb-2">Usuários / Vendedores</div>
          <div className="font-display text-3xl font-bold text-foreground flex items-baseline gap-2">
            {totalUsers}
            <span className="text-xl text-muted-foreground">/ {totalSellers}</span>
          </div>
        </div>
      </div>

      <div className="grid lg:grid-cols-3 gap-8">
        {/* Rifas Recentes */}
        <div className="lg:col-span-2">
          <h2 className="font-display text-xl font-bold mb-4">Rifas Criadas Recentemente</h2>
          <div className="bg-card border rounded-xl overflow-hidden shadow-sm">
            <table className="w-full text-sm text-left">
              <thead className="bg-muted/50 text-muted-foreground">
                <tr>
                  <th className="px-6 py-4 font-medium">Rifa</th>
                  <th className="px-6 py-4 font-medium">Vendedor</th>
                  <th className="px-6 py-4 font-medium">Preço (Cota)</th>
                  <th className="px-6 py-4 font-medium">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {recentRaffles.map((raffle) => (
                  <tr key={raffle.id} className="hover:bg-muted/20">
                    <td className="px-6 py-4 font-medium text-foreground">{raffle.title}</td>
                    <td className="px-6 py-4">
                      <div>{raffle.seller.name}</div>
                      <div className="text-xs text-muted-foreground">{raffle.seller.email}</div>
                    </td>
                    <td className="px-6 py-4">{formatCurrency(Number(raffle.pricePerNumber))}</td>
                    <td className="px-6 py-4">
                      <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider
                        ${raffle.status === 'ACTIVE' ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'}
                      `}>
                        {raffle.status}
                      </span>
                    </td>
                  </tr>
                ))}
                {recentRaffles.length === 0 && (
                  <tr>
                    <td colSpan={4} className="px-6 py-8 text-center text-muted-foreground">
                      Nenhuma rifa criada ainda.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Quick Actions / Avisos */}
        <div>
          <h2 className="font-display text-xl font-bold mb-4">Avisos do Sistema</h2>
          <div className="bg-card border rounded-xl p-6 shadow-sm space-y-4">
            <div className="p-4 bg-yellow-50 dark:bg-yellow-900/20 text-yellow-800 dark:text-yellow-500 rounded-lg text-sm flex gap-3">
              <span>⚠️</span>
              <div>
                <strong>Curadoria de Vendedores:</strong> Atualmente qualquer usuário pode se cadastrar como vendedor e criar rifas. 
                Vá em Configurações para exigir aprovação manual.
              </div>
            </div>
            
            <div className="p-4 bg-blue-50 dark:bg-blue-900/20 text-blue-800 dark:text-blue-400 rounded-lg text-sm flex gap-3">
              <span>ℹ️</span>
              <div>
                <strong>Split Mercado Pago:</strong> Lembre-se que os vendedores precisam autorizar o aplicativo MP para receberem o repasse automático (Fase 2).
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
