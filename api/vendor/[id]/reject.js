import { createClient } from '@supabase/supabase-js';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.status(405).json({ message: 'Method not allowed' });
    return;
  }

  try {
    const { id } = req.query || {};
    if (!id) return res.status(400).json({ message: 'id is required' });

    const SUPABASE_URL = process.env.SUPABASE_URL || '';
    const SUPABASE_SERVICE_ROLE = process.env.SUPABASE_SERVICE_ROLE || '';
    if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE) {
      console.warn('Supabase service role or URL not set.');
      return res.status(500).json({ message: 'Server not configured' });
    }

    const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE, {
      auth: { persistSession: false },
    });

    const { data, error } = await supabaseAdmin.from('vendors').update({ status: 'rejected' }).eq('id', id).select();
    if (error) {
      console.error('Supabase update error (reject):', error);
      return res.status(500).json({ message: 'Failed to reject vendor', detail: error });
    }

    return res.json({ vendor: data && data[0] });
  } catch (err) {
    console.error('Admin/vendors/:id/reject error:', err);
    return res.status(500).json({ message: 'Unexpected server error' });
  }
}
