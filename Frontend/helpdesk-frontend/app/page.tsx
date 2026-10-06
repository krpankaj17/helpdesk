'use client';

import React, { useState, useEffect, useMemo } from 'react';
import Navbar from '@/components/Navbar';
import AuthGuard from '@/components/AuthGuard';
import StatCard from '@/components/StatCard';
import TicketTable from '@/components/TicketTable';
import TicketModal from '@/components/TicketModal';
import CreateTicketModal from '@/components/CreateTicketModal';
import { api } from '@/lib/api';
import { Ticket, TicketCategory, User, TicketStatus, CreateTicketRequest, DashboardMetrics } from '@/types';
import { useAuth } from '@/context/AuthContext';
import { useToast } from '@/context/ToastContext';
import { Plus, RefreshCw, Inbox, Clock, HelpCircle, AlertCircle, Check } from 'lucide-react';

export default function DashboardPage() {
  return (
    <AuthGuard>
      <DashboardContent />
    </AuthGuard>
  );
}

function DashboardContent() {
  const { role, user } = useAuth();
  const { toast } = useToast();
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [categories, setCategories] = useState<TicketCategory[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [metrics, setMetrics] = useState<DashboardMetrics | null>(null);
  const [selectedTicket, setSelectedTicket] = useState<Ticket | null>(null);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  // Server-side pagination state connected to Spring Boot Pageable
  const [currentPage, setCurrentPage] = useState(0);
  const [pageSize, setPageSize] = useState(10);
  const [totalPages, setTotalPages] = useState(1);
  const [totalElements, setTotalElements] = useState(0);

  const loadData = async (targetPage = currentPage, targetSize = pageSize) => {
    setIsLoading(true);
    try {
      const isAgent = role === 'SUPPORT_AGENT' || (role as string) === 'AGENT';
      const isRequester = role === 'REQUESTER';
      const [tPage, cList, uList, metricData] = await Promise.all([
        api.tickets.getPaginated({
          page: targetPage,
          size: targetSize,
          agentEmail: isAgent ? user?.email : undefined,
          unassigned: (isRequester || isAgent) ? undefined : true,
          sort: 'createdAt,desc',
        }).catch(() => null),
        api.categories.getAll().catch(() => []),
        api.users.getAll().catch(() => []),
        api.tickets.getDashboardMetrics().catch(() => null),
      ]);

      if (tPage) {
        setTickets(tPage.content || []);
        setTotalPages(tPage.totalPages);
        setTotalElements(tPage.totalElements);
        setCurrentPage(tPage.number);
      }
      setCategories(cList || []);
      setUsers(uList || []);
      setMetrics(metricData);
    } catch {
      // Fail silently to keep UI clean
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData(0, pageSize);
  }, [role, user?.email]);

  const handlePageChange = (newPage: number) => {
    setCurrentPage(newPage);
    loadData(newPage, pageSize);
  };

  const handlePageSizeChange = (newSize: number) => {
    setPageSize(newSize);
    setCurrentPage(0);
    loadData(0, newSize);
  };

  const handleUpdateStatus = async (ticketId: string, status: TicketStatus, resolutionNote?: string) => {
    try {
      await api.tickets.updateStatus(ticketId, status, resolutionNote);
      toast.success(`Ticket status updated to ${status}`);
      await loadData(currentPage, pageSize);
      if (selectedTicket && selectedTicket.ticketPublicId === ticketId) {
        setSelectedTicket({ ...selectedTicket, status });
      }
    } catch (err: any) {
      toast.error(err.message || 'Failed to update status');
    }
  };

  const handleAssignTicket = async (ticketId: string, agentEmail: string, agentName: string) => {
    try {
      await api.tickets.assign(ticketId, agentEmail);
      toast.success(`Ticket assigned to ${agentName || agentEmail}`);
      await loadData(currentPage, pageSize);
      if (selectedTicket && selectedTicket.ticketPublicId === ticketId) {
        setSelectedTicket({ 
          ...selectedTicket, 
          assignedAgentEmail: agentEmail, 
          assignedAgentName: agentName,
          status: selectedTicket.status === 'OPEN' ? 'IN_PROGRESS' : selectedTicket.status
        });
      }
    } catch (err: any) {
      toast.error(err.message || 'Failed to assign ticket');
    }
  };

  const handleCreateTicket = async (ticketReq: CreateTicketRequest) => {
    try {
      await api.tickets.create(ticketReq);
      toast.success('Ticket created successfully');
      await loadData(0, pageSize);
    } catch (err: any) {
      toast.error(err.message || 'Failed to create ticket');
    }
  };

  const handleUpdateCategory = async (ticketId: string, categoryId: number) => {
    try {
      await api.tickets.updateCategory(ticketId, categoryId);
      toast.success('Category updated successfully');
      await loadData(currentPage, pageSize);
      if (selectedTicket && selectedTicket.ticketPublicId === ticketId) {
        const newCat = categories.find(c => c.categoryId === categoryId);
        setSelectedTicket({
          ...selectedTicket,
          categoryId,
          categoryName: newCat?.name || selectedTicket.categoryName,
        });
      }
    } catch (err: any) {
      toast.error(err.message || 'Failed to update category');
    }
  };

  const supportAgents = useMemo(() => {
    const list = users.filter(u => u.roleName === 'SUPPORT_AGENT' || u.roleName === 'SUPPORT_MANAGER' || (u.roleName as string) === 'AGENT');
    const seen = new Set<string>();
    return list.filter(u => {
      const key = (u.email || u.userPublicId).toLowerCase().trim();
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  }, [users]);

  const isAgent = role === 'SUPPORT_AGENT' || (role as string) === 'AGENT';
  const isRequester = role === 'REQUESTER';

  const pageTitle = isRequester 
    ? 'My Service Requests' 
    : isAgent 
      ? 'My Assigned Tickets' 
      : 'Unassigned Tickets';

  return (
    <div className="min-h-screen bg-[#F4F6FB] pb-16">
      <Navbar />

      <main className="max-w-[1400px] mx-auto px-4 sm:px-6 space-y-6">
        {/* Simple Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-[#0B132B] tracking-tight">
              {isRequester ? 'My Tickets' : 'HelpDesk Dashboard'}
            </h1>
            <p className="text-xs sm:text-sm text-slate-500 font-normal mt-0.5">
              {isRequester 
                ? 'Track your submitted support requests and resolution status.'
                : isAgent
                  ? 'Active support tickets assigned to you for resolution.'
                  : 'Newly created unassigned tickets pending agent assignment.'
              }
            </p>
          </div>

          <div className="flex items-center gap-3 self-start sm:self-center">
            <button
              onClick={() => setIsCreateModalOpen(true)}
              className="flex items-center gap-2 px-5 py-2 rounded-full text-xs font-semibold bg-[#0B132B] hover:bg-slate-800 text-white shadow-xs transition-all cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>{isRequester ? 'New Request' : 'New Ticket'}</span>
            </button>

            <button
              onClick={() => loadData(currentPage, pageSize)}
              disabled={isLoading}
              className="w-8 h-8 rounded-full bg-white border border-slate-200 flex items-center justify-center text-slate-600 hover:text-slate-900 hover:bg-slate-50 shadow-2xs transition-all cursor-pointer"
              title="Refresh tickets"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
            </button>
          </div>
        </div>

        {/* Real Backend Dashboard Metrics */}
        {metrics && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <StatCard
              title={isAgent ? "Assigned to You" : "Total Tickets"}
              value={metrics.totalTickets}
              icon={<Inbox className="w-4 h-4 text-slate-600" />}
            />
            <StatCard
              title="Active Queue"
              value={metrics.openTickets + metrics.inProgressTickets}
              icon={<Clock className="w-4 h-4 text-blue-600" />}
            />
            <StatCard
              title="Waiting on User"
              value={metrics.waitingTickets}
              icon={<HelpCircle className="w-4 h-4 text-amber-600" />}
            />
            {isAgent ? (
              <StatCard
                title="Resolved Tickets"
                value={metrics.resolvedTickets}
                icon={<Check className="w-4 h-4 text-emerald-600" />}
              />
            ) : (
              <StatCard
                title="Unassigned Tickets"
                value={metrics.unassignedTickets}
                icon={<AlertCircle className="w-4 h-4 text-rose-600" />}
              />
            )}
          </div>
        )}

        {/* Newly Created & Unassigned Tickets Table with Backend Pagination */}
        <div className="pt-1">
          <TicketTable
            tickets={tickets}
            categories={categories}
            supportAgents={supportAgents}
            onSelectTicket={setSelectedTicket}
            title={pageTitle}
            subtitle=""
            showAllLink={true}
            currentPage={currentPage}
            totalPages={totalPages}
            totalElements={totalElements}
            pageSize={pageSize}
            onPageChange={handlePageChange}
            onPageSizeChange={handlePageSizeChange}
            isLoading={isLoading}
          />
        </div>
      </main>

      {/* Ticket Details & Action Modal */}
      <TicketModal
        ticket={selectedTicket}
        isOpen={!!selectedTicket}
        onClose={() => setSelectedTicket(null)}
        onUpdateStatus={handleUpdateStatus}
        onAssignTicket={handleAssignTicket}
        onUpdateCategory={handleUpdateCategory}
        agents={supportAgents}
        categories={categories}
      />

      {/* Create Ticket Modal */}
      <CreateTicketModal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        onSubmit={handleCreateTicket}
        categories={categories}
      />
    </div>
  );
}
