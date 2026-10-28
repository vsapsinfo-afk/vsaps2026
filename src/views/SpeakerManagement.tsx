/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { Search, ListFilter, CheckCircle, XCircle, Clock, FileText, Calendar, Eye, UserCheck, Sparkles, Table, LayoutGrid, FileSpreadsheet, Printer, ArrowUpDown, Download, AlertTriangle, ShieldCheck, Layers, Plus, Trash2, Edit2, X, Check, Bold, Italic, Underline, AlignLeft, AlignCenter, AlignRight, List, ListOrdered, Link, Palette, Code, Upload } from 'lucide-react';
import { store } from '../dataStore';
import { SpeakerRegistration, Role, SpecialtyTrack } from '../types';
import { formatDate } from '../lib/dateUtils';
import * as XLSX from 'xlsx';

interface SpeakerManagementProps {
  role: Role;
}

const getTrackColor = (track: string) => {
  const t = track.toLowerCase();
  if (t.includes('phẫu thuật') || t.includes('surgery') || t.includes('ngoại khoa')) {
    return 'bg-rose-50 text-rose-700 border-rose-200';
  }
  if (t.includes('hands-on') || t.includes('masterclass')) {
    return 'bg-amber-50 text-amber-700 border-amber-200';
  }
  if (t.includes('nội khoa') || t.includes('trẻ hóa')) {
    return 'bg-emerald-50 text-emerald-700 border-emerald-200';
  }
  if (t.includes('tế bào') || t.includes('sinh học')) {
    return 'bg-purple-50 text-purple-700 border-purple-200';
  }
  return 'bg-indigo-50 text-indigo-750 border-indigo-200';
};

