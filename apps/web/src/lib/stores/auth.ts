import { writable, derived } from 'svelte/store';
import { authApi, getSessionToken, setSessionToken, type User } from '$lib/api';

interface AuthState {
  user: User | null;
  loading: boolean;
  initialized: boolean;
}

function createAuthStore() {
  const { subscribe, set, update } = writable<AuthState>({
    user: null,
    loading: true,
    initialized: false,
  });

  return {
    subscribe,

    async init() {
      // Check if there's a stored session
      const token = getSessionToken();
      if (!token) {
        set({ user: null, loading: false, initialized: true });
        return;
      }

      try {
        const { user } = await authApi.me();
        set({ user, loading: false, initialized: true });
      } catch {
        // Session invalid or expired
        setSessionToken(null);
        set({ user: null, loading: false, initialized: true });
      }
    },

    async login(email: string, password: string) {
      update((state) => ({ ...state, loading: true }));
      try {
        const { user } = await authApi.login(email, password);
        set({ user, loading: false, initialized: true });
        return { success: true };
      } catch (error) {
        update((state) => ({ ...state, loading: false }));
        return { success: false, error: error instanceof Error ? error.message : 'Login failed' };
      }
    },

    async register(email: string, password: string, name: string, invitationToken?: string) {
      update((state) => ({ ...state, loading: true }));
      try {
        const { user } = await authApi.register(email, password, name, invitationToken);
        set({ user, loading: false, initialized: true });
        return { success: true };
      } catch (error) {
        update((state) => ({ ...state, loading: false }));
        return { success: false, error: error instanceof Error ? error.message : 'Registration failed' };
      }
    },

    async logout() {
      try {
        await authApi.logout();
      } finally {
        set({ user: null, loading: false, initialized: true });
      }
    },
  };
}

export const auth = createAuthStore();
export const isAuthenticated = derived(auth, ($auth) => !!$auth.user);
export const isLoading = derived(auth, ($auth) => $auth.loading);
