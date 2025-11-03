import { createClient } from '@supabase/supabase-js';

export default async function handler(req: any, res: any) {
  try {
    if (req.method !== 'GET') {
      res.status(405).json({ message: 'Method not allowed' });
      return;
    }

    const SUPABASE_URL = process.env.SUPABASE_URL || '';
    const SUPABASE_SERVICE_ROLE = process.env.SUPABASE_SERVICE_ROLE || '';
    if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE) {
      console.warn('Supabase service role or URL not set.');
      return res.status(500).json({ message: 'Server not configured' });
    }

    const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE, {
      auth: { persistSession: false },
    });

    const email = typeof req.query?.email === 'string' ? req.query.email : undefined;

    let result;
    if (email) {
      result = await supabaseAdmin.from('vendors').select('*').eq('contact_email', email).limit(1);
    } else {
      result = await supabaseAdmin.from('vendors').select('*').order('id', { ascending: false }).limit(200);
    }

    const { data, error } = result as any;
    if (error) {
      console.error('Supabase fetch error:', error);
      return res.status(500).json({ message: 'Failed to fetch vendors', detail: error });
    }

    return res.json({ vendors: data || [] });
  } catch (err) {
    console.error('Admin/vendors error:', err);
    return res.status(500).json({ message: 'Unexpected server error' });
  }
}
