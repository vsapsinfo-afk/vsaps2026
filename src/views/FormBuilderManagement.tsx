import React, { useState, useEffect, useMemo } from 'react';
import { 
  FileText, Plus, Edit3, Trash2, Copy, ExternalLink, QrCode, 
  CheckCircle2, Clock, AlertCircle, Eye, Download, Search, Filter, 
  ArrowUpDown, Settings, Layers, Calendar, DollarSign, Users, 
  ChevronRight, ArrowLeft, Save, Sparkles, Check, X, Share2, 
  FileSpreadsheet, HelpCircle, AlertTriangle, ArrowUp, ArrowDown,
  Layout, Smartphone, Monitor, ShieldCheck, Mail, Phone, Building,
  CreditCard, Image as ImageIcon
} from 'lucide-react';
import * as XLSX from 'xlsx';
import { store } from '../dataStore';
import { 
  CustomRegistrationForm, 
  CustomFormSubmission, 
  FormField, 
  FormFieldType, 
  FormCategory, 
  Role 
} from '../types';
import { FORM_PRESETS, FormTemplatePreset } from '../lib/defaultForms';

interface FormBuilderManagementProps {
  role?: Role;
  onNavigate?: (view: string) => void;
}

export default function FormBuilderManagement({ role = 'admin', onNavigate }: FormBuilderManagementProps) {
  const [activeTab, setActiveTab] = useState<'forms' | 'builder' | 'submissions' | 'templates'>('forms');
  const [forms, setForms] = useState<CustomRegistrationForm[]>([]);
  const [submissions, setSubmissions] = useState<CustomFormSubmission[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');

  // Currently editing form in Builder tab
  const [editingForm, setEditingForm] = useState<CustomRegistrationForm | null>(null);
  const [builderSubTab, setBuilderSubTab] = useState<'settings' | 'fields' | 'preview'>('fields');
  const [previewDevice, setPreviewDevice] = useState<'desktop' | 'mobile'>('desktop');

  // Field editor modal state
  const [editingField, setEditingField] = useState<FormField | null>(null);
  const [isFieldModalOpen, setIsFieldModalOpen] = useState(false);

  // Sharing & QR Code Modal
  const [shareForm, setShareForm] = useState<CustomRegistrationForm | null>(null);
  const [copiedLink, setCopiedLink] = useState(false);

  // Submissions Tab Filter
  const [selectedFormForSubmissions, setSelectedFormForSubmissions] = useState<string>('all');
  const [submissionSearchTerm, setSubmissionSearchTerm] = useState('');
  const [selectedSubmissionDetail, setSelectedSubmissionDetail] = useState<CustomFormSubmission | null>(null);

  // Toast feedback
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

  // Load forms and submissions
  const reloadData = () => {
    setForms([...store.getCustomForms()]);
    setSubmissions([...store.getCustomSubmissions()]);
  };

  useEffect(() => {
    reloadData();
    const handleUpdate = () => reloadData();
    window.addEventListener('store-updated', handleUpdate);
    return () => window.removeEventListener('store-updated', handleUpdate);
  }, []);

  // Filtered forms list
  const filteredForms = useMemo(() => {
    return forms.filter(form => {
      const matchSearch = form.title.toLowerCase().includes(searchTerm.toLowerCase()) || 
                          form.slug.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          (form.description && form.description.toLowerCase().includes(searchTerm.toLowerCase()));
      const matchCategory = categoryFilter === 'all' || form.category === categoryFilter;
      const matchStatus = statusFilter === 'all' || form.status === statusFilter;
      return matchSearch && matchCategory && matchStatus;
    });
  }, [forms, searchTerm, categoryFilter, statusFilter]);

  // Overall Statistics
  const stats = useMemo(() => {
    const totalForms = forms.length;
    const activeForms = forms.filter(f => f.status === 'active').length;
    const totalSubmissions = submissions.length;
    const paidSubmissions = submissions.filter(s => s.paymentStatus === 'paid');
    
    let totalRevenue = 0;
    submissions.forEach(sub => {
      if (sub.paymentStatus === 'paid') {
        const form = forms.find(f => f.id === sub.formId);
        if (form && form.isFeeRequired && form.feeAmount) {
          totalRevenue += form.feeAmount;
        }
      }
    });

    return { totalForms, activeForms, totalSubmissions, paidSubmissionsCount: paidSubmissions.length, totalRevenue };
  }, [forms, submissions]);

  // Handler: Start creating a new form
  const handleCreateNewForm = (preset?: FormTemplatePreset) => {
    const newId = `form-${Date.now()}`;
    const initialForm: CustomRegistrationForm = preset ? {
      id: newId,
      title: preset.name,
      slug: preset.name.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)+/g, '') + `-${Math.floor(Math.random() * 900 + 100)}`,
      description: preset.description,
      category: preset.category,
      status: 'active',
      isFeeRequired: preset.isFeeDefault,
      feeAmount: preset.defaultFee,
      feeDescription: preset.isFeeDefault ? 'Phí tham dự chính thức' : undefined,
      bankName: 'MB Bank (Ngân hàng Quân Đội)',
      bankAccount: '10112026',
      bankAccountName: 'BAN TO CHUC HOI NGHI VSAPS',
      submitButtonText: 'Xác Nhận Đăng Ký',
      successMessage: 'Chúc mừng Quý vị đã đăng ký thành công! Ban Tổ Chức sẽ liên hệ và gửi thông tin qua Email/Zalo.',
      confirmationEmailEnabled: true,
      allowCheckRegistration: true,
      fields: JSON.parse(JSON.stringify(preset.sampleFields)),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    } : {
      id: newId,
      title: 'Biểu Mẫu Đăng Ký Mới',
      slug: `bieu-mau-dang-ky-${Math.floor(Math.random() * 9000 + 1000)}`,
      description: 'Vui lòng điền đầy đủ các thông tin dưới đây để đăng ký tham gia.',
      category: 'general',
      status: 'draft',
      isFeeRequired: false,
      feeAmount: 0,
      bankName: 'MB Bank (Ngân hàng Quân Đội)',
      bankAccount: '10112026',
      bankAccountName: 'BAN TO CHUC HOI NGHI VSAPS',
      submitButtonText: 'Gửi Đăng Ký',
      successMessage: 'Cảm ơn Quý vị đã gửi thông tin đăng ký thành công!',
      confirmationEmailEnabled: true,
      allowCheckRegistration: true,
      fields: [
        { id: `f-${Date.now()}-1`, label: 'Họ và tên', key: 'full_name', type: 'text', required: true, width: 'half' },
        { id: `f-${Date.now()}-2`, label: 'Số điện thoại', key: 'phone', type: 'phone', required: true, width: 'half' },
        { id: `f-${Date.now()}-3`, label: 'Email', key: 'email', type: 'email', required: true, width: 'full' }
      ],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    setEditingForm(initialForm);
    setActiveTab('builder');
    setBuilderSubTab('fields');
  };

  // Handler: Save form
  const handleSaveForm = async () => {
    if (!editingForm) return;
    if (!editingForm.title.trim()) {
      alert('Vui lòng nhập tiêu đề cho Form đăng ký!');
      return;
    }
    if (!editingForm.slug.trim()) {
      alert('Vui lòng nhập đường dẫn URL (slug) cho Form!');
      return;
    }

    await store.saveCustomForm(editingForm);
    reloadData();
    showToast('Đã lưu biểu mẫu đăng ký thành công!');
    setActiveTab('forms');
  };

  // Handler: Delete form
  const handleDeleteForm = async (id: string, title: string) => {
    if (window.confirm(`Bạn có chắc chắn muốn xóa form "${title}"?\nCác đơn đăng ký liên quan sẽ được giữ lại trong lịch sử.`)) {
      await store.deleteCustomForm(id);
      reloadData();
      showToast('Đã xóa biểu mẫu thành công!');
    }
  };

  // Handler: Duplicate form
  const handleDuplicateForm = async (form: CustomRegistrationForm) => {
    const duplicated: CustomRegistrationForm = {
      ...form,
      id: `form-${Date.now()}`,
      title: `${form.title} (Bản sao)`,
      slug: `${form.slug}-copy-${Math.floor(Math.random() * 900 + 100)}`,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    await store.saveCustomForm(duplicated);
    reloadData();
    showToast('Đã nhân bản biểu mẫu thành công!');
  };

  // Toggle form status directly
  const handleToggleStatus = async (form: CustomRegistrationForm) => {
    const nextStatus: 'active' | 'paused' | 'draft' = 
      form.status === 'active' ? 'paused' : form.status === 'paused' ? 'draft' : 'active';
    await store.saveCustomForm({ ...form, status: nextStatus });
    reloadData();
    showToast(`Đã chuyển trạng thái form sang "${nextStatus.toUpperCase()}"`);
  };

  // Export Submissions to Excel (.xlsx)
  const handleExportSubmissionsExcel = (targetFormId: string) => {
    const listToExport = targetFormId === 'all' 
      ? submissions 
      : submissions.filter(s => s.formId === targetFormId);

    if (listToExport.length === 0) {
      alert('Không có dữ liệu đơn đăng ký nào để xuất file Excel!');
      return;
    }

    const form = forms.find(f => f.id === targetFormId);

    // Build row headers dynamically
    const rows = listToExport.map((sub, index) => {
      const rowData: Record<string, any> = {
        'STT': index + 1,
        'Mã Đăng Ký': sub.submissionCode,
        'Tên Form': sub.formTitle,
        'Thời Gian Nộp': new Date(sub.submittedAt).toLocaleString('vi-VN'),
        'Trạng Thái Đơn': sub.status === 'confirmed' ? 'Đã Xác Nhận' : sub.status === 'pending' ? 'Chờ Duyệt' : 'Đã Hủy',
        'Thanh Toán': sub.paymentStatus === 'paid' ? 'Đã Thanh Toán' : sub.paymentStatus === 'pending' ? 'Chờ Đối Soát' : 'Miễn Phí'
      };

      // Add dynamic fields
      if (form) {
        form.fields.forEach(f => {
          if (f.type !== 'section') {
            const val = sub.data[f.key];
            rowData[f.label] = Array.isArray(val) ? val.join(', ') : (val !== undefined && val !== null ? String(val) : '');
          }
        });
      } else {
        Object.entries(sub.data).forEach(([k, v]) => {
          rowData[k] = Array.isArray(v) ? v.join(', ') : String(v);
        });
      }

      return rowData;
    });

    const worksheet = XLSX.utils.json_to_sheet(rows);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Danh_Sach_Dang_Ky');
    
    const fileName = form 
      ? `Danh_Sach_Dang_Ky_${form.slug}_${new Date().toISOString().split('T')[0]}.xlsx`
      : `Tat_Ca_Don_Dang_Ky_${new Date().toISOString().split('T')[0]}.xlsx`;

    XLSX.writeFile(workbook, fileName);
    showToast(`Đã xuất thành công ${listToExport.length} đơn đăng ký ra file Excel!`);
  };

  // Field Reordering in Builder
  const handleMoveField = (index: number, direction: 'up' | 'down') => {
    if (!editingForm) return;
    const fields = [...editingForm.fields];
    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= fields.length) return;

    const temp = fields[index];
    fields[index] = fields[targetIndex];
    fields[targetIndex] = temp;

    setEditingForm({ ...editingForm, fields });
  };

  // Delete field from builder
  const handleDeleteField = (fieldId: string) => {
    if (!editingForm) return;
    setEditingForm({
      ...editingForm,
      fields: editingForm.fields.filter(f => f.id !== fieldId)
    });
  };

  // Open Field Modal for Add or Edit
  const handleOpenFieldModal = (field?: FormField) => {
    if (field) {
      setEditingField({ ...field });
    } else {
      setEditingField({
        id: `f-${Date.now()}`,
        label: 'Tiêu đề trường mới',
        key: `field_${Date.now().toString().slice(-4)}`,
        type: 'text',
        required: false,
        placeholder: '',
        width: 'full'
      });
    }
    setIsFieldModalOpen(true);
  };

  // Save Field from modal
  const handleSaveField = () => {
    if (!editingForm || !editingField) return;
    if (!editingField.label.trim()) {
      alert('Vui lòng nhập tên/nhãn hiển thị của trường dữ liệu!');
      return;
    }
    if (!editingField.key.trim()) {
      editingField.key = editingField.label
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/[^a-z0-9]+/g, '_')
        .replace(/(^_|_$)+/g, '');
    }

    const fields = [...editingForm.fields];
    const existingIndex = fields.findIndex(f => f.id === editingField.id);
    if (existingIndex >= 0) {
      fields[existingIndex] = editingField;
    } else {
      fields.push(editingField);
    }

    setEditingForm({ ...editingForm, fields });
    setIsFieldModalOpen(false);
    setEditingField(null);
  };

  // Generate public registration URL for form
  const getPublicFormUrl = (form: CustomRegistrationForm) => {
    const origin = window.location.origin;
    return `${origin}/?view=custom-form&id=${form.id}`;
  };

  return (
    <div className="space-y-6 pb-20 font-sans text-slate-800">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed top-5 right-5 z-50 bg-slate-900 text-white px-4 py-3 rounded-2xl shadow-2xl flex items-center gap-3 border border-slate-700 animate-fade-in text-xs font-bold">
          <Sparkles className="w-4 h-4 text-emerald-400" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Header Banner */}
      <div className="bg-gradient-to-r from-indigo-950 via-slate-900 to-indigo-900 rounded-3xl p-6 sm:p-8 text-white shadow-xl relative overflow-hidden">
        <div className="absolute right-0 top-0 bottom-0 w-1/3 bg-radial from-pink-500/10 to-transparent pointer-events-none" />
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-pink-500/20 text-pink-300 border border-pink-500/30 text-xs font-bold uppercase tracking-wider">
              <Layers className="w-3.5 h-3.5" />
              <span>Phân Hệ Quản Lý Form Đăng Ký Linh Hoạt</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-black tracking-tight">TRÌNH TẠO FORM ĐĂNG KÝ (FORM BUILDER)</h1>
            <p className="text-slate-300 text-xs sm:text-sm max-w-2xl font-medium">
              Thiết kế linh hoạt các biểu mẫu đăng ký Masterclass, Workshop, Gala Dinner, Hội thảo vệ tinh hay Khảo sát ý kiến. Hỗ trợ VietQR tự động, tải biên lai, xuất Excel và sinh mã QR check-in.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <button
              onClick={() => setActiveTab('templates')}
              className="px-4 py-2.5 rounded-xl bg-slate-800/80 hover:bg-slate-700 text-white border border-slate-700 text-xs font-bold flex items-center gap-2 transition-all cursor-pointer shadow-sm"
            >
              <Sparkles className="w-4 h-4 text-amber-400" />
              <span>Thư Viện Mẫu</span>
            </button>
            <button
              onClick={() => handleCreateNewForm()}
              className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-pink-600 to-rose-600 hover:from-pink-500 hover:to-rose-500 text-white text-xs font-extrabold flex items-center gap-2 transition-all cursor-pointer shadow-lg shadow-pink-600/25 border-0"
            >
              <Plus className="w-4 h-4" />
              <span>+ Tạo Form Mới</span>
            </button>
          </div>
        </div>

        {/* Quick Stats Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mt-8 pt-6 border-t border-indigo-900/50">
          <div className="bg-slate-800/50 backdrop-blur-xs p-3.5 rounded-2xl border border-slate-700/50">
            <span className="text-[11px] font-bold text-slate-400 block uppercase">Tổng Số Biểu Mẫu</span>
            <div className="flex items-baseline gap-2 mt-1">
              <span className="text-xl sm:text-2xl font-black text-white">{stats.totalForms}</span>
              <span className="text-[10px] text-emerald-400 font-bold">({stats.activeForms} đang mở)</span>
            </div>
          </div>

          <div className="bg-slate-800/50 backdrop-blur-xs p-3.5 rounded-2xl border border-slate-700/50">
            <span className="text-[11px] font-bold text-slate-400 block uppercase">Tổng Lượt Đăng Ký</span>
            <div className="flex items-baseline gap-2 mt-1">
              <span className="text-xl sm:text-2xl font-black text-white">{stats.totalSubmissions}</span>
              <span className="text-[10px] text-pink-400 font-bold">lượt nộp form</span>
            </div>
          </div>

          <div className="bg-slate-800/50 backdrop-blur-xs p-3.5 rounded-2xl border border-slate-700/50">
            <span className="text-[11px] font-bold text-slate-400 block uppercase">Đã Thanh Toán</span>
            <div className="flex items-baseline gap-2 mt-1">
              <span className="text-xl sm:text-2xl font-black text-emerald-400">{stats.paidSubmissionsCount}</span>
              <span className="text-[10px] text-slate-400 font-medium">chứng từ</span>
            </div>
          </div>

          <div className="bg-slate-800/50 backdrop-blur-xs p-3.5 rounded-2xl border border-slate-700/50">
            <span className="text-[11px] font-bold text-slate-400 block uppercase">Doanh Thu Thu Phí Form</span>
            <div className="flex items-baseline gap-2 mt-1">
              <span className="text-lg sm:text-xl font-black text-amber-400">
                {stats.totalRevenue.toLocaleString('vi-VN')} đ
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Main Tabs Navigation */}
      <div className="flex items-center justify-between border-b border-slate-200">
        <div className="flex items-center gap-2 overflow-x-auto pb-px">
          <button
            onClick={() => setActiveTab('forms')}
            className={`flex items-center gap-2 px-5 py-3 text-xs font-bold border-b-2 transition-all cursor-pointer whitespace-nowrap ${
              activeTab === 'forms'
                ? 'border-pink-600 text-pink-600 bg-pink-50/50 rounded-t-xl'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <Layers className="w-4 h-4" />
            <span>Danh Sách Form ({forms.length})</span>
          </button>

          {editingForm && (
            <button
              onClick={() => setActiveTab('builder')}
              className={`flex items-center gap-2 px-5 py-3 text-xs font-bold border-b-2 transition-all cursor-pointer whitespace-nowrap ${
                activeTab === 'builder'
                  ? 'border-pink-600 text-pink-600 bg-pink-50/50 rounded-t-xl'
                  : 'border-transparent text-slate-500 hover:text-slate-800'
              }`}
            >
              <Edit3 className="w-4 h-4 text-pink-500" />
              <span>Chỉnh Sửa: {editingForm.title}</span>
            </button>
          )}

          <button
            onClick={() => setActiveTab('submissions')}
            className={`flex items-center gap-2 px-5 py-3 text-xs font-bold border-b-2 transition-all cursor-pointer whitespace-nowrap ${
              activeTab === 'submissions'
                ? 'border-pink-600 text-pink-600 bg-pink-50/50 rounded-t-xl'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <Users className="w-4 h-4" />
            <span>Đơn Đăng Ký ({submissions.length})</span>
          </button>

          <button
            onClick={() => setActiveTab('templates')}
            className={`flex items-center gap-2 px-5 py-3 text-xs font-bold border-b-2 transition-all cursor-pointer whitespace-nowrap ${
              activeTab === 'templates'
                ? 'border-pink-600 text-pink-600 bg-pink-50/50 rounded-t-xl'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <Sparkles className="w-4 h-4 text-amber-500" />
            <span>Thư Viện Mẫu Có Sẵn ({FORM_PRESETS.length})</span>
          </button>
        </div>
      </div>

      {/* ========================================================= */}
      {/* TAB 1: DANH SÁCH FORM (FORMS LIST) */}
      {/* ========================================================= */}
      {activeTab === 'forms' && (
        <div className="space-y-4">
          {/* Controls Bar: Search & Filters */}
          <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
            <div className="relative flex-1">
              <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Tìm kiếm theo tiêu đề biểu mẫu, đường dẫn slug..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-9 pr-4 py-2 border border-slate-200 rounded-xl text-xs focus:outline-none focus:border-indigo-500 bg-slate-50/50"
              />
            </div>

            <div className="flex flex-wrap items-center gap-2.5">
              <div className="flex items-center gap-1.5 text-xs text-slate-600">
                <Filter className="w-3.5 h-3.5 text-slate-400" />
                <span className="font-bold text-[11px]">Phân loại:</span>
                <select
                  value={categoryFilter}
                  onChange={(e) => setCategoryFilter(e.target.value)}
                  className="px-2.5 py-1.5 border border-slate-200 rounded-xl text-xs bg-white font-medium focus:outline-none"
                >
                  <option value="all">Tất cả phân loại</option>
                  <option value="masterclass">Masterclass / Workshop</option>
                  <option value="gala">Gala Dinner</option>
                  <option value="satellite">Hội thảo vệ tinh</option>
                  <option value="survey">Khảo sát ý kiến</option>
                  <option value="general">Chung / Tiêu chuẩn</option>
                </select>
              </div>

              <div className="flex items-center gap-1.5 text-xs text-slate-600">
                <span className="font-bold text-[11px]">Trạng thái:</span>
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="px-2.5 py-1.5 border border-slate-200 rounded-xl text-xs bg-white font-medium focus:outline-none"
                >
                  <option value="all">Tất cả trạng thái</option>
                  <option value="active">Đang mở (Active)</option>
                  <option value="paused">Tạm dừng (Paused)</option>
                  <option value="draft">Bản nháp (Draft)</option>
                </select>
              </div>
            </div>
          </div>

          {/* Form Cards Grid */}
          {filteredForms.length === 0 ? (
            <div className="bg-white rounded-3xl p-12 text-center border border-slate-200 space-y-4 shadow-xs">
              <div className="w-14 h-14 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center mx-auto">
                <FileText className="w-7 h-7" />
              </div>
              <div>
                <h3 className="text-base font-extrabold text-slate-900">Không tìm thấy biểu mẫu nào</h3>
                <p className="text-xs text-slate-500 mt-1">Hãy thử thay đổi bộ lọc tìm kiếm hoặc tạo biểu mẫu đăng ký mới.</p>
              </div>
              <button
                onClick={() => handleCreateNewForm()}
                className="px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold inline-flex items-center gap-2 cursor-pointer transition-all shadow-sm"
              >
                <Plus className="w-4 h-4" />
                <span>Tạo Biểu Mẫu Mới Ngay</span>
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
              {filteredForms.map((form) => {
                const subCount = submissions.filter(s => s.formId === form.id).length;
                const paidCount = submissions.filter(s => s.formId === form.id && s.paymentStatus === 'paid').length;
                const publicUrl = getPublicFormUrl(form);

                return (
                  <div 
                    key={form.id} 
                    className="bg-white rounded-3xl border border-slate-200 shadow-sm hover:shadow-md transition-all flex flex-col justify-between overflow-hidden group"
                  >
                    <div>
                      {/* Form Header Banner or Color bar */}
                      {form.bannerUrl ? (
                        <div className="h-32 w-full overflow-hidden relative bg-slate-100">
                          <img 
                            src={form.bannerUrl} 
                            alt={form.title} 
                            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" 
                          />
                          <div className="absolute inset-0 bg-gradient-to-t from-slate-950/70 via-transparent to-transparent" />
                          <div className="absolute bottom-3 left-4 right-4 flex items-center justify-between text-white">
                            <span className="text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full bg-white/20 backdrop-blur-xs border border-white/30">
                              {form.category}
                            </span>
                            <span className={`text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full ${
                              form.status === 'active' ? 'bg-emerald-500 text-white' :
                              form.status === 'paused' ? 'bg-amber-500 text-white' : 'bg-slate-500 text-white'
                            }`}>
                              {form.status === 'active' ? '● Đang mở' : form.status === 'paused' ? '⏸ Tạm dừng' : '✎ Bản nháp'}
                            </span>
                          </div>
                        </div>
                      ) : (
                        <div className="h-4 bg-gradient-to-r from-pink-500 via-indigo-500 to-teal-500" />
                      )}

                      <div className="p-5 space-y-3">
                        {!form.bannerUrl && (
                          <div className="flex items-center justify-between">
                            <span className="text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-md bg-indigo-50 text-indigo-700 border border-indigo-200/50">
                              {form.category}
                            </span>
                            <span className={`text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-md ${
                              form.status === 'active' ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' :
                              form.status === 'paused' ? 'bg-amber-50 text-amber-700 border border-amber-200' : 'bg-slate-100 text-slate-700'
                            }`}>
                              {form.status === 'active' ? '● Đang mở' : form.status === 'paused' ? '⏸ Tạm dừng' : '✎ Bản nháp'}
                            </span>
                          </div>
                        )}

                        <div>
                          <h3 className="font-extrabold text-sm text-slate-900 group-hover:text-indigo-600 transition-colors line-clamp-2">
                            {form.title}
                          </h3>
                          <p className="text-[11px] text-slate-500 line-clamp-2 mt-1 leading-relaxed">
                            {form.description || 'Chưa có mô tả cho biểu mẫu này.'}
                          </p>
                        </div>

                        {/* Metadata badges */}
                        <div className="pt-2 border-t border-slate-100 grid grid-cols-2 gap-2 text-[11px]">
                          <div className="flex items-center gap-1.5 text-slate-600">
                            <Layers className="w-3.5 h-3.5 text-slate-400" />
                            <span>{form.fields.length} trường dữ liệu</span>
                          </div>
                          <div className="flex items-center gap-1.5 text-slate-600">
                            <Users className="w-3.5 h-3.5 text-pink-500" />
                            <span className="font-bold text-slate-800">{subCount} đơn đăng ký</span>
                          </div>
                          <div className="flex items-center gap-1.5 text-slate-600">
                            <DollarSign className="w-3.5 h-3.5 text-emerald-500" />
                            <span className="font-bold">
                              {form.isFeeRequired ? `${(form.feeAmount || 0).toLocaleString('vi-VN')} đ` : 'Miễn phí'}
                            </span>
                          </div>
                          {form.deadline && (
                            <div className="flex items-center gap-1.5 text-slate-600">
                              <Calendar className="w-3.5 h-3.5 text-amber-500" />
                              <span>Hạn: {new Date(form.deadline).toLocaleDateString('vi-VN')}</span>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Action Buttons Bar */}
                    <div className="px-5 py-3.5 bg-slate-50/80 border-t border-slate-100 flex items-center justify-between gap-1.5">
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => {
                            setEditingForm(JSON.parse(JSON.stringify(form)));
                            setActiveTab('builder');
                            setBuilderSubTab('fields');
                          }}
                          title="Chỉnh sửa form"
                          className="p-1.5 rounded-lg text-slate-600 hover:text-indigo-600 hover:bg-white transition-all cursor-pointer border border-transparent hover:border-slate-200"
                        >
                          <Edit3 className="w-4 h-4" />
                        </button>

                        <button
                          onClick={() => setShareForm(form)}
                          title="Lấy link & Mã QR"
                          className="p-1.5 rounded-lg text-slate-600 hover:text-teal-600 hover:bg-white transition-all cursor-pointer border border-transparent hover:border-slate-200"
                        >
                          <QrCode className="w-4 h-4" />
                        </button>

                        <button
                          onClick={() => {
                            setSelectedFormForSubmissions(form.id);
                            setActiveTab('submissions');
                          }}
                          title="Xem danh sách người nộp đơn"
                          className="p-1.5 rounded-lg text-slate-600 hover:text-pink-600 hover:bg-white transition-all cursor-pointer border border-transparent hover:border-slate-200"
                        >
                          <Users className="w-4 h-4" />
                        </button>

                        <button
                          onClick={() => handleDuplicateForm(form)}
                          title="Nhân bản form"
                          className="p-1.5 rounded-lg text-slate-600 hover:text-slate-900 hover:bg-white transition-all cursor-pointer border border-transparent hover:border-slate-200"
                        >
                          <Copy className="w-4 h-4" />
                        </button>

                        <button
                          onClick={() => handleDeleteForm(form.id, form.title)}
                          title="Xóa form"
                          className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-white transition-all cursor-pointer border border-transparent hover:border-slate-200"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>

                      <a
                        href={publicUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white text-[11px] font-bold flex items-center gap-1 transition-all shadow-xs"
                      >
                        <span>Mở Form</span>
                        <ExternalLink className="w-3 h-3" />
                      </a>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ========================================================= */}
      {/* TAB 2: TRÌNH THIẾT KẾ BIỂU MẪU (FORM BUILDER) */}
      {/* ========================================================= */}
      {activeTab === 'builder' && editingForm && (
        <div className="space-y-5">
          {/* Builder Top Bar */}
          <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <button
                onClick={() => setActiveTab('forms')}
                className="p-2 rounded-xl text-slate-500 hover:bg-slate-100 hover:text-slate-900 transition-all cursor-pointer"
              >
                <ArrowLeft className="w-5 h-5" />
              </button>
              <div>
                <span className="text-[10px] font-black uppercase text-pink-600 block">Đang chỉnh sửa biểu mẫu</span>
                <h2 className="text-base font-extrabold text-slate-900 leading-tight">{editingForm.title}</h2>
              </div>
            </div>

            <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
              {/* Builder Sub-tab toggles */}
              <div className="bg-slate-100 p-1 rounded-xl flex items-center text-xs font-bold">
                <button
                  onClick={() => setBuilderSubTab('fields')}
                  className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
                    builderSubTab === 'fields' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-500 hover:text-slate-900'
                  }`}
                >
                  Trường Dữ Liệu ({editingForm.fields.length})
                </button>
                <button
                  onClick={() => setBuilderSubTab('settings')}
                  className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
                    builderSubTab === 'settings' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-500 hover:text-slate-900'
                  }`}
                >
                  Cài Đặt & Thu Phí
                </button>
                <button
                  onClick={() => setBuilderSubTab('preview')}
                  className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer flex items-center gap-1.5 ${
                    builderSubTab === 'preview' ? 'bg-white text-pink-600 shadow-xs' : 'text-slate-500 hover:text-slate-900'
                  }`}
                >
                  <Eye className="w-3.5 h-3.5" />
                  <span>Xem Trước</span>
                </button>
              </div>

              <button
                onClick={handleSaveForm}
                className="px-5 py-2 rounded-xl bg-pink-600 hover:bg-pink-700 text-white font-extrabold text-xs flex items-center gap-1.5 shadow-md shadow-pink-600/20 cursor-pointer transition-all border-0"
              >
                <Save className="w-4 h-4" />
                <span>Lưu Biểu Mẫu</span>
              </button>
            </div>
          </div>

          {/* Builder Subtab: Fields Designer */}
          {builderSubTab === 'fields' && (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Left Column: Fields list & reordering */}
              <div className="lg:col-span-2 space-y-4">
                <div className="bg-white p-5 rounded-3xl border border-slate-200 shadow-xs space-y-4">
                  <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                    <div>
                      <h3 className="text-sm font-extrabold text-slate-900">Các trường dữ liệu trong biểu mẫu</h3>
                      <p className="text-[11px] text-slate-500">Sắp xếp thứ tự hoặc nhấp vào để tùy chỉnh từng trường.</p>
                    </div>
                    <button
                      onClick={() => handleOpenFieldModal()}
                      className="px-3.5 py-1.5 rounded-xl bg-indigo-50 hover:bg-indigo-100 text-indigo-700 font-bold text-xs flex items-center gap-1.5 cursor-pointer transition-all"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>Thêm Trường Mới</span>
                    </button>
                  </div>

                  {editingForm.fields.length === 0 ? (
                    <div className="py-12 text-center text-slate-400 space-y-2">
                      <Layers className="w-8 h-8 mx-auto text-slate-300" />
                      <p className="text-xs font-bold">Chưa có trường dữ liệu nào trong form này</p>
                      <button
                        onClick={() => handleOpenFieldModal()}
                        className="px-4 py-2 bg-indigo-600 text-white rounded-xl text-xs font-bold cursor-pointer"
                      >
                        Thêm trường đầu tiên
                      </button>
                    </div>
                  ) : (
                    <div className="space-y-2.5">
                      {editingForm.fields.map((field, idx) => (
                        <div
                          key={field.id}
                          className={`p-3.5 rounded-2xl border transition-all flex items-center justify-between gap-3 ${
                            field.type === 'section'
                              ? 'bg-indigo-50/70 border-indigo-200 font-bold text-indigo-900'
                              : 'bg-white hover:bg-slate-50 border-slate-200'
                          }`}
                        >
                          <div className="flex items-center gap-3 flex-1 min-w-0">
                            <span className="w-6 h-6 rounded-lg bg-slate-100 text-slate-600 font-mono text-[10px] font-bold flex items-center justify-center shrink-0">
                              {idx + 1}
                            </span>
                            <div className="truncate flex-1">
                              <div className="flex items-center gap-2">
                                <span className="font-extrabold text-xs text-slate-900 truncate">{field.label}</span>
                                {field.required && (
                                  <span className="text-rose-500 text-xs font-bold">*</span>
                                )}
                              </div>
                              <div className="flex items-center gap-2 text-[10px] text-slate-400 font-mono mt-0.5">
                                <span>Loại: {field.type.toUpperCase()}</span>
                                <span>•</span>
                                <span>Key: {field.key}</span>
                                <span>•</span>
                                <span>Độ rộng: {field.width === 'half' ? '50%' : '100%'}</span>
                              </div>
                            </div>
                          </div>

                          <div className="flex items-center gap-1 shrink-0">
                            <button
                              disabled={idx === 0}
                              onClick={() => handleMoveField(idx, 'up')}
                              className="p-1.5 rounded-lg text-slate-400 hover:text-slate-800 hover:bg-slate-100 disabled:opacity-20 cursor-pointer"
                              title="Di chuyển lên"
                            >
                              <ArrowUp className="w-3.5 h-3.5" />
                            </button>
                            <button
                              disabled={idx === editingForm.fields.length - 1}
                              onClick={() => handleMoveField(idx, 'down')}
                              className="p-1.5 rounded-lg text-slate-400 hover:text-slate-800 hover:bg-slate-100 disabled:opacity-20 cursor-pointer"
                              title="Di chuyển xuống"
                            >
                              <ArrowDown className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={() => handleOpenFieldModal(field)}
                              className="p-1.5 rounded-lg text-indigo-600 hover:bg-indigo-50 cursor-pointer"
                              title="Chỉnh sửa trường này"
                            >
                              <Edit3 className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={() => handleDeleteField(field.id)}
                              className="p-1.5 rounded-lg text-rose-500 hover:bg-rose-50 cursor-pointer"
                              title="Xóa trường"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Quick Add Field Type buttons */}
                  <div className="pt-4 border-t border-slate-100">
                    <span className="text-[10.5px] font-bold text-slate-400 uppercase tracking-wider block mb-2">Thêm nhanh loại trường:</span>
                    <div className="flex flex-wrap gap-1.5 text-xs">
                      {[
                        { label: '+ Văn Bản Ngắn', type: 'text' },
                        { label: '+ Đoạn Văn (Textarea)', type: 'textarea' },
                        { label: '+ Số Điện Thoại', type: 'phone' },
                        { label: '+ Email', type: 'email' },
                        { label: '+ Menu Thả Xuống', type: 'select' },
                        { label: '+ Chọn 1 (Radio)', type: 'radio' },
                        { label: '+ Chọn Nhiều (Checkbox)', type: 'checkbox' },
                        { label: '+ Ngày Tháng', type: 'date' },
                        { label: '+ Tải Lên File / Ảnh', type: 'file' },
                        { label: '+ Phân Đoạn (Heading)', type: 'section' }
                      ].map((item, i) => (
                        <button
                          key={i}
                          type="button"
                          onClick={() => {
                            const newF: FormField = {
                              id: `f-${Date.now()}-${i}`,
                              label: item.label.replace('+ ', ''),
                              key: `field_${Date.now().toString().slice(-4)}_${i}`,
                              type: item.type as FormFieldType,
                              required: false,
                              options: item.type === 'select' || item.type === 'radio' || item.type === 'checkbox' ? ['Tùy chọn 1', 'Tùy chọn 2'] : undefined,
                              width: 'full'
                            };
                            setEditingForm({
                              ...editingForm,
                              fields: [...editingForm.fields, newF]
                            });
                          }}
                          className="px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 text-[11px] font-bold transition-all cursor-pointer"
                        >
                          {item.label}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              </div>

              {/* Right Column: Mini Form Info Card & Help */}
              <div className="space-y-4">
                <div className="bg-white p-5 rounded-3xl border border-slate-200 shadow-xs space-y-3">
                  <span className="text-[10px] font-black uppercase text-indigo-600 tracking-wider block">Tóm Tắt Biểu Mẫu</span>
                  <div className="space-y-2 text-xs">
                    <div>
                      <span className="text-slate-400 text-[11px] block">Tiêu đề:</span>
                      <span className="font-extrabold text-slate-900">{editingForm.title}</span>
                    </div>
                    <div>
                      <span className="text-slate-400 text-[11px] block">Đường dẫn slug:</span>
                      <span className="font-mono text-pink-600 bg-pink-50 px-2 py-0.5 rounded text-[11px] font-bold">{editingForm.slug}</span>
                    </div>
                    <div>
                      <span className="text-slate-400 text-[11px] block">Hình thức thu phí:</span>
                      <span className="font-bold text-slate-800">
                        {editingForm.isFeeRequired ? `Có thu phí (${(editingForm.feeAmount || 0).toLocaleString('vi-VN')} đ)` : 'Miễn phí'}
                      </span>
                    </div>
                    <div>
                      <span className="text-slate-400 text-[11px] block">Trạng thái:</span>
                      <span className={`px-2 py-0.5 rounded text-[10.5px] font-bold ${
                        editingForm.status === 'active' ? 'bg-emerald-100 text-emerald-800' :
                        editingForm.status === 'paused' ? 'bg-amber-100 text-amber-800' : 'bg-slate-100 text-slate-700'
                      }`}>
                        {editingForm.status.toUpperCase()}
                      </span>
                    </div>
                  </div>

                  <div className="pt-3 border-t border-slate-100 space-y-2">
                    <button
                      onClick={() => setBuilderSubTab('settings')}
                      className="w-full py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs transition-all cursor-pointer"
                    >
                      Cài Đặt Chi Tiết Form
                    </button>
                    <button
                      onClick={() => setBuilderSubTab('preview')}
                      className="w-full py-2 rounded-xl bg-indigo-50 hover:bg-indigo-100 text-indigo-700 font-bold text-xs transition-all cursor-pointer flex items-center justify-center gap-1.5"
                    >
                      <Eye className="w-4 h-4" />
                      <span>Xem Giao Diện Trực Quan</span>
                    </button>
                  </div>
                </div>

                <div className="bg-amber-50/70 border border-amber-250 p-4 rounded-2xl text-xs text-amber-900 space-y-2">
                  <div className="flex items-center gap-1.5 font-bold text-amber-950">
                    <Sparkles className="w-4 h-4 text-amber-600" />
                    <span>Mẹo Thiết Kế Form:</span>
                  </div>
                  <ul className="list-disc pl-4 space-y-1 text-[11px] text-amber-800">
                    <li>Dùng <strong>Phân Đoạn (Heading)</strong> để nhóm các thông tin cá nhân và chuyên môn.</li>
                    <li>Nên đặt các trường Họ tên, Điện thoại thành <strong>Bắt buộc</strong>.</li>
                    <li>Nếu thu phí, hãy chọn loại trường <strong>Tải Lên File</strong> để người đăng ký nộp ảnh biên lai chuyển khoản.</li>
                  </ul>
                </div>
              </div>
            </div>
          )}

          {/* Builder Subtab: Settings & Payment */}
          {builderSubTab === 'settings' && (
            <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-xs max-w-4xl space-y-6">
              <div>
                <h3 className="text-sm font-extrabold text-slate-900 uppercase tracking-wide">Cấu Hình Thông Tin Chung & Thanh Toán</h3>
                <p className="text-xs text-slate-500 mt-0.5">Thiết lập các thuộc tính tiêu đề, phí đăng ký và tài khoản nhận chuyển khoản VietQR.</p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="md:col-span-2">
                  <label className="block text-xs font-bold text-slate-700 mb-1">Tiêu Đề Biểu Mẫu (*)</label>
                  <input
                    type="text"
                    value={editingForm.title}
                    onChange={(e) => setEditingForm({ ...editingForm, title: e.target.value })}
                    className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl text-xs font-bold focus:outline-none focus:border-indigo-500"
                    placeholder="VD: Đăng Ký Tham Dự Masterclass & Thực Hành 2026"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Đường Dẫn URL Thân Thiện (Slug) (*)</label>
                  <div className="flex items-center">
                    <span className="px-3 py-2.5 bg-slate-100 border border-r-0 border-slate-200 rounded-l-xl text-xs text-slate-500 font-mono">
                      /?view=custom-form&id=
                    </span>
                    <input
                      type="text"
                      value={editingForm.slug}
                      onChange={(e) => setEditingForm({ ...editingForm, slug: e.target.value })}
                      className="flex-1 px-3.5 py-2.5 border border-slate-200 rounded-r-xl text-xs font-mono font-bold focus:outline-none focus:border-indigo-500"
                      placeholder="masterclass-2026"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Phân Loại Biểu Mẫu</label>
                  <select
                    value={editingForm.category}
                    onChange={(e) => setEditingForm({ ...editingForm, category: e.target.value as FormCategory })}
                    className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl text-xs font-bold bg-white focus:outline-none focus:border-indigo-500"
                  >
                    <option value="general">Chung / Tiêu chuẩn</option>
                    <option value="masterclass">Masterclass / Workshop thực hành</option>
                    <option value="gala">Gala Dinner</option>
                    <option value="satellite">Hội thảo vệ tinh</option>
                    <option value="vip">Khách mời VIP</option>
                    <option value="survey">Khảo sát ý kiến</option>
                    <option value="custom">Tùy biến khác</option>
                  </select>
                </div>

                <div className="md:col-span-2">
                  <label className="block text-xs font-bold text-slate-700 mb-1">Mô Tả / Hướng Dẫn Biểu Mẫu</label>
                  <textarea
                    rows={3}
                    value={editingForm.description || ''}
                    onChange={(e) => setEditingForm({ ...editingForm, description: e.target.value })}
                    className="w-full px-3.5 py-2 border border-slate-200 rounded-xl text-xs focus:outline-none focus:border-indigo-500"
                    placeholder="Nhập thông tin giới thiệu, địa điểm, thời gian, lưu ý cho người đăng ký..."
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Ảnh Bìa Header (Banner URL)</label>
                  <input
                    type="text"
                    value={editingForm.bannerUrl || ''}
                    onChange={(e) => setEditingForm({ ...editingForm, bannerUrl: e.target.value })}
                    className="w-full px-3.5 py-2 border border-slate-200 rounded-xl text-xs font-mono focus:outline-none focus:border-indigo-500"
                    placeholder="https://images.unsplash.com/..."
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Trạng Thái Đóng / Mở Nhận Đơn</label>
                  <select
                    value={editingForm.status}
                    onChange={(e) => setEditingForm({ ...editingForm, status: e.target.value as any })}
                    className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl text-xs font-bold bg-white focus:outline-none focus:border-indigo-500"
                  >
                    <option value="active">● Đang mở nhận đăng ký (Active)</option>
                    <option value="paused">⏸ Tạm dừng nhận đăng ký (Paused)</option>
                    <option value="draft">✎ Bản nháp nội bộ (Draft)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Hạn Chót Nhận Đăng Ký (Deadline)</label>
                  <input
                    type="date"
                    value={editingForm.deadline || ''}
                    onChange={(e) => setEditingForm({ ...editingForm, deadline: e.target.value })}
                    className="w-full px-3.5 py-2 border border-slate-200 rounded-xl text-xs focus:outline-none focus:border-indigo-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Giới Hạn Số Suất Tối Đa (Max Submissions)</label>
                  <input
                    type="number"
                    value={editingForm.maxSubmissions || ''}
                    onChange={(e) => setEditingForm({ ...editingForm, maxSubmissions: e.target.value ? parseInt(e.target.value, 10) : undefined })}
                    className="w-full px-3.5 py-2 border border-slate-200 rounded-xl text-xs focus:outline-none focus:border-indigo-500"
                    placeholder="Để trống nếu không giới hạn"
                  />
                </div>
              </div>

              {/* Fee & Payment Section */}
              <div className="pt-6 border-t border-slate-100 space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="text-xs font-extrabold text-slate-900 uppercase">Thu Phí Đăng Ký & Chuyển Khoản VietQR</h4>
                    <p className="text-[11px] text-slate-500">Bật nếu form này yêu cầu nộp lệ phí hoặc đặt cọc tham dự.</p>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={editingForm.isFeeRequired || false}
                      onChange={(e) => setEditingForm({ ...editingForm, isFeeRequired: e.target.checked })}
                      className="sr-only peer"
                    />
                    <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-pink-600"></div>
                  </label>
                </div>

                {editingForm.isFeeRequired && (
                  <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 grid grid-cols-1 md:grid-cols-2 gap-4 animate-fade-in">
                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">Số Tiền Lệ Phí (VNĐ)</label>
                      <input
                        type="number"
                        step={50000}
                        value={editingForm.feeAmount || 0}
                        onChange={(e) => setEditingForm({ ...editingForm, feeAmount: parseInt(e.target.value, 10) || 0 })}
                        className="w-full px-3.5 py-2 border border-slate-200 rounded-xl text-xs font-extrabold focus:outline-none bg-white text-emerald-600"
                        placeholder="VD: 1500000"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">Diễn Giải Khoản Phí</label>
                      <input
                        type="text"
                        value={editingForm.feeDescription || ''}
                        onChange={(e) => setEditingForm({ ...editingForm, feeDescription: e.target.value })}
                        className="w-full px-3.5 py-2 border border-slate-200 rounded-xl text-xs focus:outline-none bg-white"
                        placeholder="VD: Phí tham dự Masterclass & CME"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">Ngân Hàng Thụ Hưởng</label>
                      <input
                        type="text"
                        value={editingForm.bankName || 'MB Bank'}
                        onChange={(e) => setEditingForm({ ...editingForm, bankName: e.target.value })}
                        className="w-full px-3.5 py-2 border border-slate-200 rounded-xl text-xs focus:outline-none bg-white"
                        placeholder="MB Bank (Ngân hàng Quân Đội)"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">Số Tài Khoản Nhận</label>
                      <input
                        type="text"
                        value={editingForm.bankAccount || '10112026'}
                        onChange={(e) => setEditingForm({ ...editingForm, bankAccount: e.target.value })}
                        className="w-full px-3.5 py-2 border border-slate-200 rounded-xl text-xs font-mono font-bold focus:outline-none bg-white"
                        placeholder="10112026"
                      />
                    </div>

                    <div className="md:col-span-2">
                      <label className="block text-xs font-bold text-slate-700 mb-1">Tên Chủ Tài Khoản</label>
                      <input
                        type="text"
                        value={editingForm.bankAccountName || 'BAN TO CHUC VSAPS'}
                        onChange={(e) => setEditingForm({ ...editingForm, bankAccountName: e.target.value })}
                        className="w-full px-3.5 py-2 border border-slate-200 rounded-xl text-xs font-bold uppercase focus:outline-none bg-white"
                        placeholder="BAN TO CHUC HOI NGHI VSAPS"
                      />
                    </div>
                  </div>
                )}
              </div>

              {/* Post-submit Message */}
              <div className="pt-6 border-t border-slate-100 space-y-4">
                <h4 className="text-xs font-extrabold text-slate-900 uppercase">Thông Báo Sau Khi Gửi Đơn Thành Công</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="md:col-span-2">
                    <label className="block text-xs font-bold text-slate-700 mb-1">Nội Dung Thông Điệp Xác Nhận</label>
                    <textarea
                      rows={2}
                      value={editingForm.successMessage || ''}
                      onChange={(e) => setEditingForm({ ...editingForm, successMessage: e.target.value })}
                      className="w-full px-3.5 py-2 border border-slate-200 rounded-xl text-xs focus:outline-none focus:border-indigo-500"
                      placeholder="Chúc mừng Quý vị đã gửi đơn đăng ký thành công..."
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">Chữ Trên Nút Bấm Nộp Form</label>
                    <input
                      type="text"
                      value={editingForm.submitButtonText || 'Xác Nhận Đăng Ký'}
                      onChange={(e) => setEditingForm({ ...editingForm, submitButtonText: e.target.value })}
                      className="w-full px-3.5 py-2 border border-slate-200 rounded-xl text-xs font-bold focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">Chuyển Hướng Sau Khi Nộp (Redirect URL - Tùy chọn)</label>
                    <input
                      type="text"
                      value={editingForm.redirectUrl || ''}
                      onChange={(e) => setEditingForm({ ...editingForm, redirectUrl: e.target.value })}
                      className="w-full px-3.5 py-2 border border-slate-200 rounded-xl text-xs focus:outline-none"
                      placeholder="https://..."
                    />
                  </div>
                </div>
              </div>

              <div className="pt-6 border-t border-slate-100 flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setBuilderSubTab('fields')}
                  className="px-5 py-2 rounded-xl border border-slate-200 text-xs font-bold text-slate-600 hover:bg-slate-50 cursor-pointer"
                >
                  Quay Lại Sửa Trường
                </button>
                <button
                  type="button"
                  onClick={handleSaveForm}
                  className="px-6 py-2.5 rounded-xl bg-pink-600 hover:bg-pink-700 text-white font-extrabold text-xs flex items-center gap-1.5 shadow-md shadow-pink-600/20 cursor-pointer border-0"
                >
                  <Save className="w-4 h-4" />
                  <span>Lưu Toàn Bộ Biểu Mẫu</span>
                </button>
              </div>
            </div>
          )}

          {/* Builder Subtab: Live Preview */}
          {builderSubTab === 'preview' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between bg-white p-3 rounded-2xl border border-slate-200">
                <span className="text-xs font-bold text-slate-600 flex items-center gap-2">
                  <Eye className="w-4 h-4 text-indigo-600" />
                  <span>Chế độ xem trước thời gian thực (Live Preview):</span>
                </span>
                <div className="flex items-center gap-1.5 bg-slate-100 p-1 rounded-xl">
                  <button
                    onClick={() => setPreviewDevice('desktop')}
                    className={`px-3 py-1 rounded-lg text-xs font-bold transition-all flex items-center gap-1 cursor-pointer ${
                      previewDevice === 'desktop' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-500'
                    }`}
                  >
                    <Monitor className="w-3.5 h-3.5" />
                    <span>Máy tính</span>
                  </button>
                  <button
                    onClick={() => setPreviewDevice('mobile')}
                    className={`px-3 py-1 rounded-lg text-xs font-bold transition-all flex items-center gap-1 cursor-pointer ${
                      previewDevice === 'mobile' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-500'
                    }`}
                  >
                    <Smartphone className="w-3.5 h-3.5" />
                    <span>Điện thoại</span>
                  </button>
                </div>
              </div>

              {/* Preview Canvas Container */}
              <div className="bg-slate-100 p-4 sm:p-8 rounded-3xl flex justify-center min-h-[600px] border border-slate-200">
                <div 
                  className={`bg-white rounded-3xl shadow-xl overflow-hidden border border-slate-200 transition-all ${
                    previewDevice === 'mobile' ? 'w-full max-w-sm' : 'w-full max-w-2xl'
                  }`}
                >
                  {/* Mock Form Header */}
                  {editingForm.bannerUrl ? (
                    <div className="h-40 w-full overflow-hidden relative bg-slate-100">
                      <img src={editingForm.bannerUrl} alt="Banner" className="w-full h-full object-cover" />
                      <div className="absolute inset-0 bg-gradient-to-t from-slate-950/80 via-slate-950/20 to-transparent" />
                      <div className="absolute bottom-4 left-5 right-5 text-white">
                        <span className="text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full bg-pink-500/80 text-white">
                          VSAPS 2026
                        </span>
                        <h2 className="text-base sm:text-lg font-black mt-1 leading-snug">{editingForm.title}</h2>
                      </div>
                    </div>
                  ) : (
                    <div className="p-6 bg-gradient-to-r from-indigo-900 to-slate-900 text-white">
                      <span className="text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full bg-pink-500/80 text-white">
                        VSAPS 2026
                      </span>
                      <h2 className="text-base sm:text-lg font-black mt-2 leading-snug">{editingForm.title}</h2>
                    </div>
                  )}

                  <div className="p-5 sm:p-7 space-y-5">
                    {editingForm.description && (
                      <p className="text-xs text-slate-600 bg-slate-50 p-3.5 rounded-2xl border border-slate-100 leading-relaxed">
                        {editingForm.description}
                      </p>
                    )}

                    {/* Render Fields Preview */}
                    <div className="space-y-4">
                      {editingForm.fields.map((f) => {
                        if (f.type === 'section') {
                          return (
                            <div key={f.id} className="pt-3 border-t border-slate-200">
                              <h4 className="text-xs font-black uppercase text-indigo-950 tracking-wider flex items-center gap-1.5">
                                <span className="w-1.5 h-3.5 bg-pink-600 rounded-full" />
                                <span>{f.label}</span>
                              </h4>
                            </div>
                          );
                        }

                        return (
                          <div key={f.id} className="space-y-1">
                            <label className="block text-xs font-bold text-slate-800">
                              {f.label} {f.required && <span className="text-rose-500">*</span>}
                            </label>

                            {f.type === 'text' || f.type === 'phone' || f.type === 'email' || f.type === 'number' ? (
                              <input
                                type={f.type === 'number' ? 'number' : f.type === 'email' ? 'email' : 'text'}
                                disabled
                                placeholder={f.placeholder || `Nhập ${f.label.toLowerCase()}...`}
                                className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs bg-slate-50 text-slate-400"
                              />
                            ) : f.type === 'textarea' ? (
                              <textarea
                                disabled
                                rows={2}
                                placeholder={f.placeholder || 'Nhập nội dung...'}
                                className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs bg-slate-50 text-slate-400"
                              />
                            ) : f.type === 'select' ? (
                              <select disabled className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs bg-slate-50 text-slate-400">
                                <option>-- {f.placeholder || 'Vui lòng chọn'} --</option>
                                {(f.options || []).map((opt, oi) => (
                                  <option key={oi}>{opt}</option>
                                ))}
                              </select>
                            ) : f.type === 'radio' ? (
                              <div className="space-y-1.5 pt-1">
                                {(f.options || ['Tùy chọn A', 'Tùy chọn B']).map((opt, oi) => (
                                  <label key={oi} className="flex items-center gap-2 text-xs text-slate-600 cursor-not-allowed">
                                    <input type="radio" disabled checked={oi === 0} className="text-indigo-600" />
                                    <span>{opt}</span>
                                  </label>
                                ))}
                              </div>
                            ) : f.type === 'checkbox' ? (
                              <div className="space-y-1.5 pt-1">
                                {(f.options || ['Lựa chọn 1', 'Lựa chọn 2']).map((opt, oi) => (
                                  <label key={oi} className="flex items-center gap-2 text-xs text-slate-600 cursor-not-allowed">
                                    <input type="checkbox" disabled className="rounded text-indigo-600" />
                                    <span>{opt}</span>
                                  </label>
                                ))}
                              </div>
                            ) : f.type === 'file' ? (
                              <div className="p-3 border-2 border-dashed border-slate-200 rounded-xl text-center bg-slate-50 text-slate-400 text-xs">
                                <ImageIcon className="w-5 h-5 mx-auto mb-1 text-slate-400" />
                                <span>Nhấn để chọn tệp hoặc kéo thả file biên lai vào đây</span>
                              </div>
                            ) : null}

                            {f.helpText && (
                              <p className="text-[10px] text-slate-400">{f.helpText}</p>
                            )}
                          </div>
                        );
                      })}
                    </div>

                    {/* Preview Submit Button */}
                    <div className="pt-4 border-t border-slate-100">
                      <button
                        type="button"
                        disabled
                        className="w-full py-3 bg-gradient-to-r from-pink-600 to-rose-600 text-white font-extrabold text-xs rounded-xl shadow-md uppercase tracking-wider opacity-90"
                      >
                        {editingForm.submitButtonText || 'Xác Nhận Đăng Ký'}
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ========================================================= */}
      {/* TAB 3: QUẢN LÝ ĐƠN ĐĂNG KÝ (SUBMISSIONS) */}
      {/* ========================================================= */}
      {activeTab === 'submissions' && (
        <div className="space-y-4">
          {/* Submissions Filter Bar */}
          <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
            <div className="flex flex-wrap items-center gap-2 flex-1">
              <div className="relative min-w-[240px] flex-1">
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="Tìm theo tên người nộp, số điện thoại, mã đơn..."
                  value={submissionSearchTerm}
                  onChange={(e) => setSubmissionSearchTerm(e.target.value)}
                  className="w-full pl-9 pr-4 py-2 border border-slate-200 rounded-xl text-xs focus:outline-none focus:border-indigo-500 bg-slate-50/50"
                />
              </div>

              <div className="flex items-center gap-1.5 text-xs">
                <span className="font-bold text-slate-600">Lọc theo Form:</span>
                <select
                  value={selectedFormForSubmissions}
                  onChange={(e) => setSelectedFormForSubmissions(e.target.value)}
                  className="px-3 py-1.5 border border-slate-200 rounded-xl text-xs font-medium bg-white focus:outline-none max-w-xs truncate"
                >
                  <option value="all">Tất cả các Form ({submissions.length})</option>
                  {forms.map(f => (
                    <option key={f.id} value={f.id}>
                      {f.title} ({submissions.filter(s => s.formId === f.id).length})
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <button
              onClick={() => handleExportSubmissionsExcel(selectedFormForSubmissions)}
              className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-extrabold flex items-center gap-2 cursor-pointer transition-all shadow-sm shrink-0 border-0"
            >
              <FileSpreadsheet className="w-4 h-4" />
              <span>Xuất File Excel (.xlsx)</span>
            </button>
          </div>

          {/* Submissions Table */}
          {submissions.length === 0 ? (
            <div className="bg-white rounded-3xl p-12 text-center border border-slate-200 space-y-3 shadow-xs">
              <Users className="w-10 h-10 mx-auto text-slate-300" />
              <h3 className="text-sm font-extrabold text-slate-800">Chưa có lượt đăng ký nào</h3>
              <p className="text-xs text-slate-500">Khi người tham dự điền biểu mẫu công khai, thông tin sẽ hiển thị tức thì tại đây.</p>
            </div>
          ) : (
            <div className="bg-white rounded-3xl border border-slate-200 overflow-hidden shadow-xs">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-100/80 text-[10.5px] uppercase font-bold text-slate-500 border-b border-slate-200">
                    <tr>
                      <th className="px-4 py-3">Mã Đơn</th>
                      <th className="px-4 py-3">Người Đăng Ký</th>
                      <th className="px-4 py-3">Biểu Mẫu</th>
                      <th className="px-4 py-3">Liên Hệ</th>
                      <th className="px-4 py-3">Thanh Toán</th>
                      <th className="px-4 py-3">Trạng Thái</th>
                      <th className="px-4 py-3 text-right">Thao Tác</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {submissions
                      .filter(sub => {
                        const matchForm = selectedFormForSubmissions === 'all' || sub.formId === selectedFormForSubmissions;
                        const matchSearch = 
                          (sub.fullName && sub.fullName.toLowerCase().includes(submissionSearchTerm.toLowerCase())) ||
                          (sub.phone && sub.phone.includes(submissionSearchTerm)) ||
                          (sub.email && sub.email.toLowerCase().includes(submissionSearchTerm.toLowerCase())) ||
                          sub.submissionCode.toLowerCase().includes(submissionSearchTerm.toLowerCase());
                        return matchForm && matchSearch;
                      })
                      .map((sub) => (
                        <tr key={sub.id} className="hover:bg-slate-50/80 transition-colors">
                          <td className="px-4 py-3 font-mono font-extrabold text-pink-600">
                            {sub.submissionCode}
                          </td>
                          <td className="px-4 py-3">
                            <div className="font-extrabold text-slate-900">{sub.fullName || 'Khách vãng lai'}</div>
                            {sub.organization && (
                              <div className="text-[10.5px] text-slate-500 truncate max-w-xs">{sub.organization}</div>
                            )}
                          </td>
                          <td className="px-4 py-3">
                            <span className="font-semibold text-slate-800 line-clamp-1 max-w-xs">{sub.formTitle}</span>
                            <span className="text-[10px] text-slate-400 block mt-0.5">
                              {new Date(sub.submittedAt).toLocaleString('vi-VN')}
                            </span>
                          </td>
                          <td className="px-4 py-3 font-mono text-[11px] space-y-0.5">
                            {sub.phone && <div className="text-slate-800">{sub.phone}</div>}
                            {sub.email && <div className="text-slate-500">{sub.email}</div>}
                          </td>
                          <td className="px-4 py-3">
                            <span className={`px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider ${
                              sub.paymentStatus === 'paid' ? 'bg-emerald-100 text-emerald-800' :
                              sub.paymentStatus === 'pending' ? 'bg-amber-100 text-amber-800' : 'bg-slate-100 text-slate-600'
                            }`}>
                              {sub.paymentStatus === 'paid' ? '✓ Đã Đóng Phí' : sub.paymentStatus === 'pending' ? '⏳ Chờ Duyệt' : 'Miễn Phí'}
                            </span>
                          </td>
                          <td className="px-4 py-3">
                            <select
                              value={sub.status}
                              onChange={async (e) => {
                                await store.updateCustomSubmissionStatus(sub.id, e.target.value as any);
                                reloadData();
                                showToast('Đã cập nhật trạng thái đơn thành công!');
                              }}
                              className={`px-2 py-1 rounded-lg text-xs font-bold border focus:outline-none cursor-pointer ${
                                sub.status === 'confirmed' ? 'bg-emerald-50 text-emerald-800 border-emerald-200' :
                                sub.status === 'pending' ? 'bg-amber-50 text-amber-800 border-amber-200' : 'bg-rose-50 text-rose-800 border-rose-200'
                              }`}
                            >
                              <option value="confirmed">Xác Nhận</option>
                              <option value="pending">Chờ Xử Lý</option>
                              <option value="cancelled">Hủy Bỏ</option>
                            </select>
                          </td>
                          <td className="px-4 py-3 text-right">
                            <button
                              onClick={() => setSelectedSubmissionDetail(sub)}
                              className="px-3 py-1.5 rounded-lg bg-indigo-50 hover:bg-indigo-100 text-indigo-700 font-bold text-xs inline-flex items-center gap-1 cursor-pointer"
                            >
                              <Eye className="w-3.5 h-3.5" />
                              <span>Chi Tiết</span>
                            </button>
                          </td>
                        </tr>
                      ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ========================================================= */}
      {/* TAB 4: THƯ VIỆN MẪU FORM CÓ SẴN (FORM TEMPLATES) */}
      {/* ========================================================= */}
      {activeTab === 'templates' && (
        <div className="space-y-6">
          <div className="bg-white p-5 rounded-2xl border border-slate-200">
            <h3 className="text-sm font-extrabold text-slate-900 uppercase">Thư Viện Mẫu Biểu Mẫu Chuẩn VSAPS 2026</h3>
            <p className="text-xs text-slate-500 mt-1">Chọn một mẫu chuẩn có sẵn để khởi tạo nhanh form đăng ký chỉ trong 1 click. Bạn hoàn toàn có thể chỉnh sửa lại các trường sau khi tạo.</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {FORM_PRESETS.map((preset) => (
              <div 
                key={preset.id}
                className="bg-white rounded-3xl border border-slate-200 p-6 flex flex-col justify-between hover:shadow-md transition-all space-y-5"
              >
                <div className="space-y-3">
                  <div className="w-12 h-12 rounded-2xl bg-pink-50 text-pink-600 flex items-center justify-center font-bold">
                    <Sparkles className="w-6 h-6" />
                  </div>
                  <div>
                    <h4 className="font-black text-sm text-slate-900">{preset.name}</h4>
                    <p className="text-xs text-slate-500 mt-1 leading-relaxed">{preset.description}</p>
                  </div>

                  <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-600">
                    <span>{preset.sampleFields.length} trường định sẵn</span>
                    <span className="font-bold text-emerald-600">
                      {preset.isFeeDefault ? `${preset.defaultFee.toLocaleString('vi-VN')} đ` : 'Miễn phí'}
                    </span>
                  </div>
                </div>

                <button
                  onClick={() => handleCreateNewForm(preset)}
                  className="w-full py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-extrabold text-xs flex items-center justify-center gap-2 transition-all cursor-pointer shadow-sm border-0"
                >
                  <Plus className="w-4 h-4" />
                  <span>Sử Dụng Mẫu Này</span>
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* MODAL: CHỈNH SỬA / THÊM TRƯỜNG DỮ LIỆU (FIELD MODAL) */}
      {/* ========================================================= */}
      {isFieldModalOpen && editingField && (
        <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-lg w-full overflow-hidden border border-slate-200 shadow-2xl animate-fade-in text-slate-900">
            <div className="bg-slate-900 p-4 text-white flex items-center justify-between">
              <h4 className="font-extrabold text-xs tracking-wider uppercase flex items-center gap-2">
                <Settings className="w-4 h-4 text-pink-400" />
                <span>Cấu Hình Trường Dữ Liệu</span>
              </h4>
              <button
                onClick={() => setIsFieldModalOpen(false)}
                className="text-slate-400 hover:text-white font-bold cursor-pointer"
              >
                ✕
              </button>
            </div>

            <div className="p-5 space-y-4 text-xs font-sans">
              <div>
                <label className="block font-bold text-slate-700 mb-1">Tên Hiển Thị (Label) (*)</label>
                <input
                  type="text"
                  value={editingField.label}
                  onChange={(e) => setEditingField({ ...editingField, label: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs font-bold focus:outline-none focus:border-indigo-500"
                  placeholder="VD: Số CCCD / Định danh cá nhân"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Loại Trường (Field Type)</label>
                  <select
                    value={editingField.type}
                    onChange={(e) => setEditingField({ ...editingField, type: e.target.value as FormFieldType })}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs font-bold bg-white focus:outline-none"
                  >
                    <option value="text">Văn bản ngắn (Text)</option>
                    <option value="textarea">Đoạn văn dài (Textarea)</option>
                    <option value="number">Số (Number)</option>
                    <option value="phone">Số điện thoại (Phone)</option>
                    <option value="email">Email</option>
                    <option value="select">Hộp chọn thả xuống (Select)</option>
                    <option value="radio">Chọn 1 trong nhiều (Radio)</option>
                    <option value="checkbox">Chọn nhiều (Checkbox)</option>
                    <option value="date">Chọn ngày (Date)</option>
                    <option value="file">Tải lên tệp / Ảnh (File)</option>
                    <option value="section">Phân đoạn nhóm (Section Heading)</option>
                  </select>
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">Độ Rộng Khối</label>
                  <select
                    value={editingField.width || 'full'}
                    onChange={(e) => setEditingField({ ...editingField, width: e.target.value as 'full' | 'half' })}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs font-bold bg-white focus:outline-none"
                  >
                    <option value="full">Toàn dòng (100% Width)</option>
                    <option value="half">Nửa dòng (50% Width)</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Mã Định Danh (Field Key - Tự Sinh)</label>
                <input
                  type="text"
                  value={editingField.key}
                  onChange={(e) => setEditingField({ ...editingField, key: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs font-mono focus:outline-none text-slate-600 bg-slate-50"
                  placeholder="field_key"
                />
              </div>

              {/* Options list for select, radio, checkbox */}
              {(editingField.type === 'select' || editingField.type === 'radio' || editingField.type === 'checkbox') && (
                <div>
                  <label className="block font-bold text-slate-700 mb-1">
                    Danh Sách Tùy Chọn (Mỗi tùy chọn 1 dòng):
                  </label>
                  <textarea
                    rows={4}
                    value={(editingField.options || []).join('\n')}
                    onChange={(e) => setEditingField({
                      ...editingField,
                      options: e.target.value.split('\n').filter(s => s.trim() !== '')
                    })}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs focus:outline-none"
                    placeholder="Tùy chọn 1&#10;Tùy chọn 2&#10;Tùy chọn 3"
                  />
                </div>
              )}

              <div>
                <label className="block font-bold text-slate-700 mb-1">Gợi Ý Nhập (Placeholder)</label>
                <input
                  type="text"
                  value={editingField.placeholder || ''}
                  onChange={(e) => setEditingField({ ...editingField, placeholder: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs focus:outline-none"
                  placeholder="VD: Nhập số điện thoại Zalo..."
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Ghi Chú Hướng Dẫn Thêm (Help Text)</label>
                <input
                  type="text"
                  value={editingField.helpText || ''}
                  onChange={(e) => setEditingField({ ...editingField, helpText: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs focus:outline-none"
                  placeholder="VD: Vui lòng nhập đúng để nhận mã thẻ đeo"
                />
              </div>

              <div className="flex items-center pt-2">
                <label className="inline-flex items-center gap-2 cursor-pointer text-xs font-bold text-slate-800">
                  <input
                    type="checkbox"
                    checked={editingField.required}
                    onChange={(e) => setEditingField({ ...editingField, required: e.target.checked })}
                    className="w-4 h-4 text-pink-600 rounded border-slate-300"
                  />
                  <span>Bắt buộc phải điền trường này (Required)</span>
                </label>
              </div>

              <div className="pt-4 border-t border-slate-100 flex justify-end gap-2.5">
                <button
                  type="button"
                  onClick={() => setIsFieldModalOpen(false)}
                  className="px-4 py-2 rounded-xl text-slate-600 hover:bg-slate-100 font-bold text-xs cursor-pointer"
                >
                  Hủy
                </button>
                <button
                  type="button"
                  onClick={handleSaveField}
                  className="px-5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-extrabold text-xs cursor-pointer border-0"
                >
                  Xác Nhận Lưu Trường
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* MODAL: CHIA SẺ LINK & MÃ QR FORM (SHARE MODAL) */}
      {/* ========================================================= */}
      {shareForm && (
        <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full overflow-hidden border border-slate-200 shadow-2xl animate-fade-in text-slate-900">
            <div className="bg-slate-900 p-4 text-white flex items-center justify-between">
              <h4 className="font-extrabold text-xs tracking-wider uppercase flex items-center gap-2">
                <Share2 className="w-4 h-4 text-emerald-400" />
                <span>Chia Sẻ & Mã QR Biểu Mẫu</span>
              </h4>
              <button
                onClick={() => setShareForm(null)}
                className="text-slate-400 hover:text-white font-bold cursor-pointer"
              >
                ✕
              </button>
            </div>

            <div className="p-6 text-center space-y-5">
              <div>
                <h3 className="font-extrabold text-sm text-slate-900">{shareForm.title}</h3>
                <p className="text-[11px] text-slate-500 mt-1">Quét mã QR bằng Camera điện thoại hoặc Zalo để mở form đăng ký trực tiếp.</p>
              </div>

              {/* QR Code */}
              <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 inline-block shadow-xs">
                <img
                  src={`https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(getPublicFormUrl(shareForm))}`}
                  alt="QR Code Form"
                  className="w-44 h-44 object-contain mx-auto"
                />
              </div>

              {/* Public URL Box */}
              <div className="text-left space-y-1">
                <span className="text-[10.5px] font-bold text-slate-500 block uppercase">Đường dẫn truy cập công khai:</span>
                <div className="flex items-center gap-1.5">
                  <input
                    type="text"
                    readOnly
                    value={getPublicFormUrl(shareForm)}
                    className="flex-1 px-3 py-2 bg-slate-100 border border-slate-200 rounded-xl text-xs font-mono text-slate-700 focus:outline-none"
                  />
                  <button
                    onClick={() => {
                      navigator.clipboard.writeText(getPublicFormUrl(shareForm));
                      setCopiedLink(true);
                      setTimeout(() => setCopiedLink(false), 2500);
                    }}
                    className="px-3.5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold cursor-pointer transition-all shrink-0 border-0"
                  >
                    {copiedLink ? 'Đã chép!' : 'Sao chép'}
                  </button>
                </div>
              </div>

              <div className="flex items-center justify-center gap-3 pt-2">
                <a
                  href={getPublicFormUrl(shareForm)}
                  target="_blank"
                  rel="noreferrer"
                  className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-bold inline-flex items-center gap-1.5"
                >
                  <ExternalLink className="w-3.5 h-3.5" />
                  <span>Mở Form Thực Tế</span>
                </a>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* MODAL: CHI TIẾT ĐƠN ĐĂNG KÝ (SUBMISSION DETAIL MODAL) */}
      {/* ========================================================= */}
      {selectedSubmissionDetail && (
        <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-lg w-full overflow-hidden border border-slate-200 shadow-2xl animate-fade-in text-slate-900 max-h-[90vh] flex flex-col">
            <div className="bg-slate-900 p-4 text-white flex items-center justify-between shrink-0">
              <h4 className="font-extrabold text-xs tracking-wider uppercase flex items-center gap-2">
                <FileText className="w-4 h-4 text-pink-400" />
                <span>Chi Tiết Đơn Đăng Ký: {selectedSubmissionDetail.submissionCode}</span>
              </h4>
              <button
                onClick={() => setSelectedSubmissionDetail(null)}
                className="text-slate-400 hover:text-white font-bold cursor-pointer"
              >
                ✕
              </button>
            </div>

            <div className="p-6 overflow-y-auto space-y-4 text-xs font-sans">
              <div className="bg-indigo-50/60 p-4 rounded-2xl border border-indigo-100 space-y-1.5">
                <span className="text-[10px] font-bold uppercase text-indigo-700 block">Thông Tin Biểu Mẫu</span>
                <h3 className="font-black text-sm text-slate-900">{selectedSubmissionDetail.formTitle}</h3>
                <div className="text-[11px] text-slate-500">
                  Thời gian gửi: {new Date(selectedSubmissionDetail.submittedAt).toLocaleString('vi-VN')}
                </div>
              </div>

              {/* All Submitted Answers */}
              <div className="space-y-3">
                <h4 className="font-extrabold text-xs text-slate-800 uppercase tracking-wider border-b border-slate-100 pb-1.5">
                  Dữ Liệu Người Đăng Ký Đã Điền:
                </h4>

                <div className="space-y-2 bg-slate-50 p-4 rounded-2xl border border-slate-200">
                  {Object.entries(selectedSubmissionDetail.data).map(([key, value]) => {
                    const isImage = typeof value === 'string' && (value.startsWith('data:image') || value.startsWith('http') && (value.endsWith('.jpg') || value.endsWith('.png') || value.endsWith('.jpeg')));
                    return (
                      <div key={key} className="border-b border-slate-200/60 pb-2 last:border-b-0 last:pb-0">
                        <span className="text-[10.5px] font-bold text-slate-500 uppercase block">{key}:</span>
                        {isImage ? (
                          <div className="mt-1">
                            <a href={value} target="_blank" rel="noreferrer" className="block">
                              <img src={value} alt="Attachment" className="max-h-48 rounded-xl object-contain border border-slate-300 shadow-xs" />
                            </a>
                            <span className="text-[10px] text-indigo-600 underline mt-0.5 block">Nhấp để xem ảnh gốc</span>
                          </div>
                        ) : (
                          <span className="font-bold text-slate-900 text-xs block mt-0.5">
                            {Array.isArray(value) ? value.join(', ') : String(value || '-')}
                          </span>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Status Update Actions */}
              <div className="pt-3 border-t border-slate-100 flex items-center justify-between">
                <span className="font-bold text-xs text-slate-700">Trạng thái duyệt:</span>
                <div className="flex gap-2">
                  <button
                    onClick={async () => {
                      await store.updateCustomSubmissionStatus(selectedSubmissionDetail.id, 'confirmed');
                      setSelectedSubmissionDetail({ ...selectedSubmissionDetail, status: 'confirmed' });
                      reloadData();
                      showToast('Đã xác nhận đơn đăng ký!');
                    }}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold cursor-pointer ${
                      selectedSubmissionDetail.status === 'confirmed'
                        ? 'bg-emerald-600 text-white'
                        : 'bg-slate-100 text-slate-700 hover:bg-emerald-50'
                    }`}
                  >
                    ✓ Đã Xác Nhận
                  </button>
                  <button
                    onClick={async () => {
                      await store.updateCustomSubmissionStatus(selectedSubmissionDetail.id, 'cancelled');
                      setSelectedSubmissionDetail({ ...selectedSubmissionDetail, status: 'cancelled' });
                      reloadData();
                      showToast('Đã hủy đơn đăng ký!');
                    }}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold cursor-pointer ${
                      selectedSubmissionDetail.status === 'cancelled'
                        ? 'bg-rose-600 text-white'
                        : 'bg-slate-100 text-slate-700 hover:bg-rose-50'
                    }`}
                  >
                    ✕ Hủy Đơn
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
