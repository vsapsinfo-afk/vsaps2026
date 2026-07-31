import pg from 'pg';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.resolve(__dirname, '../.env.local') });

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  console.error('❌ DATABASE_URL is not configured in .env.local');
  process.exit(1);
}

const { Client } = pg;

const sql = `
-- 1. Create email_campaigns table
CREATE TABLE IF NOT EXISTS public.email_campaigns (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    subject TEXT NOT NULL,
    body TEXT NOT NULL,
    sent_count INTEGER DEFAULT 0,
    open_count INTEGER DEFAULT 0,
    click_count INTEGER DEFAULT 0,
    status TEXT DEFAULT 'draft' CHECK (status IN ('draft', 'sending', 'sent')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 2. Create campaign_activity table
CREATE TABLE IF NOT EXISTS public.campaign_activity (
    id TEXT PRIMARY KEY,
    campaign_id TEXT REFERENCES public.email_campaigns(id) ON DELETE CASCADE,
    recipient_email TEXT NOT NULL,
    sent_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    opened_at TIMESTAMP WITH TIME ZONE,
    clicked_at TIMESTAMP WITH TIME ZONE,
    clicked_url TEXT,
    status TEXT DEFAULT 'sent'
);

-- Enable RLS
ALTER TABLE public.email_campaigns ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.campaign_activity ENABLE ROW LEVEL SECURITY;

-- Add RLS Policies
DROP POLICY IF EXISTS "Allow authenticated manage email_campaigns" ON public.email_campaigns;
CREATE POLICY "Allow authenticated manage email_campaigns" ON public.email_campaigns
    TO authenticated
    USING (true)
    WITH CHECK (true);

DROP POLICY IF EXISTS "Allow public read email_campaigns" ON public.email_campaigns;
CREATE POLICY "Allow public read email_campaigns" ON public.email_campaigns
    FOR SELECT
    USING (true);

DROP POLICY IF EXISTS "Allow authenticated manage campaign_activity" ON public.campaign_activity;
CREATE POLICY "Allow authenticated manage campaign_activity" ON public.campaign_activity
    TO authenticated
    USING (true)
    WITH CHECK (true);

DROP POLICY IF EXISTS "Allow public read insert campaign_activity" ON public.campaign_activity;
CREATE POLICY "Allow public read insert campaign_activity" ON public.campaign_activity
    FOR ALL
    USING (true);
`;

async function run() {
  const client = new Client({
    connectionString,
    ssl: {
      rejectUnauthorized: false
    }
  });

  try {
    console.log('Connecting to PostgreSQL...');
    await client.connect();
    console.log('Connected. Running SQL migration...');
    await client.query(sql);
    console.log('✅ Successfully created email_campaigns and campaign_activity tables!');
  } catch (err) {
    console.error('❌ Error executing SQL:', err);
  } finally {
    await client.end();
  }
}

run();
