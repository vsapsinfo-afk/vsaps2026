/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useRef, useEffect, useCallback } from 'react';
import { 
  Download, Share2, Upload, ZoomIn, ZoomOut, RotateCw, 
  Move, Check, Copy, Sparkles, RefreshCw, Facebook, Smartphone,
  ArrowLeft, ArrowUp, ArrowDown, ExternalLink, CheckCircle2, ShieldCheck,
  Image as ImageIcon, Link as LinkIcon, Layers
} from 'lucide-react';
import { store } from '../dataStore';
import { CustomRegistrationForm } from '../types';

interface PublicPosterGeneratorProps {
  onNavigate?: (view: string) => void;
}

const POPULAR_ROLES = [
  'Bác sĩ PTTM',
  'Đại biểu tham dự',
  'Báo cáo viên',
  'Học viên chuyên khoa',
  'Trưởng khoa PTTM',
  'Khách mời danh dự'
];

export default function PublicPosterGenerator({ onNavigate }: PublicPosterGeneratorProps) {
  // Read query params from URL
  const queryParams = new URLSearchParams(window.location.search);
  const initialName = queryParams.get('name') || queryParams.get('fullName') || '';
  const initialRole = queryParams.get('role') || queryParams.get('title') || 'Đại biểu tham dự';
  const initialFormId = queryParams.get('formId') || queryParams.get('id') || '';
  const initialFormSlug = queryParams.get('form') || queryParams.get('slug') || '';

  const [forms, setForms] = useState<CustomRegistrationForm[]>([]);
  const [selectedFormId, setSelectedFormId] = useState<string>('');

  const [fullName, setFullName] = useState(initialName);
  const [titleRole, setTitleRole] = useState(initialRole);
  const [userImageSrc, setUserImageSrc] = useState<string | null>(null);
  const [zoom, setZoom] = useState(1);
  const [panX, setPanX] = useState(0);
  const [panY, setPanY] = useState(0);
  const [rotation, setRotation] = useState(0);
  const [isCopied, setIsCopied] = useState(false);
  const [isCopiedLink, setIsCopiedLink] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Dragging state for interactive pan on circle
  const isDraggingRef = useRef(false);
  const dragStartRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });
  const panStartRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });

  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const templateImgRef = useRef<HTMLImageElement | null>(null);
  const userImgRef = useRef<HTMLImageElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // Load forms on mount and select matching form
  useEffect(() => {
    const allForms = store.getCustomForms();
    setForms(allForms);

    if (initialFormId) {
      const found = allForms.find(f => f.id === initialFormId);
      if (found) setSelectedFormId(found.id);
    } else if (initialFormSlug) {
      const found = allForms.find(f => f.slug === initialFormSlug || f.id === initialFormSlug);
      if (found) setSelectedFormId(found.id);
    }
  }, [initialFormId, initialFormSlug]);

  const activeForm = forms.find(f => f.id === selectedFormId);
  const templateUrl = activeForm?.posterTemplateUrl || '/poster-template-default.jpg';
  const circleX = activeForm?.posterCircleX ?? 745;
  const circleY = activeForm?.posterCircleY ?? 235.5;
  const circleRadius = activeForm?.posterCircleRadius ?? 96;
  const nameColor = activeForm?.posterNameColor ?? '#b22f65';
  const roleColor = activeForm?.posterRoleColor ?? '#3e5891';

  const handleFormChange = (formId: string) => {
    setSelectedFormId(formId);
    try {
      const url = new URL(window.location.href);
      if (formId) {
        url.searchParams.set('formId', formId);
        url.searchParams.delete('form');
        url.searchParams.delete('slug');
      } else {
        url.searchParams.delete('formId');
        url.searchParams.delete('form');
        url.searchParams.delete('slug');
      }
      window.history.replaceState({}, '', url.toString());
    } catch (e) {
      // ignore in environments without history api
    }
  };

  // Render poster on canvas (defined before effects to avoid TDZ reference errors)
  const renderPoster = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Use 2x resolution for crisp high-dpi text and graphics (2048 x 1364)
    const baseW = 1024;
    const baseH = 682;
    const scale = 2;
    canvas.width = baseW * scale;
    canvas.height = baseH * scale;

    // 1. Draw template background
    if (templateImgRef.current) {
      ctx.drawImage(templateImgRef.current, 0, 0, canvas.width, canvas.height);
    } else {
      ctx.fillStyle = '#f8fafc';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
    }

    // Circle parameters on 1024x682 coordinate system
    const cx = circleX;
    const cy = circleY;
    const innerRadius = circleRadius;

    // 2. Draw user photo inside the circle with clipping
    ctx.save();
    ctx.beginPath();
    ctx.arc(cx * scale, cy * scale, innerRadius * scale, 0, Math.PI * 2);
    ctx.closePath();
    ctx.clip();

    // Fill circle base
    ctx.fillStyle = '#ffffff';
    ctx.fill();

    const uImg = userImgRef.current;
    if (uImg) {
      ctx.save();
      // Translate to the center of the circle, applying pan offsets
      ctx.translate((cx + panX) * scale, (cy + panY) * scale);
      ctx.rotate((rotation * Math.PI) / 180);
      ctx.scale(zoom, zoom);

      // Fit aspect ratio
      const imgAspect = uImg.width / uImg.height;
      let drawW = (innerRadius * 2) * scale;
      let drawH = (innerRadius * 2) * scale;
      if (imgAspect > 1) {
        drawW = drawH * imgAspect;
      } else {
        drawH = drawW / imgAspect;
      }

      ctx.drawImage(uImg, -drawW / 2, -drawH / 2, drawW, drawH);
      ctx.restore();
    } else {
      // Placeholder illustration inside circle
      ctx.fillStyle = '#f1f5f9';
      ctx.fillRect((cx - innerRadius) * scale, (cy - innerRadius) * scale, (innerRadius * 2) * scale, (innerRadius * 2) * scale);
      
      // Camera / avatar icon silhouette
      ctx.fillStyle = '#cbd5e1';
      ctx.beginPath();
      ctx.arc(cx * scale, (cy - 10) * scale, 34 * scale, 0, Math.PI * 2);
      ctx.fill();

      ctx.beginPath();
      ctx.arc(cx * scale, (cy + 65) * scale, 55 * scale, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = '#64748b';
      ctx.font = `bold ${11 * scale}px "Inter", sans-serif`;
      ctx.textAlign = 'center';
      ctx.fillText('CHẠM ĐỂ CHỌN ẢNH', cx * scale, (cy + 4) * scale);
    }
    ctx.restore();

    // 3. Render Full Name ("HỌ VÀ TÊN")
    const displayName = (fullName || 'HỌ VÀ TÊN ĐẠI BIỂU').trim().toUpperCase();
    ctx.textAlign = 'center';
    ctx.textBaseline = 'alphabetic';
    ctx.fillStyle = nameColor;

    // Dynamic font size scaling so long names don't overflow
    let nameFontSize = 24 * scale;
    ctx.font = `900 ${nameFontSize}px "Inter", "Montserrat", "Segoe UI", sans-serif`;
    const maxTextWidth = 340 * scale;
    while (ctx.measureText(displayName).width > maxTextWidth && nameFontSize > 15 * scale) {
      nameFontSize -= 1 * scale;
      ctx.font = `900 ${nameFontSize}px "Inter", "Montserrat", "Segoe UI", sans-serif`;
    }
    ctx.fillText(displayName, cx * scale, (cy + innerRadius + 36.5) * scale);

    // 4. Render Role / Title ("CHỨC VỤ")
    const displayRole = (titleRole || 'ĐẠI BIỂU THAM DỰ').trim().toUpperCase();
    ctx.fillStyle = roleColor;
    let roleFontSize = 14 * scale;
    ctx.font = `bold ${roleFontSize}px "Inter", "Montserrat", "Segoe UI", sans-serif`;
    while (ctx.measureText(displayRole).width > maxTextWidth && roleFontSize > 11 * scale) {
      roleFontSize -= 0.5 * scale;
      ctx.font = `bold ${roleFontSize}px "Inter", "Montserrat", "Segoe UI", sans-serif`;
    }
    ctx.fillText(displayRole, cx * scale, (cy + innerRadius + 62.5) * scale);

  }, [fullName, titleRole, zoom, panX, panY, rotation, circleX, circleY, circleRadius, nameColor, roleColor]);

  // Load template image
  useEffect(() => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.src = templateUrl;
    img.onload = () => {
      templateImgRef.current = img;
      renderPoster();
    };
    img.onerror = () => {
      if (templateUrl !== '/poster-template-default.jpg') {
        const fallback = new Image();
        fallback.crossOrigin = 'anonymous';
        fallback.src = '/poster-template-default.jpg';
        fallback.onload = () => {
          templateImgRef.current = fallback;
          renderPoster();
        };
      }
    };
  }, [templateUrl, renderPoster]);

  // Handle uploaded user image
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      const reader = new FileReader();
      reader.onload = (event) => {
        const src = event.target?.result as string;
        setUserImageSrc(src);
        setZoom(1);
        setPanX(0);
        setPanY(0);
        setRotation(0);

        const uImg = new Image();
        uImg.onload = () => {
          userImgRef.current = uImg;
          renderPoster();
        };
        uImg.src = src;
      };
      reader.readAsDataURL(file);
    }
  };

  // Re-render when any dependency changes
  useEffect(() => {
    renderPoster();
  }, [renderPoster]);

  // Interactive mouse/touch dragging on circle
  const handlePointerDown = (clientX: number, clientY: number) => {
    if (!userImageSrc) return;
    isDraggingRef.current = true;
    dragStartRef.current = { x: clientX, y: clientY };
    panStartRef.current = { x: panX, y: panY };
  };

  const handlePointerMove = (clientX: number, clientY: number) => {
    if (!isDraggingRef.current) return;
    const dx = clientX - dragStartRef.current.x;
    const dy = clientY - dragStartRef.current.y;
    setPanX(Math.round(panStartRef.current.x + dx * 0.6));
    setPanY(Math.round(panStartRef.current.y + dy * 0.6));
  };

  const handlePointerUp = () => {
    isDraggingRef.current = false;
  };

  // Toast notification helper
  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

  // 1. Download Poster Image
  const handleDownload = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    setIsGenerating(true);
    const dataUrl = canvas.toDataURL('image/png', 1.0);
    const link = document.createElement('a');
    const safeName = (fullName || 'Dai_Bieu').replace(/\s+/g, '_');
    link.download = `Poster_VSAPS_2026_${safeName}.png`;
    link.href = dataUrl;
    link.click();
    setIsGenerating(false);
    showToast('✓ Đã tải ảnh Poster về thiết bị thành công!');
  };

  // 2. Copy Image to Clipboard
  const handleCopyImage = async () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    try {
      canvas.toBlob(async (blob) => {
        if (!blob) return;
        await navigator.clipboard.write([
          new ClipboardItem({ 'image/png': blob })
        ]);
        setIsCopied(true);
        showToast('✓ Đã sao chép ảnh Poster vào bộ nhớ tạm! Bạn có thể dán (Ctrl+V) vào Zalo / Facebook.');
        setTimeout(() => setIsCopied(false), 3000);
      }, 'image/png');
    } catch (err) {
      console.warn('Clipboard write failed:', err);
      handleDownload();
    }
  };

  const getShareUrl = () => {
    const params = new URLSearchParams();
    params.set('view', 'poster');
    if (selectedFormId) params.set('formId', selectedFormId);
    return `${window.location.origin}${window.location.pathname}?${params.toString()}`;
  };

  // 3. Copy Link to this Poster Generator
  const handleCopyPageLink = () => {
    const baseUrl = window.location.origin + window.location.pathname;
    const params = new URLSearchParams();
    params.set('view', 'poster');
    if (selectedFormId) params.set('formId', selectedFormId);
    if (fullName) params.set('name', fullName);
    if (titleRole) params.set('role', titleRole);
    const shareUrl = `${baseUrl}?${params.toString()}`;
    
    navigator.clipboard.writeText(shareUrl);
    setIsCopiedLink(true);
    showToast('✓ Đã sao chép đường dẫn tạo poster! Bạn có thể gửi cho bạn bè hoặc đại biểu khác.');
    setTimeout(() => setIsCopiedLink(false), 3000);
  };

  // 4. Share to Zalo
  const handleShareZalo = () => {
    const shareUrl = getShareUrl();
    const eventName = activeForm?.title || 'Hội nghị Khoa học Thường niên VSAPS 2026';
    const zaloUrl = `https://zalo.me/share?url=${encodeURIComponent(shareUrl)}&title=${encodeURIComponent(`Tôi tham dự ${eventName} - ${fullName}`)}`;
    window.open(zaloUrl, '_blank', 'noopener,noreferrer,width=600,height=500');
    showToast('💡 Đang mở Zalo. Đừng quên lưu ảnh poster hoặc sao chép ảnh để đính kèm vào bài viết nhé!');
  };

  // 5. Share to Facebook
  const handleShareFacebook = async () => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    // Check if Web Share API with files is available (mobile browser)
    if (navigator.share && navigator.canShare) {
      try {
        canvas.toBlob(async (blob) => {
          if (!blob) return;
          const file = new File([blob], `Poster_VSAPS_2026_${fullName || 'DaiBieu'}.png`, { type: 'image/png' });
          if (navigator.canShare({ files: [file] })) {
            await navigator.share({
              title: `Poster Tham Dự - ${activeForm?.title || 'VSAPS 2026'}`,
              text: `Tôi tham dự ${activeForm?.title || 'Hội nghị Khoa học Thường niên VSAPS lần thứ 10 (2026)'} - ${fullName}!`,
              files: [file]
            });
            return;
          } else {
            fallbackFacebookShare();
          }
        }, 'image/png');
        return;
      } catch (err) {
        console.log('Native share canceled or failed:', err);
      }
    }
    fallbackFacebookShare();
  };

  const fallbackFacebookShare = () => {
    const shareUrl = getShareUrl();
    const fbUrl = `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(shareUrl)}`;
    window.open(fbUrl, '_blank', 'noopener,noreferrer,width=650,height=600');
    showToast('💡 Đang mở Facebook. Hãy lưu ảnh Poster về máy để đăng kèm bài viết nhé!');
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-100 via-indigo-50/30 to-slate-100 py-6 px-3 sm:px-6 font-sans text-slate-800">
      <div className="max-w-6xl mx-auto space-y-5">
        
        {/* Top Navbar / Header */}
        <div className="bg-white/90 backdrop-blur-md border border-slate-200/80 rounded-2xl p-4 shadow-sm flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            {onNavigate && (
              <button
                type="button"
                onClick={() => onNavigate('event-details')}
                className="px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl font-bold text-xs flex items-center gap-1.5 cursor-pointer transition-colors"
              >
                <ArrowLeft className="w-4 h-4" />
                <span className="hidden sm:inline">Trang Sự Kiện</span>
              </button>
            )}
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-pink-600 to-indigo-600 flex items-center justify-center text-white shadow-sm">
                <Sparkles className="w-4 h-4" />
              </div>
              <div>
                <h1 className="text-sm sm:text-base font-black tracking-tight text-slate-900 uppercase">
                  TẠO POSTER THAM DỰ HỘI NGHỊ VSAPS 2026
                </h1>
                <p className="text-[11px] text-slate-500 hidden sm:block">
                  Cá nhân hóa ảnh đại biểu, họ tên và chức vụ - Chia sẻ lên Facebook & Zalo
                </p>
              </div>
            </div>
          </div>

          {/* Copy link button */}
          <button
            type="button"
            onClick={handleCopyPageLink}
            className="px-3.5 py-2 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 font-bold text-xs rounded-xl flex items-center gap-1.5 cursor-pointer transition-all border border-indigo-200/60 ml-auto"
            title="Sao chép đường dẫn trực tiếp đến trang tạo poster này"
          >
            {isCopiedLink ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <LinkIcon className="w-3.5 h-3.5 text-indigo-600" />}
            <span>{isCopiedLink ? 'Đã Sao Chép Link!' : 'Sao Chép Link'}</span>
          </button>
        </div>

        {/* Toast Alert */}
        {toastMessage && (
          <div className="fixed top-5 left-1/2 -translate-x-1/2 z-50 px-5 py-3 bg-slate-900/95 text-white rounded-2xl shadow-2xl text-xs font-bold flex items-center gap-2.5 border border-slate-700 animate-fadeIn">
            <Sparkles className="w-4 h-4 text-pink-400 shrink-0" />
            <span>{toastMessage}</span>
          </div>
        )}

        {/* Main 2-Column Workspace */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          
          {/* Controls Column (Left) */}
          <div className="lg:col-span-5 space-y-4">
            
            {/* 0. Form & Template Selector Card */}
            {forms.length > 0 && (
              <div className="bg-white rounded-3xl p-5 border border-slate-200 shadow-sm space-y-3">
                <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                  <div className="flex items-center gap-2">
                    <span className="w-6 h-6 rounded-full bg-indigo-100 text-indigo-600 text-xs font-black flex items-center justify-center">
                      <Layers className="w-3.5 h-3.5" />
                    </span>
                    <h2 className="font-extrabold text-xs uppercase tracking-wider text-slate-800">Khung Mẫu Poster</h2>
                  </div>
                  {activeForm?.posterTemplateUrl ? (
                    <span className="px-2.5 py-0.5 rounded-full bg-pink-100 text-pink-700 text-[10px] font-black uppercase tracking-wider">
                      ★ Khung Mẫu Riêng
                    </span>
                  ) : (
                    <span className="px-2.5 py-0.5 rounded-full bg-slate-100 text-slate-600 text-[10px] font-bold">
                      Khung Mặc Định
                    </span>
                  )}
                </div>

                <div className="space-y-1.5">
                  <label className="text-[11px] font-bold text-slate-600 block">
                    Chọn Biểu Mẫu / Chuyên Đề:
                  </label>
                  <select
                    value={selectedFormId}
                    onChange={(e) => handleFormChange(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-800 focus:outline-none focus:border-indigo-500 cursor-pointer transition"
                  >
                    <option value="">Khung mẫu chung (Hội Nghị Khoa Học VSAPS 2026)</option>
                    {forms.map((f) => (
                      <option key={f.id} value={f.id}>
                        {f.title} {f.posterTemplateUrl ? '★ [Khung Riêng]' : ''}
                      </option>
                    ))}
                  </select>
                </div>

                {activeForm && (
                  <div className="p-2.5 bg-indigo-50/70 rounded-xl border border-indigo-100/80 text-[11px] flex items-center justify-between text-indigo-900">
                    <span className="truncate mr-2">Form: <strong>{activeForm.title}</strong></span>
                    <a
                      href={`/?view=custom-form&id=${activeForm.slug || activeForm.id}`}
                      target="_blank"
                      rel="noreferrer"
                      className="text-indigo-600 hover:text-indigo-800 font-extrabold shrink-0 inline-flex items-center gap-1 hover:underline"
                    >
                      Mở Form Đăng Ký <ExternalLink className="w-3 h-3" />
                    </a>
                  </div>
                )}
              </div>
            )}

            {/* 1. Name & Role Input Card */}
            <div className="bg-white rounded-3xl p-5 border border-slate-200 shadow-sm space-y-4">
              <div className="flex items-center gap-2 border-b border-slate-100 pb-3">
                <span className="w-6 h-6 rounded-full bg-pink-100 text-pink-600 text-xs font-black flex items-center justify-center">1</span>
                <h2 className="font-extrabold text-xs uppercase tracking-wider text-slate-800">Thông Tin Đại Biểu</h2>
              </div>

              {/* Full Name */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700 flex justify-between">
                  <span>Họ và Tên (*)</span>
                  <span className="text-[10.5px] text-pink-600 font-semibold">Tự động in hoa</span>
                </label>
                <input
                  type="text"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder="Ví dụ: BS. NGUYỄN VĂN A"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 focus:border-pink-500 focus:ring-2 focus:ring-pink-200 text-xs font-black uppercase text-slate-900 tracking-wide outline-none transition-all shadow-inner"
                />
              </div>

              {/* Title / Role */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700">Chức vụ / Danh xưng (*)</label>
                <input
                  type="text"
                  value={titleRole}
                  onChange={(e) => setTitleRole(e.target.value)}
                  placeholder="Ví dụ: Bác sĩ PTTM, Đại biểu tham dự..."
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 text-xs font-bold uppercase text-slate-900 tracking-wide outline-none transition-all shadow-inner"
                />
                
                {/* Popular Role Chips */}
                <div className="flex flex-wrap gap-1.5 pt-1">
                  {POPULAR_ROLES.map((role) => (
                    <button
                      key={role}
                      type="button"
                      onClick={() => setTitleRole(role)}
                      className={`px-2 py-1 rounded-lg text-[10.5px] font-semibold transition-all cursor-pointer ${
                        titleRole === role 
                          ? 'bg-indigo-600 text-white font-bold shadow-xs' 
                          : 'bg-slate-100 hover:bg-slate-200 text-slate-600'
                      }`}
                    >
                      {role}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* 2. Photo Upload & Circle Alignment Card */}
            <div className="bg-white rounded-3xl p-5 border border-slate-200 shadow-sm space-y-4">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <div className="flex items-center gap-2">
                  <span className="w-6 h-6 rounded-full bg-pink-100 text-pink-600 text-xs font-black flex items-center justify-center">2</span>
                  <h2 className="font-extrabold text-xs uppercase tracking-wider text-slate-800">Ảnh Chân Dung & Căn Chỉnh</h2>
                </div>
                {userImageSrc && (
                  <button
                    type="button"
                    onClick={() => {
                      setZoom(1);
                      setPanX(0);
                      setPanY(0);
                      setRotation(0);
                    }}
                    className="text-[11px] font-bold text-slate-500 hover:text-slate-800 flex items-center gap-1 cursor-pointer"
                  >
                    <RefreshCw className="w-3 h-3" />
                    <span>Đặt lại</span>
                  </button>
                )}
              </div>

              {/* Upload Button */}
              <input 
                type="file" 
                ref={fileInputRef} 
                onChange={handleFileChange} 
                accept="image/*" 
                className="hidden" 
              />
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className={`w-full py-3.5 px-4 rounded-2xl border-2 border-dashed flex items-center justify-center gap-3 font-bold text-xs cursor-pointer transition-all ${
                  userImageSrc 
                    ? 'border-emerald-300 bg-emerald-50/50 text-emerald-800 hover:bg-emerald-100/50' 
                    : 'border-pink-300 bg-pink-50/40 text-pink-700 hover:bg-pink-100/40 animate-pulse'
                }`}
              >
                <Upload className="w-5 h-5 text-pink-600" />
                <span>{userImageSrc ? 'Đổi ảnh chân dung khác' : 'Chọn ảnh chân dung tải lên (*)'}</span>
              </button>

              {/* Real-time Fine Tuning Controls */}
              {userImageSrc && (
                <div className="space-y-3.5 pt-1">
                  {/* Zoom Slider */}
                  <div className="space-y-1">
                    <div className="flex justify-between text-xs font-bold text-slate-600">
                      <span className="flex items-center gap-1">
                        <ZoomIn className="w-3.5 h-3.5 text-indigo-600" />
                        <span>Phóng to / Thu nhỏ:</span>
                      </span>
                      <span className="font-mono text-indigo-600 font-extrabold">{zoom.toFixed(1)}x</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <button 
                        type="button"
                        onClick={() => setZoom(z => Math.max(0.5, Number((z - 0.1).toFixed(1))))}
                        className="p-1 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 cursor-pointer"
                        title="Thu nhỏ"
                      >
                        <ZoomOut className="w-4 h-4" />
                      </button>
                      <input
                        type="range"
                        min="0.5"
                        max="3.0"
                        step="0.05"
                        value={zoom}
                        onChange={(e) => setZoom(parseFloat(e.target.value))}
                        className="flex-1 accent-indigo-600 cursor-pointer"
                      />
                      <button 
                        type="button"
                        onClick={() => setZoom(z => Math.min(3.0, Number((z + 0.1).toFixed(1))))}
                        className="p-1 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 cursor-pointer"
                        title="Phóng to"
                      >
                        <ZoomIn className="w-4 h-4" />
                      </button>
                    </div>
                  </div>

                  {/* Directional Vi-Chỉnh Buttons + Rotation */}
                  <div className="flex items-center justify-between gap-2 pt-1 border-t border-slate-100">
                    <div className="flex items-center gap-1">
                      <span className="text-[11px] font-bold text-slate-500 mr-1">Dịch chuyển:</span>
                      <button
                        type="button"
                        onClick={() => setPanX(x => x - 10)}
                        className="w-8 h-8 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 font-black text-xs flex items-center justify-center cursor-pointer shadow-xs"
                        title="Dịch sang trái"
                      >
                        ←
                      </button>
                      <div className="flex flex-col gap-1">
                        <button
                          type="button"
                          onClick={() => setPanY(y => y - 10)}
                          className="w-8 h-8 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 font-black text-xs flex items-center justify-center cursor-pointer shadow-xs"
                          title="Dịch lên trên"
                        >
                          ↑
                        </button>
                        <button
                          type="button"
                          onClick={() => setPanY(y => y + 10)}
                          className="w-8 h-8 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 font-black text-xs flex items-center justify-center cursor-pointer shadow-xs"
                          title="Dịch xuống dưới"
                        >
                          ↓
                        </button>
                      </div>
                      <button
                        type="button"
                        onClick={() => setPanX(x => x + 10)}
                        className="w-8 h-8 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 font-black text-xs flex items-center justify-center cursor-pointer shadow-xs"
                        title="Dịch sang phải"
                      >
                        →
                      </button>
                    </div>

                    {/* Rotate button */}
                    <button
                      type="button"
                      onClick={() => setRotation(r => (r + 90) % 360)}
                      className="px-3 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold flex items-center gap-1.5 cursor-pointer shadow-xs"
                      title="Xoay ảnh 90 độ"
                    >
                      <RotateCw className="w-3.5 h-3.5" />
                      <span>Xoay 90°</span>
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* 3. Action Buttons Card */}
            <div className="bg-white rounded-3xl p-5 border border-slate-200 shadow-sm space-y-2.5">
              <div className="flex items-center gap-2 border-b border-slate-100 pb-3">
                <span className="w-6 h-6 rounded-full bg-pink-100 text-pink-600 text-xs font-black flex items-center justify-center">3</span>
                <h2 className="font-extrabold text-xs uppercase tracking-wider text-slate-800">Tải Về & Chia Sẻ Mạng Xã Hội</h2>
              </div>

              {/* Download HD Button */}
              <button
                type="button"
                onClick={handleDownload}
                disabled={isGenerating}
                className="w-full py-3.5 bg-gradient-to-r from-pink-600 via-rose-600 to-indigo-600 hover:from-pink-700 hover:to-indigo-700 text-white font-black text-xs sm:text-sm rounded-2xl shadow-lg shadow-pink-600/25 flex items-center justify-center gap-2 cursor-pointer transition-all uppercase tracking-wider disabled:opacity-50"
              >
                <Download className="w-4 h-4" />
                <span>Tải Poster HD Về Máy (PNG 2K)</span>
              </button>

              {/* Copy image button */}
              <button
                type="button"
                onClick={handleCopyImage}
                className="w-full py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold text-xs rounded-xl flex items-center justify-center gap-2 cursor-pointer transition-all border border-slate-200"
              >
                {isCopied ? <Check className="w-4 h-4 text-emerald-600" /> : <Copy className="w-4 h-4 text-slate-600" />}
                <span>{isCopied ? 'Đã Sao Chép Ảnh!' : 'Sao Chép Ảnh Vào Bộ Nhớ Tạm'}</span>
              </button>

              {/* Social Share Buttons */}
              <div className="grid grid-cols-2 gap-2 pt-1">
                {/* Zalo Share */}
                <button
                  type="button"
                  onClick={handleShareZalo}
                  className="py-2.5 bg-[#0068ff] hover:bg-[#0055d4] text-white font-extrabold text-xs rounded-xl flex items-center justify-center gap-2 cursor-pointer transition-all shadow-md shadow-blue-500/20"
                >
                  <Smartphone className="w-4 h-4" />
                  <span>Chia Sẻ Zalo</span>
                </button>

                {/* Facebook Share */}
                <button
                  type="button"
                  onClick={handleShareFacebook}
                  className="py-2.5 bg-[#1877f2] hover:bg-[#1565c0] text-white font-extrabold text-xs rounded-xl flex items-center justify-center gap-2 cursor-pointer transition-all shadow-md shadow-blue-600/20"
                >
                  <Facebook className="w-4 h-4" />
                  <span>Chia Sẻ Facebook</span>
                </button>
              </div>
            </div>

          </div>

          {/* Live Preview Column (Right) */}
          <div className="lg:col-span-7 flex flex-col items-center space-y-3">
            <div className="w-full flex items-center justify-between px-1">
              <span className="text-[11px] font-black text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping" />
                <span>BẢN XEM TRƯỚC POSTER THỜI GIAN THỰC (HD 1024 × 682)</span>
              </span>
              <span className="text-[11px] font-bold text-pink-600">
                Xuất file Ultra HD 2048 × 1364 px
              </span>
            </div>

            {/* Canvas Container with Interactive Drag */}
            <div 
              className="relative w-full aspect-[1024/682] rounded-3xl overflow-hidden border-2 border-slate-300 shadow-2xl bg-slate-900 cursor-grab active:cursor-grabbing select-none"
              onMouseDown={(e) => handlePointerDown(e.clientX, e.clientY)}
              onMouseMove={(e) => handlePointerMove(e.clientX, e.clientY)}
              onMouseUp={handlePointerUp}
              onMouseLeave={handlePointerUp}
              onTouchStart={(e) => {
                if (e.touches[0]) {
                  handlePointerDown(e.touches[0].clientX, e.touches[0].clientY);
                }
              }}
              onTouchMove={(e) => {
                if (e.touches[0]) {
                  handlePointerMove(e.touches[0].clientX, e.touches[0].clientY);
                }
              }}
              onTouchEnd={handlePointerUp}
            >
              <canvas
                ref={canvasRef}
                className="w-full h-full object-contain block"
              />
            </div>

            {/* Hint Box */}
            <div className="w-full p-3.5 bg-white rounded-2xl border border-slate-200/80 shadow-xs flex items-center gap-3 text-xs text-slate-600">
              <div className="w-8 h-8 rounded-xl bg-pink-100 text-pink-600 flex items-center justify-center shrink-0">
                💡
              </div>
              <p className="text-[11.5px] leading-relaxed">
                <strong>Mẹo căn chỉnh:</strong> Bạn có thể dùng chuột hoặc ngón tay kéo trực tiếp trên ảnh trong ô tròn để điều chỉnh khuôn mặt vào đúng vị trí đẹp nhất trước khi tải ảnh về.
              </p>
            </div>
          </div>

        </div>

      </div>
    </div>
  );
}
