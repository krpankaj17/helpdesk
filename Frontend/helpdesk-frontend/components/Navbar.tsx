'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { UserRole } from '@/types';
import { 
  LogOut, 
  LogIn,
  ChevronDown, 
  ShieldCheck, 
  Users, 
  Headphones, 
  User as UserIcon,
  Sparkles
} from 'lucide-react';

import NotificationCenter from '@/components/NotificationCenter';
import UserProfileModal from '@/components/UserProfileModal';

export default function Navbar() {
  const pathname = usePathname();
  const router = useRouter();
  const { user, role, isAuthenticated, logout } = useAuth();
  const [isProfileOpen, setIsProfileOpen] = useState(false);

  const currentRole: UserRole = role || user?.roleName || 'REQUESTER';

  const handleLogout = (e?: React.MouseEvent) => {
    e?.preventDefault();
    logout();
    if (typeof window !== 'undefined') {
      window.location.href = '/login';
    }
  };

  // Pure HelpDesk navigation routes mapped to backend controllers & roles
  const navItems = [
    { name: 'Dashboard', href: '/', roles: ['ADMIN', 'SUPPORT_MANAGER', 'SUPPORT_AGENT', 'REQUESTER'] },
    { name: 'Tickets', href: '/tickets', roles: ['ADMIN', 'SUPPORT_MANAGER', 'SUPPORT_AGENT', 'REQUESTER'] },
    { name: 'Users & Staff', href: '/users', roles: ['ADMIN', 'SUPPORT_MANAGER'] },
    { name: 'Categories', href: '/categories', roles: ['ADMIN', 'SUPPORT_MANAGER'] },
    { name: 'SLA & Policies', href: '/sla', roles: ['ADMIN', 'SUPPORT_MANAGER'] },
    { name: 'Settings', href: '/settings', roles: ['ADMIN'] },
  ];

  return (
    <>
      <header className="sticky top-4 z-50 flex justify-center px-4 mb-6">
        <div className="pill-nav px-3 py-2 flex items-center gap-1 sm:gap-2 max-w-full overflow-visible relative shadow-[0_10px_35px_-5px_rgba(15,23,42,0.08)]">
          {/* HelpDesk Navigation Tabs */}
          <nav className="flex items-center gap-1 overflow-x-auto max-w-full">
            {navItems
              .filter(item => item.roles.includes(currentRole))
              .map((item) => {
                const isActive = pathname === item.href || (item.href !== '/' && pathname.startsWith(item.href));
                return (
                  <Link
                    key={item.name}
                    href={item.href}
                    className={`px-4 sm:px-5 py-2 rounded-full text-xs sm:text-sm font-semibold transition-all whitespace-nowrap ${
                      isActive
                        ? 'bg-[#0B132B] text-white shadow-sm'
                        : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100/70'
                    }`}
                  >
                    {item.name}
                  </Link>
                );
              })}
          </nav>

          <div className="h-5 w-px bg-slate-200 mx-1 hidden md:block" />

          {/* User Persona & Notification Center */}
          {isAuthenticated && user ? (
            <div className="flex items-center gap-1.5 sm:gap-2">
              {/* Notification Center Popover */}
              <NotificationCenter />

              {/* Sign Out Button (Rose pill matching screenshot theme) */}
              <button
                onClick={handleLogout}
                className="flex items-center gap-1.5 px-3 sm:px-4 py-1.5 rounded-full text-xs font-semibold text-rose-500 hover:bg-rose-50 border border-rose-200/80 transition-all ml-1 whitespace-nowrap cursor-pointer"
              >
                <LogOut className="w-3.5 h-3.5 text-rose-500" />
                <span>Sign Out</span>
              </button>
            </div>
          ) : null}
        </div>
      </header>

      {/* User Profile Modal */}
      <UserProfileModal 
        isOpen={isProfileOpen} 
        onClose={() => setIsProfileOpen(false)} 
      />
    </>
  );
}
