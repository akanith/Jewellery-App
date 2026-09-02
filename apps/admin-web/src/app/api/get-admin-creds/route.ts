import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

const supabaseUrl = 'https://zeltnwyxmhuzoslpthlb.supabase.co';

// Let's check environment service role key
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

export async function GET() {
  try {
    if (!serviceKey) {
      return NextResponse.json({
        adminCredentialsInfo: {
          note: 'Admin Web uses Supabase Auth email/password login.',
          adminEmail: 'admin@ramyasjeweller.com / owner@ramyasjeweller.com',
          serviceKeyPresent: false,
        }
      });
    }

    const supabaseAdmin = createClient(supabaseUrl, serviceKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      }
    });

    // List auth.users
    const { data: usersData, error: usersErr } = await supabaseAdmin.auth.admin.listUsers();
    
    // List profiles with role OWNER or ADMIN
    const { data: adminProfiles, error: profilesErr } = await supabaseAdmin
      .from('profiles')
      .select('*')
      .in('role', ['OWNER', 'ADMIN', 'STAFF']);

    return NextResponse.json({
      authUsers: usersData?.users?.map(u => ({ id: u.id, email: u.email, created_at: u.created_at, role: u.user_metadata?.role })),
      adminProfiles,
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
