'use client';

import React, { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { UserRole } from '@/types';
import { ShieldAlert, ArrowLeft } from 'lucide-react';

interface AuthGuardProps {
  children: React.ReactNode;
  allowedRoles?: UserRole[];
}

export default function AuthGuard({ children, allowedRoles }: AuthGuardProps) {
  const router = useRouter();
  const { isAuthenticated, isLoading, role } = useAuth();

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.replace('/login');
    }
  }, [isLoading, isAuthenticated, router]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#F4F6FB] flex flex-col items-center justify-center gap-3">
        <div className="w-9 h-9 border-3 border-slate-200 border-t-[#0B132B] rounded-full animate-spin" />
        <p className="text-xs font-semibold text-slate-500">Checking credentials & role permissions...</p>
      </div>
    );
  }

  if (!isAuthenticated) {
    return null;
  }

  if (allowedRoles && role && !allowedRoles.includes(role)) {
    return (
      <div className="min-h-screen bg-[#F4F6FB] flex flex-col items-center justify-center p-6 text-center">
        <div className="max-w-md w-full pill-card p-8 bg-white text-center shadow-xl">
          <div className="w-14 h-14 rounded-full bg-rose-50 text-rose-600 flex items-center justify-center mx-auto mb-4 border border-rose-100">
            <ShieldAlert className="w-7 h-7" />
          </div>
          <h2 className="text-lg font-bold text-[#0B132B] mb-2">Access Restricted</h2>
          <p className="text-xs text-slate-500 mb-6 leading-relaxed">
            Your current role (<span className="font-bold text-slate-700">{role}</span>) does not have authorization to view this section of the HelpDesk.
          </p>
          <button
            onClick={() => router.push('/')}
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full text-xs font-bold bg-[#0B132B] hover:bg-slate-800 text-white transition-all cursor-pointer shadow-sm"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Return to My Dashboard</span>
          </button>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
