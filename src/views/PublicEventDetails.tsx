/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { 
  Calendar, MapPin, Users, Award, ShieldAlert, Cpu, CheckCircle, 
  FileText, ArrowRight, HeartHandshake, Clock, Search, Star, Bookmark, 
  Filter, X, Info, HelpCircle
} from 'lucide-react';
import { store, DEFAULT_EVENT_DETAILS_CONFIG } from '../dataStore';
import { ConferenceSession } from '../types';

interface PublicEventDetailsProps {
  onNavigate: (view: string) => void;
}

/// Configuration for reporting rooms mapping to make interactive multi-track grid
const getRoomsConfig = (lang: 'vi' | 'en') => [
  {
    id: 'Hội trường 1',
    vietnameseName: lang === 'vi' ? 'Hội trường A' : 'Hall A',
    subtitle: lang === 'vi' ? 'Phẫu thuật thẩm mỹ vú & Tạo hình vóc dáng' : 'Breast Aesthetic Surgery & Body Contouring',
    colorClass: 'border-l-4 border-rose-500 bg-rose-500/5',
    textTag: 'text-rose-600',
    tagBg: 'bg-rose-50 text-rose-700'
  },
  {
    id: 'Hội trường 2',
    vietnameseName: lang === 'vi' ? 'Hội trường B' : 'Hall B',
    subtitle: lang === 'vi' ? 'Chấn thương sọ sập & Tạo hình sọ mặt' : 'Craniomaxillofacial Trauma & Reconstruction',
    colorClass: 'border-l-4 border-indigo-500 bg-indigo-500/5',
    textTag: 'text-indigo-600',
    tagBg: 'bg-indigo-50 text-indigo-700'
  },
  {
    id: 'Hội trường 3',
    vietnameseName: lang === 'vi' ? 'Hội trường C' : 'Hall C',
    subtitle: lang === 'vi' ? 'Hài hòa hàm mặt & Phục hình nụ cười' : 'Facial Harmonization & Smile Reconstruction',
    colorClass: 'border-l-4 border-amber-500 bg-amber-500/5',
    textTag: 'text-amber-600',
    tagBg: 'bg-amber-50 text-amber-700'
  },
  {
    id: 'Hội trường 4',
    vietnameseName: lang === 'vi' ? 'Hội trường D' : 'Hall D',
    subtitle: lang === 'vi' ? 'Thẩm mỹ nội khoa & Chỉ sợi, Laser da liễu' : 'Non-Invasive Aesthetics, Threads & Dermatology Laser',
    colorClass: 'border-l-4 border-teal-500 bg-teal-500/5',
    textTag: 'text-teal-600',
    tagBg: 'bg-teal-50 text-teal-700'
  }
];

