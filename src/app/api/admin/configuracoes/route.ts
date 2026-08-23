import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { z } from "zod";
import { applySecurityHeaders } from "@/lib/security/headers";

const updateSettingsSchema = z.object({
  platform_fee_percent: z.string().regex(/^\d+(\.\d{1,2})?$/).optional(),
  reservation_minutes: z.string().regex(/^\d+$/).optional(),
  require_seller_approval: z.string().optional(),
});

async function checkAdminAuth() {
  const session = await auth();
  if (!session?.user || session.user.role !== "ADMIN" || session.user.email !== "mctomvs64@gmail.com") {
    return null;
  }
  return session;
}

export async function POST(req: Request) {
  const session = await checkAdminAuth();
  if (!session) {
    return applySecurityHeaders(NextResponse.json({ error: "Não autorizado" }, { status: 403 }));
  }

  try {
    const formData = await req.formData();
    const data = Object.fromEntries(formData.entries());
    const parsed = updateSettingsSchema.safeParse(data);

    if (!parsed.success) {
      return applySecurityHeaders(
        NextResponse.json({ error: "Dados inválidos", details: parsed.error.flatten().fieldErrors }, { status: 400 })
      );
    }

    const updates = [];

    if (parsed.data.platform_fee_percent !== undefined) {
      updates.push(
        db.settings.upsert({
          where: { key: "platform_fee_percent" },
          update: { value: parsed.data.platform_fee_percent },
          create: { key: "platform_fee_percent", value: parsed.data.platform_fee_percent },
        })
      );
    }

    if (parsed.data.reservation_minutes !== undefined) {
      updates.push(
        db.settings.upsert({
          where: { key: "reservation_minutes" },
          update: { value: parsed.data.reservation_minutes },
          create: { key: "reservation_minutes", value: parsed.data.reservation_minutes },
        })
      );
    }

    if (parsed.data.require_seller_approval !== undefined) {
      updates.push(
        db.settings.upsert({
          where: { key: "require_seller_approval" },
          update: { value: parsed.data.require_seller_approval },
          create: { key: "require_seller_approval", value: parsed.data.require_seller_approval },
        })
      );
    }

    await Promise.all(updates);

    return applySecurityHeaders(NextResponse.json({ success: true, message: "Configurações salvas" }));
  } catch (error) {
    console.error("[Admin Config] Erro:", error);
    return applySecurityHeaders(NextResponse.json({ error: "Erro interno" }, { status: 500 }));
  }
}