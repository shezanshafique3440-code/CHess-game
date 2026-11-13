import { create } from 'zustand';
import type { AuthError } from './copy';
export interface AuthUser {
  id: string;
  username: string;
  email: string | null;
  rating: number;
  isGuest: boolean;
  expiresAt: string | null;
  createdAt: string;
}
const api = (import.meta.env.VITE_API_URL || '/api').replace(/\/$/, '');
async function request(
  path: string,
  body?: unknown,
): Promise<{ user: AuthUser } | null> {
  try {
    const response = await fetch(`${api}/auth/${path}`, {
      method: path === 'me' ? 'GET' : 'POST',
      credentials: 'include',
      cache: 'no-store',
      headers:
        body === undefined ? undefined : { 'Content-Type': 'application/json' },
      body: body === undefined ? undefined : JSON.stringify(body),
    });
    if (response.status === 204) return null;
    const data = await response.json();
    if (!response.ok) throw data.code || 'SERVICE_UNAVAILABLE';
    return data;
  } catch (error) {
    throw typeof error === 'string' ? error : 'SERVICE_UNAVAILABLE';
  }
}
interface AuthState {
  user: AuthUser | null;
  status: 'checking' | 'authenticated' | 'anonymous';
  busy: boolean;
  error: AuthError | null;
  refresh: () => Promise<void>;
  authenticate: (
    mode: 'login' | 'register' | 'guest',
    data?: unknown,
  ) => Promise<boolean>;
  logout: () => Promise<boolean>;
  clearError: () => void;
}
let version = 0;
export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  status: 'checking',
  busy: false,
  error: null,
  clearError: () => set({ error: null }),
  refresh: async () => {
    const current = ++version;
    try {
      const data = await request('me');
      if (current === version)
        set({ user: data!.user, status: 'authenticated', error: null });
    } catch (error) {
      if (current === version)
        set({
          user: null,
          status: 'anonymous',
          error: error === 'UNAUTHENTICATED' ? null : (error as AuthError),
        });
    }
  },
  authenticate: async (mode, body = {}) => {
    const current = ++version;
    set({ busy: true, error: null });
    try {
      const data = await request(mode, body);
      if (current === version)
        set({ user: data!.user, status: 'authenticated', busy: false });
      return true;
    } catch (error) {
      if (current === version) set({ error: error as AuthError, busy: false });
      return false;
    }
  },
  logout: async () => {
    const current = ++version;
    set({ busy: true, error: null });
    try {
      await request('logout');
      if (current === version)
        set({ user: null, status: 'anonymous', busy: false });
      return true;
    } catch (error) {
      if (current === version) set({ error: error as AuthError, busy: false });
      return false;
    }
  },
}));