export default function SpeakerManagement({ role }: SpeakerManagementProps) {
  const [speakers, setSpeakers] = useState<SpeakerRegistration[]>(store.getSpeakers());
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'pending' | 'approved' | 'rejected'>('all');
  const [selectedSpeaker, setSelectedSpeaker] = useState<SpeakerRegistration | null>(null);
  
  // Nhập báo cáo viên từ Excel
  const [showImportModal, setShowImportModal] = useState(false);
  const [importRows, setImportRows] = useState<SpeakerRegistration[]>([]);
  const [importFeedback, setImportFeedback] = useState<string | null>(null);
  const [importError, setImportError] = useState<string | null>(null);
  const [skipDuplicateSpeakers, setSkipDuplicateSpeakers] = useState(true);
  const [isImporting, setIsImporting] = useState(false);
  const importInputRef = React.useRef<HTMLInputElement>(null);

  // State for delete confirmation
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  
  // Custom states for tabular layout report
  const [viewMode, setViewMode] = useState<'table' | 'cards'>('table');
  const [sortField, setSortField] = useState<keyof SpeakerRegistration>('fullName');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');

  // Specialty Tracks State
  const [specialtyTracks, setSpecialtyTracks] = useState<SpecialtyTrack[]>(store.getSpecialtyTracks());
  const [showTrackModal, setShowTrackModal] = useState(false);
  const [editingTrack, setEditingTrack] = useState<SpecialtyTrack | null>(null);
  const [newTrackName, setNewTrackName] = useState('');
  const [newTrackNameEn, setNewTrackNameEn] = useState('');
  const [newTrackDesc, setNewTrackDesc] = useState('');

  // Speaker manual Form state
  const [showSpeakerModal, setShowSpeakerModal] = useState(false);
  const [editingSpeaker, setEditingSpeaker] = useState<SpeakerRegistration | null>(null);
  const [speakerTitle, setSpeakerTitle] = useState('BS');
  const [speakerFullName, setSpeakerFullName] = useState('');
  const [speakerOrganization, setSpeakerOrganization] = useState('');
  const [speakerDepartment, setSpeakerDepartment] = useState('');
  const [speakerPhone, setSpeakerPhone] = useState('');
  const [speakerEmail, setSpeakerEmail] = useState('');
  const [speakerPresentationTitle, setSpeakerPresentationTitle] = useState('');
  const [speakerPresentationTrack, setSpeakerPresentationTrack] = useState('');
  const [speakerAbstractText, setSpeakerAbstractText] = useState('');
  const [speakerBio, setSpeakerBio] = useState('');
  // Ban tieng Anh do Ban to chuc tu dich (muc V file yeu cau).
  const [speakerBioEn, setSpeakerBioEn] = useState('');
  const [speakerAbstractEn, setSpeakerAbstractEn] = useState('');
  // Thong tin bat buoc de cap chung chi CME (muc IV).
  const [speakerDateOfBirth, setSpeakerDateOfBirth] = useState('');
  const [speakerPlaceOfBirth, setSpeakerPlaceOfBirth] = useState('');
  const [speakerIdentityNo, setSpeakerIdentityNo] = useState('');
  const [speakerDegreeProof, setSpeakerDegreeProof] = useState<string | null>(null);
  const [isDegreeProofUploading, setIsDegreeProofUploading] = useState(false);
  const degreeProofInputRef = React.useRef<HTMLInputElement>(null);
  const [speakerDocumentName, setSpeakerDocumentName] = useState('');
  const [speakerStatus, setSpeakerStatus] = useState<'pending' | 'approved' | 'rejected'>('approved');
  const [speakerAvatar, setSpeakerAvatar] = useState<string | null>(null);
  const [speakerDocumentUrl, setSpeakerDocumentUrl] = useState<string | null>(null);
  const [isDocumentUploading, setIsDocumentUploading] = useState(false);
  const [abstractEditorMode, setAbstractEditorMode] = useState<'visual' | 'code'>('visual');
  const [bioEditorMode, setBioEditorMode] = useState<'visual' | 'code'>('visual');
  const abstractEditorRef = React.useRef<HTMLDivElement>(null);
  const bioEditorRef = React.useRef<HTMLDivElement>(null);

  // Load schedule sessions to allow assigning speakers to a specific room/time slots
  const sessions = store.getSessions();

  const loadAll = () => {
    setSpeakers([...store.getSpeakers()]);
    setSpecialtyTracks([...store.getSpecialtyTracks()]);
  };

  const handleSaveTrack = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTrackName.trim()) {
      alert('Vui lòng nhập tên chuyên đề!');
      return;
    }

    if (editingTrack) {
      const oldName = editingTrack.name;
      const newName = newTrackName.trim();
      
      // Update speakers presentationTrack with the old name to the new name
      if (oldName !== newName) {
        const allSpks = store.getSpeakers();
        allSpks.forEach(s => {
          if (s.presentationTrack === oldName) {
            s.presentationTrack = newName;
            store.saveSpeaker(s);
          }
        });
      }

      store.saveSpecialtyTrack({
        ...editingTrack,
        name: newName,
        nameEn: newTrackNameEn.trim() || undefined,
        description: newTrackDesc.trim() || undefined,
        // Giu nguyen trang thai nhan dang ky khi chi sua ten hoac mo ta.
        isAcceptingNew: editingTrack.isAcceptingNew !== false
      });
      alert('Đã cập nhật chuyên đề thành công!');
    } else {
      const newId = 'track-' + Math.floor(Math.random() * 90000 + 10000);
      store.saveSpecialtyTrack({
        id: newId,
        name: newTrackName.trim(),
        nameEn: newTrackNameEn.trim() || undefined,
        description: newTrackDesc.trim() || undefined,
        isAcceptingNew: true
      });
      alert('Đã thêm chuyên đề mới thành công!');
    }

    setEditingTrack(null);
    setNewTrackName('');
    setNewTrackNameEn('');
    setNewTrackDesc('');
    loadAll();
  };

  /**
   * Bat / tat viec nhan dang ky moi vao mot chuyen de.
   * Khac voi xoa: ho so cu van giu nguyen chuyen de, chi form cong khai
   * la khong con hien chuyen de nay trong o chon.
   */
  const handleToggleTrackAccepting = (track: SpecialtyTrack) => {
    const isOpen = track.isAcceptingNew !== false;
    const count = speakers.filter(s => s.presentationTrack === track.name).length;
    const message = isOpen
      ? `Ngừng nhận đăng ký mới vào chuyên đề "${track.name}"?\n\n`
        + `${count} hồ sơ đang thuộc chuyên đề này vẫn được giữ nguyên. `
        + 'Chuyên đề chỉ không còn xuất hiện trong ô chọn của form đăng ký công khai.'
      : `Mở lại nhận đăng ký vào chuyên đề "${track.name}"?`;
    if (!confirm(message)) return;

    store.saveSpecialtyTrack({ ...track, isAcceptingNew: !isOpen });
    loadAll();
  };

  const handleEditTrack = (track: SpecialtyTrack) => {
    setEditingTrack(track);
    setNewTrackName(track.name);
    setNewTrackNameEn(track.nameEn || '');
    setNewTrackDesc(track.description || '');
  };

  const handleDeleteTrack = (id: string, name: string) => {
    // Check if any speakers have this track
    const affectedSpeakers = speakers.filter(s => s.presentationTrack === name);
    if (affectedSpeakers.length > 0) {
      if (!confirm(`Chuyên đề "${name}" đang được sử dụng bởi ${affectedSpeakers.length} báo cáo viên. Bạn có chắc chắn vẫn muốn xóa chuyên đề này không? (Sau khi xóa, các báo cáo viên này vẫn giữ nguyên chuyên đề cũ, nhưng sẽ không xuất hiện trong danh mục chọn mới cho các đệ trình tiếp theo).`)) {
        return;
      }
    } else {
      if (!confirm(`Bạn có chắc chắn muốn xóa chuyên đề "${name}"?`)) {
        return;
      }
    }

    store.deleteSpecialtyTrack(id);
    loadAll();
    alert('Đã xóa chuyên đề thành công!');

    if (editingTrack?.id === id) {
      setEditingTrack(null);
      setNewTrackName('');
      setNewTrackNameEn('');
      setNewTrackDesc('');
    }
  };

  const handleUpdateStatus = async (id: string, newStatus: 'approved' | 'rejected' | 'pending') => {
    if (role === 'ctv') {
      alert('Tài khoản Cộng tác viên không có quyền phê duyệt đề tài báo cáo khoa học!');
      return;
    }
    const list = store.getSpeakers();
    const found = list.find(s => s.id === id);
    if (found) {
      const oldStatus = found.status;
      found.status = newStatus;
      
      // Auto assign a default session time for display, if approved
      if (newStatus === 'approved' && !found.scheduledSessionId) {
        found.scheduledSessionId = sessions[1]?.id || sessions[0]?.id || 'SES-002';
      }
      
      store.saveSpeaker(found);
      loadAll();
      
      // If approved, trigger real email notification
      if (newStatus === 'approved' && oldStatus !== 'approved') {
        try {
          const mockAttendee = {
            id: found.id,
            title: found.title,
            fullName: found.fullName,
            email: found.email,
            phone: found.phone,
            organization: found.organization,
            packageName: 'Báo cáo viên',
            packageFee: 0,
            paymentStatus: 'paid' as const,
            qrCodeValue: `VSAPS2026-${found.id}-${found.fullName.split(' ').pop()?.toUpperCase() || 'SPK'}`,
            presentationTitle: found.presentationTitle,
            presentationTrack: found.presentationTrack
          };
          await store.sendEmail(mockAttendee as any, undefined, undefined, 'tmpl-speaker-approved');
          alert(`Đã hệ thống hóa Phê Duyệt! Email thông báo tóm tắt lịch trình đã phát tự động gửi tới Bác Sĩ ${found.fullName}.`);
        } catch (error) {
          console.error("Gửi email phê duyệt thất bại:", error);
          alert(`Đã phê duyệt đề tài, nhưng xảy ra lỗi khi gửi email tự động: ${error instanceof Error ? error.message : String(error)}`);
        }
      }
    }
  };

  const handleAssignSession = (speakerId: string, sessionId: string) => {
    if (role === 'ctv') {
      alert('Tài khoản CTV không có quyền xếp lịch trình hội trường!');
      return;
    }
    const list = store.getSpeakers();
    const found = list.find(s => s.id === speakerId);
    if (found) {
      found.scheduledSessionId = sessionId;
      
      // If of approved session speaker, update session title too
      const session = sessions.find(s => s.id === sessionId);
      if (session) {
        session.speakerName = found.fullName;
        session.speakerTitle = found.title + ' ' + found.organization;
        store.saveSession(session);
      }
      
      store.saveSpeaker(found);
      loadAll();
      alert(`Đã cập nhật xếp phòng: Gán báo cáo của ${found.fullName} vào phiên "${session?.title || sessionId}"`);
    }
  };

  // Sync contenteditable content when opening modal or switching modes
  React.useEffect(() => {
    if (showSpeakerModal) {
      const timer = setTimeout(() => {
        if (abstractEditorMode === 'visual' && abstractEditorRef.current) {
          abstractEditorRef.current.innerHTML = speakerAbstractText;
        }
        if (bioEditorMode === 'visual' && bioEditorRef.current) {
          bioEditorRef.current.innerHTML = speakerBio;
        }
      }, 50);
      return () => clearTimeout(timer);
    }
  }, [showSpeakerModal, abstractEditorMode, bioEditorMode]);

  const handleAbstractInput = (e: React.FormEvent<HTMLDivElement>) => {
    setSpeakerAbstractText(e.currentTarget.innerHTML);
  };

  const handleBioInput = (e: React.FormEvent<HTMLDivElement>) => {
    setSpeakerBio(e.currentTarget.innerHTML);
  };

  const handleAbstractFormat = (command: string, value: string = '') => {
    document.execCommand(command, false, value);
    if (abstractEditorRef.current) {
      setSpeakerAbstractText(abstractEditorRef.current.innerHTML);
      abstractEditorRef.current.focus();
    }
  };

  const handleBioFormat = (command: string, value: string = '') => {
    document.execCommand(command, false, value);
    if (bioEditorRef.current) {
      setSpeakerBio(bioEditorRef.current.innerHTML);
      bioEditorRef.current.focus();
    }
  };

  const handleDocumentUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      setIsDocumentUploading(true);
      const fileNamesArray: string[] = [];
      const fileDataUrlsArray: string[] = [];
      let processedCount = 0;

      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        fileNamesArray.push(file.name);
        const reader = new FileReader();
        reader.onloadend = () => {
          fileDataUrlsArray.push(reader.result as string);
          processedCount++;
          if (processedCount === files.length) {
            setSpeakerDocumentName(fileNamesArray.join('|'));
            setSpeakerDocumentUrl(fileDataUrlsArray.join('|'));
            setIsDocumentUploading(false);
          }
        };
        reader.readAsDataURL(file);
      }
    }
  };


  // Open modal in Create mode
  const handleAddSpeaker = () => {
    setEditingSpeaker(null);
    setSpeakerTitle('BS');
    setSpeakerFullName('');
    setSpeakerOrganization('');
    setSpeakerDepartment('');
    setSpeakerPhone('');
    setSpeakerEmail('');
    setSpeakerPresentationTitle('');
    setSpeakerPresentationTrack(specialtyTracks[0]?.name || '');
    setSpeakerAbstractText('');
    setSpeakerBio('');
    setSpeakerBioEn('');
    setSpeakerAbstractEn('');
    setSpeakerDateOfBirth('');
    setSpeakerPlaceOfBirth('');
    setSpeakerIdentityNo('');
    setSpeakerDegreeProof(null);
    setSpeakerDocumentName('');
    setSpeakerDocumentUrl(null);
    setSpeakerStatus('approved');
    setSpeakerAvatar(null);
    setAbstractEditorMode('visual');
    setBioEditorMode('visual');
    setShowSpeakerModal(true);
  };

  // Open modal in Edit mode
  const handleEditSpeaker = (spk: SpeakerRegistration) => {
    setEditingSpeaker(spk);
    setSpeakerTitle(spk.title);
    setSpeakerFullName(spk.fullName);
    setSpeakerOrganization(spk.organization);
    setSpeakerDepartment(spk.department);
    setSpeakerPhone(spk.phone);
    setSpeakerEmail(spk.email);
    setSpeakerPresentationTitle(spk.presentationTitle);
    setSpeakerPresentationTrack(spk.presentationTrack);
    setSpeakerAbstractText(spk.abstractText);
    setSpeakerBio(spk.bio);
    setSpeakerBioEn(spk.bioEn || '');
    setSpeakerAbstractEn(spk.abstractEn || '');
    setSpeakerDateOfBirth(spk.dateOfBirth || '');
    setSpeakerPlaceOfBirth(spk.placeOfBirth || '');
    setSpeakerIdentityNo(spk.identityNo || '');
    setSpeakerDegreeProof(spk.degreeProofUrl || null);
    setSpeakerDocumentName(spk.documentName || '');
    setSpeakerDocumentUrl(spk.documentUrl || null);
    setSpeakerStatus(spk.status);
    setSpeakerAvatar(spk.avatarUrl || null);
    setAbstractEditorMode('visual');
    setBioEditorMode('visual');
    setShowSpeakerModal(true);
  };

  const handleDegreeProofUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setIsDegreeProofUploading(true);
    const reader = new FileReader();
    reader.onloadend = () => {
      setSpeakerDegreeProof(reader.result as string);
      setIsDegreeProofUploading(false);
      if (degreeProofInputRef.current) degreeProofInputRef.current.value = '';
    };
    reader.readAsDataURL(file);
  };

  // Delete handler
  const handleDeleteSpeaker = (id: string) => {
    if (role === 'ctv') {
      alert('Tài khoản Cộng tác viên không có quyền xóa báo cáo viên!');
      return;
    }
    setDeleteConfirmId(id);
  };

  // Save handler (Add/Update)
  const handleSaveSpeaker = (e: React.FormEvent) => {
    e.preventDefault();
    if (!speakerFullName || !speakerPresentationTitle) {
      alert('Vui lòng nhập tên báo cáo viên và đề tài báo cáo!');
      return;
    }

    const speakerData: SpeakerRegistration = {
      // Giu lai cac truong khong hien tren form nay, vi du nationality va
      // scheduledSessionId. Truoc day dung lai tu dau nen chung bi mat moi
      // lan Ban to chuc sua ho so.
      ...(editingSpeaker || {}),
      id: editingSpeaker ? editingSpeaker.id : 'SPK-' + Math.floor(Math.random() * 9000 + 1000),
      title: speakerTitle,
      fullName: speakerFullName,
      organization: speakerOrganization,
      department: speakerDepartment,
      phone: speakerPhone,
      email: speakerEmail,
      presentationTitle: speakerPresentationTitle,
      presentationTrack: speakerPresentationTrack,
      abstractText: speakerAbstractText || 'Chưa cung cấp tóm tắt bài báo cáo',
      bio: speakerBio || 'Chưa cung cấp thông tin tiểu sử tóm lược',
      bioEn: speakerBioEn.trim() || undefined,
      abstractEn: speakerAbstractEn.trim() || undefined,
      dateOfBirth: speakerDateOfBirth || undefined,
      placeOfBirth: speakerPlaceOfBirth.trim() || undefined,
      identityNo: speakerIdentityNo.trim() || undefined,
      degreeProofUrl: speakerDegreeProof || undefined,
      documentName: speakerDocumentName || undefined,
      documentUrl: speakerDocumentUrl || undefined,
      status: speakerStatus,
      calendarSynced: editingSpeaker ? editingSpeaker.calendarSynced : true,
      scheduledSessionId: editingSpeaker ? editingSpeaker.scheduledSessionId : undefined,
      registrationDate: editingSpeaker ? editingSpeaker.registrationDate : new Date().toISOString().substring(0, 10),
      avatarUrl: speakerAvatar || undefined
    };

    store.saveSpeaker(speakerData);
    setShowSpeakerModal(false);
    loadAll();
    alert(editingSpeaker ? 'Cập nhật thông tin báo cáo viên thành công!' : 'Thêm báo cáo viên mới thành công!');
  };

  const filteredSpeakers = speakers.filter(s => {
    const matchQuery = 
      s.fullName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      s.presentationTitle.toLowerCase().includes(searchQuery.toLowerCase()) ||
      s.organization.toLowerCase().includes(searchQuery.toLowerCase()) ||
      s.presentationTrack.toLowerCase().includes(searchQuery.toLowerCase());

    const matchStatus = statusFilter === 'all' || s.status === statusFilter;

    return matchQuery && matchStatus;
  });

  // Interactive sorting engine
  const sortedSpeakers = [...filteredSpeakers].sort((a, b) => {
    let valA = a[sortField] || '';
    let valB = b[sortField] || '';

    if (typeof valA === 'string' && typeof valB === 'string') {
      valA = valA.toLowerCase();
      valB = valB.toLowerCase();
    }

    if (valA < valB) return sortDirection === 'asc' ? -1 : 1;
    if (valA > valB) return sortDirection === 'asc' ? 1 : -1;
    return 0;
  });

  const toggleSort = (field: keyof SpeakerRegistration) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
  };

  // High profile stats computing
  const statsApprovedCount = speakers.filter(s => s.status === 'approved').length;
  const statsPendingCount = speakers.filter(s => s.status === 'pending').length;
  const statsAssignedCount = speakers.filter(s => s.scheduledSessionId).length;
  const totalTracksSet = new Set(speakers.map(s => s.presentationTrack)).size;

  // Real mock CSV exporter
  /* ===== NHẬP BÁO CÁO VIÊN TỪ EXCEL =====
   * Nhiều báo cáo viên gửi hồ sơ qua email thay vì điền form, Ban thư ký phải
   * gõ tay từng người. Luồng này cho phép tổng hợp vào một file Excel rồi nạp
   * một lượt. File PDF/Word (CV, abstract) không nhét được vào Excel nên dùng
   * cột đường dẫn Google Drive.
   */
  // Tên cột của tệp mẫu nhập, đặt trùng với tên cột của tệp xuất để Ban tổ
  // chức xuất ra, sửa, rồi nạp lại được mà không phải đổi tiêu đề.
  const IMPORT_COLUMNS = {
    title: 'Học hàm học vị',
    fullName: 'Họ và tên',
    dateOfBirth: 'Ngày sinh',
    placeOfBirth: 'Nơi sinh',
    identityNo: 'Số CCCD',
    email: 'Email',
    phone: 'Số điện thoại',
    organization: 'Đơn vị công tác',
    department: 'Khoa/Phòng',
    bio: 'Tóm lược quá trình công tác',
    bioEn: 'Tóm lược quá trình công tác (tiếng Anh)',
    presentationTitle: 'Tên bài báo cáo',
    presentationTrack: 'Chuyên đề',
    abstractText: 'Abstract (Tóm tắt nội dung)',
    abstractEn: 'Abstract (tiếng Anh)',
    avatarUrl: 'Link ảnh chân dung',
    degreeProofUrl: 'Link ảnh bằng cấp',
    documentUrl: 'Link CV/Abstract (Google Drive)',
  };

  const downloadSpeakerTemplate = () => {
    const C = IMPORT_COLUMNS;
    const defaultTrack = specialtyTracks.filter(t => t.isAcceptingNew !== false)[0]?.name
      || specialtyTracks[0]?.name
      || 'Khác';
    // Thứ tự khóa ở đây quyết định thứ tự cột trong tệp mẫu, nên giữ trùng
    // với thứ tự cột của tệp xuất để xuất ra sửa rồi nạp lại được.
    const sample = [
      {
        [C.title]: 'PGS.TS.BS',
        [C.fullName]: 'NGUYỄN VĂN AN',
        [C.dateOfBirth]: '15/03/1975',
        [C.placeOfBirth]: 'Hà Nội',
        [C.identityNo]: '001175012345',
        [C.email]: 'nguyenvanan@gmail.com',
        [C.phone]: '0912345678',
        [C.organization]: 'Bệnh viện Chợ Rẫy',
        [C.department]: 'Khoa Phẫu thuật Tạo hình Thẩm mỹ',
        [C.bio]: 'Trưởng khoa Phẫu thuật Tạo hình Thẩm mỹ, 20 năm kinh nghiệm, chủ nhiệm 5 đề tài cấp Bộ.',
        [C.bioEn]: 'Head of Aesthetic Plastic Surgery, 20 years of experience, principal investigator of 5 ministry-level studies.',
        [C.presentationTitle]: 'Ứng dụng vạt da cân trong tái tạo khuyết hổng vùng mặt',
        [C.presentationTrack]: defaultTrack,
        [C.abstractText]: 'Mục tiêu: ... Phương pháp: ... Kết quả: ... Kết luận: ...',
        [C.abstractEn]: 'Objective: ... Methods: ... Results: ... Conclusion: ...',
        [C.avatarUrl]: 'https://drive.google.com/file/d/anh-chan-dung/view',
        [C.degreeProofUrl]: 'https://drive.google.com/file/d/anh-bang-cap/view',
        [C.documentUrl]: 'https://drive.google.com/file/d/xxxxxxxx/view',
      },
      {
        [C.title]: 'TS.BS',
        [C.fullName]: 'TRẦN THỊ MAI',
        [C.dateOfBirth]: '1982-07-20',
        [C.placeOfBirth]: 'Thừa Thiên Huế',
        [C.identityNo]: '046182098765',
        [C.email]: 'tranthimai@gmail.com',
        [C.phone]: '0987654321',
        [C.organization]: 'Bệnh viện Đại học Y Dược TP.HCM',
        [C.department]: 'Khoa Thẩm mỹ',
        [C.bio]: 'Giảng viên bộ môn Tạo hình Thẩm mỹ, 12 năm kinh nghiệm lâm sàng.',
        [C.bioEn]: '',
        [C.presentationTitle]: 'Kỹ thuật tiêm filler an toàn vùng quanh mắt',
        [C.presentationTrack]: defaultTrack,
        [C.abstractText]: 'Mục tiêu: ... Phương pháp: ... Kết quả: ... Kết luận: ...',
        [C.abstractEn]: '',
        [C.avatarUrl]: '',
        [C.degreeProofUrl]: '',
        [C.documentUrl]: '',
      },
    ];

    const ws = XLSX.utils.json_to_sheet(sample);
    ws['!cols'] = [
      { wch: 14 }, { wch: 26 }, { wch: 13 }, { wch: 18 }, { wch: 16 },
      { wch: 26 }, { wch: 15 }, { wch: 30 }, { wch: 28 },
      { wch: 46 }, { wch: 46 },
      { wch: 42 }, { wch: 22 },
      { wch: 60 }, { wch: 60 },
      { wch: 38 }, { wch: 38 }, { wch: 38 },
    ];
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Danh_Sach_BCV');
    XLSX.writeFile(wb, 'Mau_File_Import_Bao_Cao_Vien_VSAPS2026.xlsx');
  };

  const parseSpeakerFile = (file: File) => {
    if (!file) return;
    setImportError(null);
    setImportFeedback(null);

    const ext = file.name.split('.').pop()?.toLowerCase() || '';
    if (!['xlsx', 'xls', 'csv'].includes(ext)) {
      setImportError('Chỉ hỗ trợ tệp Excel (.xlsx, .xls) hoặc .csv. Vui lòng tải file mẫu để điền đúng định dạng.');
      return;
    }

    const reader = new FileReader();
    reader.onload = (ev) => {
      try {
        const wb = XLSX.read(new Uint8Array(ev.target?.result as ArrayBuffer), { type: 'array' });
        const ws = wb.Sheets[wb.SheetNames[0]];
        const rows = XLSX.utils.sheet_to_json<Record<string, any>>(ws);

        const usedIds = new Set(store.getSpeakers().map(x => x.id));
        const genId = () => {
          let id = '';
          do {
            id = 'SPK-' + Math.floor(Math.random() * 90000 + 10000);
          } while (usedIds.has(id));
          usedIds.add(id);
          return id;
        };

        const parsed: SpeakerRegistration[] = [];
        let skippedNoName = 0;

        rows.forEach((row) => {
          const keys = Object.keys(row);
          // Dò cột linh hoạt vì người dùng hay sửa tiêu đề hoặc thêm dấu *.
          // Mỗi cột chỉ được gán cho đúng một trường, và thứ tự dò ở dưới là
          // từ cột cụ thể tới cột chung. Hai cái bẫy phải tránh:
          //   - tiêu đề bản tiếng Anh chứa trọn tiêu đề tiếng Việt
          //     ("Abstract (tiếng Anh)" chứa "Abstract"),
          //   - ba cột ảnh/tệp đều bắt đầu bằng chữ "Link".
          const usedKeys = new Set<string>();
          const takeCell = (k: string): string =>
            row[k] === undefined || row[k] === null ? '' : String(row[k]).trim();

          /** Lấy ô của cột chưa dùng đầu tiên thỏa một trong các điều kiện. */
          const pickBy = (tests: ((key: string) => boolean)[]): string => {
            for (const test of tests) {
              const k = keys.find(key => !usedKeys.has(key) && test(key.toLowerCase().trim()));
              if (k) {
                usedKeys.add(k);
                return takeCell(k);
              }
            }
            return '';
          };
          /** Khớp nếu tiêu đề chứa bất kỳ từ khóa nào. */
          const any = (...needles: string[]) => (k: string) => needles.some(n => k.includes(n));
          /** Tiêu đề của cột bản dịch tiếng Anh. */
          const isEn = (k: string) => k.includes('tiếng anh') || k.includes('(en') || k.includes('english');

          // Hai cột bản tiếng Anh lấy trước cột tiếng Việt tương ứng.
          // Danh sách từ khóa phải trùng với của cột tiếng Việt bên dưới, nếu không
          // những tiêu đề như "Giới thiệu bản thân (English)" sẽ không khớp.
          const bioKeys = ['tóm lược', 'quá trình công tác', 'giới thiệu', 'lý lịch', 'tiểu sử', 'bio'] as const;
          const bioEn = pickBy([k => isEn(k) && any(...bioKeys)(k)]);
          const abstractEn = pickBy([k => isEn(k) && any('abstract', 'tóm tắt')(k)]);

          // Link ảnh lấy trước link tệp đính kèm, vì cả ba đều có chữ "link".
          const avatarLink = pickBy([any('chân dung', 'avatar', 'ảnh đại diện')]);
          const degreeLink = pickBy([any('bằng cấp', 'degree', 'văn bằng')]);

          const fullName = pickBy([any('họ và tên', 'họ tên', 'fullname', 'tên báo cáo viên')]);
          if (!fullName) {
            skippedNoName++;
            return;
          }

          // Link tệp đính kèm lấy trước cột Abstract, vì tiêu đề mẫu
          // "Link CV/Abstract" cũng chứa chữ "abstract".
          const link = pickBy([any('tệp đính kèm', 'link', 'đường dẫn', 'drive', 'url')]);
          const title = pickBy([any('học hàm', 'học vị', 'chức danh'), any('title')]);
          const dateOfBirth = pickBy([any('ngày sinh', 'ngày tháng năm sinh', 'date of birth', 'dob')]);
          const placeOfBirth = pickBy([any('nơi sinh', 'place of birth')]);
          const identityNo = pickBy([any('cccd', 'căn cước', 'định danh', 'identity')]);
          const organization = pickBy([any('đơn vị', 'cơ quan', 'bệnh viện', 'nơi công tác', 'organization')]);
          const department = pickBy([any('khoa/phòng', 'khoa', 'phòng', 'bộ môn', 'department')]);
          const phone = pickBy([any('số điện thoại', 'sđt', 'điện thoại', 'phone', 'sdt')]);
          const email = pickBy([any('email', 'thư điện tử', 'mail')]);
          const bio = pickBy([any(...bioKeys)]);
          const presentationTitle = pickBy([any('tên bài', 'đề tài', 'tiêu đề báo cáo', 'presentation')]);
          const presentationTrack = pickBy([any('chuyên đề', 'phân ban', 'track')]);
          const abstractText = pickBy([any('abstract', 'tóm tắt')]);

          // Ngày sinh trong Excel có thể là 15/03/1975, 1975-03-15, hoặc số
          // sê-ri ngày của Excel. Chuẩn hóa về YYYY-MM-DD, không nhận dạng
          // được thì bỏ trống để Ban tổ chức điền tay.
          const normalizeDob = (raw: string): string | undefined => {
            if (!raw) return undefined;
            const text = raw.trim();
            let m = text.match(/^(\d{4})-(\d{1,2})-(\d{1,2})/);
            if (m) {
              return `${m[1]}-${m[2].padStart(2, '0')}-${m[3].padStart(2, '0')}`;
            }
            m = text.match(/^(\d{1,2})[/\-.](\d{1,2})[/\-.](\d{4})$/);
            if (m) {
              return `${m[3]}-${m[2].padStart(2, '0')}-${m[1].padStart(2, '0')}`;
            }
            // Số sê-ri ngày của Excel, mốc 0 là 30/12/1899.
            if (/^\d{4,6}$/.test(text)) {
              const serial = parseInt(text, 10);
              const base = Date.UTC(1899, 11, 30);
              const d = new Date(base + serial * 86400000);
              if (!isNaN(d.getTime()) && d.getUTCFullYear() >= 1920) {
                return d.toISOString().split('T')[0];
              }
            }
            return undefined;
          };

          parsed.push({
            id: genId(),
            title: title || 'BS.',
            fullName: fullName.toUpperCase(),
            organization,
            department,
            phone: phone.replace(/\s+/g, ''),
            email,
            bio,
            bioEn: bioEn || undefined,
            dateOfBirth: normalizeDob(dateOfBirth),
            placeOfBirth: placeOfBirth || undefined,
            identityNo: identityNo.replace(/\s+/g, '') || undefined,
            presentationTitle,
            presentationTrack: presentationTrack || (specialtyTracks[0]?.name || ''),
            abstractText,
            abstractEn: abstractEn || undefined,
            // Chỉ nhận link thật; ô đánh dấu "chưa có link" của tệp xuất bị bỏ qua.
            avatarUrl: /^https?:\/\//i.test(avatarLink) ? avatarLink : undefined,
            degreeProofUrl: /^https?:\/\//i.test(degreeLink) ? degreeLink : undefined,
            documentUrl: link || undefined,
            documentName: link ? 'Hồ sơ đính kèm (Google Drive)' : undefined,
            calendarSynced: false,
            status: 'pending',
            registrationDate: new Date().toISOString().split('T')[0],
            nationality: 'vietname',
          });
        });

        if (parsed.length === 0) {
          setImportError(
            'Không đọc được dòng nào có "Họ và tên". Vui lòng kiểm tra lại tiêu đề cột, '
            + 'hoặc tải file mẫu rồi điền theo đúng định dạng.'
          );
          setImportRows([]);
          return;
        }

        setImportRows(parsed);
        setImportFeedback(
          'Đã đọc ' + parsed.length + ' báo cáo viên từ tệp "' + file.name + '".'
          + (skippedNoName > 0 ? ' Bỏ qua ' + skippedNoName + ' dòng không có họ tên.' : '')
        );
      } catch (err) {
        console.error('Lỗi đọc file Excel báo cáo viên:', err);
        setImportError('Không đọc được tệp. Tệp có thể bị hỏng hoặc sai định dạng.');
        setImportRows([]);
      }
    };
    reader.readAsArrayBuffer(file);
  };

  const handleConfirmImportSpeakers = async () => {
    if (importRows.length === 0) return;

    const existing = store.getSpeakers();
    let finalRows = importRows;
    let skipped = 0;

    if (skipDuplicateSpeakers) {
      // Đối chiếu theo email; email trống thì đối chiếu theo họ tên + đơn vị
      const keyOf = (sp: { email?: string; fullName: string; organization: string }) =>
        (sp.email || '').trim().toLowerCase()
        || (sp.fullName.trim().toLowerCase() + '|' + (sp.organization || '').trim().toLowerCase());
      const existingKeys = new Set(existing.map(keyOf));
      finalRows = importRows.filter(sp => {
        const key = keyOf(sp);
        if (existingKeys.has(key)) {
          skipped++;
          return false;
        }
        existingKeys.add(key);
        return true;
      });
    }

    if (finalRows.length === 0) {
      alert('Cả ' + importRows.length + ' báo cáo viên trong tệp đều đã có trên hệ thống.');
      return;
    }

    setIsImporting(true);
    try {
      await store.saveSpeakersBulk(finalRows);
      alert(
        'Đã nạp thành công ' + finalRows.length + ' báo cáo viên vào hệ thống.'
        + (skipped > 0 ? ' Bỏ qua ' + skipped + ' hồ sơ đã có sẵn.' : '')
        + '\n\nTất cả đang ở trạng thái "Đang chờ" để Ban thư ký rà soát và phê duyệt.'
      );
      setShowImportModal(false);
      setImportRows([]);
      setImportFeedback(null);
      setImportError(null);
      loadAll();
    } catch (err: any) {
      console.error('Lỗi nạp báo cáo viên hàng loạt:', err);
      alert('Không nạp được danh sách: ' + (err?.message || 'lỗi kết nối cơ sở dữ liệu'));
    } finally {
      setIsImporting(false);
    }
  };

  /**
   * Chuyển nội dung HTML của ô soạn thảo về chữ thuần, để Excel đọc được.
   * Giữ lại ngắt dòng ở các thẻ khối thay vì dán liền các đoạn với nhau.
   */
  const htmlToPlainText = (html?: string): string => {
    if (!html) return '';
    const withBreaks = html
      .replace(/<br\s*\/?>/gi, '\n')
      .replace(/<\/(p|div|li|h[1-6]|tr)>/gi, '\n')
      .replace(/<li[^>]*>/gi, '• ');
    const el = document.createElement('div');
    el.innerHTML = withBreaks;
    return (el.textContent || '')
      .replace(/ /g, ' ')
      .replace(/[ \t]+\n/g, '\n')
      .replace(/\n{3,}/g, '\n\n')
      .trim();
  };

  /**
   * Ảnh và tệp được lưu trên Supabase Storage dưới dạng link công khai, nên
   * xuất thẳng vào Excel là bấm được. Riêng hồ sơ cũ còn giữ ảnh dạng base64
   * (data:) thì không thể đưa vào ô Excel: một ô chỉ chứa 32.767 ký tự, còn
   * ảnh base64 thường dài hơn thế nhiều. Những hồ sơ đó được đánh dấu rõ để
   * Ban tổ chức biết là phải mở trong hệ thống để xem.
   */
  const toExportLink = (url?: string): string => {
    if (!url) return '';
    if (url.startsWith('data:')) return 'Ảnh lưu trong hệ thống, chưa có link — mở hồ sơ để xem';
    return url;
  };

  const handleExportXLSX = () => {
    const headers = [
      'Mã hồ sơ', 'Học hàm học vị', 'Họ và tên', 'Ngày sinh', 'Nơi sinh', 'Số CCCD',
      'Đơn vị công tác', 'Khoa / Phòng', 'Số điện thoại', 'Email', 'Quốc tịch',
      'Tóm lược quá trình công tác', 'Tóm lược quá trình công tác (tiếng Anh)',
      'Tên bài báo cáo', 'Chuyên đề',
      'Abstract (Tóm tắt nội dung)', 'Abstract (tiếng Anh)',
      'Link ảnh chân dung', 'Link ảnh bằng cấp',
      'Link tệp đính kèm (CV/Abstract)', 'Tên tệp đính kèm',
      'Phiên báo cáo được xếp', 'Đồng bộ Google Calendar', 'Trạng thái', 'Ngày đăng ký',
    ];

    const rows = sortedSpeakers.map(sp => {
      const session = sessions.find(ss => ss.id === sp.scheduledSessionId);
      const sessionTime = session
        ? `${session.date} ${session.startTime}-${session.endTime} (${session.roomName})`
        : 'Chưa xếp lịch';
      return [
        sp.id,
        sp.title,
        sp.fullName,
        sp.dateOfBirth ? sp.dateOfBirth.split('-').reverse().join('/') : '',
        sp.placeOfBirth || '',
        sp.identityNo || '',
        sp.organization,
        sp.department,
        sp.phone,
        sp.email,
        sp.nationality === 'foreign' ? 'Nước ngoài' : 'Việt Nam',
        htmlToPlainText(sp.bio),
        sp.bioEn || '',
        sp.presentationTitle,
        sp.presentationTrack,
        htmlToPlainText(sp.abstractText),
        sp.abstractEn || '',
        toExportLink(sp.avatarUrl),
        toExportLink(sp.degreeProofUrl),
        // Một hồ sơ có thể đính kèm nhiều tệp, trong dữ liệu nối bằng dấu |
        (sp.documentUrl || '').split('|').filter(Boolean).map(toExportLink).join('\n'),
        (sp.documentName || '').split('|').filter(Boolean).join('\n'),
        sessionTime,
        sp.calendarSynced ? 'Đã đồng bộ' : 'Chưa đồng bộ',
        sp.status === 'approved' ? 'ĐÃ PHÊ DUYỆT' : sp.status === 'rejected' ? 'TỪ CHỐI' : 'ĐANG CHỜ',
        sp.registrationDate ? String(sp.registrationDate).substring(0, 10) : '',
      ];
    });

    const ws = XLSX.utils.aoa_to_sheet([headers, ...rows]);
    // Bề ngang cột: các ô chữ dài để rộng hơn cho dễ đọc.
    ws['!cols'] = [
      { wch: 12 }, { wch: 14 }, { wch: 26 }, { wch: 12 }, { wch: 16 }, { wch: 16 },
      { wch: 30 }, { wch: 20 }, { wch: 14 }, { wch: 26 }, { wch: 12 },
      { wch: 45 }, { wch: 45 },
      { wch: 45 }, { wch: 22 },
      { wch: 60 }, { wch: 60 },
      { wch: 40 }, { wch: 40 },
      { wch: 40 }, { wch: 28 },
      { wch: 28 }, { wch: 16 }, { wch: 16 }, { wch: 14 },
    ];

    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Bao_Cao_Vien');
    const today = new Date().toISOString().split('T')[0];
    XLSX.writeFile(wb, `DS_Bao_Cao_Vien_VSAPS2026_${today}.xlsx`);
  };

  return (
    <div className="space-y-6 font-sans">
      
      {/* 📊 High-profile statistical report row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-2xl border border-slate-150 shadow-sm flex items-center gap-3">
          <div className="p-3 rounded-xl bg-indigo-50 text-indigo-600">
            <FileText className="w-5 h-5" />
          </div>
          <div>
            <span className="text-[10px] text-slate-400 font-extrabold uppercase tracking-wide block">Tổng số đệ trình</span>
            <p className="text-lg font-black text-slate-900 mt-0.5">{speakers.length} đề tài</p>
          </div>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-150 shadow-sm flex items-center gap-3">
          <div className="p-3 rounded-xl bg-emerald-50 text-emerald-600">
            <CheckCircle className="w-5 h-5 animate-pulse" />
          </div>
          <div>
            <span className="text-[10px] text-slate-400 font-extrabold uppercase tracking-wide block">Đã Phê Duyệt</span>
            <p className="text-lg font-black text-emerald-700 mt-0.5">{statsApprovedCount} đề tài</p>
          </div>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-150 shadow-sm flex items-center gap-3">
          <div className="p-3 rounded-xl bg-amber-50 text-amber-600">
            <Sparkles className="w-5 h-5" />
          </div>
          <div>
            <span className="text-[10px] text-slate-400 font-extrabold uppercase tracking-wide block">Đang thẩm định</span>
            <p className="text-lg font-black text-amber-700 mt-0.5">{statsPendingCount} đề tài</p>
          </div>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-150 shadow-sm flex items-center gap-3">
          <div className="p-3 rounded-xl bg-teal-50 text-teal-600">
            <Calendar className="w-5 h-5" />
          </div>
          <div>
            <span className="text-[10px] text-slate-400 font-extrabold uppercase tracking-wide block">Đã Xếp Lịch Phòng</span>
            <p className="text-lg font-black text-teal-700 mt-0.5">{statsAssignedCount} / {speakers.length}</p>
          </div>
        </div>
      </div>

      {/* 🛠️ Modern Filter and Display control Center */}
      <div className="flex flex-col md:flex-row gap-4 items-stretch md:items-center justify-between bg-white p-4 rounded-2xl border border-slate-200">
        
        {/* Search & Class Dropdown left filter panel */}
        <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
          <div className="relative w-full sm:w-72 md:w-80">
            <Search className="absolute left-3 top-2.5 w-4 h-4 text-slate-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Tìm tên Báo cáo viên, Chuyên đề, Đề tài..."
              className="pl-9 pr-4 py-2 bg-slate-50 hover:bg-slate-100/50 focus:bg-white border border-slate-250 focus:border-indigo-500 rounded-xl text-xs font-semibold focus:outline-none placeholder-slate-400 transition-all uppercase w-full shadow-inner"
            />
          </div>

          <select
            value={statusFilter}
            onChange={(e: any) => setStatusFilter(e.target.value)}
            className="px-3.5 py-2 bg-slate-50 border border-slate-250 rounded-xl text-xs font-bold text-slate-700 focus:outline-none focus:border-indigo-500 cursor-pointer shadow-sm w-full sm:w-auto"
          >
            <option value="all">📂 Tất cả Trạng thái</option>
            <option value="approved">🟢 Đã phê duyệt (Approved)</option>
            <option value="pending">🟡 Đang chờ duyệt (Pending)</option>
            <option value="rejected">🔴 Đã từ chối (Rejected)</option>
          </select>
        </div>

        {/* Action controllers: Tab mode switcher & Report downloads */}
        <div className="flex flex-wrap items-center gap-3 justify-start md:justify-end w-full md:w-auto">
          
          {/* Layout switches */}
          <div className="bg-slate-100 p-1 rounded-xl flex items-center border border-slate-200 w-full sm:w-auto justify-between sm:justify-start">
            <button
              type="button"
              onClick={() => setViewMode('table')}
              className={`p-1.5 px-3 rounded-lg text-xs font-extrabold flex items-center gap-1.5 transition-all border-none cursor-pointer flex-1 sm:flex-initial justify-center ${
                viewMode === 'table' 
                  ? 'bg-white text-indigo-700 shadow-sm' 
                  : 'text-slate-500 hover:text-slate-800 bg-transparent'
              }`}
              title="Xem danh sách dạng bảng Excel báo cáo"
            >
              <Table className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Dạng Bảng</span>
            </button>
            <button
              type="button"
              onClick={() => setViewMode('cards')}
              className={`p-1.5 px-3 rounded-lg text-xs font-extrabold flex items-center gap-1.5 transition-all border-none cursor-pointer flex-1 sm:flex-initial justify-center ${
                viewMode === 'cards' 
                  ? 'bg-white text-indigo-700 shadow-sm' 
                  : 'text-slate-500 hover:text-slate-800 bg-transparent'
              }`}
              title="Xem danh sách dạng lưới thẻ chi tiết"
            >
              <LayoutGrid className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Dạng Thẻ</span>
            </button>
          </div>

          {/* Manage track categories button */}
          <button
            type="button"
            onClick={() => setShowTrackModal(true)}
            className="p-2 px-3.5 bg-teal-55 hover:bg-teal-100 text-teal-700 border border-teal-200 rounded-xl text-xs font-black flex items-center gap-1.5 transition-all cursor-pointer shadow-sm w-full sm:w-auto justify-center"
            title="Thêm, sửa, xóa quản lý danh mục chuyên đề của báo cáo viên"
          >
            <Layers className="w-4 h-4 text-teal-600" />
            <span className="hidden sm:inline">Danh sách Chuyên đề</span>
            <span className="sm:hidden">Chuyên đề</span>
          </button>

          {role !== 'ctv' && (
            <button
              type="button"
              onClick={handleAddSpeaker}
              className="p-2 px-3.5 bg-teal-600 hover:bg-teal-700 text-white rounded-xl text-xs font-black flex items-center gap-1.5 transition-all cursor-pointer border-none shadow-sm w-full sm:w-auto justify-center"
              title="Thêm hồ sơ báo cáo viên thủ công"
            >
              <Plus className="w-4 h-4" />
              <span className="hidden sm:inline">Thêm Báo Cáo Viên</span>
              <span className="sm:hidden">Thêm BCV</span>
            </button>
          )}

          {/* Import from Excel */}
          {role !== 'ctv' && (
            <button
              type="button"
              onClick={() => setShowImportModal(true)}
              className="p-2 px-3.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200 rounded-xl text-xs font-black flex items-center gap-1.5 transition-all cursor-pointer shadow-sm w-full sm:w-auto justify-center"
              title="Nạp danh sách báo cáo viên từ file Excel (dành cho hồ sơ gửi qua email)"
            >
              <Upload className="w-4 h-4" />
              <span className="hidden sm:inline">Nhập Từ Excel</span>
              <span className="sm:hidden">Nhập Excel</span>
            </button>
          )}

          {/* Export button */}
          <button
            type="button"
            onClick={handleExportXLSX}
            className="p-2 px-3.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 rounded-xl text-xs font-black flex items-center gap-1.5 transition-all cursor-pointer shadow-sm w-full sm:w-auto justify-center"
            title="Tải file Excel đầy đủ thông tin báo cáo viên, ảnh và tệp đính kèm xuất dưới dạng link"
          >
            <FileSpreadsheet className="w-4 h-4" />
            <span className="hidden sm:inline">Xuất File Báo Cáo</span>
          </button>
        </div>

      </div>

      {/* 📋 VIEW REPORT MODE: DẠNG BẢNG (Tabular Layout) or DẠNG THẺ (Grid Cards) */}
      {viewMode === 'table' ? (
        
        /* TABULAR LAYOUT (Dạng Bảng Báo Cáo rộng) */
        <div className="space-y-4 font-sans">
          <div className="hidden md:block bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm">
            
            {/* Scroll container */}
            <div className="overflow-x-auto">
              <table className="w-full min-w-[1024px] text-left border-collapse table-auto">
                
                <thead>
                  <tr className="bg-slate-900 text-slate-200 uppercase font-sans text-[10.5px] font-black tracking-wider border-b border-slate-800 select-none">
                    <th className="p-4 pl-5 w-[7%]">
                      <button type="button" onClick={() => toggleSort('id')} className="flex items-center gap-1.5 hover:text-white bg-transparent border-none p-0 cursor-pointer text-[10.5px] font-black uppercase">
                        Mã Số
                        <ArrowUpDown className="w-3 h-3 text-indigo-400 shrink-0" />
                      </button>
                    </th>
                    <th className="p-4 w-[36%] min-w-[300px]">
                      <button type="button" onClick={() => toggleSort('presentationTitle')} className="flex items-center gap-1.5 hover:text-white bg-transparent border-none p-0 cursor-pointer text-[10.5px] font-black uppercase tracking-wider">
                        🧪 ĐỀ TÀI KHOA HỌC CHÍNH (Hiển thị đầy đủ)
                        <ArrowUpDown className="w-3 h-3 text-indigo-400 shrink-0" />
                      </button>
                    </th>
                    <th className="p-4 w-[21%] min-w-[200px]">
                      <button type="button" onClick={() => toggleSort('fullName')} className="flex items-center gap-1.5 hover:text-white bg-transparent border-none p-0 cursor-pointer text-[10.5px] font-black uppercase">
                        Báo Cáo Viên chính (BCV)
                        <ArrowUpDown className="w-3 h-3 text-indigo-400 shrink-0" />
                      </button>
                    </th>
                    <th className="p-4 w-[14%] min-w-[120px]">
                      <button type="button" onClick={() => toggleSort('presentationTrack')} className="flex items-center gap-1.5 hover:text-white bg-transparent border-none p-0 cursor-pointer text-[10.5px] font-black uppercase">
                        Chuyên Đề
                        <ArrowUpDown className="w-3 h-3 text-indigo-400 shrink-0" />
                      </button>
                    </th>
                    <th className="p-4 pr-5 w-[22%] min-w-[246px] text-right font-black text-[10.5px] tracking-wider">Ban hành &amp; Duyệt bài</th>
                  </tr>
                </thead>

                <tbody className="divide-y divide-slate-100 text-xs text-slate-700">
                  {sortedSpeakers.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="p-12 text-center text-slate-450 font-semibold italic">
                        Không tìm thấy đề tài đệ trình nào khớp với lựa chọn hiện thời.
                      </td>
                    </tr>
                  ) : (
                    sortedSpeakers.map((spk, idx) => {
                      const session = sessions.find(s => s.id === spk.scheduledSessionId);
                      return (
                        <tr 
                          key={spk.id} 
                          className={`hover:bg-indigo-50/25 transition-colors duration-150 ${idx % 2 === 1 ? 'bg-slate-50/40' : ''}`}
                        >
                          
                          {/* 1. ID */}
                          <td className="p-4 pl-5 font-mono font-black text-slate-500 whitespace-nowrap text-[11px]">
                            {spk.id}
                          </td>

                          {/* 2. Scientific Presentation Title (Highlighted, 100% full wrap) */}
                          <td className="p-4 w-[36%] min-w-[300px] align-top">
                            <div className="border-l-4 border-indigo-650 pl-4 py-1 animate-fade-in text-left">
                              <span 
                                title="Bấm để xem tóm tắt khoa học toàn văn"
                                onClick={() => setSelectedSpeaker(spk)}
                                className="font-black text-slate-950 hover:text-indigo-600 cursor-pointer block leading-relaxed text-[13px] md:text-[14px] hover:underline decoration-indigo-450 decoration-2 whitespace-normal break-words"
                              >
                                “{spk.presentationTitle}”
                              </span>
                              
                              <div className="flex flex-wrap items-center gap-2 mt-2 select-none">
                                <span className="text-[9px] bg-slate-100 text-slate-500 font-bold px-2 py-0.5 rounded-lg border border-slate-200">
                                  📅 Đệ trình: {formatDate(spk.registrationDate)}
                                </span>
                                {spk.documentName && (
                                  <span className="text-[9px] bg-teal-50 text-teal-750 border border-teal-150 px-2 py-0.5 rounded-lg font-bold flex items-center gap-0.5" title={spk.documentName}>
                                    📄 Toàn văn đệ trình
                                  </span>
                                )}
                                <span className="text-[9px] text-slate-400 font-semibold">
                                  Email: {spk.email}
                                </span>
                              </div>
                            </div>
                          </td>

                          {/* 3. Speaker Details */}
                          <td className="p-4 whitespace-nowrap">
                            <div className="flex items-center gap-3">
                              {spk.avatarUrl ? (
                                <img 
                                  src={spk.avatarUrl} 
                                  alt={spk.fullName} 
                                  className="w-10 h-10 rounded-full object-cover border-2 border-white shadow-md shrink-0"
                                />
                              ) : (
                                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-indigo-500 to-indigo-600 text-white font-black flex items-center justify-center shrink-0 shadow text-xs border border-transparent">
                                  {spk.fullName ? spk.fullName.substring(0, 1) : 'BC'}
                                </div>
                              )}
                              <div>
                                <div className="font-extrabold text-slate-900 flex items-center gap-1 leading-none">
                                  <span className="text-slate-500 font-bold text-[11px]">{spk.title}</span>
                                  <span className="uppercase tracking-tight text-[12px]">{spk.fullName}</span>
                                </div>
                                <div className="text-[10px] text-slate-500 leading-none mt-1.5 font-semibold">
                                  {spk.organization}
                                </div>
                                <div className="text-[10px] text-slate-400 leading-none mt-1 font-medium">
                                  {spk.department}
                                </div>
                                <div className="text-[9.5px] text-indigo-600 font-semibold mt-1.5 font-mono tracking-tight">
                                  📞 {spk.phone}
                                </div>
                              </div>
                            </div>
                          </td>

                          {/* 4. Color-coded Specialty Track */}
                          <td className="p-4 align-top">
                            <span className={`px-2.5 py-1.5 border rounded-lg text-[9.5px] font-black uppercase tracking-tight block text-center leading-snug shadow-xs ${getTrackColor(spk.presentationTrack)}`}>
                              {spk.presentationTrack}
                            </span>
                          </td>

                          {/* 5. Publication statuses & Compact Action Controls */}
                          <td className="p-4 pr-5 text-right align-top">
                            <div className="flex flex-col items-end gap-1.5">
                              
                              {/* Status Pill */}
                              <span className={`px-2.5 py-1 rounded-full text-[9px] font-black uppercase tracking-wider inline-block text-center whitespace-nowrap border ${
                                spk.status === 'approved' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' :
                                spk.status === 'rejected' ? 'bg-rose-50 text-rose-700 border-rose-250' :
                                'bg-amber-50 text-amber-700 border-amber-250'
                              }`}>
                                {spk.status === 'approved' ? '✓ APPROVED' : spk.status === 'rejected' ? '✕ REJECTED' : '⏳ PENDING'}
                              </span>

                              {/* Row Buttons Actions */}
                              <div className="flex flex-wrap items-center justify-end gap-1 mt-0.5">
                                <button
                                  type="button"
                                  onClick={() => setSelectedSpeaker(spk)}
                                  className="p-1 px-1.5 bg-slate-50 hover:bg-slate-150 text-slate-705 border border-slate-200 font-extrabold rounded text-[10px] whitespace-nowrap transition-colors cursor-pointer"
                                  title="Xem tóm tắt tóm lược bcv"
                                >
                                  Đọc bài
                                </button>

                                <button
                                  type="button"
                                  onClick={() => handleEditSpeaker(spk)}
                                  className="p-1 px-1.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 font-extrabold rounded text-[10px] whitespace-nowrap transition-colors cursor-pointer"
                                  title="Chỉnh sửa thông tin báo cáo viên"
                                >
                                  Sửa
                                </button>

                                {role !== 'ctv' && (
                                  <button
                                    type="button"
                                    onClick={() => handleDeleteSpeaker(spk.id)}
                                    className="p-1 px-1.5 bg-rose-50 hover:bg-rose-100 text-rose-600 border border-rose-200 font-extrabold rounded text-[10px] whitespace-nowrap transition-colors cursor-pointer"
                                    title="Xóa hồ sơ báo cáo viên"
                                  >
                                    Xóa
                                  </button>
                                )}

                                {role !== 'ctv' && (
                                  <>
                                    {spk.status !== 'approved' && (
                                      <button
                                        type="button"
                                        onClick={() => handleUpdateStatus(spk.id, 'approved')}
                                        className="p-1 px-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold rounded text-[10px] whitespace-nowrap transition-colors cursor-pointer border-none"
                                        title="Duyệt bài đăng"
                                      >
                                        Duyệt
                                      </button>
                                    )}
                                    {spk.status !== 'rejected' && (
                                      <button
                                        type="button"
                                        onClick={() => handleUpdateStatus(spk.id, 'rejected')}
                                        className="p-1 px-1.5 bg-rose-600 hover:bg-rose-700 text-white font-extrabold rounded text-[10px] whitespace-nowrap transition-colors cursor-pointer border-none"
                                        title="Hủy/Bác bỏ"
                                      >
                                        Bác bỏ
                                      </button>
                                    )}
                                  </>
                                )}
                              </div>

                            </div>
                          </td>

                        </tr>
                      );
                    })
                  )}
                </tbody>

              </table>
            </div>
            
            {/* Scroll footer instruction */}
            <div className="bg-slate-50/50 p-3 px-5 text-[10px] text-slate-400 font-bold flex flex-col sm:flex-row items-center justify-between gap-2 border-t border-slate-150 select-none">
              <span>💡 Mẹo: Bấm vào tiêu đề cột để sắp xếp thứ tự bảng báo cáo BCV tùy chọn nhanh.</span>
              <span>Hiển thị: <strong>{sortedSpeakers.length}</strong> / <strong>{speakers.length}</strong> đề đệ trình báo cáo khoa học</span>
            </div>
          </div>

          {/* MOBILE REPRESENTATION: Responsive Card Grid to avoid overflow */}
          <div className="block md:hidden space-y-4">
            {sortedSpeakers.length === 0 ? (
              <div className="bg-white p-8 text-center rounded-2xl border border-slate-200 text-slate-400 font-semibold italic text-xs">
                Không tìm thấy đề tài đệ trình nào khớp với lựa chọn hiện thời.
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {sortedSpeakers.map((spk) => (
                  <div key={spk.id} className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex flex-col justify-between gap-3 animate-fade-in">
                    <div className="flex items-start justify-between gap-2">
                      <div className="space-y-1">
                        <span className="font-mono text-[9px] text-slate-400 font-bold block">MÃ SỐ: {spk.id}</span>
                        <h4 
                          onClick={() => setSelectedSpeaker(spk)}
                          className="font-extrabold text-slate-900 text-xs hover:text-indigo-600 hover:underline cursor-pointer leading-snug line-clamp-3"
                        >
                          “{spk.presentationTitle}”
                        </h4>
                      </div>
                      <span className={`px-2 py-0.5 rounded-full text-[8px] font-black shrink-0 ${
                        spk.status === 'approved' ? 'bg-emerald-50 text-emerald-700 border border-emerald-100' :
                        spk.status === 'rejected' ? 'bg-rose-50 text-rose-700 border border-rose-105' :
                        'bg-amber-50 text-amber-700 border border-amber-105'
                      }`}>
                        {spk.status === 'approved' ? 'DUYỆT' : spk.status === 'rejected' ? 'BÁC BỎ' : 'CHỜ'}
                      </span>
                    </div>

                    <div className="p-2.5 bg-slate-50 rounded-lg flex items-center gap-2 text-[10px] text-slate-600">
                      {spk.avatarUrl ? (
                        <img src={spk.avatarUrl} alt="Avatar" className="w-8 h-8 rounded-full object-cover shrink-0" />
                      ) : (
                        <div className="w-8 h-8 rounded-full bg-indigo-500 text-white font-bold flex items-center justify-center shrink-0 text-[10px]">
                          {spk.fullName ? spk.fullName.substring(0, 1) : 'BC'}
                        </div>
                      )}
                      <div className="truncate">
                        <p className="font-bold text-slate-850 truncate">{spk.title} {spk.fullName}</p>
                        <p className="text-slate-400 text-[9px] truncate">{spk.organization} | {spk.presentationTrack}</p>
                      </div>
                    </div>

                    <div className="pt-2 border-t border-slate-100 flex items-center justify-between mt-auto">
                      <span className="text-[8.5px] text-slate-400 font-semibold font-mono">📅 {formatDate(spk.registrationDate)}</span>
                      
                      {/* Action Icon buttons to preserve mobile space */}
                      <div className="flex items-center gap-1">
                        <button
                          type="button"
                          onClick={() => setSelectedSpeaker(spk)}
                          className="p-1 px-2 border border-slate-200 bg-slate-50 hover:bg-slate-100 text-slate-700 rounded text-[9px] font-bold flex items-center gap-1 cursor-pointer transition"
                          title="Đọc toàn văn"
                        >
                          <FileText className="w-3 h-3 text-slate-500" />
                          <span>Chi tiết</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => handleEditSpeaker(spk)}
                          className="p-1 bg-indigo-50 border border-indigo-200 hover:bg-indigo-100 text-indigo-700 rounded text-[9px] font-bold cursor-pointer transition"
                          title="Chỉnh sửa thông tin báo cáo viên"
                        >
                          Sửa
                        </button>

                        {role !== 'ctv' && (
                          <button
                            type="button"
                            onClick={() => handleDeleteSpeaker(spk.id)}
                            className="p-1 bg-rose-50 border border-rose-200 hover:bg-rose-100 text-rose-700 rounded text-[9px] font-bold cursor-pointer transition"
                            title="Xóa báo cáo viên"
                          >
                            Xóa
                          </button>
                        )}

                        {role !== 'ctv' && (
                          <>
                            {spk.status !== 'approved' && (
                              <button
                                type="button"
                                onClick={() => handleUpdateStatus(spk.id, 'approved')}
                                className="p-1 bg-emerald-50 border border-emerald-200 hover:bg-emerald-100 rounded text-emerald-700 transition cursor-pointer"
                                title="Duyệt bài đăng"
                              >
                                <CheckCircle className="w-3.5 h-3.5" />
                              </button>
                            )}
                            {spk.status !== 'rejected' && (
                              <button
                                type="button"
                                onClick={() => handleUpdateStatus(spk.id, 'rejected')}
                                className="p-1 bg-rose-50 border border-rose-200 hover:bg-rose-105 rounded text-rose-700 transition cursor-pointer"
                                title="Bác bỏ đề tài"
                              >
                                <XCircle className="w-3.5 h-3.5" />
                              </button>
                            )}
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      ) : (

        /* ORIGINAL CARDS GRID LAYOUT WITH METRICS INCLUDED (Dạng Thẻ) */
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {sortedSpeakers.length === 0 ? (
            <div className="col-span-2 bg-white p-12 text-center rounded-2xl border border-slate-200 text-slate-400 font-semibold italic text-xs">
              Không tìm thấy đề tài đệ trình nào khớp với lựa chọn hiện thời.
            </div>
          ) : (
            sortedSpeakers.map((spk) => (
              <div key={spk.id} className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex flex-col justify-between hover:border-teal-300 transition-all">
                <div className="space-y-4">
                  {/* Header status */}
                  <div className="flex items-center justify-between">
                    <span className="font-mono text-[9px] text-slate-400 font-black">HỒ SƠ: {spk.id}</span>
                    
                    <span className={`px-2.5 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-wider ${
                      spk.status === 'approved' ? 'bg-emerald-50 text-emerald-700' :
                      spk.status === 'rejected' ? 'bg-rose-50 text-rose-700' :
                      'bg-amber-50 text-amber-700'
                    }`}>
                      {spk.status}
                    </span>
                  </div>

                  {/* Article Info */}
                  <div>
                    <h4 className="font-bold text-slate-950 text-base leading-snug hover:text-teal-750 transition-all cursor-pointer" onClick={() => setSelectedSpeaker(spk)}>
                      “{spk.presentationTitle}”
                    </h4>
                    <span className="text-[11px] font-bold text-teal-600 bg-teal-50/50 px-2 py-0.5 rounded inline-block mt-2">
                      {spk.presentationTrack}
                    </span>
                  </div>

                  {/* Speaker author info details */}
                  <div className="p-3 bg-slate-50/70 rounded-xl flex items-center gap-3 text-xs">
                    {spk.avatarUrl ? (
                      <img 
                        src={spk.avatarUrl} 
                        alt="Avatar" 
                        className="w-11 h-11 rounded-full object-cover border border-slate-200 shadow-sm shrink-0 font-sans" 
                      />
                    ) : (
                      <div className="w-11 h-11 rounded-full bg-slate-150 border border-slate-200 flex items-center justify-center shrink-0">
                        <span className="text-[10px] font-bold text-slate-400">BCV</span>
                      </div>
                    )}
                    <div className="space-y-0.5">
                      <p className="font-bold text-slate-900">{spk.title} {spk.fullName}</p>
                      <p className="text-slate-500 font-medium leading-tight">{spk.organization} / {spk.department}</p>
                      <p className="text-[10px] text-slate-400 font-mono italic">{spk.email} | {spk.phone}</p>
                    </div>
                  </div>

                  {/* Calendar synched details */}
                  <div className="flex items-center gap-1.5 text-[11px] text-slate-500">
                    <Calendar className="w-3.5 h-3.5 text-indigo-505 shrink-0" />
                    <span>
                      Calendar Sync Status: 
                      <strong className={spk.calendarSynced ? 'text-emerald-700' : 'text-slate-400'}>
                        {spk.calendarSynced ? ' Đã đồng bộ Google Calendar thành công' : ' Tắt đồng bộ'}
                      </strong>
                    </span>
                  </div>
                </div>

                {/* Action row controls */}
                <div className="mt-6 pt-4 border-t border-slate-100 flex flex-wrap items-center justify-between gap-3 text-xs">
                  {/* Session Assign for schedule mapping */}
                  <div className="flex items-center gap-1.5 w-full sm:w-auto">
                    <span className="text-[10px] font-bold text-slate-400 uppercase font-mono block shrink-0">Xếp sảnh:</span>
                    <select
                      value={spk.scheduledSessionId || ''}
                      disabled={role === 'ctv'}
                      onChange={(e) => handleAssignSession(spk.id, e.target.value)}
                      className="px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-[11.5px] font-semibold focus:outline-none pr-6 cursor-pointer"
                    >
                      <option value="">-- Chưa xếp --</option>
                      {sessions.map(s => (
                        <option key={s.id} value={s.id}>
                          {s.startTime} | {s.roomName.split(' ')[1] || s.roomName}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Approve/Reject triggers */}
                  <div className="flex flex-wrap items-center gap-2">
                    <button
                      onClick={() => setSelectedSpeaker(spk)}
                      className="px-2.5 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-lg flex items-center gap-1 cursor-pointer"
                    >
                      <Eye className="w-3.5 h-3.5" />
                      Đọc tóm tắt
                    </button>

                    <button
                      onClick={() => handleEditSpeaker(spk)}
                      className="px-2.5 py-1.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-100 font-bold rounded-lg flex items-center gap-1 cursor-pointer"
                    >
                      Sửa
                    </button>

                    {role !== 'ctv' && (
                      <button
                        onClick={() => handleDeleteSpeaker(spk.id)}
                        className="px-2.5 py-1.5 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-100 font-bold rounded-lg flex items-center gap-1 cursor-pointer"
                      >
                        Xóa
                      </button>
                    )}

                    {role !== 'ctv' && (
                      <>
                        {spk.status !== 'approved' && (
                          <button
                            onClick={() => handleUpdateStatus(spk.id, 'approved')}
                            className="px-2.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-lg flex items-center gap-1 cursor-pointer"
                          >
                            <CheckCircle className="w-3.5 h-3.5" />
                            Duyệt
                          </button>
                        )}
                        {spk.status !== 'rejected' && (
                          <button
                            onClick={() => handleUpdateStatus(spk.id, 'rejected')}
                            className="px-2.5 py-1.5 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-100 font-bold rounded-lg flex items-center gap-1 cursor-pointer"
                          >
                            <XCircle className="w-3.5 h-3.5" />
                            Bác bỏ
                          </button>
                        )}
                      </>
                    )}
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {/* Detail Viewer Modal of speaker & full abstract text of research paper */}
      {selectedSpeaker && (
        <div className="fixed inset-0 bg-slate-950/45 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-2xl w-full max-h-[90vh] overflow-y-auto border border-slate-100 shadow-2xl animate-fade-in text-slate-800">
            <div className="bg-gradient-to-r from-teal-800 to-indigo-900 text-white p-6 relative">
              <span className="text-[10px] font-mono font-bold uppercase tracking-widest text-teal-300 block">THẨM ĐỊNH BÌNH DUYỆT ĐỀ TÀI</span>
              <h4 className="font-extrabold text-base mt-2 md:text-lg">“{selectedSpeaker.presentationTitle}”</h4>
              <p className="text-xs text-indigo-2 w-fit mt-2 bg-white/10 px-2 py-0.5 rounded font-bold">{selectedSpeaker.presentationTrack}</p>
              
              <button 
                onClick={() => setSelectedSpeaker(null)}
                className="absolute top-4 right-4 text-slate-350 hover:text-white font-bold text-sm"
              >
                ✕
              </button>
            </div>

            <div className="p-8 space-y-6">
              {/* Speaker author info row */}
              <div>
                <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider font-mono block mb-2">Tác giả báo cáo chính:</span>
                <div className="flex gap-4 items-center bg-slate-50 p-4 rounded-2xl border border-slate-150">
                  {selectedSpeaker.avatarUrl ? (
                    <img 
                      src={selectedSpeaker.avatarUrl} 
                      alt="Avatar" 
                      className="w-12 h-12 rounded-full object-cover border border-slate-200 shadow-sm shrink-0" 
                    />
                  ) : (
                    <div className="w-12 h-12 rounded-full bg-teal-100 text-teal-850 flex items-center justify-center font-bold text-sm shrink-0 uppercase border border-teal-200">
                      {selectedSpeaker.fullName ? selectedSpeaker.fullName.substring(0, 2) : 'BS'}
                    </div>
                  )}
                  <div>
                    <h5 className="font-bold text-slate-900 text-sm">{selectedSpeaker.title} {selectedSpeaker.fullName}</h5>
                    <p className="text-xs text-slate-500 font-medium">{selectedSpeaker.organization} ({selectedSpeaker.department})</p>
                    <p className="text-[10px] text-slate-400 font-mono mt-0.5">{selectedSpeaker.phone} | {selectedSpeaker.email}</p>
                  </div>
                </div>

                {/* Thong tin cap CME */}
                <div className="mt-3 pt-3 border-t border-slate-200 grid grid-cols-2 md:grid-cols-4 gap-3">
                  <div>
                    <span className="text-[9px] uppercase font-bold text-slate-400 tracking-wider font-mono block">Ngày sinh</span>
                    <p className="text-xs font-bold text-slate-800 mt-0.5">
                      {selectedSpeaker.dateOfBirth
                        ? selectedSpeaker.dateOfBirth.split('-').reverse().join('/')
                        : <span className="text-amber-600">Chưa có</span>}
                    </p>
                  </div>
                  <div>
                    <span className="text-[9px] uppercase font-bold text-slate-400 tracking-wider font-mono block">Nơi sinh</span>
                    <p className="text-xs font-bold text-slate-800 mt-0.5">
                      {selectedSpeaker.placeOfBirth || <span className="text-amber-600">Chưa có</span>}
                    </p>
                  </div>
                  <div>
                    <span className="text-[9px] uppercase font-bold text-slate-400 tracking-wider font-mono block">Số CCCD</span>
                    <p className="text-xs font-bold text-slate-800 mt-0.5 font-mono">
                      {selectedSpeaker.identityNo || <span className="text-amber-600 font-sans">Chưa có</span>}
                    </p>
                  </div>
                  <div>
                    <span className="text-[9px] uppercase font-bold text-slate-400 tracking-wider font-mono block">Bằng cấp</span>
                    {selectedSpeaker.degreeProofUrl ? (
                      <button
                        type="button"
                        onClick={() => window.open(selectedSpeaker.degreeProofUrl, '_blank')}
                        className="text-xs font-bold text-indigo-600 hover:underline mt-0.5 bg-transparent border-none p-0 cursor-pointer"
                      >
                        Xem ảnh
                      </button>
                    ) : (
                      <p className="text-xs font-bold text-amber-600 mt-0.5">Chưa có</p>
                    )}
                  </div>
                </div>
              </div>

              {/* Biography cv details */}
              {selectedSpeaker.bio && (
                <div>
                  <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider font-mono block mb-1.5">Tiểu sử khoa học tóm tắt:</span>
                  <div 
                    className="text-xs text-slate-650 bg-slate-50/50 p-3 rounded-xl border border-slate-100 leading-relaxed italic prose prose-sm max-w-none"
                    dangerouslySetInnerHTML={{ __html: selectedSpeaker.bio }}
                  />
                </div>
              )}

              {selectedSpeaker.bioEn && (
                <div>
                  <span className="text-[10px] uppercase font-bold text-indigo-500 tracking-wider font-mono block mb-1.5">Tiểu sử khoa học (bản tiếng Anh):</span>
                  <div className="text-xs text-slate-650 bg-indigo-50/40 p-3 rounded-xl border border-indigo-100 leading-relaxed italic whitespace-pre-wrap">
                    {selectedSpeaker.bioEn}
                  </div>
                </div>
              )}

              {/* Abstract Full Text and paper structure */}
              <div>
                <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider font-mono block mb-1.5">Nội dung tóm tắt nghiên cứu (Abstract text):</span>
                <div 
                  className="text-xs text-slate-700 bg-teal-50/10 p-5 rounded-2xl border border-teal-500/10 leading-relaxed font-sans prose prose-sm max-w-none"
                  dangerouslySetInnerHTML={{ __html: selectedSpeaker.abstractText }}
                />
              </div>

              {selectedSpeaker.abstractEn && (
                <div>
                  <span className="text-[10px] uppercase font-bold text-indigo-500 tracking-wider font-mono block mb-1.5">Abstract (bản tiếng Anh):</span>
                  <div className="text-xs text-slate-700 bg-indigo-50/40 p-5 rounded-2xl border border-indigo-100 leading-relaxed whitespace-pre-wrap">
                    {selectedSpeaker.abstractEn}
                  </div>
                </div>
              )}

              {/* Attached file attachments */}
              <div className="flex flex-wrap items-center justify-between gap-4 p-4 border border-slate-150 bg-slate-50 rounded-2xl">
                <div>
                  <span className="text-xs font-bold text-slate-800 block">Tài liệu đính kèm kiểm duyệt viên:</span>
                  <span className="text-[10px] text-slate-500 font-medium">Bản thảo lưu trữ an toàn trong máy chủ phân định</span>
                </div>
                <div className="flex items-center gap-2">
                  {selectedSpeaker.documentUrl ? (
                    <div className="flex flex-col md:flex-row gap-2">
                      {selectedSpeaker.documentUrl.split('|').map((url, idx) => {
                        const name = (selectedSpeaker.documentName || '').split('|')[idx] || `File-${idx + 1}`;
                        return (
                          <a
                            key={idx}
                            href={url}
                            download={name}
                            className="text-xs text-white font-bold flex items-center gap-1.5 bg-indigo-600 hover:bg-indigo-700 active:scale-95 px-3 py-2 rounded-xl text-[11px] shadow-sm transition-all cursor-pointer no-underline truncate max-w-[200px]"
                          >
                            <svg className="w-3.5 h-3.5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5"><path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"/></svg>
                            Tải về: {name}
                          </a>
                        );
                      })}
                    </div>
                  ) : selectedSpeaker.documentName ? (
                    <div className="flex flex-col gap-2">
                      {selectedSpeaker.documentName.split('|').map((name, idx) => (
                        <span key={idx} className="text-xs text-amber-700 font-semibold flex items-center gap-1.5 bg-amber-50 border border-amber-200 px-3 py-1.5 rounded-xl text-[11px] font-mono">
                          <FileText className="w-4 h-4 text-amber-500 shrink-0" />
                          <span>{name}</span>
                          <span className="text-amber-500 text-[9px] ml-1">(link chưa lưu — hãy upload lại từ form chỉnh sửa)</span>
                        </span>
                      ))}
                    </div>
                  ) : (
                    <span className="text-xs text-slate-400 font-semibold flex items-center gap-1 bg-white border border-slate-200 px-3 py-1.5 rounded-xl text-[11px] font-mono">
                      <FileText className="w-4 h-4 text-slate-300 shrink-0" />
                      Không có tài liệu đính kèm
                    </span>
                  )}
                </div>
              </div>


              {/* Assign or approve section inside the modal detail viewer */}
              <div className="pt-6 border-t border-slate-150 flex justify-between gap-3 flex-wrap">
                <div className="flex items-center gap-2">
                  <span className="text-xs text-slate-500 font-semibold">Trạng thái duyệt:</span>
                  <span className={`px-3 py-1 rounded-full text-xs font-bold uppercase ${
                    selectedSpeaker.status === 'approved' ? 'bg-emerald-50 text-emerald-700' :
                    selectedSpeaker.status === 'rejected' ? 'bg-rose-50 text-rose-700' :
                    'bg-amber-50 text-amber-700'
                  }`}>
                    {selectedSpeaker.status === 'approved' ? 'Đã duyệt' : selectedSpeaker.status === 'rejected' ? 'Bác bỏ' : 'Chờ duyệt'}
                  </span>
                </div>

                <div className="flex gap-2">
                  <button
                    onClick={() => setSelectedSpeaker(null)}
                    className="px-4 py-2 text-xs bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl"
                  >
                    Đóng
                  </button>
                  {role !== 'ctv' && (
                    <>
                      {selectedSpeaker.status !== 'rejected' && (
                        <button
                          onClick={() => {
                            handleUpdateStatus(selectedSpeaker.id, 'rejected');
                            setSelectedSpeaker(null);
                          }}
                          className="px-4 py-2 text-xs bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-100 font-bold rounded-xl"
                        >
                          Bác Bỏ Đề Tài
                        </button>
                      )}
                      {selectedSpeaker.status !== 'approved' && (
                        <button
                          onClick={() => {
                            handleUpdateStatus(selectedSpeaker.id, 'approved');
                            setSelectedSpeaker(null);
                          }}
                          className="px-4 py-2 text-xs bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl shadow-lg shadow-emerald-700/10"
                        >
                          Phê Duyệt Đề Tài
                        </button>
                      )}
                    </>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Specialty Tracks Management Modal */}
      {showTrackModal && (
        <div className="fixed inset-0 bg-slate-950/45 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-2xl w-full max-h-[90vh] overflow-hidden border border-slate-100 shadow-2xl animate-fade-in flex flex-col text-slate-800">
            {/* Modal Header */}
            <div className="bg-gradient-to-r from-teal-700 to-emerald-800 text-white p-6 relative shrink-0">
              <span className="text-[10px] font-mono font-bold uppercase tracking-widest text-teal-300 block">QUẢN LÝ CHUYÊN ĐỀ</span>
              <h4 className="font-extrabold text-lg mt-1">Danh Mục Chuyên Đề Đăng Ký</h4>
              <p className="text-xs text-teal-100/80 mt-1">
                Thêm, sửa, hoặc xóa danh mục chuyên đề báo cáo của báo cáo viên. Các thay đổi sẽ được cập nhật đồng bộ tức thời với form đăng ký.
              </p>
              <button 
                onClick={() => {
                  setShowTrackModal(false);
                  setEditingTrack(null);
                  setNewTrackName('');
                  setNewTrackDesc('');
                }}
                className="absolute top-4 right-4 text-slate-300 hover:text-white font-bold text-sm bg-transparent border-none cursor-pointer"
              >
                ✕
              </button>
            </div>

            {/* Modal Content - Scrollable */}
            <div className="p-8 space-y-6 overflow-y-auto flex-1">
              
              {/* Form to Add/Edit Specialty Track */}
              <form onSubmit={handleSaveTrack} className="bg-slate-50 p-4 rounded-2xl border border-slate-200">
                <h5 className="text-xs font-black uppercase text-teal-850 mb-3 tracking-wider flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5" />
                  {editingTrack ? '📝 CẬP NHẬT CHUYÊN ĐỀ' : '➕ THÊM CHUYÊN ĐỀ MỚI'}
                </h5>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">🇻🇳 Tên tiếng Việt *</label>
                    <input
                      type="text"
                      required
                      value={newTrackName}
                      onChange={(e) => setNewTrackName(e.target.value)}
                      placeholder="Ví dụ: Thẩm mỹ da, Trẻ hóa..."
                      className="w-full px-3 py-2 bg-white border border-slate-250 rounded-xl text-xs font-semibold focus:border-teal-500 focus:outline-none placeholder-slate-400"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">🇬🇧 English Name</label>
                    <input
                      type="text"
                      value={newTrackNameEn}
                      onChange={(e) => setNewTrackNameEn(e.target.value)}
                      placeholder="e.g. Aesthetic Plastic Surgery..."
                      className="w-full px-3 py-2 bg-white border border-slate-250 rounded-xl text-xs font-semibold focus:border-teal-500 focus:outline-none placeholder-slate-400"
                    />
                  </div>
                  <div className="md:col-span-2">
                    <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">Mô tả ngắn</label>
                    <input
                      type="text"
                      value={newTrackDesc}
                      onChange={(e) => setNewTrackDesc(e.target.value)}
                      placeholder="Ví dụ: Phẫu thuật tái tạo..."
                      className="w-full px-3 py-2 bg-white border border-slate-250 rounded-xl text-xs font-semibold focus:border-teal-500 focus:outline-none placeholder-slate-400"
                    />
                  </div>
                </div>
                <div className="mt-4 flex justify-end gap-2">
                  {editingTrack && (
                    <button
                      type="button"
                      onClick={() => {
                        setEditingTrack(null);
                        setNewTrackName('');
                        setNewTrackNameEn('');
                        setNewTrackDesc('');
                      }}
                      className="px-3 py-1.5 text-xs bg-slate-200 hover:bg-slate-300 text-slate-755 font-bold rounded-xl cursor-pointer border-none"
                    >
                      Hủy chỉnh sửa
                    </button>
                  )}
                  <button
                    type="submit"
                    className="px-4 py-1.5 text-xs bg-teal-600 hover:bg-teal-700 text-white font-bold rounded-xl flex items-center gap-1 cursor-pointer border-none shadow-sm"
                  >
                    {editingTrack ? 'Lưu thay đổi' : 'Thêm danh mục'}
                  </button>
                </div>
              </form>

              {/* Specialty Track List */}
              <div>
                <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider font-mono block mb-2.5">DANH SÁCH CHUYÊN ĐỀ ĐANG ĐIỀU HÀNH ({specialtyTracks.length}):</span>
                <div className="space-y-2 max-h-[300px] overflow-y-auto pr-1">
                  {specialtyTracks.map((track) => {
                    const count = speakers.filter(s => s.presentationTrack === track.name).length;
                    const isOpen = track.isAcceptingNew !== false;
                    return (
                      <div key={track.id} className={`flex items-center justify-between p-3 border rounded-2xl shadow-xs transition-all ${isOpen ? 'bg-white border-slate-150 hover:border-slate-300' : 'bg-slate-50 border-slate-200 hover:border-slate-300'}`}>
                        <div className="min-w-0 pr-2">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className={`text-xs font-black ${isOpen ? 'text-slate-800' : 'text-slate-500'}`}>🇻🇳 {track.name}</span>
                            {track.nameEn && (
                              <span className="text-[10px] font-bold text-indigo-600 bg-indigo-50 border border-indigo-100 px-1.5 py-0.5 rounded-full">🇬🇧 {track.nameEn}</span>
                            )}
                            <span className="text-[9px] font-extrabold bg-teal-50 border border-teal-100 text-teal-700 px-1.5 py-0.5 rounded-full uppercase shrink-0 whitespace-nowrap">
                              {count} báo cáo
                            </span>
                            {!isOpen && (
                              <span className="text-[9px] font-extrabold bg-amber-50 border border-amber-200 text-amber-700 px-1.5 py-0.5 rounded-full uppercase shrink-0 whitespace-nowrap">
                                Ngừng nhận mới
                              </span>
                            )}
                          </div>
                          {track.description && (
                            <p className="text-[10px] text-slate-400 mt-0.5 font-medium truncate">{track.description}</p>
                          )}
                        </div>
                        <div className="flex items-center gap-1.5 shrink-0">
                          <button
                            type="button"
                            onClick={() => handleToggleTrackAccepting(track)}
                            className={`p-1 px-1.5 border-none rounded-lg text-[10px] font-bold cursor-pointer transition-colors flex items-center justify-center whitespace-nowrap ${isOpen ? 'bg-slate-50 hover:bg-amber-50 text-amber-700' : 'bg-emerald-50 hover:bg-emerald-100 text-emerald-700'}`}
                            title={isOpen
                              ? 'Ngừng nhận đăng ký mới vào chuyên đề này, hồ sơ cũ vẫn giữ nguyên'
                              : 'Mở lại nhận đăng ký vào chuyên đề này'}
                          >
                            {isOpen ? 'Ngừng nhận' : 'Mở lại'}
                          </button>
                          <button
                            type="button"
                            onClick={() => handleEditTrack(track)}
                            className="p-1 px-1.5 bg-slate-50 hover:bg-indigo-50 border-none text-indigo-650 hover:text-indigo-800 rounded-lg text-xs font-bold cursor-pointer transition-colors flex items-center justify-center"
                            title="Chỉnh sửa tên & mô tả chuyên đề"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDeleteTrack(track.id, track.name)}
                            className="p-1 px-1.5 bg-slate-50 hover:bg-rose-50 border-none text-rose-600 hover:text-rose-800 rounded-lg text-xs font-bold cursor-pointer transition-colors flex items-center justify-center"
                            title="Xóa danh mục này"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

            </div>

            {/* Modal Footer */}
            <div className="p-6 bg-slate-50 border-t border-slate-150 flex justify-end shrink-0">
              <button
                type="button"
                onClick={() => {
                  setShowTrackModal(false);
                  setEditingTrack(null);
                  setNewTrackName('');
                  setNewTrackDesc('');
                }}
                className="px-4 py-2 text-xs bg-slate-150 hover:bg-slate-200 text-slate-700 font-bold rounded-xl cursor-pointer border-none shadow-xs"
              >
                Đóng / Hoàn tất
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 📝 ADD/EDIT SPEAKER FORM MODAL */}
      {showSpeakerModal && (
        <div className="fixed inset-0 bg-slate-950/45 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-2xl w-full max-h-[90vh] overflow-hidden border border-slate-100 shadow-2xl flex flex-col text-slate-800 animate-scale-up">
            
            {/* Header */}
            <div className="bg-teal-600 p-5 text-white flex justify-between items-center shrink-0">
              <div>
                <h4 className="font-extrabold text-sm uppercase tracking-wide">
                  {editingSpeaker ? 'CẬP NHẬT HỒ SƠ BÁO CÁO VIÊN' : 'THÊM BÁO CÁO VIÊN THỦ CÔNG'}
                </h4>
                <p className="text-[10.5px] text-teal-100 mt-0.5">
                  {editingSpeaker ? 'Nhập thông tin mới để hiệu chỉnh hồ sơ khoa học.' : 'Tạo mới một đề tài báo cáo khoa học kèm thông tin tác giả.'}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowSpeakerModal(false)}
                className="p-1.5 hover:bg-teal-700 rounded-full text-teal-50 transition border-none cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Form Content */}
            <form onSubmit={handleSaveSpeaker} className="flex-1 overflow-y-auto p-6 space-y-4">
              
              {/* Personal Information Section */}
              <div className="bg-slate-50/50 p-4 rounded-2xl border border-slate-100 space-y-3">
                <span className="text-[10px] font-bold text-teal-700 uppercase tracking-wider block font-mono">1. Thông tin cá nhân & Đơn vị</span>
                
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  <div>
                    <label className="text-[9.5px] font-extrabold text-slate-500 block mb-1">Học hàm / Học vị *</label>
                    <select
                      value={speakerTitle}
                      onChange={(e) => setSpeakerTitle(e.target.value)}
                      className="w-full px-3 py-1.5 border border-slate-200 rounded-xl text-xs bg-white font-semibold cursor-pointer focus:ring-1 focus:ring-teal-500 focus:outline-none"
                    >
                      <option value="GS.TS.BS">GS.TS.BS</option>
                      <option value="PGS.TS.BS">PGS.TS.BS</option>
                      <option value="TS.BS">TS.BS</option>
                      <option value="ThS.BS">ThS.BS</option>
                      <option value="BSCK1">BSCK1</option>
                      <option value="BSCK2">BSCK2</option>
                      <option value="BSNT">BSNT</option>
                      <option value="BS">BS</option>
                    </select>
                  </div>
                  <div className="md:col-span-2">
                    <label className="text-[9.5px] font-extrabold text-slate-500 block mb-1">Họ và tên báo cáo viên *</label>
                    <input
                      type="text"
                      required
                      value={speakerFullName}
                      onChange={(e) => setSpeakerFullName(e.target.value)}
                      placeholder="Nguyen Van A"
                      className="w-full px-3 py-1.5 border border-slate-200 rounded-xl text-xs focus:ring-1 focus:ring-teal-500 focus:outline-none placeholder-slate-400"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div>
                    <label className="text-[9.5px] font-extrabold text-slate-500 block mb-1">Cơ quan công tác *</label>
                    <input
                      type="text"
                      required
                      value={speakerOrganization}
                      onChange={(e) => setSpeakerOrganization(e.target.value)}
                      placeholder="Bệnh viện Chợ Rẫy"
                      className="w-full px-3 py-1.5 border border-slate-200 rounded-xl text-xs focus:ring-1 focus:ring-teal-500 focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="text-[9.5px] font-extrabold text-slate-500 block mb-1">Khoa / Phòng ban</label>
                    <input
                      type="text"
                      value={speakerDepartment}
                      onChange={(e) => setSpeakerDepartment(e.target.value)}
                      placeholder="Ngoại Tiêu hóa"
                      className="w-full px-3 py-1.5 border border-slate-200 rounded-xl text-xs focus:ring-1 focus:ring-teal-500 focus:outline-none"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div>
                    <label className="text-[9.5px] font-extrabold text-slate-500 block mb-1">Số điện thoại liên hệ</label>
                    <input
                      type="tel"
                      value={speakerPhone}
                      onChange={(e) => setSpeakerPhone(e.target.value)}
                      placeholder="09xxx..."
                      className="w-full px-3 py-1.5 border border-slate-200 rounded-xl text-xs focus:ring-1 focus:ring-teal-500 focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="text-[9.5px] font-extrabold text-slate-500 block mb-1">Địa chỉ Email</label>
                    <input
                      type="email"
                      value={speakerEmail}
                      onChange={(e) => setSpeakerEmail(e.target.value)}
                      placeholder="bacsi@gmail.com"
                      className="w-full px-3 py-1.5 border border-slate-200 rounded-xl text-xs focus:ring-1 focus:ring-teal-500 focus:outline-none"
                    />
                  </div>
                </div>

                {/* Thong tin bat buoc de cap chung chi CME */}
                <div className="pt-3 border-t border-slate-200 space-y-3">
                  <span className="text-[9.5px] font-extrabold text-teal-700 uppercase tracking-wider block font-mono">
                    Thông tin để cấp chứng chỉ CME
                  </span>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                    <div>
                      <label className="text-[9.5px] font-extrabold text-slate-500 block mb-1">Ngày tháng năm sinh</label>
                      <input
                        type="date"
                        min="1920-01-01"
                        max={new Date().toISOString().split('T')[0]}
                        value={speakerDateOfBirth}
                        onChange={(e) => setSpeakerDateOfBirth(e.target.value)}
                        className="w-full px-3 py-1.5 border border-slate-200 rounded-xl text-xs focus:ring-1 focus:ring-teal-500 focus:outline-none"
                      />
                    </div>
                    <div>
                      <label className="text-[9.5px] font-extrabold text-slate-500 block mb-1">Nơi sinh</label>
                      <input
                        type="text"
                        value={speakerPlaceOfBirth}
                        onChange={(e) => setSpeakerPlaceOfBirth(e.target.value)}
                        placeholder="ví dụ: Hà Nội"
                        className="w-full px-3 py-1.5 border border-slate-200 rounded-xl text-xs focus:ring-1 focus:ring-teal-500 focus:outline-none placeholder-slate-400"
                      />
                    </div>
                    <div>
                      <label className="text-[9.5px] font-extrabold text-slate-500 block mb-1">Số CCCD / Định danh</label>
                      <input
                        type="text"
                        inputMode="numeric"
                        maxLength={20}
                        value={speakerIdentityNo}
                        onChange={(e) => setSpeakerIdentityNo(e.target.value.replace(/[^0-9]/g, ''))}
                        placeholder="001188012345"
                        className="w-full px-3 py-1.5 border border-slate-200 rounded-xl text-xs font-mono focus:ring-1 focus:ring-teal-500 focus:outline-none placeholder-slate-400"
                      />
                    </div>
                  </div>

                  <div className="flex items-center gap-3 flex-wrap">
                    <div className="relative shrink-0 w-24 h-16 rounded-xl bg-white border-2 border-dashed border-teal-600/30 flex items-center justify-center overflow-hidden">
                      {speakerDegreeProof ? (
                        <img src={speakerDegreeProof} className="w-full h-full object-cover" alt="Ảnh bằng cấp" />
                      ) : (
                        <span className="text-slate-400 text-[9px] font-bold text-center p-1 leading-none select-none">Chưa có ảnh</span>
                      )}
                      {isDegreeProofUploading && (
                        <div className="absolute inset-0 bg-slate-900/50 flex items-center justify-center text-[9px] text-white font-mono">
                          Đang tải...
                        </div>
                      )}
                    </div>
                    <div className="space-y-1">
                      <span className="text-[9.5px] font-extrabold text-slate-500 block">Hình ảnh bằng cấp</span>
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => degreeProofInputRef.current?.click()}
                          className="px-2.5 py-1 bg-white hover:bg-slate-100 border border-slate-300 text-[10px] font-bold rounded-lg cursor-pointer transition-colors whitespace-nowrap"
                        >
                          Tải ảnh bằng cấp
                        </button>
                        <input
                          ref={degreeProofInputRef}
                          type="file"
                          accept="image/*"
                          onChange={handleDegreeProofUpload}
                          className="hidden"
                        />
                        {speakerDegreeProof && (
                          <>
                            <button
                              type="button"
                              onClick={() => window.open(speakerDegreeProof, '_blank')}
                              className="px-2 py-1 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 text-[10px] font-bold rounded-lg border-none cursor-pointer whitespace-nowrap"
                            >
                              Xem ảnh
                            </button>
                            <button
                              type="button"
                              onClick={() => setSpeakerDegreeProof(null)}
                              className="px-2 py-1 bg-rose-50 hover:bg-rose-100 text-rose-600 text-[10px] font-bold rounded-lg border-none cursor-pointer whitespace-nowrap"
                            >
                              Xóa ảnh
                            </button>
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Presentation Information Section */}
              <div className="bg-slate-50/50 p-4 rounded-2xl border border-slate-100 space-y-3">
                <span className="text-[10px] font-bold text-teal-700 uppercase tracking-wider block font-mono">2. Đề tài & Chuyên đề báo cáo</span>

                <div>
                  <label className="text-[9.5px] font-extrabold text-slate-500 block mb-1">Tên đề tài báo cáo khoa học *</label>
                  <input
                    type="text"
                    required
                    value={speakerPresentationTitle}
                    onChange={(e) => setSpeakerPresentationTitle(e.target.value)}
                    placeholder="ví dụ: Đánh giá kết quả phẫu thuật nội soi..."
                    className="w-full px-3 py-1.5 border border-slate-200 rounded-xl text-xs focus:ring-1 focus:ring-teal-500 focus:outline-none"
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div>
                    <label className="text-[9.5px] font-extrabold text-slate-500 block mb-1">Chuyên đề đệ trình *</label>
                    <select
                      value={speakerPresentationTrack}
                      onChange={(e) => setSpeakerPresentationTrack(e.target.value)}
                      className="w-full px-3 py-1.5 border border-slate-200 rounded-xl text-xs bg-white font-semibold cursor-pointer focus:ring-1 focus:ring-teal-500 focus:outline-none"
                    >
                      {specialtyTracks.map(t => (
                        <option key={t.id} value={t.name}>{t.name}</option>
                      ))}
                      {!specialtyTracks.some(t => t.name === speakerPresentationTrack) && speakerPresentationTrack && (
                        <option value={speakerPresentationTrack}>{speakerPresentationTrack}</option>
                      )}
                    </select>
                  </div>
                  <div>
                    <label className="text-[9.5px] font-extrabold text-slate-500 block mb-1">CV/Abstract/Full file (.pdf, .doc, .docx, .ppt, .pptx)</label>
                    <div className="flex flex-col md:flex-row md:items-center gap-3">
                      <input
                        type="file"
                        id="speaker-doc-upload"
                        accept=".pdf,.doc,.docx,.ppt,.pptx"
                        multiple
                        className="hidden"
                        onChange={handleDocumentUpload}
                        disabled={isDocumentUploading}
                      />
                      <label
                        htmlFor="speaker-doc-upload"
                        className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 border border-slate-300 rounded-xl text-xs font-bold text-slate-755 cursor-pointer flex items-center gap-1 select-none shadow-sm transition shrink-0"
                      >
                        <Upload className="w-3.5 h-3.5 text-slate-500" />
                        Tải tài liệu lên
                      </label>
                      {speakerDocumentName ? (
                        <div className="flex flex-wrap gap-1.5 max-w-md">
                          {speakerDocumentName.split('|').map((name, idx) => (
                            <span key={idx} className="text-xs text-slate-605 font-mono flex items-center gap-1.5 bg-slate-50 px-2 py-1 border border-slate-200 rounded-lg justify-between gap-2">
                              <span className="truncate max-w-[100px]">📄 {name}</span>
                              <button
                                type="button"
                                onClick={() => {
                                  const names = speakerDocumentName.split('|');
                                  const urls = (speakerDocumentUrl || '').split('|');
                                  names.splice(idx, 1);
                                  urls.splice(idx, 1);
                                  if (names.length === 0) {
                                    setSpeakerDocumentName('');
                                    setSpeakerDocumentUrl(null);
                                  } else {
                                    setSpeakerDocumentName(names.join('|'));
                                    setSpeakerDocumentUrl(urls.join('|'));
                                  }
                                }}
                                className="text-red-500 hover:text-red-700 font-bold bg-transparent border-none p-0 cursor-pointer"
                              >
                                ✕
                              </button>
                            </span>
                          ))}
                        </div>
                      ) : (
                        <span className="text-[10px] text-slate-400 italic font-semibold">Chưa có tệp</span>
                      )}
                    </div>
                  </div>

                </div>

                <div>
                  <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 pb-1.5 mb-2">
                    <label className="text-[9.5px] font-extrabold text-slate-500 uppercase tracking-wider block">Nội dung tóm tắt (Abstract)</label>
                    <div className="flex gap-1 bg-slate-100 p-0.5 rounded-lg w-fit select-none">
                      <button
                        type="button"
                        onClick={() => setAbstractEditorMode('visual')}
                        className={`px-2 py-1 rounded font-bold text-[9px] flex items-center gap-1 cursor-pointer transition-all border-none bg-transparent ${
                          abstractEditorMode === 'visual' ? 'bg-white text-indigo-700 shadow-sm' : 'text-slate-500 hover:text-slate-800'
                        }`}
                      >
                        <Sparkles className="w-3 h-3" />
                        Trực quan
                      </button>
                      <button
                        type="button"
                        onClick={() => setAbstractEditorMode('code')}
                        className={`px-2 py-1 rounded font-bold text-[9px] flex items-center gap-1 cursor-pointer transition-all border-none bg-transparent ${
                          abstractEditorMode === 'code' ? 'bg-white text-indigo-700 shadow-sm' : 'text-slate-500 hover:text-slate-800'
                        }`}
                      >
                        <Code className="w-3 h-3" />
                        HTML Code
                      </button>
                    </div>
                  </div>

                  {abstractEditorMode === 'visual' && (
                    <div className="flex flex-wrap items-center gap-1 p-1 bg-slate-50 border border-slate-200 rounded-xl mb-1 select-none">
                      <button
                        type="button"
                        onMouseDown={(e) => { e.preventDefault(); handleAbstractFormat('bold'); }}
                        className="p-1 hover:bg-slate-200 rounded text-slate-700 cursor-pointer"
                        title="Chữ đậm"
                      >
                        <Bold className="w-3.5 h-3.5" />
                      </button>
                      <button
                        type="button"
                        onMouseDown={(e) => { e.preventDefault(); handleAbstractFormat('italic'); }}
                        className="p-1 hover:bg-slate-200 rounded text-slate-700 cursor-pointer"
                        title="Chữ nghiêng"
                      >
                        <Italic className="w-3.5 h-3.5" />
                      </button>
                      <button
                        type="button"
                        onMouseDown={(e) => { e.preventDefault(); handleAbstractFormat('underline'); }}
                        className="p-1 hover:bg-slate-200 rounded text-slate-700 cursor-pointer"
                        title="Gạch chân"
                      >
                        <Underline className="w-3.5 h-3.5" />
                      </button>

                      <div className="w-px h-3.5 bg-slate-300 mx-0.5" />

                      <button
                        type="button"
                        onMouseDown={(e) => { e.preventDefault(); handleAbstractFormat('justifyLeft'); }}
                        className="p-1 hover:bg-slate-200 rounded text-slate-700 cursor-pointer"
                        title="Căn lề trái"
                      >
                        <AlignLeft className="w-3.5 h-3.5" />
                      </button>
                      <button
                        type="button"
                        onMouseDown={(e) => { e.preventDefault(); handleAbstractFormat('justifyCenter'); }}
                        className="p-1 hover:bg-slate-200 rounded text-slate-700 cursor-pointer"
                        title="Căn lề giữa"
                      >
                        <AlignCenter className="w-3.5 h-3.5" />
                      </button>
                      <button
                        type="button"
                        onMouseDown={(e) => { e.preventDefault(); handleAbstractFormat('justifyRight'); }}
                        className="p-1 hover:bg-slate-200 rounded text-slate-700 cursor-pointer"
                        title="Căn lề phải"
                      >
                        <AlignRight className="w-3.5 h-3.5" />
                      </button>

                      <div className="w-px h-3.5 bg-slate-300 mx-0.5" />

                      <button
                        type="button"
                        onMouseDown={(e) => { e.preventDefault(); handleAbstractFormat('insertUnorderedList'); }}
                        className="p-1 hover:bg-slate-200 rounded text-slate-700 cursor-pointer"
                        title="Danh sách dấu chấm"
                      >
                        <List className="w-3.5 h-3.5" />
                      </button>
                      <button
                        type="button"
                        onMouseDown={(e) => { e.preventDefault(); handleAbstractFormat('insertOrderedList'); }}
                        className="p-1 hover:bg-slate-200 rounded text-slate-700 cursor-pointer"
                        title="Danh sách số"
                      >
                        <ListOrdered className="w-3.5 h-3.5" />
                      </button>

                      <div className="w-px h-3.5 bg-slate-300 mx-0.5" />

                      <button
                        type="button"
                        onMouseDown={(e) => {
                          e.preventDefault();
                          const url = prompt('Nhập địa chỉ liên kết (URL):', 'https://');
                          if (url) handleAbstractFormat('createLink', url);
                        }}
                        className="p-1 hover:bg-slate-200 rounded text-slate-700 cursor-pointer"
                        title="Chèn liên kết"
                      >
                        <Link className="w-3.5 h-3.5" />
                      </button>

                      <div className="relative group flex items-center">
                        <button
                          type="button"
                          className="p-1 hover:bg-slate-200 rounded text-slate-700 flex items-center gap-0.5 cursor-pointer"
                          title="Chọn màu chữ"
                        >
                          <Palette className="w-3.5 h-3.5" />
                        </button>
                        <div className="absolute top-full left-0 mt-1 hidden group-hover:flex bg-white border border-slate-200 p-1.5 rounded-lg shadow-lg gap-1 z-30">
                          {[
                            { color: '#000000', name: 'Đen' },
                            { color: '#4b5563', name: 'Xám' },
                            { color: '#4f46e5', name: 'Indigo' },
                            { color: '#0d9488', name: 'Teal' },
                            { color: '#dc2626', name: 'Đỏ' },
                            { color: '#ea580c', name: 'Cam' }
                          ].map(item => (
                            <button
                              key={item.color}
                              type="button"
                              onMouseDown={(e) => {
                                e.preventDefault();
                                handleAbstractFormat('foreColor', item.color);
                              }}
                              className="w-4.5 h-4.5 rounded-full border border-slate-300 cursor-pointer transition-transform hover:scale-110"
                              style={{ backgroundColor: item.color }}
                              title={item.name}
                            />
                          ))}
                        </div>
                      </div>

                      <div className="w-px h-3.5 bg-slate-300 mx-0.5" />

                      <button
                        type="button"
                        onMouseDown={(e) => { e.preventDefault(); handleAbstractFormat('removeFormat'); }}
                        className="px-2 py-0.5 hover:bg-slate-250 rounded text-slate-500 font-mono text-[9px] border border-slate-200 transition-colors cursor-pointer"
                        title="Xóa định dạng"
                      >
                        Xóa
                      </button>
                    </div>
                  )}

                  {abstractEditorMode === 'visual' ? (
                    <div className="relative">
                      <div
                        ref={abstractEditorRef}
                        contentEditable
                        onInput={handleAbstractInput}
                        className="w-full min-h-[150px] max-h-[300px] overflow-y-auto px-4 py-2.5 border border-slate-250 rounded-xl bg-white focus:ring-1 focus:ring-teal-500 focus:outline-none text-slate-800 text-xs leading-relaxed rich-editor-content"
                        style={{ borderStyle: 'solid' }}
                      />
                    </div>
                  ) : (
                    <textarea
                      value={speakerAbstractText}
                      onChange={(e) => setSpeakerAbstractText(e.target.value)}
                      rows={6}
                      placeholder="Tóm tắt phương pháp nghiên cứu, kết quả đạt được, kết luận (Mã HTML)..."
                      className="w-full px-4 py-2.5 border border-slate-250 rounded-xl text-xs focus:ring-1 focus:ring-teal-500 focus:outline-none leading-relaxed font-mono"
                    />
                  )}
                </div>

                <div>
                  <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 pb-1.5 mb-2">
                    <label className="text-[9.5px] font-extrabold text-slate-500 uppercase tracking-wider block">Tiểu sử vắn tắt của báo cáo viên (Bio)</label>
                    <div className="flex gap-1 bg-slate-100 p-0.5 rounded-lg w-fit select-none">
                      <button
                        type="button"
                        onClick={() => setBioEditorMode('visual')}
                        className={`px-2 py-1 rounded font-bold text-[9px] flex items-center gap-1 cursor-pointer transition-all border-none bg-transparent ${
                          bioEditorMode === 'visual' ? 'bg-white text-indigo-700 shadow-sm' : 'text-slate-500 hover:text-slate-800'
                        }`}
                      >
                        <Sparkles className="w-3 h-3" />
                        Trực quan
                      </button>
                      <button
                        type="button"
                        onClick={() => setBioEditorMode('code')}
                        className={`px-2 py-1 rounded font-bold text-[9px] flex items-center gap-1 cursor-pointer transition-all border-none bg-transparent ${
                          bioEditorMode === 'code' ? 'bg-white text-indigo-700 shadow-sm' : 'text-slate-500 hover:text-slate-800'
                        }`}
                      >
                        <Code className="w-3 h-3" />
                        HTML Code
                      </button>
                    </div>
                  </div>

                  {bioEditorMode === 'visual' && (
                    <div className="flex flex-wrap items-center gap-1 p-1 bg-slate-55 border border-slate-200 rounded-xl mb-1 select-none">
                      <button
                        type="button"
                        onMouseDown={(e) => { e.preventDefault(); handleBioFormat('bold'); }}
                        className="p-1 hover:bg-slate-200 rounded text-slate-700 cursor-pointer"
                        title="Chữ đậm"
                      >
                        <Bold className="w-3.5 h-3.5" />
                      </button>
                      <button
                        type="button"
                        onMouseDown={(e) => { e.preventDefault(); handleBioFormat('italic'); }}
                        className="p-1 hover:bg-slate-200 rounded text-slate-700 cursor-pointer"
                        title="Chữ nghiêng"
                      >
                        <Italic className="w-3.5 h-3.5" />
                      </button>
                      <button
                        type="button"
                        onMouseDown={(e) => { e.preventDefault(); handleBioFormat('underline'); }}
                        className="p-1 hover:bg-slate-200 rounded text-slate-700 cursor-pointer"
                        title="Gạch chân"
                      >
                        <Underline className="w-3.5 h-3.5" />
                      </button>

                      <div className="w-px h-3.5 bg-slate-300 mx-0.5" />

                      <button
                        type="button"
                        onMouseDown={(e) => { e.preventDefault(); handleBioFormat('justifyLeft'); }}
                        className="p-1 hover:bg-slate-200 rounded text-slate-700 cursor-pointer"
                        title="Căn lề trái"
                      >
                        <AlignLeft className="w-3.5 h-3.5" />
                      </button>
                      <button
                        type="button"
                        onMouseDown={(e) => { e.preventDefault(); handleBioFormat('justifyCenter'); }}
                        className="p-1 hover:bg-slate-200 rounded text-slate-700 cursor-pointer"
                        title="Căn lề giữa"
                      >
                        <AlignCenter className="w-3.5 h-3.5" />
                      </button>
                      <button
                        type="button"
                        onMouseDown={(e) => { e.preventDefault(); handleBioFormat('justifyRight'); }}
                        className="p-1 hover:bg-slate-200 rounded text-slate-700 cursor-pointer"
                        title="Căn lề phải"
                      >
                        <AlignRight className="w-3.5 h-3.5" />
                      </button>

                      <div className="w-px h-3.5 bg-slate-300 mx-0.5" />

                      <button
                        type="button"
                        onMouseDown={(e) => { e.preventDefault(); handleBioFormat('insertUnorderedList'); }}
                        className="p-1 hover:bg-slate-200 rounded text-slate-700 cursor-pointer"
                        title="Danh sách dấu chấm"
                      >
                        <List className="w-3.5 h-3.5" />
                      </button>
                      <button
                        type="button"
                        onMouseDown={(e) => { e.preventDefault(); handleBioFormat('insertOrderedList'); }}
                        className="p-1 hover:bg-slate-200 rounded text-slate-700 cursor-pointer"
                        title="Danh sách số"
                      >
                        <ListOrdered className="w-3.5 h-3.5" />
                      </button>

                      <div className="w-px h-3.5 bg-slate-300 mx-0.5" />

                      <button
                        type="button"
                        onMouseDown={(e) => {
                          e.preventDefault();
                          const url = prompt('Nhập địa chỉ liên kết (URL):', 'https://');
                          if (url) handleBioFormat('createLink', url);
                        }}
                        className="p-1 hover:bg-slate-200 rounded text-slate-700 cursor-pointer"
                        title="Chèn liên kết"
                      >
                        <Link className="w-3.5 h-3.5" />
                      </button>

                      <div className="relative group flex items-center">
                        <button
                          type="button"
                          className="p-1 hover:bg-slate-200 rounded text-slate-700 flex items-center gap-0.5 cursor-pointer"
                          title="Chọn màu chữ"
                        >
                          <Palette className="w-3.5 h-3.5" />
                        </button>
                        <div className="absolute top-full left-0 mt-1 hidden group-hover:flex bg-white border border-slate-200 p-1.5 rounded-lg shadow-lg gap-1 z-30">
                          {[
                            { color: '#000000', name: 'Đen' },
                            { color: '#4b5563', name: 'Xám' },
                            { color: '#4f46e5', name: 'Indigo' },
                            { color: '#0d9488', name: 'Teal' },
                            { color: '#dc2626', name: 'Đỏ' },
                            { color: '#ea580c', name: 'Cam' }
                          ].map(item => (
                            <button
                              key={item.color}
                              type="button"
                              onMouseDown={(e) => {
                                e.preventDefault();
                                handleBioFormat('foreColor', item.color);
                              }}
                              className="w-4.5 h-4.5 rounded-full border border-slate-300 cursor-pointer transition-transform hover:scale-110"
                              style={{ backgroundColor: item.color }}
                              title={item.name}
                            />
                          ))}
                        </div>
                      </div>

                      <div className="w-px h-3.5 bg-slate-300 mx-0.5" />

                      <button
                        type="button"
                        onMouseDown={(e) => { e.preventDefault(); handleBioFormat('removeFormat'); }}
                        className="px-2 py-0.5 hover:bg-slate-250 rounded text-slate-500 font-mono text-[9px] border border-slate-200 transition-colors cursor-pointer"
                        title="Xóa định dạng"
                      >
                        Xóa
                      </button>
                    </div>
                  )}

                  {bioEditorMode === 'visual' ? (
                    <div className="relative">
                      <div
                        ref={bioEditorRef}
                        contentEditable
                        onInput={handleBioInput}
                        className="w-full min-h-[100px] max-h-[200px] overflow-y-auto px-4 py-2.5 border border-slate-250 rounded-xl bg-white focus:ring-1 focus:ring-teal-500 focus:outline-none text-slate-800 text-xs leading-relaxed rich-editor-content"
                        style={{ borderStyle: 'solid' }}
                      />
                    </div>
                  ) : (
                    <textarea
                      value={speakerBio}
                      onChange={(e) => setSpeakerBio(e.target.value)}
                      rows={4}
                      placeholder="Quá trình đào tạo, lĩnh vực nghiên cứu chính (Mã HTML)..."
                      className="w-full px-4 py-2.5 border border-slate-250 rounded-xl text-xs focus:ring-1 focus:ring-teal-500 focus:outline-none leading-relaxed font-mono"
                    />
                  )}
                </div>

                {/* Ban tieng Anh de in ky yeu, Ban to chuc tu dich */}
                <div className="bg-indigo-50/40 border border-indigo-150 rounded-2xl p-4 space-y-3">
                  <div>
                    <span className="text-[9.5px] font-extrabold text-indigo-700 uppercase tracking-wider block font-mono">
                      Bản tiếng Anh để in kỷ yếu
                    </span>
                    <p className="text-[10px] text-slate-500 mt-0.5 leading-snug">
                      Hai ô này do Ban tổ chức tự dịch, báo cáo viên không nhập. Để trống nếu chưa dịch.
                    </p>
                  </div>

                  <div>
                    <label className="text-[9.5px] font-extrabold text-slate-500 block mb-1">Tiểu sử khoa học (tiếng Anh)</label>
                    <textarea
                      value={speakerBioEn}
                      onChange={(e) => setSpeakerBioEn(e.target.value)}
                      rows={4}
                      placeholder="Short scientific bio in English..."
                      className="w-full px-3 py-2 border border-slate-250 rounded-xl text-xs bg-white focus:ring-1 focus:ring-indigo-500 focus:outline-none leading-relaxed placeholder-slate-400"
                    />
                  </div>

                  <div>
                    <label className="text-[9.5px] font-extrabold text-slate-500 block mb-1">Abstract (tiếng Anh)</label>
                    <textarea
                      value={speakerAbstractEn}
                      onChange={(e) => setSpeakerAbstractEn(e.target.value)}
                      rows={6}
                      placeholder="Objective... Methods... Results... Conclusion..."
                      className="w-full px-3 py-2 border border-slate-250 rounded-xl text-xs bg-white focus:ring-1 focus:ring-indigo-500 focus:outline-none leading-relaxed placeholder-slate-400"
                    />
                  </div>
                </div>

                <div>
                  <label className="text-[9.5px] font-extrabold text-slate-500 block mb-1.5">Trạng thái phê duyệt *</label>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => setSpeakerStatus('approved')}
                      className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-black transition-all cursor-pointer border shadow-sm ${
                        speakerStatus === 'approved'
                          ? 'bg-emerald-50 border-emerald-300 text-emerald-800 ring-2 ring-emerald-100'
                          : 'bg-white border-slate-200 text-slate-500 hover:bg-slate-50 hover:text-slate-700'
                      }`}
                    >
                      <CheckCircle className="w-3.5 h-3.5 text-emerald-600" />
                      Chấp thuận
                    </button>
                    <button
                      type="button"
                      onClick={() => setSpeakerStatus('pending')}
                      className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-black transition-all cursor-pointer border shadow-sm ${
                        speakerStatus === 'pending'
                          ? 'bg-amber-50 border-amber-300 text-amber-800 ring-2 ring-amber-100'
                          : 'bg-white border-slate-200 text-slate-500 hover:bg-slate-50 hover:text-slate-700'
                      }`}
                    >
                      <Clock className="w-3.5 h-3.5 text-amber-600" />
                      Chờ duyệt
                    </button>
                    <button
                      type="button"
                      onClick={() => setSpeakerStatus('rejected')}
                      className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-black transition-all cursor-pointer border shadow-sm ${
                        speakerStatus === 'rejected'
                          ? 'bg-rose-50 border-rose-300 text-rose-800 ring-2 ring-rose-100'
                          : 'bg-white border-slate-200 text-slate-500 hover:bg-slate-50 hover:text-slate-700'
                      }`}
                    >
                      <XCircle className="w-3.5 h-3.5 text-rose-600" />
                      Từ chối
                    </button>
                  </div>
                </div>
              </div>

              {/* Form Actions */}
              <div className="pt-4 border-t border-slate-150 flex justify-end gap-2 shrink-0">
                <button
                  type="button"
                  onClick={() => setShowSpeakerModal(false)}
                  className="px-4 py-2 text-xs bg-slate-100 hover:bg-slate-200 text-slate-700 font-extrabold rounded-xl transition cursor-pointer border-none shadow-xs"
                >
                  Hủy bỏ
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 text-xs bg-teal-600 hover:bg-teal-700 text-white font-extrabold rounded-xl transition cursor-pointer border-none shadow-md flex items-center gap-1"
                >
                  <Check className="w-4 h-4" />
                  <span>{editingSpeaker ? 'Cập Nhật' : 'Thêm Mới'}</span>
                </button>
              </div>

            </form>
          </div>
        </div>
      )}

      {/* Custom Delete Confirmation Modal */}
      {deleteConfirmId && (() => {
        const speakerToDelete = speakers.find(s => s.id === deleteConfirmId);
        if (!speakerToDelete) return null;
        return (
          <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-fade-in">
            <div className="bg-white rounded-3xl max-w-md w-full overflow-hidden border border-slate-100 shadow-2xl p-6 flex flex-col items-center text-center space-y-4">
              <div className="w-12 h-12 rounded-full bg-rose-50 border border-rose-100 flex items-center justify-center text-rose-500 shrink-0">
                <AlertTriangle className="w-6 h-6 animate-pulse" />
              </div>
              <div className="space-y-1">
                <h3 className="text-base font-extrabold text-slate-900">Xác nhận xóa báo cáo viên</h3>
                <p className="text-xs text-slate-500 leading-relaxed">
                  Bạn có chắc chắn muốn xóa báo cáo viên <span className="font-extrabold text-slate-800">{speakerToDelete.fullName}</span> ({speakerToDelete.id}) khỏi hệ thống? Đề tài báo cáo khoa học của họ cũng sẽ bị gỡ bỏ. Hành động này không thể hoàn tác.
                </p>
              </div>
              <div className="flex w-full gap-3 pt-2">
                <button
                  onClick={() => setDeleteConfirmId(null)}
                  className="flex-1 px-4 py-2.5 rounded-xl border border-slate-200 text-xs font-bold text-slate-655 hover:bg-slate-50 transition-colors cursor-pointer bg-white"
                >
                  Hủy bỏ
                </button>
                <button
                  onClick={() => {
                    store.deleteSpeaker(deleteConfirmId);
                    loadAll();
                    setDeleteConfirmId(null);
                    alert('Đã xóa hồ sơ báo cáo viên thành công!');
                  }}
                  className="flex-1 px-4 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-xs font-bold text-white shadow-sm hover:shadow transition-all cursor-pointer border-none"
                >
                  Xác nhận xóa
                </button>
              </div>
            </div>
          </div>
        );
      })()}

      {/* ===== HỘP THOẠI NHẬP BÁO CÁO VIÊN TỪ EXCEL ===== */}
      {showImportModal && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-5xl max-h-[92vh] flex flex-col overflow-hidden">

            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 bg-slate-50">
              <div>
                <h3 className="text-sm font-black text-slate-900 uppercase tracking-wide flex items-center gap-2">
                  <Upload className="w-4 h-4 text-emerald-600" />
                  Nhập Báo Cáo Viên Từ Excel
                </h3>
                <p className="text-[11px] text-slate-500 mt-0.5">
                  Dành cho hồ sơ các bác gửi qua email. Tổng hợp vào một tệp rồi nạp một lượt.
                </p>
              </div>
              <button
                type="button"
                onClick={() => { setShowImportModal(false); setImportRows([]); setImportFeedback(null); setImportError(null); }}
                className="p-1.5 rounded-lg hover:bg-slate-200 text-slate-500 cursor-pointer border-none bg-transparent"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-6 space-y-4 overflow-y-auto">

              {/* Bước 1 */}
              <div className="p-4 rounded-xl border border-indigo-200 bg-indigo-50/50 space-y-2">
                <p className="text-xs font-black text-indigo-900 uppercase tracking-wide">Bước 1 — Tải tệp mẫu</p>
                <p className="text-[11px] text-slate-600 leading-relaxed">
                  Tệp mẫu có sẵn 11 cột và 2 dòng ví dụ. Điền theo đúng cột, giữ nguyên dòng tiêu đề.
                  Cột <strong>Họ và tên</strong> bắt buộc phải có, các cột khác để trống được.
                </p>
                <p className="text-[11px] text-slate-600 leading-relaxed">
                  File CV và Abstract dạng PDF/Word không nhét được vào Excel. Quý vị đưa tệp lên
                  Google Drive, <strong>bật quyền xem cho người có đường dẫn</strong>, rồi dán đường dẫn
                  vào cột <strong>Link CV/Abstract</strong>.
                </p>
                <button
                  type="button"
                  onClick={downloadSpeakerTemplate}
                  className="mt-1 px-3.5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold flex items-center gap-1.5 cursor-pointer border-none transition-colors"
                >
                  <Download className="w-3.5 h-3.5" />
                  Tải Tệp Mẫu Excel
                </button>
              </div>

              {/* Bước 2 */}
              <div className="p-4 rounded-xl border border-slate-200 space-y-2">
                <p className="text-xs font-black text-slate-800 uppercase tracking-wide">Bước 2 — Chọn tệp đã điền</p>
                <input
                  ref={importInputRef}
                  type="file"
                  accept=".xlsx,.xls,.csv"
                  onChange={(e) => { if (e.target.files?.[0]) parseSpeakerFile(e.target.files[0]); }}
                  className="hidden"
                />
                <button
                  type="button"
                  onClick={() => importInputRef.current?.click()}
                  className="px-3.5 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold flex items-center gap-1.5 cursor-pointer border border-slate-200 transition-colors"
                >
                  <FileSpreadsheet className="w-3.5 h-3.5" />
                  Chọn tệp Excel (.xlsx, .xls, .csv)
                </button>

                {importFeedback && (
                  <p className="text-[11px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-lg px-3 py-2">
                    {importFeedback}
                  </p>
                )}
                {importError && (
                  <p className="text-[11px] font-bold text-rose-700 bg-rose-50 border border-rose-200 rounded-lg px-3 py-2">
                    {importError}
                  </p>
                )}
              </div>

              {/* Bước 3 — xem trước */}
              {importRows.length > 0 && (
                <div className="space-y-3">
                  <p className="text-xs font-black text-slate-800 uppercase tracking-wide">
                    Bước 3 — Kiểm tra lại {importRows.length} hồ sơ trước khi nạp
                  </p>

                  <div className="border border-slate-200 rounded-xl max-h-72 overflow-auto">
                    <table className="w-full text-left text-[11px] border-collapse">
                      <thead className="bg-slate-50 sticky top-0 text-[9.5px] uppercase font-black text-slate-400 tracking-wider">
                        <tr>
                          <th className="px-3 py-2 whitespace-nowrap">STT</th>
                          <th className="px-3 py-2 whitespace-nowrap">Học vị</th>
                          <th className="px-3 py-2 whitespace-nowrap">Họ và tên</th>
                          <th className="px-3 py-2 whitespace-nowrap">Email</th>
                          <th className="px-3 py-2 whitespace-nowrap">SĐT</th>
                          <th className="px-3 py-2 whitespace-nowrap">Đơn vị</th>
                          <th className="px-3 py-2 whitespace-nowrap">Tên bài báo cáo</th>
                          <th className="px-3 py-2 whitespace-nowrap">Abstract</th>
                          <th className="px-3 py-2 whitespace-nowrap">Hồ sơ</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {importRows.map((sp, i) => (
                          <tr key={sp.id} className="hover:bg-slate-50">
                            <td className="px-3 py-2 font-mono text-slate-400">{i + 1}</td>
                            <td className="px-3 py-2 text-slate-600 whitespace-nowrap">{sp.title}</td>
                            <td className="px-3 py-2 font-bold text-slate-900 whitespace-nowrap">{sp.fullName}</td>
                            <td className="px-3 py-2 font-mono text-slate-600">
                              {sp.email || <span className="text-amber-600 font-sans font-bold">thiếu</span>}
                            </td>
                            <td className="px-3 py-2 font-mono text-slate-600">
                              {sp.phone || <span className="text-amber-600 font-sans font-bold">thiếu</span>}
                            </td>
                            <td className="px-3 py-2 text-slate-600 max-w-[160px] truncate" title={sp.organization}>
                              {sp.organization || '-'}
                            </td>
                            <td className="px-3 py-2 text-slate-600 max-w-[180px] truncate" title={sp.presentationTitle}>
                              {sp.presentationTitle || '-'}
                            </td>
                            <td className="px-3 py-2 whitespace-nowrap">
                              {sp.abstractText
                                ? <span className="text-emerald-700 font-bold">có</span>
                                : <span className="text-amber-600 font-bold">thiếu</span>}
                            </td>
                            <td className="px-3 py-2 whitespace-nowrap">
                              {sp.documentUrl
                                ? <a href={sp.documentUrl} target="_blank" rel="noreferrer" className="text-indigo-600 hover:underline font-bold">mở link</a>
                                : <span className="text-slate-400">-</span>}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  <label className="flex items-center gap-2 text-[11px] font-bold text-slate-700 cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={skipDuplicateSpeakers}
                      onChange={(e) => setSkipDuplicateSpeakers(e.target.checked)}
                      className="rounded border-slate-300 text-emerald-600 focus:ring-emerald-500 w-3.5 h-3.5"
                    />
                    Bỏ qua hồ sơ đã có trên hệ thống (đối chiếu theo email; email trống thì theo họ tên và đơn vị)
                  </label>
                </div>
              )}
            </div>

            <div className="px-6 py-4 border-t border-slate-200 bg-slate-50 flex items-center justify-between gap-3">
              <p className="text-[10.5px] text-slate-500">
                Hồ sơ nạp vào sẽ ở trạng thái <strong>Đang chờ</strong> để Ban thư ký rà soát rồi phê duyệt.
              </p>
              <div className="flex gap-2 shrink-0">
                <button
                  type="button"
                  onClick={() => { setShowImportModal(false); setImportRows([]); setImportFeedback(null); setImportError(null); }}
                  className="px-4 py-2 rounded-xl bg-white hover:bg-slate-100 border border-slate-200 text-slate-700 text-xs font-bold cursor-pointer transition-colors"
                >
                  Đóng
                </button>
                <button
                  type="button"
                  disabled={importRows.length === 0 || isImporting}
                  onClick={handleConfirmImportSpeakers}
                  className="px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 disabled:opacity-40 disabled:cursor-not-allowed text-white text-xs font-black cursor-pointer border-none transition-colors flex items-center gap-1.5"
                >
                  <Check className="w-3.5 h-3.5" />
                  {isImporting ? 'Đang nạp...' : `Nạp ${importRows.length || ''} Hồ Sơ Vào Hệ Thống`}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