// Helper to provide realistic rich academic abstracts and bios
function getSessionEnrichment(session: ConferenceSession, lang: 'vi' | 'en') {
  const title = session.title;
  const speakerName = session.speakerName;
  const speakerTitle = session.speakerTitle;

  // Check if session has a registered speaker in the store first
  const registeredSpeakers = store.getSpeakers();
  const matched = registeredSpeakers.find(s => 
    s.fullName.toLowerCase() === speakerName.toLowerCase() ||
    title.toLowerCase().includes(s.presentationTitle.toLowerCase())
  );

  if (matched) {
    if (lang === 'en') {
      return {
        abstract: matched.abstractText || `Abstract: Clinical presentation on "${matched.presentationTitle}". Covers technique improvements, patient follow-up, and safety standards optimization.`,
        bio: matched.bio || `Featured speaker with extensive experience and numerous reputable publications in the field.`
      };
    }
    return {
      abstract: matched.abstractText || `Đề tài tóm tắt: Trình bày nghiên cứu chuyên đề lâm sàng về "${matched.presentationTitle}". Nội dung hướng dẫn cải tiến kỹ thuật, đánh giá phản hồi trên tập hợp mẫu bệnh nhân thực tế và đề xuất chuẩn hóa quy chuẩn y khoa tối ưu an toàn.`,
      bio: matched.bio || `Báo cáo viên chuyên trách có thâm niên công tác dày dạn, là tác giả của nhiều công bố khoa học uy tín trong ngành.`
    };
  }

  // Pre-configured prominent examples
  if (session.id === 'SES-204') {
    if (lang === 'en') {
      return {
        abstract: `INTRODUCTION: Aesthetic plastic surgery is undergoing a major shift with the emergence of robotic technologies and 3D simulation. This study evaluates the effectiveness of breast reconstruction combining augmented reality (AR) simulation.\n\nMETHODS: Prospective study on 150 patients planned for breast augmentation using Crisp-Fit 3D simulation prior to intervention. Evaluation of pocket size accuracy and patient satisfaction after 6 months.\n\nRESULTS: Pocket size mismatch rate decreased to under 1.2%. Average surgery time was reduced by 15 minutes. Bilateral symmetry achieved ideal levels in 98% of patients.\n\nCONCLUSION: Virtual mapping and AR guidance help optimize body contouring outcomes, minimizing complications like asymmetry.`,
        bio: `Honorary Professor of Aesthetic Plastic Surgery with over 25 years of global clinical experience. Former Head of Plastic Surgery at a major medical university and member of the international VSAPS scientific board.`
      };
    }
    return {
      abstract: `ĐẶT VẤN ĐỀ: Ngành phẫu thuật tạo hình thẩm mỹ đang trải qua một bước ngoặt lớn với sự xuất hiện của các công nghệ robot và mô phỏng 3D. Nghiên cứu này đánh giá hiệu quả của phẫu thuật tạo hình ngực kết hợp với công nghệ mô phỏng thực thực tế ảo tăng cường (AR).\n\nPHƯƠNG PHÁP: Nghiên cứu tiến cứu trên 150 bệnh nhân được lập kế hoạch nâng ngực sử dụng mô phỏng 3D Crisp-Fit trước khi can thiệp. Đánh giá độ chính xác về thể tích túi, sự hài lòng của bệnh nhân sau 6 tháng lâm sàng.\n\nKẾT QUẢ: Tỷ lệ không khớp kích thước túi giảm xuống còn dưới 1.2%. Thời gian phẫu thuật trung bình giảm 15 phút. Độ cân đối hai bên đạt mức lý tưởng đối với 98% số bệnh nhân tham gia.\n\nKẾT LUẬN: Việc lập sơ đồ ảo và sử dụng công nghệ định vị AR giúp tối ưu hóa kết quả phẫu thuật thẩm mỹ vóc dáng, giảm thiểu tối đa các biến chứng lệch túi hoặc không cân xứng bẩm sinh.`,
      bio: `GS.TS. danh dự chuyên khoa Phẫu thuật Thẩm mỹ vóc dáng với hơn 25 năm kinh nghiệm lâm sàng trên toàn cầu. Ông là cựu chủ nhiệm khoa tạo hình tại Đại học Y lớn, thành viên hội đồng khoa học quốc tế VSAPS. Đã công bố trên 50 bài báo nghiên cứu chuyên sâu về nâng ngực nâng cao.`
    };
  }
  
  if (session.id === 'SES-213') {
    if (lang === 'en') {
      return {
        abstract: `INTRODUCTION: Deep plane facelift (SMAS Facelift) is the gold standard in facial rejuvenation but carries risk of facial nerve injury. This study proposes safe-zone dissection combining high-intensity focused ultrasound guidance.\n\nMETHODS: Cross-sectional study on 80 cases of deep SMAS facelift. Pre-operative mapping of nerve VII path using micro-ultrasound probe.\n\nRESULTS: 100% of patients experienced no temporary or permanent facial paralysis. Rejuvenation results maintained over 5 years for 95% of patients.\n\nCONCLUSION: Pre-operative ultrasound mapping is a breakthrough that optimizes safety in comprehensive facial rejuvenation.`,
        bio: `Associate Professor, Senior Advisor to the Saigon Plastic Surgery Society, with years of training and technology transfer in deep plane facelifts in Seoul, South Korea. Author of the prestigious "SMAS Facelift Manual".`
      };
    }
    return {
      abstract: `ĐẶT VẤN ĐỀ: Kỹ thuật căng da mặt sâu (SMAS Facelift) là tiêu chuẩn vàng trong trẻ hóa vùng mặt nhưng chứa đựng nguy cơ tổn thương nhánh thần kinh số VII. Nghiên cứu đề xuất giải pháp bóc tách vùng an toàn kết hợp với định vị siêu âm năng lượng cao.\n\nPHƯƠNG PHÁP: Mô tả cắt ngang trên 80 ca phẫu thuật căng chỉ sâu kết hợp thắt dải SMAS cơ cổ vai bám da. Tiến hành dò đường đi thần kinh VII trước phẫu thuật bằng đầu dò siêu âm siêu vi.\n\nKẾT QUẢ: 100% bệnh nhân không gặp biến chứng liệt mặt cơ học tạm thời hay vĩnh viễn. Kết quả căng mướt trẻ trung duy trì trên 5 năm đối với 95% mẫu thử.\n\nKẾT LUẬN: Phương pháp dò siêu âm nhiệt an toàn trước khi xẻ dải cơ sâu là đột phá giúp tối ưu chuẩn an toàn trong trẻ hóa toàn diện khuôn mặt.`,
      bio: `PGS.TS.BS. Thành viên cố vấn cấp cao hội phẫu thuật tạo hình Sài Gòn, có nhiều năm học tập và chuyển giao công nghệ căng da cơ sâu tại Seoul, Hàn Quốc. Tác giả của cuốn sách "Cẩm nang căng da mặt SMAS" uy tín.`
    };
  }

  if (session.id === 'SES-218') {
    if (lang === 'en') {
      return {
        abstract: `INTRODUCTION: Capsular contracture is a leading serious complication in silicone breast implants. We evaluate the effectiveness of implant coating with new-generation nanofiber membranes combined with local prophylactic antibiotics.\n\nMETHODS: Randomized controlled trial on 120 secondary breast augmentation cases following contracture complications.\n\nRESULTS: After 18 months, the biological membrane group had a 0% recurrence rate, compared to 8.5% in the control group.\n\nCONCLUSION: Application of biological nanofiber membrane coating resolves capsular contracture complications.`,
        bio: `Associate Professor, leading breast surgeon known for complex contracture revision. Regularly teaches national training courses on painless endoscopic breast surgery.`
      };
    }
    return {
      abstract: `ĐẶT VẤN ĐỀ: Co thắt bao xơ (Capsular Contracture) là biến chứng nghiêm trọng hàng đầu trong nâng ngực túi silicone. Chúng tôi đánh giá hiệu quả bọc phủ túi ngực bằng màng nanofiber thế hệ mới kết hợp kháng sinh dự phòng tại chỗ.\n\nPHƯƠNG PHÁP: Nghiên cứu thử nghiệm lâm sàng ngẫu nhiên có đối chứng trên 120 ca phẫu thuật nâng ngực thứ phát sau biến chứng co thắt.\n\nKẾT QUẢ: Sau 18 tháng theo dõi, nhóm sử dụng màng bao phủ sinh học có tỷ lệ co thắt bao xơ tái phát bằng 0%, so với 8.5% ở nhóm đối chứng không bọc màng.\n\nKẾT LUẬN: Ứng dụng công nghệ màng bao phủ sinh học nanofiber là giải pháp đột phá tháo gỡ hoàn toàn bài toán biến chứng bao xơ của túi silicone.`,
      bio: `PGS.TS.BS. Chuyên khoa phẫu thuật vú hàng đầu, nổi tiếng với kỹ năng sửa bao xơ ngực phức tạp. Ông thường xuyên giảng dạy tại các khóa đào tạo quốc gia và chuyển giao kỹ nghệ nội soi ngực không đau.`
    };
  }

  // General fallbacks based on session topic keywords
  const lowerTitle = title.toLowerCase();
  let abstract = '';
  let bio = '';

  if (lowerTitle.includes('khai mạc') || lowerTitle.includes('bế mạc') || lowerTitle.includes('đại hội')) {
    if (lang === 'en') {
      abstract = `Executive overview: Presentation on the remarkable growth of the VSAPS congress over 10 years of establishment. Focuses on human resource management, scientific repositioning, and national CME standardization roadmap.\n\nObjective: Align all member physicians on plastic surgery standards and patient safety.`;
      bio = `Presidency, Executive Committee of VSAPS, comprising leading Professors and Associate Professors who have made major contributions to plastic surgery in Vietnam.`;
    } else {
      abstract = `Nội dung tổng luận điều hành: Trình bày báo cáo tổng quan sự phát triển vượt bậc của đại hội thẩm mỹ VSAPS qua 10 năm thành lập. Đi sâu vào phân tích bài học quản lý nhân lực, xu thế chuyển dịch định vị chuẩn học thuật và lộ trình chuẩn hóa CME quốc gia.\n\nMục tiêu: Định hướng chung cho toàn bộ các bác sĩ hội viên về sự phối hợp giữa tạo hình thẩm mỹ chuyên sâu cùng tôn trọng y đức và an toàn tối đa cho khách hàng.`;
      bio = `Đoàn Chủ Tịch, Hội đồng Ban Chấp Hành trung ương VSAPS, tập hợp các Giáo sư, Phó Giáo sư đầu ngành có cống hiến to lớn cho nền y học phẫu thuật tạo hình nước nhà.`;
    }
  } else if (lowerTitle.includes('live surgery') || lowerTitle.includes('mổ trực tiếp')) {
    if (lang === 'en') {
      abstract = `Clinical Demonstration (Live Video Surgery): High-definition 4K broadcast from 175 Military Hospital operating rooms. Step-by-step commentary on sub-SMAS dissection, nerve preservation, and low-trauma implant placement.\n\nCase Study: Performed on carefully selected patients, providing delegates hands-on learning for aesthetic closure.`;
      bio = `Renowned scientific operator, expert surgeon with over 25 years of experience, guest moderator for advanced live surgery sessions.`;
    } else {
      abstract = `Trình diễn kỹ năng lâm sàng tại chỗ (Live Video Surgery): Truyền hình trực tiếp độ sảnh phân giải cao 4K từ phòng mổ chuẩn mực của Bệnh viện Quân y 175 về hội nghị. Thuyết giảng chi tiết về các đường rạch ngầm, phương án tách khoang SMAS bảo vệ tuyến dẫn truyền thần kinh, cùng bí quyết đặt túi nâng cơ thắt ngực ít sang chấn.\n\nTrường hợp nghiên cứu: Áp dụng trên dải bệnh nhân thật được tuyển lựa sát sao, giúp đại biểu học hỏi thực chiến thao tác khâu đóng giấu sẹo thẩm mỹ đỉnh cao.`;
      bio = `Báo cáo viên & Phẫu thuật viên danh tiếng, chuyên gia mổ rạch lâm sàng với trên 25 năm kinh nghiệm, khách mời danh dự điều phối các phiên live trực quan bậc cao.`;
    }
  } else if (lowerTitle.includes('hands-on') || lowerTitle.includes('thực hành')) {
    if (lang === 'en') {
      abstract = `Hands-on Workshop: Delegates practice directly on high-fidelity simulation models and advanced biomaterials.\n\nMethodology: Direct supervision with 2 trainers per station. Meticulous calibration of thread angles, filler compression, and dermatology laser parameters for safe results.`;
      bio = `Dedicated clinical technology advisor, experienced trainer coordinating dozens of national and international medical workshop series.`;
    } else {
      abstract = `Khóa Đào tạo Thực hành Lâm nghiệp (Hands-on Workshop): Học viên trực tiếp thao tác thực nghiệm trên các mô hình nhân tạo giả lập cao cấp và dải chất liệu sinh học tiên tiến.\n\nPhương pháp giảng dạy: Cầm tay chỉ việc dưới sự giám sát chặt chẽ của 2 chuyên gia huấn luyện trên mỗi sảnh bàn. Cân chỉnh tỉ mỉ từng góc kim luồn dải chỉ collagen, lực nén của bơm tiêm meso hay dải tần số laser phù hợp để mang lại kết quả an toàn toàn diện.`;
      bio = `Cố vấn công nghệ lâm sàng chuyên trách, huấn luyện viên dạn dày kinh nghiệm điều phối hàng chục khóa thực nghiệm y khoa chuyên đề quốc gia và quốc tế.`;
    }
  } else if (lowerTitle.includes('master class') || lowerTitle.includes('lớp học')) {
    if (lang === 'en') {
      abstract = `Specialized Master Class: Focuses on managing revision cases, unexpected deformities, or skin necrosis from unlicensed facilities.\n\nAcademic Content: Introduces 3D anthropometry, autologous tissue flap techniques, cartilage grafting design, and scar contracture revision.`;
      bio = `Distinguished Instructor certified by VSAPS, leading authority with proprietary medical curriculum and national recognition.`;
    } else {
      abstract = `Lớp giảng dạy tinh hoa nâng cao (Specialized Master Class): Tập trung mổ xẻ các ca lâm sàng hỏng, biến dạng khó lường hoặc hoại tử da thứ phát sau phẫu thuật lỗi từ cơ sở không phép.\n\nNội dung học thuật: Giới thiệu hệ quy chiếu nhân trắc học ba chiều, kỹ năng bóc tách bù đắp dải cơ bằng chất liệu vạt tự thân nâng cao, thiết kế lại đường nâng hạ sụn sườn, và giải quyết triệt để sẹo co rút lâu năm.`;
      bio = `Giảng viên Thượng Đỉnh được VSAPS cấp chứng nhận danh dự, là bậc thầy đầu ngành sở hữu các giáo trình bồi dưỡng y học độc quyền và nổi tiếng toàn quốc.`;
    }
  } else if (lowerTitle.includes('ngực') || lowerTitle.includes('vú') || lowerTitle.includes('mông') || lowerTitle.includes('bụng')) {
    if (lang === 'en') {
      abstract = `INTRODUCTION: Body contouring demand is growing but requires strict mechanical safety thresholds. We evaluate combining Water-jet Liposuction and fascial tightening.\n\nMETHODS: Outcomes of 110 comprehensive body contouring cases using electronic compartment pressure monitoring.\n\nRESULTS: Recovery time shortened to under 5 days, scar blending achieved maximum aesthetics, with a 97.4% satisfaction rate.\n\nCONCLUSION: Combining water-assisted liposuction and fascial preservation effectively prevents fat necrosis.`;
      bio = `Lead plastic surgeon specializing in body contouring, VSAPS board member, with excellent academic publications in Asian plastic surgery journals.`;
    } else {
      abstract = `ĐẶT VẤN ĐỀ: Nhu cầu tạo hình vóc dáng (Body Contouring) đang bùng nổ mạnh mẽ nhưng đòi hỏi gắt gao về chuẩn ranh giới an toàn cơ học. Nghiên cứu tiến hành đánh giá việc kết hợp phác đồ hút mỡ xoáy nước (Water-jet Liposuction) và thắt màng bụng nâng đỡ.\n\nPHƯƠNG PHÁP: Mô tả kết quả 110 ca phẫu thuật tạo hình bụng ngực toàn diện sử dụng hệ thống đo áp lực khoang điện tử.\n\nKẾT QUẢ: Rút ngắn thời gian phục hồi xuống dưới 5 ngày, vết sẹo tệp màu da đạt mức thẩm mỹ tối đa, tỷ lệ hài lòng của khách hàng đạt mức 97.4%.\n\nKẾT LUẬN: Việc phối hợp hút mỡ áp lực nước và bảo vệ cơ vách giúp ngăn biến chứng hoại tử mỡ thứ phát hiệu quả.`;
      bio = `Bác sĩ phẫu thuật chính chuyên khoa tạo hình vóc dáng, thành viên BCH VSAPS, có nhiều công bố học thuật xuất sắc trên các tạp chí phẫu thuật thẩm mỹ châu Á.`;
    }
  } else if (lowerTitle.includes('mặt') || lowerTitle.includes('hàm') || lowerTitle.includes('sọ') || lowerTitle.includes('cằm') || lowerTitle.includes('xương')) {
    if (lang === 'en') {
      abstract = `INTRODUCTION: Complex craniofacial surgery faces risks of malocclusion or infraorbital nerve damage. We report using precise 3D printed surgical guides.\n\nMETHODS: Study on 65 cases of craniotomy, mandibular angle reduction, and genioplasty planned with CT simulation.\n\nRESULTS: Plate fitting accuracy reached 0.2mm, preserving bite alignment and chewing sensation immediately post-operation.\n\nCONCLUSION: Virtual 3D guide technology eliminates subjective errors, yielding natural symmetry.`;
      bio = `MD, PhD specializing in tertiary craniofacial reconstruction, trained in France, with experience treating thousands of severe craniofacial traumas.`;
    } else {
      abstract = `ĐẶT VẤN ĐỀ: Phẫu thuật chỉnh hình xương hàm mặt phức tạp luôn đối mặt với rủi ro lệch trục cắn hoặc tổn thương thần kinh dưới ổ mắt. Chúng tôi báo cáo hiệu quả ứng dụng máng định vị in 3D sinh học chính xác.\n\nPHƯƠNG PHÁP: Nghiên cứu trên 65 ca phẫu thuật cắt sọ, gọt góc hàm và di lệch cằm theo thiết kế mô phỏng ảo cắt lớp vi tính.\n\nKẾT QUẢ: Độ bám khít dải vít đạt tỉ lệ chính xác đến 0.2mm, bảo toàn an toàn tuyệt đối khớp cắn và cảm giác nhai của người bệnh ngay sau mổ.\n\nKẾT LUẬN: Công nghệ máng ảo 3D là cuộc cách mạng giúp loại bỏ sai số chủ quan, mang lại diện mạo cân xứng tự nhiên.`;
      bio = `Tiến sĩ bác sĩ chuyên khoa chỉnh hình hàm mặt tuyến cuối, tu học nhiều năm tại Cộng hòa Pháp, có kinh nghiệm xử lý hàng ngàn ca sập gãy sọ mặt nặng.`;
    }
  } else if (lowerTitle.includes('chỉ') || lowerTitle.includes('laser') || lowerTitle.includes('botox') || lowerTitle.includes('filler') || lowerTitle.includes('trẻ hóa') || lowerTitle.includes('da')) {
    if (lang === 'en') {
      abstract = `INTRODUCTION: Multilayer collagen depletion is the core cause of facial aging. This study evaluates combining double-twist collagen threads with biological Exosome injections.\n\nMETHODS: Randomized trial on 140 middle-aged women. Elastin fiber density measured by deep optical scanning.\n\nRESULTS: Collagen production increased 3.2-fold after 3 months, significantly improving elasticity and erasing 85% of deep folds.\n\nCONCLUSION: Combining thread lifting with exosome activity is a booming trend in non-invasive aesthetics.`;
      bio = `Dermatologist, senior consultant for leading European laser medical device manufacturers, frequent speaker at Southeast Asian non-invasive aesthetic forums.`;
    } else {
      abstract = `ĐẶT VẤN ĐỀ: Sự suy giảm collagen đa tầng là nguyên nhân cốt lõi gây lão hóa cơ mặt. Nghiên cứu đánh giá tính hiệu quả khi phối hợp căng chỉ collagen xoắn kép và tiêm dải Exosome sinh học.\n\nPHƯƠNG PHÁP: Thử nghiệm ngẫu nhiên trên 140 phụ nữ tuổi trung niên có biểu hiện nhão cơ nông. Tiến hành đo mật độ sợi elastin bằng máy chụp quét quang học tầng sâu.\n\nKẾT QUẢ: Tăng sản sợi collagen gấp 3.2 lần sau 3 tháng trị liệu, cải thiện đáng kể độ đàn hồi căng mịn và xóa mờ 85% các nếp rãnh sâu.\n\nKẾT LUẬN: Phối hợp cơ học căng chỉ chỉ định kết hợp hoạt lực exosome là xu hướng bùng nổ sắp tới trong thẩm mỹ nội khoa không sâm lấn.`;
      bio = `Bác sĩ chuyên khoa II Da liễu, cố vấn cao cấp của các hãng thiết bị laser y tế hàng đầu châu Âu, diễn giả quen thuộc tại các diễn đàn thẩm mỹ nội khoa Đông Nam Á.`;
    }
  } else {
    if (lang === 'en') {
      abstract = `ABSTRACT:\nIntroduction: Summarizes clinical evidence in plastic surgery within the VSAPS 2026 conference framework. Addresses clinical challenges and CME standards.\n\nMethods: Prospective analysis combined with CT scan measurements. Double-blind survey on patients after 12 months.\n\nResults: Shortened healing time, preserved natural microvascular distribution, and increased aesthetic satisfaction.\n\nConclusion: Proposed protocol optimizes outcomes, suitable for integration into standard guidelines.`;
      bio = `Presenter: ${speakerName} (${speakerTitle}). Dedicated scientist with valuable contributions to the VSAPS committee.`;
    } else {
      abstract = `TÓM TẮT ĐỀ TÀI (ABSTRACT):\nĐặt vấn đề: Đề mục nghiên cứu nhằm tổng kết các bằng chứng lâm sàng tiên phong trong khuôn khổ chủ đề khoa học tạo hình thẩm mỹ thường niên VSAPS 2026. Giải quyết thách thức lâm sàng, nâng chuẩn chất lượng đào tạo liên tục CME.\n\nPhương pháp: Tiến hành phân tích tiến cứu kết hợp đo đạc cắt lớp vi tính trục tọa độ cơ thể. Khảo sát mù đôi trên mẫu bệnh nhân sau 12 tháng.\n\nKết quả: Rút ngắn thời gian dưỡng thương, bảo toàn sự phân bố vi mạch tự nhiên và nâng tỷ lệ thẩm mỹ hài lòng toàn diện.\n\nKết luận: Phương án cải tiến đề xuất hoạt tải tối ưu, xứng đáng tích hợp sâu rộng vào cẩm nang chỉ định điều trị thực địa.`;
      bio = `Báo cáo viên chuyên đề: ${speakerName} (${speakerTitle}). Nhà khoa học hoạt động nhiệt thành, có đóng góp hữu ích cho hội đồng đào tạo kịch xạ VSAPS.`;
    }
  }

  return { abstract, bio };
}

