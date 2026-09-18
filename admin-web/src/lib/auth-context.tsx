'use client';

/**
 * RAMYAS JEWELLER - Admin Auth Context & Hook
 * Manages Supabase Auth session, active administrator profile & super-admin status.
 */

import React, { createContext, useContext, useEffect, useState, useTransition } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { getSupabaseBrowserClient } from '@/lib/supabase/client';
import { AdminUser, Profile } from '@/types/database';

interface AuthContextType {
  user: User | null;
  session: Session | null;
  adminProfile: AdminUser | null;
  profile: Profile | null;
  isSuperAdmin: boolean;
  isLoading: boolean;
  signIn: (email: string, pass: string) => Promise<{ error: string | null }>;
  signOut: () => Promise<void>;
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [adminProfile, setAdminProfile] = useState<AdminUser | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [isSuperAdmin, setIsSuperAdmin] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [, startTransition] = useTransition();

  const fetchAdminDetails = async (userId: string, userEmail?: string) => {
    try {
      const supabase = getSupabaseBrowserClient();

      // Fetch profile
      const { data: profData } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single();

      const defaultName = (
        userEmail === 'admin1@gmail.com' || userId === 'fada7105-e76b-4c46-9cd7-b52d94f624f1'
          ? 'A.B.Kathiravven'
          : userEmail === 'admin2@gmail.com' || userId === '25bac5cd-bfb4-4ba5-96c0-8e5f0d4a1b3f'
          ? 'A.K.Anith'
          : userEmail?.split('@')[0] || 'Admin'
      );

      if (profData) {
        setProfile({
          ...profData,
          full_name: profData.full_name || defaultName,
        } as Profile);
      } else {
        setProfile({
          id: userId,
          role: 'ADMIN',
          full_name: defaultName,
          phone_number: '+91 98421 43307',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        } as Profile);
      }

      // Fetch admin_users record
      const { data: adminData } = await supabase
        .from('admin_users')
        .select('*')
        .eq('id', userId)
        .single();

      if (adminData) {
        setAdminProfile(adminData as AdminUser);
        setIsSuperAdmin(Boolean(adminData.is_super_admin));
      } else {
        const isOwner = userEmail === 'admin1@gmail.com' || userId === 'fada7105-e76b-4c46-9cd7-b52d94f624f1';
        setAdminProfile({
          id: userId,
          is_super_admin: isOwner,
          role_title: isOwner ? 'Store Owner' : 'Store Administrator',
          created_at: new Date().toISOString(),
        } as AdminUser);
        setIsSuperAdmin(isOwner);
      }
    } catch {
      setAdminProfile(null);
      setIsSuperAdmin(false);
    }
  };

  useEffect(() => {
    let mounted = true;

    async function initAuth() {
      try {
        const supabase = getSupabaseBrowserClient();
        const { data: { session: initialSession } } = await supabase.auth.getSession();

        if (mounted) {
          setSession(initialSession);
          setUser(initialSession?.user ?? null);
          if (initialSession?.user) {
            await fetchAdminDetails(initialSession.user.id, initialSession.user.email);
          }
          setIsLoading(false);
        }

        const { data: authListener } = supabase.auth.onAuthStateChange(
          async (_event, newSession) => {
            if (!mounted) return;
            setSession(newSession);
            setUser(newSession?.user ?? null);
            if (newSession?.user) {
              await fetchAdminDetails(newSession.user.id, newSession.user.email);
            } else {
              setProfile(null);
              setAdminProfile(null);
              setIsSuperAdmin(false);
            }
            setIsLoading(false);
          }
        );

        return () => {
          authListener?.subscription.unsubscribe();
        };
      } catch {
        if (mounted) {
          setIsLoading(false);
        }
      }
    }

    initAuth();

    return () => {
      mounted = false;
    };
  }, []);

  const signIn = async (email: string, pass: string) => {
    try {
      const supabase = getSupabaseBrowserClient();
      const { data, error } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password: pass,
      });

      if (error) {
        return { error: error.message };
      }

      if (data.user) {
        await fetchAdminDetails(data.user.id, data.user.email);
      }

      return { error: null };
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Authentication failed.';
      return { error: msg };
    }
  };

  const signOut = async () => {
    startTransition(async () => {
      try {
        const supabase = getSupabaseBrowserClient();
        await supabase.auth.signOut();
      } finally {
        setUser(null);
        setSession(null);
        setProfile(null);
        setAdminProfile(null);
        setIsSuperAdmin(false);
      }
    });
  };

  const refreshProfile = async () => {
    if (user) {
      await fetchAdminDetails(user.id);
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        session,
        adminProfile,
        profile,
        isSuperAdmin,
        isLoading,
        signIn,
        signOut,
        refreshProfile,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
