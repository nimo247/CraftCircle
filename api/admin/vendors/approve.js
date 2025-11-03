import { createClient } from '@supabase/supabase-js';

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
    return res.json({ vendor: data && data[0] });
  } catch (err) {
    console.error('approve error:', err);
    return res.status(500).json({ message: 'Unexpected server error' });
  }
}
