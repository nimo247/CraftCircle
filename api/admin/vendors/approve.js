import { createClient } from '@supabase/supabase-js';
import admin from 'firebase-admin';

async function initFirebaseAdmin() {
  if (admin.apps && admin.apps.length) return;
  let serviceAccount = undefined;

  if (process.env.SERVICE_ACCOUNT_SECRET_URL) {
    try {
      const res = await fetch(process.env.SERVICE_ACCOUNT_SECRET_URL);
      if (res.ok) {
        serviceAccount = await res.json();
      } else {
        console.warn('Failed to fetch SERVICE_ACCOUNT_SECRET_URL', res.status);
      }
    } catch (err) {
      console.error('Error fetching SERVICE_ACCOUNT_SECRET_URL', err);
    }
  }

  if (!serviceAccount && process.env.SERVICE_ACCOUNT_JSON_B64) {
    try {
      const decoded = Buffer.from(process.env.SERVICE_ACCOUNT_JSON_B64, 'base64').toString('utf8');
      serviceAccount = JSON.parse(decoded);
    } catch (err) {
      console.error('Failed to parse SERVICE_ACCOUNT_JSON_B64', err);
    }
  }

  if (!serviceAccount && process.env.SERVICE_ACCOUNT_JSON) {
    try {
      serviceAccount = JSON.parse(process.env.SERVICE_ACCOUNT_JSON);
    } catch (err) {
      console.error('Failed to parse SERVICE_ACCOUNT_JSON', err);
    }
  }

  if (serviceAccount) {
    try {
      admin.initializeApp({
        credential: admin.credential.cert(serviceAccount),
      });
      console.log('firebase-admin initialized in serverless function');
    } catch (err) {
      console.error('Failed to initialize firebase-admin', err);
    }
  } else {
    console.warn('No Firebase service account available; skipping Firebase operations');
  }
}

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ message: 'Method not allowed' });
  try {
    const id = req.query?.id || (req.body && (req.body.id || req.body.vendor_id));
    if (!id) return res.status(400).json({ message: 'id is required (as query param or JSON body)' });

    const SUPABASE_URL = process.env.SUPABASE_URL || '';
    const SUPABASE_SERVICE_ROLE = process.env.SUPABASE_SERVICE_ROLE || '';
    if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE) return res.status(500).json({ message: 'Server not configured' });

    const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE, { auth: { persistSession: false } });
    const { data, error } = await supabaseAdmin.from('vendors').update({ status: 'approved' }).eq('id', id).select();
    if (error) {
      console.error('Supabase update error (approve):', error);
      return res.status(500).json({ message: 'Failed to approve vendor', detail: error });
    }

    const vendor = data && data[0];
    if (!vendor) return res.status(404).json({ message: 'Vendor not found after update' });

    // Try to create Firebase user and generate password reset link so vendor can set password
    let resetLink = null;
    try {
      await initFirebaseAdmin();
      if (admin.apps && admin.apps.length) {
        try {
          // create user if not exists
          try {
            await admin.auth().getUserByEmail(vendor.contact_email);
          } catch (e) {
            if (e && e.code === 'auth/user-not-found') {
              await admin.auth().createUser({ email: vendor.contact_email });
              console.log('Created firebase user for', vendor.contact_email);
            } else {
              console.warn('getUserByEmail error (non-critical):', e);
            }
          }

          // generate password reset link
          try {
            resetLink = await admin.auth().generatePasswordResetLink(vendor.contact_email);
            console.log('Generated password reset link for', vendor.contact_email);
          } catch (e) {
            console.error('Failed to generate password reset link:', e);
          }
        } catch (e) {
          console.error('Firebase user creation/reset flow failed:', e);
        }
      }
    } catch (e) {
      console.error('Firebase init failed, skipping Firebase user creation:', e);
    }

    return res.json({ vendor, resetLink });
  } catch (err) {
    console.error('approve error:', err);
    return res.status(500).json({ message: 'Unexpected server error' });
  }
}
