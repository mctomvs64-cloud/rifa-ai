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
              ${raffle.status === 'CANCELLED' ? 'bg-red-100 text-red-800' : ''}
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
