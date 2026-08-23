"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut, useSession } from "next-auth/react";

export function AdminSidebar() {
  const pathname = usePathname();
  const { data: session } = useSession();

  const links = [
    { href: "/admin", label: "Visão Geral", icon: "📈" },
    { href: "/admin/rifas", label: "Monitoramento", icon: "🎟️" },
    { href: "/admin/repasses", label: "Repasses", icon: "💰" },
    { href: "/admin/vendedores", label: "Vendedores", icon: "👥" },
    { href: "/admin/configuracoes", label: "Configurações", icon: "⚙️" },
  ];

  return (
    <aside className="w-64 bg-navy-950 text-white flex flex-col h-full min-h-screen sticky top-0">
      <div className="h-16 flex items-center px-6 border-b border-white/10">
        <Link href="/admin" className="font-display font-bold text-xl text-yellow-400">
          🎫 RifaAI <span className="text-sm font-normal text-blue-200">Admin</span>
        </Link>
      </div>

      <div className="flex-1 px-4 py-6 space-y-1 overflow-y-auto">
        {links.map((link) => {
          const isActive = pathname === link.href;
          return (
            <Link
              key={link.href}
              href={link.href}
              className={`flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                isActive
                  ? "bg-primary text-white"
                  : "text-blue-200 hover:bg-white/5 hover:text-white"
              }`}
            >
              <span className="text-lg">{link.icon}</span>
              {link.label}
            </Link>
          );
        })}
      </div>

      <div className="p-4 border-t border-white/10">
        <div className="mb-4 px-2">
          <p className="text-sm font-medium line-clamp-1">{session?.user?.name}</p>
          <p className="text-xs text-blue-300 line-clamp-1">{session?.user?.email}</p>
        </div>
        <button
          onClick={() => signOut({ callbackUrl: "/" })}
          className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium text-red-400 hover:bg-white/5 transition-colors"
        >
          <span>🚪</span> Sair
        </button>
      </div>
    </aside>
  );
}
