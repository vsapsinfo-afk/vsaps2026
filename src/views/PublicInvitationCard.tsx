/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * Trang Thư mời tham dự của từng đại biểu.
 *
 * Mở bằng đường dẫn riêng: /?view=thu-moi&id=<mã đại biểu>&k=<mã kiểm tra>
 * Đại biểu dùng chính trang này để chụp màn hình hoặc lưu PDF rồi đăng lên
 * trang cá nhân, nên trang được dựng theo dạng tấm thiệp và có sẵn nút in.
 *
 * Trang không hiển thị số điện thoại, email hay số CCCD — đường dẫn vốn để
 * công khai nên chỉ hiện những thông tin đại biểu sẽ tự đăng.
 *
 * Riêng mã QR check-in được Ban tổ chức yêu cầu in lên thiệp để dùng như vé điện
 * tử: ai xem được tấm thiệp đã đăng công khai thì cũng thấy được mã này.
 */
import React, { useEffect, useState } from 'react';
import { Printer, AlertCircle, Loader2 } from 'lucide-react';

interface InvitationData {
  attendee: {
    id: string;
    title: string;
    fullName: string;
    organization: string;
    department: string;
    packageName: string;
    avatarUrl: string;
    nationality: string;
    qrCodeValue: string;
  };
  event: {
    name: string;
    organizer: string;
    date: string;
    location: string;
  };
  sessions: {
    id: string;
    title: string;
    date: string;
    startTime: string;
    endTime: string;
    roomName: string;
    track: string;
    speakerName: string;
  }[];
}

const BANNER_URL =
  'https://vzfacodpaveftuowsnze.supabase.co/storage/v1/object/public/assets/logos/email.jpg';

/** Bảng màu riêng của tấm thiệp: xanh mực và vàng đồng, hợp với banner hội nghị. */
const INK = '#102a43';
const INK_SOFT = '#486581';
const GOLD = '#b08d3f';

/** Font chữ chân, chỉ dùng cho phần trang trọng của thiệp. */
const SERIF = "'Playfair Display', Georgia, 'Times New Roman', serif";

/** YYYY-MM-DD -> "Thứ ..., DD/MM/YYYY". Không nhận dạng được thì giữ nguyên. */
const formatSessionDate = (iso: string): string => {
  const m = iso.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (!m) return iso;
  const d = new Date(`${iso}T00:00:00`);
  const weekday = ['Chủ nhật', 'Thứ hai', 'Thứ ba', 'Thứ tư', 'Thứ năm', 'Thứ sáu', 'Thứ bảy'][d.getDay()];
  return `${weekday}, ${m[3]}/${m[2]}/${m[1]}`;
};

/** Đường kẻ trang trí: hai vạch mảnh và một hình thoi nhỏ ở giữa. */
const Divider: React.FC<{ className?: string }> = ({ className = '' }) => (
  <div className={`flex items-center justify-center gap-3 ${className}`} aria-hidden="true">
    <span className="h-px w-16 sm:w-24" style={{ backgroundColor: `${GOLD}66` }} />
    <span
      className="w-1.5 h-1.5 rotate-45 shrink-0"
      style={{ backgroundColor: GOLD }}
    />
    <span className="h-px w-16 sm:w-24" style={{ backgroundColor: `${GOLD}66` }} />
  </div>
);

