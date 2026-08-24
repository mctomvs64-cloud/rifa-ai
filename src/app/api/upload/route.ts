import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { put } from "@vercel/blob";
import { uploadRateLimiter } from "@/lib/security/rate-limit";
import { applySecurityHeaders } from "@/lib/security/headers";

export async function POST(req: Request) {
  const rateLimitRes = await uploadRateLimiter(req as any);
  if (rateLimitRes) return applySecurityHeaders(rateLimitRes);

  const session = await auth();

  if (!session?.user) {
    return applySecurityHeaders(NextResponse.json({ error: "Não autorizado" }, { status: 401 }));
  }

  try {
    const formData = await req.formData();
    const file = formData.get("file") as File;
    const type = formData.get("type") as string; // "cover" | "gallery" | "avatar"

    if (!file) {
      return NextResponse.json({ error: "Nenhum arquivo enviado" }, { status: 400 });
    }

    // Validar tipo de arquivo
    const allowedTypes = ["image/jpeg", "image/png", "image/webp", "image/gif"];
    if (!allowedTypes.includes(file.type)) {
      return NextResponse.json(
        { error: "Tipo de arquivo não suportado. Use JPG, PNG, WebP ou GIF." },
        { status: 400 }
      );
    }

    // Validar tamanho (máx 10MB)
    const maxSize = 10 * 1024 * 1024;
    if (file.size > maxSize) {
      return NextResponse.json(
        { error: "Arquivo muito grande. Máximo 10MB." },
        { status: 400 }
      );
    }

    // Gerar nome único
    const timestamp = Date.now();
    const random = Math.random().toString(36).substring(2, 8);
    const ext = file.name.split(".").pop()?.toLowerCase() || "jpg";
    const fileName = `${type}/${session.user.id}/${timestamp}-${random}.${ext}`;

    // Upload para Vercel Blob
    const blob = await put(fileName, file, {
      access: "public",
      addRandomSuffix: false,
    });

    return applySecurityHeaders(NextResponse.json({ url: blob.url }));
  } catch (error) {
    console.error("[Upload] Erro:", error);
    return applySecurityHeaders(NextResponse.json({ error: error instanceof Error ? error.message : "Erro ao fazer upload" }, { status: 500 }));
  }
}