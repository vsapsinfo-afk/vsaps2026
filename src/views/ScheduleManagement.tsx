/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { 
  Calendar, 
  Clock, 
  MapPin, 
  Plus, 
  Trash, 
  Edit2, 
  AlertCircle, 
  Table, 
  Layers, 
  Sliders, 
  Play, 
  Trash2, 
  Check, 
  RefreshCw, 
  Sparkles, 
  LayoutGrid, 
  CalendarDays, 
  Coffee, 
  Search, 
  Settings,
  HelpCircle,
  FileSpreadsheet,
  FileDown,
  Printer,
  Download,
  X,
  Eye,
  FileText,
  AlertTriangle,
  Move
} from 'lucide-react';
import { store } from '../dataStore';
import { ConferenceSession, Role } from '../types';

// ==================== HELPER FUNCTIONS FOR SCHEDULE CONFLICTS & TIME HANDLING ====================

const SAMPLE_PAPERS = [
  {
    id: 'spk-sample-101',
    title: 'Tối ưu hóa thời gian phục hồi sau phẫu thuật căng da mặt nội soi toàn phần',
    speakerName: 'Dr. Jean-Louis Sebagh',
    speakerTitle: 'Bệnh viện Thẩm mỹ Paris',
    track: 'Phẫu thuật thẩm mỹ'
  },
  {
    id: 'spk-sample-102',
    title: 'Ứng dụng tổ hợp Laser Picosecond trong điều trị tăng sắc tố da ở người châu Á',
    speakerName: 'PGS.TS. Trần Thị Thanh',
    speakerTitle: 'Đại học Y dược Thành phố',
    track: 'Thẩm Mỹ Nội Khoa'
  },
  {
    id: 'spk-sample-103',
    title: 'Vật liệu sinh học tự nhiên thế hệ mới phục vụ tạo hình mũi cấu trúc độ bám dính cao',
    speakerName: 'TS.BS. Kang Min-Seok',
    speakerTitle: 'Seoul Aesthetic Clinic',
    track: 'Phẫu thuật mũi'
  },
  {
    id: 'spk-sample-104',
    title: 'Kỹ thuật tiêm chất làm đầy (Filler) MD Codes trẻ hóa toàn diện vùng mí mắt & gò má',
    speakerName: 'ThS.BS. Nguyễn Hoài Nam',
    speakerTitle: 'Bệnh viện Da Liễu',
    track: 'Căng chỉ & Filler'
  }
];

function parseTimeToMinutes(timeStr: string): number {
  if (!timeStr) return 0;
  const [h, m] = timeStr.trim().split(':').map(Number);
  return (isNaN(h) ? 0 : h) * 60 + (isNaN(m) ? 0 : m);
}

function isTimeOverlapping(s1: ConferenceSession, s2: ConferenceSession): boolean {
  if (s1.date !== s2.date) return false;
  const start1 = parseTimeToMinutes(s1.startTime);
  const end1 = parseTimeToMinutes(s1.endTime);
  const start2 = parseTimeToMinutes(s2.startTime);
  const end2 = parseTimeToMinutes(s2.endTime);
  return Math.max(start1, start2) < Math.min(end1, end2);
}

const isGenericSpeaker = (name: string): boolean => {
  const n = (name || '').trim().toLowerCase();
  return (
    n === '' ||
    n.includes('chưa gán') ||
    n.includes('chợ rẫy') ||
    n.includes('chủ tọa') ||
    n.includes('hội tiếp tân') ||
    n.includes('toàn thể') ||
    n.includes('hậu cần') ||
    n.includes('ban phục vụ') ||
    n.includes('ban hỗ trợ') ||
    n.includes('thư ký') ||
    n.includes('đại hội') ||
    n.includes('chuyên môn')
  );
};

interface ScheduleConflict {
  type: 'room' | 'speaker';
  key: string;
  message: string;
  sessions: ConferenceSession[];
}

function detectConflicts(sessionsList: ConferenceSession[]): ScheduleConflict[] {
  const result: ScheduleConflict[] = [];
  const checked = new Set<string>();

  for (let i = 0; i < sessionsList.length; i++) {
    for (let j = i + 1; j < sessionsList.length; j++) {
      const s1 = sessionsList[i];
      const s2 = sessionsList[j];

      if (isTimeOverlapping(s1, s2)) {
        // 1. Room conflict (same room, same date, overlapping time)
        if (s1.roomName === s2.roomName) {
          const conflictKey = `room-${s1.date}-${s1.roomName}-${s1.startTime}-${s2.startTime}`;
          const reverseKey = `room-${s1.date}-${s1.roomName}-${s2.startTime}-${s1.startTime}`;
          if (!checked.has(conflictKey) && !checked.has(reverseKey)) {
            checked.add(conflictKey);
            result.push({
              type: 'room',
              key: conflictKey,
              message: `Hội trường "${s1.roomName}" bị trùng lịch vào ngày ${s1.date}: Các phiên "${s1.title}" (${s1.startTime} - ${s1.endTime}) và "${s2.title}" (${s2.startTime} - ${s2.endTime}) diễn ra đồng thời.`,
              sessions: [s1, s2]
            });
          }
        }

        // 2. Speaker conflict (same speaker, same date, overlapping time, not placeholder)
        if (
          s1.speakerName && 
          s2.speakerName && 
          s1.speakerName.trim().toLowerCase() === s2.speakerName.trim().toLowerCase() &&
          !isGenericSpeaker(s1.speakerName)
        ) {
          const conflictKey = `speaker-${s1.date}-${s1.speakerName.replace(/\s+/g, '')}-${s1.startTime}-${s2.startTime}`;
          const reverseKey = `speaker-${s1.date}-${s1.speakerName.replace(/\s+/g, '')}-${s2.startTime}-${s1.startTime}`;
          if (!checked.has(conflictKey) && !checked.has(reverseKey)) {
            checked.add(conflictKey);
            result.push({
              type: 'speaker',
              key: conflictKey,
              message: `Báo cáo viên "${s1.speakerName}" bị trùng lịch vào ngày ${s1.date}: Đang thuyết giảng đồng thời tại "${s1.roomName}" (${s1.startTime} - ${s1.endTime}) và "${s2.roomName}" (${s2.startTime} - ${s2.endTime}).`,
              sessions: [s1, s2]
            });
          }
        }
      }
    }
  }

  return result;
}

// Helper to add minutes to HH:MM string
const addMinutes = (rawTime: string, mins: number): string => {
  const [h, m] = rawTime.split(':').map(Number);
  const totalMinutes = h * 60 + m + mins;
  const finalH = Math.floor(totalMinutes / 60) % 24;
  const finalM = totalMinutes % 60;
  return `${String(finalH).padStart(2, '0')}:${String(finalM).padStart(2, '0')}`;
};

// ==================== END OF HELPER FUNCTIONS ====================

interface ScheduleManagementProps {
  role: Role;
}

