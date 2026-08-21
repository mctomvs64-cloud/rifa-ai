export function PublicFooter() {
  return (
    <footer className="border-t bg-muted/20 mt-auto">
      <div className="max-w-6xl mx-auto px-4 py-8 text-center text-sm text-muted-foreground">
        <p>&copy; {new Date().getFullYear()} RifaAI. Todos os direitos reservados.</p>
      </div>
    </footer>
  );
}
