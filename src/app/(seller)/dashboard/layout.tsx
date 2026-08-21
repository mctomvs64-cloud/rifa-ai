import { SellerSidebar } from "@/components/layout/seller-sidebar";

export default function SellerLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-screen bg-muted/10">
      <div className="hidden md:block">
        <SellerSidebar />
      </div>
      
      <main className="flex-1 flex flex-col min-w-0">
        <div className="md:hidden h-16 border-b bg-card flex items-center px-4 sticky top-0 z-10">
          <div className="font-display font-bold text-xl text-primary">🎫 RifaAI</div>
          {/* Mobile menu toggle could go here in a full implementation */}
        </div>
        
        <div className="flex-1">
          {children}
        </div>
      </main>
    </div>
  );
}
