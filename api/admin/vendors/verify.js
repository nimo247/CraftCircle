import { createClient } from '@supabase/supabase-js';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.status(405).json({ message: 'Method not allowed' });
    return;
  }

  try {
    const { email } = req.body || {};
    if (!email) return res.status(400).json({ message: 'email is required' });

    const SUPABASE_URL = process.env.SUPABASE_URL || '';
    const SUPABASE_SERVICE_ROLE = process.env.SUPABASE_SERVICE_ROLE || '';
    if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE) {
      console.warn('Supabase service role or URL not set.');
      return res.status(500).json({ message: 'Server not configured' });
    }

    const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE, {
      auth: { persistSession: false },
    });

    const { data, error } = await supabaseAdmin.from('vendors').select('*').eq('contact_email', email).limit(1);
    if (error) {
      console.error('Supabase fetch error:', error);
      return res.status(500).json({ message: 'Failed to fetch vendor', detail: error });
    }

    const vendor = (data && data.length > 0) ? data[0] : null;
    return res.json({ vendor });
  } catch (err) {
    console.error('Admin/vendors/verify error:', err);
    return res.status(500).json({ message: 'Unexpected server error' });
  }
}
