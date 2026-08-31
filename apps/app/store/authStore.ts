import { create } from 'zustand';
import { CustomerIdentity, SupportedLanguage } from '../types';
import AuthService from '../services/auth/auth.service';
import { supabase } from '../services/supabase/client';

interface AuthState {
  identity: CustomerIdentity | null;
  language: SupportedLanguage;
  isLoading: boolean;
  isInitialized: boolean;
  setLanguage: (lang: SupportedLanguage) => void;
  initializeAuth: () => Promise<void>;
  signInWithMobile: (mobile: string, pass: string) => Promise<void>;
  signOut: () => Promise<void>;
}

export const useAuthStore = create<AuthState>((set) => ({
  identity: null,
  language: 'en',
  isLoading: false,
  isInitialized: false,

  setLanguage: (lang: SupportedLanguage) => set({ language: lang }),

  initializeAuth: async () => {
    try {
      set({ isLoading: true });
      const identity = await AuthService.resolveCustomerIdentity();
      set({ identity, isInitialized: true, isLoading: false });
    } catch {
      set({ identity: null, isInitialized: true, isLoading: false });
    }
  },

  signInWithMobile: async (mobile: string, pass: string) => {
    set({ isLoading: true });
    try {
      const identity = await AuthService.signInWithMobile(mobile, pass);
      set({ identity, isLoading: false });
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
      set({ identity: null, isLoading: false });
    }
  },
}));

// Listen to Supabase auth state changes
supabase.auth.onAuthStateChange(async (event) => {
  if (event === 'SIGNED_OUT') {
    useAuthStore.setState({ identity: null, isLoading: false });
  } else if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED') {
    const identity = await AuthService.resolveCustomerIdentity();
    useAuthStore.setState({ identity, isLoading: false });
  }
});
