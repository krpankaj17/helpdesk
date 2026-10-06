'use client';

import React, { useState, useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';
import { api } from '@/lib/api';
import { User, UserRole } from '@/types';
import { 
  X, 
  User as UserIcon, 
  Mail, 
  Key, 
  ShieldCheck, 
  Shield, 
  CheckCircle2, 
  Copy, 
  Check, 
  LogOut,
  RefreshCw,
  Edit3
} from 'lucide-react';
import EditUserModal from '@/components/EditUserModal';

interface UserProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function UserProfileModal({ isOpen, onClose }: UserProfileModalProps) {
  const { user, role, logout } = useAuth();
  const [profile, setProfile] = useState<User | null>(user);
  const [isLoading, setIsLoading] = useState(false);
  const [copied, setCopied] = useState(false);
  const [isEditing, setIsEditing] = useState(false);

  useEffect(() => {
    if (isOpen) {
      loadProfile();
    }
  }, [isOpen]);

  const loadProfile = async () => {
    setIsLoading(true);
    try {
      const fresh = await api.users.getMe();
      setProfile(fresh);
    } catch {
      // Fallback to auth context
      setProfile(user);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCopyId = () => {
    if (profile?.userPublicId) {
      navigator.clipboard.writeText(profile.userPublicId);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  if (!isOpen) return null;

  const currentRole = role || profile?.roleName || 'REQUESTER';

  const roleAuthorities: Record<UserRole, string[]> = {
    ADMIN: [
      'TICKET_READ - View all enterprise tickets',
      'TICKET_CREATE - Create operational incidents',
      'TICKET_UPDATE - Transition ticket states',
      'TICKET_ASSIGN - Assign tickets to agents',
      'USER_MANAGE - Onboard & activate staff accounts',
      'CATEGORY_MANAGE - Maintain category taxonomy',
      'PRIORITY_MANAGE - Configure priority thresholds',
      'INTERNAL_NOTE_READ - Full internal staff note access',
      'COMMENT_CREATE - Post public ticket replies',
      'SLA_MONITOR - Supervise SLA compliance',
      'REPORT_READ - Executive report auditing',
      'NOTIFICATION_READ - System in-app notifications',
    ],
    SUPPORT_MANAGER: [
      'TICKET_READ - Supervise team incident queue',
      'TICKET_UPDATE - Update incident lifecycle',
      'TICKET_ASSIGN - Triage and assign tickets to staff',
      'INTERNAL_NOTE_READ - Staff handover & notes access',
      'COMMENT_CREATE - Customer communication',
      'SLA_MONITOR - Monitor SLA breaches & risks',
      'REPORT_READ - Operational queue analytics',
      'NOTIFICATION_READ - In-app notification alerts',
    ],
    SUPPORT_AGENT: [
      'TICKET_READ - View active work queue',
      'TICKET_UPDATE - Resolve incidents with notes',
      'INTERNAL_NOTE_READ - Read/post internal notes',
      'COMMENT_CREATE - Public customer responses',
      'NOTIFICATION_READ - Assignment & mention alerts',
    ],
    AGENT: [
      'TICKET_READ - View active work queue',
      'TICKET_CREATE - Create operational incidents',
      'TICKET_UPDATE - Resolve incidents with notes',
      'INTERNAL_NOTE_READ - Read/post internal notes',
      'COMMENT_CREATE - Public customer responses',
      'NOTIFICATION_READ - Assignment & mention alerts',
    ],
    REQUESTER: [
      'TICKET_READ - View own submitted tickets',
      'TICKET_CREATE - Submit support requests',
      'COMMENT_CREATE - Respond to technician questions',
      'NOTIFICATION_READ - Status update notifications',
    ],
  };

  return (
    <>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs animate-in fade-in">
        <div 
          className="fixed inset-0"
          onClick={onClose}
        />
        <div className="relative bg-white w-full max-w-lg rounded-3xl shadow-2xl border border-slate-100 p-6 sm:p-7 z-10 max-h-[90vh] overflow-y-auto space-y-6">
          {/* Header */}
          <div className="flex items-start justify-between pb-4 border-b border-slate-100">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-2xl bg-[#0B132B] text-white flex items-center justify-center font-bold text-lg shadow-sm">
                {profile?.name ? profile.name.charAt(0).toUpperCase() : 'U'}
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="text-lg font-bold text-[#0B132B]">
                    {profile?.name || 'HelpDesk User'}
                  </h2>
                  <span className="w-2 h-2 rounded-full bg-emerald-500" title="Active" />
                </div>
                <p className="text-xs text-slate-400">Authenticated Spring Boot Session (/users/me)</p>
              </div>
            </div>

            <div className="flex items-center gap-1">
              <button
                onClick={loadProfile}
                className="p-1.5 rounded-full hover:bg-slate-100 text-slate-400 hover:text-slate-700 transition-colors"
                title="Refresh profile"
              >
                <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
              </button>
              <button
                onClick={onClose}
                className="p-1.5 rounded-full text-slate-400 hover:text-slate-800 hover:bg-slate-100 transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* Profile Details Grid */}
          <div className="space-y-3 text-xs">
            <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-100 space-y-2.5">
              <div className="flex items-center justify-between">
                <span className="text-slate-400 font-medium">Email Address</span>
                <span className="font-bold text-slate-800">{profile?.email}</span>
              </div>

              <div className="flex items-center justify-between">
                <span className="text-slate-400 font-medium">System Role</span>
                <span className={`px-2.5 py-0.5 rounded-full font-bold text-[11px] ${
                  currentRole === 'ADMIN' ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' :
                  currentRole === 'SUPPORT_MANAGER' ? 'bg-blue-50 text-blue-700 border border-blue-200' :
                  currentRole === 'SUPPORT_AGENT' ? 'bg-purple-50 text-purple-700 border border-purple-200' :
                  'bg-amber-50 text-amber-700 border border-amber-200'
                }`}>
                  {currentRole}
                </span>
              </div>

              <div className="flex items-center justify-between">
                <span className="text-slate-400 font-medium">Account Status</span>
                <span className="font-bold text-emerald-600 flex items-center gap-1">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  Active Account
                </span>
              </div>

              {profile?.userPublicId && (
                <div className="flex items-center justify-between pt-1 border-t border-slate-200/60">
                  <span className="text-slate-400 font-medium">User Public ID</span>
                  <div className="flex items-center gap-1.5 font-mono text-[11px] text-slate-600">
                    <span>{profile.userPublicId.substring(0, 18)}...</span>
                    <button
                      onClick={handleCopyId}
                      className="p-1 hover:bg-slate-200 rounded text-slate-500 transition-colors cursor-pointer"
                      title="Copy full UUID"
                    >
                      {copied ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Granted Authorities Section */}
          <div className="space-y-2">
            <div className="flex items-center gap-1.5 text-xs font-bold text-[#0B132B]">
              <ShieldCheck className="w-4 h-4 text-emerald-600" />
              <span>Active RBAC Authorities</span>
            </div>
            <p className="text-[11px] text-slate-400">
              Permissions enforced by Spring Boot Security for the <strong className="text-slate-700">{currentRole}</strong> role
            </p>

            <div className="max-h-48 overflow-y-auto space-y-1.5 p-3 rounded-2xl bg-slate-50 border border-slate-100 text-[11px]">
              {(roleAuthorities[currentRole] || []).map((auth, idx) => (
                <div key={idx} className="flex items-center gap-2 text-slate-700 font-medium">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 shrink-0" />
                  <span>{auth}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Actions Footer */}
          <div className="flex items-center justify-between pt-4 border-t border-slate-100">
            <button
              onClick={() => {
                logout();
                onClose();
              }}
              className="flex items-center gap-1.5 px-4 py-2 rounded-full text-xs font-bold text-rose-600 hover:bg-rose-50 border border-rose-200 transition-colors cursor-pointer"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span>Sign Out</span>
            </button>

            <div className="flex items-center gap-2">
              <button
                onClick={() => setIsEditing(true)}
                className="flex items-center gap-1.5 px-4 py-2 rounded-full text-xs font-bold bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 transition-colors cursor-pointer shadow-2xs"
              >
                <Edit3 className="w-3.5 h-3.5 text-slate-500" />
                <span>Edit Details</span>
              </button>

              <button
                onClick={onClose}
                className="px-5 py-2 rounded-full text-xs font-bold bg-[#0B132B] hover:bg-slate-800 text-white shadow-xs transition-colors cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Edit Profile Modal */}
      <EditUserModal
        isOpen={isEditing}
        user={profile}
        onClose={() => setIsEditing(false)}
        onSuccess={loadProfile}
        isCurrentUser={true}
      />
    </>
  );
}
