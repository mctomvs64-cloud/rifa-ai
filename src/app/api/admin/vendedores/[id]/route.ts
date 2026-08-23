import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { z } from "zod";

const updateSchema = z.object({
  name: z.string().min(2).optional(),
  email: z.string().email().optional(),
  phone: z.string().optional(),
  image: z.string().url().optional().or(z.literal("")),
  status: z.enum(["ACTIVE", "PENDING", "SUSPENDED"]).optional(),
  role: z.enum(["ADMIN", "SELLER", "BUYER"]).optional(),
});

async function checkAdminAuth() {
  const session = await auth();
  if (!session?.user || session.user.role !== "ADMIN") {
    return null;
  }
  return session;
}

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await checkAdminAuth();
  if (!session) {
    return NextResponse.json({ error: "Não autorizado" }, { status: 403 });
  }

  const { id } = await params;

  const seller = await db.user.findUnique({
    where: { id },
    select: {
      id: true,
      name: true,
      email: true,
      phone: true,
      image: true,
      role: true,
      status: true,
      createdAt: true,
      _count: { select: { raffles: true, orders: true } },
    },
  });

  if (!seller) {
    return NextResponse.json({ error: "Vendedor não encontrado" }, { status: 404 });
  }

  return NextResponse.json(seller);
}

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await checkAdminAuth();
  if (!session) {
    return NextResponse.json({ error: "Não autorizado" }, { status: 403 });
  }

  const { id } = await params;

  try {
    const body = await req.json();
    const parsed = updateSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Dados inválidos", details: parsed.error.flatten().fieldErrors },
        { status: 400 }
      );
    }

    const { email, ...data } = parsed.data;

    if (email) {
      const existing = await db.user.findUnique({ where: { email } });
      if (existing && existing.id !== id) {
        return NextResponse.json({ error: "Email já está em uso" }, { status: 409 });
      }
      data.email = email;
    }

    if (data.image === "") {
      data.image = null;
    }

    const seller = await db.user.update({
      where: { id },
      data,
      select: {
        id: true,
        name: true,
        email: true,
        phone: true,
        image: true,
        role: true,
        status: true,
      },
    });

    return NextResponse.json(seller);
  } catch (error) {
    console.error("[Admin Vendedores PATCH] Erro:", error);
    return NextResponse.json({ error: "Erro interno" }, { status: 500 });
  }
}

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await checkAdminAuth();
  if (!session) {
    return NextResponse.json({ error: "Não autorizado" }, { status: 403 });
  }

  const { id } = await params;

  try {
    await db.user.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("[Admin Vendedores DELETE] Erro:", error);
    return NextResponse.json({ error: "Erro ao excluir" }, { status: 500 });
  }
}