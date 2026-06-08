/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { ArrowLeft, CheckCircle, Upload, ShieldCheck, HeartHandshake, Check, Landmark, HelpCircle } from 'lucide-react';
import { store } from '../dataStore';
import { sendRealtimeNotification } from '../lib/realtime';
import { Sponsor } from '../types';
import RichTextEditor from '../components/RichTextEditor';
import { useFormLabel } from '../hooks/useFormLabel';

interface PublicSponsorRegisterProps {
  onNavigate: (view: string) => void;
}

const SPONSOR_TIERS = [
  {
    id: 'platinum',
    name: 'Platinum Partner (Kim Cương)',
    fee: 500000000,
    benefits: [
      'Sở hữu 2 Gian hàng triển lãm Gold Zone vị trí trung tâm sảnh chính',
      'In logo kích thước lớn nhất trên Backdrop chính và tài liệu kỷ yếu',
      'Phát video quảng cáo doanh nghiệp 3 phút tại phiên Khai mạc hội nghị',
      'Giao bài phát biểu tham luận học thuật 15 phút tại phiên Plenary',
      'Cấp 10 Thẻ đại biểu VIP tham dự Gala Dinner và toàn bộ phiên khoa học',
      'Vinh danh đặc biệt và trao kỷ niệm chương tri ân tại phiên Khai mạc'
    ]
  },
  {
    id: 'gold',
    name: 'Gold Partner (Vàng)',
    fee: 250000000,
    benefits: [
      'Sở hữu 1 Gian hàng triển lãm tiêu chuẩn vị trí đắc địa',
      'In logo nổi bật trên Website, Backdrop sảnh phụ & kỷ yếu chính thức',
      'Trình chiếu logo quảng bá chéo tại các phiên chuyên đề',
      'Cấp 5 Thẻ đại biểu Standard tham gia toàn bộ chương trình',
      'Trao kỷ niệm chương tri ân danh dự từ Ban tổ chức'
    ]
  },
  {
    id: 'silver',
    name: 'Silver Partner (Bạc)',
    fee: 120000000,
    benefits: [
      'Sở hữu quyền đặt 02 Rollup quảng cáo tại phòng chuyên đề phụ',
      'In logo tiêu chuẩn trên Kỷ yếu điện tử & Website hội nghị',
      'Cấp 2 Thẻ đại biểu Standard tham gia phiên khoa học',
      'Trao giấy chứng nhận tài trợ chính thức từ VSAPS'
    ]
  },
  {
    id: 'bronze',
    name: 'Bronze Partner (Đồng)',
    fee: 60000000,
    benefits: [
      'In logo kích thước nhỏ tại chân trang tài liệu kỷ yếu',
      'Cấp 1 Thẻ đại biểu Standard tham dự hội nghị',
      'Trao giấy chứng nhận tài trợ danh dự từ Ban tổ chức'
    ]
  },
  {
    id: 'co_sponsor',
    name: 'Co-Sponsor (Đại sứ Đồng hành)',
    fee: 30000000,
    benefits: [
      'Vinh danh logo chung cùng các đại sứ đồng hành trên Website',
      'Gửi tặng ấn phẩm kỷ yếu lưu niệm chính thức sau hội nghị'
    ]
  }
];

