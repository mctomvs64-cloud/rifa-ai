"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut, useSession } from "next-auth/react";

export function SellerSidebar() {
  const pathname = usePathname();
  const { data: session } = useSession();

  const links = [
    { href: "/dashboard", label: "Painel Geral", icon: "📊" },
    { href: "/dashboard/rifas/nova", label: "Nova Rifa", icon: "➕" },
  ];

  return (
    <aside className="w-64 bg-card border-r flex flex-col h-full min-h-screen sticky top-0">
      <div className="h-16 flex items-center px-6 border-b">
        <Link href="/dashboard" className="font-display font-bold text-xl text-primary">
          🎫 RifaAI <span className="text-sm font-normal text-muted-foreground">Seller</span>
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
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:bg-muted hover:text-foreground"
              }`}
            >
              <span className="text-lg">{link.icon}</span>
              {link.label}
            </Link>
          );
        })}
      </div>

      <div className="p-4 border-t">
        <div className="mb-4 px-2">
          <p className="text-sm font-medium line-clamp-1">{session?.user?.name}</p>
          <p className="text-xs text-muted-foreground line-clamp-1">{session?.user?.email}</p>
        </div>
        <button
          onClick={() => signOut({ callbackUrl: "/" })}
          className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium text-red-600 hover:bg-red-50 dark:hover:bg-red-950/30 transition-colors"
        >
          <span>🚪</span> Sair
        </button>
      </div>
    </aside>
  );
}
