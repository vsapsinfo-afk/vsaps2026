import type { VercelRequest, VercelResponse } from '@vercel/node';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.VITE_SUPABASE_URL || '';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // CORS & Content-Type
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, Apikey');
  res.setHeader('Content-Type', 'application/json');

  if (req.method === 'OPTIONS') return res.status(204).end();
  if (req.method !== 'POST') return res.status(405).json({ success: false, message: 'Method not allowed' });

  try {
    // SePay gửi webhook với header Apikey (webhook secret)
    const webhookSecret = process.env.SEPAY_WEBHOOK_SECRET || '';
    const incomingKey = (req.headers['apikey'] as string) || (req.headers['authorization'] as string) || '';

    if (webhookSecret && incomingKey && incomingKey !== webhookSecret && incomingKey !== `Apikey ${webhookSecret}`) {
      console.warn('[SePay Webhook] Unauthorized attempt:', incomingKey);
      return res.status(401).json({ success: false, message: 'Unauthorized' });
    }

    const payload = req.body;
    console.log('[SePay Webhook] Received payload:', JSON.stringify(payload));

    /*
     * SePay Webhook payload format:
     * {
     *   id: number,                    // ID giao dịch SePay
     *   gateway: string,               // Ngân hàng
     *   transactionDate: string,       // Thời gian GD (YYYY-MM-DD HH:mm:ss)
     *   accountNumber: string,         // Số TK thụ hưởng
     *   code: string | null,           // Mã thanh toán tự động SePay
     *   content: string,               // Nội dung chuyển khoản
     *   transferType: 'in' | 'out',    // Loại GD
     *   transferAmount: number,        // Số tiền
     *   accumulated: number,           // Số dư sau GD
     *   subAccount: string | null,     // Tài khoản phụ
     *   referenceCode: string,         // Mã tham chiếu ngân hàng
     *   description: string,           // Mô tả giao dịch
     * }
     */

    const {
      id: sepayId,
      transferAmount,
      transferType,
      content,
      transactionDate,
      gateway,
      referenceCode,
    } = payload;

    // Chỉ xử lý giao dịch tiền vào (in)
    if (transferType !== 'in') {
      return res.status(200).json({ success: true, message: 'Skipped outgoing transaction' });
    }

    if (!content || !transferAmount) {
      return res.status(200).json({ success: true, message: 'Missing content or amount' });
    }

    // Tìm attendee khớp nội dung chuyển khoản
    // Nội dung CK format: "NGUYEN VAN A 0901234567 DONG PHI THAM DU VSAPS 2026"
    // hoặc chứa attendee ID: "VSAPS2026-123456"
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const contentUpper = (content as string).toUpperCase().trim();

    // Tìm theo ID đại biểu trong nội dung (nếu có)
    const idMatch = contentUpper.match(/VSAPS2026-(\d+)/);

    let attendeeQuery = supabase.from('attendees').select('id, full_name, phone, package_fee, payment_status');

    if (idMatch) {
      attendeeQuery = attendeeQuery.eq('id', `VSAPS2026-${idMatch[1]}`);
    } else {
      // Tìm gần đúng theo số điện thoại trong nội dung
      const phoneMatch = contentUpper.match(/0[0-9]{9,10}/);
      if (phoneMatch) {
        attendeeQuery = attendeeQuery.ilike('phone', `%${phoneMatch[0]}%`);
      } else {
        return res.status(200).json({ success: true, message: 'Cannot match attendee from content' });
      }
    }

    const { data: attendees, error: queryErr } = await attendeeQuery.limit(5);

    if (queryErr || !attendees || attendees.length === 0) {
      console.warn('[SePay Webhook] No matching attendee found for content:', content);
      return res.status(200).json({ success: true, message: 'No matching attendee' });
    }

    // Chọn attendee có package_fee khớp nhất (chênh lệch ≤ 5000đ)
    const matched = attendees.find((a: any) => {
      const fee = Number(a.package_fee || 0);
      return Math.abs(fee - Number(transferAmount)) <= 5000;
    }) || attendees[0];

    if (matched.payment_status === 'paid') {
      return res.status(200).json({ success: true, message: 'Already marked as paid' });
    }

    // Cập nhật payment_status → paid
    const { error: updateErr } = await supabase
      .from('attendees')
      .update({
        payment_status: 'paid',
        payment_method: 'bank_transfer',
        notes: `SePay xác nhận tự động | GD #${sepayId} | ${gateway} | ${transactionDate} | Ref: ${referenceCode} | Số tiền: ${transferAmount.toLocaleString('vi-VN')}đ`,
      })
      .eq('id', matched.id);

    if (updateErr) {
      console.error('[SePay Webhook] Update failed:', updateErr);
      return res.status(500).json({ success: false, message: 'Database update failed' });
    }

    console.log(`[SePay Webhook] ✅ Marked attendee ${matched.id} (${matched.full_name}) as PAID. Amount: ${transferAmount}`);
    return res.status(200).json({ success: true, message: `Attendee ${matched.id} marked as paid` });

  } catch (err: any) {
    console.error('[SePay Webhook] Unhandled error:', err);
    return res.status(500).json({ success: false, message: err.message || 'Internal error' });
  }
}