export default function PublicSponsorRegister({ onNavigate }: PublicSponsorRegisterProps) {
  const businessConfig = store.getBusinessConfig();
  const formCfg = businessConfig.sponsorFormConfig;
  const L = useFormLabel(formCfg);
  // Form States
  const [name, setName] = useState('');
  const [tier, setTier] = useState<'platinum' | 'gold' | 'silver' | 'bronze' | 'co_sponsor'>('gold');
  const [contactPerson, setContactPerson] = useState('');
  const [contactEmail, setContactEmail] = useState('');
  const [contactPhone, setContactPhone] = useState('');
  const [notes, setNotes] = useState('');
  
  // Custom logo image state
  const [logoImage, setLogoImage] = useState<string | null>(null);
  const [isLogoUploading, setIsLogoUploading] = useState(false);
  
  // Custom benefits editing (pre-populated when tier changes)
  const [customBenefits, setCustomBenefits] = useState<string[]>([]);
  const [customBenefitsText, setCustomBenefitsText] = useState('');

  // Flow State
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [createdSponsor, setCreatedSponsor] = useState<Sponsor | null>(null);
  const [errorMsg, setErrorMsg] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Auto-populate benefits when tier changes
  useEffect(() => {
    const matched = SPONSOR_TIERS.find(t => t.id === tier);
    if (matched) {
      setCustomBenefits(matched.benefits);
      setCustomBenefitsText(matched.benefits.join('\n'));
    }
  }, [tier]);

  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setIsLogoUploading(true);
      const reader = new FileReader();
      reader.onloadend = () => {
        setLogoImage(reader.result as string);
        setIsLogoUploading(false);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const file = e.dataTransfer.files?.[0];
    if (file && file.type.startsWith('image/')) {
      setIsLogoUploading(true);
      const reader = new FileReader();
      reader.onloadend = () => {
        setLogoImage(reader.result as string);
        setIsLogoUploading(false);
      };
      reader.readAsDataURL(file);
    }
  };

  const currentTierData = SPONSOR_TIERS.find(t => t.id === tier) || SPONSOR_TIERS[1];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !contactPerson || !contactEmail || !contactPhone) {
      setErrorMsg('Vui lòng điền đầy đủ tất cả các trường thông tin liên hệ bắt buộc (*).');
      return;
    }
    setErrorMsg('');
    setIsSubmitting(true);

    // Split custom benefits by newlines
    const finalBenefits = customBenefitsText
      .split('\n')
      .map(b => b.trim())
      .filter(b => b.length > 0);

    const sponsorData: Sponsor = {
      id: 'SPN-' + Math.floor(Math.random() * 900 + 100),
      name,
      tier,
      pledgedAmount: currentTierData.fee,
      paidAmount: 0,
      paymentStatus: 'unpaid',
      contactPerson,
      contactEmail,
      contactPhone,
      benefitsSigned: finalBenefits.length > 0 ? finalBenefits : currentTierData.benefits,
      logoUrl: logoImage || undefined,
      notes: notes || undefined
    };

    try {
      const saved = await store.saveSponsorAsync(sponsorData);
      
      // Broadcast realtime push notification to administrators
      sendRealtimeNotification(
        'Nhà tài trợ Đăng ký mới',
        `Đơn vị "${saved.name}" vừa đăng ký cam kết tài trợ hạng mức ${saved.tier.toUpperCase()} với số tiền ${(saved.pledgedAmount || 0).toLocaleString('vi-VN')} VND!`,
        'warning'
      );

      setCreatedSponsor(saved);
      setIsSubmitted(true);
      window.scrollTo(0, 0);
    } catch (err: any) {
      console.error(err);
      setErrorMsg(`Không thể hoàn tất đăng ký nhà tài trợ: ${err.message || err.details || 'Lỗi cơ sở dữ liệu.'}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isSubmitted && createdSponsor) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-12 font-sans text-slate-900">
        <div className="bg-white rounded-3xl border border-slate-200 overflow-hidden shadow-2xl">
          {/* Success Banner */}
          <div className="bg-gradient-to-r from-teal-800 to-indigo-900 p-8 text-center text-white relative">
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(20,184,166,0.15),transparent)]" />
            <div className="w-16 h-16 bg-emerald-500/10 border-2 border-emerald-400 rounded-full flex items-center justify-center mx-auto mb-4 relative z-10">
              <CheckCircle className="w-9 h-9 text-emerald-300" />
            </div>
            <h2 className="text-2xl md:text-3xl font-extrabold tracking-tight relative z-10">ĐĂNG KÝ ĐỒNG HÀNH THÀNH CÔNG</h2>
            <p className="text-teal-200 text-sm mt-2 font-medium max-w-lg mx-auto relative z-10">
              Cảm ơn doanh nghiệp {createdSponsor.name} đã đăng ký trở thành đối tác đồng hành tại VSAPS 2026.
            </p>
          </div>

          <div className="p-8 space-y-8">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 divide-y md:divide-y-0 md:divide-x divide-slate-100">
              {/* Left Column: Sponsor profile details */}
              <div className="space-y-4">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest font-mono block">CHI TIẾT ĐĂNG KÝ HỒ SƠ</span>
                
                <div className="flex items-center gap-4 bg-slate-50 p-4 rounded-xl border border-slate-150">
                  {createdSponsor.logoUrl ? (
                    <img 
                      src={createdSponsor.logoUrl} 
                      alt="Logo Doanh nghiệp" 
                      className="w-14 h-14 object-contain rounded-lg bg-white border p-1" 
                    />
                  ) : (
                    <div className="w-14 h-14 rounded-lg bg-slate-200 border border-slate-300 flex items-center justify-center font-bold text-xs text-slate-500">
                      VSAPS
                    </div>
                  )}
                  <div>
                    <h4 className="font-extrabold text-slate-900 text-base">{createdSponsor.name}</h4>
                    <span className="inline-block px-2.5 py-0.5 mt-1 bg-indigo-50 border border-indigo-150 rounded text-[9.5px] font-bold uppercase text-indigo-700 tracking-wider">
                      {createdSponsor.tier} partner
                    </span>
                  </div>
                </div>

                <div className="space-y-2 text-xs text-slate-650 font-medium">
                  <p>• Mã đối tác: <strong className="text-slate-900 font-mono">{createdSponsor.id}</strong></p>
                  <p>• Người liên hệ: <strong className="text-slate-900">{createdSponsor.contactPerson}</strong></p>
                  <p>• Số điện thoại: <strong className="text-slate-900">{createdSponsor.contactPhone}</strong></p>
                  <p>• Hộp thư điện tử: <strong className="text-slate-900">{createdSponsor.contactEmail}</strong></p>
                  <p>• Kinh phí cam kết đóng góp: <strong className="text-indigo-700 text-sm font-black font-mono">{createdSponsor.pledgedAmount.toLocaleString()} VNĐ</strong></p>
                </div>

                <div className="bg-amber-50 rounded-xl p-4 border border-amber-200/50">
                  <span className="text-[10px] font-bold text-amber-800 uppercase tracking-wide block mb-1">Trạng thái hồ sơ:</span>
                  <p className="text-xs text-amber-950 font-medium leading-relaxed">
                    Hợp đồng đồng hành đã sẵn sàng. Ban Thư ký sẽ liên hệ trực tiếp đến số điện thoại <strong className="text-slate-900">{createdSponsor.contactPhone}</strong> trong vòng 24 giờ tiếp theo để bàn giao thiết kế gian hàng sơ đồ vị trí và ký văn bản ghi nhận chính thức.
                  </p>
                </div>
              </div>

              {/* Right Column: Bank billing transfer instructions */}
              <div className="md:pl-8 space-y-4 pt-6 md:pt-0">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest font-mono block">HƯỚNG DẪN CHUYỂN KHOẢN KINH PHÍ</span>
                
                <div className="p-4 bg-slate-50 border border-slate-250 rounded-2xl space-y-3.5 text-xs text-slate-700 font-sans shadow-inner">
                  <div className="flex items-center gap-2 text-indigo-900 border-b border-slate-200 pb-2">
                    <Landmark className="w-5 h-5 text-indigo-600" />
                    <span className="font-bold text-xs uppercase tracking-wider">Tài khoản ngân hàng của BTC</span>
                  </div>
                  
                  <div className="space-y-1.5">
                    <div className="flex justify-between">
                      <span className="text-slate-400">Ngân hàng thụ hưởng:</span>
                      <strong className="text-slate-900 text-right">VIETCOMBANK - Chi nhánh Hà Nội</strong>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-400">Tên tài khoản hưởng:</span>
                      <strong className="text-slate-900 text-right">HIEP HOI PHAU THUAT THAM MY VSAPS</strong>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-400">Số tài khoản:</span>
                      <strong className="text-slate-900 text-right font-mono text-sm tracking-wide">0011 0042 99999</strong>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-400">Số tiền chuyển khoản:</span>
                      <strong className="text-indigo-750 text-sm font-black font-mono">{(createdSponsor.pledgedAmount).toLocaleString()} VNĐ</strong>
                    </div>
                    <div className="flex flex-col gap-1 bg-white p-2.5 rounded-xl border border-slate-200 mt-2">
                      <span className="text-[9.5px] font-bold text-rose-500 uppercase tracking-wide">Cú pháp chuyển tiền chính xác (MEMO):</span>
                      <p className="font-mono text-xs font-black text-slate-900 tracking-tight bg-slate-50 p-2 rounded border text-center select-all">
                        {createdSponsor.id} {createdSponsor.name.toUpperCase().replace(/[^A-Z0-9 ]/g, '')} TAI TRO VSAPS2026
                      </p>
                    </div>
                  </div>
                </div>

                <div className="bg-slate-50 p-3 rounded-xl border border-slate-150 flex gap-2 text-[10.5px] text-slate-500 leading-snug">
                  <ShieldCheck className="w-5 h-5 text-teal-600 shrink-0 mt-0.5" />
                  <span>Cổng thanh toán tự động ghi nhận Realtime. Ngay khi chuyển khoản thành công, bút toán đối soát sẽ tự động kích hoạt hiển thị Logo Doanh nghiệp tại trang chủ lễ bế mạc và sảnh vinh danh.</span>
                </div>
              </div>
            </div>

            <div className="pt-6 border-t border-slate-100 text-center">
              <button
                onClick={() => onNavigate('event-details')}
                className="px-6 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl transition-all text-xs"
              >
                Quay Lại Trang Chủ Hội Nghị
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto px-4 py-8 font-sans text-slate-800">

      {/* CLOSED FORM SCREEN */}
      {formCfg?.isOpen === false && (
        <div className="bg-white rounded-3xl border border-slate-200 shadow-sm p-12 text-center mb-8" style={{ backgroundColor: formCfg?.headerBgColor || '#1c1917' }}>
          <div className="text-5xl mb-4">🔒</div>
          <h2 className="text-white font-black text-xl mb-3">Cổng đăng ký tài trợ đã đóng</h2>
          <p className="text-white/70 text-sm max-w-md mx-auto">{formCfg?.closedMessage || 'Cổng đăng ký tài trợ hiện đã đóng. Vui lòng liên hệ Ban tổ chức.'}</p>
          <button onClick={() => onNavigate('event-details')} className="mt-6 px-6 py-2.5 bg-white/20 hover:bg-white/30 text-white text-sm font-bold rounded-xl border border-white/30 cursor-pointer transition-all">← Về trang chủ</button>
        </div>
      )}

      {formCfg?.isOpen !== false && (<>

      {/* Header section */}
      <div
        className="p-6 rounded-3xl border border-slate-200 shadow-sm space-y-2 mb-8 text-center relative overflow-hidden"
        style={{ backgroundColor: formCfg?.headerBgColor || '#1c1917' }}
      >
        <div className="absolute top-0 right-0 p-3 opacity-15">
          <HeartHandshake className="w-32 h-32 text-white" />
        </div>

        {formCfg?.bannerImageUrl && <img src={formCfg.bannerImageUrl} alt="Banner" className="h-12 object-contain mx-auto mb-2 rounded" />}

        <span className="px-3 py-1 rounded-full text-[10.5px] font-black uppercase tracking-wider inline-block"
          style={{ backgroundColor: `${formCfg?.accentColor || '#f59e0b'}20`, color: formCfg?.accentColor || '#f59e0b', border: `1px solid ${formCfg?.accentColor || '#f59e0b'}40` }}>
          {formCfg?.organizerLabel || 'VSAPS 2026 PARTNER REGISTRATION'}
        </span>
        <h1 className="text-2xl md:text-3xl font-extrabold text-white uppercase tracking-tight">
          {formCfg?.formTitle || 'Đăng Ký Đồng Hành & Tài Trợ Hội Nghị'}
        </h1>
        <p className="text-xs md:text-sm max-w-2xl mx-auto leading-relaxed" style={{ color: `${formCfg?.accentColor || '#ffffff'}b0` }}>
          {formCfg?.formDescription || 'Đưa thương hiệu thiết bị y tế của bạn tiếp cận trực tiếp đến 1,000+ chuyên gia đầu ngành.'}
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-8">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          {/* Left Column: Register profile data */}
          <div className="lg:col-span-7 space-y-6">
            <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-4">
              <h3 className="text-sm font-black text-slate-900 uppercase tracking-wider border-b border-slate-100 pb-2 flex items-center gap-1.5">
                <span className="w-1.5 h-3.5 bg-teal-600 rounded"></span>
                {L.section('sponsorProfile', '1. Hồ Sơ Doanh Nghiệp Tài Trợ', '1. Sponsor / Company Profile')}
              </h3>

              {/* Logo upload block */}
              <div className="space-y-1.5">
                <label className="text-[11px] font-bold text-slate-500 block uppercase tracking-wide">
                  {L.t('Logo Thương Hiệu / Doanh Nghiệp *', 'Brand / Company Logo *')}
                </label>
                <div 
                  onDragOver={handleDragOver}
                  onDrop={handleDrop}
                  className="border-2 border-dashed border-slate-200 hover:border-teal-400 rounded-2xl p-4 bg-slate-50/50 flex flex-col items-center justify-center text-center transition-all min-h-[140px]"
                >
                  {logoImage ? (
                    <div className="relative group w-32 h-32 bg-white rounded-xl border p-2 flex items-center justify-center shadow-inner">
                      <img src={logoImage} alt="Brand Logo Preview" className="max-w-full max-h-full object-contain" />
                      <button
                        type="button"
                        onClick={() => setLogoImage(null)}
                        className="absolute -top-2 -right-2 bg-rose-500 text-white w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold shadow hover:bg-rose-600 cursor-pointer border-none"
                      >
                        ✕
                      </button>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      <div className="w-12 h-12 bg-white border border-slate-200 rounded-full flex items-center justify-center mx-auto shadow-sm text-slate-400">
                        <Upload className="w-5 h-5" />
                      </div>
                      <p className="text-xs font-medium text-slate-600">
                        {L.t('Kéo thả logo doanh nghiệp vào đây hoặc', 'Drag and drop your logo here or')}
                      </p>
                      <label className="inline-block px-3 py-1.5 bg-white border border-slate-300 rounded-lg hover:bg-slate-100 text-[10.5px] font-bold text-slate-700 cursor-pointer transition-all">
                        {L.t('Duyệt tìm tệp ảnh', 'Browse image file')}
                        <input type="file" accept="image/*" onChange={handleLogoUpload} className="hidden" />
                      </label>
                      <p className="text-[9.5px] text-slate-400">
                        {L.t('Khuyên dùng logo định dạng PNG nền trong suốt (Transparent), độ phân giải cao', 'High-res transparent background PNG logo is highly recommended')}
                      </p>
                    </div>
                  )}
                  {isLogoUploading && (
                    <div className="text-[10px] text-slate-400 mt-2 font-mono">
                      {L.t('Đang tải và xử lý...', 'Uploading & processing...')}
                    </div>
                  )}
                </div>
              </div>

              <div>
                <label className="text-[11px] font-bold text-slate-500 block mb-1">
                  {L.t('Tên Thương hiệu / Doanh nghiệp đăng ký *', 'Brand / Registered Company Name *')}
                </label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder={L.p('ví dụ: Công ty Cổ phần Boston Pharma Việt Nam', 'e.g. Boston Pharma Joint Stock Company')}
                  className="w-full px-4 py-2 border border-slate-200 rounded-xl text-xs font-bold text-slate-900 focus:outline-none focus:border-teal-500"
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="text-[11px] font-bold text-slate-500 block mb-1">
                    {L.t('Họ & Tên Đại diện liên hệ *', 'Contact Person Name *')}
                  </label>
                  <input
                    type="text"
                    required
                    value={contactPerson}
                    onChange={(e) => setContactPerson(e.target.value)}
                    placeholder={L.p('ví dụ: Nguyễn Minh Thư', 'e.g. Ms. Jane Smith')}
                    className="w-full px-4 py-2 border border-slate-200 rounded-xl text-xs font-semibold text-slate-900 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="text-[11px] font-bold text-slate-500 block mb-1">
                    {L.t('Số điện thoại liên hệ *', 'Contact Phone Number *')}
                  </label>
                  <input
                    type="tel"
                    required
                    value={contactPhone}
                    onChange={(e) => setContactPhone(e.target.value)}
                    placeholder={L.p('ví dụ: 0977889900', 'e.g. 0977889900')}
                    className="w-full px-4 py-2 border border-slate-200 rounded-xl text-xs font-bold font-mono text-slate-900 focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="text-[11px] font-bold text-slate-500 block mb-1">
                  {L.t('Email nhận thư báo ký kết & tài liệu *', 'Email for Contracts & Documents *')}
                </label>
                <input
                  type="email"
                  required
                  value={contactEmail}
                  onChange={(e) => setContactEmail(e.target.value)}
                  placeholder={L.p('ví dụ: minhthu.nguyen@bostonpharma.com', 'e.g. jane.smith@bostonpharma.com')}
                  className="w-full px-4 py-2 border border-slate-200 rounded-xl text-xs font-semibold text-slate-900 focus:outline-none"
                />
              </div>

              <div>
                <RichTextEditor
                  value={notes}
                  onChange={setNotes}
                  label={L.t('Ghi chú hoặc yêu cầu đặc biệt của Doanh nghiệp', 'Company requests or special notes') as string}
                  placeholder={L.p('Yêu cầu sơ đồ gian hàng, mong muốn ghép chung, thời hạn ký hợp hợp hạch toán...', 'Booth layout requirements, co-branding request, accounting deadlines...')}
                  id="sponsor-notes"
                />
              </div>
            </div>
          </div>

          {/* Right Column: Sponsor Tiers option */}
          <div className="lg:col-span-5 space-y-6">
            <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-4">
              <h3 className="text-sm font-black text-slate-900 uppercase tracking-wider border-b border-slate-100 pb-2 flex items-center gap-1.5">
                <span className="w-1.5 h-3.5 bg-teal-600 rounded"></span>
                {L.section('tierSelect', '2. Lựa Chọn Phân Khúc Đồng Hành', '2. Sponsorship Package Selection')}
              </h3>

              <div className="col-span-1 space-y-2.5">
                {SPONSOR_TIERS.map((t) => (
                  <label 
                    key={t.id}
                    className={`p-3.5 border rounded-2xl flex items-start gap-3 cursor-pointer hover:bg-slate-55 transition-all select-none relative ${
                      tier === t.id ? 'border-indigo-600 bg-indigo-50/30' : 'border-slate-200 bg-white'
                    }`}
                  >
                    <input
                      type="radio"
                      name="sponsorTier"
                      checked={tier === t.id}
                      onChange={() => setTier(t.id as any)}
                      className="mt-1 text-indigo-600 focus:ring-indigo-55"
                    />
                    <div className="space-y-0.5">
                      <p className="font-extrabold text-slate-900 text-[12.5px]">
                        {L.t(t.name, t.id === 'platinum' ? 'Platinum Partner' : t.id === 'gold' ? 'Gold Partner' : t.id === 'silver' ? 'Silver Partner' : t.id === 'bronze' ? 'Bronze Partner' : 'Co-Sponsor')}
                      </p>
                      <p className="text-xs font-black font-mono text-indigo-700">{(t.fee).toLocaleString()}đ</p>
                    </div>
                    {tier === t.id && (
                      <span className="absolute right-3.5 top-1/2 -translate-y-1/2 w-5 h-5 bg-indigo-600 rounded-full flex items-center justify-center text-white text-[11px] font-bold">
                        ✓
                      </span>
                    )}
                  </label>
                ))}
              </div>

              {/* Dynamic Benefits Checklist Panel */}
              <div className="bg-slate-50 p-4 rounded-2xl border border-slate-150 space-y-2">
                <span className="text-[10px] font-bold text-slate-450 uppercase tracking-widest font-mono block">
                  {L.t('DỰ KIẾN QUYỀN LỢI ĐỒNG HÀNH CHÍNH', 'PROSPECTIVE KEY SPONSOR BENEFITS')}
                </span>
                <p className="text-[9.5px] text-slate-400 leading-tight">
                  {L.t('Quyền lợi chuẩn theo quy định bảo trợ. Doanh nghiệp có thể điều chỉnh hoặc ghi chú thêm ở mục bên dưới:', 'Standard package benefits. You may modify or add notes in the editor below:')}
                </p>
                
                <textarea
                  value={customBenefitsText}
                  onChange={(e) => setCustomBenefitsText(e.target.value)}
                  placeholder={L.p('Danh sách quyền lợi chính thức được phân cách bằng dòng...', 'List of official benefits separated by lines...')}
                  className="w-full p-3 border border-slate-200 rounded-xl text-[11px] font-medium text-slate-700 bg-white focus:outline-none focus:border-indigo-500 tracking-tight"
                  rows={6}
                />
              </div>
            </div>

            {errorMsg && (
              <div className="bg-rose-50 border border-rose-100 p-3 rounded-xl text-center text-xs font-bold text-rose-600">
                ⚠️ {errorMsg}
              </div>
            )}

            <button
              id="btn-submit-sponsor-register"
              type="submit"
              disabled={isSubmitting}
              className="w-full py-4 text-sm font-extrabold text-white bg-teal-600 hover:bg-teal-700 disabled:opacity-50 rounded-2xl cursor-pointer transition-all shadow-lg hover:shadow-teal-600/20 uppercase tracking-wider border-none text-center"
            >
              {isSubmitting ? L.t('Đang gửi hồ sơ tài trợ...', 'Submitting sponsorship request...') : L.t('Gửi Đăng Ký Tài Trợ & Nhận Hợp Đồng', 'Submit Sponsorship & Request Contract')}
            </button>
          </div>
        </div>
      </form>

      {formCfg?.footerNote && (
        <div className="mt-6">
          <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 text-[10.5px] text-slate-600 text-center leading-relaxed">{formCfg.footerNote}</div>
        </div>
      )}

      </> )}
    </div>
  );
}
