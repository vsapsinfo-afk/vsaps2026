# Cập nhật theo file "Đề xuất sửa vsapsevent.org"

> Tài liệu nội bộ cho Ban Thư ký VSAPS 2026.
> Nguồn yêu cầu: [Google Sheets — Đề xuất sửa vsapsevent.org](https://docs.google.com/spreadsheets/d/1zIancNn-6sC6iW6AwsxXc1SbvhJV1GTRYfiRVkthE60/edit?gid=0#gid=0)

---

## 0. Việc phải làm TRƯỚC khi dùng

### Bước 1 — Cập nhật cơ sở dữ liệu

Những tính năng mới cần thêm một số cột vào cơ sở dữ liệu. Có **hai cách**, chọn một.

#### Cách 1 — Bấm nút trong admin (khuyến nghị)

Vào **Cài đặt → Cơ sở dữ liệu**:

1. Bấm **Kiểm tra lại** để xem còn thiếu cột nào — màn hình liệt kê từng cột kèm
   trạng thái *đã có* / *chưa có*
2. Bấm **Chạy cập nhật tự động**
3. Bấm **Kiểm tra lại** lần nữa để xác nhận đã đủ

Chỉ tài khoản **Admin** dùng được nút này. Hệ thống chạy đúng danh sách bước đã cài
trong mã nguồn, không nhận câu lệnh SQL từ ngoài vào.

> **Cần cấu hình một lần:** nút này cần biến môi trường `DATABASE_URL` trên Vercel.
> Lấy tại Supabase Dashboard → Project Settings → Database → Connection string, chọn
> tab **Session pooler**, rồi thêm vào Vercel → Settings → Environment Variables với
> tên `DATABASE_URL` và deploy lại.
>
> Phải dùng chuỗi **Session pooler**. Chuỗi kết nối trực tiếp
> (`db.<ref>.supabase.co`) chỉ hỗ trợ IPv6 nên hàm serverless của Vercel không gọi
> tới được. Nếu chưa cấu hình, màn hình sẽ hiện hướng dẫn này ngay tại chỗ và nút
> chạy tự động bị khóa.

#### Cách 2 — Dán tay vào Supabase SQL Editor

Không cần cấu hình gì thêm. Vẫn trong **Cài đặt → Cơ sở dữ liệu**, phần *Cách 2*:

1. Bấm **Sao chép SQL**
2. Bấm **Mở Supabase SQL Editor** (đã trỏ đúng dự án)
3. Dán vào rồi bấm **Run**

Hoặc dán nội dung tệp `supabase/add_cme_and_track_fields.sql`.

#### Các bước cập nhật làm gì

Cả hai cách đều chạy đúng 6 bước sau, chạy lại nhiều lần cũng không sao và không làm
mất dữ liệu:

1. Thêm cột ngày sinh, nơi sinh và ảnh bằng cấp cho đại biểu
2. Thêm cột ngày sinh, nơi sinh, số CCCD, ảnh bằng cấp và hai bản dịch tiếng Anh cho
   báo cáo viên
3. Thêm cờ ngừng nhận đăng ký mới cho chuyên đề
4. Thêm cờ tự động gửi thư mời đại biểu
5. Thêm **10 chuyên đề mới**
6. Ngừng nhận đăng ký vào 2 chuyên đề cũ, hồ sơ cũ giữ nguyên

> **Chưa cập nhật thì sao?** Hệ thống vẫn chạy bình thường, không bị vỡ: phần ghi dữ
> liệu tự bỏ qua những cột chưa có thay vì báo lỗi. Nhưng các thông tin mới sẽ chưa
> được lưu lên cơ sở dữ liệu. Cập nhật xong, mở lại từng hồ sơ và bấm Lưu là dữ liệu
> được ghi đầy đủ.

### Bước 2 — Điểm cần lưu ý ngay

| Việc | Ảnh hưởng |
|---|---|
| Form đại biểu nay **bắt buộc** Ngày tháng năm sinh và Nơi sinh | Đại biểu không điền thì không gửi được form |
| Form báo cáo viên nay **bắt buộc** Ngày sinh, Nơi sinh, Số CCCD và Ảnh bằng cấp | Báo cáo viên không điền đủ thì không gửi được form |
| 50 hồ sơ báo cáo viên đang thuộc 2 chuyên đề bị bỏ | Xem mục IV bên dưới |
| Thư mời tự động | Mặc định **TẮT**, xem mục VIII |

---

## I. Form đăng ký đại biểu

Đã bổ sung 3 thứ file yêu cầu đánh FALSE:

| Trường | Ghi chú |
|---|---|
| **Ngày tháng năm sinh** | Thay ô "Năm sinh" cũ bằng ô chọn ngày đầy đủ. Có kiểm tra ngày thật: gõ 31/02 bị chặn, năm phải trong khoảng 1920 đến năm hiện tại |
| **Nơi sinh** | Ô chữ, ghi theo giấy tờ tùy thân |
| **Số CCCD + lưu ý trách nhiệm thông tin** | Hiện ra khi đại biểu tick chọn gói CME. Kèm nguyên văn lưu ý về mốc điều chỉnh trước 12/12/2026 |

Năm sinh vẫn được hệ thống tự suy ra từ ngày sinh, nên các mẫu chứng chỉ CME và
báo cáo cũ đang dùng "Năm sinh" không phải sửa theo.

Ban tổ chức xem và sửa được Ngày sinh, Nơi sinh trong **Quản lý Đại biểu → chi tiết
đại biểu → Sửa**. Những hồ sơ cũ chỉ có năm sinh sẽ hiện dòng cảnh báo màu hổ phách
nhắc bổ sung ngày tháng.

### Sửa thêm một lỗi có sẵn

Cột `doctor_proof_url` (ảnh bằng cấp đại biểu) đã có trong bảng từ trước nhưng tầng
ứng dụng **chưa bao giờ ghi vào**, và ảnh cũng không được tải lên Supabase Storage.
Nghĩa là ảnh minh chứng bác sĩ mà đại biểu tải lên bị mất trắng mỗi lần đồng bộ.
Nay đã ghi và tải lên đúng.

Nhãn các trường mới sửa được trong **Cài đặt → Form công khai → Nhãn trường**.

---

## II. Mẫu Excel xuất thông tin đại biểu

Nút **Sổ Cái Excel** trong Quản lý Đại biểu đổi từ CSV 10 cột sang **.xlsx 31 cột**,
đủ mọi trường bác sĩ đã nhập:

Mã đại biểu · Học hàm học vị · Họ và tên · Giới tính · Ngày sinh · Nơi sinh · Số CCCD ·
Số điện thoại · Email · Đơn vị công tác · Khoa/Phòng · Tỉnh/Thành phố · Địa chỉ liên hệ ·
Quốc tịch · Gói đăng ký · Phí đã tính · Thời điểm đăng ký · Đăng ký CME · Gala Dinner ·
Master Class · Tour tham quan · Trạng thái thanh toán · Hình thức thanh toán ·
Ngày đăng ký · **Link ảnh chân dung** · **Link ảnh minh chứng bác sĩ** ·
**Link ảnh chuyển khoản** · Mã QR check-in · Đã check-in · Thời gian check-in · Ghi chú

Ba cột ảnh xuất ra đường dẫn công khai, bấm vào là xem được.

> Hồ sơ cũ còn giữ ảnh dạng base64 trong cơ sở dữ liệu thì ô ảnh ghi
> *"Ảnh lưu trong hệ thống, chưa có link — mở hồ sơ để xem"*. Một ô Excel chỉ chứa
> được 32.767 ký tự, còn ảnh base64 thường dài hơn thế nhiều nên không nhét vào được.

### Trả lời câu hỏi "Nhập số 0 ở trước?"

**Chính bản CSV cũ là nguyên nhân.** Excel mở tệp CSV sẽ coi `0912345678` là một con
số và tự bỏ chữ số 0 ở đầu, thành `912345678`. Số sai đầu số thì gửi tin nhắn Zalo OA
hàng loạt **không tới được**.

Bản .xlsx mới ghi ô số điện thoại ở **kiểu chữ**, nên chữ số 0 được giữ nguyên. Chiều
ngược lại, khi nạp tệp vào, hệ thống cũng tự khôi phục chữ số 0 và nhận được cả dạng
`+84…`, `84…`, `0084…` cùng các dấu cách, dấu chấm, dấu gạch.

---

## III. Mẫu Excel nhập thông tin đại biểu

Tệp mẫu nhập đặt **trùng tên và trùng thứ tự cột** với tệp xuất, nên quy trình
xuất ra → sửa → nạp lại chạy được mà không phải đổi tiêu đề.

- Chỉ cột **Họ và tên** là bắt buộc, các cột khác để trống được
- Cột **Mã đại biểu** và **Mã QR check-in** chỉ để tham khảo khi đối chiếu; khi nạp,
  hệ thống luôn cấp mã mới
- Trùng lặp chặn theo **email và số điện thoại**, nên nạp lại tệp vừa xuất sẽ không
  sinh bản ghi lặp, miễn là để bật tùy chọn *Bỏ qua trùng lặp*
- Gói đăng ký được khớp theo tên để lấy đúng mã gói và mức phí
- Ảnh đính kèm: đưa lên Google Drive, bật quyền xem cho người có đường dẫn, rồi dán
  đường dẫn vào các cột Link

Bộ đọc tệp trước đây bỏ qua gần hết các cột và đặt cứng địa chỉ là "Việt Nam", gói là
"pkg-standard", giới tính "Nam", tỉnh "Hồ Chí Minh". Nay đọc đầy đủ.

### Hai lỗi tìm ra khi kiểm thử

1. **Lựa chọn trạng thái thanh toán mặc định ghi đè hết mọi dòng**, nên cột Trạng thái
   trong tệp bị bỏ qua hoàn toàn. Nay lựa chọn mặc định chỉ áp cho những dòng không
   ghi sẵn trạng thái.
2. **Giá trị "Đã có mặt" của cột check-in không được nhận là có**, nên nạp lại chính
   tệp vừa xuất sẽ xóa sạch trạng thái check-in của đại biểu.

---

## IV. Form đăng ký báo cáo viên

### Trường bổ sung

Ngày tháng năm sinh · Nơi sinh · Số CCCD · **Hình ảnh bằng cấp** — đều bắt buộc, vì
không có thì không lập được hồ sơ cấp CME. Kèm nguyên văn lưu ý trách nhiệm thông tin.

### Chuyên đề — cách xử lý 50 hồ sơ cũ

File yêu cầu **Bỏ** hai chuyên đề *Phẫu thuật tạo hình thẩm mỹ* và *Da liễu thẩm mỹ*.
Nhưng tại thời điểm làm, trên hệ thống đang có:

| Chuyên đề | Số hồ sơ | Yêu cầu |
|---|---|---|
| Phẫu thuật tạo hình thẩm mỹ | **46** | Bỏ |
| Thẩm mỹ nội khoa | 9 | Giữ |
| Da liễu thẩm mỹ | **4** | Bỏ |

Xóa thẳng hai chuyên đề sẽ làm **50 hồ sơ** trỏ tới chuyên đề không còn tồn tại, kéo
theo bộ lọc và nhãn màu hiển thị sai. Nên cách làm là:

1. Thêm 10 chuyên đề mới: Mũi · Sọ mặt · Căng da mặt · Căng chỉ · Mắt · Mặt, Cấy mỡ ·
   Ngực · Tạo hình cơ thể (Lipo ngực, mông) · Biến chứng · Khác
2. Hai chuyên đề cũ chuyển sang trạng thái **Ngừng nhận mới**: không còn hiện trong ô
   chọn của form đăng ký công khai, nhưng **50 hồ sơ cũ vẫn giữ nguyên chuyên đề**
3. Ban tổ chức chuyển dần từng hồ sơ sang chuyên đề mới
4. Khi số hồ sơ của hai chuyên đề cũ về 0 thì xóa hẳn, câu lệnh xóa để sẵn ở cuối tệp
   `supabase/add_cme_and_track_fields.sql`

Thao tác: **Báo Cáo Viên → Quản lý chuyên đề**. Mỗi chuyên đề có nút **Ngừng nhận** /
**Mở lại**, kèm số hồ sơ đang thuộc chuyên đề đó. Chuyên đề đã ngừng hiện nhãn
*Ngừng nhận mới* màu hổ phách.

---

## V. Hai bản dịch tiếng Anh

Thêm hai ô **Tiểu sử khoa học (tiếng Anh)** và **Abstract (tiếng Anh)** trong
**Báo Cáo Viên → sửa hồ sơ**, khối *"Bản tiếng Anh để in kỷ yếu"*.

Hai ô này **do Ban tổ chức tự dịch**, báo cáo viên không nhập — đúng như yêu cầu
*"để ban tổ chức tự dịch"*. Để trống nếu chưa dịch. Cửa sổ **Đọc bài** hiện bản tiếng
Anh ngay dưới bản tiếng Việt tương ứng.

---

## VI. Mẫu Excel xuất thông tin báo cáo viên

Nút **Xuất File Báo Cáo** đổi từ CSV 9 cột sang **.xlsx 25 cột**:

Mã hồ sơ · Học hàm học vị · Họ và tên · Ngày sinh · Nơi sinh · Số CCCD ·
Đơn vị công tác · Khoa/Phòng · Số điện thoại · Email · Quốc tịch ·
Tóm lược quá trình công tác · **Tóm lược (tiếng Anh)** · Tên bài báo cáo · Chuyên đề ·
Abstract · **Abstract (tiếng Anh)** · **Link ảnh chân dung** · **Link ảnh bằng cấp** ·
**Link tệp đính kèm** · Tên tệp đính kèm · Phiên báo cáo · Đồng bộ Calendar ·
Trạng thái · Ngày đăng ký

Nội dung HTML trong các ô soạn thảo được chuyển về chữ thuần để Excel đọc được, vẫn
giữ ngắt dòng giữa các đoạn.

Tệp mẫu nhập báo cáo viên cũng đã nâng từ 11 lên **18 cột**, đặt trùng tên cột với tệp
xuất. Chi tiết xem [nhap-bao-cao-vien-tu-excel.md](nhap-bao-cao-vien-tu-excel.md).

---

## VII. Xóa thông tin đăng ký qua link cho nhà tài trợ

**Chưa làm** — Ban tổ chức đã quyết định bỏ qua mục này.

---

## VIII. Mail tự động

### 1. Đối với đại biểu

**Trường ảnh chân dung** đã có sẵn trên form từ trước và là trường bắt buộc.

> Phần "chi tiết ntn thì Hiệp phải check với chị Nguyệt Ánh, vì 175 hơi khác so với
> 108" còn chờ chốt. Nếu Bệnh viện 175 cần thêm ràng buộc về ảnh (kích cỡ, phông nền,
> định dạng), cho biết để bổ sung phần kiểm tra khi tải ảnh.

