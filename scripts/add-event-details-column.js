import pg from 'pg';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.resolve(__dirname, '../.env.local') });

const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  console.error('❌ DATABASE_URL is missing in .env.local');
  process.exit(1);
}

const { Client } = pg;

async function run() {
  const client = new Client({
    connectionString,
    ssl: { rejectUnauthorized: false }
  });

  try {
    await client.connect();
    console.log('✅ Connected to PG database');
    
    // Add column if it doesn't exist
    const query = `
      ALTER TABLE public.business_config 
      ADD COLUMN IF NOT EXISTS event_details_config JSONB DEFAULT '{}'::jsonb;
    `;
    await client.query(query);
    console.log('🎉 Column event_details_config added successfully!');
  } catch (err) {
    console.error('❌ Migration failed:', err);
  } finally {
    await client.end();
  }
}

run();
