"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";

export function ImageUploadForm({ raffleId, currentImage }: { raffleId: string; currentImage: string | null }) {
  const [imageUrl, setImageUrl] = useState(currentImage || "");
  const [isUpdating, setIsUpdating] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const router = useRouter();

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validar tipo
    const allowedTypes = ["image/jpeg", "image/png", "image/webp", "image/gif"];
    if (!allowedTypes.includes(file.type)) {
      alert("Tipo não suportado. Use JPG, PNG, WebP ou GIF.");
      return;
    }

    // Validar tamanho (10MB)
    if (file.size > 10 * 1024 * 1024) {
      alert("Arquivo muito grande. Máximo 10MB.");
      return;
    }

    setIsUploading(true);
    const formData = new FormData();
    formData.append("file", file);
    formData.append("type", "cover");

    try {
      const res = await fetch("/api/upload", {
        method: "POST",
        body: formData,
      });

      if (!res.ok) throw new Error("Falha no upload");

      const data = await res.json();
      setImageUrl(data.url);
      // Auto-salvar no banco
      await saveImage(data.url);
    } catch {
      alert("Erro ao fazer upload. Tente novamente.");
    } finally {
      setIsUploading(false);
    }
  };

  const handleUrlChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setImageUrl(e.target.value);
  };

  const saveImage = async (url: string) => {
    setIsUpdating(true);
    try {
      const res = await fetch(`/api/rifas/${raffleId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ coverImage: url }),
      });

      if (!res.ok) throw new Error("Falha ao salvar");

      alert("Imagem atualizada com sucesso!");
      router.refresh();
    } catch {
      alert("Erro ao salvar. Tente novamente.");
    } finally {
      setIsUpdating(false);
    }
  };

  const handleSaveUrl = async (e: React.FormEvent) => {
    e.preventDefault();
    await saveImage(imageUrl);
  };

  const handleRemove = async () => {
    setIsUpdating(true);
    try {
      const res = await fetch(`/api/rifas/${raffleId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ coverImage: null }),
      });

      if (!res.ok) throw new Error("Falha ao remover");

      setImageUrl("");
      alert("Imagem removida!");
      router.refresh();
    } catch {
      alert("Erro ao remover.");
    } finally {
      setIsUpdating(false);
    }
  };

  return (
    <div className="space-y-4">
      {/* Preview */}
      <div className="relative h-48 rounded-xl overflow-hidden bg-muted">
        {imageUrl ? (
          <>
            <Image src={imageUrl} alt="Capa da rifa" fill className="object-cover" />
            {(isUpdating || isUploading) && (
              <div className="absolute inset-0 bg-black/50 flex items-center justify-center text-white">
                <span className="animate-spin text-2xl">⏳</span>
              </div>
            )}
          </>
        ) : (
          <div className="w-full h-full flex flex-col items-center justify-center gap-2 text-muted-foreground">
            <div className="text-4xl">📸</div>
            <p className="font-medium">Sem Imagem</p>
          </div>
        )}
      </div>

      {/* Upload de arquivo */}
      <div className="border-2 border-dashed border-border/50 rounded-xl p-4 hover:border-primary/50 transition-colors">
        <input
          type="file"
          accept="image/*"
          onChange={handleFileUpload}
          disabled={isUpdating || isUploading}
          className="w-full text-sm cursor-pointer"
        />
        <p className="text-xs text-muted-foreground mt-1 text-center">
          JPG, PNG, WebP, GIF • Máx 10MB • Recomendado: 800x600px
        </p>
        {isUploading && <p className="text-xs text-primary mt-1 text-center">Enviando...</p>}
      </div>

      {/* Ou URL */}
      <p className="text-xs text-muted-foreground text-center">— ou —</p>

      <form onSubmit={handleSaveUrl} className="flex gap-2">
        <input
          type="url"
          placeholder="Ou cole a URL da imagem (https://...)"
          value={imageUrl}
          onChange={handleUrlChange}
          className="flex-1 px-4 py-2 border rounded-lg focus:ring-2 focus:ring-primary/50 text-sm"
          disabled={isUpdating}
        />
        <button
          type="submit"
          disabled={isUpdating || !imageUrl}
          className="bg-primary text-primary-foreground px-4 py-2 rounded-lg font-semibold text-sm transition-colors hover:bg-primary/90 disabled:opacity-50"
        >
          {isUpdating ? "Salvando..." : "Salvar URL"}
        </button>
      </form>

      {imageUrl && (
        <button
          type="button"
          onClick={handleRemove}
          disabled={isUpdating}
          className="w-full text-sm text-destructive hover:bg-destructive/10 py-2 rounded-lg font-medium transition-colors disabled:opacity-50"
        >
          Remover Imagem
        </button>
      )}
    </div>
  );
}