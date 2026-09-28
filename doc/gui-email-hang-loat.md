# Gửi email hàng loạt — hạn mức, lỗi thường gặp và cách gửi tiếp

> Tài liệu nội bộ cho Ban Thư ký và người bảo trì hệ thống VSAPS 2026.

---

## 1. Sự cố đã xử lý: gửi ~100 thư thì bắt đầu Thất bại

**Triệu chứng:** gửi danh sách 134 người, khoảng 100 dòng đầu Thành công, các dòng
cuối đồng loạt Thất bại với lỗi bị cắt ngắn trong bảng là `Invalid...`.

**Lỗi đầy đủ:** `Invalid login: 454-4.7.0 Too many login attempts, please try again later`
— Gmail chặn tạm thời vì bị đăng nhập quá dày, **không phải sai mật khẩu**.

**Nguyên nhân:** `api/email/send.ts` tạo transporter **mới cho từng email**, mà mỗi
email lại là một lần gọi serverless function riêng. Gửi 134 thư = 134 lần mở kết nối
+ 134 lần đăng nhập Gmail, cách nhau chỉ 800ms. Code cũng không có cơ chế thử lại.

**Đã sửa trong `api/email/send.ts`:**

1. **Dùng lại một kết nối đã đăng nhập.** Transporter dạng `pool` được giữ ở phạm vi
   module, khoá theo cấu hình SMTP. Các lần gọi liên tiếp rơi vào cùng container
   serverless đang "ấm" sẽ dùng lại đúng kết nối đó — số lần đăng nhập giảm từ 134
   xuống còn vài lần. Kèm `maxConnections: 1` và `rateLimit: 3/giây`.
2. **Thử lại có giãn cách.** Tối đa 2 lượt, chờ 1,5s giữa hai lượt, và **chỉ** với lỗi
   tạm thời (SMTP 421/450/451/452/454). Lỗi vĩnh viễn (`535` sai mật khẩu, `550` không
   tồn tại) trả về ngay. Response có thêm cờ `retryable`. Nếu bị chặn kéo dài thì dùng
   nút **"Gửi lại các dòng thất bại"** ở màn hình gửi hàng loạt.
3. Mỗi lần lỗi đều huỷ kết nối trong pool, tránh socket chết sau khi container bị đóng băng.

> **Không thêm `maxDuration` vào `vercel.json`.** Đã thử và deploy bị *"internal Vercel
> error"* ngay sau khi Vite build xong. Vì vậy cơ chế thử lại được giữ ngắn (xấu nhất
> khoảng 5,5 giây) để nằm gọn trong giới hạn thời gian mặc định của Vercel.

> Bản vá này là code chạy phía máy chủ — **phải deploy lại** mới có tác dụng.

---

## 2. Hạn mức của các nhà cung cấp

| Kênh gửi | Trần mỗi ngày | Cần sửa code? |
|---|---|---|
| Gmail miễn phí (đang dùng) | ~500 người nhận | — |
| Google Workspace | ~2.000 người nhận | Không, chỉ đổi thông tin SMTP trong Cài đặt |
| Amazon SES | Rất cao sau khi được duyệt (mặc định 200/ngày khi còn sandbox) | Không, vẫn là SMTP |
| Resend | Theo gói trả phí | Không, app đã có sẵn mục chọn Resend |

> Hạn mức và giá thay đổi theo thời gian — kiểm tra lại trên trang nhà cung cấp trước khi quyết định.

**Bản vá gộp kết nối ở mục 1 không nâng được các trần này** — nó chỉ chống bị chặn do
đăng nhập dồn dập. Muốn vượt 500/ngày thì phải đổi kênh gửi, hoặc chia nhỏ theo ngày
bằng tính năng ở mục 3.

### Lưu ý về thời gian gửi

Hệ thống gửi từng thư một, cách nhau 800ms; cộng độ trễ mạng thì thực tế khoảng
1,3 giây/thư. **Phải mở tab trình duyệt trong suốt quá trình gửi.**

| Số người nhận | Thời gian ước tính |
|---|---|
| 500 | ~11 phút |
| 1.000 | ~22 phút |
| 2.000 | ~43 phút |

---

## 3. Gửi tiếp danh sách dở dang, không gửi trùng

Dùng khi chia một danh sách lớn ra nhiều ngày (để không vượt trần 500/ngày của Gmail),
hoặc khi buổi gửi bị dừng giữa chừng.

### Cách dùng

1. Vào **Gửi hàng loạt**, tải lên **đúng file Excel cũ** (toàn bộ danh sách, không cần cắt bớt).
2. Giữ nguyên dấu tích **"Bỏ qua người đã nhận thư"** (mặc định đã bật).
3. Bấm Bắt đầu gửi. Hệ thống báo: *"Có N/M người đã nhận thư này ở lần gửi trước.
   Bấm OK để chỉ gửi cho (M−N) người còn lại."*
4. Những người đã nhận hiện nhãn vàng **"Đã gửi trước"** và bị bỏ qua, không tốn hạn mức.

Nếu **muốn gửi lại cho tất cả** (ví dụ gửi thư nhắc lần 2 cho cùng danh sách):
bỏ dấu tích đó rồi bấm gửi.

### Hoạt động dựa trên đâu

Mỗi thư gửi thành công đều được ghi một dòng vào bảng `campaign_activity`
(qua `store.saveCampaignActivity`). Khi bắt đầu gửi, hệ thống đọc lại lịch sử của
chiến dịch đang chọn bằng `store.getCampaignActivities(campaignId)` rồi đối chiếu email
đã chuẩn hoá (cắt khoảng trắng thừa, không phân biệt hoa/thường).

Vì lịch sử nằm trong cơ sở dữ liệu chứ không phải trong trang, **đóng trình duyệt hay
sang ngày khác vẫn dùng tiếp được**.

Khoá lịch sử là `selectedCampaign?.id || 'instant-bulk'`:

- **Có chọn chiến dịch** → lịch sử riêng của chiến dịch đó. Đây là cách nên dùng cho
  các đợt gửi nhiều ngày, vì mỗi nội dung thư có lịch sử tách bạch.
- **Không chọn chiến dịch** (gửi tức thì) → dùng chung một kho lịch sử `instant-bulk`
  cho mọi lần gửi tức thì. Nghĩa là nếu sau này gửi một nội dung **khác** cho cùng
  những người đó, họ vẫn bị tính là "đã nhận". Khi đó nhớ bỏ dấu tích.

### Các file đã thay đổi

| File | Nội dung |
|---|---|
| `api/email/send.ts` | Gộp kết nối SMTP (`pool`), thử lại có giãn cách, phân loại lỗi tạm thời/vĩnh viễn |
| `src/views/NotificationSystem.tsx` | Ô tích "Bỏ qua người đã nhận thư", đối chiếu lịch sử trước khi gửi, trạng thái "Đã gửi trước" trong bảng kết quả |
