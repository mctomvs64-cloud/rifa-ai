import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { z } from "zod";
import { applySecurityHeaders } from "@/lib/security/headers";

const updateSettingsSchema = z.object({
  platform_fee_percent: z.union([z.string(), z.number()]).optional(),
  reservation_minutes: z.union([z.string(), z.number()]).optional(),
  require_seller_approval: z.union([z.string(), z.boolean()]).optional(),
});

async function checkAdminAuth() {
  const session = await auth();
  if (!session?.user || session.user.role !== "ADMIN") {
    return null;
  }
  return session;
}

export async function GET() {
  const session = await checkAdminAuth();
  if (!session) {
    return applySecurityHeaders(NextResponse.json({ error: "Não autorizado" }, { status: 403 }));
  }

  try {
    const settings = await db.settings.findMany();
    const configMap: Record<string, string> = {};
    settings.forEach((s) => {
      configMap[s.key] = s.value;
    });
    return applySecurityHeaders(NextResponse.json({ settings: configMap }));
  } catch (error) {
    console.error("[Admin Config GET] Erro:", error);
    return applySecurityHeaders(NextResponse.json({ error: "Erro ao buscar configurações" }, { status: 500 }));
  }
}

export async function POST(req: Request) {
  const session = await checkAdminAuth();
  if (!session) {
    return applySecurityHeaders(NextResponse.json({ error: "Não autorizado" }, { status: 403 }));
  }

  try {
    let rawData: Record<string, any> = {};

    const contentType = req.headers.get("content-type") || "";
    if (contentType.includes("application/json")) {
      rawData = await req.json();
    } else {
      const formData = await req.formData();
      rawData = Object.fromEntries(formData.entries());
    }

    const parsed = updateSettingsSchema.safeParse(rawData);

    if (!parsed.success) {
      return applySecurityHeaders(
        NextResponse.json({ error: "Dados inválidos", details: parsed.error.flatten().fieldErrors }, { status: 400 })
      );
    }

    const data = parsed.data;
    const updates = [];

    if (data.platform_fee_percent !== undefined) {
      const val = String(data.platform_fee_percent);
      updates.push(
        db.settings.upsert({
          where: { key: "platform_fee_percent" },
          update: { value: val },
          create: { id: "platform_fee_percent", key: "platform_fee_percent", value: val },
        })
      );
    }

    if (data.reservation_minutes !== undefined) {
      const val = String(data.reservation_minutes);
      updates.push(
        db.settings.upsert({
          where: { key: "reservation_minutes" },
          update: { value: val },
          create: { id: "reservation_minutes", key: "reservation_minutes", value: val },
        })
      );
    }

    if (data.require_seller_approval !== undefined) {
      const val = (data.require_seller_approval === true || data.require_seller_approval === "true" || data.require_seller_approval === "on") ? "true" : "false";
      updates.push(
        db.settings.upsert({
          where: { key: "require_seller_approval" },
          update: { value: val },
          create: { id: "require_seller_approval", key: "require_seller_approval", value: val },
        })
      );
    }

    await Promise.all(updates);

    // Se for requisição HTML tradicional (não-JSON/AJAX), redireciona de volta
    if (!contentType.includes("application/json") && req.headers.get("accept")?.includes("text/html")) {
      return NextResponse.redirect(new URL("/admin/configuracoes?saved=true", req.url));
    }

    return applySecurityHeaders(NextResponse.json({ success: true, message: "Configurações salvas com sucesso!" }));
  } catch (error) {
    console.error("[Admin Config] Erro:", error);
    return applySecurityHeaders(NextResponse.json({ error: "Erro interno ao salvar configurações" }, { status: 500 }));
  }
}