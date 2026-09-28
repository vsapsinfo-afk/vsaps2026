import type { VercelRequest, VercelResponse } from '@vercel/node';
import nodemailer from 'nodemailer';
import { createClient } from '@supabase/supabase-js';

/**
 * Gmail trả về "454-4.7.0 Too many login attempts" khi bị đăng nhập dồn dập.
 * Trước đây mỗi email tạo một transporter mới => mỗi email là một lần đăng nhập
 * SMTP riêng; gửi hàng loạt >100 thư chắc chắn bị chặn.
 *
 * Transporter dạng pool được giữ ở phạm vi module nên các lần gọi hàm liên tiếp
 * trên cùng một container serverless đang "ấm" sẽ dùng lại đúng một kết nối đã
 * xác thực, thay vì đăng nhập lại từ đầu.
 */
let cachedTransport: { key: string; transporter: nodemailer.Transporter } | null = null;

const buildTransportKey = (c: any) =>
  [c.smtpHost, c.smtpPort, c.smtpUser, c.smtpPass].join('|');

const disposeCachedTransport = () => {
  if (!cachedTransport) return;
  try {
    cachedTransport.transporter.close();
  } catch {
    /* kết nối đã đóng sẵn */
  }
  cachedTransport = null;
};

const getTransporter = (config: any) => {
  const key = buildTransportKey(config);
  if (cachedTransport && cachedTransport.key === key) {
    return cachedTransport.transporter;
  }
  disposeCachedTransport();

  const transporter = nodemailer.createTransport({
    host: config.smtpHost,
    port: Number(config.smtpPort) || 587,
    secure: Number(config.smtpPort) === 465,
    auth: {
      user: config.smtpUser,
      pass: config.smtpPass,
    },
    pool: true,
    maxConnections: 1,
    maxMessages: Infinity,
    rateDelta: 1000,
    rateLimit: 3,
    tls: {
      rejectUnauthorized: false,
    },
  });

  cachedTransport = { key, transporter };
  return transporter;
};

// Mã SMTP 4xx là lỗi tạm thời (nghẽn, chặn tạm) -> đáng thử lại.
const TRANSIENT_SMTP = /(?:^|[^0-9])(421|450|451|452|454)(?:[^0-9]|$)/;

const isTransientError = (err: any) =>
  TRANSIENT_SMTP.test(String(err?.responseCode ?? '')) ||
  TRANSIENT_SMTP.test(String(err?.response ?? '')) ||
  TRANSIENT_SMTP.test(String(err?.message ?? '')) ||
  ['ETIMEDOUT', 'ECONNECTION', 'ECONNRESET', 'ESOCKET'].includes(err?.code);

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

  const mailOptions = {
    from: {
      name: config.senderName || "VSAPS 2026 BTC",
      address: config.senderEmail || config.smtpUser,
    },
    to: payload.to,
    subject: payload.subject || "Thư xác nhận VSAPS 2026",
    html: payload.body,
  };

  // Giữ tổng thời gian chạy dưới giới hạn mặc định của Vercel:
  // xấu nhất = gửi + 1,5s chờ + gửi lại. Trường hợp bị chặn kéo dài thì dùng
  // nút "Gửi lại các dòng thất bại" ở màn hình gửi hàng loạt.
  const MAX_ATTEMPTS = 2;
  let lastError: any = null;

  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
    try {
      const info = await getTransporter(config).sendMail(mailOptions);
      return res.json({
        success: true,
        messageId: info.messageId,
        response: info.response,
        server: config.smtpHost,
        attempts: attempt,
      });
    } catch (err: any) {
      lastError = err;

      // Socket trong pool có thể đã chết sau khi container bị đóng băng,
      // hoặc máy chủ vừa chặn tạm: bỏ kết nối cũ để lần sau đăng nhập lại sạch sẽ.
      disposeCachedTransport();

      if (attempt === MAX_ATTEMPTS || !isTransientError(err)) break;
      await new Promise((r) => setTimeout(r, 1500));
    }
  }

  return res.status(500).json({
    success: false,
    error: lastError?.message || "Lỗi khi gửi mail SMTP",
    retryable: isTransientError(lastError),
  });
}
