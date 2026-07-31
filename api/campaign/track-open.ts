import type { VercelRequest, VercelResponse } from '@vercel/node';
import { createClient } from '@supabase/supabase-js';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(204).end();
  }

  const { campaignId, recipientEmail } = req.query;

  if (campaignId && recipientEmail) {
    const supabaseUrl = process.env.VITE_SUPABASE_URL || '';
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

    if (supabaseUrl && supabaseServiceKey) {
      try {
        const supabase = createClient(supabaseUrl, supabaseServiceKey);
        
        const { data: existing } = await supabase
          .from('campaign_activity')
          .select('*')
          .eq('campaign_id', campaignId)
          .eq('recipient_email', recipientEmail)
          .maybeSingle();

        if (existing) {
          if (!existing.opened_at) {
            await supabase
              .from('campaign_activity')
              .update({ opened_at: new Date().toISOString(), status: 'opened' })
              .eq('id', existing.id);

            const { data: campaign } = await supabase
              .from('email_campaigns')
              .select('open_count')
              .eq('id', campaignId)
              .maybeSingle();

            if (campaign) {
              await supabase
                .from('email_campaigns')
                .update({ open_count: (campaign.open_count || 0) + 1 })
                .eq('id', campaignId);
            }
          }
        } else {
          const activityId = `ACT-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
          await supabase.from('campaign_activity').insert({
            id: activityId,
            campaign_id: campaignId,
            recipient_email: recipientEmail,
            sent_at: new Date().toISOString(),
            opened_at: new Date().toISOString(),
            status: 'opened'
          });

          const { data: campaign } = await supabase
            .from('email_campaigns')
            .select('open_count')
            .eq('id', campaignId)
            .maybeSingle();

          if (campaign) {
            await supabase
              .from('email_campaigns')
              .update({ open_count: (campaign.open_count || 0) + 1 })
              .eq('id', campaignId);
          }
        }
      } catch (err) {
        console.error('Error tracking campaign open in DB:', err);
      }
    }
  }

  const pixel = Buffer.from(
    'R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7',
    'base64'
  );
  res.setHeader('Content-Type', 'image/gif');
  res.setHeader('Content-Length', pixel.length.toString());
  res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, private');
  return res.status(200).send(pixel);
}
