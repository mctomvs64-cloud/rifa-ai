import { db } from "@/lib/db";
import { notFound } from "next/navigation";
import Link from "next/link";
import { formatCurrency } from "@/lib/utils";
import { PublicNavbar } from "@/components/layout/public-navbar";
import { PublicFooter } from "@/components/layout/public-footer";

export default async function CheckoutSuccessPage({ params }: { params: Promise<{ orderId: string }> }) {
  const { orderId } = await params;

  const order = await db.order.findUnique({
    where: { id: orderId },
    include: {
      raffle: {
        select: {
          title: true,
          slug: true,
          whatsappNumber: true,
        },
      },
      numbers: {
        select: { number: true },
        orderBy: { number: "asc" },
      },
    },
  });

  if (!order) {
    notFound();
  }

  // Verifica se ainda está pendente ou já foi pago via Webhook
  const isPaid = order.status === "PAID";
  
  return (
    <div className="min-h-screen flex flex-col bg-muted/20">
      <PublicNavbar />

      <main className="flex-1 flex flex-col items-center justify-center p-4">
        <div className="bg-card border rounded-2xl shadow-lg w-full max-w-lg p-8 text-center animate-fade-in-up">
          
          {/* Status Ícone */}
          <div className="flex justify-center mb-6">
            {isPaid ? (
              <div className="w-20 h-20 bg-green-100 text-green-600 rounded-full flex items-center justify-center text-4xl shadow-inner">
                ✅
              </div>
            ) : (
              <div className="w-20 h-20 bg-yellow-100 text-yellow-600 rounded-full flex items-center justify-center text-4xl shadow-inner">
                ⏳
              </div>
            )}
          </div>

          <h1 className="font-display text-3xl font-bold mb-2">
            {isPaid ? "Pagamento Confirmado!" : "Aguardando Pagamento"}
          </h1>
          
          <p className="text-muted-foreground mb-8">
            {isPaid 
              ? "Seus números já estão garantidos para o sorteio."
              : "Já realizou o pagamento via PIX? Estamos aguardando a confirmação do banco."}
          </p>

          <div className="bg-muted/50 rounded-xl p-6 text-left space-y-4 mb-8">
            <div>
              <div className="text-xs text-muted-foreground font-semibold uppercase tracking-wider mb-1">Rifa</div>
              <div className="font-medium text-foreground">{order.raffle.title}</div>
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div>
                <div className="text-xs text-muted-foreground font-semibold uppercase tracking-wider mb-1">Total</div>
                <div className="font-display text-xl font-bold text-accent">
                  {formatCurrency(Number(order.totalAmount))}
                </div>
              </div>
              <div>
                <div className="text-xs text-muted-foreground font-semibold uppercase tracking-wider mb-1">Status</div>
                <div className={`font-bold ${isPaid ? 'text-green-600' : 'text-yellow-600'}`}>
                  {isPaid ? "PAGO" : "PENDENTE"}
                </div>
              </div>
            </div>

            <div>
              <div className="text-xs text-muted-foreground font-semibold uppercase tracking-wider mb-2">
                Seus Números ({order.numbers.length})
              </div>
              <div className="flex flex-wrap gap-2">
                {order.numbers.map((n) => (
                  <span 
                    key={n.number} 
                    className="bg-background border px-3 py-1 rounded-md text-sm font-medium shadow-sm"
                  >
                    {String(n.number).padStart(3, '0')}
                  </span>
                ))}
              </div>
            </div>
          </div>

          <div className="space-y-3">
            {isPaid && order.whatsappLink ? (
              <a 
                href={order.whatsappLink}
                target="_blank"
                rel="noopener noreferrer"
                className="w-full block bg-green-600 hover:bg-green-700 text-white font-bold py-3 rounded-xl transition-all shadow-md active:scale-95"
              >
                Enviar Comprovante no WhatsApp 💬
              </a>
            ) : !isPaid && (
              <div className="text-sm text-muted-foreground animate-pulse">
                Processando webhook do Mercado Pago...
              </div>
            )}

            <Link 
              href={`/rifas/${order.raffle.slug}`}
              className="w-full block bg-transparent border-2 border-primary text-primary hover:bg-primary/5 font-bold py-3 rounded-xl transition-all"
            >
              Voltar para a Rifa
            </Link>
          </div>
        </div>
      </main>

      <PublicFooter />
    </div>
  );
}
