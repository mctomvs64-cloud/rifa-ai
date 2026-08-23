"use client";

import { useState, useCallback } from "react";

interface ImageUploadProps {
  label: string;
  onImagesChange: (urls: string[]) => void;
  initialImages?: string[];
  maxFiles?: number;
  accept?: string;
}

export function ImageUpload({
  label,
  onImagesChange,
  initialImages = [],
  maxFiles = 10,
  accept = "image/*",
}: ImageUploadProps) {
  const [images, setImages] = useState<string[]>(initialImages);
  const [isUploading, setIsUploading] = useState(false);
  const [previews, setPreviews] = useState<string[]>([]);

  const handleFileSelect = useCallback(
    async (files: FileList) => {
      const newFiles = Array.from(files).slice(0, maxFiles - images.length);
      if (newFiles.length === 0) return;

      setIsUploading(true);
      const newPreviews = newFiles.map((file) => URL.createObjectURL(file));
      setPreviews((prev) => [...prev, ...newPreviews]);

      try {
        const uploadedUrls: string[] = [];
        for (const file of newFiles) {
          const formData = new FormData();
          formData.append("file", file);
          formData.append("type", "gallery");

          const res = await fetch("/api/upload", {
            method: "POST",
            body: formData,
          });

          if (!res.ok) {
            const error = await res.json();
            throw new Error(error.error || "Erro no upload");
          }

          const data = await res.json();
          uploadedUrls.push(data.url);
        }

        const updatedImages = [...images, ...uploadedUrls];
        setImages(updatedImages);
        onImagesChange(updatedImages);
      } catch (error) {
        alert(error instanceof Error ? error.message : "Erro ao fazer upload");
      } finally {
        setIsUploading(false);
      }
    },
    [images.length, maxFiles, onImagesChange, images]
  );

  const removeImage = useCallback(
    (index: number) => {
      const updated = images.filter((_, i) => i !== index);
      setImages(updated);
      onImagesChange(updated);
      setPreviews((prev) => prev.filter((_, i) => i !== index));
    },
    [images, onImagesChange]
  );

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.currentTarget.classList.add("border-primary", "bg-primary/5");
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.currentTarget.classList.remove("border-primary", "bg-primary/5");
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.currentTarget.classList.remove("border-primary", "bg-primary/5");
    if (e.dataTransfer.files.length > 0) {
      handleFileSelect(e.dataTransfer.files);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      handleFileSelect(e.target.files);
    }
  };

  return (
    <div className="space-y-3">
      <label className="block text-sm font-medium mb-1">{label}</label>

      <div
        className="relative border-2 border-dashed border-border rounded-xl p-6 transition-colors hover:border-primary/50"
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
      >
        <input
          type="file"
          multiple
          accept={accept}
          onChange={handleInputChange}
          className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
          disabled={isUploading || images.length >= maxFiles}
        />

        <div className="text-center">
          <div className="w-12 h-12 mx-auto mb-3 rounded-full bg-muted/50 flex items-center justify-center text-2xl">
            📁
          </div>
          <p className="text-sm font-medium text-foreground">
            {isUploading ? "Enviando..." : "Clique ou arraste imagens aqui"}
          </p>
          <p className="text-xs text-muted-foreground mt-1">
            {images.length}/{maxFiles} • JPG, PNG, WebP, GIF • Máx 10MB cada
          </p>
        </div>
      </div>

      {(previews.length > 0 || images.length > 0) && (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-2">
          {previews.map((preview, index) => (
            <div key={`preview-${index}`} className="relative aspect-square rounded-lg overflow-hidden border">
              <img src={preview} alt={`Preview ${index}`} className="w-full h-full object-cover" />
              <button
                type="button"
                onClick={() => removeImage(index)}
                className="absolute top-1 right-1 w-6 h-6 rounded-full bg-red-600 text-white flex items-center justify-center text-xs hover:bg-red-700 transition-colors"
              >
                ✕
              </button>
              {isUploading && (
                <div className="absolute inset-0 bg-black/50 flex items-center justify-center text-white text-sm">
                  Enviando...
                </div>
              )}
            </div>
          ))}
          {images.slice(previews.length).map((url, index) => (
            <div key={`existing-${index}`} className="relative aspect-square rounded-lg overflow-hidden border">
              <img src={url} alt={`Image ${index}`} className="w-full h-full object-cover" />
              <button
                type="button"
                onClick={() => removeImage(previews.length + index)}
                className="absolute top-1 right-1 w-6 h-6 rounded-full bg-red-600 text-white flex items-center justify-center text-xs hover:bg-red-700 transition-colors"
              >
                ✕
              </button>
            </div>
          ))}
        </div>
      )}

      {images.length >= maxFiles && (
        <p className="text-xs text-muted-foreground text-center">
          Limite de {maxFiles} imagens atingido
        </p>
      )}
    </div>
  );
}