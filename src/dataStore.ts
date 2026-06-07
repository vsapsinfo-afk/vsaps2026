/**
 * DataStore module connecting local memory/storage with Supabase
 * Handles CRUD operations, mappers, background loading, and Realtime sync.
 */
import {
  UserAccount,
  Attendee,
  SpeakerRegistration,
  ConferenceSession,
  Sponsor,
  InternalTask,
  FinanceTransaction,
  RegistrationPackage,
  ZaloConfig,
  EmailConfig,
  NotificationTemplate,
  SupabaseConfig,
  SentNotificationLog,
  SpecialtyTrack,
  BusinessConfig,
  EmbedScript,
  SepayConfig,
  WhatsappConfig,
} from './types';
import { supabase, isSupabaseConfigured, uploadToSupabaseStorage } from './lib/supabase';
import {
  mapAttendeeToDb, mapDbToAttendee,
  mapSpeakerToDb, mapDbToSpeaker,
  mapSponsorToDb, mapDbToSponsor,
  mapSessionToDb, mapDbToSession,
  mapTaskToDb, mapDbToTask,
  mapFinanceToDb, mapDbToFinance,
  mapPackageToDb, mapDbToPackage,
  mapUserToDb, mapDbToUser,
  mapTemplateToDb, mapDbToTemplate,
  mapNotifLogToDb, mapDbToNotifLog,
  mapTrackToDb, mapDbToTrack,
  mapBusinessConfigToDb, mapDbToBusinessConfig,
  mapEmbedScriptToDb, mapDbToEmbedScript
} from './lib/mappers';

// Empty fallbacks to remove mock data from source code
const INITIAL_TRACKS: SpecialtyTrack[] = [];
const INITIAL_PACKAGES: RegistrationPackage[] = [];
const INITIAL_USERS: UserAccount[] = [];
const INITIAL_ATTENDEES: Attendee[] = [];
const INITIAL_SPEAKERS: SpeakerRegistration[] = [];
const INITIAL_SESSIONS: ConferenceSession[] = [];
const INITIAL_SPONSORS: Sponsor[] = [];
const INITIAL_TASKS: InternalTask[] = [];
const INITIAL_FINANCE: FinanceTransaction[] = [];
const INITIAL_EMBED_SCRIPTS: EmbedScript[] = [];
const INITIAL_TEMPLATES: NotificationTemplate[] = [];

const DEFAULT_ZALO_CONFIG: ZaloConfig = {
  appId: '',
  secretKey: '',
  oaId: '',
  accessToken: '',
  refreshToken: '',
  accessTokenUpdatedAt: '',
  isConfigured: false,
  testPhone: '',
};

const DEFAULT_EMAIL_CONFIG: EmailConfig = {
  smtpHost: '',
  smtpPort: 587,
  smtpUser: '',
  smtpPass: '',
  senderName: '',
  senderEmail: '',
  isConfigured: false,
  testEmail: '',
};

const DEFAULT_WHATSAPP_CONFIG: WhatsappConfig = {
  accessToken: '',
  phoneNumberId: '',
  businessAccountId: '',
  isConfigured: false,
  testPhone: '',
};

const DEFAULT_BUSINESS_CONFIG: BusinessConfig = {
  appUrl: 'https://vsaps2026.vercel.app',
  eventName: "Hội nghị Khoa học Thường niên VSAPS 2026",
  organizerName: "Hội Phẫu thuật Tạo hình Thẩm mỹ Việt Nam (VSAPS)",
  eventDate: "Ngày 14 - 15 tháng 11 năm 2026",
  eventLocation: "Trung tâm Hội nghị Quốc gia, Hà Nội",
  maxRegistrations: 1500,
  requirePaymentProof: true,
  allowSelfCancellation: false,
  autoSendZns: true,
  requirePracticeCode: true,
  pwaName: "VSAPS 2026 - Hội Nghị Khoa Học Thẩm Mỹ",
  pwaShortName: "VSAPS 2026",
  pwaDescription: "Hệ thống quản lý Hội Nghị Khoa Học Thẩm Mỹ Quốc Tế Thường Niên VSAPS 2026",
  pwaLogoUrl: "/icons/icon-512.png",
  pwaThemeColor: "#4f46e5",
  pwaBackgroundColor: "#0f172a",
  delegateFormConfig: {
    isOpen: true,
    language: 'both',
    formTitle: "ĐĂNG KÝ ĐẠI BIỂU THAM DỰ HỘI NGHỊ THƯỜNG NIÊN VSAPS 2026",
    formDescription: "Cổng đăng ký điện tử dành cho đại biểu, bác sĩ thẩm mỹ trong nước & quốc tế. Điền chính xác thông tin để phát hành CME và thẻ đại biểu QR tự động.",
    organizerLabel: "HỘI PHẪU THUẬT TẠO HÌNH THẨM MỸ VIỆT NAM (VSAPS)",
    headerBgColor: "#042f2e",
    accentColor: "#fbbf24",
    closedMessage: "Cổng đăng ký đại biểu hiện đã đóng. Vui lòng liên hệ Ban tổ chức để biết thêm thông tin.",
    footerNote: "",
    maxEntries: 0,
    sectionLabels: {
      personalInfo:  { vi: "THÔNG TIN ĐẠI BIỂU ĐĂNG KÝ",      en: "DELEGATE PERSONAL INFORMATION" },
      scheduleAddOns:{ vi: "THỜI ĐIỂM & DỊCH VỤ PHỤ TRỢ TỰ CHỌN", en: "SCHEDULE & OPTIONAL ADD-ON SERVICES" },
      package:       { vi: "CHỌN GÓI ĐĂNG KÝ HỘI NGHỊ",         en: "CONFERENCE REGISTRATION PACKAGE" },
      payment:       { vi: "THÔNG TIN THANH TOÁN CHUYỂN KHOẢN",  en: "BANK TRANSFER PAYMENT DETAILS" },
    },
  },
  speakerFormConfig: {
    isOpen: true,
    language: 'both',
    formTitle: "ĐĂNG KÝ NỘP BÀI BÁO CÁO KHOA HỌC VSAPS 2026",
    formDescription: "Cổng nộp báo cáo khoa học dành cho báo cáo viên, chuyên gia trong và ngoài nước. Vui lòng đính kèm file tóm tắt abstract.",
    organizerLabel: "HỘI PHẪU THUẬT TẠO HÌNH THẨM MỸ VIỆT NAM (VSAPS)",
    headerBgColor: "#1e1b4b",
    accentColor: "#818cf8",
    closedMessage: "Cổng nộp bài báo cáo hiện đã đóng. Vui lòng liên hệ Ban thư ký khoa học.",
    footerNote: "",
    maxEntries: 0,
    sectionLabels: {
      speakerInfo:   { vi: "THÔNG TIN BÁO CÁO VIÊN",            en: "SPEAKER INFORMATION" },
      abstractInfo:  { vi: "NỘI DUNG ĐỀ TÀI ĐĂNG KÝ ĐỀ TRÌNH", en: "ABSTRACT & PRESENTATION DETAILS" },
    },
  },
  sponsorFormConfig: {
    isOpen: true,
    language: 'both',
    formTitle: "ĐĂNG KÝ NHÀ TÀI TRỢ & ĐỐI TÁC VSAPS 2026",
    formDescription: "Đăng ký hợp tác tài trợ chính thức cho Hội nghị Khoa học Thẩm mỹ thường niên VSAPS 2026. Ban tổ chức sẽ liên hệ xác nhận trong 24h.",
    organizerLabel: "HỘI PHẪU THUẬT TẠO HÌNH THẨM MỸ VIỆT NAM (VSAPS)",
    headerBgColor: "#1c1917",
    accentColor: "#f59e0b",
    closedMessage: "Cổng đăng ký tài trợ hiện đã đóng. Vui lòng liên hệ Ban tổ chức.",
    footerNote: "",
    maxEntries: 0,
    sectionLabels: {
      sponsorProfile: { vi: "THÔNG TIN DOANH NGHIỆP TÀI TRỢ",  en: "SPONSOR / COMPANY PROFILE" },
      tierSelect:     { vi: "CHỌN GÓI TÀI TRỢ",                 en: "SPONSORSHIP PACKAGE SELECTION" },
    },
  },
};

const DEFAULT_SEPAY_CONFIG: SepayConfig = {
  apiToken: '',
  accountNumber: '',
  bankCode: 'VCB',
  bankAccountNo: '',
  accountName: '',
  isEnabled: false,
  webhookSecret: '',
};

export class DataStore {
  // Local storage keys
  private static KEY_ATTENDEES = 'vsaps_attendees';
  private static KEY_SPEAKERS = 'vsaps_speakers';
  private static KEY_SESSIONS = 'vsaps_sessions';
  private static KEY_SPONSORS = 'vsaps_sponsors';
  private static KEY_TASKS = 'vsaps_tasks';
  private static KEY_FINANCE = 'vsaps_finance';
  private static KEY_USERS = 'vsaps_users';
  private static KEY_PACKAGES = 'vsaps_packages';
  private static KEY_ZALO = 'vsaps_config_zalo';
  private static KEY_EMAIL = 'vsaps_config_email';
  private static KEY_TEMPLATES = 'vsaps_templates';
  private static KEY_SUPABASE = 'vsaps_supabase';
  private static KEY_NOTIFICATION_LOGS = 'vsaps_notification_logs';
  private static KEY_SPECIALTY_TRACKS = 'vsaps_specialty_tracks';
  private static KEY_BUSINESS_CONFIG = 'vsaps_business_config';
  private static KEY_EMBED_SCRIPTS = 'vsaps_embed_scripts';
  private static KEY_SEPAY = 'vsaps_config_sepay';
  private static KEY_WHATSAPP = 'vsaps_config_whatsapp';

  // In-memory cache
  private attendees: Attendee[] = [];
  private speakers: SpeakerRegistration[] = [];
  private sessions: ConferenceSession[] = [];
  private sponsors: Sponsor[] = [];
  private tasks: InternalTask[] = [];
  private finance: FinanceTransaction[] = [];
  private users: UserAccount[] = [];
  private packages: RegistrationPackage[] = [];
  private zaloConfig: ZaloConfig = DEFAULT_ZALO_CONFIG;
  private emailConfig: EmailConfig = DEFAULT_EMAIL_CONFIG;
  private whatsappConfig: WhatsappConfig = DEFAULT_WHATSAPP_CONFIG;
  private templates: NotificationTemplate[] = [];
  private supabaseConfig: SupabaseConfig = { url: '', anonKey: '', isConnected: false };
  private notificationLogs: SentNotificationLog[] = [];
  private specialtyTracks: SpecialtyTrack[] = [];
  private businessConfig: BusinessConfig = DEFAULT_BUSINESS_CONFIG;
  private embedScripts: EmbedScript[] = [];
  private sepayConfig: SepayConfig = DEFAULT_SEPAY_CONFIG;

