import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';

// Import all API handlers
import healthHandler from './api/health';
import invitationHandler from './api/invitation';
import manifestHandler from './api/manifest';
import sepayCheckHandler from './api/sepay-check';
import sepayWebhookHandler from './api/sepay-webhook';
import zaloHandler from './api/zalo';
import trackHandler from './api/campaign/track';
import emailSendHandler from './api/email/send';
import emailTestHandler from './api/email/test-connection';
import oneSignalHandler from './api/onesignal/send-push';
import usersCreateHandler from './api/users/create';
import whatsappHandler from './api/whatsapp/send';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load env vars
dotenv.config({ path: path.resolve(__dirname, '.env.local') });
dotenv.config();

const app = express();

// Standard middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Helper to adapt Vercel serverless handlers to Express
const adapt = (handler: any) => async (req: express.Request, res: express.Response) => {
  try {
    // Ensure helper methods match VercelResponse
    if (!res.status) {
      (res as any).status = function (code: number) {
        res.statusCode = code;
        return this;
      };
    }
    await handler(req, res);
  } catch (err: any) {
    console.error('[API Error]', req.url, err);
    if (!res.headersSent) {
      res.status(500).json({ success: false, error: err.message || 'Internal Server Error' });
    }
  }
};

// Register API routes
app.all('/api/health', adapt(healthHandler));
app.all('/api/invitation', adapt(invitationHandler));
app.all('/api/manifest', adapt(manifestHandler));
app.all('/api/sepay-check', adapt(sepayCheckHandler));
app.all('/api/sepay-webhook', adapt(sepayWebhookHandler));
app.all('/api/zalo', adapt(zaloHandler));
app.all('/api/campaign/track', adapt(trackHandler));
app.all('/api/email/send', adapt(emailSendHandler));
app.all('/api/email/send-resend', adapt(emailSendHandler)); // Alias for send-resend
app.all('/api/email/test-connection', adapt(emailTestHandler));
app.all('/api/onesignal/send-push', adapt(oneSignalHandler));
app.all('/api/users/create', adapt(usersCreateHandler));
app.all('/api/whatsapp/send', adapt(whatsappHandler));

// Serve static frontend from dist
const distDir = path.resolve(__dirname, 'dist');
app.use(express.static(distDir));

// Specific html rewrites matching vercel.json
app.get('/check-registration', (req, res) => {
  res.sendFile(path.resolve(distDir, 'check-registration.html'));
});
app.get('/check-registration.html', (req, res) => {
  res.sendFile(path.resolve(distDir, 'check-registration.html'));
});

// SPA fallback for all other routes
app.get('*', (req, res) => {
  res.sendFile(path.resolve(distDir, 'index.html'));
});

const PORT = Number(process.env.PORT) || 3000;
app.listen(PORT, '0.0.0.0', () => {
  console.log(`[VSAPS 2026 Server] Running on http://0.0.0.0:${PORT}`);
});
