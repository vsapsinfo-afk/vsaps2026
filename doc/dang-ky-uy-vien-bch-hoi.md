# Đăng ký miễn phí dành cho Ủy viên BCH Hội

> Tài liệu nội bộ — mô tả dòng đăng ký riêng (miễn lệ phí, không cần chuyển khoản) dành cho các Ủy viên Ban Chấp hành Hội tại hội nghị VSAPS 2026.

---

## 1. Tóm tắt

| Hạng mục | Giá trị |
|---|---|
| Mã gói | `pkg-bch` — **"Ủy viên BCH Hội"**, lệ phí **0 VNĐ** |
| Link đăng ký | `https://<domain>/?view=register-delegate&bch=1` |
| Hiển thị | 1 dòng ngang riêng, nằm **dưới** lưới 3 gói ở Bước 2 |
| Ai thấy | **Chỉ người vào bằng link riêng.** Form công khai và trang giới thiệu **không** hiện gói này |
| Dịch vụ phụ trợ | **Miễn phí hoàn toàn** (CME, Gala Dinner, Master class, Tour đều 0đ) |
| Chuyển khoản | **Không cần.** Không hiện VietQR, không bắt buộc đính kèm biên lai ở bất kỳ bước nào |
| Trạng thái lưu | `pending_verification` (**Chờ đối soát**) — BTC đối chiếu danh sách BCH rồi duyệt tay |

---

## 2. Luồng hoạt động

```
Bác Ủy viên BCH mở link ?view=register-delegate&bch=1
        │
        ▼
Bước 1: Điền thông tin đại biểu (như bình thường)
        │
        ▼
Bước 2: 3 gói có phí  +  1 DÒNG RIÊNG "★ Ủy viên BCH Hội — 0 VNĐ"
        │                 (chọn dòng này → miễn phí toàn bộ)
        ▼
Bước 3: Dịch vụ phụ trợ hiện "(Miễn phí)" — tổng cộng 0 VNĐ
        KHÔNG có khối VietQR, KHÔNG bắt buộc biên lai
        │
        ▼
[Lưu hồ sơ] packageFee = 0, paymentStatus = pending_verification
            notes = "[ỦY VIÊN BCH HỘI – MIỄN PHÍ] ..."
        │
        ▼
Bước 4: Màn hình cảm ơn — chỉ có thẻ check-in QR + khối "Miễn lệ phí tham dự"
        (không thông tin ngân hàng, không ô tải biên lai, không SePay)
        │
        ▼
BTC đối chiếu danh sách BCH → đổi trạng thái sang PAID (thủ công)
        │
        ▼
Hệ thống tự động gửi mail XÁC NHẬN + QR check-in như các đại biểu khác
```

> ⚠️ **Lưu ý cho Ban Thư ký:** vì hồ sơ nằm ở trạng thái *Chờ đối soát*, mã QR check-in **chưa** đi kèm email đăng ký. QR chỉ được gửi sau khi BTC chuyển hồ sơ sang **Đã đóng phí** trong Quản lý đại biểu — giống hệt quy trình của mọi hồ sơ chưa duyệt (xem [quy-trinh-mail-xac-nhan-dang-ky.md](./quy-trinh-mail-xac-nhan-dang-ky.md)).

---

## 3. Việc cần làm trước khi phát link

