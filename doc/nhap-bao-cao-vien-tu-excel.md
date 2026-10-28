# Nhập Báo cáo viên từ Excel

> Tài liệu nội bộ cho Ban Thư ký VSAPS 2026.

---

## 1. Dùng khi nào

Nhiều báo cáo viên gửi hồ sơ thẳng qua email cho Ban Thư ký thay vì điền form đăng ký
trên hệ thống. Trước đây phải mở từng email rồi gõ tay vào phần mềm, rất mất thời gian.

Chức năng này cho phép **tổng hợp tất cả vào một tệp Excel rồi nạp một lượt**.

Vào **Báo Cáo Viên** → bấm nút **Nhập Từ Excel** (màu xanh lá, cạnh nút Xuất File Báo Cáo).

---

## 2. Ba bước thực hiện

### Bước 1 — Tải tệp mẫu

Bấm **Tải Tệp Mẫu Excel**. Tệp có sẵn 18 cột và 2 dòng ví dụ để tham khảo cách điền.
Tên cột đặt trùng với tệp ở nút **Xuất File Báo Cáo**, nên có thể xuất ra, sửa, rồi nạp lại.

| Cột trong tệp | Bắt buộc | Ghi chú |
|---|---|---|
| Học hàm học vị | Không | Để trống sẽ tự điền "BS." |
| **Họ và tên** | **Có** | Dòng nào trống cột này sẽ bị bỏ qua |
| Ngày sinh | Không | Cần để cấp CME. Nhận 15/03/1975, 1975-03-15, hoặc ô định dạng Date của Excel |
| Nơi sinh | Không | Cần để cấp CME |
| Số CCCD | Không | Cần để cấp CME |
| Email | Không | Dùng để đối chiếu trùng, nên có |
| Số điện thoại | Không | Khoảng trắng thừa được tự cắt bỏ, chữ số 0 ở đầu được tự khôi phục |
| Đơn vị công tác | Không | |
| Khoa/Phòng | Không | |
| Tóm lược quá trình công tác | Không | |
| Tóm lược quá trình công tác (tiếng Anh) | Không | Bản dịch để in kỷ yếu |
| Tên bài báo cáo | Không | |
| Chuyên đề | Không | Để trống sẽ lấy chuyên đề đầu tiên còn nhận đăng ký |
| Abstract (Tóm tắt nội dung) | Không | Dán nguyên văn tóm tắt vào ô này |
| Abstract (tiếng Anh) | Không | Bản dịch để in kỷ yếu |
| Link ảnh chân dung | Không | Xem mục 3 |
| Link ảnh bằng cấp | Không | Xem mục 3 |
| Link CV/Abstract (Google Drive) | Không | Xem mục 3 |

**Không cần giữ nguyên tên tiêu đề tuyệt đối.** Hệ thống dò cột linh hoạt: "Họ tên",
"Học vị *", "Mail liên hệ", "SĐT", "Cơ quan công tác", "Bộ môn", "Đề tài", "Phân ban",
"Tóm tắt", "Đường dẫn hồ sơ" đều nhận đúng. Thứ tự cột cũng không quan trọng.

### Bước 2 — Chọn tệp đã điền

Nhận các định dạng `.xlsx`, `.xls`, `.csv`. Hệ thống đọc **trang tính đầu tiên**.

### Bước 3 — Kiểm tra rồi nạp

Bảng xem trước liệt kê từng hồ sơ. Những ô còn thiếu được tô chữ **thiếu** màu cam để
dễ phát hiện trước khi nạp. Cột Hồ sơ có nút **mở link** để kiểm tra đường dẫn Drive
có xem được không.

Tuỳ chọn **"Bỏ qua hồ sơ đã có trên hệ thống"** (mặc định bật) đối chiếu theo email;
nếu email trống thì đối chiếu theo họ tên kết hợp đơn vị công tác.

Sau khi nạp, toàn bộ hồ sơ ở trạng thái **Đang chờ** để Ban Thư ký rà soát rồi phê duyệt
như hồ sơ đăng ký qua form.

