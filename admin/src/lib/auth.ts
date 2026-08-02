'use client';

// Real admin login — email + password, gated by membership in the
// `admins` table (see supabase/migrations/*_admin_login.sql). Replaces the
// anonymous auto-session stub. There's no self-service signup; bootstrap
// the first admin manually (see README.md).
import { Session } from '@supabase/supabase-js';
import { useEffect, useState } from 'react';
import { supabase } from './supabase';

async function checkIsAdmin(userId: string): Promise<boolean> {
  const { data, error } = await supabase.from('admins').select('auth_user_id').eq('auth_user_id', userId).maybeSingle();
  if (error) throw error;
  return !!data;
}

export function useAdminSession() {
  const [session, setSession] = useState<Session | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    async function sync(next: Session | null) {
      setSession(next);
      if (!next) {
        setIsAdmin(false);
        return;
      }
      const admin = await checkIsAdmin(next.user.id).catch(() => false);
      if (!cancelled) setIsAdmin(admin);
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

  return { session, isAdmin, loading };
}

export async function signInAdmin(email: string, password: string) {
  const { data, error } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
  if (error) throw error;

  const admin = await checkIsAdmin(data.user.id);
  if (!admin) {
    await supabase.auth.signOut();
    throw new Error('This account is not an admin.');
  }
}

export async function signOutAdmin() {
  await supabase.auth.signOut();
}

// Self-service — no server route needed, this is Supabase Auth's own email
// flow. Requires SMTP configured in the Supabase dashboard to actually
// send (see README.md); without it this call still succeeds but no email
// arrives.
export async function sendAdminPasswordReset(email: string) {
  const redirectTo = `${window.location.origin}/update-password`;
  const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), { redirectTo });
  if (error) throw error;
}

export async function updateAdminPassword(newPassword: string) {
  const { error } = await supabase.auth.updateUser({ password: newPassword });
  if (error) throw error;
}
