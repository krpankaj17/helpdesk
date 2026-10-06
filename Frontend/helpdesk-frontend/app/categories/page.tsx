'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import Navbar from '@/components/Navbar';
import AuthGuard from '@/components/AuthGuard';
import { api } from '@/lib/api';
import { TicketCategory, Ticket } from '@/types';
import { useAuth } from '@/context/AuthContext';
import { useToast } from '@/context/ToastContext';
import { useConfirmModal } from '@/components/ConfirmModal';
import { 
  Layers, 
  Plus, 
  X, 
  ArrowRight, 
  Ticket as TicketIcon, 
  Check, 
  RefreshCw,
  Edit2,
  Trash2,
  Inbox
} from 'lucide-react';

export default function CategoriesPage() {
  return (
    <AuthGuard allowedRoles={['ADMIN', 'SUPPORT_MANAGER']}>
      <CategoriesContent />
    </AuthGuard>
  );
}

function CategoriesContent() {
  const { hasPermission } = useAuth();
  const { toast } = useToast();
  const { confirm, ConfirmModalElement } = useConfirmModal();
  const [categories, setCategories] = useState<TicketCategory[]>([]);
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  
  // Create Category state
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');

  // Edit Category state
  const [editingCategory, setEditingCategory] = useState<TicketCategory | null>(null);
  const [editName, setEditName] = useState('');
  const [editDescription, setEditDescription] = useState('');
  const [isSavingEdit, setIsSavingEdit] = useState(false);

  // Deleting category state
  const [isDeletingId, setIsDeletingId] = useState<number | null>(null);

  const loadData = async () => {
    setIsLoading(true);
    try {
      const [catList, ticketList] = await Promise.all([
        api.categories.getAll().catch(() => []),
        api.tickets.getAll().catch(() => []),
      ]);
      setCategories(catList || []);
      setTickets(ticketList || []);
    } catch {
      setCategories([]);
      setTickets([]);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    try {
      await api.categories.create({ name: name.trim(), description: description.trim() });
      setName('');
      setDescription('');
      setIsCreateModalOpen(false);
      toast.success(`Category "${name.trim()}" created successfully.`);
      await loadData();
    } catch (err: any) {
      toast.error(err.message || 'Failed to create category');
    }
  };

  const handleOpenEditModal = (cat: TicketCategory) => {
    setEditingCategory(cat);
    setEditName(cat.name);
    setEditDescription(cat.description || '');
  };

  const handleSaveEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingCategory || !editName.trim() || isSavingEdit) return;
    setIsSavingEdit(true);
    try {
      await api.categories.update(editingCategory.categoryId, {
        name: editName.trim(),
        description: editDescription.trim(),
      });
      setEditingCategory(null);
      toast.success(`Category "${editName.trim()}" updated successfully.`);
      await loadData();
    } catch (err: any) {
      toast.error(err.message || 'Failed to update category');
    } finally {
      setIsSavingEdit(false);
    }
  };

  const handleDeleteCategory = async (cat: TicketCategory) => {
    const confirmed = await confirm({
      title: 'Delete Category',
      message: `Are you sure you want to delete category "${cat.name}"? Existing tickets in this category will be unassigned from it.`,
      confirmText: 'Delete Category',
      confirmVariant: 'danger',
    });
    if (!confirmed) return;

    setIsDeletingId(cat.categoryId);
    try {
      await api.categories.delete(cat.categoryId);
      toast.success(`Category "${cat.name}" deleted successfully.`);
      await loadData();
    } catch (err: any) {
      toast.error(err.message || 'Failed to delete category');
    } finally {
      setIsDeletingId(null);
    }
  };

  const totalAssignedTickets = tickets.length;

  return (
    <div className="min-h-screen bg-[#F4F6FB] pb-16">
      <Navbar />

      <main className="max-w-[1400px] mx-auto px-4 sm:px-6 space-y-6">
        {/* Page Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-extrabold text-[#0B132B] tracking-tight">
              Ticket Categories
            </h1>
            <p className="text-xs text-slate-400 mt-1">
              Organize departments and categories for incoming support tickets
            </p>
          </div>

          <div className="flex items-center gap-2.5">
            {hasPermission('CATEGORY_MANAGE') && (
              <button
                onClick={() => setIsCreateModalOpen(true)}
                className="flex items-center gap-1.5 px-5 py-2 rounded-full text-xs font-semibold bg-[#0B132B] hover:bg-slate-800 text-white shadow-xs transition-all cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>New Category</span>
              </button>
            )}

            <button
              onClick={loadData}
              disabled={isLoading}
              className="w-8 h-8 rounded-full bg-white border border-slate-200 flex items-center justify-center text-slate-600 hover:text-slate-900 shadow-2xs cursor-pointer"
              title="Refresh categories"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
            </button>
          </div>
        </div>

        {/* High-Level Overview Metrics */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="pill-card p-4 flex items-center gap-3.5">
            <div className="w-10 h-10 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center shrink-0">
              <Layers className="w-5 h-5" />
            </div>
            <div>
              <span className="text-[11px] font-medium text-slate-400 block">Total Categories</span>
              <span className="text-lg font-bold text-slate-900">{categories.length}</span>
            </div>
          </div>

          <div className="pill-card p-4 flex items-center gap-3.5">
            <div className="w-10 h-10 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">
              <TicketIcon className="w-5 h-5" />
            </div>
            <div>
              <span className="text-[11px] font-medium text-slate-400 block">Total Tickets Categorized</span>
              <span className="text-lg font-bold text-slate-900">{totalAssignedTickets}</span>
            </div>
          </div>
        </div>

        {/* Categories Grid */}
        {categories.length === 0 ? (
          <div className="pill-card p-12 text-center text-xs text-slate-400">
            No ticket categories configured. Click &quot;+ New Category&quot; to create one.
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {categories.map((cat) => {
              const catTickets = tickets.filter(t => t.categoryId === cat.categoryId);
              const count = cat.ticketCount !== undefined ? cat.ticketCount : catTickets.length;
              const isDeleting = isDeletingId === cat.categoryId;

              return (
                <div key={cat.categoryId} className="pill-card p-6 flex flex-col justify-between hover:shadow-md transition-shadow">
                  <div>
                    {/* Top Badges */}
                    <div className="flex items-center justify-between mb-3">
                      <div className="w-10 h-10 rounded-2xl bg-slate-100 flex items-center justify-center text-slate-700">
                        <Layers className="w-5 h-5" />
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-indigo-50 text-indigo-700 border border-indigo-100">
                          {count} {count === 1 ? 'Ticket' : 'Tickets'}
                        </span>
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-slate-100 text-slate-500">
                          #{cat.categoryId}
                        </span>
                      </div>
                    </div>

                    <h3 className="text-lg font-bold text-[#0B132B] mb-1.5">
                      {cat.name}
                    </h3>
                    <p className="text-xs text-slate-500 leading-relaxed mb-4 min-h-[36px]">
                      {cat.description || 'Category for support tickets.'}
                    </p>
                  </div>

                  {/* Actions & Routing Footer */}
                  <div className="pt-4 border-t border-slate-100 space-y-2.5">
                    {/* Management Controls */}
                    {hasPermission('CATEGORY_MANAGE') && (
                      <div className="flex items-center justify-end gap-2">
                        {/* Edit Category Button */}
                        <button
                          onClick={() => handleOpenEditModal(cat)}
                          className="px-3 py-1 rounded-full text-xs font-semibold bg-slate-100 hover:bg-slate-200 text-slate-800 transition-colors cursor-pointer flex items-center gap-1"
                          title="Edit category details"
                        >
                          <Edit2 className="w-3 h-3 text-slate-600" />
                          <span>Edit</span>
                        </button>

                        {/* Delete Category Button */}
                        <button
                          onClick={() => handleDeleteCategory(cat)}
                          disabled={isDeleting}
                          className="px-3 py-1 rounded-full text-xs font-semibold bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200/60 transition-colors cursor-pointer flex items-center gap-1 disabled:opacity-50"
                          title="Delete category"
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

                    {/* View in Queue Link (Filters Tickets page by categoryId) */}
                    <Link
                      href={`/tickets?categoryId=${cat.categoryId}`}
                      className="w-full flex items-center justify-center gap-1.5 py-1.5 rounded-full text-xs font-semibold bg-[#0B132B] hover:bg-slate-800 text-white shadow-2xs transition-all cursor-pointer"
                    >
                      <span>View Tickets</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </Link>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </main>

      {/* Edit Category Modal */}
      {editingCategory && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs animate-in fade-in">
          <div className="fixed inset-0" onClick={() => setEditingCategory(null)} />
          <div className="relative bg-white w-full max-w-md rounded-3xl shadow-2xl border border-slate-100 p-6 z-10">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100 mb-4">
              <h3 className="text-base font-bold text-[#0B132B]">Edit Category</h3>
              <button onClick={() => setEditingCategory(null)} className="p-1 rounded-full hover:bg-slate-100 text-slate-400">
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveEdit} className="space-y-4 text-xs">
              <div>
                <label className="block text-slate-600 font-semibold mb-1">Category Name</label>
                <input
                  type="text"
                  required
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  className="w-full px-4 py-2 rounded-xl bg-slate-50 border border-slate-200 text-slate-800 focus:outline-none focus:ring-1 focus:ring-slate-900"
                />
              </div>

              <div>
                <label className="block text-slate-600 font-semibold mb-1">Description</label>
                <textarea
                  rows={3}
                  value={editDescription}
                  onChange={(e) => setEditDescription(e.target.value)}
                  placeholder="Describe category scope..."
                  className="w-full p-3 rounded-xl bg-slate-50 border border-slate-200 text-slate-800 focus:outline-none focus:ring-1 focus:ring-slate-900"
                />
              </div>

              <div className="pt-4 flex items-center justify-end gap-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setEditingCategory(null)}
                  className="px-4 py-2 rounded-full text-xs font-semibold text-slate-600 hover:bg-slate-100"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSavingEdit || !editName.trim()}
                  className="px-6 py-2 rounded-full text-xs font-semibold bg-[#0B132B] text-white hover:bg-slate-800 shadow-xs cursor-pointer flex items-center gap-1.5"
                >
                  {isSavingEdit && <RefreshCw className="w-3 h-3 animate-spin" />}
                  <span>Save Changes</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Create Category Modal */}
      {isCreateModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs animate-in fade-in">
          <div className="fixed inset-0" onClick={() => setIsCreateModalOpen(false)} />
          <div className="relative bg-white w-full max-w-md rounded-3xl shadow-2xl border border-slate-100 p-6 z-10">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100 mb-4">
              <h3 className="text-base font-bold text-[#0B132B]">Add Ticket Category</h3>
              <button onClick={() => setIsCreateModalOpen(false)} className="p-1 rounded-full hover:bg-slate-100 text-slate-400">
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleCreate} className="space-y-4 text-xs">
              <div>
                <label className="block text-slate-600 font-semibold mb-1">Category Name</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Database & Storage"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full px-4 py-2 rounded-xl bg-slate-50 border border-slate-200 text-slate-800 focus:outline-none focus:ring-1 focus:ring-slate-900"
                />
              </div>

              <div>
                <label className="block text-slate-600 font-semibold mb-1">Description</label>
                <textarea
                  rows={3}
                  required
                  placeholder="Describe category scope..."
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="w-full p-3 rounded-xl bg-slate-50 border border-slate-200 text-slate-800 focus:outline-none focus:ring-1 focus:ring-slate-900"
                />
              </div>

              <div className="pt-4 flex items-center justify-end gap-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsCreateModalOpen(false)}
                  className="px-4 py-2 rounded-full text-xs font-semibold text-slate-600 hover:bg-slate-100"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-6 py-2 rounded-full text-xs font-semibold bg-[#0B132B] text-white hover:bg-slate-800 shadow-xs cursor-pointer"
                >
                  Save Category
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
