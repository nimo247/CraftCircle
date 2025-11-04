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

export const auth = supabase.auth;
