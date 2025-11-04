import * as supabaseLib from '@supabase/supabase-js';

import * as supabaseLib from '@supabase/supabase-js';

// Vercel Serverless Function handler
export default async function handler(req: any, res: any) {
  if (req.method !== 'POST') {
    res.status(405).json({ message: 'Method not allowed' });
    return;
  }

  try {
    const {
      business_name,
      contact_email,
      primary_category,
      location,
      your_story,
      sustainability_practices,
      document,
    } = req.body || {};

    if (!document || !document.base64 || !document.name) {
      return res.status(400).json({ message: 'No document provided' });
    }

    const SUPABASE_URL = process.env.SUPABASE_URL || '';
    const SUPABASE_SERVICE_ROLE = process.env.SUPABASE_SERVICE_ROLE || '';

    if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE) {
      console.warn('Supabase service role or URL not set.');
      return res.status(500).json({ message: 'Server not configured' });
    }

    const supabaseAdmin = (supabaseLib as any).createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE, {
      auth: { persistSession: false },
    });

    const buffer = Buffer.from(document.base64, 'base64');
    const bucket = 'vendor-documents';
    const filePath = `vendor_docs/${Date.now()}_${document.name}`;

    const { error: uploadError } = await supabaseAdmin.storage
      .from(bucket)
      .upload(filePath, buffer, {
        contentType: document.type || 'application/pdf',
        upsert: false,
      } as any);

    if (uploadError) {
      console.error('Supabase upload error:', uploadError);
      return res.status(500).json({ message: 'File upload failed', detail: uploadError });
    }

    const { data: publicData, error: publicErr } = supabaseAdmin.storage.from(bucket).getPublicUrl(filePath);
    if (publicErr) {
      console.warn('getPublicUrl error', publicErr);
    }
    const publicUrl = publicData?.publicUrl ?? null;

    const practices =
      typeof sustainability_practices === 'string'
        ? (sustainability_practices?.startsWith('[') ? JSON.parse(sustainability_practices) : sustainability_practices.split(',').map((s: string) => s.trim()))
        : sustainability_practices || [];

    const categoryMap: Record<string, string> = {
      home: 'Home & Living',
      fashion: 'Fashion & Accessories',
      art: 'Art & Collectibles',
      wellness: 'Wellness',
    };
    const normalizedCategory = categoryMap[primary_category] || primary_category;

    const { data: inserted, error: insertError } = await supabaseAdmin.from('vendors').insert([
      {
        business_name,
        contact_email,
        primary_category: normalizedCategory,
        location,
        your_story,
        sustainability_practices: practices,
        verification_document_url: publicUrl,
        status: 'pending',
      },
    ]).select();

    if (insertError) {
      console.error('Insert error:', insertError);
      return res.status(500).json({ message: 'Failed to save vendor application', detail: insertError });
    }

    // If a password was provided, create a Supabase Auth user using the service role
    const providedPassword = req.body?.password;
    let authUser = null;
    if (providedPassword) {
      try {
        const { data: userData, error: userErr } = await (supabaseAdmin.auth as any).admin.createUser({
          email: contact_email,
          password: providedPassword,
          email_confirm: false,
        } as any);
        if (userErr) {
          // If user already exists, ignore this error
          console.warn('Supabase createUser error (non-fatal):', userErr);
        } else {
          authUser = userData;
        }
      } catch (e) {
        console.error('Error creating supabase auth user:', e);
      }
    }

    return res.json({ message: 'Application submitted', status: 'pending', vendor: (inserted && inserted[0]) || null, authUser });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: 'Unexpected server error' });
  }
}
