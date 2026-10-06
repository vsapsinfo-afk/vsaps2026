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

Bấm **Tải Tệp Mẫu Excel**. Tệp có sẵn 11 cột và 2 dòng ví dụ để tham khảo cách điền.

| Cột trong tệp | Bắt buộc | Ghi chú |
|---|---|---|
| Học hàm học vị | Không | Để trống sẽ tự điền "BS." |
| **Họ và tên** | **Có** | Dòng nào trống cột này sẽ bị bỏ qua |
| Email | Không | Dùng để đối chiếu trùng, nên có |
| Số điện thoại | Không | Khoảng trắng thừa được tự cắt bỏ |
| Đơn vị công tác | Không | |
| Khoa/Phòng | Không | |
| Tóm lược quá trình công tác | Không | |
| Tên bài báo cáo | Không | |
| Chuyên đề | Không | Để trống sẽ lấy chuyên đề đầu tiên trong hệ thống |
| Abstract (Tóm tắt nội dung) | Không | Dán nguyên văn tóm tắt vào ô này |
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

## 3. File CV và Abstract dạng PDF/Word

Excel chỉ chứa được chữ, không chứa được tệp đính kèm. Cách làm:

1. Đưa file CV / abstract lên **Google Drive**.
2. Bấm chuột phải vào tệp → **Chia sẻ** → đổi quyền thành **"Bất kỳ ai có đường dẫn"**
   (mức xem). Nếu quên bước này, người trong Ban Tổ chức bấm vào sẽ báo không có quyền.
3. Sao chép đường dẫn, dán vào cột **Link CV/Abstract**.

Đường dẫn được lưu vào hồ sơ báo cáo viên và hiển thị như tệp đính kèm bình thường.

Nếu một người có nhiều tệp, có thể gom vào một thư mục Drive rồi dán đường dẫn thư mục.

---

## 4. Chi tiết kỹ thuật

| Thành phần | Vị trí |
|---|---|
| Giao diện, dò cột, xem trước | `src/views/SpeakerManagement.tsx` — `downloadSpeakerTemplate`, `parseSpeakerFile`, `handleConfirmImportSpeakers` |
| Lưu hàng loạt xuống CSDL | `src/dataStore.ts` — `saveSpeakersBulk` |

Trường dữ liệu được ghi: `title`, `fullName`, `organization`, `department`, `phone`,
`email`, `bio`, `presentationTitle`, `presentationTrack`, `abstractText`, `documentUrl`.
Hệ thống tự đặt `status: 'pending'`, `calendarSynced: false`, `registrationDate` là ngày
nạp, và sinh mã `SPK-xxxxx` không trùng với hồ sơ sẵn có.

### Lưu ý về bộ dò cột

Mỗi cột trong tệp **chỉ được gán cho đúng một trường**. Điều này cần thiết vì tiêu đề
"Link CV/**Abstract**" cũng chứa chữ *abstract*; nếu không loại trừ, cột Tóm tắt sẽ bắt
nhầm sang cột đường dẫn khi người dùng đảo thứ tự cột. Cột đường dẫn luôn được đọc
trước cột Abstract để tránh đúng tình huống này.

`saveSpeakersBulk` **không xử lý tệp base64** như `saveSpeakerAsync`, vì dữ liệu nhập từ
Excel chỉ mang đường dẫn chứ không mang nội dung tệp.
