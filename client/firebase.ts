import { supabase } from '@/supabaseClient';
import { initializeApp, type FirebaseApp } from 'firebase/app';
import {
  getAuth,
  GoogleAuthProvider,
  signInWithPopup,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  sendEmailVerification,
  signOut as firebaseSignOut,
  onAuthStateChanged as firebaseOnAuthStateChanged,
  updateProfile,
} from 'firebase/auth';

let firebaseApp: FirebaseApp | null = null;
let firebaseAuth: ReturnType<typeof getAuth> | null = null;

// Attempt to initialize Firebase using Vite env vars or a global window variable
try {
  const cfg = (globalThis as any).__FIREBASE_CONFIG__ ||
    (import.meta.env && import.meta.env.VITE_FIREBASE_CONFIG
      ? JSON.parse(import.meta.env.VITE_FIREBASE_CONFIG)
      : null);

  if (cfg && cfg.apiKey) {
    firebaseApp = initializeApp(cfg as any);
    firebaseAuth = getAuth(firebaseApp);
  }
} catch (e) {
  // ignore initialize errors — we'll fallback to supabase where possible
}

function ensureFirebase() {
  if (!firebaseAuth) throw new Error('Firebase not configured on the client');
  return firebaseAuth;
}

export async function signInWithGooglePopup() {
  const auth = ensureFirebase();
  const provider = new GoogleAuthProvider();
  provider.setCustomParameters({ prompt: 'select_account' });
  const result = await signInWithPopup(auth, provider);
  const user = result.user;
  const token = await user.getIdToken();
  return { user, token };
}

export async function createUserEmail(name: string, email: string, password: string) {
  try {
    const auth = ensureFirebase();
    const cred = await createUserWithEmailAndPassword(auth, email, password);
    // attach displayName if provided
    if (name) {
      try {
        await updateProfile(cred.user, { displayName: name });
      } catch (_) {}
    }
    // send verification email
    await sendEmailVerification(cred.user);
    return { user: cred.user };
  } catch (e) {
    // fallback to Supabase if Firebase not available or fails
    const { data, error } = await supabase.auth.signUp({ email, password, options: { data: { name } } });
    if (error) throw error;
    return { user: data.user, session: data.session };
  }
}

export async function createUserEmailNoAutoSign(email: string, password: string) {
  try {
    const auth = ensureFirebase();
    const cred = await createUserWithEmailAndPassword(auth, email, password);
    await sendEmailVerification(cred.user);
    await firebaseSignOut(auth);
    return { email: cred.user.email };
  } catch (e) {
    const { data, error } = await supabase.auth.signUp({ email, password });
    if (error) throw error;
    await supabase.auth.signOut();
    return { email: data.user?.email };
  }
}

export async function signInEmail(email: string, password: string) {
  try {
    const auth = ensureFirebase();
    const cred = await signInWithEmailAndPassword(auth, email, password);
    const token = await cred.user.getIdToken();
    return { user: cred.user, token };
  } catch (e) {
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) throw error;
    return { user: data.user, session: data.session, token: data.session?.access_token };
  }
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

  try {
    const auth = ensureFirebase();
    const cred = await signInWithEmailAndPassword(auth, email, password);
    const token = await cred.user.getIdToken();
    return { user: cred.user, token };
  } catch (e) {
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) throw error;
    return { user: data.user, session: data.session, token: data.session?.access_token };
  }
}

export async function signOutClient() {
  if (firebaseAuth) {
    await firebaseSignOut(firebaseAuth);
    return;
  }
  await supabase.auth.signOut();
}

export async function resendVerification(email: string, password: string) {
  try {
    const auth = ensureFirebase();
    const cred = await signInWithEmailAndPassword(auth, email, password);
    await sendEmailVerification(cred.user);
    await firebaseSignOut(auth);
    return { email: cred.user.email };
  } catch (e) {
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) throw error;
    await supabase.auth.signOut();
    return { email: data.user?.email };
  }
}

// Provide a tiny firebase-like shim for auth so existing components using firebase API continue to work
export function onAuthStateChanged(authOrCallback: any, maybeCb?: any) {
  let cb = maybeCb;
  let targetAuth = authOrCallback;
  if (typeof authOrCallback === 'function') {
    cb = authOrCallback;
    targetAuth = null;
  }
  if (!cb) return () => {};

  try {
    if (targetAuth && typeof targetAuth.onAuthStateChanged === 'function') {
      return targetAuth.onAuthStateChanged(cb);
    }

    if (firebaseAuth) {
      return firebaseOnAuthStateChanged(firebaseAuth, cb as any);
    }

    // fallback to supabase/session-based listener
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
    try {
      if (firebaseAuth) {
        firebaseOnAuthStateChanged(firebaseAuth, (u: any) => {
          auth.currentUser = u;
          callback(u);
        });
        return () => {};
      }

      supabase.auth.getSession().then(({ data }) => {
        auth.currentUser = data?.session?.user ?? null;
        callback(auth.currentUser);
      }).catch(() => {
        callback(null);
      });
    } catch (_) {
      callback(null);
    }

    const { data: listener } = supabase.auth.onAuthStateChange((_event: any, session: any) => {
      auth.currentUser = session?.user ?? null;
      callback(auth.currentUser);
    });

    return () => { try { listener?.subscription?.unsubscribe?.(); } catch (_) {} };
  },
  // minimal signOut passthrough
  signOut: async () => signOutClient(),
};

// global fallbacks for any leftover runtime references
try {
  // @ts-ignore
  window.onAuthStateChanged = onAuthStateChanged;
  // @ts-ignore
  window.__getAuth = () => auth;
} catch (_) {}
