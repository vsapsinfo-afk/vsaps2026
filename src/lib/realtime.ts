/**
 * Real-time Notifications module using Supabase Realtime (WebSockets)
 * Hỗ trợ push notification thời gian thực giữa các máy trạm quản trị và đăng ký
 */
import { supabase, isSupabaseConfigured } from './supabase';

export interface RealtimeNotification {
  id: string;
  title: string;
  message: string;
  category: 'info' | 'success' | 'warning' | 'system' | 'badge';
  timestamp: string;
  read: boolean;
}

let localNotifications: RealtimeNotification[] = [];

/**
 * Đăng ký lắng nghe thông báo đẩy thời gian thực
 */
export function subscribeToNotifications(
  onNotification: (notif: RealtimeNotification) => void,
  onHistory?: (history: RealtimeNotification[]) => void
) {
  // Load local history from localStorage
  try {
    const stored = localStorage.getItem('vsaps_push_notifications');
    if (stored) {
      localNotifications = JSON.parse(stored);
      if (onHistory) onHistory(localNotifications);
    }
  } catch (e) {
    console.error('Error loading notification history:', e);
  }

  // Handle local fallback events
  const handleLocalNotif = (e: Event) => {
    const notif = (e as CustomEvent).detail as RealtimeNotification;
    onNotification(notif);
  };

  const handleLocalClear = () => {
    if (onHistory) onHistory([]);
  };

  window.addEventListener('local-notification', handleLocalNotif);
  window.addEventListener('local-clear-notifications', handleLocalClear);

  if (!isSupabaseConfigured()) {
    return () => {
      window.removeEventListener('local-notification', handleLocalNotif);
      window.removeEventListener('local-clear-notifications', handleLocalClear);
    };
  }

  // Connect to Supabase Realtime channel
  const channel = supabase.channel('vsaps-notifications');

  channel
    .on('broadcast', { event: 'new-notification' }, (payload) => {
      const notif = payload.payload as RealtimeNotification;
      // Append to history
      localNotifications = [notif, ...localNotifications].slice(0, 50);
      localStorage.setItem('vsaps_push_notifications', JSON.stringify(localNotifications));
      onNotification(notif);
    })
    .on('broadcast', { event: 'clear-notifications' }, () => {
      localNotifications = [];
      localStorage.setItem('vsaps_push_notifications', JSON.stringify([]));
      if (onHistory) onHistory([]);
    })
    .subscribe((status) => {
      console.log('Supabase Realtime subscription status:', status);
    });

  return () => {
    window.removeEventListener('local-notification', handleLocalNotif);
    window.removeEventListener('local-clear-notifications', handleLocalClear);
    supabase.removeChannel(channel);
  };
}

/**
 * Gửi thông báo đẩy thời gian thực tới tất cả các máy trạm đang mở
 */
export async function sendRealtimeNotification(
  title: string,
  message: string,
  category: 'info' | 'success' | 'warning' | 'system' | 'badge' = 'info'
): Promise<boolean> {
  const notif: RealtimeNotification = {
    id: `notif-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    title,
    message,
    category,
    timestamp: new Date().toISOString(),
    read: false,
  };

  // Add to local history
  localNotifications = [notif, ...localNotifications].slice(0, 50);
  localStorage.setItem('vsaps_push_notifications', JSON.stringify(localNotifications));

  if (!isSupabaseConfigured()) {
    // Local event dispatch
    const event = new CustomEvent('local-notification', { detail: notif });
    window.dispatchEvent(event);
    return true;
  }

  try {
    const channel = supabase.channel('vsaps-notifications');
    await channel.subscribe(async (status) => {
      if (status === 'SUBSCRIBED') {
        await channel.send({
          type: 'broadcast',
          event: 'new-notification',
          payload: notif,
        });
      }
    });
    return true;
  } catch (error) {
    console.error('Error broadcasting notification via Supabase:', error);
    return false;
  }
}

/**
 * Xóa lịch sử thông báo đẩy
 */
export async function clearServerNotifications(): Promise<boolean> {
  localNotifications = [];
  localStorage.setItem('vsaps_push_notifications', JSON.stringify([]));
  
  if (!isSupabaseConfigured()) {
    window.dispatchEvent(new CustomEvent('local-clear-notifications'));
    return true;
  }

  try {
    const channel = supabase.channel('vsaps-notifications');
    await channel.subscribe(async (status) => {
      if (status === 'SUBSCRIBED') {
        await channel.send({
          type: 'broadcast',
          event: 'clear-notifications',
          payload: {},
        });
      }
    });
    return true;
  } catch (e) {
    console.error('Error clearing notifications via Supabase:', e);
    return false;
  }
}
