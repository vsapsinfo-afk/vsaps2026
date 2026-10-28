/**
 * Các bước cập nhật cơ sở dữ liệu, chạy được từ màn hình Cài đặt trong admin.
 *
 * Đây là NGUỒN CHÍNH. Tệp `supabase/add_cme_and_track_fields.sql` là bản sao
 * để dán tay vào Supabase SQL Editor khi cần; script
 * `scripts/check-migrations-in-sync.mjs` kiểm tra hai bên không bị lệch nhau.
 *
 * Nguyên tắc cho mọi bước ở đây:
 *   - Chạy lại nhiều lần vẫn cho cùng kết quả (ADD COLUMN IF NOT EXISTS, ON CONFLICT)
 *   - Không bao giờ xóa cột hay xóa dữ liệu
 *   - Không nhận SQL từ phía người dùng, chỉ chạy đúng danh sách dưới đây
 */

export interface MigrationStep {
  /** Mã bước, dùng để báo kết quả về cho giao diện */
  id: string;
  /** Tên bước hiển thị cho Ban tổ chức */
  label: string;
  sql: string;
}

export const MIGRATION_STEPS: MigrationStep[] = [
  {
    id: 'attendee-cme-fields',
    label: 'Đại biểu: thêm ngày sinh, nơi sinh và ảnh bằng cấp',
    sql: `
      ALTER TABLE public.attendees ADD COLUMN IF NOT EXISTS date_of_birth  TEXT;
      ALTER TABLE public.attendees ADD COLUMN IF NOT EXISTS place_of_birth TEXT;
      ALTER TABLE public.attendees ADD COLUMN IF NOT EXISTS doctor_proof_url TEXT;

      COMMENT ON COLUMN public.attendees.date_of_birth  IS 'Ngày sinh đầy đủ YYYY-MM-DD, bắt buộc để cấp CME';
      COMMENT ON COLUMN public.attendees.place_of_birth IS 'Nơi sinh theo giấy tờ, bắt buộc để cấp CME';
    `,
  },
  {
    id: 'speaker-cme-fields',
    label: 'Báo cáo viên: thêm ngày sinh, nơi sinh, số CCCD, ảnh bằng cấp và hai bản dịch tiếng Anh',
    sql: `
      ALTER TABLE public.speakers ADD COLUMN IF NOT EXISTS date_of_birth    TEXT;
      ALTER TABLE public.speakers ADD COLUMN IF NOT EXISTS place_of_birth   TEXT;
      ALTER TABLE public.speakers ADD COLUMN IF NOT EXISTS identity_no      TEXT;
      ALTER TABLE public.speakers ADD COLUMN IF NOT EXISTS degree_proof_url TEXT;
      ALTER TABLE public.speakers ADD COLUMN IF NOT EXISTS bio_en           TEXT;
      ALTER TABLE public.speakers ADD COLUMN IF NOT EXISTS abstract_en      TEXT;

      COMMENT ON COLUMN public.speakers.date_of_birth    IS 'Ngày sinh đầy đủ YYYY-MM-DD, bắt buộc để cấp CME';
      COMMENT ON COLUMN public.speakers.place_of_birth   IS 'Nơi sinh theo giấy tờ, bắt buộc để cấp CME';
      COMMENT ON COLUMN public.speakers.identity_no      IS 'Số CCCD / định danh cá nhân, bắt buộc để cấp CME';
      COMMENT ON COLUMN public.speakers.degree_proof_url IS 'Ảnh bằng cấp, bắt buộc để cấp CME';
      COMMENT ON COLUMN public.speakers.bio_en           IS 'Tiểu sử khoa học bản tiếng Anh, Ban tổ chức tự dịch';
      COMMENT ON COLUMN public.speakers.abstract_en      IS 'Abstract bản tiếng Anh, Ban tổ chức tự dịch';
    `,
  },
  {
    id: 'track-accepting-flag',
    label: 'Chuyên đề: thêm cờ ngừng nhận đăng ký mới',
    sql: `
      ALTER TABLE public.specialty_tracks
        ADD COLUMN IF NOT EXISTS is_accepting_new BOOLEAN NOT NULL DEFAULT TRUE;

      COMMENT ON COLUMN public.specialty_tracks.is_accepting_new
        IS 'FALSE = ẩn khỏi form đăng ký công khai, nhưng vẫn giữ cho hồ sơ cũ';
    `,
  },
  {
    id: 'invitation-letter-flag',
    label: 'Cấu hình: thêm cờ tự động gửi thư mời đại biểu',
    sql: `
      ALTER TABLE public.business_config
        ADD COLUMN IF NOT EXISTS auto_send_invitation_letter BOOLEAN DEFAULT FALSE;

      COMMENT ON COLUMN public.business_config.auto_send_invitation_letter
        IS 'TRUE = tự động gửi thư mời cho đại biểu ngay khi hồ sơ hợp lệ';
    `,
  },
  {
    id: 'new-tracks',
    label: 'Chuyên đề: bổ sung 10 chuyên đề mới',
    sql: `
      INSERT INTO public.specialty_tracks (id, name, name_en, description, is_accepting_new) VALUES
        ('track-mui',             'Mũi',                               'Rhinoplasty',         'Phẫu thuật và chỉnh hình mũi',                TRUE),
        ('track-so-mat',          'Sọ mặt',                            'Craniofacial',        'Phẫu thuật sọ mặt',                           TRUE),
        ('track-cang-da-mat',     'Căng da mặt',                       'Facelift',            'Căng da mặt và trẻ hóa vùng mặt',             TRUE),
        ('track-cang-chi',        'Căng chỉ',                          'Thread Lift',         'Nâng cơ và trẻ hóa bằng chỉ',                 TRUE),
        ('track-mat',             'Mắt',                               'Blepharoplasty',      'Phẫu thuật tạo hình vùng mắt',                TRUE),
        ('track-mat-cay-mo',      'Mặt, Cấy mỡ',                       'Face & Fat Grafting', 'Tạo hình vùng mặt và cấy ghép mỡ tự thân',    TRUE),
        ('track-nguc',            'Ngực',                              'Breast Surgery',      'Phẫu thuật tạo hình tuyến vú',                TRUE),
        ('track-tao-hinh-co-the', 'Tạo hình cơ thể (Lipo ngực, mông)', 'Body Contouring',     'Tạo hình cơ thể, hút mỡ ngực và mông',        TRUE),
        ('track-bien-chung',      'Biến chứng',                        'Complications',       'Xử lý biến chứng trong phẫu thuật thẩm mỹ',   TRUE),
        ('track-khac',            'Khác',                              'Others',              'Các nội dung chuyên môn khác',                TRUE)
      ON CONFLICT (id) DO UPDATE SET
        name             = EXCLUDED.name,
        name_en          = EXCLUDED.name_en,
        description      = EXCLUDED.description,
        is_accepting_new = EXCLUDED.is_accepting_new;
    `,
  },
  {
    id: 'close-old-tracks',
    label: 'Chuyên đề: ngừng nhận đăng ký vào 2 chuyên đề cũ, hồ sơ cũ giữ nguyên',
    sql: `
      UPDATE public.specialty_tracks
         SET is_accepting_new = FALSE
       WHERE name IN ('Phẫu thuật tạo hình thẩm mỹ', 'Da liễu thẩm mỹ');

      UPDATE public.specialty_tracks
         SET is_accepting_new = TRUE
       WHERE name = 'Thẩm mỹ nội khoa';
    `,
  },
];

