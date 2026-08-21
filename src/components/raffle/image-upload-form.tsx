"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";

export function ImageUploadForm({ raffleId, currentImage }: { raffleId: string; currentImage: string | null }) {
  const [imageUrl, setImageUrl] = useState(currentImage || "");
  const [isUpdating, setIsUpdating] = useState(false);
  const router = useRouter();

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsUpdating(true);

    try {
      const res = await fetch(`/api/rifas/${raffleId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ coverImage: imageUrl }),
      });

      if (!res.ok) throw new Error("Falha ao atualizar");
      
      alert("Imagem atualizada com sucesso!");
      router.refresh();
    } catch (error) {
      alert("Erro ao salvar imagem. Verifique a URL.");
    } finally {
      setIsUpdating(false);
    }
  };

  return (
    <div className="space-y-4">
      {currentImage ? (
        <div className="relative h-48 rounded-xl overflow-hidden bg-muted">
          <Image src={currentImage} alt="Capa da rifa" fill className="object-cover" />
        </div>
      ) : (
        <div className="border-2 border-dashed rounded-xl p-8 text-center bg-muted/20">
          <div className="text-4xl mb-2">📸</div>
          <p className="font-medium mb-1">Sem Imagem</p>
        </div>
      )}

      <form onSubmit={handleUpdate} className="flex gap-2">
        <input
          type="url"
          required
          placeholder="Cole a URL da imagem (https://...)"
          value={imageUrl}
          onChange={(e) => setImageUrl(e.target.value)}
          className="flex-1 px-4 py-2 border rounded-lg focus:ring-2 focus:ring-primary/50 text-sm"
        />
        <button
          type="submit"
          disabled={isUpdating}
          className="bg-primary text-primary-foreground px-4 py-2 rounded-lg font-semibold text-sm transition-colors hover:bg-primary/90 disabled:opacity-50"
        >
          {isUpdating ? "Salvando..." : "Salvar"}
        </button>
      </form>
    </div>
  );
}
