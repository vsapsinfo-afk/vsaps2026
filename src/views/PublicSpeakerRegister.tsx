/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { ArrowLeft, CheckCircle, FileText, Upload, Calendar, AlertCircle, Sparkles, BookOpen } from 'lucide-react';
import { store } from '../dataStore';
import { sendRealtimeNotification } from '../lib/realtime';
import { SpeakerRegistration } from '../types';
import RichTextEditor from '../components/RichTextEditor';
import { useFormLabel } from '../hooks/useFormLabel';

interface PublicSpeakerRegisterProps {
  onNavigate: (view: string) => void;
}

export default function PublicSpeakerRegister({ onNavigate }: PublicSpeakerRegisterProps) {
  const businessConfig = store.getBusinessConfig();
  const formCfg = businessConfig.speakerFormConfig;
  const L = useFormLabel(formCfg);
  // Form State
  const [title, setTitle] = useState('PGS.TS.');
  const [fullName, setFullName] = useState('');
  const [organization, setOrganization] = useState('');
  const [department, setDepartment] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [bio, setBio] = useState('');
  const [presentationTitle, setPresentationTitle] = useState('');
  const [presentationTrack, setPresentationTrack] = useState(store.getSpecialtyTracks()[0]?.name || 'Ngoại Lồng Ngực & Tim Mạch');
  const [abstractText, setAbstractText] = useState('');
  const [fileName, setFileName] = useState('');
  const [calendarSynced, setCalendarSynced] = useState(true);
  const [avatarImage, setAvatarImage] = useState<string | null>(null);
  const [isAvatarUploading, setIsAvatarUploading] = useState(false);
  
  // States
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [createdSpeaker, setCreatedSpeaker] = useState<SpeakerRegistration | null>(null);
  const [errorMsg, setErrorMsg] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleAvatarUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setIsAvatarUploading(true);
      const reader = new FileReader();
      reader.onloadend = () => {
        setAvatarImage(reader.result as string);
        setIsAvatarUploading(false);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setFileName(file.name);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!fullName || !email || !presentationTitle || !abstractText || !organization) {
      setErrorMsg('Vui lòng điền đầy đủ các thông tin bắt buộc (*).');
      return;
    }
    setErrorMsg('');
    setIsSubmitting(true);

    try {
      const newId = 'SPK-' + Math.floor(Math.random() * 90000 + 10000);

      const speakerData: SpeakerRegistration = {
        id: newId,
        title,
        fullName,
        organization,
        department,
        phone,
        email,
        bio,
        presentationTitle,
        presentationTrack,
        abstractText,
        documentName: fileName || 'Draft_Abstract_' + fullName.replace(/\s+/g, '') + '.pdf',
        calendarSynced,
        status: 'pending',
        registrationDate: new Date().toISOString().split('T')[0],
        avatarUrl: avatarImage || undefined,
      };

      const saved = await store.saveSpeakerAsync(speakerData);

      // Broadcast realtime push notification to administrators
      sendRealtimeNotification(
        'Báo cáo viên Đăng ký bài',
        `Báo cáo viên ${saved.title} ${saved.fullName} (${saved.organization}) vừa nộp bài báo cáo: "${saved.presentationTitle}"`,
        'badge'
      );

      // Gửi thông báo tự động (chạy background)
      try {
        store.sendWhatsappToSpeaker(saved);
      } catch (err) {
        console.error('Lỗi khi gửi thông báo tự động:', err);
      }

      setCreatedSpeaker(saved);
      setIsSubmitted(true);
    } catch (err: any) {
      console.error('Lỗi lưu đăng ký báo cáo viên:', err);
      setErrorMsg(`Không thể hoàn tất gửi bài báo cáo: ${err.message || err.details || 'Lỗi cơ sở dữ liệu.'}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isSubmitted && createdSpeaker) {
    return (
      <div className="bg-slate-50 min-h-screen py-12 px-4">
        <div className="max-w-xl mx-auto bg-white rounded-3xl border border-slate-100 shadow-xl overflow-hidden">
          <div className="bg-gradient-to-r from-teal-800 to-indigo-900 text-white p-8 text-center relative">
            <div className="absolute top-4 left-4">
              <button 
                id="btn-back-event-details"
                onClick={() => onNavigate('event-details')}
                className="p-1 px-3 rounded-lg bg-indigo-950/50 hover:bg-indigo-950 text-xs font-semibold flex items-center gap-1 text-teal-150"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                Quay lại
              </button>
            </div>
            <div className="w-16 h-16 rounded-full bg-white/10 flex items-center justify-center mx-auto mb-4 border border-white/20">
              <CheckCircle className="w-8 h-8 text-teal-300" />
            </div>
            <h2 className="text-2xl font-bold mb-1">Đệ Trình Báo Cáo Thành Công!</h2>
            <p className="text-xs text-indigo-200 uppercase tracking-widest font-mono">Mã hồ sơ: {createdSpeaker.id}</p>
          </div>

          <div className="p-8 space-y-6">
            <div className="bg-indigo-50 rounded-2xl p-4 border border-indigo-200 text-slate-700 text-xs space-y-2 text-center">
              <Sparkles className="w-4 h-4 text-indigo-600 mx-auto" />
              <p className="font-bold text-slate-900">Thông báo liên thông hệ thống tự động đã phát tín:</p>
              <p>
                Email tự động đã được lập trình gửi tới báo cáo viên: <strong className="text-slate-950">{createdSpeaker.email}</strong>.
              </p>
              {createdSpeaker.calendarSynced && (
                <p className="text-xs text-slate-500">
                  📅 <strong className="text-slate-800">Đã đồng bộ Google Calendar lân cận:</strong> Token lịch trích xuất thành công. Lịch trình thuyết trình sẽ tự cập nhật vào thiết bị cá nhân của bác sĩ khi có phê duyệt.
                </p>
              )}
            </div>

            <div className="border border-slate-100 p-6 rounded-2xl bg-slate-50/50 space-y-4">
              <span className="text-[10px] font-bold text-indigo-700 uppercase tracking-wider block font-mono">Chi tiết hồ sơ đệ trình của bạn:</span>
              
              <div className="space-y-2 text-xs">
                <div className="flex items-center gap-3 pb-2 border-b border-slate-200/50">
                  {createdSpeaker.avatarUrl && (
                    <img 
                      src={createdSpeaker.avatarUrl} 
                      alt="Avatar" 
                      className="w-12 h-12 rounded-full object-cover border border-slate-200 shadow-sm shrink-0" 
                    />
                  )}
                  <div>
                    <span className="text-slate-400 font-medium">Báo cáo viên:</span>
                    <p className="font-bold text-slate-900 text-sm mt-0.5">{createdSpeaker.title} {createdSpeaker.fullName}</p>
                  </div>
                </div>
                <div className="pt-1">
                  <span className="text-slate-400 font-medium">Đơn vị:</span>
                  <p className="font-semibold text-slate-800 mt-0.5">{createdSpeaker.organization} ({createdSpeaker.department})</p>
                </div>
                <div className="border-t border-slate-200/60 pt-2">
                  <span className="text-slate-400 font-medium">Đề tài báo cáo đăng ký:</span>
                  <p className="font-bold text-slate-905 mt-0.5 leading-relaxed text-teal-850">“{createdSpeaker.presentationTitle}”</p>
                </div>
                <div>
                  <span className="text-slate-400 font-medium">Chuyên mục:</span>
                  <p className="font-semibold text-slate-800 mt-0.5 bg-indigo-50 inline-block px-2 py-0.5 rounded text-[11px]">{createdSpeaker.presentationTrack}</p>
                </div>
                <div>
                  <span className="text-slate-400 font-medium">Tài liệu đính kèm:</span>
                  <p className="font-semibold text-teal-700 mt-0.5 flex items-center gap-1">
                    <FileText className="w-3.5 h-3.5" />
                    {createdSpeaker.documentName}
                  </p>
                </div>
                <div className="border-t border-slate-200/60 pt-2">
                  <span className="text-slate-400 font-medium font-mono">TRẠNG THÁI KIỂM DUYỆT ACADEMIC:</span>
                  <span className="inline-flex items-center gap-1 ml-2 px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-amber-50 text-amber-700 font-mono">
                    ĐANG THẨM ĐỊNH (PENDING)
                  </span>
                </div>
              </div>
            </div>

            <p className="text-[11px] text-slate-500 text-center italic mt-4 leading-relaxed">
              Hội đồng Khoa học VSAPS 2026 sẽ tiến hành bình duyệt tóm tắt đề tài (Review Abstract) trong vòng 5 ngày làm việc. Quý bác sĩ có thể tra cứu trạng thái bài viết hoặc nhận phản hồi sửa đổi thông qua email cá nhân.
            </p>

            <button
              id="btn-speaker-return-home"
              onClick={() => onNavigate('event-details')}
              className="w-full py-3.5 rounded-xl bg-slate-900 hover:bg-slate-950 text-white font-bold text-xs uppercase tracking-widest transition-all"
            >
              Quay lại Trang Chủ Sự Kiện
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-slate-50 min-h-screen py-12 px-4 text-slate-800">
      <div className="max-w-3xl mx-auto">

        <div className="bg-white rounded-3xl border border-slate-100 shadow-xl overflow-hidden">

          {/* CLOSED FORM SCREEN */}
          {formCfg?.isOpen === false && (
            <div className="p-12 text-center" style={{ backgroundColor: formCfg?.headerBgColor || '#1e1b4b' }}>
              <div className="text-5xl mb-4">🔒</div>
              <h2 className="text-white font-black text-xl mb-3">Cổng nộp bài đã đóng</h2>
              <p className="text-white/70 text-sm max-w-md mx-auto">{formCfg?.closedMessage || 'Cổng nộp bài báo cáo hiện đã đóng. Vui lòng liên hệ Ban thư ký khoa học.'}</p>
              <button onClick={() => onNavigate('event-details')} className="mt-6 px-6 py-2.5 bg-white/20 hover:bg-white/30 text-white text-sm font-bold rounded-xl border border-white/30 cursor-pointer transition-all">← Về trang chủ</button>
            </div>
          )}

          {formCfg?.isOpen !== false && (<>

          <div
            className="text-white p-8 border-b-4"
            style={{ backgroundColor: formCfg?.headerBgColor || '#1e1b4b', borderBottomColor: formCfg?.accentColor || '#818cf8' }}
          >
            {formCfg?.bannerImageUrl && <img src={formCfg.bannerImageUrl} alt="Banner" className="h-10 object-contain mb-3 rounded" />}
            <span className="text-[9px] font-black tracking-widest uppercase block font-mono mb-1"
              style={{ color: formCfg?.accentColor || '#818cf8' }}>
              {formCfg?.organizerLabel || 'HỘI PHẪU THUẬT TẠO HÌNH THẨM MỸ VIỆT NAM (VSAPS)'}
            </span>
            <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight">
              {formCfg?.formTitle || 'ĐĂNG KÝ BÁO CÁO KHOA HỌC'}
            </h1>
            <p className="text-white/70 text-sm mt-1">
              {formCfg?.formDescription || 'Dành cho báo cáo viên quốc tế và nội địa đệ trình tóm tắt đề tài lâm sàng.'}
            </p>
          </div>

          <form onSubmit={handleSubmit} className="p-8 space-y-6">
            {errorMsg && (
              <div className="p-4 bg-rose-50 text-rose-700 text-xs rounded-xl flex items-center gap-2 border border-rose-100">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{errorMsg}</span>
              </div>
            )}

            {/* Speaker block information */}
            <div className="space-y-4">
              <h3 className="font-bold text-slate-900 border-b border-slate-100 pb-2 text-sm uppercase text-teal-800 flex items-center gap-1.5">
                <BookOpen className="w-4 h-4" />
                {L.section('speakerInfo', '1. Thông Tin Báo Cáo Viên', '1. Speaker Information')}
              </h3>

              {/* Speaker Avatar selector */}
              <div className="flex flex-col sm:flex-row items-center gap-4 bg-slate-50 p-4 rounded-2xl border border-slate-200">
                <div className="relative group shrink-0 w-20 h-20 rounded-full bg-slate-250 border-2 border-dashed border-teal-600/30 flex items-center justify-center overflow-hidden">
                  {avatarImage ? (
                    <img src={avatarImage} className="w-full h-full object-cover" alt="Speaker Avatar" />
                  ) : (
                    <span className="text-slate-400 text-[10px] font-bold text-center p-1 leading-none select-none">
                      {L.t('Chưa có ảnh', 'No Photo')}
                    </span>
                  )}
                  {isAvatarUploading && (
                    <div className="absolute inset-0 bg-slate-900/50 flex items-center justify-center text-[10px] text-white font-mono">
                      Loading...
                    </div>
                  )}
                </div>
                <div className="space-y-1 text-center sm:text-left">
                  <span className="text-xs font-bold text-slate-850 block uppercase tracking-wide">
                    {L.t('Ảnh Chân Dung / Chân Dung Khoa Học *', 'Scientific Portrait / Avatar *')}
                  </span>
                  <p className="text-[10px] text-slate-500 leading-snug">
                    {L.t('Ảnh chân dung của báo cáo viên sẽ được in trên Kỷ yếu Hội nghị, Thẻ đại biểu danh dự & Website chính thức.', 'The portrait photo of the speaker will be printed in the Conference Proceedings, Honorary Badge & Official Website.')}
                  </p>
                  <div className="flex items-center justify-center sm:justify-start gap-2 pt-1.5">
                    <label className="px-3 py-1 bg-white hover:bg-slate-100 border border-slate-350 text-[11px] font-bold rounded-lg cursor-pointer transition-all select-none">
                      {L.t('Tải ảnh chân dung', 'Upload Portrait')}
                      <input type="file" accept="image/*" onChange={handleAvatarUpload} className="hidden" />
                    </label>
                    {avatarImage && (
                      <button
                        type="button"
                        onClick={() => setAvatarImage(null)}
                        className="px-2 py-1 bg-rose-50 hover:bg-rose-100 text-rose-600 text-[11px] font-semibold rounded-lg border-none cursor-pointer"
                      >
                        {L.t('Xóa ảnh', 'Remove Photo')}
                      </button>
                    )}
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">
                    {L.t('Học hàm / Học vị *', 'Academic Title *')}
                  </label>
                  <select
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    className="w-full px-4 py-2 bg-slate-55 border border-slate-200 rounded-xl text-sm focus:border-teal-500 focus:outline-none"
                  >
                    <option value="GS.TS.">GS.TS. (Giáo sư Tiến sĩ)</option>
                    <option value="PGS.TS.">PGS.TS. (Phó Giáo sư Tiến sĩ)</option>
                    <option value="TS.BS.">TS.BS. (Tiến sĩ Bác sĩ)</option>
                    <option value="ThS.BS.">ThS.BS. (Thạc sĩ Bác sĩ)</option>
                    <option value="BSCKII.">BSCKII. (Bác sĩ Chuyên khoa II)</option>
                    <option value="BSCKI.">BSCKI. (Bác sĩ Chuyên khoa I)</option>
                    <option value="BS.">BS. (Bác sĩ chuyên khoa)</option>
                    <option value="Professor">Professor (International)</option>
                    <option value="Dr.">Dr. (International)</option>
                  </select>
                </div>

                <div className="md:col-span-2">
                  <label className="block text-xs font-semibold text-slate-600 mb-1">
                    {L.t('Họ và Tên *', 'Full Name *')}
                  </label>
                  <input
                    type="text"
                    required
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    placeholder={L.p('ví dụ: PGS.TS. Trần Quốc Bảo', 'e.g. Prof. John Smith')}
                    className="w-full px-4 py-2 bg-slate-55 border border-slate-200 rounded-xl text-sm focus:border-teal-500 focus:outline-none placeholder-slate-400"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">
                    {L.t('Đơn vị công tác chính *', 'Primary Institution *')}
                  </label>
                  <input
                    type="text"
                    required
                    value={organization}
                    onChange={(e) => setOrganization(e.target.value)}
                    placeholder={L.p('Bệnh viện mổ chính, viện nghiên cứu hoặc Đại học', 'Hospital, research institute, or university')}
                    className="w-full px-4 py-2 bg-slate-55 border border-slate-200 rounded-xl text-sm focus:border-teal-500 focus:outline-none placeholder-slate-400"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">
                    {L.t('Khoa / Phòng ban / Bộ môn *', 'Department / Specialty *')}
                  </label>
                  <input
                    type="text"
                    required
                    value={department}
                    onChange={(e) => setDepartment(e.target.value)}
                    placeholder={L.p('ví dụ: Chuyên bộ môn Chấn thương chỉnh hình', 'e.g., Plastic Surgery Department')}
                    className="w-full px-4 py-2 bg-slate-55 border border-slate-200 rounded-xl text-sm focus:border-teal-500 focus:outline-none placeholder-slate-400"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">
                    {L.t('Số điện thoại *', 'Phone Number *')}
                  </label>
                  <input
                    type="tel"
                    required
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder={L.p('ví dụ: 0912123567', 'e.g. 0912123567')}
                    className="w-full px-4 py-2 bg-slate-55 border border-slate-200 rounded-xl text-sm focus:border-teal-500 focus:outline-none placeholder-slate-400"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">
                    {L.t('Email liên hệ trao đổi học thuật *', 'Academic Contact Email *')}
                  </label>
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder={L.p('ví dụ: bao.tq@hospital.vn', 'e.g. j.smith@hospital.com')}
                    className="w-full px-4 py-2 bg-slate-55 border border-slate-200 rounded-xl text-sm focus:border-teal-500 focus:outline-none placeholder-slate-400"
                  />
                </div>
              </div>

              <div>
                <RichTextEditor
                  value={bio}
                  onChange={setBio}
                  label={L.t('Tiểu sử khoa học tóm tắt (Bio) - Khoảng 100 từ', 'Short Scientific Bio - Around 100 words') as string}
                  placeholder={L.p('Giới thiệu học hàm học vị, số năm chuyên khoa, các chức vụ danh dự hoặc công trình đại diện...', 'Brief intro, academic title, years of experience, honorary positions, or publication highlights...')}
                  id="speaker-bio"
                />
              </div>
            </div>

            {/* abstract elements info */}
            <div className="space-y-4 pt-4 border-t border-slate-100">
              <h3 className="font-bold text-slate-900 border-b border-slate-100 pb-2 text-sm uppercase text-teal-800 flex items-center gap-1.5">
                <FileText className="w-4 h-4" />
                {L.section('abstractInfo', '2. Nội Dung Đề Tài Đăng Ký Đệ Trình', '2. Abstract & Presentation Details')}
              </h3>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="md:col-span-2">
                  <label className="block text-xs font-semibold text-slate-600 mb-1">
                    {L.t('Tên đề tài bài báo cáo khoa học *', 'Presentation Title *')}
                  </label>
                  <input
                    type="text"
                    required
                    value={presentationTitle}
                    onChange={(e) => setPresentationTitle(e.target.value)}
                    placeholder={L.p('In thường hoặc in nổi bật đề tài', 'Title of presentation / scientific paper')}
                    className="w-full px-4 py-2 bg-slate-55 border border-slate-200 rounded-xl text-sm focus:border-teal-500 focus:outline-none placeholder-slate-400 font-semibold"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">
                    {L.t('Chuyên mục / Chuyên khoa chính *', 'Scientific Category / Track *')}
                  </label>
                  <select
                    value={presentationTrack}
                    onChange={(e) => setPresentationTrack(e.target.value)}
                    className="w-full px-4 py-2 bg-slate-55 border border-slate-200 rounded-xl text-sm focus:border-teal-500 focus:outline-none"
                  >
                    {store.getSpecialtyTracks().map((track) => (
                      <option key={track.id} value={track.name}>
                        {track.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <RichTextEditor
                  value={abstractText}
                  onChange={setAbstractText}
                  label={L.t('Tóm tắt nội dung báo cáo (Abstract) - Giới hạn 500 từ *', 'Abstract text - Limit 500 words *') as string}
                  placeholder={L.p('Cấu trúc bắt buộc chuẩn Y học: Đặt vấn đề, Đối tượng - Phương pháp nghiên cứu, Kết quả, Kết luận thảo luận...', 'Standard medical structure: Objective, Materials & Methods, Results, Conclusion & Discussion...')}
                  id="speaker-abstract"
                />
              </div>

              {/* Upload element */}
              <div className="p-4 bg-slate-50 border border-slate-200 rounded-2xl flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="space-y-1">
                  <span className="text-xs font-bold text-slate-800 block">
                    {L.t('Tải lên slide nháp / đề cương / tóm tắt đầy đủ', 'Upload draft slides / outline / full abstract')}
                  </span>
                  <p className="text-[10px] text-slate-500">
                    {L.t('Chấp nhận định dạng .pdf, .docx, .ppt, .pptx tối đa 15MB. Bản này dùng để hội đồng đọc bình duyệt chuyên sâu.', 'Accepts .pdf, .docx, .ppt, .pptx formats, max 15MB. This file will be reviewed by the academic committee.')}
                  </p>
                </div>

                <div className="flex items-center gap-3">
                  <label className="px-4 py-2 rounded-xl bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 cursor-pointer text-xs font-bold flex items-center gap-1.5 shrink-0 shadow-sm">
                    <Upload className="w-4 h-4 text-slate-400" />
                    {L.t('Bấm để tải tệp', 'Click to upload')}
                    <input
                      type="file"
                      accept=".pdf,.docx,.ppt,.pptx"
                      onChange={handleFileUpload}
                      className="hidden"
                    />
                  </label>
                  {fileName && (
                    <span className="text-xs text-teal-700 font-semibold truncate max-w-[120px] md:max-w-xs">{fileName}</span>
                  )}
                </div>
              </div>

              {/* Calendar sync selection */}
              <div className="flex items-start gap-3 p-4 bg-teal-50/20 border border-teal-100 rounded-2xl mt-4">
                <input
                  type="checkbox"
                  id="calendarSync"
                  checked={calendarSynced}
                  onChange={(e) => setCalendarSynced(e.target.checked)}
                  className="w-4 h-4 text-teal-600 bg-gray-100 border-gray-300 rounded focus:ring-teal-500 mt-0.5"
                />
                <label htmlFor="calendarSync" className="cursor-pointer text-xs select-none">
                  <span className="font-bold text-slate-900 block flex items-center gap-1">
                    <Calendar className="w-3.5 h-3.5 text-teal-600" />
                    {L.t('Tự động đồng bộ Lịch trình (Calendar Sync)', 'Automated Calendar Sync')}
                  </span>
                  <span className="text-slate-500">
                    {L.t('Nếu đề tài được phê duyệt, hệ thống sẽ tự động đồng bộ thời gian báo cáo chính thức vào Google Calendar của bác sĩ qua file đệ trình .ics đính kèm.', 'If the presentation is approved, the system will automatically sync the schedule into your Google Calendar via an attached .ics file.')}
                  </span>
                </label>
              </div>
            </div>

            <div className="pt-6">
              <button
                id="btn-submit-speaker"
                type="submit"
                disabled={isSubmitting}
                className="w-full py-4.5 rounded-2xl bg-indigo-700 hover:bg-indigo-850 disabled:opacity-50 text-white font-bold text-sm tracking-widest transition-all shadow-lg shadow-indigo-700/10 uppercase cursor-pointer"
              >
                {isSubmitting ? L.t('Đang gửi hồ sơ báo cáo...', 'Submitting presentation details...') : L.t('Gửi Hồ Sơ & Đăng Báo Cáo Khoa Học', 'Submit Presentation & Scientific Abstract')}
              </button>
            </div>
          </form>

          {formCfg?.footerNote && (
            <div className="px-8 pb-6">
              <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 text-[10.5px] text-slate-600 text-center leading-relaxed">{formCfg.footerNote}</div>
            </div>
          )}

          </> )}
        </div>
      </div>
    </div>
  );
}