const getLocalizedRoomName = (roomName: string, lang: 'vi' | 'en') => {
  if (lang !== 'en') return roomName;
  return roomName
    .replace('Hội trường 1', 'Hall A')
    .replace('Hội trường 2', 'Hall B')
    .replace('Hội trường 3', 'Hall C')
    .replace('Hội trường 4', 'Hall D')
    .replace('Hội trường lớn', 'Main Hall')
    .replace('Hội trường A', 'Hall A')
    .replace('Hội trường B', 'Hall B')
    .replace('Hội trường C', 'Hall C')
    .replace('Hội trường D', 'Hall D');
};

const getLocalizedBenefit = (benefit: string, lang: 'vi' | 'en') => {
  if (lang !== 'en') return benefit;
  return benefit
    .replace('Tham dự toàn bộ các phiên báo cáo khoa học', 'Access to all scientific sessions')
    .replace('Nhận tài liệu Hội nghị chính thức (túi, sổ, bút, kỷ yếu)', 'Receive official conference materials (bag, notebook, pen, proceedings)')
    .replace('Teabreak cao cấp phục vụ suốt các phiên', 'Premium teabreak served during sessions')
    .replace('Đủ điều kiện cấp Chứng chỉ CME (nếu đăng ký)', 'Eligible for CME certificate (if registered)')
    .replace('Vé tham dự tiệc tối Gala Dinner sang trọng', 'Ticket to luxurious Gala Dinner')
    .replace('Tham dự 1 khóa đào tạo thực hành Hands-on tự chọn', 'Attend 1 hands-on workshop of choice')
    .replace('Đưa đón sân bay & Hướng dẫn viên riêng', 'Airport transfer & private tour guide')
    .replace('Cấp Chứng chỉ CME chính thức miễn phí', 'Complimentary official CME certificate')
    .replace('Tham dự đầy đủ phiên báo cáo khoa học', 'Access to all scientific sessions');
};

const translations = {
  vi: {
    subtitlePrefix: "Chủ đề:",
    time: "THỜI GIAN",
    location: "ĐỊA ĐIỂM",
    scale: "QUY MÔ",
    registerDelegate: "Đăng Ký Tham Dự (Đại Biểu)",
    registerSpeaker: "Gửi Bài Báo Cáo (Báo Cáo Viên)",
    registerSponsor: "Đăng Ký Tài Trợ (Doanh Nghiệp)",
    checkReg: "Tra Cứu Hồ Sơ & Tải Vé / CME",
    adminPortal: "Cổng Ban Tổ Chức (BTC) & CTV",
    tabIntro: "Giới Thiệu Sự Kiện",
    tabSchedule: "Chương Trình Khoa Học",
    tabSponsors: "Nhà Tài Trợ & Đăng Ký Gói",
    speakerHighlights: "Báo cáo viên chuyên đề nổi bật",
    noSpeakers: "Chưa có báo cáo viên nổi bật nào được cấu hình.",
    contactOrganizer: "Thông Tin Liên Hệ Ban Tổ Chức",
    organizerLabel: "Đơn vị chủ trì:",
    presidentLabel: "Chủ tịch hiệp hội:",
    secretaryLabel: "Thư ký liên hệ chính:",
    hotlineLabel: "Hotline / Zalo hỗ trợ:",
    emailLabel: "Email tiếp nhận:",
    websiteLabel: "Website chính thức:",
    fanpageLabel: "Fanpage sự nghiệp:",
    areYouSpeaker: "Bạn là Báo Cáo Viên?",
    speakerDeadline: "Hạn đệ trình tóm tắt báo cáo (abstract) và tài liệu đính kèm là ngày 15/09/2026. Sau khi submit, hội đồng khoa học sẽ phản hồi trong vòng 5 ngày làm việc và đồng bộ lịch trình tự động.",
    submitAbstractBtn: "Nộp Bài Báo Cáo Ngay",
    scheduleTitle: "LỊCH TRÌNH KHOA HỌC PHÂN PHÒNG SONG SONG",
    scheduleSub: "Sơ đồ phân bố báo cáo y khoa theo Timeline Gantt chuyên sâu. Nhấp chọn nhanh vào bài báo cáo để xem tóm tắt học thuật (Abstract) và tiểu sử Báo cáo viên (Bio).",
    myAgendaBtn: "Lịch Trình Cá Nhân",
    day1: "NGÀY 1: 11/12/2026",
    day1Sub: "Trù bị & Đào tạo Hands-on",
    day2: "NGÀY 2: 12/12/2026",
    day2Sub: "Khai mạc & Phiên toàn thể",
    day3: "NGÀY 3: 13/12/2026",
    day3Sub: "Chuyên sâu & Bế mạc Đại hội",
    filterTrackLabel: "Lọc chuyên đề:",
    searchPlaceholder: "Tìm tên bài báo cáo hoặc báo cáo viên...",
    clearSearchBtn: "Xóa",
    noSessionsFound: "Không tìm thấy bài báo cáo khoa học nào thỏa mãn bộ lọc.",
    noSessionsFoundSub: "Vui lòng thay đổi từ khóa, lọc chuyên đề hoặc tắt chế độ \"Lịch trình cá nhân\".",
    timeColHeader: "GIỜ PHIÊN",
    roomReady: "Sẵn sàng sảnh",
    hiddenFilter: "Bị ẩn bởi bộ lọc",
    mobileTimelineTitle: "📱 Hiển thị theo Chuỗi ký tự Thời gian lũy tiến",
    generalRoomName: "Hội trường lớn",
    abstractTabTitle: "Tóm Tắt Đề Tài (Abstract)",
    bioTabTitle: "Tiểu Sử Báo Cáo Viên (Bio)",
    officialAbstractLabel: "Công báo học thuật chính thức",
    modalAbstractHelpText: "Ý kiến phản hồi lâm sàng, phản biện khoa học toàn quốc hoặc hồ sơ câu hỏi tiếp dẫn trực tiếp có thể gửi về email ban tổ chức để chuẩn bị trước tọa đàm.",
    speakerBioLabel: "Lý lịch khoa học trích ngang",
    speakerTitleLabel: "Chức danh:",
    modalCloseBtn: "Đóng cửa sổ",
    sponsorTitle: "HƯỚNG DẪN ĐĂNG KÝ & BIỂU PHÍ THAM DỰ HỘI NGHỊ",
    sponsorSub: "Lựa chọn các hạng mục đăng ký tối ưu được Ban Chấp Hành hội VSAPS 2026 phê chuẩn chính thức",
    tableTitle: "Bảng Biểu Phí Đăng Ký Hệ Thống Năm 2026",
    colFeeItem: "Hạng Mục Phí Đăng Ký",
    colFeeEarly: "Trước 10/11/2026 (Ưu đãi)",
    colFeeLate: "Từ 10/11/2026 đến Hội Nghị",
    feeItem1: "Thành viên HPASS/HSPAS/VSAPS",
    feeItem2: "Không phải Hội viên",
    feeItem3: "Học viên chuyên ngành PTTM",
    feeItem4: "BS Nước ngoài (Foreign Doctor)",
    feeItem5: "Chương trình CME",
    feeItem6: "Tiệc tối Gala Dinner",
    feeItem7: "Chuyên đề Master class",
    feeItem8: "Hành trình Tour tham quan",
    freeDisplay: "Miễn Phí",
    pricingHelpLine1: "• Miễn phí tham dự đối với Chủ tọa và Báo cáo viên của phiên hội đồng.",
    pricingHelpLine2: "• Miễn trừ hoàn phí: Toàn bộ đăng ký là chính thức và Ban tổ chức không hoàn lại phí đăng ký dưới mọi hình thức tự hủy.",
    pricingHelpLine3: "• Thông tin chuyển khoản: Đại biểu chuyển khoản quét VietQR trên hóa đơn sau khi hoàn thành điền phiếu đăng ký.",
    recommendBadge: "Khuyên Dùng",
    registerPackageBtn: "Đăng Ký",
    addOnServicesTitle: "Học phần dịch vụ bổ sung tự chọn",
    addOnServicesHeading: "TÙY CHỌN ĐĂNG KÝ CẤP CME, GALA DINNER, MASTERCLASS & TOUR",
    addOnServicesDesc: "Bảng giá tự chọn linh hoạt cho phép đại biểu đính kèm hoặc bổ sung dịch vụ phù hợp với nhu cầu công việc của từng cá nhân:",
    cmeAddOnLabel: "✓ Đăng ký Chứng chỉ CME đào tạo:",
    cmeAddOnDesc: "Phụ thu: 350.000 VNĐ / Đại biểu",
    galaAddOnLabel: "✓ Tham dự bữa tiệc Gala Dinner:",
    galaAddOnDesc: "Phụ thu: 700.000 VNĐ / Đại biểu",
    openFormBtn: "Mở Form Đăng Ký Ngay ⚡",
    sponsorCtaTitle: "VSAPS 2026 PARTNER OPPORTUNITIES",
    sponsorCtaHeading: "Đồng Hành Phát Triển Cùng Hội Nghị VSAPS 2026",
    sponsorCtaDesc: "Trở thành đối tác vinh danh chính thức tại sảnh khoa học, khai thác quyền trưng bày quảng nghị và tiếp cận trực tiếp mạng lưới hàng vạn y bác sĩ toàn quốc.",
    registerSponsorBtn: "Đăng Ký Tài Trợ Ngay",
    coSponsorsTitle: "Doanh nghiệp Đồng Hành Tài Trợ",
    copyright: "Bản quyền thuộc về VSAPS © 2026. Phục vụ quản trị và hoạt động y học chính xác."
  },
  en: {
    subtitlePrefix: "Theme:",
    time: "TIME",
    location: "LOCATION",
    scale: "SCALE",
    registerDelegate: "Register (Delegate)",
    registerSpeaker: "Submit Abstract (Speaker)",
    registerSponsor: "Sponsor Opportunities (Enterprise)",
    checkReg: "Search Record / Get Ticket / CME",
    adminPortal: "BTC Portal",
    tabIntro: "About Event",
    tabSchedule: "Scientific Program",
    tabSponsors: "Sponsors & Packages",
    speakerHighlights: "Keynote & Featured Speakers",
    noSpeakers: "No keynote speakers configured yet.",
    contactOrganizer: "Contact Organizer Info",
    organizerLabel: "Hosting Institution:",
    presidentLabel: "Society President:",
    secretaryLabel: "Main Secretary Contact:",
    hotlineLabel: "Hotline / Zalo support:",
    emailLabel: "Inquiry Email:",
    websiteLabel: "Official Website:",
    fanpageLabel: "Facebook Page:",
    areYouSpeaker: "Are you a Speaker?",
    speakerDeadline: "Abstract submission deadline is Sept 15, 2026. The scientific committee will respond within 5 business days and sync the schedule.",
    submitAbstractBtn: "Submit Abstract Now",
    scheduleTitle: "PARALLEL SCIENTIFIC SESSIONS SCHEDULE",
    scheduleSub: "Gantt Timeline chart for scientific presentations. Click on any presentation to view the Abstract and Speaker Bio.",
    myAgendaBtn: "My Schedule",
    day1: "DAY 1: 11/12/2026",
    day1Sub: "Preparatory & Hands-on Training",
    day2: "DAY 2: 12/12/2026",
    day2Sub: "Opening & Plenary Sessions",
    day3: "DAY 3: 13/12/2026",
    day3Sub: "Specialized & Closing Ceremony",
    filterTrackLabel: "Filter Track:",
    searchPlaceholder: "Search presentation or speaker name...",
    clearSearchBtn: "Clear",
    noSessionsFound: "No presentations found matching the filters.",
    noSessionsFoundSub: "Please modify keywords, select another track, or turn off 'My Schedule' mode.",
    timeColHeader: "TIME SLOT",
    roomReady: "Room ready",
    hiddenFilter: "Hidden by filter",
    mobileTimelineTitle: "📱 Chronological Timeline List View",
    generalRoomName: "Main Hall",
    abstractTabTitle: "Abstract",
    bioTabTitle: "Speaker Biography",
    officialAbstractLabel: "Official Scientific Abstract",
    modalAbstractHelpText: "Clinical feedback, scientific reviews, or direct questions can be sent to the organizer's email for discussion preparation.",
    speakerBioLabel: "Curriculum Vitae",
    speakerTitleLabel: "Title:",
    modalCloseBtn: "Close Window",
    sponsorTitle: "REGISTRATION INFORMATION & FEE SCHEDULE",
    sponsorSub: "Select from the optimal registration categories approved by the VSAPS 2026 Executive Committee",
    tableTitle: "2026 Official Registration Fee Schedule",
    colFeeItem: "Registration Category",
    colFeeEarly: "Before Nov 10, 2026 (Early Bird)",
    colFeeLate: "From Nov 10, 2026 to Event",
    feeItem1: "HPASS/HSPAS/VSAPS Member",
    feeItem2: "Non-Member",
    feeItem3: "Plastic Surgery Student/Trainee",
    feeItem4: "Foreign Doctor",
    feeItem5: "CME Program",
    feeItem6: "Gala Dinner Ticket",
    feeItem7: "Masterclass Session",
    feeItem8: "Sightseeing Tour",
    freeDisplay: "Free",
    pricingHelpLine1: "• Free admission for Session Chairs and Scientific Speakers.",
    pricingHelpLine2: "• Refund policy: All registrations are final; the Organizer does not issue refunds for cancellations.",
    pricingHelpLine3: "• Bank Transfer: Scan the VietQR code on the invoice after completing the registration form.",
    recommendBadge: "Recommended",
    registerPackageBtn: "Register",
    addOnServicesTitle: "Optional add-on services",
    addOnServicesHeading: "OPTIONAL CME, GALA DINNER, MASTERCLASS & TOUR ADD-ONS",
    addOnServicesDesc: "Flexible pricing options allowing delegates to customize their package based on their professional needs:",
    cmeAddOnLabel: "✓ CME Training Certificate registration:",
    cmeAddOnDesc: "Add-on fee: 350,000 VNĐ / Delegate",
    galaAddOnLabel: "✓ Gala Dinner attendance:",
    galaAddOnDesc: "Add-on fee: 700,000 VNĐ / Delegate",
    openFormBtn: "Open Registration Form ⚡",
    sponsorCtaTitle: "VSAPS 2026 PARTNER OPPORTUNITIES",
    sponsorCtaHeading: "Partner with VSAPS 2026 Scientific Conference",
    sponsorCtaDesc: "Become an official partner at the scientific hall, leverage exhibition opportunities, and directly reach thousands of doctors nationwide.",
    registerSponsorBtn: "Register Sponsorship Now",
    coSponsorsTitle: "Official Corporate Sponsors",
    copyright: "Copyright © VSAPS 2026. Supporting administration and precise medicine."
  }
};

