/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export type Role = 'admin' | 'btc' | 'ctv';

export interface UserAccount {
  id: string;
  name: string;
  email: string;
  role: Role;
  status: 'active' | 'inactive';
  lastActive?: string;
  permissions?: string[];
}

export interface Attendee {
  id: string;
  title: string; // GS.TS, PGS.TS, TS, ThS, BS, v.v.
  fullName: string;
  organization: string;
  department: string;
  phone: string;
  email: string;
  address: string;
  nationality: 'vietname' | 'foreign';
  packageId: string;
  packageName: string;
  packageFee: number;
  paymentStatus: 'paid' | 'unpaid' | 'pending_verification';
  paymentMethod: 'bank_transfer' | 'credit_card' | 'cash';
  transactionProofUrl?: string;
  registrationDate: string;
  qrCodeValue: string;
  isCheckedIn: boolean;
  checkInTime?: string;
  notes?: string;
  yearOfBirth?: string;
  gender?: string;
  cmeRequired?: boolean;
  cmeIdentityNo?: string;
  galaRequired?: boolean;
  masterclassRequired?: boolean;
  tourRequired?: boolean;
  registrationPeriod?: 'pre_10_11' | 'post_10_11';
  province?: string;
  avatarUrl?: string;
}

export interface SpeakerRegistration {
  id: string;
  title: string; // GS.TS, PGS.TS, TS, v.v.
  fullName: string;
  organization: string;
  department: string;
  phone: string;
  email: string;
  bio: string;
  presentationTitle: string;
  presentationTrack: string; // ví dụ: Ngoại khoa, Nội khoa, Gây mê hồi sức
  abstractText: string;
  documentUrl?: string;
  documentName?: string;
  calendarSynced: boolean;
  status: 'pending' | 'approved' | 'rejected';
  scheduledSessionId?: string;
  registrationDate: string;
  avatarUrl?: string;
}

export interface SpecialtyTrack {
  id: string;
  name: string;
  description?: string;
}

export interface ConferenceSession {
  id: string;
  title: string;
  speakerName: string;
  speakerTitle: string;
  roomName: string;
  date: string; // YYYY-MM-DD
  startTime: string; // HH:MM
  endTime: string; // HH:MM
  track: string;
  description: string;
}

export interface Sponsor {
  id: string;
  name: string;
  tier: 'platinum' | 'gold' | 'silver' | 'bronze' | 'co_sponsor';
  logoUrl?: string; // or base64
  pledgedAmount: number;
  paidAmount: number;
  paymentStatus: 'fully_paid' | 'partially_paid' | 'unpaid';
  contactPerson: string;
  contactEmail: string;
  contactPhone: string;
  benefitsSigned: string[]; // ví dụ: Banner, Booth, Kỷ niệm chương
  notes?: string;
  contractNo?: string;
  contractSignDate?: string;
  contractValue?: number;
  contractStatus?: 'draft' | 'pending_signature' | 'signed' | 'expired' | 'cancelled';
  contractFileUrl?: string;
  contractFileName?: string;
}

export interface InternalTask {
  id: string;
  title: string;
  description: string;
  assignedToName: string;
  assignedToId: string; // maps to a UserAccount.id
  priority: 'high' | 'medium' | 'low';
  status: 'todo' | 'in_progress' | 'done';
  deadline: string; // YYYY-MM-DD
  progress: number; // 0 - 100
  notes?: string;
}

export interface FinanceTransaction {
  id: string;
  date: string; // YYYY-MM-DD HH:mm
  type: 'income' | 'expense';
  category: string; // Gói đại biểu, Nhà tài trợ, Khách sạn, Tiệc, In ấn, Marketing, Khác
  amount: number;
  description: string;
  referenceId?: string; // links to Attendee.id or Sponsor.id
  paymentMethod: string;
  verifiedBy: string; // Tên người đối soát
  isVerified: boolean; // Trạng thái đối soát thời gian thực
}

export interface RegistrationPackage {
  id: string;
  name: string;
  fee: number; // VNĐ
  benefits: string[];
  isActive: boolean;
  description?: string;
  includesCme?: boolean;
  includesGala?: boolean;
}

export interface ZaloConfig {
  appId: string;
  secretKey: string;
  oaId: string;
  accessToken: string;
  refreshToken?: string;
  accessTokenUpdatedAt?: string;
  isConfigured: boolean;
  testPhone: string;
}

export interface EmailConfig {
  smtpHost: string;
  smtpPort: number;
  smtpUser: string;
  smtpPass: string;
  senderName: string;
  senderEmail: string;
  isConfigured: boolean;
  testEmail: string;
}

export interface NotificationTemplate {
  id: string;
  name: string;
  type: 'registration_success' | 'payment_confirmed' | 'abstract_approved' | 'reminder_event';
  channel: 'email' | 'zalo';
  subject?: string;
  content: string; // Chứa placeholder {{fullname}}, {{package}}, {{code}}...
  status?: 'approved' | 'pending' | 'rejected' | string; // Trạng thái phê duyệt ZNS Zalo
  znsTemplateId?: string; // Mã số mẫu tin thực tế bên Zalo
  znsType?: 'transaction' | 'promotion' | string; // Loại tin (Giao dịch / Quảng cáo)
}

export interface SupabaseConfig {
  url: string;
  anonKey: string;
  isConnected: boolean;
}

export interface SepayConfig {
  /** API Token từ my.sepay.vn → Company Settings → API Access */
  apiToken: string;
  /** Số tài khoản ngân hàng liên kết trên SePay */
  accountNumber: string;
  /** Tên ngân hàng (VCB, TCB, MB, ACB, ...) */
  bankCode: string;
  /** Số tài khoản in đúng format (dùng cho VietQR) */
  bankAccountNo: string;
  /** Tên chủ tài khoản */
  accountName: string;
  /** Bật/tắt tích hợp SePay */
  isEnabled: boolean;
  /** Webhook secret key (Apikey header từ SePay webhook config) */
  webhookSecret?: string;
}

export interface SentNotificationLog {
  id: string;
  recipient: string;
  type: 'zalo' | 'email';
  templateId: string;
  templateName: string;
  sender: string;
  sentAt: string;
  status: 'success' | 'failed' | 'pending';
  payload: any;
  response?: any;
}

export interface BusinessConfig {
  eventName: string;
  organizerName: string;
  eventDate: string;
  eventLocation: string;
  maxRegistrations: number;
  requirePaymentProof: boolean;
  allowSelfCancellation: boolean;
  autoSendZns: boolean;
  requirePracticeCode: boolean;
  pwaName?: string;
  pwaShortName?: string;
  pwaDescription?: string;
  pwaLogoUrl?: string;
  pwaThemeColor?: string;
  pwaBackgroundColor?: string;
  /** URL domain production của app (dùng để tạo mã nhúng WordPress) */
  appUrl?: string;
}

export interface EmbedScript {
  id: string;
  name: string;
  targetType: 'delegate' | 'speaker' | 'sponsor' | 'analytics' | 'custom';
  code: string;
  isActive: boolean;
  notes?: string;
  createdAt: string;
}

