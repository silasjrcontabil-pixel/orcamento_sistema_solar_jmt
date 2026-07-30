export function Spinner({ label = 'Carregando...' }: { label?: string }) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 py-16 text-muted-foreground">
      <span className="h-8 w-8 rounded-full border-2 border-primary border-t-transparent animate-spin" />
      <span className="text-sm">{label}</span>
    </div>
  );
}

export function FullPageSpinner() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background">
      <Spinner />
    </div>
  );
}
