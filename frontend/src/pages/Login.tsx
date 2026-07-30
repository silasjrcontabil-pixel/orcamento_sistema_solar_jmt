import { useState, type FormEvent } from 'react';
import { Navigate, useLocation, useNavigate } from 'react-router-dom';
import { useAuthStore } from '../store/auth';
import { Input } from '../components/Input';
import { Button } from '../components/Button';
import { ErrorBanner } from '../components/ErrorBanner';
import logo from '../assets/logo.jpeg';

export function Login() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const login = useAuthStore((s) => s.login);
  const loading = useAuthStore((s) => s.loading);
  const error = useAuthStore((s) => s.error);
  const clearError = useAuthStore((s) => s.clearError);
  const navigate = useNavigate();
  const location = useLocation();

  if (isAuthenticated) {
    const from = (location.state as { from?: Location })?.from?.pathname ?? '/';
    return <Navigate to={from} replace />;
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    clearError();
    try {
      await login(username, password);
      navigate('/', { replace: true });
    } catch {
      // erro já fica no store (useAuthStore.error) e é exibido via ErrorBanner
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-4">
      <div className="w-full max-w-sm">
        <div className="flex flex-col items-center mb-8">
          <img
            src={logo}
            alt="JMT Solar"
            className="h-24 w-24 rounded-full object-cover shadow-card mb-4"
          />
          <h1 className="font-display text-2xl font-extrabold text-foreground">JMT Solar</h1>
          <p className="text-sm text-muted-foreground">Sistema de Orçamentos</p>
        </div>

        <form onSubmit={handleSubmit} className="card card-gold-top p-6 space-y-4">
          <Input
            label="Usuário"
            name="username"
            autoComplete="username"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            required
            autoFocus
          />
          <Input
            label="Senha"
            name="password"
            type="password"
            autoComplete="current-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />
          <ErrorBanner message={error} />
          <Button type="submit" className="w-full" loading={loading}>
            Entrar
          </Button>
        </form>

        <p className="text-center text-xs text-muted-foreground mt-6">
          Energia que move o futuro.
        </p>
      </div>
    </div>
  );
}
