import { Link } from 'react-router-dom';

export function NotFound() {
  return (
    <div className="flex flex-col items-center justify-center gap-3 py-24 text-center">
      <h1 className="font-display text-5xl font-extrabold text-primary">404</h1>
      <p className="text-muted-foreground">Página não encontrada.</p>
      <Link to="/" className="btn-primary mt-2">
        Voltar ao início
      </Link>
    </div>
  );
}
