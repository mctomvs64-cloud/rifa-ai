"use client";

import { useState } from "react";
import { formatCurrency, formatDate } from "@/lib/utils";
import Link from "next/link";
import { PublicNavbar } from "@/components/layout/public-navbar";
import { PublicFooter } from "@/components/layout/public-footer";

// Como não há API específica para isso, podemos implementar aqui chamando a API de ordens
// Mas o ideal seria ter uma rota de API específica. Para simplificar, faremos uma chamada
// GET para uma rota que ainda não criamos ou simularemos se necessário.
// Como não podemos criar a API agora sem sair do fluxo, vamos criar a rota da API junto.

export default function MeusNumerosPage() {
  const [phone, setPhone] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [orders, setOrders] = useState<any[]>([]);
  const [hasSearched, setHasSearched] = useState(false);

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!phone || phone.length < 10) {
      alert("Digite um número de WhatsApp válido.");
      return;
    }
    
    setIsLoading(true);
    setHasSearched(true);
    
    try {
      const res = await fetch(`/api/orders/search?phone=${phone.replace(/\D/g, "")}`);
      if (res.ok) {
        const data = await res.json();
        setOrders(data.orders);
      } else {
        setOrders([]);
      }
    } catch (error) {
      alert("Erro ao buscar seus números.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-muted/20">
      <PublicNavbar />
      
      <main className="flex-1 py-12 px-4">
        <div className="max-w-3xl mx-auto">
          <div className="text-center mb-10">
            <h1 className="font-display text-4xl font-bold mb-4">Meus Números</h1>
            <p className="text-muted-foreground">
              Digite seu WhatsApp para encontrar todas as rifas que você comprou.
            </p>
          </div>

          <div className="bg-card border rounded-2xl p-6 shadow-sm mb-8">
            <form onSubmit={handleSearch} className="flex gap-3">
              <input
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="(11) 99999-9999"
                className="flex-1 px-4 py-3 bg-background border rounded-xl focus:ring-2 focus:ring-primary/50 outline-none text-lg"
              />
              <button
                type="submit"
                disabled={isLoading}
                className="bg-primary hover:bg-primary/90 text-primary-foreground font-bold px-8 py-3 rounded-xl transition-colors disabled:opacity-50"
              >
                {isLoading ? "Buscando..." : "Buscar"}
              </button>
            </form>
          </div>

          {hasSearched && (
            <div className="space-y-4">
              {orders.length === 0 ? (
                <div className="text-center py-12 bg-card border rounded-2xl">
                  <p className="text-4xl mb-4">🔍</p>
                  <p className="text-muted-foreground font-medium">Nenhum pedido encontrado para este número.</p>
                </div>
              ) : (
                orders.map((order) => (
                  <div key={order.id} className="bg-card border rounded-2xl p-6 shadow-sm flex flex-col sm:flex-row gap-6 justify-between">
                    <div>
                      <Link href={`/rifas/${order.raffle.slug}`} className="font-display font-bold text-xl hover:text-primary transition-colors">
                        {order.raffle.title}
                      </Link>
                      <div className="text-sm text-muted-foreground mt-1">
                        Pedido feito em {formatDate(order.createdAt)}
                      </div>
                      
                      <div className="mt-4">
                        <div className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2">Seus Números</div>
                        <div className="flex flex-wrap gap-2">
                          {order.numbers.map((n: any) => (
                            <span key={n.number} className="bg-muted px-2.5 py-1 rounded-md text-sm font-medium border border-border">
                              {String(n.number).padStart(3, '0')}
                            </span>
                          ))}
                        </div>
                      </div>
                    </div>
                    
                    <div className="flex flex-col items-start sm:items-end justify-between min-w-[140px] border-t sm:border-t-0 pt-4 sm:pt-0">
                      <div>
                        <div className="text-xs text-muted-foreground uppercase text-left sm:text-right mb-1">Status</div>
                        <span className={`inline-flex px-3 py-1 rounded-full text-xs font-bold uppercase
                          ${order.status === 'PAID' ? 'bg-green-100 text-green-800' : ''}
                          ${order.status === 'PENDING' ? 'bg-yellow-100 text-yellow-800' : ''}
                          ${order.status === 'CANCELLED' || order.status === 'EXPIRED' ? 'bg-red-100 text-red-800' : ''}
                        `}>
                          {order.status === 'PAID' ? 'Pago' : order.status === 'PENDING' ? 'Aguardando Pagamento' : order.status}
                        </span>
                      </div>
                      
                      <div className="mt-4 sm:mt-0 text-left sm:text-right">
                        <div className="text-xs text-muted-foreground uppercase">Total Pago</div>
                        <div className="font-bold text-lg text-accent">{formatCurrency(order.totalAmount)}</div>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          )}
        </div>
      </main>
      
      <PublicFooter />
    </div>
  );
}
