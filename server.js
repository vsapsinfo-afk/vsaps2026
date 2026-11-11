// server.ts
import express from "express";
import path from "path";
import { fileURLToPath } from "url";
import dotenv from "dotenv";

// api/health.ts
async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  if (req.method === "OPTIONS") {
    return res.status(204).end();
  }
  if (req.method !== "GET") {
    return res.status(405).json({ error: "Method not allowed" });
  }
  return res.json({
    status: "ok",
    timestamp: (/* @__PURE__ */ new Date()).toISOString()
  });
}

// api/invitation.ts
import { createClient } from "@supabase/supabase-js";
import crypto from "node:crypto";
function getServiceRoleKey() {
  return process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_SERVICE_ROLE || null;
}
function signId(id, secret, type = "dl") {
  const payload = type === "bcv" ? `invitation:speaker:${id}` : `invitation:${id}`;
  return crypto.createHmac("sha256", secret).update(payload).digest("hex").slice(0, 20);
}
function readType(raw) {
  return String(raw || "").trim().toLowerCase() === "bcv" ? "bcv" : "dl";
}
function safeEqual(a, b) {
  const bufA = Buffer.from(a);
  const bufB = Buffer.from(b);
  if (bufA.length !== bufB.length) return false;
  return crypto.timingSafeEqual(bufA, bufB);
}
function getBaseUrl(req) {
  const host = String(req.headers["x-forwarded-host"] || req.headers.host || "");
  const proto = String(req.headers["x-forwarded-proto"] || "https");
  if (host) return `${proto}://${host}`;
  return (process.env.APP_URL || "https://www.vsapsevent.org").replace(/\/$/, "");
}
async function assertAdmin(req, supabaseUrl5, serviceRoleKey) {
  const authHeader = String(req.headers.authorization || "");
  const token = authHeader.startsWith("Bearer ") ? authHeader.slice(7).trim() : "";
  if (!token) return "Thi\u1EBFu phi\xEAn \u0111\u0103ng nh\u1EADp. Vui l\xF2ng \u0111\u0103ng nh\u1EADp l\u1EA1i r\u1ED3i th\u1EED l\u1EA1i.";
  const admin = createClient(supabaseUrl5, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false }
  });
  const { data: userData, error: userError } = await admin.auth.getUser(token);
  if (userError || !userData?.user) return "Phi\xEAn \u0111\u0103ng nh\u1EADp kh\xF4ng c\xF2n h\u1EE3p l\u1EC7. Vui l\xF2ng \u0111\u0103ng nh\u1EADp l\u1EA1i.";
  const { data: profile, error: profileError } = await admin.from("user_accounts").select("role, status").eq("id", userData.user.id).single();
  if (profileError || !profile) return "Kh\xF4ng \u0111\u1ECDc \u0111\u01B0\u1EE3c vai tr\xF2 c\u1EE7a t\xE0i kho\u1EA3n \u0111ang \u0111\u0103ng nh\u1EADp.";
  if (profile.status !== "active") return "T\xE0i kho\u1EA3n \u0111ang b\u1ECB kh\xF3a.";
  if (profile.role !== "admin" && profile.role !== "btc") {
    return "Ch\u1EC9 t\xE0i kho\u1EA3n Admin ho\u1EB7c Ban t\u1ED5 ch\u1EE9c \u0111\u01B0\u1EE3c sinh \u0111\u01B0\u1EDDng d\u1EABn th\u01B0 m\u1EDDi.";
  }
  return null;
}
async function handleRequest(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");
  if (req.method === "OPTIONS") return res.status(204).end();
  const supabaseUrl5 = process.env.VITE_SUPABASE_URL;
  const serviceRoleKey = getServiceRoleKey();
  if (!supabaseUrl5 || !serviceRoleKey) {
    return res.status(500).json({
      success: false,
      error: "M\xE1y ch\u1EE7 ch\u01B0a c\u1EA5u h\xECnh SUPABASE_SERVICE_ROLE_KEY n\xEAn kh\xF4ng \u0111\u1ECDc \u0111\u01B0\u1EE3c h\u1ED3 s\u01A1 \u0111\u1EA1i bi\u1EC3u."
    });
  }
  const db = createClient(supabaseUrl5, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false }
  });
  if (req.method === "POST") {
    const authError = await assertAdmin(req, supabaseUrl5, serviceRoleKey);
    if (authError) return res.status(403).json({ success: false, error: authError });
    const type2 = readType((req.body || {}).type);
    const ids = (req.body || {}).ids;
    if (!Array.isArray(ids) || ids.length === 0) {
      return res.status(400).json({ success: false, error: "Thi\u1EBFu danh s\xE1ch m\xE3 \u0111\u1EA1i bi\u1EC3u." });
    }
    if (ids.length > 2e3) {
      return res.status(400).json({ success: false, error: "M\u1ED7i l\u1EA7n ch\u1EC9 sinh t\u1ED1i \u0111a 2000 \u0111\u01B0\u1EDDng d\u1EABn." });
    }
    const base = getBaseUrl(req);
    const links = {};
    ids.forEach((raw) => {
      const id2 = String(raw || "").trim();
      if (!id2) return;
      const token = signId(id2, serviceRoleKey, type2);
      const suffix = type2 === "bcv" ? "&t=bcv" : "";
      links[id2] = `${base}/?view=thu-moi&id=${encodeURIComponent(id2)}&k=${token}${suffix}`;
    });
    return res.json({ success: true, links });
  }
  if (req.method !== "GET") {
    return res.status(405).json({ success: false, error: "Method not allowed" });
  }
  const id = String(req.query.id || "").trim();
  const key = String(req.query.k || "").trim();
  const type = readType(req.query.t);
  if (!id || !key) {
    return res.status(400).json({ success: false, error: "\u0110\u01B0\u1EDDng d\u1EABn th\u01B0 m\u1EDDi kh\xF4ng \u0111\u1EA7y \u0111\u1EE7." });
  }
  if (!safeEqual(key, signId(id, serviceRoleKey, type))) {
    return res.status(404).json({ success: false, error: "\u0110\u01B0\u1EDDng d\u1EABn th\u01B0 m\u1EDDi kh\xF4ng h\u1EE3p l\u1EC7 ho\u1EB7c \u0111\xE3 h\u1EBFt hi\u1EC7u l\u1EF1c." });
  }
  const loadCommon = async () => {
    const { data: sessions } = await db.from("sessions").select("id, title, date, start_time, end_time, room_name, track, speaker_name").order("date", { ascending: true }).order("start_time", { ascending: true });
    const { data: config } = await db.from("business_config").select("event_name, organizer_name, event_date, event_location").limit(1).single();
    return {
      event: {
        name: config?.event_name || "H\u1ED9i ngh\u1ECB Khoa h\u1ECDc Th\u01B0\u1EDDng ni\xEAn VSAPS 2026",
        organizer: config?.organizer_name || "H\u1ED9i Ph\u1EABu thu\u1EADt T\u1EA1o h\xECnh Th\u1EA9m m\u1EF9 Vi\u1EC7t Nam",
        date: config?.event_date || "11 \u2013 13/12/2026",
        location: config?.event_location || "B\u1EC7nh vi\u1EC7n Qu\xE2n y 175, TP. H\u1ED3 Ch\xED Minh"
      },
      sessionRows: sessions || [],
      sessions: (sessions || []).map((x) => ({
        id: x.id,
        title: x.title || "",
        date: x.date || "",
        startTime: x.start_time || "",
        endTime: x.end_time || "",
        roomName: x.room_name || "",
        track: x.track || "",
        speakerName: x.speaker_name || ""
      }))
    };
  };
  if (type === "bcv") {
    const { data: speaker, error: speakerError } = await db.from("speakers").select("id, title, full_name, organization, department, email, avatar_url, nationality, presentation_title, presentation_track, status, scheduled_session_id").eq("id", id).single();
    if (speakerError || !speaker) {
      return res.status(404).json({ success: false, error: "Kh\xF4ng t\xECm th\u1EA5y h\u1ED3 s\u01A1 b\xE1o c\xE1o vi\xEAn." });
    }
    const common2 = await loadCommon();
    const mine = common2.sessionRows.find((x) => x.id === speaker.scheduled_session_id);
    let qrCodeValue = "";
    if (speaker.email) {
      const { data: matched } = await db.from("attendees").select("qr_code_value").ilike("email", speaker.email.trim()).limit(1);
      if (matched && matched.length > 0) qrCodeValue = matched[0].qr_code_value || "";
    }
    return res.json({
      success: true,
      type: "bcv",
      attendee: {
        id: speaker.id,
        title: speaker.title || "",
        fullName: speaker.full_name || "",
        organization: speaker.organization || "",
        department: speaker.department || "",
        packageName: "",
        avatarUrl: speaker.avatar_url || "",
        nationality: speaker.nationality || "vietname",
        qrCodeValue
      },
      presentation: {
        title: speaker.presentation_title || "",
        track: speaker.presentation_track || "",
        approved: speaker.status === "approved",
        sessionTitle: mine?.title || "",
        sessionDate: mine?.date || "",
        startTime: mine?.start_time || "",
        endTime: mine?.end_time || "",
        roomName: mine?.room_name || ""
      },
      event: common2.event,
      sessions: common2.sessions
    });
  }
  const { data: attendee, error: attendeeError } = await db.from("attendees").select("id, title, full_name, organization, department, package_name, avatar_url, nationality, qr_code_value").eq("id", id).single();
  if (attendeeError || !attendee) {
    return res.status(404).json({ success: false, error: "Kh\xF4ng t\xECm th\u1EA5y h\u1ED3 s\u01A1 \u0111\u1EA1i bi\u1EC3u." });
  }
  const common = await loadCommon();
  return res.json({
    success: true,
    type: "dl",
    attendee: {
      id: attendee.id,
      title: attendee.title || "",
      fullName: attendee.full_name || "",
      organization: attendee.organization || "",
      department: attendee.department || "",
      packageName: attendee.package_name || "",
      avatarUrl: attendee.avatar_url || "",
      nationality: attendee.nationality || "vietname",
      qrCodeValue: attendee.qr_code_value || attendee.id
    },
    event: common.event,
    sessions: common.sessions
  });
}
async function handler2(req, res) {
  try {
    return await handleRequest(req, res);
  } catch (err) {
    console.error("L\u1ED7i kh\xF4ng b\u1EAFt \u0111\u01B0\u1EE3c trong /api/invitation:", err);
    if (res.headersSent) return;
    return res.status(500).json({
      success: false,
      error: `L\u1ED7i h\u1EC7 th\u1ED1ng khi \u0111\u1ECDc th\u01B0 m\u1EDDi: ${err?.message || String(err)}`
    });
  }
}