Gói đăng ký được nạp **hoàn toàn từ bảng `packages` của Supabase** (biến `INITIAL_PACKAGES` trong [src/dataStore.ts:68](../src/dataStore.ts#L68) là mảng rỗng). **Chưa chạy SQL thì dòng BCH sẽ không hiện ra.**

Chạy file [supabase/add_bch_package.sql](../supabase/add_bch_package.sql) trên Supabase SQL Editor:

```sql
INSERT INTO public.packages (id, name, fee, benefits, is_active, includes_cme, includes_gala) VALUES
('pkg-bch', 'Ủy viên BCH Hội', 0, ARRAY[
  'Miễn phí tham dự dành riêng cho Ủy viên Ban Chấp hành Hội',
  'Tham dự đầy đủ các phiên báo cáo khoa học và khu vực triển lãm',
  'Bộ túi tài liệu, kỷ yếu và quà lưu niệm chính thức',
  'Miễn phí toàn bộ dịch vụ phụ trợ (CME, Gala Dinner, Master class, Tour)'
], true, true, true)
ON CONFLICT (id) DO NOTHING;
```

Bản ghi này cũng đã được thêm sẵn vào [supabase/seed.sql](../supabase/seed.sql) và [supabase/supabase_setup.sql](../supabase/supabase_setup.sql) để môi trường cài mới có luôn.

Kiểm tra: vào **Cài đặt → Gói đăng ký**, thấy gói "Ủy viên BCH Hội — 0đ" là đã nạp thành công.

---

## 4. Chi tiết kỹ thuật

### 4.1. Cổng link riêng — [src/views/PublicDelegateRegister.tsx:124-138](../src/views/PublicDelegateRegister.tsx#L124-L138)

```ts
const BCH_PACKAGE_ID = 'pkg-bch';

const getInitialBchMode = (): boolean => {
  try {
    const params = new URLSearchParams(window.location.search);
    const view = (params.get('view') || '').toLowerCase();
    if (view.endsWith('/bch')) return true;
    const bch = (params.get('bch') || '').toLowerCase();
    return ['1', 'true', 'yes'].includes(bch);
  } catch { /* ignore */ }
  return false;
};
```

- Đọc ở cấp module, cùng kiểu với `getInitialLang()` sẵn có → hoạt động cả khi nhúng iframe trong WordPress.
- State: `const [isBchMode] = useState(getInitialBchMode);` ([:204](../src/views/PublicDelegateRegister.tsx#L204))
- **Link chính thức dùng dạng `&bch=1`.** Dạng `?view=register-delegate/bch` hiện chưa chạy vì [src/App.tsx:65](../src/App.tsx#L65) chỉ cắt hậu tố `/vn|/vi|/en` khỏi tham số `view`; muốn dùng thì phải bổ sung `/bch` vào regex đó.
- Có thể ghép với tham số ngôn ngữ: `?view=register-delegate&lang=en&bch=1`.

### 4.2. Cờ miễn phí — [src/views/PublicDelegateRegister.tsx:386-392](../src/views/PublicDelegateRegister.tsx#L386-L392)

```ts
const isFeeExempt = isBchMode && packageId === BCH_PACKAGE_ID;
const bchPackage = packages.find(p => p.id === BCH_PACKAGE_ID);
const getAddOnFee = (svc: AddOnService) =>
  isFeeExempt ? 0 : (period === 'post_10_11' && svc.feePost ? svc.feePost : svc.fee);
const baseFee = isFeeExempt ? 0 : (currentPrices[packageId as keyof typeof currentPrices] ?? 0);
```

`isFeeExempt` ép cả phí gói lẫn phí phụ trợ về 0 → `calculatedTotalFee === 0`.

Bảng `PRICING` cũng đã thêm `'pkg-bch': 0` cho cả 2 mốc thời gian ([:372](../src/views/PublicDelegateRegister.tsx#L372), [:380](../src/views/PublicDelegateRegister.tsx#L380)).

### 4.3. Bước 2 — dòng riêng

Chèn ngay sau lưới 3 gói, chỉ render khi `isBchMode && nationality === 'vietname' && bchPackage` ([:1362](../src/views/PublicDelegateRegister.tsx#L1362)):

- Badge hồng `★ Ủy viên BCH Hội` + chip xanh `✓ MIỄN PHÍ – KHÔNG CẦN CHUYỂN KHOẢN`
- Danh sách quyền lợi lấy từ `bchPackage.benefits` (sửa được trong Cài đặt → Gói đăng ký, không cần đụng code)
- Giá `0 VNĐ` bên phải, dấu ✓ khi được chọn
- Dòng chú thích: *"Dành riêng cho Ủy viên Ban Chấp hành Hội. Ban Tổ Chức sẽ đối chiếu danh sách BCH trước khi cấp vé QR check-in."*

Nếu DB chưa có `pkg-bch` thì `bchPackage` là `undefined` → dòng này **không render** (không vỡ giao diện).

### 4.4. Bước 3 — miễn phí & ẩn chuyển khoản

| Vị trí | Hành vi khi `isFeeExempt` |
|---|---|
| Thẻ dịch vụ phụ trợ [:1474](../src/views/PublicDelegateRegister.tsx#L1474) | Hiện `(Miễn phí)` / `(Free)` thay cho `+ 350.000đ` |
| Bảng tổng hợp chi phí [:1519-1539](../src/views/PublicDelegateRegister.tsx#L1519-L1539) | Mỗi dòng phụ trợ ghi "Miễn phí"; dòng tổng đổi thành badge xanh **"MIỄN PHÍ – ỦY VIÊN BCH HỘI — 0 VNĐ"** |
| Khối VietQR + upload biên lai bắt buộc | Tự ẩn nhờ điều kiện `calculatedTotalFee > 0` **có sẵn** (không phải sửa) |
| Validate biên lai trong `handleSubmit` | Tự bỏ qua nhờ cùng điều kiện `calculatedTotalFee > 0` |
| Nút submit [:1660](../src/views/PublicDelegateRegister.tsx#L1660) | Đổi nhãn thành **"Xác Nhận Đăng Ký (Miễn Phí) ⚡"** |

### 4.5. Bản ghi lưu xuống — [src/views/PublicDelegateRegister.tsx:514-516](../src/views/PublicDelegateRegister.tsx#L514-L516)

```ts
if (isFeeExempt) {
  finalNotes = `[ỦY VIÊN BCH HỘI – MIỄN PHÍ]${finalNotes ? '\n' + finalNotes : ''}`;
}
```

- `packageId` = `pkg-bch`, `packageName` = "Ủy viên BCH Hội", `packageFee` = `0`
- `paymentStatus` = `pending_verification` (giữ nguyên như mọi hồ sơ công khai)
- `paymentMethod` = `bank_transfer` — **cố ý giữ nguyên**: schema `attendees` chỉ nhận `bank_transfer | credit_card | cash`, không có giá trị "miễn phí"; đổi sang `cash` sẽ làm sai lệch báo cáo tài chính
- Dấu nhận biết cho Ban Thư ký là **tên gói** + **tiền tố ghi chú** ở trên

### 4.6. Bước 4 (màn hình cảm ơn) — [:603](../src/views/PublicDelegateRegister.tsx#L603)

`const isFreeTicket = (createdAttendee.packageFee || 0) <= 0;` điều khiển:

- Ẩn cột "QUYỂN THANH TOÁN VIETQR" ([:702](../src/views/PublicDelegateRegister.tsx#L702)); lưới đổi về 1 cột để thẻ check-in chiếm trọn chiều ngang ([:657](../src/views/PublicDelegateRegister.tsx#L657))
- Hiện khối xanh **"Miễn lệ phí tham dự"** ([:738](../src/views/PublicDelegateRegister.tsx#L738))
- Ẩn ô tải biên lai ([:754](../src/views/PublicDelegateRegister.tsx#L754))
- Đổi dòng hướng dẫn cuối trang sang nội dung miễn phí ([:814](../src/views/PublicDelegateRegister.tsx#L814))
- Tắt `SepayPaymentChecker` ([:827](../src/views/PublicDelegateRegister.tsx#L827)) — chờ một khoản 0đ là vô nghĩa

Điều kiện dựa trên **phí = 0** chứ không phải mã gói, nên gói `pkg-free` (Chủ tọa & Báo cáo viên) cũng được hưởng đúng hành vi này.

### 4.7. Email xác nhận — [src/dataStore.ts:3060](../src/dataStore.ts#L3060)

```ts
${!isPaid && isRegistrationEmail && attendee.packageFee > 0 ? ` ... ` : ''}
```

Khối "Hướng Dẫn Thanh Toán Lệ Phí + VietQR" trước đây hiện với **mọi** hồ sơ chưa `paid`, kể cả hồ sơ 0đ. Sau khi thêm điều kiện `packageFee > 0`, thư gửi Ủy viên BCH (và cả Báo cáo viên gói `pkg-free`) **không còn** hướng dẫn chuyển khoản và mã VietQR.

### 4.8. Ẩn khỏi trang công khai — [src/views/PublicEventDetails.tsx:1253](../src/views/PublicEventDetails.tsx#L1253)

```tsx
{packages.filter(pkg => pkg.id !== 'pkg-bch').map((pkg) => {
```

Bảng giá ở trang Giới thiệu sự kiện map toàn bộ gói đang `isActive`, nên phải lọc bỏ `pkg-bch` để giữ đúng nguyên tắc "chỉ qua link riêng".

### 4.9. Nhận diện phía quản trị — [src/views/AttendeeManagement.tsx](../src/views/AttendeeManagement.tsx)

Nhãn màu **hồng (rose)** cho `pkg-bch`, phân biệt với `pkg-vip` màu hổ phách:

- Bảng đại biểu (desktop) — [:1655](../src/views/AttendeeManagement.tsx#L1655)
- Thẻ đại biểu (mobile) — [:1882](../src/views/AttendeeManagement.tsx#L1882)
- Thẻ kiosk check-in — [:4742](../src/views/AttendeeManagement.tsx#L4742), hiển thị nhãn **`★ BCH`**

### 4.10. Chặn phiếu thu rác 0đ — [src/dataStore.ts:1256](../src/dataStore.ts#L1256)

```ts
if (updatedAttendee.paymentStatus === 'paid' && updatedAttendee.packageFee > 0 && !this.finance.find(...)) {
```

Khi BTC duyệt hồ sơ BCH sang **Đã đóng phí**, hệ thống trước đây sẽ tự sinh một phiếu thu **0 VNĐ** rác trong sổ Tài chính. Điều kiện `packageFee > 0` chặn việc này.

---

## 5. Kiểm thử nhanh

1. Chạy [supabase/add_bch_package.sql](../supabase/add_bch_package.sql) → reload app → **Cài đặt → Gói đăng ký** có "Ủy viên BCH Hội — 0đ".
2. Mở `http://localhost:5173/?view=register-delegate&bch=1` → Bước 2 có 3 thẻ gói **+ 1 dòng ngang BCH**.
3. Mở `http://localhost:5173/?view=register-delegate` (không `bch=1`) → **không** thấy dòng BCH. Mở `?view=event-details` → bảng giá **không** có gói BCH.
4. Chọn dòng BCH → Bước 3: mọi dịch vụ phụ trợ ghi "(Miễn phí)", tổng 0 VNĐ, **không** có khối VietQR. Bấm gửi mà không đính kèm gì → đăng ký thành công.
5. Màn hình cảm ơn: chỉ còn thẻ check-in QR full-width + khối "Miễn lệ phí tham dự".
6. Đối chứng: đăng ký lại bằng gói Hội viên → khối chuyển khoản và cảnh báo "BẮT BUỘC đính kèm biên lai" vẫn hoạt động nguyên vẹn.
7. Quản lý đại biểu: hồ sơ mới có nhãn hồng "Ủy viên BCH Hội", phí 0đ, trạng thái *Chờ đối soát*, ghi chú có tiền tố `[ỦY VIÊN BCH HỘI – MIỄN PHÍ]`. Chuyển sang *Đã đóng phí* → email + QR được gửi, và Tài chính **không** phát sinh phiếu thu 0đ.
8. `npm run lint` và `npm run build` sạch lỗi.

---

## 6. Các file đã thay đổi

| File | Nội dung |
|---|---|
| `supabase/add_bch_package.sql` | **Mới** — script nạp gói `pkg-bch` vào DB đang chạy |
| `supabase/seed.sql` | Thêm `pkg-bch` vào khối seed packages |
| `supabase/supabase_setup.sql` | Thêm `pkg-bch` vào khối seed packages (bản cài all-in-one) |
| `src/views/PublicDelegateRegister.tsx` | Cổng link `bch=1`, dòng đăng ký riêng, logic miễn phí, ẩn chuyển khoản ở Bước 3 & 4 |
| `src/views/PublicEventDetails.tsx` | Lọc `pkg-bch` khỏi bảng giá công khai |
| `src/views/AttendeeManagement.tsx` | Nhãn màu hồng `★ BCH` ở 3 vị trí |
| `src/dataStore.ts` | Ẩn hướng dẫn chuyển khoản trong email khi phí = 0; chặn phiếu thu 0đ |
