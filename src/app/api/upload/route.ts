import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { createClient } from "@supabase/supabase-js";
import { uploadRateLimiter } from "@/lib/security/rate-limit";
import { applySecurityHeaders } from "@/lib/security/headers";

// Cria cliente Supabase com a service role (acesso admin ao Storage)
function getSupabaseAdmin() {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    throw new Error("SUPABASE_URL ou SUPABASE_SERVICE_ROLE_KEY não configurados");
  }
  return createClient(url, key);
}

const BUCKET = "rifas";

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
    const type = (formData.get("type") as string) || "gallery";

    if (!file) {
      return NextResponse.json({ error: "Nenhum arquivo enviado" }, { status: 400 });
    }

    // Validar tipo de arquivo
    const allowedTypes = ["image/jpeg", "image/png", "image/webp", "image/gif"];
    if (!allowedTypes.includes(file.type)) {
      return NextResponse.json(
        { error: "Tipo não suportado. Use JPG, PNG, WebP ou GIF." },
        { status: 400 }
      );
    }

    // Aceitar até 30MB
    const maxSize = 30 * 1024 * 1024;
    if (file.size > maxSize) {
      return NextResponse.json(
        { error: "Arquivo muito grande. Máximo 30MB." },
        { status: 400 }
      );
    }

    // Gerar nome único para o arquivo
    const timestamp = Date.now();
    const random = Math.random().toString(36).substring(2, 8);
    const ext = file.name.split(".").pop()?.toLowerCase() || "jpg";
    const filePath = `${type}/${session.user.id}/${timestamp}-${random}.${ext}`;

    // Converter File para ArrayBuffer
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    const supabase = getSupabaseAdmin();

    const { error: uploadError } = await supabase.storage
      .from(BUCKET)
      .upload(filePath, buffer, {
        contentType: file.type,
        upsert: false,
      });

    if (uploadError) {
      console.error("[Upload] Supabase error:", uploadError);
      return applySecurityHeaders(
        NextResponse.json({ error: uploadError.message }, { status: 500 })
      );
    }

    // Gerar URL pública
    const { data: publicUrlData } = supabase.storage
      .from(BUCKET)
      .getPublicUrl(filePath);

    return applySecurityHeaders(NextResponse.json({ url: publicUrlData.publicUrl }));
  } catch (error) {
    console.error("[Upload] Erro:", error);
    return applySecurityHeaders(
      NextResponse.json(
        { error: error instanceof Error ? error.message : "Erro ao fazer upload" },
        { status: 500 }
      )
    );
  }
}