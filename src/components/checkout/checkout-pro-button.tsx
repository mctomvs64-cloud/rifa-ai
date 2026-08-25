"use client";

import { useState, useCallback } from "react";

export interface CheckoutProButtonProps {
  raffleId: string;
  orderId: string;
  raffleTitle: string;
  totalAmount: number;
  quantity: number;
}

export function CheckoutProButton({
  raffleId,
  orderId,
  raffleTitle,
  totalAmount,
  quantity,
}: CheckoutProButtonProps) {
  const [redirectUrl, setRedirectUrl] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadCheckoutPro = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const res = await fetch(
        `/api/orders/checkout-pro?orderId=${encodeURIComponent(orderId)}&raffleId=${encodeURIComponent(raffleId)}`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
        }
      );

      if (!res.ok) {
        const errData = await res.text();
        setError(`API retornou status ${res.status}`);
        setRedirectUrl(null);
        return;
      }

      const data = await res.json();
      setRedirectUrl(data.sdk_url);
    } catch (e) {
      setError("Erro ao conectar ao Mercado Pago");
      setRedirectUrl(null);
    } finally {
      setIsLoading(false);
    }
  }, [orderId, raffleId]);

  const handleClick = async (e: React.MouseEvent) => {
    e.preventDefault();
    await loadCheckoutPro();

    if (redirectUrl && !isLoading) {
      setTimeout(() => {
        window.location.href = redirectUrl;
      }, 100);
    }
  };

  if (isLoading) {
    return (
      <button
        disabled
        className="border bg-background hover:bg-muted text-foreground font-semibold px-4 py-2 rounded-lg text-sm transition-colors"
      >
        Carregando...
      </button>
    );
  }

  if (error) {
    return (
      <button
        className="border border-red-500 hover:bg-red-100 text-red-600 font-semibold px-4 py-2 rounded-lg text-sm transition-colors disabled:opacity-50"
        disabled
      >
        ❌ {error}
      </button>
    );
  }

  return (
    <button
      onClick={handleClick}
      disabled={isLoading}
      className="border bg-primary hover:bg-primary/90 text-primary-foreground font-semibold px-4 py-2 rounded-lg text-sm transition-colors disabled:opacity-50"
    >
      {isLoading ? "Pagando..." : "💳 Pagar com Cartão ou outros métodos"}
    </button>
  );
}