  constructor() {
    this.loadLocalStorage();
    this.initializeSupabase();
    this.setupRealtimeSubscriptions();

    // Re-initialize Supabase data cache when the authentication session changes (e.g. user logs in)
    if (isSupabaseConfigured()) {
      supabase.auth.onAuthStateChange((event) => {
        if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED') {
          console.log(`🔑 Auth event: ${event}. Re-initializing Supabase data cache...`);
          this.initializeSupabase();
        }
      });
    }
  }

  /**
   * Load initial data from localStorage for offline cache
   */
  private loadLocalStorage() {
    this.attendees = this.getLocalStorage(DataStore.KEY_ATTENDEES, INITIAL_ATTENDEES);
    this.speakers = this.getLocalStorage(DataStore.KEY_SPEAKERS, INITIAL_SPEAKERS);
    this.sessions = this.getLocalStorage(DataStore.KEY_SESSIONS, INITIAL_SESSIONS);
    this.sponsors = this.getLocalStorage(DataStore.KEY_SPONSORS, INITIAL_SPONSORS);
    this.tasks = this.getLocalStorage(DataStore.KEY_TASKS, INITIAL_TASKS);
    this.finance = this.getLocalStorage(DataStore.KEY_FINANCE, INITIAL_FINANCE);
    this.users = this.getLocalStorage(DataStore.KEY_USERS, INITIAL_USERS);
    this.packages = this.getLocalStorage(DataStore.KEY_PACKAGES, INITIAL_PACKAGES);
    
    this.zaloConfig = this.getLocalStorage(DataStore.KEY_ZALO, DEFAULT_ZALO_CONFIG);
    this.emailConfig = this.getLocalStorage(DataStore.KEY_EMAIL, DEFAULT_EMAIL_CONFIG);
    this.templates = this.getLocalStorage(DataStore.KEY_TEMPLATES, INITIAL_TEMPLATES);
    this.supabaseConfig = this.getLocalStorage(DataStore.KEY_SUPABASE, { url: '', anonKey: '', isConnected: false });
    this.notificationLogs = this.getLocalStorage(DataStore.KEY_NOTIFICATION_LOGS, []);
    this.specialtyTracks = this.getLocalStorage(DataStore.KEY_SPECIALTY_TRACKS, INITIAL_TRACKS);
    const savedConfig = this.getLocalStorage(DataStore.KEY_BUSINESS_CONFIG, DEFAULT_BUSINESS_CONFIG);
    this.businessConfig = {
      ...DEFAULT_BUSINESS_CONFIG,
      ...savedConfig,
      delegateFormConfig: savedConfig.delegateFormConfig || DEFAULT_BUSINESS_CONFIG.delegateFormConfig,
      speakerFormConfig: savedConfig.speakerFormConfig || DEFAULT_BUSINESS_CONFIG.speakerFormConfig,
      sponsorFormConfig: savedConfig.sponsorFormConfig || DEFAULT_BUSINESS_CONFIG.sponsorFormConfig,
    };
    
    // Auto-migrate old/empty appUrl
    if (!this.businessConfig.appUrl || this.businessConfig.appUrl.includes('vsaps2026-delta.vercel.app')) {
      this.businessConfig.appUrl = 'https://vsaps2026.vercel.app';
      this.saveToLocalStorage(DataStore.KEY_BUSINESS_CONFIG, this.businessConfig);
    }
    this.embedScripts = this.getLocalStorage(DataStore.KEY_EMBED_SCRIPTS, INITIAL_EMBED_SCRIPTS);
    this.sepayConfig = this.getLocalStorage(DataStore.KEY_SEPAY, DEFAULT_SEPAY_CONFIG);
    this.whatsappConfig = this.getLocalStorage(DataStore.KEY_WHATSAPP, DEFAULT_WHATSAPP_CONFIG);
  }

  /**
   * Load data asynchronously from Supabase if configured
   */
  async initializeSupabase() {
    if (!isSupabaseConfigured()) {
      this.supabaseConfig.isConnected = false;
      this.saveToLocalStorage(DataStore.KEY_SUPABASE, this.supabaseConfig);
      return;
    }

    try {
      this.supabaseConfig.isConnected = true;
      this.supabaseConfig.url = import.meta.env.VITE_SUPABASE_URL || '';
      this.supabaseConfig.anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || '';
      this.saveToLocalStorage(DataStore.KEY_SUPABASE, this.supabaseConfig);

      console.log('⚡ Connected to Supabase. Synchronizing caches...');

      // Run parallel fetches for performance
      const [
        { data: pkgs },
        { data: tracks },
        { data: bConfig },
        { data: users },
        { data: sessions },
        { data: attendees },
        { data: speakers },
        { data: sponsors },
        { data: tasks },
        { data: finance },
        { data: templates },
        { data: logs },
        { data: scripts },
        { data: configs },
      ] = await Promise.all([
        supabase.from('packages').select('*'),
        supabase.from('specialty_tracks').select('*'),
        supabase.from('business_config').select('*').eq('id', 'default').maybeSingle(),
        supabase.from('user_accounts').select('*'),
        supabase.from('sessions').select('*'),
        supabase.from('attendees').select('*'),
        supabase.from('speakers').select('*'),
        supabase.from('sponsors').select('*'),
        supabase.from('internal_tasks').select('*'),
        supabase.from('finance_transactions').select('*'),
        supabase.from('notification_templates').select('*'),
        supabase.from('notification_logs').select('*'),
        supabase.from('embed_scripts').select('*'),
        supabase.from('system_config').select('*'),
      ]);

      if (pkgs) {
        this.packages = pkgs.map(mapDbToPackage);
        this.saveToLocalStorage(DataStore.KEY_PACKAGES, this.packages);
      }
      if (tracks) {
        this.specialtyTracks = tracks.map(mapDbToTrack);
        this.saveToLocalStorage(DataStore.KEY_SPECIALTY_TRACKS, this.specialtyTracks);
      }
      if (bConfig) {
        const dbConfig = mapDbToBusinessConfig(bConfig);
        this.businessConfig = {
          ...DEFAULT_BUSINESS_CONFIG,
          ...dbConfig,
          delegateFormConfig: dbConfig.delegateFormConfig || DEFAULT_BUSINESS_CONFIG.delegateFormConfig,
          speakerFormConfig: dbConfig.speakerFormConfig || DEFAULT_BUSINESS_CONFIG.speakerFormConfig,
          sponsorFormConfig: dbConfig.sponsorFormConfig || DEFAULT_BUSINESS_CONFIG.sponsorFormConfig,
        };
        
        // Auto-migrate old/empty appUrl
        if (!this.businessConfig.appUrl || this.businessConfig.appUrl.includes('vsaps2026-delta.vercel.app')) {
          this.businessConfig.appUrl = 'https://vsaps2026.vercel.app';
          this.saveToLocalStorage(DataStore.KEY_BUSINESS_CONFIG, this.businessConfig);
          // Sync it back to Supabase as well
          this.saveBusinessConfig(this.businessConfig);
        } else {
          this.saveToLocalStorage(DataStore.KEY_BUSINESS_CONFIG, this.businessConfig);
        }
      }
      if (users) {
        this.users = users.map(mapDbToUser);
        this.saveToLocalStorage(DataStore.KEY_USERS, this.users);
      }
      if (sessions) {
        this.sessions = sessions.map(mapDbToSession);
        this.saveToLocalStorage(DataStore.KEY_SESSIONS, this.sessions);
      }
      if (attendees) {
        this.attendees = attendees.map(mapDbToAttendee);
        this.saveToLocalStorage(DataStore.KEY_ATTENDEES, this.attendees);
      }
      if (speakers) {
        this.speakers = speakers.map(mapDbToSpeaker);
        this.saveToLocalStorage(DataStore.KEY_SPEAKERS, this.speakers);
      }
      if (sponsors) {
        this.sponsors = sponsors.map(mapDbToSponsor);
        this.saveToLocalStorage(DataStore.KEY_SPONSORS, this.sponsors);
      }
      if (tasks) {
        this.tasks = tasks.map(mapDbToTask);
        this.saveToLocalStorage(DataStore.KEY_TASKS, this.tasks);
      }
      if (finance) {
        this.finance = finance.map(mapDbToFinance);
        this.saveToLocalStorage(DataStore.KEY_FINANCE, this.finance);
      }
      if (templates) {
        this.templates = templates.map(mapDbToTemplate);
        this.saveToLocalStorage(DataStore.KEY_TEMPLATES, this.templates);
      }
      if (logs) {
        this.notificationLogs = logs.map(mapDbToNotifLog);
        this.saveToLocalStorage(DataStore.KEY_NOTIFICATION_LOGS, this.notificationLogs);
      }
      if (scripts) {
        this.embedScripts = scripts.map(mapDbToEmbedScript);
        this.saveToLocalStorage(DataStore.KEY_EMBED_SCRIPTS, this.embedScripts);
      }
      if (configs) {
        const zalo = configs.find(c => c.key === 'zalo_config');
        if (zalo) {
          this.zaloConfig = zalo.value;
          this.saveToLocalStorage(DataStore.KEY_ZALO, this.zaloConfig);
        }
        const email = configs.find(c => c.key === 'email_config');
        if (email) {
          this.emailConfig = email.value;
          this.saveToLocalStorage(DataStore.KEY_EMAIL, this.emailConfig);
        }
        const whatsapp = configs.find(c => c.key === 'whatsapp_config');
        if (whatsapp) {
          this.whatsappConfig = whatsapp.value;
          this.saveToLocalStorage(DataStore.KEY_WHATSAPP, this.whatsappConfig);
        }
        const sepay = configs.find(c => c.key === 'sepay_config');
        if (sepay) {
          this.sepayConfig = sepay.value;
          this.saveToLocalStorage(DataStore.KEY_SEPAY, this.sepayConfig);
        }
      }

      console.log('✅ Supabase cache synchronization complete!');
      window.dispatchEvent(new CustomEvent('store-loaded'));
    } catch (e) {
      console.error('Failed to sync with Supabase:', e);
    }
  }

  /**
   * Listen for real-time table modifications using Supabase WebSockets
   */
  private setupRealtimeSubscriptions() {
    if (!isSupabaseConfigured()) return;

    // Listen to attendees table updates
    supabase.channel('db-attendees')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'attendees' }, (payload) => {
        const { eventType, new: newRow, old: oldRow } = payload;
        if (eventType === 'INSERT' || eventType === 'UPDATE') {
          const attendee = mapDbToAttendee(newRow);
          const idx = this.attendees.findIndex(a => a.id === attendee.id);
          if (idx >= 0) this.attendees[idx] = attendee;
          else this.attendees.push(attendee);
        } else if (eventType === 'DELETE') {
          this.attendees = this.attendees.filter(a => a.id !== oldRow.id);
        }
        this.saveToLocalStorage(DataStore.KEY_ATTENDEES, this.attendees);
        window.dispatchEvent(new CustomEvent('store-updated', { detail: { table: 'attendees' } }));
      })
      .subscribe();

    // Listen to sessions table updates
    supabase.channel('db-sessions')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'sessions' }, (payload) => {
        const { eventType, new: newRow, old: oldRow } = payload;
        if (eventType === 'INSERT' || eventType === 'UPDATE') {
          const session = mapDbToSession(newRow);
          const idx = this.sessions.findIndex(s => s.id === session.id);
          if (idx >= 0) this.sessions[idx] = session;
          else this.sessions.push(session);
        } else if (eventType === 'DELETE') {
          this.sessions = this.sessions.filter(s => s.id !== oldRow.id);
        }
        this.saveToLocalStorage(DataStore.KEY_SESSIONS, this.sessions);
        window.dispatchEvent(new CustomEvent('store-updated', { detail: { table: 'sessions' } }));
      })
      .subscribe();

    // Listen to internal tasks table updates
    supabase.channel('db-tasks')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'internal_tasks' }, (payload) => {
        const { eventType, new: newRow, old: oldRow } = payload;
        if (eventType === 'INSERT' || eventType === 'UPDATE') {
          const task = mapDbToTask(newRow);
          const idx = this.tasks.findIndex(t => t.id === task.id);
          if (idx >= 0) this.tasks[idx] = task;
          else this.tasks.push(task);
        } else if (eventType === 'DELETE') {
          this.tasks = this.tasks.filter(t => t.id !== oldRow.id);
        }
        this.saveToLocalStorage(DataStore.KEY_TASKS, this.tasks);
        window.dispatchEvent(new CustomEvent('store-updated', { detail: { table: 'internal_tasks' } }));
      })
      .subscribe();

    // Listen to finance transactions table updates
    supabase.channel('db-finance')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'finance_transactions' }, (payload) => {
        const { eventType, new: newRow, old: oldRow } = payload;
        if (eventType === 'INSERT' || eventType === 'UPDATE') {
          const fn = mapDbToFinance(newRow);
          const idx = this.finance.findIndex(f => f.id === fn.id);
          if (idx >= 0) this.finance[idx] = fn;
          else this.finance.unshift(fn);
        } else if (eventType === 'DELETE') {
          this.finance = this.finance.filter(f => f.id !== oldRow.id);
        }
        this.saveToLocalStorage(DataStore.KEY_FINANCE, this.finance);
        window.dispatchEvent(new CustomEvent('store-updated', { detail: { table: 'finance_transactions' } }));
      })
      .subscribe();

    // Listen to packages table updates
    supabase.channel('db-packages')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'packages' }, (payload) => {
        const { eventType, new: newRow, old: oldRow } = payload;
        if (eventType === 'INSERT' || eventType === 'UPDATE') {
          const pkg = mapDbToPackage(newRow);
          const idx = this.packages.findIndex(p => p.id === pkg.id);
          if (idx >= 0) this.packages[idx] = pkg;
          else this.packages.push(pkg);
        } else if (eventType === 'DELETE') {
          this.packages = this.packages.filter(p => p.id !== oldRow.id);
        }
        this.saveToLocalStorage(DataStore.KEY_PACKAGES, this.packages);
        window.dispatchEvent(new CustomEvent('store-updated', { detail: { table: 'packages' } }));
      })
      .subscribe();
  }

  private getLocalStorage<T>(key: string, defaultValue: T): T {
    const data = localStorage.getItem(key);
    if (!data) {
      localStorage.setItem(key, JSON.stringify(defaultValue));
      return defaultValue;
    }
    try {
      return JSON.parse(data) as T;
    } catch {
      return defaultValue;
    }
  }

  private saveToLocalStorage(key: string, data: any) {
    localStorage.setItem(key, JSON.stringify(data));
  }

  // ==========================================
  // GETTERS & ACTION SETTERS (Offline-First)
  // ==========================================

  getAttendees() { return this.attendees; }
  saveAttendee(attendee: Attendee) {
    const idx = this.attendees.findIndex(a => a.id === attendee.id);
    const isNew = idx < 0;
    if (!isNew) {
      this.attendees[idx] = attendee;
    } else {
      this.attendees.push(attendee);
    }
    this.saveToLocalStorage(DataStore.KEY_ATTENDEES, this.attendees);

    // Sync to Supabase in the background
    if (isSupabaseConfigured()) {
      (async () => {
        try {
          let updatedAttendee = { ...attendee };
          let changed = false;

          // 1. Upload avatar if it's base64
          if (attendee.avatarUrl && attendee.avatarUrl.startsWith('data:')) {
            const ext = attendee.avatarUrl.split(';')[0].split('/')[1] || 'png';
            const path = `avatars/${attendee.id}-${Date.now()}.${ext}`;
            const publicUrl = await uploadToSupabaseStorage(path, attendee.avatarUrl);
            if (publicUrl) {
              updatedAttendee.avatarUrl = publicUrl;
              changed = true;
            }
          }

          // 2. Upload proof if it's base64
          if (attendee.transactionProofUrl && attendee.transactionProofUrl.startsWith('data:')) {
            const ext = attendee.transactionProofUrl.split(';')[0].split('/')[1] || 'png';
            const path = `proofs/${attendee.id}-${Date.now()}.${ext}`;
            const publicUrl = await uploadToSupabaseStorage(path, attendee.transactionProofUrl);
            if (publicUrl) {
              updatedAttendee.transactionProofUrl = publicUrl;
              changed = true;
            }
          }

          // Update local memory and storage to reflect clean storage URLs
          if (changed) {
            const idxMemory = this.attendees.findIndex(a => a.id === attendee.id);
            if (idxMemory >= 0) {
              this.attendees[idxMemory] = updatedAttendee;
              this.saveToLocalStorage(DataStore.KEY_ATTENDEES, this.attendees);
            }
          }

          const dbRecord = mapAttendeeToDb(updatedAttendee);
          // Prevent foreign key violation if packages table is unseeded on live DB
          const packageExists = this.packages.some(p => p.id === updatedAttendee.packageId);
          if (!packageExists) {
            dbRecord.package_id = null;
          }
          const query = isNew 
            ? supabase.from('attendees').insert(dbRecord)
            : supabase.from('attendees').upsert(dbRecord);
            
          const { error } = await query;
          if (error) console.error(`Error ${isNew ? 'inserting' : 'upserting'} attendee to Supabase:`, error);
        } catch (err) {
          console.error('Error during background upload/sync of attendee:', err);
        }
      })();
    }
    
    // Auto-create an income transaction if paid
    if (attendee.paymentStatus === 'paid' && !this.finance.find(f => f.referenceId === attendee.id)) {
      this.addFinancialRecord({
        id: 'TXN-' + Math.floor(Math.random() * 90000 + 10000),
        date: new Date().toISOString().replace('T', ' ').substring(0, 16),
        type: 'income',
        category: 'Gói đại biểu',
        amount: attendee.packageFee,
        description: `Phí đăng ký Gói ${attendee.packageName} đại biểu ${attendee.fullName}`,
        referenceId: attendee.id,
        paymentMethod: attendee.paymentMethod === 'bank_transfer' ? 'Chuyển khoản Ngân hàng' : 'Thanh toán Thẻ',
        verifiedBy: 'Hệ thống tự động',
        isVerified: true,
      });
    }
    return attendee;
  }

  async saveAttendeeAsync(attendee: Attendee): Promise<Attendee> {
    const idx = this.attendees.findIndex(a => a.id === attendee.id);
    const isNew = idx < 0;
    if (!isNew) {
      this.attendees[idx] = attendee;
    } else {
      this.attendees.push(attendee);
    }
    this.saveToLocalStorage(DataStore.KEY_ATTENDEES, this.attendees);

    let updatedAttendee = { ...attendee };

    if (isSupabaseConfigured()) {
      try {
        let changed = false;

        // 1. Upload avatar if it's base64
        if (attendee.avatarUrl && attendee.avatarUrl.startsWith('data:')) {
          const ext = attendee.avatarUrl.split(';')[0].split('/')[1] || 'png';
          const path = `avatars/${attendee.id}-${Date.now()}.${ext}`;
          const publicUrl = await uploadToSupabaseStorage(path, attendee.avatarUrl);
          if (publicUrl) {
            updatedAttendee.avatarUrl = publicUrl;
            changed = true;
          }
        }

        // 2. Upload proof if it's base64
        if (attendee.transactionProofUrl && attendee.transactionProofUrl.startsWith('data:')) {
          const ext = attendee.transactionProofUrl.split(';')[0].split('/')[1] || 'png';
          const path = `proofs/${attendee.id}-${Date.now()}.${ext}`;
          const publicUrl = await uploadToSupabaseStorage(path, attendee.transactionProofUrl);
          if (publicUrl) {
            updatedAttendee.transactionProofUrl = publicUrl;
            changed = true;
          }
        }

        if (changed) {
          const idxMemory = this.attendees.findIndex(a => a.id === attendee.id);
          if (idxMemory >= 0) {
            this.attendees[idxMemory] = updatedAttendee;
            this.saveToLocalStorage(DataStore.KEY_ATTENDEES, this.attendees);
          }
        }

        const dbRecord = mapAttendeeToDb(updatedAttendee);
        // Prevent foreign key violation if packages table is unseeded on live DB
        const packageExists = this.packages.some(p => p.id === updatedAttendee.packageId);
        if (!packageExists) {
          dbRecord.package_id = null;
        }
        const query = isNew 
          ? supabase.from('attendees').insert(dbRecord)
          : supabase.from('attendees').upsert(dbRecord);
          
        const { error } = await query;
        if (error) {
          console.error(`Error ${isNew ? 'inserting' : 'upserting'} attendee to Supabase:`, error);
          throw error;
        }
      } catch (err) {
        console.error('Error during database sync of attendee:', err);
        throw err;
      }
    }
    
    // Auto-create an income transaction if paid
    if (updatedAttendee.paymentStatus === 'paid' && !this.finance.find(f => f.referenceId === updatedAttendee.id)) {
      this.addFinancialRecord({
        id: 'TXN-' + Math.floor(Math.random() * 90000 + 10000),
        date: new Date().toISOString().replace('T', ' ').substring(0, 16),
        type: 'income',
        category: 'Gói đại biểu',
        amount: updatedAttendee.packageFee,
        description: `Phí đăng ký Gói ${updatedAttendee.packageName} đại biểu ${updatedAttendee.fullName}`,
        referenceId: updatedAttendee.id,
        paymentMethod: updatedAttendee.paymentMethod === 'bank_transfer' ? 'Chuyển khoản Ngân hàng' : 'Thanh toán Thẻ',
        verifiedBy: 'Hệ thống tự động',
        isVerified: true,
      });
    }
    return updatedAttendee;
  }

  deleteAttendee(id: string) {
    this.attendees = this.attendees.filter(a => a.id !== id);
    this.saveToLocalStorage(DataStore.KEY_ATTENDEES, this.attendees);

    if (isSupabaseConfigured()) {
      supabase.from('attendees').delete().eq('id', id).then(({ error }) => {
        if (error) console.error('Error deleting attendee from Supabase:', error);
      });
    }
  }

  /**
   * Cập nhật một số trường cụ thể của attendee (patch update).
   * Dùng cho SePay auto-confirm payment status.
   */
  async updateAttendeeField(id: string, fields: Partial<{
    payment_status: string;
    notes: string;
    payment_method: string;
  }>): Promise<void> {
    // Update in local cache
    const idx = this.attendees.findIndex(a => a.id === id);
    if (idx >= 0) {
      if (fields.payment_status) this.attendees[idx].paymentStatus = fields.payment_status as any;
      if (fields.notes) this.attendees[idx].notes = fields.notes;
      if (fields.payment_method) this.attendees[idx].paymentMethod = fields.payment_method as any;
      this.saveToLocalStorage(DataStore.KEY_ATTENDEES, this.attendees);
    }

    // Update in Supabase
    if (isSupabaseConfigured()) {
      const { error } = await supabase.from('attendees').update(fields).eq('id', id);
      if (error) console.error('SePay: updateAttendeeField Supabase error:', error);
    }
  }

  // Speakers
  getSpeakers() { return this.speakers; }
  saveSpeaker(speaker: SpeakerRegistration) {
    const idx = this.speakers.findIndex(s => s.id === speaker.id);
    const isNew = idx < 0;
    if (!isNew) {
      this.speakers[idx] = speaker;
    } else {
      this.speakers.push(speaker);
    }
    this.saveToLocalStorage(DataStore.KEY_SPEAKERS, this.speakers);

    if (isSupabaseConfigured()) {
      (async () => {
        try {
          let updatedSpeaker = { ...speaker };
          let changed = false;

          if (speaker.avatarUrl && speaker.avatarUrl.startsWith('data:')) {
            const ext = speaker.avatarUrl.split(';')[0].split('/')[1] || 'png';
            const path = `avatars/${speaker.id}-${Date.now()}.${ext}`;
            const publicUrl = await uploadToSupabaseStorage(path, speaker.avatarUrl);
            if (publicUrl) {
              updatedSpeaker.avatarUrl = publicUrl;
              changed = true;
            }
          }

          if (changed) {
            const idxMemory = this.speakers.findIndex(s => s.id === speaker.id);
            if (idxMemory >= 0) {
              this.speakers[idxMemory] = updatedSpeaker;
              this.saveToLocalStorage(DataStore.KEY_SPEAKERS, this.speakers);
            }
          }

          const dbRecord = mapSpeakerToDb(updatedSpeaker);
          // Prevent foreign key violation if sessions table does not contain referenced ID
          const sessionExists = this.sessions.some(s => s.id === updatedSpeaker.scheduledSessionId);
          if (!sessionExists) {
            dbRecord.scheduled_session_id = null;
          }
          const query = isNew
            ? supabase.from('speakers').insert(dbRecord)
            : supabase.from('speakers').upsert(dbRecord);

          const { error } = await query;
          if (error) console.error(`Error ${isNew ? 'inserting' : 'upserting'} speaker to Supabase:`, error);
        } catch (err) {
          console.error('Error during background upload/sync of speaker:', err);
        }
      })();
    }
    return speaker;
  }

  async saveSpeakerAsync(speaker: SpeakerRegistration): Promise<SpeakerRegistration> {
    const idx = this.speakers.findIndex(s => s.id === speaker.id);
    const isNew = idx < 0;
    if (!isNew) {
      this.speakers[idx] = speaker;
    } else {
      this.speakers.push(speaker);
    }
    this.saveToLocalStorage(DataStore.KEY_SPEAKERS, this.speakers);

    let updatedSpeaker = { ...speaker };

    if (isSupabaseConfigured()) {
      try {
        let changed = false;

        if (speaker.avatarUrl && speaker.avatarUrl.startsWith('data:')) {
          const ext = speaker.avatarUrl.split(';')[0].split('/')[1] || 'png';
          const path = `avatars/${speaker.id}-${Date.now()}.${ext}`;
          const publicUrl = await uploadToSupabaseStorage(path, speaker.avatarUrl);
          if (publicUrl) {
            updatedSpeaker.avatarUrl = publicUrl;
            changed = true;
          }
        }

        if (changed) {
          const idxMemory = this.speakers.findIndex(s => s.id === speaker.id);
          if (idxMemory >= 0) {
            this.speakers[idxMemory] = updatedSpeaker;
            this.saveToLocalStorage(DataStore.KEY_SPEAKERS, this.speakers);
          }
        }

        const dbRecord = mapSpeakerToDb(updatedSpeaker);
        // Prevent foreign key violation if sessions table does not contain referenced ID
        const sessionExists = this.sessions.some(s => s.id === updatedSpeaker.scheduledSessionId);
        if (!sessionExists) {
          dbRecord.scheduled_session_id = null;
        }
        const query = isNew
          ? supabase.from('speakers').insert(dbRecord)
          : supabase.from('speakers').upsert(dbRecord);

        const { error } = await query;
        if (error) {
          console.error(`Error ${isNew ? 'inserting' : 'upserting'} speaker to Supabase:`, error);
          throw error;
        }
      } catch (err) {
        console.error('Error during database sync of speaker:', err);
        throw err;
      }
    }
    return updatedSpeaker;
  }

  deleteSpeaker(id: string) {
    this.speakers = this.speakers.filter(s => s.id !== id);
    this.saveToLocalStorage(DataStore.KEY_SPEAKERS, this.speakers);

    if (isSupabaseConfigured()) {
      supabase.from('speakers').delete().eq('id', id).then(({ error }) => {
        if (error) console.error('Error deleting speaker from Supabase:', error);
      });
    }
  }

  // Specialty Tracks
  getSpecialtyTracks() { return this.specialtyTracks; }
  saveSpecialtyTrack(track: SpecialtyTrack) {
    const idx = this.specialtyTracks.findIndex(t => t.id === track.id);
    if (idx >= 0) {
      this.specialtyTracks[idx] = track;
    } else {
      this.specialtyTracks.push(track);
    }
    this.saveToLocalStorage(DataStore.KEY_SPECIALTY_TRACKS, this.specialtyTracks);

    if (isSupabaseConfigured()) {
      supabase.from('specialty_tracks').upsert(mapTrackToDb(track)).then(({ error }) => {
        if (error) console.error('Error syncing track to Supabase:', error);
      });
    }
    return track;
  }

  deleteSpecialtyTrack(id: string) {
    this.specialtyTracks = this.specialtyTracks.filter(t => t.id !== id);
    this.saveToLocalStorage(DataStore.KEY_SPECIALTY_TRACKS, this.specialtyTracks);

    if (isSupabaseConfigured()) {
      supabase.from('specialty_tracks').delete().eq('id', id).then(({ error }) => {
        if (error) console.error('Error deleting track from Supabase:', error);
      });
    }
  }

  // Sessions
  getSessions() { return this.sessions; }
  setSessions(sessions: ConferenceSession[]) {
    this.sessions = sessions;
    this.saveToLocalStorage(DataStore.KEY_SESSIONS, this.sessions);

    if (isSupabaseConfigured()) {
      // Bulk upsert sessions
      const mapped = sessions.map(mapSessionToDb);
      supabase.from('sessions').upsert(mapped).then(({ error }) => {
        if (error) console.error('Error bulk syncing sessions to Supabase:', error);
      });
    }
  }

  saveSession(session: ConferenceSession) {
    const idx = this.sessions.findIndex(s => s.id === session.id);
    if (idx >= 0) {
      this.sessions[idx] = session;
    } else {
      this.sessions.push(session);
    }
    this.saveToLocalStorage(DataStore.KEY_SESSIONS, this.sessions);

    if (isSupabaseConfigured()) {
      supabase.from('sessions').upsert(mapSessionToDb(session)).then(({ error }) => {
        if (error) console.error('Error syncing session to Supabase:', error);
      });
    }
    return session;
  }

  deleteSession(id: string) {
    this.sessions = this.sessions.filter(s => s.id !== id);
    this.saveToLocalStorage(DataStore.KEY_SESSIONS, this.sessions);

    if (isSupabaseConfigured()) {
      supabase.from('sessions').delete().eq('id', id).then(({ error }) => {
        if (error) console.error('Error deleting session from Supabase:', error);
      });
    }
  }

  // Sponsors
  getSponsors() { return this.sponsors; }
  saveSponsor(sponsor: Sponsor) {
    const idx = this.sponsors.findIndex(s => s.id === sponsor.id);
    const isNew = idx < 0;
    if (!isNew) {
      this.sponsors[idx] = sponsor;
    } else {
      this.sponsors.push(sponsor);
    }
    this.saveToLocalStorage(DataStore.KEY_SPONSORS, this.sponsors);

    if (isSupabaseConfigured()) {
      (async () => {
        try {
          let updatedSponsor = { ...sponsor };
          let changed = false;

          if (sponsor.logoUrl && sponsor.logoUrl.startsWith('data:')) {
            const ext = sponsor.logoUrl.split(';')[0].split('/')[1] || 'png';
            const path = `logos/${sponsor.id}-${Date.now()}.${ext}`;
            const publicUrl = await uploadToSupabaseStorage(path, sponsor.logoUrl);
            if (publicUrl) {
              updatedSponsor.logoUrl = publicUrl;
              changed = true;
            }
          }

          if (changed) {
            const idxMemory = this.sponsors.findIndex(s => s.id === sponsor.id);
            if (idxMemory >= 0) {
              this.sponsors[idxMemory] = updatedSponsor;
              this.saveToLocalStorage(DataStore.KEY_SPONSORS, this.sponsors);
            }
          }

          const dbRecord = mapSponsorToDb(updatedSponsor);
          const query = isNew
            ? supabase.from('sponsors').insert(dbRecord)
            : supabase.from('sponsors').upsert(dbRecord);

          const { error } = await query;
          if (error) console.error(`Error ${isNew ? 'inserting' : 'upserting'} sponsor to Supabase:`, error);
        } catch (err) {
          console.error('Error during background upload/sync of sponsor:', err);
        }
      })();
    }

    // Auto-create or update sponsor income transaction
    if (sponsor.paidAmount > 0) {
      const financeIdMatch = 'TXN-SPN-' + sponsor.id;
      const existingTx = this.finance.find(f => f.referenceId === financeIdMatch);
      if (existingTx) {
        existingTx.amount = sponsor.paidAmount;
        existingTx.description = `Nhà tài trợ ${sponsor.name} đóng góp thực tế`;
        this.saveFinancialRecord(existingTx);
      } else {
        this.addFinancialRecord({
          id: 'TXN-' + Math.floor(Math.random() * 90000 + 10000),
          date: new Date().toISOString().replace('T', ' ').substring(0, 16),
          type: 'income',
          category: 'Nhà tài trợ',
          amount: sponsor.paidAmount,
          description: `Nhà tài trợ ${sponsor.name} đóng góp thực tế`,
          referenceId: financeIdMatch,
          paymentMethod: 'Chuyển khoản Doanh nghiệp',
          verifiedBy: 'Phòng Tài chính BTC',
          isVerified: true,
        });
      }
    }
    return sponsor;
  }

  async saveSponsorAsync(sponsor: Sponsor): Promise<Sponsor> {
    const idx = this.sponsors.findIndex(s => s.id === sponsor.id);
    const isNew = idx < 0;
    if (!isNew) {
      this.sponsors[idx] = sponsor;
    } else {
      this.sponsors.push(sponsor);
    }
    this.saveToLocalStorage(DataStore.KEY_SPONSORS, this.sponsors);

    let updatedSponsor = { ...sponsor };

    if (isSupabaseConfigured()) {
      try {
        let changed = false;

        if (sponsor.logoUrl && sponsor.logoUrl.startsWith('data:')) {
          const ext = sponsor.logoUrl.split(';')[0].split('/')[1] || 'png';
          const path = `logos/${sponsor.id}-${Date.now()}.${ext}`;
          const publicUrl = await uploadToSupabaseStorage(path, sponsor.logoUrl);
          if (publicUrl) {
            updatedSponsor.logoUrl = publicUrl;
            changed = true;
          }
        }

        if (changed) {
          const idxMemory = this.sponsors.findIndex(s => s.id === sponsor.id);
          if (idxMemory >= 0) {
            this.sponsors[idxMemory] = updatedSponsor;
            this.saveToLocalStorage(DataStore.KEY_SPONSORS, this.sponsors);
          }
        }

        const dbRecord = mapSponsorToDb(updatedSponsor);
        const query = isNew
          ? supabase.from('sponsors').insert(dbRecord)
          : supabase.from('sponsors').upsert(dbRecord);

        const { error } = await query;
        if (error) {
          console.error(`Error ${isNew ? 'inserting' : 'upserting'} sponsor to Supabase:`, error);
          throw error;
        }
      } catch (err) {
        console.error('Error during database sync of sponsor:', err);
        throw err;
      }
    }

    // Auto-create or update sponsor income transaction
    if (updatedSponsor.paidAmount > 0) {
      const financeIdMatch = 'TXN-SPN-' + updatedSponsor.id;
      const existingTx = this.finance.find(f => f.referenceId === financeIdMatch);
      if (existingTx) {
        existingTx.amount = updatedSponsor.paidAmount;
        existingTx.description = `Nhà tài trợ ${updatedSponsor.name} đóng góp thực tế`;
        this.saveFinancialRecord(existingTx);
      } else {
        this.addFinancialRecord({
          id: 'TXN-' + Math.floor(Math.random() * 90000 + 10000),
          date: new Date().toISOString().replace('T', ' ').substring(0, 16),
          type: 'income',
          category: 'Nhà tài trợ',
          amount: updatedSponsor.paidAmount,
          description: `Nhà tài trợ ${updatedSponsor.name} đóng góp thực tế`,
          referenceId: financeIdMatch,
          paymentMethod: 'Chuyển khoản Doanh nghiệp',
          verifiedBy: 'Phòng Tài chính BTC',
          isVerified: true,
        });
      }
    }
    return updatedSponsor;
  }

  deleteSponsor(id: string) {
    this.sponsors = this.sponsors.filter(s => s.id !== id);
    this.saveToLocalStorage(DataStore.KEY_SPONSORS, this.sponsors);

    if (isSupabaseConfigured()) {
      supabase.from('sponsors').delete().eq('id', id).then(({ error }) => {
        if (error) console.error('Error deleting sponsor from Supabase:', error);
      });
    }
  }

  // Tasks
  getTasks() { return this.tasks; }
  saveTask(task: InternalTask) {
    const idx = this.tasks.findIndex(t => t.id === task.id);
    if (idx >= 0) {
      this.tasks[idx] = task;
    } else {
      this.tasks.push(task);
    }
    this.saveToLocalStorage(DataStore.KEY_TASKS, this.tasks);

    if (isSupabaseConfigured()) {
      supabase.from('internal_tasks').upsert(mapTaskToDb(task)).then(({ error }) => {
        if (error) console.error('Error syncing task to Supabase:', error);
      });
    }
    return task;
  }

  deleteTask(id: string) {
    this.tasks = this.tasks.filter(t => t.id !== id);
    this.saveToLocalStorage(DataStore.KEY_TASKS, this.tasks);

    if (isSupabaseConfigured()) {
      supabase.from('internal_tasks').delete().eq('id', id).then(({ error }) => {
        if (error) console.error('Error deleting task from Supabase:', error);
      });
    }
  }

  // Finance
  getFinance() { return this.finance; }
  addFinancialRecord(record: FinanceTransaction) {
    this.finance.unshift(record);
    this.saveToLocalStorage(DataStore.KEY_FINANCE, this.finance);

    if (isSupabaseConfigured()) {
      supabase.from('finance_transactions').insert(mapFinanceToDb(record)).then(({ error }) => {
        if (error) console.error('Error syncing transaction to Supabase:', error);
      });
    }
    return record;
  }

  saveFinancialRecord(record: FinanceTransaction) {
    const idx = this.finance.findIndex(f => f.id === record.id);
    if (idx >= 0) {
      this.finance[idx] = record;
    } else {
      this.finance.unshift(record);
    }
    this.saveToLocalStorage(DataStore.KEY_FINANCE, this.finance);

    if (isSupabaseConfigured()) {
      supabase.from('finance_transactions').upsert(mapFinanceToDb(record)).then(({ error }) => {
        if (error) console.error('Error syncing transaction to Supabase:', error);
      });
    }
    return record;
  }

  verifyFinancialRecord(id: string, verifierName: string) {
    const idx = this.finance.findIndex(f => f.id === id);
    if (idx >= 0) {
      this.finance[idx].isVerified = true;
      this.finance[idx].verifiedBy = verifierName;
      this.saveFinancialRecord(this.finance[idx]);
      
      // Auto-confirm payment status of attendee
      const refId = this.finance[idx].referenceId;
      if (refId && refId.startsWith('ATT-')) {
        const attendee = this.attendees.find(a => a.id === refId);
        if (attendee) {
          attendee.paymentStatus = 'paid';
          this.saveAttendee(attendee);
          
          // Trigger notifications
          try {
            this.sendZaloZNS(attendee);
            this.sendEmail(attendee);
          } catch (err) {
            console.error('Failed to trigger auto notifications:', err);
          }
        }
      }
    }
    return this.finance[idx];
  }

  deleteFinanceRecord(id: string) {
    this.finance = this.finance.filter(f => f.id !== id);
    this.saveToLocalStorage(DataStore.KEY_FINANCE, this.finance);

    if (isSupabaseConfigured()) {
      supabase.from('finance_transactions').delete().eq('id', id).then(({ error }) => {
        if (error) console.error('Error deleting transaction from Supabase:', error);
      });
    }
  }

  // Packages
  getPackages() { return this.packages; }
  savePackage(pkg: RegistrationPackage) {
    const idx = this.packages.findIndex(p => p.id === pkg.id);
    if (idx >= 0) {
      this.packages[idx] = pkg;
    } else {
      this.packages.push(pkg);
    }
    this.saveToLocalStorage(DataStore.KEY_PACKAGES, this.packages);

    if (isSupabaseConfigured()) {
      supabase.from('packages').upsert(mapPackageToDb(pkg)).then(({ error }) => {
        if (error) console.error('Error syncing package to Supabase:', error);
      });
    }
    return pkg;
  }

  async savePackageAsync(pkg: RegistrationPackage): Promise<RegistrationPackage> {
    const idx = this.packages.findIndex(p => p.id === pkg.id);
    if (idx >= 0) {
      this.packages[idx] = pkg;
    } else {
      this.packages.push(pkg);
    }
    this.saveToLocalStorage(DataStore.KEY_PACKAGES, this.packages);

    if (isSupabaseConfigured()) {
      const { error } = await supabase.from('packages').upsert(mapPackageToDb(pkg));
      if (error) {
        console.error('Error syncing package to Supabase:', error);
        throw new Error(error.message);
      }
    }
    window.dispatchEvent(new CustomEvent('store-updated', { detail: { table: 'packages' } }));
    return pkg;
  }

  deletePackage(id: string) {
    this.packages = this.packages.filter(p => p.id !== id);
    this.saveToLocalStorage(DataStore.KEY_PACKAGES, this.packages);

    if (isSupabaseConfigured()) {
      supabase.from('packages').delete().eq('id', id).then(({ error }) => {
        if (error) console.error('Error deleting package from Supabase:', error);
      });
    }
  }

  async deletePackageAsync(id: string): Promise<void> {
    this.packages = this.packages.filter(p => p.id !== id);
    this.saveToLocalStorage(DataStore.KEY_PACKAGES, this.packages);

    if (isSupabaseConfigured()) {
      const { error } = await supabase.from('packages').delete().eq('id', id);
      if (error) {
        console.error('Error deleting package from Supabase:', error);
        throw new Error(error.message);
      }
    }
    window.dispatchEvent(new CustomEvent('store-updated', { detail: { table: 'packages' } }));
  }

  // Users
  getUsers() { return this.users; }

  addUserLocally(user: UserAccount) {
    const idx = this.users.findIndex(u => u.id === user.id);
    if (idx >= 0) {
      this.users[idx] = user;
    } else {
      this.users.push(user);
    }
    this.saveToLocalStorage(DataStore.KEY_USERS, this.users);
  }

  saveUser(user: UserAccount) {
    const idx = this.users.findIndex(u => u.id === user.id);
    if (idx >= 0) {
      this.users[idx] = user;
    } else {
      this.users.push(user);
    }
    this.saveToLocalStorage(DataStore.KEY_USERS, this.users);

    if (isSupabaseConfigured()) {
      supabase.from('user_accounts').upsert(mapUserToDb(user)).then(({ error }) => {
        if (error) console.error('Error syncing user account to Supabase:', error);
      });
    }
    return user;
  }

  deleteUser(id: string) {
    this.users = this.users.filter(u => u.id !== id);
    this.saveToLocalStorage(DataStore.KEY_USERS, this.users);

    if (isSupabaseConfigured()) {
      supabase.from('user_accounts').delete().eq('id', id).then(({ error }) => {
        if (error) console.error('Error deleting user account from Supabase:', error);
      });
    }
  }

  // Configurations
  getZaloConfig() { return this.zaloConfig; }
  saveZaloConfig(config: ZaloConfig) {
    this.zaloConfig = config;
    this.saveToLocalStorage(DataStore.KEY_ZALO, config);

    if (isSupabaseConfigured()) {
      supabase.from('system_config').upsert({ key: 'zalo_config', value: config }).then(({ error }) => {
        if (error) console.error('Error saving Zalo config to Supabase:', error);
      });
    }
    return config;
  }

  async checkAndAutoRefreshZaloToken(): Promise<void> {
    const config = this.zaloConfig;
    if (!config.refreshToken || !config.appId || !config.secretKey) return;

    const updatedAt = config.accessTokenUpdatedAt ? new Date(config.accessTokenUpdatedAt).getTime() : 0;
    const now = Date.now();
    const ageHrs = (now - updatedAt) / (1000 * 60 * 60);

    if (ageHrs >= 23 || updatedAt === 0) {
      try {
        console.log(`Auto-refreshing Zalo Token (${ageHrs.toFixed(1)} hrs old)...`);
        const response = await fetch('/api/zalo/refresh-token', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            appId: config.appId,
            secretKey: config.secretKey,
            refreshToken: config.refreshToken
          })
        });
        const data = await response.json();
        if (data.success) {
          const updated = {
            ...config,
            accessToken: data.accessToken,
            refreshToken: data.refreshToken || config.refreshToken,
            accessTokenUpdatedAt: new Date().toISOString()
          };
          this.saveZaloConfig(updated);
          console.log("Automatically renewed Zalo Access Token!");
        }
      } catch (err) {
        console.error("Auto-refresh Zalo token background failed:", err);
      }
    }
  }

  getEmailConfig() { return this.emailConfig; }
  saveEmailConfig(config: EmailConfig) {
    this.emailConfig = config;
    this.saveToLocalStorage(DataStore.KEY_EMAIL, config);

    if (isSupabaseConfigured()) {
      supabase.from('system_config').upsert({ key: 'email_config', value: config }).then(({ error }) => {
        if (error) console.error('Error saving Email config to Supabase:', error);
      });
    }
    return config;
  }

  getWhatsappConfig() { return this.whatsappConfig; }
  saveWhatsappConfig(config: WhatsappConfig) {
    this.whatsappConfig = config;
    this.saveToLocalStorage(DataStore.KEY_WHATSAPP, config);

    if (isSupabaseConfigured()) {
      supabase.from('system_config').upsert({ key: 'whatsapp_config', value: config }).then(({ error }) => {
        if (error) console.error('Error saving Whatsapp config to Supabase:', error);
      });
    }
    return config;
  }

  getTemplates() { return this.templates; }
  saveTemplate(template: NotificationTemplate) {
    const idx = this.templates.findIndex(t => t.id === template.id);
    if (idx >= 0) {
      this.templates[idx] = template;
    } else {
      this.templates.push(template);
    }
    this.saveToLocalStorage(DataStore.KEY_TEMPLATES, this.templates);

    if (isSupabaseConfigured()) {
      supabase.from('notification_templates').upsert(mapTemplateToDb(template)).then(({ error }) => {
        if (error) console.error('Error syncing template to Supabase:', error);
      });
    }
    return template;
  }

  deleteTemplate(id: string) {
    this.templates = this.templates.filter(t => t.id !== id);
    this.saveToLocalStorage(DataStore.KEY_TEMPLATES, this.templates);

    if (isSupabaseConfigured()) {
      supabase.from('notification_templates').delete().eq('id', id).then(({ error }) => {
        if (error) console.error('Error deleting template from Supabase:', error);
      });
    }
  }

  getSupabaseConfig() { return this.supabaseConfig; }
  saveSupabaseConfig(config: SupabaseConfig) {
    this.supabaseConfig = config;
    this.saveToLocalStorage(DataStore.KEY_SUPABASE, config);
    return config;
  }

  getBusinessConfig() { return this.businessConfig; }
  saveBusinessConfig(config: BusinessConfig) {
    this.businessConfig = config;
    this.saveToLocalStorage(DataStore.KEY_BUSINESS_CONFIG, config);

    if (isSupabaseConfigured()) {
      supabase.from('business_config').upsert(mapBusinessConfigToDb(config)).then(({ error }) => {
        if (error) console.error('Error saving Business Config to Supabase:', error);
      });
    }
    return config;
  }

  getEmbedScripts() { return this.embedScripts; }
  saveEmbedScript(script: EmbedScript) {
    const idx = this.embedScripts.findIndex(s => s.id === script.id);
    if (idx >= 0) {
      this.embedScripts[idx] = script;
    } else {
      this.embedScripts.push(script);
    }
    this.saveToLocalStorage(DataStore.KEY_EMBED_SCRIPTS, this.embedScripts);

    if (isSupabaseConfigured()) {
      supabase.from('embed_scripts').upsert(mapEmbedScriptToDb(script)).then(({ error }) => {
        if (error) console.error('Error syncing embed script to Supabase:', error);
      });
    }
    return script;
  }

  deleteEmbedScript(id: string) {
    this.embedScripts = this.embedScripts.filter(s => s.id !== id);
    this.saveToLocalStorage(DataStore.KEY_EMBED_SCRIPTS, this.embedScripts);

    if (isSupabaseConfigured()) {
      supabase.from('embed_scripts').delete().eq('id', id).then(({ error }) => {
        if (error) console.error('Error deleting embed script from Supabase:', error);
      });
    }
  }

  getNotificationLogs() { return this.notificationLogs; }
  clearNotificationLogs() {
    this.notificationLogs = [];
    this.saveToLocalStorage(DataStore.KEY_NOTIFICATION_LOGS, []);

    if (isSupabaseConfigured()) {
      supabase.from('notification_logs').delete().neq('id', '').then(({ error }) => {
        if (error) console.error('Error clearing notification logs from Supabase:', error);
      });
    }
  }

  addNotificationLog(log: SentNotificationLog) {
    this.notificationLogs.unshift(log);
    this.saveToLocalStorage(DataStore.KEY_NOTIFICATION_LOGS, this.notificationLogs);

    if (isSupabaseConfigured()) {
      supabase.from('notification_logs').insert(mapNotifLogToDb(log)).then(({ error }) => {
        if (error) console.error('Error syncing notification log to Supabase:', error);
      });
    }
  }

  // ==========================================
  // NOTIFICATION UTILS (Zalo ZNS & Email)
  // ==========================================

  async sendZaloZNS(attendee: Attendee, templateId?: string): Promise<SentNotificationLog> {
    try {
      await this.checkAndAutoRefreshZaloToken();
    } catch (e) {
      console.error("Zalo auto token refresh check failed:", e);
    }

    const template: NotificationTemplate = (templateId ? this.templates.find(t => t.id === templateId) : null)
      || this.templates.find(t => t.channel === 'zalo' && t.type === 'registration_success')
      || { id: 'tmpl-reg-zalo', name: 'Đăng Ký Đại Biểu Thành Công (Zalo ZNS)', type: 'registration_success', channel: 'zalo', content: 'Xin chào {{title}} {{fullname}}...' };

    let formattedPhone = attendee.phone.replace(/[^0-9]/g, '');
    if (formattedPhone.startsWith('0')) {
      formattedPhone = '84' + formattedPhone.substring(1);
    }

    const payStatusText = attendee.paymentStatus === 'paid' ? 'Đã Thanh Toán' : attendee.paymentStatus === 'pending_verification' ? 'Chờ Đối Soát' : 'Chưa Thanh Toán';
    const content = template.content
      .replace(/\{\{title\}\}/g, attendee.title || '')
      .replace(/\{\{fullname\}\}/g, attendee.fullName || '')
      .replace(/\{\{package\}\}/g, attendee.packageName || '')
      .replace(/\{\{code\}\}/g, attendee.id || '')
      .replace(/\{\{payment_status\}\}/g, payStatusText)
      .replace(/\{\{organization\}\}/g, attendee.organization || '');

    const payload = {
      recipient: { phone: formattedPhone },
      template_id: template.id,
      template_data: {
        title: attendee.title || '',
        fullname: attendee.fullName || '',
        package: attendee.packageName || '',
        code: attendee.id || '',
        payment_status: payStatusText,
        qr_url: `https://api.qrserver.com/v1/create-qr-code/?size=250x250&data=${encodeURIComponent(attendee.qrCodeValue)}`
      },
      raw_text_sent: content
    };

    let status: 'success' | 'failed' = 'success';
    let responseObj: any = { message: "Tin nhắn ZNS đã xếp hàng gửi thành công qua cổng Zalo OA Sandbox" };

    const isRealZalo = this.zaloConfig.accessToken && this.zaloConfig.accessToken !== 'zalo-oa-token-active-2026-ready-vsaps';

    if (isRealZalo) {
      try {
        const response = await fetch('/api/zalo/send', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            config: this.zaloConfig,
            payload: {
              recipient: { phone: formattedPhone },
              template_id: template.id,
              template_data: payload.template_data
            }
          })
        });
        const resData = await response.json();
        if (resData.success) {
          responseObj = resData.data;
          if (responseObj && responseObj.error !== 0) status = 'failed';
        } else {
          status = 'failed';
          responseObj = { error: -1, message: resData.error || "Lỗi trung chuyển Zalo" };
        }
      } catch (err: any) {
        status = 'failed';
        responseObj = { error: -1, message: err.message || "Không thể truyền dữ liệu đến API Zalo Gateway" };
      }
    } else {
      responseObj = {
        error: 0,
        message: "Thành công (Giả lập Sandbox)",
        data: {
          msg_id: "msg-sim-" + Math.floor(Math.random() * 1000000000),
          sent_time: new Date().toISOString()
        }
      };
    }

    const log: SentNotificationLog = {
      id: 'NTF-' + Math.floor(Math.random() * 90000 + 10000),
      recipient: attendee.phone,
      type: 'zalo',
      templateId: template.id,
      templateName: template.name,
      sender: this.zaloConfig.oaId || 'Ban Tổ Chức VSAPS',
      sentAt: new Date().toISOString().replace('T', ' ').substring(0, 16),
      status,
      payload,
      response: responseObj
    };

    this.addNotificationLog(log);
    return log;
  }

  async sendEmail(attendee: Attendee): Promise<SentNotificationLog> {
    const template: NotificationTemplate = this.templates.find(t => t.channel === 'email' && t.type === 'registration_success')
      || { id: 'tmpl-reg-email', name: 'Đăng Ký Đại Biểu Thành Công (Email)', type: 'registration_success', channel: 'email', subject: '🎯 Xác nhận bảo mẫu đăng ký thành công VSAPS 2026', content: 'Xin chào {{title}} {{fullname}}...' };

    const payStatusText = attendee.paymentStatus === 'paid' ? 'Đã Thanh Toán' : attendee.paymentStatus === 'pending_verification' ? 'Chở Đối Soát' : 'Chưa Thanh Toán';
    const content = template.content
      .replace(/\{\{title\}\}/g, attendee.title || '')
      .replace(/\{\{fullname\}\}/g, attendee.fullName || '')
      .replace(/\{\{package\}\}/g, attendee.packageName || '')
      .replace(/\{\{code\}\}/g, attendee.id || '')
      .replace(/\{\{payment_status\}\}/g, payStatusText)
      .replace(/\{\{organization\}\}/g, attendee.organization || '');

    const payload = {
      to: attendee.email,
      from: `${this.emailConfig.senderName} <${this.emailConfig.senderEmail}>`,
      subject: (template.subject || "Xác nhận đăng ký VSAPS 2026")
        .replace(/\{\{title\}\}/g, attendee.title || '')
        .replace(/\{\{fullname\}\}/g, attendee.fullName || ''),
      body: content,
      attachment_qr: `https://api.qrserver.com/v1/create-qr-code/?size=250x250&data=${encodeURIComponent(attendee.qrCodeValue)}`
    };

    let status: 'success' | 'failed' = 'success';
    let responseObj: any = { message: "Email đã gửi thành công giả lập" };

    const isRealSmtp = this.emailConfig.smtpHost && 
                       this.emailConfig.smtpPass && 
                       this.emailConfig.smtpPass !== '*************' &&
                       this.emailConfig.smtpPass !== '';

    if (isRealSmtp) {
      try {
        const emailHtml = `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 25px; border: 1px solid #e2e8f0; border-radius: 12px; background-color: #ffffff;">
            <div style="text-align: center; border-bottom: 2px solid #4f46e5; padding-bottom: 15px; margin-bottom: 20px;">
              <h2 style="color: #1e1b4b; margin: 0; font-size: 20px; text-transform: uppercase; letter-spacing: 1px;">Xác Nhận Đăng Ký Hội Nghị VSAPS 2026</h2>
              <p style="color: #4f46e5; font-size: 11px; margin: 5px 0 0 0; font-weight: bold;">Hội Nghị Khoa Học Thẩm Mỹ Quốc Tế Thường Niên</p>
            </div>
            
            <p style="font-size: 14px; color: #334155;">Kính gửi: <strong>${attendee.title || 'Quý Đại biểu'} ${attendee.fullName}</strong>,</p>
            <p style="font-size: 14px; color: #334155; line-height: 1.6;">
              Ban Tổ kết xác nhận đăng ký thông tin tham dự của bạn. Thông tin chi tiết vé:
            </p>
            
            <div style="background-color: #f8fafc; padding: 15px; border-radius: 8px; border-left: 4px solid #4f46e5; margin: 20px 0;">
              <table style="width: 100%; border-collapse: collapse; font-size: 13.5px; color: #334155;">
                <tr><td style="padding: 6px 0; font-weight: bold; width: 130px;">Mã Đại Biểu:</td><td style="padding: 6px 0; color: #4f46e5; font-family: monospace; font-weight: bold;">${attendee.id}</td></tr>
                <tr><td style="padding: 6px 0; font-weight: bold;">Gói Tham Dự:</td><td style="padding: 6px 0;">${attendee.packageName}</td></tr>
                <tr><td style="padding: 6px 0; font-weight: bold;">Lệ Phí:</td><td style="padding: 6px 0; font-family: monospace; font-weight: bold;">${attendee.packageFee.toLocaleString()} VNĐ</td></tr>
                <tr><td style="padding: 6px 0; font-weight: bold;">Trạng Thái:</td><td style="padding: 6px 0; font-weight: bold; color: ${attendee.paymentStatus === 'paid' ? '#10b981' : '#f59e0b'};">${payStatusText}</td></tr>
              </table>
            </div>

            <div style="text-align: center; margin: 25px 0; background-color: #f1f5f9; padding: 20px; border-radius: 8px;">
              <p style="font-size: 13px; color: #475569; margin: 0 0 10px 0; font-weight: bold;">MÃ QR CHECK-IN</p>
              <img src="${payload.attachment_qr}" alt="QR Code" style="width: 180px; height: 180px;" />
            </div>
          </div>
        `;

        const response = await fetch('/api/email/send', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            config: this.emailConfig,
            payload: {
              to: attendee.email,
              subject: `[VSAPS 2026] Xác nhận đăng ký tham gia - Mã: ${attendee.id}`,
              body: emailHtml
            }
          })
        });

        const resData = await response.json();
        if (resData.success) {
          responseObj = {
            status: "250 OK (Real SMTP)",
            message_id: resData.messageId || "smtpid-" + Math.floor(Math.random() * 1000000)
          };
        } else {
          status = 'failed';
          responseObj = { error: -1, message: resData.error || "Máy chủ Mail báo lỗi" };
        }
      } catch (err: any) {
        status = 'failed';
        responseObj = { error: -1, message: err.message || "Lỗi SMTP Relay" };
      }
    } else {
      responseObj = {
        status: "250 OK (Simulated)",
        message_id: "smtpid-" + Math.floor(Math.random() * 1000000)
      };
    }

    const log: SentNotificationLog = {
      id: 'NTF-' + Math.floor(Math.random() * 90000 + 10000),
      recipient: attendee.email,
      type: 'email',
      templateId: template.id,
      templateName: template.name,
      sender: this.emailConfig.senderEmail || 'contact@vsapsevent.org',
      sentAt: new Date().toISOString().replace('T', ' ').substring(0, 16),
      status,
      payload,
      response: responseObj
    };

    this.addNotificationLog(log);
    return log;
  }

  async sendWhatsapp(attendee: Attendee, templateId?: string): Promise<SentNotificationLog> {
    const template: NotificationTemplate = (templateId ? this.templates.find(t => t.id === templateId) : null)
      || this.templates.find(t => t.channel === 'whatsapp' && t.type === 'registration_success')
      || { 
           id: 'tmpl-reg-wa', 
           name: 'Đăng Ký Đại Biểu Thành Công (WhatsApp)', 
           type: 'registration_success', 
           channel: 'whatsapp', 
           znsTemplateId: 'vsaps_registration_success',
           content: '[VSAPS 2026] ĐĂNG KÝ THÀNH CÔNG\nXin chào {{title}} {{fullname}}. Bạn đã đăng ký thành công tham dự Hội nghị Khoa học VSAPS 2026.\n- Gói: {{package}}\n- Mã Đại biểu: {{code}}\n- Trạng thái: {{payment_status}}\nVui lòng quét mã QR vé để check-in. Trân trọng!'
         };

    let formattedPhone = attendee.phone.replace(/[^0-9]/g, '');
    if (formattedPhone.startsWith('0')) {
      formattedPhone = '84' + formattedPhone.substring(1);
    }

    const payStatusText = attendee.paymentStatus === 'paid' ? 'Đã Thanh Toán' : attendee.paymentStatus === 'pending_verification' ? 'Chờ Đối Soát' : 'Chưa Thanh Toán';
    const content = template.content
      .replace(/\{\{title\}\}/g, attendee.title || '')
      .replace(/\{\{fullname\}\}/g, attendee.fullName || '')
      .replace(/\{\{package\}\}/g, attendee.packageName || '')
      .replace(/\{\{code\}\}/g, attendee.id || '')
      .replace(/\{\{payment_status\}\}/g, payStatusText)
      .replace(/\{\{organization\}\}/g, attendee.organization || '');

    const isRealWhatsapp = this.whatsappConfig.accessToken && this.whatsappConfig.phoneNumberId;

    const payload = {
      messaging_product: "whatsapp",
      to: formattedPhone,
      type: "template",
      template: {
        name: template.znsTemplateId || "vsaps_registration_success",
        language: {
          code: "vi"
        },
        components: [
          {
            type: "body",
            parameters: [
              { type: "text", text: attendee.title || '' },
              { type: "text", text: attendee.fullName || '' },
              { type: "text", text: attendee.id || '' },
              { type: "text", text: attendee.packageName || '' },
              { type: "text", text: payStatusText }
            ]
          }
        ]
      },
      raw_text_sent: content
    };

    let status: 'success' | 'failed' = 'success';
    let responseObj: any = { message: "Tin nhắn WhatsApp đã gửi thành công giả lập (Sandbox)" };

    if (isRealWhatsapp) {
      try {
        const response = await fetch('/api/whatsapp/send', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            config: this.whatsappConfig,
            payload: payload
          })
        });
        const resData = await response.json();
        if (resData.success) {
          responseObj = resData.data;
          status = responseObj.error ? 'failed' : 'success';
        } else {
          status = 'failed';
          responseObj = { error: -1, message: resData.error || "Lỗi gửi tin nhắn WhatsApp" };
        }
      } catch (err: any) {
        status = 'failed';
        responseObj = { error: -1, message: err.message || "Không thể gửi dữ liệu đến API WhatsApp" };
      }
    } else {
      responseObj = {
        error: 0,
        message: "Thành công (Giả lập Sandbox)",
        data: {
          message_id: "wa-sim-" + Math.floor(Math.random() * 1000000000),
          sent_time: new Date().toISOString()
        }
      };
    }

    const log: SentNotificationLog = {
      id: 'NTF-' + Math.floor(Math.random() * 90000 + 10000),
      recipient: attendee.phone,
      type: 'whatsapp',
      templateId: template.id,
      templateName: template.name,
      sender: 'WhatsApp Business API',
      sentAt: new Date().toISOString().replace('T', ' ').substring(0, 16),
      status,
      payload,
      response: responseObj
    };

    this.addNotificationLog(log);
    return log;
  }

  async sendWhatsappToSpeaker(speaker: SpeakerRegistration, templateId?: string): Promise<SentNotificationLog> {
    const template: NotificationTemplate = (templateId ? this.templates.find(t => t.id === templateId) : null)
      || this.templates.find(t => t.channel === 'whatsapp' && t.type === 'abstract_approved')
      || { 
           id: 'tmpl-speaker-wa', 
           name: 'Nộp Bài Báo Cáo Thành Công (WhatsApp)', 
           type: 'abstract_approved', 
           channel: 'whatsapp', 
           znsTemplateId: 'vsaps_speaker_success',
           content: '[VSAPS 2026] NỘP BÁO CÁO THÀNH CÔNG\nXin chào {{title}} {{fullname}}. Đề tài báo cáo "{{presentation_title}}" của bạn đã được ghi nhận trên hệ thống sự kiện. Trạng thái: Chờ phê duyệt.'
         };

    let formattedPhone = speaker.phone.replace(/[^0-9]/g, '');
    if (formattedPhone.startsWith('0')) {
      formattedPhone = '84' + formattedPhone.substring(1);
    }

    const content = template.content
      .replace(/\{\{title\}\}/g, speaker.title || '')
      .replace(/\{\{fullname\}\}/g, speaker.fullName || '')
      .replace(/\{\{presentation_title\}\}/g, speaker.presentationTitle || '')
      .replace(/\{\{track\}\}/g, speaker.presentationTrack || '');

    const isRealWhatsapp = this.whatsappConfig.accessToken && this.whatsappConfig.phoneNumberId;

    const payload = {
      messaging_product: "whatsapp",
      to: formattedPhone,
      type: "template",
      template: {
        name: template.znsTemplateId || "vsaps_speaker_success",
        language: {
          code: "vi"
        },
        components: [
          {
            type: "body",
            parameters: [
              { type: "text", text: speaker.title || '' },
              { type: "text", text: speaker.fullName || '' },
              { type: "text", text: speaker.presentationTitle || '' }
            ]
          }
        ]
      },
      raw_text_sent: content
    };

    let status: 'success' | 'failed' = 'success';
    let responseObj: any = { message: "Tin nhắn WhatsApp đã gửi thành công giả lập (Sandbox)" };

    if (isRealWhatsapp) {
      try {
        const response = await fetch('/api/whatsapp/send', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            config: this.whatsappConfig,
            payload: payload
          })
        });
        const resData = await response.json();
        if (resData.success) {
          responseObj = resData.data;
          status = responseObj.error ? 'failed' : 'success';
        } else {
          status = 'failed';
          responseObj = { error: -1, message: resData.error || "Lỗi gửi tin nhắn WhatsApp" };
        }
      } catch (err: any) {
        status = 'failed';
        responseObj = { error: -1, message: err.message || "Không thể gửi dữ liệu đến API WhatsApp" };
      }
    } else {
      responseObj = {
        error: 0,
        message: "Thành công (Giả lập Sandbox)",
        data: {
          message_id: "wa-sim-" + Math.floor(Math.random() * 1000000000),
          sent_time: new Date().toISOString()
        }
      };
    }

    const log: SentNotificationLog = {
      id: 'NTF-' + Math.floor(Math.random() * 90000 + 10000),
      recipient: speaker.phone,
      type: 'whatsapp',
      templateId: template.id,
      templateName: template.name,
      sender: 'WhatsApp Business API',
      sentAt: new Date().toISOString().replace('T', ' ').substring(0, 16),
      status,
      payload,
      response: responseObj
    };

    this.addNotificationLog(log);
    return log;
  }

  // Clear data and reset mock defaults
  resetToDefaults() {
    localStorage.removeItem(DataStore.KEY_ATTENDEES);
    localStorage.removeItem(DataStore.KEY_SPEAKERS);
    localStorage.removeItem(DataStore.KEY_SESSIONS);
    localStorage.removeItem(DataStore.KEY_SPONSORS);
    localStorage.removeItem(DataStore.KEY_TASKS);
    localStorage.removeItem(DataStore.KEY_FINANCE);
    localStorage.removeItem(DataStore.KEY_USERS);
    localStorage.removeItem(DataStore.KEY_PACKAGES);
    localStorage.removeItem(DataStore.KEY_ZALO);
    localStorage.removeItem(DataStore.KEY_EMAIL);
    localStorage.removeItem(DataStore.KEY_TEMPLATES);
    localStorage.removeItem(DataStore.KEY_SUPABASE);
    localStorage.removeItem(DataStore.KEY_NOTIFICATION_LOGS);
    localStorage.removeItem(DataStore.KEY_SPECIALTY_TRACKS);
    localStorage.removeItem(DataStore.KEY_BUSINESS_CONFIG);
    localStorage.removeItem(DataStore.KEY_EMBED_SCRIPTS);
    this.loadLocalStorage();

    if (isSupabaseConfigured()) {
      // Clear data on Supabase as well
      Promise.all([
        supabase.from('attendees').delete().neq('id', ''),
        supabase.from('speakers').delete().neq('id', ''),
        supabase.from('sessions').delete().neq('id', ''),
        supabase.from('sponsors').delete().neq('id', ''),
        supabase.from('internal_tasks').delete().neq('id', ''),
        supabase.from('finance_transactions').delete().neq('id', ''),
        supabase.from('notification_logs').delete().neq('id', ''),
      ]).then(() => {
        console.log('Cleared Supabase tables on reset.');
      });
    }
  }

  getSupabaseSqlSchema(): string {
    return ``; // Unused as we have separate supabase/schema.sql
  }

  // ==================== SEPAY CONFIG ====================

  getSepayConfig(): SepayConfig {
    return { ...this.sepayConfig };
  }

  saveSepayConfig(config: SepayConfig): void {
    this.sepayConfig = { ...config };
    this.saveToLocalStorage(DataStore.KEY_SEPAY, this.sepayConfig);

    if (isSupabaseConfigured()) {
      supabase.from('system_config').upsert({ key: 'sepay_config', value: config }).then(({ error }) => {
        if (error) console.error('Error saving SePay config to Supabase:', error);
      });
    }
  }

  /**
   * Kiểm tra giao dịch SePay theo nội dung chuyển khoản.
   * Gọi SePay API v2: GET /v2/transactions?q={content}
   * @param transferContent  Nội dung CK đã dùng (ví dụ: "NGUYEN VAN A 0901234567 DONG PHI THAM DU VSAPS 2026")
   * @param expectedAmount   Số tiền cần khớp (VNĐ)
   * @returns { found: boolean; transaction?: any; error?: string }
   */
  async checkSepayPayment(transferContent: string, expectedAmount: number): Promise<{
    found: boolean;
    transaction?: {
      id: number;
      gateway: string;
      transactionDate: string;
      transferAmount: number;
      content: string;
      referenceCode: string;
    };
    error?: string;
  }> {
    const cfg = this.sepayConfig;
    if (!cfg.isEnabled || !cfg.apiToken) {
      return { found: false, error: 'SePay chưa được cấu hình hoặc chưa bật.' };
    }

    try {
      const q = encodeURIComponent(transferContent.substring(0, 50)); // max 50 ký tự
      const url = `https://userapi.sepay.vn/v2/transactions?q=${q}&limit=20`;

      const res = await fetch(url, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${cfg.apiToken}`,
          'Content-Type': 'application/json',
        },
      });

      if (!res.ok) {
        const errText = await res.text();
        return { found: false, error: `SePay API lỗi ${res.status}: ${errText}` };
      }

      const data = await res.json();
      // SePay v2 trả về { status: 'success', messages: {...}, transactions: [...] }
      const transactions: any[] = data?.transactions || data?.data || [];

      // Tìm giao dịch khớp số tiền (chênh lệch ≤ 1000đ để bù phí)
      const matched = transactions.find((t: any) => {
        const amt = Number(t.transferAmount ?? t.transfer_amount ?? 0);
        return Math.abs(amt - expectedAmount) <= 1000;
      });

      if (matched) {
        return {
          found: true,
          transaction: {
            id: matched.id,
            gateway: matched.gateway || matched.bankCode || '',
            transactionDate: matched.transactionDate || matched.transaction_date || '',
            transferAmount: Number(matched.transferAmount ?? matched.transfer_amount ?? 0),
            content: matched.content || matched.transaction_content || '',
            referenceCode: matched.referenceCode || matched.reference_number || '',
          },
        };
      }

      return { found: false };
    } catch (err: any) {
      return { found: false, error: err?.message || 'Lỗi kết nối SePay' };
    }
  }
}

export const store = new DataStore();
export default store;
