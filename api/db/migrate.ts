/**
 * Chạy cập nhật cơ sở dữ liệu từ màn hình Cài đặt trong admin, thay cho việc
 * dán tay script SQL vào Supabase SQL Editor.
 *
 * GET  — trả về danh sách bước và toàn bộ SQL, để giao diện hiển thị và cho
 *        phép sao chép. Không cần quyền gì, vì nội dung này vốn đã nằm trong
 *        mã nguồn, không chứa thông tin bí mật.
 * POST — thực sự chạy cập nhật. Yêu cầu người gọi đang đăng nhập với vai trò
 *        admin.
 *
 * An toàn:
 *   - Endpoint KHÔNG nhận SQL từ phía người dùng. Chỉ chạy đúng danh sách
 *     bước cố định trong src/lib/dbMigrations.ts.
 *   - Mọi bước đều thuộc dạng chạy lại được, không xóa cột và không xóa dữ liệu.
 *   - POST phải kèm access token của một tài khoản có vai trò admin.
 */
import { createClient } from '@supabase/supabase-js';
import type { VercelRequest, VercelResponse } from '@vercel/node';
import pg from 'pg';
import { MIGRATION_STEPS, buildFullMigrationSql } from '../../src/lib/dbMigrations';

/** Địa chỉ Supabase SQL Editor của chính dự án, để giao diện mở nhanh. */
function buildSqlEditorUrl(supabaseUrl: string | undefined): string | null {
  if (!supabaseUrl) return null;
  // https://<ref>.supabase.co  ->  https://supabase.com/dashboard/project/<ref>/sql/new
  const m = supabaseUrl.match(/^https?:\/\/([a-z0-9]+)\.supabase\.co/i);
  return m ? `https://supabase.com/dashboard/project/${m[1]}/sql/new` : null;
}

/**
 * Kiểm tra người gọi có phải admin đang đăng nhập.
 * Trả về chuỗi lỗi, hoặc null nếu hợp lệ.
 */
async function assertAdmin(req: VercelRequest): Promise<string | null> {
  const authHeader = String(req.headers.authorization || '');
  const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7).trim() : '';
  if (!token) {
    return 'Thiếu phiên đăng nhập. Vui lòng đăng nhập lại rồi thử lại.';
  }

  const supabaseUrl = process.env.VITE_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY
    || process.env.SUPABASE_SERVICE_KEY
    || process.env.SUPABASE_SERVICE_ROLE;

  if (!supabaseUrl || !serviceRoleKey) {
    return 'Chưa cấu hình SUPABASE_SERVICE_ROLE_KEY trên Vercel nên không kiểm tra được quyền admin.';
  }

  const admin = createClient(supabaseUrl, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  const { data: userData, error: userError } = await admin.auth.getUser(token);
  if (userError || !userData?.user) {
    return 'Phiên đăng nhập không còn hợp lệ. Vui lòng đăng nhập lại.';
  }

  const { data: profile, error: profileError } = await admin
    .from('user_accounts')
    .select('role, status')
    .eq('id', userData.user.id)
    .single();

  if (profileError || !profile) {
    return 'Không đọc được vai trò của tài khoản đang đăng nhập.';
  }
  if (profile.status !== 'active') {
    return 'Tài khoản đang bị khóa.';
  }
  if (profile.role !== 'admin') {
    return 'Chỉ tài khoản Admin được phép cập nhật cơ sở dữ liệu.';
  }
  return null;
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') return res.status(204).end();

  const connectionString = process.env.DATABASE_URL;
  const canRunAutomatically = !!connectionString
    && !connectionString.includes('YOUR_DATABASE_PASSWORD');

  // ----- GET: thông tin để giao diện hiển thị -----
  if (req.method === 'GET') {
    return res.json({
      success: true,
      canRunAutomatically,
      steps: MIGRATION_STEPS.map(s => ({ id: s.id, label: s.label })),
      sql: buildFullMigrationSql(),
      sqlEditorUrl: buildSqlEditorUrl(process.env.VITE_SUPABASE_URL),
    });
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ success: false, error: 'Method not allowed' });
  }

  // ----- POST: chạy cập nhật -----
  if (!canRunAutomatically) {
    return res.status(400).json({
      success: false,
      needsDatabaseUrl: true,
      error: 'Chưa cấu hình DATABASE_URL trên Vercel nên không chạy tự động được. '
        + 'Hãy dùng nút sao chép SQL rồi dán vào Supabase SQL Editor, '
        + 'hoặc thêm biến môi trường DATABASE_URL rồi deploy lại.',
    });
  }

  const authError = await assertAdmin(req);
  if (authError) {
    return res.status(403).json({ success: false, error: authError });
  }

  const client = new pg.Client({
    connectionString,
    ssl: { rejectUnauthorized: false },
    // Không để hàm serverless treo nếu cơ sở dữ liệu không phản hồi
    connectionTimeoutMillis: 15000,
    statement_timeout: 60000,
  });

  const results: { id: string; label: string; ok: boolean; error?: string }[] = [];

  try {
    await client.connect();
  } catch (err: any) {
    return res.status(500).json({
      success: false,
      error: `Không kết nối được cơ sở dữ liệu: ${err?.message || err}. `
        + 'Kiểm tra lại DATABASE_URL — nên dùng chuỗi "Session pooler" trong '
        + 'Supabase Dashboard > Project Settings > Database, vì chuỗi kết nối '
        + 'trực tiếp chỉ hỗ trợ IPv6 nên Vercel không gọi tới được.',
    });
  }

  try {
    // Chạy tuần tự từng bước. Bước nào lỗi thì ghi nhận rồi chạy tiếp các bước
    // còn lại, để một bước hỏng không chặn toàn bộ phần sau.
    for (const step of MIGRATION_STEPS) {
      try {
        await client.query(step.sql);
        results.push({ id: step.id, label: step.label, ok: true });
      } catch (err: any) {
        results.push({
          id: step.id,
          label: step.label,
          ok: false,
          error: err?.message || String(err),
        });
      }
    }
  } finally {
    try {
      await client.end();
    } catch {
      /* đóng kết nối lỗi thì bỏ qua, không ảnh hưởng kết quả */
    }
  }

  const failed = results.filter(r => !r.ok);
  return res.json({
    success: failed.length === 0,
    results,
    message: failed.length === 0
      ? `Đã cập nhật xong ${results.length} bước.`
      : `${results.length - failed.length}/${results.length} bước thành công, ${failed.length} bước lỗi.`,
  });
}
