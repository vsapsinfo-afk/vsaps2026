-- ============================================================
-- VSAPS 2026 — Cập nhật cơ sở dữ liệu
-- Sinh tự động từ api/db/_migrations.ts
-- Chạy lại nhiều lần vẫn an toàn, không làm mất dữ liệu.
-- ============================================================

-- Cách khác, không cần dán tay: vào admin, Cài đặt > Cơ sở dữ liệu,
-- bấm "Chạy cập nhật tự động".
--
-- Tệp này sinh ra từ api/db/_migrations.ts, sửa trực tiếp vào đây sẽ bị ghi đè.
-- Xem scripts/sync-migration-sql.ts.

-- Đại biểu: thêm ngày sinh, nơi sinh và ảnh bằng cấp
ALTER TABLE public.attendees ADD COLUMN IF NOT EXISTS date_of_birth  TEXT;
ALTER TABLE public.attendees ADD COLUMN IF NOT EXISTS place_of_birth TEXT;
ALTER TABLE public.attendees ADD COLUMN IF NOT EXISTS doctor_proof_url TEXT;

COMMENT ON COLUMN public.attendees.date_of_birth  IS 'Ngày sinh đầy đủ YYYY-MM-DD, bắt buộc để cấp CME';
COMMENT ON COLUMN public.attendees.place_of_birth IS 'Nơi sinh theo giấy tờ, bắt buộc để cấp CME';


-- Báo cáo viên: thêm ngày sinh, nơi sinh, số CCCD, ảnh bằng cấp và hai bản dịch tiếng Anh
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


-- Chuyên đề: thêm cờ ngừng nhận đăng ký mới
ALTER TABLE public.specialty_tracks
  ADD COLUMN IF NOT EXISTS is_accepting_new BOOLEAN NOT NULL DEFAULT TRUE;

COMMENT ON COLUMN public.specialty_tracks.is_accepting_new
  IS 'FALSE = ẩn khỏi form đăng ký công khai, nhưng vẫn giữ cho hồ sơ cũ';


-- Cấu hình: thêm cờ tự động gửi thư mời đại biểu
ALTER TABLE public.business_config
  ADD COLUMN IF NOT EXISTS auto_send_invitation_letter BOOLEAN DEFAULT FALSE;

COMMENT ON COLUMN public.business_config.auto_send_invitation_letter
  IS 'TRUE = tự động gửi thư mời cho đại biểu ngay khi hồ sơ hợp lệ';


-- Chuyên đề: bổ sung 10 chuyên đề mới
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


-- Chuyên đề: ngừng nhận đăng ký vào 2 chuyên đề cũ, hồ sơ cũ giữ nguyên
UPDATE public.specialty_tracks
   SET is_accepting_new = FALSE
 WHERE name IN ('Phẫu thuật tạo hình thẩm mỹ', 'Da liễu thẩm mỹ');

UPDATE public.specialty_tracks
   SET is_accepting_new = TRUE
 WHERE name = 'Thẩm mỹ nội khoa';


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
