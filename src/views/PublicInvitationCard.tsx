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

/**
 * Bảng màu của tấm thiệp, lấy màu chủ đạo #2b509e của Ban tổ chức.
 * BRAND_DARK và BRAND_SOFT là hai sắc độ đậm/nhạt của chính màu đó, để cả tấm
 * thiệp chỉ xoay quanh một tông màu.
 *
 * Chữ dùng Roboto như toàn bộ phần còn lại của hệ thống, không nạp font riêng.
 */
const BRAND = '#2b509e';
const BRAND_DARK = '#1d3a75';
const BRAND_SOFT = '#6b86c4';
const TEXT = '#1f2a44';

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
    <span className="h-px w-20 sm:w-28" style={{ backgroundColor: `${BRAND}55` }} />
    <span className="w-2 h-2 rotate-45 shrink-0" style={{ backgroundColor: BRAND }} />
    <span className="h-px w-20 sm:w-28" style={{ backgroundColor: `${BRAND}55` }} />
  </div>
);

export default function PublicInvitationCard() {
  const [data, setData] = useState<InvitationData | null>(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);

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
        <div className="flex items-center gap-3 text-slate-500 text-base font-bold">
          <Loader2 className="w-6 h-6 animate-spin" />
          Đang mở thư mời...
        </div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="min-h-screen bg-slate-100 flex items-center justify-center p-6">
        <div className="max-w-md w-full bg-white rounded-2xl border border-slate-200 shadow-sm p-7 text-center space-y-3">
          <AlertCircle className="w-11 h-11 text-amber-500 mx-auto" />
          <p className="text-base font-bold text-slate-900">Không mở được thư mời</p>
          <p className="text-sm text-slate-500 leading-relaxed">{error}</p>
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
      style={{ background: 'linear-gradient(180deg, #eaeefa 0%, #f6f8fd 55%, #eaeefa 100%)' }}
    >
      {/* Thanh công cụ, không in ra giấy */}
      <div className="max-w-2xl mx-auto mb-5 flex flex-wrap items-center justify-between gap-3 print:hidden">
        <p className="text-[13px] text-slate-500 leading-relaxed">
          Quý Bác sĩ có thể lưu thư mời này thành PDF hoặc chụp màn hình để chia sẻ.
        </p>
        <button
          type="button"
          onClick={() => window.print()}
          className="px-5 py-2.5 text-white rounded-full text-sm font-bold flex items-center gap-2 cursor-pointer border-none transition-opacity hover:opacity-90 whitespace-nowrap"
          style={{ backgroundColor: BRAND }}
        >
          <Printer className="w-4 h-4" />
          In / Lưu PDF
        </button>
      </div>

      {/* Tấm thiệp */}
      <div
        className="invitation-card max-w-2xl mx-auto bg-white overflow-hidden print:shadow-none"
        style={{
          boxShadow: '0 24px 60px -24px rgba(43, 80, 158, 0.32)',
          border: `1px solid ${BRAND}33`,
          borderRadius: 18,
        }}
      >
        <img src={BANNER_URL} alt={event.name} className="w-full h-auto block" />

        {/* Viền màu chủ đạo ngay dưới banner */}
        <div className="h-1" style={{ backgroundColor: BRAND }} />

        <div className="px-7 sm:px-12 py-10 sm:py-12">
          {/* Phần đầu */}
          <div className="text-center">
            <p
              className="text-[12px] sm:text-[13px] font-bold uppercase"
              style={{ color: BRAND, letterSpacing: '0.18em' }}
            >
              {event.organizer}
            </p>

            <h1
              className="mt-4 text-[32px] sm:text-[44px] leading-none font-black uppercase"
              style={{ color: BRAND_DARK, letterSpacing: '0.03em' }}
            >
              Thư mời tham dự
            </h1>

            <p
              className="mt-3.5 text-[16px] sm:text-[18px] font-semibold"
              style={{ color: BRAND_SOFT }}
            >
              {event.name}
            </p>
          </div>

          <Divider className="my-9" />

          {/* Người được mời */}
          <div className="text-center">
            {/* Ảnh chân dung để lớn, có vòng viền, làm điểm nhấn chính của
                tấm thiệp — đây là thư mời dành riêng cho một cá nhân. */}
            <div className="flex justify-center">
              {hasPortrait ? (
                <div
                  className="rounded-full p-[5px]"
                  style={{
                    background: `linear-gradient(145deg, ${BRAND}, ${BRAND_SOFT} 48%, ${BRAND})`,
                    boxShadow: '0 16px 36px -14px rgba(43, 80, 158, 0.5)',
                  }}
                >
                  <img
                    src={attendee.avatarUrl}
                    alt={displayName}
                    className="w-56 h-56 sm:w-72 sm:h-72 rounded-full object-cover object-center border-4 border-white block"
                  />
                </div>
              ) : (
                <div
                  className="w-56 h-56 sm:w-72 sm:h-72 rounded-full flex items-center justify-center font-black"
                  style={{
                    border: `3px solid ${BRAND}66`,
                    backgroundColor: '#f2f5fc',
                    color: BRAND,
                    fontSize: 96,
                  }}
                >
                  {attendee.fullName.charAt(0)}
                </div>
              )}
            </div>

            <p
              className="mt-8 text-[16px] sm:text-[17px] italic"
              style={{ color: BRAND_SOFT, letterSpacing: '0.04em' }}
            >
              Trân trọng kính mời
            </p>

            <p
              className="mt-3 text-[30px] sm:text-[40px] leading-tight uppercase font-black"
              style={{ color: BRAND_DARK, letterSpacing: '0.01em' }}
            >
              {displayName}
            </p>

            {workplace && (
              <p className="mt-2.5 text-[15px] sm:text-[16px] font-medium" style={{ color: TEXT }}>
                {workplace}
              </p>
            )}

            {/* Danh hiệu và mã hồ sơ, viết thành một dòng gọn thay vì nhiều thẻ */}
            <p
              className="mt-6 text-[12px] sm:text-[13px] font-bold uppercase"
              style={{ color: BRAND, letterSpacing: '0.14em' }}
            >
              Đại biểu chính thức
              {attendee.packageName ? ` · ${attendee.packageName}` : ''}
            </p>
            <p
              className="mt-2 text-[13px] font-mono font-bold"
              style={{ color: BRAND_SOFT, letterSpacing: '0.08em' }}
            >
              {attendee.id}
            </p>
          </div>

          <Divider className="my-9" />

          {/* Thời gian và địa điểm */}
          <div
            className="grid grid-cols-1 sm:grid-cols-2 text-center sm:text-left"
            style={{ borderTop: `1px solid ${BRAND}33`, borderBottom: `1px solid ${BRAND}33` }}
          >
            <div className="py-6 sm:pr-7 sm:border-r" style={{ borderColor: `${BRAND}33` }}>
              <p
                className="text-[11.5px] font-bold uppercase"
                style={{ color: BRAND, letterSpacing: '0.18em' }}
              >
                Thời gian
              </p>
              <p className="mt-2 text-[19px] sm:text-[21px] font-bold" style={{ color: BRAND_DARK }}>
                {event.date}
              </p>
            </div>
            <div className="py-6 sm:pl-7 border-t sm:border-t-0" style={{ borderColor: `${BRAND}33` }}>
              <p
                className="text-[11.5px] font-bold uppercase"
                style={{ color: BRAND, letterSpacing: '0.18em' }}
              >
                Địa điểm
              </p>
              <p
                className="mt-2 text-[19px] sm:text-[21px] font-bold leading-snug"
                style={{ color: BRAND_DARK }}
              >
                {event.location}
              </p>
            </div>
          </div>

          {/* Mã QR check-in, dùng như vé điện tử tại sảnh đón tiếp */}
          <div className="mt-10 flex flex-col items-center">
            <p
              className="text-[11.5px] font-bold uppercase"
              style={{ color: BRAND, letterSpacing: '0.18em' }}
            >
              Mã QR check-in
            </p>
            <div
              className="mt-3.5 bg-white"
              style={{ border: `2px solid ${BRAND}44`, borderRadius: 14, padding: 12 }}
            >
              <img
                src={`https://api.qrserver.com/v1/create-qr-code/?size=440x440&margin=0&data=${encodeURIComponent(attendee.qrCodeValue || attendee.id)}`}
                alt="Mã QR check-in"
                className="w-44 h-44 sm:w-48 sm:h-48 block"
              />
            </div>
            <p
              className="mt-3.5 text-[14px] italic text-center leading-relaxed max-w-sm"
              style={{ color: BRAND_SOFT }}
            >
              Quý Bác sĩ xuất trình mã này tại quầy đón tiếp để làm thủ tục nhanh.
            </p>
          </div>

          {/* Chương trình: chỉ hiện khi Ban tổ chức đã nhập lịch trình */}
          {dates.length > 0 ? (
            <div className="mt-10">
              <p
                className="text-[11.5px] font-bold uppercase text-center"
                style={{ color: BRAND, letterSpacing: '0.18em' }}
              >
                Chương trình hội nghị
              </p>
              <div className="mt-6 space-y-7">
                {dates.map(date => (
                  <div key={date} className="break-inside-avoid">
                    <p
                      className="text-[16px] font-bold pb-2.5 mb-3"
                      style={{ color: BRAND_DARK, borderBottom: `1px solid ${BRAND}33` }}
                    >
                      {formatSessionDate(date)}
                    </p>
                    <div className="space-y-2.5">
                      {byDate[date].map(s => (
                        <div key={s.id} className="flex flex-wrap items-baseline gap-x-4 gap-y-0.5">
                          <span
                            className="text-[14px] font-mono font-bold whitespace-nowrap shrink-0"
                            style={{ color: BRAND, minWidth: 104 }}
                          >
                            {s.startTime}{s.endTime ? `–${s.endTime}` : ''}
                          </span>
                          <span
                            className="text-[15px] flex-1 min-w-[180px] leading-snug font-medium"
                            style={{ color: TEXT }}
                          >
                            {s.title}
                          </span>
                          {s.roomName && (
                            <span
                              className="text-[13px] whitespace-nowrap font-semibold"
                              style={{ color: BRAND_SOFT }}
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
              className="mt-9 text-[15px] italic text-center leading-relaxed"
              style={{ color: BRAND_SOFT }}
            >
              Chương trình khoa học chi tiết sẽ được Ban tổ chức cập nhật
              <br className="hidden sm:block" />
              và thông báo tới Quý Bác sĩ trong thời gian tới.
            </p>
          )}

          <Divider className="my-10" />

          {/* Phần ký */}
          <div className="text-center">
            <p className="text-[16px] sm:text-[17px] italic leading-relaxed" style={{ color: TEXT }}>
              Ban Tổ chức rất hân hạnh được đón tiếp Quý Bác sĩ tại Hội nghị.
            </p>
            <p
              className="mt-6 text-[14px] sm:text-[15px] font-bold uppercase"
              style={{ color: BRAND, letterSpacing: '0.14em' }}
            >
              Ban Tổ chức
            </p>
            <p className="mt-1.5 text-[16px] sm:text-[17px] font-bold" style={{ color: BRAND_DARK }}>
              {event.name}
            </p>
            <p className="mt-3.5 text-[13px] font-mono" style={{ color: BRAND_SOFT }}>
              vsaps.events@gmail.com · +84 964 551 151
            </p>
          </div>
        </div>

        {/* Viền màu chủ đạo khép tấm thiệp */}
        <div className="h-1" style={{ backgroundColor: BRAND }} />
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
