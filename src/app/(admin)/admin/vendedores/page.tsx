import { db } from "@/lib/db";
import { auth } from "@/lib/auth";
import { formatCurrency } from "@/lib/utils";
import { notFound } from "next/navigation";

export default async function AdminVendedoresPage() {
  const session = await auth();

  if (!session?.user || session.user.role !== "ADMIN" || session.user.email !== "mctomvs64@gmail.com") {
    notFound();
  }

  const sellers = await db.user.findMany({
    where: { role: "SELLER" },
    include: {
      raffles: {
        select: { id: true, title: true, status: true, createdAt: true },
        orderBy: { createdAt: "desc" },
      },
      _count: { select: { orders: true, raffles: true } },
    },
    orderBy: { createdAt: "desc" },
  });

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="font-display text-3xl font-bold">Gerenciar Vendedores</h1>
          <p className="text-muted-foreground">Visualize, edite e gerencie contas de vendedores</p>
        </div>
      </div>

      {sellers.length === 0 ? (
        <div className="bg-card border rounded-xl p-12 text-center">
          <div className="text-6xl mb-4">👥</div>
          <h2 className="text-xl font-semibold mb-2">Nenhum vendedor cadastrado</h2>
          <p className="text-muted-foreground">Os vendedores aparecerão aqui após se cadastrarem na plataforma.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {sellers.map((seller) => (
            <SellerCard key={seller.id} seller={seller} />
          ))}
        </div>
      )}
    </div>
  );
}

interface SellerCardProps {
  seller: {
    id: string;
    name: string;
    email: string;
    phone: string | null;
    image: string | null;
    status: string;
    createdAt: Date;
    raffles: { id: string; title: string; status: string; createdAt: Date }[];
    _count: { orders: number; raffles: number };
  };
}

function SellerCard({ seller }: SellerCardProps) {
  const activeRaffles = seller.raffles.filter((r) => r.status === "ACTIVE").length;
  const totalRaffles = seller.raffles.length;

  return (
    <div className="bg-card border rounded-xl overflow-hidden shadow-sm">
      <div className="p-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center text-2xl font-bold text-primary">
              {seller.name.charAt(0).toUpperCase()}
            </div>
            <div>
              <h3 className="font-semibold text-lg text-foreground">{seller.name}</h3>
              <p className="text-sm text-muted-foreground">{seller.email}</p>
              {seller.phone && (
                <p className="text-xs text-muted-foreground">📱 {seller.phone}</p>
              )}
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider ${
              seller.status === "ACTIVE" ? "bg-green-100 text-green-800" : "bg-gray-100 text-gray-800"
            }`}>
              {seller.status}
            </span>
            <span className="text-sm text-muted-foreground">
              {totalRaffles} rifa{totalRaffles !== 1 ? "s" : ""} ({activeRaffles} ativas)
            </span>
            <span className="text-sm text-muted-foreground">
              {seller._count.orders} pedidos
            </span>
            <a
              href={`/admin/vendedores/${seller.id}`}
              className="bg-primary hover:bg-primary/90 text-primary-foreground px-4 py-2 rounded-lg font-medium text-sm transition-colors"
            >
              Editar
            </a>
          </div>
        </div>

        {seller.raffles.length > 0 && (
          <div className="mt-4 pt-4 border-t">
            <h4 className="text-sm font-medium text-muted-foreground mb-3">Rifas Recentes</h4>
            <div className="flex flex-wrap gap-2">
              {seller.raffles.slice(0, 3).map((raffle) => (
                <Link
                  key={raffle.id}
                  href={`/dashboard/rifas/${raffle.id}`}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-muted/50 hover:bg-muted rounded-lg text-sm text-foreground transition-colors"
                >
                  <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold uppercase ${
                    raffle.status === "ACTIVE" ? "bg-green-100 text-green-800" : "bg-gray-100 text-gray-800"
                  }`}>
                    {raffle.status}
                  </span>
                  <span className="truncate max-w-[150px]">{raffle.title}</span>
                </Link>
              ))}
              {seller.raffles.length > 3 && (
                <span className="px-3 py-1.5 bg-muted/50 rounded-lg text-sm text-muted-foreground">
                  +{seller.raffles.length - 3} mais
                </span>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

import Link from "next/link";