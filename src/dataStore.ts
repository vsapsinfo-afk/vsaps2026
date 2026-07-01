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
  ResendConfig,
  NotificationTemplate,
  SupabaseConfig,
  SentNotificationLog,
  SpecialtyTrack,
  BusinessConfig,
  EmbedScript,
  SepayConfig,
  WhatsappConfig,
  ConferenceShift,
  VirtualSection,
  OneSignalConfig,
  Contact,
  SponsorPackage,
  CmeTemplateConfig,
  EventDetailsConfig,
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
  mapEmbedScriptToDb, mapDbToEmbedScript,
  mapContactToDb, mapDbToContact,
} from './lib/mappers';

const extractTaxId = (htmlStr: string | undefined): { taxId: string, cleanNotes: string } => {
  if (!htmlStr) return { taxId: '', cleanNotes: '' };
  const regex = /<p><strong>Mã số thuế:<\/strong>\s*([^<]+)<\/p>/;
  const match = htmlStr.match(regex);
  if (match) {
    return {
      taxId: match[1].trim(),
      cleanNotes: htmlStr.replace(regex, '').trim()
    };
  }
  return { taxId: '', cleanNotes: htmlStr };
};

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

const DEFAULT_RESEND_CONFIG: ResendConfig = {
  apiKey: '',
  senderEmail: '',
  isConfigured: false,
};

const DEFAULT_WHATSAPP_CONFIG: WhatsappConfig = {
  accessToken: '',
  phoneNumberId: '',
  businessAccountId: '',
  isConfigured: false,
  testPhone: '',
};

export const DEFAULT_CME_TEMPLATE_CONFIG: CmeTemplateConfig = {
  certificateTitle: "CHỨNG CHỈ ĐÀO TẠO LIÊN TỤC",
  certificateSubtitle: "Continuing Medical Education (CME) in Aesthetic Medicine",
  awardBodyTitle: "HỘI PHẪU THUẬT TẠO HÌNH THẨM MỸ VIỆT NAM",
  awardBodySubtitle: "VIETNAM SOCIETY OF AESTHETIC PLASTIC SURGERY (VSAPS)",
  paragraphText: "Ban Chấp Hành Hiệp Hội Danh Dự VSAPS chứng nhận và cấp cho:",
  courseTitle: "TIẾN BỘ MỚI TRONG THẨM MỸ NỘI KHOA & NGOẠI KHOA TẠO HÌNH THÂN MÌNH",
  durationText: "Thời lượng: 24 tiết đào tạo tín chỉ CME cấp thẩm quyền y tế",
  signerName: "GS. TS. Phạm Minh Chi",
  signerTitle: "BAN ĐÀO TẠO CME & CHỦ TỊCH HỘI",
  sealText1: "HỘI PHẪU THUẬT",
  sealText2: "VSAPS",
  sealText3: "DẤU MỘC ĐỎ",
  locationDateText: "TP. Hồ Chí Minh, ngày 15 tháng 10 năm 2026",
  borderColor: "#b45309",
  bgColor: "#fdfbf7",
  logoUrl: "",
};

