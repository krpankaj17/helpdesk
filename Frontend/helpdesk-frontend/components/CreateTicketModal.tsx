'use client';

import React, { useState, useEffect, useRef } from 'react';
import { CreateTicketRequest, TicketCategory, Priority, CreateAttachmentPayload } from '@/types';
import { useAuth } from '@/context/AuthContext';
import { useToast } from '@/context/ToastContext';
import { api } from '@/lib/api';
import { X, PlusCircle, Layers, Tag, Paperclip, FileText, RefreshCw } from 'lucide-react';

interface CreateTicketModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (ticketData: CreateTicketRequest) => void;
  categories: TicketCategory[];
  priorities?: Priority[];
  defaultCategoryId?: number;
}

export default function CreateTicketModal({
  isOpen,
  onClose,
  onSubmit,
  categories,
  priorities = [
    { priorityId: 1, name: 'URGENT' },
    { priorityId: 2, name: 'HIGH' },
    { priorityId: 3, name: 'MEDIUM' },
    { priorityId: 4, name: 'LOW' },
  ],
  defaultCategoryId,
}: CreateTicketModalProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState<number>(defaultCategoryId || categories[0]?.categoryId || 1);
  const [priority, setPriority] = useState<number>(2); // Default to HIGH
  const [attachments, setAttachments] = useState<CreateAttachmentPayload[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (defaultCategoryId) {
      setCategory(defaultCategoryId);
    } else if (categories.length > 0 && !category) {
      setCategory(categories[0].categoryId || (categories[0] as any).id || 1);
    }
  }, [categories, category, defaultCategoryId]);

  if (!isOpen) return null;

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setIsUploading(true);
    try {
      const res = await api.tickets.upload(file);
      setAttachments(prev => [...prev, {
        title: (res.title || file.name).substring(0, 50),
        description: res.description || `${(file.size / 1024).toFixed(1)} KB`,
        url: res.url,
      }]);
      toast.success(`Attached: ${file.name}`);
    } catch (err: any) {
      toast.error(err.message || `Failed to upload ${file.name}`);
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const removeAttachment = (index: number) => {
    setAttachments(prev => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title || !description) return;

    onSubmit({
      title,
      description,
      category: Number(category || categories[0]?.categoryId || 1),
      priority: Number(priority),
      attachments: attachments.length > 0 ? attachments : undefined,
    });

    setTitle('');
    setDescription('');
    setAttachments([]);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs animate-in fade-in">
      <div 
        className="fixed inset-0"
        onClick={onClose}
      />
      <div className="relative bg-white w-full max-w-lg rounded-3xl shadow-2xl border border-slate-100 p-6 sm:p-8 z-10">
        <div className="flex items-center justify-between pb-4 border-b border-slate-100 mb-5">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-full bg-[#0B132B] text-white flex items-center justify-center">
              <PlusCircle className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-[#0B132B]">
                Create HelpDesk Ticket
              </h2>
              <p className="text-xs text-slate-400">
                Log a technical outage, software bug, or access request
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
            <label className="block text-slate-600 font-semibold mb-1">Incident Title / Summary</label>
            <input
              type="text"
              required
              placeholder="e.g. Production API Gateway 504 Gateway Timeout"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full px-4 py-2 rounded-xl bg-slate-50 border border-slate-200 text-slate-800 focus:outline-none focus:ring-2 focus:ring-slate-900/10"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-slate-600 font-semibold mb-1">Ticket Category</label>
              <select
                value={category}
                onChange={(e) => setCategory(Number(e.target.value))}
                className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-slate-800 font-medium focus:outline-none"
              >
                {categories.map((c, idx) => {
                  const catId = c.categoryId || (c as any).id || (idx + 1);
                  return (
                    <option key={catId} value={catId}>{c.name}</option>
                  );
                })}
              </select>
            </div>

            <div>
              <label className="block text-slate-600 font-semibold mb-1">Priority Level</label>
              <select
                value={priority}
                onChange={(e) => setPriority(Number(e.target.value))}
                className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-slate-800 font-medium focus:outline-none"
              >
                {priorities.map((p) => (
                  <option key={p.priorityId} value={p.priorityId}>
                    {p.name} {p.name === 'URGENT' ? '(P1 - 1hr SLA)' : p.name === 'HIGH' ? '(P2 - 2hr SLA)' : ''}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className="block text-slate-600 font-semibold mb-1">Detailed Description</label>
            <textarea
              rows={3}
              required
              placeholder="Provide steps to reproduce, affected endpoints, or error stack trace..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full p-3 rounded-xl bg-slate-50 border border-slate-200 text-slate-800 focus:outline-none focus:ring-2 focus:ring-slate-900/10"
            />
          </div>

          {/* Attachments Section */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-slate-600 font-semibold flex items-center gap-1.5">
                <Paperclip className="w-3.5 h-3.5 text-slate-500" />
                <span>Attachments</span>
              </label>
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                disabled={isUploading}
                className="text-[11px] font-semibold text-slate-700 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 px-3 py-1 rounded-full cursor-pointer flex items-center gap-1 transition-colors"
              >
                {isUploading ? <RefreshCw className="w-3 h-3 animate-spin" /> : <Paperclip className="w-3 h-3" />}
                <span>{isUploading ? 'Uploading...' : 'Attach File'}</span>
              </button>
              <input
                ref={fileInputRef}
                type="file"
                className="hidden"
                onChange={handleFileUpload}
              />
            </div>

            {attachments.length > 0 && (
              <div className="space-y-1.5 mt-2">
                {attachments.map((att, idx) => (
                  <div key={idx} className="flex items-center justify-between px-3 py-1.5 rounded-xl bg-slate-50 border border-slate-200 text-xs">
                    <div className="flex items-center gap-2 truncate max-w-[85%]">
                      <FileText className="w-3.5 h-3.5 text-slate-500 shrink-0" />
                      <span className="font-medium text-slate-800 truncate">{att.title}</span>
                      {att.description && <span className="text-[10px] text-slate-400">({att.description})</span>}
                    </div>
                    <button
                      type="button"
                      onClick={() => removeAttachment(idx)}
                      className="p-1 rounded-full hover:bg-slate-200 text-slate-400 hover:text-slate-700 cursor-pointer"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </div>
                ))}
              </div>
            )}
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
              Submit Ticket
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
