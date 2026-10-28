/**
 * Tiện ích dùng chung cho việc xuất và nhập tệp Excel của Đại biểu và
 * Báo cáo viên (mục II, III, VI của file "Đề xuất sửa vsapsevent.org").
 *
 * Gom về một chỗ để hai màn hình quản lý không có hai cách xử lý khác nhau
 * cho cùng một loại dữ liệu.
 */

/**
 * Chuyển nội dung HTML của ô soạn thảo về chữ thuần, để Excel đọc được.
 * Giữ ngắt dòng ở các thẻ khối thay vì dán liền các đoạn với nhau.
 */
export function htmlToPlainText(html?: string): string {
  if (!html) return '';
  const withBreaks = html
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/(p|div|li|h[1-6]|tr)>/gi, '\n')
    .replace(/<li[^>]*>/gi, '• ');

  let text: string;
  if (typeof document !== 'undefined') {
    // Dùng DOM để giải mã các thực thể HTML (&amp;, &nbsp;, &#39;...)
    const el = document.createElement('div');
    el.innerHTML = withBreaks;
    text = el.textContent || '';
  } else {
    // Chạy ngoài trình duyệt (kiểm thử): bỏ thẻ và giải mã vài thực thể hay gặp
    text = withBreaks
      .replace(/<[^>]*>/g, '')
      .replace(/&nbsp;/gi, ' ')
      .replace(/&amp;/gi, '&')
      .replace(/&lt;/gi, '<')
      .replace(/&gt;/gi, '>')
      .replace(/&quot;/gi, '"')
      .replace(/&#39;/g, "'");
  }

  return text
    .replace(/ /g, ' ')
    .replace(/[ \t]+\n/g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

/**
 * Ảnh và tệp được lưu trên Supabase Storage dưới dạng link công khai, nên xuất
 * thẳng vào Excel là bấm được. Riêng hồ sơ cũ còn giữ ảnh dạng base64 (data:)
 * thì không đưa vào ô Excel được: một ô chỉ chứa tối đa 32.767 ký tự, còn ảnh
 * base64 thường dài hơn thế nhiều. Những hồ sơ đó được ghi chú rõ để Ban tổ
 * chức biết là phải mở trong hệ thống để xem.
 */
export const NO_LINK_NOTE = 'Ảnh lưu trong hệ thống, chưa có link — mở hồ sơ để xem';

export function toExportLink(url?: string): string {
  if (!url) return '';
  if (url.startsWith('data:')) return NO_LINK_NOTE;
  return url;
}

/** Ngược lại của toExportLink: chỉ nhận lại link thật khi nhập tệp vào. */
export function fromImportLink(value?: string): string | undefined {
  if (!value) return undefined;
  const v = value.trim();
  return /^https?:\/\//i.test(v) ? v : undefined;
}

/**
 * Chuẩn hóa số điện thoại Việt Nam về dạng bắt đầu bằng 0.
 *
 * Cần thiết vì Excel coi "0912345678" là số và tự bỏ chữ số 0 ở đầu, thành
 * 912345678. Số sai đầu số thì gửi tin nhắn Zalo OA hàng loạt sẽ không tới
 * được. Hàm này khôi phục chữ số 0, đồng thời nhận cả dạng +84 và 84.
 */
export function normalizeVietnamesePhone(raw: unknown): string {
  if (raw === undefined || raw === null) return '';
  let v = String(raw).trim();
  if (!v) return '';

  // Bỏ khoảng trắng và các dấu phân cách người dùng hay gõ
  v = v.replace(/[\s.()\-]/g, '');

  // Dạng quốc tế +84... hoặc 0084...
  if (v.startsWith('+84')) v = '0' + v.slice(3);
  else if (v.startsWith('0084')) v = '0' + v.slice(4);

  const digits = v.replace(/\D/g, '');
  if (!digits) return '';

  // 84xxxxxxxxx (11 chữ số) là dạng quốc tế bị mất dấu +
  if (digits.length === 11 && digits.startsWith('84')) return '0' + digits.slice(2);

  // Excel đã cắt chữ số 0 ở đầu: số di động Việt Nam còn lại 9 chữ số
  if (digits.length === 9 && !digits.startsWith('0')) return '0' + digits;

  return digits;
}

/** YYYY-MM-DD -> DD/MM/YYYY. Giá trị trống hoặc sai định dạng thì trả về ''. */
export function formatDateVi(iso?: string): string {
  if (!iso) return '';
  const m = String(iso).match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (!m) return String(iso);
  return `${m[3]}/${m[2]}/${m[1]}`;
}

/**
 * Đọc ngày từ ô Excel về dạng YYYY-MM-DD. Nhận được:
 *   - 1975-03-15 và 1975/03/15
 *   - 15/03/1975, 15-03-1975, 15.03.1975
 *   - số sê-ri ngày của Excel (ô được định dạng Date), mốc 0 là 30/12/1899
 * Không nhận dạng được thì trả về undefined để Ban tổ chức điền tay.
 */
export function parseDateFlexible(raw: unknown): string | undefined {
  if (raw === undefined || raw === null) return undefined;
  const text = String(raw).trim();
  if (!text) return undefined;

  let m = text.match(/^(\d{4})[-/](\d{1,2})[-/](\d{1,2})/);
  if (m) {
    return `${m[1]}-${m[2].padStart(2, '0')}-${m[3].padStart(2, '0')}`;
  }

  m = text.match(/^(\d{1,2})[/\-.](\d{1,2})[/\-.](\d{4})$/);
  if (m) {
    return `${m[3]}-${m[2].padStart(2, '0')}-${m[1].padStart(2, '0')}`;
  }

  if (/^\d{4,6}$/.test(text)) {
    const serial = parseInt(text, 10);
    const d = new Date(Date.UTC(1899, 11, 30) + serial * 86400000);
    if (!isNaN(d.getTime()) && d.getUTCFullYear() >= 1920) {
      return d.toISOString().split('T')[0];
    }
  }

  return undefined;
}

/**
 * Bộ dò cột cho tệp Excel người dùng tự điền.
 *
 * Không so khớp tuyệt đối tên tiêu đề, vì Ban tổ chức hay thêm dấu *, đổi
 * cách viết hoặc đảo thứ tự cột. Mỗi cột chỉ được gán cho đúng một trường,
 * nên thứ tự gọi phải đi từ cột cụ thể tới cột chung. Hai cái bẫy thường gặp:
 *   - tiêu đề bản tiếng Anh chứa trọn tiêu đề tiếng Việt
 *     ("Abstract (tiếng Anh)" chứa "Abstract"),
 *   - nhiều cột ảnh và tệp đều bắt đầu bằng chữ "Link".
 */
export function createColumnPicker(row: Record<string, any>) {
  const keys = Object.keys(row);
  const usedKeys = new Set<string>();

  const takeCell = (k: string): string =>
    row[k] === undefined || row[k] === null ? '' : String(row[k]).trim();

  /** Lấy ô của cột chưa dùng đầu tiên thỏa một trong các điều kiện. */
  const pickBy = (tests: ((key: string) => boolean)[]): string => {
    for (const test of tests) {
      const k = keys.find(key => !usedKeys.has(key) && test(key.toLowerCase().trim()));
      if (k) {
        usedKeys.add(k);
        return takeCell(k);
      }
    }
    return '';
  };

  /** Khớp nếu tiêu đề chứa bất kỳ từ khóa nào trong danh sách. */
  const any = (...needles: string[]) => (k: string) => needles.some(n => k.includes(n));

  /** Tiêu đề của cột bản dịch tiếng Anh. */
  const isEn = (k: string) =>
    k.includes('tiếng anh') || k.includes('(en') || k.includes('english');

  return { pickBy, any, isEn };
}