export default function PublicEventDetails({ onNavigate }: PublicEventDetailsProps) {
  const edc = store.getBusinessConfig().eventDetailsConfig || DEFAULT_EVENT_DETAILS_CONFIG;
  const sessions = store.getSessions();
  const sponsors = store.getSponsors();
  const packages = store.getPackages().filter(p => p.isActive);
  const [activeTab, setActiveTab ] = useState<'intro' | 'schedule' | 'sponsors'>('schedule');
  const [lang, setLang] = useState<'vi' | 'en'>('vi');

  // Automatically detect country code of current IP to set default language to English if outside VN
  useEffect(() => {
    const detectLanguage = async () => {
      try {
        const response = await fetch('https://freeipapi.com/api/json');
        if (response.ok) {
          const data = await response.json();
          if (data && data.countryCode) {
            if (data.countryCode !== 'VN') {
              setLang('en');
              return;
            } else {
              setLang('vi');
              return;
            }
          }
        }
      } catch (err) {
        console.warn('GeoIP lookup failed, falling back to browser language:', err);
      }

      // Fallback: Check browser language
      const userLang = navigator.language || (navigator as any).userLanguage || 'vi';
      if (!userLang.toLowerCase().startsWith('vi')) {
        setLang('en');
      } else {
        setLang('vi');
      }
    };

    detectLanguage();
  }, []);

  const t = (key: keyof typeof translations['vi']) => {
    return translations[lang]?.[key] || translations['vi']?.[key] || "";
  };

  const ROOMS_CONFIG = getRoomsConfig(lang);

  // Interactive schedule states
  const [selectedDate, setSelectedDate] = useState<string>('2026-12-12'); // Default to main day (Day 2)
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedTrackFilter, setSelectedTrackFilter] = useState<string>('All');
  const [onlyMyAgenda, setOnlyMyAgenda] = useState<boolean>(false);
  const [selectedSessionDetail, setSelectedSessionDetail] = useState<ConferenceSession | null>(null);
  const [modalTab, setModalTab] = useState<'abstract' | 'bio'>('abstract');

  const [personalAgenda, setPersonalAgenda] = useState<string[]>(() => {
    try {
      return JSON.parse(localStorage.getItem('vsaps2026_my_agenda') || '[]');
    } catch {
      return [];
    }
  });

  const handleToggleBookmark = (sessionId: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    let updated: string[];
    if (personalAgenda.includes(sessionId)) {
      updated = personalAgenda.filter(id => id !== sessionId);
    } else {
      updated = [...personalAgenda, sessionId];
    }
    setPersonalAgenda(updated);
    localStorage.setItem('vsaps2026_my_agenda', JSON.stringify(updated));
  };

  useEffect(() => {
    if (edc) {
      const activeTitle = lang === 'en' 
        ? (edc.seoTitleEn || edc.heroTitleEn || edc.seoTitle || edc.heroTitle || "VSAPS 2026")
        : (edc.seoTitle || edc.heroTitle || "VSAPS 2026");
      document.title = activeTitle;
      
      let metaDesc = document.querySelector('meta[name="description"]');
      if (!metaDesc) {
        metaDesc = document.createElement('meta');
        metaDesc.setAttribute('name', 'description');
        document.head.appendChild(metaDesc);
      }
      const activeDesc = lang === 'en'
        ? (edc.seoDescriptionEn || edc.heroSubtitleEn || edc.seoDescription || edc.heroSubtitle || "")
        : (edc.seoDescription || edc.heroSubtitle || "");
      metaDesc.setAttribute('content', activeDesc);

      let metaKeywords = document.querySelector('meta[name="keywords"]');
      if (!metaKeywords) {
        metaKeywords = document.createElement('meta');
        metaKeywords.setAttribute('name', 'keywords');
        document.head.appendChild(metaKeywords);
      }
      const activeKeywords = lang === 'en'
        ? (edc.seoKeywordsEn || edc.seoKeywords || "")
        : (edc.seoKeywords || "");
      metaKeywords.setAttribute('content', activeKeywords);
    }
  }, [edc, lang]);

  return (
    <div className="bg-slate-50 min-h-screen text-slate-800">
      {/* Hero Section */}
      <div 
        className="relative bg-gradient-to-r from-teal-950 via-sky-950 to-slate-950 text-white py-12 md:py-16 px-4 overflow-hidden border-b border-teal-500/20 bg-cover bg-center"
        style={edc.heroBannerUrl ? { backgroundImage: `linear-gradient(rgba(4, 47, 46, 0.85), rgba(15, 23, 42, 0.85)), url(${edc.heroBannerUrl})` } : undefined}
      >
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_bottom_left,rgba(20,184,166,0.15),transparent)]" />
        <div className="max-w-6xl mx-auto relative z-10">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-teal-500/10 border border-teal-500/30 text-teal-300 text-xs font-bold mb-6 animate-pulse">
            <Award className="w-3.5 h-3.5" />
            VSAPS 10TH ANNUAL MEETING & CONFERENCE
          </div>
          
          <h1 className="text-3xl md:text-5xl font-black tracking-tight mb-4 max-w-4xl text-teal-50 uppercase leading-snug">
            {lang === 'en' ? (edc.heroTitleEn || edc.heroTitle) : edc.heroTitle}
          </h1>
          <p className="text-slate-300 text-lg md:text-xl max-w-2xl mb-8 leading-relaxed font-medium">
            {t('subtitlePrefix')} <span className="text-amber-400 font-black">&ldquo;{lang === 'en' ? (edc.heroSubtitleEn || edc.heroSubtitle) : edc.heroSubtitle}&rdquo;</span>.
          </p>
 
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-3xl mb-10">
            <div className="flex items-center gap-3 bg-white/5 backdrop-blur-md p-4 rounded-xl border border-white/10">
              <Calendar className="w-8 h-8 text-teal-400 shrink-0" />
              <div>
                <p className="text-xs text-slate-400 font-black">{t('time')}</p>
                <p className="text-sm font-extrabold text-white">
                  {lang === 'en' ? (edc.eventDatesEn || edc.eventDates) : edc.eventDates}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-3 bg-white/5 backdrop-blur-md p-4 rounded-xl border border-white/10">
              <MapPin className="w-8 h-8 text-teal-400 shrink-0" />
              <div>
                <p className="text-xs text-slate-400 font-black">{t('location')}</p>
                <p className="text-sm font-extrabold text-white">
                  {lang === 'en' ? (edc.eventLocationEn || edc.eventLocation) : edc.eventLocation}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-3 bg-white/5 backdrop-blur-md p-4 rounded-xl border border-white/10">
              <Users className="w-8 h-8 text-teal-400 shrink-0" />
              <div>
                <p className="text-xs text-slate-400 font-black">{t('scale')}</p>
                <p className="text-sm font-extrabold text-white">
                  {lang === 'en' ? (edc.eventScaleEn || edc.eventScale) : edc.eventScale}
                </p>
              </div>
            </div>
          </div>

          <div className="flex flex-wrap gap-4">
            <button
              id="btn-nav-reg-delegate"
              onClick={() => onNavigate('register-delegate')}
              className="px-6 py-3 rounded-xl bg-teal-500 hover:bg-teal-600 font-semibold text-white transition-all shadow-lg shadow-teal-500/20 inline-flex items-center gap-2"
            >
              {t('registerDelegate')}
              <ArrowRight className="w-4 h-4" />
            </button>
            <button
              id="btn-nav-reg-speaker"
              onClick={() => onNavigate('register-speaker')}
              className="px-6 py-3 rounded-xl bg-white/10 hover:bg-white/15 font-semibold text-white border border-white/20 transition-all inline-flex items-center gap-2"
            >
              {t('registerSpeaker')}
              <FileText className="w-4 h-4" />
            </button>
            <button
              id="btn-nav-reg-sponsor"
              onClick={() => onNavigate('register-sponsor')}
              className="px-6 py-3 rounded-xl bg-indigo-650 hover:bg-indigo-700 font-semibold text-white transition-all shadow-lg inline-flex items-center gap-2"
            >
              {t('registerSponsor')}
              <HeartHandshake className="w-4 h-4" />
            </button>
            <button
              id="btn-nav-check-reg"
              onClick={() => onNavigate('check-registration')}
              className="px-6 py-3 rounded-xl bg-amber-500 hover:bg-amber-600 font-semibold text-slate-950 transition-all shadow-lg inline-flex items-center gap-2"
            >
              {t('checkReg')}
              <Search className="w-4 h-4" />
            </button>
            <button
              id="btn-nav-portal"
              onClick={() => onNavigate('dashboard')}
              className="px-6 py-3 rounded-xl bg-slate-800/80 hover:bg-slate-800 text-slate-300 font-medium border border-teal-500/20 transition-all"
            >
              {t('adminPortal')}
            </button>
          </div>
        </div>
      </div>

      {/* Tabs Menu */}
      <div className="sticky top-0 bg-white border-b border-slate-200 z-40 shadow-sm">
        <div className="max-w-6xl mx-auto px-4">
          <div className="flex justify-between items-center">
            <div className="flex gap-8">
              <button
                onClick={() => setActiveTab('intro')}
                className={`py-4 text-sm font-semibold border-b-2 transition-all ${
                  activeTab === 'intro' ? 'border-teal-600 text-teal-600' : 'border-transparent text-slate-500 hover:text-slate-800'
                }`}
              >
                {t('tabIntro')}
              </button>
              <button
                onClick={() => setActiveTab('schedule')}
                className={`py-4 text-sm font-semibold border-b-2 transition-all ${
                  activeTab === 'schedule' ? 'border-teal-600 text-teal-600' : 'border-transparent text-slate-500 hover:text-slate-800'
                }`}
              >
                {t('tabSchedule')}
              </button>
              <button
                onClick={() => setActiveTab('sponsors')}
                className={`py-4 text-sm font-semibold border-b-2 transition-all ${
                  activeTab === 'sponsors' ? 'border-teal-600 text-teal-600' : 'border-transparent text-slate-500 hover:text-slate-800'
                }`}
              >
                {t('tabSponsors')}
              </button>
            </div>
            {/* Language Switcher */}
            <div className="flex gap-1.5 items-center text-xs font-bold border border-slate-200 rounded-lg p-1 bg-slate-50">
              <button
                onClick={() => setLang('vi')}
                className={`px-2 py-1 rounded transition-all select-none cursor-pointer ${
                  lang === 'vi' ? 'bg-teal-600 text-white shadow-sm' : 'text-slate-500 hover:text-slate-800'
                }`}
              >
                VI
              </button>
              <button
                onClick={() => setLang('en')}
                className={`px-2 py-1 rounded transition-all select-none cursor-pointer ${
                  lang === 'en' ? 'bg-teal-600 text-white shadow-sm' : 'text-slate-500 hover:text-slate-800'
                }`}
              >
                EN
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="max-w-6xl mx-auto px-4 py-6">
        {activeTab === 'intro' && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            <div className="lg:col-span-2 space-y-6">
              <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm">
                <h3 className="text-xl font-bold text-slate-900 mb-4 flex items-center gap-2">
                  <Cpu className="text-teal-600 w-5 h-5" />
                  {lang === 'en' ? (edc.introTitleEn || edc.introTitle) : edc.introTitle}
                </h3>
                <p className="text-slate-600 leading-relaxed mb-4">
                  {lang === 'en' ? (edc.introParagraph1En || edc.introParagraph1) : edc.introParagraph1}
                </p>
                <p className="text-slate-600 leading-relaxed mb-6">
                  {lang === 'en' ? (edc.introParagraph2En || edc.introParagraph2) : edc.introParagraph2}
                </p>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="flex gap-3 p-4 bg-teal-50/50 rounded-xl border border-teal-100/50">
                    <CheckCircle className="text-teal-600 w-5 h-5 shrink-0 mt-0.5" />
                    <div>
                      <h4 className="font-semibold text-slate-900 text-sm">
                        {lang === 'en' ? (edc.feature1TitleEn || edc.feature1Title) : edc.feature1Title}
                      </h4>
                      <p className="text-xs text-slate-500">
                        {lang === 'en' ? (edc.feature1DescEn || edc.feature1Desc) : edc.feature1Desc}
                      </p>
                    </div>
                  </div>
                  <div className="flex gap-3 p-4 bg-teal-50/50 rounded-xl border border-teal-100/50">
                    <CheckCircle className="text-teal-600 w-5 h-5 shrink-0 mt-0.5" />
                    <div>
                      <h4 className="font-semibold text-slate-900 text-sm">
                        {lang === 'en' ? (edc.feature2TitleEn || edc.feature2Title) : edc.feature2Title}
                      </h4>
                      <p className="text-xs text-slate-500">
                        {lang === 'en' ? (edc.feature2DescEn || edc.feature2Desc) : edc.feature2Desc}
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Speaker Highlights info */}
              <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm">
                <h3 className="text-xl font-bold text-slate-900 mb-6 flex items-center gap-2">
                  <Users className="text-teal-600 w-5 h-5" />
                  {t('speakerHighlights')}
                </h3>
                <div className="space-y-4">
                  {(edc.highlightSpeakers || []).map((spk) => {
                    const initials = spk.name
                      .split(' ')
                      .filter(Boolean)
                      .slice(-2)
                      .map((n) => n[0])
                      .join('')
                      .toUpperCase();

                    return (
                      <div key={spk.id} className="flex items-start gap-4 p-4 rounded-xl hover:bg-slate-50 transition-all border border-transparent hover:border-slate-100">
                        {spk.avatarUrl ? (
                          <img src={spk.avatarUrl} alt={spk.name} className="w-12 h-12 rounded-full object-cover shrink-0 shadow border border-slate-100" />
                        ) : (
                          <div className="w-12 h-12 rounded-full bg-gradient-to-tr from-teal-600 to-sky-600 flex items-center justify-center text-white font-bold shrink-0 text-sm shadow">
                            {initials}
                          </div>
                        )}
                        <div>
                          <h4 className="font-semibold text-slate-900">{spk.name}</h4>
                          <p className="text-xs text-teal-600 font-medium mb-1">
                            {lang === 'en' ? (spk.titleEn || spk.title) : spk.title}
                          </p>
                          <p className="text-xs text-slate-500">
                            {lang === 'en' ? 'Topic' : 'Chuyên đề'}: &ldquo;{lang === 'en' ? (spk.topicEn || spk.topic) : spk.topic}&rdquo;
                          </p>
                        </div>
                      </div>
                    );
                  })}
                  {(edc.highlightSpeakers || []).length === 0 && (
                    <p className="text-xs text-slate-400 italic text-center py-4">{t('noSpeakers')}</p>
                  )}
                </div>
              </div>
            </div>

            {/* Practical info sidebar */}
            <div className="space-y-6">
              <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm">
                <h4 className="font-bold text-slate-900 mb-4 text-md">{t('contactOrganizer')}</h4>
                <div className="space-y-4 text-xs text-slate-600 leading-relaxed">
                  <div>
                    <span className="font-bold text-slate-800 block uppercase">{t('organizerLabel')}</span>
                    <span className="font-semibold text-slate-900">
                      {lang === 'en' ? (edc.contactOrganizerEn || edc.contactOrganizer) : edc.contactOrganizer}
                    </span>
                  </div>
                  <div>
                    <span className="font-bold text-slate-800 block uppercase">{t('presidentLabel')}</span>
                    <span className="font-semibold text-slate-900">
                      {lang === 'en' ? (edc.contactPresidentEn || edc.contactPresident) : edc.contactPresident}
                    </span>
                  </div>
                  <div className="border-t border-slate-100 pt-3">
                    <span className="font-bold text-slate-800 block uppercase">{t('secretaryLabel')}</span>
                    <span className="text-teal-900 font-extrabold text-sm">
                      {lang === 'en' ? (edc.contactSecretaryEn || edc.contactSecretary) : edc.contactSecretary}
                    </span>
                  </div>
                  <div>
                    <span className="font-bold text-slate-800 block uppercase">{t('hotlineLabel')}</span>
                    <span className="text-emerald-600 font-bold text-sm">{edc.contactPhone}</span>
                  </div>
                  <div>
                    <span className="font-bold text-slate-800 block uppercase">{t('emailLabel')}</span>
                    <span className="text-sky-700 font-semibold text-xs font-mono select-all">{edc.contactEmail}</span>
                  </div>
                  <div className="border-t border-slate-100 pt-3">
                    <span className="font-bold text-slate-800 block uppercase">{t('websiteLabel')}</span>
                    <a href={edc.contactWebsite} target="_blank" rel="noreferrer" className="text-teal-600 hover:underline font-semibold font-mono">{edc.contactWebsite}</a>
                  </div>
                  <div>
                    <span className="font-bold text-slate-800 block uppercase">{t('fanpageLabel')}</span>
                    <a href={edc.contactFanpage} target="_blank" rel="noreferrer" className="text-indigo-650 hover:underline font-semibold text-[11px] font-mono break-all">{edc.contactFanpage.replace(/^https?:\/\/(www\.)?/, '')}</a>
                  </div>
                </div>
              </div>

              <div className="bg-gradient-to-br from-indigo-900 to-slate-900 text-white p-5 rounded-2xl border border-indigo-950 shadow-md">
                <h4 className="font-bold mb-2 flex items-center gap-2">
                  <ShieldAlert className="w-5 h-5 text-teal-400" />
                  {t('areYouSpeaker')}
                </h4>
                <p className="text-xs text-indigo-200 mb-6 leading-relaxed">
                  {t('speakerDeadline')}
                </p>
                <button
                  id="btn-nav-reg-speaker-action"
                  onClick={() => onNavigate('register-speaker')}
                  className="w-full py-2.5 rounded-lg bg-teal-500 hover:bg-teal-600 text-white font-semibold text-xs transition-all shadow"
                >
                  {t('submitAbstractBtn')}
                </button>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'schedule' && (
          <div className="space-y-6">
            {/* Header controls & Quick tabs */}
            <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm space-y-4">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-100 pb-3.5">
                <div>
                  <h3 className="text-2xl font-black text-slate-900 tracking-tight flex items-center gap-2">
                    <Award className="w-6 h-6 text-teal-600" />
                    {t('scheduleTitle')}
                  </h3>
                  <p className="text-slate-500 text-xs mt-1">
                    {t('scheduleSub')}
                  </p>
                </div>

                <div className="flex flex-wrap gap-2.5">
                  <button
                    id="btn-filter-my-agenda"
                    onClick={() => setOnlyMyAgenda(!onlyMyAgenda)}
                    className={`px-4 py-2 text-xs font-bold rounded-xl transition-all cursor-pointer flex items-center gap-1.5 border ${
                      onlyMyAgenda 
                        ? 'bg-amber-500 text-white border-amber-500 shadow-md shadow-amber-500/10' 
                        : 'bg-amber-55 text-amber-700 border-amber-200 hover:bg-amber-100'
                    }`}
                  >
                    <Star className={`w-3.5 h-3.5 ${onlyMyAgenda ? 'fill-white' : 'fill-amber-500 text-amber-500'}`} />
                    {t('myAgendaBtn')} ({personalAgenda.length})
                  </button>
                </div>
              </div>

              {/* Day selection */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                {[
                  { date: '2026-12-11', titleKey: 'day1' as const, subtitleKey: 'day1Sub' as const },
                  { date: '2026-12-12', titleKey: 'day2' as const, subtitleKey: 'day2Sub' as const },
                  { date: '2026-12-13', titleKey: 'day3' as const, subtitleKey: 'day3Sub' as const }
                ].map((d) => (
                  <button
                    key={d.date}
                    onClick={() => setSelectedDate(d.date)}
                    className={`p-4 rounded-2xl text-left border transition-all cursor-pointer relative overflow-hidden ${
                      selectedDate === d.date
                        ? 'bg-gradient-to-br from-teal-900 to-slate-900 border-teal-600 text-white shadow-md'
                        : 'bg-slate-50 hover:bg-slate-100 border-slate-200 text-slate-850'
                    }`}
                  >
                    <p className="text-xs font-black tracking-wider opacity-75">{t(d.titleKey)}</p>
                    <p className="text-sm font-bold mt-1">{t(d.subtitleKey)}</p>
                    {selectedDate === d.date && (
                      <div className="absolute right-3 bottom-3 w-2 h-2 rounded-full bg-teal-400 animate-pulse" />
                    )}
                  </button>
                ))}
              </div>
            </div>

            {/* MAIN TIMELINE CHART */}
            {(() => {
              // 1. Filter sessions
              const filteredSessions = sessions.filter((s) => {
                if (s.date !== selectedDate) return false;
                
                if (onlyMyAgenda && !personalAgenda.includes(s.id)) return false;

                if (selectedTrackFilter !== 'All' && s.track !== selectedTrackFilter) return false;

                if (searchQuery) {
                  const query = searchQuery.toLowerCase();
                  return (
                    s.title.toLowerCase().includes(query) ||
                    s.speakerName.toLowerCase().includes(query) ||
                    s.description.toLowerCase().includes(query)
                  );
                }

                return true;
              });

              if (filteredSessions.length === 0) {
                return (
                  <div className="bg-white p-16 rounded-3xl border border-slate-150 text-center space-y-3">
                    <Info className="w-12 h-12 text-slate-300 mx-auto" />
                    <p className="text-sm font-semibold text-slate-600">{t('noSessionsFound')}</p>
                    <p className="text-xs text-slate-400">{t('noSessionsFoundSub')}</p>
                  </div>
                );
              }

              // 2. Identify all unique time slots for this day
              const daySessions = sessions.filter(s => s.date === selectedDate);
              const timeBlocksMap = new Map<string, string>();
              daySessions.forEach(s => {
                timeBlocksMap.set(s.startTime, s.endTime);
              });
              const sortedTimeBlocks = Array.from(timeBlocksMap.entries()).sort((a, b) => a[0].localeCompare(b[0]));

              // Helper check if time slot should be visible
              const hasVisibleSession = (startTime: string) => {
                return filteredSessions.some(s => s.startTime === startTime);
              };

              return (
                <div className="space-y-6">
                  {/* DESKTOP TIMELINE GANTT (Visible on MD screens and up) */}
                  <div className="hidden md:block bg-white border border-slate-205 rounded-3xl overflow-hidden shadow-sm">
                    {/* Header bar of Room tracks */}
                    <div className="grid grid-cols-[115px_1fr_1fr_1fr_1fr] border-b border-slate-200 bg-slate-900 text-white font-extrabold text-xs text-center uppercase tracking-wider divide-x divide-slate-800 select-none">
                      <div className="p-4 bg-slate-950 text-slate-300 flex items-center justify-center gap-1">
                        <Clock className="w-3.5 h-3.5 text-teal-400" />
                        {t('timeColHeader')}
                      </div>
                      {ROOMS_CONFIG.map((room) => (
                        <div key={room.id} className="p-4 flex flex-col justify-center items-center">
                          <span className="bg-white/10 text-teal-300 font-mono px-2 py-0.5 rounded text-[10px] mb-1">
                            {room.vietnameseName}
                          </span>
                          <span className="text-[10px] text-slate-300 font-medium leading-tight max-w-[160px] text-center normal-case">
                            {room.subtitle}
                          </span>
                        </div>
                      ))}
                    </div>

                    {/* Timeline rows of blocks */}
                    <div className="divide-y divide-slate-150">
                      {sortedTimeBlocks.map(([startTime, endTime]) => {
                        if (!hasVisibleSession(startTime)) return null;

                        // Get all sessions inside this slot
                        const slots = daySessions.filter(s => s.startTime === startTime);
                        
                        const representative = slots[0];
                        const isGeneral = slots.length === 1 && (
                          (!representative.roomName.includes('Hội trường 1') &&
                           !representative.roomName.includes('Hội trường 2') &&
                           !representative.roomName.includes('Hội trường 3') &&
                           !representative.roomName.includes('Hội trường 4')) ||
                          representative.roomName.toLowerCase().includes('bàn check') ||
                          representative.roomName.toLowerCase().includes('ăn trưa') ||
                          representative.roomName.toLowerCase().includes('dinner') ||
                          representative.roomName.toLowerCase().includes('tiệc')
                        );

                        return (
                          <div key={startTime} className="grid grid-cols-[115px_1fr_1fr_1fr_1fr] divide-x divide-slate-150 items-stretch">
                            {/* Time Block Column */}
                            <div className="bg-slate-50 font-mono text-[11px] font-extrabold text-teal-900 flex flex-col items-center justify-center p-3">
                              <span className="px-2 py-1 rounded bg-teal-50 text-teal-800 border border-teal-200 shadow-sm leading-none text-center">
                                {startTime} - {endTime}
                              </span>
                            </div>

                            {/* Session Contents columns */}
                            {isGeneral ? (
                              <div className="col-span-4 p-4 flex items-center justify-center min-h-[90px]">
                                {(() => {
                                  const isFilteredIn = filteredSessions.some(s => s.id === representative.id);
                                  if (!isFilteredIn) {
                                    return (
                                      <p className="text-xs text-slate-300 italic">{t('hiddenFilter')}</p>
                                    );
                                  }

                                  const isBookmarked = personalAgenda.includes(representative.id);
                                  
                                  return (
                                    <div 
                                      onClick={() => setSelectedSessionDetail(representative)}
                                      className={`w-full max-w-4xl p-4 rounded-2xl border transition-all cursor-pointer text-center text-slate-800 bg-gradient-to-r from-teal-50/50 via-sky-50/30 to-indigo-50/50 border-teal-200 hover:scale-[1.012] hover:shadow-md hover:border-teal-300 relative group`}
                                    >
                                      {/* Star bookmark badge */}
                                      <button
                                        onClick={(e) => handleToggleBookmark(representative.id, e)}
                                        className="absolute right-4 top-4 p-1.5 rounded-full hover:bg-white/60 text-amber-500 transition-all"
                                        title={isBookmarked ? (lang === 'en' ? "Remove from my schedule" : "Xóa khỏi Lịch trình cá nhân") : (lang === 'en' ? "Save to my schedule" : "Lưu vào Lịch trình cá nhân")}
                                      >
                                        <Star className={`w-4 h-4 ${isBookmarked ? 'fill-amber-500' : 'text-slate-300 hover:text-amber-500'}`} />
                                      </button>

                                      <span className="inline-block px-2 py-0.5 rounded bg-teal-600/10 text-teal-800 font-bold text-[9px] uppercase tracking-widest mb-1 select-none">
                                        {representative.track}
                                      </span>
                                      <h4 className="font-extrabold text-slate-900 text-sm group-hover:text-teal-700 transition-all">
                                        {representative.title}
                                      </h4>
                                      <p className="text-xs text-slate-500 mt-1 max-w-2xl mx-auto line-clamp-2">
                                        {representative.description}
                                      </p>
                                      
                                      <div className="inline-flex items-center gap-1.5 mt-3 text-[10px] font-bold text-slate-600 bg-white/80 px-3 py-1 rounded-full shadow-xs border border-slate-100">
                                        <MapPin className="w-3 h-3 text-slate-405" />
                                        <span>{lang === 'en' ? 'Main venue' : 'Địa điểm chính'}: <strong>{getLocalizedRoomName(representative.roomName, lang)}</strong></span>
                                      </div>
                                    </div>
                                  );
                                })()}
                              </div>
                            ) : (
                              // Render 4 parallel columns
                              [0, 1, 2, 3].map((colIndex) => {
                                const roomConfig = ROOMS_CONFIG[colIndex];
                                const currentSession = slots.find(s => s.roomName.includes(roomConfig.id));
                                
                                if (!currentSession) {
                                  return (
                                    <div key={colIndex} className="bg-slate-50/20 p-3 flex items-center justify-center select-none text-[9px] text-slate-350 font-mono uppercase tracking-wider relative min-h-[140px]">
                                      <div className="absolute inset-2 border border-dashed border-slate-205/65 rounded-xl" />
                                      {t('roomReady')}
                                    </div>
                                  );
                                }

                                const isFilteredIn = filteredSessions.some(s => s.id === currentSession.id);
                                if (!isFilteredIn) {
                                  return (
                                    <div key={colIndex} className="bg-slate-50/20 p-3 flex items-center justify-center text-[10px] text-slate-300 italic select-none min-h-[140px]">
                                      {t('hiddenFilter')}
                                    </div>
                                  );
                                }

                                const isBookmarked = personalAgenda.includes(currentSession.id);

                                return (
                                  <div 
                                    key={colIndex}
                                    onClick={() => setSelectedSessionDetail(currentSession)}
                                    className={`p-4 hover:bg-slate-50/60 transition-all cursor-pointer flex flex-col justify-between min-h-[145px] relative group border-t-2 border-slate-100/50 ${
                                      isBookmarked ? 'bg-amber-50/40' : 'bg-white'
                                    }`}
                                  >
                                    {/* Star bookmark badge */}
                                    <button
                                      onClick={(e) => handleToggleBookmark(currentSession.id, e)}
                                      className="absolute right-3 top-3 p-1 rounded-full hover:bg-slate-100 text-amber-500 transition-all z-10"
                                      title={isBookmarked ? (lang === 'en' ? "Remove from my schedule" : "Xóa khỏi Lịch trình cá nhân") : (lang === 'en' ? "Save to my schedule" : "Lưu vào Lịch trình cá nhân")}
                                    >
                                      <Star className={`w-3.5 h-3.5 ${isBookmarked ? 'fill-amber-500 text-amber-500' : 'text-slate-300 group-hover:text-slate-550'}`} />
                                    </button>

                                    <div>
                                      {/* Track tag */}
                                      <div className="flex items-center gap-1.5 mb-1.5 select-none">
                                        <span className={`px-1.5 py-0.5 rounded text-[8.5px] font-black uppercase tracking-wider ${
                                          currentSession.track === 'Live Surgery' ? 'bg-rose-50 text-rose-700' :
                                          currentSession.track === 'Hands-on' ? 'bg-indigo-50 text-indigo-700' :
                                          currentSession.track === 'Master Class' ? 'bg-amber-50 text-amber-700' : 'bg-teal-50 text-teal-700'
                                        }`}>
                                          {currentSession.track}
                                        </span>
                                      </div>

                                      <h4 className="font-extrabold text-slate-900 text-[13px] leading-snug group-hover:text-teal-700 transition-all line-clamp-3">
                                        {currentSession.title}
                                      </h4>
                                      <p className="text-[10px] text-slate-550 mt-1 line-clamp-2">
                                        {currentSession.description}
                                      </p>
                                    </div>

                                    {/* Speaker identity card */}
                                    <div className="flex items-center gap-2 border-t border-slate-100 pt-2 mt-3 select-none">
                                      <div className="w-6 h-6 rounded-full bg-teal-100 flex items-center justify-center text-teal-800 font-extrabold text-[9px] shrink-0 shadow-sm">
                                        {currentSession.speakerName.split(' ').slice(-1)[0].substring(0, 2).toUpperCase()}
                                      </div>
                                      <div className="overflow-hidden">
                                        <p className="text-[10px] font-bold text-slate-800 truncate leading-tight">
                                          {currentSession.speakerName}
                                        </p>
                                        <p className="text-[8.5px] text-slate-450 truncate leading-none mt-0.5">
                                          {currentSession.speakerTitle}
                                        </p>
                                      </div>
                                    </div>
                                  </div>
                                );
                              })
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {/* MOBILE RESPONSIVE TIMELINE LIST (Visible only on small viewports) */}
                  <div className="block md:hidden space-y-4">
                    <p className="text-slate-500 font-black text-[10px] tracking-wider uppercase mb-2 select-none">
                      {t('mobileTimelineTitle')}
                    </p>
                    {filteredSessions.map((session) => {
                      const isBookmarked = personalAgenda.includes(session.id);
                      const matchingRoom = ROOMS_CONFIG.find(r => session.roomName.includes(r.id));
                      
                      return (
                        <div
                          key={session.id}
                          onClick={() => setSelectedSessionDetail(session)}
                          className={`p-5 rounded-2xl border transition-all cursor-pointer relative ${
                            isBookmarked 
                              ? 'bg-amber-50/50 border-amber-300 shadow-xs' 
                              : 'bg-white border-slate-150 hover:bg-slate-50 shadow-xs'
                          }`}
                        >
                          {/* Star bookmark badge */}
                          <button
                            onClick={(e) => handleToggleBookmark(session.id, e)}
                            className="absolute right-4 top-4 p-1.5 rounded-full bg-slate-100 text-amber-500 transition-all"
                          >
                            <Star className={`w-4 h-4 ${isBookmarked ? 'fill-amber-500' : 'text-slate-400'}`} />
                          </button>

                          <div className="space-y-3">
                            <div className="flex flex-wrap items-center gap-1.5">
                              <span className="font-mono text-[10px] font-black text-teal-850 bg-teal-50 px-2.5 py-1 rounded-md">
                                {session.startTime} - {session.endTime}
                              </span>
                              <span className={`px-2 py-0.5 rounded text-[8.5px] font-black uppercase tracking-wider ${
                                session.track === 'Live Surgery' ? 'bg-rose-50 text-rose-700' :
                                session.track === 'Hands-on' ? 'bg-indigo-50 text-indigo-700' :
                                session.track === 'Master Class' ? 'bg-amber-50 text-amber-700' : 'bg-teal-50 text-teal-700'
                              }`}>
                                {session.track}
                              </span>
                              {matchingRoom ? (
                                <span className={`px-2 py-0.5 rounded text-[8.5px] font-extrabold uppercase ${matchingRoom.tagBg}`}>
                                  {matchingRoom.vietnameseName}
                                </span>
                              ) : (
                                <span className="px-2 py-0.5 rounded text-[8.5px] font-bold uppercase bg-slate-100 text-slate-500">
                                  {t('generalRoomName')}
                                </span>
                              )}
                            </div>

                            <div>
                              <h4 className="font-extrabold text-slate-900 text-sm leading-snug">
                                {session.title}
                              </h4>
                              <p className="text-xs text-slate-500 mt-1">
                                {session.description}
                              </p>
                            </div>

                            {matchingRoom && (
                              <p className="text-[10px] text-slate-450 italic mt-1 leading-none">
                                {lang === 'en' ? 'Track' : 'Chuyên đề'}: {matchingRoom.subtitle}
                              </p>
                            )}

                            <div className="flex items-center gap-2.5 pt-2.5 border-t border-slate-100">
                              <div className="w-7 h-7 rounded-full bg-teal-100 flex items-center justify-center text-teal-800 font-extrabold text-[10px] shrink-0">
                                {session.speakerName.split(' ').slice(-1)[0].substring(0, 2).toUpperCase()}
                              </div>
                              <div>
                                <p className="text-xs font-bold text-slate-800 leading-tight">
                                  {session.speakerName}
                                </p>
                                <p className="text-[10px] text-slate-450 leading-none mt-0.5 font-medium">
                                  {session.speakerTitle}
                                </p>
                              </div>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })()}
          </div>
        )}

        {activeTab === 'sponsors' && (
          <div className="space-y-8">
            {/* Gói đăng ký */}
            <div>
              <h3 className="text-2xl font-black text-slate-900 text-center mb-2 uppercase tracking-tight">HƯỚNG DẪN ĐĂNG KÝ & BIỂU PHÍ THAM DỰ HỘI NGHỊ</h3>
              <p className="text-sm text-slate-500 text-center mb-8">Lựa chọn các hạng mục đăng ký tối ưu được Ban Chấp Hành hội VSAPS 2026 phê chuẩn chính thức</p>

              {/* Official Pricing Guideline Table */}
              <div className="bg-white rounded-2xl border border-slate-205 shadow-md overflow-hidden p-5 mb-6 max-w-4xl mx-auto space-y-4">
                <div className="flex items-center gap-2 border-b border-slate-100 pb-3">
                  <span className="bg-teal-900 text-amber-400 font-mono font-bold px-2 py-0.5 rounded text-[10px]">INFO</span>
                  <h4 className="font-extrabold text-xs text-slate-900 uppercase tracking-wider">Bảng Biểu Phí Đăng Ký Hệ Thống Năm 2026</h4>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs text-slate-700 border-collapse">
                    <thead>
                      <tr className="bg-slate-50 text-slate-950 font-bold border-b border-slate-200">
                        <th className="p-3 text-left">Hạng Mục Phí Đăng Ký</th>
                        <th className="p-3">Trước 10/11/2026 (Ưu đãi)</th>
                        <th className="p-3">Từ 10/11/2026 đến Hội Nghị</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-150">
                      <tr>
                        <td className="p-3 font-semibold text-slate-900">Thành viên HPASS/HSPAS/VSAPS</td>
                        <td className="p-3 text-teal-700 font-bold font-mono">2,500,000 ₫</td>
                        <td className="p-3 text-slate-600 font-mono">3,000,000 ₫</td>
                      </tr>
                      <tr className="bg-slate-50/20">
                        <td className="p-3 font-semibold text-slate-900">Không phải Hội viên</td>
                        <td className="p-3 text-teal-700 font-bold font-mono">3,000,000 ₫</td>
                        <td className="p-3 text-slate-600 font-mono">3,500,000 ₫</td>
                      </tr>
                      <tr>
                        <td className="p-3 font-semibold text-slate-900">Học viên chuyên ngành PTTM</td>
                        <td className="p-3 text-teal-700 font-bold font-mono">1,000,000 ₫</td>
                        <td className="p-3 text-slate-600 font-mono">1,500,000 ₫</td>
                      </tr>
                      <tr className="bg-slate-50/20">
                        <td className="p-3 font-semibold text-slate-900">BS Nước ngoài (Foreign Doctor)</td>
                        <td className="p-3 text-teal-700 font-bold font-mono">$150 (3,750,000 ₫)</td>
                        <td className="p-3 text-slate-600 font-mono">$200 (5,000,000 ₫)</td>
                      </tr>
                      <tr className="border-t border-slate-300">
                        <td className="p-3 font-semibold text-slate-900">Chương trình CME</td>
                        <td className="p-3 text-teal-700 font-mono font-bold">350,000 ₫</td>
                        <td className="p-3 text-teal-700 font-mono font-bold">350,000 ₫</td>
                      </tr>
                      <tr className="bg-slate-50/20">
                        <td className="p-3 font-semibold text-slate-900">Tiệc tối Gala Dinner</td>
                        <td className="p-3 text-teal-700 font-mono font-bold">700,000 ₫</td>
                        <td className="p-3 text-teal-700 font-mono font-bold">700,000 ₫</td>
                      </tr>
                      <tr>
                        <td className="p-3 font-semibold text-slate-900">Chuyên đề Master class</td>
                        <td className="p-3 text-teal-700 font-mono font-bold">500,000 ₫</td>
                        <td className="p-3 text-teal-700 font-mono font-bold">500,000 ₫</td>
                      </tr>
                      <tr className="bg-slate-50/20">
                        <td className="p-3 font-semibold text-slate-900">Hành trình Tour tham quan</td>
                        <td className="p-3 text-teal-700 font-mono font-bold">4,500,000 ₫</td>
                        <td className="p-3 text-rose-650 font-mono font-bold">5,000,000 ₫</td>
                      </tr>
                    </tbody>
                  </table>
                </div>

                <div className="bg-teal-50/50 p-4 rounded-xl text-teal-900 text-[11px] leading-relaxed space-y-1">
                  <p>• <strong>Miễn phí tham dự</strong> đối với Chủ tọa và Báo cáo viên của phiên hội đồng.</p>
                  <p>• <strong>Miễn trừ hoàn phí:</strong> Toàn bộ đăng ký là chính thức và Ban tổ chức <strong>không hoàn lại phí đăng ký</strong> dưới mọi hình thức tự hủy.</p>
                  <p>• <strong>Thông tin chuyển khoản:</strong> Đại biểu chuyển khoản quét VietQR trên hóa đơn sau khi hoàn thành điền phiếu đăng ký.</p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {packages.map((pkg) => {
                  const today = new Date();
                  const targetDate = new Date('2026-11-10');
                  const isPost = today >= targetDate;
                  
                  let feeDisplay = '';
                  if (pkg.id === 'pkg-free') {
                    feeDisplay = 'Miễn Phí';
                  } else {
                    const PRICING = {
                      'pkg-member': isPost ? 3000000 : 2500000,
                      'pkg-standard': isPost ? 3500000 : 3000000,
                      'pkg-student': isPost ? 1500000 : 1000000,
                      'pkg-foreign': isPost ? 5000000 : 3750000,
                    };
                    const fee = PRICING[pkg.id as keyof typeof PRICING] ?? pkg.fee;
                    if (pkg.id === 'pkg-foreign') {
                      feeDisplay = isPost ? `$200 (${fee.toLocaleString('vi-VN')} VNĐ)` : `$150 (${fee.toLocaleString('vi-VN')} VNĐ)`;
                    } else {
                      feeDisplay = `${fee.toLocaleString('vi-VN')} VNĐ`;
                    }
                  }

                  return (
                    <div key={pkg.id} className={`bg-white rounded-2xl border ${pkg.id === 'pkg-standard' ? 'border-2 border-teal-500 shadow-xl relative' : 'border-slate-100 shadow-md'} overflow-hidden flex flex-col justify-between transition-all hover:shadow-lg`}>
                      {pkg.id === 'pkg-standard' && (
                        <div className="absolute top-0 right-0 bg-teal-500 text-white text-[9px] font-black px-3 py-1 rounded-bl-xl uppercase tracking-widest">
                          Khuyên Dùng
                        </div>
                      )}
                      <div className="p-6 flex-1">
                        <span className="text-[9px] font-bold text-teal-600 tracking-wider uppercase bg-teal-50 px-2 py-0.5 rounded mb-2 inline-block">Category Package</span>
                        <h4 className="font-extrabold text-slate-900 text-md leading-snug mb-2">{pkg.name}</h4>
                        <div className="text-xl font-black text-slate-950 mb-4 border-b border-dashed border-slate-100 pb-3">
                          {feeDisplay}
                        </div>

                      <ul className="space-y-3">
                        {pkg.benefits.map((benefit, i) => (
                          <li key={i} className="text-xs text-slate-600 flex gap-2">
                            <CheckCircle className="w-4 h-4 text-teal-600 shrink-0 mt-0.5" />
                            <span>{benefit}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                    <div className="p-6 bg-slate-50 border-t border-slate-100">
                      <button
                        onClick={() => onNavigate('register-delegate')}
                        className={`w-full py-2.5 rounded-xl text-xs font-bold transition-all ${pkg.id === 'pkg-standard' ? 'bg-teal-500 hover:bg-teal-600 text-white shadow-md' : 'bg-slate-800 hover:bg-slate-900 text-white'}`}
                      >
                        Đăng Ký {pkg.name.replace('Gói ', '')}
                      </button>
                    </div>
                  </div>
                );
              })}
              </div>
            </div>

            {/* Dịch vụ Tự chọn thêm cho Đại biểu */}
            <div className="bg-amber-50/40 rounded-3xl border border-amber-200/50 p-5 flex flex-col md:flex-row items-center gap-6 justify-between shadow-sm">
              <div className="space-y-2">
                <span className="text-[9px] font-bold text-amber-700 uppercase bg-amber-100 px-2 py-0.5 rounded tracking-wider">Học phần dịch vụ bổ sung tự chọn</span>
                <h4 className="text-base font-black text-slate-900 uppercase">Tùy Chọn Đăng Ký Cấp CME, GALA DINNER, MASTERCLASS & TOUR</h4>
                <p className="text-xs text-slate-600 leading-relaxed max-w-2xl">
                  Bảng giá tự chọn linh hoạt cho phép đại biểu đính kèm hoặc bổ sung dịch vụ phù hợp với nhu cầu công việc của từng cá nhân:
                </p>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
                  <div className="p-3.5 bg-white rounded-2xl border border-amber-100/60 shadow-inner">
                    <span className="font-extrabold text-xs text-slate-850 block">✓ Đăng ký Chứng chỉ CME đào tạo:</span>
                    <span className="text-[11px] text-slate-500 font-medium">Phụ thu: <strong className="text-teal-700 font-mono">350.000 VNĐ</strong> / Đại biểu</span>
                  </div>
                  <div className="p-3.5 bg-white rounded-2xl border border-amber-100/60 shadow-inner">
                    <span className="font-extrabold text-xs text-slate-850 block">✓ Tham dự bữa tiệc Gala Dinner:</span>
                    <span className="text-[11px] text-slate-500 font-medium">Phụ thu: <strong className="text-amber-700 font-mono">700.000 VNĐ</strong> / Đại biểu</span>
                  </div>
                </div>
              </div>
              <button
                onClick={() => onNavigate('register-delegate')}
                className="px-5 py-3.5 bg-amber-600 hover:bg-amber-700 text-white font-extrabold text-xs uppercase tracking-widest rounded-xl shadow shrink-0 whitespace-nowrap cursor-pointer transition-all"
              >
                Mở Form Đăng Ký Ngay ⚡
              </button>
            </div>

            {/* CTA Đăng ký tài trợ Doanh Nghiệp */}
            <div className="bg-gradient-to-r from-teal-900 to-indigo-950 p-6 rounded-3xl border border-teal-500/20 text-white shadow-xl flex flex-col md:flex-row items-center justify-between gap-6 relative overflow-hidden">
              <div className="absolute inset-0 bg-[radial-gradient(circle_at_bottom_left,rgba(20,184,166,0.1),transparent)]" />
              <div className="space-y-2 relative z-10 max-w-xl text-center md:text-left">
                <span className="text-[10px] font-bold text-teal-300 uppercase tracking-widest font-mono">VSAPS 2026 PARTNER OPPORTUNITIES</span>
                <h4 className="text-xl font-black uppercase">Đồng Hành Phát Triển Cùng Hội Nghị VSAPS 2026</h4>
                <p className="text-xs text-slate-300 leading-relaxed font-medium">
                  Trở thành đối tác vinh danh chính thức tại sảnh khoa học, khai thác quyền trưng bày quảng nghị và tiếp cận trực tiếp mạng lưới hàng vạn y bác sĩ toàn quốc.
                </p>
              </div>
              <button
                onClick={() => onNavigate('register-sponsor')}
                className="px-6 py-3.5 bg-teal-500 hover:bg-teal-600 rounded-2xl text-xs font-black uppercase text-white shadow-md hover:shadow-teal-500/10 transition-all shrink-0 relative z-10 border-none cursor-pointer flex items-center gap-2"
              >
                <HeartHandshake className="w-4 h-4" />
                Đăng Ký Tài Trợ Ngay
              </button>
            </div>

            {/* Đồng hành của doanh tài trợ */}
            <div className="border-t border-slate-205 pt-8">
              <h3 className="text-xl font-bold text-slate-900 text-center mb-4 uppercase tracking-wider">Doanh nghiệp Đồng Hành Tài Trợ</h3>
              
              <div className="flex flex-wrap justify-center items-center gap-8 md:gap-16">
                {sponsors.map(sponsor => (
                  <div key={sponsor.id} className="text-center group">
                    <div className="px-6 py-4 bg-white rounded-xl shadow-sm border border-slate-100 group-hover:border-teal-300 transition-all flex items-center justify-center min-h-[70px] min-w-[160px] cursor-pointer">
                      <span className="font-black text-slate-700 text-sm tracking-tight capitalize group-hover:text-teal-700 transition-all">
                        {sponsor.name.split(' ').slice(0, 3).join(' ')}
                      </span>
                    </div>
                    <span className={`inline-block mt-2 px-3 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-widest ${
                      sponsor.tier === 'platinum' ? 'bg-indigo-50 text-indigo-700' :
                      sponsor.tier === 'gold' ? 'bg-amber-50 text-amber-700' : 'bg-slate-100 text-slate-700'
                    }`}>
                      {sponsor.tier} Sponsor
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* ACADEMIC ABSTRACT & BIO DETAIL DIALOG POPUP */}
      {selectedSessionDetail && (() => {
        const enrichment = getSessionEnrichment(selectedSessionDetail, lang);
        const isBookmarked = personalAgenda.includes(selectedSessionDetail.id);
        const matchingConf = ROOMS_CONFIG.find(r => selectedSessionDetail.roomName.includes(r.id));
        
        return (
          <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-fade-in" onClick={() => setSelectedSessionDetail(null)}>
            <div 
              className="bg-white rounded-3xl w-full max-w-2xl overflow-hidden shadow-2xl border border-slate-100 flex flex-col max-h-[85vh]"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Header card with color accents */}
              <div className="p-6 bg-slate-900 text-white relative">
                <button 
                  onClick={() => setSelectedSessionDetail(null)}
                  className="absolute right-4 top-4 text-slate-400 hover:text-white transition-all p-1 rounded-full hover:bg-white/10"
                >
                  <X className="w-5 h-5" />
                </button>

                <div className="flex flex-wrap items-center gap-2 mb-3">
                  <span className="bg-teal-500/20 text-teal-300 font-mono text-[10px] font-bold px-2 py-0.5 rounded border border-teal-500/30">
                    {selectedSessionDetail.startTime} - {selectedSessionDetail.endTime} | {selectedSessionDetail.date}
                  </span>
                  <span className="bg-rose-500/20 text-rose-300 font-bold text-[9px] uppercase tracking-wider px-2 py-0.5 rounded border border-rose-500/30">
                    {selectedSessionDetail.track}
                  </span>
                  {matchingConf && (
                    <span className="bg-amber-500/20 text-amber-300 font-bold text-[9px] uppercase tracking-wider px-2 py-0.5 rounded border border-amber-500/30">
                      {matchingConf.vietnameseName}
                    </span>
                  )}
                </div>

                <h3 className="text-lg md:text-xl font-black text-slate-100 leading-snug tracking-tight">
                  {selectedSessionDetail.title}
                </h3>
              </div>

              {/* Speaker card overview strip */}
              <div className="bg-slate-50 p-4 border-b border-slate-150 flex items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-teal-800 text-white font-extrabold flex items-center justify-center text-sm shadow-sm">
                    {selectedSessionDetail.speakerName.split(' ').slice(-1)[0].substring(0, 2).toUpperCase()}
                  </div>
                  <div>
                    <p className="font-extrabold text-sm text-slate-900 leading-tight">
                      {selectedSessionDetail.speakerName}
                    </p>
                    <p className="text-xs text-slate-500 font-medium">
                      {selectedSessionDetail.speakerTitle}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => handleToggleBookmark(selectedSessionDetail.id)}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1 border ${
                      isBookmarked
                        ? 'bg-amber-500 text-white border-amber-500 shadow-sm'
                        : 'bg-white hover:bg-slate-100 text-slate-700 border-slate-200'
                    }`}
                  >
                    <Star className={`w-3.5 h-3.5 ${isBookmarked ? 'fill-white text-amber-500' : 'text-amber-500'}`} />
                    {isBookmarked ? 'Đã lưu' : 'Lưu lịch'}
                  </button>
                </div>
              </div>

              {/* Switching Tabs inside Detail Popup */}
              <div className="flex border-b border-slate-155 text-sm select-none">
                <button
                  onClick={() => setModalTab('abstract')}
                  className={`flex-1 py-3 text-center font-bold tracking-wide transition-all border-b-2 outline-none ${
                    modalTab === 'abstract'
                      ? 'border-teal-600 text-teal-800 bg-teal-500/5'
                      : 'border-transparent text-slate-500 hover:text-slate-800 hover:bg-slate-50/50'
                  }`}
                >
                  Tóm Tắt Đề Tài (Abstract)
                </button>
                <button
                  onClick={() => setModalTab('bio')}
                  className={`flex-1 py-3 text-center font-bold tracking-wide transition-all border-b-2 outline-none ${
                    modalTab === 'bio'
                      ? 'border-teal-600 text-teal-800 bg-teal-500/5'
                      : 'border-transparent text-slate-500 hover:text-slate-800 hover:bg-slate-50/50'
                  }`}
                >
                  Tiểu Sử Báo Cáo Viên (Bio)
                </button>
              </div>

              {/* Dynamic scrollable body content */}
              <div className="p-6 overflow-y-auto text-sm leading-relaxed text-slate-700 flex-1 bg-slate-50/30 animate-fade-in">
                {modalTab === 'abstract' ? (
                  <div className="space-y-4 font-sans">
                    <div className="flex items-center gap-1.5 text-xs text-indigo-700 font-bold uppercase tracking-wider bg-indigo-50 w-fit px-2.5 py-1 rounded">
                      <FileText className="w-3.5 h-3.5" />
                      Công bố học thuật chính thức
                    </div>
                    {/* Render split paragraphs for clean aesthetics */}
                    <div className="whitespace-pre-line text-slate-800 text-justify text-[13px] bg-white p-4 rounded-2xl border border-slate-100 shadow-xs leading-relaxed">
                      {enrichment.abstract}
                    </div>
                    <div className="flex items-start gap-2 bg-slate-100/55 p-3.5 rounded-xl border border-slate-205/50 text-xs text-slate-500">
                      <HelpCircle className="w-4 h-4 text-slate-400 shrink-0 mt-0.5" />
                      <span>Ý kiến phản hồi lâm sàng, phản biện khoa học toàn quốc hoặc hồ sơ câu hỏi tiếp dẫn trực tiếp có thể gửi về email ban tổ chức để chuẩn bị trước tọa đàm.</span>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-4 font-sans">
                    <div className="flex items-center gap-1.5 text-xs text-emerald-800 font-bold uppercase tracking-wider bg-emerald-50 w-fit px-2.5 py-1 rounded">
                      <Users className="w-3.5 h-3.5 text-emerald-600" />
                      Lý lịch khoa học trích ngang
                    </div>
                    
                    <div className="bg-white p-4 rounded-2xl border border-slate-100 shadow-xs space-y-3">
                      <p className="font-extrabold text-slate-900 text-sm">
                        {selectedSessionDetail.speakerName}
                      </p>
                      <p className="text-xs text-teal-700 font-semibold italic bg-teal-50/30 px-2 py-1 rounded border border-teal-100/40">
                        Chức danh: {selectedSessionDetail.speakerTitle}
                      </p>
                      <div className="whitespace-pre-line text-slate-750 text-justify text-[13px] pt-1">
                        {enrichment.bio}
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Bottom close footer area of modal */}
              <div className="p-4 bg-slate-50 border-t border-slate-150 flex justify-end">
                <button
                  onClick={() => setSelectedSessionDetail(null)}
                  className="px-5 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold transition-all cursor-pointer"
                >
                  Đóng cửa sổ
                </button>
              </div>
            </div>
          </div>
        );
      })()}
      
      {/* Footer space */}
      <footer className="bg-slate-900 text-slate-400 py-8 px-4 border-t border-slate-800 text-center text-sm">
        <div className="max-w-6xl mx-auto space-y-4">
          <p className="font-bold text-white tracking-widest text-base">VSAPS 2026 EVENT MANAGEMENT</p>
          <p>Hội nghị Khoa học thường niên Hiệp hội Phẫu thuật Thẩm mỹ Y khoa Việt Nam</p>
          <p className="text-xs text-slate-600">Bản quyền thuộc về VSAPS © 2026. Phục vụ quản trị và hoạt động y học chính xác.</p>
        </div>
      </footer>
    </div>
  );
}
