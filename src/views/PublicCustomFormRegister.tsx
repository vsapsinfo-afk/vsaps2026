import React, { useState, useEffect, useMemo } from 'react';
import { 
  CheckCircle2, AlertTriangle, Calendar, Clock, DollarSign, 
  Upload, QrCode, ArrowLeft, Send, Check, Copy, Download, 
  Printer, Sparkles, Building, Phone, Mail, User, Layers,
  ShieldCheck, FileText, X
} from 'lucide-react';
import { store } from '../dataStore';
import { CustomRegistrationForm, CustomFormSubmission, FormField } from '../types';

interface PublicCustomFormRegisterProps {
  onNavigate?: (view: string) => void;
  formId?: string;
  formSlug?: string;
}

export default function PublicCustomFormRegister({ onNavigate, formId: propFormId, formSlug: propFormSlug }: PublicCustomFormRegisterProps) {
  const [form, setForm] = useState<CustomRegistrationForm | null>(null);
  const [formData, setFormData] = useState<Record<string, any>>({});
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submittedResult, setSubmittedResult] = useState<CustomFormSubmission | null>(null);
  const [copiedBank, setCopiedBank] = useState(false);
  const [copiedMemo, setCopiedMemo] = useState(false);

  // Determine which form to load from query param or props
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const idParam = propFormId || params.get('id');
    const slugParam = propFormSlug || params.get('slug');

    const allForms = store.getCustomForms();
    let foundForm: CustomRegistrationForm | undefined;

    if (idParam) {
      foundForm = allForms.find(f => f.id === idParam || f.slug === idParam);
    } else if (slugParam) {
      foundForm = allForms.find(f => f.slug === slugParam);
    }

    if (!foundForm && allForms.length > 0) {
      // Fallback to first active form
      foundForm = allForms.find(f => f.status === 'active') || allForms[0];
    }

    if (foundForm) {
      setForm(foundForm);
      // Initialize form data defaults
      const defaults: Record<string, any> = {};
      foundForm.fields.forEach(f => {
        if (f.defaultValue) {
          defaults[f.key] = f.defaultValue;
        } else if (f.type === 'checkbox') {
          defaults[f.key] = [];
        }
      });
      setFormData(defaults);
    }
  }, [propFormId, propFormSlug]);

  // Check form availability
  const availability = useMemo(() => {
    if (!form) return { isOpen: false, reason: 'Không tìm thấy biểu mẫu' };
    if (form.status === 'paused') {
      return { isOpen: false, reason: 'Biểu mẫu đang tạm dừng nhận đơn đăng ký.' };
    }
    if (form.status === 'draft') {
      return { isOpen: false, reason: 'Biểu mẫu đang ở chế độ bản nháp nội bộ.' };
    }
    if (form.deadline) {
      const deadlineDate = new Date(form.deadline);
      deadlineDate.setHours(23, 59, 59);
      if (new Date() > deadlineDate) {
        return { isOpen: false, reason: 'Thời hạn nhận đăng ký cho biểu mẫu này đã kết thúc.' };
      }
    }
    if (form.maxSubmissions) {
      const currentSubs = store.getCustomSubmissions(form.id).length;
      if (currentSubs >= form.maxSubmissions) {
        return { isOpen: false, reason: 'Rất tiếc, số lượng suất đăng ký cho biểu mẫu này đã đủ.' };
      }
    }
    return { isOpen: true };
  }, [form]);

  // Form temporary registration code for bank transfer memo
  const tempSubmissionCode = useMemo(() => {
    return `VSAPS-${Math.random().toString(36).substring(2, 7).toUpperCase()}`;
  }, [form]);

  // Handle Input Change
  const handleInputChange = (key: string, value: any) => {
    setFormData(prev => ({ ...prev, [key]: value }));
    if (errors[key]) {
      setErrors(prev => {
        const next = { ...prev };
        delete next[key];
        return next;
      });
    }
  };

  // Handle File Upload (Base64 conversion)
  const handleFileUpload = (key: string, file: File) => {
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) {
      alert('Kích thước tệp quá lớn! Vui lòng chọn tệp nhỏ hơn 5MB.');
      return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      const base64Url = e.target?.result as string;
      handleInputChange(key, base64Url);
    };
    reader.readAsDataURL(file);
  };

  // Form Validation
  const validateForm = (): boolean => {
    if (!form) return false;
    const newErrors: Record<string, string> = {};

    form.fields.forEach(f => {
      if (f.type === 'section') return;

      const val = formData[f.key];
      if (f.required) {
        if (val === undefined || val === null || val === '' || (Array.isArray(val) && val.length === 0)) {
          newErrors[f.key] = `Vui lòng nhập/chọn thông tin "${f.label}"`;
        }
      }

      if (val && f.type === 'email') {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(String(val))) {
          newErrors[f.key] = 'Địa chỉ email không đúng định dạng';
        }
      }

      if (val && f.type === 'phone') {
        const phoneRegex = /^[0-9+\s().-]{8,15}$/;
        if (!phoneRegex.test(String(val))) {
          newErrors[f.key] = 'Số điện thoại không hợp lệ';
        }
      }
    });

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // Submit Handler
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form) return;

    if (!validateForm()) {
      window.scrollTo({ top: 300, behavior: 'smooth' });
      return;
    }

    setIsSubmitting(true);

    try {
      // Find common identity fields
      let fullName = formData['full_name'] || formData['name'] || formData['ho_va_ten'] || '';
      let email = formData['email'] || '';
      let phone = formData['phone'] || formData['so_dien_thoai'] || '';
      let organization = formData['organization'] || formData['co_quan'] || formData['don_vi'] || '';
      let paymentProofUrl = formData['payment_proof'] || formData['bien_lai'] || undefined;

      const submission: CustomFormSubmission = {
        id: `sub-${Date.now()}-${Math.floor(Math.random() * 900 + 100)}`,
        formId: form.id,
        formTitle: form.title,
        submissionCode: tempSubmissionCode,
        data: { ...formData },
        fullName: fullName ? String(fullName) : undefined,
        email: email ? String(email) : undefined,
        phone: phone ? String(phone) : undefined,
        organization: organization ? String(organization) : undefined,
        paymentProofUrl: paymentProofUrl ? String(paymentProofUrl) : undefined,
        paymentStatus: form.isFeeRequired ? (paymentProofUrl ? 'paid' : 'pending') : 'free',
        status: 'confirmed',
        submittedAt: new Date().toISOString()
      };

      await store.saveCustomSubmission(submission);
      setSubmittedResult(submission);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } catch (err) {
      console.error('Error submitting custom form:', err);
      alert('Có lỗi xảy ra trong quá trình gửi đơn. Vui lòng thử lại!');
    } finally {
      setIsSubmitting(false);
    }
  };

  // If form not found
  if (!form) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
        <div className="bg-white p-8 rounded-3xl max-w-md w-full text-center space-y-4 border border-slate-200 shadow-xl">
          <AlertTriangle className="w-12 h-12 text-amber-500 mx-auto" />
          <h2 className="text-lg font-black text-slate-900">Không tìm thấy biểu mẫu</h2>
          <p className="text-xs text-slate-500">Biểu mẫu đăng ký này không tồn tại hoặc đã bị xóa khỏi hệ thống.</p>
          {onNavigate && (
            <button
              onClick={() => onNavigate('event-details')}
              className="px-5 py-2.5 bg-indigo-600 text-white rounded-xl text-xs font-bold cursor-pointer"
            >
              Quay lại Trang Tin Sự Kiện
            </button>
          )}
        </div>
      </div>
    );
  }

  // =========================================================
  // SUCCESSFUL REGISTRATION SCREEN
  // =========================================================
  if (submittedResult) {
    const qrValue = `VSAPS2026-SUB-${submittedResult.submissionCode}`;
    return (
      <div className="min-h-screen bg-slate-100 py-10 px-4 sm:px-6 flex items-center justify-center">
        <div className="bg-white rounded-3xl max-w-xl w-full overflow-hidden border border-slate-200 shadow-2xl animate-fade-in text-slate-900">
          {/* Header checkmark */}
          <div className="bg-gradient-to-r from-emerald-600 to-teal-700 p-8 text-center text-white space-y-3">
            <div className="w-16 h-16 rounded-full bg-white/20 backdrop-blur-xs flex items-center justify-center mx-auto border-2 border-white/40 shadow-inner">
              <CheckCircle2 className="w-10 h-10 text-white" />
            </div>
            <h2 className="text-xl sm:text-2xl font-black tracking-tight">ĐĂNG KÝ THÀNH CÔNG!</h2>
            <p className="text-xs text-emerald-100 max-w-md mx-auto leading-relaxed">
              {form.successMessage || 'Cảm ơn Quý vị đã hoàn tất gửi thông tin đăng ký. Ban Tổ Chức đã tiếp nhận thành công!'}
            </p>
          </div>

          <div className="p-6 sm:p-8 space-y-6">
            {/* Registration Pass / QR Code Box */}
            <div className="bg-slate-50 p-6 rounded-3xl border border-slate-200 text-center space-y-4 shadow-xs">
              <span className="text-[10px] font-black uppercase text-indigo-600 tracking-wider block">
                MÃ ĐĂNG KÝ / CHECK-IN ĐIỆN TỬ
              </span>

              <div className="text-2xl font-black font-mono text-pink-600 tracking-wider">
                {submittedResult.submissionCode}
              </div>

              <div className="p-3 bg-white rounded-2xl border border-slate-200 inline-block shadow-sm">
                <img
                  src={`https://api.qrserver.com/v1/create-qr-code/?size=180x180&data=${encodeURIComponent(qrValue)}`}
                  alt="QR Code Checkin"
                  className="w-40 h-40 object-contain mx-auto"
                />
              </div>

              <p className="text-[11px] text-slate-500 max-w-sm mx-auto">
                Quý vị vui lòng lưu lại mã này hoặc chụp ảnh màn hình để làm thủ tục check-in nhận thẻ đeo tại bàn tiếp đón.
              </p>
            </div>

            {/* Submitted Summary */}
            <div className="bg-white rounded-2xl border border-slate-200 p-4 space-y-2 text-xs">
              <div className="flex justify-between border-b border-slate-100 pb-2">
                <span className="text-slate-500">Biểu mẫu:</span>
                <span className="font-extrabold text-slate-900">{submittedResult.formTitle}</span>
              </div>
              {submittedResult.fullName && (
                <div className="flex justify-between border-b border-slate-100 pb-2">
                  <span className="text-slate-500">Họ và tên:</span>
                  <span className="font-bold text-slate-900">{submittedResult.fullName}</span>
                </div>
              )}
              {submittedResult.phone && (
                <div className="flex justify-between border-b border-slate-100 pb-2">
                  <span className="text-slate-500">Số điện thoại:</span>
                  <span className="font-mono font-bold text-slate-900">{submittedResult.phone}</span>
                </div>
              )}
              {submittedResult.email && (
                <div className="flex justify-between border-b border-slate-100 pb-2">
                  <span className="text-slate-500">Email:</span>
                  <span className="font-mono text-slate-700">{submittedResult.email}</span>
                </div>
              )}
              <div className="flex justify-between pt-1">
                <span className="text-slate-500">Trạng thái thanh toán:</span>
                <span className="font-extrabold text-emerald-600">
                  {submittedResult.paymentStatus === 'paid' ? '✓ Đã nhận biên lai' : submittedResult.paymentStatus === 'free' ? 'Miễn phí' : 'Chờ đối soát'}
                </span>
              </div>
            </div>

            {/* Action buttons */}
            <div className="flex flex-col sm:flex-row gap-3 pt-2">
              <button
                type="button"
                onClick={() => window.print()}
                className="flex-1 py-3 bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold text-xs rounded-xl flex items-center justify-center gap-2 cursor-pointer transition-all border border-slate-200"
              >
                <Printer className="w-4 h-4" />
                <span>In / Lưu Xác Nhận</span>
              </button>
              {onNavigate && (
                <button
                  type="button"
                  onClick={() => onNavigate('event-details')}
                  className="flex-1 py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-extrabold text-xs rounded-xl flex items-center justify-center gap-2 cursor-pointer transition-all shadow-md shadow-indigo-600/20 border-0"
                >
                  <ArrowLeft className="w-4 h-4" />
                  <span>Về Trang Sự Kiện</span>
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  }

  // VietQR URL for payment box
  const vietQrUrl = form.isFeeRequired && form.feeAmount ? (
    `https://api.vietqr.io/image/${form.bankName?.split(' ')[0] || 'MB'}-${form.bankAccount || '10112026'}-compact.jpg?amount=${form.feeAmount}&addInfo=${encodeURIComponent(tempSubmissionCode)}&accountName=${encodeURIComponent(form.bankAccountName || 'BAN TO CHUC VSAPS')}`
  ) : null;

  return (
    <div className="min-h-screen bg-slate-100 py-6 sm:py-12 px-4 sm:px-6">
      <div className="max-w-3xl mx-auto space-y-6">
        {/* Back navigation button if available */}
        {onNavigate && (
          <button
            onClick={() => onNavigate('event-details')}
            className="inline-flex items-center gap-2 text-xs font-bold text-slate-600 hover:text-indigo-600 transition-colors cursor-pointer"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Quay lại Trang Tin Sự Kiện</span>
          </button>
        )}

        {/* Main Form Card */}
        <div className="bg-white rounded-3xl overflow-hidden border border-slate-200 shadow-xl text-slate-900">
          {/* Banner */}
          {form.bannerUrl ? (
            <div className="h-48 sm:h-64 w-full relative overflow-hidden bg-slate-900">
              <img src={form.bannerUrl} alt={form.title} className="w-full h-full object-cover" />
              <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/40 to-transparent" />
              <div className="absolute bottom-5 left-6 right-6 text-white space-y-1.5">
                <div className="inline-flex items-center gap-2 px-2.5 py-0.5 rounded-full bg-pink-500/80 text-white text-[10.5px] font-black uppercase tracking-wider backdrop-blur-xs">
                  <span>HỘI NGHỊ VSAPS 2026</span>
                </div>
                <h1 className="text-xl sm:text-2xl font-black leading-snug tracking-tight">{form.title}</h1>
              </div>
            </div>
          ) : (
            <div className="bg-gradient-to-r from-indigo-950 via-slate-900 to-indigo-900 p-6 sm:p-8 text-white space-y-2">
              <div className="inline-flex items-center gap-2 px-2.5 py-0.5 rounded-full bg-pink-500/30 text-pink-300 text-[10.5px] font-black uppercase tracking-wider border border-pink-500/40">
                <span>HỘI NGHỊ VSAPS 2026</span>
              </div>
              <h1 className="text-xl sm:text-2xl font-black leading-snug tracking-tight">{form.title}</h1>
            </div>
          )}

          {/* Description & Metadata bar */}
          <div className="p-6 sm:p-8 space-y-6">
            {form.description && (
              <p className="text-xs sm:text-sm text-slate-600 leading-relaxed bg-slate-50 p-4 rounded-2xl border border-slate-100">
                {form.description}
              </p>
            )}

            {/* Event Details Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 pt-2 text-xs">
              {form.isFeeRequired && (
                <div className="p-3 bg-emerald-50/70 border border-emerald-100 rounded-2xl">
                  <span className="text-[10px] font-bold text-emerald-800 uppercase block">Lệ Phí Tham Dự:</span>
                  <span className="text-sm font-black text-emerald-700 mt-0.5 block">
                    {(form.feeAmount || 0).toLocaleString('vi-VN')} đ
                  </span>
                </div>
              )}

              {form.deadline && (
                <div className="p-3 bg-amber-50/70 border border-amber-100 rounded-2xl">
                  <span className="text-[10px] font-bold text-amber-800 uppercase block">Hạn Chót Đăng Ký:</span>
                  <span className="text-xs font-bold text-amber-900 mt-0.5 block">
                    {new Date(form.deadline).toLocaleDateString('vi-VN')}
                  </span>
                </div>
              )}

              {form.maxSubmissions && (
                <div className="p-3 bg-pink-50/70 border border-pink-100 rounded-2xl">
                  <span className="text-[10px] font-bold text-pink-800 uppercase block">Giới Hạn Số Lượng:</span>
                  <span className="text-xs font-bold text-pink-900 mt-0.5 block">
                    Tối đa {form.maxSubmissions} đại biểu
                  </span>
                </div>
              )}
            </div>

            {/* Notice if form is not open */}
            {!availability.isOpen ? (
              <div className="p-6 bg-amber-50 border border-amber-200 rounded-2xl text-center space-y-3">
                <AlertTriangle className="w-8 h-8 text-amber-600 mx-auto" />
                <h3 className="text-sm font-extrabold text-amber-950">Thông Báo Đóng Đăng Ký</h3>
                <p className="text-xs text-amber-800">{availability.reason}</p>
                {onNavigate && (
                  <button
                    onClick={() => onNavigate('event-details')}
                    className="px-4 py-2 bg-indigo-600 text-white rounded-xl text-xs font-bold cursor-pointer"
                  >
                    Xem Các Hoạt Động Khác
                  </button>
                )}
              </div>
            ) : (
              /* Registration Form Inputs */
              <form onSubmit={handleSubmit} className="space-y-6 pt-4 border-t border-slate-100">
                <div className="space-y-4">
                  {form.fields.map((f) => {
                    // Section Divider Heading
                    if (f.type === 'section') {
                      return (
                        <div key={f.id} className="pt-4 border-t border-slate-200">
                          <h3 className="text-xs sm:text-sm font-black uppercase text-indigo-950 tracking-wider flex items-center gap-2">
                            <span className="w-2 h-4 bg-pink-600 rounded-full" />
                            <span>{f.label}</span>
                          </h3>
                        </div>
                      );
                    }

                    const hasError = !!errors[f.key];

                    return (
                      <div key={f.id} className={`space-y-1.5 ${f.width === 'half' ? 'sm:w-1/2 sm:inline-block sm:pr-2 align-top' : ''}`}>
                        <label className="block text-xs font-bold text-slate-800">
                          {f.label} {f.required && <span className="text-rose-500">*</span>}
                        </label>

                        {/* Input Type Renderers */}
                        {f.type === 'text' || f.type === 'phone' || f.type === 'email' || f.type === 'number' ? (
                          <input
                            type={f.type === 'number' ? 'number' : f.type === 'email' ? 'email' : 'text'}
                            value={formData[f.key] || ''}
                            onChange={(e) => handleInputChange(f.key, e.target.value)}
                            placeholder={f.placeholder || `Nhập ${f.label.toLowerCase()}...`}
                            className={`w-full px-3.5 py-2.5 border rounded-xl text-xs focus:outline-none transition-all ${
                              hasError 
                                ? 'border-rose-400 bg-rose-50/30 focus:border-rose-500' 
                                : 'border-slate-200 focus:border-indigo-500 bg-white'
                            }`}
                          />
                        ) : f.type === 'textarea' ? (
                          <textarea
                            rows={3}
                            value={formData[f.key] || ''}
                            onChange={(e) => handleInputChange(f.key, e.target.value)}
                            placeholder={f.placeholder || 'Nhập nội dung...'}
                            className={`w-full px-3.5 py-2.5 border rounded-xl text-xs focus:outline-none transition-all ${
                              hasError 
                                ? 'border-rose-400 bg-rose-50/30 focus:border-rose-500' 
                                : 'border-slate-200 focus:border-indigo-500 bg-white'
                            }`}
                          />
                        ) : f.type === 'select' ? (
                          <select
                            value={formData[f.key] || ''}
                            onChange={(e) => handleInputChange(f.key, e.target.value)}
                            className={`w-full px-3.5 py-2.5 border rounded-xl text-xs font-medium focus:outline-none transition-all bg-white cursor-pointer ${
                              hasError 
                                ? 'border-rose-400 bg-rose-50/30 focus:border-rose-500' 
                                : 'border-slate-200 focus:border-indigo-500'
                            }`}
                          >
                            <option value="">-- {f.placeholder || 'Vui lòng chọn'} --</option>
                            {(f.options || []).map((opt, oi) => (
                              <option key={oi} value={opt}>{opt}</option>
                            ))}
                          </select>
                        ) : f.type === 'radio' ? (
                          <div className="space-y-2 pt-1">
                            {(f.options || []).map((opt, oi) => (
                              <label key={oi} className="flex items-center gap-2.5 text-xs text-slate-700 cursor-pointer">
                                <input
                                  type="radio"
                                  name={f.key}
                                  value={opt}
                                  checked={formData[f.key] === opt}
                                  onChange={() => handleInputChange(f.key, opt)}
                                  className="w-4 h-4 text-pink-600 focus:ring-pink-500"
                                />
                                <span>{opt}</span>
                              </label>
                            ))}
                          </div>
                        ) : f.type === 'checkbox' ? (
                          <div className="space-y-2 pt-1">
                            {(f.options || []).map((opt, oi) => {
                              const currentVals: string[] = formData[f.key] || [];
                              const isChecked = currentVals.includes(opt);
                              return (
                                <label key={oi} className="flex items-center gap-2.5 text-xs text-slate-700 cursor-pointer">
                                  <input
                                    type="checkbox"
                                    checked={isChecked}
                                    onChange={(e) => {
                                      if (e.target.checked) {
                                        handleInputChange(f.key, [...currentVals, opt]);
                                      } else {
                                        handleInputChange(f.key, currentVals.filter(v => v !== opt));
                                      }
                                    }}
                                    className="w-4 h-4 text-pink-600 rounded focus:ring-pink-500"
                                  />
                                  <span>{opt}</span>
                                </label>
                              );
                            })}
                          </div>
                        ) : f.type === 'date' ? (
                          <input
                            type="date"
                            value={formData[f.key] || ''}
                            onChange={(e) => handleInputChange(f.key, e.target.value)}
                            className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl text-xs focus:outline-none focus:border-indigo-500 bg-white"
                          />
                        ) : f.type === 'file' ? (
                          <div className="space-y-2">
                            {formData[f.key] ? (
                              <div className="p-3 bg-emerald-50 rounded-2xl border border-emerald-200 flex items-center justify-between">
                                <div className="flex items-center gap-2 text-xs text-emerald-800 font-bold">
                                  <Check className="w-4 h-4 text-emerald-600" />
                                  <span>Đã tải lên tệp đính kèm thành công</span>
                                </div>
                                <button
                                  type="button"
                                  onClick={() => handleInputChange(f.key, '')}
                                  className="text-xs text-rose-600 font-bold hover:underline cursor-pointer"
                                >
                                  Thay đổi
                                </button>
                              </div>
                            ) : (
                              <div className="p-4 border-2 border-dashed border-slate-300 hover:border-indigo-500 rounded-2xl text-center bg-slate-50 transition-all cursor-pointer">
                                <input
                                  type="file"
                                  id={`file-input-${f.key}`}
                                  accept="image/*,.pdf"
                                  onChange={(e) => {
                                    if (e.target.files && e.target.files[0]) {
                                      handleFileUpload(f.key, e.target.files[0]);
                                    }
                                  }}
                                  className="hidden"
                                />
                                <label htmlFor={`file-input-${f.key}`} className="cursor-pointer block space-y-1">
                                  <Upload className="w-6 h-6 text-slate-400 mx-auto" />
                                  <span className="text-xs font-bold text-slate-700 block">Nhấp để chọn ảnh / tệp tải lên</span>
                                  <span className="text-[10.5px] text-slate-400 block">Định dạng JPG, PNG hoặc PDF (Tối đa 5MB)</span>
                                </label>
                              </div>
                            )}
                          </div>
                        ) : null}

                        {f.helpText && (
                          <p className="text-[10.5px] text-slate-500 mt-1">{f.helpText}</p>
                        )}

                        {hasError && (
                          <p className="text-[11px] text-rose-500 font-bold mt-1 animate-fadeIn">
                            ⚠️ {errors[f.key]}
                          </p>
                        )}
                      </div>
                    );
                  })}
                </div>

                {/* VietQR Bank Transfer Box if fee required */}
                {form.isFeeRequired && form.feeAmount && (
                  <div className="p-5 sm:p-6 bg-slate-900 text-white rounded-3xl space-y-4 shadow-lg">
                    <div className="flex items-center gap-2">
                      <DollarSign className="w-5 h-5 text-amber-400" />
                      <h3 className="text-sm font-black uppercase tracking-wider">Thông Tin Chuyển Khoản Lệ Phí (VietQR)</h3>
                    </div>

                    <div className="flex flex-col sm:flex-row items-center gap-5">
                      {vietQrUrl && (
                        <div className="p-2 bg-white rounded-2xl shrink-0 shadow-md">
                          <img
                            src={vietQrUrl}
                            alt="VietQR Code"
                            className="w-40 h-40 object-contain rounded-xl"
                          />
                        </div>
                      )}

                      <div className="space-y-2 text-xs flex-1">
                        <div>
                          <span className="text-slate-400 text-[11px] block">Số tiền thanh toán:</span>
                          <span className="text-lg font-black text-amber-400">
                            {form.feeAmount.toLocaleString('vi-VN')} đ
                          </span>
                        </div>

                        <div>
                          <span className="text-slate-400 text-[11px] block">Ngân hàng thụ hưởng:</span>
                          <span className="font-bold text-white">{form.bankName || 'MB Bank (Ngân hàng Quân Đội)'}</span>
                        </div>

                        <div>
                          <span className="text-slate-400 text-[11px] block">Số tài khoản:</span>
                          <div className="flex items-center gap-2 mt-0.5">
                            <span className="font-mono text-base font-extrabold text-white tracking-wider">
                              {form.bankAccount || '10112026'}
                            </span>
                            <button
                              type="button"
                              onClick={() => {
                                navigator.clipboard.writeText(form.bankAccount || '10112026');
                                setCopiedBank(true);
                                setTimeout(() => setCopiedBank(false), 2000);
                              }}
                              className="px-2 py-0.5 bg-slate-800 hover:bg-slate-700 rounded text-[10px] text-slate-300 font-mono cursor-pointer"
                            >
                              {copiedBank ? 'Đã chép!' : 'Chép STK'}
                            </button>
                          </div>
                        </div>

                        <div>
                          <span className="text-slate-400 text-[11px] block">Nội dung chuyển khoản (Memo):</span>
                          <div className="flex items-center gap-2 mt-0.5">
                            <span className="font-mono font-bold text-pink-400 bg-slate-800 px-2 py-0.5 rounded">
                              {tempSubmissionCode}
                            </span>
                            <button
                              type="button"
                              onClick={() => {
                                navigator.clipboard.writeText(tempSubmissionCode);
                                setCopiedMemo(true);
                                setTimeout(() => setCopiedMemo(false), 2000);
                              }}
                              className="px-2 py-0.5 bg-slate-800 hover:bg-slate-700 rounded text-[10px] text-slate-300 font-mono cursor-pointer"
                            >
                              {copiedMemo ? 'Đã chép!' : 'Chép nội dung'}
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* Submit button */}
                <div className="pt-4 border-t border-slate-100">
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="w-full py-3.5 rounded-2xl bg-gradient-to-r from-pink-600 to-rose-600 hover:from-pink-500 hover:to-rose-500 text-white font-black text-sm uppercase tracking-wider flex items-center justify-center gap-2 cursor-pointer shadow-lg shadow-pink-600/30 transition-all border-0 disabled:opacity-60"
                  >
                    {isSubmitting ? (
                      <span>Đang Xử Lý Gửi Đơn...</span>
                    ) : (
                      <>
                        <Send className="w-4 h-4" />
                        <span>{form.submitButtonText || 'Xác Nhận Gửi Đơn Đăng Ký'}</span>
                      </>
                    )}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
