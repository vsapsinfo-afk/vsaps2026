import type { VercelRequest, VercelResponse } from '@vercel/node';

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

  const { appId, secretKey, refreshToken } = req.body;

  if (!appId || !secretKey || !refreshToken) {
    return res.status(400).json({
      success: false,
      message: "Không đủ thông tin để cấp lại Token (Thiếu App ID, Secret Key hoặc Refresh Token).",
    });
  }

  // Bypass/mock if sandbox token is used
  if (refreshToken === 'zalo-refresh-token-active-2026-ready-vsaps') {
    return res.json({
      success: true,
      accessToken: "zalo-oa-token-refreshed-" + Math.floor(Math.random() * 90000 + 10000),
      refreshToken: "zalo-refresh-token-refreshed-" + Math.floor(Math.random() * 90000 + 10000),
      expiresIn: 86400, // 24 hours
      message: "Cấp mới Access Token Sandbox thành công (Mô phỏng)!",
    });
  }

  try {
    const response = await fetch("https://oauth.zaloapp.com/v4/oa/access_token", {
      method: "POST",
      headers: {
        "secret_key": secretKey,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: new URLSearchParams({
        refresh_token: refreshToken,
        app_id: appId,
        grant_type: "refresh_token",
      }).toString(),
    });

    const resJson = await response.json();

    if (resJson && resJson.access_token) {
      return res.json({
        success: true,
        accessToken: resJson.access_token,
        refreshToken: resJson.refresh_token || refreshToken, // fallback if not returned
        expiresIn: resJson.expires_in,
        message: "Lấy Access Token mới thành công từ Zalo OAuth API Gateway!",
      });
    } else {
      return res.json({
        success: false,
        message: `Zalo OAuth trả về lỗi: ${resJson.error_description || resJson.message || JSON.stringify(resJson)}`,
      });
    }
  } catch (err: any) {
    return res.json({
      success: false,
      message: `Lỗi kết nối cổng Zalo OAuth: ${err.message}`,
    });
  }
}