**Thư mời tự động** đã cài: thư kèm ảnh chân dung, thông tin đăng ký, các dịch vụ đã
chọn và mã QR check-in.

> ⚠️ **Mặc định đang TẮT.** Nội dung và thiết kế phôi thư mời còn chờ anh Thu cung cấp
> (mẫu tham khảo: https://kmv-invitation-studio.vercel.app/). Nội dung hiện tại chỉ là
> **bản tạm do tôi soạn** để chức năng chạy được. Không bật sẵn để tránh gửi thư bản
> nháp đến đại biểu thật.

Khi đã chốt nội dung:

1. Sửa nội dung thư: **Thông báo → Mẫu thông báo**, tạo hoặc sửa mẫu kênh Email loại
   **Thư mời tham dự (invitation_letter)**
2. Bật tự động: **Cài đặt → Tự động gửi thư mời đại biểu**

Khi bật, thư mời gửi tự động ngay lúc Ban tổ chức xác nhận đại biểu đã đóng phí.

**Gửi tay từng người:** nút **Gửi Thư Mời** trong chi tiết đại biểu. Cần cho vé miễn
phí của Ủy viên BCH Hội, vì hồ sơ đó không đi qua bước đổi trạng thái đóng phí.

### 2. Đối với báo cáo viên

Hai mẫu thư dùng **nguyên văn** nội dung Ban tổ chức đã soạn trong file yêu cầu.

| Thư | Gửi khi nào | Nội dung |
|---|---|---|
| **Xác nhận đăng ký báo cáo thành công** | Ngay khi báo cáo viên gửi form | Chúc mừng đăng ký thành công, báo đề tài đã được phê duyệt, lịch trình sẽ thông báo sau |
| **Xác nhận bài báo cáo và lịch trình chính thức** | Khi Ban tổ chức đổi trạng thái hồ sơ sang **Đã duyệt** | Ảnh chân dung, tên bài, chuyên đề, phiên báo cáo, ngày, giờ, thời lượng, hội trường |

Thư thứ hai lấy lịch từ phiên đã xếp cho báo cáo viên trong module Lịch trình. Chỗ nào
chưa xếp lịch thì ghi *"Sẽ thông báo sau"*, nên nếu chương trình chưa chốt thì nên xếp
phiên trước rồi mới bấm Duyệt.

Sửa nội dung hai thư này tại **Thông báo → Mẫu thông báo**, kênh Email.

#### Sửa một lỗi có sẵn

Thư phê duyệt đề tài trước đây gửi bằng **đường thư của ĐẠI BIỂU** với một đối tượng
đại biểu giả được dựng tạm, nên thư không có được lịch trình lẫn ảnh chân dung. Nay
dùng đúng đường thư của báo cáo viên.

---

## Chi tiết kỹ thuật

| Việc | Vị trí |
|---|---|
| Trường dữ liệu mới | `src/types.ts`, `src/lib/mappers.ts` |
| Script cơ sở dữ liệu | `supabase/add_cme_and_track_fields.sql` |
| Form đại biểu | `src/views/PublicDelegateRegister.tsx` |
| Form báo cáo viên | `src/views/PublicSpeakerRegister.tsx` |
| Xuất / nhập Excel đại biểu | `src/views/AttendeeManagement.tsx` — `handleExportDelegatesXLSX`, `downloadSampleExcelTemplate`, `handleFileUpload` |
| Xuất / nhập Excel báo cáo viên | `src/views/SpeakerManagement.tsx` — `handleExportXLSX`, `downloadSpeakerTemplate`, `parseSpeakerFile` |
| Hàm dùng chung cho Excel | `src/lib/exportHelpers.ts` |
| Quản lý chuyên đề | `src/views/SpeakerManagement.tsx` — `handleToggleTrackAccepting` |
| Mail tự động | `src/dataStore.ts` — `sendSpeakerApprovedEmail`, `sendDelegateInvitationEmail` |
| Phòng hộ khi thiếu cột | `src/dataStore.ts` — `writeToSupabase` |
| Cập nhật cơ sở dữ liệu từ admin | `src/views/SettingsPanel.tsx` (mục Cơ sở dữ liệu), `api/db/migrate.ts` |
| Các bước cập nhật | `src/lib/dbMigrations.ts` — nguồn chính |
| Sinh lại tệp .sql | `npm run db:sql`, kiểm lệch bằng `npm run db:sql:check` |

### Về `src/lib/exportHelpers.ts`

Gom về một chỗ những xử lý mà hai màn hình Đại biểu và Báo cáo viên đều cần:
`htmlToPlainText`, `toExportLink` / `fromImportLink`, `formatDateVi`,
`parseDateFlexible`, `normalizeVietnamesePhone`, `createColumnPicker`.

`createColumnPicker` dò cột không so khớp tuyệt đối tên tiêu đề, vì Ban tổ chức hay
thêm dấu `*`, đổi cách viết hoặc đảo thứ tự cột. **Mỗi cột chỉ được gán cho đúng một
trường**, nên thứ tự gọi phải đi từ cột cụ thể tới cột chung. Hai cái bẫy phải tránh:

- Tiêu đề bản tiếng Anh chứa trọn tiêu đề tiếng Việt: `"Abstract (tiếng Anh)"` chứa
  `"Abstract"`, `"Tóm lược quá trình công tác (tiếng Anh)"` chứa cả tiêu đề tiếng Việt
- Nhiều cột ảnh và tệp đều bắt đầu bằng chữ `"Link"`
- `"Số CCCD (Cấp CME)"` của tệp mẫu cũ cũng chứa chữ `"CME"` như cột `"Đăng ký CME"`
- `"Gói đăng ký"`, `"Thời điểm đăng ký"` và `"Ngày đăng ký"` đều chứa `"đăng ký"`

### Về `writeToSupabase`

Các mục trên đều thêm cột mới. Nếu mã nguồn lên hosting trước khi chạy script SQL,
PostgREST trả lỗi `Could not find the 'date_of_birth' column` và **từ chối cả bản
ghi** — nghĩa là mọi hồ sơ đăng ký mới đều không lưu được. Lỗi này cũng xảy ra trong
khoảng ngắn sau khi chạy `ALTER TABLE`, lúc PostgREST còn giữ lược đồ cũ trong bộ đệm.

`writeToSupabase` đọc tên cột còn thiếu từ thông báo lỗi, bỏ cột đó rồi thử lại, và
ghi cảnh báo ra console. Hàm chỉ bỏ qua đúng loại lỗi thiếu cột; lỗi khóa ngoại, trùng
khóa, RLS hay JWT vẫn trả nguyên về cho nơi gọi xử lý.