// api/manifest.ts
import { createClient as createClient2 } from "@supabase/supabase-js";
var supabaseUrl = process.env.VITE_SUPABASE_URL || "";
var supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY || "";
async function handler3(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  res.setHeader("Content-Type", "application/json");
  if (req.method === "OPTIONS") {
    return res.status(204).end();
  }
  try {
    let name = "VSAPS 2026 - H\u1ED9i Ngh\u1ECB Khoa H\u1ECDc Th\u1EA9m M\u1EF9";
    let shortName = "VSAPS 2026";
    let description = "H\u1EC7 th\u1ED1ng qu\u1EA3n l\xFD H\u1ED9i Ngh\u1ECB Khoa H\u1ECDc Th\u1EA9m M\u1EF9 Qu\u1ED1c T\u1EBF Th\u01B0\u1EDDng Ni\xEAn VSAPS 2026";
    let logoUrl = "/icons/icon-512.png";
    let themeColor = "#4f46e5";
    let backgroundColor = "#0f172a";
    if (supabaseUrl && supabaseAnonKey) {
      try {
        const supabase = createClient2(supabaseUrl, supabaseAnonKey);
        const { data, error } = await supabase.from("business_config").select("*").eq("id", "default").maybeSingle();
        if (data && !error) {
          name = data.pwa_name || data.event_name || name;
          shortName = data.pwa_short_name || data.event_name?.substring(0, 15) || shortName;
          description = data.pwa_description || data.event_name || description;
          logoUrl = data.pwa_logo_url || logoUrl;
          themeColor = data.pwa_theme_color || themeColor;
          backgroundColor = data.pwa_background_color || backgroundColor;
        } else if (error) {
          console.error("L\u1ED7i truy v\u1EA5n business_config t\u1EEB Supabase:", error.message);
        }
      } catch (dbErr) {
        console.error("L\u1ED7i k\u1EBFt n\u1ED1i Supabase khi l\u1EA5y c\u1EA5u h\xECnh manifest:", dbErr.message || dbErr);
      }
    }
    const manifest = {
      name,
      short_name: shortName,
      description,
      start_url: "/",
      scope: "/",
      display: "standalone",
      orientation: "portrait-primary",
      theme_color: themeColor,
      background_color: backgroundColor,
      lang: "vi",
      dir: "ltr",
      categories: ["medical", "events", "productivity"],
      icons: [
        {
          src: logoUrl,
          sizes: "512x512",
          type: "image/png",
          purpose: "any"
        },
        {
          src: logoUrl,
          sizes: "192x192",
          type: "image/png",
          purpose: "any"
        },
        {
          src: logoUrl,
          sizes: "512x512",
          type: "image/png",
          purpose: "maskable"
        }
      ],
      shortcuts: [
        {
          name: "Check-in \u0111\u1EA1i bi\u1EC3u",
          short_name: "Check-in",
          description: "Qu\xE9t m\xE3 QR check-in \u0111\u1EA1i bi\u1EC3u",
          url: "/?view=checkin",
          icons: [
            {
              src: logoUrl,
              sizes: "96x96"
            }
          ]
        },
        {
          name: "Danh s\xE1ch \u0111\u1EA1i bi\u1EC3u",
          short_name: "\u0110\u1EA1i bi\u1EC3u",
          description: "Xem danh s\xE1ch \u0111\u1EA1i bi\u1EC3u \u0111\xE3 \u0111\u0103ng k\xFD",
          url: "/?view=attendees",
          icons: [
            {
              src: logoUrl,
              sizes: "96x96"
            }
          ]
        }
      ],
      prefer_related_applications: false
    };
    res.setHeader("Cache-Control", "public, max-age=60");
    return res.json(manifest);
  } catch (err) {
    return res.status(500).json({ error: err.message || "Internal Server Error" });
  }
}

