# Quy trình xác nhận đăng ký & gửi Email trên hệ thống VSAPS 2026

> Tài liệu nội bộ dành cho Ban Thư ký — dùng để tra cứu và phản hồi khi đại biểu báo "đã đăng ký nhưng chưa nhận được mail xác nhận".

---

## 1. Tổng quan luồng

```
Đại biểu điền form công khai
        │
        ▼
[Lưu hồ sơ] paymentStatus = pending_verification (Chờ đối soát)
        │
        ├──► Zalo ZNS      (chạy nền)
        ├──► EMAIL         (chạy nền)  ← Mail xác nhận ĐĂNG KÝ + hướng dẫn chuyển khoản + VietQR
        └──► WhatsApp      (chạy nền)
        │
        ▼
BTC đối soát chuyển khoản → đổi trạng thái sang PAID (thủ công)
        │
        ▼
Hệ thống TỰ ĐỘNG gửi mail XÁC NHẬN THANH TOÁN + QR check-in
```

---

## 2. Chi tiết từng bước

### Bước 1 — Đại biểu bấm "Gửi đăng ký"

File: [src/views/PublicDelegateRegister.tsx:524-540](../src/views/PublicDelegateRegister.tsx#L524-L540)

- Hồ sơ được lưu với `paymentStatus = 'pending_verification'` (**Chờ đối soát**), **chưa** phải trạng thái đã xác nhận hoàn tất.
- Hệ thống bắn thông báo qua 3 kênh:

```ts
// Zalo & WhatsApp: chạy nền, không chặn luồng hoàn tất đăng ký
try {
  store.sendZaloZNS(saved);
  store.sendWhatsapp(saved);
} catch (err) {
  console.error('Lỗi khi gửi thông báo Zalo/WhatsApp:', err);
}

// Email: CHỜ kết quả thật để biết thư có đi được hay không
let emailOk = false;
try {
  const emailLog = await store.sendEmail(saved);
  emailOk = emailLog?.status === 'success';
} catch (err) { /* ... */ }
setEmailDeliveryFailed(!emailOk);
```

> ✅ **Đã fix:** trước đây cả 3 lệnh đều **không `await`** và nuốt lỗi, nên đại biểu vẫn thấy màn hình
> "Đăng ký thành công — đã gửi qua Email" kể cả khi mail rớt. Nay nếu gửi mail thất bại, màn hình
> hoàn tất sẽ hiện **cảnh báo rõ ràng** thay vì khẳng định sai (xem mục 7).

### Bước 2 — Mail xác nhận ĐĂNG KÝ

File: [src/dataStore.ts:2861](../src/dataStore.ts#L2861) (hàm `sendEmail`)

| Hạng mục | Giá trị |
|---|---|
| Template | `registration_success` — *"Đăng Ký Đại Biểu Thành Công (Email)"* |
| Đường đi | `POST /api/email/send` → nodemailer (SMTP) |
| Cấu hình SMTP | Lấy từ màn hình Cài đặt, hoặc fallback bảng `system_config.email_config` trên Supabase |
| Kênh thay thế | Resend API (nếu truyền `apiKey` / `provider = 'resend'`) |

File API: [api/email/send.ts](../api/email/send.ts)

Nội dung mail ở bước này (do chưa thanh toán):

- ✅ Có: thông tin đại biểu, mã đại biểu, gói đăng ký, **hướng dẫn chuyển khoản + mã VietQR**
- ❌ Chưa có: **QR check-in** (chỉ hiển thị khi `paymentStatus = paid`)

Thông tin chuyển khoản in trong mail:

```
Ngân hàng:      Vietcombank (VCB)
Số tài khoản:   0331000516283
Chủ tài khoản:  HOI PHAU THUAT TAO HINH THAM MY VIET NAM
Cú pháp CK:     VSAPS26-<HỌ TÊN KHÔNG DẤU> <SỐ ĐIỆN THOẠI>
```

### Bước 3 — Mail xác nhận THANH TOÁN (kèm QR check-in)

File: [src/views/AttendeeManagement.tsx:949-957](../src/views/AttendeeManagement.tsx#L949-L957)

- **Không tự động chạy sau khi đăng ký.**
- Chỉ kích hoạt khi BTC đối soát xong và **đổi trạng thái đại biểu sang `PAID`** trong Quản lý Đại biểu (dropdown ở bảng, hoặc trong modal chi tiết đại biểu).
- Khi đó hệ thống tự gửi template `payment_confirmed` qua cả Email / Zalo ZNS / WhatsApp, mail lúc này **có QR check-in**.

### Bước 4 — Nhật ký gửi

File: [src/dataStore.ts:2710](../src/dataStore.ts#L2710) (hàm `addNotificationLog`)

- Mọi lần gửi (thành công hay thất bại) đều ghi vào bảng `notification_logs` trên Supabase **và** localStorage.
- Mỗi log có `status` = `success` / `failed` kèm `response.message` mô tả lỗi cụ thể (ví dụ lỗi SMTP authentication).
- Xem tại: **Module Thông báo → nhật ký gửi**.

---

## 3. Checklist xử lý khi đại biểu báo "chưa nhận được mail"

| # | Việc cần làm | Nơi thao tác |
|---|---|---|
| 1 | Tìm đại biểu theo tên/SĐT, xác nhận hồ sơ **có tồn tại** trên hệ thống | Quản lý Đại biểu |
| 2 | **Kiểm tra email nhập có đúng chính tả không** (nguyên nhân phổ biến nhất) | Chi tiết đại biểu |
| 3 | Lọc nhật ký theo email đó, xem `success` hay `failed` | Module Thông báo → nhật ký |
| 4 | Nếu `failed`: đọc thông báo lỗi trong log (thường là app-password SMTP hết hạn / sai cấu hình) → sửa ở Cài đặt Email | Cài đặt |
| 5 | Nếu email sai: sửa lại email trong chi tiết đại biểu | Chi tiết đại biểu |
| 6 | **Gửi lại 1 người**: bấm nút ✉️ *"Soạn & Gửi Email thông báo nhanh"* → mẫu *Thư xác nhận đăng ký & đóng phí* đã điền sẵn → Gửi (có báo thành công/lỗi ngay tại chỗ) | Quản lý Đại biểu |
| 7 | **Gửi lại cho nhiều người bị sót**: dùng nguồn *🎯 Chọn cá nhân theo Email* (xem mục 6) | Thông báo → Gửi Tin Hàng loạt |
| 8 | Nếu đại biểu đã chuyển khoản: đối soát → đổi trạng thái sang **PAID** → hệ thống tự gửi mail xác nhận thanh toán + QR check-in | Quản lý Đại biểu |
| 9 | Hướng dẫn đại biểu kiểm tra hòm thư **Spam / Quảng cáo**, hoặc tự tra cứu tại trang *Tra cứu vé điện tử & CME* | — |

Nút gửi lại thủ công: [src/views/AttendeeManagement.tsx:264-291](../src/views/AttendeeManagement.tsx#L264-L291)

> 💡 Trong bảng Quản lý Đại biểu, những đại biểu mà hệ thống **đã ghi nhận lỗi gửi mail** sẽ hiện badge đỏ
> **"Mail chưa gửi được — gửi lại"** ngay dưới địa chỉ email. Bấm vào badge để mở luôn hộp soạn thư gửi lại.

---

## 4. Các nguyên nhân thường gặp

1. **Sai địa chỉ email** khi đại biểu tự điền form → mail gửi đi đúng nhưng tới nhầm hòm thư.
2. **Mail rơi vào Spam / Promotions** — mail HTML có ảnh banner + ảnh QR tải từ domain ngoài, dễ bị bộ lọc đánh dấu.
3. **SMTP lỗi** (app-password hết hạn, sai host/port, bị chặn) → log ghi `failed`.
4. **Chưa cấu hình SMTP** và Supabase cũng không sẵn sàng → hệ thống bỏ qua việc gửi, ghi log `failed`.
5. **Đại biểu nhầm lẫn giữa 2 loại mail**: mail bước 2 chỉ là *xác nhận đã nhận hồ sơ + hướng dẫn đóng phí*; mail có QR check-in chỉ đến sau khi BTC đối soát xong.

---

## 5. Mẫu câu trả lời đại biểu

> Dạ kính gửi **{Danh xưng} {Họ tên}**,
>
> Ban Tổ chức đã kiểm tra và ghi nhận hồ sơ đăng ký của bác trên hệ thống (mã đại biểu: **{Mã}**), hiện đang ở trạng thái **Chờ đối soát lệ phí**.
>
> Thư xác nhận đã được gửi tới địa chỉ **{email}**, nhờ bác kiểm tra giúp thêm mục **Spam / Quảng cáo** ạ. Em cũng vừa gửi lại thư xác nhận một lần nữa.
>
> Sau khi Ban Tổ chức đối soát xong lệ phí, hệ thống sẽ gửi tiếp email xác nhận thanh toán kèm **mã QR check-in** chính thức cho bác.
>
> Bác cũng có thể tra cứu trực tiếp hồ sơ và vé điện tử tại trang *Tra cứu vé điện tử & CME* ạ.
>
> Trân trọng,
> Ban Thư ký Hội nghị VSAPS 2026

---

## 6. Gửi lại thư cho các trường hợp bị sót (Gửi Tin Hàng loạt)

Vào **Thông báo → Gửi Tin Hàng loạt → 🚀 Gửi Tin Tức Thì**, tại khung *"1. Nạp danh sách liên hệ"* chọn nguồn:

```
🎯 Chọn cá nhân theo Email (gửi lại thư bị sót)
```

Màn hình chọn gồm:

| Thành phần | Công dụng |
|---|---|
| **Đại biểu / Báo cáo viên / Cả hai** | Chọn nhóm dữ liệu người đã đăng ký để tìm |
| **Lọc theo trạng thái gửi Email** | `Tất cả` · `⚠️ Chỉ người CHƯA nhận được mail (sót hoặc lỗi)` · `🚫 Chỉ người CHƯA từng có log gửi mail` |
| **Ô tìm kiếm** | Tìm theo tên, email, SĐT, mã đại biểu, đơn vị |
| **Danh sách tick chọn** | Mỗi dòng hiện tên, mã, email, SĐT kèm badge trạng thái mail: `Đã gửi` / `Gửi lỗi` / `Chưa có log` |
| **Chọn tất cả / Bỏ chọn** | Thao tác nhanh trên toàn bộ kết quả đang lọc |
| **Ô dán danh sách Email** | Dán nhiều email (cách nhau bởi dấu phẩy/xuống dòng) → bấm *Đối chiếu & tự động tích chọn*. Hệ thống báo rõ số email khớp và **liệt kê các email không tìm thấy** trong danh sách đã đăng ký |
| **Nút Nạp N người đã chọn** | Đưa những người đã tick vào hàng đợi gửi |
| 🔄 (nút làm mới) | Nạp lại dữ liệu đăng ký & nhật ký gửi mail mới nhất |

Sau khi nạp: soạn nội dung thư ở cột bên phải (hoặc chọn mẫu thư sẵn có) → bấm **Bắt Đầu Gửi Hàng Loạt**.

**Quy trình khuyến nghị để quét các ca bị sót:**

1. Chọn nguồn *🎯 Chọn cá nhân theo Email*
2. Đặt bộ lọc **⚠️ Chỉ người CHƯA nhận được mail**
3. Bấm **Chọn tất cả** → **Nạp … người đã chọn vào hàng đợi gửi**
4. Chọn mẫu thư xác nhận → **Bắt Đầu Gửi Hàng Loạt**
5. Dòng nào lỗi → bấm nút cam **🔄 Gửi Lại N Dòng Lỗi** để retry riêng các dòng đó

Các placeholder khả dụng khi soạn thư: `{{Tên}}`, `{{Email}}`, `{{Số điện thoại}}`, `{{title}}`, `{{fullname}}`, `{{code}}`, `{{package}}`, `{{payment_status}}`, `{{package_fee}}`, `{{organization}}`, `{{qr_url}}` (đại biểu) và `{{presentation_title}}`, `{{track}}` (báo cáo viên).

Code: [src/views/NotificationSystem.tsx](../src/views/NotificationSystem.tsx)

---

## 7. Các cải tiến đã triển khai

| # | Vấn đề | Đã xử lý |
|---|---|---|
| 1 | `store.sendEmail` ở form đăng ký **không `await`** và nuốt lỗi → BTC không biết mail nào rớt | Đã `await` kết quả gửi mail. Nếu thất bại, màn hình đăng ký thành công hiển thị **cảnh báo màu hổ phách** yêu cầu đại biểu chụp màn hình & liên hệ Ban Thư ký; đồng thời **không còn khẳng định sai** là "đã gửi thành công qua Email". Zalo/WhatsApp vẫn chạy nền như cũ. → [PublicDelegateRegister.tsx](../src/views/PublicDelegateRegister.tsx) |
| 2 | BTC phải mở nhật ký thủ công mới biết ai bị rớt mail | Badge đỏ **"Mail chưa gửi được — gửi lại"** hiện ngay dưới email trong bảng Quản lý Đại biểu (cả bản desktop & mobile), bấm vào mở luôn hộp soạn thư. Badge chỉ hiện khi **thực sự có log gửi lỗi và chưa có log thành công** → tránh báo nhầm hàng loạt khi nhật ký trống. → [AttendeeManagement.tsx](../src/views/AttendeeManagement.tsx) |
| 3 | Chưa có cơ chế retry cho các dòng gửi lỗi | Nút **🔄 Gửi Lại N Dòng Lỗi** trong Bảng điều khiển & Tiến trình gửi — lọc riêng các dòng `Thất bại`, reset trạng thái và gửi lại ngay. → [NotificationSystem.tsx](../src/views/NotificationSystem.tsx) |
| 4 | Không có cách gửi lại cho một nhóm cá nhân bất kỳ | Nguồn danh sách **🎯 Chọn cá nhân theo Email** (mục 6). |
