import React, { useState, useRef, useEffect, useCallback } from 'react';
import { 
  X, Download, Share2, Upload, ZoomIn, ZoomOut, RotateCw, 
  Move, Check, Copy, Sparkles, RefreshCw, Facebook, Smartphone, ExternalLink
} from 'lucide-react';

interface RegistrationPosterModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialName?: string;
  initialRole?: string;
  formTitle?: string;
  templateUrl?: string;
  circleX?: number;
  circleY?: number;
  circleRadius?: number;
  nameColor?: string;
  roleColor?: string;
  formId?: string;
  formSlug?: string;
}

const POPULAR_ROLES = [
  'Bác sĩ PTTM',
  'Đại biểu tham dự',
  'Báo cáo viên',
  'Học viên chuyên khoa',
  'Trưởng khoa PTTM'
];

export default function RegistrationPosterModal({
  isOpen,
  onClose,
  initialName = '',
  initialRole = 'Đại biểu tham dự',
  formTitle = 'HỘI NGHỊ VSAPS 2026',
  templateUrl = '/poster-template-default.jpg',
  circleX = 745,
  circleY = 235.5,
  circleRadius = 96,
  nameColor = '#b22f65',
  roleColor = '#3e5891',
  formId,
  formSlug
}: RegistrationPosterModalProps) {
  const [fullName, setFullName] = useState(initialName || '');
  const [titleRole, setTitleRole] = useState(initialRole || 'Đại biểu tham dự');
  const [userImageSrc, setUserImageSrc] = useState<string | null>(null);
  const [zoom, setZoom] = useState(1);
  const [panX, setPanX] = useState(0);
  const [panY, setPanY] = useState(0);
  const [rotation, setRotation] = useState(0);
  const [isCopied, setIsCopied] = useState(false);
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

  // Sync initial props
  useEffect(() => {
    if (initialName) setFullName(initialName);
  }, [initialName]);

  useEffect(() => {
    if (initialRole) setTitleRole(initialRole);
  }, [initialRole]);

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

  // Render poster on canvas
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
    const cx = circleX ?? 745;
    const cy = circleY ?? 235.5;
    const innerRadius = circleRadius ?? 96;

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
    ctx.fillStyle = nameColor || '#b22f65'; // Crimson rose or custom

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
    ctx.fillStyle = roleColor || '#3e5891'; // Slate navy blue or custom
    let roleFontSize = 14 * scale;
    ctx.font = `bold ${roleFontSize}px "Inter", "Montserrat", "Segoe UI", sans-serif`;
    while (ctx.measureText(displayRole).width > maxTextWidth && roleFontSize > 11 * scale) {
      roleFontSize -= 0.5 * scale;
      ctx.font = `bold ${roleFontSize}px "Inter", "Montserrat", "Segoe UI", sans-serif`;
    }
    ctx.fillText(displayRole, cx * scale, (cy + innerRadius + 62.5) * scale);

  }, [fullName, titleRole, zoom, panX, panY, rotation, circleX, circleY, circleRadius, nameColor, roleColor]);

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
    // Map screen movement to canvas scale (approx 0.5x sensitivity)
    setPanX(Math.round(panStartRef.current.x + dx * 0.6));
    setPanY(Math.round(panStartRef.current.y + dy * 0.6));
  };

  const handlePointerUp = () => {
    isDraggingRef.current = false;
  };

  // Toast notification helper
  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3000);
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
        showToast('✓ Đã sao chép ảnh Poster! Bạn có thể dán (Ctrl+V) vào Zalo hoặc Facebook.');
        setTimeout(() => setIsCopied(false), 2500);
      }, 'image/png');
    } catch (err) {
      showToast('⚠️ Không thể sao chép trực tiếp trên trình duyệt này. Vui lòng bấm Tải Về.');
    }
  };

  // 3. Share to Zalo
  const handleShareZalo = async () => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    // Try native Web Share with file on mobile
    if (navigator.canShare && navigator.share) {
      try {
        canvas.toBlob(async (blob) => {
          if (blob && navigator.canShare({ files: [new File([blob], 'poster-vsaps.png', { type: 'image/png' })] })) {
            const file = new File([blob], `Poster_VSAPS_${fullName || '2026'}.png`, { type: 'image/png' });
            await navigator.share({
              title: `Poster Đại Hội VSAPS 2026 - ${fullName}`,
              text: `Tôi đã đăng ký tham dự Đại Hội VSAPS 2026 - ${fullName} (${titleRole}). Cùng tham gia nhé!`,
              files: [file]
            });
            return;
          }
          openZaloWebShare();
        });
        return;
      } catch (e) {
        // Fallback to web share link
      }
    }
    openZaloWebShare();
  };

  const openZaloWebShare = () => {
    const pageUrl = window.location.href;
    const zaloUrl = `https://zalo.me/share?url=${encodeURIComponent(pageUrl)}&title=${encodeURIComponent(`Poster Đại Hội VSAPS 2026: ${fullName} - ${titleRole}`)}`;
    window.open(zaloUrl, '_blank', 'width=600,height=500');
  };

  // 4. Share to Facebook
  const handleShareFacebook = async () => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    if (navigator.canShare && navigator.share) {
      try {
        canvas.toBlob(async (blob) => {
          if (blob && navigator.canShare({ files: [new File([blob], 'poster-vsaps.png', { type: 'image/png' })] })) {
            const file = new File([blob], `Poster_VSAPS_${fullName || '2026'}.png`, { type: 'image/png' });
            await navigator.share({
              title: `Poster Đại Hội VSAPS 2026 - ${fullName}`,
              text: `Tôi đã đăng ký tham dự Đại Hội VSAPS 2026! Cùng tham gia nhé!`,
              files: [file]
            });
            return;
          }
          openFacebookWebShare();
        });
        return;
      } catch (e) {
        // Fallback to web share link
      }
    }
    openFacebookWebShare();
  };

  const openFacebookWebShare = () => {
    const pageUrl = window.location.href;
    const fbUrl = `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(pageUrl)}&quote=${encodeURIComponent(`Tôi đã đăng ký tham dự Đại Hội VSAPS 2026 - ${fullName} (${titleRole})!`)}`;
    window.open(fbUrl, '_blank', 'width=600,height=500');
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-3 sm:p-6 overflow-y-auto animate-fadeIn">
      <div className="bg-white rounded-3xl max-w-4xl w-full overflow-hidden border border-slate-200 shadow-2xl flex flex-col max-h-[95vh] text-slate-900">
        
        {/* Header */}
        <div className="bg-gradient-to-r from-pink-600 via-rose-600 to-indigo-700 p-4 sm:p-5 text-white flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-2xl bg-white/20 backdrop-blur-xs flex items-center justify-center shadow-inner">
              <Sparkles className="w-5 h-5 text-yellow-300" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-black tracking-tight leading-snug">
                TẠO POSTER THAM DỰ SỰ KIỆN VSAPS 2026
              </h2>
              <p className="text-[11px] text-pink-100 font-medium">
                Tải ảnh chân dung, căn chỉnh vào khung tròn và chia sẻ ngay lên Facebook & Zalo
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <a
              href={`/?view=poster${formId ? `&formId=${encodeURIComponent(formId)}` : (formSlug ? `&form=${encodeURIComponent(formSlug)}` : '')}${fullName ? `&name=${encodeURIComponent(fullName)}` : ''}${titleRole ? `&role=${encodeURIComponent(titleRole)}` : ''}`}
              target="_blank"
              rel="noopener noreferrer"
              className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/15 hover:bg-white/25 text-white text-xs font-semibold backdrop-blur-xs transition no-underline"
              title="Mở đường dẫn riêng cho tính năng tạo Poster"
            >
              <ExternalLink className="w-3.5 h-3.5" />
              <span>Mở Link Riêng</span>
            </a>
            <button
              onClick={onClose}
              className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/25 flex items-center justify-center text-white transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Modal Body: Controls & Live Preview */}
        <div className="p-4 sm:p-6 overflow-y-auto flex-1 grid grid-cols-1 lg:grid-cols-12 gap-6">
          
          {/* Controls Column (Left) */}
          <div className="lg:col-span-5 space-y-4">
            
            {/* Input: Họ và tên */}
            <div>
              <label className="block text-xs font-black text-slate-800 uppercase tracking-wide mb-1">
                Họ và Tên Trên Poster <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                placeholder="Nhập họ và tên đại biểu..."
                className="w-full px-3.5 py-2.5 border border-slate-300 rounded-xl text-xs font-bold text-slate-900 focus:outline-none focus:border-pink-500 bg-slate-50 uppercase"
              />
            </div>

            {/* Input: Chức vụ */}
            <div>
              <label className="block text-xs font-black text-slate-800 uppercase tracking-wide mb-1">
                Chức Vụ / Đơn Vị Công Tác <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                value={titleRole}
                onChange={(e) => setTitleRole(e.target.value)}
                placeholder="VD: Bác sĩ Phẫu thuật Tạo hình Thẩm mỹ..."
                className="w-full px-3.5 py-2.5 border border-slate-300 rounded-xl text-xs font-semibold text-slate-800 focus:outline-none focus:border-pink-500 bg-slate-50 uppercase"
              />
              
              {/* Quick Role Suggestions */}
              <div className="flex flex-wrap gap-1.5 mt-2">
                {POPULAR_ROLES.map((role) => (
                  <button
                    key={role}
                    type="button"
                    onClick={() => setTitleRole(role)}
                    className={`text-[10.5px] px-2 py-0.5 rounded-lg font-bold border transition-all cursor-pointer ${
                      titleRole.toUpperCase() === role.toUpperCase()
                        ? 'bg-pink-100 text-pink-700 border-pink-300 shadow-xs'
                        : 'bg-slate-100 hover:bg-slate-200 text-slate-600 border-slate-200'
                    }`}
                  >
                    {role}
                  </button>
                ))}
              </div>
            </div>

            {/* Upload Ảnh Chân Dung */}
            <div>
              <label className="block text-xs font-black text-slate-800 uppercase tracking-wide mb-1">
                Ảnh Chân Dung Đại Biểu <span className="text-rose-500">*</span>
              </label>
              <input
                type="file"
                ref={fileInputRef}
                accept="image/*"
                onChange={handleFileChange}
                className="hidden"
              />
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="w-full py-2.5 px-3 border-2 border-dashed border-pink-300 hover:border-pink-500 rounded-xl bg-pink-50/50 hover:bg-pink-50 text-pink-700 text-xs font-bold flex items-center justify-center gap-2 transition-all cursor-pointer"
              >
                <Upload className="w-4 h-4" />
                <span>{userImageSrc ? 'Đổi Ảnh Chân Dung Khác' : 'Tải Lên Ảnh Chân Dung (Chụp Rõ Mặt)'}</span>
              </button>
            </div>

            {/* Bộ Công Cụ Canh Chỉnh Ảnh Vào Ô Tròn (Zoom & Pan & Rotate) */}
            {userImageSrc && (
              <div className="p-3.5 bg-slate-50 rounded-2xl border border-slate-200 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-black uppercase text-slate-700 flex items-center gap-1.5">
                    <Move className="w-3.5 h-3.5 text-pink-600" />
                    Canh chỉnh ảnh vào ô tròn
                  </span>
                  <button
                    type="button"
                    onClick={() => {
                      setZoom(1);
                      setPanX(0);
                      setPanY(0);
                      setRotation(0);
                    }}
                    className="text-[10px] text-slate-500 hover:text-slate-800 flex items-center gap-1 font-bold cursor-pointer"
                  >
                    <RefreshCw className="w-3 h-3" />
                    Đặt lại
                  </button>
                </div>

                {/* Thu phóng (Zoom) */}
                <div className="space-y-1">
                  <div className="flex justify-between text-[10.5px] font-bold text-slate-600">
                    <span className="flex items-center gap-1"><ZoomIn className="w-3 h-3" /> Thu phóng (Zoom):</span>
                    <span>{Math.round(zoom * 100)}%</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setZoom(z => Math.max(0.5, +(z - 0.1).toFixed(1)))}
                      className="w-7 h-7 bg-white hover:bg-slate-100 border border-slate-300 rounded-lg text-xs font-bold flex items-center justify-center cursor-pointer"
                    >
                      -
                    </button>
                    <input
                      type="range"
                      min="0.5"
                      max="3.0"
                      step="0.05"
                      value={zoom}
                      onChange={(e) => setZoom(parseFloat(e.target.value))}
                      className="flex-1 accent-pink-600 cursor-pointer"
                    />
                    <button
                      type="button"
                      onClick={() => setZoom(z => Math.min(3.0, +(z + 0.1).toFixed(1)))}
                      className="w-7 h-7 bg-white hover:bg-slate-100 border border-slate-300 rounded-lg text-xs font-bold flex items-center justify-center cursor-pointer"
                    >
                      +
                    </button>
                  </div>
                </div>

                {/* Dịch chuyển vị trí (Pan Controls) */}
                <div className="space-y-1">
                  <div className="text-[10.5px] font-bold text-slate-600 flex justify-between">
                    <span>Dịch chuyển khuôn mặt:</span>
                    <span className="text-[10px] text-slate-400 font-normal">Kéo rê trên ô tròn xem trước</span>
                  </div>
                  <div className="flex items-center justify-center gap-1.5 pt-1">
                    <button
                      type="button"
                      onClick={() => setPanX(x => x - 8)}
                      className="px-2.5 py-1 bg-white hover:bg-slate-100 border border-slate-300 rounded-lg text-xs font-bold cursor-pointer"
                      title="Sang trái"
                    >
                      ←
                    </button>
                    <div className="flex flex-col gap-1">
                      <button
                        type="button"
                        onClick={() => setPanY(y => y - 8)}
                        className="px-2.5 py-1 bg-white hover:bg-slate-100 border border-slate-300 rounded-lg text-xs font-bold cursor-pointer"
                        title="Lên trên"
                      >
                        ↑
                      </button>
                      <button
                        type="button"
                        onClick={() => setPanY(y => y + 8)}
                        className="px-2.5 py-1 bg-white hover:bg-slate-100 border border-slate-300 rounded-lg text-xs font-bold cursor-pointer"
                        title="Xuống dưới"
                      >
                        ↓
                      </button>
                    </div>
                    <button
                      type="button"
                      onClick={() => setPanX(x => x + 8)}
                      className="px-2.5 py-1 bg-white hover:bg-slate-100 border border-slate-300 rounded-lg text-xs font-bold cursor-pointer"
                      title="Sang phải"
                    >
                      →
                    </button>
                    <button
                      type="button"
                      onClick={() => setRotation(r => (r + 90) % 360)}
                      className="ml-2 px-2.5 py-2 bg-white hover:bg-slate-100 border border-slate-300 rounded-lg text-xs font-bold flex items-center gap-1 cursor-pointer"
                      title="Xoay 90 độ"
                    >
                      <RotateCw className="w-3.5 h-3.5" />
                      <span>Xoay</span>
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* Action Buttons: Tải về, Sao chép & Chia sẻ */}
            <div className="space-y-2 pt-2 border-t border-slate-200">
              <button
                type="button"
                onClick={handleDownload}
                disabled={isGenerating}
                className="w-full py-3 bg-gradient-to-r from-pink-600 to-rose-600 hover:from-pink-500 hover:to-rose-500 text-white font-black text-xs uppercase tracking-wider rounded-xl flex items-center justify-center gap-2 cursor-pointer shadow-md shadow-pink-600/25 transition-all"
              >
                <Download className="w-4 h-4" />
                <span>Tải Poster Về Máy (File HD Siêu Nét)</span>
              </button>

              <div className="grid grid-cols-2 gap-2">
                {/* Nút Chia sẻ Zalo */}
                <button
                  type="button"
                  onClick={handleShareZalo}
                  className="py-2.5 px-3 bg-[#0068FF] hover:bg-[#0052cc] text-white font-extrabold text-xs rounded-xl flex items-center justify-center gap-2 cursor-pointer transition-all shadow-xs"
                >
                  {/* Zalo Icon SVG */}
                  <svg className="w-4 h-4 fill-white shrink-0" viewBox="0 0 48 48">
                    <path d="M24 4C12.95 4 4 12.95 4 24c0 3.93 1.14 7.6 3.11 10.71L5 42l7.65-2.05C15.68 41.6 19.67 42.67 24 42.67c11.05 0 20-8.95 20-20S35.05 4 24 4zm4.8 24.8h-7.6l6-8.2c.4-.55.2-1.3-.35-1.7-.55-.4-1.3-.2-1.7.35l-7.2 9.8c-.3.4-.3.9 0 1.3.3.4.7.6 1.2.6h9.6c.7 0 1.2-.5 1.2-1.2 0-.6-.5-1.15-1.15-1.15z"/>
                  </svg>
                  <span>Chia sẻ Zalo</span>
                </button>

                {/* Nút Chia sẻ Facebook */}
                <button
                  type="button"
                  onClick={handleShareFacebook}
                  className="py-2.5 px-3 bg-[#1877F2] hover:bg-[#166fe5] text-white font-extrabold text-xs rounded-xl flex items-center justify-center gap-2 cursor-pointer transition-all shadow-xs"
                >
                  <Facebook className="w-4 h-4 fill-white shrink-0" />
                  <span>Chia sẻ Facebook</span>
                </button>
              </div>

              {/* Sao chép ảnh vào Clipboard */}
              <button
                type="button"
                onClick={handleCopyImage}
                className="w-full py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl flex items-center justify-center gap-1.5 cursor-pointer transition-all border border-slate-200"
              >
                {isCopied ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{isCopied ? 'Đã sao chép ảnh vào bộ nhớ tạm!' : 'Sao chép ảnh (Dán nhanh vào chat)'}</span>
              </button>
            </div>

            {/* Toast notification */}
            {toastMessage && (
              <div className="p-2.5 bg-emerald-50 border border-emerald-200 rounded-xl text-emerald-800 text-xs font-bold text-center animate-fadeIn">
                {toastMessage}
              </div>
            )}
          </div>

          {/* Live Canvas Preview Column (Right) */}
          <div className="lg:col-span-7 flex flex-col items-center justify-center space-y-3">
            <div className="w-full text-center">
              <span className="text-[11px] font-extrabold text-slate-500 uppercase tracking-wider block">
                BẢN XEM TRƯỚC POSTER THỜI GIAN THỰC (HD 1024 x 682)
              </span>
              <span className="text-[10px] text-slate-400 block mt-0.5">
                Kéo trực tiếp vào ảnh chân dung để di chuyển khuôn mặt vừa vặn vào ô tròn
              </span>
            </div>

            {/* Canvas Container with Interactive Drag */}
            <div 
              className="relative w-full max-w-lg aspect-[1024/682] rounded-2xl overflow-hidden border-2 border-slate-300 shadow-xl bg-slate-100 cursor-grab active:cursor-grabbing select-none"
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

            <p className="text-[10.5px] text-slate-500 text-center max-w-md">
              💡 Poster được thiết kế theo chuẩn kích thước mạng xã hội. Bạn có thể lưu ảnh về máy hoặc chia sẻ trực tiếp lên Zalo và Facebook để bạn bè và đồng nghiệp cùng chúc mừng.
            </p>
          </div>
        </div>

      </div>
    </div>
  );
}
