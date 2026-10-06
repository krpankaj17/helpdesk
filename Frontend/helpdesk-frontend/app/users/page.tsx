'use client';

import React, { useState, useEffect } from 'react';
import Navbar from '@/components/Navbar';
import AuthGuard from '@/components/AuthGuard';
import UserTable from '@/components/UserTable';
import UserModal from '@/components/UserModal';
import EditUserModal from '@/components/EditUserModal';
import { api } from '@/lib/api';
import { User, CreateUserRequest } from '@/types';
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
  const [ticketCounts, setTicketCounts] = useState<Record<string, { total: number; active: number }>>({});
  const [isAddUserOpen, setIsAddUserOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);

  const loadData = async (forceRefresh = false) => {
    try {
      const [uList, tList] = await Promise.all([
        api.users.getAll(0, 50, { forceRefresh }).catch(() => []),
        api.tickets.getAll(undefined, { forceRefresh }).catch(() => []),
      ]);
      setUsers(uList || []);

      const counts: Record<string, { total: number; active: number }> = {};
      (tList || []).forEach((t) => {
        if (t.assignedAgentEmail) {
          const key = t.assignedAgentEmail.toLowerCase();
          if (!counts[key]) {
            counts[key] = { total: 0, active: 0 };
          }
          counts[key].total++;
          if (t.status === 'OPEN' || t.status === 'IN_PROGRESS' || t.status === 'WAITING_ON_REQUESTOR') {
            counts[key].active++;
          }
        }
      });
      setTicketCounts(counts);
    } catch {
      setUsers([]);
      setTicketCounts({});
    }
  };

  useEffect(() => {
    loadData(false);
  }, []);

  const handleCreateUser = async (userReq: CreateUserRequest) => {
    try {
      await api.users.create(userReq);
      toast.success('User onboarded successfully');
      await loadData();
      setIsAddUserOpen(false);
    } catch (err: any) {
      toast.error(err.message || 'Failed to create user');
    }
  };

  const handleToggleStatus = async (user: User) => {
    try {
      await api.users.updateStatus(user.userPublicId, !user.isActive);
      toast.success(`User status updated to ${!user.isActive ? 'Active' : 'Inactive'}`);
      await loadData();
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
          ticketCountsByAgent={ticketCounts}
          onRefresh={() => loadData(true)}
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
        onSuccess={() => loadData(true)}
      />
    </div>
  );
}