/**
 * Toàn bộ SQL ghép lại, dùng cho nút sao chép để dán tay vào SQL Editor.
 * `extraNote` là phần ghi chú thêm vào ngay dưới phần đầu tệp.
 */
export function buildFullMigrationSql(extraNote?: string): string {
  const header = [
    '-- ============================================================',
    '-- VSAPS 2026 — Cập nhật cơ sở dữ liệu',
    '-- Sinh tự động từ src/lib/dbMigrations.ts',
    '-- Chạy lại nhiều lần vẫn an toàn, không làm mất dữ liệu.',
    '-- ============================================================',
    '',
    ...(extraNote ? [extraNote.replace(/\n+$/, ''), '', ''] : []),
  ].join('\n');

  const body = MIGRATION_STEPS.map(step => {
    // Bỏ phần thụt lề chung của khối SQL cho dễ đọc khi dán ra ngoài
    const lines = step.sql.replace(/^\n+|\n+$/g, '').split('\n');
    const indents = lines
      .filter(l => l.trim().length > 0)
      .map(l => l.match(/^\s*/)?.[0].length ?? 0);
    const cut = indents.length > 0 ? Math.min(...indents) : 0;
    const sql = lines.map(l => l.slice(cut)).join('\n');
    return `-- ${step.label}\n${sql}`;
  }).join('\n\n');

  return `${header}${body}\n`;
}

/**
 * Các cột mới cần có, để màn hình Cài đặt tự kiểm tra xem đã cập nhật chưa.
 * Kiểm tra được từ trình duyệt: chọn đúng cột đó, lỗi tức là cột chưa có.
 */
export const EXPECTED_COLUMNS: { table: string; column: string; label: string }[] = [
  { table: 'attendees', column: 'date_of_birth', label: 'Đại biểu — Ngày sinh' },
  { table: 'attendees', column: 'place_of_birth', label: 'Đại biểu — Nơi sinh' },
  { table: 'attendees', column: 'doctor_proof_url', label: 'Đại biểu — Ảnh bằng cấp' },
  { table: 'speakers', column: 'date_of_birth', label: 'Báo cáo viên — Ngày sinh' },
  { table: 'speakers', column: 'place_of_birth', label: 'Báo cáo viên — Nơi sinh' },
  { table: 'speakers', column: 'identity_no', label: 'Báo cáo viên — Số CCCD' },
  { table: 'speakers', column: 'degree_proof_url', label: 'Báo cáo viên — Ảnh bằng cấp' },
  { table: 'speakers', column: 'bio_en', label: 'Báo cáo viên — Tiểu sử tiếng Anh' },
  { table: 'speakers', column: 'abstract_en', label: 'Báo cáo viên — Abstract tiếng Anh' },
  { table: 'specialty_tracks', column: 'is_accepting_new', label: 'Chuyên đề — Cờ ngừng nhận mới' },
  { table: 'business_config', column: 'auto_send_invitation_letter', label: 'Cấu hình — Tự động gửi thư mời' },
];