export const DEFAULT_EVENT_DETAILS_CONFIG: EventDetailsConfig = {
  heroTitle: "Đại Hội Nhiệm Kỳ III & Hội Nghị Khoa Học Thường Niên VSAPS Lần Thứ 10",
  heroSubtitle: "Cùng nhau định hình tương lai ngành Phẫu Thuật Tạo Hình Thẩm Mỹ",
  eventDates: "11 - 13 Tháng 12, 2026",
  eventLocation: "Bệnh viện Quân y 175, TP.HCM",
  eventScale: "1200 - 1500 Đại biểu",
  heroBannerUrl: "",

  introTitle: "Mục tiêu trọng tâm VSAPS 2026",
  introParagraph1: "Hội nghị khoa học thường niên VSAPS 2026 là điểm hẹn học thuật uy tín dành cho giới y khoa toàn quốc. Trong bối cảnh công nghệ số phát hiện vượt bậc, VSAPS 2026 cam kết nâng cao chuẩn mực an toàn bệnh nhân, chia sẻ các kết quả lâm sàng xuất sắc dựa trên bằng chứng, kết hợp trí tuệ nhân tạo và các công nghệ can thiệp ít xâm lấn.",
  introParagraph2: "Chúng tôi tập trung vào 4 chủ đề cốt lõi: Phẫu thuật Robot chính xác, Gây mê hồi sức kỹ thuật cao tối ưu hóa hồi phục sau mổ (ERAS), Chẩn đoán hình ảnh tiên tiến và Thẩm mỹ tạo hình an toàn y học.",

  feature1Title: "Cấp chứng nhận CME chính thức",
  feature1Desc: "Được cấp bởi Đại học Y Dược uy tín dành cho các Bác sỹ, Thầy thuốc tham dự đủ số tiết quy định.",
  feature2Title: "Giao lưu doanh nghiệp toàn cầu",
  feature2Desc: "Tiếp cận 30+ gian hàng triển lãm vật tư y khoa thế hệ mới, thiết bị chuẩn đoán hình ảnh hàng đầu.",

  highlightSpeakers: [
    {
      id: "spk-1",
      name: "PGS.TS.BS. Trần Quốc Bảo",
      title: "Trưởng khoa Ngoại Lồng Ngực - Bệnh viện 108",
      titleEn: "Head of Thoracic Surgery Department - 108 Hospital",
      topic: "Phẫu thuật Robot điều trị u trung thất trước: Kinh nghiệm tại Việt Nam",
      topicEn: "Robotic Surgery for Anterior Mediastinal Tumors: Experience in Vietnam",
      avatarUrl: ""
    },
    {
      id: "spk-2",
      name: "PGS.TS.BS. Lê Hoàng Mỹ",
      title: "Giảng viên bộ môn Thần Kinh - ĐH Y Dược TP.HCM",
      titleEn: "Lecturer of Neurology Department - HCMC University of Medicine and Pharmacy",
      topic: "Cập nhật liệu pháp kháng thể đơn dòng trong điều trị bệnh Alzheimer giai đoạn sớm",
      topicEn: "Updates on Monoclonal Antibody Therapy for Early-Stage Alzheimer's Disease",
      avatarUrl: ""
    }
  ],

  contactOrganizer: "HỘI PHẪU THUẬT TẠO HÌNH THẨM MỸ VIỆT NAM (VSAPS)",
  contactPresident: "PGS. TS. BS. LÊ HÀNH",
  contactSecretary: "Thái Võ Ngọc Thư",
  contactPhone: "+84964551151",
  contactEmail: "vsaps.events@gmail.com",
  contactWebsite: "https://vsaps.vn/",
  contactFanpage: "https://www.facebook.com/vsapsevent",
  posterImageUrl: "",
  seoTitle: "VSAPS 2026 - Đại Hội Nhiệm Kỳ III & Hội Nghị Khoa Học Thường Niên Lần Thứ 10",
  seoDescription: "Hội nghị khoa học thường niên VSAPS 2026 là điểm hẹn học thuật uy tín dành cho giới y khoa tạo hình thẩm mỹ toàn quốc.",
  seoKeywords: "VSAPS 2026, hội nghị thẩm mỹ, phẫu thuật thẩm mỹ, hội thảo y khoa, tạo hình thẩm mỹ, cme phẫu thuật thẩm mỹ",

  heroTitleEn: "10th Annual Conference & Term III General Assembly of VSAPS",
  heroSubtitleEn: "Shaping the future of Aesthetic Plastic Surgery together",
  eventDatesEn: "December 11 - 13, 2026",
  eventLocationEn: "175 Military Hospital, Ho Chi Minh City",
  eventScaleEn: "1200 - 1500 Delegates",

  introTitleEn: "Key Objectives of VSAPS 2026",
  introParagraph1En: "The VSAPS 2026 Annual Scientific Conference is a prestigious academic event for the medical community nationwide. In the context of rapid digital technology advancement, VSAPS 2026 is committed to improving patient safety standards, sharing excellent evidence-based clinical outcomes, and combining artificial intelligence with minimally invasive procedures.",
  introParagraph2En: "We focus on four core topics: Precision Robotic Surgery, High-Tech Anesthesia for ERAS, Advanced Diagnostic Imaging, and Safe Aesthetic Plastic Surgery.",

  feature1TitleEn: "Official CME Certification",
  feature1DescEn: "Issued by a prestigious Medical University for doctors participating in required hours.",
  feature2TitleEn: "Global Business Networking",
  feature2DescEn: "Access 30+ exhibition booths featuring new-generation medical equipment and diagnostic imaging.",

  contactOrganizerEn: "VIETNAM SOCIETY OF AESTHETIC PLASTIC SURGERY (VSAPS)",
  contactPresidentEn: "ASSOC. PROF. DR. LE HANH",
  contactSecretaryEn: "Thai Vo Ngoc Thu",

  seoTitleEn: "VSAPS 2026 - 10th Annual Scientific Conference & Meeting",
  seoDescriptionEn: "VSAPS 2026 annual scientific conference is a prestigious academic event for aesthetic plastic surgery.",
  seoKeywordsEn: "VSAPS 2026, aesthetic surgery conference, plastic surgery, medical seminar, CME aesthetic plastic surgery"
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
  cmeTemplateConfig: DEFAULT_CME_TEMPLATE_CONFIG,
  eventDetailsConfig: DEFAULT_EVENT_DETAILS_CONFIG,


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
      scheduleAddOns:{ vi: "DỊCH VỤ PHỤ TRỢ TỰ CHỌN", en: "OPTIONAL ADD-ON SERVICES" },
      package:       { vi: "CHỌN GÓI ĐĂNG KÝ HỘI NGHỊ",         en: "CONFERENCE REGISTRATION PACKAGE" },
      payment:       { vi: "THÔNG TIN THANH TOÁN CHUYỂN KHOẢN",  en: "BANK TRANSFER PAYMENT DETAILS" },
    },
    fieldLabels: {
      nationality: { vi: "Chọn ngôn ngữ *", en: "Select Language *" },
      avatar: { vi: "Ảnh Chân Dung / Avatar *", en: "scientific Portrait *" },
      doctorProof: { vi: "Minh chứng Bác Sĩ *", en: "Doctor Credentials Proof *" },
      academicTitle: { vi: "Học hàm / Học vị *", en: "Academic Title *" },
      fullName: { vi: "Họ và Tên (In hoa có dấu) *", en: "Full Name (Capitalized) *" },
      gender: { vi: "Giới tính *", en: "Gender *" },
      yearOfBirth: { vi: "Năm sinh *", en: "Year of Birth *" },
      phone: { vi: "Số điện thoại di động *", en: "Contact Phone Number *" },
      email: { vi: "Địa chỉ Email nhận vé & CME *", en: "Email for Ticket & CME *" },
      workplace: { vi: "Đơn vị công tác (Bệnh viện/Khoa Y/Viện thẩm mỹ) *", en: "Workplace (Hospital/Medical School/Clinic) *" },
      address: { vi: "Địa chỉ liên hệ *", en: "Contact Address *" },
      timelineOption: { vi: "Lựa chọn Thời điểm Đăng ký *", en: "Registration Timeline Option *" },
      notes: { vi: "Ghi chú yêu cầu đặc biệt khác cho BTC", en: "Special notes or request for Organizer" },
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
    fieldLabels: {
      avatar: { vi: "Ảnh Chân Dung / Chân Dung Khoa Học *", en: "Scientific Portrait / Avatar *" },
      academicTitle: { vi: "Học hàm / Học vị *", en: "Academic Title *" },
      fullName: { vi: "Họ và Tên *", en: "Full Name *" },
      institution: { vi: "Đơn vị công tác chính *", en: "Primary Institution *" },
      department: { vi: "Khoa / Phòng ban / Bộ môn *", en: "Department / Specialty *" },
      phone: { vi: "Số điện thoại *", en: "Phone Number *" },
      email: { vi: "Email liên hệ trao đổi học thuật *", en: "Academic Contact Email *" },
      bio: { vi: "Tiểu sử khoa học tóm tắt (Bio) - Khoảng 100 từ", en: "Short Scientific Bio - Around 100 words" },
      presentationTitle: { vi: "Tên đề tài bài báo cáo khoa học *", en: "Presentation Title *" },
      category: { vi: "Chuyên đề *", en: "Scientific Topic / Track *" },
      abstractText: { vi: "Tóm tắt nội dung báo cáo (Abstract) - Giới hạn 500 từ *", en: "Abstract text - Limit 500 words *" },
      uploadFile: { vi: "CV/Abstract/Full file", en: "CV/Abstract/Full file" },

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
    fieldLabels: {
      logo: { vi: "Logo Thương Hiệu / Doanh Nghiệp *", en: "Brand / Company Logo *" },
      companyName: { vi: "Tên Thương hiệu / Doanh nghiệp đăng ký *", en: "Brand / Registered Company Name *" },
      contactName: { vi: "Họ & Tên Đại diện liên hệ *", en: "Contact Person Name *" },
      contactPhone: { vi: "Số điện thoại liên hệ *", en: "Contact Phone Number *" },
      contactEmail: { vi: "Email nhận thư báo ký kết & tài liệu *", en: "Email for Contracts & Documents *" },
      notes: { vi: "Ghi chú hoặc yêu cầu đặc biệt của Doanh nghiệp", en: "Company requests or special notes" },
    },
    sponsorPackages: [
      {
        id: 'diamond',
        name: 'Kim Cương',
        nameEn: 'Diamond Partner',
        fee: 600000000,
        color: '#6366f1',
        benefits: [
          'Tặng 50 vé tham dự Gala',
          'Tặng 3 vé tham dự tiệc Chào mừng',
          'Giá sử dụng phòng Hand-on training (2h): 2 suất',
          'Đại biểu đăng ký qua nhà tài trợ: Giảm 25%',
          'Gian hàng theo tiêu chuẩn: Độc quyền',
          'Logo trên backdrop và các ấn phẩm: Cỡ size 6',
          'Nêu tên cảm ơn trong suốt chương trình: Có',
          'Banner trên web hội: 3 tháng',
          'Standee trước cửa hội trường: 2 cái',
          'Đăng bài viết về sản phẩm trên Web, page hội: 5 bài',
          'Giấy cảm ơn và quà lưu niệm: Có'
        ],
        benefitsEn: [
          'Complimentary 50 Gala tickets',
          'Complimentary 3 Welcome Dinner tickets',
          'Hands-on training room use (2h): 2 slots',
          'Delegate registration discount: 25% Off',
          'Standard exhibition booth: Exclusive',
          'Logo on backdrop & printed materials: Size 6',
          'Verbal thank-you announcement: Yes',
          'Society website banner advertisement: 3 Months',
          'Standee at hall entrance: 2 pcs',
          'Product promotion posts on Web/Page: 5 posts',
          'Appreciation certificate & souvenir: Yes'
        ],
        isActive: true
      },
      {
        id: 'platinum',
        name: 'Bạch Kim',
        nameEn: 'Platinum Partner',
        fee: 400000000,
        color: '#8b5cf6',
        benefits: [
          'Tặng 40 vé tham dự Gala',
          'Tặng 2 vé tham dự tiệc Chào mừng',
          'Giá sử dụng phòng Hand-on training (2h): 1 suất',
          'Đại biểu đăng ký qua nhà tài trợ: Giảm 20%',
          'Gian hàng theo tiêu chuẩn: Đặc biệt 1',
          'Logo trên backdrop và các ấn phẩm: Cỡ size 5',
          'Nêu tên cảm ơn trong suốt chương trình: Có',
          'Banner trên web hội: 2 tháng',
          'Standee trước cửa hội trường: 1 cái',
          'Đăng bài viết về sản phẩm trên Web, page hội: 3 bài',
          'Giấy cảm ơn và quà lưu niệm: Có'
        ],
        benefitsEn: [
          'Complimentary 40 Gala tickets',
          'Complimentary 2 Welcome Dinner tickets',
          'Hands-on training room use (2h): 1 slot',
          'Delegate registration discount: 20% Off',
          'Standard exhibition booth: Special 1',
          'Logo on backdrop & printed materials: Size 5',
          'Verbal thank-you announcement: Yes',
          'Society website banner advertisement: 2 Months',
          'Standee at hall entrance: 1 pc',
          'Product promotion posts on Web/Page: 3 posts',
          'Appreciation certificate & souvenir: Yes'
        ],
        isActive: true
      },
      {
        id: 'gold',
        name: 'Vàng',
        nameEn: 'Gold Partner',
        fee: 300000000,
        color: '#f59e0b',
        benefits: [
          'Tặng 30 vé tham dự Gala',
          'Tặng 1 vé tham dự tiệc Chào mừng',
          'Giá sử dụng phòng Hand-on training (2h): 1 suất',
          'Đại biểu đăng ký qua nhà tài trợ: Giảm 15%',
          'Gian hàng theo tiêu chuẩn: Đặc biệt 2',
          'Logo trên backdrop và các ấn phẩm: Cỡ size 4',
          'Nêu tên cảm ơn trong suốt chương trình: Có',
          'Banner trên web hội: 1 tháng',
          'Standee trước cửa hội trường: Không',
          'Đăng bài viết về sản phẩm trên Web, page hội: 2 bài',
          'Giấy cảm ơn và quà lưu niệm: Có'
        ],
        benefitsEn: [
          'Complimentary 30 Gala tickets',
          'Complimentary 1 Welcome Dinner ticket',
          'Hands-on training room use (2h): 1 slot',
          'Delegate registration discount: 15% Off',
          'Standard exhibition booth: Special 2',
          'Logo on backdrop & printed materials: Size 4',
          'Verbal thank-you announcement: Yes',
          'Society website banner advertisement: 1 Month',
          'Standee at hall entrance: No',
          'Product promotion posts on Web/Page: 2 posts',
          'Appreciation certificate & souvenir: Yes'
        ],
        isActive: true
      },
      {
        id: 'silver',
        name: 'Bạc',
        nameEn: 'Silver Partner',
        fee: 200000000,
        color: '#94a3b8',
        benefits: [
          'Tặng 20 vé tham dự Gala',
          'Không có vé tham dự tiệc Chào mừng',
          'Giá sử dụng phòng Hand-on training (2h): Ưu đãi 50%',
          'Đại biểu đăng ký qua nhà tài trợ: Giảm 10%',
          'Gian hàng theo tiêu chuẩn: Ưu tiên 1',
          'Logo trên backdrop và các ấn phẩm: Cỡ size 3',
          'Nêu tên cảm ơn trong suốt chương trình: Có',
          'Banner trên web hội: Không',
          'Standee trước cửa hội trường: Không',
          'Đăng bài viết về sản phẩm trên Web, page hội: 1 bài',
          'Giấy cảm ơn và quà lưu niệm: Có'
        ],
        benefitsEn: [
          'Complimentary 20 Gala tickets',
          'No Welcome Dinner tickets',
          'Hands-on training room use (2h): 50% Discount',
          'Delegate registration discount: 10% Off',
          'Standard exhibition booth: Priority 1',
          'Logo on backdrop & printed materials: Size 3',
          'Verbal thank-you announcement: Yes',
          'Society website banner advertisement: No',
          'Standee at hall entrance: No',
          'Product promotion posts on Web/Page: 1 post',
          'Appreciation certificate & souvenir: Yes'
        ],
        isActive: true
      },
      {
        id: 'bronze',
        name: 'Đồng',
        nameEn: 'Bronze Partner',
        fee: 100000000,
        color: '#d97706',
        benefits: [
          'Tặng 10 vé tham dự Gala',
          'Không có vé tham dự tiệc Chào mừng',
          'Giá sử dụng phòng Hand-on training (2h): Ưu đãi 40%',
          'Đại biểu đăng ký qua nhà tài trợ: Giảm 5%',
          'Gian hàng theo tiêu chuẩn: Ưu tiên 2',
          'Logo trên backdrop và các ấn phẩm: Cỡ size 2',
          'Nêu tên cảm ơn trong suốt chương trình: Có',
          'Banner trên web hội: Không',
          'Standee trước cửa hội trường: Không',
          'Đăng bài viết về sản phẩm trên Web, page hội: 1 bài',
          'Giấy cảm ơn và quà lưu niệm: Có'
        ],
        benefitsEn: [
          'Complimentary 10 Gala tickets',
          'No Welcome Dinner tickets',
          'Hands-on training room use (2h): 40% Discount',
          'Delegate registration discount: 5% Off',
          'Standard exhibition booth: Priority 2',
          'Logo on backdrop & printed materials: Size 2',
          'Verbal thank-you announcement: Yes',
          'Society website banner advertisement: No',
          'Standee at hall entrance: No',
          'Product promotion posts on Web/Page: 1 post',
          'Appreciation certificate & souvenir: Yes'
        ],
        isActive: true
      },
      {
        id: 'standard',
        name: 'Tiêu Chuẩn',
        nameEn: 'Standard Partner',
        fee: 50000000,
        color: '#64748b',
        benefits: [
          'Không có vé tham dự Gala',
          'Không có vé tham dự tiệc Chào mừng',
          'Giá sử dụng phòng Hand-on training (2h): Ưu đãi 30%',
          'Không có ưu đãi đăng ký đại biểu',
          'Gian hàng theo tiêu chuẩn: Cơ bản',
          'Logo trên backdrop và các ấn phẩm: Cỡ size 1',
          'Nêu tên cảm ơn trong suốt chương trình: Có',
          'Banner trên web hội: Không',
          'Standee trước cửa hội trường: Không',
          'Không có bài viết trên Web, page hội',
          'Giấy cảm ơn và quà lưu niệm: Có'
        ],
        benefitsEn: [
          'No Gala tickets',
          'No Welcome Dinner tickets',
          'Hands-on training room use (2h): 30% Discount',
          'No delegate registration discount',
          'Standard exhibition booth: Basic',
          'Logo on backdrop & printed materials: Size 1',
          'Verbal thank-you announcement: Yes',
          'Society website banner advertisement: No',
          'Standee at hall entrance: No',
          'No product promotion posts on Web/Page',
          'Appreciation certificate & souvenir: Yes'
        ],
        isActive: true
      }
    ],
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

const DEFAULT_ONESIGNAL_CONFIG: OneSignalConfig = {
  appId: '',
  restApiKey: '',
  safariWebId: '',
  isEnabled: false,
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
  private static KEY_RESEND = 'vsaps_config_resend';
  private static KEY_TEMPLATES = 'vsaps_templates';
  private static KEY_SUPABASE = 'vsaps_supabase';
  private static KEY_NOTIFICATION_LOGS = 'vsaps_notification_logs';
  private static KEY_SPECIALTY_TRACKS = 'vsaps_specialty_tracks';
  private static KEY_BUSINESS_CONFIG = 'vsaps_business_config';
  private static KEY_EMBED_SCRIPTS = 'vsaps_embed_scripts';
  private static KEY_SEPAY = 'vsaps_config_sepay';
  private static KEY_WHATSAPP = 'vsaps_config_whatsapp';
  private static KEY_ROOMS = 'vsaps_schedule_rooms';
  private static KEY_DATES = 'vsaps_schedule_dates';
  private static KEY_SHIFTS = 'vsaps_schedule_shifts';
  private static KEY_SECTIONS = 'vsaps_schedule_sections';
  private static KEY_ONESIGNAL = 'vsaps_config_onesignal';
  private static KEY_CONTACTS = 'vsaps_contacts';
  private static KEY_BOOTHS = 'vsaps_booths';
  private static KEY_BOOTH_LAYOUT_MAP = 'vsaps_booth_layout_map';

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
  private resendConfig: ResendConfig = DEFAULT_RESEND_CONFIG;
  private whatsappConfig: WhatsappConfig = DEFAULT_WHATSAPP_CONFIG;
  private templates: NotificationTemplate[] = [];
  private supabaseConfig: SupabaseConfig = { url: '', anonKey: '', isConnected: false };
  private notificationLogs: SentNotificationLog[] = [];
  private specialtyTracks: SpecialtyTrack[] = [];
  private businessConfig: BusinessConfig = DEFAULT_BUSINESS_CONFIG;
  private embedScripts: EmbedScript[] = [];
  private sepayConfig: SepayConfig = DEFAULT_SEPAY_CONFIG;
  private oneSignalConfig: OneSignalConfig = DEFAULT_ONESIGNAL_CONFIG;
  private pendingSyncAttendeeIds: string[] = [];
  private rooms: string[] = [];
  private dates: string[] = [];
  private shifts: ConferenceShift[] = [];
  private virtualSections: VirtualSection[] = [];
  private contacts: Contact[] = [];
  private booths: string[] = [];
  private boothLayoutMap: string = '/booth_layout_map.png';

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
    this.resendConfig = this.getLocalStorage(DataStore.KEY_RESEND, DEFAULT_RESEND_CONFIG);
    this.templates = this.getLocalStorage(DataStore.KEY_TEMPLATES, INITIAL_TEMPLATES);
    this.supabaseConfig = this.getLocalStorage(DataStore.KEY_SUPABASE, { url: '', anonKey: '', isConnected: false });
    this.notificationLogs = this.getLocalStorage(DataStore.KEY_NOTIFICATION_LOGS, []);
    this.specialtyTracks = this.getLocalStorage(DataStore.KEY_SPECIALTY_TRACKS, INITIAL_TRACKS);
    this.pendingSyncAttendeeIds = this.getLocalStorage('vsaps_pending_sync_attendees', []);
    const savedConfig = this.getLocalStorage(DataStore.KEY_BUSINESS_CONFIG, DEFAULT_BUSINESS_CONFIG);
    this.businessConfig = {
      ...DEFAULT_BUSINESS_CONFIG,
      ...savedConfig,
      delegateFormConfig: savedConfig.delegateFormConfig || DEFAULT_BUSINESS_CONFIG.delegateFormConfig,
      speakerFormConfig: savedConfig.speakerFormConfig || DEFAULT_BUSINESS_CONFIG.speakerFormConfig,
      sponsorFormConfig: savedConfig.sponsorFormConfig || DEFAULT_BUSINESS_CONFIG.sponsorFormConfig,
      cmeTemplateConfig: savedConfig.cmeTemplateConfig || DEFAULT_BUSINESS_CONFIG.cmeTemplateConfig,
    };

    
    // Auto-migrate old/empty appUrl
    if (!this.businessConfig.appUrl || this.businessConfig.appUrl.includes('vsaps2026-delta.vercel.app')) {
      this.businessConfig.appUrl = 'https://vsaps2026.vercel.app';
      this.saveToLocalStorage(DataStore.KEY_BUSINESS_CONFIG, this.businessConfig);
    }

    this.rooms = this.getLocalStorage(DataStore.KEY_ROOMS, ['Hội trường 1', 'Hội trường 2', 'Hội trường 3', 'Hội trường 4']);
    this.dates = this.getLocalStorage(DataStore.KEY_DATES, ['2026-12-11', '2026-12-12']);
    this.shifts = this.getLocalStorage(DataStore.KEY_SHIFTS, [
      { id: 'sang', name: 'Buổi Sáng', startTime: '08:00', endTime: '12:00' },
      { id: 'chieu', name: 'Buổi Chiều', startTime: '13:00', endTime: '18:00' }
    ]);
    this.virtualSections = this.getLocalStorage(DataStore.KEY_SECTIONS, []);
    this.embedScripts = this.getLocalStorage(DataStore.KEY_EMBED_SCRIPTS, INITIAL_EMBED_SCRIPTS);
    this.sepayConfig = this.getLocalStorage(DataStore.KEY_SEPAY, DEFAULT_SEPAY_CONFIG);
    this.whatsappConfig = this.getLocalStorage(DataStore.KEY_WHATSAPP, DEFAULT_WHATSAPP_CONFIG);
    this.oneSignalConfig = this.getLocalStorage(DataStore.KEY_ONESIGNAL, DEFAULT_ONESIGNAL_CONFIG);
    this.contacts = this.getLocalStorage(DataStore.KEY_CONTACTS, []);
    this.booths = this.getLocalStorage(DataStore.KEY_BOOTHS, ['A1', 'A2', 'A3', 'B1', 'B2', 'B3', 'C1', 'C2']);
    this.boothLayoutMap = this.getLocalStorage(DataStore.KEY_BOOTH_LAYOUT_MAP, '/booth_layout_map.png');
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
        { data: dbRooms },
        { data: dbDates },
        { data: dbShifts },
        { data: dbSections },
        { data: dbContacts },
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
        Promise.resolve(supabase.from('rooms').select('*')).catch(() => ({ data: null })),
        Promise.resolve(supabase.from('schedule_dates').select('*')).catch(() => ({ data: null })),
        Promise.resolve(supabase.from('shifts').select('*')).catch(() => ({ data: null })),
        Promise.resolve(supabase.from('virtual_sections').select('*')).catch(() => ({ data: null })),
        Promise.resolve(supabase.from('contacts').select('*')).catch(() => ({ data: null })),
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
          cmeTemplateConfig: dbConfig.cmeTemplateConfig || DEFAULT_BUSINESS_CONFIG.cmeTemplateConfig,
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
        const dbAttendees = attendees.map(mapDbToAttendee);
        // Merge dbAttendees with local memory, but preserve local unsynced records
        this.attendees = dbAttendees.map(dbAtt => {
          if (this.pendingSyncAttendeeIds.includes(dbAtt.id)) {
            // Keep local version for unsynced attendees
            return this.attendees.find(a => a.id === dbAtt.id) || dbAtt;
          }
          return dbAtt;
        });
        
        // Also keep any local new attendees that are not in dbAttendees yet
        this.attendees.forEach(localAtt => {
          if (this.pendingSyncAttendeeIds.includes(localAtt.id) && !dbAttendees.some(dbAtt => dbAtt.id === localAtt.id)) {
            if (!this.attendees.some(a => a.id === localAtt.id)) {
              this.attendees.push(localAtt);
            }
          }
        });
        
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
        const resend = configs.find(c => c.key === 'resend_config');
        if (resend) {
          this.resendConfig = resend.value;
          this.saveToLocalStorage(DataStore.KEY_RESEND, this.resendConfig);
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
        const onesignal = configs.find(c => c.key === 'onesignal_config');
        if (onesignal) {
          this.oneSignalConfig = onesignal.value;
          this.saveToLocalStorage(DataStore.KEY_ONESIGNAL, this.oneSignalConfig);
        }
        const boothsConfig = configs.find(c => c.key === 'booths_config');
        if (boothsConfig) {
          this.booths = boothsConfig.value;
          this.saveToLocalStorage(DataStore.KEY_BOOTHS, this.booths);
        }
        const layoutMapConfig = configs.find(c => c.key === 'booth_layout_map_config');
        if (layoutMapConfig) {
          this.boothLayoutMap = layoutMapConfig.value;
          this.saveToLocalStorage(DataStore.KEY_BOOTH_LAYOUT_MAP, this.boothLayoutMap);
        }
      }

      if (dbRooms && dbRooms.length > 0) {
        this.rooms = dbRooms.map(mapDbToRoom);
        this.saveToLocalStorage(DataStore.KEY_ROOMS, this.rooms);
      }
      if (dbDates && dbDates.length > 0) {
        this.dates = dbDates.map(mapDbToScheduleDate);
        this.saveToLocalStorage(DataStore.KEY_DATES, this.dates);
      }
      if (dbShifts && dbShifts.length > 0) {
        this.shifts = dbShifts.map(mapDbToShift);
        this.saveToLocalStorage(DataStore.KEY_SHIFTS, this.shifts);
      }
      if (dbSections && dbSections.length > 0) {
        this.virtualSections = dbSections.map(mapDbToVirtualSection);
        this.saveToLocalStorage(DataStore.KEY_SECTIONS, this.virtualSections);
      }
      if (dbContacts) {
        this.contacts = dbContacts.map(mapDbToContact);
        this.saveToLocalStorage(DataStore.KEY_CONTACTS, this.contacts);
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

    // Listen to contacts table updates
    supabase.channel('db-contacts')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'contacts' }, (payload) => {
        const { eventType, new: newRow, old: oldRow } = payload;
        if (eventType === 'INSERT' || eventType === 'UPDATE') {
          const contact = mapDbToContact(newRow);
          const idx = this.contacts.findIndex(c => c.id === contact.id);
          if (idx >= 0) this.contacts[idx] = contact;
          else this.contacts.push(contact);
        } else if (eventType === 'DELETE') {
          this.contacts = this.contacts.filter(c => c.id !== oldRow.id);
        }
        this.saveToLocalStorage(DataStore.KEY_CONTACTS, this.contacts);
        window.dispatchEvent(new CustomEvent('store-updated', { detail: { table: 'contacts' } }));
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

  private stripBase64FromData(data: any): any {
    if (!data) return data;

    const stripIfBase64 = (val: any): any => {
      if (typeof val === 'string' && val.startsWith('data:')) {
        return `[image_stripped_due_to_local_quota_size_${val.substring(0, 30).replace(/[^a-zA-Z0-9]/g, '_')}...]`;
      }
      return val;
    };

    if (Array.isArray(data)) {
      return data.map(item => this.stripBase64FromData(item));
    } else if (typeof data === 'object') {
      const copy = { ...data };
      for (const k in copy) {
        if (Object.prototype.hasOwnProperty.call(copy, k)) {
          const val = copy[k];
          if (typeof val === 'string' && val.startsWith('data:')) {
            copy[k] = stripIfBase64(val);
          } else if (typeof val === 'object' && val !== null) {
            copy[k] = this.stripBase64FromData(val);
          }
        }
      }
      return copy;
    }
    return data;
  }

  private saveToLocalStorage(key: string, data: any) {
    try {
      localStorage.setItem(key, JSON.stringify(data));
    } catch (e: any) {
      const isQuotaError = 
        e.name === 'QuotaExceededError' || 
        e.name === 'NS_ERROR_DOM_QUOTA_REACHED' || 
        e.code === 22 || 
        e.number === 0x80530016 ||
        (e.message && e.message.toLowerCase().includes('quota')) ||
        (e.message && e.message.toLowerCase().includes('exceeded'));

      if (isQuotaError) {
        console.warn(`⚠️ LocalStorage quota exceeded for key "${key}". Cleaning up base64 image data and retrying...`);
        const cleanedData = this.stripBase64FromData(data);
        
        // Update in-memory reference to prevent subsequent saving loops in this session
        if (key === DataStore.KEY_SPEAKERS) {
          this.speakers = cleanedData;
        } else if (key === DataStore.KEY_ATTENDEES) {
          this.attendees = cleanedData;
        } else if (key === DataStore.KEY_SPONSORS) {
          this.sponsors = cleanedData;
        } else if (key === DataStore.KEY_CONTACTS) {
          this.contacts = cleanedData;
        }

        try {
          localStorage.setItem(key, JSON.stringify(cleanedData));
          console.log(`✅ Successfully saved cleaned data for key "${key}" after quota cleanup.`);
        } catch (retryErr) {
          console.error(`❌ Still exceeded quota even after stripping base64 data for key "${key}":`, retryErr);
        }
      } else {
        console.error(`Error saving to localStorage for key "${key}":`, e);
        throw e;
      }
    }
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
    this.addPendingSyncAttendeeId(attendee.id);

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
          if (error) {
            console.error(`Error ${isNew ? 'inserting' : 'upserting'} attendee to Supabase:`, error);
          } else {
            this.removePendingSyncAttendeeId(attendee.id);
            window.dispatchEvent(new CustomEvent('pending-sync-updated'));
          }
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

          if (speaker.documentUrl && speaker.documentUrl.includes('data:')) {
            const urls = speaker.documentUrl.split('|');
            const uploadedUrls = [];
            for (let i = 0; i < urls.length; i++) {
              const url = urls[i];
              if (url.startsWith('data:')) {
                let ext = 'pdf';
                const mimeMatch = url.match(/^data:([^;]+);base64,/);
                if (mimeMatch) {
                  const mime = mimeMatch[1];
                  if (mime.includes('pdf')) ext = 'pdf';
                  else if (mime.includes('word') || mime.includes('document')) ext = 'docx';
                  else if (mime.includes('sheet') || mime.includes('excel')) ext = 'xlsx';
                  else {
                    const parts = mime.split('/');
                    ext = parts[parts.length - 1] || 'pdf';
                  }
                }
                const path = `documents/${speaker.id}-${i}-${Date.now()}.${ext}`;
                const publicUrl = await uploadToSupabaseStorage(path, url);
                if (publicUrl) {
                  uploadedUrls.push(publicUrl);
                }
              } else {
                uploadedUrls.push(url);
              }
            }
            if (uploadedUrls.length > 0) {
              updatedSpeaker.documentUrl = uploadedUrls.join('|');
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

        if (speaker.documentUrl && speaker.documentUrl.includes('data:')) {
          const urls = speaker.documentUrl.split('|');
          const uploadedUrls = [];
          for (let i = 0; i < urls.length; i++) {
            const url = urls[i];
            if (url.startsWith('data:')) {
              let ext = 'pdf';
              const mimeMatch = url.match(/^data:([^;]+);base64,/);
              if (mimeMatch) {
                const mime = mimeMatch[1];
                if (mime.includes('pdf')) ext = 'pdf';
                else if (mime.includes('word') || mime.includes('document')) ext = 'docx';
                else if (mime.includes('sheet') || mime.includes('excel')) ext = 'xlsx';
                else {
                  const parts = mime.split('/');
                  ext = parts[parts.length - 1] || 'pdf';
                }
              }
              const path = `documents/${speaker.id}-${i}-${Date.now()}.${ext}`;
              const publicUrl = await uploadToSupabaseStorage(path, url);
              if (publicUrl) {
                uploadedUrls.push(publicUrl);
              }
            } else {
              uploadedUrls.push(url);
            }
          }
          if (uploadedUrls.length > 0) {
            updatedSpeaker.documentUrl = uploadedUrls.join('|');
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
            const zTmpl = this.templates.find(t => t.channel === 'zalo' && t.type === 'payment_confirmed');
            this.sendZaloZNS(attendee, zTmpl?.id || 'payment_confirmed');

            const eTmpl = this.templates.find(t => t.channel === 'email' && t.type === 'payment_confirmed');
            this.sendEmail(attendee, undefined, undefined, eTmpl?.id || 'payment_confirmed');

            const wTmpl = this.templates.find(t => t.channel === 'whatsapp' && t.type === 'payment_confirmed');
            this.sendWhatsapp(attendee, wTmpl?.id || 'payment_confirmed');
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

  getBooths() {
    return this.booths;
  }

  saveBooths(booths: string[]) {
    this.booths = booths;
    this.saveToLocalStorage(DataStore.KEY_BOOTHS, booths);

    if (isSupabaseConfigured()) {
      supabase.from('system_config').upsert({ key: 'booths_config', value: booths }).then(({ error }) => {
        if (error) console.error('Error saving booths config to Supabase:', error);
      });
    }
    return booths;
  }

  getBoothLayoutMap() {
    return this.boothLayoutMap;
  }

  async saveBoothLayoutMap(url: string) {
    let finalUrl = url;
    if (isSupabaseConfigured() && url.startsWith('data:')) {
      try {
        const ext = url.split(';')[0].split('/')[1] || 'png';
        const path = `layouts/booth_layout_map-${Date.now()}.${ext}`;
        const publicUrl = await uploadToSupabaseStorage(path, url);
        if (publicUrl) {
          finalUrl = publicUrl;
        }
      } catch (err) {
        console.error('Error uploading booth layout map to Supabase:', err);
      }
    }

    this.boothLayoutMap = finalUrl;
    this.saveToLocalStorage(DataStore.KEY_BOOTH_LAYOUT_MAP, finalUrl);

    if (isSupabaseConfigured()) {
      await supabase.from('system_config').upsert({ key: 'booth_layout_map_config', value: finalUrl });
    }
    return finalUrl;
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
        const response = await fetch('/api/zalo?action=refresh-token', {
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
    window.dispatchEvent(new CustomEvent('store-updated', { detail: { table: 'system_config', key: 'email_config' } }));
    return config;
  }

  getResendConfig() { return this.resendConfig; }
  saveResendConfig(config: ResendConfig) {
    this.resendConfig = config;
    this.saveToLocalStorage(DataStore.KEY_RESEND, config);

    if (isSupabaseConfigured()) {
      supabase.from('system_config').upsert({ key: 'resend_config', value: config }).then(({ error }) => {
        if (error) console.error('Error saving Resend config to Supabase:', error);
      });
    }
    window.dispatchEvent(new CustomEvent('store-updated', { detail: { table: 'system_config', key: 'resend_config' } }));
    return config;
  }

  getContacts() { return this.contacts; }

  async saveContact(contact: Contact): Promise<Contact> {
    const idx = this.contacts.findIndex(c => c.id === contact.id);
    const isNew = idx < 0;
    if (!isNew) {
      this.contacts[idx] = contact;
    } else {
      this.contacts.push(contact);
    }
    this.saveToLocalStorage(DataStore.KEY_CONTACTS, this.contacts);

    if (isSupabaseConfigured()) {
      try {
        const dbRecord = mapContactToDb(contact);
        const query = isNew
          ? supabase.from('contacts').insert(dbRecord)
          : supabase.from('contacts').upsert(dbRecord);
        const { error } = await query;
        if (error) {
          console.error('Error saving contact to Supabase:', error);
        }
      } catch (err) {
        console.error('Error during background upload/sync of contact:', err);
      }
    }
    window.dispatchEvent(new CustomEvent('store-updated', { detail: { table: 'contacts' } }));
    return contact;
  }

  async saveContacts(contacts: Contact[]): Promise<Contact[]> {
    for (const contact of contacts) {
      const idx = this.contacts.findIndex(c => c.id === contact.id);
      if (idx >= 0) {
        this.contacts[idx] = contact;
      } else {
        this.contacts.push(contact);
      }
    }
    this.saveToLocalStorage(DataStore.KEY_CONTACTS, this.contacts);

    if (isSupabaseConfigured() && contacts.length > 0) {
      try {
        const dbRecords = contacts.map(mapContactToDb);
        const { error } = await supabase.from('contacts').upsert(dbRecords);
        if (error) {
          console.error('Error upserting contacts to Supabase:', error);
        }
      } catch (err) {
        console.error('Error during batch contacts sync:', err);
      }
    }
    window.dispatchEvent(new CustomEvent('store-updated', { detail: { table: 'contacts' } }));
    return contacts;
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
  async saveBusinessConfig(config: BusinessConfig) {
    if (isSupabaseConfigured() && config.eventDetailsConfig) {
      const edc = config.eventDetailsConfig;
      if (edc.heroBannerUrl && edc.heroBannerUrl.startsWith('data:')) {
        const path = `event_details/hero_banner_${Date.now()}.png`;
        const publicUrl = await uploadToSupabaseStorage(path, edc.heroBannerUrl);
        if (publicUrl) edc.heroBannerUrl = publicUrl;
      }
      if (edc.posterImageUrl && edc.posterImageUrl.startsWith('data:')) {
        const path = `event_details/poster_${Date.now()}.png`;
        const publicUrl = await uploadToSupabaseStorage(path, edc.posterImageUrl);
        if (publicUrl) edc.posterImageUrl = publicUrl;
      }
      if (edc.highlightSpeakers && edc.highlightSpeakers.length > 0) {
        for (const spk of edc.highlightSpeakers) {
          if (spk.avatarUrl && spk.avatarUrl.startsWith('data:')) {
            const path = `event_details/speaker_${spk.id}_${Date.now()}.png`;
            const publicUrl = await uploadToSupabaseStorage(path, spk.avatarUrl);
            if (publicUrl) spk.avatarUrl = publicUrl;
          }
        }
      }
    }

    this.businessConfig = config;
    this.saveToLocalStorage(DataStore.KEY_BUSINESS_CONFIG, config);

    if (isSupabaseConfigured()) {
      const { error } = await supabase.from('business_config').upsert(mapBusinessConfigToDb(config));
      if (error) console.error('Error saving Business Config to Supabase:', error);
    }
    return config;
  }

  getSponsorPackages(): SponsorPackage[] {
    const config = this.getBusinessConfig();
    if (config.sponsorFormConfig && config.sponsorFormConfig.sponsorPackages && config.sponsorFormConfig.sponsorPackages.length > 0) {
      return config.sponsorFormConfig.sponsorPackages;
    }
    // Default fallback
    return [
      {
        id: 'diamond',
        name: 'Kim Cương',
        nameEn: 'Diamond Partner',
        fee: 600000000,
        color: '#6366f1',
        benefits: [
          'Tặng 50 vé tham dự Gala',
          'Tặng 3 vé tham dự tiệc Chào mừng',
          'Giá sử dụng phòng Hand-on training (2h): 2 suất',
          'Đại biểu đăng ký qua nhà tài trợ: Giảm 25%',
          'Gian hàng theo tiêu chuẩn: Độc quyền',
          'Logo trên backdrop và các ấn phẩm: Cỡ size 6',
          'Nêu tên cảm ơn trong suốt chương trình: Có',
          'Banner trên web hội: 3 tháng',
          'Standee trước cửa hội trường: 2 cái',
          'Đăng bài viết về sản phẩm trên Web, page hội: 5 bài',
          'Giấy cảm ơn và quà lưu niệm: Có'
        ],
        benefitsEn: [
          'Complimentary 50 Gala tickets',
          'Complimentary 3 Welcome Dinner tickets',
          'Hands-on training room use (2h): 2 slots',
          'Delegate registration discount: 25% Off',
          'Standard exhibition booth: Exclusive',
          'Logo on backdrop & printed materials: Size 6',
          'Verbal thank-you announcement: Yes',
          'Society website banner advertisement: 3 Months',
          'Standee at hall entrance: 2 pcs',
          'Product promotion posts on Web/Page: 5 posts',
          'Appreciation certificate & souvenir: Yes'
        ],
        isActive: true
      },
      {
        id: 'platinum',
        name: 'Bạch Kim',
        nameEn: 'Platinum Partner',
        fee: 400000000,
        color: '#8b5cf6',
        benefits: [
          'Tặng 40 vé tham dự Gala',
          'Tặng 2 vé tham dự tiệc Chào mừng',
          'Giá sử dụng phòng Hand-on training (2h): 1 suất',
          'Đại biểu đăng ký qua nhà tài trợ: Giảm 20%',
          'Gian hàng theo tiêu chuẩn: Đặc biệt 1',
          'Logo trên backdrop và các ấn phẩm: Cỡ size 5',
          'Nêu tên cảm ơn trong suốt chương trình: Có',
          'Banner trên web hội: 2 tháng',
          'Standee trước cửa hội trường: 1 cái',
          'Đăng bài viết về sản phẩm trên Web, page hội: 3 bài',
          'Giấy cảm ơn và quà lưu niệm: Có'
        ],
        benefitsEn: [
          'Complimentary 40 Gala tickets',
          'Complimentary 2 Welcome Dinner tickets',
          'Hands-on training room use (2h): 1 slot',
          'Delegate registration discount: 20% Off',
          'Standard exhibition booth: Special 1',
          'Logo on backdrop & printed materials: Size 5',
          'Verbal thank-you announcement: Yes',
          'Society website banner advertisement: 2 Months',
          'Standee at hall entrance: 1 pc',
          'Product promotion posts on Web/Page: 3 posts',
          'Appreciation certificate & souvenir: Yes'
        ],
        isActive: true
      },
      {
        id: 'gold',
        name: 'Vàng',
        nameEn: 'Gold Partner',
        fee: 300000000,
        color: '#f59e0b',
        benefits: [
          'Tặng 30 vé tham dự Gala',
          'Tặng 1 vé tham dự tiệc Chào mừng',
          'Giá sử dụng phòng Hand-on training (2h): 1 suất',
          'Đại biểu đăng ký qua nhà tài trợ: Giảm 15%',
          'Gian hàng theo tiêu chuẩn: Đặc biệt 2',
          'Logo trên backdrop và các ấn phẩm: Cỡ size 4',
          'Nêu tên cảm ơn trong suốt chương trình: Có',
          'Banner trên web hội: 1 tháng',
          'Standee trước cửa hội trường: Không',
          'Đăng bài viết về sản phẩm trên Web, page hội: 2 bài',
          'Giấy cảm ơn và quà lưu niệm: Có'
        ],
        benefitsEn: [
          'Complimentary 30 Gala tickets',
          'Complimentary 1 Welcome Dinner ticket',
          'Hands-on training room use (2h): 1 slot',
          'Delegate registration discount: 15% Off',
          'Standard exhibition booth: Special 2',
          'Logo on backdrop & printed materials: Size 4',
          'Verbal thank-you announcement: Yes',
          'Society website banner advertisement: 1 Month',
          'Standee at hall entrance: No',
          'Product promotion posts on Web/Page: 2 posts',
          'Appreciation certificate & souvenir: Yes'
        ],
        isActive: true
      },
      {
        id: 'silver',
        name: 'Bạc',
        nameEn: 'Silver Partner',
        fee: 200000000,
        color: '#94a3b8',
        benefits: [
          'Tặng 20 vé tham dự Gala',
          'Không có vé tham dự tiệc Chào mừng',
          'Giá sử dụng phòng Hand-on training (2h): Ưu đãi 50%',
          'Đại biểu đăng ký qua nhà tài trợ: Giảm 10%',
          'Gian hàng theo tiêu chuẩn: Ưu tiên 1',
          'Logo trên backdrop và các ấn phẩm: Cỡ size 3',
          'Nêu tên cảm ơn trong suốt chương trình: Có',
          'Banner trên web hội: Không',
          'Standee trước cửa hội trường: Không',
          'Đăng bài viết về sản phẩm trên Web, page hội: 1 bài',
          'Giấy cảm ơn và quà lưu niệm: Có'
        ],
        benefitsEn: [
          'Complimentary 20 Gala tickets',
          'No Welcome Dinner tickets',
          'Hands-on training room use (2h): 50% Discount',
          'Delegate registration discount: 10% Off',
          'Standard exhibition booth: Priority 1',
          'Logo on backdrop & printed materials: Size 3',
          'Verbal thank-you announcement: Yes',
          'Society website banner advertisement: No',
          'Standee at hall entrance: No',
          'Product promotion posts on Web/Page: 1 post',
          'Appreciation certificate & souvenir: Yes'
        ],
        isActive: true
      },
      {
        id: 'bronze',
        name: 'Đồng',
        nameEn: 'Bronze Partner',
        fee: 100000000,
        color: '#d97706',
        benefits: [
          'Tặng 10 vé tham dự Gala',
          'Không có vé tham dự tiệc Chào mừng',
          'Giá sử dụng phòng Hand-on training (2h): Ưu đãi 40%',
          'Đại biểu đăng ký qua nhà tài trợ: Giảm 5%',
          'Gian hàng theo tiêu chuẩn: Ưu tiên 2',
          'Logo trên backdrop và các ấn phẩm: Cỡ size 2',
          'Nêu tên cảm ơn trong suốt chương trình: Có',
          'Banner trên web hội: Không',
          'Standee trước cửa hội trường: Không',
          'Đăng bài viết về sản phẩm trên Web, page hội: 1 bài',
          'Giấy cảm ơn và quà lưu niệm: Có'
        ],
        benefitsEn: [
          'Complimentary 10 Gala tickets',
          'No Welcome Dinner tickets',
          'Hands-on training room use (2h): 40% Discount',
          'Delegate registration discount: 5% Off',
          'Standard exhibition booth: Priority 2',
          'Logo on backdrop & printed materials: Size 2',
          'Verbal thank-you announcement: Yes',
          'Society website banner advertisement: No',
          'Standee at hall entrance: No',
          'Product promotion posts on Web/Page: 1 post',
          'Appreciation certificate & souvenir: Yes'
        ],
        isActive: true
      },
      {
        id: 'standard',
        name: 'Tiêu Chuẩn',
        nameEn: 'Standard Partner',
        fee: 50000000,
        color: '#64748b',
        benefits: [
          'Không có vé tham dự Gala',
          'Không có vé tham dự tiệc Chào mừng',
          'Giá sử dụng phòng Hand-on training (2h): Ưu đãi 30%',
          'Không có ưu đãi đăng ký đại biểu',
          'Gian hàng theo tiêu chuẩn: Cơ bản',
          'Logo trên backdrop và các ấn phẩm: Cỡ size 1',
          'Nêu tên cảm ơn trong suốt chương trình: Có',
          'Banner trên web hội: Không',
          'Standee trước cửa hội trường: Không',
          'Không có bài viết trên Web, page hội',
          'Giấy cảm ơn và quà lưu niệm: Có'
        ],
        benefitsEn: [
          'No Gala tickets',
          'No Welcome Dinner tickets',
          'Hands-on training room use (2h): 30% Discount',
          'No delegate registration discount',
          'Standard exhibition booth: Basic',
          'Logo on backdrop & printed materials: Size 1',
          'Verbal thank-you announcement: Yes',
          'Society website banner advertisement: No',
          'Standee at hall entrance: No',
          'No product promotion posts on Web/Page',
          'Appreciation certificate & souvenir: Yes'
        ],
        isActive: true
      }
    ];
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

    let template = templateId ? this.templates.find(t => t.id === templateId) : null;
    if (!template && templateId === 'payment_confirmed') {
      template = this.templates.find(t => t.channel === 'zalo' && t.type === 'payment_confirmed');
    }
    if (!template) {
      if (templateId === 'payment_confirmed') {
        template = {
          id: 'tmpl-payment-zalo',
          name: 'Xác Nhận Thanh Toán Thành Công (Zalo ZNS)',
          type: 'payment_confirmed',
          channel: 'zalo',
          content: 'Xin chào {{title}} {{fullname}}. Chúng tôi xác nhận bạn đã thanh toán thành công phí tham dự Hội nghị VSAPS 2026 cho gói {{package}}. Trạng thái: {{payment_status}}.'
        };
      } else {
        template = this.templates.find(t => t.channel === 'zalo' && t.type === 'registration_success')
          || { id: 'tmpl-reg-zalo', name: 'Đăng Ký Đại Biểu Thành Công (Zalo ZNS)', type: 'registration_success', channel: 'zalo', content: 'Xin chào {{title}} {{fullname}}...' };
      }
    }

    let formattedPhone = attendee.phone.replace(/[^0-9]/g, '');
    if (formattedPhone.startsWith('0')) {
      formattedPhone = '84' + formattedPhone.substring(1);
    }

    const payStatusText = attendee.paymentStatus === 'paid' ? 'Đã Thanh Toán' : attendee.paymentStatus === 'pending_verification' ? 'Chờ Đối Soát' : 'Chưa Thanh Toán';
    const attAny = attendee as any;
    const content = template.content
      .replace(/\{\{title\}\}/g, attendee.title || '')
      .replace(/\{\{fullname\}\}/g, attendee.fullName || '')
      .replace(/\{\{package\}\}/g, attendee.packageName || '')
      .replace(/\{\{code\}\}/g, attendee.id || '')
      .replace(/\{\{payment_status\}\}/g, payStatusText)
      .replace(/\{\{organization\}\}/g, attendee.organization || '')
      .replace(/\{\{email\}\}/g, attendee.email || '')
      .replace(/\{\{phone\}\}/g, attendee.phone || '')
      .replace(/\{\{presentation_title\}\}/g, attAny.presentationTitle || '')
      .replace(/\{\{track\}\}/g, attAny.presentationTrack || '');

    const payload = {
      recipient: { phone: formattedPhone },
      template_id: template.znsTemplateId || template.id,
      template_data: {
        title: attendee.title || '',
        fullname: attendee.fullName || '',
        package: attendee.packageName || '',
        code: attendee.id || '',
        payment_status: payStatusText,
        organization: attendee.organization || '',
        email: attendee.email || '',
        phone: attendee.phone || '',
        presentation_title: attAny.presentationTitle || '',
        track: attAny.presentationTrack || '',
        qr_url: `https://api.qrserver.com/v1/create-qr-code/?size=250x250&data=${encodeURIComponent(attendee.qrCodeValue)}`
      },
      raw_text_sent: content
    };

    let status: 'success' | 'failed' = 'success';
    let responseObj: any = { message: "Tin nhắn ZNS đã xếp hàng gửi thành công qua cổng Zalo OA Sandbox" };

    const isRealZalo = (this.zaloConfig.accessToken && this.zaloConfig.accessToken !== 'zalo-oa-token-active-2026-ready-vsaps') || isSupabaseConfigured();

    if (isRealZalo) {
      try {
        const response = await fetch('/api/zalo?action=send', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            config: this.zaloConfig,
            payload: {
              recipient: { phone: formattedPhone },
              template_id: template.znsTemplateId || template.id,
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

  async sendEmail(attendee: Attendee, customSubject?: string, customBody?: string, templateId?: string): Promise<SentNotificationLog> {
    let template = templateId ? this.templates.find(t => t.id === templateId) : null;
    if (!template && templateId === 'payment_confirmed') {
      template = this.templates.find(t => t.channel === 'email' && t.type === 'payment_confirmed');
    }
    if (!template) {
      if (templateId === 'payment_confirmed') {
        template = {
          id: 'tmpl-payment-email',
          name: 'Xác Nhận Thanh Toán Thành Công (Email)',
          type: 'payment_confirmed',
          channel: 'email',
          subject: '🎯 Xác nhận thanh toán thành công VSAPS 2026',
          content: 'Xin chào {{title}} {{fullname}}.\n\nChúng tôi xin xác nhận đã nhận được thanh toán phí tham dự Hội nghị Khoa học VSAPS 2026 của bạn cho gói {{package}}.\n- Mã đại biểu: {{code}}\n- Trạng thái đóng phí: {{payment_status}}\n\nTrân trọng cảm ơn!'
        };
      } else if (templateId === 'tmpl-speaker-approved' || templateId === 'abstract_approved') {
        template = {
          id: 'tmpl-speaker-approved',
          name: 'Duyệt Đề Tài Báo Cáo Thành Công (Email)',
          type: 'abstract_approved',
          channel: 'email',
          subject: '🎉 Thư mời báo cáo & xác nhận đề tài khoa học VSAPS 2026',
          content: 'Kính gửi Báo cáo viên {{title}} {{fullname}},\n\nBan Tổ Chức Hội nghị Khoa học Thường niên VSAPS 2026 xin trân trọng thông báo: Báo cáo khoa học của Quý vị với đề tài:\n\n"{{presentation_title}}"\n\nthuộc chuyên khoa/chương trình: {{track}}\n\nĐã được Hội đồng Khoa học phê duyệt chính thức để trình bày tại hội nghị.\n\nXin trân trọng cảm ơn sự đóng góp của Quý vị cho thành công chung của Hội nghị VSAPS 2026!\n\nTrân trọng,\nBan Tổ Chức Hội nghị Khoa học VSAPS 2026.'
        };
      } else if (templateId === 'tmpl-sponsor-registered' || templateId === 'sponsor_registered') {
        template = {
          id: 'tmpl-sponsor-registered',
          name: 'Xác Nhận Đăng Ký Tài Trợ (Email)',
          type: 'sponsor_registered',
          channel: 'email',
          subject: '🤝 Xác nhận đăng ký tài trợ Hội nghị Khoa học VSAPS 2026',
          content: 'Kính gửi Đại diện {{organization}},\n\nBan Tổ Chức Hội nghị Khoa học Thường niên VSAPS 2026 xin chân thành cảm ơn Quý đơn vị đã đăng ký đồng hành cùng hội nghị với tư cách là Nhà tài trợ.\n\nTHÔNG TIN ĐĂNG KÝ CHI TIẾT:\n• Đơn vị tài trợ: {{organization}}\n• Gói tài trợ: {{package}}\n• Giá trị tài trợ: {{package_fee}} VNĐ\n• Người liên hệ: {{fullname}}\n• Số điện thoại: {{phone}}\n• Email: {{email}}\n• Vị trí gian hàng mong muốn: {{booth_location}}\n\nHệ thống đã ghi nhận thông tin đăng ký của Quý đơn vị. Ban Tổ Chức sẽ liên hệ trong thời gian sớm nhất để hoàn tất thủ tục hợp đồng và sơ đồ gian hàng.\n\nTrân trọng cảm ơn sự đồng hành của Quý đơn vị!\nBan Tổ Chức Hội nghị Khoa học VSAPS 2026.'
        };
      } else if (templateId === 'tmpl-sponsor-paid' || templateId === 'sponsor_paid') {
        template = {
          id: 'tmpl-sponsor-paid',
          name: 'Xác Nhận Thanh Toán Tài Trợ (Email)',
          type: 'sponsor_paid',
          channel: 'email',
          subject: '🎯 Xác nhận hoàn tất đóng góp tài trợ VSAPS 2026',
          content: 'Kính gửi Đại diện {{organization}},\n\nBan Tổ Chức Hội nghị Khoa học Thường niên VSAPS 2026 xin xác nhận đã tiếp nhận khoản đóng góp tài trợ từ Quý đơn vị:\n\n• Đơn vị tài trợ: {{organization}}\n• Gói tài trợ: {{package}}\n• Số tiền đã nộp: {{paid_amount}} VNĐ\n• Trạng thái đóng phí: {{payment_status}}\n\nBan Tổ Chức xin trân trọng cảm ơn sự ủng hộ và đồng hành quý báu của Quý đơn vị đối với sự thành công của Hội nghị VSAPS 2026.\n\nTrân trọng,\nBan Tổ Chức Hội nghị Khoa học VSAPS 2026.'
        };
      } else if (templateId === 'tmpl-sponsor-contract' || templateId === 'sponsor_contract') {
        template = {
          id: 'tmpl-sponsor-contract',
          name: 'Xác Nhận Ký Kết Hợp Đồng Tài Trợ (Email)',
          type: 'sponsor_contract',
          channel: 'email',
          subject: '📜 Xác nhận ký kết hợp đồng tài trợ VSAPS 2026',
          content: 'Kính gửi Đại diện {{organization}},\n\nBan Tổ Chức Hội nghị Khoa học Thường niên VSAPS 2026 xin trân trọng xác nhận Hợp đồng tài trợ của Quý đơn vị đã được ký kết thành công:\n\n• Đơn vị tài trợ: {{organization}}\n• Gói tài trợ: {{package}}\n• Số hợp đồng: {{contract_no}}\n• Trạng thái hợp đồng: Đã ký kết (Signed)\n\nBản scan hợp đồng đã được lưu trữ an toàn trên hệ thống. Ban Tổ Chức sẽ tiến hành các bước chuẩn bị gian hàng triển lãm và in ấn logo của Quý đơn vị theo đúng điều khoản cam kết.\n\nTrân trọng cảm ơn Quý đơn vị!\nBan Tổ Chức Hội nghị Khoa học VSAPS 2026.'
        };
      } else {
        template = this.templates.find(t => t.channel === 'email' && t.type === 'registration_success')
          || { id: 'tmpl-reg-email', name: 'Đăng Ký Đại Biểu Thành Công (Email)', type: 'registration_success', channel: 'email', subject: '🎯 Xác nhận bảo mẫu đăng ký thành công VSAPS 2026', content: 'Xin chào {{title}} {{fullname}}...' };
      }
    }

    const statusStr = attendee.paymentStatus as string;
    const payStatusText = statusStr === 'paid' || statusStr === 'fully_paid' ? 'Đã Thanh Toán' : 
                          statusStr === 'pending_verification' ? 'Chờ Đối Soát' : 
                          statusStr === 'partially_paid' ? 'Thanh toán một phần' : 'Chưa Thanh Toán';
    const rawContent = customBody || template.content || '';
    const attAny = attendee as any;

    const replaceAllPlaceholders = (text: string) => {
      if (!text) return '';
      let res = text;
      
      // 1. Direct backward-compatible mappings
      res = res
        .replace(/\{\{title\}\}/g, attendee.title || '')
        .replace(/\{\{fullname\}\}/g, attendee.fullName || '')
        .replace(/\{\{package\}\}/g, attendee.packageName || '')
        .replace(/\{\{code\}\}/g, attendee.id || '')
        .replace(/\{\{payment_status\}\}/g, payStatusText)
        .replace(/\{\{organization\}\}/g, attendee.organization || '')
        .replace(/\{\{email\}\}/g, attendee.email || '')
        .replace(/\{\{phone\}\}/g, attendee.phone || '')
        .replace(/\{\{company_name\}\}/g, attendee.organization || '')
        .replace(/\{\{contact_name\}\}/g, attendee.fullName || '')
        .replace(/\{\{sponsor_package\}\}/g, attendee.packageName || '')
        .replace(/\{\{presentation_title\}\}/g, attAny.presentationTitle || '')
        .replace(/\{\{track\}\}/g, attAny.presentationTrack || '')
        .replace(/\{\{pledged_amount\}\}/g, attAny.pledgedAmount !== undefined ? attAny.pledgedAmount.toLocaleString() : '')
        .replace(/\{\{paid_amount\}\}/g, attAny.paidAmount !== undefined ? attAny.paidAmount.toLocaleString() : '')
        .replace(/\{\{booth_location\}\}/g, attAny.boothLocation || 'BTC sắp xếp sau')
        .replace(/\{\{contract_no\}\}/g, attAny.contractNo || '')
        .replace(/\{\{package_fee\}\}/g, attAny.pledgedAmount !== undefined ? attAny.pledgedAmount.toLocaleString() : (attendee.packageFee ? attendee.packageFee.toLocaleString() : '0'));

      // 2. Loop through all fields of attendee object to dynamically match camelCase, lowercase, snake_case
      Object.keys(attAny).forEach(key => {
        const val = attAny[key];
        if (val !== undefined && val !== null && typeof val !== 'object') {
          let valStr = String(val);
          // Format numeric values that sound like currency / fees
          if (typeof val === 'number' && (key.toLowerCase().includes('fee') || key.toLowerCase().includes('amount') || key.toLowerCase().includes('value'))) {
            valStr = val.toLocaleString();
          } else if (typeof val === 'boolean') {
            valStr = val ? 'Có' : 'Không';
          }

          // Exact key, e.g. {{fullName}}
          res = res.replace(new RegExp(`\\{\\{${key}\\}\\}`, 'g'), valStr);
          // Lowercase key, e.g. {{fullname}}
          res = res.replace(new RegExp(`\\{\\{${key.toLowerCase()}\\}\\}`, 'g'), valStr);
          // snake_case key, e.g. {{full_name}}
          const snakeKey = key.replace(/[A-Z]/g, letter => `_${letter.toLowerCase()}`);
          res = res.replace(new RegExp(`\\{\\{${snakeKey}\\}\\}`, 'g'), valStr);
        }
      });

      // Special case for Sponsor Tax ID since it's inside notes html
      if (attAny.notes) {
        const { taxId: extractedTaxId } = extractTaxId(attAny.notes);
        if (extractedTaxId) {
          res = res.replace(/\{\{tax_id\}\}/g, extractedTaxId);
          res = res.replace(/\{\{taxId\}\}/g, extractedTaxId);
          res = res.replace(/\{\{tax_code\}\}/g, extractedTaxId);
        }
      }

      return res;
    };

    const content = replaceAllPlaceholders(rawContent);
    const finalSubject = replaceAllPlaceholders(customSubject || template.subject || "Xác nhận đăng ký VSAPS 2026");

    const payload = {
      to: attendee.email,
      from: `${this.emailConfig.senderName} <${this.emailConfig.senderEmail}>`,
      subject: finalSubject,
      body: content,
      attachment_qr: `https://api.qrserver.com/v1/create-qr-code/?size=250x250&data=${encodeURIComponent(attendee.qrCodeValue)}`
    };

    let status: 'success' | 'failed' = 'success';
    let responseObj: any = { message: "Email đã gửi thành công giả lập" };

    const isRealSmtp = this.emailConfig.smtpHost && 
                       this.emailConfig.smtpPass && 
                       this.emailConfig.smtpPass !== '*************' &&
                       this.emailConfig.smtpPass !== '';

    const canSend = isRealSmtp || isSupabaseConfigured();

    if (canSend) {
      try {
        const isHtml = /<[a-z][\s\S]*>/i.test(content);
        const formattedBody = isHtml ? content : content.replace(/\n/g, '<br/>');
        const isPaid = statusStr === 'paid' || statusStr === 'fully_paid';
        const hideQrSection = !isPaid || 
                              template?.type === 'abstract_approved' || 
                              template?.id === 'tmpl-speaker-email' || 
                              template?.id === 'tmpl-speaker-registered' ||
                              template?.id === 'tmpl-speaker-submitted-email' ||
                              template?.id === 'tmpl-speaker-approved' ||
                              template?.type?.includes('sponsor') ||
                              template?.id?.includes('sponsor') ||
                              attendee.id.includes('SPK') || 
                              attendee.id.includes('SPN');
        const emailHtml = `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 25px; border: 1px solid #e2e8f0; border-radius: 12px; background-color: #ffffff;">
            <div style="text-align: center; margin-bottom: 20px;">
              <img src="https://vzfacodpaveftuowsnze.supabase.co/storage/v1/object/public/assets/logos/email.jpg" alt="Hội Nghị Khoa Học Thường Niên VSAPS 2026" style="width: 100%; max-width: 100%; height: auto; border-radius: 8px;" />
            </div>
            
            <p style="font-size: 14px; color: #334155; line-height: 1.6;">
              ${formattedBody}
            </p>
            
            ${!hideQrSection ? `
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
            ` : ''}
          </div>
        `;

        const response = await fetch('/api/email/send', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            config: this.emailConfig,
            payload: {
              to: attendee.email,
              subject: finalSubject,
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
      status = 'failed';
      responseObj = {
        error: -1,
        message: "Cổng SMTP Outgoing Server chưa được cấu hình hoặc thông tin không đầy đủ. Vui lòng truy cập 'Cài Đặt Hệ Thống' để thiết lập máy chủ gửi mail thực tế."
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
    let template = templateId ? this.templates.find(t => t.id === templateId) : null;
    if (!template && templateId === 'payment_confirmed') {
      template = this.templates.find(t => t.channel === 'whatsapp' && t.type === 'payment_confirmed');
    }
    if (!template) {
      if (templateId === 'payment_confirmed') {
        template = {
          id: 'tmpl-payment-wa',
          name: 'Xác Nhận Thanh Toán Thành Công (WhatsApp)',
          type: 'payment_confirmed',
          channel: 'whatsapp',
          znsTemplateId: 'vsaps_payment_confirmed',
          content: '[VSAPS 2026] THANH TOÁN THÀNH CÔNG\nXin chào {{title}} {{fullname}}. Bạn đã thanh toán thành công phí tham dự Hội nghị Khoa học VSAPS 2026.\n- Gói: {{package}}\n- Mã Đại biểu: {{code}}\n- Trạng thái: {{payment_status}}.'
        };
      } else {
        template = this.templates.find(t => t.channel === 'whatsapp' && t.type === 'registration_success')
          || { 
               id: 'tmpl-reg-wa', 
               name: 'Đăng Ký Đại Biểu Thành Công (WhatsApp)', 
               type: 'registration_success', 
               channel: 'whatsapp', 
               znsTemplateId: 'vsaps_registration_success',
               content: '[VSAPS 2026] ĐĂNG KÝ THÀNH CÔNG\nXin chào {{title}} {{fullname}}. Bạn đã đăng ký thành công tham dự Hội nghị Khoa học VSAPS 2026.\n- Gói: {{package}}\n- Mã Đại biểu: {{code}}\n- Trạng thái: {{payment_status}}\nVui lòng quét mã QR vé để check-in. Trân trọng!'
             };
      }
    }

    let formattedPhone = attendee.phone.replace(/[^0-9]/g, '');
    if (formattedPhone.startsWith('0')) {
      formattedPhone = '84' + formattedPhone.substring(1);
    }

    const payStatusText = attendee.paymentStatus === 'paid' ? 'Đã Thanh Toán' : attendee.paymentStatus === 'pending_verification' ? 'Chờ Đối Soát' : 'Chưa Thanh Toán';
    const attAny = attendee as any;
    const content = template.content
      .replace(/\{\{title\}\}/g, attendee.title || '')
      .replace(/\{\{fullname\}\}/g, attendee.fullName || '')
      .replace(/\{\{package\}\}/g, attendee.packageName || '')
      .replace(/\{\{code\}\}/g, attendee.id || '')
      .replace(/\{\{payment_status\}\}/g, payStatusText)
      .replace(/\{\{organization\}\}/g, attendee.organization || '')
      .replace(/\{\{email\}\}/g, attendee.email || '')
      .replace(/\{\{phone\}\}/g, attendee.phone || '')
      .replace(/\{\{presentation_title\}\}/g, attAny.presentationTitle || '')
      .replace(/\{\{track\}\}/g, attAny.presentationTrack || '');

    const isRealWhatsapp = (this.whatsappConfig.accessToken && this.whatsappConfig.phoneNumberId) || isSupabaseConfigured();

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

  async sendEmailToSpeaker(speaker: SpeakerRegistration, templateId?: string): Promise<SentNotificationLog> {
    let template: NotificationTemplate | null = null;

    // Luôn cố gắng fetch trực tiếp từ Supabase để lấy mẫu mới nhất vừa được chỉnh sửa
    if (isSupabaseConfigured()) {
      try {
        const { data } = await supabase
          .from('notification_templates')
          .select('*')
          .eq('channel', 'email');
        
        if (data && data.length > 0) {
          const matched = data.find(t => 
            t.id === 'tmpl-speaker-registered' || 
            t.id === 'tmpl-speaker-email' || 
            t.id === 'tmpl-speaker-submitted-email' ||
            (t.name && t.name.includes('Thư xác nhận đăng ký báo cáo chuyên đề'))
          );
          if (matched) {
            template = mapDbToTemplate(matched);
            console.log('✅ Found latest speaker registration template from Supabase:', template.name);
          }
        }
      } catch (err) {
        console.error('Error fetching latest template from Supabase in sendEmailToSpeaker:', err);
      }
    }

    // Nếu không fetch được từ Supabase, fallback tìm trong cache bộ nhớ
    if (!template) {
      template = templateId ? this.templates.find(t => t.id === templateId || t.name === templateId) : null;
    }
    if (!template) {
      template = this.templates.find(t => 
        t.channel === 'email' && 
        (t.id === 'tmpl-speaker-registered' || 
         t.id === 'tmpl-speaker-email' || 
         t.id === 'tmpl-speaker-submitted-email' ||
         (t.name && t.name.includes('Thư xác nhận đăng ký báo cáo chuyên đề')))
      );
    }

    // Fallback cuối cùng
    if (!template) {
      template = {
        id: 'tmpl-speaker-registered',
        name: '📚 Thư xác nhận đăng ký báo cáo chuyên đề hội nghị VSAPS 2026',
        type: 'speaker_registered',
        channel: 'email',
        subject: '🎯 Xác nhận đệ trình đề tài báo cáo khoa học VSAPS 2026',
        content: 'Kính gửi Báo cáo viên {{title}} {{fullname}},\n\nBan Tổ Chức Hội nghị Khoa học Thường niên VSAPS 2026 xin trân trọng thông báo: Đề tài báo cáo khoa học của Quý vị đã được ghi nhận thành công trên hệ thống.\n\nTHÔNG TIN ĐỀ TRÌNH CHI TIẾT:\n• Mã hồ sơ: {{code}}\n• Báo cáo viên: {{title}} {{fullname}}\n• Đơn vị công tác: {{organization}} ({{department}})\n• Tên đề tài báo cáo: "{{presentation_title}}"\n• Chuyên đề đệ trình: {{track}}\n• Trạng thái kiểm duyệt: ĐANG CHỜ BAN KHOA HỌC XÉT DUYỆT (PENDING)\n\nHội đồng Khoa học VSAPS 2026 sẽ tiến hành bình duyệt tóm tắt đề tài (Review Abstract) trong vòng 5 ngày làm việc. Quý bác sĩ có thể tra cứu trạng thái bài viết hoặc nhận phản hồi sửa đổi thông qua tài khoản cá nhân hoặc email liên hệ.\n\nTrân trọng cảm ơn sự tham gia và đóng góp khoa học của Quý vị cho thành công của Hội nghị VSAPS 2026!\n\nTrân trọng,\nBan Tổ Chức Hội nghị Khoa học VSAPS 2026.'
      };
    }

    console.log(`✉️ Sending speaker registration confirmation email using template: "${template.name}" (${template.id})`);

    const rawContent = template.content || '';
    
    // Translate title to English if speaker is foreign
    let speakerTitle = speaker.title || '';
    if (speaker.nationality === 'foreign') {
      const titleMapping: { [key: string]: string } = {
        'GS.TS.BS': 'Prof. Dr. Med.',
        'PGS.TS.BS': 'Assoc. Prof. Dr. Med.',
        'TS.BS': 'Dr. Med. / PhD',
        'ThS.BS': 'M.Med. / Master',
        'BSCK1': 'Specialist I',
        'BSCK2': 'Specialist II',
        'BSNT': 'Resident Physician',
        'BS': 'MD (Medical Doctor)',
      };
      const trimmed = speakerTitle.trim();
      if (titleMapping[trimmed]) {
        speakerTitle = titleMapping[trimmed];
      }
    }

    const spkAny = { ...speaker, title: speakerTitle } as any;

    const replaceSpeakerPlaceholders = (text: string) => {
      if (!text) return '';
      let res = text;
      
      // 1. Direct backward-compatible mappings
      res = res
        .replace(/\{\{title\}\}/g, speakerTitle)
        .replace(/\{\{fullname\}\}/g, speaker.fullName || '')
        .replace(/\{\{code\}\}/g, speaker.id || '')
        .replace(/\{\{organization\}\}/g, speaker.organization || '')
        .replace(/\{\{department\}\}/g, speaker.department || '')
        .replace(/\{\{presentation_title\}\}/g, speaker.presentationTitle || '')
        .replace(/\{\{track\}\}/g, speaker.presentationTrack || '');

      // 2. Loop through all fields of speaker object to dynamically match camelCase, lowercase, snake_case
      Object.keys(spkAny).forEach(key => {
        const val = spkAny[key];
        if (val !== undefined && val !== null && typeof val !== 'object') {
          let valStr = String(val);
          if (typeof val === 'boolean') {
            valStr = val ? 'Có' : 'Không';
          }
          res = res.replace(new RegExp(`\\{\\{${key}\\}\\}`, 'g'), valStr);
          res = res.replace(new RegExp(`\\{\\{${key.toLowerCase()}\\}\\}`, 'g'), valStr);
          const snakeKey = key.replace(/[A-Z]/g, letter => `_${letter.toLowerCase()}`);
          res = res.replace(new RegExp(`\\{\\{${snakeKey}\\}\\}`, 'g'), valStr);
        }
      });

      return res;
    };

    const content = replaceSpeakerPlaceholders(rawContent);
    const finalSubject = replaceSpeakerPlaceholders(template.subject || "Xác nhận đệ trình báo cáo VSAPS 2026");

    const payload = {
      to: speaker.email,
      from: `${this.emailConfig.senderName} <${this.emailConfig.senderEmail}>`,
      subject: finalSubject,
      body: content
    };

    let status: 'success' | 'failed' = 'success';
    let responseObj: any = { message: "Email báo cáo viên đã gửi thành công giả lập" };

    const isRealSmtp = this.emailConfig.smtpHost && 
                       this.emailConfig.smtpPass && 
                       this.emailConfig.smtpPass !== '*************' &&
                       this.emailConfig.smtpPass !== '';

    const canSend = isRealSmtp || isSupabaseConfigured();

    if (canSend) {
      try {
        const isHtml = /<[a-z][\s\S]*>/i.test(content);
        const formattedBody = isHtml ? content : content.replace(/\n/g, '<br/>');
        const emailHtml = `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 25px; border: 1px solid #e2e8f0; border-radius: 12px; background-color: #ffffff;">
            <div style="text-align: center; margin-bottom: 20px;">
              <img src="https://vzfacodpaveftuowsnze.supabase.co/storage/v1/object/public/assets/logos/email.jpg" alt="Hội Nghị Khoa Học Thường Niên VSAPS 2026" style="width: 100%; max-width: 100%; height: auto; border-radius: 8px;" />
            </div>
            
            <p style="font-size: 14px; color: #334155; line-height: 1.6;">
              ${formattedBody}
            </p>
          </div>
        `;

        const response = await fetch('/api/email/send', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            config: this.emailConfig,
            payload: {
              to: speaker.email,
              subject: finalSubject,
              body: emailHtml
            }
          })
        });

        const resData = await response.json();
        if (resData.success) {
          responseObj = {
            message: "Email báo cáo viên gửi thành công qua SMTP/Supabase Edge Function",
            messageId: resData.messageId
          };
        } else {
          status = 'failed';
          responseObj = { error: resData.error || "Gửi email thất bại qua API" };
        }
      } catch (err: any) {
        status = 'failed';
        responseObj = { error: err.message || err };
      }
    }

    const log: SentNotificationLog = {
      id: 'NTF-' + Math.floor(Math.random() * 90000 + 10000),
      recipient: speaker.email,
      type: 'email',
      templateId: template.id,
      templateName: template.name,
      sender: `${this.emailConfig.senderName} <${this.emailConfig.senderEmail}>`,
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

  // ==================== ONESIGNAL CONFIG ====================

  getOneSignalConfig(): OneSignalConfig {
    return { ...this.oneSignalConfig };
  }

  async saveOneSignalConfig(config: OneSignalConfig): Promise<void> {
    this.oneSignalConfig = { ...config };
    this.saveToLocalStorage(DataStore.KEY_ONESIGNAL, this.oneSignalConfig);

    if (isSupabaseConfigured()) {
      try {
        const { error } = await supabase.from('system_config').upsert({ key: 'onesignal_config', value: config });
        if (error) console.error('Error saving OneSignal config to Supabase:', error);
      } catch (e) {
        console.error('Error saving OneSignal config to Supabase:', e);
      }
    }
    window.dispatchEvent(new CustomEvent('store-updated', { detail: { table: 'system_config', key: 'onesignal_config' } }));
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
    if (!cfg.isEnabled) {
      return { found: false, error: 'SePay chưa được cấu hình hoặc chưa bật.' };
    }

    try {
      const q = encodeURIComponent(transferContent.substring(0, 50)); // max 50 ký tự
      const url = `/api/sepay-check?transferContent=${q}&expectedAmount=${expectedAmount}`;

      const res = await fetch(url, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!res.ok) {
        const errText = await res.text();
        return { found: false, error: `Lỗi kết nối API SePay (${res.status}): ${errText}` };
      }

      const data = await res.json();
      if (data.error) {
        return { found: false, error: data.error };
      }

      return data;
    } catch (err: any) {
      return { found: false, error: err?.message || 'Lỗi kết nối SePay' };
    }
  }

  getPendingSyncAttendeeIds(): string[] {
    return this.pendingSyncAttendeeIds;
  }

  addPendingSyncAttendeeId(id: string) {
    if (!this.pendingSyncAttendeeIds.includes(id)) {
      this.pendingSyncAttendeeIds.push(id);
      this.saveToLocalStorage('vsaps_pending_sync_attendees', this.pendingSyncAttendeeIds);
    }
  }

  removePendingSyncAttendeeId(id: string) {
    this.pendingSyncAttendeeIds = this.pendingSyncAttendeeIds.filter(x => x !== id);
    this.saveToLocalStorage('vsaps_pending_sync_attendees', this.pendingSyncAttendeeIds);
  }

  async syncPendingAttendees(): Promise<{ success: boolean; errorCount: number }> {
    if (!isSupabaseConfigured()) return { success: false, errorCount: 0 };
    
    let errorCount = 0;
    const idsToSync = [...this.pendingSyncAttendeeIds];
    
    for (const id of idsToSync) {
      const attendee = this.attendees.find(a => a.id === id);
      if (!attendee) {
        this.removePendingSyncAttendeeId(id);
        continue;
      }
      
      try {
        const dbRecord = mapAttendeeToDb(attendee);
        const packageExists = this.packages.some(p => p.id === attendee.packageId);
        if (!packageExists) {
          dbRecord.package_id = null;
        }
        
        const { error } = await supabase.from('attendees').upsert(dbRecord);
        if (!error) {
          this.removePendingSyncAttendeeId(id);
        } else {
          console.error(`Error syncing attendee ${id} during manual sync:`, error);
          errorCount++;
        }
      } catch (err) {
        console.error(`Error during sync of attendee ${id}:`, err);
        errorCount++;
      }
    }
    
    window.dispatchEvent(new CustomEvent('pending-sync-updated'));
    return { success: errorCount === 0, errorCount };
  }

  // ==================== ROOMS & DATES & SHIFTS CRUD ====================

  getRooms(): string[] {
    return this.rooms;
  }

  saveRooms(rooms: string[]): void {
    this.rooms = rooms;
    this.saveToLocalStorage(DataStore.KEY_ROOMS, this.rooms);
    if (isSupabaseConfigured()) {
      rooms.forEach(r => {
        supabase.from('rooms').upsert(mapRoomToDb(r)).then(({ error }) => {
          if (error) console.error('Error syncing room to Supabase:', error);
        });
      });
    }
  }

  deleteRoomFromDb(roomName: string): void {
    if (isSupabaseConfigured()) {
      supabase.from('rooms').delete().eq('name', roomName).then(({ error }) => {
        if (error) console.error('Error deleting room from Supabase:', error);
      });
    }
  }

  getDates(): string[] {
    return this.dates;
  }

  saveDates(dates: string[]): void {
    this.dates = dates;
    this.saveToLocalStorage(DataStore.KEY_DATES, this.dates);
    if (isSupabaseConfigured()) {
      dates.forEach(d => {
        supabase.from('schedule_dates').upsert(mapScheduleDateToDb(d)).then(({ error }) => {
          if (error) console.error('Error syncing date to Supabase:', error);
        });
      });
    }
  }

  deleteDateFromDb(dateVal: string): void {
    if (isSupabaseConfigured()) {
      supabase.from('schedule_dates').delete().eq('date_val', dateVal).then(({ error }) => {
        if (error) console.error('Error deleting date from Supabase:', error);
      });
    }
  }

  getShifts(): ConferenceShift[] {
    return this.shifts;
  }

  saveShift(shift: ConferenceShift): void {
    const idx = this.shifts.findIndex(s => s.id === shift.id);
    if (idx >= 0) {
      this.shifts[idx] = shift;
    } else {
      this.shifts.push(shift);
    }
    this.saveToLocalStorage(DataStore.KEY_SHIFTS, this.shifts);
    if (isSupabaseConfigured()) {
      supabase.from('shifts').upsert(mapShiftToDb(shift)).then(({ error }) => {
        if (error) console.error('Error syncing shift to Supabase:', error);
      });
    }
  }

  deleteShift(id: string): void {
    this.shifts = this.shifts.filter(s => s.id !== id);
    this.saveToLocalStorage(DataStore.KEY_SHIFTS, this.shifts);
    if (isSupabaseConfigured()) {
      supabase.from('shifts').delete().eq('id', id).then(({ error }) => {
        if (error) console.error('Error deleting shift from Supabase:', error);
      });
    }
  }

  getVirtualSections(): VirtualSection[] {
    return this.virtualSections;
  }

  saveVirtualSection(sec: VirtualSection): void {
    const idx = this.virtualSections.findIndex(s => s.id === sec.id);
    if (idx >= 0) {
      this.virtualSections[idx] = sec;
    } else {
      this.virtualSections.push(sec);
    }
    this.saveToLocalStorage(DataStore.KEY_SECTIONS, this.virtualSections);
    if (isSupabaseConfigured()) {
      supabase.from('virtual_sections').upsert(mapVirtualSectionToDb(sec)).then(({ error }) => {
        if (error) console.error('Error syncing virtual section to Supabase:', error);
      });
    }
  }

  deleteVirtualSection(id: string): void {
    this.virtualSections = this.virtualSections.filter(s => s.id !== id);
    this.saveToLocalStorage(DataStore.KEY_SECTIONS, this.virtualSections);
    if (isSupabaseConfigured()) {
      supabase.from('virtual_sections').delete().eq('id', id).then(({ error }) => {
        if (error) console.error('Error deleting virtual section from Supabase:', error);
      });
    }
  }
}

export const store = new DataStore();
export default store;

// ==========================================
// SCHEDULING SYNC MAPPERS
// ==========================================

interface DbRoom {
  name: string;
}

interface DbScheduleDate {
  date_val: string;
}

interface DbShift {
  id: string;
  name: string;
  start_time: string;
  end_time: string;
}

interface DbVirtualSection {
  id: string;
  date: string;
  room_name: string;
  track_name: string;
  buoi_id: string;
  start_time: string;
  end_time: string;
  description: string | null;
}

const mapDbToRoom = (row: any): string => row.name;
const mapRoomToDb = (roomName: string): DbRoom => ({ name: roomName });

const mapDbToScheduleDate = (row: any): string => row.date_val;
const mapScheduleDateToDb = (dVal: string): DbScheduleDate => ({ date_val: dVal });

const mapDbToShift = (row: any): ConferenceShift => ({
  id: row.id,
  name: row.name,
  startTime: row.start_time,
  endTime: row.end_time
});
const mapShiftToDb = (sh: ConferenceShift): DbShift => ({
  id: sh.id,
  name: sh.name,
  start_time: sh.startTime,
  end_time: sh.endTime
});

const mapDbToVirtualSection = (row: any): VirtualSection => ({
  id: row.id,
  date: row.date,
  roomName: row.room_name,
  trackName: row.track_name,
  buoiId: row.buoi_id,
  startTime: row.start_time,
  endTime: row.end_time,
  description: row.description || undefined
});
const mapVirtualSectionToDb = (sec: VirtualSection): DbVirtualSection => ({
  id: sec.id,
  date: sec.date,
  room_name: sec.roomName,
  track_name: sec.trackName,
  buoi_id: sec.buoiId || sec.buoi || 'sang',
  start_time: sec.startTime,
  end_time: sec.endTime,
  description: sec.description || null
});
