'use client';

import React, { useState, useEffect, useRef } from 'react';
import Navbar from '@/components/Navbar';
import AuthGuard from '@/components/AuthGuard';
import UserTable from '@/components/UserTable';
import UserModal from '@/components/UserModal';
import EditUserModal from '@/components/EditUserModal';
import { api } from '@/lib/api';
import { User, CreateUserRequest, UserSummary } from '@/types';
import { useAuth } from '@/context/AuthContext';
import { useToast } from '@/context/ToastContext';

export default function UsersPage() {
  return (
    <AuthGuard allowedRoles={['ADMIN', 'SUPPORT_MANAGER']}>
      <UsersContent />
    </AuthGuard>
  );
}

function UsersContent() {
  const { canManageUsers } = useAuth();
  const { toast } = useToast();
  const [users, setUsers] = useState<User[]>([]);
  const [userSummary, setUserSummary] = useState<UserSummary | null>(null);
  const [ticketCounts, setTicketCounts] = useState<Record<string, { total: number; active: number }>>({});
  const [isAddUserOpen, setIsAddUserOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);

  const [currentPage, setCurrentPage] = useState(0);
  const [pageSize, setPageSize] = useState(10);
  const [totalPages, setTotalPages] = useState(1);
  const [totalElements, setTotalElements] = useState(0);
  const [isLoading, setIsLoading] = useState(false);

  const [searchQuery, setSearchQuery] = useState('');
  const [sortOrder, setSortOrder] = useState<'desc' | 'asc'>('desc');
  const [activeStatTab, setActiveStatTab] = useState<'ALL' | 'ACTIVE' | 'SUPPORT' | 'INACTIVE'>('ALL');
  const [roleFilter, setRoleFilter] = useState('ALL');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const isFirstMount = useRef(true);

  const loadData = async (
    targetPage = currentPage,
    targetSize = pageSize,
    targetSearch = searchQuery,
    targetSort = sortOrder,
    targetStatTab = activeStatTab,
    targetRole = roleFilter,
    targetStatus = statusFilter,
    forceRefresh = false
  ) => {
    setIsLoading(true);
    try {
      const sortParam = `createdAt,${targetSort}`;
      const [uPage, summary, metricData] = await Promise.all([
        api.users.getPaginated(
          targetPage,
          targetSize,
          targetSearch,
          sortParam,
          {
            role: targetRole !== 'ALL' ? targetRole : undefined,
            isActive: targetStatTab === 'ACTIVE' || targetStatus === 'ACTIVE'
              ? true
              : targetStatTab === 'INACTIVE' || targetStatus === 'INACTIVE'
                ? false
                : undefined,
            isSupportStaff: targetStatTab === 'SUPPORT' ? true : undefined,
          },
          { forceRefresh }
        ).catch(() => null),
        api.users.getSummary({ forceRefresh }).catch(() => null),
        api.tickets.getDashboardMetrics({ forceRefresh }).catch(() => null),
      ]);

      if (uPage) {
        setUsers(uPage.content || []);
        setTotalPages(uPage.totalPages);
        setTotalElements(uPage.totalElements);
        setCurrentPage(uPage.number);
      }

      if (summary) {
        setUserSummary(summary);
      }

      const counts: Record<string, { total: number; active: number }> = {};
      if (metricData?.agentWorkload) {
        Object.entries(metricData.agentWorkload).forEach(([email, activeCount]) => {
          counts[email.toLowerCase()] = { total: Number(activeCount), active: Number(activeCount) };
        });
      }
      setTicketCounts(counts);
    } catch {
      setUsers([]);
      setTicketCounts({});
    } finally {
      setIsLoading(false);
    }
  };

  // Debounced search query change effect
  useEffect(() => {
    if (isFirstMount.current) {
      isFirstMount.current = false;
      loadData(0, pageSize, searchQuery, sortOrder, activeStatTab, roleFilter, statusFilter, false);
      return;
    }

    const timer = setTimeout(() => {
      loadData(0, pageSize, searchQuery, sortOrder, activeStatTab, roleFilter, statusFilter, false);
    }, 300);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  const handlePageChange = (newPage: number) => {
    setCurrentPage(newPage);
    loadData(newPage, pageSize, searchQuery, sortOrder, activeStatTab, roleFilter, statusFilter);
  };

  const handlePageSizeChange = (newSize: number) => {
    setPageSize(newSize);
    setCurrentPage(0);
    loadData(0, newSize, searchQuery, sortOrder, activeStatTab, roleFilter, statusFilter);
  };

  const handleSearchChange = (query: string) => {
    setSearchQuery(query);
    setCurrentPage(0);
  };

  const handleSortChange = (newSort: 'desc' | 'asc') => {
    setSortOrder(newSort);
    setCurrentPage(0);
    loadData(0, pageSize, searchQuery, newSort, activeStatTab, roleFilter, statusFilter, false);
  };

  const handleStatTabChange = (tab: 'ALL' | 'ACTIVE' | 'SUPPORT' | 'INACTIVE') => {
    setActiveStatTab(tab);
    setCurrentPage(0);
    loadData(0, pageSize, searchQuery, sortOrder, tab, roleFilter, statusFilter, false);
  };

  const handleRoleFilterChange = (role: string) => {
    setRoleFilter(role);
    setCurrentPage(0);
    loadData(0, pageSize, searchQuery, sortOrder, activeStatTab, role, statusFilter, false);
  };

  const handleStatusFilterChange = (status: string) => {
    setStatusFilter(status);
    setCurrentPage(0);
    loadData(0, pageSize, searchQuery, sortOrder, activeStatTab, roleFilter, status, false);
  };

  const handleCreateUser = async (userReq: CreateUserRequest) => {
    try {
      await api.users.create(userReq);
      toast.success('User onboarded successfully');
      await loadData(currentPage, pageSize, searchQuery, sortOrder, activeStatTab, roleFilter, statusFilter, true);
      setIsAddUserOpen(false);
    } catch (err: any) {
      toast.error(err.message || 'Failed to create user');
    }
  };

  const handleToggleStatus = async (user: User) => {
    try {
      await api.users.updateStatus(user.userPublicId, !user.isActive);
      toast.success(`User status updated to ${!user.isActive ? 'Active' : 'Inactive'}`);
      await loadData(currentPage, pageSize, searchQuery, sortOrder, activeStatTab, roleFilter, statusFilter, true);
    } catch (err: any) {
      toast.error(err.message || 'Failed to update user status');
    }
  };

  return (
    <div className="min-h-screen bg-[#F4F6FB] pb-16">
      <Navbar />

      <main className="max-w-[1400px] mx-auto px-4 sm:px-6">
        <UserTable
          users={users}
          userSummary={userSummary}
          ticketCountsByAgent={ticketCounts}
          onRefresh={() => loadData(currentPage, pageSize, searchQuery, sortOrder, activeStatTab, roleFilter, statusFilter, true)}
          currentPage={currentPage}
          totalPages={totalPages}
          totalElements={totalElements}
          pageSize={pageSize}
          onPageChange={handlePageChange}
          onPageSizeChange={handlePageSizeChange}
          isLoading={isLoading}
          searchQuery={searchQuery}
          onSearchChange={handleSearchChange}
          sortOrder={sortOrder}
          onSortChange={handleSortChange}
          activeStatTab={activeStatTab}
          onStatTabChange={handleStatTabChange}
          roleFilter={roleFilter}
          onRoleFilterChange={handleRoleFilterChange}
          statusFilter={statusFilter}
          onStatusFilterChange={handleStatusFilterChange}
          onAddUser={() => {
            if (!canManageUsers) {
              toast.warning('Only ADMIN has USER_MANAGE authority to onboard staff.');
              return;
            }
            setIsAddUserOpen(true);
          }}
          onToggleStatus={(u) => {
            if (!canManageUsers) {
              toast.warning('Only ADMIN has USER_MANAGE authority to modify user status.');
              return;
            }
            handleToggleStatus(u);
          }}
          onEditUser={(u) => {
            if (!canManageUsers) {
              toast.warning('Only ADMIN has USER_MANAGE authority to modify user details.');
              return;
            }
            setEditingUser(u);
          }}
        />
      </main>

      <UserModal
        isOpen={isAddUserOpen}
        onClose={() => setIsAddUserOpen(false)}
        onSubmit={handleCreateUser}
      />

      <EditUserModal
        isOpen={!!editingUser}
        user={editingUser}
        onClose={() => setEditingUser(null)}
        onSuccess={() => loadData(currentPage, pageSize, searchQuery, sortOrder, activeStatTab, roleFilter, statusFilter, true)}
      />
    </div>
  );
}
