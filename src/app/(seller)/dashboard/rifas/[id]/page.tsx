import { db } from "@/lib/db";
import { auth } from "@/lib/auth";
import { formatCurrency } from "@/lib/utils";
import Link from "next/link";
import { notFound } from "next/navigation";
import { GenerateNumbersButton } from "@/components/raffle/generate-numbers-button";
import { ImageUploadForm } from "@/components/raffle/image-upload-form";
import { PublishRaffleButton } from "@/components/raffle/publish-raffle-button";
import { EditRaffleModal } from "@/components/raffle/edit-raffle-modal";
import { DeleteRaffleButton } from "@/components/raffle/delete-raffle-button";
import { CloseRaffleButton } from "@/components/raffle/close-raffle-button";
import { BuyersExportButton, type BuyerRecord } from "@/components/raffle/buyers-export-button";
import { CheckoutProButton } from "@/components/checkout/checkout-pro-button";

const STATUS_ORDER: Record<string, number> = { PAID: 0, PENDING: 1, EXPIRED: 2 };

function formatPhoneDisplay(phone: string): string {
  const digits = phone.replace(/\D/g, "");
  const local = digits.length > 11 ? digits.slice(-11) : digits;
  if (local.length === 11) return `(${local.slice(0, 2)}) ${local.slice(2, 7)}-${local.slice(7)}`;
  if (local.length === 10) return `(${local.slice(0, 2)}) ${local.slice(2, 6)}-${local.slice(6)}`;
  return phone;
}

function whatsappNumber(phone: string): string {
  const digits = phone.replace(/\D/g, "");
  return digits.length <= 11 ? `55${digits}` : digits;
}