export default function ScheduleManagement({ role }: ScheduleManagementProps) {
  const [sessions, setSessions] = useState<ConferenceSession[]>(store.getSessions());
  const [showForm, setShowForm] = useState(false);
  const [editingSession, setEditingSession] = useState<ConferenceSession | null>(null);

  // Form Fields for Manual Entry/Edit
  const [title, setTitle] = useState('');
  const [speakerName, setSpeakerName] = useState('');
  const [speakerTitle, setSpeakerTitle] = useState('');
  const [roomName, setRoomName] = useState('Hội trường 1');
  const [date, setDate] = useState('2026-12-11');
  const [startTime, setStartTime] = useState('08:00');
  const [endTime, setEndTime] = useState('09:30');
  const [track, setTrack] = useState('Hội nghị Phẫu thuật');
  const [description, setDescription] = useState('');

  // Tab State
  const [activeTab, setActiveTab] = useState<'timeline' | 'matrix' | 'generator'>('timeline');

  // Generator State Fields (Diagram Configuration)
  const [genDate, setGenDate] = useState('2026-12-12');
  const [genRooms, setGenRooms] = useState<string[]>(['Hội trường 1', 'Hội trường 2', 'Hội trường 3', 'Hội trường 4']);
  const [genMorningStart, setGenMorningStart] = useState('08:00');
  const [genMorningPapers, setGenMorningPapers] = useState<number>(4);
  const [genAfternoonStart, setGenAfternoonStart] = useState('13:30');
  const [genAfternoonPapers, setGenAfternoonPapers] = useState<number>(4);
  const [overwriteExisting, setOverwriteExisting] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');
  
  // Drag and Drop & Conflict States
  const [dragOverCell, setDragOverCell] = useState<{ time: string; room: string } | null>(null);
  const [showConflictsDetail, setShowConflictsDetail] = useState(false);

  // Derive approved speakers who are not yet scheduled
  const approvedSpeakers = store.getSpeakers().filter(sp => sp.status === 'approved');
  const unscheduledSpeakers = approvedSpeakers.filter(sp => {
    return !sessions.some(s => s.title.includes(sp.presentationTitle) || s.speakerName.includes(sp.fullName));
  });

  const conflicts = detectConflicts(sessions);
  const conflictedSessionIds = new Set(conflicts.flatMap(c => c.sessions.map(s => s.id)));

  // Display Filter State
  const displayDates = Array.from(new Set(sessions.map(s => s.date))).sort();
  const [selectedDate, setSelectedDate] = useState<string>('all');
  const [searchText, setSearchText] = useState('');

  // Export & Print Modal States
  const [showExportModal, setShowExportModal] = useState(false);
  const [selectedExportDate, setSelectedExportDate] = useState<string>('all');

  const loadAll = () => {
    setSessions([...store.getSessions()]);
  };

  const handleDropOnEmptyCell = (dragData: any, time: string, room: string) => {
    if (role === 'ctv') {
      alert('Tài khoản Cộng tác viên không có quyền chỉnh sửa lịch trình.');
      return;
    }

    const dropDate = selectedDate === 'all' ? (displayDates[0] || '2026-12-11') : selectedDate;
    const duration = dragData.duration || 30; // default 30 mins
    const calculatedEndTime = addMinutes(time, duration);

    if (dragData.type === 'unscheduled') {
      const newSession: ConferenceSession = {
        id: `SES-DND-${Math.floor(Math.random() * 900000 + 100000)}`,
        title: `[Bài báo cáo] ${dragData.title}`,
        speakerName: dragData.speakerName,
        speakerTitle: dragData.speakerTitle,
        roomName: room,
        date: dropDate,
        startTime: time,
        endTime: calculatedEndTime,
        track: dragData.track,
        description: `Báo cáo khoa học chính thức: đề tài "${dragData.title}" của tác giả ${dragData.speakerName}.`
      };

      // Check conflicts before applying
      const testSessionsList = [...sessions, newSession];
      const dropConflicts = detectConflicts(testSessionsList).filter(c => 
        c.sessions.some(s => s.id === newSession.id)
      );

      if (dropConflicts.length > 0) {
        const conflictMsg = dropConflicts.map(c => c.message).join('\n');
        const proceed = window.confirm(
          `⚠️ Cảnh báo phát hiện trùng lặp lịch trình:\n${conflictMsg}\n\nBạn có phân bổ thời gian đè chồng không? Chọn OK để chấp nhận, Cancel để hủy.`
        );
        if (!proceed) return;
      }

      store.saveSession(newSession);

      if (dragData.speakerId && !dragData.speakerId.startsWith('spk-sample')) {
        const sp = store.getSpeakers().find(s => s.id === dragData.speakerId);
        if (sp) {
          sp.scheduledSessionId = newSession.id;
          store.saveSpeaker(sp);
        }
      }

      setSuccessMessage(`Đã gán thành công bài báo cáo "${dragData.title}" của ${dragData.speakerName} vào ${room} lúc ${time}!`);
      setTimeout(() => setSuccessMessage(''), 4000);
      loadAll();
    } else if (dragData.type === 'existing') {
      const targetSession = sessions.find(s => s.id === dragData.id);
      if (!targetSession) return;

      const originalDuration = parseTimeToMinutes(targetSession.endTime) - parseTimeToMinutes(targetSession.startTime);
      const updatedEndTime = addMinutes(time, originalDuration);

      const updatedSession: ConferenceSession = {
        ...targetSession,
        roomName: room,
        startTime: time,
        endTime: updatedEndTime
      };

      // Check conflicts before applying
      const testSessionsList = sessions.map(s => s.id === dragData.id ? updatedSession : s);
      const dropConflicts = detectConflicts(testSessionsList).filter(c => 
        c.sessions.some(s => s.id === updatedSession.id)
      );

      if (dropConflicts.length > 0) {
        const conflictMsg = dropConflicts.map(c => c.message).join('\n');
        const proceed = window.confirm(
          `⚠️ Cảnh báo phát hiện trùng lặp lịch trình khi dời lịch:\n${conflictMsg}\n\nBạn có chắc chắn muốn dời phiên này không? Chọn OK để chấp nhận dời.`
        );
        if (!proceed) return;
      }

      store.saveSession(updatedSession);
      setSuccessMessage(`Đã dời thành công phiên "${targetSession.title}" đến ${room} lúc ${time}!`);
      setTimeout(() => setSuccessMessage(''), 4000);
      loadAll();
    }
  };

  const handleEdit = (session: ConferenceSession) => {
    if (role === 'ctv') {
      alert('Tài khoản Cộng tác viên không có quyền chỉnh sửa lịch trình.');
      return;
    }
    setEditingSession(session);
    setTitle(session.title);
    setSpeakerName(session.speakerName);
    setSpeakerTitle(session.speakerTitle);
    setRoomName(session.roomName);
    setDate(session.date);
    setStartTime(session.startTime);
    setEndTime(session.endTime);
    setTrack(session.track);
    setDescription(session.description);
    setShowForm(true);
  };

  const handleDelete = (id: string) => {
    if (role === 'ctv') {
      alert('Tài khoản Cộng tác viên không có quyền xóa lịch trình hội nghị.');
      return;
    }
    if (window.confirm('Bạn có chắc muốn xóa phiên lịch trình này? Các liên kết báo cáo viên sẽ bị hủy bỏ.')) {
      store.deleteSession(id);
      loadAll();
    }
  };

  const handleDeleteAll = () => {
    if (role === 'ctv') {
      alert('Tài khoản Cộng tác viên không có quyền xóa lịch trình.');
      return;
    }
    if (window.confirm('CẢNH BÁO CỰC KỲ NGUY HIỂM: Bạn có chắc chắn muốn XÓA SẠCH toàn bộ lịch trình hội nghị hiện có? Thao tác này KHÔNG THỂ khôi phục.')) {
      store.setSessions([]);
      loadAll();
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title || !speakerName || !roomName) {
      alert('Vui lòng nhập tiêu đề, báo cáo viên và phòng sự kiện.');
      return;
    }

    const sessionData: ConferenceSession = {
      id: editingSession ? editingSession.id : 'SES-' + Math.floor(Math.random() * 9000 + 1000),
      title,
      speakerName,
      speakerTitle,
      roomName,
      date,
      startTime,
      endTime,
      track,
      description,
    };

    store.saveSession(sessionData);
    setShowForm(false);
    setEditingSession(null);
    loadAll();

    // Clear fields
    setTitle('');
    setSpeakerName('');
    setSpeakerTitle('');
    setDescription('');
  };

  // Automated diagrammatic generator engine
  const handleAutoGenerate = (e: React.FormEvent) => {
    e.preventDefault();
    if (role === 'ctv') {
      alert('Tài khoản Cộng tác viên không có quyền khởi tạo lịch trình.');
      return;
    }

    if (genRooms.length === 0) {
      alert('Vui lòng chọn ít nhất một ROOM Hội nghị làm việc.');
      return;
    }

    const confirmMsg = overwriteExisting
      ? 'CẢNH BÁO: Thao tác này sẽ XÓA TOÀN BỘ lịch trình hiện tại và thay thế bằng Sơ đồ Lịch trình mới từ mẫu thiết lập. Bạn có chắc chắn muốn thực hiện?'
      : 'Thao tác này sẽ TẠO THÊM các phiên lịch trình mới theo sơ đồ vào cơ sở dữ liệu hiện hữu. Tiếp tục?';

    if (!window.confirm(confirmMsg)) {
      return;
    }

    // Initialize or clone sessions
    const generatedSessions: ConferenceSession[] = overwriteExisting ? [] : [...store.getSessions()];

    // Specialty generator based on Room name
    const getRoomSpecialty = (room: string) => {
      const rLower = room.toLowerCase();
      if (rLower.includes('1') || rLower.includes('chính') || rLower.includes('surgery')) {
        return { track: 'Live Surgery & Phẫu Thuật Thẩm Mỹ', keyword: 'Phẫu thuật thẩm mỹ mí mắt, mũi cấu trúc và ngực' };
      }
      if (rLower.includes('2') || rLower.includes('hands-on') || rLower.includes('masterclass')) {
        return { track: 'Masterclass Hands-on Lâm Sàng', keyword: 'Thực nghiệm lâm sàng, laser & thủ thuật botox' };
      }
      if (rLower.includes('3') || rLower.includes('nội khoa') || rLower.includes('da liễu')) {
        return { track: 'Thẩm Mỹ Nội Khoa & Trẻ Hóa', keyword: 'Căng chỉ collagen, tiêm trẻ hóa Meso & Peeling' };
      }
      if (rLower.includes('4') || rLower.includes('tế bào') || rLower.includes('nâng cơ')) {
        return { track: 'Tế bào gốc & Vật liệu sinh học', keyword: 'Công nghệ trẻ hóa tế bào & sinh cơ học nâng cơ' };
      }
      return { track: 'Chuyên đề học thuật hội nghị', keyword: 'Phương pháp lâm sàng ứng dụng cao' };
    };

    // Helper to add minutes to HH:MM string
    const addMinutes = (rawTime: string, mins: number): string => {
      const [h, m] = rawTime.split(':').map(Number);
      const totalMinutes = h * 60 + m + mins;
      const finalH = Math.floor(totalMinutes / 60) % 24;
      const finalM = totalMinutes % 60;
      return `${String(finalH).padStart(2, '0')}:${String(finalM).padStart(2, '0')}`;
    };

    // Each report block in the morning/afternoon has a duration of 90 minutes.
    const blockDuration = 90;
    const morningMinsPerPaper = genMorningPapers === 5 ? 15 : 20; 
    const afternoonMinsPerPaper = genAfternoonPapers === 5 ? 15 : 20;

    genRooms.forEach((room) => {
      const spec = getRoomSpecialty(room);

      // --- 1. BUỔI SÁNG (Morning Session) ---
      // PHIÊN 1 (08:00 - 09:30)
      const m1Start = genMorningStart;
      const m1End = addMinutes(m1Start, blockDuration);
      
      let currTime = m1Start;
      for (let i = 1; i <= genMorningPapers; i++) {
        const nextTime = addMinutes(currTime, morningMinsPerPaper);
        generatedSessions.push({
          id: `SES-AUTO-${room.replace(/\s+/g, '')}-AM1-R${i}-${Math.floor(Math.random()*9000+1000)}`,
          title: `[Sáng - Phiên 1 - Bài ${i}] Đề tài: Nghiên cứu kỹ thuật lâm sàng đối với ${spec.keyword} | Sảnh: ${room}`,
          speakerName: `Báo cáo viên chuyên sâu (Chưa gán)`,
          speakerTitle: `Bệnh viện chuyên khoa đối tác`,
          roomName: room,
          date: genDate,
          startTime: currTime,
          endTime: nextTime,
          track: spec.track,
          description: `Bài báo cáo khoa học số ${i} thuộc Phiên thuyết trình thứ nhất tại đại sảnh ${room}. Nội dung phân tích dữ liệu lâm sàng.`
        });
        currTime = nextTime;
      }
      // Session 1 Q&A Slot to finish off the 90 min block
      generatedSessions.push({
        id: `SES-AUTO-${room.replace(/\s+/g, '')}-AM1-QA-${Math.floor(Math.random()*9000+1000)}`,
        title: `[Sáng - Phiên 1] Thảo luận phản biện, Đặt câu hỏi & Giải đáp chuyên khoa - ${room}`,
        speakerName: `Đoàn Chủ Tọa liên tịch`,
        speakerTitle: `Chủ tọa hội trường ${room}`,
        roomName: room,
        date: genDate,
        startTime: currTime,
        endTime: m1End,
        track: spec.track,
        description: `Thảo luận bàn tròn, phản biện từ cố vấn chuyên môn và giải trình từ các báo cáo viên phụ thảo.`
      });

      // NGHỈ GIẢI LAO GIỮA CÁC PHIÊN (09:30 - 09:45)
      const break1Start = m1End;
      const break1End = addMinutes(break1Start, 15); // 15 min rest
      generatedSessions.push({
        id: `SES-AUTO-${room.replace(/\s+/g, '')}-AM-BREAK-${Math.floor(Math.random()*9000+1000)}`,
        title: `☕ Tiệc trà Teabreak giải lao giữa các phiên - Trà bánh & Giao lưu khoa học`,
        speakerName: `Hội Tiếp Tân Hậu Cần`,
        speakerTitle: `Ban hỗ trợ sự kiện`,
        roomName: room,
        date: genDate,
        startTime: break1Start,
        endTime: break1End,
        track: 'Nghỉ giải lao',
        description: 'Phục vụ cocktail tiệc nhẹ, cà phê trà bánh cao cấp thúc đẩy trao đổi kết nối tự do giữa các đại biểu.'
      });

      // PHIÊN 2 (09:45 - 11:15)
      const m2Start = break1End;
      const m2End = addMinutes(m2Start, blockDuration);
      
      currTime = m2Start;
      for (let i = 1; i <= genMorningPapers; i++) {
        const nextTime = addMinutes(currTime, morningMinsPerPaper);
        generatedSessions.push({
          id: `SES-AUTO-${room.replace(/\s+/g, '')}-AM2-R${i}-${Math.floor(Math.random()*9000+1000)}`,
          title: `[Sáng - Phiên 2 - Bài ${i}] Đề tài: Đánh giá cải tiến lâm sàng mới về ${spec.keyword} | Sảnh: ${room}`,
          speakerName: `Báo cáo viên chuyên sâu (Chưa gán)`,
          speakerTitle: `Bệnh viện chuyên khoa đối tác`,
          roomName: room,
          date: genDate,
          startTime: currTime,
          endTime: nextTime,
          track: spec.track,
          description: `Bài báo cáo khoa học số ${i} thuộc Phiên thuyết trình thứ hai trước giờ nghỉ trưa.`
        });
        currTime = nextTime;
      }
      // Session 2 Q&A Slot
      generatedSessions.push({
        id: `SES-AUTO-${room.replace(/\s+/g, '')}-AM2-QA-${Math.floor(Math.random()*9000+1000)}`,
        title: `[Sáng - Phiên 2] Thảo luận đồng nghiệp & Bầu chọn báo cáo xuất sắc - ${room}`,
        speakerName: `Đoàn Chủ Tọa liên tịch`,
        speakerTitle: `Chủ tọa hội trường ${room}`,
        roomName: room,
        date: genDate,
        startTime: currTime,
        endTime: m2End,
        track: spec.track,
        description: `Ý kiến đồng nghiệp, kết luận sơ bộ sảnh khoa học buổi sáng và trao thư cảm ơn bcv.`
      });

      // NGHỈ TRƯA & GIAO LƯU GIAN HÀNG TRIỂN LÃM (11:15 - 13:30)
      generatedSessions.push({
        id: `SES-AUTO-${room.replace(/\s+/g, '')}-LUNCH-${Math.floor(Math.random()*9000+1000)}`,
        title: `🍲 Nghỉ trưa, Buffet cao cấp & Tham quan các gian hàng trang thiết bị y tế`,
        speakerName: `Toàn Thể Đại Biểu`,
        speakerTitle: `Bếp ăn cao cấp khách sạn`,
        roomName: room,
        date: genDate,
        startTime: m2End,
        endTime: genAfternoonStart,
        track: 'Nghỉ giải lao / Bữa trưa',
        description: 'Dùng cơm trưa thân mật tại nhà hàng lầu 5, thúc đẩy đàm phán hợp tác thiết bị dụng cụ y khoa.'
      });


      // --- 2. BUỔI CHIỀU (Afternoon Session) ---
      // PHIÊN 3 (13:30 - 15:00)
      const p3Start = genAfternoonStart;
      const p3End = addMinutes(p3Start, blockDuration);
      
      currTime = p3Start;
      for (let i = 1; i <= genAfternoonPapers; i++) {
        const nextTime = addMinutes(currTime, afternoonMinsPerPaper);
        generatedSessions.push({
          id: `SES-AUTO-${room.replace(/\s+/g, '')}-PM3-R${i}-${Math.floor(Math.random()*9000+1000)}`,
          title: `[Chiều - Phiên 3 - Bài ${i}] Đề tài: So sánh hiệu quả thực tế lâm sàng của ${spec.keyword} | Sảnh: ${room}`,
          speakerName: `Báo cáo viên chuyên sâu (Chưa gán)`,
          speakerTitle: `Bệnh viện chuyên khoa đối tác`,
          roomName: room,
          date: genDate,
          startTime: currTime,
          endTime: nextTime,
          track: spec.track,
          description: `Bài báo cáo khoa học số ${i} thuộc Phiên thuyết trình thứ ba đầu giờ chiều tại hội trường ${room}.`
        });
        currTime = nextTime;
      }
      // Session 3 Q&A Slot
      generatedSessions.push({
        id: `SES-AUTO-${room.replace(/\s+/g, '')}-PM3-QA-${Math.floor(Math.random()*9000+1000)}`,
        title: `[Chiều - Phiên 3] Hội nghị đồng thuận chuyên khoa Thẩm mỹ - ${room}`,
        speakerName: `Đoàn Chủ Tọa liên tịch`,
        speakerTitle: `Chủ tọa hội trường ${room}`,
        roomName: room,
        date: genDate,
        startTime: currTime,
        endTime: p3End,
        track: spec.track,
        description: `Thảo luận tích hợp các phác đồ phức tạp trong ngày.`
      });

      // NGHỈ GIẢI LAO CHIỀU (15:00 - 15:15)
      const break2Start = p3End;
      const break2End = addMinutes(break2Start, 15); // 15 min rest
      generatedSessions.push({
        id: `SES-AUTO-${room.replace(/\s+/g, '')}-PM-BREAK-${Math.floor(Math.random()*9000+1000)}`,
        title: `☕ Tiệc trà Teabreak chiều - Nạp lại năng lượng cho phiên thảo luận bế mạc`,
        speakerName: `Hội Tiếp Tân Hậu Cần`,
        speakerTitle: `Ban phục vụ đại hội`,
        roomName: room,
        date: genDate,
        startTime: break2Start,
        endTime: break2End,
        track: 'Nghỉ giải lao',
        description: 'Chiêu đãi teabreak bánh mặn/ngọt, nước hoa quả bổ dưỡng nhẹ nhàng.'
      });

      // PHIÊN 4 (15:15 - 16:45)
      const p4Start = break2End;
      const p4End = addMinutes(p4Start, blockDuration);
      
      currTime = p4Start;
      for (let i = 1; i <= genAfternoonPapers; i++) {
        const nextTime = addMinutes(currTime, afternoonMinsPerPaper);
        generatedSessions.push({
          id: `SES-AUTO-${room.replace(/\s+/g, '')}-PM4-R${i}-${Math.floor(Math.random()*9000+1000)}`,
          title: `[Chiều - Phiên 4 - Bài ${i}] Đề tài: Tương lai phát triển & Quy chuẩn quốc tế về ${spec.keyword} | Sảnh: ${room}`,
          speakerName: `Báo cáo viên chuyên sâu (Chưa gán)`,
          speakerTitle: `Bệnh viện chuyên khoa đối tác`,
          roomName: room,
          date: genDate,
          startTime: currTime,
          endTime: nextTime,
          track: spec.track,
          description: `Bài báo cáo khoa học số ${i} thuộc Phiên thuyết trình thứ tư kết thúc ngày hội thào.`
        });
        currTime = nextTime;
      }
      // Session 4 Q&A & Bế Mạc Slot
      generatedSessions.push({
        id: `SES-AUTO-${room.replace(/\s+/g, '')}-PM4-QA-${Math.floor(Math.random()*9000+1000)}`,
        title: `[Chiều - Phiên 4] Tổng kết chuyên mục, Phát biểu bế mạc sảnh & Tiếp nhận CME - ${room}`,
        speakerName: `Hội Đồng Chuyên Môn VSAPS`,
        speakerTitle: `Ban điều hành đại hội`,
        roomName: room,
        date: genDate,
        startTime: currTime,
        endTime: p4End,
        track: spec.track,
        description: `Tuyên bố bế mạc hoạt động học thuật sảnh ${room}, ký xác nhận phân bố CME và dọn dẹp chuyển sảnh.`
      });
    });

    // Write back to DB
    store.setSessions(generatedSessions);
    setSessions(generatedSessions);
    setSuccessMessage(`Đã khởi tạo thành công sơ đồ lịch trình cho ${genRooms.length} ROOM Hội nghị ngày ${genDate}! Hệ thống phát sinh đầy đủ thời gian biểu: Sáng/Chiều, 2 Phiên/buổi, Nghỉ giải lao quy chuẩn, mỗi phiên lẻ chứa ${genMorningPapers}-${genAfternoonPapers} bài báo cáo khoa học.`);
    setTimeout(() => setSuccessMessage(''), 8000);
    
    // Automatic redirection and filtering focus
    setActiveTab('matrix');
    setSelectedDate(genDate);
  };

  // Toggle checklist rooms helper
  const handleToggleRoomSelect = (room: string) => {
    if (genRooms.includes(room)) {
      setGenRooms(genRooms.filter(r => r !== room));
    } else {
      setGenRooms([...genRooms, room]);
    }
  };

  // Filter sessions for timeline
  const filteredSessions = sessions.filter(s => {
    const matchDate = selectedDate === 'all' || s.date === selectedDate;
    const matchText = s.title.toLowerCase().includes(searchText.toLowerCase()) || 
                      s.roomName.toLowerCase().includes(searchText.toLowerCase()) || 
                      s.speakerName.toLowerCase().includes(searchText.toLowerCase()) ||
                      s.track.toLowerCase().includes(searchText.toLowerCase());
    return matchDate && matchText;
  });

  // Unique sorted sessions by time for matrix grid lookup
  const currentMatrixSessions = sessions.filter(s => s.date === (selectedDate === 'all' ? (displayDates[0] || '2026-12-11') : selectedDate));
  const matrixRoomsSet = Array.from(new Set(currentMatrixSessions.map(s => s.roomName))).sort() as string[];
  const matrixTimesSet = Array.from(new Set(currentMatrixSessions.map(s => s.startTime))).sort() as string[];

  // Export report of complete room/speaker timetables to file CSV
  const handleExportCSV = () => {
    const headers = ["ID Phiên", "Tên chuyên đề báo cáo", "Phòng hội sảnh", "Ngày", "Khung giờ bắt đầu", "Khung giờ kết thúc", "Chuyên mục", "Báo cáo viên"];
    const rows = filteredSessions.map(s => [
      s.id,
      s.title,
      s.roomName,
      s.date,
      s.startTime,
      s.endTime,
      s.track,
      `${s.speakerName} (${s.speakerTitle})`
    ]);

    const csvContent = "data:text/csv;charset=utf-8,\uFEFF" 
      + [headers.join(","), ...rows.map(e => e.map(val => `"${String(val).replace(/"/g, '""')}"`).join(","))].join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `So-do-Lich-trinh-khoa-hoc-VSAPS-2026.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleExportCustom = (format: 'pdf' | 'csv', dateFilter: string) => {
    const targetSessions = sessions.filter(s => dateFilter === 'all' || s.date === dateFilter)
      .sort((a, b) => {
        if (a.date !== b.date) return a.date.localeCompare(b.date);
        return a.startTime.localeCompare(b.startTime);
      });

    if (targetSessions.length === 0) {
      alert('Không có phiên làm việc nào thỏa mãn ngày đã chọn để xuất.');
      return;
    }

    if (format === 'csv') {
      const headers = ["ID Phiên", "Tên chuyên đề báo cáo", "Phòng hội sảnh", "Ngày", "Khung giờ bắt đầu", "Khung giờ kết thúc", "Chuyên mục", "Báo cáo viên"];
      const rows = targetSessions.map(s => [
        s.id,
        s.title,
        s.roomName,
        s.date,
        s.startTime,
        s.endTime,
        s.track,
        `${s.speakerName} (${s.speakerTitle})`
      ]);

      const csvContent = "data:text/csv;charset=utf-8,\uFEFF" 
        + [headers.join(","), ...rows.map(e => e.map(val => `"${String(val).replace(/"/g, '""')}"`).join(","))].join("\n");
      const encodedUri = encodeURI(csvContent);
      const link = document.createElement("a");
      link.setAttribute("href", encodedUri);
      link.setAttribute("download", `Lich-Trinh-VSAPS-2026-${dateFilter}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } else {
      const datesToExport = dateFilter === 'all' 
        ? Array.from(new Set(targetSessions.map(s => s.date))).sort() 
        : [dateFilter];
      
      let htmlContent = `<!DOCTYPE html>
<html lang="vi">
<head>
    <meta charset="UTF-8">
    <title>SƠ ĐỒ LỊCH TRÌNH KHAI MẠC & PHÂN BỔ HỘI NGHỊ VSAPS 2026</title>
    <style>
        body {
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
            color: #1e293b;
            line-height: 1.5;
            padding: 40px;
            max-width: 1050px;
            margin: 0 auto;
            background-color: #ffffff;
        }
        .header {
            text-align: center;
            margin-bottom: 40px;
        }
        .national-title {
            font-size: 14px;
            font-weight: bold;
            text-transform: uppercase;
            letter-spacing: 0.8px;
            color: #0f172a;
        }
        .national-sub {
            font-size: 12px;
            margin-top: 4px;
            font-weight: 500;
            color: #475569;
        }
        .line-decorator {
            width: 160px;
            height: 2px;
            background: #0f172a;
            margin: 8px auto 20px auto;
        }
        .doc-title {
            font-size: 20px;
            font-weight: 800;
            text-transform: uppercase;
            margin-top: 25px;
            margin-bottom: 6px;
            color: #1e3a8a;
            letter-spacing: 0.5px;
        }
        .doc-subtitle {
            font-size: 12px;
            font-style: italic;
            color: #64748b;
            margin-bottom: 30px;
            font-weight: 500;
        }
        .section-day {
            margin-top: 35px;
            border-bottom: 3px solid #1e3a8a;
            padding-bottom: 6px;
        }
        .day-title {
            font-size: 16px;
            font-weight: 800;
            color: #1e3a8a;
            text-transform: uppercase;
        }
        table {
            width: 100%;
            border-collapse: collapse;
            margin-top: 15px;
            margin-bottom: 35px;
            font-size: 12px;
            box-shadow: 0 1px 3px rgba(0,0,0,0.05);
        }
        th, td {
            border: 1px solid #cbd5e1;
            padding: 10px 12px;
            text-align: left;
            vertical-align: top;
        }
        th {
            background-color: #f8fafc;
            color: #0f172a;
            font-weight: bold;
            text-transform: uppercase;
            font-size: 11px;
            letter-spacing: 0.5px;
        }
        .col-time { width: 15%; font-family: monospace; font-weight: bold; color: #2563eb; }
        .col-room { width: 15%; font-weight: bold; color: #0f172a; }
        .col-title { width: 38%; }
        .col-speaker { width: 17%; }
        .col-track { width: 15%; font-style: italic; color: #475569; }
        
        .footer-sig {
            margin-top: 60px;
            display: flex;
            justify-content: space-between;
            min-height: 160px;
            page-break-inside: avoid;
        }
        .sig-block {
            width: 45%;
            text-align: center;
        }
        .sig-title {
            font-weight: bold;
            text-transform: uppercase;
            font-size: 12px;
            color: #0f172a;
        }
        .sig-sub {
            font-size: 11px;
            color: #64748b;
            font-style: italic;
            margin-bottom: 65px;
        }
        .sig-name {
            font-weight: bold;
            font-size: 13px;
            color: #0f172a;
        }
        .red-stamp {
            display: inline-block;
            margin: 10px auto;
            width: 85px;
            height: 85px;
            border: 3px double #e11d48;
            border-radius: 50%;
            color: #e11d48;
            font-size: 8px;
            font-weight: bold;
            text-align: center;
            line-height: normal;
            transform: rotate(-10deg);
            padding-top: 15px;
            box-sizing: border-box;
        }
        @media print {
            body { padding: 0; }
            .no-print { display: none; }
            .page-break { page-break-before: always; }
        }
    </style>
</head>
<body>
    <div class="header">
        <div class="national-title">CỘNG HÒA XÃ HỘI CHỦ NGHĨA VIỆT NAM</div>
        <div class="national-sub">Độc lập - Tự do - Hạnh phúc</div>
        <div class="line-decorator"></div>
        <div class="national-title" style="color: #1e3a8a;">BAN TỔ CHỨC HỘI NGHỊ KHOA HỌC THẨM MỸ QUỐC TẾ VSAPS 2026</div>
        <div style="font-size: 11px; margin-top: 5px; color: #64748b; font-weight: 500;">Hội sở chính Trung ương Hội khoa học thẩm mỹ - Hà Nội - Việt Nam</div>
        <div class="doc-title" style="margin-top: 35px;">LỊCH TRÌNH & SƠ ĐỒ PHÂN BỔ BÁO CÁO KHOA HỌC CHÍNH THỨC</div>
        <div class="doc-subtitle">Cấp phát & Phê duyệt phân khúc CME - Ngày in ấn: ${new Date().toLocaleDateString('vi-VN')}</div>
    </div>

    <p style="font-size: 12px; color: #334155;">Căn cứ theo kế hoạch phân loại học thuật của Đại Hội Thẩm Mỹ Quốc tế 2026 thường niên, Ban thư ký khoa học ban hành văn bản chính thức xác lập sơ đồ lịch trình phân bổ thời biểu các phiên thuyết trình, tiệc teabreak ngoại sảnh và hoạt động kiểm tra lâm sàng như sau:</p>
`;

      datesToExport.forEach((d, dIdx) => {
        const daySessions = targetSessions.filter(s => s.date === d).sort((a,b) => a.startTime.localeCompare(b.startTime));
        
        htmlContent += `
    <div class="section-day ${dIdx > 0 ? 'page-break' : ''}">
        <span class="day-title">LỊCH TRÌNH CHUYÊN ĐỀ PHÒNG SẢNH - NGÀY ${d}</span>
    </div>
    <table>
        <thead>
            <tr>
                <th class="col-time">Giờ biểu</th>
                <th class="col-room">Phòng / Sảnh</th>
                <th class="col-title">Chủ đề / Khung thảo luận</th>
                <th class="col-speaker">Báo cáo viên</th>
                <th class="col-track">Chuyên mục</th>
            </tr>
        </thead>
        <tbody>
        `;

        daySessions.forEach(s => {
          htmlContent += `
            <tr>
                <td class="col-time">${s.startTime} - ${s.endTime}</td>
                <td class="col-room">${s.roomName}</td>
                <td class="col-title"><b>${s.title}</b>${s.description ? `<br/><span style="font-size: 10.5px; color:#64748b; font-weight: normal; margin-top: 3px; display: block;">${s.description}</span>` : ''}</td>
                <td class="col-speaker"><b>${s.speakerName}</b>${s.speakerTitle ? `<br/><span style="font-size: 10px; color:#64748b; font-weight: normal;">${s.speakerTitle}</span>` : ''}</td>
                <td class="col-track">${s.track}</td>
            </tr>
          `;
        });

        htmlContent += `
        </tbody>
    </table>
        `;
      });

      htmlContent += `
    <div class="footer-sig">
        <div class="sig-block" style="position: relative;">
            <div class="sig-title">ĐẠI DIỆN HỘI ĐỒNG KHOA HỌC</div>
            <div class="sig-sub">(Ký, ghi rõ họ tên và đóng dấu)</div>
            
            <div class="red-stamp">
                VSAPS 2026<br/>
                HỘI ĐỒNG<br/>
                KHOA HỌC<br/>
                ★ ĐÃ DUYỆT ★
            </div>
            
            <div class="sig-name" style="margin-top: 10px;">GS.TS. Phạm Minh Chi</div>
        </div>
        <div class="sig-block">
            <div class="sig-title">TRƯỞNG BAN THƯ KÝ ĐẠI HỘI</div>
            <div class="sig-sub">(Ký và đóng dấu xác nhận)</div>
            <div style="height: 95px;"></div>
            <div class="sig-name">PGS.TS. Trần Lê Hùng</div>
        </div>
    </div>
    
    <script>
      window.onload = function() {
        setTimeout(function() {
          window.print();
        }, 500);
      }
    </script>
</body>
</html>`;

      const blob = new Blob([new Uint8Array([0xEF, 0xBB, 0xBF]), htmlContent], { type: 'text/html;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `Sodo_Lichtrinh_In_an_VSAPS_2026_${dateFilter}.html`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }
    setShowExportModal(false);
  };

  return (
    <div className="space-y-6 font-sans">
      
      {/* Dynamic Notifications Alert Panel */}
      {successMessage && (
        <div className="p-4 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-2xl flex items-start gap-3 shadow-md animate-fade-in select-none">
          <div className="p-1 rounded-lg bg-emerald-100 text-emerald-700 mt-0.5 animate-bounce">
            <Check className="w-4 h-4" />
          </div>
          <div>
            <h5 className="font-extrabold text-[12.5px]">XÁC THỰC THÀNH CÔNG 🎉</h5>
            <p className="text-[11px] text-slate-600 font-medium leading-relaxed mt-1">{successMessage}</p>
          </div>
        </div>
      )}

      {/* 📊 METRICS & WIDGET TILES */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        
        <div className="bg-white p-4 rounded-2xl border border-slate-150 shadow-sm flex items-center gap-3">
          <div className="p-3 rounded-xl bg-teal-50 text-teal-600">
            <CalendarDays className="w-5 h-5" />
          </div>
          <div>
            <span className="text-[9.5px] text-slate-400 font-extrabold uppercase tracking-wider block">Ngày hoạt động</span>
            <p className="text-base font-black text-slate-900 mt-0.5">{displayDates.length} ngày chính</p>
          </div>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-150 shadow-sm flex items-center gap-3">
          <div className="p-3 rounded-xl bg-indigo-50 text-indigo-600">
            <Layers className="w-5 h-5" />
          </div>
          <div>
            <span className="text-[9.5px] text-slate-400 font-extrabold uppercase tracking-wider block">Tổng số session</span>
            <p className="text-base font-black text-slate-900 mt-0.5">{sessions.length} phiên đã xếp</p>
          </div>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-150 shadow-sm flex items-center gap-3">
          <div className="p-3 rounded-xl bg-amber-50 text-amber-600">
            <Coffee className="w-5 h-5" />
          </div>
          <div>
            <span className="text-[9.5px] text-slate-400 font-extrabold uppercase tracking-wider block">Quãng Giải Lao</span>
            <p className="text-base font-black text-slate-900 mt-0.5">
              {sessions.filter(s => s.track === 'Nghỉ giải lao' || s.track === 'Nghỉ giải lao / Bữa trưa').length} Teabreaks
            </p>
          </div>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-150 shadow-sm flex items-center gap-3">
          <div className="p-3 rounded-xl bg-rose-50 text-rose-600">
            <Sliders className="w-5 h-5" />
          </div>
          <div>
            <span className="text-[9.5px] text-slate-400 font-extrabold uppercase tracking-wider block">Địa điểm/Hội sảnh</span>
            <p className="text-base font-black text-rose-800 mt-0.5">
              {Array.from(new Set(sessions.map(s => s.roomName))).length} phòng sảnh
            </p>
          </div>
        </div>

      </div>

      {/* ⚠️ GLOBAL SCHEDULE CONFLICTS WARNING BANNER */}
      {conflicts.length > 0 && (
        <div className="bg-rose-50 border border-rose-200 text-rose-900 rounded-2xl p-4 shadow-sm animate-fade-in space-y-2">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <div className="p-1 px-1.5 rounded-lg bg-rose-100 text-rose-700 font-extrabold animate-pulse text-[10px] flex items-center gap-1 shrink-0">
                <AlertCircle className="w-3.5 h-3.5" />
                <span>CẢNH BÁO BỊ TRÙNG LỊCH</span>
              </div>
              <p className="text-xs font-black">Phát hiện {conflicts.length} xung đột phòng sảnh hoặc thời gian báo cáo viên!</p>
            </div>
            <button
              type="button"
              onClick={() => setShowConflictsDetail(!showConflictsDetail)}
              className="text-[10px] uppercase font-extrabold hover:underline text-rose-700 bg-transparent border-none cursor-pointer self-end sm:self-auto shrink-0"
            >
              {showConflictsDetail ? 'Thu gọn' : 'Xem chi tiết 🔍'}
            </button>
          </div>
          
          {showConflictsDetail && (
            <div className="p-3 bg-white/70 rounded-xl max-h-48 overflow-y-auto space-y-1.5 text-[11px] font-medium divide-y divide-rose-100">
              {conflicts.map((c, i) => (
                <div key={c.key + i} className="pt-1.5 first:pt-0 text-slate-800 flex items-start gap-1.5">
                  <span className="text-rose-600 block leading-none font-bold mt-0.5">●</span>
                  <p className="leading-relaxed">{c.message}</p>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* 🎛️ CONTROL BAR & SUB TAB SWITCHING NAVIGATION */}
      <div className="flex flex-col md:flex-row gap-4 items-stretch md:items-center justify-between bg-white p-4 rounded-2xl border border-slate-200">
        
        {/* Navigation Selector Tabs */}
        <div className="bg-slate-100 p-1 rounded-xl flex items-center border border-slate-200 self-start shrink-0">
          
          <button
            type="button"
            onClick={() => setActiveTab('timeline')}
            className={`p-2 px-4 rounded-lg text-xs font-black flex items-center gap-1.5 transition-all border-none cursor-pointer ${
              activeTab === 'timeline'
                ? 'bg-white text-indigo-700 shadow-sm'
                : 'text-slate-550 hover:text-slate-800 bg-transparent'
            }`}
          >
            <Clock className="w-3.5 h-3.5" />
            <span>Danh sách Dòng thời gian</span>
          </button>

          <button
            type="button"
            onClick={() => {
              setActiveTab('matrix');
              // Ensure we don't have selectedDate set to 'all' in matrix view because it relies on a specific day
              if (selectedDate === 'all') {
                setSelectedDate(displayDates[0] || '2026-12-11');
              }
            }}
            className={`p-2 px-4 rounded-lg text-xs font-black flex items-center gap-1.5 transition-all border-none cursor-pointer ${
              activeTab === 'matrix'
                ? 'bg-white text-indigo-700 shadow-sm'
                : 'text-slate-550 hover:text-slate-800 bg-transparent'
            }`}
          >
            <Table className="w-3.5 h-3.5" />
            <span>Sơ đồ Ma trận Phòng sảnh</span>
          </button>

          {role !== 'ctv' && (
            <button
              type="button"
              onClick={() => setActiveTab('generator')}
              className={`p-2 px-4 rounded-lg text-xs font-black flex items-center gap-1.5 transition-all border-none cursor-pointer ${
                activeTab === 'generator'
                  ? 'bg-white text-indigo-700 shadow-sm animate-pulse'
                  : 'text-emerald-700 hover:text-slate-850 font-bold bg-transparent'
              }`}
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>Trình tạo Sơ đồ Thủ công Mẫu ⚡</span>
            </button>
          )}

        </div>

        {/* Global Action items */}
        <div className="flex items-center gap-2 justify-end self-end">
          
          <button
            type="button"
            onClick={() => setShowExportModal(true)}
            className="p-2 px-3.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 shadow-sm hover:shadow"
            title="Xuất sơ đồ lịch trình sang định dạng PDF hoặc CSV in ấn"
          >
            <Printer className="w-3.5 h-3.5 text-pink-600" />
            <span>Xuất Lịch Trình</span>
          </button>

          {activeTab === 'timeline' && (
            <button
              onClick={handleExportCSV}
              className="p-2 px-3.5 bg-slate-50 hover:bg-slate-100 text-slate-700 border border-slate-200 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5"
              title="Xuất file báo cáo lịch trình chi tiếp"
            >
              <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-600" />
              <span>Xuất Excel</span>
            </button>
          )}

          {role !== 'ctv' && (
            <>
              <button
                type="button"
                onClick={() => {
                  setEditingSession(null);
                  setTitle('');
                  setSpeakerName('');
                  setSpeakerTitle('');
                  setDescription('');
                  setShowForm(true);
                }}
                className="p-2 px-3.5 bg-teal-600 hover:bg-teal-700 text-white rounded-xl text-xs font-black transition-all cursor-pointer border-none flex items-center gap-1 shadow-md"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Thêm phiên lẻ</span>
              </button>

              <button
                type="button"
                onClick={handleDeleteAll}
                className="p-2 px-3 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 rounded-xl text-xs font-bold transition-colors cursor-pointer"
                title="Xóa toàn bộ lịch trình hiện có"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </>
          )}

        </div>

      </div>

      {/* ═════════════════ TAB 1: DONG THOI GIAN - SEARCH & TIMELINE LIST ═════════════════ */}
      {activeTab === 'timeline' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          
          {/* Timeline listing left block */}
          <div className="lg:col-span-2 bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-4">
            
            {/* Filter tool */}
            <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-center justify-between border-b border-slate-100 pb-4 select-none">
              
              <div className="relative max-w-xs w-full">
                <Search className="absolute left-3 top-2.5 w-4 h-4 text-slate-400" />
                <input
                  type="text"
                  value={searchText}
                  onChange={(e) => setSearchText(e.target.value)}
                  placeholder="Lọc tên đề tài, sảnh, bọc báo..."
                  className="pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 focus:border-indigo-500 rounded-xl text-xs focus:outline-none w-full"
                />
              </div>

              {/* Date Filter Pills */}
              <div className="flex gap-1 overflow-x-auto scrollbar-none">
                <button
                  type="button"
                  onClick={() => setSelectedDate('all')}
                  className={`p-1.5 px-3 rounded-lg text-[10.5px] font-black tracking-tight whitespace-nowrap border-none cursor-pointer ${
                    selectedDate === 'all' ? 'bg-indigo-600 text-white shadow' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  Tất cả các ngày ({displayDates.length})
                </button>
                {displayDates.map(d => (
                  <button
                    key={d}
                    type="button"
                    onClick={() => setSelectedDate(d)}
                    className={`p-1.5 px-3 rounded-lg text-[10.5px] font-black tracking-tight whitespace-nowrap border-none cursor-pointer ${
                      selectedDate === d ? 'bg-indigo-600 text-white shadow' : 'bg-slate-100 text-slate-500 hover:bg-slate-200'
                    }`}
                  >
                    Ngày {d}
                  </button>
                ))}
              </div>

            </div>

            {/* List container */}
            <div className="space-y-6 relative border-l border-teal-200 ml-3 pl-6">
              {filteredSessions.length === 0 ? (
                <div className="p-12 text-center text-slate-400 italic text-xs border border-dashed border-slate-200 rounded-2xl select-none">
                  Không tìm thấy phiên làm việc nào khớp với bộ lọc ngày và tên tìm kiếm.
                </div>
              ) : (
                filteredSessions.map((session) => {
                  const isBreak = session.track === 'Nghỉ giải lao' || session.track === 'Nghỉ giải lao / Bữa trưa' || session.title.toLowerCase().includes('teabreak');
                  const isConflicted = conflictedSessionIds.has(session.id);
                  return (
                    <div key={session.id} className="relative group select-none">
                      
                      {/* Left circular target */}
                      <div className={`absolute -left-[29px] top-1.5 w-3.5 h-3.5 rounded-full border-4 border-white shadow group-hover:scale-125 transition-all ${
                        isConflicted ? 'bg-rose-500' : isBreak ? 'bg-amber-500' : 'bg-teal-500'
                      }`} />

                      <div className={`p-5 rounded-2xl border transition-all flex flex-col md:flex-row md:items-start justify-between gap-4 ${
                        isConflicted
                          ? 'bg-rose-50/10 border-rose-300 hover:bg-rose-50/20 shadow-sm'
                          : isBreak 
                            ? 'bg-amber-50/20 border-amber-100/50 hover:bg-amber-50/40' 
                            : 'bg-slate-50/40 border-slate-100/80 hover:bg-slate-50/80 hover:border-slate-200'
                      }`}>
                        
                        <div className="space-y-2.5">
                          
                          {/* Top metadata tags */}
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="px-2 py-0.5 bg-slate-900 text-slate-100 rounded-md text-[9px] font-bold uppercase font-mono tracking-wider">
                              📅 {session.date} | ⏱️ {session.startTime} - {session.endTime}
                            </span>
                            <span className={`px-2 py-0.5 rounded text-[9px] font-black uppercase ${
                              isBreak ? 'bg-amber-100 text-amber-700' : 'bg-indigo-50 text-indigo-700'
                            }`}>
                              {session.track}
                            </span>
                            <span className="text-[8px] text-slate-400 font-mono font-bold tracking-tight">ID: {session.id}</span>
                            
                            {isConflicted && (
                              <span className="px-2 py-0.5 bg-rose-600 text-rose-50 rounded text-[9px] font-black uppercase tracking-wider flex items-center gap-1 animate-pulse">
                                <AlertTriangle className="w-2.5 h-2.5 text-white" />
                                Overlap Trùng Lịch
                              </span>
                            )}
                          </div>

                          {/* Title */}
                          <h4 className="font-extrabold text-slate-900 text-sm leading-snug group-hover:text-indigo-600 transition-colors">
                            {session.title}
                          </h4>

                          <p className="text-xs text-slate-500 leading-relaxed max-w-xl font-medium">
                            {session.description}
                          </p>

                          {/* Speaker card info */}
                          {!isBreak && (
                            <div className="flex items-center gap-2 pt-2 border-t border-slate-100/60 w-fit">
                              <div className="w-8 h-8 rounded-full bg-indigo-50 text-indigo-700 font-black flex items-center justify-center text-[10px] uppercase">
                                {session.speakerName.substring(0, 2)}
                              </div>
                              <div>
                                <span className="text-xs font-extrabold text-slate-800 block capitalize">{session.speakerName}</span>
                                <span className="text-[9px] font-bold text-slate-400 block tracking-tight">{session.speakerTitle}</span>
                              </div>
                            </div>
                          )}

                        </div>

                        {/* Right operations (Room Name, Edit and Trash) */}
                        <div className="flex md:flex-col items-end justify-between md:justify-start gap-2 self-stretch md:self-start md:border-l border-slate-150 md:pl-4 shrink-0 px-1">
                          
                          <div className="text-[10px] text-slate-705 font-extrabold flex items-center gap-1 bg-slate-100/60 p-1 px-2.5 rounded-lg border border-slate-200">
                            <MapPin className="w-3 h-3 text-rose-500" />
                            <span>{session.roomName}</span>
                          </div>

                          {role !== 'ctv' && (
                            <div className="flex gap-1.5 mt-2">
                              <button
                                type="button"
                                onClick={() => handleEdit(session)}
                                className="p-1.5 bg-white border border-slate-200 hover:border-slate-350 text-slate-600 hover:text-slate-900 rounded-xl transition-all cursor-pointer"
                                title="Chỉnh sửa phiên"
                              >
                                <Edit2 className="w-3.5 h-3.5" />
                              </button>
                              <button
                                type="button"
                                onClick={() => handleDelete(session.id)}
                                className="p-1.5 bg-rose-50 hover:bg-rose-100 text-rose-600 hover:text-rose-700 rounded-xl transition-all cursor-pointer border border-rose-150"
                                title="Xóa phiên"
                              >
                                <Trash className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          )}

                        </div>

                      </div>

                    </div>
                  );
                })
              )}
            </div>

          </div>

          {/* Right Sảnh Quy định static side columns */}
          <div className="space-y-6">
            
            <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
              <h4 className="font-extrabold text-slate-900 text-xs uppercase tracking-wider mb-4 flex items-center gap-1.5">
                <Settings className="w-4 h-4 text-emerald-600" />
                Sảnh Báo Cáo Hội Nghị (ROOMS)
              </h4>
              
              <div className="space-y-4 text-xs text-slate-500 leading-relaxed font-semibold">
                <div className="p-3 bg-teal-50/20 border border-teal-100 rounded-xl">
                  <span className="font-black text-teal-800 block mb-1">🏥 Hội trường 1 (Sảnh chính)</span>
                  <span>Thiết lập phẫu thuật mổ trực lâm (Live Surgery), Đại Hội nhiệm kỳ, Lễ Khai Mạc & Lễ bế mạc sự kiện.</span>
                </div>
                <div className="p-3 bg-indigo-50/20 border border-indigo-150 rounded-xl">
                  <span className="font-black text-indigo-800 block mb-1">🧪 Hội trường 2 (Masterclass sảnh)</span>
                  <span>Chuyên đề Hands-on, Laser bước sóng ngắn, tiêm Botox chuyên dụng.</span>
                </div>
                <div className="p-3 bg-amber-50/20 border border-amber-100 rounded-xl">
                  <span className="font-black text-amber-800 block mb-1">🧬 Hội trường 3 (Thẩm mỹ nội khoa)</span>
                  <span>Hội nghị cấy chỉ thẩm mỹ phục hồi lão hóa da, tái tạo biểu bì.</span>
                </div>
                <div className="p-3 bg-rose-50/20 border border-rose-150 rounded-xl">
                  <span className="font-black text-rose-800 block mb-1">🌱 Hội trường 4 (Tế bào gốc)</span>
                  <span>Kĩ thuật nâng cơ đa tầng, sinh học vật thể mới.</span>
                </div>
              </div>

            </div>

            <div className="p-5 bg-gradient-to-br from-indigo-900 to-indigo-950 text-white rounded-2xl border border-indigo-950 shadow-lg space-y-3">
              <h5 className="font-extrabold text-xs tracking-wider flex items-center gap-1.5 text-teal-300 uppercase">
                <HelpCircle className="w-4 h-4 shrink-0" />
                Tổng quan cơ chế Sơ Đồ Lịch
              </h5>
              <p className="text-[11px] text-indigo-200 leading-relaxed font-medium">
                Mỗi ngày được tính gồm 2 Buổi: Sáng và Chiều. Để bố trí khoa học, hãy sử dụng tính năng <strong>Trình tạo Sơ đồ</strong> ở tab bên cạnh để phát sinh hoàn toàn tự động các buổi, teabreak giải lao cho nhiều hội trường cùng lúc cực nhanh.
              </p>
            </div>

          </div>

        </div>
      )}

      {/* ═════════════════ TAB 2: SO DO MA TRAN GRID MATRIX VIEW ═════════════════ */}
      {activeTab === 'matrix' && (
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-4">
          
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4 border-b border-slate-105 pb-4 select-none">
            <div>
              <h4 className="font-black text-slate-900 text-sm flex items-center gap-1.5 uppercase tracking-tight">
                <Table className="w-4 h-4 text-indigo-600 animate-pulse" />
                Bản đồ Ma Trận sảnh & Phiên Báo Cáo (GRID WORKSPACE)
              </h4>
              <p className="text-[11px] text-slate-400 font-medium leading-relaxed mt-0.5">Sơ đồ phối hợp ngang dọc trực quan giúp BTC tránh trùng lặp báo cáo viên, kéo thả xếp lịch và điều phối các phòng ban.</p>
            </div>

            {/* Date Picker strictly for the matrix */}
            <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl border border-slate-200 shrink-0">
              <span className="text-[10px] uppercase font-extrabold text-slate-500 px-2">Ngày lựa chọn:</span>
              {displayDates.map(d => (
                <button
                  key={d}
                  type="button"
                  onClick={() => setSelectedDate(d)}
                  className={`p-1 px-3 rounded-lg text-xs font-black transition-all border-none cursor-pointer ${
                    selectedDate === d 
                      ? 'bg-white text-indigo-700 shadow-sm' 
                      : 'text-slate-505 hover:text-slate-800 bg-transparent'
                  }`}
                >
                  Ngày {d}
                </button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
            
            {/* LEFT PANEL: UNSCHEDULED PRESENTATION ITEMS */}
            <div className="lg:col-span-3 space-y-4">
              <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-3">
                <div className="flex items-center justify-between border-b border-slate-200 pb-2">
                  <h5 className="font-extrabold text-[11px] text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
                    <Layers className="w-3.5 h-3.5 text-indigo-600" />
                    BÀI BÁO CÁO CHƯA XẾP LỊCH
                  </h5>
                  <span className="bg-indigo-100 text-indigo-800 text-[9px] px-1.5 py-0.5 rounded-full font-bold">
                    {unscheduledSpeakers.length + SAMPLE_PAPERS.length} bài
                  </span>
                </div>
                
                <p className="text-[10px] text-slate-400 leading-snug">
                  💡 Kéo một bài nghiên cứu dưới đây thả vào ô sảnh trống (Cell Trống) để xác lập múi giờ hội diễn tức thì.
                </p>

                <div className="max-h-[500px] overflow-y-auto space-y-2 pr-1 scrollbar-thin">
                  {/* Real registered approved speakers first */}
                  {unscheduledSpeakers.length > 0 ? (
                    unscheduledSpeakers.map(sp => (
                      <div
                        key={sp.id}
                        draggable={role !== 'ctv'}
                        onDragStart={(e) => {
                          e.dataTransfer.setData('text/plain', JSON.stringify({
                            type: 'unscheduled',
                            speakerId: sp.id,
                            title: sp.presentationTitle,
                            speakerName: `${sp.title} ${sp.fullName}`,
                            speakerTitle: sp.organization,
                            track: sp.presentationTrack || 'Báo cáo Chuyên khoa'
                          }));
                        }}
                        className="p-3 bg-white border border-slate-200 hover:border-indigo-500 hover:shadow-md rounded-xl cursor-grab active:cursor-grabbing transition-all space-y-1 group"
                        title="Giữ chuột trái để kéo thả bài nghiên cứu khoa học này"
                      >
                        <div className="flex items-center gap-1">
                          <span className="p-0.5 px-1 bg-emerald-50 text-emerald-700 font-extrabold rounded text-[7.5px] uppercase">
                            Chính thức
                          </span>
                          <span className="font-mono text-[7px] text-slate-400 max-w-[60px] truncate">ID: {sp.id.substring(0, 6)}</span>
                        </div>
                        <div className="text-[11px] font-extrabold text-slate-900 leading-snug group-hover:text-indigo-600 transition-colors">
                          {sp.presentationTitle}
                        </div>
                        <div className="text-[9.5px] text-slate-600 font-bold">
                          🗣️ {sp.title} {sp.fullName}
                        </div>
                        <div className="text-[8.5px] text-slate-400 flex items-center justify-between">
                          <span className="truncate max-w-[125px]">{sp.organization}</span>
                          <span className="bg-slate-100 px-1 rounded font-bold text-[8px]">{sp.presentationTrack}</span>
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="p-4 text-center bg-white border border-dashed border-slate-205 rounded-xl text-[10px] text-slate-400">
                      Tất cả báo cáo đại biểu đã có lịch!
                    </div>
                  )}

                  {/* Sample fallback/sandbox papers */}
                  <div className="pt-2 border-t border-slate-200/60">
                    <span className="text-[8.5px] font-black text-slate-400 block mb-2 uppercase tracking-wide">Bài mẫu khoa học diễn thử</span>
                    {SAMPLE_PAPERS.map(sp => (
                      <div
                        key={sp.id}
                        draggable={role !== 'ctv'}
                        onDragStart={(e) => {
                          e.dataTransfer.setData('text/plain', JSON.stringify({
                            type: 'unscheduled',
                            speakerId: sp.id,
                            title: sp.title,
                            speakerName: sp.speakerName,
                            speakerTitle: sp.speakerTitle,
                            track: sp.track
                          }));
                        }}
                        className="p-3 bg-white border border-dashed border-slate-200 hover:border-indigo-400 hover:shadow-sm rounded-xl cursor-grab active:cursor-grabbing transition-all space-y-1 group mb-2"
                        title="Kéo thả bài test mẫu này vào ô trống trên ma trận"
                      >
                        <div className="flex items-center gap-1">
                          <span className="p-0.5 px-1 bg-purple-50 text-purple-700 font-extrabold rounded text-[7.5px] uppercase">
                            Mẫu Sandbox
                          </span>
                        </div>
                        <div className="text-[11px] font-extrabold text-slate-800 leading-snug group-hover:text-amber-800 transition-colors">
                          {sp.title}
                        </div>
                        <div className="text-[9.5px] text-slate-600 font-bold">
                          🗣️ {sp.speakerName}
                        </div>
                        <div className="text-[8.5px] text-slate-400 flex items-center justify-between">
                          <span>{sp.speakerTitle}</span>
                          <span className="bg-slate-50 px-1 rounded font-bold text-[8px]">{sp.track}</span>
                        </div>
                      </div>
                    ))}
                  </div>

                </div>
              </div>
            </div>

            {/* RIGHT PANEL: INTERACTIVE MATRIX CALENDAR */}
            <div className="lg:col-span-9 space-y-4">
              
              {matrixRoomsSet.length === 0 ? (
                <div className="p-16 text-center text-slate-400 font-bold italic text-xs border border-dashed border-slate-200 rounded-2xl select-none">
                  Không có dữ liệu sự kiện nào ghi nhận cho ngày {selectedDate === 'all' ? (displayDates[0] || '...') : selectedDate}. Vui lòng chuyển qua tab <strong>Trình tạo Sơ đồ</strong> để khởi tạo.
                </div>
              ) : (
                <div className="overflow-x-auto rounded-2xl border border-slate-200 shadow-inner">
                  <table className="w-full text-left border-collapse table-fixed min-w-[900px]">
                    
                    <thead>
                      <tr className="bg-slate-900 text-slate-300 text-[10px] font-black uppercase tracking-wider select-none border-b border-slate-800">
                        <th className="p-3.5 w-40 pl-5">Thời gian</th>
                        {matrixRoomsSet.map(room => (
                          <th key={room} className="p-3.5 border-l border-slate-800 text-center text-slate-50 font-extrabold">
                            {room}
                          </th>
                        ))}
                      </tr>
                    </thead>

                    <tbody className="divide-y divide-slate-150 text-[11px] font-medium text-slate-700">
                      {matrixTimesSet.map((time, idx) => {
                        const rowSessions = currentMatrixSessions.filter(s => s.startTime === time);
                        const rowSampleDateSession = rowSessions[0];
                        const fullInterval = rowSampleDateSession ? `${time} - ${rowSampleDateSession.endTime}` : time;

                        return (
                          <tr 
                            key={time} 
                            className={`hover:bg-indigo-50/15 transition-all ${idx % 2 === 1 ? 'bg-slate-50/30' : ''}`}
                          >
                            
                            {/* Start and end time block */}
                            <td className="p-3.5 font-mono font-black text-slate-500 pl-5 bg-slate-50/80 border-r border-slate-200 select-none">
                              <span className="inline-flex items-center gap-1 text-[10px]">
                                <Clock className="w-3.5 h-3.5 text-indigo-500 shrink-0" />
                                {fullInterval}
                              </span>
                            </td>

                            {/* Iterate each room columns mapping */}
                            {matrixRoomsSet.map(room => {
                              const matchingRoomSession = rowSessions.find(s => s.roomName === room);
                              
                              if (!matchingRoomSession) {
                                const isCellHovered = dragOverCell?.time === time && dragOverCell?.room === room;
                                return (
                                  <td 
                                    key={room}
                                    onDragOver={(e) => {
                                      e.preventDefault();
                                      if (role !== 'ctv') {
                                        setDragOverCell({ time, room });
                                      }
                                    }}
                                    onDragLeave={() => {
                                      setDragOverCell(null);
                                    }}
                                    onDrop={(e) => {
                                      e.preventDefault();
                                      setDragOverCell(null);
                                      const dataStr = e.dataTransfer.getData('text/plain');
                                      if (dataStr) {
                                        try {
                                          const dragData = JSON.parse(dataStr);
                                          handleDropOnEmptyCell(dragData, time, room);
                                        } catch(err) {
                                          console.error(err);
                                        }
                                      }
                                    }}
                                    className={`p-3.5 border-l border-slate-200 text-center text-[10px] italic transition-all ${
                                      isCellHovered 
                                        ? 'bg-indigo-50 border-2 border-dashed border-indigo-500 scale-98 shadow-inner text-indigo-700 font-extrabold' 
                                        : 'bg-transparent text-slate-350'
                                    }`}
                                  >
                                    -- Sảnh này Trống / Nhận thả bài 📥 --
                                  </td>
                                );
                              }

                              const isBreak = matchingRoomSession.track === 'Nghỉ giải lao' || matchingRoomSession.track === 'Nghỉ giải lao / Bữa trưa' || matchingRoomSession.title.toLowerCase().includes('teabreak');
                              const isQA = matchingRoomSession.title.toLowerCase().includes('q&a') || matchingRoomSession.title.toLowerCase().includes('thảo luận');
                              const isConflicted = conflictedSessionIds.has(matchingRoomSession.id);

                              return (
                                <td 
                                  key={room}
                                  draggable={role !== 'ctv'}
                                  onDragStart={(e) => {
                                    e.dataTransfer.setData('text/plain', JSON.stringify({
                                      type: 'existing',
                                      id: matchingRoomSession.id,
                                      title: matchingRoomSession.title,
                                      speakerName: matchingRoomSession.speakerName,
                                      speakerTitle: matchingRoomSession.speakerTitle,
                                      track: matchingRoomSession.track,
                                      description: matchingRoomSession.description
                                    }));
                                  }}
                                  onClick={() => handleEdit(matchingRoomSession)}
                                  className={`p-3.5 border-l border-slate-200 align-top transition-all cursor-grab active:cursor-grabbing hover:bg-slate-100 group ${
                                    isConflicted 
                                      ? 'border-2 border-rose-400 bg-rose-50/20' 
                                      : isBreak 
                                        ? 'bg-amber-50/40' 
                                        : isQA 
                                          ? 'bg-emerald-50/30 font-semibold' 
                                          : 'bg-white'
                                  }`}
                                  title={isConflicted ? 'XUNG ĐỘT TRÙNG LỊCH: Kéo thả sang ô trống khác để dời lịch nhanh.' : 'Giữ và kéo để di chuyển phiên, bấm để chỉnh sửa'}
                                >
                                  <div className="space-y-1.5 select-none relative">
                                    {isConflicted && (
                                      <span className="absolute -top-1 -right-1 flex h-2 w-2">
                                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75"></span>
                                        <span className="relative inline-flex rounded-full h-2 w-2 bg-rose-500"></span>
                                      </span>
                                    )}
                                    
                                    <div className={`text-[10.5px] font-extrabold line-clamp-3 leading-snug group-hover:text-indigo-600 transition-colors ${
                                      isConflicted 
                                        ? 'text-rose-900 font-black' 
                                        : isBreak 
                                          ? 'text-amber-800' 
                                          : isQA 
                                            ? 'text-emerald-800' 
                                            : 'text-slate-900'
                                    }`}>
                                      {isConflicted && '⚠️ '}{matchingRoomSession.title}
                                    </div>

                                    <div className="text-[9px] text-slate-400 font-bold flex items-center justify-between gap-1 leading-none select-none">
                                      <span className={`truncate max-w-[110px] ${isConflicted ? 'text-rose-700' : ''}`}>🗣️ {matchingRoomSession.speakerName}</span>
                                      <span className={`font-mono text-[7.5px] px-1 rounded ${
                                        isConflicted 
                                          ? 'bg-rose-100 text-rose-800' 
                                          : 'bg-indigo-50 text-indigo-750'
                                      }`}>
                                        {matchingRoomSession.track.split(' ')[0]}
                                      </span>
                                    </div>

                                  </div>
                                </td>
                              );
                            })}

                          </tr>
                        );
                      })}
                    </tbody>

                  </table>
                </div>
              )}

              <div className="p-3 bg-slate-50 border border-slate-150 rounded-xl text-[10px] text-slate-400 font-bold flex flex-col sm:flex-row sm:items-center justify-between gap-2 select-none">
                <span>✋ Kéo thả linh hoạt: Kéo bài chưa xếp từ thanh bên, hoặc giữ chuột dời phiên đang xếp trực tiếp trên lưới thả vào ô trống khác!</span>
                <span className="text-indigo-600">⚡ Tự động tính toán CME & phân giải trùng lặp</span>
              </div>

            </div>

          </div>

        </div>
      )}


      {/* ═════════════════ TAB 3: TRINH TAO SO DO LICH TRINH THU CONG MAU ═════════════════ */}
      {activeTab === 'generator' && role !== 'ctv' && (
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-6">
          
          <div className="border-b border-indigo-100 pb-4 select-none">
            <h4 className="font-black text-slate-900 text-sm flex items-center gap-1.5 uppercase tracking-tight">
              <Sparkles className="w-4 h-4 text-indigo-600 animate-pulse" />
              BỘ ĐIỀU HÀNH KHỞI TẠO LỊCH TRÌNH THỦ CÔNG (THEO SƠ ĐỒ QUY CHUẨN)
            </h4>
            <p className="text-[11px] text-slate-400 mt-1 leading-relaxed">
              Vận hành nhanh chóng cấu trúc hội nghị lớn: Tự phân bổ thời gian Ngày (Sáng-Chiều), mỗi buổi chia 2 phiên, tự chèn tea-break giải lao, tự chia khung giờ cho 4-5 báo cáo khoa học.
            </p>
          </div>

          <form onSubmit={handleAutoGenerate} className="space-y-6 max-w-4xl">
            
            {/* General setup */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              
              <div>
                <label className="text-[10.5px] font-black text-slate-500 block mb-1.5 uppercase tracking-wide">
                  1. Thiết lập Ngày tổ chức hội nghị *
                </label>
                <input
                  type="date"
                  required
                  value={genDate}
                  onChange={(e) => setGenDate(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-250 rounded-xl text-xs font-mono font-bold focus:border-indigo-500"
                />
                <span className="text-[9px] text-slate-400 font-bold mt-1 block">Khuyến nghị: Thường là ngày thứ hai của hội nghị lớn (ví dụ: `2026-12-12`).</span>
              </div>

              <div>
                <label className="text-[10.5px] font-black text-slate-500 block mb-1.5 uppercase tracking-wide">
                  2. Chế độ Giao điểm Cơ sở dữ liệu *
                </label>
                <div className="p-3 bg-slate-50/80 border border-slate-200 rounded-xl flex items-center gap-3">
                  <input
                    type="checkbox"
                    id="chk-overwrite"
                    checked={overwriteExisting}
                    onChange={(e) => setOverwriteExisting(e.target.checked)}
                    className="w-4 h-4 text-rose-600 focus:ring-rose-500 border-slate-300 rounded cursor-pointer scale-110"
                  />
                  <div className="text-left">
                    <label htmlFor="chk-overwrite" className="text-xs font-black text-slate-805 block cursor-pointer select-none">
                      Xóa toàn bộ lịch trình cũ (DỌN SẠCH CƠ SỞDỮ LIỆU)
                    </label>
                    <span className="text-[9px] text-slate-405 leading-none font-medium block mt-0.5">Ý nghĩa: Xóa sạch phiên mặc định cũ để cài đặt mới hoàn toàn từ sơ đồ này.</span>
                  </div>
                </div>
              </div>

            </div>

            {/* Checkbox rooms select */}
            <div>
              <label className="text-[10.5px] font-black text-slate-500 block mb-2 uppercase tracking-wide">
                3. Lựa chọn ROOM hội sảnh cần áp dụng sơ đồ *
              </label>
              
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                {['Hội trường 1', 'Hội trường 2', 'Hội trường 3', 'Hội trường 4'].map((room) => {
                  const spec = room.includes('1') ? 'Sảnh Live Surgery' : room.includes('2') ? 'Sảnh Masterclass' : room.includes('3') ? 'Sảnh Nội khoa' : 'Sảnh Tế bào';
                  const isChecked = genRooms.includes(room);
                  return (
                    <button
                      key={room}
                      type="button"
                      onClick={() => handleToggleRoomSelect(room)}
                      className={`p-3.5 rounded-2xl border text-left flex flex-col justify-between transition-all select-none cursor-pointer ${
                        isChecked 
                          ? 'border-indigo-600 bg-indigo-50/30' 
                          : 'border-slate-200 bg-white hover:border-slate-300'
                      }`}
                    >
                      <div className="flex items-center justify-between w-full">
                        <span className="text-xs font-black text-slate-900">{room}</span>
                        <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center shrink-0 ${
                          isChecked ? 'border-indigo-600 bg-indigo-600' : 'border-slate-300'
                        }`}>
                          {isChecked && <Check className="w-2.5 h-2.5 text-white" />}
                        </div>
                      </div>
                      <span className="text-[9.5px] text-slate-450 block mt-2 font-bold uppercase tracking-tight">{spec}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Buổi Sáng config details */}
            <div className="p-5 border border-slate-200 rounded-2xl space-y-4">
              <span className="px-2.5 py-1 bg-teal-50 text-teal-700 text-[10px] font-black rounded-lg uppercase tracking-wider block w-fit">
                Buổi 1: BUỔI SÁNG (MỘT BUỔI CÓ 2 PHIÊN BÁO CÁO)
              </span>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="text-[10px] font-bold text-slate-400 block mb-1">Giờ bắt đầu buổi sáng</label>
                  <input
                    type="text"
                    required
                    value={genMorningStart}
                    onChange={(e) => setGenMorningStart(e.target.value)}
                    placeholder="08:00"
                    className="w-full px-3 py-1.5 border border-slate-200 rounded-lg text-xs font-mono font-bold"
                  />
                  <span className="text-[9px] text-slate-400 font-medium block mt-1">Phiên 1: 08:00 - 09:30</span>
                </div>

                <div>
                  <label className="text-[10px] font-bold text-slate-400 block mb-1">Thời lượng nghỉ Teabreak giữa phiên</label>
                  <input
                    type="text"
                    disabled
                    value="15 phút"
                    className="w-full px-3 py-1.5 border border-slate-150 bg-slate-50 text-slate-500 rounded-lg text-xs font-bold"
                  />
                  <span className="text-[9px] text-slate-400 font-medium block mt-1">Nghỉ ngơi: 09:30 - 09:45</span>
                </div>

                <div>
                  <label className="text-[10px] font-bold text-slate-400 block mb-1">Phiên báo cáo 2 tiếp theo</label>
                  <input
                    type="text"
                    disabled
                    value="90 phút"
                    className="w-full px-3 py-1.5 border border-slate-150 bg-slate-50 text-slate-505 rounded-lg text-xs font-bold"
                  />
                  <span className="text-[9px] text-slate-400 font-medium block mt-1">Phiên 2: 09:45 - 11:15</span>
                </div>
              </div>

              <div>
                <label className="text-[10.5px] font-black text-slate-500 block mb-1.5 uppercase tracking-wide">
                  Số bài báo cáo trong mỗi Phiên lẻ Buổi Sáng *
                </label>
                <div className="flex gap-2">
                  {[4, 5].map((num) => (
                    <button
                      key={num}
                      type="button"
                      onClick={() => setGenMorningPapers(num)}
                      className={`p-2 px-5 rounded-xl border text-xs font-extrabold cursor-pointer transition-all ${
                        genMorningPapers === num 
                          ? 'bg-slate-900 border-slate-950 text-white shadow' 
                          : 'bg-transparent border-slate-200 text-slate-600 hover:bg-slate-50'
                      }`}
                    >
                      💡 {num} bài báo cáo / Phiên (mỗi bài {num === 5 ? '15' : '20'} phút + 15' thảo luận)
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Buổi Chiều config details */}
            <div className="p-5 border border-slate-200 rounded-2xl space-y-4">
              <span className="px-2.5 py-1 bg-amber-50 text-amber-700 text-[10px] font-black rounded-lg uppercase tracking-wider block w-fit">
                Buổi 2: BUỔI CHIỀU (MỘT BUỔI CÓ 2 PHIÊN BÁO CÁO)
              </span>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="text-[10px] font-bold text-slate-400 block mb-1">Giờ bắt đầu buổi chiều</label>
                  <input
                    type="text"
                    required
                    value={genAfternoonStart}
                    onChange={(e) => setGenAfternoonStart(e.target.value)}
                    placeholder="13:30"
                    className="w-full px-3 py-1.5 border border-slate-200 rounded-lg text-xs font-mono font-bold"
                  />
                  <span className="text-[9px] text-slate-400 font-medium block mt-1">Phiên 3: 13:30 - 15:00</span>
                </div>

                <div>
                  <label className="text-[10px] font-bold text-slate-400 block mb-1">Nghỉ giải lao buổi chiều</label>
                  <input
                    type="text"
                    disabled
                    value="15 phút"
                    className="w-full px-3 py-1.5 border border-slate-150 bg-slate-50 text-slate-500 rounded-lg text-xs font-bold"
                  />
                  <span className="text-[9px] text-slate-400 font-medium block mt-1">Teabreak: 15:00 - 15:15</span>
                </div>

                <div>
                  <label className="text-[10px] font-bold text-slate-400 block mb-1">Phiên báo cáo 4 cuối ngày</label>
                  <input
                    type="text"
                    disabled
                    value="90 phút"
                    className="w-full px-3 py-1.5 border border-slate-150 bg-slate-50 text-slate-500 rounded-lg text-xs font-bold"
                  />
                  <span className="text-[9px] text-slate-400 font-medium block mt-1">Phiên 4: 15:15 - 16:45</span>
                </div>
              </div>

              <div>
                <label className="text-[10.5px] font-black text-slate-500 block mb-1.5 uppercase tracking-wide">
                  Số bài báo cáo trong mỗi Phiên lẻ Buổi Chiều *
                </label>
                <div className="flex gap-2">
                  {[4, 5].map((num) => (
                    <button
                      key={num}
                      type="button"
                      onClick={() => setGenAfternoonPapers(num)}
                      className={`p-2 px-5 rounded-xl border text-xs font-extrabold cursor-pointer transition-all ${
                        genAfternoonPapers === num 
                          ? 'bg-slate-900 border-slate-950 text-white shadow' 
                          : 'bg-transparent border-slate-200 text-slate-600 hover:bg-slate-50'
                      }`}
                    >
                      💡 {num} bài báo cáo / Phiên (mỗi bài {num === 5 ? '15' : '20'} phút + 15' thảo luận)
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Call to action panel */}
            <div className="pt-4 border-t border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3 select-none">
              <span className="text-[11px] text-slate-400 font-bold block max-w-sm">
                ⚠️ Click Xác nhận sẽ khởi động công cụ toán học chia thời gian, tự động tính sảnh và viết thẳng vào kho lưu trữ nội bộ.
              </span>
              <button
                type="submit"
                className="p-3 px-6 bg-indigo-650 hover:bg-indigo-700 text-white rounded-xl text-xs font-black transition-all flex items-center justify-center gap-2 cursor-pointer border-none shadow-md hover:shadow-lg scale-102 hover:scale-105"
              >
                <Play className="w-4 h-4 animate-pulse" />
                <span>PHÁT SINH LỊCH TRÌNH THỦ CÔNG THEO SƠ ĐỒ 💾</span>
              </button>
            </div>

          </form>

        </div>
      )}


      {/* ═════════════════ TIMETABLE ADD / EDIT SINGLE FORM MODAL (MANUAL DIALOG) ═════════════════ */}
      {showForm && (
        <div className="fixed inset-0 bg-slate-950/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full overflow-hidden border border-slate-100 shadow-2xl animate-fade-in text-slate-850">
            
            <div className="bg-teal-600 p-5 text-white">
              <h4 className="font-extrabold text-sm tracking-wide">
                {editingSession ? 'CHỈNH SỬA PHIÊN HỘI NGHỊ CHUYÊN BIỆT' : 'THÊM KHUNG PHIÊN LẺ HỘI NGHỊ'}
              </h4>
              <p className="text-[11px] text-teal-100 mt-1">Đảm bảo nhập đúng tên phòng, giờ bắt đầu và giờ bế mạc sự vật để đối chiếu CME chuẩn.</p>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-4 text-xs font-semibold">
              <div>
                <label className="text-[10px] font-bold text-slate-400 block mb-1">Tên phiên / Chủ đề thuyết trình *</label>
                <input
                  type="text"
                  required
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="ví dụ: Báo cáo Chuyên đề Phẫu thuật nội soi sọ hàm mặt"
                  className="w-full px-3 py-2 border border-slate-205 rounded-xl focus:border-teal-600"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[10px] font-bold text-slate-400 block mb-1">Tên Báo Cáo Viên *</label>
                  <input
                    type="text"
                    required
                    value={speakerName}
                    onChange={(e) => setSpeakerName(e.target.value)}
                    placeholder="PGS.TS. Nguyễn Văn A"
                    className="w-full px-3 py-2 border border-slate-205 rounded-xl focus:border-teal-600"
                  />
                </div>
                <div>
                  <label className="text-[10px] font-bold text-slate-400 block mb-1">Học vị / Nơi công tác bcv</label>
                  <input
                    type="text"
                    value={speakerTitle}
                    onChange={(e) => setSpeakerTitle(e.target.value)}
                    placeholder="Bệnh viện Chợ Rẫy"
                    className="w-full px-3 py-2 border border-slate-205 rounded-xl focus:border-teal-600"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                
                <div>
                  <label className="text-[10px] font-bold text-slate-400 block mb-1">Hội trường / Sảnh phòng thiết đặt *</label>
                  <select
                    value={roomName}
                    onChange={(e) => setRoomName(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-205 rounded-xl cursor-pointer bg-white"
                  >
                    <option value="Hội trường 1">Hội trường 1</option>
                    <option value="Hội trường 2">Hội trường 2</option>
                    <option value="Hội trường 3">Hội trường 3</option>
                    <option value="Hội trường 4">Hội trường 4</option>
                    <option value="Sảnh VIP A">Sảnh VIP A</option>
                    <option value="Phòng thảo luận B">Phòng thảo luận B</option>
                    <option value="Bàn check in">Bàn check in</option>
                  </select>
                </div>

                <div>
                  <label className="text-[10px] font-bold text-slate-400 block mb-1">Mã chuyên đề khoa học (Track)</label>
                  <input
                    type="text"
                    value={track}
                    onChange={(e) => setTrack(e.target.value)}
                    placeholder="ví dụ: Live Surgery"
                    className="w-full px-3 py-2 border border-slate-205 rounded-xl"
                  />
                </div>

              </div>

              <div className="grid grid-cols-3 gap-2">
                <div>
                  <label className="text-[10px] font-bold text-slate-400 block mb-1">Ngày sự kiện</label>
                  <input
                    type="date"
                    required
                    value={date}
                    onChange={(e) => setDate(e.target.value)}
                    className="w-full px-2 py-2 border border-slate-205 rounded-xl font-mono text-center"
                  />
                </div>
                <div>
                  <label className="text-[10px] font-bold text-slate-400 block mb-1">Bắt đầu (HH:MM)</label>
                  <input
                    type="text"
                    required
                    value={startTime}
                    onChange={(e) => setStartTime(e.target.value)}
                    placeholder="08:00"
                    className="w-full px-2 py-2 border border-slate-205 rounded-xl font-mono text-center font-bold"
                  />
                </div>
                <div>
                  <label className="text-[10px] font-bold text-slate-400 block mb-1">Kết thúc (HH:MM)</label>
                  <input
                    type="text"
                    required
                    value={endTime}
                    onChange={(e) => setEndTime(e.target.value)}
                    placeholder="09:30"
                    className="w-full px-2 py-2 border border-slate-205 rounded-xl font-mono text-center font-bold"
                  />
                </div>
              </div>

              <div>
                <label className="text-[10px] font-bold text-slate-400 block mb-1">Mô tả tóm lược nội dung phiên</label>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  rows={2}
                  placeholder="Điểm chính yếu trình diễn, thảo luận lâm sàng..."
                  className="w-full px-3 py-2 border border-slate-205 rounded-xl text-xs"
                />
              </div>

              {/* Action buttons */}
              <div className="pt-4 flex justify-end gap-2 border-t border-slate-150">
                <button
                  type="button"
                  onClick={() => {
                    setShowForm(false);
                    setEditingSession(null);
                  }}
                  className="px-4 py-2 text-xs text-slate-500 bg-slate-100 hover:bg-slate-200 font-bold rounded-xl transition-all border-none cursor-pointer"
                >
                  Hủy bỏ
                </button>
                <button
                  id="btn-confirm-save-session"
                  type="submit"
                  className="px-5 py-2 text-xs text-white bg-teal-605 hover:bg-teal-700 bg-teal-600 font-black rounded-xl transition-all border-none cursor-pointer"
                >
                  Xác nhận lưu 💾
                </button>
              </div>

            </form>

          </div>
        </div>
      )}

      {/* ═════════════════ SCHEDULE EXPORT MODAL ═════════════════ */}
      {showExportModal && (
        <div className="fixed inset-0 bg-slate-950/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-2xl w-full mx-auto overflow-hidden border border-slate-100 shadow-2xl animate-fade-in text-slate-800 flex flex-col max-h-[90vh]">
            
            {/* Header */}
            <div className="bg-slate-900 p-5 text-white flex justify-between items-center shrink-0">
              <div className="flex items-center gap-2">
                <Printer className="w-5 h-5 text-pink-500 animate-pulse" />
                <div>
                  <h4 className="font-extrabold text-sm tracking-wide uppercase">
                    Xuất Bản Sơ Đồ Lịch Trình & Tài Liệu In
                  </h4>
                  <p className="text-[11px] text-slate-300 mt-0.5">Xuất dữ liệu lịch trình chuẩn hóa sang tệp bảng tính CSV hoặc bản in PDF khoa học của Đại hội.</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowExportModal(false)}
                className="text-white hover:text-pink-500 transition p-1 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Content body */}
            <div className="p-6 overflow-y-auto space-y-6 flex-1 bg-slate-50">
              
              {/* Date Filter & Options selection */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                
                <div>
                  <label className="text-[10.5px] font-black text-slate-500 block mb-1.5 uppercase tracking-wide">
                    1. Chọn ngày xuất lịch trình
                  </label>
                  <select
                    value={selectedExportDate}
                    onChange={(e) => setSelectedExportDate(e.target.value)}
                    className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-bold cursor-pointer focus:border-indigo-500 focus:outline-none"
                  >
                    <option value="all">Tất cả các ngày ({displayDates.length} ngày)</option>
                    {displayDates.map(d => (
                      <option key={d} value={d}>Ngày {d}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="text-[10.5px] font-black text-slate-500 block mb-1.5 uppercase tracking-wide">
                    2. Phân loại cấu trúc in ấn
                  </label>
                  <span className="text-xs text-slate-505 leading-relaxed font-semibold pl-1 block">
                    Hệ thống sẽ tự động tổng hợp danh sách các phiên báo cáo và kết xuất bố cục tương ứng mẫu khoa học VSAPS.
                  </span>
                </div>

              </div>

              {/* Grid of export options */}
              <div>
                <label className="text-[10.5px] font-black text-slate-500 block mb-2.5 uppercase tracking-wide">
                  3. Lựa chọn định dạng xuất file
                </label>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  
                  {/* PDF option card */}
                  <button
                    type="button"
                    onClick={() => handleExportCustom('pdf', selectedExportDate)}
                    className="p-5 rounded-2xl border-2 border-indigo-100 hover:border-indigo-500 bg-white hover:bg-indigo-50/10 text-left transition-all group cursor-pointer flex gap-4"
                  >
                    <div className="p-3 bg-indigo-50 text-indigo-600 rounded-xl group-hover:bg-indigo-100 shrink-0 self-start">
                      <FileText className="w-6 h-6" />
                    </div>
                    <div>
                      <span className="font-extrabold text-slate-900 text-xs block mb-1">
                        BẢN IN PDF (TIÊU CHUẨN ĐẠI HỘI)
                      </span>
                      <p className="text-[10px] text-slate-450 leading-relaxed font-semibold">
                        • Định dạng tài liệu in ấn có quốc hiệu, con dấu đỏ thẩm duyệt.<br/>
                        • Thiết kế bảng phòng sảnh và phân múi giờ dễ nhìn.<br/>
                        • Thích hợp để BTC/Tiếp tân in ấn phân phát tại bàn CHECK-IN.
                      </p>
                      <span className="inline-flex items-center gap-1 text-[10.5px] text-indigo-600 font-bold mt-3 group-hover:underline">
                        <Download className="w-3.5 h-3.5" />
                        Tải Bản In PDF (HTML)
                      </span>
                    </div>
                  </button>

                  {/* CSV option card */}
                  <button
                    type="button"
                    onClick={() => handleExportCustom('csv', selectedExportDate)}
                    className="p-5 rounded-2xl border-2 border-emerald-100 hover:border-emerald-500 bg-white hover:bg-emerald-50/10 text-left transition-all group cursor-pointer flex gap-4"
                  >
                    <div className="p-3 bg-emerald-50 text-emerald-600 rounded-xl group-hover:bg-emerald-100 shrink-0 self-start">
                      <FileSpreadsheet className="w-6 h-6" />
                    </div>
                    <div>
                      <span className="font-extrabold text-slate-900 text-xs block mb-1">
                        BẢNG TÍNH EXCEL / CSV (DỮ LIỆU GỐC)
                      </span>
                      <p className="text-[10px] text-slate-450 leading-relaxed font-semibold">
                        • Định dạng thô ngăn tách bởi dấu phẩy phù hợp với Microsoft Excel.<br/>
                        • Đầy đủ các trường: Mã phiên, đề tài, báo cáo viên, phòng sảnh.<br/>
                        • Thích hợp để lưu trữ, lọc tự động hoặc đồng bộ với ứng dụng ngoài.
                      </p>
                      <span className="inline-flex items-center gap-1 text-[10.5px] text-emerald-600 font-bold mt-3 group-hover:underline">
                        <Download className="w-3.5 h-3.5" />
                        Tải Bảng tính Excel (.csv)
                      </span>
                    </div>
                  </button>

                </div>
              </div>

              {/* Visual mini-proof (live preview schematic) */}
              <div className="border border-slate-200 rounded-2xl bg-white p-5 pr-8 space-y-4 shadow-inner relative max-w-lg mx-auto select-none">
                
                {/* Stamp graphic overlay */}
                <div className="absolute right-6 top-10 border-2 border-rose-600/60 rounded-full w-16 h-16 flex items-center justify-center rotate-12 select-none pointer-events-none text-rose-600">
                  <div className="text-[6px] font-black text-center uppercase leading-none">
                    VSAPS 2026<br/>
                    ★ ĐÃ PHÊ DUYỆT ★
                  </div>
                </div>

                <div className="text-center space-y-1 scale-90">
                  <h6 className="text-[8px] font-black text-slate-500 uppercase tracking-widest leading-none">CỘNG HÒA XÃ HỘI CHỦ NGHĨA VIỆT NAM</h6>
                  <h6 className="text-[7px] font-bold text-slate-400 leading-none">Độc lập - Tự do - Hạnh phúc</h6>
                  <div className="w-12 h-0.5 bg-slate-200 mx-auto mt-0.5" />
                  <p className="text-[9px] font-black text-slate-800 uppercase mt-2 text-center">LỊCH TRÌNH PHÂN BỔ BÁO CÁO KHOA HỌC CHÍNH THỨC</p>
                </div>

                <div className="space-y-1.5 text-[8.5px] text-slate-450 font-medium">
                  <div className="border border-slate-100 p-1.5 rounded-lg flex justify-between bg-slate-50">
                    <span className="font-mono font-bold text-indigo-600">08:00 - 09:30</span>
                    <span className="font-bold text-slate-700">Hội trường 1: Live Surgery kỹ thuật cao</span>
                    <span className="text-slate-400">GS. Phạm Minh Chi</span>
                  </div>
                  <div className="border border-slate-100 p-1.5 rounded-lg flex justify-between bg-slate-50">
                    <span className="font-mono font-bold text-indigo-600">09:45 - 11:15</span>
                    <span className="font-bold text-slate-700">Hội trường 2: Laser Hands-On thẩm mỹ</span>
                    <span className="text-slate-400">PGS. Trần Hùng</span>
                  </div>
                </div>

                <span className="text-[9px] text-slate-400 italic block text-center font-bold">
                  * Trình duyệt sẽ mở hộp thoại in ấn ngay sau khi mở tệp tài liệu để in ra giấy A4/A3 sắc nét.
                </span>

              </div>

            </div>

            {/* Footer */}
            <div className="bg-slate-100 p-4 border-t border-slate-200 flex justify-end gap-2 shrink-0">
              <button
                type="button"
                onClick={() => setShowExportModal(false)}
                className="px-4 py-2 text-xs bg-slate-200 text-slate-705 border border-slate-300 font-bold rounded-xl hover:bg-slate-300 transition cursor-pointer"
              >
                Đóng
              </button>
            </div>

          </div>
        </div>
      )}

    </div>
  );
}
