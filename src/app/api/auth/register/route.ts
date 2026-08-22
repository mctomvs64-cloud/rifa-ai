import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { z } from "zod";
import bcrypt from "bcryptjs";
import { db } from "@/lib/db";
import { generateUniqueSlug } from "@/lib/utils";

export const dynamic = "force-dynamic";

const registerSchema = z.object({
  name: z.string().min(2, "Nome muito curto"),
  email: z.string().email("Email inválido"),
  password: z.string().min(6, "Senha deve ter pelo menos 6 caracteres"),
  phone: z.string().min(10, "WhatsApp inválido").optional(),
  role: z.enum(["SELLER", "BUYER"]).default("BUYER"),
});

/**
 * POST /api/auth/register
 * Registra um novo usuário (vendedor ou comprador).
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const parsed = registerSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Dados inválidos", details: parsed.error.flatten().fieldErrors },
        { status: 400 }
      );
    }

    const { name, email, password, phone, role } = parsed.data;

    // Verifica se email já está em uso
    const existingUser = await db.user.findUnique({ where: { email } });
    if (existingUser) {
      return NextResponse.json(
        { error: "Este email já está cadastrado." },
        { status: 409 }
      );
    }

    // Hash da senha com bcrypt (salt = 12)
    const hashedPassword = await bcrypt.hash(password, 12);

    const user = await db.user.create({
      data: {
        name,
        email,
        password: hashedPassword,
        phone: phone?.replace(/\D/g, ""), // Salva só dígitos
        role,
        // Vendedores começam ativos (sem curadoria no self-service)
        status: "ACTIVE",
      },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
      },
    });

    return NextResponse.json(
      { user, message: "Conta criada com sucesso!" },
      { status: 201 }
    );
  } catch (error) {
    console.error("[Register] Erro:", error);
    return NextResponse.json(
      { error: "Erro interno. Tente novamente." },
      { status: 500 }
    );
  }
}