// api/sepay-check.ts
import { createClient as createClient3 } from "@supabase/supabase-js";
var supabaseUrl2 = process.env.VITE_SUPABASE_URL || "";
var supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || "";
async function handler4(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  if (req.method === "OPTIONS") {
    return res.status(204).end();
  }
  if (req.method !== "GET") {
    return res.status(405).json({ error: "Method not allowed" });
  }
  const { transferContent, expectedAmount, test, apiToken } = req.query;
  const transferContentStr = Array.isArray(transferContent) ? transferContent[0] : transferContent;
  const expectedAmountStr = Array.isArray(expectedAmount) ? expectedAmount[0] : expectedAmount;
  const testStr = Array.isArray(test) ? test[0] : test;
  const apiTokenStr = Array.isArray(apiToken) ? apiToken[0] : apiToken;
  const isTest = testStr === "true";
  try {
    let activeToken = apiTokenStr || "";
    if (!activeToken) {
      if (!supabaseUrl2 || !supabaseServiceKey) {
        return res.status(500).json({ error: "Ch\u01B0a c\u1EA5u h\xECnh Supabase URL ho\u1EB7c Service Role Key tr\xEAn backend." });
      }
      const supabase = createClient3(supabaseUrl2, supabaseServiceKey);
      const { data, error: dbErr } = await supabase.from("system_config").select("*").eq("key", "sepay_config").maybeSingle();
      if (dbErr) {
        console.error("[SePay Check] Supabase error:", dbErr);
        return res.status(500).json({ error: "Kh\xF4ng th\u1EC3 l\u1EA5y c\u1EA5u h\xECnh SePay t\u1EEB c\u01A1 s\u1EDF d\u1EEF li\u1EC7u" });
      }
      if (!data || !data.value) {
        return res.status(400).json({ error: "Kh\xF4ng t\xECm th\u1EA5y c\u1EA5u h\xECnh SePay (sepay_config) trong c\u01A1 s\u1EDF d\u1EEF li\u1EC7u" });
      }
      const cfg = data.value;
      if (!isTest && !cfg.isEnabled) {
        return res.status(400).json({ error: "SePay ch\u01B0a \u0111\u01B0\u1EE3c b\u1EADt trong h\u1EC7 th\u1ED1ng." });
      }
      activeToken = cfg.apiToken;
    }
    if (!activeToken) {
      return res.status(400).json({ error: "Thi\u1EBFu API Token \u0111\u1EC3 th\u1EF1c hi\u1EC7n k\u1EBFt n\u1ED1i." });
    }
    const tryFetch = async (apiBase) => {
      const url = isTest ? `${apiBase}/v2/transactions?limit=1` : `${apiBase}/v2/transactions?q=${encodeURIComponent(transferContentStr?.substring(0, 50) || "")}&limit=20`;
      return await fetch(url, {
        method: "GET",
        headers: {
          "Authorization": `Bearer ${activeToken}`,
          "Content-Type": "application/json"
        }
      });
    };
    let fetchRes = await tryFetch("https://userapi.sepay.vn");
    if (fetchRes.status === 401) {
      console.log("[SePay Check] Production API returned 401, attempting Sandbox API fallback...");
      fetchRes = await tryFetch("https://userapi-sandbox.sepay.vn");
    }
    if (!fetchRes.ok) {
      const errText2 = await fetchRes.text();
      return res.status(fetchRes.status).json({ error: `SePay API b\xE1o l\u1ED7i (${fetchRes.status}): ${errText2}` });
    }
    const resData = await fetchRes.json();
    if (isTest) {
      const transactions2 = resData?.transactions || resData?.data || [];
      return res.json({ success: true, count: transactions2.length });
    }
    if (!transferContentStr) {
      return res.status(400).json({ error: "Thi\u1EBFu th\xF4ng tin n\u1ED9i dung chuy\u1EC3n kho\u1EA3n (transferContent)" });
    }
    const amount = expectedAmountStr ? Number(expectedAmountStr) : 0;
    const transactions = resData?.transactions || resData?.data || [];
    const matched = transactions.find((t) => {
      const amt = Number(t.transferAmount ?? t.transfer_amount ?? 0);
      return Math.abs(amt - amount) <= 1e3;
    });
    if (matched) {
      return res.json({
        found: true,
        transaction: {
          id: matched.id,
          gateway: matched.gateway || matched.bankCode || "",
          transactionDate: matched.transactionDate || matched.transaction_date || "",
          transferAmount: Number(matched.transferAmount ?? matched.transfer_amount ?? 0),
          content: matched.content || matched.transaction_content || "",
          referenceCode: matched.referenceCode || matched.reference_number || ""
        }
      });
    }
    return res.json({ found: false });
  } catch (err) {
    console.error("[SePay Check] Unhandled error:", err);
    return res.status(500).json({ error: err?.message || "L\u1ED7i k\u1EBFt n\u1ED1i khi g\u1ECDi SePay API" });
  }
}

// api/sepay-webhook.ts
import { createClient as createClient4 } from "@supabase/supabase-js";
var supabaseUrl3 = process.env.VITE_SUPABASE_URL || "";
var supabaseServiceKey2 = process.env.SUPABASE_SERVICE_ROLE_KEY || "";
async function handler5(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization, Apikey");
  res.setHeader("Content-Type", "application/json");
  if (req.method === "OPTIONS") return res.status(204).end();
  if (req.method !== "POST") return res.status(405).json({ success: false, message: "Method not allowed" });
  try {
    const supabase = createClient4(supabaseUrl3, supabaseServiceKey2);
    let webhookSecret = process.env.SEPAY_WEBHOOK_SECRET || "";
    if (supabaseUrl3 && supabaseServiceKey2) {
      try {
        const { data, error } = await supabase.from("system_config").select("*").eq("key", "sepay_config").maybeSingle();
        if (!error && data && data.value) {
          const config = data.value;
          if (config.webhookSecret) {
            webhookSecret = config.webhookSecret;
          }
        }
      } catch (dbErr) {
        console.error("[SePay Webhook] Failed to fetch config from Supabase:", dbErr);
      }
    }
    const incomingKey = (req.headers["authorization"] || req.headers["apikey"] || "").trim();
    if (webhookSecret) {
      let authorized = false;
      if (incomingKey === webhookSecret) {
        authorized = true;
      } else {
        const parts = incomingKey.split(" ");
        if (parts.length === 2 && parts[0].toLowerCase() === "apikey") {
          if (parts[1] === webhookSecret) {
            authorized = true;
          }
        }
      }
      if (!authorized) {
        console.warn("[SePay Webhook] Unauthorized attempt:", incomingKey);
        return res.status(401).json({ success: false, message: "Unauthorized" });
      }
    } else {
      console.warn("[SePay Webhook] Warning: webhookSecret is not configured. Request processed without authentication.");
    }
    const payload = req.body;
    console.log("[SePay Webhook] Received payload:", JSON.stringify(payload));
    const {
      id: sepayId,
      transferAmount,
      transferType,
      content,
      transactionDate,
      gateway,
      referenceCode
    } = payload;
    if (transferType !== "in") {
      return res.status(200).json({ success: true, message: "Skipped outgoing transaction" });
    }
    if (!content || !transferAmount) {
      return res.status(200).json({ success: true, message: "Missing content or amount" });
    }
    const contentUpper = content.toUpperCase().trim();
    const idMatch = contentUpper.match(/VSAPS2026-(\d+)/);
    let attendeeQuery = supabase.from("attendees").select("id, full_name, phone, package_fee, payment_status");
    if (idMatch) {
      attendeeQuery = attendeeQuery.eq("id", `VSAPS2026-${idMatch[1]}`);
    } else {
      const phoneMatch = contentUpper.match(/0[0-9]{9,10}/);
      if (phoneMatch) {
        attendeeQuery = attendeeQuery.ilike("phone", `%${phoneMatch[0]}%`);
      } else {
        return res.status(200).json({ success: true, message: "Cannot match attendee from content" });
      }
    }
    const { data: attendees, error: queryErr } = await attendeeQuery.limit(5);
    if (queryErr || !attendees || attendees.length === 0) {
      console.warn("[SePay Webhook] No matching attendee found for content:", content);
      return res.status(200).json({ success: true, message: "No matching attendee" });
    }
    const matched = attendees.find((a) => {
      const fee = Number(a.package_fee || 0);
      return Math.abs(fee - Number(transferAmount)) <= 5e3;
    }) || attendees[0];
    if (matched.payment_status === "paid") {
      return res.status(200).json({ success: true, message: "Already marked as paid" });
    }
    const { error: updateErr } = await supabase.from("attendees").update({
      payment_status: "paid",
      payment_method: "bank_transfer",
      notes: `SePay x\xE1c nh\u1EADn t\u1EF1 \u0111\u1ED9ng | GD #${sepayId} | ${gateway} | ${transactionDate} | Ref: ${referenceCode} | S\u1ED1 ti\u1EC1n: ${transferAmount.toLocaleString("vi-VN")}\u0111`
    }).eq("id", matched.id);
    if (updateErr) {
      console.error("[SePay Webhook] Update failed:", updateErr);
      return res.status(500).json({ success: false, message: "Database update failed" });
    }
    console.log(`[SePay Webhook] \u2705 Marked attendee ${matched.id} (${matched.full_name}) as PAID. Amount: ${transferAmount}`);
    return res.status(200).json({ success: true, message: `Attendee ${matched.id} marked as paid` });
  } catch (err) {
    console.error("[SePay Webhook] Unhandled error:", err);
    return res.status(500).json({ success: false, message: err.message || "Internal error" });
  }
}

