import type { VercelRequest, VercelResponse } from '@vercel/node';
import { createClient } from '@supabase/supabase-js';

// Helper to get Supabase admin client
function getSupabaseAdmin() {
  const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL || '';
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY || '';
  
  if (supabaseUrl && supabaseServiceKey) {
    return createClient(supabaseUrl, supabaseServiceKey);
  }
  return null;
}

// Fetch Zalo config from Supabase system_config table
async function getZaloConfigFromSupabase() {
  const supabase = getSupabaseAdmin();
  if (!supabase) return null;
  try {
    const { data, error } = await supabase
      .from('system_config')
      .select('value')
      .eq('key', 'zalo_config')
      .single();
    if (!error && data && data.value) {
      return data.value;
    }
  } catch (err) {
    console.error('[Zalo API] Error fetching zalo_config from Supabase:', err);
  }
  return null;
}

// Save updated Zalo config back to Supabase system_config table
async function saveZaloConfigToSupabase(config: any) {
  const supabase = getSupabaseAdmin();
  if (!supabase) return false;
  try {
    const { error } = await supabase
      .from('system_config')
      .upsert({
        key: 'zalo_config',
        value: config
      });
    if (!error) {
      console.log('[Zalo API] Updated zalo_config in Supabase successfully.');
      return true;
    } else {
      console.error('[Zalo API] Error saving zalo_config to Supabase:', error);
    }
  } catch (err) {
    console.error('[Zalo API] Exception saving zalo_config to Supabase:', err);
  }
  return false;
}

// Core Token Refresh function that handles API call + atomic DB save
async function refreshZaloTokenCore(params: { appId?: string; secretKey?: string; refreshToken?: string }) {
  let dbConfig = await getZaloConfigFromSupabase() || {};
  
  const appId = params.appId || dbConfig.appId;
  const secretKey = params.secretKey || dbConfig.secretKey;
  const refreshToken = params.refreshToken || dbConfig.refreshToken;

  if (!appId || !secretKey || !refreshToken) {
    return {
      success: false,
      message: "Thiếu thông tin App ID, Secret Key hoặc Refresh Token để gia hạn."
    };
  }

  // Sandbox simulation mode
  if (refreshToken === 'zalo-refresh-token-active-2026-ready-vsaps') {
    const newAccessToken = "zalo-oa-token-refreshed-" + Math.floor(Math.random() * 90000 + 10000);
    const newRefreshToken = "zalo-refresh-token-refreshed-" + Math.floor(Math.random() * 90000 + 10000);
    const updatedConfig = {
      ...dbConfig,
      appId,
      secretKey,
      accessToken: newAccessToken,
      refreshToken: newRefreshToken,
      accessTokenUpdatedAt: new Date().toISOString()
    };
    await saveZaloConfigToSupabase(updatedConfig);
    return {
      success: true,
      accessToken: newAccessToken,
      refreshToken: newRefreshToken,
      expiresIn: 86400,
      message: "Cấp mới Access Token Sandbox thành công (Mô phỏng)!",
      config: updatedConfig
    };
  }

  try {
    const oauthBase = process.env.ZALO_OAUTH_BASE_URL || "https://oauth.zaloapp.com";
    const zaloUrl = `${oauthBase}/v4/oa/access_token`;

    const fetchOptions: any = {
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
    };

    const proxyUrl = process.env.ZALO_PROXY_URL || process.env.HTTP_PROXY || process.env.HTTPS_PROXY;
    if (proxyUrl) {
      try {
        const undici = await import('undici');
        fetchOptions.dispatcher = new undici.ProxyAgent(proxyUrl);
      } catch (proxyErr) {
        console.error('[Zalo OAuth API] Proxy init error:', proxyErr);
      }
    }

    const response = await fetch(zaloUrl, fetchOptions);
    const resJson = await response.json();

    if (resJson && resJson.access_token) {
      const newAccessToken = resJson.access_token;
      const newRefreshToken = resJson.refresh_token || refreshToken;
      
      const updatedConfig = {
        ...dbConfig,
        appId,
        secretKey,
        accessToken: newAccessToken,
        refreshToken: newRefreshToken,
        accessTokenUpdatedAt: new Date().toISOString()
      };

      // CRITICAL: Immediately persist new access & refresh tokens to Supabase!
      await saveZaloConfigToSupabase(updatedConfig);

      return {
        success: true,
        accessToken: newAccessToken,
        refreshToken: newRefreshToken,
        expiresIn: resJson.expires_in,
        message: "Lấy Access Token mới thành công và đã lưu vào CSDL Supabase!",
        config: updatedConfig
      };
    } else {
      return {
        success: false,
        message: `Zalo OAuth trả về lỗi: ${resJson.error_description || resJson.message || JSON.stringify(resJson)}`
      };
    }
  } catch (err: any) {
    return {
      success: false,
      message: `Lỗi kết nối cổng Zalo OAuth: ${err.message}`
    };
  }
}

