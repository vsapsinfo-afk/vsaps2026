import { CustomRegistrationForm, FormField } from '../types';

export const DEFAULT_CUSTOM_FORMS: CustomRegistrationForm[] = [
  {
    id: 'form-masterclass-2026',
    title: 'Đăng Ký Tham Dự Masterclass & Workshop Thực Hành Phẫu Thuật 2026',
    slug: 'masterclass-tham-my-2026',
    description: 'Chương trình đào tạo thực hành chuyên sâu cùng chuyên gia phẫu thuật tạo hình quốc tế và Việt Nam. Giới hạn 30 học viên thực hành trực tiếp tại phòng lab.',
    bannerUrl: 'https://images.unsplash.com/photo-1579684385127-1ef15d508118?auto=format&fit=crop&w=1200&q=80',
    category: 'masterclass',
    status: 'active',
    deadline: '2026-10-15',
    maxSubmissions: 30,
    isFeeRequired: true,
    feeAmount: 3500000,
    feeDescription: 'Phí tham dự Masterclass (Đã bao gồm vật tư thực hành, tài liệu & chứng nhận CME)',
    bankName: 'MB Bank (Ngân hàng Quân Đội)',
    bankAccount: '10112026',
    bankAccountName: 'BAN TO CHUC HOI NGHI VSAPS',
    submitButtonText: 'Xác Nhận Đăng Ký Masterclass',
    successMessage: 'Chúc mừng Quý Bác sĩ đã gửi đăng ký Masterclass thành công! Ban Tổ Chức sẽ đối soát biên lai và gửi thông báo xác nhận suất học trong 24 giờ làm việc.',
    confirmationEmailEnabled: true,
    allowCheckRegistration: true,
    createdAt: '2026-06-01T08:00:00Z',
    updatedAt: '2026-06-01T08:00:00Z',
    fields: [
      {
        id: 'f-sec-1',
        label: '1. THÔNG TIN BÁC SĨ ĐĂNG KÝ',
        key: 'sec_personal_info',
        type: 'section',
        required: false,
        width: 'full'
      },
      {
        id: 'f-title',
        label: 'Học vị / Học hàm',
        key: 'academic_title',
        type: 'select',
        placeholder: 'Chọn học vị',
        required: true,
        options: ['GS.TS.BS', 'PGS.TS.BS', 'TS.BS', 'BS.CK2', 'ThS.BS', 'BS.CK1', 'Bác sĩ'],
        width: 'half'
      },
      {
        id: 'f-name',
        label: 'Họ và tên đầy đủ',
        key: 'full_name',
        type: 'text',
        placeholder: 'NGUYỄN VĂN AN',
        required: true,
        width: 'half'
      },
      {
        id: 'f-phone',
        label: 'Số điện thoại liên hệ (Zalo)',
        key: 'phone',
        type: 'phone',
        placeholder: '0912345678',
        required: true,
        width: 'half'
      },
      {
        id: 'f-email',
        label: 'Địa chỉ Email nhận thư mời & tài liệu',
        key: 'email',
        type: 'email',
        placeholder: 'bacsi@benhvien.vn',
        required: true,
        width: 'half'
      },
      {
        id: 'f-org',
        label: 'Đơn vị công tác / Bệnh viện / Thẩm mỹ viện',
        key: 'organization',
        type: 'text',
        placeholder: 'Bệnh viện Chợ Rẫy / Bệnh viện ĐHYD TP.HCM',
        required: true,
        width: 'full'
      },
      {
        id: 'f-yob',
        label: 'Năm sinh',
        key: 'year_of_birth',
        type: 'number',
        placeholder: '1985',
        required: false,
        width: 'half'
      },
      {
        id: 'f-cccd',
        label: 'Số CCCD (Bắt buộc để cấp chứng chỉ CME Sở Y Tế)',
        key: 'cme_id_number',
        type: 'text',
        placeholder: '079185001234',
        required: true,
        width: 'half'
      },
      {
        id: 'f-sec-2',
        label: '2. NỘI DUNG CHUYÊN ĐỀ QUAN TÂM',
        key: 'sec_topic_selection',
        type: 'section',
        required: false,
        width: 'full'
      },
      {
        id: 'f-topic',
        label: 'Chuyên đề Masterclass lựa chọn tham gia',
        key: 'selected_topic',
        type: 'radio',
        required: true,
        options: [
          'Chuyên đề 1: Kỹ thuật tạo hình mũi cấu trúc sụn sườn tự thân nâng cao',
          'Chuyên đề 2: Kỹ thuật căng da mặt SMAS đa lớp & trẻ hóa khuôn mặt',
          'Chuyên đề 3: Phẫu thuật tạo hình nâng ngực nội soi & giải phẫu thẩm mỹ'
        ],
        width: 'full'
      },
      {
        id: 'f-exp',
        label: 'Kinh nghiệm phẫu thuật trong lĩnh vực này',
        key: 'experience_level',
        type: 'select',
        required: true,
        options: ['Dưới 2 năm kinh nghiệm', 'Từ 2 đến 5 năm kinh nghiệm', 'Trên 5 năm kinh nghiệm chuyên sâu'],
        width: 'half'
      },
      {
        id: 'f-need-cme',
        label: 'Đăng ký cấp chứng nhận đào tạo liên tục CME (Sở Y Tế)',
        key: 'cme_required',
        type: 'select',
        required: true,
        options: ['Có nhu cầu cấp CME (Đã bao gồm trong phí)', 'Không có nhu cầu cấp CME'],
        defaultValue: 'Có nhu cầu cấp CME (Đã bao gồm trong phí)',
        width: 'half'
      },
      {
        id: 'f-notes',
        label: 'Câu hỏi hoặc ca lâm sàng khó muốn trao đổi cùng báo cáo viên',
        key: 'questions_for_speakers',
        type: 'textarea',
        placeholder: 'Quý Bác sĩ có thể nhập tóm tắt ca lâm sàng hoặc câu hỏi mong muốn giảng viên giải đáp...',
        required: false,
        width: 'full'
      },
      {
        id: 'f-sec-3',
        label: '3. BIÊN LAI CHUYỂN KHOẢN ĐẶT CHỖ',
        key: 'sec_payment_proof',
        type: 'section',
        required: false,
        width: 'full'
      },
      {
        id: 'f-proof',
        label: 'Đính kèm ảnh chụp màn hình Chuyển khoản thành công',
        key: 'payment_proof',
        type: 'file',
        helpText: 'Tải lên hình ảnh rõ nét biên lai hoặc ủy nhiệm chi ngân hàng để BTC giữ chỗ và cấp số báo danh.',
        required: true,
        width: 'full'
      }
    ]
  },
  {
    id: 'form-gala-dinner-2026',
    title: 'Đăng Ký Tham Dự Dạ Tiệc Gala Dinner & Đêm Tôn Vinh VSAPS 2026',
    slug: 'gala-dinner-vsaps-2026',
    description: 'Đêm tiệc trang trọng kỷ niệm và tôn vinh những cống hiến xuất sắc trong ngành Phẫu thuật Thẩm mỹ Việt Nam. Chương trình biểu diễn nghệ thuật và dạ tiệc 5 sao.',
    bannerUrl: 'https://images.unsplash.com/photo-1511795409834-ef04bbd61622?auto=format&fit=crop&w=1200&q=80',
    category: 'gala',
    status: 'active',
    deadline: '2026-10-20',
    maxSubmissions: 250,
    isFeeRequired: true,
    feeAmount: 1200000,
    feeDescription: 'Phí tham gia Gala Dinner / 1 khách (Đã bao gồm tiệc rượu 5 sao & quà lưu niệm)',
    bankName: 'MB Bank (Ngân hàng Quân Đội)',
    bankAccount: '10112026',
    bankAccountName: 'BAN TO CHUC HOI NGHI VSAPS',
    submitButtonText: 'Xác Nhận Đặt Bàn Gala Dinner',
    successMessage: 'Đăng ký vé tham dự Gala Dinner thành công! Mã QR vé vào cửa sẽ được gửi đến Email & số Zalo của Quý vị.',
    confirmationEmailEnabled: true,
    allowCheckRegistration: true,
    createdAt: '2026-06-02T08:00:00Z',
    updatedAt: '2026-06-02T08:00:00Z',
    fields: [
      {
        id: 'g-title',
        label: 'Học vị / Xưng hô',
        key: 'academic_title',
        type: 'select',
        options: ['BS.', 'TS.BS', 'PGS.TS', 'ThS.BS', 'Ông', 'Bà'],
        required: true,
        width: 'half'
      },
      {
        id: 'g-name',
        label: 'Họ và tên khách tham dự',
        key: 'full_name',
        type: 'text',
        placeholder: 'NGUYỄN THỊ MAI',
        required: true,
        width: 'half'
      },
      {
        id: 'g-phone',
        label: 'Số điện thoại',
        key: 'phone',
        type: 'phone',
        placeholder: '0901234567',
        required: true,
        width: 'half'
      },
      {
        id: 'g-email',
        label: 'Email nhận vé mời',
        key: 'email',
        type: 'email',
        placeholder: 'mai.nguyen@example.com',
        required: true,
        width: 'half'
      },
      {
        id: 'g-org',
        label: 'Cơ quan / Doanh nghiệp / Đơn vị',
        key: 'organization',
        type: 'text',
        placeholder: 'Thẩm mỹ viện Quốc tế Sài Gòn',
        required: true,
        width: 'full'
      },
      {
        id: 'g-guests',
        label: 'Số lượng vé đặt',
        key: 'guest_count',
        type: 'select',
        options: ['1 khách', '2 khách (Đi cùng đồng nghiệp/người thân)', '3 khách', 'Bàn VIP riêng (10 khách)'],
        required: true,
        width: 'half'
      },
      {
        id: 'g-diet',
        label: 'Yêu cầu ẩm thực đặc biệt',
        key: 'dietary_needs',
        type: 'radio',
        options: ['Ẩm thực tiêu chuẩn', 'Ăn chay / Vegetarian', 'Không dùng hải sản'],
        required: false,
        width: 'half'
      },
      {
        id: 'g-proof',
        label: 'Đính kèm chứng từ chuyển khoản phí vé',
        key: 'payment_proof',
        type: 'file',
        required: true,
        width: 'full'
      }
    ]
  },
  {
    id: 'form-satellite-2026',
    title: 'Đăng Ký Tham Dự Hội Thảo Vệ Tinh (Satellite Symposium) - Miễn Phí',
    slug: 'hoi-thao-ve-tinh-2026',
    description: 'Các buổi hội thảo chuyên đề do các tập đoàn y tế và công nghệ thẩm mỹ quốc tế bảo trợ. Cập nhật giải pháp và thiết bị tiên tiến nhất.',
    bannerUrl: 'https://images.unsplash.com/photo-1540575467063-178a50c2df87?auto=format&fit=crop&w=1200&q=80',
    category: 'satellite',
    status: 'active',
    deadline: '2026-10-25',
    maxSubmissions: 300,
    isFeeRequired: false,
    feeAmount: 0,
    submitButtonText: 'Đăng Ký Tham Dự Miễn Phí',
    successMessage: 'Quý Bác sĩ đã đăng ký tham dự Hội thảo Vệ tinh thành công! Vé điện tử miễn phí đã sẵn sàng trong hệ thống.',
    confirmationEmailEnabled: true,
    allowCheckRegistration: true,
    createdAt: '2026-06-03T08:00:00Z',
    updatedAt: '2026-06-03T08:00:00Z',
    fields: [
      {
        id: 's-title',
        label: 'Học vị',
        key: 'academic_title',
        type: 'select',
        options: ['BS.', 'TS.BS', 'ThS.BS', 'BS.CK1', 'BS.CK2', 'Dược sĩ', 'Kỹ thuật viên'],
        required: true,
        width: 'half'
      },
      {
        id: 's-name',
        label: 'Họ và tên',
        key: 'full_name',
        type: 'text',
        placeholder: 'LÊ VĂN HÙNG',
        required: true,
        width: 'half'
      },
      {
        id: 's-phone',
        label: 'Số điện thoại',
        key: 'phone',
        type: 'phone',
        required: true,
        width: 'half'
      },
      {
        id: 's-email',
        label: 'Email',
        key: 'email',
        type: 'email',
        required: true,
        width: 'half'
      },
      {
        id: 's-org',
        label: 'Đơn vị công tác',
        key: 'organization',
        type: 'text',
        required: true,
        width: 'full'
      },
      {
        id: 's-sessions',
        label: 'Các phiên vệ tinh Quý vị mong muốn tham dự',
        key: 'interested_sessions',
        type: 'checkbox',
        options: [
          'Phiên 1: Công nghệ Laser Pico & Trẻ hóa vi điểm mới nhất',
          'Phiên 2: Ứng dụng Exosome và Tế bào gốc trong tái tạo mô thẩm mỹ',
          'Phiên 3: Kỹ thuật tiêm chất làm đầy Filler kết hợp chỉ nâng cơ an toàn'
        ],
        required: true,
        width: 'full'
      }
    ]
  },
  {
    id: 'form-survey-2026',
    title: 'Phiếu Khảo Sát & Đánh Giá Chất Lượng Hội Nghị VSAPS',
    slug: 'khao-sat-hoi-nghi-vsaps',
    description: 'Ban Tổ Chức kính mong nhận được những đánh giá quý báu của Quý Bác sĩ để nâng cao chất lượng khoa học và dịch vụ trong các kỳ hội nghị tiếp theo.',
    category: 'survey',
    status: 'active',
    isFeeRequired: false,
    feeAmount: 0,
    submitButtonText: 'Gửi Đánh Giá & Nhận Quà',
    successMessage: 'Chân thành cảm ơn Quý Bác sĩ đã dành thời gian đóng góp ý kiến! Ý kiến của Quý vị là động lực to lớn giúp VSAPS ngày càng phát triển.',
    confirmationEmailEnabled: false,
    allowCheckRegistration: false,
    createdAt: '2026-06-04T08:00:00Z',
    updatedAt: '2026-06-04T08:00:00Z',
    fields: [
      {
        id: 'sv-name',
        label: 'Họ và tên (Tùy chọn)',
        key: 'full_name',
        type: 'text',
        placeholder: 'Có thể để trống nếu muốn ẩn danh',
        required: false,
        width: 'half'
      },
      {
        id: 'sv-org',
        label: 'Đơn vị công tác (Tùy chọn)',
        key: 'organization',
        type: 'text',
        required: false,
        width: 'half'
      },
      {
        id: 'sv-scientific',
        label: 'Đánh giá chất lượng các bài báo cáo khoa học',
        key: 'rating_scientific',
        type: 'radio',
        options: ['Rất xuất sắc (Nội dung cập nhật, tính ứng dụng cao)', 'Tốt (Đáp ứng kỳ vọng)', 'Khá', 'Cần cải thiện'],
        required: true,
        width: 'full'
      },
      {
        id: 'sv-organization',
        label: 'Đánh giá công tác tổ chức, lễ tân & tiếp đón',
        key: 'rating_organization',
        type: 'radio',
        options: ['Rất chu đáo, chuyên nghiệp', 'Tốt, thân thiện', 'Bình thường', 'Cần cải thiện thời gian check-in'],
        required: true,
        width: 'full'
      },
      {
        id: 'sv-feedback',
        label: 'Góp ý hoặc đề xuất chủ đề cho Hội nghị năm sau',
        key: 'feedback_content',
        type: 'textarea',
        placeholder: 'Những chủ đề hoặc báo cáo viên quốc tế mà Quý Bác sĩ mong muốn gặp gỡ tại kỳ hội nghị tiếp theo...',
        required: false,
        width: 'full'
      }
    ]
  }
];

