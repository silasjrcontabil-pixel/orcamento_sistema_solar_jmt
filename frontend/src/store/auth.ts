// Store de sessão (zustand + persist). Guarda o JWT e o usuário logado em
// localStorage sob a chave AUTH_STORAGE_KEY (também lida por lib/api.ts para
// anexar o header Authorization sem depender de importar o store ali, evitando
// dependência circular).

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { authApi, AUTH_STORAGE_KEY, ApiError } from '../lib/api';
import type { CurrentUser } from '../types';

interface AuthState {
  token: string | null;
  user: CurrentUser | null;
  isAuthenticated: boolean;
  loading: boolean;
  error: string | null;
  login: (username: string, password: string) => Promise<void>;
  logout: () => void;
  fetchMe: () => Promise<void>;
  clearError: () => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      token: null,
      user: null,
      isAuthenticated: false,
      loading: false,
      error: null,

      login: async (username: string, password: string) => {
        set({ loading: true, error: null });
        try {
          // Login é sempre o primeiro nome em minúsculas — normaliza aqui para o usuário
          // não precisar acertar a caixa exata (o backend também compara case-insensitive).
          const { access_token } = await authApi.login({ username: username.trim().toLowerCase(), password });
          set({ token: access_token, isAuthenticated: true, loading: false });
          await get().fetchMe();
        } catch (err) {
          const message =
            err instanceof ApiError
              ? err.status === 401 || err.status === 400
                ? 'Usuário ou senha inválidos.'
                : err.message
              : 'Não foi possível fazer login. Tente novamente.';
          set({ loading: false, error: message, isAuthenticated: false, token: null, user: null });
          throw err;
        }
      },

      fetchMe: async () => {
        try {
          const user = await authApi.me();
          set({ user, isAuthenticated: true });
        } catch {
          set({ user: null, token: null, isAuthenticated: false });
        }
      },

      logout: () => {
        set({ token: null, user: null, isAuthenticated: false, error: null });
      },

      clearError: () => set({ error: null }),
    }),
    {
      name: AUTH_STORAGE_KEY,
      partialize: (state) => ({
        token: state.token,
        user: state.user,
        isAuthenticated: state.isAuthenticated,
      }),
    },
  ),
);
