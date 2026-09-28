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
/**
 * Google hiển thị Mật khẩu ứng dụng thành 4 nhóm 4 ký tự có dấu cách
 * ("apbu pqsm kpbw jhnt"). Dán nguyên dấu cách vào ô mật khẩu sẽ bị Gmail
 * từ chối với lỗi "534-5.7.9 WebLoginRequired", nên bỏ sạch khoảng trắng
 * khi máy chủ là Gmail/Google. Với máy chủ khác chỉ cắt khoảng trắng hai đầu
 * để không phá mật khẩu có dấu cách hợp lệ.
 */
const normalizeSmtp = (c: any) => {
  const host = String(c?.smtpHost ?? '').trim();
  const rawPass = String(c?.smtpPass ?? '');
  return {
    host,
    port: Number(c?.smtpPort) || 587,
    user: String(c?.smtpUser ?? '').trim(),
    pass: /gmail|google/i.test(host) ? rawPass.replace(/\s+/g, '') : rawPass.trim(),
  };
};

let cachedTransport: { key: string; transporter: nodemailer.Transporter } | null = null;

const buildTransportKey = (c: any) => {
  const n = normalizeSmtp(c);
  return [n.host, n.port, n.user, n.pass].join('|');
};

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

  const n = normalizeSmtp(config);
  const transporter = nodemailer.createTransport({
    host: n.host,
    port: n.port,
    secure: n.port === 465,
    auth: {
      user: n.user,
      pass: n.pass,
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
const TRANSIENT_SMTP = /(?:^|[^0-9])(421|450|451|452)(?:[^0-9]|$)/;

/**
 * 454-4.7.0 "Too many login attempts" là Google tạm khoá đăng nhập.
 * Thử lại sau vài giây chỉ tạo thêm một lần đăng nhập nữa và KÉO DÀI thời gian
 * bị khoá, nên tuyệt đối không retry trong cùng một lượt gọi. Khoá này tính
 * bằng giờ, phải để người dùng dừng lại và chờ.
 */
const AUTH_THROTTLED = /454[-\s]?4\.7\.0|too many login attempts/i;

const errText = (err: any) =>
  [err?.responseCode, err?.response, err?.message].map(v => String(v ?? '')).join(' ');

const isTransientError = (err: any) => {
  const text = errText(err);
  if (AUTH_THROTTLED.test(text)) return false;
  return (
    TRANSIENT_SMTP.test(text) ||
    ['ETIMEDOUT', 'ECONNECTION', 'ECONNRESET', 'ESOCKET'].includes(err?.code)
  );
};

/** Dịch mã lỗi SMTP khó hiểu thành hướng xử lý cụ thể cho Ban thư ký. */
const explainSmtpError = (err: any) => {
  const msg = String(err?.message ?? '') || 'Lỗi khi gửi mail SMTP';
  const text = errText(err);
  if (AUTH_THROTTLED.test(text)) {
    return msg + ' — Google đang TẠM KHOÁ đăng nhập vì có quá nhiều lần thử. '
      + 'Hãy DỪNG gửi và chờ ít nhất 1 giờ. Mỗi lần bấm thử lại sẽ kéo dài thêm thời gian khoá.';
  }
  if (/534[-\s]?5\.7\.9|webloginrequired/i.test(text)) {
    return msg + ' — Gmail không chấp nhận mật khẩu. Kiểm tra ô mật khẩu đang là '
      + 'Mật khẩu ứng dụng 16 ký tự viết liền, không phải mật khẩu Gmail thường.';
  }
  if (/535[-\s]?5\.7\.8/i.test(text)) {
    return msg + ' — Sai tài khoản hoặc mật khẩu SMTP.';
  }
  return msg;
};

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
    error: explainSmtpError(lastError),
    retryable: isTransientError(lastError),
  });
}
