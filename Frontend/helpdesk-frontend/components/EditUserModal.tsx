'use client';

import React, { useState, useEffect } from 'react';
import { User, Role } from '@/types';
import { api } from '@/lib/api';
import { useAuth } from '@/context/AuthContext';
import { X, UserCheck, KeyRound, AlertCircle, CheckCircle2, Eye, EyeOff } from 'lucide-react';

interface EditUserModalProps {
  isOpen: boolean;
  user: User | null;
  onClose: () => void;
  onSuccess: () => void;
  isCurrentUser?: boolean;
}

export default function EditUserModal({
  isOpen,
  user,
  onClose,
  onSuccess,
  isCurrentUser = false,
}: EditUserModalProps) {
  const { refreshUser } = useAuth();

  // --- Profile fields ---
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [roles, setRoles] = useState<Role[]>([]);
  const [roleId, setRoleId] = useState<number>(3);

  // --- Profile form state ---
  const [isLoadingProfile, setIsLoadingProfile] = useState(false);
  const [profileError, setProfileError] = useState<string | null>(null);
  const [profileSuccess, setProfileSuccess] = useState<string | null>(null);

  // --- Change Password section ---
  const [showPasswordSection, setShowPasswordSection] = useState(false);
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showNewPw, setShowNewPw] = useState(false);
  const [showConfirmPw, setShowConfirmPw] = useState(false);
  const [isLoadingPw, setIsLoadingPw] = useState(false);
  const [pwError, setPwError] = useState<string | null>(null);
  const [pwSuccess, setPwSuccess] = useState<string | null>(null);

  // Map roleName -> numeric ID in Spring Boot database
  const mapRoleNameToId = (roleName?: string): number => {
    switch (roleName) {
      case 'AGENT': return 1;
      case 'ADMIN': return 2;
      case 'SUPPORT_MANAGER': return 3;
      case 'SUPPORT_AGENT': return 4;
      case 'REQUESTER': return 5;
      default: return 2;
    }
  };

  useEffect(() => {
    if (user) {
      setName(user.name || '');
      setEmail(user.email || '');
      setRoleId(mapRoleNameToId(user.roleName));
      setProfileError(null);
      setProfileSuccess(null);
      setPwError(null);
      setPwSuccess(null);
      setNewPassword('');
      setConfirmPassword('');
      setShowPasswordSection(false);
    }
  }, [user]);

  useEffect(() => {
    if (isOpen && !isCurrentUser) {
      api.roles.getAll().then(list => {
        setRoles(list);
        if (user) {
          const matched = list.find(r => (r.roleName ?? (r as any).name) === user.roleName);
          if (matched) setRoleId(matched.roleId ?? (matched as any).id);
        }
      }).catch(() => []);
    }
  }, [isOpen, isCurrentUser, user]);

  if (!isOpen || !user) return null;

  // Save profile (name + email [+ roleId for admin editing others])
  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !email.trim()) return;

    setIsLoadingProfile(true);
    setProfileError(null);
    setProfileSuccess(null);

    try {
      // Clean partial update: only send name/email, and roleId if editing someone else
      await api.users.update(user.userPublicId, {
        name: name.trim(),
        email: email.trim(),
        ...(isCurrentUser ? {} : { roleId: Number(roleId) }),
      });

      setProfileSuccess('Profile updated successfully!');
      if (isCurrentUser) await refreshUser();
      setTimeout(() => {
        onSuccess();
        onClose();
      }, 700);
    } catch (err: any) {
      setProfileError(err.message || 'Failed to update profile');
    } finally {
      setIsLoadingProfile(false);
    }
  };

  // Change password only
  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setPwError(null);
    setPwSuccess(null);

    if (!newPassword || newPassword.length < 8) {
      setPwError('Password must be at least 8 characters.');
      return;
    }
    if (newPassword !== confirmPassword) {
      setPwError('Passwords do not match.');
      return;
    }

    setIsLoadingPw(true);
    try {
      // Clean password-only update: backend will re-encode password without altering role or email
      await api.users.update(user.userPublicId, {
        password: newPassword,
      });

      setPwSuccess('Password changed successfully!');
      if (isCurrentUser) await refreshUser();
      setNewPassword('');
      setConfirmPassword('');
      setTimeout(() => {
        setShowPasswordSection(false);
        setPwSuccess(null);
      }, 1500);
    } catch (err: any) {
      setPwError(err.message || 'Failed to change password');
    } finally {
      setIsLoadingPw(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs animate-in fade-in">
      <div className="fixed inset-0" onClick={onClose} />
      <div className="relative bg-white w-full max-w-md rounded-3xl shadow-2xl border border-slate-100 p-6 sm:p-7 z-10 animate-in zoom-in-95 max-h-[90vh] overflow-y-auto">

        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-slate-100 mb-5">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-2xl bg-[#0B132B] text-white flex items-center justify-center shadow-xs">
              <UserCheck className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-base font-bold text-[#0B132B]">
                {isCurrentUser ? 'Edit My Profile' : 'Update User Details'}
              </h2>
              <p className="text-xs text-slate-400">
                Update name and email
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-full text-slate-400 hover:text-slate-800 hover:bg-slate-100 transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* ---- PROFILE FORM ---- */}
        {profileError && (
          <div className="p-3 mb-4 rounded-2xl bg-rose-50 border border-rose-200 text-rose-700 text-xs font-semibold flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-rose-500 shrink-0" />
            <span>{profileError}</span>
          </div>
        )}
        {profileSuccess && (
          <div className="p-3 mb-4 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs font-semibold flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
            <span>{profileSuccess}</span>
          </div>
        )}

        <form onSubmit={handleSaveProfile} className="space-y-4 text-xs">
          {/* Full Name */}
          <div>
            <label className="block text-slate-700 font-bold mb-1">Full Name</label>
            <input
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full px-4 py-2.5 rounded-2xl bg-slate-50 border border-slate-200 text-slate-800 focus:outline-none focus:ring-2 focus:ring-slate-900/10 transition-all font-medium"
              placeholder="Your full name"
            />
          </div>

          {/* Email Address */}
          <div>
            <label className="block text-slate-700 font-bold mb-1">Email Address</label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-4 py-2.5 rounded-2xl bg-slate-50 border border-slate-200 text-slate-800 focus:outline-none focus:ring-2 focus:ring-slate-900/10 transition-all font-medium"
              placeholder="your@email.com"
            />
          </div>

          {/* Role Selection — only editable by admin when editing another user */}
          {!isCurrentUser ? (
            <div>
              <label className="block text-slate-700 font-bold mb-1">Assigned Role</label>
              <select
                value={roleId}
                onChange={(e) => setRoleId(Number(e.target.value))}
                className="w-full px-3 py-2.5 rounded-2xl bg-slate-50 border border-slate-200 text-slate-800 font-semibold focus:outline-none"
              >
                {roles.length > 0 ? (
                  roles.map(r => {
                    const rId = r.roleId ?? (r as any).id;
                    const rName = r.roleName ?? (r as any).name;
                    return (
                      <option key={rId} value={rId}>
                        {rName} (#{rId})
                      </option>
                    );
                  })
                ) : (
                  <>
                    <option value="1">AGENT</option>
                    <option value="2">ADMIN</option>
                    <option value="3">SUPPORT_MANAGER</option>
                    <option value="4">SUPPORT_AGENT</option>
                    <option value="5">REQUESTER</option>
                  </>
                )}
              </select>
            </div>
          ) : (
            <div>
              <label className="block text-slate-700 font-bold mb-1">Your Role</label>
              <div className="w-full px-4 py-2.5 rounded-2xl bg-slate-100 border border-slate-200 text-slate-600 font-semibold text-xs flex items-center justify-between">
                <span>{user.roleName || 'User'}</span>
                <span className="text-[11px] text-slate-400 font-normal italic">Managed by Administrator</span>
              </div>
            </div>
          )}

          {/* Action Buttons */}
          <div className="pt-3 flex items-center justify-between border-t border-slate-100">
            {/* Change Password toggle */}
            <button
              type="button"
              onClick={() => setShowPasswordSection(prev => !prev)}
              className="flex items-center gap-1.5 px-3 py-2 rounded-full text-xs font-semibold text-slate-600 hover:bg-slate-100 border border-slate-200 transition-colors cursor-pointer"
            >
              <KeyRound className="w-3.5 h-3.5" />
              <span>Change Password</span>
            </button>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 rounded-full text-xs font-semibold text-slate-600 hover:bg-slate-100 transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isLoadingProfile}
                className="px-6 py-2 rounded-full text-xs font-bold bg-[#0B132B] hover:bg-slate-800 text-white shadow-xs transition-colors cursor-pointer disabled:opacity-50"
              >
                {isLoadingProfile ? 'Saving...' : 'Save Changes'}
              </button>
            </div>
          </div>
        </form>

        {/* ---- CHANGE PASSWORD SECTION (collapsible) ---- */}
        {showPasswordSection && (
          <div className="mt-5 pt-5 border-t border-slate-100">
            <div className="flex items-center gap-2 mb-4">
              <KeyRound className="w-4 h-4 text-slate-600" />
              <h3 className="text-sm font-bold text-[#0B132B]">Change Password</h3>
            </div>

            {pwError && (
              <div className="p-3 mb-4 rounded-2xl bg-rose-50 border border-rose-200 text-rose-700 text-xs font-semibold flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-rose-500 shrink-0" />
                <span>{pwError}</span>
              </div>
            )}
            {pwSuccess && (
              <div className="p-3 mb-4 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs font-semibold flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
                <span>{pwSuccess}</span>
              </div>
            )}

            <form onSubmit={handleChangePassword} className="space-y-4 text-xs">
              {/* New Password */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block text-slate-700 font-bold">New Password</label>
                  <span className="text-[10px] text-slate-400">Min 8 characters</span>
                </div>
                <div className="relative">
                  <input
                    type={showNewPw ? 'text' : 'password'}
                    minLength={8}
                    required
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="Enter new password"
                    className="w-full px-4 py-2.5 pr-10 rounded-2xl bg-slate-50 border border-slate-200 text-slate-800 focus:outline-none focus:ring-2 focus:ring-slate-900/10 transition-all font-medium"
                  />
                  <button
                    type="button"
                    onClick={() => setShowNewPw(p => !p)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700 cursor-pointer"
                  >
                    {showNewPw ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                  </button>
                </div>
              </div>

              {/* Confirm Password */}
              <div>
                <label className="block text-slate-700 font-bold mb-1">Confirm New Password</label>
                <div className="relative">
                  <input
                    type={showConfirmPw ? 'text' : 'password'}
                    minLength={8}
                    required
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="Repeat new password"
                    className="w-full px-4 py-2.5 pr-10 rounded-2xl bg-slate-50 border border-slate-200 text-slate-800 focus:outline-none focus:ring-2 focus:ring-slate-900/10 transition-all font-medium"
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPw(p => !p)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700 cursor-pointer"
                  >
                    {showConfirmPw ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                  </button>
                </div>
              </div>

              <div className="flex justify-end">
                <button
                  type="submit"
                  disabled={isLoadingPw}
                  className="px-6 py-2 rounded-full text-xs font-bold bg-[#0B132B] hover:bg-slate-800 text-white shadow-xs transition-colors cursor-pointer disabled:opacity-50"
                >
                  {isLoadingPw ? 'Updating...' : 'Update Password'}
                </button>
              </div>
            </form>
          </div>
        )}
      </div>
    </div>
  );
}
