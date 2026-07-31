import type { VercelRequest, VercelResponse } from '@vercel/node';
import nodemailer from 'nodemailer';
import { createClient } from '@supabase/supabase-js';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(204).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { apiKey, from, to, subject, html, provider } = req.body;

  if (provider === 'resend' || apiKey) {
    if (!apiKey) {
      return res.status(400).json({ success: false, error: 'Resend API Key (apiKey) is required.' });
    }
    if (!from) {
      return res.status(400).json({ success: false, error: 'Sender email (from) is required.' });
    }
    if (!to) {
      return res.status(400).json({ success: false, error: 'Recipient email (to) is required.' });
    }

    try {
      const response = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiKey}`
        },
        body: JSON.stringify({
          from,
          to,
          subject: subject || 'Thông báo từ Ban Tổ Chức',
          html: html || req.body.body
        })
      });

      const data = await response.json();
      if (response.ok) {
        return res.status(200).json({
          success: true,
          id: data.id,
          message: 'Email sent successfully via Resend API'
        });
      } else {
        return res.status(response.status).json({
          success: false,
          error: data.message || JSON.stringify(data)
        });
      }
    } catch (error: any) {
      return res.status(500).json({
        success: false,
        error: error.message || 'Error connecting to Resend API'
      });
    }
  }

  let { config, payload } = req.body;

  if (!config || !config.smtpHost || !config.smtpUser || !config.smtpPass) {
    const supabaseUrl = process.env.VITE_SUPABASE_URL || '';
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
    
    if (supabaseUrl && supabaseServiceKey) {
      try {
        const supabase = createClient(supabaseUrl, supabaseServiceKey);
        const { data, error } = await supabase
          .from('system_config')
          .select('value')
          .eq('key', 'email_config')
          .single();
          
        if (!error && data && data.value) {
          const dbConfig = data.value;
          config = {
            ...dbConfig,
            ...Object.fromEntries(
              Object.entries(config || {}).filter(([_, v]) => v !== '' && v !== null && v !== undefined)
            )
          };
        }
      } catch (dbErr: any) {
        console.error('Error fetching email config from Supabase:', dbErr);
      }
    }
  }

  if (!config || !config.smtpHost || !config.smtpUser || !config.smtpPass) {
    return res.status(400).json({
      success: false,
      error: "SMTP server configuration is incomplete.",
    });
  }

  if (!payload || !payload.to) {
    return res.status(400).json({
      success: false,
      error: "Recipient email (to) is missing in payload.",
    });
  }

  try {
    const isSecure = Number(config.smtpPort) === 465;
    const transporter = nodemailer.createTransport({
      host: config.smtpHost,
      port: Number(config.smtpPort) || 587,
      secure: isSecure,
      auth: {
        user: config.smtpUser,
        pass: config.smtpPass,
      },
      tls: {
        rejectUnauthorized: false,
      },
    });

    const mailOptions = {
      from: {
        name: config.senderName || "VSAPS 2026 BTC",
        address: config.senderEmail || config.smtpUser,
      },
      to: payload.to,
      subject: payload.subject || "Thư xác nhận VSAPS 2026",
      html: payload.body,
    };

    const info = await transporter.sendMail(mailOptions);
    return res.json({
      success: true,
      messageId: info.messageId,
      response: info.response,
      server: config.smtpHost,
    });
  } catch (err: any) {
    let errorMessage = err.message || "Lỗi khi gửi mail SMTP";
    return res.status(500).json({
      success: false,
      error: errorMessage,
    });
  }
}