---

## 3. Ảnh và file CV / Abstract dạng PDF/Word

Excel chỉ chứa được chữ, không chứa được ảnh hay tệp đính kèm. Cách làm:

1. Đưa ảnh và file CV / abstract lên **Google Drive**.
2. Bấm chuột phải vào tệp → **Chia sẻ** → đổi quyền thành **"Bất kỳ ai có đường dẫn"**
   (mức xem). Nếu quên bước này, người trong Ban Tổ chức bấm vào sẽ báo không có quyền.
3. Sao chép đường dẫn, dán vào đúng cột:

| Cột | Dán đường dẫn của |
|---|---|
| Link ảnh chân dung | Ảnh chân dung báo cáo viên, dùng in kỷ yếu và thẻ đại biểu |
| Link ảnh bằng cấp | Ảnh bằng cấp, cần để cấp chứng chỉ CME |
| Link CV/Abstract | File CV, abstract hoặc bài đầy đủ |

Đường dẫn được lưu vào hồ sơ báo cáo viên và hiển thị như tệp đính kèm bình thường.

Nếu một người có nhiều tệp, có thể gom vào một thư mục Drive rồi dán đường dẫn thư mục.

> Hai cột ảnh chỉ nhận đường dẫn thật bắt đầu bằng `http`. Ô nào ghi chữ khác — ví dụ
> ghi chú *"Ảnh lưu trong hệ thống, chưa có link"* của tệp xuất — sẽ được bỏ qua chứ
> không bị lưu thành đường dẫn sai.

---

## 4. Chi tiết kỹ thuật

| Thành phần | Vị trí |
|---|---|
| Giao diện, dò cột, xem trước | `src/views/SpeakerManagement.tsx` — `downloadSpeakerTemplate`, `parseSpeakerFile`, `handleConfirmImportSpeakers` |
| Lưu hàng loạt xuống CSDL | `src/dataStore.ts` — `saveSpeakersBulk` |

Trường dữ liệu được ghi: `title`, `fullName`, `dateOfBirth`, `placeOfBirth`,
`identityNo`, `organization`, `department`, `phone`, `email`, `bio`, `bioEn`,
`presentationTitle`, `presentationTrack`, `abstractText`, `abstractEn`, `avatarUrl`,
`degreeProofUrl`, `documentUrl`.
Hệ thống tự đặt `status: 'pending'`, `calendarSynced: false`, `registrationDate` là ngày
nạp, và sinh mã `SPK-xxxxx` không trùng với hồ sơ sẵn có.

### Lưu ý về bộ dò cột

Bộ dò cột dùng chung ở `src/lib/exportHelpers.ts` — `createColumnPicker`.

Mỗi cột trong tệp **chỉ được gán cho đúng một trường**, và thứ tự dò đi từ cột cụ thể
tới cột chung. Ba cái bẫy phải tránh:

- Tiêu đề `"Link CV/Abstract"` cũng chứa chữ *abstract*, nên cột đường dẫn luôn được
  đọc **trước** cột Abstract
- Tiêu đề bản tiếng Anh chứa trọn tiêu đề tiếng Việt: `"Abstract (tiếng Anh)"` chứa
  `"Abstract"`, nên hai cột tiếng Anh được đọc **trước** hai cột tiếng Việt
- Ba cột ảnh và tệp đều bắt đầu bằng chữ `"Link"`, nên hai cột ảnh được đọc bằng từ
  khóa riêng (*chân dung*, *bằng cấp*) **trước** cột tệp đính kèm

Danh sách từ khóa của cột tiếng Anh dùng chung biến `bioKeys` với cột tiếng Việt, nếu
để lệch thì những tiêu đề như `"Giới thiệu bản thân (English)"` sẽ không khớp.

`saveSpeakersBulk` **không xử lý tệp base64** như `saveSpeakerAsync`, vì dữ liệu nhập từ
Excel chỉ mang đường dẫn chứ không mang nội dung tệp.