// Handler for Zalo Send ZNS Message
async function handleSend(req: VercelRequest, res: VercelResponse) {
  let { config, payload } = req.body || {};
  let dbConfig = await getZaloConfigFromSupabase();

  if (dbConfig) {
    config = {
      ...dbConfig,
      ...Object.fromEntries(
        Object.entries(config || {}).filter(([_, v]) => v !== '' && v !== null && v !== undefined)
      )
    };
  }

  // Check if token age >= 23 hours -> auto refresh first!
  const updatedAt = config?.accessTokenUpdatedAt ? new Date(config.accessTokenUpdatedAt).getTime() : 0;
  const ageHrs = updatedAt > 0 ? (Date.now() - updatedAt) / (1000 * 60 * 60) : 999;

  if (config && config.refreshToken && config.appId && config.secretKey && ageHrs >= 23) {
    console.log(`[Zalo Send API] Token is ${ageHrs.toFixed(1)} hrs old, auto-refreshing before sending...`);
    const refreshRes = await refreshZaloTokenCore({
      appId: config.appId,
      secretKey: config.secretKey,
      refreshToken: config.refreshToken
    });
    if (refreshRes.success && refreshRes.accessToken) {
      config.accessToken = refreshRes.accessToken;
      if (refreshRes.refreshToken) config.refreshToken = refreshRes.refreshToken;
    }
  }

  if (!config || !config.accessToken) {
    return res.status(400).json({
      success: false,
      error: "Zalo access token is required.",
    });
  }

  try {
    const apiBase = process.env.ZALO_API_BASE_URL || "https://business.openapi.zalo.me";
    const zaloUrl = `${apiBase}/message/template`;

    const phone = payload?.phone || (payload?.recipient && payload.recipient.phone);
    let phoneStr = String(phone || '').replace(/[^0-9+]/g, '');
    if (phoneStr.startsWith('0')) {
      phoneStr = '84' + phoneStr.substring(1);
    }

    const requestBody: any = {
      phone: phoneStr,
      template_id: payload?.template_id,
      template_data: payload?.template_data,
      tracking_id: payload?.tracking_id || `tracking_${Date.now()}`
    };

    if (payload?.sending_mode) {
      requestBody.sending_mode = payload.sending_mode;
    }

    const doSend = async (tokenToUse: string) => {
      const fetchOptions: any = {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "access_token": tokenToUse,
        },
        body: JSON.stringify(requestBody),
      };

      const proxyUrl = process.env.ZALO_PROXY_URL || process.env.HTTP_PROXY || process.env.HTTPS_PROXY;
      if (proxyUrl) {
        try {
          const undici = await import('undici');
          fetchOptions.dispatcher = new undici.ProxyAgent(proxyUrl);
        } catch (proxyErr) {
          console.error('[Zalo Send API] Proxy init error:', proxyErr);
        }
      }

      const response = await fetch(zaloUrl, fetchOptions);
      return await response.json();
    };

    let resJson = await doSend(config.accessToken);

    // If Zalo returns token expired / invalid error (-216, -201, -200), attempt emergency auto-refresh & retry!
    if (resJson && (resJson.error === -216 || resJson.error === -201 || resJson.error === -200 || (resJson.message && resJson.message.toLowerCase().includes('token')))) {
      if (config.refreshToken && config.appId && config.secretKey) {
        console.log('[Zalo Send API] Received token error from Zalo, attempting emergency token refresh...');
        const refreshRes = await refreshZaloTokenCore({
          appId: config.appId,
          secretKey: config.secretKey,
          refreshToken: config.refreshToken
        });
        if (refreshRes.success && refreshRes.accessToken) {
          console.log('[Zalo Send API] Emergency refresh succeeded! Retrying send...');
          resJson = await doSend(refreshRes.accessToken);
        }
      }
    }

    return res.json({
      success: true,
      data: resJson,
    });
  } catch (err: any) {
    return res.status(500).json({
      success: false,
      error: err.message || "Failed to establish connect to Zalo OpenAPI",
    });
  }
}

