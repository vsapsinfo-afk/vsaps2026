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
- Hệ thống bắn thông báo qua 3 kênh song song:

```ts
try {
  store.sendZaloZNS(saved);
  store.sendEmail(saved);
  store.sendWhatsapp(saved);
} catch (err) {
  console.error('Lỗi khi gửi thông báo tự động:', err);
}
```

> ⚠️ **Lưu ý quan trọng:** 3 lệnh này **không được `await`**, lỗi chỉ ghi ra console.
> Vì vậy đại biểu vẫn thấy màn hình "Đăng ký thành công" **kể cả khi mail không gửi được**.
> Đây là lý do phổ biến nhất khiến BTC không biết mail bị rớt cho tới khi đại biểu phản ánh.

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
| 6 | **Gửi lại thủ công**: bấm nút ✉️ *"Soạn & Gửi Email thông báo nhanh"* → mẫu *Thư xác nhận đăng ký & đóng phí* đã điền sẵn → Gửi (có báo thành công/lỗi ngay tại chỗ) | Quản lý Đại biểu |
| 7 | Nếu đại biểu đã chuyển khoản: đối soát → đổi trạng thái sang **PAID** → hệ thống tự gửi mail xác nhận thanh toán + QR check-in | Quản lý Đại biểu |
| 8 | Hướng dẫn đại biểu kiểm tra hòm thư **Spam / Quảng cáo**, hoặc tự tra cứu tại trang *Tra cứu vé điện tử & CME* | — |

Nút gửi lại thủ công: [src/views/AttendeeManagement.tsx:264-291](../src/views/AttendeeManagement.tsx#L264-L291)

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

## 6. Đề xuất cải tiến (chưa triển khai)

- `store.sendEmail` ở form đăng ký hiện **không `await`** và nuốt lỗi → BTC không biết mail nào rớt trừ khi mở nhật ký thủ công.
  - Đề xuất: `await` kết quả, nếu `failed` thì hiển thị cảnh báo nhẹ trên màn hình thành công ("Nếu không nhận được mail trong 5 phút, vui lòng liên hệ hotline…").
- Bổ sung badge **"chưa gửi được mail"** trực tiếp trong bảng Quản lý Đại biểu để BTC chủ động gửi lại, không cần chờ đại biểu phản ánh.
- Cân nhắc cơ chế **retry tự động** cho các log `failed`.
