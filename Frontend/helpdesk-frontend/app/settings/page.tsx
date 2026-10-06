'use client';

import React, { useState, useEffect, useMemo } from 'react';
import Navbar from '@/components/Navbar';
import AuthGuard from '@/components/AuthGuard';
import EditUserModal from '@/components/EditUserModal';
import { 
  Shield, 
  RefreshCw, 
  Key, 
  UserCheck, 
  Edit3, 
  Plus, 
  X, 
  Check, 
  Trash2, 
  Search, 
  CheckSquare, 
  Square, 
  Lock, 
  Settings as SettingsIcon,
  Tag
} from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { useToast } from '@/context/ToastContext';
import { useConfirmModal } from '@/components/ConfirmModal';
import { api } from '@/lib/api';
import { Role, Permission, User } from '@/types';

export default function SettingsPage() {
  return (
    <AuthGuard allowedRoles={['ADMIN']}>
      <SettingsContent />
    </AuthGuard>
  );
}

function SettingsContent() {
  const { role, user: contextUser } = useAuth();
  const { toast } = useToast();
  const { confirm, ConfirmModalElement } = useConfirmModal();
  const [rolesList, setRolesList] = useState<Role[]>([]);
  const [permissionsList, setPermissionsList] = useState<Permission[]>([]);
  const [isLoadingRBAC, setIsLoadingRBAC] = useState(false);

  // Profile state
  const [meProfile, setMeProfile] = useState<User | null>(null);
  const [isLoadingMe, setIsLoadingMe] = useState(false);
  const [isEditingMe, setIsEditingMe] = useState(false);

  // Edit Role & Permissions modal state
  const [editingRole, setEditingRole] = useState<Role | null>(null);
  const [roleName, setRoleName] = useState('');
  const [roleDescription, setRoleDescription] = useState('');
  const [selectedPermissionIds, setSelectedPermissionIds] = useState<Set<number>>(new Set());
  const [permSearchQuery, setPermSearchQuery] = useState('');
  const [isSavingRole, setIsSavingRole] = useState(false);

  // Create Role modal state
  const [isCreateRoleOpen, setIsCreateRoleOpen] = useState(false);
  const [newRoleName, setNewRoleName] = useState('');
  const [newRoleDesc, setNewRoleDesc] = useState('');
  const [newRolePermissionIds, setNewRolePermissionIds] = useState<Set<number>>(new Set());
  const [isCreatingRole, setIsCreatingRole] = useState(false);

  // Create Permission modal state
  const [isCreatePermOpen, setIsCreatePermOpen] = useState(false);
  const [newPermName, setNewPermName] = useState('');
  const [newPermDesc, setNewPermDesc] = useState('');
  const [isCreatingPerm, setIsCreatingPerm] = useState(false);

  // Deleting role state
  const [deletingRoleId, setDeletingRoleId] = useState<number | null>(null);

  useEffect(() => {
    loadRBAC(false);
    loadMe(false);
  }, []);

  const loadMe = async (forceRefresh = false) => {
    setIsLoadingMe(true);
    try {
      const data = await api.users.getMe({ forceRefresh });
      setMeProfile(data);
    } catch {
      setMeProfile(contextUser);
    } finally {
      setIsLoadingMe(false);
    }
  };

  const loadRBAC = async (forceRefresh = false) => {
    setIsLoadingRBAC(true);
    try {
      const [r, p] = await Promise.all([
        api.roles.getAll({ forceRefresh }).catch(() => []),
        api.permissions.getAll({ forceRefresh }).catch(() => []),
      ]);
      setRolesList(r);
      setPermissionsList(p);
    } catch {
      // Ignore
    } finally {
      setIsLoadingRBAC(false);
    }
  };

  // Open Edit Role & Permissions modal
  const handleOpenEditRole = async (r: Role) => {
    setEditingRole(r);
    setRoleName(r.roleName || (r as any).name || '');
    setRoleDescription(r.description || '');
    setPermSearchQuery('');

    // Fetch existing permissions for this role
    const rId = r.roleId ?? (r as any).id;
    try {
      const assigned = await api.roles.getPermissions(rId);
      const idSet = new Set<number>(assigned.map(p => p.permissionId ?? (p as any).id));
      setSelectedPermissionIds(idSet);
    } catch {
      // Fallback to role.permissions if present
      const fallbackIds = (r.permissions || []).map(p => p.permissionId ?? (p as any).id);
      setSelectedPermissionIds(new Set(fallbackIds));
    }
  };

  // Toggle single permission for editing role
  const handleTogglePermission = (permId: number) => {
    setSelectedPermissionIds(prev => {
      const next = new Set(prev);
      if (next.has(permId)) {
        next.delete(permId); // Revoke
      } else {
        next.add(permId); // Grant
      }
      return next;
    });
  };

  // Select all / clear all for editing role
  const handleSelectAllPerms = () => {
    const allIds = permissionsList.map(p => p.permissionId ?? (p as any).id);
    setSelectedPermissionIds(new Set(allIds));
  };

  const handleClearAllPerms = () => {
    setSelectedPermissionIds(new Set());
  };

  // Save Role details and updated permissions
  const handleSaveRole = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingRole || !roleName.trim() || isSavingRole) return;

    setIsSavingRole(true);
    const rId = editingRole.roleId ?? (editingRole as any).id;
    const permIdsArray = Array.from(selectedPermissionIds);

    try {
      // Update role and assign permissions
      await api.roles.update(rId, {
        name: roleName.trim(),
        description: roleDescription.trim(),
        permissionIds: permIdsArray,
      });

      setEditingRole(null);
      toast.success(`Role "${roleName.trim()}" updated successfully.`);
      await loadRBAC();
    } catch (err: any) {
      toast.error(err.message || 'Failed to update role');
    } finally {
      setIsSavingRole(false);
    }
  };

  // Create new role
  const handleCreateRole = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newRoleName.trim() || isCreatingRole) return;

    setIsCreatingRole(true);
    try {
      const formattedName = newRoleName.trim().toUpperCase().replace(/\s+/g, '_');
      const created = await api.roles.create({
        name: formattedName,
        description: newRoleDesc.trim(),
      });

      const rId = created.roleId ?? (created as any).id;
      if (newRolePermissionIds.size > 0) {
        await api.roles.assignPermissions(rId, Array.from(newRolePermissionIds));
      }

      setIsCreateRoleOpen(false);
      setNewRoleName('');
      setNewRoleDesc('');
      setNewRolePermissionIds(new Set());
      toast.success(`Role "${formattedName}" created successfully.`);
      await loadRBAC();
    } catch (err: any) {
      toast.error(err.message || 'Failed to create role');
    } finally {
      setIsCreatingRole(false);
    }
  };

  // Delete role
  const handleDeleteRole = async (r: Role) => {
    const rId = r.roleId ?? (r as any).id;
    const name = r.roleName || (r as any).name;
    const confirmed = await confirm({
      title: 'Delete Role',
      message: `Are you sure you want to delete role "${name}"? This action cannot be undone.`,
      confirmText: 'Delete Role',
      confirmVariant: 'danger',
    });
    if (!confirmed) return;

    setDeletingRoleId(rId);
    try {
      await api.roles.delete(rId);
      toast.success(`Role "${name}" deleted successfully.`);
      await loadRBAC();
    } catch (err: any) {
      toast.error(err.message || 'Failed to delete role');
    } finally {
      setDeletingRoleId(null);
    }
  };

  // Create new permission in registry
  const handleCreatePermission = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPermName.trim() || isCreatingPerm) return;

    setIsCreatingPerm(true);
    try {
      const formattedName = newPermName.trim().toUpperCase().replace(/\s+/g, '_');
      await api.permissions.create({
        name: formattedName,
        description: newPermDesc.trim(),
      });
      setIsCreatePermOpen(false);
      setNewPermName('');
      setNewPermDesc('');
      toast.success(`Permission "${formattedName}" created successfully.`);
      await loadRBAC();
    } catch (err: any) {
      toast.error(err.message || 'Failed to create permission');
    } finally {
      setIsCreatingPerm(false);
    }
  };

  // Filter permissions in the edit modal
  const filteredPermissions = useMemo(() => {
    if (!permSearchQuery.trim()) return permissionsList;
    const q = permSearchQuery.toLowerCase().trim();
    return permissionsList.filter(p => {
      const name = (p.name || (p as any).permissionName || '').toLowerCase();
      const desc = (p.description || '').toLowerCase();
      return name.includes(q) || desc.includes(q);
    });
  }, [permissionsList, permSearchQuery]);

  return (
    <div className="min-h-screen bg-[#F4F6FB] pb-16">
      <Navbar />

      <main className="max-w-[1400px] mx-auto px-4 sm:px-6 space-y-6">
        <div>
          <h1 className="text-3xl font-extrabold text-[#0B132B] tracking-tight">
            HelpDesk Settings
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Manage your profile, system roles, and authority access controls
          </p>
        </div>

        {/* ------------------------------------------------------------- */}
        {/* SECTION 1: MY PROFILE                                         */}
        {/* ------------------------------------------------------------- */}
        <div className="pill-card p-6 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-[#0B132B] text-white flex items-center justify-center font-bold text-sm shadow-xs">
                <UserCheck className="w-5 h-5" />
              </div>
              <h3 className="text-base font-bold text-[#0B132B]">My Profile</h3>
            </div>

            <div className="flex items-center gap-2 self-start sm:self-center">
              <button
                onClick={() => setIsEditingMe(true)}
                className="flex items-center gap-1.5 px-4 py-1.5 rounded-full text-xs font-bold bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 transition-colors shadow-2xs cursor-pointer"
              >
                <Edit3 className="w-3.5 h-3.5 text-slate-500" />
                <span>Edit My Details</span>
              </button>

              <button
                onClick={() => loadMe(true)}
                className="p-1.5 rounded-full hover:bg-slate-100 text-slate-400 hover:text-slate-700 transition-colors cursor-pointer"
                title="Refresh Profile"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${isLoadingMe ? 'animate-spin' : ''}`} />
              </button>
            </div>
          </div>

          {/* Field Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 text-xs">
            <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-100">
              <span className="text-slate-400 block mb-1 font-medium">Full Name</span>
              <span className="text-sm font-bold text-slate-900 block truncate">
                {meProfile?.name || 'Loading...'}
              </span>
            </div>

            <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-100">
              <span className="text-slate-400 block mb-1 font-medium">Email Address</span>
              <span className="text-sm font-bold text-slate-900 block truncate font-mono text-xs">
                {meProfile?.email || 'Loading...'}
              </span>
            </div>

            <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-100">
              <span className="text-slate-400 block mb-1 font-medium">Assigned Role</span>
              <span className={`inline-block px-2.5 py-0.5 rounded-full text-xs font-bold ${
                meProfile?.roleName === 'ADMIN' ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' :
                meProfile?.roleName === 'SUPPORT_MANAGER' ? 'bg-blue-50 text-blue-700 border border-blue-200' :
                meProfile?.roleName === 'SUPPORT_AGENT' ? 'bg-purple-50 text-purple-700 border border-purple-200' :
                'bg-amber-50 text-amber-700 border border-amber-200'
              }`}>
                {meProfile?.roleName || 'Loading...'}
              </span>
            </div>

            <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-100">
              <span className="text-slate-400 block mb-1 font-medium">Account Status</span>
              <div className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                <span className="text-xs font-bold text-emerald-700">
                  {meProfile?.isActive ? 'Active' : 'Inactive'}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* ------------------------------------------------------------- */}
        {/* SECTION 2: ROLES & PERMISSIONS MANAGEMENT                     */}
        {/* ------------------------------------------------------------- */}
        <div className="pill-card p-6 space-y-5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-100">
            <div>
              <div className="flex items-center gap-2">
                <Shield className="w-5 h-5 text-slate-700" />
                <h3 className="text-base font-bold text-[#0B132B]">
                  Roles & Permissions Configuration
                </h3>
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                Grant or revoke permissions, edit role scopes, and configure system security access
              </p>
            </div>

            <div className="flex items-center gap-2 self-start sm:self-center">
              <button
                onClick={() => setIsCreatePermOpen(true)}
                className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-semibold bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 transition-colors shadow-2xs cursor-pointer"
                title="Create a new permission code"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>New Permission</span>
              </button>

              <button
                onClick={() => setIsCreateRoleOpen(true)}
                className="flex items-center gap-1.5 px-4 py-1.5 rounded-full text-xs font-semibold bg-[#0B132B] hover:bg-slate-800 text-white shadow-xs transition-all cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>New Role</span>
              </button>

              <button
                onClick={() => loadRBAC(true)}
                disabled={isLoadingRBAC}
                className="p-1.5 rounded-full hover:bg-slate-100 text-slate-400 hover:text-slate-700 transition-colors cursor-pointer"
                title="Refresh roles and permissions"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${isLoadingRBAC ? 'animate-spin' : ''}`} />
              </button>
            </div>
          </div>

          {/* Roles Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {rolesList.map((r) => {
              const rId = r.roleId ?? (r as any).id;
              const rName = r.roleName ?? (r as any).name;
              const permCount = r.permissions ? r.permissions.length : 0;
              const isDeleting = deletingRoleId === rId;
              const isCoreRole = ['ADMIN', 'REQUESTER'].includes(rName);

              return (
                <div key={rId} className="p-5 rounded-2xl bg-slate-50 border border-slate-200/80 flex flex-col justify-between hover:border-slate-300 transition-all">
                  <div className="space-y-2.5">
                    <div className="flex items-center justify-between">
                      <span className="font-mono text-xs font-bold text-slate-400">
                        #{rId}
                      </span>
                      <span className="px-2 py-0.5 rounded-full text-[11px] font-semibold bg-white border border-slate-200 text-slate-700">
                        {permCount} {permCount === 1 ? 'Permission' : 'Permissions'}
                      </span>
                    </div>

                    <h4 className="text-base font-extrabold text-[#0B132B] tracking-tight">
                      {rName}
                    </h4>

                    <p className="text-xs text-slate-500 leading-relaxed min-h-[36px]">
                      {r.description || 'Custom security role for support workspace.'}
                    </p>

                    {/* Permission Chips Preview */}
                    {r.permissions && r.permissions.length > 0 && (
                      <div className="flex flex-wrap gap-1 pt-1">
                        {r.permissions.slice(0, 3).map((p) => {
                          const pId = p.permissionId ?? (p as any).id;
                          const pName = p.name ?? (p as any).permissionName;
                          return (
                            <span key={pId} className="text-[10px] font-mono px-2 py-0.5 rounded-md bg-white border border-slate-200/70 text-slate-600 truncate max-w-[140px]">
                              {pName}
                            </span>
                          );
                        })}
                        {r.permissions.length > 3 && (
                          <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded-md text-slate-400">
                            +{r.permissions.length - 3} more
                          </span>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Actions Footer */}
                  <div className="pt-4 mt-4 border-t border-slate-200/60 flex items-center justify-between gap-2">
                    <button
                      onClick={() => handleOpenEditRole(r)}
                      className="flex-1 py-1.5 px-3 rounded-full text-xs font-semibold bg-white hover:bg-slate-100 text-slate-800 border border-slate-200 transition-colors cursor-pointer flex items-center justify-center gap-1.5 shadow-2xs"
                    >
                      <Edit3 className="w-3.5 h-3.5 text-slate-600" />
                      <span>Edit &amp; Permissions</span>
                    </button>

                    {!isCoreRole && (
                      <button
                        onClick={() => handleDeleteRole(r)}
                        disabled={isDeleting}
                        className="p-1.5 rounded-full hover:bg-rose-100 text-rose-600 border border-rose-200 transition-colors cursor-pointer disabled:opacity-50"
                        title="Delete Role"
                      >
                        {isDeleting ? (
                          <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                        ) : (
                          <Trash2 className="w-3.5 h-3.5" />
                        )}
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Permissions Quick Reference Directory */}
        <div className="pill-card p-6 space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Key className="w-4 h-4 text-slate-700" />
              <h4 className="text-sm font-bold text-[#0B132B]">
                System Authority Catalog ({permissionsList.length})
              </h4>
            </div>
            <span className="text-[11px] text-slate-400">
              Available authorities that can be assigned to roles
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5 max-h-56 overflow-y-auto pr-1">
            {permissionsList.map((p) => {
              const pId = p.permissionId ?? (p as any).id;
              const pName = p.name ?? (p as any).permissionName;
              return (
                <div key={pId} className="p-2.5 rounded-xl bg-slate-50 border border-slate-100 flex items-start gap-2.5">
                  <div className="w-1.5 h-1.5 rounded-full bg-slate-400 mt-1.5 shrink-0" />
                  <div className="truncate">
                    <span className="font-mono text-xs font-bold text-slate-800 block truncate">
                      {pName}
                    </span>
                    <span className="text-[11px] text-slate-400 block truncate">
                      {p.description || 'System security permission.'}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </main>

      {/* ------------------------------------------------------------- */}
      {/* MODAL 1: EDIT ROLE & PERMISSIONS (GRANT / REVOKE)             */}
      {/* ------------------------------------------------------------- */}
      {editingRole && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs animate-in fade-in">
          <div className="fixed inset-0" onClick={() => setEditingRole(null)} />
          <div className="relative bg-white w-full max-w-2xl rounded-3xl shadow-2xl border border-slate-100 p-6 z-10 max-h-[90vh] flex flex-col">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 shrink-0">
              <div>
                <h3 className="text-base font-bold text-[#0B132B]">
                  Edit Role &amp; Authorities
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  Update role details and toggle permissions to grant or revoke access
                </p>
              </div>
              <button 
                onClick={() => setEditingRole(null)} 
                className="p-1.5 rounded-full hover:bg-slate-100 text-slate-400 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveRole} className="space-y-4 pt-3 flex-1 overflow-y-auto">
              {/* Role Details */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                <div>
                  <label className="block text-slate-700 font-semibold mb-1">Role Name</label>
                  <input
                    type="text"
                    required
                    value={roleName}
                    onChange={(e) => setRoleName(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-slate-800 font-bold focus:outline-none focus:ring-1 focus:ring-slate-900"
                  />
                </div>
                <div>
                  <label className="block text-slate-700 font-semibold mb-1">Description</label>
                  <input
                    type="text"
                    value={roleDescription}
                    onChange={(e) => setRoleDescription(e.target.value)}
                    placeholder="Describe role responsibilities..."
                    className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-slate-800 focus:outline-none focus:ring-1 focus:ring-slate-900"
                  />
                </div>
              </div>

              {/* Permissions Header & Quick Controls */}
              <div className="pt-2 border-t border-slate-100">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-3">
                  <div>
                    <span className="text-xs font-bold text-slate-800 block">
                      Assigned Permissions ({selectedPermissionIds.size} of {permissionsList.length} granted)
                    </span>
                    <span className="text-[11px] text-slate-400">
                      Check a box to grant permission; uncheck to revoke permission.
                    </span>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={handleSelectAllPerms}
                      className="px-2.5 py-1 rounded-full text-[11px] font-semibold text-slate-700 hover:bg-slate-100 border border-slate-200 transition-colors cursor-pointer"
                    >
                      Grant All
                    </button>
                    <button
                      type="button"
                      onClick={handleClearAllPerms}
                      className="px-2.5 py-1 rounded-full text-[11px] font-semibold text-rose-700 hover:bg-rose-50 border border-rose-200 transition-colors cursor-pointer"
                    >
                      Revoke All
                    </button>
                  </div>
                </div>

                {/* Filter Search Input */}
                <div className="relative mb-3">
                  <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type="text"
                    value={permSearchQuery}
                    onChange={(e) => setPermSearchQuery(e.target.value)}
                    placeholder="Filter permissions (e.g. ticket, category, user)..."
                    className="w-full pl-8 pr-3 py-1.5 text-xs rounded-xl bg-slate-50 border border-slate-200 text-slate-800 focus:outline-none"
                  />
                </div>

                {/* Permissions Checklist */}
                <div className="space-y-1.5 max-h-64 overflow-y-auto pr-1">
                  {filteredPermissions.length === 0 ? (
                    <div className="py-8 text-center text-xs text-slate-400">
                      No permissions match &quot;{permSearchQuery}&quot;
                    </div>
                  ) : (
                    filteredPermissions.map((p) => {
                      const pId = p.permissionId ?? (p as any).id;
                      const pName = p.name ?? (p as any).permissionName;
                      const isGranted = selectedPermissionIds.has(pId);

                      return (
                        <div
                          key={pId}
                          onClick={() => handleTogglePermission(pId)}
                          className={`p-2.5 rounded-xl border flex items-center justify-between cursor-pointer transition-all ${
                            isGranted
                              ? 'bg-emerald-50/60 border-emerald-200 text-slate-900'
                              : 'bg-white border-slate-100 hover:bg-slate-50 text-slate-600'
                          }`}
                        >
                          <div className="flex items-center gap-3">
                            <input
                              type="checkbox"
                              checked={isGranted}
                              onChange={() => {}} // Controlled via row click
                              className="w-4 h-4 rounded text-emerald-600 focus:ring-0 cursor-pointer pointer-events-none"
                            />
                            <div>
                              <div className="font-mono text-xs font-bold flex items-center gap-2">
                                <span>{pName}</span>
                                {isGranted && (
                                  <span className="text-[10px] font-sans font-bold text-emerald-700 bg-emerald-100 px-1.5 py-0.2 rounded-full">
                                    Granted
                                  </span>
                                )}
                              </div>
                              <div className="text-[11px] text-slate-400">
                                {p.description || 'System authority control'}
                              </div>
                            </div>
                          </div>
                          <span className="font-mono text-[10px] text-slate-400">
                            #{pId}
                          </span>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>

              {/* Modal Footer */}
              <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2 shrink-0">
                <button
                  type="button"
                  onClick={() => setEditingRole(null)}
                  className="px-4 py-2 rounded-full text-xs font-semibold text-slate-600 hover:bg-slate-100 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSavingRole || !roleName.trim()}
                  className="px-6 py-2 rounded-full text-xs font-bold bg-[#0B132B] hover:bg-slate-800 text-white shadow-xs transition-all cursor-pointer flex items-center gap-1.5 disabled:opacity-50"
                >
                  {isSavingRole && <RefreshCw className="w-3.5 h-3.5 animate-spin" />}
                  <span>Save Role &amp; Permissions</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ------------------------------------------------------------- */}
      {/* MODAL 2: CREATE NEW ROLE                                      */}
      {/* ------------------------------------------------------------- */}
      {isCreateRoleOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs animate-in fade-in">
          <div className="fixed inset-0" onClick={() => setIsCreateRoleOpen(false)} />
          <div className="relative bg-white w-full max-w-lg rounded-3xl shadow-2xl border border-slate-100 p-6 z-10 max-h-[90vh] flex flex-col">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 shrink-0">
              <h3 className="text-base font-bold text-[#0B132B]">Create New Role</h3>
              <button onClick={() => setIsCreateRoleOpen(false)} className="p-1 rounded-full hover:bg-slate-100 text-slate-400">
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleCreateRole} className="space-y-4 pt-3 flex-1 overflow-y-auto">
              <div className="text-xs space-y-3">
                <div>
                  <label className="block text-slate-700 font-semibold mb-1">Role Name</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. TIER_2_SPECIALIST"
                    value={newRoleName}
                    onChange={(e) => setNewRoleName(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-slate-800 font-bold focus:outline-none focus:ring-1 focus:ring-slate-900 uppercase"
                  />
                </div>

                <div>
                  <label className="block text-slate-700 font-semibold mb-1">Description</label>
                  <textarea
                    rows={2}
                    placeholder="Describe role responsibilities..."
                    value={newRoleDesc}
                    onChange={(e) => setNewRoleDesc(e.target.value)}
                    className="w-full p-2.5 rounded-xl bg-slate-50 border border-slate-200 text-slate-800 focus:outline-none focus:ring-1 focus:ring-slate-900"
                  />
                </div>

                <div>
                  <label className="block text-slate-700 font-semibold mb-1.5">
                    Select Initial Permissions ({newRolePermissionIds.size} selected)
                  </label>
                  <div className="max-h-48 overflow-y-auto space-y-1 border border-slate-100 p-2 rounded-xl bg-slate-50">
                    {permissionsList.map((p) => {
                      const pId = p.permissionId ?? (p as any).id;
                      const pName = p.name ?? (p as any).permissionName;
                      const isChecked = newRolePermissionIds.has(pId);
                      return (
                        <label key={pId} className="flex items-center gap-2 p-1.5 rounded-lg hover:bg-white text-xs cursor-pointer">
                          <input
                            type="checkbox"
                            checked={isChecked}
                            onChange={() => {
                              setNewRolePermissionIds(prev => {
                                const next = new Set(prev);
                                if (next.has(pId)) next.delete(pId);
                                else next.add(pId);
                                return next;
                              });
                            }}
                            className="rounded text-[#0B132B]"
                          />
                          <span className="font-mono text-xs font-semibold text-slate-800">{pName}</span>
                        </label>
                      );
                    })}
                  </div>
                </div>
              </div>

              <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2 shrink-0">
                <button
                  type="button"
                  onClick={() => setIsCreateRoleOpen(false)}
                  className="px-4 py-2 rounded-full text-xs font-semibold text-slate-600 hover:bg-slate-100"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isCreatingRole || !newRoleName.trim()}
                  className="px-6 py-2 rounded-full text-xs font-bold bg-[#0B132B] text-white hover:bg-slate-800 shadow-xs cursor-pointer flex items-center gap-1.5"
                >
                  {isCreatingRole && <RefreshCw className="w-3.5 h-3.5 animate-spin" />}
                  <span>Create Role</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ------------------------------------------------------------- */}
      {/* MODAL 3: CREATE NEW PERMISSION                                */}
      {/* ------------------------------------------------------------- */}
      {isCreatePermOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs animate-in fade-in">
          <div className="fixed inset-0" onClick={() => setIsCreatePermOpen(false)} />
          <div className="relative bg-white w-full max-w-md rounded-3xl shadow-2xl border border-slate-100 p-6 z-10">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="text-base font-bold text-[#0B132B]">Add System Permission</h3>
              <button onClick={() => setIsCreatePermOpen(false)} className="p-1 rounded-full hover:bg-slate-100 text-slate-400">
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleCreatePermission} className="space-y-4 pt-3 text-xs">
              <div>
                <label className="block text-slate-700 font-semibold mb-1">Permission Code</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. REPORT_EXPORT"
                  value={newPermName}
                  onChange={(e) => setNewPermName(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-slate-800 font-bold focus:outline-none uppercase"
                />
              </div>

              <div>
                <label className="block text-slate-700 font-semibold mb-1">Description</label>
                <textarea
                  rows={2}
                  required
                  placeholder="Describe granted capability..."
                  value={newPermDesc}
                  onChange={(e) => setNewPermDesc(e.target.value)}
                  className="w-full p-2.5 rounded-xl bg-slate-50 border border-slate-200 text-slate-800 focus:outline-none"
                />
              </div>

              <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsCreatePermOpen(false)}
                  className="px-4 py-2 rounded-full text-xs font-semibold text-slate-600 hover:bg-slate-100"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isCreatingPerm || !newPermName.trim()}
                  className="px-6 py-2 rounded-full text-xs font-bold bg-[#0B132B] text-white hover:bg-slate-800 shadow-xs cursor-pointer flex items-center gap-1.5"
                >
                  {isCreatingPerm && <RefreshCw className="w-3.5 h-3.5 animate-spin" />}
                  <span>Save Permission</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Current User Profile Modal */}
      <EditUserModal
        isOpen={isEditingMe}
        user={meProfile}
        onClose={() => setIsEditingMe(false)}
        onSuccess={loadMe}
        isCurrentUser={true}
      />

      {/* Confirmation Modal */}
      {ConfirmModalElement}
    </div>
  );
}
