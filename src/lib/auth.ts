// Session state + the stub phone sign-in (real Supabase user, no SMS provider yet).
import type { Session } from '@supabase/supabase-js';
import { useQuery } from '@tanstack/react-query';
import { useEffect, useState } from 'react';
import { supabase } from './supabase';

export function useSession() {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      setLoading(false);
    });
    const { data: sub } = supabase.auth.onAuthStateChange((_event, s) => {
      setSession(s);
    });
    return () => sub.subscription.unsubscribe();
  }, []);

  return { session, loading };
}

// The customer's own display name, if they've set one (see app/name.tsx).
// Callers should fall back to something generic (e.g. "there") when unset —
// real identity correctness still waits on real SMS OTP.
export function useProfileName(userId: string | undefined) {
  return useQuery({
    queryKey: ['profile-name', userId],
    queryFn: async () => {
      const { data, error } = await supabase.from('profiles').select('full_name').eq('id', userId).single();
      if (error) throw error;
      return data.full_name as string | null;
    },
    enabled: !!userId,
  });
}

// Any 6-digit code is accepted (no SMS provider configured yet), but this
// creates a real Supabase user + session and records the phone number.
// Swap for supabase.auth.verifyOtp once Twilio/an SMS provider is wired up.
// hasName tells the caller whether to prompt for a name (skipped for
// returning users who already have one on file).
export async function signInWithPhone(phoneDigits: string): Promise<{ session: Session; hasName: boolean }> {
  const {
    data: { session: existing },
  } = await supabase.auth.getSession();

  let session = existing;

  if (session) {
    if (!session.user.is_anonymous) {
      // A partner/admin session is active on this device — the customer OTP
      // stub shares the same Supabase client/session storage as partner
      // login. Never attach a customer profile to that
      // non-customer identity.
      await supabase.auth.signOut();
      session = null;
    } else {
      const { data: existingProfile } = await supabase
        .from('profiles')
        .select('phone')
        .eq('id', session.user.id)
        .single();
      if (existingProfile?.phone && existingProfile.phone !== phoneDigits) {
        // A different number than the one signed in on this device — treat
        // it as a different customer instead of overwriting the signed-in
        // account's phone with whatever was just typed.
        await supabase.auth.signOut();
        session = null;
      }
    }
  }

  if (!session) {
    const { data, error } = await supabase.auth.signInAnonymously();
    if (error) throw error;
    session = data.session;
  }
  if (!session) throw new Error('Sign-in did not return a session.');

  const { data: profile, error: upsertError } = await supabase
    .from('profiles')
    .upsert({ id: session.user.id, phone: phoneDigits })
    .select('full_name')
    .single();
  if (upsertError) throw upsertError;

  return { session, hasName: !!profile?.full_name };
}

export async function signOutCustomer() {
  await supabase.auth.signOut();
}

export async function setProfileName(fullName: string) {
  const {
    data: { session },
  } = await supabase.auth.getSession();
  if (!session) throw new Error('Not signed in.');

  const { error } = await supabase.from('profiles').update({ full_name: fullName.trim() }).eq('id', session.user.id);
  if (error) throw error;
}
