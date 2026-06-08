import React, { createContext, useContext, useState, useEffect } from 'react';
import { AuthUser, getCurrentUser, signIn, signOut, onAuthStateChange } from '../lib/auth';
import { isSupabaseConfigured } from '../lib/supabase';

interface AuthContextType {
  user: AuthUser | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<{ success: boolean; error: string | null }>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!isSupabaseConfigured()) {
      try {
        const storedUser = localStorage.getItem('vsaps_mock_user');
        if (storedUser) {
          setUser(JSON.parse(storedUser));
        }
      } catch (e) {
        console.error('Error reading mock user cache:', e);
      }
      setLoading(false);
      return;
    }

    getCurrentUser().then(currUser => {
      setUser(currUser);
      setLoading(false);
    });

    const { data: { subscription } } = onAuthStateChange(async (event, session) => {
      if (session?.user) {
        const currUser = await getCurrentUser();
        setUser(currUser);
      } else {
        setUser(null);
      }
      setLoading(false);
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  const handleSignIn = async (email: string, password: string) => {
    if (!isSupabaseConfigured()) {
      // Mock login check for testing offline app
      const cleanEmail = email.trim().toLowerCase();
      if (cleanEmail === 'admin@admin.com' && password === '12345678') {
        const mockUser: AuthUser = {
          id: 'mock-admin',
          email: cleanEmail,
          name: 'ADMIN SYSTEM',
          role: 'admin',
          status: 'active'
        };
        setUser(mockUser);
        localStorage.setItem('vsaps_mock_user', JSON.stringify(mockUser));
        return { success: true, error: null };
      }

      if (
        (cleanEmail === 'chi.pham@vsaps.org' || 
         cleanEmail === 'duong.dt@vsaps.org' || 
         cleanEmail === 'minh.tt@vsaps.org') && 
        password === 'admin123'
      ) {
        const role = cleanEmail.includes('chi.pham') ? 'admin' : cleanEmail.includes('duong') ? 'btc' : 'ctv';
        const mockUser: AuthUser = {
          id: `mock-${cleanEmail.split('@')[0]}`,
          email: cleanEmail,
          name: cleanEmail.split('@')[0].replace('.', ' ').toUpperCase(),
          role: role as any,
          status: 'active'
        };
        setUser(mockUser);
        localStorage.setItem('vsaps_mock_user', JSON.stringify(mockUser));
        return { success: true, error: null };
      }
      return { success: false, error: 'Đăng nhập thất bại. Tài khoản test: admin@admin.com / mật khẩu: 12345678' };
    }

    const { user: signedUser, error } = await signIn(email, password);
    if (error) {
      return { success: false, error };
    }
    setUser(signedUser);
    return { success: true, error: null };
  };

  const handleSignOut = async () => {
    if (isSupabaseConfigured()) {
      await signOut();
    } else {
      localStorage.removeItem('vsaps_mock_user');
    }
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, loading, signIn: handleSignIn, signOut: handleSignOut }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
