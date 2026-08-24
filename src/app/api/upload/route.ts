import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { createClient } from "@supabase/supabase-js";
import { uploadRateLimiter } from "@/lib/security/rate-limit";
import { applySecurityHeaders } from "@/lib/security/headers";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
};

// Cria cliente Supabase com a service role (acesso admin ao Storage)
function getSupabaseAdmin() {
  const url = process.env.SUPABASE_URL || "https://grrqpxgftshviknbfwtu.supabase.co";
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY || "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdycnFweGdmdHNodmlrbmJmd3R1Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4NzMyODkzMCwiZXhwIjoyMTAyOTA0OTMwfQ.-x3sdHqLZedDrcFMDPvxQWyVoVc95UaPGR96SVfaD7k";
  if (!url || !key) {
    throw new Error("SUPABASE_URL ou SUPABASE_SERVICE_ROLE_KEY não configurados");
  }
  return createClient(url, key);
}

const BUCKET = "rifas";

export async function OPTIONS() {
  return new NextResponse(null, { status: 200, headers: corsHeaders });
}

export async function POST(req: Request) {
  const rateLimitRes = await uploadRateLimiter(req as any);
  if (rateLimitRes) return applySecurityHeaders(rateLimitRes);

  const session = await auth();

  if (!session?.user) {
    const response = NextResponse.json({ error: "Não autorizado" }, { status: 401 });
    Object.entries(corsHeaders).forEach(([k, v]) => response.headers.set(k, v));
    return applySecurityHeaders(response);
  }

  try {
    const formData = await req.formData();
    const file = formData.get("file") as File;
    const type = (formData.get("type") as string) || "gallery";

    if (!file) {
      const response = NextResponse.json({ error: "Nenhum arquivo enviado" }, { status: 400 });
      Object.entries(corsHeaders).forEach(([k, v]) => response.headers.set(k, v));
      return response;
    }

    // Validar tipo de arquivo
    const allowedTypes = ["image/jpeg", "image/png", "image/webp", "image/gif"];
    if (!allowedTypes.includes(file.type)) {
      const response = NextResponse.json(
        { error: "Tipo não suportado. Use JPG, PNG, WebP ou GIF." },
        { status: 400 }
      );
      Object.entries(corsHeaders).forEach(([k, v]) => response.headers.set(k, v));
      return response;
    }

    // Aceitar até 30MB
    const maxSize = 30 * 1024 * 1024;
    if (file.size > maxSize) {
      const response = NextResponse.json(
        { error: "Arquivo muito grande. Máximo 30MB." },
        { status: 400 }
      );
      Object.entries(corsHeaders).forEach(([k, v]) => response.headers.set(k, v));
      return response;
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
      const response = NextResponse.json({ error: uploadError.message }, { status: 500 });
      Object.entries(corsHeaders).forEach(([k, v]) => response.headers.set(k, v));
      return applySecurityHeaders(response);
    }

    // Gerar URL pública
    const { data: publicUrlData } = supabase.storage
      .from(BUCKET)
      .getPublicUrl(filePath);

    const response = NextResponse.json({ url: publicUrlData.publicUrl });
    Object.entries(corsHeaders).forEach(([k, v]) => response.headers.set(k, v));
    return applySecurityHeaders(response);
  } catch (error) {
    console.error("[Upload] Erro:", error);
    const response = NextResponse.json(
      { error: error instanceof Error ? error.message : "Erro ao fazer upload" },
      { status: 500 }
    );
    Object.entries(corsHeaders).forEach(([k, v]) => response.headers.set(k, v));
    return applySecurityHeaders(response);
  }
}