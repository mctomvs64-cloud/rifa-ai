export function PublicNavbar() {
  return (
    <header className="border-b bg-background">
      <div className="max-w-6xl mx-auto px-4 h-16 flex items-center justify-between">
        <div className="font-display font-bold text-xl text-primary">💚 VaquinhaAI</div>
        <nav className="flex items-center gap-4">
          <a href="/meus-numeros" className="text-sm font-medium hover:text-primary">Meus Números</a>
          <a href="/login" className="text-sm font-medium hover:text-primary">Entrar</a>
          <a href="/cadastro" className="text-sm font-medium bg-primary text-primary-foreground px-4 py-2 rounded-lg">Criar Vaquinha</a>
        </nav>
      </div>
    </header>
  );
}