// Handler for Zalo Verify Token
async function handleVerifyToken(req: VercelRequest, res: VercelResponse) {
  const { accessToken } = req.body || {};

  if (!accessToken) {
    return res.status(400).json({ success: false, message: "Token rỗng." });
  }

  try {
    const apiBase = process.env.ZALO_API_BASE_URL || "https://openapi.zalo.me";
    const zaloUrl = `${apiBase}/v2.0/oa/getoa`;

    const fetchOptions: any = {
      method: "GET",
      headers: {
        "access_token": accessToken,
      },
    };

    const proxyUrl = process.env.ZALO_PROXY_URL || process.env.HTTP_PROXY || process.env.HTTPS_PROXY;
    if (proxyUrl) {
      try {
        const undici = await import('undici');
        fetchOptions.dispatcher = new undici.ProxyAgent(proxyUrl);
      } catch (proxyErr) {
        console.error('[Zalo Verify API] Proxy init error:', proxyErr);
      }
    }

    const response = await fetch(zaloUrl, fetchOptions);
    const resJson = await response.json();

    if (resJson.error === 0) {
      return res.json({
        success: true,
        message: `Xác thực thành công OA: ${resJson.data?.name || "Zalo OA Active"}`,
      });
    } else {
      return res.json({
        success: false,
        message: `Zalo trả về lỗi mã ${resJson.error}: ${resJson.message || "Token không hợp lệ"}`,
      });
    }
  } catch (err: any) {
    return res.json({
      success: false,
      message: `Không kết nối được Zalo API: ${err.message}`,
    });
  }
}

// Handler for Zalo Refresh Token Endpoint
async function handleRefreshToken(req: VercelRequest, res: VercelResponse) {
  const { appId, secretKey, refreshToken } = req.body || {};
  const result = await refreshZaloTokenCore({ appId, secretKey, refreshToken });
  return res.json(result);
}

// Handler for Vercel Cron Auto-Refresh Endpoint
async function handleCronRefresh(req: VercelRequest, res: VercelResponse) {
  console.log('[Zalo Cron API] Triggering scheduled Zalo token auto-refresh...');
  const result = await refreshZaloTokenCore({});
  return res.json({
    success: result.success,
    timestamp: new Date().toISOString(),
    message: result.message,
    accessTokenUpdatedAt: result.config?.accessTokenUpdatedAt
  });
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(204).end();
  }

  const action = req.query.action || req.url?.split('/').pop()?.split('?')[0];

  if (action === 'send') {
    if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
    return handleSend(req, res);
  } else if (action === 'verify-token') {
    if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
    return handleVerifyToken(req, res);
  } else if (action === 'refresh-token') {
    if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
    return handleRefreshToken(req, res);
  } else if (action === 'cron-refresh' || action === 'auto-refresh') {
    return handleCronRefresh(req, res);
  } else {
    return res.status(400).json({ error: 'Invalid action' });
  }
}
