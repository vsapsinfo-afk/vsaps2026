/**
 * Sinh tệp supabase/add_cme_and_track_fields.sql từ src/lib/dbMigrations.ts.
 *
 * Nguồn chính là src/lib/dbMigrations.ts (màn hình Cài đặt chạy trực tiếp từ đó).
 * Tệp .sql chỉ là bản sao để dán tay vào Supabase SQL Editor khi cần, nên phải
 * sinh lại mỗi khi sửa các bước cập nhật, tránh hai bên lệch nhau.
 *
 * Dùng:
 *   npx tsx scripts/sync-migration-sql.ts          # sinh lại tệp .sql
 *   npx tsx scripts/sync-migration-sql.ts --check  # chỉ kiểm tra, lệch thì báo lỗi
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { buildFullMigrationSql } from '../src/lib/dbMigrations';

const here = path.dirname(fileURLToPath(import.meta.url));
const target = path.resolve(here, '../supabase/add_cme_and_track_fields.sql');

const FOOTER = `
-- ---------------------------------------------------------------------------
-- Kiểm tra sau khi chạy
-- ---------------------------------------------------------------------------
-- Danh mục chuyên đề và số hồ sơ còn tồn ở mỗi chuyên đề:
--
--   SELECT t.name,
--          t.is_accepting_new,
--          (SELECT COUNT(*) FROM public.speakers s
--             WHERE s.presentation_track = t.name) AS so_ho_so
--     FROM public.specialty_tracks t
--    ORDER BY t.is_accepting_new DESC, so_ho_so DESC;
--
-- Khi so_ho_so của hai chuyên đề cũ về 0, có thể xóa hẳn:
--
--   DELETE FROM public.specialty_tracks
--    WHERE name IN ('Phẫu thuật tạo hình thẩm mỹ', 'Da liễu thẩm mỹ');
-- ---------------------------------------------------------------------------
`;

const NOTE = `-- Cách khác, không cần dán tay: vào admin, Cài đặt > Cơ sở dữ liệu,
-- bấm "Chạy cập nhật tự động".
--
-- Tệp này sinh ra từ src/lib/dbMigrations.ts, sửa trực tiếp vào đây sẽ bị ghi đè.
-- Xem scripts/sync-migration-sql.ts.`;

const withNote = buildFullMigrationSql(NOTE).replace(/\n$/, '') + '\n' + FOOTER;

const isCheck = process.argv.includes('--check');
const existing = fs.existsSync(target) ? fs.readFileSync(target, 'utf8') : '';

// So sánh sau khi chuẩn hóa ngắt dòng, vì Windows hay đổi LF thành CRLF
const norm = (s: string) => s.replace(/\r\n/g, '\n');

if (isCheck) {
  if (norm(existing) !== norm(withNote)) {
    console.error(
      'LỆCH: supabase/add_cme_and_track_fields.sql không khớp src/lib/dbMigrations.ts.\n'
      + 'Chạy: npx tsx scripts/sync-migration-sql.ts'
    );
    process.exit(1);
  }
  console.log('Khớp: tệp .sql đúng với src/lib/dbMigrations.ts');
  process.exit(0);
}

fs.writeFileSync(target, withNote, 'utf8');
console.log(`Đã sinh lại ${path.relative(path.resolve(here, '..'), target)}`);
