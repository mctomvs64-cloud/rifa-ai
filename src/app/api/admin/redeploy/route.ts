import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { auth } from "@/lib/auth";

/**
 * POST /api/admin/redeploy
 * Triggers a Netlify deploy hook to redeploy the site.
 * Only accessible by ADMIN users.
 */
export async function POST(req: NextRequest) {
  const session = await auth();

  if (!session?.user || session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
  }

  const hookUrl = process.env.NETLIFY_DEPLOY_HOOK_URL;

  if (!hookUrl) {
    return NextResponse.json(
      { error: "NETLIFY_DEPLOY_HOOK_URL não configurada no servidor." },
      { status: 500 }
    );
  }

  try {
    const response = await fetch(hookUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
    });

    if (!response.ok) {
      const text = await response.text();
      console.error("[Redeploy] Netlify hook failed:", text);
      return NextResponse.json(
        { error: "Falha ao acionar o deploy na Netlify." },
        { status: 502 }
      );
    }

    console.log("[Redeploy] Deploy triggered by admin:", session.user.email);
    return NextResponse.json({ message: "Deploy iniciado com sucesso! O site será atualizado em alguns minutos." });
  } catch (error) {
    console.error("[Redeploy] Erro:", error);
    return NextResponse.json({ error: "Erro ao conectar com a Netlify." }, { status: 500 });
  }
}
