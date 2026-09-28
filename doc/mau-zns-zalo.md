# Mẫu ZNS Zalo cho VSAPS 2026 — bản nháp để đăng ký duyệt

> Tài liệu nội bộ. Các mẫu dưới đây soạn theo nguyên tắc duyệt chung của ZNS và
> bám đúng bộ tham số hệ thống đang gửi. **Quyền duyệt thuộc về Zalo** và tiêu chí
> của họ có thay đổi theo thời gian, nên đây là bản nháp để nộp, không phải cam kết
> chắc chắn được duyệt.

---

## 1. Nguyên tắc cốt lõi: loại mẫu quyết định tỉ lệ duyệt

ZNS phân loại mẫu theo mục đích. Dễ duyệt nhất là **mẫu Giao dịch** — báo lại cho
người dùng kết quả của một việc **chính họ vừa làm**.

| Nội dung | Khả năng duyệt | Lý do |
|---|---|---|
| Xác nhận đã đăng ký thành công | Cao | Người dùng vừa tự điền form |
| Xác nhận đã nhận lệ phí | Cao | Ghi nhận giao dịch có thật |
| Gửi vé điện tử / mã check-in | Cao | Hệ quả trực tiếp của việc đăng ký |
| Nhắc lịch tham dự | Khá | Chỉ gửi cho người đã đăng ký |
| Thông báo đổi lịch, đổi địa điểm | Cao | Thông tin bắt buộc phải báo |
| **Mời tham dự hội nghị** | **Thấp** | Gửi cho người chưa đăng ký = quảng cáo |
| Giới thiệu gói ưu đãi, kêu gọi đăng ký sớm | **Rất thấp** | Quảng cáo rõ ràng |

Nguyên tắc ngầm: ZNS tồn tại để **báo tin cho người đã có quan hệ với bạn**, không
phải để tiếp thị. Mọi mẫu mang hơi hướng mời chào đều rủi ro cao.

### Những thứ khiến mẫu bị từ chối

- Từ ngữ tiếp thị: *khuyến mãi, ưu đãi, giảm giá, nhanh tay, cơ hội, đăng ký ngay, hot, đặc biệt*
- Viết IN HOA cả câu, nhiều dấu chấm than, lạm dụng emoji
- Nội dung chung chung, không nêu rõ việc gì vừa xảy ra
- Dùng tham số để nhét nội dung quảng cáo (Zalo kiểm tra dữ liệu mẫu bạn khai)
- Link trỏ tới tên miền chưa đăng ký với Zalo
- Nội dung không khớp loại mẫu đã chọn

---

## 2. Các mẫu đề xuất

Tham số hệ thống đang gửi: `title`, `fullname`, `package`, `code`, `payment_status`,
`organization`, `email`, `phone`, `presentation_title`, `track`, `qr_url`.

Mỗi mẫu dưới đây chỉ dùng tham số **thật sự cần** — càng ít tham số thừa càng dễ duyệt.

### Mẫu 1 — Xác nhận đăng ký thành công (Giao dịch)

> **Ưu tiên đăng ký mẫu này trước.** Dễ duyệt nhất và dùng nhiều nhất.

```
Tiêu đề: Xác nhận đăng ký tham dự VSAPS 2026

Kính chào <title> <fullname>,

Ban Tổ chức đã tiếp nhận hồ sơ đăng ký tham dự Hội nghị Khoa học
Thường niên VSAPS 2026 của quý đại biểu.

Mã đại biểu: <code>
Gói tham dự: <package>
Đơn vị công tác: <organization>
Trạng thái lệ phí: <payment_status>

Quý đại biểu vui lòng giữ mã đại biểu để làm thủ tục check-in
tại hội nghị.
```

Tham số dùng: `title`, `fullname`, `code`, `package`, `organization`, `payment_status`

---

### Mẫu 2 — Xác nhận đã nhận lệ phí (Giao dịch)

```
Tiêu đề: Xác nhận đã nhận lệ phí tham dự

Kính chào <title> <fullname>,

Ban Tổ chức xác nhận đã nhận được lệ phí tham dự của quý đại biểu.

Mã đại biểu: <code>
Gói tham dự: <package>
Trạng thái: <payment_status>

Vé điện tử và mã QR check-in của quý đại biểu đã được kích hoạt.
```

Tham số dùng: `title`, `fullname`, `code`, `package`, `payment_status`

---

