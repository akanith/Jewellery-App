import { createClient } from '@/lib/supabase/client';
import { AppError, ErrorCode } from '@/lib/errors/app-error';
import { normalizeError } from '@/lib/errors/error-handler';
import { UserRole } from '@ramyas-jeweller/shared-types';

export const ALLOWED_ADMIN_ROLES: UserRole[] = ['OWNER', 'ADMIN', 'STAFF'];

export interface AdminAuthResult {
  userId: string;
  email: string | null;
  role: UserRole;
  fullName: string;
}

export class AuthService {
  private static getSupabase() {
    return createClient();
  }

  /**
   * Authenticate admin user via Supabase Auth and verify admin role
   */
  static async signInWithPassword(email: string, password: string): Promise<AdminAuthResult> {
    const supabase = this.getSupabase();

    try {
      // 1. Supabase Auth Sign In
      const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password: password.trim(),
      });

      if (authError) {
        if (authError.message.toLowerCase().includes('invalid login credentials')) {
          throw new AppError('Invalid email or password.', ErrorCode.UNAUTHORIZED, 401);
        }
        if (authError.message.toLowerCase().includes('failed to fetch') || authError.message.toLowerCase().includes('network')) {
          throw new AppError('Unable to connect to the authentication service. Please try again.', ErrorCode.NETWORK_ERROR, 503);
        }
        throw normalizeError(authError);
      }

      if (!authData.user) {
        throw new AppError('Authentication failed. No user record returned.', ErrorCode.UNAUTHORIZED, 401);
      }

      // 2. Retrieve Profile & Verify Role
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', authData.user.id)
        .single();

      if (profileError || !profile) {
        // Sign out if profile lookup fails
        await supabase.auth.signOut();
        throw new AppError('You are not authorized to access the admin portal.', ErrorCode.FORBIDDEN, 403);
      }

      const userRole = profile.role as UserRole;

      if (!ALLOWED_ADMIN_ROLES.includes(userRole)) {
        // Sign out unauthorized users (e.g. CUSTOMER)
        await supabase.auth.signOut();
        throw new AppError('You are not authorized to access the admin portal.', ErrorCode.FORBIDDEN, 403);
      }

      return {
        userId: authData.user.id,
        email: authData.user.email ?? profile.email ?? null,
        role: userRole,
        fullName: profile.full_name ?? 'Admin User',
      };
    } catch (error) {
      throw normalizeError(error);
    }
  }

  /**
   * Check current active Supabase Auth session & verify admin role
   */
  static async getCurrentAdminUser(): Promise<AdminAuthResult | null> {
    const supabase = this.getSupabase();

    try {
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();

      if (sessionError || !session?.user) {
        return null;
      }

      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', session.user.id)
        .single();

      if (profileError || !profile) {
        await supabase.auth.signOut();
        return null;
      }

      const userRole = profile.role as UserRole;

      if (!ALLOWED_ADMIN_ROLES.includes(userRole)) {
        await supabase.auth.signOut();
        return null;
      }

      return {
        userId: session.user.id,
        email: session.user.email ?? profile.email ?? null,
        role: userRole,
        fullName: profile.full_name ?? 'Admin User',
      };
    } catch {
      return null;
    }
  }

  /**
   * Sign out current admin user
   */
  static async signOut(): Promise<void> {
    const supabase = this.getSupabase();
    await supabase.auth.signOut();
  }
}
