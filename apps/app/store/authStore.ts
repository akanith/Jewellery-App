import { create } from 'zustand';
import { CustomerSession, SupportedLanguage } from '../types';
import AuthService from '../services/auth/auth.service';

interface AuthState {
  /** Resolved customer session — null means not logged in */
  session: CustomerSession | null;
  /** Keep 'identity' as alias for backward compat with dashboard screens */
  identity: CustomerSession | null;
  language: SupportedLanguage;
  isLoading: boolean;
  isInitialized: boolean;

  setLanguage: (lang: SupportedLanguage) => void;
  /** Restore session from AsyncStorage on app startup */
  initializeAuth: () => Promise<void>;
  /** Login with 10-digit mobile number only */
  signInWithMobile: (mobile: string) => Promise<void>;
  /** Sign out and clear session */
  signOut: () => Promise<void>;
}

export const useAuthStore = create<AuthState>((set) => ({
  session: null,
  identity: null,
  language: 'en',
  isLoading: false,
  isInitialized: false,

  setLanguage: (lang) => set({ language: lang }),

  initializeAuth: async () => {
    try {
      set({ isLoading: true });
      const session = await AuthService.restoreSession();
      set({ session, identity: session, isInitialized: true, isLoading: false });
    } catch {
      set({ session: null, identity: null, isInitialized: true, isLoading: false });
    }
  },

  signInWithMobile: async (mobile: string) => {
    set({ isLoading: true });
    try {
      const session = await AuthService.signInWithMobile(mobile);
      set({ session, identity: session, isLoading: false });
    } catch (err) {
      set({ isLoading: false });
      throw err;
    }
  },

  signOut: async () => {
    set({ isLoading: true });
    try {
      await AuthService.signOut();
    } finally {
      set({ session: null, identity: null, isLoading: false });
    }
  },
}));
