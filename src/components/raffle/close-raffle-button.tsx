"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export function CloseRaffleButton({ raffleId, raffleTitle }: { raffleId: string; raffleTitle: string }) {
  const router = useRouter();
  const [isClosing, setIsClosing] = useState(false);

  const handleClose = async () => {
    const confirm = window.confirm(
      `Encerrar as vendas da rifa "${raffleTitle}"?\n\nOs números deixarão de estar disponíveis para compra e essa ação não poderá ser desfeita por aqui (é possível reabrir editando a rifa).`
    );
    if (!confirm) return;

    setIsClosing(true);
    try {
      const res = await fetch(`/api/rifas/${raffleId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "CLOSED" }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => null);
        alert(data?.error || "Erro ao encerrar a rifa. Tente novamente.");
        return;
      }

      router.refresh();
    } catch {
      alert("Erro de conexão. Tente novamente.");
    } finally {
      setIsClosing(false);
    }
  };

  return (
    <button
      type="button"
      onClick={handleClose}
      disabled={isClosing}
      className="border border-amber-300 bg-amber-50 hover:bg-amber-100 text-amber-800 font-semibold px-4 py-2 rounded-lg text-sm transition-colors disabled:opacity-50"
    >
      {isClosing ? "Encerrando..." : "⏹ Encerrar Vendas"}
    </button>
  );
}
