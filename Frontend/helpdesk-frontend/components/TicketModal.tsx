'use client';

import React, { useState, useEffect, useRef } from 'react';
import { 
  Ticket, 
  TicketStatus, 
  User, 
  TicketComment, 
  TicketNote, 
  TicketActivity, 
  TicketAssignment,
  TicketCategory,
  CreateAttachmentPayload,
  AttachmentResponse
} from '@/types';
import { useAuth } from '@/context/AuthContext';
import { useToast } from '@/context/ToastContext';
import { api } from '@/lib/api';
import { 
  X, 
  Send, 
  Lock, 
  CheckCircle,
  MessageSquare,
  FileText,
  History,
  RefreshCw,
  CheckCircle2,
  Check,
  Paperclip
} from 'lucide-react';

interface TicketModalProps {
  ticket: Ticket | null;
  isOpen: boolean;
  onClose: () => void;
  onUpdateStatus?: (ticketId: string, status: TicketStatus, resolutionNote?: string) => Promise<void> | void;
  onAssignTicket?: (ticketId: string, agentEmail: string, agentName: string) => Promise<void> | void;
  onUpdateCategory?: (ticketId: string, categoryId: number) => Promise<void> | void;
  agents?: User[];
  categories?: TicketCategory[];
}

export default function TicketModal({
  ticket,
  isOpen,
  onClose,
  onUpdateStatus,
  onAssignTicket,
  onUpdateCategory,
  agents = [],
  categories = [],
}: TicketModalProps) {
  const { role, user, hasPermission } = useAuth();
  const { toast } = useToast();
  
  const [activeTab, setActiveTab] = useState<'comments' | 'notes' | 'activity' | 'assignments'>('comments');
  const [comments, setComments] = useState<TicketComment[]>([]);
  const [notes, setNotes] = useState<TicketNote[]>([]);
  const [activities, setActivities] = useState<TicketActivity[]>([]);
  const [assignments, setAssignments] = useState<TicketAssignment[]>([]);
  
  const [isLoadingFeed, setIsLoadingFeed] = useState(false);
  const [commentInput, setCommentInput] = useState('');
  const [noteInput, setNoteInput] = useState('');
  const [isSubmittingComment, setIsSubmittingComment] = useState(false);
  const [isSubmittingNote, setIsSubmittingNote] = useState(false);

  // Attachments state for comments & notes
  const [commentAttachments, setCommentAttachments] = useState<CreateAttachmentPayload[]>([]);
  const [isUploadingCommentAtt, setIsUploadingCommentAtt] = useState(false);
  const commentFileRef = useRef<HTMLInputElement>(null);

  const [noteAttachments, setNoteAttachments] = useState<CreateAttachmentPayload[]>([]);
  const [isUploadingNoteAtt, setIsUploadingNoteAtt] = useState(false);
  const noteFileRef = useRef<HTMLInputElement>(null);

  // Staged / Draft edits: nothing is saved until the user clicks "Save Changes"
  const [draftStatus, setDraftStatus] = useState<TicketStatus>('OPEN');
  const [draftCategoryId, setDraftCategoryId] = useState<number>(0);
  const [draftAgentEmail, setDraftAgentEmail] = useState<string>('');
  const [draftResolutionNote, setDraftResolutionNote] = useState<string>('');
  const [isSavingChanges, setIsSavingChanges] = useState(false);
  const [saveSuccessMsg, setSaveSuccessMsg] = useState<string | null>(null);

  const canUpdateStatus = hasPermission('TICKET_UPDATE');
  const canAssign = hasPermission('TICKET_ASSIGN');
  const canInternalNotes = hasPermission('INTERNAL_NOTE_READ');
  const canChangeCategory = role === 'ADMIN' || role === 'SUPPORT_MANAGER' || role === 'SUPPORT_AGENT' || hasPermission('TICKET_UPDATE');
  const isAgent = role === 'SUPPORT_AGENT' || (role as string) === 'AGENT';
  const canCloseTicket = role === 'ADMIN' || role === 'SUPPORT_MANAGER';
  const availableStatuses: TicketStatus[] = canCloseTicket
    ? ['OPEN', 'IN_PROGRESS', 'WAITING_ON_REQUESTOR', 'RESOLVED', 'CLOSED']
    : ['OPEN', 'IN_PROGRESS', 'WAITING_ON_REQUESTOR', 'RESOLVED'];

  // Load ticket discussions, notes, activities & assignments from Spring Boot
  const loadTicketData = async (ticketId: string) => {
    setIsLoadingFeed(true);
    try {
      const promises: [
        Promise<TicketComment[]>,
        Promise<TicketActivity[]>,
        Promise<TicketNote[]>,
        Promise<TicketAssignment[]>
      ] = [
        api.tickets.getComments(ticketId).catch(() => []),
        api.tickets.getActivities(ticketId).catch(() => []),
        canInternalNotes ? api.tickets.getNotes(ticketId).catch(() => []) : Promise.resolve([]),
        api.tickets.getAssignments(ticketId).catch(() => [])
      ];

      const [cList, aList, nList, asList] = await Promise.all(promises);
      setComments(cList || []);
      setActivities(aList || []);
      setNotes(nList || []);
      setAssignments(asList || []);
    } catch {
      // Fail silently to keep UI clean
    } finally {
      setIsLoadingFeed(false);
    }
  };

  // Sync draft edits whenever the modal opens or a different ticket is selected
  useEffect(() => {
    if (isOpen && ticket?.ticketPublicId) {
      loadTicketData(ticket.ticketPublicId);
      setDraftStatus(ticket.status);
      setDraftCategoryId(ticket.categoryId);
      setDraftAgentEmail(ticket.assignedAgentEmail || '');
      setDraftResolutionNote('');
      setSaveSuccessMsg(null);
      setCommentInput('');
      setNoteInput('');
    }
  }, [isOpen, ticket?.ticketPublicId]);

  if (!isOpen || !ticket) return null;

  // Track if any changes have been made locally
  const hasStatusChanged = draftStatus !== ticket.status;
  const hasCategoryChanged = draftCategoryId !== ticket.categoryId;
  const hasAgentChanged = (draftAgentEmail || '').toLowerCase() !== (ticket.assignedAgentEmail || '').toLowerCase();
  const hasChanges = hasStatusChanged || hasCategoryChanged || hasAgentChanged;

  // Discard all unsaved edits and reset back to original ticket values
  const handleDiscardChanges = () => {
    setDraftStatus(ticket.status);
    setDraftCategoryId(ticket.categoryId);
    setDraftAgentEmail(ticket.assignedAgentEmail || '');
    setDraftResolutionNote('');
  };

  // Commit all staged edits to backend when user explicitly clicks "Save Changes"
  const handleSaveChanges = async () => {
    if (!hasChanges || isSavingChanges) return;

    if (draftStatus === 'RESOLVED' && hasStatusChanged && !draftResolutionNote.trim()) {
      toast.warning('Please enter a resolution note before saving this incident as Resolved.');
      return;
    }

    setIsSavingChanges(true);
    try {
      // 1. Update Category if changed
      if (hasCategoryChanged && onUpdateCategory) {
        await onUpdateCategory(ticket.ticketPublicId, draftCategoryId);
        const newCat = categories.find(c => c.categoryId === draftCategoryId);
        if (newCat) {
          ticket.categoryId = draftCategoryId;
          ticket.categoryName = newCat.name;
        }
      }

      // 2. Update Assigned Agent if changed
      if (hasAgentChanged && onAssignTicket) {
        const foundAgent = agents.find(a => a.email.toLowerCase() === draftAgentEmail.toLowerCase());
        const agentName = foundAgent?.name || (draftAgentEmail === '' ? 'Unassigned' : draftAgentEmail);
        await onAssignTicket(ticket.ticketPublicId, draftAgentEmail, agentName);
        ticket.assignedAgentEmail = draftAgentEmail || undefined;
        ticket.assignedAgentName = agentName === 'Unassigned' ? undefined : agentName;
      }

      // 3. Update Status if changed
      if (hasStatusChanged && onUpdateStatus) {
        await onUpdateStatus(
          ticket.ticketPublicId, 
          draftStatus, 
          draftStatus === 'RESOLVED' ? draftResolutionNote.trim() : undefined
        );
        ticket.status = draftStatus;
      }

      await loadTicketData(ticket.ticketPublicId);
      toast.success('Changes saved successfully!');
      setSaveSuccessMsg('Saved successfully!');
      setTimeout(() => setSaveSuccessMsg(null), 3000);
    } catch (err: any) {
      toast.error(err.message || 'Failed to save changes');
    } finally {
      setIsSavingChanges(false);
    }
  };

  // Upload file for comment
  const handleCommentFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setIsUploadingCommentAtt(true);
    try {
      const res = await api.tickets.upload(file);
      setCommentAttachments(prev => [...prev, {
        title: (res.title || file.name).substring(0, 50),
        description: res.description || `${(file.size / 1024).toFixed(1)} KB`,
        url: res.url,
      }]);
      toast.success(`Attached: ${file.name}`);
    } catch (err: any) {
      toast.error(err.message || `Failed to upload ${file.name}`);
    } finally {
      setIsUploadingCommentAtt(false);
      if (commentFileRef.current) commentFileRef.current.value = '';
    }
  };

  // Upload file for note
  const handleNoteFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setIsUploadingNoteAtt(true);
    try {
      const res = await api.tickets.upload(file);
      setNoteAttachments(prev => [...prev, {
        title: (res.title || file.name).substring(0, 50),
        description: res.description || `${(file.size / 1024).toFixed(1)} KB`,
        url: res.url,
      }]);
      toast.success(`Attached: ${file.name}`);
    } catch (err: any) {
      toast.error(err.message || `Failed to upload ${file.name}`);
    } finally {
      setIsUploadingNoteAtt(false);
      if (noteFileRef.current) noteFileRef.current.value = '';
    }
  };

  // Post public comment
  const handleAddComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if ((!commentInput.trim() && commentAttachments.length === 0) || isSubmittingComment) return;

    setIsSubmittingComment(true);
    try {
      const text = commentInput.trim() || (commentAttachments.length > 0 ? `Shared attachment(s): ${commentAttachments.map(a => a.title).join(', ')}` : '');
      const created = await api.tickets.addComment(ticket.ticketPublicId, text, commentAttachments);
      setComments(prev => [...prev, created]);
      setCommentInput('');
      setCommentAttachments([]);
      const updatedActs = await api.tickets.getActivities(ticket.ticketPublicId).catch(() => []);
      setActivities(updatedActs);
      toast.success('Comment posted successfully');
    } catch (err: any) {
      toast.error(err.message || 'Failed to post comment');
    } finally {
      setIsSubmittingComment(false);
    }
  };

  // Post internal staff note
  const handleAddNote = async (e: React.FormEvent) => {
    e.preventDefault();
    if ((!noteInput.trim() && noteAttachments.length === 0) || isSubmittingNote) return;

    setIsSubmittingNote(true);
    try {
      const text = noteInput.trim() || (noteAttachments.length > 0 ? `Internal attachment(s): ${noteAttachments.map(a => a.title).join(', ')}` : '');
      const created = await api.tickets.addNote(ticket.ticketPublicId, text, noteAttachments);
      setNotes(prev => [...prev, created]);
      setNoteInput('');
      setNoteAttachments([]);
      const updatedActs = await api.tickets.getActivities(ticket.ticketPublicId).catch(() => []);
      setActivities(updatedActs);
      toast.success('Internal note added');
    } catch (err: any) {
      toast.error(err.message || 'Failed to post internal note');
    } finally {
      setIsSubmittingNote(false);
    }
  };

  const formatDateTime = (isoStr?: string) => {
    if (!isoStr) return '';
    try {
      const d = new Date(isoStr);
      return d.toLocaleString('en-US', {
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      });
    } catch {
      return isoStr;
    }
  };

  // Find category & agent names for display
  const currentCategoryDisplay = categories.find(c => c.categoryId === draftCategoryId)?.name || ticket.categoryName || 'Unassigned';
  const currentAgentDisplay = draftAgentEmail
    ? (agents.find(a => a.email.toLowerCase() === draftAgentEmail.toLowerCase())?.name || draftAgentEmail)
    : (ticket.assignedAgentName || 'Unassigned');

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/50 backdrop-blur-xs animate-in fade-in">
      <div 
        className="fixed inset-0"
        onClick={onClose}
      />
      <div className="relative bg-white w-full max-w-3xl rounded-3xl shadow-2xl border border-slate-100 p-5 sm:p-7 z-10 max-h-[92vh] flex flex-col overflow-hidden">
        {/* Header with Title, Status Badges, and Save Button */}
        <div className="flex items-start justify-between pb-4 border-b border-slate-100 shrink-0 gap-3">
          <div>
            <div className="flex flex-wrap items-center gap-2 mb-1.5">
              <span className="font-mono text-xs font-bold text-slate-400">
                {ticket.ticketPublicId.substring(0, 8).toUpperCase()}
              </span>
              <span className="px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-slate-100 text-slate-700">
                {currentCategoryDisplay}
              </span>
              <span className={`px-2.5 py-0.5 rounded-full text-[11px] font-bold ${
                ticket.priorityName === 'URGENT' ? 'bg-rose-50 text-rose-700 border border-rose-200' :
                ticket.priorityName === 'HIGH' ? 'bg-amber-50 text-amber-700 border border-amber-200' :
                ticket.priorityName === 'MEDIUM' ? 'bg-blue-50 text-blue-700 border border-blue-200' :
                'bg-slate-50 text-slate-700 border border-slate-200'
              }`}>
                {ticket.priorityName}
              </span>
              <span className={`px-2.5 py-0.5 rounded-full text-[11px] font-bold ${
                draftStatus === 'RESOLVED' ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' :
                draftStatus === 'IN_PROGRESS' ? 'bg-blue-50 text-blue-700 border border-blue-200' :
                draftStatus === 'WAITING_ON_REQUESTOR' ? 'bg-amber-50 text-amber-700 border border-amber-200' :
                draftStatus === 'CLOSED' ? 'bg-slate-200 text-slate-700' :
                'bg-slate-100 text-slate-700'
              }`}>
                {draftStatus.replace(/_/g, ' ')}
              </span>
              {hasChanges && (
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-900 border border-amber-300">
                  Unsaved Edits
                </span>
              )}
            </div>
            <h2 className="text-xl font-extrabold text-[#0B132B] tracking-tight">
              {ticket.title}
            </h2>
          </div>

          {/* Action Header: Save Changes Button + Close */}
          <div className="flex items-center gap-2 shrink-0">
            {saveSuccessMsg && (
              <span className="hidden sm:inline-block text-xs text-emerald-700 font-semibold bg-emerald-50 px-2.5 py-1 rounded-full border border-emerald-200">
                ✓ {saveSuccessMsg}
              </span>
            )}

            <button
              type="button"
              disabled={!hasChanges || isSavingChanges}
              onClick={handleSaveChanges}
              className={`flex items-center gap-1.5 px-4 py-1.5 rounded-full text-xs font-bold transition-all shadow-xs ${
                hasChanges
                  ? 'bg-[#0B132B] hover:bg-slate-800 text-white cursor-pointer'
                  : 'bg-slate-100 text-slate-400 cursor-not-allowed border border-slate-200'
              }`}
              title={hasChanges ? 'Save your changes to this ticket' : 'No changes to save'}
            >
              {isSavingChanges ? (
                <>
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                  <span>Saving...</span>
                </>
              ) : (
                <>
                  <Check className="w-3.5 h-3.5" />
                  <span>Save</span>
                </>
              )}
            </button>

            <button
              onClick={onClose}
              className="p-1.5 rounded-full text-slate-400 hover:text-slate-800 hover:bg-slate-100 transition-colors cursor-pointer"
              title="Close modal"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Scrollable Modal Content */}
        <div className="py-4 space-y-5 overflow-y-auto flex-1 pr-1">
          {/* Description */}
          <div>
            <h4 className="text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-1.5">
              Incident Description
            </h4>
            <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-100 text-xs text-slate-700 leading-relaxed whitespace-pre-wrap">
              {ticket.description || 'No detailed description provided.'}
            </div>
          </div>

          {/* Ticket Attachments */}
          {ticket.attachments && ticket.attachments.length > 0 && (
            <div>
              <h4 className="text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-1.5 flex items-center gap-1.5">
                <Paperclip className="w-3.5 h-3.5 text-slate-400" />
                <span>Ticket Attachments ({ticket.attachments.length})</span>
              </h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {ticket.attachments.map((att, idx) => (
                  <a
                    key={idx}
                    href={att.url || att.fileUrl || '#'}
                    target="_blank"
                    rel="noreferrer"
                    className="p-2.5 rounded-xl bg-slate-50 border border-slate-200/80 hover:bg-slate-100 flex items-center justify-between text-xs transition-colors group cursor-pointer"
                  >
                    <div className="flex items-center gap-2 truncate pr-2">
                      <FileText className="w-4 h-4 text-slate-500 shrink-0" />
                      <div className="truncate">
                        <span className="font-semibold text-slate-800 block truncate group-hover:text-blue-600">
                          {att.title || att.fileName}
                        </span>
                        {att.description && (
                          <span className="text-[10px] text-slate-400 block truncate">
                            {att.description}
                          </span>
                        )}
                      </div>
                    </div>
                    <span className="text-[10px] font-bold text-slate-400 group-hover:text-slate-700">↗</span>
                  </a>
                ))}
              </div>
            </div>
          )}

          {/* Meta Grid */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 text-xs">
            {/* Requester */}
            <div className="p-3 rounded-2xl bg-slate-50/80 border border-slate-100">
              <span className="text-slate-400 block text-[11px] font-medium mb-0.5">Requester</span>
              <span className="font-bold text-slate-800 block truncate">{ticket.requestorName}</span>
              <span className="text-[10px] text-slate-500 block truncate">{ticket.requestorEmail}</span>
            </div>

            {/* Category (Draft selection - only saved on Save button click) */}
            <div className={`p-3 rounded-2xl border transition-all ${
              hasCategoryChanged ? 'bg-amber-50/50 border-amber-300' : 'bg-slate-50/80 border border-slate-100'
            }`}>
              <div className="flex items-center justify-between mb-0.5">
                <span className="text-slate-400 block text-[11px] font-medium">Category</span>
                {hasCategoryChanged && <span className="text-[10px] text-amber-700 font-bold">Unsaved</span>}
              </div>
              <span className="font-bold text-slate-800 block truncate">
                {currentCategoryDisplay}
              </span>
              {canChangeCategory && categories.length > 0 && (
                <select
                  value={draftCategoryId}
                  onChange={(e) => setDraftCategoryId(Number(e.target.value))}
                  className="mt-1 text-[11px] bg-white border border-slate-200 rounded-lg px-2 py-0.5 text-slate-700 font-medium w-full focus:outline-none cursor-pointer"
                >
                  {categories.map((c) => (
                    <option key={c.categoryId} value={c.categoryId}>
                      {c.name}
                    </option>
                  ))}
                </select>
              )}
            </div>

            {/* Assigned Agent (Draft selection - only saved on Save button click) */}
            <div className={`p-3 rounded-2xl border transition-all ${
              hasAgentChanged ? 'bg-amber-50/50 border-amber-300' : 'bg-slate-50/80 border border-slate-100'
            }`}>
              <div className="flex items-center justify-between mb-0.5">
                <span className="text-slate-400 block text-[11px] font-medium">Assigned Agent</span>
                {hasAgentChanged && <span className="text-[10px] text-amber-700 font-bold">Unsaved</span>}
              </div>
              <span className="font-bold text-slate-800 block truncate">
                {isAgent ? (ticket.assignedAgentName || user?.name || 'Assigned to You') : currentAgentDisplay}
              </span>
              {canAssign && (
                <select
                  value={draftAgentEmail}
                  onChange={(e) => setDraftAgentEmail(e.target.value)}
                  className="mt-1 text-[11px] bg-white border border-slate-200 rounded-lg px-2 py-0.5 text-slate-700 font-medium w-full focus:outline-none cursor-pointer"
                >
                  <option value="">Unassigned</option>
                  {agents.map(a => (
                    <option key={a.email} value={a.email}>{a.name} ({a.roleName})</option>
                  ))}
                </select>
              )}
            </div>

            {/* Created Timestamp */}
            <div className="p-3 rounded-2xl bg-slate-50/80 border border-slate-100">
              <span className="text-slate-400 block text-[11px] font-medium mb-0.5">Created Date</span>
              <span className="font-bold text-slate-800 block truncate">
                {formatDateTime(ticket.createdAt)}
              </span>
              <span className="text-[10px] text-slate-400 block truncate">
                Ticket ID: #{ticket.ticketPublicId.substring(0, 8).toUpperCase()}
              </span>
            </div>
          </div>

          {/* Status Control Panel (RBAC Protected) */}
          {canUpdateStatus && (
            <div className={`p-3.5 rounded-2xl border space-y-2.5 transition-all ${
              hasStatusChanged ? 'bg-amber-50/40 border-amber-200' : 'bg-slate-50 border-slate-100'
            }`}>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold text-slate-800">Update Incident Status</span>
                  {hasStatusChanged && (
                    <span className="text-[10px] font-bold text-amber-800 bg-amber-100 px-2 py-0.2 rounded-full">
                      Changed to {draftStatus.replace(/_/g, ' ')} (Click Save to apply)
                    </span>
                  )}
                </div>
                <span className="text-[10px] text-slate-400 font-medium">RBAC Authorized ({role})</span>
              </div>

              <div className="flex flex-wrap items-center gap-1.5">
                {availableStatuses.map((st) => (
                  <button
                    key={st}
                    type="button"
                    onClick={() => setDraftStatus(st)}
                    className={`px-3 py-1 rounded-full text-xs font-semibold transition-all cursor-pointer ${
                      draftStatus === st
                        ? 'bg-[#0B132B] text-white shadow-xs'
                        : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-100 hover:text-slate-900'
                    }`}
                  >
                    {st.replace(/_/g, ' ')}
                  </button>
                ))}
              </div>

              {/* Resolution Note Field when marking as RESOLVED */}
              {draftStatus === 'RESOLVED' && hasStatusChanged && (
                <div className="mt-3 p-3.5 rounded-2xl bg-white border border-emerald-300 space-y-2 animate-in fade-in">
                  <div className="flex items-center gap-2">
                    <CheckCircle className="w-4 h-4 text-emerald-600" />
                    <span className="text-xs font-bold text-slate-900">
                      Resolution Note Required (Audit Record)
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-500">
                    Explain what actions were taken to resolve this incident before saving.
                  </p>
                  <textarea
                    rows={2}
                    required
                    placeholder="Describe how the issue was fixed (e.g. Cleared cache, updated permissions, restarted service)..."
                    value={draftResolutionNote}
                    onChange={(e) => setDraftResolutionNote(e.target.value)}
                    className="w-full p-2.5 rounded-xl text-xs bg-slate-50 border border-slate-200 text-slate-800 focus:outline-none focus:ring-1 focus:ring-slate-900"
                  />
                </div>
              )}
            </div>
          )}

          {/* Unsaved Changes Banner Bar */}
          {hasChanges && (
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 p-3 rounded-2xl bg-amber-50 border border-amber-200">
              <div className="flex items-center gap-2 text-xs">
                <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse shrink-0" />
                <span className="font-semibold text-amber-950">
                  You have unsaved changes. Click &quot;Save Changes&quot; to apply them.
                </span>
              </div>
              <div className="flex items-center gap-2 self-end sm:self-center">
                <button
                  type="button"
                  disabled={isSavingChanges}
                  onClick={handleDiscardChanges}
                  className="px-3 py-1 rounded-full text-xs font-semibold text-slate-600 hover:bg-amber-100 transition-colors cursor-pointer"
                >
                  Discard
                </button>
                <button
                  type="button"
                  disabled={isSavingChanges}
                  onClick={handleSaveChanges}
                  className="flex items-center gap-1.5 px-4 py-1.5 rounded-full text-xs font-bold bg-[#0B132B] hover:bg-slate-800 text-white shadow-xs transition-all cursor-pointer"
                >
                  {isSavingChanges ? (
                    <>
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                      <span>Saving...</span>
                    </>
                  ) : (
                    <>
                      <Check className="w-3.5 h-3.5" />
                      <span>Save Changes</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          )}

          {/* Discussion, Notes, Activities & Assignments Tabs */}
          <div className="border-t border-slate-100 pt-3">
            <div className="flex items-center justify-between mb-3 border-b border-slate-100 pb-2">
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setActiveTab('comments')}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold transition-all cursor-pointer ${
                    activeTab === 'comments'
                      ? 'bg-[#0B132B] text-white shadow-xs'
                      : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                  }`}
                >
                  <MessageSquare className="w-3.5 h-3.5" />
                  <span>Public Comments ({comments.length})</span>
                </button>

                {canInternalNotes && (
                  <button
                    onClick={() => setActiveTab('notes')}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold transition-all cursor-pointer ${
                      activeTab === 'notes'
                        ? 'bg-amber-500 text-white shadow-xs'
                        : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                    }`}
                  >
                    <Lock className="w-3.5 h-3.5" />
                    <span>Staff Notes ({notes.length})</span>
                  </button>
                )}

                <button
                  onClick={() => setActiveTab('activity')}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold transition-all cursor-pointer ${
                    activeTab === 'activity'
                      ? 'bg-[#0B132B] text-white shadow-xs'
                      : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                  }`}
                >
                  <History className="w-3.5 h-3.5" />
                  <span>Activity History ({activities.length})</span>
                </button>
              </div>
            </div>

            {/* TAB CONTENT: Comments */}
            {activeTab === 'comments' && (
              <div className="space-y-4">
                <div className="space-y-3 max-h-52 overflow-y-auto pr-1">
                  {comments.length === 0 ? (
                    <div className="py-6 text-center text-xs text-slate-400">
                      No public comments on this ticket yet.
                    </div>
                  ) : (
                    comments.map((c) => (
                      <div key={c.commentId} className="p-3 rounded-2xl bg-slate-50 border border-slate-100 space-y-1.5">
                        <div className="flex items-center justify-between text-[11px]">
                          <div className="flex items-center gap-1.5 font-bold text-slate-800">
                            <span>{c.userName}</span>
                            <span className="px-1.5 py-0.2 rounded-full text-[9px] font-semibold bg-slate-200 text-slate-600">
                              {c.userRole}
                            </span>
                          </div>
                          <span className="text-[10px] text-slate-400">{formatDateTime(c.createdAt)}</span>
                        </div>
                        <p className="text-xs text-slate-700 leading-relaxed whitespace-pre-wrap">{c.description}</p>
                        
                        {/* Comment Attachments */}
                        {c.attachments && c.attachments.length > 0 && (
                          <div className="flex flex-wrap gap-1.5 pt-1">
                            {c.attachments.map((att, attIdx) => (
                              <a
                                key={attIdx}
                                href={att.url || att.fileUrl || '#'}
                                target="_blank"
                                rel="noreferrer"
                                className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-white border border-slate-200 text-[11px] text-slate-700 hover:text-blue-600 hover:border-slate-300 transition-colors shadow-2xs"
                              >
                                <FileText className="w-3 h-3 text-slate-400 shrink-0" />
                                <span className="font-medium truncate max-w-[160px]">{att.title || att.fileName}</span>
                                <span className="text-[9px] text-slate-400">↗</span>
                              </a>
                            ))}
                          </div>
                        )}
                      </div>
                    ))
                  )}
                </div>

                {/* Attached chips preview for new comment */}
                {commentAttachments.length > 0 && (
                  <div className="flex flex-wrap gap-1.5 px-1">
                    {commentAttachments.map((att, idx) => (
                      <span key={idx} className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] bg-slate-100 border border-slate-200 text-slate-700 font-medium">
                        <FileText className="w-3 h-3 text-slate-500" />
                        <span className="truncate max-w-[140px]">{att.title}</span>
                        <button
                          type="button"
                          onClick={() => setCommentAttachments(prev => prev.filter((_, i) => i !== idx))}
                          className="hover:text-slate-900 cursor-pointer"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      </span>
                    ))}
                  </div>
                )}

                {/* Add Comment Input */}
                <form onSubmit={handleAddComment} className="flex items-center gap-2 pt-1">
                  <input
                    type="text"
                    placeholder="Write a public reply to the requester..."
                    value={commentInput}
                    onChange={(e) => setCommentInput(e.target.value)}
                    className="flex-1 px-3.5 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-1 focus:ring-slate-900 text-slate-800"
                  />
                  <input
                    ref={commentFileRef}
                    type="file"
                    className="hidden"
                    onChange={handleCommentFileUpload}
                  />
                  <button
                    type="button"
                    onClick={() => commentFileRef.current?.click()}
                    disabled={isUploadingCommentAtt}
                    title="Attach file"
                    className="p-2 rounded-xl border border-slate-200 bg-slate-50 text-slate-600 hover:text-slate-900 hover:bg-slate-100 transition-colors cursor-pointer"
                  >
                    {isUploadingCommentAtt ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Paperclip className="w-3.5 h-3.5" />}
                  </button>
                  <button
                    type="submit"
                    disabled={isSubmittingComment || (!commentInput.trim() && commentAttachments.length === 0)}
                    className="px-4 py-2 rounded-xl text-xs font-semibold bg-[#0B132B] hover:bg-slate-800 text-white shadow-xs transition-all disabled:opacity-50 cursor-pointer flex items-center gap-1"
                  >
                    <Send className="w-3.5 h-3.5" />
                    <span>Send</span>
                  </button>
                </form>
              </div>
            )}

            {/* TAB CONTENT: Internal Notes */}
            {activeTab === 'notes' && canInternalNotes && (
              <div className="space-y-4">
                <div className="space-y-3 max-h-52 overflow-y-auto pr-1">
                  {notes.length === 0 ? (
                    <div className="py-6 text-center text-xs text-slate-400">
                      No internal staff notes on this ticket yet.
                    </div>
                  ) : (
                    notes.map((n) => (
                      <div key={n.noteId} className="p-3 rounded-2xl bg-amber-50/60 border border-amber-200/70 space-y-1.5">
                        <div className="flex items-center justify-between text-[11px]">
                          <div className="flex items-center gap-1.5 font-bold text-amber-950">
                            <Lock className="w-3 h-3 text-amber-600" />
                            <span>{n.userName}</span>
                            <span className="px-1.5 py-0.2 rounded-full text-[9px] font-semibold bg-amber-200 text-amber-800">
                              Internal
                            </span>
                          </div>
                          <span className="text-[10px] text-amber-700/70">{formatDateTime(n.createdAt)}</span>
                        </div>
                        <p className="text-xs text-amber-900 leading-relaxed whitespace-pre-wrap">{n.description}</p>

                        {/* Note Attachments */}
                        {n.attachments && n.attachments.length > 0 && (
                          <div className="flex flex-wrap gap-1.5 pt-1">
                            {n.attachments.map((att, attIdx) => (
                              <a
                                key={attIdx}
                                href={att.url || att.fileUrl || '#'}
                                target="_blank"
                                rel="noreferrer"
                                className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-white border border-amber-200 text-[11px] text-amber-900 hover:text-amber-950 hover:border-amber-300 transition-colors shadow-2xs"
                              >
                                <FileText className="w-3 h-3 text-amber-600 shrink-0" />
                                <span className="font-medium truncate max-w-[160px]">{att.title || att.fileName}</span>
                                <span className="text-[9px] text-amber-600">↗</span>
                              </a>
                            ))}
                          </div>
                        )}
                      </div>
                    ))
                  )}
                </div>

                {/* Attached chips preview for new note */}
                {noteAttachments.length > 0 && (
                  <div className="flex flex-wrap gap-1.5 px-1">
                    {noteAttachments.map((att, idx) => (
                      <span key={idx} className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] bg-amber-100/70 border border-amber-200 text-amber-900 font-medium">
                        <FileText className="w-3 h-3 text-amber-600" />
                        <span className="truncate max-w-[140px]">{att.title}</span>
                        <button
                          type="button"
                          onClick={() => setNoteAttachments(prev => prev.filter((_, i) => i !== idx))}
                          className="hover:text-amber-950 cursor-pointer"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      </span>
                    ))}
                  </div>
                )}

                {/* Add Note Input */}
                <form onSubmit={handleAddNote} className="flex items-center gap-2 pt-1">
                  <input
                    type="text"
                    placeholder="Write an internal note (only visible to staff)..."
                    value={noteInput}
                    onChange={(e) => setNoteInput(e.target.value)}
                    className="flex-1 px-3.5 py-2 text-xs bg-amber-50/50 border border-amber-200 rounded-xl focus:outline-none focus:ring-1 focus:ring-amber-500 text-amber-950 placeholder-amber-700/50"
                  />
                  <input
                    ref={noteFileRef}
                    type="file"
                    className="hidden"
                    onChange={handleNoteFileUpload}
                  />
                  <button
                    type="button"
                    onClick={() => noteFileRef.current?.click()}
                    disabled={isUploadingNoteAtt}
                    title="Attach file to internal note"
                    className="p-2 rounded-xl border border-amber-200 bg-amber-50 text-amber-800 hover:text-amber-950 hover:bg-amber-100 transition-colors cursor-pointer"
                  >
                    {isUploadingNoteAtt ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Paperclip className="w-3.5 h-3.5" />}
                  </button>
                  <button
                    type="submit"
                    disabled={isSubmittingNote || (!noteInput.trim() && noteAttachments.length === 0)}
                    className="px-4 py-2 rounded-xl text-xs font-semibold bg-amber-600 hover:bg-amber-700 text-white shadow-xs transition-all disabled:opacity-50 cursor-pointer flex items-center gap-1"
                  >
                    <Lock className="w-3.5 h-3.5" />
                    <span>Post Note</span>
                  </button>
                </form>
              </div>
            )}

            {/* TAB CONTENT: Activity History */}
            {activeTab === 'activity' && (
              <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
                {activities.length === 0 ? (
                  <div className="py-6 text-center text-xs text-slate-400">
                    No activity logs recorded yet.
                  </div>
                ) : (
                  activities.map((a) => (
                    <div key={a.activityId} className="flex items-start gap-2.5 p-2 rounded-xl text-xs hover:bg-slate-50">
                      <div className="w-2 h-2 rounded-full bg-slate-400 mt-1.5 shrink-0" />
                      <div className="flex-1">
                        <p className="text-slate-800 font-medium">{a.description}</p>
                        <span className="text-[10px] text-slate-400">{formatDateTime(a.createdAt)}</span>
                      </div>
                    </div>
                  ))
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
