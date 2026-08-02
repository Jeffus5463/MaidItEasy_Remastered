// Real partner auth — email + password, one Supabase Auth user per partner
// (see supabase/migrations/*_partner_accounts.sql). Replaces the seeded
// PARTNER_ID constant: every partner-facing query/mutation now takes the
// signed-in partner's own row id.
//
// Shares the same Supabase client (and session storage) as the customer
// flow's stub OTP sign-in — signing in as a partner on a device replaces
// any customer session there, and vice versa. That's expected: a device is
// either being used as a customer or as a partner, never both at once.
import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import { Session } from '@supabase/supabase-js';
import { supabase } from './supabase';

export interface PartnerSession {
  id: string;
  name: string;
  initials: string;
  rating: number;
  jobs_count: number;
  must_change_password: boolean;
}

async function fetchPartner(authUserId: string): Promise<PartnerSession | null> {
  const { data, error } = await supabase
    .from('partners')
    .select('id, name, initials, rating, jobs_count, must_change_password')
    .eq('auth_user_id', authUserId)
    .maybeSingle();
  if (error) throw error;
  return data;
}

export function usePartnerSession() {
  const [session, setSession] = useState<Session | null>(null);
  const [partner, setPartner] = useState<PartnerSession | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    async function sync(nextSession: Session | null) {
      setSession(nextSession);
      if (!nextSession) {
        setPartner(null);
        return;
      }
      const p = await fetchPartner(nextSession.user.id).catch(() => null);
      if (!cancelled) setPartner(p);
    }

    supabase.auth.getSession().then(async ({ data: { session: initial } }) => {
      if (cancelled) return;
      await sync(initial);
      if (!cancelled) setLoading(false);
    });

    const { data: sub } = supabase.auth.onAuthStateChange((_event, next) => {
      sync(next);
    });

    return () => {
      cancelled = true;
      sub.subscription.unsubscribe();
    };
  }, []);

  return { session, partner, loading };
}

// Gates a partner screen: redirects to /login (no session or no linked
// partner row) or /change-password (must_change_password), and reports
// when it's safe to render. Mirrors the customer app's useSession() +
// router.replace pattern in home.tsx, just shared across five screens
// instead of one.
export function useRequirePartner() {
  const { session, partner, loading } = usePartnerSession();

  useEffect(() => {
    if (loading) return;
    if (!session || !partner) {
      router.replace('/login');
      return;
    }
    if (partner.must_change_password) {
      router.replace('/change-password');
    }
  }, [loading, session, partner]);

  const ready = !loading && !!session && !!partner && !partner.must_change_password;
  return { partner, ready };
}

export async function signInPartner(email: string, password: string): Promise<PartnerSession> {
  const { data, error } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
  if (error) throw error;
  const partner = await fetchPartner(data.user.id);
  if (!partner) throw new Error('No partner account is linked to this login. Contact your dispatcher.');
  return partner;
}

export async function changePartnerPassword(partnerId: string, newPassword: string) {
  const { error: authError } = await supabase.auth.updateUser({ password: newPassword });
  if (authError) throw authError;
  const { error } = await supabase.from('partners').update({ must_change_password: false }).eq('id', partnerId);
  if (error) throw error;
}

export async function signOutPartner() {
  await supabase.auth.signOut();
}
