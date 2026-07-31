import type { VercelRequest, VercelResponse } from '@vercel/node';
import { createClient } from '@supabase/supabase-js';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(204).end();
  }

  const { campaignId, recipientEmail, url } = req.query;
  const redirectUrl = (url as string) || '/';

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

        let isNewClick = false;
        if (existing) {
          if (!existing.clicked_at) {
            isNewClick = true;
          }
          await supabase
            .from('campaign_activity')
            .update({
              clicked_at: new Date().toISOString(),
              clicked_url: redirectUrl,
              status: 'clicked'
            })
            .eq('id', existing.id);
        } else {
          isNewClick = true;
          const activityId = `ACT-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
          await supabase.from('campaign_activity').insert({
            id: activityId,
            campaign_id: campaignId,
            recipient_email: recipientEmail,
            sent_at: new Date().toISOString(),
            clicked_at: new Date().toISOString(),
            clicked_url: redirectUrl,
            status: 'clicked'
          });
        }

        if (isNewClick) {
          const { data: campaign } = await supabase
            .from('email_campaigns')
            .select('click_count')
            .eq('id', campaignId)
            .maybeSingle();

          if (campaign) {
            await supabase
              .from('email_campaigns')
              .update({ click_count: (campaign.click_count || 0) + 1 })
              .eq('id', campaignId);
          }
        }
      } catch (err) {
        console.error('Error tracking campaign click in DB:', err);
      }
    }
  }

  return res.redirect(302, redirectUrl);
}
