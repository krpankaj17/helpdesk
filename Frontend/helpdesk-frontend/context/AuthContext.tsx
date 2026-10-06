'use client';

import React, { createContext, useContext, useState, useEffect } from 'react';
import { User, UserRole } from '@/types';
import { api, tokenStorage, ApiError, refreshAccessToken, isTokenExpiring } from '@/lib/api';

interface AuthContextType {
  user: User | null;
  role: UserRole | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (email: string, pass: string) => Promise<void>;
  logout: () => void;
  refreshUser: () => Promise<void>;
  hasPermission: (permission: string) => boolean;
  canManageUsers: boolean;
  canManageTickets: boolean;
  canAssignTickets: boolean;
  canViewReports: boolean;
  canManageCategories: boolean;
  canManagePriorities: boolean;
}

const ROLE_PERMISSIONS: Record<UserRole, string[]> = {
  ADMIN: [
    'TICKET_READ',
    'TICKET_CREATE',
    'TICKET_UPDATE',
    'TICKET_ASSIGN',
    'USER_MANAGE',
    'CATEGORY_MANAGE',
    'PRIORITY_MANAGE',
    'COMMENT_CREATE',
    'INTERNAL_NOTE_READ',
    'SLA_MONITOR',
    'REPORT_READ',
    'NOTIFICATION_READ',
    'WORKLOAD_READ',
  ],
  SUPPORT_MANAGER: [
    'TICKET_READ',
    'TICKET_UPDATE',
    'TICKET_ASSIGN',
    'COMMENT_CREATE',
    'INTERNAL_NOTE_READ',
    'SLA_MONITOR',
    'REPORT_READ',
    'NOTIFICATION_READ',
    'WORKLOAD_READ',
  ],
  SUPPORT_AGENT: [
    'TICKET_READ',
    'TICKET_UPDATE',
    'COMMENT_CREATE',
    'INTERNAL_NOTE_READ',
    'NOTIFICATION_READ',
    'WORKLOAD_READ',
  ],
  AGENT: [
    'TICKET_READ',
    'TICKET_CREATE',
    'TICKET_UPDATE',
    'COMMENT_CREATE',
    'INTERNAL_NOTE_READ',
    'NOTIFICATION_READ',
  ],
  REQUESTER: [
    'TICKET_READ',
    'TICKET_CREATE',
    'COMMENT_CREATE',
    'NOTIFICATION_READ',
  ],
};

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [role, setRole] = useState<UserRole | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const refreshUser = async () => {
    const token = tokenStorage.getToken();
    if (!token) {
      setUser(null);
      setRole(null);
      setIsLoading(false);
      return;
    }

    try {
      const me = await api.users.getMe();
      const rawRole = (me.roleName as string);
      const normalizedRole = (rawRole === 'AGENT' ? 'SUPPORT_AGENT' : rawRole) as UserRole;
      const normalizedUser = { ...me, roleName: normalizedRole };
      setUser(normalizedUser);
      setRole(normalizedRole);
      if (typeof window !== 'undefined') {
        localStorage.setItem('helpdesk_current_user', JSON.stringify(normalizedUser));
      }
    } catch (err: any) {
      // If unauthorized, clear token
      if (err instanceof ApiError && err.status === 401) {
        tokenStorage.clear();
        setUser(null);
        setRole(null);
      } else {
        // If connection refused, check cached user
        const cached = localStorage.getItem('helpdesk_current_user');
        if (cached) {
          try {
            const parsed = JSON.parse(cached);
            const rawCached = (parsed.roleName as string);
            const normalizedRole = (rawCached === 'AGENT' ? 'SUPPORT_AGENT' : rawCached) as UserRole;
            setUser({ ...parsed, roleName: normalizedRole });
            setRole(normalizedRole);
          } catch {}
        }
      }
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    refreshUser();

    // Listen for tab focus and visibilitychange so when the tab becomes active after being idle,
    // tokens are verified and refreshed proactively before any UI fetch
    const handleActive = async () => {
      if (typeof document !== 'undefined' && document.visibilityState === 'visible') {
        const token = tokenStorage.getToken();
        const refresh = tokenStorage.getRefreshToken();
        if (token && refresh && isTokenExpiring(token, 120)) {
          await refreshAccessToken();
        }
      }
    };

    window.addEventListener('focus', handleActive);
    document.addEventListener('visibilitychange', handleActive);

    // Periodic heartbeat to keep tokens fresh if tab stays open (every 2 minutes)
    const interval = setInterval(async () => {
      const token = tokenStorage.getToken();
      const refresh = tokenStorage.getRefreshToken();
      if (token && refresh && isTokenExpiring(token, 180)) {
        await refreshAccessToken();
      }
    }, 120000);

    return () => {
      window.removeEventListener('focus', handleActive);
      document.removeEventListener('visibilitychange', handleActive);
      clearInterval(interval);
    };
  }, []);

  const login = async (email: string, pass: string) => {
    setIsLoading(true);
    try {
      const res = await api.auth.login(email.trim().toLowerCase(), pass);
      const rawRole = (res.user.roleName as string);
      const normalizedRole = (rawRole === 'AGENT' ? 'SUPPORT_AGENT' : rawRole) as UserRole;
      const normalizedUser = { ...res.user, roleName: normalizedRole };
      setUser(normalizedUser);
      setRole(normalizedRole);
      if (typeof window !== 'undefined') {
        localStorage.setItem('helpdesk_current_user', JSON.stringify(normalizedUser));
      }
    } finally {
      setIsLoading(false);
    }
  };

  const logout = () => {
    api.auth.logout();
    setUser(null);
    setRole(null);
    if (typeof window !== 'undefined') {
      window.location.href = '/login';
    }
  };

  const hasPermission = (permission: string) => {
    if (!role) return false;
    const permissions = ROLE_PERMISSIONS[role] || [];
    return permissions.includes(permission);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        role,
        isAuthenticated: !!user,
        isLoading,
        login,
        logout,
        refreshUser,
        hasPermission,
        canManageUsers: hasPermission('USER_MANAGE'),
        canManageTickets: hasPermission('TICKET_UPDATE'),
        canAssignTickets: hasPermission('TICKET_ASSIGN'),
        canViewReports: hasPermission('REPORT_READ'),
        canManageCategories: hasPermission('CATEGORY_MANAGE'),
        canManagePriorities: hasPermission('PRIORITY_MANAGE'),
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
