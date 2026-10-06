'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import Navbar from '@/components/Navbar';
import AuthGuard from '@/components/AuthGuard';
import { api } from '@/lib/api';
import { 
  Ticket, 
  TicketStatus, 
  User, 
  TicketComment, 
  TicketNote, 
  TicketActivity, 
  TicketCategory, 
  CreateAttachmentPayload 
} from '@/types';
import { useAuth } from '@/context/AuthContext';
import { useToast } from '@/context/ToastContext';
import { 
  ArrowLeft, 
  Send, 
  Paperclip, 
  Lock, 
  MessageSquare, 
  FileText, 
  Check, 
  RefreshCw, 
  CheckCircle, 
  X, 
  UserCheck, 
  Tag, 
  History, 
  CornerDownLeft,
  User as UserIcon,
  Clock
} from 'lucide-react';

export default function TicketDetailPage() {
  return (
    <AuthGuard>
      <TicketDetailContent />
    </AuthGuard>
  );
}

function TicketDetailContent() {
  const params = useParams();
  const router = useRouter();
  const ticketId = params?.id as string;

  const { user, role, hasPermission } = useAuth();
  const { toast } = useToast();

  const [ticket, setTicket] = useState<Ticket | null>(null);
  const [categories, setCategories] = useState<TicketCategory[]>([]);
  const [agents, setAgents] = useState<User[]>([]);

  // Feed states
  const [comments, setComments] = useState<TicketComment[]>([]);
  const [notes, setNotes] = useState<TicketNote[]>([]);
  const [activities, setActivities] = useState<TicketActivity[]>([]);
  const [activeTab, setActiveTab] = useState<'comments' | 'notes' | 'activity'>('comments');
  const [isLoading, setIsLoading] = useState(true);

  // Staged / Draft edits
  const [draftStatus, setDraftStatus] = useState<TicketStatus>('OPEN');
  const [draftCategoryId, setDraftCategoryId] = useState<number>(0);
  const [draftAgentEmail, setDraftAgentEmail] = useState<string>('');
  const [draftResolutionNote, setDraftResolutionNote] = useState<string>('');
  const [isSavingChanges, setIsSavingChanges] = useState(false);
  const [saveSuccessMsg, setSaveSuccessMsg] = useState<string | null>(null);

  // Chat input states
  const [chatMessage, setChatMessage] = useState('');
  const [chatAttachments, setChatAttachments] = useState<CreateAttachmentPayload[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [isSending, setIsSending] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const chatBottomRef = useRef<HTMLDivElement>(null);

  const canInternalNotes = hasPermission('INTERNAL_NOTE_READ') || role === 'ADMIN' || role === 'SUPPORT_MANAGER' || role === 'SUPPORT_AGENT';
  const canUpdateStatus = hasPermission('TICKET_UPDATE') || role === 'ADMIN' || role === 'SUPPORT_MANAGER' || role === 'SUPPORT_AGENT';
  const canAssign = hasPermission('TICKET_ASSIGN') || role === 'ADMIN' || role === 'SUPPORT_MANAGER';
  const canChangeCategory = role === 'ADMIN' || role === 'SUPPORT_MANAGER' || role === 'SUPPORT_AGENT' || hasPermission('TICKET_UPDATE');
  const isAgent = role === 'SUPPORT_AGENT' || (role as string) === 'AGENT';
  const canCloseTicket = role === 'ADMIN' || role === 'SUPPORT_MANAGER';
  const availableStatuses: TicketStatus[] = canCloseTicket
    ? ['OPEN', 'IN_PROGRESS', 'WAITING_ON_REQUESTOR', 'RESOLVED', 'CLOSED']
    : ['OPEN', 'IN_PROGRESS', 'WAITING_ON_REQUESTOR', 'RESOLVED'];

  const loadTicket = async (forceRefresh = false) => {
    if (!ticketId) return;
    setIsLoading(true);
    try {
      const [tData, cList, uList, comList, actList] = await Promise.all([
        api.tickets.getById(ticketId, { forceRefresh }),
        api.categories.getAll({ forceRefresh }).catch(() => []),
        api.users.getAll(0, 50, { forceRefresh }).catch(() => []),
        api.tickets.getComments(ticketId, { forceRefresh }).catch(() => []),
        api.tickets.getActivities(ticketId, { forceRefresh }).catch(() => []),
      ]);

      setTicket(tData);
      setCategories(cList || []);
      setAgents(uList.filter(u => u.roleName === 'SUPPORT_AGENT' || u.roleName === 'SUPPORT_MANAGER' || (u.roleName as string) === 'AGENT'));
      setComments(comList || []);
      setActivities(actList || []);

      setDraftStatus(tData.status);
      setDraftCategoryId(tData.categoryId);
      setDraftAgentEmail(tData.assignedAgentEmail || '');
      setDraftResolutionNote('');

      if (canInternalNotes) {
        api.tickets.getNotes(ticketId, { forceRefresh }).then(nList => setNotes(nList || [])).catch(() => []);
      }
    } catch (err: any) {
      toast.error(err.message || 'Failed to load ticket details');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadTicket(false);
  }, [ticketId]);

  // Scroll to bottom of chat when comments or notes change
  useEffect(() => {
    chatBottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [comments, notes, activeTab]);

  // Track draft changes
  const hasStatusChanged = ticket ? draftStatus !== ticket.status : false;
  const hasCategoryChanged = ticket ? draftCategoryId !== ticket.categoryId : false;
  const hasAgentChanged = ticket ? (draftAgentEmail || '').toLowerCase() !== (ticket.assignedAgentEmail || '').toLowerCase() : false;
  const hasChanges = hasStatusChanged || hasCategoryChanged || hasAgentChanged;

  const handleDiscardChanges = () => {
    if (!ticket) return;
    setDraftStatus(ticket.status);
    setDraftCategoryId(ticket.categoryId);
    setDraftAgentEmail(ticket.assignedAgentEmail || '');
    setDraftResolutionNote('');
  };

  const handleSaveChanges = async () => {
    if (!ticket || !hasChanges || isSavingChanges) return;

    if (draftStatus === 'RESOLVED' && hasStatusChanged && !draftResolutionNote.trim()) {
      toast.warning('Please enter a resolution note before saving this ticket as Resolved.');
      return;
    }

    setIsSavingChanges(true);
    try {
      if (hasCategoryChanged) {
        await api.tickets.updateCategory(ticket.ticketPublicId, draftCategoryId);
      }
      if (hasAgentChanged) {
        await api.tickets.assign(ticket.ticketPublicId, draftAgentEmail);
      }
      if (hasStatusChanged) {
        await api.tickets.updateStatus(
          ticket.ticketPublicId,
          draftStatus,
          draftStatus === 'RESOLVED' ? draftResolutionNote.trim() : undefined
        );
      }

      await loadTicket(true);
      toast.success('Changes saved successfully');
      setSaveSuccessMsg('Changes saved successfully');
      setTimeout(() => setSaveSuccessMsg(null), 3500);
    } catch (err: any) {
      toast.error(err.message || 'Failed to save changes');
    } finally {
      setIsSavingChanges(false);
    }
  };

  // Upload attachment for chat
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setIsUploading(true);
    try {
      const res = await api.tickets.upload(file);
      setChatAttachments(prev => [...prev, {
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

  const removeChatAttachment = (index: number) => {
    setChatAttachments(prev => prev.filter((_, i) => i !== index));
  };

  // Send comment or note via chat interface
  const handleSendMessage = async (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!ticket) return;
    const trimmed = chatMessage.trim();
    if (!trimmed && chatAttachments.length === 0) return;
    if (isSending) return;

    setIsSending(true);
    try {
      if (activeTab === 'comments') {
        const text = trimmed || (chatAttachments.length > 0 ? `Shared attachment(s): ${chatAttachments.map(a => a.title).join(', ')}` : '');
        const created = await api.tickets.addComment(ticket.ticketPublicId, text, chatAttachments);
        setComments(prev => [...prev, created]);
      } else if (activeTab === 'notes') {
        const text = trimmed || (chatAttachments.length > 0 ? `Internal attachment(s): ${chatAttachments.map(a => a.title).join(', ')}` : '');
        const created = await api.tickets.addNote(ticket.ticketPublicId, text, chatAttachments);
        setNotes(prev => [...prev, created]);
      }

      setChatMessage('');
      setChatAttachments([]);
      const updatedActs = await api.tickets.getActivities(ticket.ticketPublicId, { forceRefresh: true }).catch(() => []);
      setActivities(updatedActs);
      toast.success(activeTab === 'notes' ? 'Internal note added' : 'Message sent');
    } catch (err: any) {
      toast.error(err.message || 'Failed to send message');
    } finally {
      setIsSending(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
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

  const formatPriority = (prio?: string) => {
    if (!prio) return '—';
    const clean = prio.replace(/_[0-9]+/g, '').replace(/[0-9]{8,}/g, '').replace(/_/g, ' ').trim();
    return clean ? clean.charAt(0).toUpperCase() + clean.slice(1).toLowerCase() : prio;
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#F4F6FB]">
        <Navbar />
        <div className="max-w-[1400px] mx-auto p-8 text-center text-xs text-slate-400">
          <RefreshCw className="w-5 h-5 animate-spin mx-auto mb-2 text-slate-500" />
          Loading ticket details...
        </div>
      </div>
    );
  }

  if (!ticket) {
    return (
      <div className="min-h-screen bg-[#F4F6FB]">
        <Navbar />
        <div className="max-w-[1400px] mx-auto p-8 text-center">
          <h2 className="text-lg font-bold text-slate-800 mb-2">Ticket Not Found</h2>
          <p className="text-xs text-slate-500 mb-4">The ticket requested does not exist or you do not have permission to view it.</p>
          <Link href="/tickets" className="px-4 py-2 rounded-full bg-[#0B132B] text-white text-xs font-semibold">
            Return to Tickets
          </Link>
        </div>
      </div>
    );
  }

  const currentCategoryObj = categories.find(c => c.categoryId === draftCategoryId);
  const currentCategoryName = currentCategoryObj?.name || ticket.categoryName;
  const currentAgentName = draftAgentEmail 
    ? (agents.find(a => a.email.toLowerCase() === draftAgentEmail.toLowerCase())?.name || draftAgentEmail)
    : (ticket.assignedAgentName || 'Unassigned');

  return (
    <div className="min-h-screen bg-[#F4F6FB] pb-16">
      <Navbar />

      <main className="max-w-[1400px] mx-auto px-4 sm:px-6 space-y-5">
        {/* Top Navigation & Status Banner */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <Link
              href="/tickets"
              className="w-8 h-8 rounded-full bg-white border border-slate-200 flex items-center justify-center text-slate-600 hover:text-slate-900 shadow-2xs transition-colors"
              title="Back to Tickets"
            >
              <ArrowLeft className="w-4 h-4" />
            </Link>

            <button
              onClick={() => loadTicket(true)}
              disabled={isLoading}
              className="w-8 h-8 rounded-full bg-white border border-slate-200 flex items-center justify-center text-slate-600 hover:text-slate-900 shadow-2xs transition-colors cursor-pointer"
              title="Refresh Ticket"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
            </button>

            <div>
              <div className="flex items-center gap-2 mb-0.5">
                <span className="font-mono text-xs font-bold text-slate-400">
                  #{ticket.ticketPublicId.substring(0, 8).toUpperCase()}
                </span>
                <span className="text-xs font-semibold text-slate-600">
                  {currentCategoryName}
                </span>
                <span className="text-slate-300">•</span>
                <span className="text-xs font-semibold text-slate-700">
                  Priority: {formatPriority(ticket.priorityName)}
                </span>
              </div>
              <h1 className="text-2xl sm:text-3xl font-extrabold text-[#0B132B] tracking-tight">
                {ticket.title}
              </h1>
            </div>
          </div>

          {/* Action Header: Save / Discard Changes */}
          <div className="flex items-center gap-2 self-start sm:self-center">
            {saveSuccessMsg && (
              <span className="text-xs text-emerald-700 font-semibold bg-emerald-50 px-3 py-1.5 rounded-full border border-emerald-200">
                ✓ {saveSuccessMsg}
              </span>
            )}

            {hasChanges && (
              <>
                <button
                  type="button"
                  disabled={isSavingChanges}
                  onClick={handleDiscardChanges}
                  className="px-4 py-1.5 rounded-full text-xs font-semibold text-slate-600 hover:bg-slate-200 transition-colors cursor-pointer"
                >
                  Discard
                </button>
                <button
                  type="button"
                  disabled={isSavingChanges}
                  onClick={handleSaveChanges}
                  className="flex items-center gap-1.5 px-5 py-2 rounded-full text-xs font-bold bg-[#0B132B] hover:bg-slate-800 text-white shadow-xs transition-all cursor-pointer"
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
              </>
            )}
          </div>
        </div>

        {/* Unsaved Edits Notification */}
        {hasChanges && (
          <div className="p-3 rounded-2xl bg-amber-50 border border-amber-200 flex items-center justify-between text-xs">
            <span className="font-semibold text-amber-900">
              You have unsaved changes to this ticket. Click &quot;Save Changes&quot; to apply them.
            </span>
          </div>
        )}

        {/* Main Content Layout: Left = Description & Chat / Right = Management Controls */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* LEFT 2 COLUMNS: Ticket Description + Chat Interface */}
          <div className="lg:col-span-2 space-y-5">
            {/* Description & Attachments Box */}
            <div className="pill-card p-6 bg-white border border-slate-200/80 shadow-2xs space-y-4">
              <div>
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-2">
                  Incident Description
                </h3>
                <div className="text-sm text-slate-800 leading-relaxed whitespace-pre-wrap bg-slate-50 p-4 rounded-2xl border border-slate-100">
                  {ticket.description || 'No detailed description provided.'}
                </div>
              </div>

              {/* Ticket Original Attachments */}
              {ticket.attachments && ticket.attachments.length > 0 && (
                <div>
                  <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-2 flex items-center gap-1.5">
                    <Paperclip className="w-3.5 h-3.5" />
                    <span>Attachments ({ticket.attachments.length})</span>
                  </h4>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                    {ticket.attachments.map((att, idx) => (
                      <a
                        key={idx}
                        href={att.url || att.fileUrl || '#'}
                        target="_blank"
                        rel="noreferrer"
                        className="p-3 rounded-2xl bg-slate-50 border border-slate-200/80 hover:bg-slate-100 flex items-center justify-between text-xs transition-colors group cursor-pointer"
                      >
                        <div className="flex items-center gap-2.5 truncate pr-2">
                          <FileText className="w-4 h-4 text-slate-500 shrink-0" />
                          <div className="truncate">
                            <span className="font-semibold text-slate-800 block truncate group-hover:text-blue-600">
                              {att.title || att.fileName}
                            </span>
                            {att.description && (
                              <span className="text-[11px] text-slate-400 block truncate">
                                {att.description}
                              </span>
                            )}
                          </div>
                        </div>
                        <span className="text-xs font-bold text-slate-400 group-hover:text-slate-700">↗</span>
                      </a>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* CHAT SECTION: Comments and Notes */}
            <div className="pill-card bg-white border border-slate-200/80 shadow-2xs flex flex-col h-[650px] overflow-hidden">
              {/* Chat Tabs Header */}
              <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-white shrink-0">
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setActiveTab('comments')}
                    className={`flex items-center gap-1.5 px-4 py-2 rounded-full text-xs font-bold transition-all cursor-pointer ${
                      activeTab === 'comments'
                        ? 'bg-[#0B132B] text-white shadow-xs'
                        : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                    }`}
                  >
                    <MessageSquare className="w-3.5 h-3.5" />
                    <span>Comments ({comments.length})</span>
                  </button>

                  {canInternalNotes && (
                    <button
                      onClick={() => setActiveTab('notes')}
                      className={`flex items-center gap-1.5 px-4 py-2 rounded-full text-xs font-bold transition-all cursor-pointer ${
                        activeTab === 'notes'
                          ? 'bg-amber-600 text-white shadow-xs'
                          : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                      }`}
                    >
                      <Lock className="w-3.5 h-3.5" />
                      <span>Notes ({notes.length})</span>
                    </button>
                  )}

                  <button
                    onClick={() => setActiveTab('activity')}
                    className={`flex items-center gap-1.5 px-4 py-2 rounded-full text-xs font-bold transition-all cursor-pointer ${
                      activeTab === 'activity'
                        ? 'bg-slate-200 text-slate-900'
                        : 'text-slate-500 hover:text-slate-800 hover:bg-slate-100'
                    }`}
                  >
                    <History className="w-3.5 h-3.5" />
                    <span>Activity</span>
                  </button>
                </div>

                <span className="text-[11px] text-slate-400 font-medium hidden sm:inline">
                  {activeTab === 'comments' ? 'Visible to requestor & agents' : activeTab === 'notes' ? 'Internal only' : 'Audit logs'}
                </span>
              </div>

              {/* Chat Messages Feed Container */}
              <div className="flex-1 p-6 overflow-y-auto space-y-4 bg-slate-50/50">
                {/* 1. Comments Stream */}
                {activeTab === 'comments' && (
                  <>
                    {comments.length === 0 ? (
                      <div className="h-full flex flex-col items-center justify-center text-center text-xs text-slate-400 py-12">
                        <MessageSquare className="w-8 h-8 text-slate-300 mb-2 stroke-1" />
                        <p className="font-semibold text-slate-600">No comments yet</p>
                        <p className="text-[11px] text-slate-400 mt-0.5">Send a message below to start the conversation with the requester.</p>
                      </div>
                    ) : (
                      comments.map((c) => {
                        const isMe = user?.userPublicId === c.userPublicId || user?.name === c.userName;
                        return (
                          <div
                            key={c.commentId}
                            className={`flex gap-3 max-w-[85%] ${isMe ? 'ml-auto flex-row-reverse' : 'mr-auto'}`}
                          >
                            {/* Avatar */}
                            <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold shrink-0 ${
                              isMe ? 'bg-[#0B132B] text-white' : 'bg-slate-200 text-slate-700'
                            }`}>
                              {c.userName ? c.userName.charAt(0).toUpperCase() : 'U'}
                            </div>

                            {/* Chat Bubble */}
                            <div className="space-y-1">
                              <div className={`flex items-center gap-2 text-[11px] ${isMe ? 'justify-end' : 'justify-start'}`}>
                                <span className="font-bold text-slate-800">{c.userName}</span>
                                <span className="text-[10px] text-slate-400 font-medium">
                                  {c.userRole}
                                </span>
                                <span className="text-[10px] text-slate-400">
                                  {formatDateTime(c.createdAt)}
                                </span>
                              </div>

                              <div className={`p-4 rounded-2xl text-xs leading-relaxed shadow-2xs ${
                                isMe 
                                  ? 'bg-[#0B132B] text-white rounded-tr-xs' 
                                  : 'bg-white text-slate-800 border border-slate-200/70 rounded-tl-xs'
                              }`}>
                                <p className="whitespace-pre-wrap">{c.description}</p>

                                {/* Attachments inside chat bubble */}
                                {c.attachments && c.attachments.length > 0 && (
                                  <div className="mt-2.5 pt-2 border-t border-slate-200/30 flex flex-wrap gap-1.5">
                                    {c.attachments.map((att, attIdx) => (
                                      <a
                                        key={attIdx}
                                        href={att.url || att.fileUrl || '#'}
                                        target="_blank"
                                        rel="noreferrer"
                                        className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-[11px] font-medium transition-colors ${
                                          isMe 
                                            ? 'bg-white/10 hover:bg-white/20 text-white' 
                                            : 'bg-slate-100 hover:bg-slate-200 text-slate-800'
                                        }`}
                                      >
                                        <FileText className="w-3.5 h-3.5 shrink-0 opacity-70" />
                                        <span className="truncate max-w-[180px]">{att.title || att.fileName}</span>
                                        <span className="text-[10px] opacity-70">↗</span>
                                      </a>
                                    ))}
                                  </div>
                                )}
                              </div>
                            </div>
                          </div>
                        );
                      })
                    )}
                  </>
                )}

                {/* 2. Notes Stream */}
                {activeTab === 'notes' && canInternalNotes && (
                  <>
                    {notes.length === 0 ? (
                      <div className="h-full flex flex-col items-center justify-center text-center text-xs text-slate-400 py-12">
                        <Lock className="w-8 h-8 text-amber-300 mb-2 stroke-1" />
                        <p className="font-semibold text-slate-600">No internal notes yet</p>
                        <p className="text-[11px] text-slate-400 mt-0.5">Use notes for technical staff discussions that are hidden from the requester.</p>
                      </div>
                    ) : (
                      notes.map((n) => {
                        const isMe = user?.userPublicId === n.userPublicId || user?.name === n.userName;
                        return (
                          <div
                            key={n.noteId}
                            className={`flex gap-3 max-w-[85%] ${isMe ? 'ml-auto flex-row-reverse' : 'mr-auto'}`}
                          >
                            <div className="w-8 h-8 rounded-full bg-amber-200 text-amber-900 flex items-center justify-center text-xs font-bold shrink-0">
                              {n.userName ? n.userName.charAt(0).toUpperCase() : 'N'}
                            </div>

                            <div className="space-y-1">
                              <div className={`flex items-center gap-2 text-[11px] ${isMe ? 'justify-end' : 'justify-start'}`}>
                                <span className="font-bold text-slate-800">{n.userName}</span>
                                <span className="text-[10px] text-amber-700 bg-amber-100 px-1.5 py-0.2 rounded-full font-semibold">
                                  Internal Staff
                                </span>
                                <span className="text-[10px] text-slate-400">
                                  {formatDateTime(n.createdAt)}
                                </span>
                              </div>

                              <div className={`p-4 rounded-2xl text-xs leading-relaxed shadow-2xs border ${
                                isMe 
                                  ? 'bg-amber-600 text-white border-amber-600 rounded-tr-xs' 
                                  : 'bg-amber-50/80 text-amber-950 border-amber-200/80 rounded-tl-xs'
                              }`}>
                                <p className="whitespace-pre-wrap">{n.description}</p>

                                {n.attachments && n.attachments.length > 0 && (
                                  <div className="mt-2.5 pt-2 border-t border-amber-200/40 flex flex-wrap gap-1.5">
                                    {n.attachments.map((att, attIdx) => (
                                      <a
                                        key={attIdx}
                                        href={att.url || att.fileUrl || '#'}
                                        target="_blank"
                                        rel="noreferrer"
                                        className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-[11px] font-medium transition-colors ${
                                          isMe 
                                            ? 'bg-white/15 hover:bg-white/25 text-white' 
                                            : 'bg-white hover:bg-amber-100 text-amber-900 border border-amber-200'
                                        }`}
                                      >
                                        <FileText className="w-3.5 h-3.5 shrink-0 opacity-70" />
                                        <span className="truncate max-w-[180px]">{att.title || att.fileName}</span>
                                        <span className="text-[10px] opacity-70">↗</span>
                                      </a>
                                    ))}
                                  </div>
                                )}
                              </div>
                            </div>
                          </div>
                        );
                      })
                    )}
                  </>
                )}

                {/* 3. Activity Log Stream */}
                {activeTab === 'activity' && (
                  <div className="space-y-2 py-2">
                    {activities.length === 0 ? (
                      <div className="text-center text-xs text-slate-400 py-10">
                        No activity records found for this ticket.
                      </div>
                    ) : (
                      activities.map((a) => (
                        <div key={a.activityId} className="flex items-start gap-3 p-3 rounded-xl bg-white border border-slate-100 text-xs">
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

                <div ref={chatBottomRef} />
              </div>

              {/* Chat Input Bar (Only visible on Comments and Notes tabs) */}
              {activeTab !== 'activity' && (
                <div className="p-4 bg-white border-t border-slate-100 shrink-0 space-y-2">
                  {/* Attachment chips preview */}
                  {chatAttachments.length > 0 && (
                    <div className="flex flex-wrap gap-2 px-1">
                      {chatAttachments.map((att, idx) => (
                        <span key={idx} className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs bg-slate-100 border border-slate-200 text-slate-700">
                          <FileText className="w-3.5 h-3.5 text-slate-500" />
                          <span className="truncate max-w-[160px] font-medium">{att.title}</span>
                          <button
                            type="button"
                            onClick={() => removeChatAttachment(idx)}
                            className="p-0.5 rounded-full hover:bg-slate-200 text-slate-400 hover:text-slate-700 cursor-pointer"
                          >
                            <X className="w-3 h-3" />
                          </button>
                        </span>
                      ))}
                    </div>
                  )}

                  {/* Chat input form */}
                  <form onSubmit={handleSendMessage} className="flex items-end gap-2">
                    <div className="flex-1 relative bg-slate-50 rounded-2xl border border-slate-200 focus-within:border-slate-400 focus-within:ring-2 focus-within:ring-slate-900/10 transition-all p-1.5">
                      <textarea
                        rows={2}
                        value={chatMessage}
                        onChange={(e) => setChatMessage(e.target.value)}
                        onKeyDown={handleKeyDown}
                        placeholder={
                          activeTab === 'comments'
                            ? "Type a public comment... (Press Enter to send, Shift+Enter for newline)"
                            : "Type an internal staff note... (Press Enter to send)"
                        }
                        className="w-full px-3 py-1.5 text-xs bg-transparent focus:outline-none resize-none text-slate-800 placeholder-slate-400 leading-relaxed"
                      />
                    </div>

                    <div className="flex items-center gap-1.5 pb-1">
                      <input
                        ref={fileInputRef}
                        type="file"
                        className="hidden"
                        onChange={handleFileUpload}
                      />
                      <button
                        type="button"
                        onClick={() => fileInputRef.current?.click()}
                        disabled={isUploading}
                        title="Attach a file"
                        className="p-2.5 rounded-xl border border-slate-200 bg-white text-slate-600 hover:text-slate-900 hover:bg-slate-50 transition-colors cursor-pointer shadow-2xs"
                      >
                        {isUploading ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Paperclip className="w-4 h-4" />}
                      </button>

                      <button
                        type="submit"
                        disabled={isSending || (!chatMessage.trim() && chatAttachments.length === 0)}
                        className={`flex items-center gap-1.5 px-4 py-2.5 rounded-xl text-xs font-bold text-white shadow-xs transition-all disabled:opacity-50 cursor-pointer ${
                          activeTab === 'notes' ? 'bg-amber-600 hover:bg-amber-700' : 'bg-[#0B132B] hover:bg-slate-800'
                        }`}
                      >
                        <Send className="w-3.5 h-3.5" />
                        <span>Send</span>
                      </button>
                    </div>
                  </form>
                </div>
              )}
            </div>
          </div>

          {/* RIGHT 1 COLUMN: Management & Details Sidebar */}
          <div className="space-y-5">
            {/* Status & Assignment Control Card */}
            <div className="pill-card p-6 bg-white border border-slate-200/80 shadow-2xs space-y-5">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400">
                Ticket Controls
              </h3>

              {/* Status Selector */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-2">
                  Status
                </label>
                {canUpdateStatus ? (
                  <div className="space-y-2">
                    <div className="grid grid-cols-2 gap-1.5">
                      {availableStatuses.map((st) => (
                        <button
                          key={st}
                          type="button"
                          onClick={() => setDraftStatus(st)}
                          className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all cursor-pointer text-left truncate ${
                            draftStatus === st
                              ? 'bg-[#0B132B] text-white shadow-2xs'
                              : 'bg-slate-50 hover:bg-slate-100 text-slate-700 border border-slate-200/70'
                          }`}
                        >
                          {st.replace(/_/g, ' ')}
                        </button>
                      ))}
                    </div>

                    {/* Resolution Note if marked as RESOLVED */}
                    {draftStatus === 'RESOLVED' && hasStatusChanged && (
                      <div className="mt-3 p-3 rounded-xl bg-emerald-50 border border-emerald-200 space-y-1.5">
                        <label className="text-[11px] font-bold text-emerald-900 block">
                          Resolution Summary (Required)
                        </label>
                        <textarea
                          rows={2}
                          value={draftResolutionNote}
                          onChange={(e) => setDraftResolutionNote(e.target.value)}
                          placeholder="Describe the fix or resolution applied..."
                          className="w-full p-2 text-xs rounded-lg bg-white border border-emerald-300 text-slate-800 focus:outline-none"
                        />
                      </div>
                    )}
                  </div>
                ) : (
                  <span className="inline-block px-3 py-1 rounded-full text-xs font-semibold bg-slate-100 text-slate-800">
                    {ticket.status.replace(/_/g, ' ')}
                  </span>
                )}
              </div>

              {/* Category Selector */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  Category
                </label>
                {canChangeCategory && categories.length > 0 ? (
                  <select
                    value={draftCategoryId}
                    onChange={(e) => setDraftCategoryId(Number(e.target.value))}
                    className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-xs font-medium text-slate-800 focus:outline-none"
                  >
                    {categories.map((c) => (
                      <option key={c.categoryId} value={c.categoryId}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                ) : (
                  <span className="text-xs text-slate-800 font-medium block">
                    {currentCategoryName}
                  </span>
                )}
              </div>

              {/* Assigned Agent Selector */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  Assigned Support Agent
                </label>
                {canAssign ? (
                  <select
                    value={draftAgentEmail}
                    onChange={(e) => setDraftAgentEmail(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-xs font-medium text-slate-800 focus:outline-none"
                  >
                    <option value="">Unassigned</option>
                    {agents.map((a) => (
                      <option key={a.email} value={a.email}>
                        {a.name} ({a.roleName})
                      </option>
                    ))}
                  </select>
                ) : (
                  <span className="text-xs text-slate-800 font-medium block">
                    {isAgent ? (ticket.assignedAgentName || user?.name || 'Assigned to You') : currentAgentName}
                  </span>
                )}
              </div>

              {/* Save Changes CTA if draft has pending edits */}
              {hasChanges && (
                <div className="pt-2 border-t border-slate-100 space-y-2">
                  <button
                    type="button"
                    disabled={isSavingChanges}
                    onClick={handleSaveChanges}
                    className="w-full py-2 rounded-xl text-xs font-bold bg-[#0B132B] hover:bg-slate-800 text-white shadow-xs transition-all cursor-pointer flex items-center justify-center gap-1.5"
                  >
                    {isSavingChanges ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
                    <span>Save Changes</span>
                  </button>
                  <button
                    type="button"
                    disabled={isSavingChanges}
                    onClick={handleDiscardChanges}
                    className="w-full py-1.5 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100 transition-colors"
                  >
                    Discard Changes
                  </button>
                </div>
              )}
            </div>

            {/* Ticket Meta Details Card */}
            <div className="pill-card p-6 bg-white border border-slate-200/80 shadow-2xs space-y-4 text-xs">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400">
                Ticket Information
              </h3>

              <div className="space-y-3">
                <div>
                  <span className="text-slate-400 block text-[11px] mb-0.5">Requestor</span>
                  <span className="font-bold text-slate-800 block">{ticket.requestorName}</span>
                  <span className="text-slate-500 text-[11px] block">{ticket.requestorEmail}</span>
                </div>

                <div>
                  <span className="text-slate-400 block text-[11px] mb-0.5">Priority</span>
                  <span className="font-bold text-slate-800">{formatPriority(ticket.priorityName)}</span>
                </div>

                <div>
                  <span className="text-slate-400 block text-[11px] mb-0.5">Created Date</span>
                  <span className="font-medium text-slate-700">{formatDateTime(ticket.createdAt)}</span>
                </div>

                <div>
                  <span className="text-slate-400 block text-[11px] mb-0.5">Ticket ID</span>
                  <span className="font-mono text-slate-600 text-[11px]">{ticket.ticketPublicId}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
