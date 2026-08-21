"use client";

import { useState } from "react";
import Image from "next/image";
import { formatCurrency, formatDateTime } from "@/lib/utils";
import { RaffleNumberGrid } from "./raffle-number-grid";
import { PromotionCards, type PromotionOffer } from "./promotion-cards";
import { CheckoutModal } from "../checkout/checkout-modal";

interface RafflePageClientProps {
  raffle: {
    id: string;
    slug: string;
    title: string;
    description: string | null;
    prize: string;
    pricePerNumber: number;
    totalNumbers: number;
    minNumbers: number;
    maxNumbers: number;
    drawDate: string | null;
    coverImage: string | null;
    images: string[];
    status: string;
    whatsappNumber: string | null;
    seller: {
      name: string;
      image: string | null;
      phone: string | null;
    };
  };
  numbers: Array<{ number: number; status: "AVAILABLE" | "RESERVED" | "SOLD" }>;
  stats: {
    soldCount: number;
    reservedCount: number;
    availableCount: number;
  };
  promotions: PromotionOffer[];
}

export function RafflePageClient({ raffle, numbers, stats, promotions }: RafflePageClientProps) {
  const [selectedNumbers, setSelectedNumbers] = useState<number[]>([]);
  const [appliedPromotion, setAppliedPromotion] = useState<PromotionOffer | null>(null);
  const [isCheckoutOpen, setIsCheckoutOpen] = useState(false);

  const totalAmount = appliedPromotion
    ? appliedPromotion.promoPrice
    : selectedNumbers.length * raffle.pricePerNumber;

  const handleSelectionChange = (selected: number[]) => {
    // Qualquer ajuste manual no grid cancela o pacote aplicado
    if (appliedPromotion) setAppliedPromotion(null);
    setSelectedNumbers(selected);
  };

  const handleSelectPromotion = (promo: PromotionOffer) => {
    if (isCheckoutOpen) return;

    // Se o mesmo pacote já está aplicado, desseleciona
    if (appliedPromotion?.id === promo.id) {
      setAppliedPromotion(null);
      return;
    }

    // Valida se ainda existem números suficientes disponíveis
    const available = numbers.filter((n) => n.status === "AVAILABLE");
    if (available.length < promo.quantity) {
      alert(`Restam apenas ${available.length} números disponíveis.`);
      return;
    }

    // Sorteia automaticamente a quantidade do pacote entre os disponíveis
    const shuffled = [...available].sort(() => Math.random() - 0.5);
    const picked = shuffled.slice(0, promo.quantity).map((n) => n.number);

    setAppliedPromotion(promo);
    setSelectedNumbers(picked);
  };

  const handleCheckout = () => {
    if (selectedNumbers.length < raffle.minNumbers) {
      alert(`Selecione pelo menos ${raffle.minNumbers} números.`);
      return;
    }
    setIsCheckoutOpen(true);
  };

  return (
    <div className="grid lg:grid-cols-3 gap-8">
      {/* Coluna da Esquerda — Detalhes da Rifa */}
      <div className="lg:col-span-1 space-y-6">
        {/* Card Principal */}
        <div className="bg-card border border-border rounded-xl overflow-hidden shadow-sm">
          <div className="relative h-64 bg-navy-900">
            {raffle.coverImage ? (
              <Image
                src={raffle.coverImage}
                alt={raffle.title}
                fill
                className="object-cover"
                priority
              />
            ) : (
              <div className="absolute inset-0 flex items-center justify-center text-8xl">
                🎫
              </div>
            )}
          </div>
          <div className="p-6">
            <h1 className="font-display font-bold text-2xl mb-2">{raffle.title}</h1>
            <p className="text-muted-foreground mb-4">🏆 {raffle.prize}</p>
            
            <div className="flex items-center justify-between p-4 bg-muted/50 rounded-lg mb-6">
              <div>
                <div className="text-sm text-muted-foreground">Preço por número</div>
                <div className="font-display font-bold text-2xl text-accent">
                  {formatCurrency(raffle.pricePerNumber)}
                </div>
              </div>
              {raffle.drawDate && (
                <div className="text-right">
                  <div className="text-sm text-muted-foreground">Sorteio</div>
                  <div className="font-medium">{formatDateTime(raffle.drawDate)}</div>
                </div>
              )}
            </div>

            <div className="space-y-3 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Total de números</span>
                <span className="font-medium">{raffle.totalNumbers}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Disponíveis</span>
                <span className="font-medium text-green-600 dark:text-green-400">
                  {stats.availableCount}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Vendidos</span>
                <span className="font-medium">{stats.soldCount}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Resumo flutuante mobile / CTA lateral desktop */}
        <div className="bg-card border border-border rounded-xl p-6 sticky top-24 shadow-lg ring-1 ring-primary/10">
          <h3 className="font-bold mb-4 text-lg">Seu Carrinho</h3>
          {selectedNumbers.length === 0 ? (
            <p className="text-muted-foreground text-sm text-center py-4">
              Nenhum número selecionado
            </p>
          ) : (
            <>
              {appliedPromotion && (
                <div className="mb-3 p-3 rounded-lg bg-primary/5 border border-primary/30 text-sm">
                  <div className="flex justify-between items-center gap-2">
                    <span className="font-medium">📦 {appliedPromotion.name}</span>
                    <button
                      onClick={() => {
                        setAppliedPromotion(null);
                        setSelectedNumbers([]);
                      }}
                      className="text-xs text-muted-foreground hover:text-red-500 underline"
                    >
                      remover
                    </button>
                  </div>
                  <div className="text-green-600 dark:text-green-400 text-xs mt-1 font-medium">
                    Você economiza{" "}
                    {formatCurrency(appliedPromotion.originalPrice - appliedPromotion.promoPrice)}
                  </div>
                </div>
              )}
              <div className="flex justify-between items-center mb-4">
                <span className="text-muted-foreground">
                  {selectedNumbers.length} número(s)
                </span>
                <span className="font-display font-bold text-xl">
                  {formatCurrency(totalAmount)}
                </span>
              </div>
              <button
                onClick={handleCheckout}
                className="w-full py-3 bg-primary hover:bg-primary/90 text-primary-foreground font-bold rounded-lg transition-colors shadow-md shadow-primary/20 flex items-center justify-center gap-2"
              >
                Pagar com PIX ⚡
              </button>
            </>
          )}
        </div>
      </div>

      {/* Coluna da Direita — Grid de Números */}
      <div className="lg:col-span-2 space-y-8">
        {promotions.length > 0 && (
          <div className="bg-card border border-border rounded-xl p-6 shadow-sm">
            <PromotionCards
              promotions={promotions}
              availableCount={stats.availableCount}
              appliedId={appliedPromotion?.id ?? null}
              onSelect={handleSelectPromotion}
            />
          </div>
        )}
        <div className="bg-card border border-border rounded-xl p-6 shadow-sm">
          <h2 className="font-display font-bold text-xl mb-6">
            Escolha seus números
          </h2>
          <RaffleNumberGrid
            numbers={numbers}
            maxSelectable={raffle.maxNumbers}
            minSelectable={raffle.minNumbers}
            selectedNumbers={selectedNumbers}
            onSelectionChange={handleSelectionChange}
          />
        </div>
      </div>

      {/* Modal de Checkout */}
      {isCheckoutOpen && (
        <CheckoutModal
          isOpen={isCheckoutOpen}
          onClose={() => setIsCheckoutOpen(false)}
          raffleId={raffle.id}
          raffleTitle={raffle.title}
          numbers={selectedNumbers}
          totalAmount={totalAmount}
          promotionId={appliedPromotion?.id ?? null}
          promotionName={appliedPromotion?.name ?? null}
        />
      )}
    </div>
  );
}
