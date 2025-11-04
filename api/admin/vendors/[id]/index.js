import { createClient } from '@supabase/supabase-js';

export default async function handler(req, res) {
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

    if (req.method === 'PATCH') {
      // support JSON body or query param or x-status header
      let status = undefined;
      if (typeof req.body === 'string') {
        try {
          const parsed = JSON.parse(req.body);
          status = parsed?.status;
        } catch (e) {
          // ignore
        }
      }
      status = status || (req.body && req.body.status) || req.query.status || req.headers['x-status'];
      if (!status) return res.status(400).json({ message: 'status is required' });
      status = String(status).trim();

      const { data, error } = await supabaseAdmin.from('vendors').update({ status }).eq('id', id).select();
      if (error) {
        console.error('Supabase update error (patch):', error);
        return res.status(500).json({ message: 'Failed to update vendor', detail: error });
      }
      return res.json({ vendor: data && data[0] });
    }

    return res.status(405).json({ message: 'Method not allowed' });
  } catch (err) {
    console.error('Admin/vendors/:id/index error:', err);
    return res.status(500).json({ message: 'Unexpected server error' });
  }
}
