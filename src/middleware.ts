import NextAuth from "next-auth";
import { authConfig } from "@/lib/auth.config";
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export const { auth: middleware } = NextAuth(authConfig);

/**
 * Middleware de autenticação e autorização.
 * Protege rotas de admin e vendedor, redireciona usuários não autenticados.
 */
export default middleware((req: NextRequest & { auth: { user?: { role?: string } } | null }) => {
  const { pathname } = req.nextUrl;
  const session = req.auth;
  const isLoggedIn = !!session?.user;
  const userRole = session?.user?.role;

  // Rotas públicas — não precisam de autenticação
  const publicRoutes = ["/", "/login", "/cadastro", "/rifas"];
  const isPublicRoute =
    publicRoutes.some((route) => pathname === route) ||
    pathname.startsWith("/rifas/") ||
    pathname.startsWith("/api/webhooks/") ||
    pathname.startsWith("/meus-numeros") ||
    pathname.startsWith("/checkout/");

  if (isPublicRoute) return NextResponse.next();

  // Rotas de autenticação — redireciona se já logado
  if (pathname.startsWith("/login") || pathname.startsWith("/cadastro")) {
    if (isLoggedIn) {
      if (userRole === "ADMIN") return NextResponse.redirect(new URL("/admin", req.url));
      if (userRole === "SELLER") return NextResponse.redirect(new URL("/dashboard", req.url));
      return NextResponse.redirect(new URL("/", req.url));
    }
    return NextResponse.next();
  }

  // Rotas do painel admin — apenas ADMIN com email específico
  if (pathname.startsWith("/admin")) {
    if (!isLoggedIn) {
      return NextResponse.redirect(new URL(`/login?callbackUrl=${pathname}`, req.url));
    }
    if (userRole !== "ADMIN") {
      return NextResponse.redirect(new URL("/", req.url));
    }
    // Verificar se é o email do super admin
    const userEmail = session?.user?.email;
    if (userEmail !== "mctomvs64@gmail.com") {
      return NextResponse.redirect(new URL("/", req.url));
    }
    return NextResponse.next();
  }

  // Rotas do painel vendedor — apenas SELLER e ADMIN
  if (pathname.startsWith("/dashboard")) {
    if (!isLoggedIn) {
      return NextResponse.redirect(new URL(`/login?callbackUrl=${pathname}`, req.url));
    }
    if (userRole === "ADMIN") {
      return NextResponse.redirect(new URL("/admin", req.url));
    }
    if (userRole !== "SELLER") {
      return NextResponse.redirect(new URL("/", req.url));
    }
    return NextResponse.next();
  }

  // Qualquer outra rota protegida — precisa estar logado
  if (!isLoggedIn) {
    return NextResponse.redirect(new URL(`/login?callbackUrl=${pathname}`, req.url));
  }

  return NextResponse.next();
});

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
