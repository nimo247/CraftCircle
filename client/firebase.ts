import { initializeApp } from "firebase/app";
import { supabase } from '@/supabaseClient';

export async function signInWithGooglePopup() {
  // Not implemented for Supabase in this wrapper
  return null;
}

export async function createUserEmail(name: string, email: string, password: string) {
  const { data, error } = await supabase.auth.signUp({ email, password, options: { data: { name } } });
  if (error) throw error;
  return { user: data.user, session: data.session };
}

export async function createUserEmailNoAutoSign(email: string, password: string) {
  const { data, error } = await supabase.auth.signUp({ email, password });
  if (error) throw error;
  // Supabase auto-signs in; sign out immediately
  await supabase.auth.signOut();
  return { email: data.user?.email };
}

export async function signInEmail(email: string, password: string) {
  const { data, error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) throw error;
  return { user: data.user, session: data.session };
}

export async function signInEmailNoVerify(email: string, password: string) {
  // Ensure vendor exists and is approved
  const res = await fetch(`/api/admin/vendors?email=${encodeURIComponent(email)}`);
  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new Error(`Failed to verify vendor status: ${res.status} ${body}`);
  }
  const json = await res.json().catch(() => ({}));
  const vendor = (json.vendors && json.vendors[0]) || null;
  if (!vendor) throw new Error('No vendor application found for this email');
  if (vendor.status !== 'approved') throw new Error('Vendor not approved yet');

  const { data, error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) throw error;
  return { user: data.user, session: data.session };
}

export async function signOutClient() {
  await supabase.auth.signOut();
}

export async function resendVerification(email: string, password: string) {
  // Supabase handles email confirmations automatically; provide a signIn to trigger
  const { data, error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) throw error;
  await supabase.auth.signOut();
  return { email: data.user?.email };
}

// Provide a tiny firebase-like shim for auth so existing components using firebase API continue to work
export function onAuthStateChanged(authOrCallback: any, maybeCb?: any) {
  // Support both signatures: (auth, cb) and (cb)
  let cb = maybeCb;
  let targetAuth = authOrCallback;
  if (typeof authOrCallback === 'function') {
    cb = authOrCallback;
    targetAuth = null;
  }
  if (!cb) return () => {};
  try {
    // if targetAuth is provided and has firebase-like API
    if (targetAuth && typeof targetAuth.onAuthStateChanged === 'function') {
      return targetAuth.onAuthStateChanged(cb);
    }
    // use supabase/session-based listener
    const init = async () => {
      try {
        const { data } = await supabase.auth.getSession();
        const user = data?.session?.user ?? null;
        cb(user);
      } catch (_) {
        cb(null);
      }
    };
    init();

    const { data: listener } = supabase.auth.onAuthStateChange((_event: any, session: any) => {
      cb(session?.user ?? null);
    });

    return () => { try { listener?.subscription?.unsubscribe?.(); } catch (_) {} };
  } catch (e) {
    return () => {};
  }
}

export const auth: any = {
  currentUser: null,
  onAuthStateChanged(callback: (u: any) => void) {
    // initialize current user
    try {
      supabase.auth.getSession().then(({ data }) => {
        auth.currentUser = data?.session?.user ?? null;
        callback(auth.currentUser);
      }).catch(() => {
        callback(null);
      });
    } catch (_) {
      callback(null);
    }

    // subscribe to changes
    const { data: listener } = supabase.auth.onAuthStateChange((_event: any, session: any) => {
      auth.currentUser = session?.user ?? null;
      callback(auth.currentUser);
    });

    return () => {
      try {
        listener?.subscription?.unsubscribe?.();
      } catch (_) {}
    };
  },
  // minimal signOut passthrough
  signOut: async () => supabase.auth.signOut(),
};

// global fallbacks for any leftover runtime references
try {
  // @ts-ignore
  window.onAuthStateChanged = onAuthStateChanged;
  // @ts-ignore
  window.__getAuth = () => auth;
} catch (_) {}
