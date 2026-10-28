-- ============================================================================
-- VSAPS 2026 — Bổ sung trường phục vụ cấp CME và cập nhật danh mục chuyên đề
--
-- Nguồn yêu cầu: Google Sheets "Đề xuất sửa vsapsevent.org" (mục I, IV, V).
-- Script chạy được nhiều lần, không làm mất dữ liệu đang có.
-- Cách chạy: Supabase Dashboard -> SQL Editor -> dán toàn bộ -> Run.
-- ============================================================================


-- ---------------------------------------------------------------------------
-- 1. ĐẠI BIỂU (mục I) — ngày sinh đầy đủ và nơi sinh
--
-- Trước đây chỉ có year_of_birth (chỉ năm), không đủ để làm hồ sơ cấp CME.
-- Cột year_of_birth vẫn giữ lại để các báo cáo và mẫu CME cũ không bị vỡ.
-- ---------------------------------------------------------------------------
ALTER TABLE public.attendees ADD COLUMN IF NOT EXISTS date_of_birth  TEXT;
ALTER TABLE public.attendees ADD COLUMN IF NOT EXISTS place_of_birth TEXT;

-- Cột này đã được thêm từ trước nhưng tầng ứng dụng chưa từng ghi vào,
-- nên ảnh bằng cấp đại biểu tải lên bị mất. Giữ lại đây cho chắc.
ALTER TABLE public.attendees ADD COLUMN IF NOT EXISTS doctor_proof_url TEXT;

COMMENT ON COLUMN public.attendees.date_of_birth  IS 'Ngày sinh đầy đủ YYYY-MM-DD, bắt buộc để cấp CME';
COMMENT ON COLUMN public.attendees.place_of_birth IS 'Nơi sinh theo giấy tờ, bắt buộc để cấp CME';


-- ---------------------------------------------------------------------------
-- 2. BÁO CÁO VIÊN (mục IV, V)
--
-- Mục IV: ngày sinh, nơi sinh, bằng cấp, số CCCD — đều cần để cấp CME.
-- Mục V : thêm hai trường bản tiếng Anh của tiểu sử và abstract để Ban tổ
--         chức tự dịch, phục vụ in kỷ yếu.
-- ---------------------------------------------------------------------------
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


-- ---------------------------------------------------------------------------
-- 3. CHUYÊN ĐỀ (mục IV)
--
-- Thêm cờ is_accepting_new để ngừng nhận đăng ký mới vào một chuyên đề mà
-- KHÔNG xóa nó đi. Lý do: tại thời điểm viết script, 46 hồ sơ đang thuộc
-- "Phẫu thuật tạo hình thẩm mỹ" và 4 hồ sơ thuộc "Da liễu thẩm mỹ" — đúng
-- hai chuyên đề mà file yêu cầu bỏ. Xóa thẳng sẽ làm 50 hồ sơ này trỏ tới
-- chuyên đề không còn tồn tại, kéo theo bộ lọc và nhãn màu hiển thị sai.
-- ---------------------------------------------------------------------------
ALTER TABLE public.specialty_tracks
  ADD COLUMN IF NOT EXISTS is_accepting_new BOOLEAN NOT NULL DEFAULT TRUE;

COMMENT ON COLUMN public.specialty_tracks.is_accepting_new
  IS 'FALSE = ẩn khỏi form đăng ký công khai, nhưng vẫn giữ cho hồ sơ cũ';


-- 3a. Bổ sung 10 chuyên đề mới theo file yêu cầu
INSERT INTO public.specialty_tracks (id, name, name_en, description, is_accepting_new) VALUES
  ('track-mui',          'Mũi',                               'Rhinoplasty',                 'Phẫu thuật và chỉnh hình mũi',                      TRUE),
  ('track-so-mat',       'Sọ mặt',                            'Craniofacial',                'Phẫu thuật sọ mặt',                                 TRUE),
  ('track-cang-da-mat',  'Căng da mặt',                       'Facelift',                    'Căng da mặt và trẻ hóa vùng mặt',                   TRUE),
  ('track-cang-chi',     'Căng chỉ',                          'Thread Lift',                 'Nâng cơ và trẻ hóa bằng chỉ',                       TRUE),
  ('track-mat',          'Mắt',                               'Blepharoplasty',              'Phẫu thuật tạo hình vùng mắt',                      TRUE),
  ('track-mat-cay-mo',   'Mặt, Cấy mỡ',                       'Face & Fat Grafting',         'Tạo hình vùng mặt và cấy ghép mỡ tự thân',          TRUE),
  ('track-nguc',         'Ngực',                              'Breast Surgery',              'Phẫu thuật tạo hình tuyến vú',                      TRUE),
  ('track-tao-hinh-co-the', 'Tạo hình cơ thể (Lipo ngực, mông)', 'Body Contouring',          'Tạo hình cơ thể, hút mỡ ngực và mông',              TRUE),
  ('track-bien-chung',   'Biến chứng',                        'Complications',               'Xử lý biến chứng trong phẫu thuật thẩm mỹ',         TRUE),
  ('track-khac',         'Khác',                              'Others',                      'Các nội dung chuyên môn khác',                      TRUE)
ON CONFLICT (id) DO UPDATE SET
  name             = EXCLUDED.name,
  name_en          = EXCLUDED.name_en,
  description      = EXCLUDED.description,
  is_accepting_new = EXCLUDED.is_accepting_new;


-- 3b. Ngừng nhận đăng ký mới vào hai chuyên đề mà file yêu cầu bỏ.
--     Hồ sơ cũ vẫn giữ nguyên chuyên đề, Ban tổ chức chuyển dần sang
--     chuyên đề mới trong màn hình Báo cáo viên.
UPDATE public.specialty_tracks
   SET is_accepting_new = FALSE
 WHERE name IN ('Phẫu thuật tạo hình thẩm mỹ', 'Da liễu thẩm mỹ');


-- 3c. "Thẩm mỹ nội khoa" được giữ lại và vẫn nhận đăng ký (file đánh TRUE).
UPDATE public.specialty_tracks
   SET is_accepting_new = TRUE
 WHERE name = 'Thẩm mỹ nội khoa';


-- ---------------------------------------------------------------------------
-- 4. Kiểm tra sau khi chạy
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
