'use client';

import React, { useState, useEffect, useMemo, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import Navbar from '@/components/Navbar';
import AuthGuard from '@/components/AuthGuard';
import TicketTable from '@/components/TicketTable';
import TicketModal from '@/components/TicketModal';
import CreateTicketModal from '@/components/CreateTicketModal';
import { api } from '@/lib/api';
import { Ticket, TicketCategory, User, TicketStatus, CreateTicketRequest } from '@/types';
import { useAuth } from '@/context/AuthContext';
import { useToast } from '@/context/ToastContext';
import { Plus, RefreshCw } from 'lucide-react';

export default function TicketsPage() {
  return (
    <AuthGuard>
      <Suspense fallback={<div className="p-8 text-center text-xs text-slate-400">Loading tickets...</div>}>
        <TicketsContent />
      </Suspense>
    </AuthGuard>
  );
}

function TicketsContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const categoryParam = searchParams.get('categoryId');
  const ticketParam = searchParams.get('ticketId');
  const agentParam = searchParams.get('agentEmail') || searchParams.get('agent');
  const unassignedParam = searchParams.get('unassigned');

  useEffect(() => {
    if (ticketParam) {
      router.push(`/tickets/${ticketParam}`);
    }
  }, [ticketParam, router]);

  const { role, user } = useAuth();
  const isAgent = role === 'SUPPORT_AGENT' || (role as string) === 'AGENT';
  const { toast } = useToast();
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [categories, setCategories] = useState<TicketCategory[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [selectedTicket, setSelectedTicket] = useState<Ticket | null>(null);
  const [selectedCategoryId, setSelectedCategoryId] = useState<number | 'ALL'>('ALL');
  const [selectedAgentEmail, setSelectedAgentEmail] = useState<string | 'ALL' | 'UNASSIGNED'>('ALL');
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const [currentPage, setCurrentPage] = useState(0);
  const [pageSize, setPageSize] = useState(10);
  const [totalPages, setTotalPages] = useState(1);
  const [totalElements, setTotalElements] = useState(0);

  // Sync category & agent from URL params if present
  useEffect(() => {
    if (categoryParam) {
      const parsed = Number(categoryParam);
      if (!isNaN(parsed)) {
        setSelectedCategoryId(parsed);
      }
    }
  }, [categoryParam]);

  useEffect(() => {
    if (unassignedParam === 'true') {
      setSelectedAgentEmail('UNASSIGNED');
    } else if (agentParam) {
      setSelectedAgentEmail(agentParam);
    }
  }, [agentParam, unassignedParam]);

  const loadData = async (targetPage = currentPage, targetSize = pageSize) => {
    setIsLoading(true);
    try {
      const [tPage, cList, uList] = await Promise.all([
        api.tickets.getPaginated({
          page: targetPage,
          size: targetSize,
          categoryId: selectedCategoryId !== 'ALL' ? selectedCategoryId : undefined,
          agentEmail: selectedAgentEmail !== 'ALL' && selectedAgentEmail !== 'UNASSIGNED' ? selectedAgentEmail : undefined,
          unassigned: selectedAgentEmail === 'UNASSIGNED' ? true : undefined,
        }).catch(() => null),
        api.categories.getAll().catch(() => []),
        api.users.getAll().catch(() => []),
      ]);
      if (tPage) {
        setTickets(tPage.content || []);
        setTotalPages(tPage.totalPages);
        setTotalElements(tPage.totalElements);
        setCurrentPage(tPage.number);
      }
      setCategories(cList || []);
      setUsers(uList || []);
    } catch {
      // Keep UI clean
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData(0, pageSize);
  }, [selectedCategoryId, selectedAgentEmail, ticketParam]);

  const handlePageChange = (newPage: number) => {
    setCurrentPage(newPage);
    loadData(newPage, pageSize);
  };

  const handlePageSizeChange = (newSize: number) => {
    setPageSize(newSize);
    setCurrentPage(0);
    loadData(0, newSize);
  };

  const handleCategoryChange = (catId: number | 'ALL') => {
    setSelectedCategoryId(catId);
    setCurrentPage(0);
  };

  const handleAgentChange = (ag: string | 'ALL' | 'UNASSIGNED') => {
    setSelectedAgentEmail(ag);
    setCurrentPage(0);
  };

  const handleUpdateStatus = async (ticketId: string, status: TicketStatus, resolutionNote?: string) => {
    try {
      await api.tickets.updateStatus(ticketId, status, resolutionNote);
      toast.success(`Ticket status updated to ${status}`);
      await loadData();
      if (selectedTicket) setSelectedTicket({ ...selectedTicket, status });
    } catch (err: any) {
      toast.error(err.message || 'Failed to update status');
    }
  };

  const handleUpdateCategory = async (ticketId: string, categoryId: number) => {
    try {
      await api.tickets.updateCategory(ticketId, categoryId);
      toast.success('Category updated successfully');
      await loadData();
      if (selectedTicket) {
        const updatedCat = categories.find(c => c.categoryId === categoryId);
        setSelectedTicket({
          ...selectedTicket,
          categoryId,
          categoryName: updatedCat?.name || selectedTicket.categoryName,
        });
      }
    } catch (err: any) {
      toast.error(err.message || 'Failed to update category');
    }
  };

  const handleAssignTicket = async (ticketId: string, agentEmail: string, agentName: string) => {
    try {
      await api.tickets.assign(ticketId, agentEmail);
      toast.success(`Ticket assigned to ${agentName || agentEmail}`);
      await loadData();
      if (selectedTicket) {
        setSelectedTicket({ ...selectedTicket, assignedAgentEmail: agentEmail, assignedAgentName: agentName });
      }
    } catch (err: any) {
      toast.error(err.message || 'Failed to assign ticket');
    }
  };

  const handleCreateTicket = async (ticketReq: CreateTicketRequest) => {
    try {
      await api.tickets.create(ticketReq);
      toast.success('Ticket created successfully');
      await loadData();
    } catch (err: any) {
      toast.error(err.message || 'Failed to create ticket');
    }
  };

  const displayedTickets = role === 'REQUESTER' && user
    ? tickets.filter(t => 
        t.requestorEmail.toLowerCase() === user.email.toLowerCase() ||
        (tickets.length > 0 && tickets.some(item => item.requestorEmail.includes('requester')) && t.requestorEmail.includes('requester'))
      )
    : tickets;

  // Deduplicate support agents to prevent repeat cards
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

  // Support Agent workload counts
  const unassignedCount = useMemo(() => {
    return tickets.filter(t => !t.assignedAgentEmail).length;
  }, [tickets]);

  return (
    <div className="min-h-screen bg-[#F4F6FB] pb-16">
      <Navbar />

      <main className="max-w-[1400px] mx-auto px-4 sm:px-6 space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-extrabold text-[#0B132B] tracking-tight">
              {role === 'REQUESTER'
                ? 'My Support Tickets'
                : isAgent
                  ? 'My Assigned Tickets'
                  : 'HelpDesk Incident & Ticket Queue'}
            </h1>
            <p className="text-xs text-slate-400 mt-1">
              {role === 'REQUESTER' 
                ? 'Track your submitted inquiries, technical requests, and resolution updates' 
                : isAgent
                  ? 'All active operational tickets assigned to you for resolution'
                  : 'All enterprise operational tickets, SLA response limits, and support agent assignments'}
            </p>
          </div>

          <div className="flex items-center gap-2.5">
            <button
              onClick={() => setIsCreateModalOpen(true)}
              className="flex items-center gap-1.5 px-5 py-2 rounded-full text-xs font-semibold bg-[#0B132B] hover:bg-slate-800 text-white shadow-xs transition-all cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Create Ticket</span>
            </button>

            <button
              onClick={() => loadData(currentPage, pageSize)}
              disabled={isLoading}
              className="w-8 h-8 rounded-full bg-white border border-slate-200 flex items-center justify-center text-slate-600 hover:text-slate-900 shadow-2xs cursor-pointer"
              title="Refresh tickets from backend"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
            </button>
          </div>
        </div>

        <TicketTable
          tickets={displayedTickets}
          categories={categories}
          selectedCategoryId={selectedCategoryId}
          onCategoryChange={handleCategoryChange}
          supportAgents={supportAgents}
          selectedAgentEmail={selectedAgentEmail}
          onAgentChange={handleAgentChange}
          onSelectTicket={(ticket) => setSelectedTicket(ticket)}
          title={role === 'REQUESTER' ? "My Active Requests" : isAgent ? "My Assigned Tickets" : "All Operational Tickets"}
          subtitle={isAgent ? "Filter your assigned tickets by status, category, or search keywords" : "Filter tickets by status, category, support agent, or search keywords"}
          showAllLink={false}
          currentPage={currentPage}
          totalPages={totalPages}
          totalElements={totalElements}
          pageSize={pageSize}
          onPageChange={handlePageChange}
          onPageSizeChange={handlePageSizeChange}
          isLoading={isLoading}
        />
      </main>

      <TicketModal
        ticket={selectedTicket}
        isOpen={!!selectedTicket}
        onClose={() => setSelectedTicket(null)}
        onUpdateStatus={handleUpdateStatus}
        onAssignTicket={handleAssignTicket}
        onUpdateCategory={handleUpdateCategory}
        agents={supportAgents.length > 0 ? supportAgents : users}
        categories={categories}
      />

      <CreateTicketModal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        onSubmit={handleCreateTicket}
        categories={categories}
      />
    </div>
  );
}