### Mẫu 3 — Vé điện tử kèm mã QR check-in (Giao dịch)

> Mẫu này cần chọn bố cục có **ảnh** hoặc bố cục voucher trong ZNS console, rồi gán
> `qr_url` vào ô ảnh. **Không** đặt `qr_url` làm tham số chữ — URL dài khoảng 110 ký
> tự, để ở ô chữ gần như chắc chắn vượt giới hạn và tin nhắn sẽ thất bại.

```
Tiêu đề: Vé điện tử tham dự VSAPS 2026

Kính chào <title> <fullname>,

Đây là vé điện tử tham dự hội nghị của quý đại biểu.

Mã đại biểu: <code>
Gói tham dự: <package>

Vui lòng xuất trình mã QR này tại quầy lễ tân để làm thủ tục check-in.
```

Tham số dùng: `title`, `fullname`, `code`, `package`, `qr_url` (dạng ảnh)

---

### Mẫu 4 — Nhắc lịch tham dự (Giao dịch)

> Chỉ gửi cho người **đã đăng ký**. Gửi cho danh sách ngoài sẽ bị coi là quảng cáo.

```
Tiêu đề: Nhắc lịch tham dự VSAPS 2026

Kính chào <title> <fullname>,

Hội nghị Khoa học Thường niên VSAPS 2026 sắp diễn ra.

Mã đại biểu: <code>
Gói tham dự: <package>

Quý đại biểu vui lòng có mặt trước giờ khai mạc 30 phút để làm
thủ tục check-in và nhận tài liệu hội nghị.
```

Tham số dùng: `title`, `fullname`, `code`, `package`

---

### Mẫu 5 — Xác nhận bài báo cáo (Giao dịch)

```
Tiêu đề: Xác nhận bài báo cáo khoa học

Kính chào <title> <fullname>,

Hội đồng khoa học đã tiếp nhận bài báo cáo của quý đại biểu.

Tên bài: <presentation_title>
Chuyên đề: <track>
Mã đại biểu: <code>

Ban Tổ chức sẽ gửi lịch trình báo cáo chi tiết đến quý đại biểu
trong thời gian tới.
```

Tham số dùng: `title`, `fullname`, `presentation_title`, `track`, `code`

> `presentation_title` là trường dài nhất trong bộ tham số. Khi khai báo nhớ chọn
> kiểu cho phép độ dài lớn, và kiểm tra tên bài dài nhất trong dữ liệu thật có vừa không.

---

## 3. Mẹo tăng khả năng duyệt

1. **Nộp từng mẫu một, bắt đầu bằng Mẫu 1.** Được duyệt rồi hãy nộp tiếp — nộp ồ ạt
   mà sai hướng thì mất thời gian cả loạt.
2. **Dữ liệu mẫu khi nộp phải giống thật.** Đừng điền `<fullname>` = "abc" hay "test".
   Điền "Nguyễn Văn A", "Bệnh viện Chợ Rẫy", "VSAPS2026-123456". Zalo xét cả dữ liệu mẫu.
3. **Bỏ mọi tham số không dùng tới.** Mẫu càng gọn càng dễ qua.
4. **Giữ giọng văn hành chính, trung tính.** Không cảm thán, không mời chào.
5. **Kiểm tra độ dài tham số ngay trên console** — giới hạn hiện cạnh từng tham số lúc
   khai báo. Đối chiếu với dữ liệu dài nhất trong danh sách đại biểu thật.
6. **Nếu bị từ chối**, Zalo có nêu lý do. Sửa đúng chỗ đó rồi nộp lại, đừng viết lại từ đầu.

---

## 4. Lưu ý kỹ thuật phía hệ thống

Sau khi mẫu được duyệt, Zalo cấp một **template ID**. Dán ID đó vào cấu hình mẫu
thông báo trong app (trường `znsTemplateId`).

Hệ thống hiện gửi cả 11 tham số cho mọi mẫu. Tham số thừa thường được bỏ qua, nhưng
**tham số thiếu hoặc vượt độ dài sẽ làm tin nhắn thất bại hoàn toàn** — không phải bị
cắt ngắn. Hiện code chưa kiểm soát độ dài trước khi gửi
(`src/dataStore.ts`, phần dựng `template_data`), nên nếu gặp lỗi rải rác ở một số đại
biểu thì nhiều khả năng do tên đơn vị hoặc tên bài báo cáo quá dài.
