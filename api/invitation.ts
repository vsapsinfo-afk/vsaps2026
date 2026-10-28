/**
 * Cấp dữ liệu cho trang Thư mời tham dự của từng đại biểu.
 *
 * GET  ?id=<mã đại biểu>&k=<mã kiểm tra>
 *      Trang thư mời công khai gọi vào đây. Không cần đăng nhập, vì chính đại
 *      biểu sẽ chia sẻ đường dẫn này lên trang cá nhân.
 *
 * POST { ids: [...] }  kèm Bearer token của tài khoản Admin
 *      Sinh đường dẫn thư mời cho một hoặc nhiều đại biểu, để màn hình quản trị
 *      ghép vào email.
 *
 * Vì sao cần mã kiểm tra `k`:
 *   Mã đại biểu đánh số tuần tự (VSAPS2026-001, -002...), nếu chỉ dựa vào mã
 *   thì ai cũng dò được toàn bộ danh sách người tham dự. Mã kiểm tra là chữ ký
 *   HMAC của mã đại biểu, không đoán được, và không phải thêm cột nào vào cơ sở
 *   dữ liệu. Khóa ký lấy từ SUPABASE_SERVICE_ROLE_KEY vốn đã có sẵn trên Vercel.
 *
 * Trang thư mời KHÔNG chứa mã QR check-in, số điện thoại, email hay số CCCD.
 * Đường dẫn vốn để đại biểu công khai, nên chỉ trả về đúng những thông tin mà
 * chính họ sẽ đăng lên.
 */
import { createClient } from '@supabase/supabase-js';
import type { VercelRequest, VercelResponse } from '@vercel/node';
import crypto from 'node:crypto';

function getServiceRoleKey(): string | null {
  return process.env.SUPABASE_SERVICE_ROLE_KEY
    || process.env.SUPABASE_SERVICE_KEY
    || process.env.SUPABASE_SERVICE_ROLE
    || null;
}

/** Chữ ký của một mã đại biểu. Dùng chung cho cả lúc sinh và lúc kiểm tra. */
function signId(id: string, secret: string): string {
  return crypto.createHmac('sha256', secret).update(`invitation:${id}`).digest('hex').slice(0, 20);
}

/** So sánh chuỗi theo kiểu không lộ thời gian, tránh dò từng ký tự. */
function safeEqual(a: string, b: string): boolean {
  const bufA = Buffer.from(a);
  const bufB = Buffer.from(b);
  if (bufA.length !== bufB.length) return false;
  return crypto.timingSafeEqual(bufA, bufB);
}

/** Địa chỉ gốc của trang, ưu tiên tên miền mà trình duyệt đang gọi tới. */
function getBaseUrl(req: VercelRequest): string {
  const host = String(req.headers['x-forwarded-host'] || req.headers.host || '');
  const proto = String(req.headers['x-forwarded-proto'] || 'https');
  if (host) return `${proto}://${host}`;
  return (process.env.APP_URL || 'https://www.vsapsevent.org').replace(/\/$/, '');
}

/** Kiểm tra người gọi có phải Admin đang đăng nhập. Trả chuỗi lỗi hoặc null. */
async function assertAdmin(req: VercelRequest, supabaseUrl: string, serviceRoleKey: string): Promise<string | null> {
  const authHeader = String(req.headers.authorization || '');
  const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7).trim() : '';
  if (!token) return 'Thiếu phiên đăng nhập. Vui lòng đăng nhập lại rồi thử lại.';

  const admin = createClient(supabaseUrl, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  const { data: userData, error: userError } = await admin.auth.getUser(token);
  if (userError || !userData?.user) return 'Phiên đăng nhập không còn hợp lệ. Vui lòng đăng nhập lại.';

  const { data: profile, error: profileError } = await admin
    .from('user_accounts')
    .select('role, status')
    .eq('id', userData.user.id)
    .single();

  if (profileError || !profile) return 'Không đọc được vai trò của tài khoản đang đăng nhập.';
  if (profile.status !== 'active') return 'Tài khoản đang bị khóa.';
  if (profile.role !== 'admin' && profile.role !== 'btc') {
    return 'Chỉ tài khoản Admin hoặc Ban tổ chức được sinh đường dẫn thư mời.';
  }
  return null;
}

