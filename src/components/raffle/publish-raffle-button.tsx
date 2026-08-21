"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useToast } from "@/components/ui/toast-context";

export function PublishRaffleButton({ raffleId }: { raffleId: string }) {
  const [isPublishing, setIsPublishing] = useState(false);
  const router = useRouter();
  const { addToast } = useToast();

  const handlePublish = async () => {
    // A API de generate-numbers já publica a rifa, 
    // mas se os números já foram gerados e ela ainda for DRAFT, precisamos publicar.
    // Vamos chamar o endpoint de patch para mudar o status.
    setIsPublishing(true);
    
    try {
      const res = await fetch(`/api/rifas/${raffleId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "ACTIVE" }),
      });

      if (!res.ok) {
        addToast("Erro ao publicar a rifa.", "error");
        return;
      }

      addToast("Rifa publicada com sucesso!", "success");
      router.refresh();
    } catch (error) {
      addToast("Erro de conexão.", "error");
    } finally {
      setIsPublishing(false);
    }
  };

  return (
    <button
      onClick={handlePublish}
      disabled={isPublishing}
      className="bg-primary text-primary-foreground font-semibold px-4 py-2 rounded-lg hover:bg-primary/90 disabled:opacity-50 transition-colors"
    >
      {isPublishing ? "Publicando..." : "🚀 Publicar Rifa"}
    </button>
  );
}