export default async function SellerManageRafflePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await auth();
  
  if (!session?.user || (session.user.role !== "SELLER" && session.user.role !== "ADMIN")) {
    notFound();
  }

  const raffle = await db.raffle.findUnique({
    where: { id },
    include: {
      _count: {
        select: {
          numbers: { where: { status: "SOLD" } },
          orders: { where: { status: "PAID" } },
        }
      }
    }
  });

  if (!raffle || (raffle.sellerId !== session.user.id && session.user.role !== "ADMIN")) {
    notFound();
  }

  // Compradores e leads (pagos, pendentes e expirados) para recuperação de vendas
  const orders = await db.order.findMany({
    where: { raffleId: id, status: { in: ["PAID", "PENDING", "EXPIRED"] } },
    include: { numbers: { select: { number: true }, orderBy: { number: "asc" } } },
  });

  const sortedOrders = [...orders].sort((a, b) => {
    const statusDiff = (STATUS_ORDER[a.status] ?? 9) - (STATUS_ORDER[b.status] ?? 9);
    if (statusDiff !== 0) return statusDiff;
    return b.createdAt.getTime() - a.createdAt.getTime();
  });

  const buyerRecords: BuyerRecord[] = sortedOrders.map((o) => ({
    id: o.id,
    status: o.status,
    buyerName: o.buyerName,
    buyerPhone: o.buyerPhone,
    buyerEmail: o.buyerEmail,
    quantity: o.quantity,
    totalAmount: Number(o.totalAmount),
    createdAt: o.createdAt.toISOString(),
    numbers: o.numbers.length > 0 ? o.numbers.map((n) => n.number) : (o.reservedNumbers ?? []),
  }));

  const leadOrders = buyerRecords.filter((r) => r.status === "PENDING");

  const paidRevenue = buyerRecords.filter((r) => r.status === "PAID").reduce((acc, r) => acc + r.totalAmount, 0);
  const openValue = buyerRecords.filter((r) => r.status !== "PAID").reduce((acc, r) => acc + r.totalAmount, 0);
  const leadCount = buyerRecords.filter((r) => r.status !== "PAID").length;

  const raffleUrl = `${process.env.NEXT_PUBLIC_APP_URL ?? ""}/rifas/${raffle.slug}`;
  const raffleTitle = raffle.title;
  const rafflePrize = raffle.prize;

  const recoveryLink = (record: BuyerRecord): string => {
    const numbersText = record.numbers.join(", ");
    const message =
      record.status === "PENDING"
        ? `Olá ${record.buyerName}! Tudo bem? 👋\n\nVimos que você reservou ${record.quantity} número(s) na rifa "${raffleTitle}" — prêmio: ${rafflePrize} 🎁\n\n📋 Seus números: ${numbersText}\n💰 Valor: ${formatCurrency(record.totalAmount)}\n\nO pagamento não foi concluído e a reserva expira em breve. Quer finalizar e garantir sua participação no sorteio?`
        : `Olá ${record.buyerName}! Tudo bem? 👋\n\nVocê tinha escolhido ${record.quantity} número(s) na rifa "${raffleTitle}" — prêmio: ${rafflePrize} 🎁\n\n⏰ Sua reserva expirou e os números voltaram para o site, mas ainda dá tempo participar!\n\nGaranta os seus de novo aqui: ${raffleUrl}\n\nBoa sorte! 🍀`;
    return `https://wa.me/${whatsappNumber(record.buyerPhone)}?text=${encodeURIComponent(message)}`;
  };

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      {/* Cabeçalho */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8">
        <div>
          <div className="flex items-center gap-3 mb-2 flex-wrap">
            <h1 className="font-display text-3xl font-bold">{raffle.title}</h1>
            <span className={`px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider
              ${raffle.status === 'ACTIVE' ? 'bg-emerald-100 text-emerald-800' : ''}
              ${raffle.status === 'DRAFT' ? 'bg-gray-100 text-gray-800' : ''}
              ${raffle.status === 'CLOSED' ? 'bg-amber-100 text-amber-800' : ''}
              ${raffle.status === 'DRAWN' ? 'bg-purple-100 text-purple-800' : ''}
            `}>
              {raffle.status}
            </span>
          </div>
          <p className="text-muted-foreground text-sm">
            {process.env.NEXT_PUBLIC_APP_URL}/rifas/{raffle.slug}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <EditRaffleModal
            raffle={{
              id: raffle.id,
              title: raffle.title,
              description: raffle.description,
              prize: raffle.prize,
              pricePerNumber: Number(raffle.pricePerNumber),
              minNumbers: raffle.minNumbers,
              maxNumbers: raffle.maxNumbers,
              whatsappNumber: raffle.whatsappNumber,
              status: raffle.status,
              coverImage: raffle.coverImage,
              images: raffle.images,
            }}
          />
          {raffle.status === "DRAFT" && (
            <PublishRaffleButton raffleId={raffle.id} />
          )}
          {raffle.status === "ACTIVE" && (
            <CloseRaffleButton raffleId={raffle.id} raffleTitle={raffle.title} />
          )}
          <Link
            href={`/rifas/${raffle.slug}`}
            target="_blank"
            className="border bg-background hover:bg-muted text-foreground font-semibold px-4 py-2 rounded-lg text-sm transition-colors"
          >
            Ver Página
          </Link>
          <DeleteRaffleButton
            raffleId={raffle.id}
            raffleTitle={raffle.title}
            redirectUrl={session.user.role === "ADMIN" ? "/admin/rifas" : "/dashboard"}
          />
        </div>
      </div>

      {/* Métricas Rápidas */}
      <div className="grid sm:grid-cols-3 gap-6 mb-8">
        <div className="bg-card border rounded-xl p-6 shadow-sm">
          <div className="text-sm font-medium text-muted-foreground mb-2">Progresso das Vendas</div>
          <div className="font-display text-3xl font-bold text-accent">
            {Math.round((raffle._count.numbers / raffle.totalNumbers) * 100)}%
          </div>
          <div className="text-xs text-muted-foreground mt-1">
            {raffle._count.numbers} de {raffle.totalNumbers} vendidos
          </div>
        </div>
        <div className="bg-card border rounded-xl p-6 shadow-sm">
          <div className="text-sm font-medium text-muted-foreground mb-2">Pedidos Pagos</div>
          <div className="font-display text-3xl font-bold">
            {raffle._count.orders}
          </div>
        </div>
        <div className="bg-card border rounded-xl p-6 shadow-sm">
          <div className="text-sm font-medium text-muted-foreground mb-2">Previsão de Arrecadação</div>
          <div className="font-display text-2xl font-bold text-green-600">
            {formatCurrency(raffle.totalNumbers * Number(raffle.pricePerNumber))}
          </div>
        </div>
      </div>

      {/* Grid de Configurações */}
      <div className="grid md:grid-cols-2 gap-8">
        {/* Upload de Imagens */}
        <div className="space-y-4">
          <h2 className="font-semibold text-lg border-b pb-2">Fotos do Prêmio</h2>
          <ImageUploadForm raffleId={raffle.id} currentImage={raffle.coverImage} />
        </div>

        {/* Informações da Rifa */}
        <div className="space-y-4">
          <h2 className="font-semibold text-lg border-b pb-2">Detalhes</h2>
          
          <div className="bg-card border rounded-xl p-5 space-y-4 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Prêmio:</span>
              <span className="font-medium text-right">{raffle.prize}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Valor por cota:</span>
              <span className="font-medium">{formatCurrency(Number(raffle.pricePerNumber))}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Regra de Compra:</span>
              <span className="font-medium">De {raffle.minNumbers} a {raffle.maxNumbers} cotas</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">WhatsApp Contato:</span>
              <span className="font-medium">{raffle.whatsappNumber || "Não definido"}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Compradores & Leads */}
      <div className="mt-8 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b pb-2">
          <h2 className="font-semibold text-lg">👥 Compradores &amp; Leads</h2>
          <BuyersExportButton records={buyerRecords} raffleTitle={raffle.title} />
        </div>

        {/* Totalizadores */}
        <div className="grid sm:grid-cols-3 gap-4">
          <div className="bg-emerald-50 border border-emerald-100 rounded-xl p-4">
            <div className="text-xs font-medium text-emerald-700 uppercase tracking-wide mb-1">Receita Confirmada</div>
            <div className="font-display text-xl font-bold text-emerald-800">{formatCurrency(paidRevenue)}</div>
          </div>
          <div className="bg-amber-50 border border-amber-100 rounded-xl p-4">
            <div className="text-xs font-medium text-amber-700 uppercase tracking-wide mb-1">Valor em Aberto (leads)</div>
            <div className="font-display text-xl font-bold text-amber-800">{formatCurrency(openValue)}</div>
          </div>
          <div className="bg-muted/60 border rounded-xl p-4">
            <div className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-1">Leads para Recuperar</div>
            <div className="font-display text-xl font-bold">{leadCount}</div>
          </div>
        </div>

        {buyerRecords.length === 0 ? (
          <div className="border rounded-xl p-8 text-center text-muted-foreground text-sm">
            Nenhuma compra ou lead registrado ainda. Assim que alguém reservar números, os dados aparecem aqui — mesmo se o pagamento não for concluído.
          </div>
        ) : (
          <div className="space-y-2">
            {buyerRecords.map((r) => (
              <div
                key={r.id}
                className={`flex flex-col lg:flex-row lg:items-center justify-between gap-3 border rounded-xl p-4 ${
                  r.status === "PAID"
                    ? "border-emerald-100 bg-emerald-50/40"
                    : "border-amber-200 bg-amber-50/40"
                }`}
              >
                <div className="min-w-0 flex-1 space-y-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span
                      className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                        r.status === "PAID"
                          ? "bg-emerald-500 text-white"
                          : r.status === "PENDING"
                            ? "bg-amber-400 text-white"
                            : "bg-slate-300 text-slate-700"
                      }`}
                    >
                      {r.status === "PAID" ? "Pago" : r.status === "PENDING" ? "Pendente" : "Expirado"}
                    </span>
                    <span className="font-semibold text-sm truncate">{r.buyerName}</span>
                    <span className="text-xs text-muted-foreground">
                      {new Date(r.createdAt).toLocaleString("pt-BR", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" })}
                    </span>
                  </div>
                  <div className="text-xs text-muted-foreground flex flex-wrap items-center gap-x-3 gap-y-0.5">
                    <a href={`https://wa.me/${whatsappNumber(r.buyerPhone)}`} target="_blank" rel="noopener noreferrer" className="hover:text-primary hover:underline">
                      📱 {formatPhoneDisplay(r.buyerPhone)}
                    </a>
                    {r.buyerEmail && <span>✉️ {r.buyerEmail}</span>}
                  </div>
                  <div className="text-xs">
                    <span className="text-muted-foreground">Números ({r.quantity}): </span>
                    <span className="font-mono font-semibold">
                      {r.numbers.slice(0, 15).join(", ")}
                      {r.numbers.length > 15 && ` +${r.numbers.length - 15}`}
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-3 shrink-0 self-end lg:self-center">
                  <div className="text-right">
                    <div className={`font-display text-base font-bold ${r.status === "PAID" ? "text-emerald-700" : "text-amber-700"}`}>
                      {formatCurrency(r.totalAmount)}
                    </div>
                  </div>
                  {r.status !== "PAID" && (
                    <a
                      href={recoveryLink(r)}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="bg-green-600 hover:bg-green-700 text-white font-semibold px-3 py-2 rounded-lg text-xs transition-colors whitespace-nowrap"
                    >
                      💬 Recuperar venda
                    </a>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

{/* Botão de Checkout Pro - sempre disponível ao pagar a raffa */}
      <CheckoutProButton
        raffleId={raffle.id}
        orderId={`raf_${raffle.id}`}
        raffleTitle={raffle.title}
        totalAmount={Number(raffle.totalNumbers * raffle.pricePerNumber)}
        quantity={raffle.totalNumbers}
      />

      {/* Gerador de Números (Apenas se for DRAFT) */}
      {raffle.status === "DRAFT" && raffle._count.numbers === 0 && (
        <div className="mt-8 p-6 bg-blue-50/50 border border-blue-100 rounded-xl">
          <h3 className="font-bold text-blue-900 mb-2 flex items-center gap-2">
            ⚙️ Gerar Bilhetes (Setup Inicial)
          </h3>
          <p className="text-sm text-blue-800 mb-4">
            Antes de publicar, o sistema precisa criar os {raffle.totalNumbers} números no banco de dados.
            Esse processo garante que nenhuma cota seja duplicada.
          </p>
          <GenerateNumbersButton raffleId={raffle.id} totalNumbers={raffle.totalNumbers} />
        </div>
      )}
    </div>
  );
}