// api/zalo.ts
import { createClient as createClient5 } from "@supabase/supabase-js";
function getSupabaseAdmin() {
  const supabaseUrl5 = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL || "";
  const supabaseServiceKey4 = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY || "";
  if (supabaseUrl5 && supabaseServiceKey4) {
    return createClient5(supabaseUrl5, supabaseServiceKey4);
  }
  return null;
}
async function getZaloConfigFromSupabase() {
  const supabase = getSupabaseAdmin();
  if (!supabase) return null;
  try {
    const { data, error } = await supabase.from("system_config").select("value").eq("key", "zalo_config").single();
    if (!error && data && data.value) {
      return data.value;
    }
  } catch (err) {
    console.error("[Zalo API] Error fetching zalo_config from Supabase:", err);
  }
  return null;
}
async function saveZaloConfigToSupabase(config) {
  const supabase = getSupabaseAdmin();
  if (!supabase) return false;
  try {
    const { error } = await supabase.from("system_config").upsert({
      key: "zalo_config",
      value: config
    });
    if (!error) {
      console.log("[Zalo API] Updated zalo_config in Supabase successfully.");
      return true;
    } else {
      console.error("[Zalo API] Error saving zalo_config to Supabase:", error);
    }
  } catch (err) {
    console.error("[Zalo API] Exception saving zalo_config to Supabase:", err);
  }
  return false;
}
async function refreshZaloTokenCore(params) {
  let dbConfig = await getZaloConfigFromSupabase() || {};
  const appId = params.appId || dbConfig.appId;
  const secretKey = params.secretKey || dbConfig.secretKey;
  const refreshToken = params.refreshToken || dbConfig.refreshToken;
  if (!appId || !secretKey || !refreshToken) {
    return {
      success: false,
      message: "Thi\u1EBFu th\xF4ng tin App ID, Secret Key ho\u1EB7c Refresh Token \u0111\u1EC3 gia h\u1EA1n."
    };
  }
  if (refreshToken === "zalo-refresh-token-active-2026-ready-vsaps") {
    const newAccessToken = "zalo-oa-token-refreshed-" + Math.floor(Math.random() * 9e4 + 1e4);
    const newRefreshToken = "zalo-refresh-token-refreshed-" + Math.floor(Math.random() * 9e4 + 1e4);
    const updatedConfig = {
      ...dbConfig,
      appId,
      secretKey,
      accessToken: newAccessToken,
      refreshToken: newRefreshToken,
      accessTokenUpdatedAt: (/* @__PURE__ */ new Date()).toISOString()
    };
    await saveZaloConfigToSupabase(updatedConfig);
    return {
      success: true,
      accessToken: newAccessToken,
      refreshToken: newRefreshToken,
      expiresIn: 86400,
      message: "C\u1EA5p m\u1EDBi Access Token Sandbox th\xE0nh c\xF4ng (M\xF4 ph\u1ECFng)!",
      config: updatedConfig
    };
  }
  try {
    const oauthBase = process.env.ZALO_OAUTH_BASE_URL || "https://oauth.zaloapp.com";
    const zaloUrl = `${oauthBase}/v4/oa/access_token`;
    const fetchOptions = {
      method: "POST",
      headers: {
        "secret_key": secretKey,
        "Content-Type": "application/x-www-form-urlencoded"
      },
      body: new URLSearchParams({
        refresh_token: refreshToken,
        app_id: appId,
        grant_type: "refresh_token"
      }).toString()
    };
    const proxyUrl = process.env.ZALO_PROXY_URL || process.env.HTTP_PROXY || process.env.HTTPS_PROXY;
    if (proxyUrl) {
      try {
        const undici = await import("undici");
        fetchOptions.dispatcher = new undici.ProxyAgent(proxyUrl);
      } catch (proxyErr) {
        console.error("[Zalo OAuth API] Proxy init error:", proxyErr);
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
        accessTokenUpdatedAt: (/* @__PURE__ */ new Date()).toISOString()
      };
      await saveZaloConfigToSupabase(updatedConfig);
      return {
        success: true,
        accessToken: newAccessToken,
        refreshToken: newRefreshToken,
        expiresIn: resJson.expires_in,
        message: "L\u1EA5y Access Token m\u1EDBi th\xE0nh c\xF4ng v\xE0 \u0111\xE3 l\u01B0u v\xE0o CSDL Supabase!",
        config: updatedConfig
      };
    } else {
      return {
        success: false,
        message: `Zalo OAuth tr\u1EA3 v\u1EC1 l\u1ED7i: ${resJson.error_description || resJson.message || JSON.stringify(resJson)}`
      };
    }
  } catch (err) {
    return {
      success: false,
      message: `L\u1ED7i k\u1EBFt n\u1ED1i c\u1ED5ng Zalo OAuth: ${err.message}`
    };
  }
}
async function handleSend(req, res) {
  let { config, payload } = req.body || {};
  let dbConfig = await getZaloConfigFromSupabase();
  if (dbConfig) {
    config = {
      ...dbConfig,
      ...Object.fromEntries(
        Object.entries(config || {}).filter(([_, v]) => v !== "" && v !== null && v !== void 0)
      )
    };
  }
  const updatedAt = config?.accessTokenUpdatedAt ? new Date(config.accessTokenUpdatedAt).getTime() : 0;
  const ageHrs = updatedAt > 0 ? (Date.now() - updatedAt) / (1e3 * 60 * 60) : 999;
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
      error: "Zalo access token is required."
    });
  }
  try {
    const apiBase = process.env.ZALO_API_BASE_URL || "https://business.openapi.zalo.me";
    const zaloUrl = `${apiBase}/message/template`;
    const phone = payload?.phone || payload?.recipient && payload.recipient.phone;
    let phoneStr = String(phone || "").replace(/[^0-9+]/g, "");
    if (phoneStr.startsWith("0")) {
      phoneStr = "84" + phoneStr.substring(1);
    }
    const requestBody = {
      phone: phoneStr,
      template_id: payload?.template_id,
      template_data: payload?.template_data,
      tracking_id: payload?.tracking_id || `tracking_${Date.now()}`
    };
    if (payload?.sending_mode) {
      requestBody.sending_mode = payload.sending_mode;
    }
    const doSend = async (tokenToUse) => {
      const fetchOptions = {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "access_token": tokenToUse
        },
        body: JSON.stringify(requestBody)
      };
      const proxyUrl = process.env.ZALO_PROXY_URL || process.env.HTTP_PROXY || process.env.HTTPS_PROXY;
      if (proxyUrl) {
        try {
          const undici = await import("undici");
          fetchOptions.dispatcher = new undici.ProxyAgent(proxyUrl);
        } catch (proxyErr) {
          console.error("[Zalo Send API] Proxy init error:", proxyErr);
        }
      }
      const response = await fetch(zaloUrl, fetchOptions);
      return await response.json();
    };
    let resJson = await doSend(config.accessToken);
    if (resJson && (resJson.error === -216 || resJson.error === -201 || resJson.error === -200 || resJson.message && resJson.message.toLowerCase().includes("token"))) {
      if (config.refreshToken && config.appId && config.secretKey) {
        console.log("[Zalo Send API] Received token error from Zalo, attempting emergency token refresh...");
        const refreshRes = await refreshZaloTokenCore({
          appId: config.appId,
          secretKey: config.secretKey,
          refreshToken: config.refreshToken
        });
        if (refreshRes.success && refreshRes.accessToken) {
          console.log("[Zalo Send API] Emergency refresh succeeded! Retrying send...");
          resJson = await doSend(refreshRes.accessToken);
        }
      }
    }
    return res.json({
      success: true,
      data: resJson
    });
  } catch (err) {
    return res.status(500).json({
      success: false,
      error: err.message || "Failed to establish connect to Zalo OpenAPI"
    });
  }
}
async function handleVerifyToken(req, res) {
  const { accessToken } = req.body || {};
  if (!accessToken) {
    return res.status(400).json({ success: false, message: "Token r\u1ED7ng." });
  }
  try {
    const apiBase = process.env.ZALO_API_BASE_URL || "https://openapi.zalo.me";
    const zaloUrl = `${apiBase}/v2.0/oa/getoa`;
    const fetchOptions = {
      method: "GET",
      headers: {
        "access_token": accessToken
      }
    };
    const proxyUrl = process.env.ZALO_PROXY_URL || process.env.HTTP_PROXY || process.env.HTTPS_PROXY;
    if (proxyUrl) {
      try {
        const undici = await import("undici");
        fetchOptions.dispatcher = new undici.ProxyAgent(proxyUrl);
      } catch (proxyErr) {
        console.error("[Zalo Verify API] Proxy init error:", proxyErr);
      }
    }
    const response = await fetch(zaloUrl, fetchOptions);
    const resJson = await response.json();
    if (resJson.error === 0) {
      return res.json({
        success: true,
        message: `X\xE1c th\u1EF1c th\xE0nh c\xF4ng OA: ${resJson.data?.name || "Zalo OA Active"}`
      });
    } else {
      return res.json({
        success: false,
        message: `Zalo tr\u1EA3 v\u1EC1 l\u1ED7i m\xE3 ${resJson.error}: ${resJson.message || "Token kh\xF4ng h\u1EE3p l\u1EC7"}`
      });
    }
  } catch (err) {
    return res.json({
      success: false,
      message: `Kh\xF4ng k\u1EBFt n\u1ED1i \u0111\u01B0\u1EE3c Zalo API: ${err.message}`
    });
  }
}
async function handleRefreshToken(req, res) {
  const { appId, secretKey, refreshToken } = req.body || {};
  const result = await refreshZaloTokenCore({ appId, secretKey, refreshToken });
  return res.json(result);
}
async function handleCronRefresh(req, res) {
  console.log("[Zalo Cron API] Triggering scheduled Zalo token auto-refresh...");
  const result = await refreshZaloTokenCore({});
  return res.json({
    success: result.success,
    timestamp: (/* @__PURE__ */ new Date()).toISOString(),
    message: result.message,
    accessTokenUpdatedAt: result.config?.accessTokenUpdatedAt
  });
}
async function handler6(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  if (req.method === "OPTIONS") {
    return res.status(204).end();
  }
  const action = req.query.action || req.url?.split("/").pop()?.split("?")[0];
  if (action === "send") {
    if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });
    return handleSend(req, res);
  } else if (action === "verify-token") {
    if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });
    return handleVerifyToken(req, res);
  } else if (action === "refresh-token") {
    if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });
    return handleRefreshToken(req, res);
  } else if (action === "cron-refresh" || action === "auto-refresh") {
    return handleCronRefresh(req, res);
  } else {
    return res.status(400).json({ error: "Invalid action" });
  }
}

