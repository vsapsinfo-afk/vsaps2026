/**
 * Authentication module using Supabase Auth
 * Quản lý đăng nhập, đăng xuất, phiên làm việc và phân quyền
 */
import { supabase, isSupabaseConfigured } from './supabase';
import type { Session, User, AuthChangeEvent } from '@supabase/supabase-js';
import type { Role } from '../types';

export interface AuthUser {
  id: string;
  email: string;
  name: string;
  role: Role;
  status: 'active' | 'inactive';
}

/**
 * Đăng nhập bằng email + password (Supabase Auth)
 */
export async function signIn(email: string, password: string): Promise<{ user: AuthUser | null; error: string | null }> {
  if (!isSupabaseConfigured()) {
    return { user: null, error: 'Supabase chưa được cấu hình. Vui lòng kiểm tra .env.local' };
  }

  const { data, error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) {
    return { user: null, error: error.message };
  }

  if (!data.user) {
    return { user: null, error: 'Không tìm thấy thông tin người dùng' };
  }

  // Fetch role from user_accounts table
  const authUser = await fetchUserProfile(data.user.id, data.user.email || '');
  return { user: authUser, error: null };
}

/**
 * Đăng xuất
 */
export async function signOut(): Promise<void> {
  await supabase.auth.signOut();
}

/**
 * Lấy phiên hiện tại
 */
export async function getSession(): Promise<Session | null> {
  const { data } = await supabase.auth.getSession();
  return data.session;
}

/**
 * Lấy user hiện tại
 */
export async function getCurrentUser(): Promise<AuthUser | null> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;
  return fetchUserProfile(user.id, user.email || '');
}

/**
 * Lắng nghe thay đổi auth state
 */
export function onAuthStateChange(callback: (event: AuthChangeEvent, session: Session | null) => void) {
  return supabase.auth.onAuthStateChange(callback);
}

/**
 * Gửi email reset mật khẩu
 */
export async function resetPassword(email: string): Promise<{ error: string | null }> {
  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${window.location.origin}/?view=overview`,
  });
  return { error: error?.message || null };
}

/**
 * Lấy thông tin profile + role từ bảng user_accounts
 */
async function fetchUserProfile(authId: string, email: string): Promise<AuthUser | null> {
  try {
    const { data, error } = await supabase
      .from('user_accounts')
      .select('*')
      .eq('email', email)
      .single();

    if (error || !data) {
      // Fallback: tạo user profile mặc định với role 'ctv' nếu chưa có
      return {
        id: authId,
        email,
        name: email.split('@')[0],
        role: 'ctv',
        status: 'active',
      };
    }

    return {
      id: data.id,
      email: data.email,
      name: data.name,
      role: data.role as Role,
      status: data.status || 'active',
    };
  } catch {
    return {
      id: authId,
      email,
      name: email.split('@')[0],
      role: 'ctv',
      status: 'active',
    };
  }
}
