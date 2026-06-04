/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { ArrowLeft, CheckCircle, QrCode, Mail, Phone, FileText, Upload, AlertCircle, Sparkles, Check, HelpCircle } from 'lucide-react';
import { store } from '../dataStore';
import { sendRealtimeNotification } from '../lib/realtime';
import { Attendee, RegistrationPackage } from '../types';
import RichTextEditor from '../components/RichTextEditor';
import { getProvinceList, getDistrictsOf, getWardsOf } from '../data/vnProvinces';

interface PublicDelegateRegisterProps {
  onNavigate: (view: string) => void;
}

export default function PublicDelegateRegister({ onNavigate }: PublicDelegateRegisterProps) {
  const packages = store.getPackages().filter(p => p.isActive);
  
  // Custom Form State
  const [title, setTitle] = useState('BS.');
  const [fullName, setFullName] = useState('');
  const [gender, setGender] = useState('Nam');
  const [yearOfBirth, setYearOfBirth] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [organization, setOrganization] = useState('');
  const [department, setDepartment] = useState('');
  const [province, setProvince] = useState('Hồ Chí Minh');
  const [district, setDistrict] = useState('Thành phố Thủ Đức');
  const [ward, setWard] = useState('Phường Thảo Điền');
  const [address, setAddress] = useState('');
  const [nationality, setNationality] = useState<'vietname' | 'foreign'>('vietname');
  const [period, setPeriod] = useState<'pre_10_11' | 'post_10_11'>('pre_10_11');
  
  // CME states
  const [cmeRequired, setCmeRequired] = useState(false);
  const [galaRequired, setGalaRequired] = useState(false);
  const [masterclassRequired, setMasterclassRequired] = useState(false);
  const [tourRequired, setTourRequired] = useState(false);

  const [packageId, setPackageId] = useState(packages[0]?.id || 'pkg-standard');
  const [proofImage, setProofImage] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [avatarImage, setAvatarImage] = useState<string | null>(null);
  const [isAvatarUploading, setIsAvatarUploading] = useState(false);
  const [notes, setNotes] = useState('');
  
  // Flow States
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [createdAttendee, setCreatedAttendee] = useState<Attendee | null>(null);
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
      setIsUploading(true);
      const reader = new FileReader();
      reader.onloadend = () => {
        setProofImage(reader.result as string);
        setIsUploading(false);
      };
      reader.readAsDataURL(file);
    }
  };

  const selectedPackage = packages.find(p => p.id === packageId) || packages[0];
  const provincesList = getProvinceList();
  const districts = getDistrictsOf(province);
  const wards = getWardsOf(province, district);
  const cleanPhoneInput = phone.trim().replace(/\s+/g, '');
  const cleanFullNameAscii = fullName.trim().toUpperCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[đĐ]/g, 'D')
    .replace(/[^A-Z0-9\s]/g, '');
  const transferMessage = `${cleanFullNameAscii} ${cleanPhoneInput} DONG PHI THAM DU VSAPS 2026`;
  
  // Official interactive pricing matrix
  const PRICING = {
    pre_10_11: {
      'pkg-member': 2500000,
      'pkg-standard': 3000000,
      'pkg-student': 1000000,
      'pkg-foreign': 3750000, // $150
      'pkg-free': 0,
    },
    post_10_11: {
      'pkg-member': 3000000,
      'pkg-standard': 3500000,
      'pkg-student': 1500000,
      'pkg-foreign': 5000000, // $200
      'pkg-free': 0,
    }
  };

  const currentPrices = PRICING[period];
  const baseFee = currentPrices[packageId as keyof typeof currentPrices] ?? 0;
  
  const extraCme = cmeRequired ? 350000 : 0;
  const extraGala = galaRequired ? 700000 : 0;
  const extraMasterclass = masterclassRequired ? 500000 : 0;
  const extraTour = tourRequired ? (period === 'pre_10_11' ? 4500000 : 5000000) : 0;

  const calculatedTotalFee = baseFee + extraCme + extraGala + extraMasterclass + extraTour;

  // Dynamic preview for bank transfer using VietQR
  const currentVietQRUrl = `https://img.vietqr.io/image/VCB-0331000516283-compact.png?amount=${calculatedTotalFee}&addInfo=${encodeURIComponent(transferMessage)}&accountName=HOI%20PHAU%20THUAT%2520TAO%2520HINH%2520THAM%2520MY%2520VIET%2520NAM`;

  // Vietnam address selectors handlers
  const handleProvinceChange = (selectedProv: string) => {
    setProvince(selectedProv);
    const districts = getDistrictsOf(selectedProv);
    if (districts.length > 0) {
      setDistrict(districts[0]);
      const wards = getWardsOf(selectedProv, districts[0]);
      if (wards.length > 0) {
        setWard(wards[0]);
      } else {
        setWard('');
      }
    } else {
      setDistrict('');
      setWard('');
    }
  };

  const handleDistrictChange = (selectedDist: string) => {
    setDistrict(selectedDist);
    const wards = getWardsOf(province, selectedDist);
    if (wards.length > 0) {
      setWard(wards[0]);
    } else {
      setWard('');
    }
  };

  const handleToggleCme = (val: boolean) => {
    setCmeRequired(val);
  };

  const handleToggleGala = (val: boolean) => {
    setGalaRequired(val);
  };

  const handleSelectPackage = (pkgId: string) => {
    setPackageId(pkgId);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!fullName) {
      setErrorMsg('Vui lòng điền họ và tên đại biểu.');
      return;
    }
    if (!yearOfBirth) {
      setErrorMsg('Vui lòng điền năm sinh để hoàn tất thông tin đăng ký CME.');
      return;
    }
    const yobNum = parseInt(yearOfBirth, 10);
    if (isNaN(yobNum) || yobNum < 1920 || yobNum > 2026) {
      setErrorMsg('Năm sinh không hợp lệ (ví dụ: 1988).');
      return;
    }
    if (!phone) {
      setErrorMsg('Vui lòng nhập số điện thoại di động.');
      return;
    }
    if (!email) {
      setErrorMsg('Vui lòng điền địa chỉ Email để BTC gửi vé điện tử.');
      return;
    }
    if (!organization) {
      setErrorMsg('Vui lòng điền cơ quan đơn vị công tác.');
      return;
    }
    if (!address) {
      setErrorMsg('Vui lòng điền địa chỉ liên hệ.');
      return;
    }

    setErrorMsg('');
    setIsSubmitting(true);

    try {
      // Generate a random unique ID to avoid collisions on public registration
      const randomSeq = Math.floor(Math.random() * 900000 + 100000);
      const newId = `VSAPS2026-${randomSeq}`;
      const qrCodeValue = `${newId}-${fullName.replace(/\s+/g, '').toUpperCase()}`;

      const fullAddress = `${address.trim()}${ward ? ', ' + ward : ''}${district ? ', ' + district : ''}`;

      const attendeeData: Attendee = {
        id: newId,
        title,
        fullName: fullName.toUpperCase(),
        organization,
        department: department || 'Khoa Tạo hình Thẩm mỹ',
        phone: cleanPhoneInput,
        email,
        address: fullAddress,
        nationality,
        packageId,
        packageName: selectedPackage?.name || 'Gói Tiêu Chuẩn',
        packageFee: calculatedTotalFee,
        paymentStatus: 'pending_verification', // set pending to verify bank transfer receipt
        paymentMethod: 'bank_transfer',
        transactionProofUrl: proofImage || undefined,
        registrationDate: new Date().toISOString().split('T')[0],
        qrCodeValue,
        isCheckedIn: false,
        notes,
        yearOfBirth,
        gender,
        cmeRequired,
        cmeIdentityNo: undefined,
        galaRequired,
        masterclassRequired,
        tourRequired,
        registrationPeriod: period,
        province,
        avatarUrl: avatarImage || undefined,
      };

      const saved = await store.saveAttendeeAsync(attendeeData);
      
      // Broadcast realtime push notification to administrators
      sendRealtimeNotification(
        'Đại biểu Đăng Ký Mới',
        `Đại biểu ${saved.title} ${saved.fullName} (${saved.organization}) vừa đăng ký thành công gói ${saved.packageName}!`,
        'success'
      );
      
      // Tự động gửi tin nhắn Zalo ZNS và Email kèm vé điện tử & mã check-in QR
      try {
        store.sendZaloZNS(saved);
        store.sendEmail(saved);
      } catch (err) {
        console.error('Lỗi khi kích hoạt luồng bắn thông báo tự động:', err);
      }

      setCreatedAttendee(saved);
      setIsSubmitted(true);
    } catch (err: any) {
      console.error('Lỗi lưu đăng ký đại biểu:', err);
      setErrorMsg(`Không thể hoàn tất đăng ký do lỗi cơ sở dữ liệu: ${err.message || err.details || 'Lỗi mạng hoặc phân quyền.'}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Dynamic provinces list comes from administrative helper

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
      <div className="bg-slate-50 min-h-screen py-12 px-4 font-sans">
        <div className="max-w-2xl mx-auto bg-white rounded-3xl border border-slate-100 shadow-2xl overflow-hidden">
          {/* Header alert */}
          <div className="bg-teal-900 text-amber-400 p-8 text-center relative border-b border-teal-800">
            <div className="absolute top-4 left-4">
              <button 
                id="btn-confirm-return"
                onClick={() => onNavigate('event-details')}
                className="p-1 px-3 rounded-lg bg-teal-850 hover:bg-teal-800 text-xs font-semibold flex items-center gap-1 text-teal-200 border border-teal-800/60"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                Về trang chủ
              </button>
            </div>
            <div className="w-14 h-14 rounded-full bg-amber-400/10 flex items-center justify-center mx-auto mb-3 border border-amber-400/25">
              <CheckCircle className="w-7 h-7 text-amber-400" />
            </div>
            <h2 className="text-xl md:text-2xl font-black uppercase tracking-tight text-white">Đăng Ký Thành Công</h2>
            <p className="text-xs text-teal-200 uppercase tracking-widest font-mono mt-1">Hội Nghị Thường Niên VSAPS 2026</p>
          </div>

          <div className="p-6 md:p-8 space-y-6">
            
            {/* CME & Confirmation notification box */}
            <div className="bg-emerald-50/70 border border-emerald-100 rounded-2xl p-4 text-emerald-900 text-xs space-y-2">
              <div className="flex items-center gap-1.5 font-bold text-emerald-950 font-sans">
                <Sparkles className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>Hệ thống ghi nhận hồ sơ đại biểu thành công!</span>
              </div>
              <p className="text-slate-600 leading-relaxed font-sans">
                Mẫu đăng ký tham gia của <strong>{createdAttendee.title} {createdAttendee.fullName}</strong> đã được đồng bộ tự động lên sảnh tiếp tiếp chính của hội nghị.
              </p>
              <p className="text-slate-650 font-sans">
                • <strong>Zalo OA:</strong> Một tin nhắn xác nhận kèm phiếu check-in đã được gửi tới SĐT: <strong className="text-slate-900">{createdAttendee.phone}</strong>
              </p>
              <p className="text-slate-650 font-sans">
                • <strong>Email liên hệ:</strong> Hướng dẫn chi tiết và thẻ Check-in điện tử đã được gửi trực tiếp đến: <strong className="text-slate-900">{createdAttendee.email}</strong>
              </p>
            </div>

            {/* Electronic Ticket & Payment Information */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 border-t border-slate-100 pt-6">
              
              {/* Left Column: CHECK-IN PASS GỒM ẢNH QR VÉ */}
              <div className="border border-slate-200 rounded-2xl overflow-hidden bg-white shadow-sm flex flex-col justify-between">
                <div className="bg-teal-950 text-white p-3.5 text-center border-b border-teal-900">
                  <span className="text-[10px] uppercase font-bold tracking-widest text-amber-400 block font-mono">THẺ CHECK-IN ĐẠI BIỂU</span>
                  <span className="text-[9px] text-slate-350 tracking-wider">XUẤT TRÌNH KHI ĐẾN LỄ TÂN</span>
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
                    <div className="flex items-center justify-center gap-2.5 mt-2 mb-1.5 px-4">
                      {createdAttendee.avatarUrl && (
                        <img 
                          src={createdAttendee.avatarUrl} 
                          alt="Avatar" 
                          className="w-12 h-12 rounded-full object-cover border border-slate-200 shadow-sm shrink-0" 
                        />
                      )}
                      <div className={createdAttendee.avatarUrl ? 'text-left' : 'text-center w-full'}>
                        <p className="text-xs md:text-sm font-black text-slate-900 uppercase leading-snug">
                          {createdAttendee.title} {createdAttendee.fullName}
                        </p>
                        <p className="text-[10.5px] text-slate-500 font-semibold leading-tight">{createdAttendee.organization}</p>
                      </div>
                    </div>
                    <p className="text-[10px] text-slate-400 italic font-medium">Năm sinh: {createdAttendee.yearOfBirth} • Giới tính: {createdAttendee.gender}</p>
                  </div>
                </div>

                <div className="bg-slate-50 p-2.5 text-center text-[10px] text-slate-500 font-medium font-mono border-t border-slate-100">
                  MÃ SỐ ĐẠI BIỂU: {createdAttendee.qrCodeValue}
                </div>
              </div>

              {/* Right Column: THANH TOÁN CHUYỂN KHOẢN VIETQR */}
              <div className="border border-amber-200 rounded-2xl overflow-hidden bg-amber-50/20 shadow-sm flex flex-col justify-between">
                <div className="bg-amber-500 text-amber-950 p-3.5 text-center border-b border-amber-300">
                  <span className="text-[10px] uppercase font-black tracking-wider block">QUYỂN THANH TOÁN VIETQR</span>
                  <span className="text-[9px] text-amber-900 font-medium">BẮT BUỘC ĐỂ BTC KHỞI TẠO CME</span>
                </div>

                <div className="p-4 flex flex-col items-center justify-between flex-1 space-y-3">
                  {/* VietQR automatic dynamic generation code matching requirement */}
                  <div className="p-1 px-[10px] bg-white border border-slate-200 rounded-xl shadow-md cursor-pointer hover:shadow-lg transition-transform hover:scale-[1.02]">
                    <img 
                      src={vietQrSuccessUrl} 
                      alt="VietQR code" 
                      referrerPolicy="no-referrer"
                      className="w-40 h-auto object-contain mx-auto"
                    />
                  </div>

                  <div className="text-left w-full text-[10.5px] space-y-1.5 text-slate-700">
                    <p>• Trạng thái: <span className="font-bold text-amber-700 bg-amber-100/60 px-2 py-0.5 rounded">Chờ xác minh</span></p>
                    <p>• Ngân hàng: <strong className="text-slate-900 font-mono">VIETCOMBANK</strong></p>
                    <p>• Số tài khoản: <strong className="text-teal-900 font-mono font-bold text-xs">0331000516283</strong></p>
                    <p>• Chủ tài khoản: <strong className="text-slate-900 font-sans uppercase">Hoi phau thuat tao hinh tham my Viet Nam</strong></p>
                    <p>• Số tiền: <strong className="text-teal-700 font-bold font-mono text-xs">{createdAttendee.packageFee.toLocaleString()}đ</strong></p>
                    <p>• Nội dung CK: <strong className="text-amber-700 bg-amber-100 px-1.5 py-0.5 rounded font-mono font-extrabold text-xs">{transferMessageSub}</strong></p>
                  </div>
                </div>

                <div className="p-2 bg-amber-100/40 text-center text-[9px] text-amber-900 font-sans border-t border-amber-200">
                  ⚠️ Quét QR bằng ứng dụng ngân hàng để tự điền nội dung & số tiền chính xác.
                </div>
              </div>
            </div>

            {/* CME specific confirmation data display if requested */}
            {createdAttendee.cmeRequired && (
              <div className="bg-teal-50/50 border border-teal-100 p-4 rounded-2xl text-[11px] text-teal-950 space-y-1">
                <p className="font-bold text-teal-900 uppercase tracking-wide text-[10px]">ĐĂNG KÝ CẤP CHỨNG CHỈ CME ĐÃ GHI NHẬN:</p>
                <p>• Đại biểu có nhu cầu cấp CME y tế liên tục: <strong>Có</strong></p>
                <p>• Nơi nhận chứng chỉ giấy: <strong>{createdAttendee.address || createdAttendee.province}</strong></p>
              </div>
            )}

            {/* Instruction Footer action buttons */}
            <div className="bg-slate-50 p-4 rounded-xl border border-slate-100 text-[10px] text-slate-500 leading-relaxed">
              <strong>* Ban Tổ Chức Hướng Dẫn:</strong> Sau khi hoàn thành chuyển tiền qua QR ngân hàng, đại biểu vui lòng lưu giữ ảnh chụp biên nhận giao dịch thành công. BTC sẽ duyệt hồ sơ của quý đại biểu ngay khi nhận được báo có, trạng thái thanh toán sẽ đổi sang màu xanh <strong>PAID (Đã đóng phí)</strong> trên ứng dụng.
            </div>

            <div className="pt-4 flex flex-col md:flex-row gap-3">
              <button
                onClick={() => onNavigate('event-details')}
                className="flex-1 py-3 text-xs bg-slate-900 hover:bg-slate-950 text-white font-black uppercase text-center rounded-xl tracking-wider transition-all"
              >
                Trở về sảnh sự kiện
              </button>
              <button
                onClick={() => window.print()}
                className="px-6 py-3 text-xs bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 font-bold uppercase rounded-xl tracking-wider transition-all"
              >
                In Thẻ & Hóa Đơn 🖨️
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-slate-100 min-h-screen py-8 md:py-12 px-4 text-slate-800 font-sans">
      <div className="max-w-4xl mx-auto">
        
        {/* Navigation block */}
        <button
          onClick={() => onNavigate('event-details')}
          className="inline-flex items-center gap-2 text-slate-500 hover:text-slate-900 transition-all font-bold text-xs uppercase tracking-wider mb-6 cursor-pointer"
        >
          <ArrowLeft className="w-4 h-4" />
          Quay lại sảnh hội nghị
        </button>

        {/* Form Container with Premium aesthetic mimicking vsapsevent.org */}
        <div className="bg-white rounded-3xl border border-slate-200 shadow-2xl overflow-hidden">
          
          {/* Header Section: Luxury Medical Theme */}
          <div className="bg-teal-950 text-white p-6 md:p-8 border-b-4 border-amber-400 relative">
            <div className="absolute right-4 top-4 hidden md:block">
              <span className="text-[9px] font-black text-amber-400 bg-amber-400/10 px-3 py-1 rounded-full border border-amber-400/20 uppercase tracking-widest font-mono">
                REGISTRATION PORTAL
              </span>
            </div>
            
            <div className="max-w-xl">
              <span className="text-[10px] font-extrabold text-amber-400 tracking-widest uppercase block font-mono">
                HỘI PHẪU THUẬT TẠO HÌNH THẨM MỸ VIỆT NAM (VSAPS)
              </span>
              <h1 className="text-xl md:text-2xl font-black mt-1.5 tracking-tight uppercase">
                ĐĂNG KÝ ĐẠI BIỂU THAM DỰ HỘI NGHỊ THƯỜNG NIÊN VSAPS 2026
              </h1>
              <p className="text-teal-200 text-xs mt-1.5 leading-relaxed font-medium">
                Cổng đăng ký điện tử dành cho đại biểu, bác sĩ thẩm mỹ trong nước & quốc tế. Điền chính xác thông tin để phát hành CME và thẻ đại biểu QR tự động.
              </p>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="p-6 md:p-8 space-y-8">
            
            {errorMsg && (
              <div className="p-4 bg-rose-50 border border-rose-100 text-rose-800 text-xs rounded-xl flex items-center gap-2 animate-pulse">
                <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
                <span className="font-semibold">{errorMsg}</span>
              </div>
            )}

            {/* SECT 1: THÔNG TIN ĐẠI BIỂU */}
            <div className="space-y-5">
              <div className="flex items-center gap-2 border-b border-teal-100 pb-2">
                <span className="bg-teal-900 text-amber-400 font-mono font-bold px-2 py-0.5 rounded text-[10px]">01</span>
                <h3 className="font-extrabold text-sm text-slate-900 uppercase tracking-wider">THÔNG TIN ĐẠI BIỂU ĐĂNG KÝ</h3>
              </div>

              {/* Avatar Section */}
              <div className="flex flex-col sm:flex-row items-center gap-4 bg-slate-50 p-4 rounded-2xl border border-slate-200">
                <div className="relative group shrink-0 w-20 h-20 rounded-full bg-slate-250 border-2 border-dashed border-teal-600/30 flex items-center justify-center overflow-hidden">
                  {avatarImage ? (
                    <img src={avatarImage} className="w-full h-full object-cover" alt="Avatar" />
                  ) : (
                    <span className="text-slate-400 text-[10px] font-bold text-center p-1 leading-none select-none">Chưa có ảnh</span>
                  )}
                  {isAvatarUploading && (
                    <div className="absolute inset-0 bg-slate-900/50 flex items-center justify-center text-[10px] text-white font-mono">
                      Loading...
                    </div>
                  )}
                </div>
                <div className="space-y-1 text-center sm:text-left">
                  <span className="text-xs font-bold text-slate-800 block uppercase tracking-wide">Ảnh Chân Dung / Avatar Đại Biểu *</span>
                  <p className="text-[10px] text-slate-500 leading-snug">Khuyên dùng ảnh chân dung rõ mặt, nền sáng để check-in nhận diện khuôn mặt tức thì tại Lễ tân.</p>
                  <div className="flex items-center justify-center sm:justify-start gap-2 pt-1.5">
                    <label className="px-3 py-1 bg-white hover:bg-slate-100 border border-slate-350 text-[11px] font-bold rounded-lg cursor-pointer transition-all select-none">
                      Tải ảnh lên
                      <input type="file" accept="image/*" onChange={handleAvatarUpload} className="hidden" />
                    </label>
                    {avatarImage && (
                      <button
                        type="button"
                        onClick={() => setAvatarImage(null)}
                        className="px-2 py-1 bg-rose-50 hover:bg-rose-100 text-rose-600 text-[11px] font-semibold rounded-lg border-none cursor-pointer"
                      >
                        Xóa ảnh
                      </button>
                    )}
                  </div>
                </div>
              </div>

              {/* Title & Name */}
              <div className="grid grid-cols-1 md:grid-cols-12 gap-4">
                <div className="md:col-span-3">
                  <label className="block text-xs font-bold text-slate-700 mb-1">Học hàm / Học vị *</label>
                  <select
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 hover:border-slate-300 rounded-xl text-xs font-medium focus:border-teal-600 focus:outline-none focus:bg-white transition-all"
                  >
                    <option value="GS.TS.">GS.TS. (Giáo sư Tiến sĩ)</option>
                    <option value="PGS.TS.">PGS.TS. (Phó Giáo sư Tiến sĩ)</option>
                    <option value="TS.">TS. (Tiến sĩ)</option>
                    <option value="ThS.">ThS. (Thạc sĩ)</option>
                    <option value="BSCKII.">BSCKII. (Bác sĩ Chuyên khoa II)</option>
                    <option value="BSCKI.">BSCKI. (Bác sĩ Chuyên khoa I)</option>
                    <option value="BS.">BS. (Bác sĩ / Bác sĩ Nội trú)</option>
                    <option value="ThS.BS.">ThS.BS. (Thạc sĩ Bác sĩ)</option>
                    <option value="DS.">DS. (Dược sĩ)</option>
                    <option value="CN.">CN. (Cử nhân / Y tá)</option>
                    <option value="Đại biểu">Khác... (Đại biểu/Kỹ thuật viên)</option>
                  </select>
                </div>

                <div className="md:col-span-6">
                  <label className="block text-xs font-bold text-slate-700 mb-1">Họ và Tên (In hoa có dấu) *</label>
                  <input
                    type="text"
                    required
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value.toUpperCase())}
                    placeholder="ví dụ: NGUYỄN VĂN A"
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 hover:border-slate-300 rounded-xl text-xs font-bold focus:border-teal-600 focus:outline-none focus:bg-white uppercase tracking-wider transition-all placeholder-slate-400"
                  />
                </div>

                <div className="md:col-span-3">
                  <label className="block text-xs font-bold text-slate-700 mb-1">Giới tính *</label>
                  <div className="flex bg-slate-50 rounded-xl border border-slate-200 p-1">
                    <button
                      type="button"
                      onClick={() => setGender('Nam')}
                      className={`flex-1 py-1.5 text-xs font-bold rounded-lg transition-all ${
                        gender === 'Nam' ? 'bg-white text-teal-950 shadow-sm' : 'text-slate-500 hover:text-slate-800'
                      }`}
                    >
                      Nam
                    </button>
                    <button
                      type="button"
                      onClick={() => setGender('Nữ')}
                      className={`flex-1 py-1.5 text-xs font-bold rounded-lg transition-all ${
                        gender === 'Nữ' ? 'bg-white text-teal-950 shadow-sm' : 'text-slate-500 hover:text-slate-800'
                      }`}
                    >
                      Nữ
                    </button>
                  </div>
                </div>
              </div>

              {/* Year of Birth & Address */}
              <div className="grid grid-cols-1 md:grid-cols-12 gap-4">
                
                <div className="md:col-span-4">
                  <label className="block text-xs font-bold text-slate-700 mb-1">Năm sinh *</label>
                  <input
                    type="text"
                    required
                    maxLength={4}
                    value={yearOfBirth}
                    onChange={(e) => setYearOfBirth(e.target.value.replace(/\D/g, ''))}
                    placeholder="ví dụ: 1988"
                    className="w-full px-3.5 py-2.5 bg-slate-55 border border-slate-200 rounded-xl text-xs font-mono font-bold focus:border-teal-600 focus:outline-none placeholder-slate-400"
                  />
                  <span className="text-[10px] text-slate-400 mt-1 block">Cần thiết cho chứng chỉ CME</span>
                </div>

                <div className="md:col-span-4">
                  <label className="block text-xs font-bold text-slate-700 mb-1">Số điện thoại liên hệ *</label>
                  <input
                    type="tel"
                    required
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="ví dụ: 0912345678"
                    className="w-full px-3.5 py-2.5 bg-slate-55 border border-slate-200 rounded-xl text-xs font-mono font-bold focus:border-teal-600 focus:outline-none placeholder-slate-400 animate-fade-in"
                  />
                  <span className="text-[10px] text-slate-400 mt-1 block">Zalo OA dùng để gửi vé QR tự động</span>
                </div>

                <div className="md:col-span-4">
                  <label className="block text-xs font-bold text-slate-700 mb-1">Địa chỉ Email nhận vé & CME *</label>
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="ví dụ: bacsi.nguyen@gmail.com"
                    className="w-full px-3.5 py-2.5 bg-slate-55 border border-slate-200 rounded-xl text-xs font-semibold focus:border-teal-600 focus:outline-none placeholder-slate-400"
                  />
                </div>
              </div>

              {/* Work Affiliation & Area */}
              <div className="grid grid-cols-1 md:grid-cols-12 gap-4">
                <div className="md:col-span-12">
                  <label className="block text-xs font-bold text-slate-700 mb-1">Đơn vị công tác (Bệnh viện/Khoa Y/Viện thẩm mỹ) *</label>
                  <input
                    type="text"
                    required
                    value={organization}
                    onChange={(e) => setOrganization(e.target.value)}
                    placeholder="ví dụ: Bệnh viện Chợ Rẫy"
                    className="w-full px-3.5 py-2.5 bg-slate-55 border border-slate-200 rounded-xl text-xs font-semibold focus:border-teal-600 focus:outline-none placeholder-slate-400"
                  />
                </div>
              </div>

              {/* Contact Address & Nationality */}
              <div className="grid grid-cols-1 md:grid-cols-12 gap-4">
                <div className="md:col-span-8">
                  <label className="block text-xs font-bold text-slate-700 mb-1">Địa chỉ liên hệ *</label>
                  <input
                    type="text"
                    required
                    value={address}
                    onChange={(e) => setAddress(e.target.value)}
                    placeholder="ví dụ: Phường Thảo Điền, Thành phố Thủ Đức, Hồ Chí Minh"
                    className="w-full px-3.5 py-2.5 bg-slate-55 border border-slate-200 rounded-xl text-xs font-semibold focus:border-teal-600 focus:outline-none placeholder-slate-400"
                  />
                </div>

                <div className="md:col-span-4">
                  <label className="block text-xs font-bold text-slate-700 mb-1">Quốc tịch *</label>
                  <div className="flex bg-slate-50 border border-slate-200 rounded-xl p-1 gap-1.5 mt-1">
                    <button
                      type="button"
                      onClick={() => setNationality('vietname')}
                      className={`flex-1 py-1 text-xs font-bold rounded-lg transition-all ${
                        nationality === 'vietname' ? 'bg-teal-900 text-amber-400 shadow' : 'text-slate-500 hover:text-slate-800'
                      }`}
                    >
                      Việt Nam
                    </button>
                    <button
                      type="button"
                      onClick={() => setNationality('foreign')}
                      className={`flex-1 py-1 text-xs font-bold rounded-lg transition-all ${
                        nationality === 'foreign' ? 'bg-teal-900 text-amber-400 shadow' : 'text-slate-500 hover:text-slate-800'
                      }`}
                    >
                      Nước Ngoài / International
                    </button>
                  </div>
                </div>
              </div>
            </div>

            {/* SECT 2: THỜI ĐIỂM & DỊCH VỤ PHỤ TRỘI TỰ CHỌN */}
            <div className="space-y-4 pt-4 border-t border-slate-100">
              <div className="flex items-center justify-between border-b border-teal-100 pb-2">
                <div className="flex items-center gap-2">
                  <span className="bg-teal-900 text-amber-400 font-mono font-bold px-2 py-0.5 rounded text-[10px]">02</span>
                  <h3 className="font-extrabold text-sm text-slate-900 uppercase tracking-wider">Thời điểm & Dịch vụ phụ trội tự chọn</h3>
                </div>
                <span className="text-[10px] text-teal-700 bg-teal-50 px-2.5 py-0.5 rounded-full font-bold">Lựa chọn trực quan</span>
              </div>

              {/* Time Period picker */}
              <div className="p-4 bg-amber-500/10 border border-amber-500/20 rounded-2xl space-y-2">
                <label className="block text-xs font-bold text-amber-950 uppercase tracking-wider">Lựa chọn Thời điểm Đăng ký *</label>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setPeriod('pre_10_11')}
                    className={`p-3 text-xs font-extrabold rounded-xl transition-all border text-left flex justify-between items-center ${
                      period === 'pre_10_11'
                        ? 'bg-teal-900 text-amber-400 border-teal-950 shadow-md ring-2 ring-teal-900/10'
                        : 'bg-white text-slate-600 border-slate-200 hover:border-slate-350'
                    }`}
                  >
                    <span>Trước Ngày 10/11/2026 (Giá Ưu Đãi)</span>
                    <span className="font-mono text-[9px] px-2 py-0.5 bg-amber-400/10 text-amber-500 rounded font-normal">Được khuyên dùng</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setPeriod('post_10_11')}
                    className={`p-3 text-xs font-extrabold rounded-xl transition-all border text-left flex justify-between items-center ${
                      period === 'post_10_11'
                        ? 'bg-teal-900 text-amber-400 border-teal-950 shadow-md ring-2 ring-teal-900/10'
                        : 'bg-white text-slate-600 border-slate-200 hover:border-slate-350'
                    }`}
                  >
                    <span>Từ 10/11/2026 trở đi (Giá Cận Sự Kiện)</span>
                    <span className="font-mono text-[9px] px-2 py-0.5 bg-rose-500/15 text-rose-500 rounded font-normal">Cận hội nghị</span>
                  </button>
                </div>
                <p className="text-[9.5px] text-slate-500 leading-snug">
                  * Biểu giá chi tiết của gói học tập và dịch vụ phụ trội (như Tour tham quan) tự động quy đổi theo thời điểm quý đại biểu chọn.
                </p>
              </div>

              {/* Grid of 4 Extra Services: CME, Gala, Masterclass, Tour */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* CME Option */}
                <div 
                  onClick={() => handleToggleCme(!cmeRequired)}
                  className={`p-4 rounded-2xl border cursor-pointer select-none transition-all ${
                    cmeRequired 
                      ? 'bg-teal-50/40 border-teal-600 ring-2 ring-teal-600/10' 
                      : 'bg-white border-slate-200 hover:border-slate-300 hover:shadow-sm'
                  }`}
                >
                  <div className="flex items-start gap-4">
                    <input
                      type="checkbox"
                      checked={cmeRequired}
                      onChange={(e) => {
                        e.stopPropagation();
                        handleToggleCme(e.target.checked);
                      }}
                      className="w-5 h-5 rounded border-slate-300 text-teal-800 focus:ring-teal-700 mt-0.5 cursor-pointer"
                    />
                    <div>
                      <span className="text-xs font-black text-slate-900 block uppercase">
                        Chứng chỉ CME (+ 350.000đ)
                      </span>
                      <span className="text-[10px] text-slate-500 block leading-relaxed mt-0.5">
                        Nhận chứng chỉ đào tạo y khoa liên tục CME sau khi kết thúc khóa học tham luận.
                      </span>
                    </div>
                  </div>
                </div>

                {/* Gala Dinner Option */}
                <div 
                  onClick={() => handleToggleGala(!galaRequired)}
                  className={`p-4 rounded-2xl border cursor-pointer select-none transition-all ${
                    galaRequired 
                      ? 'bg-amber-50/40 border-amber-500 ring-2 ring-amber-500/10' 
                      : 'bg-white border-slate-200 hover:border-slate-300 hover:shadow-sm'
                  }`}
                >
                  <div className="flex items-start gap-4">
                    <input
                      type="checkbox"
                      checked={galaRequired}
                      onChange={(e) => {
                        e.stopPropagation();
                        handleToggleGala(e.target.checked);
                      }}
                      className="w-5 h-5 rounded border-slate-300 text-amber-600 focus:ring-amber-500 mt-0.5 cursor-pointer"
                    />
                    <div>
                      <span className="text-xs font-black text-amber-850 block uppercase">
                        Gala Dinner (+ 700.000đ)
                      </span>
                      <span className="text-[10px] text-slate-500 block leading-relaxed mt-0.5">
                        Đăng ký tiệc tối ẩm thực giao lưu kết nối thân mật y sỹ.
                      </span>
                    </div>
                  </div>
                </div>

                {/* Masterclass Option */}
                <div 
                  onClick={() => setMasterclassRequired(!masterclassRequired)}
                  className={`p-4 rounded-2xl border cursor-pointer select-none transition-all ${
                    masterclassRequired 
                      ? 'bg-purple-50/40 border-purple-500 ring-2 ring-purple-500/10' 
                      : 'bg-white border-slate-200 hover:border-slate-300 hover:shadow-sm'
                  }`}
                >
                  <div className="flex items-start gap-4">
                    <input
                      type="checkbox"
                      checked={masterclassRequired}
                      onChange={(e) => {
                        e.stopPropagation();
                        setMasterclassRequired(e.target.checked);
                      }}
                      className="w-5 h-5 rounded border-slate-300 text-purple-600 focus:ring-purple-500 mt-0.5 cursor-pointer"
                    />
                    <div>
                      <span className="text-xs font-black text-purple-850 block uppercase">
                        Master class (+ 500.000đ)
                      </span>
                      <span className="text-[10px] text-slate-500 block leading-relaxed mt-0.5">
                        Nhận truyền thụ và chuyển giao công nghệ thẩm mỹ lâm sàn chuyên sâu.
                      </span>
                    </div>
                  </div>
                </div>

                {/* Tour Option */}
                <div 
                  onClick={() => setTourRequired(!tourRequired)}
                  className={`p-4 rounded-2xl border cursor-pointer select-none transition-all ${
                    tourRequired 
                      ? 'bg-pink-50/40 border-pink-500 ring-2 ring-pink-500/10' 
                      : 'bg-white border-slate-200 hover:border-slate-300 hover:shadow-sm'
                  }`}
                >
                  <div className="flex items-start gap-4">
                    <input
                      type="checkbox"
                      checked={tourRequired}
                      onChange={(e) => {
                        e.stopPropagation();
                        setTourRequired(e.target.checked);
                      }}
                      className="w-5 h-5 rounded border-slate-300 text-pink-600 focus:ring-pink-500 mt-0.5 cursor-pointer"
                    />
                    <div>
                      <span className="text-xs font-black text-pink-850 block uppercase">
                        Tour tham quan {period === 'pre_10_11' ? '(+ 4.500.000đ)' : '(+ 5.000.000đ)'}
                      </span>
                      <span className="text-[10px] text-slate-500 block leading-relaxed mt-0.5">
                        Đóng phí Tour tham luận văn hóa dã ngoại theo lịch trình hội nghị độc giả.
                      </span>
                    </div>
                  </div>
                </div>
              </div>


            </div>

            {/* SECT 3: GÓI HỌC TẬP HỘI NGHỊ */}
            <div className="space-y-4 pt-4 border-t border-slate-100">
              <div className="flex items-center gap-2 border-b border-teal-100 pb-2">
                <span className="bg-teal-900 text-amber-400 font-mono font-bold px-2 py-0.5 rounded text-[10px]">03</span>
                <h3 className="font-extrabold text-sm text-slate-900 uppercase tracking-wider">CHỌN GÓI ĐĂNG KÝ HỘI NGHỊ</h3>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                {packages.map((pkg) => {
                  const isSelected = packageId === pkg.id;
                  const currentPkgPrice = currentPrices[pkg.id as keyof typeof currentPrices] ?? 0;
                  return (
                    <label
                      key={pkg.id}
                      onClick={() => handleSelectPackage(pkg.id)}
                      className={`p-5 rounded-2xl border cursor-pointer flex flex-col justify-between transition-all relative ${
                        isSelected 
                          ? 'bg-teal-50/40 border-teal-600 ring-2 ring-teal-600/20 shadow-lg' 
                          : 'bg-white border-slate-200 hover:border-slate-350 shadow-sm'
                      }`}
                    >
                      <div className="space-y-3">
                        <div className="flex items-center justify-between">
                          <span className={`text-[9px] font-mono font-bold uppercase px-2 py-0.5 rounded ${
                            pkg.id === 'pkg-member' ? 'bg-indigo-100 text-indigo-850 border border-indigo-200' :
                            pkg.id === 'pkg-standard' ? 'bg-teal-100 text-teal-850 border border-teal-100' : 'bg-slate-100 text-slate-700'
                          }`}>
                            {pkg.id === 'pkg-member' ? 'Hội Viên' : pkg.id === 'pkg-standard' ? 'Standard' : pkg.id === 'pkg-student' ? 'Học Viên' : pkg.id === 'pkg-free' ? 'Báo cáo viên' : 'Foreigner'}
                          </span>
                          {isSelected && <span className="w-5 h-5 rounded-full bg-teal-600 flex items-center justify-center text-white text-xs">✓</span>}
                        </div>

                        <div>
                          <span className="font-black text-xs md:text-sm text-slate-950 block leading-tight">{pkg.name}</span>
                          
                          <div className="flex flex-wrap gap-1 mt-1.5">
                            {pkg.id === 'pkg-free' ? (
                              <span className="px-1 py-0.2 bg-teal-50 text-teal-800 border border-teal-100 rounded text-[7.5px] font-black">✓ MIỄN PHÍ</span>
                            ) : (
                              <span className="px-1 py-0.2 bg-slate-100 text-slate-400 rounded text-[7.5px] font-bold">Phí tự chọn phụ trợ</span>
                            )}
                          </div>

                          <span className="text-[9.5px] text-slate-400 block mt-3.5 uppercase font-bold tracking-wider font-mono">QUYỀN LỢI ĐI KÈM:</span>
                          <ul className="text-[10px] text-slate-500 space-y-1.5 mt-1.5 list-disc pl-3">
                            {pkg.benefits.map((b, i) => (
                              <li key={i} className="leading-tight">{b}</li>
                            ))}
                          </ul>
                        </div>
                      </div>

                      <div className="font-mono font-black text-slate-950 text-base md:text-lg mt-5 border-t border-slate-100 pt-3 text-right">
                        {currentPkgPrice.toLocaleString()} <span className="text-[10px] font-normal text-slate-400 font-sans">VNĐ</span>
                      </div>
                    </label>
                  );
                })}
              </div>
            </div>

            {/* SECT 4: THANH TOÁN CHUYỂN KHOẢN (VietQR) */}
            <div className="space-y-4 pt-4 border-t border-slate-100">
              <div className="flex items-center justify-between border-b border-teal-100 pb-2">
                <div className="flex items-center gap-2">
                  <span className="bg-teal-900 text-amber-400 font-mono font-bold px-2 py-0.5 rounded text-[10px]">04</span>
                  <h3 className="font-extrabold text-sm text-slate-900 uppercase tracking-wider">THÔNG TIN THANH TOÁN (DUY NHẤT CHUYỂN KHOẢN VIETQR)</h3>
                </div>
                <span className="text-[9.5px] text-emerald-700 bg-emerald-50 border border-emerald-100 px-2 py-0.5 rounded font-mono font-extrabold tracking-wide uppercase">CẬP NHẬT LIVE ⚡</span>
              </div>

              <div className="bg-slate-50 p-6 rounded-2xl border border-slate-250/60 grid grid-cols-1 md:grid-cols-12 gap-6 items-center">
                
                {/* Visual VietQR automatic code matching requirement */}
                <div className="md:col-span-5 bg-white p-4 rounded-xl border border-slate-200 flex flex-col items-center shadow-md select-none text-center">
                  <span className="text-[9.5px] uppercase font-bold tracking-widest text-slate-400 mb-2 font-mono block">QUÉT QR THANH TOÁN TỨC THÌ</span>
                  
                  <div className="p-1 px-[10px] bg-white border border-slate-100 rounded-lg relative group">
                    <img 
                      src={currentVietQRUrl} 
                      alt="Vietcombank QR" 
                      referrerPolicy="no-referrer"
                      className="w-36 h-auto object-contain transition-transform group-hover:scale-105"
                    />
                    <div className="absolute inset-x-0 bottom-0 py-0.5 bg-slate-900/80 text-[8.5px] font-mono font-bold text-emerald-400 rounded-b truncate px-1">
                      {transferMessage}
                    </div>
                  </div>

                  <p className="text-[9.5px] text-slate-500 leading-snug mt-3 font-sans max-w-[200px]">
                    Sử dụng ứng dụng Momo, ZaloPay, ViettelPay hoặc bất kỳ app ngân hàng Việt Nam để quét nhanh.
                  </p>
                </div>

                {/* Account Details */}
                <div className="md:col-span-7 space-y-4">
                  <div className="space-y-2 text-xs">
                    <div className="grid grid-cols-3 gap-2 py-2 border-b border-slate-200/50">
                      <span className="text-slate-500 font-semibold">Tài khoản thụ hưởng:</span>
                      <strong className="col-span-2 text-slate-900">0331000516283</strong>
                    </div>
                    <div className="grid grid-cols-3 gap-2 py-2 border-b border-slate-200/50">
                      <span className="text-slate-500 font-semibold">Ngân hàng:</span>
                      <strong className="col-span-2 text-slate-900 font-sans">Vietcombank (Ngân hàng TMCP Ngoại thương Việt Nam)</strong>
                    </div>
                    <div className="grid grid-cols-3 gap-2 py-2 border-b border-slate-200/50">
                      <span className="text-slate-500 font-semibold">Tên chủ tài khoản:</span>
                      <strong className="col-span-2 text-slate-900 uppercase">Hoi phau thuat tao hinh tham my Viet Nam</strong>
                    </div>
                    <div className="grid grid-cols-3 gap-2 py-2 border-b border-slate-200/50">
                      <span className="text-slate-500 font-semibold">Chi tiết tiền đăng ký:</span>
                      <div className="col-span-2 text-slate-700 text-xs space-y-1">
                        <div>• Phí gốc ({selectedPackage?.name}): <strong>{baseFee.toLocaleString()}đ</strong></div>
                        {extraCme > 0 && <div>• Phí cấp chứng chỉ CME: <strong>+{extraCme.toLocaleString()}đ</strong></div>}
                        {extraGala > 0 && <div>• Phí Đêm tiệc Gala Dinner: <strong>+{extraGala.toLocaleString()}đ</strong></div>}
                        {extraMasterclass > 0 && <div>• Phí Đăng ký Master class: <strong>+{extraMasterclass.toLocaleString()}đ</strong></div>}
                        {extraTour > 0 && <div>• Phí Tour du lịch dã ngoại: <strong>+{extraTour.toLocaleString()}đ</strong></div>}
                      </div>
                    </div>
                    <div className="grid grid-cols-3 gap-2 py-2 border-b border-slate-200/50 text-teal-900 bg-teal-50/50 p-1.5 rounded-lg">
                      <span className="text-teal-900 font-bold">Tổng tiền cần chuyển:</span>
                      <strong className="col-span-2 text-teal-950 text-sm font-black font-mono">{calculatedTotalFee.toLocaleString()} VNĐ</strong>
                    </div>
                    <div className="grid grid-cols-3 gap-2 py-2 border-b border-slate-200/50">
                      <span className="text-slate-500 font-semibold">Nội dung cú pháp CK:</span>
                      <div className="col-span-2 flex flex-col">
                        <strong className="text-amber-800 text-xs font-black font-mono bg-amber-50 rounded px-2 py-0.5 select-all border border-amber-250/50 w-fit">
                          {transferMessage}
                        </strong>
                        <span className="text-[9.5px] text-amber-600 font-medium font-sans mt-0.5 italic">Hệ thống khuyến khích chuyển khoản đúng cú pháp để duyệt phiếu tự động sau 1 phút.</span>
                      </div>
                    </div>
                  </div>

                  {/* Proof of Payment file uploader */}
                  <div className="p-4 bg-white border border-slate-200 rounded-xl space-y-2.5 shadow-sm">
                    <label className="block text-xs font-bold text-slate-900 uppercase tracking-wide">
                      Tải Tấm Ảnh Giao Dịch Thành Công (Để BTC đối soát nhanh) *
                    </label>
                    <div className="flex items-center gap-3">
                      <label id="lbl-upload-proof" className="px-3.5 py-2 rounded-xl border border-slate-200 bg-slate-50 hover:bg-slate-100 hover:border-slate-300 cursor-pointer text-xs font-bold text-slate-700 flex items-center gap-1.5 transition-all w-fit">
                        <Upload className="w-4 h-4 text-slate-500" />
                        Đính kèm hóa đơn
                        <input
                          type="file"
                          accept="image/*"
                          onChange={handleFileUpload}
                          className="hidden"
                        />
                      </label>
                      {isUploading && <span className="text-[10px] text-slate-400 font-mono animate-pulse">Đang nạp file...</span>}
                      {proofImage && <span className="text-xs text-emerald-600 font-bold flex items-center gap-1">✓ Đã nạp ảnh thành công!</span>}
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
              </div>
            </div>

            {/* Note fields */}
            <div>
              <RichTextEditor
                value={notes}
                onChange={setNotes}
                label="Ghi chú yêu cầu đặc biệt khác cho BTC"
                placeholder="ví dụ: Đóng gói ăn chay, Xuất hóa đơn đỏ cho cơ quan bệnh viện công (ghi rõ MST, Tên tổ chức)..."
                id="delegate-notes"
              />
            </div>

            {/* Submit block */}
            <div className="pt-4">
              <button
                id="btn-submit-delegate"
                type="submit"
                disabled={isSubmitting}
                className="w-full py-4 rounded-2xl bg-teal-900 hover:bg-teal-950 disabled:opacity-50 text-white font-extrabold text-[12.5px] uppercase tracking-widest cursor-pointer shadow-lg hover:shadow-xl transition-all border border-amber-400/40 relative group overflow-hidden"
              >
                <div className="absolute inset-0 bg-gradient-to-r from-amber-400/10 via-white/10 to-transparent translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-1000 ease-in-out" />
                {isSubmitting ? 'Đang gửi thông tin đăng ký...' : 'Xác Nhận Đăng Ký Gửi Cho Ban Tổ Chức ⚡'}
              </button>
              <span className="text-[10px] text-slate-400 italic mt-2.5 text-center block leading-relaxed font-sans">
                Ấn nút đăng ký, thẻ đeo check-in và hóa đơn chuyển tiền sẽ được xuất bản lập tức. Ban thư ký VSAPS sẽ đồng thời đối soát tiền chuyển khoản real-time trên tài khoản.
              </span>
            </div>

          </form>
        </div>
      </div>
    </div>
  );
}
