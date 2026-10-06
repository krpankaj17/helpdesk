'use client';

import React, { useState, useEffect } from 'react';
import { User, CreateUserRequest, UserRole, Role } from '@/types';
import { api } from '@/lib/api';
import { X, UserPlus, Shield } from 'lucide-react';

interface UserModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (userData: CreateUserRequest) => void;
}

export default function UserModal({
  isOpen,
  onClose,
  onSubmit,
}: UserModalProps) {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [roleId, setRoleId] = useState<number>(4); // Default to SUPPORT_AGENT (#4 in DB)
  const [roles, setRoles] = useState<Role[]>([]);

  useEffect(() => {
    if (isOpen) {
      api.roles.getAll().then(list => {
        if (list && list.length > 0) {
          setRoles(list);
          const defaultRole = list.find(r => (r.roleName ?? (r as any).name) === 'SUPPORT_AGENT');
          if (defaultRole) {
            setRoleId(defaultRole.roleId ?? (defaultRole as any).id);
          }
        }
      }).catch(() => {});
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !email) return;

    onSubmit({
      name,
      email,
      password: password || undefined,
      roleId: Number(roleId),
    });

    setName('');
    setEmail('');
    setPassword('');
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs animate-in fade-in">
      <div 
        className="fixed inset-0"
        onClick={onClose}
      />
      <div className="relative bg-white w-full max-w-md rounded-3xl shadow-2xl border border-slate-100 p-6 sm:p-8 z-10">
        <div className="flex items-center justify-between pb-4 border-b border-slate-100 mb-5">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-full bg-slate-900 text-white flex items-center justify-center">
              <UserPlus className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-[#0B132B]">
                Onboard HelpDesk User
              </h2>
              <p className="text-xs text-slate-400">
                Register support agents, managers, or requesters
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-full text-slate-400 hover:text-slate-800 hover:bg-slate-100 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4 text-xs">
          <div>
            <label className="block text-slate-600 font-semibold mb-1">Full Name</label>
            <input
              type="text"
              required
              placeholder="e.g. Priya Nair"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full px-4 py-2 rounded-xl bg-slate-50 border border-slate-200 text-slate-800 focus:outline-none focus:ring-2 focus:ring-slate-900/10"
            />
          </div>

          <div>
            <label className="block text-slate-600 font-semibold mb-1">Email Address</label>
            <input
              type="email"
              required
              placeholder="e.g. priya.nair@enterprise.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-4 py-2 rounded-xl bg-slate-50 border border-slate-200 text-slate-800 focus:outline-none focus:ring-2 focus:ring-slate-900/10"
            />
          </div>

          <div>
            <label className="block text-slate-600 font-semibold mb-1">Initial Password</label>
            <input
              type="password"
              required
              minLength={8}
              placeholder="Minimum 8 characters"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-4 py-2 rounded-xl bg-slate-50 border border-slate-200 text-slate-800 focus:outline-none focus:ring-2 focus:ring-slate-900/10"
            />
          </div>

          <div>
            <label className="block text-slate-600 font-semibold mb-1">System Role (RBAC)</label>
            <select
              value={roleId}
              onChange={(e) => setRoleId(Number(e.target.value))}
              className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-slate-800 font-medium focus:outline-none"
            >
              {roles.length > 0 ? (
                roles.map(r => {
                  const rId = r.roleId ?? (r as any).id;
                  const rName = r.roleName ?? (r as any).name;
                  return (
                    <option key={rId} value={rId}>
                      {rName} (#{rId}) {r.description ? `— ${r.description}` : ''}
                    </option>
                  );
                })
              ) : (
                <>
                  <option value="2">ADMIN (Full Helpdesk Management)</option>
                  <option value="3">SUPPORT_MANAGER (Triage & SLA Assignment)</option>
                  <option value="4">SUPPORT_AGENT (Incident Resolution)</option>
                  <option value="5">REQUESTER (End User Portal)</option>
                  <option value="1">AGENT (Helpdesk support agent)</option>
                </>
              )}
            </select>
          </div>

          <div className="pt-4 flex items-center justify-end gap-2 border-t border-slate-100">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-full text-xs font-semibold text-slate-600 hover:bg-slate-100 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-6 py-2 rounded-full text-xs font-semibold bg-[#0B132B] hover:bg-slate-800 text-white shadow-xs transition-colors cursor-pointer"
            >
              Create Account
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
