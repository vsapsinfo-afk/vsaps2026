import type { VercelRequest, VercelResponse } from '@vercel/node';
import nodemailer from 'nodemailer';

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

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(204).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { smtpHost, smtpPort, smtpUser, smtpPass } = req.body;

  if (!smtpHost || !smtpUser || !smtpPass) {
    return res.status(400).json({
      success: false,
      message: "Cung cấp thiếu thông tin máy chủ SMTP (Host, User, Pass).",
    });
  }

  try {
    const n = normalizeSmtp({ smtpHost, smtpPort, smtpUser, smtpPass });
    const transporter = nodemailer.createTransport({
      host: n.host,
      port: n.port,
      secure: n.port === 465,
      auth: { user: n.user, pass: n.pass },
      tls: { rejectUnauthorized: false },
    });

    await transporter.verify();
    return res.json({
      success: true,
      message: `Kết nối thành công đến máy chủ SMTP ${smtpHost}!`,
    });
  } catch (err: any) {
    const raw = String(err?.message ?? '') || 'Lỗi SMTP không xác định';
    const detail = [err?.responseCode, err?.response, raw].map(v => String(v ?? '')).join(' ');
    let hint = '';
    if (/454[-\s]?4\.7\.0|too many login attempts/i.test(detail)) {
      hint = ' — Google đang TẠM KHOÁ đăng nhập vì có quá nhiều lần thử. Hãy DỪNG lại và chờ ít nhất 1 giờ.'
        + ' Mỗi lần bấm kiểm tra lại sẽ kéo dài thêm thời gian khoá.';
    } else if (/534[-\s]?5\.7\.9|webloginrequired/i.test(detail)) {
      hint = ' — Gmail không chấp nhận mật khẩu. Kiểm tra ô mật khẩu đang là Mật khẩu ứng dụng 16 ký tự viết liền.';
    } else if (/535[-\s]?5\.7\.8/i.test(detail)) {
      hint = ' — Sai tài khoản hoặc mật khẩu SMTP.';
    }
    return res.json({
      success: false,
      message: `Hệ thống từ chối kết nối: ${raw}${hint}`,
    });
  }
}
