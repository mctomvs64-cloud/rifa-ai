"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

interface DeleteRaffleButtonProps {
  raffleId: string;
  raffleTitle: string;
  redirectUrl?: string;
}

export function DeleteRaffleButton({
  raffleId,
  raffleTitle,
  redirectUrl = "/dashboard",
}: DeleteRaffleButtonProps) {
  const router = useRouter();
  const [isDeleting, setIsDeleting] = useState(false);

  const handleDelete = async () => {
    const confirmed = window.confirm(
      `Tem certeza que deseja excluir a rifa "${raffleTitle}"?\n\nEsta ação apagará todas as cotas e registros associados.`
    );

    if (!confirmed) return;

    setIsDeleting(true);

    try {
      const res = await fetch(`/api/rifas/${raffleId}`, {
        method: "DELETE",
      });

      const data = await res.json();

      if (!res.ok) {
        alert(data.error || "Erro ao excluir rifa.");
        return;
      }

      alert(data.message || "Rifa excluída com sucesso!");
      router.push(redirectUrl);
      router.refresh();
    } catch {
      alert("Erro ao conectar com o servidor.");
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <button
      onClick={handleDelete}
      disabled={isDeleting}
      className="px-3.5 py-2 bg-destructive/10 hover:bg-destructive/20 text-destructive border border-destructive/30 rounded-lg font-semibold text-sm transition-colors flex items-center gap-1.5 disabled:opacity-50"
    >
      <span>🗑️</span>
      <span>{isDeleting ? "Excluindo..." : "Excluir Rifa"}</span>
    </button>
  );
}
