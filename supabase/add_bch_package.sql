-- SQL Script to add the free registration package for Executive Committee members (Ủy viên BCH Hội)
INSERT INTO public.packages (id, name, fee, benefits, is_active, includes_cme, includes_gala) VALUES
('pkg-bch', 'Ủy viên BCH Hội', 0, ARRAY[
  'Miễn phí tham dự dành riêng cho Ủy viên Ban Chấp hành Hội',
  'Tham dự đầy đủ các phiên báo cáo khoa học và khu vực triển lãm',
  'Bộ túi tài liệu, kỷ yếu và quà lưu niệm chính thức',
  'Miễn phí toàn bộ dịch vụ phụ trợ (CME, Gala Dinner, Master class, Tour)'
], true, true, true)
ON CONFLICT (id) DO NOTHING;
