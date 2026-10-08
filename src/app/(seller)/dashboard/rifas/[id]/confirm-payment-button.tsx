"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export function ConfirmPaymentButton({ orderId }: { orderId: string }) {
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handleConfirm = async () => {
    if (!confirm("Tem certeza que deseja confirmar o pagamento desta doação?")) return;
    
    setLoading(true);
    try {
      const res = await fetch(`/api/orders/${orderId}/confirm`, {
        method: "POST",
      });
      if (res.ok) {
        router.refresh();
      } else {
        const data = await res.json();
        alert(data.error || "Erro ao confirmar pagamento");
      }
    } catch (error) {
      alert("Erro ao confirmar pagamento");
    } finally {
      setLoading(false);
    }
  };

  return (
    <button
      onClick={handleConfirm}
      disabled={loading}
      className="bg-emerald-600 hover:bg-emerald-700 text-white font-semibold px-3 py-2 rounded-lg text-xs transition-colors whitespace-nowrap disabled:opacity-50"
    >
      {loading ? "Confirmando..." : "✅ Marcar como Pago"}
    </button>
  );
}