export interface FormTemplatePreset {
  id: string;
  name: string;
  description: string;
  category: CustomRegistrationForm['category'];
  icon: string;
  isFeeDefault: boolean;
  defaultFee: number;
  sampleFields: FormField[];
}

export const FORM_PRESETS: FormTemplatePreset[] = [
  {
    id: 'preset-masterclass',
    name: 'Mẫu Form Workshop / Masterclass Có Thu Phí',
    description: 'Dành cho các lớp đào tạo thực hành cầm tay chỉ việc, giới hạn số lượng học viên, có tải lên biên lai chuyển khoản và cấp CME.',
    category: 'masterclass',
    icon: 'GraduationCap',
    isFeeDefault: true,
    defaultFee: 3000000,
    sampleFields: [
      { id: 'f-1', label: 'Học vị / Học hàm', key: 'title', type: 'select', required: true, width: 'half', options: ['TS.BS', 'BS.CK2', 'ThS.BS', 'BS.CK1', 'BS'] },
      { id: 'f-2', label: 'Họ và tên bác sĩ', key: 'full_name', type: 'text', required: true, width: 'half' },
      { id: 'f-3', label: 'Số điện thoại Zalo', key: 'phone', type: 'phone', required: true, width: 'half' },
      { id: 'f-4', label: 'Email', key: 'email', type: 'email', required: true, width: 'half' },
      { id: 'f-5', label: 'Bệnh viện / Cơ quan công tác', key: 'organization', type: 'text', required: true, width: 'full' },
      { id: 'f-6', label: 'Số định danh CCCD (Để cấp CME)', key: 'cccd', type: 'text', required: true, width: 'half' },
      { id: 'f-7', label: 'Năm sinh', key: 'year_of_birth', type: 'number', required: false, width: 'half' },
      { id: 'f-8', label: 'Biên lai chuyển khoản học phí', key: 'payment_proof', type: 'file', required: true, width: 'full', helpText: 'Tải ảnh chụp giao dịch thành công' }
    ]
  },
  {
    id: 'preset-gala',
    name: 'Mẫu Form Tiệc Tối Gala Dinner & Đêm Hội Thảo',
    description: 'Đăng ký dạ tiệc kết nối, chọn số lượng vé, đặt thực đơn đặc biệt và thanh toán vé tham dự.',
    category: 'gala',
    icon: 'Wine',
    isFeeDefault: true,
    defaultFee: 1000000,
    sampleFields: [
      { id: 'g-1', label: 'Họ và tên', key: 'full_name', type: 'text', required: true, width: 'half' },
      { id: 'g-2', label: 'Số điện thoại', key: 'phone', type: 'phone', required: true, width: 'half' },
      { id: 'g-3', label: 'Email', key: 'email', type: 'email', required: true, width: 'half' },
      { id: 'g-4', label: 'Đơn vị / Doanh nghiệp', key: 'organization', type: 'text', required: true, width: 'half' },
      { id: 'g-5', label: 'Số lượng vé đặt', key: 'ticket_quantity', type: 'select', required: true, width: 'half', options: ['1 vé', '2 vé', '3 vé', 'Bàn 10 khách'] },
      { id: 'g-6', label: 'Yêu cầu món ăn', key: 'diet', type: 'radio', required: false, width: 'half', options: ['Bình thường', 'Ăn chay', 'Hạn chế hải sản'] },
      { id: 'g-7', label: 'Ảnh biên lai thanh toán', key: 'payment_proof', type: 'file', required: true, width: 'full' }
    ]
  },
  {
    id: 'preset-satellite',
    name: 'Mẫu Form Hội Thảo Vệ Tinh / Trưng Bày Miễn Phí',
    description: 'Form đăng ký tham gia các phiên khoa học mở, chuyên đề của nhà tài trợ hoặc khu vực triển lãm không thu phí.',
    category: 'satellite',
    icon: 'Radio',
    isFeeDefault: false,
    defaultFee: 0,
    sampleFields: [
      { id: 's-1', label: 'Học vị', key: 'title', type: 'select', required: true, width: 'half', options: ['BS.', 'Dược sĩ', 'Kỹ thuật viên', 'Quản lý TMV'] },
      { id: 's-2', label: 'Họ và tên', key: 'full_name', type: 'text', required: true, width: 'half' },
      { id: 's-3', label: 'Số điện thoại', key: 'phone', type: 'phone', required: true, width: 'half' },
      { id: 's-4', label: 'Email', key: 'email', type: 'email', required: true, width: 'half' },
      { id: 's-5', label: 'Cơ quan công tác', key: 'organization', type: 'text', required: true, width: 'full' },
      { id: 's-6', label: 'Chuyên đề quan tâm', key: 'topics', type: 'checkbox', required: true, width: 'full', options: ['Công nghệ Laser mới', 'Filler & Botox an toàn', 'Mô ghép & Tế bào gốc', 'Mỹ phẩm y khoa phục hồi'] }
    ]
  },
  {
    id: 'preset-survey',
    name: 'Mẫu Phiếu Khảo Sát & Khảo Sát Ý Kiến',
    description: 'Thu thập đánh giá, phản hồi về báo cáo viên, hội trường, công tác hậu cần để cải tiến chất lượng.',
    category: 'survey',
    icon: 'MessageSquare',
    isFeeDefault: false,
    defaultFee: 0,
    sampleFields: [
      { id: 'q-1', label: 'Họ tên bác sĩ (Tùy chọn)', key: 'full_name', type: 'text', required: false, width: 'half' },
      { id: 'q-2', label: 'Số điện thoại (Nhận tài liệu tổng kết)', key: 'phone', type: 'phone', required: false, width: 'half' },
      { id: 'q-3', label: 'Đánh giá mức độ hài lòng về bài giảng', key: 'rating_content', type: 'radio', required: true, width: 'full', options: ['Rất hài lòng (5 sao)', 'Hài lòng (4 sao)', 'Bình thường (3 sao)', 'Chưa hài lòng'] },
      { id: 'q-4', label: 'Đánh giá khâu tổ chức & phục vụ', key: 'rating_service', type: 'radio', required: true, width: 'full', options: ['Rất chuyên nghiệp', 'Tốt', 'Cần cải thiện'] },
      { id: 'q-5', label: 'Ý kiến đóng góp xây dựng', key: 'comments', type: 'textarea', required: false, width: 'full' }
    ]
  },
  {
    id: 'preset-blank',
    name: 'Form Trắng (Tự Tùy Biến Hoàn Toàn)',
    description: 'Bắt đầu từ một biểu mẫu trắng và tự do thêm bất kỳ trường thông tin nào theo ý bạn.',
    category: 'custom',
    icon: 'FilePlus',
    isFeeDefault: false,
    defaultFee: 0,
    sampleFields: [
      { id: 'b-1', label: 'Họ và tên', key: 'full_name', type: 'text', required: true, width: 'half' },
      { id: 'b-2', label: 'Số điện thoại', key: 'phone', type: 'phone', required: true, width: 'half' },
      { id: 'b-3', label: 'Email', key: 'email', type: 'email', required: true, width: 'full' }
    ]
  }
];
