import Link from "next/link";
import Image from "next/image";
import { formatCurrency, calcRaffleProgress, formatDate } from "@/lib/utils";

interface RaffleCardProps {
  raffle: {
    id: string;
    slug: string;
    title: string;
    prize: string;
    pricePerNumber: number;
    totalNumbers: number;
    soldCount: number;
    coverImage: string | null;
    drawDate: Date | null;
    status: string;
    seller: {
      name: string;
      image: string | null;
    };
  };
}

export function RaffleCard({ raffle }: RaffleCardProps) {
  const progress = calcRaffleProgress(raffle.soldCount, raffle.totalNumbers);
  const available = raffle.totalNumbers - raffle.soldCount;

  return (
    <Link
      href={`/rifas/${raffle.slug}`}
      className="group block bg-card border border-border rounded-xl overflow-hidden hover:shadow-lg hover:-translate-y-1 transition-all duration-300 card-shine"
    >
      {/* Imagem do prêmio */}
      <div className="relative h-48 bg-gradient-to-br from-navy-900 to-navy-800 overflow-hidden">
        {raffle.coverImage ? (
          <Image
            src={raffle.coverImage}
            alt={raffle.title}
            fill
            className="object-cover group-hover:scale-105 transition-transform duration-500"
          />
        ) : (
          <div className="absolute inset-0 flex items-center justify-center">
            <span className="text-6xl">🎫</span>
          </div>
        )}

        {/* Badge de status */}
        <div className="absolute top-3 left-3">
          <span className="inline-flex items-center gap-1.5 bg-green-500/90 text-white text-xs font-semibold px-2.5 py-1 rounded-full backdrop-blur-sm">
            <span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" />
            Ativa
          </span>
        </div>

        {/* Badge de progresso */}
        <div className="absolute top-3 right-3">
          <span className="bg-black/50 text-white text-xs font-medium px-2.5 py-1 rounded-full backdrop-blur-sm">
            {progress}% vendido
          </span>
        </div>
      </div>

      {/* Conteúdo */}
      <div className="p-4">
        {/* Vendedor */}
        <div className="flex items-center gap-2 mb-2">
          <div className="w-5 h-5 rounded-full bg-primary/20 flex items-center justify-center text-xs font-bold text-primary">
            {raffle.seller.name[0].toUpperCase()}
          </div>
          <span className="text-xs text-muted-foreground">{raffle.seller.name}</span>
        </div>

        {/* Título */}
        <h3 className="font-display font-bold text-base leading-tight mb-1 line-clamp-2 group-hover:text-primary transition-colors">
          {raffle.title}
        </h3>

        {/* Prêmio */}
        <p className="text-sm text-muted-foreground line-clamp-1 mb-3">
          🏆 {raffle.prize}
        </p>

        {/* Barra de progresso */}
        <div className="mb-3">
          <div className="flex justify-between text-xs text-muted-foreground mb-1">
            <span>{raffle.soldCount} vendidos</span>
            <span>{available} disponíveis</span>
          </div>
          <div className="h-2 bg-muted rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-primary to-blue-400 rounded-full transition-all duration-500"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>

        {/* Rodapé: preço + data */}
        <div className="flex items-center justify-between">
          <div>
            <div className="text-xs text-muted-foreground">Por número</div>
            <div className="font-display font-bold text-lg text-accent">
              {formatCurrency(raffle.pricePerNumber)}
            </div>
          </div>

          {raffle.drawDate && (
            <div className="text-right">
              <div className="text-xs text-muted-foreground">Sorteio</div>
              <div className="text-sm font-medium">
                {formatDate(raffle.drawDate)}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* CTA */}
      <div className="px-4 pb-4">
        <div className="w-full text-center bg-primary text-primary-foreground text-sm font-semibold py-2.5 rounded-lg group-hover:bg-primary/90 transition-colors">
          Participar →
        </div>
      </div>
    </Link>
  );
}
