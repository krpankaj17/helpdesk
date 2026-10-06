'use client';

import React, { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
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
  X,
  ExternalLink,
  UserPlus,
  Tag,
  ArrowRight,
  Trash2
} from 'lucide-react';

export default function NotificationCenter() {
  const router = useRouter();
  const [isOpen, setIsOpen] = useState(false);
  const [unreadCount, setUnreadCount] = useState<number>(0);
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [unreadOnly, setUnreadOnly] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const fetchUnreadCount = async () => {
    try {
      const res = await api.notifications.getUnreadCount();
      setUnreadCount(res.unreadCount || 0);
    } catch {
      // Ignore if unauthenticated or offline
    }
  };

  const loadNotifications = async () => {
    setIsLoading(true);
    try {
      const data = await api.notifications.getAll(unreadOnly, 0, 20);
      setNotifications(data.content || []);
    } catch {
      // Ignore
    } finally {
      setIsLoading(false);
    }
  };

  // Poll unread count periodically (every 15s)
  useEffect(() => {
    fetchUnreadCount();
    const timer = setInterval(fetchUnreadCount, 15000);
    return () => clearInterval(timer);
  }, []);

  // When dropdown opens or unreadOnly changes, reload
  useEffect(() => {
    if (isOpen) {
      loadNotifications();
      fetchUnreadCount();
    }
  }, [isOpen, unreadOnly]);

  // Click outside to close
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen]);

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
    } catch {
      // Ignore
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
    } catch {
      // Ignore
    }
  };

  const handleClearAll = async (e?: React.MouseEvent) => {
    e?.stopPropagation();
    if (notifications.length === 0) return;
    try {
      await api.notifications.clearAll();
      setNotifications([]);
      setUnreadCount(0);
    } catch {
      // Ignore
    }
  };

  const handleNotificationClick = async (item: NotificationItem) => {
    if (!item.isRead) {
      await handleMarkAsRead(item.notificationId);
    }
    setIsOpen(false);
    if (item.ticketPublicId) {
      router.push(`/tickets?ticketId=${item.ticketPublicId}`);
    }
  };

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
      return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    } catch {
      return isoStr;
    }
  };

  const getTypeIcon = (type?: string) => {
    switch (type) {
      case 'ASSIGNMENT':
        return <UserPlus className="w-3.5 h-3.5 text-indigo-600" />;
      case 'STATUS_CHANGE':
        return <Clock className="w-3.5 h-3.5 text-blue-600" />;
      case 'COMMENT':
        return <MessageSquare className="w-3.5 h-3.5 text-emerald-600" />;
      case 'CATEGORY_CHANGE':
        return <Tag className="w-3.5 h-3.5 text-purple-600" />;
      case 'ALERT':
        return <AlertTriangle className="w-3.5 h-3.5 text-amber-600" />;
      default:
        return <Bell className="w-3.5 h-3.5 text-slate-600" />;
    }
  };

  return (
    <div className="relative" ref={dropdownRef}>
      {/* Bell Trigger Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="relative p-2 rounded-full text-slate-600 hover:text-slate-900 hover:bg-slate-100 transition-all cursor-pointer focus:outline-none"
        title="Notifications"
        aria-label="View notifications"
      >
        <Bell className="w-4 h-4 text-slate-700" />
        {unreadCount > 0 && (
          <span className="absolute top-1 right-1 w-4 h-4 rounded-full bg-rose-500 text-white font-bold text-[9px] flex items-center justify-center ring-2 ring-white animate-pulse">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {/* Floating Notification Popover */}
      {isOpen && (
        <div className="absolute right-0 top-full mt-2 w-80 sm:w-96 rounded-3xl bg-white shadow-2xl border border-slate-100 p-4 z-50 animate-in fade-in slide-in-from-top-2">
          {/* Header */}
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <div className="flex items-center gap-2">
              <span className="font-bold text-sm text-[#0B132B]">Notifications</span>
              {unreadCount > 0 && (
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-50 text-rose-700 border border-rose-200">
                  {unreadCount} unread
                </span>
              )}
            </div>

            <div className="flex items-center gap-1.5">
              {unreadCount > 0 && (
                <button
                  onClick={handleMarkAllRead}
                  className="flex items-center gap-1 text-[11px] font-semibold text-slate-500 hover:text-[#0B132B] px-2 py-1 rounded-lg hover:bg-slate-100 transition-colors cursor-pointer"
                  title="Mark all as read"
                >
                  <CheckCheck className="w-3.5 h-3.5" />
                  <span>Mark all read</span>
                </button>
              )}
              {notifications.length > 0 && (
                <button
                  onClick={handleClearAll}
                  className="flex items-center gap-1 text-[11px] font-semibold text-rose-500 hover:text-rose-700 px-2 py-1 rounded-lg hover:bg-rose-50 transition-colors cursor-pointer"
                  title="Clear all notifications"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>Clear</span>
                </button>
              )}
              <button
                onClick={() => setIsOpen(false)}
                className="p-1 rounded-full text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Filter Pills */}
          <div className="flex items-center gap-1.5 py-2 border-b border-slate-100">
            <button
              onClick={() => setUnreadOnly(false)}
              className={`px-3 py-1 rounded-full text-[11px] font-semibold transition-all cursor-pointer ${
                !unreadOnly 
                  ? 'bg-[#0B132B] text-white shadow-xs' 
                  : 'text-slate-600 hover:bg-slate-100'
              }`}
            >
              All
            </button>
            <button
              onClick={() => setUnreadOnly(true)}
              className={`px-3 py-1 rounded-full text-[11px] font-semibold transition-all cursor-pointer ${
                unreadOnly 
                  ? 'bg-[#0B132B] text-white shadow-xs' 
                  : 'text-slate-600 hover:bg-slate-100'
              }`}
            >
              Unread Only
            </button>
          </div>

          {/* Notifications List */}
          <div className="max-h-80 overflow-y-auto py-2 space-y-1.5 pr-0.5">
            {isLoading ? (
              <div className="p-6 text-center text-xs text-slate-400">
                Loading notifications...
              </div>
            ) : notifications.length === 0 ? (
              <div className="p-6 text-center space-y-1.5">
                <Inbox className="w-7 h-7 text-slate-300 mx-auto" />
                <p className="text-xs font-semibold text-slate-700">No notifications</p>
                <p className="text-[11px] text-slate-400">
                  {unreadOnly ? 'You are all caught up!' : 'Activity updates will appear here.'}
                </p>
              </div>
            ) : (
              notifications.map((item) => (
                <div
                  key={item.notificationId}
                  onClick={() => handleNotificationClick(item)}
                  className={`p-3 rounded-2xl text-xs transition-all border cursor-pointer hover:shadow-xs ${
                    item.isRead 
                      ? 'bg-white border-slate-100 text-slate-600 hover:bg-slate-50' 
                      : 'bg-indigo-50/40 border-indigo-100 text-slate-900 font-medium'
                  }`}
                >
                  <div className="flex items-start justify-between gap-2 mb-1">
                    <div className="flex items-center gap-1.5">
                      {getTypeIcon(item.type)}
                      <span className="font-bold text-slate-900 text-xs">
                        {item.title}
                      </span>
                    </div>
                    <span className="text-[10px] text-slate-400 shrink-0">
                      {formatRelativeTime(item.createdAt)}
                    </span>
                  </div>

                  <p className="text-[11px] text-slate-600 leading-relaxed mb-1.5 line-clamp-2">
                    {item.message}
                  </p>

                  <div className="flex items-center justify-between pt-1 border-t border-slate-100/60 text-[10px]">
                    {item.ticketPublicId ? (
                      <span className="font-mono text-indigo-600 font-semibold hover:underline flex items-center gap-1">
                        <span>Ticket: {item.ticketPublicId.substring(0, 8).toUpperCase()}</span>
                        <ArrowRight className="w-2.5 h-2.5" />
                      </span>
                    ) : <span />}

                    <div className="flex items-center gap-1.5">
                      {!item.isRead && (
                        <button
                          onClick={(e) => handleMarkAsRead(item.notificationId, e)}
                          className="flex items-center gap-1 font-semibold text-blue-600 hover:text-blue-800 cursor-pointer"
                          title="Mark as read"
                        >
                          <Check className="w-3 h-3" />
                          <span>Mark read</span>
                        </button>
                      )}
                      <button
                        onClick={(e) => handleDeleteNotification(item.notificationId, e)}
                        className="p-1 rounded text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer"
                        title="Delete notification"
                        aria-label="Delete notification"
                      >
                        <Trash2 className="w-3 h-3" />
                      </button>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Footer with Link to full Notifications Center */}
          <div className="pt-2.5 mt-1 border-t border-slate-100 flex items-center justify-between text-xs">
            <span className="text-[11px] text-slate-400">Live operational alerts</span>
            <Link
              href="/notifications"
              onClick={() => setIsOpen(false)}
              className="font-semibold text-slate-700 hover:text-slate-950 inline-flex items-center gap-1 transition-colors cursor-pointer"
            >
              <span>View all notifications</span>
              <ExternalLink className="w-3 h-3" />
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}
