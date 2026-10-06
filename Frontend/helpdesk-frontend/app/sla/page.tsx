'use client';

import React, { useState, useEffect } from 'react';
import Navbar from '@/components/Navbar';
import AuthGuard from '@/components/AuthGuard';
import { api } from '@/lib/api';
import { SlaPolicy, Priority } from '@/types';
import { useAuth } from '@/context/AuthContext';
import { useToast } from '@/context/ToastContext';
import { useConfirmModal } from '@/components/ConfirmModal';
import { ShieldCheck, Clock, Plus, X, Edit2, Trash2, RefreshCw } from 'lucide-react';

export default function SlaPoliciesPage() {
  return (
    <AuthGuard allowedRoles={['ADMIN', 'SUPPORT_MANAGER']}>
      <SlaPoliciesContent />
    </AuthGuard>
  );
}

function SlaPoliciesContent() {
  const { hasPermission } = useAuth();
  const { toast } = useToast();
  const { confirm, ConfirmModalElement } = useConfirmModal();
  const [policies, setPolicies] = useState<SlaPolicy[]>([]);
  const [priorities, setPriorities] = useState<Priority[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  // Create state
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [prioId, setPrioId] = useState(1);
  const [desc, setDesc] = useState('');
  const [respMins, setRespMins] = useState(60);
  const [resoMins, setResoMins] = useState(240);

  // Edit state
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editingPolicy, setEditingPolicy] = useState<SlaPolicy | null>(null);
  const [editPrioId, setEditPrioId] = useState(1);
  const [editDesc, setEditDesc] = useState('');
  const [editRespMins, setEditRespMins] = useState(60);
  const [editResoMins, setEditResoMins] = useState(240);
  const [isSavingEdit, setIsSavingEdit] = useState(false);

  // Delete state
  const [isDeletingId, setIsDeletingId] = useState<number | null>(null);

  const loadData = async (forceRefresh = false) => {
    setIsLoading(true);
    try {
      const [pList, prList] = await Promise.all([
        api.slaPolicies.getAll({ forceRefresh }).catch(() => []),
        api.priorities.getAll({ forceRefresh }).catch(() => []),
      ]);
      setPolicies(pList || []);
      setPriorities(prList || []);
    } catch {
      setPolicies([]);
      setPriorities([]);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData(false);
  }, []);

  const handleCreatePolicy = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await api.slaPolicies.create({
        priorityId: Number(prioId),
        description: desc,
        responseTimeMinutes: Number(respMins),
        resolutionTimeMinutes: Number(resoMins),
      });
      setIsModalOpen(false);
      setDesc('');
      toast.success('SLA policy created successfully.');
      await loadData();
    } catch (err: any) {
      toast.error(err.message || 'Failed to create SLA policy');
    }
  };

  const handleOpenEdit = (policy: SlaPolicy) => {
    setEditingPolicy(policy);
    setEditPrioId(policy.priorityId || 1);
    setEditDesc(policy.description || '');
    setEditRespMins(policy.responseTimeMinutes || 60);
    setEditResoMins(policy.resolutionTimeMinutes || 240);
    setIsEditModalOpen(true);
  };

  const handleUpdatePolicy = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingPolicy) return;
    setIsSavingEdit(true);
    try {
      await api.slaPolicies.update(editingPolicy.slaPolicyId, {
        priorityId: Number(editPrioId),
        description: editDesc,
        responseTimeMinutes: Number(editRespMins),
        resolutionTimeMinutes: Number(editResoMins),
      });
      setIsEditModalOpen(false);
      setEditingPolicy(null);
      toast.success('SLA policy updated successfully.');
      await loadData();
    } catch (err: any) {
      toast.error(err.message || 'Failed to update SLA policy');
    } finally {
      setIsSavingEdit(false);
    }
  };

  const handleDeletePolicy = async (policy: SlaPolicy) => {
    const confirmed = await confirm({
      title: 'Delete SLA Policy',
      message: `Are you sure you want to delete the SLA policy for "${policy.priorityName}" priority?`,
      confirmText: 'Delete Policy',
      confirmVariant: 'danger',
    });
    if (!confirmed) return;

    setIsDeletingId(policy.slaPolicyId);
    try {
      await api.slaPolicies.delete(policy.slaPolicyId);
      toast.success(`SLA policy for "${policy.priorityName}" deleted successfully.`);
      await loadData();
    } catch (err: any) {
      toast.error(err.message || 'Failed to delete SLA policy');
    } finally {
      setIsDeletingId(null);
    }
  };

  const getPriorityColor = (prio: string) => {
    switch (prio) {
      case 'URGENT':
        return 'bg-rose-50 text-rose-700 border-rose-200/50';
      case 'HIGH':
        return 'bg-amber-50 text-amber-700 border-amber-200/50';
      case 'MEDIUM':
        return 'bg-blue-50 text-blue-700 border-blue-200/50';
      default:
        return 'bg-slate-100 text-slate-700 border-slate-200/50';
    }
  };

  return (
    <div className="min-h-screen bg-[#F4F6FB] pb-16">
      <Navbar />

      <main className="max-w-[1400px] mx-auto px-4 sm:px-6 space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-extrabold text-[#0B132B] tracking-tight">
              SLA Policies & Priority Escalations
            </h1>
            <p className="text-xs text-slate-400 mt-1">
              Automated response deadlines and resolution service level agreements from Spring Boot backend
            </p>
          </div>

          <div className="flex items-center gap-2.5">
            {hasPermission('PRIORITY_MANAGE') && (
              <button
                onClick={() => setIsModalOpen(true)}
                className="flex items-center gap-1.5 px-5 py-2 rounded-full text-xs font-semibold bg-[#0B132B] hover:bg-slate-800 text-white shadow-xs transition-all cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>New SLA Policy</span>
              </button>
            )}

            <button
              onClick={() => loadData(true)}
              disabled={isLoading}
              className="w-8 h-8 rounded-full bg-white border border-slate-200 flex items-center justify-center text-slate-600 hover:text-slate-900 shadow-2xs cursor-pointer"
              title="Refresh policies"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
            </button>
          </div>
        </div>

        {policies.length === 0 ? (
          <div className="pill-card p-12 text-center text-xs text-slate-400">
            No SLA policies configured in the backend database. Click &quot;+ New SLA Policy&quot; to create one.
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {policies.map((policy, idx) => {
              const isDeleting = isDeletingId === policy.slaPolicyId;
              return (
                <div key={policy.slaPolicyId ?? `policy-${idx}`} className="pill-card p-6 flex flex-col justify-between hover:shadow-md transition-shadow">
                  <div>
                    <div className="flex items-center justify-between mb-3">
                      <span className={`px-3 py-1 rounded-full text-xs font-bold border ${getPriorityColor(policy.priorityName)}`}>
                        {policy.priorityName} PRIORITY
                      </span>
                      <span className="font-mono text-xs text-slate-400">
                        Rule #{policy.slaPolicyId}
                      </span>
                    </div>

                    <p className="text-xs text-slate-600 mb-6 leading-relaxed">
                      {policy.description || 'Standard response and resolution enforcement rule for enterprise tickets.'}
                    </p>

                    {/* Deadlines comparison */}
                    <div className="grid grid-cols-2 gap-3 mb-4">
                      <div className="p-3 rounded-2xl bg-slate-50 border border-slate-100">
                        <div className="flex items-center gap-1.5 text-slate-400 text-xs mb-1">
                          <Clock className="w-3.5 h-3.5" />
                          <span>Response SLA</span>
                        </div>
                        <div className="text-lg font-extrabold text-[#0B132B]">
                          {policy.responseTimeMinutes} mins
                        </div>
                        <div className="text-[11px] text-slate-500 font-medium">
                          {(policy.responseTimeMinutes / 60).toFixed(1)} Hours
                        </div>
                      </div>

                      <div className="p-3 rounded-2xl bg-slate-50 border border-slate-100">
                        <div className="flex items-center gap-1.5 text-slate-400 text-xs mb-1">
                          <Clock className="w-3.5 h-3.5" />
                          <span>Resolution SLA</span>
                        </div>
                        <div className="text-lg font-extrabold text-[#0B132B]">
                          {policy.resolutionTimeMinutes} mins
                        </div>
                        <div className="text-[11px] text-slate-500 font-medium">
                          {(policy.resolutionTimeMinutes / 60).toFixed(1)} Hours
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Card Footer with Policy Status & Update/Delete Controls */}
                  <div className="pt-3 border-t border-slate-100 flex items-center justify-between text-xs text-slate-400">
                    <span className="flex items-center gap-1 text-emerald-600 font-semibold">
                      <ShieldCheck className="w-3.5 h-3.5" />
                      <span>Enforced Policy</span>
                    </span>

                    {hasPermission('PRIORITY_MANAGE') && (
                      <div className="flex items-center gap-1.5">
                        <button
                          onClick={() => handleOpenEdit(policy)}
                          className="px-2.5 py-1 rounded-full text-xs font-semibold bg-slate-100 hover:bg-slate-200 text-slate-700 transition-colors cursor-pointer flex items-center gap-1"
                          title="Update SLA Policy"
                        >
                          <Edit2 className="w-3 h-3 text-slate-600" />
                          <span>Update</span>
                        </button>

                        <button
                          onClick={() => handleDeletePolicy(policy)}
                          disabled={isDeleting}
                          className="px-2.5 py-1 rounded-full text-xs font-semibold bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200/60 transition-colors cursor-pointer flex items-center gap-1 disabled:opacity-50"
                          title="Delete SLA Policy"
                        >
                          {isDeleting ? (
                            <RefreshCw className="w-3 h-3 animate-spin text-rose-600" />
                          ) : (
                            <Trash2 className="w-3 h-3 text-rose-600" />
                          )}
                          <span>Delete</span>
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </main>

      {/* Create SLA Policy Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs animate-in fade-in">
          <div className="fixed inset-0" onClick={() => setIsModalOpen(false)} />
          <div className="relative bg-white w-full max-w-md rounded-3xl shadow-2xl border border-slate-100 p-6 z-10">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100 mb-4">
              <h3 className="text-base font-bold text-[#0B132B]">Configure SLA Policy</h3>
              <button onClick={() => setIsModalOpen(false)} className="p-1 rounded-full hover:bg-slate-100 text-slate-400">
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleCreatePolicy} className="space-y-4 text-xs">
              <div>
                <label className="block text-slate-600 font-semibold mb-1">Target Priority</label>
                <select
                  value={prioId}
                  onChange={(e) => setPrioId(Number(e.target.value))}
                  className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-slate-800 font-medium"
                >
                  {priorities.map((p) => (
                    <option key={p.priorityId} value={p.priorityId}>{p.name}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-slate-600 font-semibold mb-1">Policy Description</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Critical Outage 1-hour response SLA"
                  value={desc}
                  onChange={(e) => setDesc(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-slate-800"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-600 font-semibold mb-1">Response Time (mins)</label>
                  <input
                    type="number"
                    required
                    min={1}
                    value={respMins}
                    onChange={(e) => setRespMins(Number(e.target.value))}
                    className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-slate-800"
                  />
                </div>
                <div>
                  <label className="block text-slate-600 font-semibold mb-1">Resolution Time (mins)</label>
                  <input
                    type="number"
                    required
                    min={1}
                    value={resoMins}
                    onChange={(e) => setResoMins(Number(e.target.value))}
                    className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-slate-800"
                  />
                </div>
              </div>

              <div className="pt-4 flex items-center justify-end gap-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 rounded-full text-xs font-semibold text-slate-600 hover:bg-slate-100"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-6 py-2 rounded-full text-xs font-semibold bg-[#0B132B] text-white hover:bg-slate-800 shadow-xs cursor-pointer"
                >
                  Save Policy
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit SLA Policy Modal */}
      {isEditModalOpen && editingPolicy && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs animate-in fade-in">
          <div className="fixed inset-0" onClick={() => setIsEditModalOpen(false)} />
          <div className="relative bg-white w-full max-w-md rounded-3xl shadow-2xl border border-slate-100 p-6 z-10">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100 mb-4">
              <h3 className="text-base font-bold text-[#0B132B]">Update SLA Policy</h3>
              <button onClick={() => setIsEditModalOpen(false)} className="p-1 rounded-full hover:bg-slate-100 text-slate-400">
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleUpdatePolicy} className="space-y-4 text-xs">
              <div>
                <label className="block text-slate-600 font-semibold mb-1">Target Priority</label>
                <select
                  value={editPrioId}
                  onChange={(e) => setEditPrioId(Number(e.target.value))}
                  className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-slate-800 font-medium"
                >
                  {priorities.map((p) => (
                    <option key={p.priorityId} value={p.priorityId}>{p.name}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-slate-600 font-semibold mb-1">Policy Description</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Critical Outage 1-hour response SLA"
                  value={editDesc}
                  onChange={(e) => setEditDesc(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-slate-800"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-600 font-semibold mb-1">Response Time (mins)</label>
                  <input
                    type="number"
                    required
                    min={1}
                    value={editRespMins}
                    onChange={(e) => setEditRespMins(Number(e.target.value))}
                    className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-slate-800"
                  />
                </div>
                <div>
                  <label className="block text-slate-600 font-semibold mb-1">Resolution Time (mins)</label>
                  <input
                    type="number"
                    required
                    min={1}
                    value={editResoMins}
                    onChange={(e) => setEditResoMins(Number(e.target.value))}
                    className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-slate-800"
                  />
                </div>
              </div>

              <div className="pt-4 flex items-center justify-end gap-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsEditModalOpen(false)}
                  className="px-4 py-2 rounded-full text-xs font-semibold text-slate-600 hover:bg-slate-100"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSavingEdit}
                  className="px-6 py-2 rounded-full text-xs font-semibold bg-[#0B132B] text-white hover:bg-slate-800 shadow-xs cursor-pointer flex items-center gap-1.5"
                >
                  {isSavingEdit && <RefreshCw className="w-3 h-3 animate-spin" />}
                  <span>Update Policy</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Confirm Modal */}
      {ConfirmModalElement}
    </div>
  );
}
