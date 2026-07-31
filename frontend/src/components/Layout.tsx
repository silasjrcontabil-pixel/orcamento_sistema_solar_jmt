import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { useState } from 'react';
import { useAuthStore } from '../store/auth';
import logo from '../assets/logo.jpeg';

const NAV_ITEMS = [
  { to: '/', label: 'Dashboard', end: true },
  { to: '/clientes', label: 'Clientes' },
  { to: '/produtos', label: 'Produtos' },
  { to: '/orcamentos', label: 'Orçamentos' },
];

export function Layout() {
  const user = useAuthStore((s) => s.user);
  const logout = useAuthStore((s) => s.logout);
  const navigate = useNavigate();
  const [mobileOpen, setMobileOpen] = useState(false);

  function handleLogout() {
    logout();
    navigate('/login', { replace: true });
  }

  const navLinkClass = ({ isActive }: { isActive: boolean }) =>
    `block rounded-md px-3 py-2.5 text-sm font-semibold transition-colors ${
      isActive
        ? 'bg-primary/10 text-primary border-l-2 border-primary'
        : 'text-muted-foreground hover:text-foreground hover:bg-secondary border-l-2 border-transparent'
    }`;

  // Gaveta mobile tem seu próprio tamanho (maior que a sidebar de desktop) — pedido
  // explícito de aumentar a leftbar só no celular, sem mexer no layout de desktop.
  const mobileNavLinkClass = ({ isActive }: { isActive: boolean }) =>
    `block rounded-md px-4 py-4 text-xl font-semibold transition-colors ${
      isActive
        ? 'bg-primary/10 text-primary border-l-2 border-primary'
        : 'text-muted-foreground hover:text-foreground hover:bg-secondary border-l-2 border-transparent'
    }`;

  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* Sidebar - desktop */}
      <aside className="hidden lg:flex fixed inset-y-0 left-0 w-64 flex-col border-r border-border bg-background-soft">
        <div className="flex items-center gap-3 px-5 py-6 border-b border-border">
          <img src={logo} alt="JMT Solar" className="h-11 w-11 rounded-full object-cover" />
          <div>
            <p className="font-display font-extrabold leading-tight">JMT Solar</p>
            <p className="text-xs text-muted-foreground">Orçamentos</p>
          </div>
        </div>
        <nav className="flex-1 space-y-1 px-3 py-4">
          {NAV_ITEMS.map((item) => (
            <NavLink key={item.to} to={item.to} end={item.end} className={navLinkClass}>
              {item.label}
            </NavLink>
          ))}
        </nav>
        <div className="border-t border-border px-4 py-4">
          <p className="text-sm font-semibold text-foreground truncate">{user?.nome ?? '—'}</p>
          <p className="text-xs text-muted-foreground truncate mb-3">@{user?.username ?? ''}</p>
          <button onClick={handleLogout} className="btn-secondary w-full text-xs">
            Sair
          </button>
        </div>
      </aside>

      {/* Topbar - mobile */}
      <header className="lg:hidden safe-top sticky top-0 z-40 flex items-center gap-3 border-b border-border bg-background-soft px-4 pb-3">
        <button
          onClick={() => setMobileOpen((v) => !v)}
          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-border bg-secondary text-foreground active:bg-primary/10"
          aria-label="Abrir menu"
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M4 6h16M4 12h16M4 18h16" strokeLinecap="round" />
          </svg>
        </button>
        <div className="flex items-center gap-2.5">
          <img src={logo} alt="JMT Solar" className="h-9 w-9 shrink-0 rounded-full object-cover" />
          <span className="font-display text-lg font-extrabold">JMT Solar</span>
        </div>
      </header>

      {mobileOpen && (
        <div className="lg:hidden fixed inset-0 z-40 bg-black/70" onClick={() => setMobileOpen(false)}>
          <div
            className="absolute left-0 top-0 h-full w-[85vw] max-w-[380px] safe-top-lg bg-background-soft border-r border-border px-6 pb-6"
            onClick={(e) => e.stopPropagation()}
          >
            <nav className="space-y-2 mt-2">
              {NAV_ITEMS.map((item) => (
                <NavLink
                  key={item.to}
                  to={item.to}
                  end={item.end}
                  className={mobileNavLinkClass}
                  onClick={() => setMobileOpen(false)}
                >
                  {item.label}
                </NavLink>
              ))}
            </nav>
            <div className="border-t border-border mt-6 pt-6">
              <p className="text-lg font-semibold text-foreground truncate">{user?.nome ?? '—'}</p>
              <p className="text-sm text-muted-foreground truncate mb-4">@{user?.username ?? ''}</p>
              <button onClick={handleLogout} className="btn-secondary w-full text-lg !py-3">
                Sair
              </button>
            </div>
          </div>
        </div>
      )}

      <main className="lg:pl-64">
        <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8 lg:py-8">
          <Outlet />
        </div>
      </main>
    </div>
  );
}
