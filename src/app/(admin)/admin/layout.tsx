import { AdminSidebar } from "@/components/layout/admin-sidebar";

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-screen bg-muted/10">
      <div className="hidden md:block">
        <AdminSidebar />
      </div>
      
      <main className="flex-1 flex flex-col min-w-0">
        <div className="md:hidden h-16 border-b bg-navy-950 text-white flex items-center px-4 sticky top-0 z-10">
          <div className="font-display font-bold text-xl text-yellow-400">🎫 RifaAI Admin</div>
        </div>
        
        <div className="flex-1">
          {children}
        </div>
      </main>
    </div>
  );
}
