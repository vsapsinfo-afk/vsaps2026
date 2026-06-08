/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { Megaphone, Mail, Phone, Settings, Send, CheckCircle, Sparkles, AlertCircle, AlertTriangle, Info, FileText, ToggleLeft, ToggleRight, Trash2, Check, X, Bell, Radio, Wifi, Volume2 } from 'lucide-react';
import { store } from '../dataStore';
import { sendRealtimeNotification } from '../lib/realtime';
import { NotificationTemplate, SentNotificationLog } from '../types';

export default function NotificationSystem() {
  const [templates, setTemplates] = useState<NotificationTemplate[]>(store.getTemplates());
  const [selectedTemplate, setSelectedTemplate] = useState<NotificationTemplate | null>(templates[0]);
  const [logs, setLogs] = useState<SentNotificationLog[]>(store.getNotificationLogs());

  // Form edit fields
  const [subject, setSubject] = useState(templates[0]?.subject || '');
  const [content, setContent] = useState(templates[0]?.content || '');

  // Test send simulations states
  const [testReceiver, setTestReceiver] = useState('phandu8899@gmail.com');
  const [testType, setTestType] = useState('email');
  const [logMessages, setLogMessages] = useState<string[]>([]);
  const [isSending, setIsSending] = useState(false);

  // Real-time Push broadcast states
  const [pushTitle, setPushTitle] = useState('Thông báo khẩn từ BTC');
  const [pushMessage, setPushMessage] = useState('Hội nghị chuẩn bị đón đại biểu tại sảnh chính lúc 08h30. Đề nghị các phân ban tập trung.');
  const [pushCategory, setPushCategory] = useState<'info' | 'success' | 'warning' | 'system' | 'badge'>('badge');
  const [isPushing, setIsPushing] = useState(false);

  const handleSendRealtimePush = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!pushTitle || !pushMessage) return;
    setIsPushing(true);
    const ok = await sendRealtimeNotification(pushTitle, pushMessage, pushCategory);
    setIsPushing(false);
    if (ok) {
      // Clear message inputs to prevent duplicate pushes
      setPushTitle('Thông báo mới từ BTC');
      setPushMessage('');
    } else {
      alert('Phát sóng thất bại. Vui lòng kiểm tra lại kết nối!');
    }
  };

  // Filter logs states
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState<'all' | 'zalo' | 'email' | 'whatsapp'>('all');
  const [expandedLogId, setExpandedLogId] = useState<string | null>(null);

  const loadAll = () => {
    setTemplates([...store.getTemplates()]);
    setLogs([...store.getNotificationLogs()]);
  };

  const filteredLogs = logs.filter(log => {
    const matchSearch = log.recipient.toLowerCase().includes(searchQuery.trim().toLowerCase()) ||
                        log.id.toLowerCase().includes(searchQuery.trim().toLowerCase());
    const matchType = filterType === 'all' || log.type === filterType;
    return matchSearch && matchType;
  });

  const handleSelectTemplate = (tmpl: NotificationTemplate) => {
    setSelectedTemplate(tmpl);
    setSubject(tmpl.subject || '');
    setContent(tmpl.content);
  };

  const handleSaveTemplate = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedTemplate) return;

    const updated: NotificationTemplate = {
      ...selectedTemplate,
      subject: selectedTemplate.channel === 'email' ? subject : undefined,
      content,
    };

    store.saveTemplate(updated);
    loadAll();
    alert('Đã chỉnh sửa và lưu trữ Mẫu tin nhắn sự kiện thành công!');
  };

  // Automated SMTP / Zalo OA simulated connection logger
  const handleTriggerTest = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!testReceiver) return;

    setIsSending(true);
    setLogMessages([]);

    const addLog = (msg: string, delay: number) => {
      setTimeout(() => {
        setLogMessages(prev => [...prev, `[2026-05-29 ${new Date().toLocaleTimeString()}] ${msg}`]);
      }, delay);
    };

    const testAttendee = {
      id: 'ATT-' + Math.floor(Math.random() * 9000 + 1000),
      title: 'BS.',
      fullName: 'Phan Minh Dư (Test)',
      organization: 'Bệnh viện Da liễu Trung ương',
      department: 'Thẩm mỹ Da',
      phone: testType === 'zalo' ? testReceiver : '0912345678',
      email: testType === 'email' ? testReceiver : 'phandu8899@gmail.com',
      address: 'Hà Nội',
      nationality: 'vietname' as const,
      packageId: 'pkg-member',
      packageName: 'Thành viên VSAPS',
      packageFee: 2500000,
      paymentStatus: 'paid' as const,
      paymentMethod: 'bank_transfer' as const,
      registrationDate: new Date().toISOString().split('T')[0],
      qrCodeValue: 'VSAPS-ATT-TEST-' + Math.floor(Math.random() * 90000 + 10000),
      isCheckedIn: false,
    };

    if (testType === 'email') {
      addLog('Đang khởi động tiến trình gửi SMTP Real-time...', 100);
      addLog('Thiết lập kết nối với cổng SMTP Server: default.gmail.com:587...', 300);
      addLog(`Nạp mẫu thông báo Email: "${selectedTemplate?.name}"`, 600);
      addLog(`Tiến hành biên dịch placeholders: {{title}} => "${testAttendee.title}", {{fullname}} => "${testAttendee.fullName}"...`, 900);
      
      try {
        const res = await store.sendEmail(testAttendee);
        addLog(`Kết nạp thông số và ký chữ ký số đại biểu thành công!`, 1200);
        addLog(`[SUCCESS 200] Đã chuyển tiếp Email thành công tới: ${testReceiver}`, 1500);
        addLog(`Message ID: ${res.response?.message_id || 'N/A'}. Lịch sử đã lưu!`, 1800);
      } catch (err: any) {
        addLog(`[ERROR] Gửi email thất bại: ${err.message}`, 1200);
      }
    } else if (testType === 'zalo') {
      addLog('Khởi động API Zalo ZNS Gateway v2...', 100);
      addLog('Thẩm định Access Token & OA ID trong thiết đặt liên minh...', 400);
      addLog(`Biên dịch payload cấu trúc ZNS: SĐT=${testReceiver}, Mẫu=${selectedTemplate?.id || 'tmpl-reg-zalo'}...`, 800);
      
      try {
        const res = await store.sendZaloZNS(testAttendee);
        addLog(`Tiến hành gọi thủ tục HTTP POST trực tiếp đến Zalo Open API...`, 1100);
        if (res.status === 'success') {
          addLog(`[ZALO API SUCCESS] Bắn tin Zalo Official Account (ZNS) thành công!`, 1400);
          addLog(`Mã phản hồi từ Zalo: Error=0 (Thành công), MsgID=${res.response?.data?.msg_id || 'N/A'}`, 1750);
        } else {
          addLog(`[ZALO API FAILED] Zalo trả về mã lỗi: ${res.response?.message || 'N/A'}`, 1400);
        }
      } catch (err: any) {
        addLog(`[ERROR] Bắn tin Zalo ZNS thất bại: ${err.message}`, 1200);
      }
    } else if (testType === 'whatsapp') {
      addLog('Khởi động WhatsApp Business Cloud API v18.0...', 100);
      addLog('Xác thực Access Token & Phone Number ID...', 400);
      addLog(`Biên dịch payload cấu trúc WhatsApp: SĐT=${testReceiver}, Mẫu=${selectedTemplate?.znsTemplateId || 'vsaps_registration_success'}...`, 800);
      
      try {
        const res = await store.sendWhatsapp(testAttendee);
        addLog(`Tiến hành gọi thủ tục HTTP POST trực tiếp đến Meta Graph API...`, 1100);
        if (res.status === 'success') {
          addLog(`[WHATSAPP API SUCCESS] Bắn tin WhatsApp Template thành công!`, 1400);
          addLog(`Mã phản hồi từ Meta: MsgID=${res.response?.data?.messages?.[0]?.id || res.response?.message_id || 'N/A'}`, 1750);
        } else {
          addLog(`[WHATSAPP API FAILED] Meta trả về mã lỗi: ${res.response?.message || res.response?.error?.message || 'N/A'}`, 1400);
        }
      } catch (err: any) {
        addLog(`[ERROR] Bắn tin WhatsApp thất bại: ${err.message}`, 1200);
      }
    }

    setTimeout(() => {
      setIsSending(false);
      loadAll();
    }, 2000);
  };

  return (
    <div className="space-y-6 font-sans text-slate-805">
      {/* Grid notification layouts split */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Left Side: Templates list */}
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-4">
          <span className="text-xs font-black text-slate-800 uppercase tracking-wider block border-b border-slate-100 pb-2">Các Mẫu Thông Tin Tự Động</span>
          
          <div className="space-y-3">
            {templates.map(tmpl => (
              <div
                key={tmpl.id}
                onClick={() => handleSelectTemplate(tmpl)}
                className={`p-4 rounded-xl border-2 cursor-pointer transition-all ${
                  selectedTemplate?.id === tmpl.id 
                    ? 'bg-teal-50/50 border-teal-500 shadow-sm' 
                    : 'bg-white border-slate-250 hover:border-slate-350'
                }`}
              >
                <div className="flex items-center justify-between mb-2">
                    <span className={`text-[9px] font-bold px-2 py-0.5 rounded uppercase ${
                      tmpl.channel === 'email' ? 'bg-indigo-50 text-indigo-700' : tmpl.channel === 'whatsapp' ? 'bg-blue-50 text-blue-700' : 'bg-emerald-50 text-emerald-700'
                    }`}>
                      {tmpl.channel.toUpperCase()}
                    </span>
                  <span className="text-[9px] font-mono text-slate-400 font-bold">{tmpl.id}</span>
                </div>
                <h4 className="font-bold text-slate-900 text-xs">{tmpl.name}</h4>
                <p className="text-[11px] text-slate-400 mt-1 truncate">{tmpl.content}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Middle: Content Template Customizer Form */}
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm lg:col-span-2 space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <div>
              <h3 className="font-bold text-slate-900 text-sm">Hiệu Chỉnh Mẫu Tin Thông Báo</h3>
              <p className="text-xs text-slate-400">Thay đổi câu từ, đính kèm placeholder hệ thống {"{{fullName}}"} để tự động hoá.</p>
            </div>
            
            <span className="px-2.5 py-1 text-[10px] bg-slate-100 text-slate-700 rounded font-bold uppercase font-mono tracking-wider">
              {selectedTemplate?.channel} editor
            </span>
          </div>

          {selectedTemplate ? (
            <form onSubmit={handleSaveTemplate} className="space-y-4 text-xs">
              {selectedTemplate.channel === 'email' && (
                <div>
                  <label className="text-[10px] font-bold text-slate-500 block mb-1">Tiêu đề Gửi Thư (Email Subject) *</label>
                  <input
                    type="text"
                    required
                    value={subject}
                    onChange={(e) => setSubject(e.target.value)}
                    className="w-full px-4 py-2 border border-slate-200 rounded-xl font-bold focus:ring-1 focus:ring-teal-500 focus:outline-none"
                  />
                </div>
              )}

              <div>
                <label className="text-[10px] font-bold text-slate-500 block mb-1">Ruột văn bản thông điệp (Message Body) *</label>
                <textarea
                  required
                  rows={10}
                  value={content}
                  onChange={(e) => setContent(e.target.value)}
                  className="w-full px-4 py-2 border border-slate-200 rounded-xl font-mono leading-relaxed focus:ring-1 focus:ring-teal-500 focus:outline-none focus:bg-white text-[11px]"
                />
              </div>

              {/* Guide of placeholders */}
              <div className="bg-slate-55 p-3.5 rounded-xl border border-slate-200 flex items-start gap-2">
                <AlertCircle className="w-4 h-4 text-slate-450 shrink-0 mt-0.5" />
                <div className="text-[10px] text-slate-600 leading-normal">
                  <span className="font-bold text-slate-800 block">Danh mục Placeholder đính được:</span>
                  <span>{"{{title}}"} (Danh xưng Bác sĩ), {"{{fullname}}"} (Tên), {"{{code}}"} (Mã ATT-ID), {"{{package}}"} (Tên gói đăng ký), {"{{payment_status}}"} (Nộp phí), {"{{presentation_title}}"} (Tên đề tài).</span>
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-slate-150">
                <button
                  id="btn-save"
                  type="submit"
                  className="px-4 py-2 rounded-xl bg-teal-600 hover:bg-teal-700 text-white font-bold"
                >
                  Lưu Trữ Mẫu Thiết Đặt
                </button>
              </div>
            </form>
          ) : (
            <div className="text-center py-12 text-slate-400 italic">Chọn một mẫu tin bên trái để tiến hành hiệu chỉnh.</div>
          )}
        </div>
      </div>

      {/* Gateway Connection Testing Tool */}
      <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm grid grid-cols-1 md:grid-cols-2 gap-6">
        <div>
          <span className="text-xs font-black text-slate-800 uppercase block tracking-wider mb-2">Kiểm Tra Truyền Gửi Thử Nghiệm</span>
          <p className="text-xs text-slate-400 mb-4 leading-relaxed">Hỗ trợ kiểm tra đường truyền liên kết SMTP Server & Zalo OA API để xác nhận gửi tin nhắn và thư điện tử tự động trực tiếp.</p>

          <form onSubmit={handleTriggerTest} className="space-y-4 text-xs">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-[10px] font-bold text-slate-500 block mb-1">Chọn cổng bắn</label>
                <select
                  value={testType}
                  onChange={(e) => setTestType(e.target.value)}
                  className="w-full px-3 py-1.5 border border-slate-200 rounded-lg"
                >
                  <option value="email">SMTP Email Server</option>
                  <option value="zalo">Zalo OA ZNS Gateway</option>
                  <option value="whatsapp">WhatsApp Business API</option>
                </select>
              </div>

              <div>
                <label className="text-[10px] font-bold text-slate-500 block mb-1">
                  {testType === 'email' ? 'Địa chỉ hộp thư nhận *' : 'Số ĐT nhận SMS/WhatsApp *'}
                </label>
                <input
                  type="text"
                  required
                  value={testReceiver}
                  onChange={(e) => setTestReceiver(e.target.value)}
                  placeholder={testType === 'email' ? 'nhập email...' : 'ví dụ: 0912345678'}
                  className="w-full px-3 py-1.5 border border-slate-200 rounded-lg text-xs"
                />
              </div>
            </div>

            <div className="flex justify-end pt-2">
              <button
                id="btn-trigger-test"
                type="submit"
                disabled={isSending}
                className="px-4 py-2 rounded-lg bg-teal-600 hover:bg-teal-700 text-white font-bold flex items-center gap-1 cursor-pointer w-full sm:w-auto text-center justify-center transition-all shadow"
              >
                <Send className="w-3.5 h-3.5" />
                {isSending ? 'Đang kích hoạt...' : 'Bắn Thử Ngay'}
              </button>
            </div>
          </form>
        </div>

        {/* Real-time terminal log viewer corresponding to triggers */}
        <div className="bg-slate-950 rounded-2xl p-5 border border-slate-800 flex flex-col justify-between">
          <div className="space-y-2">
            <div className="flex items-center justify-between border-b border-slate-900 pb-2">
              <span className="text-[9px] font-mono font-black text-teal-400 tracking-widest uppercase">SOCKET TRANSMISSION PROTOCOL INBOUND</span>
              <div className="w-2.5 h-2.5 rounded-full bg-teal-500 animate-ping" />
            </div>

            <div className="space-y-1.5 font-mono text-[10px] text-slate-350 leading-relaxed overflow-y-auto max-h-36">
              {logMessages.length === 0 ? (
                <p className="text-slate-600 italic">Hệ thống tĩnh lặng. Vui lòng nhập thông tin bên trái và bấm &ldquo;Bắn Thử Ngay&rdquo; để xem nhật ký truyền kết nối socket logs.</p>
              ) : (
                logMessages.map((log, idx) => (
                  <p key={idx} className={log.includes('SUCCESS') ? 'text-emerald-400 font-bold' : ''}>
                    {log}
                  </p>
                ))
              )}
            </div>
          </div>

          <div className="pt-4 border-t border-slate-900 flex justify-between items-center text-[9px] text-slate-600 font-mono">
            <span>SOCKET GATEWAY: ACTIVE</span>
            <span>PORT 1120_VSAPS</span>
          </div>
        </div>
      </div>

      {/* Real-time Push Notification Broadcast Gateway */}
      <div className="bg-slate-900 text-white p-6 rounded-2xl border border-slate-800 shadow-xl grid grid-cols-1 md:grid-cols-2 gap-6 relative overflow-hidden" id="realtime-push-gateway">
        {/* Abstract design elements representation */}
        <div className="absolute top-0 right-0 w-44 h-44 bg-gradient-to-br from-indigo-500/10 to-teal-500/10 rounded-full blur-2xl pointer-events-none" />
        
        <div>
          <div className="flex items-center gap-2 mb-2">
            <span className="p-1 px-2 rounded-md bg-indigo-500/20 text-indigo-400 border border-indigo-500/20 text-[9px] font-black uppercase tracking-wider">REALTIME PUSH</span>
            <span className="w-2 h-2 rounded-full bg-emerald-450 animate-ping" />
            <span className="text-xs text-emerald-400 font-bold uppercase tracking-wider">Cổng Phát Sóng Toàn Sảnh</span>
          </div>
          <h3 className="text-sm font-black text-slate-150 uppercase tracking-wider mb-2">Phát Báo thông báo Đẩy Real-time</h3>
          <p className="text-xs text-slate-400 mb-4 leading-relaxed">
            Hỗ trợ phát báo khẩn cấp, nhắc nhở hoặc cập nhật trạng thái hội nghị tức thời đến tất cả màn hình điều phối viên, máy trạm check-in và kiosk đại biểu đang kết nối trực tuyến.
          </p>

          <form onSubmit={handleSendRealtimePush} className="space-y-4 text-xs">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="text-[10px] font-bold text-slate-400 block mb-1">Mức độ khẩn cấp (Phân loại)</label>
                <select
                  value={pushCategory}
                  onChange={(e: any) => setPushCategory(e.target.value)}
                  className="w-full px-3 py-1.5 bg-slate-800 border border-slate-700 rounded-lg text-slate-100 font-semibold focus:outline-none focus:border-indigo-500"
                >
                  <option value="badge">🔊 Loa Thông báo (Badge)</option>
                  <option value="success">✅ Trạng Thái Thành công (Success)</option>
                  <option value="warning">⚠️ Cảnh báo Thiết lập (Warning)</option>
                  <option value="system">🔥 Thông báo Hệ thống (System)</option>
                  <option value="info">ℹ️ Thông tin Sự kiện (Info)</option>
                </select>
              </div>

              <div>
                <label className="text-[10px] font-bold text-slate-400 block mb-1">Tiêu đề thông báo *</label>
                <input
                  type="text"
                  required
                  value={pushTitle}
                  onChange={(e) => setPushTitle(e.target.value)}
                  placeholder="Tiêu đề thông báo..."
                  className="w-full px-3 py-1.5 bg-slate-800 border border-slate-700 rounded-lg text-slate-100 placeholder-slate-500 font-semibold leading-none focus:outline-none focus:border-indigo-500"
                />
              </div>
            </div>

            <div>
              <label className="text-[10px] font-bold text-slate-400 block mb-1">Nội dung thông báo (Mô tả chi tiết) *</label>
              <textarea
                required
                rows={2}
                value={pushMessage}
                onChange={(e) => setPushMessage(e.target.value)}
                placeholder="Ví dụ: Đón đoàn khách danh dự tại phân ban..."
                className="w-full px-3 py-1.5 bg-slate-800 border border-slate-700 rounded-lg text-slate-100 placeholder-slate-500 font-medium focus:outline-none focus:border-indigo-500"
              />
            </div>

            <div className="flex justify-end pt-1">
              <button
                type="submit"
                disabled={isPushing}
                className="px-5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-black flex items-center gap-1.5 cursor-pointer justify-center transition-all shadow-lg hover:shadow-indigo-500/20 w-full sm:w-auto text-center"
              >
                <Radio className="w-4 h-4 shrink-0 animate-pulse text-indigo-300" />
                {isPushing ? 'Đang truyền phát...' : 'Phát Sóng Ngay (Broadcast)'}
              </button>
            </div>
          </form>
        </div>

        {/* Realtime Client Notification Simulator Card Preview */}
        <div className="bg-slate-950 rounded-2xl p-5 border border-slate-800 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between border-b border-slate-900 pb-2 mb-4">
              <span className="text-[9px] font-mono font-black text-indigo-400 tracking-widest uppercase">PREVIEW SẼ HIỂN THỊ TRÊN CÁC THIẾT BỊ</span>
              <div className="flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-indigo-500 animate-ping" />
                <span className="text-[8px] font-mono text-slate-500 uppercase">ACTIVE SOCKET MESH</span>
              </div>
            </div>

            <div className="bg-slate-900 border border-indigo-900/40 p-4 rounded-xl shadow-lg relative max-w-sm mx-auto">
              <div className="flex gap-3">
                <div className="shrink-0">
                  {pushCategory === 'success' && (
                    <div className="w-8 h-8 rounded-lg bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 flex items-center justify-center">
                      <Check className="w-4 h-4" />
                    </div>
                  )}
                  {pushCategory === 'warning' && (
                    <div className="w-8 h-8 rounded-lg bg-amber-500/20 text-amber-400 border border-amber-500/30 flex items-center justify-center">
                      <AlertTriangle className="w-4 h-4" />
                    </div>
                  )}
                  {pushCategory === 'system' && (
                    <div className="w-8 h-8 rounded-lg bg-rose-500/20 text-rose-450 border border-rose-500/30 flex items-center justify-center">
                      <Wifi className="w-4 h-4" />
                    </div>
                  )}
                  {pushCategory === 'info' && (
                    <div className="w-8 h-8 rounded-lg bg-sky-500/20 text-sky-400 border border-sky-500/30 flex items-center justify-center">
                      <Info className="w-4 h-4" />
                    </div>
                  )}
                  {pushCategory === 'badge' && (
                    <div className="w-8 h-8 rounded-lg bg-indigo-500/20 text-indigo-400 border border-indigo-500/30 flex items-center justify-center">
                      <Megaphone className="w-4 h-4" />
                    </div>
                  )}
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex justify-between items-center gap-2">
                    <h5 className="text-[11px] font-extrabold text-slate-100 truncate">{pushTitle || 'Tiêu đề thông báo...'}</h5>
                    <span className="text-[8px] font-mono text-slate-500">Bây giờ</span>
                  </div>
                  <p className="text-[10px] text-slate-400 mt-1 leading-relaxed text-left">
                    {pushMessage || 'Vui lòng nhập nội dung thông báo để hiển thị xem trước...'}
                  </p>
                  <div className="mt-1.5 flex items-center gap-1 text-[8px] uppercase font-black text-indigo-400">
                    <Radio className="w-2.5 h-2.5" />
                    <span>Real-time push alert</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="pt-4 border-t border-slate-900 flex justify-between items-center text-[9px] font-mono text-slate-500">
            <span className="flex items-center gap-1">
              <Volume2 className="w-3.5 h-3.5 text-indigo-550" />
              <span>SOUND FX: CHIME OVERLAY ENABLED</span>
            </span>
            <span>BROADCAST ALL CLIENTS</span>
          </div>
        </div>
      </div>

      {/* Real-time Notification Dispatch History */}
      <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-4">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 border-b border-slate-100 pb-3">
          <div>
            <h3 className="text-sm font-black text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
              <Bell className="w-4 h-4 text-slate-650" />
              Lịch Sử Truyền Gửi Tự Động (Zalo ZNS / Mail Tickets)
            </h3>
            <p className="text-xs text-slate-400 mt-1">
              Gói tin gửi đi và phản hồi từ hệ thống Zalo OpenAPI sandbox / SMTP Server.
            </p>
          </div>
          {logs.length > 0 && (
            <button
               onClick={() => {
                 if (window.confirm('Bạn có chắc muốn xóa vĩnh viễn toàn bộ lịch sử log truyền tin tự động?')) {
                   store.clearNotificationLogs();
                   loadAll();
                 }
               }}
               className="px-3 py-1.5 rounded-lg border border-red-200 text-red-650 hover:bg-red-50 text-xs font-bold flex items-center gap-1 cursor-pointer"
            >
              <Trash2 className="w-3.5 h-3.5" />
              Xóa Lịch Sử
            </button>
          )}
        </div>

        {/* Filters */}
        <div className="flex flex-wrap gap-2 text-xs">
          <input
            type="text"
            placeholder="Tìm theo ID hoặc số/email người nhận..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="px-3 py-1.5 border border-slate-200 rounded-lg text-xs w-full sm:w-64"
          />
          <select
            value={filterType}
            onChange={(e: any) => setFilterType(e.target.value)}
            className="px-3 py-1.5 border border-slate-200 rounded-lg text-xs font-semibold focus:outline-none focus:border-teal-500"
          >
            <option value="all">Tất cả kênh thông báo</option>
            <option value="zalo">Chỉ Zalo ZNS</option>
            <option value="email">Chỉ SMTP Email</option>
            <option value="whatsapp">Chỉ WhatsApp</option>
          </select>
        </div>

        {/* Table list */}
        <div className="overflow-x-auto rounded-xl border border-slate-200">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-slate-50 text-[10px] uppercase font-black tracking-wider text-slate-500 border-b border-slate-200">
                <th className="px-4 py-3">Mã Log</th>
                <th className="px-4 py-3">Kênh truyền</th>
                <th className="px-4 py-3">Người nhận đích</th>
                <th className="px-4 py-3">Mẫu tin sử dụng</th>
                <th className="px-4 py-3">Thời gian</th>
                <th className="px-4 py-3 text-center">Trạng thái</th>
                <th className="px-4 py-3 text-right">Chi tiết</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredLogs.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-4 py-8 text-center text-slate-400 italic">
                    Chưa có hoạt động truyền gửi tự động nào phát sinh. Đăng ký đại biểu mới hoặc dùng cổng bắn thử để kích hoạt.
                  </td>
                </tr>
              ) : (
                filteredLogs.map(log => {
                  const isExpanded = expandedLogId === log.id;
                  return (
                    <React.Fragment key={log.id}>
                      <tr className="hover:bg-slate-50/50 transition-all">
                        <td className="px-4 py-3 font-mono font-bold text-slate-600">{log.id}</td>
                        <td className="px-4 py-3">
                          <span className={`inline-flex items-center gap-1 font-bold px-1.5 py-0.5 rounded text-[9px] uppercase ${
                            log.type === 'email' ? 'bg-indigo-50 text-indigo-700' : log.type === 'whatsapp' ? 'bg-blue-50 text-blue-700' : 'bg-emerald-50 text-emerald-700'
                          }`}>
                            {log.type.toUpperCase()}
                          </span>
                        </td>
                        <td className="px-4 py-3 font-medium text-slate-800">{log.recipient}</td>
                        <td className="px-4 py-3 text-slate-500 max-w-xs truncate">{log.templateName}</td>
                        <td className="px-4 py-3 text-slate-400 font-mono">{log.sentAt}</td>
                        <td className="px-4 py-3 text-center">
                          <span className={`inline-flex items-center gap-0.5 px-2 py-0.5 rounded-full text-[9px] font-bold ${
                            log.status === 'success' ? 'bg-emerald-50 text-emerald-700' : 'bg-red-50 text-red-700'
                          }`}>
                            {log.status === 'success' ? <Check className="w-2.5 h-2.5" /> : <X className="w-2.5 h-2.5" />}
                            {log.status === 'success' ? 'Thành công' : 'Thất bại'}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-right">
                          <button
                            onClick={() => setExpandedLogId(isExpanded ? null : log.id)}
                            className="px-2.5 py-1 text-[10px] bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-lg transition-all cursor-pointer"
                          >
                            {isExpanded ? 'Đóng' : 'Payload'}
                          </button>
                        </td>
                      </tr>
                      {isExpanded && (
                        <tr className="bg-slate-950 text-slate-300 font-mono text-[10px]">
                          <td colSpan={7} className="p-4 border-t border-b border-slate-900 leading-relaxed">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                              <div>
                                <div className="text-teal-400 font-bold border-b border-slate-900 pb-1 mb-2 uppercase tracking-wide">
                                  [OUTBOUND REQUEST PAYLOAD / TICKET DATA]
                                </div>
                                <pre className="whitespace-pre-wrap overflow-x-auto max-h-60 bg-slate-900 p-2.5 rounded-lg border border-slate-850">
                                  {JSON.stringify(log.payload, null, 2)}
                                </pre>
                              </div>
                              <div>
                                <div className="text-amber-400 font-bold border-b border-slate-900 pb-1 mb-2 uppercase tracking-wide">
                                  [INBOUND RESPONSE / LOG STATE]
                                </div>
                                <pre className="whitespace-pre-wrap overflow-x-auto max-h-60 bg-slate-900 p-2.5 rounded-lg border border-slate-850">
                                  {JSON.stringify(log.response, null, 2)}
                                </pre>
                              </div>
                            </div>
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