// api/campaign/track.ts
import { createClient as createClient6 } from "@supabase/supabase-js";
async function handler7(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  if (req.method === "OPTIONS") {
    return res.status(204).end();
  }
  const { type, campaignId, recipientEmail, url } = req.query;
  if (type === "click") {
    const redirectUrl = url || "/";
    if (campaignId && recipientEmail) {
      const supabaseUrl5 = process.env.VITE_SUPABASE_URL || "";
      const supabaseServiceKey4 = process.env.SUPABASE_SERVICE_ROLE_KEY || "";
      if (supabaseUrl5 && supabaseServiceKey4) {
        try {
          const supabase = createClient6(supabaseUrl5, supabaseServiceKey4);
          const { data: existing } = await supabase.from("campaign_activity").select("*").eq("campaign_id", campaignId).eq("recipient_email", recipientEmail).maybeSingle();
          let isNewClick = false;
          if (existing) {
            if (!existing.clicked_at) {
              isNewClick = true;
            }
            await supabase.from("campaign_activity").update({
              clicked_at: (/* @__PURE__ */ new Date()).toISOString(),
              clicked_url: redirectUrl,
              status: "clicked"
            }).eq("id", existing.id);
          } else {
            isNewClick = true;
            const activityId = `ACT-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
            await supabase.from("campaign_activity").insert({
              id: activityId,
              campaign_id: campaignId,
              recipient_email: recipientEmail,
              sent_at: (/* @__PURE__ */ new Date()).toISOString(),
              clicked_at: (/* @__PURE__ */ new Date()).toISOString(),
              clicked_url: redirectUrl,
              status: "clicked"
            });
          }
          if (isNewClick) {
            const { data: campaign } = await supabase.from("email_campaigns").select("click_count").eq("id", campaignId).maybeSingle();
            if (campaign) {
              await supabase.from("email_campaigns").update({ click_count: (campaign.click_count || 0) + 1 }).eq("id", campaignId);
            }
          }
        } catch (err) {
          console.error("Error tracking campaign click in DB:", err);
        }
      }
    }
    return res.redirect(302, redirectUrl);
  }
  if (campaignId && recipientEmail) {
    const supabaseUrl5 = process.env.VITE_SUPABASE_URL || "";
    const supabaseServiceKey4 = process.env.SUPABASE_SERVICE_ROLE_KEY || "";
    if (supabaseUrl5 && supabaseServiceKey4) {
      try {
        const supabase = createClient6(supabaseUrl5, supabaseServiceKey4);
        const { data: existing } = await supabase.from("campaign_activity").select("*").eq("campaign_id", campaignId).eq("recipient_email", recipientEmail).maybeSingle();
        if (existing) {
          if (!existing.opened_at) {
            await supabase.from("campaign_activity").update({ opened_at: (/* @__PURE__ */ new Date()).toISOString(), status: "opened" }).eq("id", existing.id);
            const { data: campaign } = await supabase.from("email_campaigns").select("open_count").eq("id", campaignId).maybeSingle();
            if (campaign) {
              await supabase.from("email_campaigns").update({ open_count: (campaign.open_count || 0) + 1 }).eq("id", campaignId);
            }
          }
        } else {
          const activityId = `ACT-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
          await supabase.from("campaign_activity").insert({
            id: activityId,
            campaign_id: campaignId,
            recipient_email: recipientEmail,
            sent_at: (/* @__PURE__ */ new Date()).toISOString(),
            opened_at: (/* @__PURE__ */ new Date()).toISOString(),
            status: "opened"
          });
          const { data: campaign } = await supabase.from("email_campaigns").select("open_count").eq("id", campaignId).maybeSingle();
          if (campaign) {
            await supabase.from("email_campaigns").update({ open_count: (campaign.open_count || 0) + 1 }).eq("id", campaignId);
          }
        }
      } catch (err) {
        console.error("Error tracking campaign open in DB:", err);
      }
    }
  }
  const pixel = Buffer.from(
    "R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7",
    "base64"
  );
  res.setHeader("Content-Type", "image/gif");
  res.setHeader("Content-Length", pixel.length.toString());
  res.setHeader("Cache-Control", "no-store, no-cache, must-revalidate, private");
  return res.status(200).send(pixel);
}

// api/email/send.ts
import nodemailer from "nodemailer";
import { createClient as createClient7 } from "@supabase/supabase-js";
var normalizeSmtp = (c) => {
  const host = String(c?.smtpHost ?? "").trim();
  const rawPass = String(c?.smtpPass ?? "");
  return {
    host,
    port: Number(c?.smtpPort) || 587,
    user: String(c?.smtpUser ?? "").trim(),
    pass: /gmail|google/i.test(host) ? rawPass.replace(/\s+/g, "") : rawPass.trim()
  };
};
var cachedTransport = null;
var buildTransportKey = (c) => {
  const n = normalizeSmtp(c);
  return [n.host, n.port, n.user, n.pass].join("|");
};
var disposeCachedTransport = () => {
  if (!cachedTransport) return;
  try {
    cachedTransport.transporter.close();
  } catch {
  }
  cachedTransport = null;
};
var getTransporter = (config) => {
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
      pass: n.pass
    },
    pool: true,
    maxConnections: 1,
    maxMessages: Infinity,
    rateDelta: 1e3,
    rateLimit: 3,
    tls: {
      rejectUnauthorized: false
    }
  });
  cachedTransport = { key, transporter };
  return transporter;
};
var TRANSIENT_SMTP = /(?:^|[^0-9])(421|450|451|452)(?:[^0-9]|$)/;
var AUTH_THROTTLED = /454[-\s]?4\.7\.0|too many login attempts/i;
var errText = (err) => [err?.responseCode, err?.response, err?.message].map((v) => String(v ?? "")).join(" ");
var isTransientError = (err) => {
  const text = errText(err);
  if (AUTH_THROTTLED.test(text)) return false;
  return TRANSIENT_SMTP.test(text) || ["ETIMEDOUT", "ECONNECTION", "ECONNRESET", "ESOCKET"].includes(err?.code);
};
var explainSmtpError = (err) => {
  const msg = String(err?.message ?? "") || "L\u1ED7i khi g\u1EEDi mail SMTP";
  const text = errText(err);
  if (AUTH_THROTTLED.test(text)) {
    return msg + " \u2014 Google \u0111ang T\u1EA0M KHO\xC1 \u0111\u0103ng nh\u1EADp v\xEC c\xF3 qu\xE1 nhi\u1EC1u l\u1EA7n th\u1EED. H\xE3y D\u1EEANG g\u1EEDi v\xE0 ch\u1EDD \xEDt nh\u1EA5t 1 gi\u1EDD. M\u1ED7i l\u1EA7n b\u1EA5m th\u1EED l\u1EA1i s\u1EBD k\xE9o d\xE0i th\xEAm th\u1EDDi gian kho\xE1.";
  }
  if (/534[-\s]?5\.7\.9|webloginrequired/i.test(text)) {
    return msg + " \u2014 Gmail kh\xF4ng ch\u1EA5p nh\u1EADn m\u1EADt kh\u1EA9u. Ki\u1EC3m tra \xF4 m\u1EADt kh\u1EA9u \u0111ang l\xE0 M\u1EADt kh\u1EA9u \u1EE9ng d\u1EE5ng 16 k\xFD t\u1EF1 vi\u1EBFt li\u1EC1n, kh\xF4ng ph\u1EA3i m\u1EADt kh\u1EA9u Gmail th\u01B0\u1EDDng.";
  }
  if (/535[-\s]?5\.7\.8/i.test(text)) {
    return msg + " \u2014 Sai t\xE0i kho\u1EA3n ho\u1EB7c m\u1EADt kh\u1EA9u SMTP.";
  }
  return msg;
};
async function handler8(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  if (req.method === "OPTIONS") {
    return res.status(204).end();
  }
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }
  const { apiKey: reqApiKey, from: reqFrom, to, subject, html, provider } = req.body || {};
  const apiKey = reqApiKey || process.env.RESEND_API_KEY;
  const from = reqFrom || process.env.RESEND_FROM_EMAIL;
  if (provider === "resend" || apiKey) {
    if (!apiKey) {
      return res.status(400).json({ success: false, error: "Resend API Key (apiKey) is required." });
    }
    if (!from) {
      return res.status(400).json({ success: false, error: "Sender email (from) is required." });
    }
    if (!to) {
      return res.status(400).json({ success: false, error: "Recipient email (to) is required." });
    }
    try {
      const response = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${apiKey}`
        },
        body: JSON.stringify({
          from,
          to,
          subject: subject || "Th\xF4ng b\xE1o t\u1EEB Ban T\u1ED5 Ch\u1EE9c",
          html: html || req.body.body
        })
      });
      const data = await response.json();
      if (response.ok) {
        return res.status(200).json({
          success: true,
          id: data.id,
          message: "Email sent successfully via Resend API"
        });
      } else {
        return res.status(response.status).json({
          success: false,
          error: data.message || JSON.stringify(data)
        });
      }
    } catch (error) {
      return res.status(500).json({
        success: false,
        error: error.message || "Error connecting to Resend API"
      });
    }
  }
  let { config, payload } = req.body;
  if (!config || !config.smtpHost || !config.smtpUser || !config.smtpPass) {
    const supabaseUrl5 = process.env.VITE_SUPABASE_URL || "";
    const supabaseServiceKey4 = process.env.SUPABASE_SERVICE_ROLE_KEY || "";
    if (supabaseUrl5 && supabaseServiceKey4) {
      try {
        const supabase = createClient7(supabaseUrl5, supabaseServiceKey4);
        const { data, error } = await supabase.from("system_config").select("value").eq("key", "email_config").single();
        if (!error && data && data.value) {
          const dbConfig = data.value;
          config = {
            ...dbConfig,
            ...Object.fromEntries(
              Object.entries(config || {}).filter(([_, v]) => v !== "" && v !== null && v !== void 0)
            )
          };
        }
      } catch (dbErr) {
        console.error("Error fetching email config from Supabase:", dbErr);
      }
    }
  }
  if (!config || !config.smtpHost || !config.smtpUser || !config.smtpPass) {
    return res.status(400).json({
      success: false,
      error: "SMTP server configuration is incomplete."
    });
  }
  if (!payload || !payload.to) {
    return res.status(400).json({
      success: false,
      error: "Recipient email (to) is missing in payload."
    });
  }
  const mailOptions = {
    from: {
      name: config.senderName || "VSAPS 2026 BTC",
      address: config.senderEmail || config.smtpUser
    },
    to: payload.to,
    subject: payload.subject || "Th\u01B0 x\xE1c nh\u1EADn VSAPS 2026",
    html: payload.body
  };
  const MAX_ATTEMPTS = 2;
  let lastError = null;
  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
    try {
      const info = await getTransporter(config).sendMail(mailOptions);
      return res.json({
        success: true,
        messageId: info.messageId,
        response: info.response,
        server: config.smtpHost,
        attempts: attempt
      });
    } catch (err) {
      lastError = err;
      disposeCachedTransport();
      if (attempt === MAX_ATTEMPTS || !isTransientError(err)) break;
      await new Promise((r) => setTimeout(r, 1500));
    }
  }
  return res.status(500).json({
    success: false,
    error: explainSmtpError(lastError),
    retryable: isTransientError(lastError)
  });
}

// api/email/test-connection.ts
import nodemailer2 from "nodemailer";
var normalizeSmtp2 = (c) => {
  const host = String(c?.smtpHost ?? "").trim();
  const rawPass = String(c?.smtpPass ?? "");
  return {
    host,
    port: Number(c?.smtpPort) || 587,
    user: String(c?.smtpUser ?? "").trim(),
    pass: /gmail|google/i.test(host) ? rawPass.replace(/\s+/g, "") : rawPass.trim()
  };
};
async function handler9(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  if (req.method === "OPTIONS") {
    return res.status(204).end();
  }
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }
  const { smtpHost, smtpPort, smtpUser, smtpPass } = req.body;
  if (!smtpHost || !smtpUser || !smtpPass) {
    return res.status(400).json({
      success: false,
      message: "Cung c\u1EA5p thi\u1EBFu th\xF4ng tin m\xE1y ch\u1EE7 SMTP (Host, User, Pass)."
    });
  }
  try {
    const n = normalizeSmtp2({ smtpHost, smtpPort, smtpUser, smtpPass });
    const transporter = nodemailer2.createTransport({
      host: n.host,
      port: n.port,
      secure: n.port === 465,
      auth: { user: n.user, pass: n.pass },
      tls: { rejectUnauthorized: false }
    });
    await transporter.verify();
    return res.json({
      success: true,
      message: `K\u1EBFt n\u1ED1i th\xE0nh c\xF4ng \u0111\u1EBFn m\xE1y ch\u1EE7 SMTP ${smtpHost}!`
    });
  } catch (err) {
    const raw = String(err?.message ?? "") || "L\u1ED7i SMTP kh\xF4ng x\xE1c \u0111\u1ECBnh";
    const detail = [err?.responseCode, err?.response, raw].map((v) => String(v ?? "")).join(" ");
    let hint = "";
    if (/454[-\s]?4\.7\.0|too many login attempts/i.test(detail)) {
      hint = " \u2014 Google \u0111ang T\u1EA0M KHO\xC1 \u0111\u0103ng nh\u1EADp v\xEC c\xF3 qu\xE1 nhi\u1EC1u l\u1EA7n th\u1EED. H\xE3y D\u1EEANG l\u1EA1i v\xE0 ch\u1EDD \xEDt nh\u1EA5t 1 gi\u1EDD. M\u1ED7i l\u1EA7n b\u1EA5m ki\u1EC3m tra l\u1EA1i s\u1EBD k\xE9o d\xE0i th\xEAm th\u1EDDi gian kho\xE1.";
    } else if (/534[-\s]?5\.7\.9|webloginrequired/i.test(detail)) {
      hint = " \u2014 Gmail kh\xF4ng ch\u1EA5p nh\u1EADn m\u1EADt kh\u1EA9u. Ki\u1EC3m tra \xF4 m\u1EADt kh\u1EA9u \u0111ang l\xE0 M\u1EADt kh\u1EA9u \u1EE9ng d\u1EE5ng 16 k\xFD t\u1EF1 vi\u1EBFt li\u1EC1n.";
    } else if (/535[-\s]?5\.7\.8/i.test(detail)) {
      hint = " \u2014 Sai t\xE0i kho\u1EA3n ho\u1EB7c m\u1EADt kh\u1EA9u SMTP.";
    }
    return res.json({
      success: false,
      message: `H\u1EC7 th\u1ED1ng t\u1EEB ch\u1ED1i k\u1EBFt n\u1ED1i: ${raw}${hint}`
    });
  }
}

// api/onesignal/send-push.ts
import { createClient as createClient8 } from "@supabase/supabase-js";
var supabaseUrl4 = process.env.VITE_SUPABASE_URL || "";
var supabaseServiceKey3 = process.env.SUPABASE_SERVICE_ROLE_KEY || "";
async function handler10(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");
  res.setHeader("Content-Type", "application/json");
  if (req.method === "OPTIONS") {
    return res.status(204).end();
  }
  if (req.method !== "POST") {
    return res.status(405).json({ success: false, message: "Method not allowed" });
  }
  try {
    const { title, message, isTest } = req.body;
    if (!title || !message) {
      return res.status(400).json({ success: false, message: "Missing title or message" });
    }
    let appId = process.env.ONESIGNAL_APP_ID || "";
    let restApiKey = process.env.ONESIGNAL_REST_API_KEY || "";
    let isEnabled = true;
    if (supabaseUrl4 && supabaseServiceKey3) {
      const supabase = createClient8(supabaseUrl4, supabaseServiceKey3);
      const { data, error } = await supabase.from("system_config").select("*").eq("key", "onesignal_config").maybeSingle();
      if (!error && data && data.value) {
        const config = data.value;
        if (config.appId) appId = config.appId;
        if (config.restApiKey) restApiKey = config.restApiKey;
        if (config.isEnabled !== void 0) isEnabled = config.isEnabled;
      }
    }
    if (!isEnabled && !isTest) {
      return res.json({ success: true, message: "OneSignal integration is disabled" });
    }
    if (!appId || !restApiKey) {
      console.warn("[OneSignal API] App ID or REST API Key is missing");
      return res.status(400).json({ success: false, message: "OneSignal configurations are missing" });
    }
    const response = await fetch("https://onesignal.com/api/v1/notifications", {
      method: "POST",
      headers: {
        "Content-Type": "application/json; charset=utf-8",
        "Authorization": `Basic ${restApiKey}`
      },
      body: JSON.stringify({
        app_id: appId,
        headings: { vi: title, en: title },
        contents: { vi: message, en: message },
        included_segments: ["All"]
      })
    });
    const responseData = await response.json();
    console.log("[OneSignal API] Response data:", responseData);
    if (!response.ok) {
      return res.status(response.status).json({
        success: false,
        message: responseData.errors?.[0] || "OneSignal API request failed",
        details: responseData
      });
    }
    return res.json({ success: true, response: responseData });
  } catch (err) {
    console.error("[OneSignal API] Unhandled error:", err);
    return res.status(500).json({ success: false, message: err.message || "Internal server error" });
  }
}

// api/users/create.ts
import { createClient as createClient9 } from "@supabase/supabase-js";
async function handler11(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  if (req.method === "OPTIONS") {
    return res.status(204).end();
  }
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }
  const { email, password, name, role, permissions } = req.body;
  if (!email || !password || !name || !role) {
    return res.status(400).json({ success: false, error: "Thi\u1EBFu th\xF4ng tin b\u1EAFt bu\u1ED9c (email, m\u1EADt kh\u1EA9u, t\xEAn, vai tr\xF2)." });
  }
  const supabaseUrl5 = process.env.VITE_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_SERVICE_ROLE;
  if (!supabaseUrl5 || !serviceRoleKey) {
    return res.status(500).json({
      success: false,
      error: "C\u1ED5ng Supabase ch\u01B0a \u0111\u01B0\u1EE3c c\u1EA5u h\xECnh Service Role Key. Vui l\xF2ng thi\u1EBFt l\u1EADp bi\u1EBFn m\xF4i tr\u01B0\u1EDDng SUPABASE_SERVICE_ROLE_KEY tr\xEAn Vercel."
    });
  }
  try {
    const supabaseAdmin = createClient9(supabaseUrl5, serviceRoleKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    });
    const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { name, role }
    });
    if (authError) {
      throw new Error(`L\u1ED7i t\u1EA1o t\xE0i kho\u1EA3n Auth: ${authError.message}`);
    }
    if (!authData.user) {
      throw new Error("Kh\xF4ng nh\u1EADn \u0111\u01B0\u1EE3c th\xF4ng tin ng\u01B0\u1EDDi d\xF9ng t\u1EEB Supabase Auth");
    }
    const userId = authData.user.id;
    const { error: dbError } = await supabaseAdmin.from("user_accounts").insert({
      id: userId,
      name,
      email,
      role,
      status: "active",
      permissions: permissions || []
    });
    if (dbError) {
      await supabaseAdmin.auth.admin.deleteUser(userId);
      throw new Error(`L\u1ED7i t\u1EA1o profile database: ${dbError.message}`);
    }
    return res.json({
      success: true,
      user: {
        id: userId,
        name,
        email,
        role,
        status: "active",
        permissions: permissions || []
      }
    });
  } catch (err) {
    return res.status(500).json({
      success: false,
      error: err.message || "L\u1ED7i h\u1EC7 th\u1ED1ng khi t\u1EA1o nh\xE2n s\u1EF1"
    });
  }
}

// api/whatsapp/send.ts
import { createClient as createClient10 } from "@supabase/supabase-js";
async function handler12(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  if (req.method === "OPTIONS") {
    return res.status(204).end();
  }
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }
  let { config, payload } = req.body;
  if (!config || !config.accessToken || !config.phoneNumberId) {
    const supabaseUrl5 = process.env.VITE_SUPABASE_URL || "";
    const supabaseServiceKey4 = process.env.SUPABASE_SERVICE_ROLE_KEY || "";
    if (supabaseUrl5 && supabaseServiceKey4) {
      try {
        const supabase = createClient10(supabaseUrl5, supabaseServiceKey4);
        const { data, error } = await supabase.from("system_config").select("value").eq("key", "whatsapp_config").single();
        if (!error && data && data.value) {
          const dbConfig = data.value;
          config = {
            ...dbConfig,
            ...Object.fromEntries(
              Object.entries(config || {}).filter(([_, v]) => v !== "" && v !== null && v !== void 0)
            )
          };
        }
      } catch (dbErr) {
        console.error("Error fetching WhatsApp config from Supabase:", dbErr);
      }
    }
  }
  if (!config || !config.accessToken || !config.phoneNumberId) {
    return res.status(400).json({
      success: false,
      error: "WhatsApp Access Token and Phone Number ID are required."
    });
  }
  try {
    const waUrl = `https://graph.facebook.com/v18.0/${config.phoneNumberId}/messages`;
    const response = await fetch(waUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${config.accessToken}`
      },
      body: JSON.stringify(payload)
    });
    const resJson = await response.json();
    return res.json({
      success: response.ok,
      data: resJson
    });
  } catch (err) {
    return res.status(500).json({
      success: false,
      error: err.message || "Failed to establish connection to Meta Graph API"
    });
  }
}

// server.ts
var __filename = fileURLToPath(import.meta.url);
var __dirname = path.dirname(__filename);
dotenv.config({ path: path.resolve(__dirname, ".env.local") });
dotenv.config();
var app = express();
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true, limit: "10mb" }));
var adapt = (handler13) => async (req, res) => {
  try {
    if (!res.status) {
      res.status = function(code) {
        res.statusCode = code;
        return this;
      };
    }
    await handler13(req, res);
  } catch (err) {
    console.error("[API Error]", req.url, err);
    if (!res.headersSent) {
      res.status(500).json({ success: false, error: err.message || "Internal Server Error" });
    }
  }
};
app.all("/api/health", adapt(handler));
app.all("/api/invitation", adapt(handler2));
app.all("/api/manifest", adapt(handler3));
app.all("/api/sepay-check", adapt(handler4));
app.all("/api/sepay-webhook", adapt(handler5));
app.all("/api/zalo", adapt(handler6));
app.all("/api/campaign/track", adapt(handler7));
app.all("/api/email/send", adapt(handler8));
app.all("/api/email/send-resend", adapt(handler8));
app.all("/api/email/test-connection", adapt(handler9));
app.all("/api/onesignal/send-push", adapt(handler10));
app.all("/api/users/create", adapt(handler11));
app.all("/api/whatsapp/send", adapt(handler12));
var distDir = path.resolve(__dirname, "dist");
app.use(express.static(distDir));
app.get("/check-registration", (req, res) => {
  res.sendFile(path.resolve(distDir, "check-registration.html"));
});
app.get("/check-registration.html", (req, res) => {
  res.sendFile(path.resolve(distDir, "check-registration.html"));
});
app.get("*", (req, res) => {
  res.sendFile(path.resolve(distDir, "index.html"));
});
var PORT = Number(process.env.PORT) || 3e3;
app.listen(PORT, "0.0.0.0", () => {
  console.log(`[VSAPS 2026 Server] Running on http://0.0.0.0:${PORT}`);
});
