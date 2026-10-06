'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import Navbar from '@/components/Navbar';
import AuthGuard from '@/components/AuthGuard';
import { api } from '@/lib/api';
import { NotificationItem } from '@/types';
import { 
  Bell, 
  Check, 
  CheckCheck, 
  Clock, 
  AlertCircle, 
  AlertTriangle,
  MessageSquare, 
  Inbox, 
  UserPlus, 
  Tag, 
  RefreshCw,
  Search,
  ExternalLink,
  ShieldAlert,
  ArrowRight,
  Trash2,
  ChevronLeft,
  ChevronRight,
  ChevronDown
} from 'lucide-react';
import { useToast } from '@/context/ToastContext';
import { useConfirmModal } from '@/components/ConfirmModal';

export default function NotificationsPage() {
  return (
    <AuthGuard>
      <NotificationsContent />
    </AuthGuard>
  );
}

function NotificationsContent() {
  const router = useRouter();
  const { toast } = useToast();
  const { confirm, ConfirmModalElement } = useConfirmModal();
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [unreadCount, setUnreadCount] = useState<number>(0);
  const [isLoading, setIsLoading] = useState(false);
  const [filterType, setFilterType] = useState<'ALL' | 'UNREAD' | 'ASSIGNMENT' | 'STATUS_CHANGE' | 'COMMENT'>('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [currentPage, setCurrentPage] = useState(0);
  const [pageSize, setPageSize] = useState(10);

  useEffect(() => {
    setCurrentPage(0);
  }, [filterType, searchQuery, pageSize]);

  const loadData = async (forceRefresh = false) => {
    setIsLoading(true);
    try {
      const [notifsRes, countRes] = await Promise.all([
        api.notifications.getAll(false, 0, 50, { forceRefresh }).catch(() => ({ content: [], totalElements: 0 })),
        api.notifications.getUnreadCount({ forceRefresh }).catch(() => ({ unreadCount: 0 }))
      ]);
      setNotifications(notifsRes.content || []);
      setUnreadCount(countRes.unreadCount || 0);
    } catch {
      // Keep UI clean
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData(false);
  }, []);

  const handleMarkAsRead = async (notificationId: number, e?: React.MouseEvent) => {
    e?.stopPropagation();
    try {
      await api.notifications.markAsRead(notificationId);
      setNotifications(prev => prev.map(n => n.notificationId === notificationId ? { ...n, isRead: true } : n));
      setUnreadCount(prev => Math.max(0, prev - 1));
    } catch {
      // Ignore
    }
  };

  const handleMarkAllRead = async () => {
    try {
      await api.notifications.markAllAsRead();
      setNotifications(prev => prev.map(n => ({ ...n, isRead: true })));
      setUnreadCount(0);
      toast.success('All notifications marked as read.');
    } catch {
      toast.error('Failed to mark all as read');
    }
  };

  const handleDeleteNotification = async (notificationId: number, e?: React.MouseEvent) => {
    e?.stopPropagation();
    try {
      await api.notifications.delete(notificationId);
      const target = notifications.find(n => n.notificationId === notificationId);
      if (target && !target.isRead) {
        setUnreadCount(prev => Math.max(0, prev - 1));
      }
      setNotifications(prev => prev.filter(n => n.notificationId !== notificationId));
      toast.success('Notification removed.');
    } catch (err: any) {
      toast.error(err.message || 'Failed to delete notification');
    }
  };

  const handleClearAll = async () => {
    if (notifications.length === 0) return;
    const confirmed = await confirm({
      title: 'Clear All Notifications',
      message: 'Are you sure you want to clear all notifications? This action cannot be undone.',
      confirmText: 'Clear All',
      confirmVariant: 'danger',
    });
    if (!confirmed) return;

    try {
      await api.notifications.clearAll();
      setNotifications([]);
      setUnreadCount(0);
      toast.success('All notifications cleared successfully.');
    } catch (err: any) {
      toast.error(err.message || 'Failed to clear notifications');
    }
  };

  const handleNotificationClick = async (item: NotificationItem) => {
    if (!item.isRead) {
      await handleMarkAsRead(item.notificationId);
    }
    if (item.ticketPublicId) {
      router.push(`/tickets?ticketId=${item.ticketPublicId}`);
    }
  };

  const filteredNotifications = notifications.filter(item => {
    if (filterType === 'UNREAD' && item.isRead) return false;
    if (filterType === 'ASSIGNMENT' && item.type !== 'ASSIGNMENT') return false;
    if (filterType === 'STATUS_CHANGE' && item.type !== 'STATUS_CHANGE') return false;
    if (filterType === 'COMMENT' && item.type !== 'COMMENT') return false;

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchTitle = item.title.toLowerCase().includes(q);
      const matchMsg = item.message.toLowerCase().includes(q);
      return matchTitle || matchMsg;
    }

    return true;
  });

  const totalPages = Math.max(1, Math.ceil(filteredNotifications.length / pageSize));
  const startIndex = currentPage * pageSize;
  const endIndex = Math.min(startIndex + pageSize, filteredNotifications.length);
  const displayedNotifications = filteredNotifications.slice(startIndex, endIndex);

  const formatRelativeTime = (isoStr?: string) => {
    if (!isoStr) return '';
    try {
      const d = new Date(isoStr);
      const diffMs = Date.now() - d.getTime();
      const diffMins = Math.floor(diffMs / 60000);
      if (diffMins < 1) return 'Just now';
      if (diffMins < 60) return `${diffMins}m ago`;
      const diffHrs = Math.floor(diffMins / 60);
      if (diffHrs < 24) return `${diffHrs}h ago`;
      return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
    } catch {
      return isoStr;
    }
  };

  const getTypeIcon = (type?: string) => {
    switch (type) {
      case 'ASSIGNMENT':
        return <UserPlus className="w-4 h-4 text-indigo-600" />;
      case 'STATUS_CHANGE':
        return <Clock className="w-4 h-4 text-blue-600" />;
      case 'COMMENT':
        return <MessageSquare className="w-4 h-4 text-emerald-600" />;
      case 'CATEGORY_CHANGE':
        return <Tag className="w-4 h-4 text-purple-600" />;
      case 'ALERT':
        return <AlertTriangle className="w-4 h-4 text-amber-600" />;
      default:
        return <Bell className="w-4 h-4 text-slate-600" />;
    }
  };

  return (
    <div className="min-h-screen bg-[#F4F6FB] pb-16">
      <Navbar />

      <main className="max-w-[1100px] mx-auto px-4 sm:px-6 space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2.5">
              <h1 className="text-3xl font-extrabold text-[#0B132B] tracking-tight">
                Notification Center
              </h1>
              {unreadCount > 0 && (
                <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-rose-50 text-rose-700 border border-rose-200">
                  {unreadCount} Unread
                </span>
              )}
            </div>
            <p className="text-xs text-slate-400 mt-1">
              Audit trail of ticket updates, triage category reassignments, agent assignments, and customer feedback
            </p>
          </div>

          <div className="flex items-center gap-2">
            {unreadCount > 0 && (
              <button
                onClick={handleMarkAllRead}
                className="flex items-center gap-1.5 px-4 py-2 rounded-full text-xs font-semibold bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 shadow-2xs transition-colors cursor-pointer"
              >
                <CheckCheck className="w-3.5 h-3.5" />
                <span>Mark All Read</span>
              </button>
            )}

            {notifications.length > 0 && (
              <button
                onClick={handleClearAll}
                className="flex items-center gap-1.5 px-4 py-2 rounded-full text-xs font-semibold bg-white border border-rose-200 hover:bg-rose-50 text-rose-600 shadow-2xs transition-colors cursor-pointer"
                title="Clear all notifications"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Clear All</span>
              </button>
            )}

            <button
              onClick={() => loadData(true)}
              disabled={isLoading}
              className="w-8 h-8 rounded-full bg-white border border-slate-200 flex items-center justify-center text-slate-600 hover:text-slate-900 shadow-2xs cursor-pointer"
              title="Refresh notifications"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
            </button>
          </div>
        </div>

        {/* Filter and Search Bar */}
        <div className="pill-card p-4 sm:p-5 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            {/* Filter Pills */}
            <div className="flex items-center gap-1.5 overflow-x-auto pb-1">
              {[
                { id: 'ALL', label: 'All' },
                { id: 'UNREAD', label: `Unread (${unreadCount})` },
                { id: 'ASSIGNMENT', label: 'Assignments' },
                { id: 'STATUS_CHANGE', label: 'Status Updates' },
                { id: 'COMMENT', label: 'Replies & Notes' },
              ].map(f => (
                <button
                  key={f.id}
                  onClick={() => setFilterType(f.id as any)}
                  className={`px-3.5 py-1 rounded-full text-xs font-semibold transition-all cursor-pointer whitespace-nowrap ${
                    filterType === f.id
                      ? 'bg-[#0B132B] text-white shadow-2xs'
                      : 'text-slate-600 hover:bg-slate-100'
                  }`}
                >
                  {f.label}
                </button>
              ))}
            </div>

            {/* Search Input */}
            <div className="relative">
              <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                placeholder="Search alerts..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-8 pr-4 py-1.5 rounded-full text-xs bg-slate-50 border border-slate-200 text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-900/10 transition-all w-full sm:w-56"
              />
            </div>
          </div>
        </div>

        {/* Notifications List */}
        <div className="space-y-3">
          {isLoading ? (
            <div className="pill-card p-12 text-center text-xs text-slate-400">
              Loading notification activities...
            </div>
          ) : displayedNotifications.length === 0 ? (
            <div className="pill-card p-12 text-center space-y-2">
              <Inbox className="w-8 h-8 text-slate-300 mx-auto" />
              <h3 className="text-sm font-bold text-slate-700">No notifications found</h3>
              <p className="text-xs text-slate-400">
                {filterType === 'UNREAD' 
                  ? 'All notifications have been reviewed. You are up to date!' 
                  : 'New ticket assignments, status updates, and comments will show up here.'}
              </p>
            </div>
          ) : (
            displayedNotifications.map((item) => (
              <div
                key={item.notificationId}
                onClick={() => handleNotificationClick(item)}
                className={`pill-card p-5 flex items-start gap-4 transition-all cursor-pointer hover:shadow-md border ${
                  item.isRead 
                    ? 'bg-white border-slate-100' 
                    : 'bg-white border-indigo-200/80 shadow-xs'
                }`}
              >
                {/* Icon box */}
                <div className={`w-10 h-10 rounded-2xl flex items-center justify-center shrink-0 ${
                  item.isRead ? 'bg-slate-100' : 'bg-indigo-50'
                }`}>
                  {getTypeIcon(item.type)}
                </div>

                {/* Content */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2 mb-1">
                    <div className="flex items-center gap-2 truncate">
                      <h4 className={`text-sm font-bold truncate ${item.isRead ? 'text-slate-800' : 'text-[#0B132B]'}`}>
                        {item.title}
                      </h4>
                      {!item.isRead && (
                        <span className="w-2 h-2 rounded-full bg-indigo-600 shrink-0" />
                      )}
                    </div>
                    <span className="text-[11px] text-slate-400 shrink-0">
                      {formatRelativeTime(item.createdAt)}
                    </span>
                  </div>

                  <p className="text-xs text-slate-600 leading-relaxed mb-3">
                    {item.message}
                  </p>

                  <div className="flex items-center justify-between pt-2 border-t border-slate-100 text-xs">
                    {item.ticketPublicId ? (
                      <span className="font-mono text-xs text-indigo-600 font-semibold hover:underline inline-flex items-center gap-1">
                        <span>Incident: {item.ticketPublicId.substring(0, 8).toUpperCase()}</span>
                        <ArrowRight className="w-3 h-3" />
                      </span>
                    ) : (
                      <span className="text-[11px] text-slate-400">System Notification</span>
                    )}

                    <div className="flex items-center gap-2">
                      {!item.isRead ? (
                        <button
                          onClick={(e) => handleMarkAsRead(item.notificationId, e)}
                          className="font-semibold text-blue-600 hover:text-blue-800 flex items-center gap-1 cursor-pointer text-xs"
                        >
                          <Check className="w-3.5 h-3.5" />
                          <span>Mark Read</span>
                        </button>
                      ) : (
                        <span className="text-[11px] text-slate-400 flex items-center gap-1">
                          <Check className="w-3 h-3 text-slate-400" />
                          <span>Read</span>
                        </span>
                      )}

                      <button
                        onClick={(e) => handleDeleteNotification(item.notificationId, e)}
                        className="p-1 rounded-md text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer"
                        title="Delete notification"
                        aria-label="Delete notification"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Pagination Strip */}
        {filteredNotifications.length > 0 && (
          <div className="pill-card px-6 py-4 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-slate-500">
            <div>
              Showing <span className="font-bold text-slate-800">
                {filteredNotifications.length === 0 ? 0 : startIndex + 1} - {endIndex}
              </span> of <span className="font-bold text-slate-800">{filteredNotifications.length}</span> alerts
            </div>

            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                <span>Rows per page:</span>
                <div className="relative">
                  <select
                    value={pageSize}
                    onChange={(e) => setPageSize(Number(e.target.value))}
                    className="appearance-none bg-white border border-slate-200 rounded-lg px-2.5 py-1 pr-6 font-semibold text-slate-700 focus:outline-none cursor-pointer"
                  >
                    <option value={10}>10</option>
                    <option value={20}>20</option>
                    <option value={50}>50</option>
                  </select>
                  <ChevronDown className="w-3 h-3 text-slate-400 absolute right-1.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                </div>
              </div>

              <div className="flex items-center gap-1.5">
                <button 
                  disabled={currentPage === 0 || isLoading}
                  onClick={() => setCurrentPage(p => Math.max(0, p - 1))}
                  className="flex items-center gap-1 px-3 py-1 rounded-md text-slate-600 hover:bg-slate-100 disabled:opacity-40 transition-colors cursor-pointer disabled:cursor-not-allowed font-medium"
                >
                  <ChevronLeft className="w-3.5 h-3.5" />
                  <span>Prev</span>
                </button>
                
                {Array.from({ length: totalPages }, (_, i) => (
                  <button
                    key={i}
                    disabled={isLoading}
                    onClick={() => setCurrentPage(i)}
                    className={`w-7 h-7 rounded-md font-bold flex items-center justify-center text-xs transition-colors cursor-pointer ${
                      currentPage === i
                        ? 'bg-[#0B132B] text-white shadow-2xs'
                        : 'text-slate-600 hover:bg-slate-100'
                    }`}
                  >
                    {i + 1}
                  </button>
                )).slice(Math.max(0, currentPage - 2), Math.min(totalPages, currentPage + 3))}

                <button 
                  disabled={currentPage >= totalPages - 1 || isLoading}
                  onClick={() => setCurrentPage(p => Math.min(totalPages - 1, p + 1))}
                  className="flex items-center gap-1 px-3 py-1 rounded-md text-slate-600 hover:bg-slate-100 disabled:opacity-40 transition-colors cursor-pointer disabled:cursor-not-allowed font-medium"
                >
                  <span>Next</span>
                  <ChevronRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          </div>
        )}
      </main>

      {/* Confirmation Modal */}
      {ConfirmModalElement}
    </div>
  );
}