async function handleRequest(req: VercelRequest, res: VercelResponse) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') return res.status(204).end();

  const supabaseUrl = process.env.VITE_SUPABASE_URL;
  const serviceRoleKey = getServiceRoleKey();
  if (!supabaseUrl || !serviceRoleKey) {
    return res.status(500).json({
      success: false,
      error: 'Máy chủ chưa cấu hình SUPABASE_SERVICE_ROLE_KEY nên không đọc được hồ sơ đại biểu.',
    });
  }

  const db = createClient(supabaseUrl, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  // ----- POST: sinh đường dẫn thư mời cho màn hình quản trị -----
  if (req.method === 'POST') {
    const authError = await assertAdmin(req, supabaseUrl, serviceRoleKey);
    if (authError) return res.status(403).json({ success: false, error: authError });

    const ids: unknown = (req.body || {}).ids;
    if (!Array.isArray(ids) || ids.length === 0) {
      return res.status(400).json({ success: false, error: 'Thiếu danh sách mã đại biểu.' });
    }
    if (ids.length > 2000) {
      return res.status(400).json({ success: false, error: 'Mỗi lần chỉ sinh tối đa 2000 đường dẫn.' });
    }

    const base = getBaseUrl(req);
    const links: Record<string, string> = {};
    ids.forEach(raw => {
      const id = String(raw || '').trim();
      if (!id) return;
      links[id] = `${base}/?view=thu-moi&id=${encodeURIComponent(id)}&k=${signId(id, serviceRoleKey)}`;
    });

    return res.json({ success: true, links });
  }

  if (req.method !== 'GET') {
    return res.status(405).json({ success: false, error: 'Method not allowed' });
  }

  // ----- GET: dữ liệu cho trang thư mời -----
  const id = String(req.query.id || '').trim();
  const key = String(req.query.k || '').trim();
  if (!id || !key) {
    return res.status(400).json({ success: false, error: 'Đường dẫn thư mời không đầy đủ.' });
  }
  if (!safeEqual(key, signId(id, serviceRoleKey))) {
    return res.status(404).json({ success: false, error: 'Đường dẫn thư mời không hợp lệ hoặc đã hết hiệu lực.' });
  }

  const { data: attendee, error: attendeeError } = await db
    .from('attendees')
    .select('id, title, full_name, organization, department, package_name, avatar_url, nationality')
    .eq('id', id)
    .single();

  if (attendeeError || !attendee) {
    return res.status(404).json({ success: false, error: 'Không tìm thấy hồ sơ đại biểu.' });
  }

  // Chương trình hội nghị. Bảng có thể còn trống nếu Ban tổ chức chưa nhập lịch;
  // khi đó trang thư mời tự ẩn phần chương trình đi.
  const { data: sessions } = await db
    .from('sessions')
    .select('id, title, date, start_time, end_time, room_name, track, speaker_name')
    .order('date', { ascending: true })
    .order('start_time', { ascending: true });

  const { data: config } = await db
    .from('business_config')
    .select('event_name, organizer_name, event_date, event_location')
    .limit(1)
    .single();

  return res.json({
    success: true,
    attendee: {
      id: attendee.id,
      title: attendee.title || '',
      fullName: attendee.full_name || '',
      organization: attendee.organization || '',
      department: attendee.department || '',
      packageName: attendee.package_name || '',
      avatarUrl: attendee.avatar_url || '',
      nationality: attendee.nationality || 'vietname',
    },
    event: {
      name: config?.event_name || 'Hội nghị Khoa học Thường niên VSAPS 2026',
      organizer: config?.organizer_name || 'Hội Phẫu thuật Tạo hình Thẩm mỹ Việt Nam',
      date: config?.event_date || '11 – 13/12/2026',
      location: config?.event_location || 'Bệnh viện Quân y 175, TP. Hồ Chí Minh',
    },
    sessions: (sessions || []).map(s => ({
      id: s.id,
      title: s.title || '',
      date: s.date || '',
      startTime: s.start_time || '',
      endTime: s.end_time || '',
      roomName: s.room_name || '',
      track: s.track || '',
      speakerName: s.speaker_name || '',
    })),
  });
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  try {
    return await handleRequest(req, res);
  } catch (err: any) {
    console.error('Lỗi không bắt được trong /api/invitation:', err);
    if (res.headersSent) return;
    return res.status(500).json({
      success: false,
      error: `Lỗi hệ thống khi đọc thư mời: ${err?.message || String(err)}`,
    });
  }
}
