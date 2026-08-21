import Link from "next/link";
import { PublicNavbar } from "@/components/layout/public-navbar";
import { PublicFooter } from "@/components/layout/public-footer";

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen flex flex-col bg-muted/20">
      <PublicNavbar />
      
      <main className="flex-1 flex flex-col justify-center py-12 px-4 sm:px-6 lg:px-8">
        <div className="sm:mx-auto sm:w-full sm:max-w-md">
          <div className="text-center mb-8">
            <h2 className="font-display text-3xl font-bold tracking-tight">
              Bem-vindo à RifaAI
            </h2>
            <p className="text-sm text-muted-foreground mt-2">
              A plataforma mais segura para suas rifas online
            </p>
          </div>
          
          <div className="bg-card py-8 px-4 shadow-xl border sm:rounded-2xl sm:px-10">
            {children}
          </div>
        </div>
      </main>

      <PublicFooter />
    </div>
  );
}
