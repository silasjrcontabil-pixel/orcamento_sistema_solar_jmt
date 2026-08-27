// Store do tema (claro/escuro) do sistema interno (não afeta a página institucional pública,
// que tem sua própria identidade visual fixa). Persistido em localStorage — a preferência do
// vendedor fica salva entre sessões nesse navegador.
import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export type Theme = 'dark' | 'light';

interface ThemeState {
  theme: Theme;
  toggleTheme: () => void;
  setTheme: (theme: Theme) => void;
}

export const useThemeStore = create<ThemeState>()(
  persist(
    (set) => ({
      theme: 'dark',
      toggleTheme: () => set((s) => ({ theme: s.theme === 'dark' ? 'light' : 'dark' })),
      setTheme: (theme) => set({ theme }),
    }),
    { name: 'jmt-solar-theme' },
  ),
);
