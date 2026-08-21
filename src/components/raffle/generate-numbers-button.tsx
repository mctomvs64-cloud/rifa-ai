"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export function GenerateNumbersButton({ raffleId, totalNumbers }: { raffleId: string; totalNumbers: number }) {
  const [isGenerating, setIsGenerating] = useState(false);
  const router = useRouter();

  const handleGenerate = async () => {
    const confirm = window.confirm(`Deseja gerar ${totalNumbers} números agora? Após isso a rifa será publicada e não poderá ter sua quantidade alterada.`);
    if (!confirm) return;

    setIsGenerating(true);

    try {
      const res = await fetch(`/api/rifas/${raffleId}/generate-numbers`, {
        method: "POST",
      });

      if (!res.ok) {
        const data = await res.json();
        alert(data.error || "Erro ao gerar números");
        return;
      }

      alert("Rifa publicada com sucesso! Compartilhe o link.");
      router.refresh(); // Atualiza a página para refletir o status ACTIVE
    } catch (error) {
      alert("Erro de conexão ao gerar números.");
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <button 
      onClick={handleGenerate}
      disabled={isGenerating}
      className="bg-blue-600 hover:bg-blue-700 text-white font-semibold px-6 py-2 rounded-lg shadow-sm transition-all active:scale-95 disabled:opacity-50"
    >
      {isGenerating ? "Gerando..." : `Gerar ${totalNumbers} Números Agora`}
    </button>
  );
}
