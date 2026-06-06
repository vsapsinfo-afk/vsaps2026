import React, { useState, useEffect, useRef } from 'react';
import { 
  ArrowLeft, CheckCircle, QrCode, Mail, Phone, FileText, Upload, 
  AlertCircle, Sparkles, Check, HelpCircle, Calendar, User, Landmark, Award
} from 'lucide-react';
import { store } from '../dataStore';
import { sendRealtimeNotification } from '../lib/realtime';
import { Attendee, RegistrationPackage } from '../types';
import SepayPaymentChecker from '../components/SepayPaymentChecker';

interface PublicDelegateRegisterProps {
  onNavigate: (view: string) => void;
}

export default function PublicDelegateRegister({ onNavigate }: PublicDelegateRegisterProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const businessConfig = store.getBusinessConfig();
  const formCfg = businessConfig.delegateFormConfig;

  // Auto-height postMessage for iframe embedding in WordPress
  useEffect(() => {
    const sendHeight = () => {
      const h = document.documentElement.scrollHeight || document.body.scrollHeight;
      if (window.parent && window.parent !== window) {
        window.parent.postMessage({ type: 'vsaps-height', height: h }, '*');
      }
    };
    sendHeight();
    const observer = new ResizeObserver(sendHeight);
    if (containerRef.current) observer.observe(containerRef.current);
    return () => observer.disconnect();
  }, []);

  // Form State corresponding to Google Form fields
  const [fullName, setFullName] = useState('');
  const [dateOfBirth, setDateOfBirth] = useState('');
  const [title, setTitle] = useState(''); // Text input for Title
  const [positionAndCompany, setPositionAndCompany] = useState(''); // Text input for Position, name of company
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');

  // Checkboxes for Question 8 (Registration choices)
  const [attendConference, setAttendConference] = useState(true);
  const [galaRequired, setGalaRequired] = useState(false);
  const [masterclassRequired, setMasterclassRequired] = useState(false);
  const [cmeRequired, setCmeRequired] = useState(false);
  const [tourRequired, setTourRequired] = useState(false);

  // Radio selection for Question 9 (Participant Category)
  const [packageId, setPackageId] = useState('pkg-standard');

  // File upload for Question 10 (Diploma/Practice Certificate)
  const [certificateFile, setCertificateFile] = useState<string | null>(null);
  const [certificateFileName, setCertificateFileName] = useState<string | null>(null);
  const [isCertUploading, setIsCertUploading] = useState(false);

  // Payment Proof Screenshot
  const [proofImage, setProofImage] = useState<string | null>(null);
  const [isProofUploading, setIsProofUploading] = useState(false);

  const [notes, setNotes] = useState('');
  
  // Flow States
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [createdAttendee, setCreatedAttendee] = useState<Attendee | null>(null);
  const [errorMsg, setErrorMsg] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Auto-detect period based on current date (Nov 10, 2026 is the threshold)
  const [period, setPeriod] = useState<'pre_10_11' | 'post_10_11'>(() => {
    const today = new Date();
    const threshold = new Date('2026-11-10');
    return today < threshold ? 'pre_10_11' : 'post_10_11';
  });

  const handleCertificateUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setIsCertUploading(true);
      const reader = new FileReader();
      reader.onloadend = () => {
        setCertificateFile(reader.result as string);
        setCertificateFileName(file.name);
        setIsCertUploading(false);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleProofUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setIsProofUploading(true);
      const reader = new FileReader();
      reader.onloadend = () => {
        setProofImage(reader.result as string);
        setIsProofUploading(false);
      };
      reader.readAsDataURL(file);
    }
  };

  // Official Pricing Structure matching current period
  const PRICING = {
    pre_10_11: {
      'pkg-member': 2500000,
      'pkg-standard': 3000000,
      'pkg-student': 1000000,
      'pkg-foreign': 3750000, // $150
    },
    post_10_11: {
      'pkg-member': 3000000,
      'pkg-standard': 3500000,
      'pkg-student': 1500000,
      'pkg-foreign': 5000000, // $200
    }
  };

  const currentPrices = PRICING[period];
  const baseFee = attendConference ? (currentPrices[packageId as keyof typeof currentPrices] ?? 0) : 0;
  
  const extraCme = cmeRequired ? 350000 : 0;
  const extraGala = galaRequired ? 700000 : 0;
  const extraMasterclass = masterclassRequired ? 500000 : 0;
  const extraTour = tourRequired ? (period === 'pre_10_11' ? 4500000 : 5000000) : 0;

  const calculatedTotalFee = baseFee + extraCme + extraGala + extraMasterclass + extraTour;

  const cleanPhoneInput = phone.trim().replace(/\s+/g, '');
  const cleanFullNameAscii = fullName.trim().toUpperCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[đĐ]/g, 'D')
    .replace(/[^A-Z0-9\s]/g, '');
  const transferMessage = `${cleanFullNameAscii} ${cleanPhoneInput} DONG PHI THAM DU VSAPS 2026`;
  
  const currentVietQRUrl = `https://img.vietqr.io/image/VCB-0331000516283-compact.png?amount=${calculatedTotalFee}&addInfo=${encodeURIComponent(transferMessage)}&accountName=HOI%20PHAU%20THUAT%2520TAO%2520HINH%2520THAM%2520MY%2520VIET%2520NAM`;

  const getPackageName = (id: string) => {
    switch (id) {
      case 'pkg-member': return 'Thành viên HPASS/HSPAS/VSAPS (HPASS/HSPAS/VSAPS Members)';
      case 'pkg-standard': return 'Không phải Hội viên (Non-Members)';
      case 'pkg-student': return 'Học viên chuyên ngành PTTM (Plastic Surgery Trainees)';
      case 'pkg-foreign': return 'BS Nước ngoài (International Physicians)';
      default: return 'Không phải Hội viên (Non-Members)';
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!fullName) {
      setErrorMsg('Vui lòng điền họ và tên đại biểu / Please enter your Fullname.');
      return;
    }
    if (!dateOfBirth) {
      setErrorMsg('Vui lòng điền ngày sinh / Please enter your Date of Birth.');
      return;
    }
    if (!title) {
      setErrorMsg('Vui lòng điền học hàm học vị / Please enter your Title.');
      return;
    }
    if (!positionAndCompany) {
      setErrorMsg('Vui lòng điền chức danh, đơn vị công tác / Please enter your Position, name of company.');
      return;
    }
    if (!phone) {
      setErrorMsg('Vui lòng nhập số điện thoại di động / Please enter your Mobile number.');
      return;
    }
    if (!email) {
      setErrorMsg('Vui lòng điền địa chỉ Email / Please enter your Email.');
      return;
    }
    if (!attendConference && !galaRequired && !masterclassRequired && !cmeRequired && !tourRequired) {
      setErrorMsg('Vui lòng chọn ít nhất một nội dung đăng ký tham dự / Please select at least one registration option.');
      return;
    }

    setErrorMsg('');
    setIsSubmitting(true);

    try {
      // Generate random unique ID to avoid collisions
      const randomSeq = Math.floor(Math.random() * 900000 + 100000);
      const newId = `VSAPS2026-${randomSeq}`;
      const qrCodeValue = `${newId}-${fullName.replace(/\s+/g, '').toUpperCase()}`;

      // Map back to Attendee schema structure
      const attendeeData: Attendee = {
        id: newId,
        title: title.trim(),
        fullName: fullName.toUpperCase(),
        organization: positionAndCompany.trim(),
        department: 'Khoa Tạo hình Thẩm mỹ',
        phone: cleanPhoneInput,
        email: email.trim(),
        address: 'Đăng ký Form Online / Online Form Registration',
        nationality: packageId === 'pkg-foreign' ? 'foreign' : 'vietname',
        packageId,
        packageName: getPackageName(packageId),
        packageFee: calculatedTotalFee,
        paymentStatus: 'pending_verification',
        paymentMethod: 'bank_transfer',
        transactionProofUrl: proofImage || undefined,
        registrationDate: new Date().toISOString().split('T')[0],
        qrCodeValue,
        isCheckedIn: false,
        notes: notes ? notes.trim() : undefined,
        yearOfBirth: dateOfBirth.trim(), // Save Date of Birth into yearOfBirth column as string
        gender: 'Khác',
        cmeRequired,
        cmeIdentityNo: certificateFile || undefined, // Temporarily store certificate base64 for background upload
        galaRequired,
        masterclassRequired,
        tourRequired,
        registrationPeriod: period,
        province: 'Khác/Other',
      };

      const saved = await store.saveAttendeeAsync(attendeeData);
      
      // Broadcast realtime notification to admin dashboard
      sendRealtimeNotification(
        'Đại biểu Đăng Ký Mới',
        `Đại biểu ${saved.title} ${saved.fullName} (${saved.organization}) vừa đăng ký thành công gói ${saved.packageName}!`,
        'success'
      );
      
      // Send auto messages in the background
      try {
        store.sendZaloZNS(saved);
        store.sendEmail(saved);
        store.sendWhatsapp(saved);
      } catch (err) {
        console.error('Lỗi gửi tin báo tự động:', err);
      }

      setCreatedAttendee(saved);
      setIsSubmitted(true);
    } catch (err: any) {
      console.error('Lỗi lưu đăng ký đại biểu:', err);
      setErrorMsg(`Không thể hoàn tất đăng ký do lỗi hệ thống: ${err.message || err.details || 'Lỗi mạng hoặc phân quyền.'}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Success view
  if (isSubmitted && createdAttendee) {
    const checkinQrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(createdAttendee.qrCodeValue)}`;
    const cleanFullNameAsciiSub = createdAttendee.fullName
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[đĐ]/g, 'D')
      .replace(/[^A-Z0-9\s]/g, '');
    const transferMessageSub = `${cleanFullNameAsciiSub} ${createdAttendee.phone} DONG PHI THAM DU VSAPS 2026`;
    const vietQrSuccessUrl = `https://img.vietqr.io/image/VCB-0331000516283-compact.png?amount=${createdAttendee.packageFee}&addInfo=${encodeURIComponent(transferMessageSub)}&accountName=HOI%20PHAU%20THUAT%2520TAO%2520HINH%2520THAM%2520MY%2520VIET%2520NAM`;

    return (
      <div className="bg-slate-50 min-h-screen py-12 px-4 font-sans select-none">
        <div className="max-w-2xl mx-auto bg-white rounded-3xl border border-slate-100 shadow-2xl overflow-hidden">
          
          <div className="bg-teal-950 text-amber-400 p-8 text-center relative border-b border-teal-900">
            <div className="absolute top-4 left-4">
              <button 
                onClick={() => onNavigate('event-details')}
                className="p-1 px-3 rounded-lg bg-teal-900 hover:bg-teal-850 text-xs font-semibold flex items-center gap-1 text-teal-200 border border-teal-800/60 cursor-pointer"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                Về trang chủ / Home
              </button>
            </div>
            <div className="w-14 h-14 rounded-full bg-amber-400/10 flex items-center justify-center mx-auto mb-3 border border-amber-400/25">
              <CheckCircle className="w-7 h-7 text-amber-400" />
            </div>
            <h2 className="text-xl md:text-2xl font-black uppercase tracking-tight text-white">ĐĂNG KÝ THÀNH CÔNG / SUCCESS</h2>
            <p className="text-xs text-teal-200 uppercase tracking-widest font-mono mt-1">VSAPS 2026 SCIENTIFIC CONFERENCE</p>
          </div>

          <div className="p-6 md:p-8 space-y-6">
            
            <div className="bg-emerald-50/70 border border-emerald-100 rounded-2xl p-4 text-emerald-900 text-xs space-y-2">
              <div className="flex items-center gap-1.5 font-bold text-emerald-950">
                <Sparkles className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>Hệ thống ghi nhận hồ sơ đại biểu thành công! / Registration successful!</span>
              </div>
              <p className="text-slate-600 leading-relaxed">
                Đăng ký của đại biểu <strong>{createdAttendee.title} {createdAttendee.fullName}</strong> đã được đồng bộ lên hệ thống sự kiện.
              </p>
              <p className="text-slate-650">
                • <strong>Zalo OA:</strong> Phiếu check-in điện tử đã gửi tới số di động: <strong className="text-slate-900">{createdAttendee.phone}</strong>
              </p>
              <p className="text-slate-650">
                • <strong>Email:</strong> Thẻ Check-in và hướng dẫn đã gửi tới: <strong className="text-slate-900">{createdAttendee.email}</strong>
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 border-t border-slate-100 pt-6">
              
              {/* Checkin card */}
              <div className="border border-slate-200 rounded-2xl overflow-hidden bg-white shadow-sm flex flex-col justify-between">
                <div className="bg-teal-950 text-white p-3.5 text-center border-b border-teal-900">
                  <span className="text-[10px] uppercase font-bold tracking-widest text-amber-400 block font-mono">THẺ CHECK-IN / PASS</span>
                  <span className="text-[9px] text-slate-350 tracking-wider">XUẤT TRÌNH KHI LỄ TÂN / PRESENT AT RECEPTION</span>
                </div>

                <div className="p-5 flex flex-col items-center flex-1 justify-center">
                  <div className="p-2 border-2 border-dashed border-teal-600/30 rounded-2xl bg-white mb-3 shadow-inner">
                    <img 
                      src={checkinQrUrl} 
                      alt="Checkin QR" 
                      referrerPolicy="no-referrer"
                      className="w-36 h-36 object-contain"
                    />
                  </div>
                  <div className="text-center space-y-1 w-full">
                    <span className="text-[11px] font-mono font-bold text-teal-800 bg-teal-50 px-2.5 py-0.5 rounded-full inline-block">{createdAttendee.id}</span>
                    <div className="flex items-center justify-center gap-2 mt-2">
                      <div className="text-center w-full">
                        <p className="text-xs md:text-sm font-black text-slate-900 uppercase leading-snug">
                          {createdAttendee.title} {createdAttendee.fullName}
                        </p>
                        <p className="text-[10px] text-slate-500 font-semibold leading-tight">{createdAttendee.organization}</p>
                      </div>
                    </div>
                    <p className="text-[9px] text-slate-400 italic">DOB: {createdAttendee.yearOfBirth}</p>
                  </div>
                </div>

                <div className="bg-slate-50 p-2.5 text-center text-[10px] text-slate-500 font-medium font-mono border-t border-slate-100 truncate px-2">
                  CODE: {createdAttendee.qrCodeValue}
                </div>
              </div>

              {/* VietQR Bank transfer block */}
              <div className="border border-amber-200 rounded-2xl overflow-hidden bg-amber-50/20 shadow-sm flex flex-col justify-between">
                <div className="bg-amber-500 text-amber-950 p-3.5 text-center border-b border-amber-300">
                  <span className="text-[10px] uppercase font-black tracking-wider block">CHUYỂN KHOẢN VIETQR / BANK TRANSFER</span>
                  <span className="text-[9px] text-amber-900 font-medium">BẮT BUỘC ĐỂ KÍCH HOẠT VÉ / REQUIRED FOR ACTIVATION</span>
                </div>

                <div className="p-4 flex flex-col items-center justify-between flex-1 space-y-3">
                  <div className="p-1 bg-white border border-slate-200 rounded-xl shadow-md">
                    <img 
                      src={vietQrSuccessUrl} 
                      alt="VietQR code" 
                      referrerPolicy="no-referrer"
                      className="w-40 h-auto object-contain mx-auto"
                    />
                  </div>

                  <div className="text-left w-full text-[10.5px] space-y-1.5 text-slate-700 font-sans">
                    <p>• Ngân hàng / Bank: <strong className="text-slate-900 font-mono">VIETCOMBANK</strong></p>
                    <p>• Số tài khoản / Account No: <strong className="text-teal-900 font-mono font-bold text-xs">0331000516283</strong></p>
                    <p>• Chủ tài khoản / Owner: <strong className="text-slate-900 uppercase">Hoi phau thuat tao hinh tham my Viet Nam</strong></p>
                    <p>• Số tiền / Amount: <strong className="text-teal-700 font-bold font-mono text-xs">{createdAttendee.packageFee.toLocaleString()}đ</strong></p>
                    <p className="flex flex-wrap gap-1 items-center">• Nội dung CK / Memo: <strong className="text-amber-800 bg-amber-100 px-1.5 py-0.5 rounded font-mono font-extrabold text-xs">{transferMessageSub}</strong></p>
                  </div>
                </div>

                <div className="p-2 bg-amber-100/40 text-center text-[9px] text-amber-950 font-sans border-t border-amber-200">
                  ⚠️ Quét mã QR bằng app Ngân hàng để tự động điền thông tin chính xác.
                </div>
              </div>
            </div>

            {/* SePay payment checker */}
            {(() => {
              const sepay = store.getSepayConfig();
              if (!sepay.isEnabled || !sepay.apiToken) return null;
              return (
                <SepayPaymentChecker
                  transferContent={transferMessageSub}
                  expectedAmount={createdAttendee.packageFee || 0}
                  attendeeId={createdAttendee.id}
                />
              );
            })()}

            <div className="pt-4 flex flex-col md:flex-row gap-3">
              <button
                onClick={() => onNavigate('event-details')}
                className="flex-1 py-3 text-xs bg-slate-900 hover:bg-slate-950 text-white font-black uppercase text-center rounded-xl tracking-wider cursor-pointer border-none transition-all"
              >
                Trở về sảnh sự kiện / Home
              </button>
              <button
                onClick={() => window.print()}
                className="px-6 py-3 text-xs bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 font-bold uppercase rounded-xl tracking-wider cursor-pointer transition-all"
              >
                In vé & Biên nhận / Print 🖨️
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Open Form view
  return (
    <div ref={containerRef} className="bg-slate-100 min-h-screen py-8 md:py-12 px-4 text-slate-800 font-sans">
      <div className="max-w-3xl mx-auto">
        <div className="bg-white rounded-3xl border border-slate-200 shadow-2xl overflow-hidden">

          {/* Form Closed display */}
          {formCfg?.isOpen === false && (
            <div className="p-12 text-center" style={{ backgroundColor: formCfg?.headerBgColor || '#0c4a6e' }}>
              <div className="text-5xl mb-4">🔒</div>
              <h2 className="text-white font-black text-xl mb-3">Cổng đăng ký đã đóng / Registration Closed</h2>
              <p className="text-white/70 text-sm max-w-md mx-auto">
                {formCfg?.closedMessage || 'Cổng đăng ký tham dự hiện đã đóng. Xin chân thành cảm ơn! / Registration is currently closed. Thank you!'}
              </p>
              <button 
                onClick={() => onNavigate('event-details')}
                className="mt-6 px-6 py-2.5 bg-white/20 hover:bg-white/30 text-white text-sm font-bold rounded-xl border border-white/30 cursor-pointer transition-all"
              >
                ← Trở về / Back
              </button>
            </div>
          )}

          {formCfg?.isOpen !== false && (
            <>
              {/* Form Header Banner info */}
              <div 
                className="text-white p-6 md:p-8 border-b-4 relative"
                style={{
                  backgroundColor: formCfg?.headerBgColor || '#0a2540',
                  borderBottomColor: formCfg?.accentColor || '#db2777',
                }}
              >
                <div className="max-w-2xl space-y-2.5">
                  <span className="text-[10px] font-extrabold tracking-widest uppercase block text-pink-500 font-mono">
                    {formCfg?.organizerLabel || 'HỘI PHẪU THUẬT TẠO HÌNH THẨM MỸ VIỆT NAM / VIETNAM SOCIETY OF AESTHETIC PLASTIC SURGERY'}
                  </span>
                  <h1 className="text-xl md:text-2xl font-black tracking-tight uppercase leading-snug">
                    {formCfg?.formTitle || 'ĐĂNG KÝ THAM DỰ HỘI NGHỊ KHOA HỌC VSAPS 2026 / REGISTER FOR THE VSAPS 2026 SCIENTIFIC CONFERENCE'}
                  </h1>
                  
                  <div className="pt-2 text-xs text-slate-350 space-y-1 border-t border-slate-800/40">
                    <p><strong className="text-white">Chủ đề / Topic:</strong> CÙNG NHAU ĐỊNH HÌNH TƯƠNG LAI NGÀNH PHẪU THUẬT TẠO HÌNH THẨM MỸ / SHAPING THE FUTURE OF AESTHETIC & PLASTIC SURGERY TOGETHER</p>
                    <p><strong className="text-white">Thời gian / Time:</strong> Ngày 11-13 tháng 12 năm 2026 / December 11-13, 2026</p>
                    <p><strong className="text-white">Địa điểm / Venue:</strong> Bệnh viện quân y 175, Hồ Chí Minh / Military Hospital 175, Ho Chi Minh City</p>
                  </div>
                </div>
              </div>

              <form onSubmit={handleSubmit} className="p-6 md:p-8 space-y-6">
                
                {errorMsg && (
                  <div className="p-4 bg-rose-50 border border-rose-100 text-rose-800 text-xs rounded-xl flex items-center gap-2.5">
                    <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
                    <span className="font-semibold">{errorMsg}</span>
                  </div>
                )}

                {/* Question 1 */}
                <div className="p-5 bg-slate-50/50 border border-slate-100 rounded-2xl space-y-2">
                  <label className="block text-xs font-black text-slate-900 uppercase tracking-wide">
                    1. Họ và tên / Fullname <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value.toUpperCase())}
                    placeholder="Nhập câu trả lời của bạn / Your answer"
                    className="w-full px-4 py-3 bg-white border border-slate-200 hover:border-slate-300 focus:border-teal-700 focus:bg-white focus:outline-none rounded-xl text-xs font-bold uppercase tracking-wider transition-all"
                  />
                </div>

                {/* Question 2 */}
                <div className="p-5 bg-slate-50/50 border border-slate-100 rounded-2xl space-y-2">
                  <label className="block text-xs font-black text-slate-900 uppercase tracking-wide">
                    2. Ngày sinh / Date of Birth <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={dateOfBirth}
                    onChange={(e) => setDateOfBirth(e.target.value)}
                    placeholder="ví dụ: 12/08/1990 hoặc 1990 / e.g. 12/08/1990 or 1990"
                    className="w-full px-4 py-3 bg-white border border-slate-200 hover:border-slate-300 focus:border-teal-700 focus:bg-white focus:outline-none rounded-xl text-xs font-bold transition-all"
                  />
                </div>

                {/* Question 4 */}
                <div className="p-5 bg-slate-50/50 border border-slate-100 rounded-2xl space-y-2">
                  <label className="block text-xs font-black text-slate-900 uppercase tracking-wide">
                    4. Học hàm học vị / Title <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="BS. / ThS. / TS. / Dr. / Prof. / Your answer"
                    className="w-full px-4 py-3 bg-white border border-slate-200 hover:border-slate-300 focus:border-teal-700 focus:bg-white focus:outline-none rounded-xl text-xs font-semibold transition-all"
                  />
                </div>

                {/* Question 5 */}
                <div className="p-5 bg-slate-50/50 border border-slate-100 rounded-2xl space-y-2">
                  <label className="block text-xs font-black text-slate-900 uppercase tracking-wide">
                    5. Chức danh, đơn vị công tác / Position, name of company <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={positionAndCompany}
                    onChange={(e) => setPositionAndCompany(e.target.value)}
                    placeholder="Nhập câu trả lời của bạn / Your answer"
                    className="w-full px-4 py-3 bg-white border border-slate-200 hover:border-slate-300 focus:border-teal-700 focus:bg-white focus:outline-none rounded-xl text-xs font-semibold transition-all"
                  />
                </div>

                {/* Question 6 */}
                <div className="p-5 bg-slate-50/50 border border-slate-100 rounded-2xl space-y-2">
                  <label className="block text-xs font-black text-slate-900 uppercase tracking-wide">
                    6. Mobile <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="tel"
                    required
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="Nhập số điện thoại di động / Your answer"
                    className="w-full px-4 py-3 bg-white border border-slate-200 hover:border-slate-300 focus:border-teal-700 focus:bg-white focus:outline-none rounded-xl text-xs font-mono font-bold transition-all"
                  />
                </div>

                {/* Question 7 */}
                <div className="p-5 bg-slate-50/50 border border-slate-100 rounded-2xl space-y-2">
                  <label className="block text-xs font-black text-slate-900 uppercase tracking-wide">
                    7. Email <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="email@example.com / Your answer"
                    className="w-full px-4 py-3 bg-white border border-slate-200 hover:border-slate-300 focus:border-teal-700 focus:bg-white focus:outline-none rounded-xl text-xs font-semibold transition-all"
                  />
                </div>

                {/* Question 8 */}
                <div className="p-5 bg-slate-50/50 border border-slate-100 rounded-2xl space-y-4">
                  <label className="block text-xs font-black text-slate-900 uppercase tracking-wide">
                    8. Đăng ký tham dự (nhiều lựa chọn) / Registration to take part in (Multiple selections allowed) <span className="text-rose-500">*</span>
                  </label>
                  
                  <div className="space-y-2.5">
                    {/* Checkbox 1: Attend Conference */}
                    <div 
                      onClick={() => setAttendConference(!attendConference)}
                      className={`p-3.5 rounded-xl border cursor-pointer select-none transition-all flex items-start gap-3 bg-white ${
                        attendConference ? 'border-teal-600 bg-teal-50/10' : 'border-slate-200 hover:border-slate-350'
                      }`}
                    >
                      <input 
                        type="checkbox"
                        checked={attendConference}
                        onChange={(e) => {
                          e.stopPropagation();
                          setAttendConference(e.target.checked);
                        }}
                        className="w-4.5 h-4.5 rounded border-slate-300 text-teal-900 mt-0.5 cursor-pointer"
                      />
                      <div className="text-xs leading-normal">
                        <span className="font-bold text-slate-900 block">Đăng ký tham dự hội nghị / Conference Attendance Registration</span>
                        <span className="text-[10px] text-slate-500">
                          {period === 'pre_10_11' ? 'Áp dụng lệ phí ưu đãi / Early Bird rate applicable' : 'Áp dụng lệ phí cận sự kiện / Regular rate applicable'}
                        </span>
                      </div>
                    </div>

                    {/* Checkbox 2: Gala Dinner */}
                    <div 
                      onClick={() => setGalaRequired(!galaRequired)}
                      className={`p-3.5 rounded-xl border cursor-pointer select-none transition-all flex items-start gap-3 bg-white ${
                        galaRequired ? 'border-teal-600 bg-teal-50/10' : 'border-slate-200 hover:border-slate-350'
                      }`}
                    >
                      <input 
                        type="checkbox"
                        checked={galaRequired}
                        onChange={(e) => {
                          e.stopPropagation();
                          setGalaRequired(e.target.checked);
                        }}
                        className="w-4.5 h-4.5 rounded border-slate-300 text-teal-900 mt-0.5 cursor-pointer"
                      />
                      <div className="text-xs leading-normal">
                        <span className="font-bold text-slate-900 block">Gala Dinner (+ 700.000đ / Gala Dinner)</span>
                        <span className="text-[10px] text-slate-500">Tiệc tối giao lưu kết nối đại biểu / Networking dinner evening</span>
                      </div>
                    </div>

                    {/* Checkbox 3: Master Class */}
                    <div 
                      onClick={() => setMasterclassRequired(!masterclassRequired)}
                      className={`p-3.5 rounded-xl border cursor-pointer select-none transition-all flex items-start gap-3 bg-white ${
                        masterclassRequired ? 'border-teal-600 bg-teal-50/10' : 'border-slate-200 hover:border-slate-350'
                      }`}
                    >
                      <input 
                        type="checkbox"
                        checked={masterclassRequired}
                        onChange={(e) => {
                          e.stopPropagation();
                          setMasterclassRequired(e.target.checked);
                        }}
                        className="w-4.5 h-4.5 rounded border-slate-300 text-teal-900 mt-0.5 cursor-pointer"
                      />
                      <div className="text-xs leading-normal">
                        <span className="font-bold text-slate-900 block">Master Class (+ 500.000đ / Master Class)</span>
                        <span className="text-[10px] text-slate-500">Khóa học kỹ thuật lâm sàng chuyên sâu / Advanced clinical technology master class</span>
                      </div>
                    </div>

                    {/* Checkbox 4: CME */}
                    <div 
                      onClick={() => setCmeRequired(!cmeRequired)}
                      className={`p-3.5 rounded-xl border cursor-pointer select-none transition-all flex items-start gap-3 bg-white ${
                        cmeRequired ? 'border-teal-600 bg-teal-50/10' : 'border-slate-200 hover:border-slate-350'
                      }`}
                    >
                      <input 
                        type="checkbox"
                        checked={cmeRequired}
                        onChange={(e) => {
                          e.stopPropagation();
                          setCmeRequired(e.target.checked);
                        }}
                        className="w-4.5 h-4.5 rounded border-slate-300 text-teal-900 mt-0.5 cursor-pointer"
                      />
                      <div className="text-xs leading-normal">
                        <span className="font-bold text-slate-900 block">CME (+ 350.000đ / CME Certificate)</span>
                        <span className="text-[10px] text-slate-500">Cấp chứng chỉ đào tạo y khoa liên tục / Continuing Medical Education Certificate</span>
                      </div>
                    </div>

                    {/* Checkbox 5: Tour Ben Tre */}
                    <div 
                      onClick={() => setTourRequired(!tourRequired)}
                      className={`p-3.5 rounded-xl border cursor-pointer select-none transition-all flex items-start gap-3 bg-white ${
                        tourRequired ? 'border-teal-600 bg-teal-50/10' : 'border-slate-200 hover:border-slate-350'
                      }`}
                    >
                      <input 
                        type="checkbox"
                        checked={tourRequired}
                        onChange={(e) => {
                          e.stopPropagation();
                          setTourRequired(e.target.checked);
                        }}
                        className="w-4.5 h-4.5 rounded border-slate-300 text-teal-900 mt-0.5 cursor-pointer"
                      />
                      <div className="text-xs leading-normal">
                        <span className="font-bold text-slate-900 block">
                          Tour Ben Tre {period === 'pre_10_11' ? '(+ 4.500.000đ)' : '(+ 5.000.000đ)'}
                        </span>
                        <span className="text-[10px] text-slate-500">Tour tham quan dã ngoại miền Tây / Sightseeing cultural tour</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Question 9 */}
                <div className="p-5 bg-slate-50/50 border border-slate-100 rounded-2xl space-y-4">
                  <label className="block text-xs font-black text-slate-900 uppercase tracking-wide">
                    9. Đối tượng tham dự / Participant as <span className="text-rose-500">*</span>
                  </label>
                  
                  <div className="grid grid-cols-1 gap-2.5">
                    {/* Option 1: VSAPS Member */}
                    <label 
                      onClick={() => setPackageId('pkg-member')}
                      className={`p-4 rounded-xl border cursor-pointer flex justify-between items-center bg-white transition-all ${
                        packageId === 'pkg-member' 
                          ? 'border-teal-600 bg-teal-50/10 ring-2 ring-teal-600/10 shadow-sm' 
                          : 'border-slate-200 hover:border-slate-350'
                      }`}
                    >
                      <div className="text-xs">
                        <strong className="text-slate-900 block">Thành viên HPASS/HSPAS/VSAPS / HPASS/HSPAS/VSAPS Members</strong>
                        <span className="text-[10px] text-slate-400 block mt-0.5 font-mono">
                          Lệ phí / Fee: {PRICING[period]['pkg-member'].toLocaleString()}đ
                        </span>
                      </div>
                      <input 
                        type="radio" 
                        name="participant_category" 
                        checked={packageId === 'pkg-member'}
                        onChange={() => setPackageId('pkg-member')}
                        className="w-4 h-4 text-teal-900 focus:ring-teal-700 cursor-pointer" 
                      />
                    </label>

                    {/* Option 2: Standard Non-Member */}
                    <label 
                      onClick={() => setPackageId('pkg-standard')}
                      className={`p-4 rounded-xl border cursor-pointer flex justify-between items-center bg-white transition-all ${
                        packageId === 'pkg-standard' 
                          ? 'border-teal-600 bg-teal-50/10 ring-2 ring-teal-600/10 shadow-sm' 
                          : 'border-slate-200 hover:border-slate-350'
                      }`}
                    >
                      <div className="text-xs">
                        <strong className="text-slate-900 block">Không phải Hội viên / Non-Members</strong>
                        <span className="text-[10px] text-slate-400 block mt-0.5 font-mono">
                          Lệ phí / Fee: {PRICING[period]['pkg-standard'].toLocaleString()}đ
                        </span>
                      </div>
                      <input 
                        type="radio" 
                        name="participant_category" 
                        checked={packageId === 'pkg-standard'}
                        onChange={() => setPackageId('pkg-standard')}
                        className="w-4 h-4 text-teal-900 focus:ring-teal-700 cursor-pointer" 
                      />
                    </label>

                    {/* Option 3: Trainee/Student */}
                    <label 
                      onClick={() => setPackageId('pkg-student')}
                      className={`p-4 rounded-xl border cursor-pointer flex justify-between items-center bg-white transition-all ${
                        packageId === 'pkg-student' 
                          ? 'border-teal-600 bg-teal-50/10 ring-2 ring-teal-600/10 shadow-sm' 
                          : 'border-slate-200 hover:border-slate-350'
                      }`}
                    >
                      <div className="text-xs">
                        <strong className="text-slate-900 block">Học viên chuyên ngành PTTM / Plastic Surgery Trainees</strong>
                        <span className="text-[10px] text-slate-400 block mt-0.5 font-mono">
                          Lệ phí / Fee: {PRICING[period]['pkg-student'].toLocaleString()}đ
                        </span>
                      </div>
                      <input 
                        type="radio" 
                        name="participant_category" 
                        checked={packageId === 'pkg-student'}
                        onChange={() => setPackageId('pkg-student')}
                        className="w-4 h-4 text-teal-900 focus:ring-teal-700 cursor-pointer" 
                      />
                    </label>

                    {/* Option 4: Foreign physician */}
                    <label 
                      onClick={() => setPackageId('pkg-foreign')}
                      className={`p-4 rounded-xl border cursor-pointer flex justify-between items-center bg-white transition-all ${
                        packageId === 'pkg-foreign' 
                          ? 'border-teal-600 bg-teal-50/10 ring-2 ring-teal-600/10 shadow-sm' 
                          : 'border-slate-200 hover:border-slate-350'
                      }`}
                    >
                      <div className="text-xs">
                        <strong className="text-slate-900 block">BS Nước ngoài / International Physicians</strong>
                        <span className="text-[10px] text-slate-400 block mt-0.5 font-mono">
                          Lệ phí / Fee: {PRICING[period]['pkg-foreign'].toLocaleString()}đ
                        </span>
                      </div>
                      <input 
                        type="radio" 
                        name="participant_category" 
                        checked={packageId === 'pkg-foreign'}
                        onChange={() => setPackageId('pkg-foreign')}
                        className="w-4 h-4 text-teal-900 focus:ring-teal-700 cursor-pointer" 
                      />
                    </label>
                  </div>
                </div>

                {/* Question 10 */}
                <div className="p-5 bg-slate-50/50 border border-slate-100 rounded-2xl space-y-3">
                  <label className="block text-xs font-black text-slate-900 uppercase tracking-wide">
                    10. Upload bằng đại học/chứng chỉ hành nghề/chứng chỉ định hướng,... / Upload Degree/Practice Certificate...
                  </label>
                  <p className="text-[10px] text-slate-500 font-sans leading-normal">
                    Khuyến khích học viên/đại biểu đăng ký các gói ưu tiên nộp bằng cấp để BTC phê duyệt nhanh chóng. / Highly recommended for Trainees to verify discount eligibility.
                  </p>
                  
                  <div className="flex items-center gap-3">
                    <label className="px-3.5 py-2 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 cursor-pointer text-xs font-bold text-slate-700 flex items-center gap-1.5 transition-all w-fit shadow-sm">
                      <Upload className="w-4 h-4 text-slate-500" />
                      Tải tệp lên / Upload File
                      <input
                        type="file"
                        accept="image/*,application/pdf"
                        onChange={handleCertificateUpload}
                        className="hidden"
                      />
                    </label>
                    {isCertUploading && <span className="text-[10px] text-slate-400 animate-pulse">Đang tải... / Uploading...</span>}
                    {certificateFileName && (
                      <span className="text-xs text-emerald-600 font-bold flex items-center gap-1 truncate max-w-[200px]">
                        ✓ {certificateFileName}
                      </span>
                    )}
                  </div>
                  {certificateFile && (
                    <div className="relative w-fit mt-1">
                      <img 
                        src={certificateFile} 
                        alt="Certificate Preview" 
                        className="h-16 w-28 object-cover rounded-lg border border-slate-200 shadow-sm" 
                      />
                      <button
                        type="button"
                        onClick={() => { setCertificateFile(null); setCertificateFileName(null); }}
                        className="absolute -top-1.5 -right-1.5 bg-rose-600 text-white leading-none rounded-full w-4 h-4 text-[9px] font-black border border-white flex items-center justify-center cursor-pointer"
                      >
                        ✕
                      </button>
                    </div>
                  )}
                </div>

                {/* Section 4: Bank Transfer details */}
                <div className="space-y-4 pt-4 border-t border-slate-100">
                  <div className="flex items-center justify-between border-b border-teal-100 pb-2">
                    <div className="flex items-center gap-2">
                      <span className="bg-teal-900 text-amber-400 font-mono font-bold px-2 py-0.5 rounded text-[10px]">CK</span>
                      <h3 className="font-extrabold text-sm text-slate-900 uppercase tracking-wider">
                        THÔNG TIN CHUYỂN KHOẢN / BANK TRANSFER PAYMENT
                      </h3>
                    </div>
                    <span className="text-[9.5px] text-emerald-700 bg-emerald-50 border border-emerald-100 px-2 py-0.5 rounded font-mono font-extrabold tracking-wide uppercase">
                      Live ⚡
                    </span>
                  </div>

                  <div className="bg-slate-50 p-5 rounded-2xl border border-slate-200 grid grid-cols-1 md:grid-cols-12 gap-6 items-center">
                    
                    {/* VietQR code visual */}
                    <div className="md:col-span-5 bg-white p-4 rounded-xl border border-slate-200 flex flex-col items-center shadow-sm select-none text-center">
                      <span className="text-[9.5px] uppercase font-bold tracking-widest text-slate-400 mb-2 font-mono block">
                        QUÉT QR THANH TOÁN / SCAN BANK QR
                      </span>
                      
                      <div className="p-1 bg-white border border-slate-100 rounded-lg relative">
                        <img 
                          src={currentVietQRUrl} 
                          alt="Vietcombank QR" 
                          referrerPolicy="no-referrer"
                          className="w-32 h-auto object-contain"
                        />
                      </div>
                      <div className="text-[9px] font-mono font-bold text-slate-700 mt-2 truncate w-full max-w-[150px] mx-auto bg-slate-100 p-0.5 rounded">
                        {transferMessage}
                      </div>
                    </div>

                    {/* Account specifications */}
                    <div className="md:col-span-7 space-y-3 text-xs">
                      <div className="grid grid-cols-3 gap-2 py-1.5 border-b border-slate-200/50">
                        <span className="text-slate-500 font-semibold">Tài khoản / Account:</span>
                        <strong className="col-span-2 text-slate-900">0331000516283</strong>
                      </div>
                      <div className="grid grid-cols-3 gap-2 py-1.5 border-b border-slate-200/50">
                        <span className="text-slate-500 font-semibold">Ngân hàng / Bank:</span>
                        <strong className="col-span-2 text-slate-900">Vietcombank</strong>
                      </div>
                      <div className="grid grid-cols-3 gap-2 py-1.5 border-b border-slate-200/50">
                        <span className="text-slate-500 font-semibold">Chủ tài khoản / Name:</span>
                        <strong className="col-span-2 text-slate-900 uppercase">Hoi phau thuat tao hinh tham my Viet Nam</strong>
                      </div>
                      <div className="grid grid-cols-3 gap-2 py-1.5 border-b border-slate-200/50">
                        <span className="text-slate-500 font-semibold">Lệ phí chọn / Selection:</span>
                        <div className="col-span-2 text-slate-700 space-y-0.5 text-[11px]">
                          {attendConference && <div>• Phí hội nghị / Conference Fee: <strong>{baseFee.toLocaleString()}đ</strong></div>}
                          {cmeRequired && <div>• Phí CME / CME Fee: <strong>+350.000đ</strong></div>}
                          {galaRequired && <div>• Gala Dinner: <strong>+700.000đ</strong></div>}
                          {masterclassRequired && <div>• Master Class: <strong>+500.000đ</strong></div>}
                          {tourRequired && <div>• Tour Ben Tre: <strong>+{extraTour.toLocaleString()}đ</strong></div>}
                        </div>
                      </div>
                      
                      <div className="grid grid-cols-3 gap-2 py-2 border-b border-slate-200/50 text-teal-900 bg-teal-50/50 p-1.5 rounded-lg">
                        <span className="text-teal-900 font-bold">Tổng phí / Total Amount:</span>
                        <strong className="col-span-2 text-teal-950 text-sm font-black font-mono">{calculatedTotalFee.toLocaleString()} VNĐ</strong>
                      </div>
                      
                      <div className="grid grid-cols-3 gap-2 py-1.5 border-b border-slate-200/50">
                        <span className="text-slate-500 font-semibold">Cú pháp CK / Memo:</span>
                        <strong className="col-span-2 text-amber-800 font-mono font-bold select-all bg-amber-50 rounded px-1.5 py-0.5 w-fit border border-amber-200/50">
                          {transferMessage}
                        </strong>
                      </div>
                    </div>
                  </div>

                  {/* Payment proof receipt upload */}
                  <div className="p-4 bg-slate-50/50 border border-slate-200 rounded-2xl space-y-2.5">
                    <label className="block text-xs font-black text-slate-900 uppercase tracking-wide">
                      Tải ảnh giao dịch thành công / Upload Payment Proof Screenshot <span className="text-rose-500">*</span>
                    </label>
                    <div className="flex items-center gap-3">
                      <label className="px-3.5 py-2 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 cursor-pointer text-xs font-bold text-slate-700 flex items-center gap-1.5 transition-all w-fit shadow-sm text-center">
                        <Upload className="w-4 h-4 text-slate-500" />
                        Đính kèm hóa đơn / Attach Receipt
                        <input
                          type="file"
                          accept="image/*"
                          onChange={handleProofUpload}
                          className="hidden"
                        />
                      </label>
                      {isProofUploading && <span className="text-[10px] text-slate-400 font-mono animate-pulse">Đang tải... / Uploading...</span>}
                      {proofImage && <span className="text-xs text-emerald-600 font-bold flex items-center gap-1">✓ Đã đính kèm ảnh! / Attached!</span>}
                    </div>
                    {proofImage && (
                      <div className="relative w-fit mt-1">
                        <img 
                          src={proofImage} 
                          alt="Transaction Proof" 
                          className="h-20 w-36 object-cover rounded-lg border border-slate-200 shadow-inner" 
                        />
                        <button
                          type="button"
                          onClick={() => setProofImage(null)}
                          className="absolute -top-1.5 -right-1.5 bg-rose-600 text-white leading-none rounded-full w-4 h-4 text-[9px] font-black border border-white flex items-center justify-center cursor-pointer"
                        >
                          ✕
                        </button>
                      </div>
                    )}
                  </div>
                </div>

                {/* Special Request Note */}
                <div className="p-5 bg-slate-50/50 border border-slate-100 rounded-2xl space-y-2">
                  <label className="block text-xs font-black text-slate-900 uppercase tracking-wide">
                    Ghi chú / Special request or notes
                  </label>
                  <textarea
                    rows={3}
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    placeholder="ví dụ: Đóng gói ăn chay, Xuất hóa đơn đỏ cho cơ quan bệnh viện... / e.g. Vegetarian meal, Red Invoice request..."
                    className="w-full px-4 py-3 bg-white border border-slate-200 hover:border-slate-350 focus:border-teal-700 focus:bg-white focus:outline-none rounded-xl text-xs transition-all"
                  />
                </div>

                {/* Submit button */}
                <div className="pt-4">
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="w-full py-4 rounded-2xl bg-teal-900 hover:bg-teal-950 disabled:opacity-50 text-white font-extrabold text-[12.5px] uppercase tracking-widest cursor-pointer shadow-lg hover:shadow-xl transition-all border border-amber-400/40 relative group overflow-hidden border-none"
                  >
                    <div className="absolute inset-0 bg-gradient-to-r from-amber-400/10 via-white/10 to-transparent translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-1000 ease-in-out" />
                    {isSubmitting 
                      ? 'Đang gửi thông tin đăng ký... / Submitting...' 
                      : 'Xác Nhận Đăng Ký / Confirm & Register ⚡'
                    }
                  </button>
                  <span className="text-[10px] text-slate-400 italic mt-2.5 text-center block leading-relaxed">
                    Bằng cách ấn xác nhận, vé điện tử và hóa đơn VietQR của bạn sẽ được tạo lập tức trên sảnh. / By registering, your ticket and invoice will be published instantly.
                  </span>
                </div>

              </form>

              {/* Footer Note */}
              {formCfg?.footerNote && (
                <div className="px-6 pb-6">
                  <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 text-[10px] text-slate-500 text-center leading-relaxed">
                    {formCfg.footerNote}
                  </div>
                </div>
              )}
            </>
          )}

        </div>
      </div>
    </div>
  );
}
