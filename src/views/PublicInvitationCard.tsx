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
 * Trang KHÔNG hiển thị mã QR check-in, số điện thoại, email hay số CCCD —
 * đường dẫn vốn để công khai nên chỉ hiện những thông tin đại biểu sẽ tự đăng.
 */
import React, { useEffect, useState } from 'react';
import { Printer, AlertCircle, Calendar, MapPin, Loader2 } from 'lucide-react';

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

/** YYYY-MM-DD -> "Thứ ..., DD/MM/YYYY". Không nhận dạng được thì giữ nguyên. */
const formatSessionDate = (iso: string): string => {
  const m = iso.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (!m) return iso;
  const d = new Date(`${iso}T00:00:00`);
  const weekday = ['Chủ nhật', 'Thứ hai', 'Thứ ba', 'Thứ tư', 'Thứ năm', 'Thứ sáu', 'Thứ bảy'][d.getDay()];
  return `${weekday}, ${m[3]}/${m[2]}/${m[1]}`;
};

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

  // Gom chương trình theo ngày cho dễ đọc
  const byDate = sessions.reduce<Record<string, typeof sessions>>((acc, s) => {
    const key = s.date || 'Chưa xếp ngày';
    (acc[key] = acc[key] || []).push(s);
    return acc;
  }, {});
  const dates = Object.keys(byDate).sort();

  return (
    <div className="min-h-screen bg-slate-100 py-6 px-4 print:bg-white print:py-0 print:px-0">
      {/* Thanh công cụ, không in ra giấy */}
      <div className="max-w-3xl mx-auto mb-4 flex flex-wrap items-center justify-between gap-3 print:hidden">
        <p className="text-[11px] text-slate-500 leading-relaxed">
          Quý Bác sĩ có thể lưu thư mời này thành PDF hoặc chụp màn hình để chia sẻ.
        </p>
        <button
          type="button"
          onClick={() => window.print()}
          className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-black flex items-center gap-1.5 cursor-pointer border-none transition-colors whitespace-nowrap"
        >
          <Printer className="w-4 h-4" />
          In / Lưu PDF
        </button>
      </div>

      {/* Tấm thiệp */}
      <div className="max-w-3xl mx-auto bg-white rounded-3xl border border-slate-200 shadow-lg overflow-hidden print:shadow-none print:border-0 print:rounded-none">
        <img
          src={BANNER_URL}
          alt={event.name}
          className="w-full h-auto block"
        />

        <div className="p-7 md:p-10 space-y-7">
          <div className="text-center space-y-1.5">
            <p className="text-[10px] font-black uppercase tracking-[0.25em] text-teal-700">
              {event.organizer}
            </p>
            <h1 className="text-xl md:text-2xl font-black text-slate-900 uppercase tracking-wide">
              Thư mời tham dự
            </h1>
            <p className="text-xs md:text-sm font-bold text-slate-500">{event.name}</p>
          </div>

          {/* Người được mời */}
          <div className="flex flex-col items-center text-center gap-3 py-5 border-y border-slate-150">
            {hasPortrait ? (
              <img
                src={attendee.avatarUrl}
                alt={displayName}
                className="w-28 h-28 rounded-full object-cover border-4 border-teal-600/20 shadow-sm"
              />
            ) : (
              <div className="w-28 h-28 rounded-full bg-slate-100 border-4 border-slate-200 flex items-center justify-center text-2xl font-black text-slate-400">
                {attendee.fullName.charAt(0)}
              </div>
            )}

            <div>
              <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">
                Trân trọng kính mời
              </p>
              <p className="text-lg md:text-xl font-black text-slate-900 mt-1 uppercase">
                {displayName}
              </p>
              {attendee.organization && (
                <p className="text-xs text-slate-500 font-semibold mt-0.5">
                  {attendee.organization}
                  {attendee.department ? ` — ${attendee.department}` : ''}
                </p>
              )}
            </div>

            <div className="flex flex-wrap items-center justify-center gap-2 pt-1">
              <span className="text-[10px] font-black uppercase tracking-wide bg-teal-50 text-teal-800 border border-teal-200 px-2.5 py-1 rounded-full">
                Đại biểu chính thức
              </span>
              <span className="text-[10px] font-mono font-bold bg-slate-100 text-slate-600 border border-slate-200 px-2.5 py-1 rounded-full">
                {attendee.id}
              </span>
              {attendee.packageName && (
                <span className="text-[10px] font-bold bg-slate-100 text-slate-600 border border-slate-200 px-2.5 py-1 rounded-full">
                  {attendee.packageName}
                </span>
              )}
            </div>
          </div>

          {/* Thời gian và địa điểm */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="bg-slate-50 border border-slate-150 rounded-2xl p-4 flex items-start gap-2.5">
              <Calendar className="w-4 h-4 text-teal-700 shrink-0 mt-0.5" />
              <div>
                <p className="text-[9.5px] font-black uppercase tracking-wider text-slate-400">Thời gian</p>
                <p className="text-xs font-bold text-slate-800 mt-0.5 leading-snug">{event.date}</p>
              </div>
            </div>
            <div className="bg-slate-50 border border-slate-150 rounded-2xl p-4 flex items-start gap-2.5">
              <MapPin className="w-4 h-4 text-teal-700 shrink-0 mt-0.5" />
              <div>
                <p className="text-[9.5px] font-black uppercase tracking-wider text-slate-400">Địa điểm</p>
                <p className="text-xs font-bold text-slate-800 mt-0.5 leading-snug">{event.location}</p>
              </div>
            </div>
          </div>

          {/* Chương trình: chỉ hiện khi Ban tổ chức đã nhập lịch trình */}
          {dates.length > 0 ? (
            <div className="space-y-3">
              <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 text-center">
                Chương trình hội nghị
              </p>
              {dates.map(date => (
                <div key={date} className="border border-slate-150 rounded-2xl overflow-hidden">
                  <div className="bg-slate-50 px-4 py-2 border-b border-slate-150">
                    <p className="text-[11px] font-black text-slate-700">{formatSessionDate(date)}</p>
                  </div>
                  <div className="divide-y divide-slate-100">
                    {byDate[date].map(s => (
                      <div key={s.id} className="px-4 py-2.5 flex flex-wrap items-baseline gap-x-3 gap-y-1">
                        <span className="text-[11px] font-mono font-bold text-teal-700 whitespace-nowrap">
                          {s.startTime}{s.endTime ? `–${s.endTime}` : ''}
                        </span>
                        <span className="text-[11.5px] font-semibold text-slate-800 flex-1 min-w-[180px] leading-snug">
                          {s.title}
                        </span>
                        {s.roomName && (
                          <span className="text-[10px] text-slate-400 font-bold whitespace-nowrap">
                            {s.roomName}
                          </span>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-[11px] text-slate-400 italic text-center bg-slate-50 border border-slate-150 rounded-2xl p-3">
              Chương trình khoa học chi tiết sẽ được Ban tổ chức cập nhật và thông báo tới
              Quý Bác sĩ trong thời gian tới.
            </p>
          )}

          <div className="text-center text-[11px] text-slate-500 leading-relaxed space-y-1 pt-2 border-t border-slate-150">
            <p>Ban Tổ chức rất hân hạnh được đón tiếp Quý Bác sĩ tại Hội nghị.</p>
            <p className="font-black text-slate-700 uppercase tracking-wide pt-1">
              Ban Tổ chức {event.name}
            </p>
            <p className="font-mono text-[10px] text-slate-400">
              vsaps.events@gmail.com · +84 964 551 151
            </p>
          </div>
        </div>
      </div>

      {/* Khi in: bỏ nền xám và tránh cắt đôi tấm thiệp giữa hai trang */}
      <style>{`
        @media print {
          @page { margin: 10mm; }
          body { background: #ffffff !important; }
        }
      `}</style>
    </div>
  );
}