export default function PublicInvitationCard() {
  const [data, setData] = useState<InvitationData | null>(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);

  // Nạp font chữ chân chỉ cho riêng trang này, các trang khác vẫn dùng Roboto
  useEffect(() => {
    const id = 'vsaps-invitation-font';
    if (document.getElementById(id)) return;
    const link = document.createElement('link');
    link.id = id;
    link.rel = 'stylesheet';
    link.href =
      'https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@0,500;0,600;0,700;1,500&display=swap';
    document.head.appendChild(link);
  }, []);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const id = params.get('id') || '';
    const k = params.get('k') || '';

    if (!id || !k) {
      setError('Đường dẫn thư mời không đầy đủ. Vui lòng mở đúng đường dẫn Ban tổ chức đã gửi.');
      setLoading(false);
      return;
    }

    let cancelled = false;
    fetch(`/api/invitation?id=${encodeURIComponent(id)}&k=${encodeURIComponent(k)}`)
      .then(async res => {
        const json = await res.json().catch(() => null);
        if (cancelled) return;
        if (!res.ok || !json?.success) {
          setError(json?.error || 'Không mở được thư mời. Vui lòng liên hệ Ban tổ chức.');
        } else {
          setData(json as InvitationData);
        }
      })
      .catch(() => {
        if (!cancelled) setError('Không kết nối được tới máy chủ. Vui lòng thử lại sau.');
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => { cancelled = true; };
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-100 flex items-center justify-center p-6">
        <div className="flex items-center gap-3 text-slate-500 text-sm font-bold">
          <Loader2 className="w-5 h-5 animate-spin" />
          Đang mở thư mời...
        </div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="min-h-screen bg-slate-100 flex items-center justify-center p-6">
        <div className="max-w-md w-full bg-white rounded-2xl border border-slate-200 shadow-sm p-6 text-center space-y-3">
          <AlertCircle className="w-10 h-10 text-amber-500 mx-auto" />
          <p className="text-sm font-bold text-slate-900">Không mở được thư mời</p>
          <p className="text-xs text-slate-500 leading-relaxed">{error}</p>
        </div>
      </div>
    );
  }

  const { attendee, event, sessions } = data;
  const displayName = `${attendee.title || ''} ${attendee.fullName}`.trim();
  const hasPortrait = !!attendee.avatarUrl && attendee.avatarUrl.startsWith('http');
  const workplace = [attendee.organization, attendee.department].filter(Boolean).join(' — ');

  // Gom chương trình theo ngày cho dễ đọc
  const byDate = sessions.reduce<Record<string, typeof sessions>>((acc, s) => {
    const key = s.date || 'Chưa xếp ngày';
    (acc[key] = acc[key] || []).push(s);
    return acc;
  }, {});
  const dates = Object.keys(byDate).sort();

  return (
    <div
      className="min-h-screen py-8 px-4 print:py-0 print:px-0"
      style={{ background: 'linear-gradient(180deg, #eef2f7 0%, #f8fafc 55%, #eef2f7 100%)' }}
    >
      {/* Thanh công cụ, không in ra giấy */}
      <div className="max-w-2xl mx-auto mb-5 flex flex-wrap items-center justify-between gap-3 print:hidden">
        <p className="text-[11px] text-slate-500 leading-relaxed">
          Quý Bác sĩ có thể lưu thư mời này thành PDF hoặc chụp màn hình để chia sẻ.
        </p>
        <button
          type="button"
          onClick={() => window.print()}
          className="px-4 py-2 text-white rounded-full text-xs font-bold flex items-center gap-2 cursor-pointer border-none transition-opacity hover:opacity-90 whitespace-nowrap"
          style={{ backgroundColor: INK }}
        >
          <Printer className="w-4 h-4" />
          In / Lưu PDF
        </button>
      </div>

      {/* Tấm thiệp */}
      <div
        className="invitation-card max-w-2xl mx-auto bg-white overflow-hidden print:shadow-none"
        style={{
          boxShadow: '0 24px 60px -24px rgba(16, 42, 67, 0.28)',
          border: `1px solid ${GOLD}40`,
          borderRadius: 18,
        }}
      >
        <img src={BANNER_URL} alt={event.name} className="w-full h-auto block" />

        {/* Viền vàng mảnh ngay dưới banner */}
        <div className="h-[3px]" style={{ backgroundColor: GOLD }} />

        <div className="px-7 sm:px-12 py-9 sm:py-12">
          {/* Phần đầu */}
          <div className="text-center">
            <p
              className="text-[9.5px] sm:text-[10.5px] font-bold uppercase"
              style={{ color: INK_SOFT, letterSpacing: '0.22em' }}
            >
              {event.organizer}
            </p>

            <h1
              className="mt-4 text-[28px] sm:text-[38px] leading-none"
              style={{ fontFamily: SERIF, color: INK, letterSpacing: '0.04em', fontWeight: 700 }}
            >
              THƯ MỜI THAM DỰ
            </h1>

            <p
              className="mt-3 text-[12px] sm:text-[13.5px] italic"
              style={{ fontFamily: SERIF, color: INK_SOFT }}
            >
              {event.name}
            </p>
          </div>

          <Divider className="my-8" />

          {/* Người được mời */}
          <div className="text-center">
            {/* Ảnh chân dung để lớn, có vòng viền vàng, làm điểm nhấn chính của
                tấm thiệp — đây là thư mời dành riêng cho một cá nhân. */}
            <div className="flex justify-center">
              {hasPortrait ? (
                <div
                  className="rounded-full p-[4px]"
                  style={{
                    background: `linear-gradient(145deg, ${GOLD}, #efdcad 48%, ${GOLD})`,
                    boxShadow: '0 14px 34px -12px rgba(16, 42, 67, 0.4)',
                  }}
                >
                  <img
                    src={attendee.avatarUrl}
                    alt={displayName}
                    className="w-52 h-52 sm:w-64 sm:h-64 rounded-full object-cover object-center border-4 border-white block"
                  />
                </div>
              ) : (
                <div
                  className="w-52 h-52 sm:w-64 sm:h-64 rounded-full flex items-center justify-center"
                  style={{
                    border: `2px solid ${GOLD}80`,
                    backgroundColor: '#f6f8fb',
                    color: INK,
                    fontFamily: SERIF,
                    fontSize: 84,
                    fontWeight: 600,
                  }}
                >
                  {attendee.fullName.charAt(0)}
                </div>
              )}
            </div>

            <p
              className="mt-7 text-[12px] sm:text-[13px] italic"
              style={{ fontFamily: SERIF, color: INK_SOFT, letterSpacing: '0.08em' }}
            >
              Trân trọng kính mời
            </p>

            <p
              className="mt-3 text-[26px] sm:text-[34px] leading-tight uppercase"
              style={{ fontFamily: SERIF, color: INK, fontWeight: 700, letterSpacing: '0.02em' }}
            >
              {displayName}
            </p>

            {workplace && (
              <p className="mt-2 text-[12px] sm:text-[12.5px]" style={{ color: INK_SOFT }}>
                {workplace}
              </p>
            )}

            {/* Danh hiệu và mã hồ sơ, viết thành một dòng gọn thay vì nhiều thẻ */}
            <p
              className="mt-5 text-[9.5px] sm:text-[10px] font-bold uppercase"
              style={{ color: INK_SOFT, letterSpacing: '0.16em' }}
            >
              Đại biểu chính thức
              {attendee.packageName ? ` · ${attendee.packageName}` : ''}
            </p>
            <p
              className="mt-1.5 text-[10px] font-mono"
              style={{ color: `${INK_SOFT}aa`, letterSpacing: '0.1em' }}
            >
              {attendee.id}
            </p>
          </div>

          <Divider className="my-8" />

          {/* Thời gian và địa điểm */}
          <div
            className="grid grid-cols-1 sm:grid-cols-2 text-center sm:text-left"
            style={{ borderTop: `1px solid ${GOLD}33`, borderBottom: `1px solid ${GOLD}33` }}
          >
            <div className="py-5 sm:pr-6 sm:border-r" style={{ borderColor: `${GOLD}33` }}>
              <p
                className="text-[9px] font-bold uppercase"
                style={{ color: GOLD, letterSpacing: '0.2em' }}
              >
                Thời gian
              </p>
              <p
                className="mt-1.5 text-[14px] sm:text-[15px]"
                style={{ fontFamily: SERIF, color: INK, fontWeight: 600 }}
              >
                {event.date}
              </p>
            </div>
            <div className="py-5 sm:pl-6 border-t sm:border-t-0" style={{ borderColor: `${GOLD}33` }}>
              <p
                className="text-[9px] font-bold uppercase"
                style={{ color: GOLD, letterSpacing: '0.2em' }}
              >
                Địa điểm
              </p>
              <p
                className="mt-1.5 text-[14px] sm:text-[15px] leading-snug"
                style={{ fontFamily: SERIF, color: INK, fontWeight: 600 }}
              >
                {event.location}
              </p>
            </div>
          </div>

          {/* Mã QR check-in, dùng như vé điện tử tại sảnh đón tiếp */}
          <div className="mt-9 flex flex-col items-center">
            <p
              className="text-[9px] font-bold uppercase"
              style={{ color: GOLD, letterSpacing: '0.2em' }}
            >
              Mã QR check-in
            </p>
            <div
              className="mt-3 bg-white"
              style={{ border: `1px solid ${GOLD}55`, borderRadius: 14, padding: 12 }}
            >
              <img
                src={`https://api.qrserver.com/v1/create-qr-code/?size=420x420&margin=0&data=${encodeURIComponent(attendee.qrCodeValue || attendee.id)}`}
                alt="Mã QR check-in"
                className="w-36 h-36 sm:w-40 sm:h-40 block"
              />
            </div>
            <p
              className="mt-3 text-[10.5px] italic text-center leading-relaxed max-w-xs"
              style={{ color: INK_SOFT }}
            >
              Quý Bác sĩ xuất trình mã này tại quầy đón tiếp để làm thủ tục nhanh.
            </p>
          </div>

          {/* Chương trình: chỉ hiện khi Ban tổ chức đã nhập lịch trình */}
          {dates.length > 0 ? (
            <div className="mt-9">
              <p
                className="text-[9.5px] font-bold uppercase text-center"
                style={{ color: GOLD, letterSpacing: '0.2em' }}
              >
                Chương trình hội nghị
              </p>
              <div className="mt-5 space-y-6">
                {dates.map(date => (
                  <div key={date} className="break-inside-avoid">
                    <p
                      className="text-[12px] pb-2 mb-2"
                      style={{
                        fontFamily: SERIF,
                        color: INK,
                        fontWeight: 600,
                        borderBottom: `1px solid ${GOLD}33`,
                      }}
                    >
                      {formatSessionDate(date)}
                    </p>
                    <div className="space-y-2">
                      {byDate[date].map(s => (
                        <div key={s.id} className="flex flex-wrap items-baseline gap-x-3 gap-y-0.5">
                          <span
                            className="text-[11px] font-mono whitespace-nowrap shrink-0"
                            style={{ color: GOLD, minWidth: 86 }}
                          >
                            {s.startTime}{s.endTime ? `–${s.endTime}` : ''}
                          </span>
                          <span
                            className="text-[12px] flex-1 min-w-[180px] leading-snug"
                            style={{ color: INK }}
                          >
                            {s.title}
                          </span>
                          {s.roomName && (
                            <span
                              className="text-[10px] whitespace-nowrap"
                              style={{ color: `${INK_SOFT}cc` }}
                            >
                              {s.roomName}
                            </span>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <p
              className="mt-8 text-[11.5px] italic text-center leading-relaxed"
              style={{ color: INK_SOFT }}
            >
              Chương trình khoa học chi tiết sẽ được Ban tổ chức cập nhật
              <br className="hidden sm:block" />
              và thông báo tới Quý Bác sĩ trong thời gian tới.
            </p>
          )}

          <Divider className="my-9" />

          {/* Phần ký */}
          <div className="text-center">
            <p
              className="text-[12px] sm:text-[13px] italic leading-relaxed"
              style={{ fontFamily: SERIF, color: INK_SOFT }}
            >
              Ban Tổ chức rất hân hạnh được đón tiếp Quý Bác sĩ tại Hội nghị.
            </p>
            <p
              className="mt-5 text-[11px] sm:text-[12px] font-bold uppercase"
              style={{ color: INK, letterSpacing: '0.16em' }}
            >
              Ban Tổ chức
            </p>
            <p
              className="mt-1 text-[11px] sm:text-[12px]"
              style={{ fontFamily: SERIF, color: INK, fontWeight: 600 }}
            >
              {event.name}
            </p>
            <p className="mt-3 text-[10px] font-mono" style={{ color: `${INK_SOFT}aa` }}>
              vsaps.events@gmail.com · +84 964 551 151
            </p>
          </div>
        </div>

        {/* Viền vàng mảnh khép tấm thiệp */}
        <div className="h-[3px]" style={{ backgroundColor: GOLD }} />
      </div>

      <style>{`
        @media print {
          @page { margin: 8mm; }
          body { background: #ffffff !important; }
          .invitation-card {
            box-shadow: none !important;
            border-radius: 0 !important;
            max-width: 100% !important;
          }
          /* Giữ nguyên nền và đường kẻ màu khi in */
          * { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
        }
      `}</style>
    </div>
  );
}
