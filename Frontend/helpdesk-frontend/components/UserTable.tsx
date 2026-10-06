'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { User, UserRole } from '@/types';
import { useToast } from '@/context/ToastContext';
import { 
  Plus, 
  Search, 
  ChevronDown, 
  ChevronLeft, 
  ChevronRight,
  Shield,
  MoreHorizontal,
  RefreshCw
} from 'lucide-react';

interface UserTableProps {
  users: User[];
  ticketCountsByAgent?: Record<string, { total: number; active: number }>;
  onAddUser?: () => void;
  onToggleStatus?: (user: User) => void;
  onEditUser?: (user: User) => void;
  onRefresh?: () => void;
  currentPage?: number;
  totalPages?: number;
  totalElements?: number;
  pageSize?: number;
  onPageChange?: (newPage: number) => void;
  onPageSizeChange?: (newSize: number) => void;
  isLoading?: boolean;
}

export default function UserTable({
  users,
  ticketCountsByAgent = {},
  onAddUser,
  onToggleStatus,
  onEditUser,
  onRefresh,
  currentPage,
  totalPages,
  totalElements,
  pageSize,
  onPageChange,
  onPageSizeChange,
  isLoading = false,
}: UserTableProps) {
  const { toast } = useToast();
  const [searchQuery, setSearchQuery] = useState('');
  const [roleFilter, setRoleFilter] = useState('ALL');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [activeStatTab, setActiveStatTab] = useState<'ALL' | 'ACTIVE' | 'SUPPORT' | 'INACTIVE'>('ACTIVE');
  
  // Internal pagination fallback if not controlled by parent
  const [internalPage, setInternalPage] = useState(0);
  const [internalSize, setInternalSize] = useState(10);

  const page = currentPage !== undefined ? currentPage : internalPage;
  const size = pageSize !== undefined ? pageSize : internalSize;

  const handlePageChange = (newPage: number) => {
    if (onPageChange) {
      onPageChange(newPage);
    } else {
      setInternalPage(newPage);
    }
  };

  const handlePageSizeChange = (newSize: number) => {
    if (onPageSizeChange) {
      onPageSizeChange(newSize);
    } else {
      setInternalSize(newSize);
      setInternalPage(0);
    }
  };

  // Quick summary counts
  const totalUsers = users.length;
  const activeCount = users.filter(u => u.isActive).length;
  const inactiveCount = users.filter(u => !u.isActive).length;
  const supportStaffCount = users.filter(u => u.roleName === 'SUPPORT_AGENT' || u.roleName === 'SUPPORT_MANAGER').length;

  const filtered = users.filter(u => {
    // Quick Ribbon Tab Filter
    if (activeStatTab === 'ACTIVE' && !u.isActive) return false;
    if (activeStatTab === 'INACTIVE' && u.isActive) return false;
    if (activeStatTab === 'SUPPORT' && (u.roleName !== 'SUPPORT_AGENT' && u.roleName !== 'SUPPORT_MANAGER')) return false;

    // Search query
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchName = u.name.toLowerCase().includes(q);
      const matchEmail = u.email.toLowerCase().includes(q);
      const matchDept = u.department?.toLowerCase().includes(q);
      if (!matchName && !matchEmail && !matchDept) return false;
    }

    // Dropdown filters
    if (roleFilter !== 'ALL' && u.roleName !== roleFilter) return false;
    if (statusFilter === 'ACTIVE' && !u.isActive) return false;
    if (statusFilter === 'INACTIVE' && u.isActive) return false;

    return true;
  });

  const isServerSide = totalElements !== undefined;
  const total = isServerSide ? totalElements : filtered.length;
  const pages = totalPages !== undefined ? totalPages : Math.max(1, Math.ceil(total / size));
  const displayedUsers = isServerSide ? filtered : filtered.slice(page * size, (page + 1) * size);

  const getRoleBadge = (roleName: UserRole) => {
    switch (roleName) {
      case 'ADMIN':
        return <span className="text-slate-700 text-xs font-medium">Admin</span>;
      case 'SUPPORT_MANAGER':
        return <span className="text-slate-700 text-xs font-medium">Support Manager</span>;
      case 'SUPPORT_AGENT':
        return <span className="text-slate-700 text-xs font-medium">Support Agent</span>;
      case 'REQUESTER':
        return <span className="text-slate-700 text-xs font-medium">Requester</span>;
      default:
        return <span className="text-slate-700 text-xs font-medium">{(roleName as string)?.replace(/_/g, ' ') || 'User'}</span>;
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Header Row matching screenshot 2 style */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-extrabold text-[#0B132B] tracking-tight">
            HelpDesk Users & Staff
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Showing {filtered.length} of {totalUsers} enterprise users and support staff across 4 RBAC roles
          </p>
        </div>

        {/* Action buttons: Onboard User */}
        <div className="flex items-center gap-2.5">
          {/* Onboard User Primary Black Pill */}
          <button
            onClick={onAddUser}
            className="flex items-center gap-1.5 px-5 py-2 rounded-full text-xs font-semibold bg-[#0B132B] hover:bg-slate-800 text-white shadow-xs transition-all cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Onboard User</span>
          </button>

          {onRefresh && (
            <button
              onClick={onRefresh}
              className="w-8 h-8 rounded-full bg-white border border-slate-200 flex items-center justify-center text-slate-600 hover:text-slate-900 shadow-2xs transition-all cursor-pointer"
              title="Refresh users"
            >
              <RefreshCw className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>

      {/* Summary Ribbon Strip with Light Yellow Highlighted Pill matching screenshot 2 */}
      <div className="pill-card px-4 py-3 flex items-center gap-2 sm:gap-6 overflow-x-auto">
        <button
          onClick={() => setActiveStatTab('ALL')}
          className={`flex items-center gap-3 px-4 py-1.5 rounded-full text-xs font-semibold transition-all cursor-pointer ${
            activeStatTab === 'ALL'
              ? 'badge-yellow font-bold shadow-2xs'
              : 'text-slate-600 hover:bg-slate-50'
          }`}
        >
          <span>Total Users</span>
          <span className="font-bold">{totalUsers}</span>
        </button>

        <button
          onClick={() => setActiveStatTab('ACTIVE')}
          className={`flex items-center gap-3 px-4 py-1.5 rounded-full text-xs font-semibold transition-all cursor-pointer ${
            activeStatTab === 'ACTIVE'
              ? 'badge-yellow font-bold shadow-2xs'
              : 'text-slate-600 hover:bg-slate-50'
          }`}
        >
          <span>Active Accounts</span>
          <span className="font-bold">{activeCount}</span>
        </button>

        <button
          onClick={() => setActiveStatTab('SUPPORT')}
          className={`flex items-center gap-3 px-4 py-1.5 rounded-full text-xs font-semibold transition-all cursor-pointer ${
            activeStatTab === 'SUPPORT'
              ? 'badge-yellow font-bold shadow-2xs'
              : 'text-slate-600 hover:bg-slate-50'
          }`}
        >
          <span>Support Staff</span>
          <span className="font-bold">{supportStaffCount}</span>
        </button>

        <button
          onClick={() => setActiveStatTab('INACTIVE')}
          className={`flex items-center gap-3 px-4 py-1.5 rounded-full text-xs font-semibold transition-all cursor-pointer ${
            activeStatTab === 'INACTIVE'
              ? 'badge-yellow font-bold shadow-2xs'
              : 'text-slate-600 hover:bg-slate-50'
          }`}
        >
          <span>Inactive Users</span>
          <span className="font-bold">{inactiveCount}</span>
        </button>
      </div>

      {/* Filter Row: Search Input Pill + Dropdowns */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
        {/* Search pill */}
        <div className="relative flex-1 max-w-xl">
          <Search className="w-3.5 h-3.5 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Search by name, email, or department..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-4 py-2 rounded-full text-xs bg-white border border-slate-200 text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-900/10 focus:border-slate-400 transition-all shadow-2xs"
          />
        </div>

        {/* Dropdown filter pills */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1">
          {/* Role Filter */}
          <div className="relative">
            <select
              value={roleFilter}
              onChange={(e) => setRoleFilter(e.target.value)}
              className="appearance-none bg-white border border-slate-200 rounded-full px-4 py-1.5 pr-8 text-xs font-semibold text-slate-700 hover:border-slate-300 focus:outline-none shadow-2xs cursor-pointer"
            >
              <option value="ALL">All Roles</option>
              <option value="ADMIN">Admin</option>
              <option value="SUPPORT_MANAGER">Support Manager</option>
              <option value="SUPPORT_AGENT">Support Agent</option>
              <option value="REQUESTER">Requester</option>
            </select>
            <ChevronDown className="w-3 h-3 text-slate-400 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
          </div>

          {/* Status Filter */}
          <div className="relative">
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="appearance-none bg-white border border-slate-200 rounded-full px-4 py-1.5 pr-8 text-xs font-semibold text-slate-700 hover:border-slate-300 focus:outline-none shadow-2xs cursor-pointer"
            >
              <option value="ALL">All Statuses</option>
              <option value="ACTIVE">Active</option>
              <option value="INACTIVE">Inactive</option>
            </select>
            <ChevronDown className="w-3 h-3 text-slate-400 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
          </div>
        </div>
      </div>

      {/* Main Table Card */}
      <div className="pill-card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="bg-slate-50/50 border-b border-slate-100 text-slate-400 font-medium">
                <th className="py-3 px-5 font-semibold">User</th>
                <th className="py-3 px-4 font-semibold">Email</th>
                <th className="py-3 px-4 font-semibold">Department</th>
                <th className="py-3 px-4 font-semibold">Assigned Tickets</th>
                <th className="py-3 px-4 font-semibold">Registered</th>
                <th className="py-3 px-4 font-semibold">Role</th>
                <th className="py-3 px-4 font-semibold">Status</th>
                <th className="py-3 px-5 font-semibold text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {displayedUsers.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-14 text-center text-slate-400 text-xs">
                    No user records match your selected filters.
                  </td>
                </tr>
              ) : (
                displayedUsers.map((u) => {
                  const wl = ticketCountsByAgent[u.email.toLowerCase()];
                  const isStaff = u.roleName === 'SUPPORT_AGENT' || u.roleName === 'SUPPORT_MANAGER' || (u.roleName as string) === 'AGENT';
                  return (
                    <tr
                      key={u.userPublicId}
                      className="hover:bg-slate-50/70 transition-colors group"
                    >
                      {/* User avatar & name */}
                      <td className="py-3.5 px-5">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full bg-slate-900 text-white font-bold text-xs flex items-center justify-center shadow-2xs">
                            {u.avatar || u.name.slice(0, 2).toUpperCase()}
                          </div>
                          <div className="font-bold text-slate-900 group-hover:text-indigo-600 transition-colors">
                            {u.name}
                          </div>
                        </div>
                      </td>

                      {/* Email */}
                      <td className="py-3.5 px-4 font-mono text-slate-600 font-medium text-xs">
                        {u.email}
                      </td>

                      {/* Department */}
                      <td className="py-3.5 px-4 text-slate-600">
                        {u.department || 'General IT'}
                      </td>

                      {/* Assigned Tickets Workload */}
                      <td className="py-3.5 px-4 text-xs font-medium">
                        {wl && wl.total > 0 ? (
                          <Link
                            href={`/tickets?agentEmail=${encodeURIComponent(u.email)}`}
                            className="text-slate-800 hover:text-slate-950 hover:underline"
                            title={`Filter tickets assigned to ${u.name}`}
                          >
                            {wl.total}
                          </Link>
                        ) : isStaff ? (
                          <Link
                            href={`/tickets?agentEmail=${encodeURIComponent(u.email)}`}
                            className="text-slate-400 hover:text-slate-600 hover:underline"
                            title={`View queue for ${u.name}`}
                          >
                            0
                          </Link>
                        ) : (
                          <span className="text-slate-300">-</span>
                        )}
                      </td>

                      {/* Start Date */}
                      <td className="py-3.5 px-4 text-slate-500">
                        {u.createdAt ? new Date(u.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : 'Jan 15, 2024'}
                      </td>

                      {/* Role Badge */}
                      <td className="py-3.5 px-4">
                        {getRoleBadge(u.roleName)}
                      </td>

                      {/* Status Pill */}
                      <td className="py-3.5 px-4">
                        {u.isActive ? (
                          <span className="px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200/50">
                            Active
                          </span>
                        ) : (
                          <span className="px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-slate-100 text-slate-500">
                            Inactive
                          </span>
                        )}
                      </td>

                      {/* Actions */}
                      <td className="py-3.5 px-5 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={() => onEditUser?.(u)}
                            className="px-2.5 py-1 rounded-full text-xs font-semibold bg-slate-100 hover:bg-slate-200 text-slate-700 transition-colors cursor-pointer"
                            title="Update User Details (PUT /users/{publicId})"
                          >
                            Edit
                          </button>
                          <button
                            onClick={() => onToggleStatus?.(u)}
                            className={`font-semibold text-xs transition-colors cursor-pointer px-2.5 py-1 rounded-full ${
                              u.isActive 
                                ? 'text-rose-600 hover:bg-rose-50' 
                                : 'text-emerald-600 hover:bg-emerald-50'
                            }`}
                          >
                            {u.isActive ? 'Deactivate' : 'Activate'}
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Bottom Pagination Strip */}
        {total > 0 && (
          <div className="px-6 py-4 border-t border-slate-100 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-slate-500">
            <div>
              Showing <span className="font-bold text-slate-800">
                {total === 0 ? 0 : (page * size) + 1} - {Math.min((page + 1) * size, total)}
              </span> of <span className="font-bold text-slate-800">{total}</span> users
            </div>

            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                <span>Rows per page:</span>
                <div className="relative">
                  <select
                    value={size}
                    onChange={(e) => handlePageSizeChange(Number(e.target.value))}
                    className="appearance-none bg-white border border-slate-200 rounded-lg px-2.5 py-1 pr-6 font-semibold text-slate-700 focus:outline-none cursor-pointer"
                  >
                    <option value={10}>10</option>
                    <option value={25}>25</option>
                    <option value={50}>50</option>
                  </select>
                  <ChevronDown className="w-3 h-3 text-slate-400 absolute right-1.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                </div>
              </div>

              {/* Pagination Buttons */}
              <div className="flex items-center gap-1.5">
                <button 
                  disabled={page === 0 || isLoading}
                  onClick={() => handlePageChange(page - 1)}
                  className="flex items-center gap-1 px-3 py-1 rounded-md text-slate-600 hover:bg-slate-100 disabled:opacity-40 transition-colors cursor-pointer disabled:cursor-not-allowed font-medium"
                >
                  <ChevronLeft className="w-3.5 h-3.5" />
                  <span>Prev</span>
                </button>
                
                {Array.from({ length: pages }, (_, i) => (
                  <button
                    key={i}
                    disabled={isLoading}
                    onClick={() => handlePageChange(i)}
                    className={`w-7 h-7 rounded-md font-bold flex items-center justify-center text-xs transition-colors cursor-pointer ${
                      page === i
                        ? 'bg-[#0B132B] text-white shadow-2xs'
                        : 'text-slate-600 hover:bg-slate-100'
                    }`}
                  >
                    {i + 1}
                  </button>
                )).slice(Math.max(0, page - 2), Math.min(pages, page + 3))}

                <button 
                  disabled={page >= pages - 1 || isLoading}
                  onClick={() => handlePageChange(page + 1)}
                  className="flex items-center gap-1 px-3 py-1 rounded-md text-slate-600 hover:bg-slate-100 disabled:opacity-40 transition-colors cursor-pointer disabled:cursor-not-allowed font-medium"
                >
                  <span>Next</span>
                  <ChevronRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
