'use client';

import React, { useState, useMemo, useRef, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Ticket, TicketStatus, TicketCategory, User } from '@/types';
import { useAuth } from '@/context/AuthContext';
import TablePagination from '@/components/TablePagination';
import { 
  Search, 
  Tag, 
  Layers, 
  ChevronDown, 
  ChevronLeft,
  ChevronRight,
  X, 
  Headphones, 
  UserCheck
} from 'lucide-react';

interface TicketTableProps {
  tickets: Ticket[];
  categories?: TicketCategory[];
  selectedCategoryId?: number | 'ALL';
  onCategoryChange?: (categoryId: number | 'ALL') => void;
  supportAgents?: User[];
  selectedAgentEmail?: string | 'ALL' | 'UNASSIGNED';
  onAgentChange?: (agentEmail: string | 'ALL' | 'UNASSIGNED') => void;
  onSelectTicket?: (ticket: Ticket) => void;
  title?: string;
  subtitle?: string;
  showAllLink?: boolean;

  // Pagination props (Server-side or controlled)
  currentPage?: number;
  totalPages?: number;
  totalElements?: number;
  pageSize?: number;
  onPageChange?: (newPage: number) => void;
  onPageSizeChange?: (newSize: number) => void;
  isLoading?: boolean;
}

export default function TicketTable({
  tickets,
  categories = [],
  selectedCategoryId,
  onCategoryChange,
  supportAgents = [],
  selectedAgentEmail,
  onAgentChange,
  onSelectTicket,
  title = "Tickets",
  subtitle,
  showAllLink = true,
  currentPage,
  totalPages,
  totalElements,
  pageSize,
  onPageChange,
  onPageSizeChange,
  isLoading = false,
}: TicketTableProps) {
  const router = useRouter();
  const { role } = useAuth();
  const isAgent = role === 'SUPPORT_AGENT' || (role as string) === 'AGENT';
  const canFilterByAgent = role === 'ADMIN' || role === 'SUPPORT_MANAGER';

  const [filterTab, setFilterTab] = useState<'ALL' | 'OPEN' | 'IN_PROGRESS' | 'WAITING' | 'RESOLVED' | 'CLOSED'>('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [internalCategory, setInternalCategory] = useState<number | 'ALL'>('ALL');
  const [internalAgent, setInternalAgent] = useState<string | 'ALL' | 'UNASSIGNED'>('ALL');

  // Internal pagination fallback if not controlled from parent
  const [internalPage, setInternalPage] = useState(0);
  const [internalPageSize, setInternalPageSize] = useState(10);

  const page = currentPage !== undefined ? currentPage : internalPage;
  const size = pageSize !== undefined ? pageSize : internalPageSize;

  const handlePageChange = (newPage: number) => {
    if (onPageChange) {
      onPageChange(newPage);
    } else {
      setInternalPage(newPage);
    }
  };

  const handlePageSizeChange = (newSize: number) => {
    if (onPageSizeChange) {
      onPageSizeChange(newSize);
    } else {
      setInternalPageSize(newSize);
      setInternalPage(0);
    }
  };

  // Searchable agent dropdown state
  const [isAgentDropdownOpen, setIsAgentDropdownOpen] = useState(false);
  const [agentSearchQuery, setAgentSearchQuery] = useState('');
  const agentDropdownRef = useRef<HTMLDivElement>(null);

  const activeCategory = selectedCategoryId !== undefined ? selectedCategoryId : internalCategory;
  const activeAgent = selectedAgentEmail !== undefined ? selectedAgentEmail : internalAgent;

  // Close agent dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (agentDropdownRef.current && !agentDropdownRef.current.contains(event.target as Node)) {
        setIsAgentDropdownOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleCategorySelect = (catId: number | 'ALL') => {
    if (onCategoryChange) {
      onCategoryChange(catId);
    } else {
      setInternalCategory(catId);
    }
  };

  const handleCategoryBadgeClick = (e: React.MouseEvent, catId: number) => {
    e.stopPropagation();
    if (activeCategory === catId) {
      handleCategorySelect('ALL');
    } else {
      handleCategorySelect(catId);
    }
  };

  const handleAgentSelect = (agent: string | 'ALL' | 'UNASSIGNED') => {
    if (onAgentChange) {
      onAgentChange(agent);
    } else {
      setInternalAgent(agent);
    }
    setIsAgentDropdownOpen(false);
    setAgentSearchQuery('');
  };

  const handleAgentBadgeClick = (e: React.MouseEvent, agentEmail: string) => {
    e.stopPropagation();
    if (!canFilterByAgent) return;
    if (activeAgent.toLowerCase() === agentEmail.toLowerCase()) {
      handleAgentSelect('ALL');
    } else {
      handleAgentSelect(agentEmail);
    }
  };

  const handleUnassignedBadgeClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!canFilterByAgent) return;
    if (activeAgent === 'UNASSIGNED') {
      handleAgentSelect('ALL');
    } else {
      handleAgentSelect('UNASSIGNED');
    }
  };

  const handleRowClick = (e: React.MouseEvent, ticket: Ticket) => {
    const target = e.target as HTMLElement;
    // Don't trigger row navigation if user clicked an interactive control
    if (target.closest('button') || target.closest('a') || target.closest('select') || target.closest('input')) {
      return;
    }
    router.push(`/tickets/${ticket.ticketPublicId}`);
  };

  // Build deduplicated list of support agents with their ticket counts
  const { agentStats, unassignedCount } = useMemo(() => {
    const counts: Record<string, { name: string; email: string; count: number; activeCount: number }> = {};
    let unassigned = 0;

    // Populate from supportAgents list
    supportAgents.forEach(agent => {
      const email = agent.email.toLowerCase().trim();
      counts[email] = {
        name: agent.name,
        email: agent.email,
        count: 0,
        activeCount: 0,
      };
    });

    // Count tickets assigned to each agent
    tickets.forEach(ticket => {
      if (!ticket.assignedAgentEmail) {
        unassigned++;
      } else {
        const key = ticket.assignedAgentEmail.toLowerCase().trim();
        if (!counts[key]) {
          counts[key] = {
            name: ticket.assignedAgentName || ticket.assignedAgentEmail,
            email: ticket.assignedAgentEmail,
            count: 0,
            activeCount: 0,
          };
        }
        counts[key].count++;
        if (ticket.status === 'OPEN' || ticket.status === 'IN_PROGRESS' || ticket.status === 'WAITING_ON_REQUESTOR') {
          counts[key].activeCount++;
        }
      }
    });

    return {
      agentStats: Object.values(counts).sort((a, b) => b.count - a.count || a.name.localeCompare(b.name)),
      unassignedCount: unassigned,
    };
  }, [tickets, supportAgents]);

  // Filter agent list based on search inside dropdown
  const filteredAgentList = useMemo(() => {
    if (!agentSearchQuery.trim()) return agentStats;
    const q = agentSearchQuery.toLowerCase().trim();
    return agentStats.filter(a => a.name.toLowerCase().includes(q) || a.email.toLowerCase().includes(q));
  }, [agentStats, agentSearchQuery]);

  // Filter tickets based on status tab, category, agent, and search
  const filteredTickets = useMemo(() => {
    return tickets.filter(ticket => {
      // Tab filter
      if (filterTab === 'OPEN' && ticket.status !== 'OPEN') return false;
      if (filterTab === 'IN_PROGRESS' && ticket.status !== 'IN_PROGRESS') return false;
      if (filterTab === 'WAITING' && ticket.status !== 'WAITING_ON_REQUESTOR') return false;
      if (filterTab === 'RESOLVED' && ticket.status !== 'RESOLVED') return false;
      if (filterTab === 'CLOSED' && ticket.status !== 'CLOSED') return false;

      // Category filter
      if (activeCategory !== 'ALL' && ticket.categoryId !== activeCategory) {
        return false;
      }

      // Agent filter
      if (activeAgent === 'UNASSIGNED') {
        if (ticket.assignedAgentEmail || ticket.assignedAgentName) return false;
      } else if (activeAgent !== 'ALL') {
        if (!ticket.assignedAgentEmail || ticket.assignedAgentEmail.toLowerCase() !== activeAgent.toLowerCase()) {
          return false;
        }
      }

      // Search query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchTitle = ticket.title.toLowerCase().includes(q);
        const matchCode = ticket.code?.toLowerCase().includes(q);
        const matchReq = ticket.requestorName?.toLowerCase().includes(q) || ticket.requestorEmail?.toLowerCase().includes(q);
        const matchCat = ticket.categoryName?.toLowerCase().includes(q);
        const matchAgent = ticket.assignedAgentName?.toLowerCase().includes(q) || ticket.assignedAgentEmail?.toLowerCase().includes(q);
        return matchTitle || matchCode || matchReq || matchCat || matchAgent;
      }

      return true;
    });
  }, [tickets, filterTab, activeCategory, activeAgent, searchQuery]);

  // Status counts for tabs
  const tabCounts = useMemo(() => {
    const counts = {
      ALL: tickets.length,
      OPEN: 0,
      IN_PROGRESS: 0,
      WAITING: 0,
      RESOLVED: 0,
      CLOSED: 0,
    };
    tickets.forEach(t => {
      if (t.status === 'OPEN') counts.OPEN++;
      else if (t.status === 'IN_PROGRESS') counts.IN_PROGRESS++;
      else if (t.status === 'WAITING_ON_REQUESTOR') counts.WAITING++;
      else if (t.status === 'RESOLVED') counts.RESOLVED++;
      else if (t.status === 'CLOSED') counts.CLOSED++;
    });
    return counts;
  }, [tickets]);

  const selectedCategoryObj = categories.find(c => c.categoryId === activeCategory);
  const selectedAgentObj = agentStats.find(a => a.email.toLowerCase() === activeAgent.toLowerCase());

  const getStatusBadge = (status: TicketStatus) => {
    switch (status) {
      case 'OPEN':
        return (
          <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200/60">
            Open
          </span>
        );
      case 'IN_PROGRESS':
        return (
          <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-50 text-amber-700 border border-amber-200/60">
            In Progress
          </span>
        );
      case 'WAITING_ON_REQUESTOR':
        return (
          <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-blue-50 text-blue-700 border border-blue-200/60">
            Waiting on User
          </span>
        );
      case 'RESOLVED':
        return (
          <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-slate-100 text-slate-700 border border-slate-200">
            Resolved
          </span>
        );
      case 'CLOSED':
        return (
          <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-slate-100 text-slate-500 border border-slate-200">
            Closed
          </span>
        );
      default:
        return (
          <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-slate-100 text-slate-600">
            {status}
          </span>
        );
    }
  };

  const getPriorityDisplay = (priorityName?: string) => {
    if (!priorityName) return <span className="text-slate-400 text-xs">—</span>;
    const clean = priorityName
      .replace(/_[0-9]+/g, '')
      .replace(/[0-9]{8,}/g, '')
      .replace(/_/g, ' ')
      .trim();
    const formatted = clean ? (clean.charAt(0).toUpperCase() + clean.slice(1).toLowerCase()) : priorityName;
    return <span className="text-slate-700 text-xs font-medium">{formatted}</span>;
  };

  // Slice tickets if in uncontrolled/client-side mode
  const isServerPaged = totalElements !== undefined;
  const total = isServerPaged ? totalElements : filteredTickets.length;
  const pages = isServerPaged ? (totalPages || 1) : Math.max(1, Math.ceil(filteredTickets.length / size));

  const displayTickets = isServerPaged 
    ? filteredTickets 
    : filteredTickets.slice(page * size, (page + 1) * size);

  return (
    <div className="pill-card p-5 bg-white border border-slate-200/80 shadow-2xs">
      {/* Table Header: Title + Search */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-4">
        <div>
          <h2 className="text-sm font-bold uppercase tracking-wider text-slate-800">
            {title}
          </h2>
          {subtitle && (
            <p className="text-xs text-slate-400 mt-0.5">
              {subtitle}
            </p>
          )}
        </div>

        <div className="flex items-center gap-3">
          <div className="relative">
            <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Search tickets..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-8 pr-4 py-1.5 rounded-full text-xs bg-slate-50 border border-slate-200 text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-900/10 focus:border-slate-400 transition-all w-44 sm:w-56"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 cursor-pointer"
              >
                <X className="w-3 h-3" />
              </button>
            )}
          </div>

          {showAllLink && (
            <Link
              href="/tickets"
              className="text-xs font-semibold text-slate-700 hover:text-slate-950 flex items-center gap-0.5 transition-colors whitespace-nowrap"
            >
              <span>All Tickets</span>
              <span>↗</span>
            </Link>
          )}
        </div>
      </div>

      {/* Filter Row: Status Tabs + Agent Search Dropdown + Category Select */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 mb-5 pb-3 border-b border-slate-100">
        {/* Status Filter Tabs */}
        <div className="flex items-center gap-1 overflow-x-auto pb-1">
          {([
            { id: 'ALL', label: 'All', count: tabCounts.ALL },
            { id: 'OPEN', label: 'Open', count: tabCounts.OPEN },
            { id: 'IN_PROGRESS', label: 'In Progress', count: tabCounts.IN_PROGRESS },
            { id: 'WAITING', label: 'Waiting', count: tabCounts.WAITING },
            { id: 'RESOLVED', label: 'Resolved', count: tabCounts.RESOLVED },
            { id: 'CLOSED', label: 'Closed', count: tabCounts.CLOSED },
          ] as const).map((tab) => {
            const isSelected = filterTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setFilterTab(tab.id)}
                className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold transition-all cursor-pointer whitespace-nowrap ${
                  isSelected
                    ? 'bg-[#0B132B] text-white shadow-2xs'
                    : 'text-slate-600 hover:bg-slate-100'
                }`}
              >
                <span>{tab.label}</span>
                <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-bold ${
                  isSelected ? 'bg-white/20 text-white' : 'bg-slate-100 text-slate-500'
                }`}>
                  {tab.count}
                </span>
              </button>
            );
          })}
        </div>

        {/* Filters Group: Searchable Agent Dropdown (Admin/Manager only) & Category Select */}
        <div className="flex flex-wrap items-center gap-2 shrink-0">
          {/* Searchable Agent Filter Dropdown */}
          {canFilterByAgent && (
          <div className="relative" ref={agentDropdownRef}>
            <button
              type="button"
              onClick={() => setIsAgentDropdownOpen(!isAgentDropdownOpen)}
              className={`flex items-center gap-2 pl-3 pr-2.5 py-1.5 rounded-full text-xs font-semibold border transition-all cursor-pointer max-w-[200px] shadow-2xs ${
                activeAgent !== 'ALL'
                  ? 'bg-slate-900 text-white border-slate-900'
                  : 'bg-white border-slate-200 text-slate-700 hover:border-slate-300'
              }`}
            >
              <Headphones className={`w-3.5 h-3.5 shrink-0 ${activeAgent !== 'ALL' ? 'text-white' : 'text-slate-500'}`} />
              <span className="truncate">
                {activeAgent === 'ALL'
                  ? 'All Agents'
                  : activeAgent === 'UNASSIGNED'
                    ? 'Unassigned'
                    : selectedAgentObj?.name || activeAgent}
              </span>
              <ChevronDown className={`w-3 h-3 shrink-0 ml-auto ${activeAgent !== 'ALL' ? 'text-white' : 'text-slate-400'}`} />
            </button>

            {/* Clear agent selection pill if active */}
            {activeAgent !== 'ALL' && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  handleAgentSelect('ALL');
                }}
                className="absolute -right-2 -top-1.5 w-4 h-4 rounded-full bg-slate-200 hover:bg-slate-300 text-slate-700 flex items-center justify-center text-[10px] cursor-pointer shadow-xs"
                title="Reset agent filter"
              >
                ✕
              </button>
            )}

            {/* Dropdown Menu with Search Input */}
            {isAgentDropdownOpen && (
              <div className="absolute right-0 lg:right-auto lg:left-0 top-full mt-1.5 w-64 bg-white border border-slate-200 rounded-2xl shadow-lg z-50 p-2">
                {/* Search input for agents */}
                <div className="relative mb-2">
                  <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type="text"
                    autoFocus
                    placeholder="Type agent name..."
                    value={agentSearchQuery}
                    onChange={(e) => setAgentSearchQuery(e.target.value)}
                    className="w-full pl-8 pr-6 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-1 focus:ring-slate-900 text-slate-800 placeholder-slate-400"
                  />
                  {agentSearchQuery && (
                    <button
                      onClick={() => setAgentSearchQuery('')}
                      className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 cursor-pointer"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  )}
                </div>

                <div className="max-h-56 overflow-y-auto space-y-0.5">
                  {/* All Staff Option */}
                  <button
                    onClick={() => handleAgentSelect('ALL')}
                    className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg text-xs font-medium transition-colors cursor-pointer ${
                      activeAgent === 'ALL' ? 'bg-slate-100 font-bold text-slate-900' : 'hover:bg-slate-50 text-slate-700'
                    }`}
                  >
                    <span>All Agents</span>
                    <span className="text-[10px] text-slate-400 font-semibold">{tickets.length}</span>
                  </button>

                  {/* Unassigned Option */}
                  <button
                    onClick={() => handleAgentSelect('UNASSIGNED')}
                    className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg text-xs font-medium transition-colors cursor-pointer ${
                      activeAgent === 'UNASSIGNED' ? 'bg-amber-50 font-bold text-amber-900' : 'hover:bg-slate-50 text-slate-700'
                    }`}
                  >
                    <span className="flex items-center gap-1.5">
                      <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
                      Unassigned
                    </span>
                    <span className="text-[10px] text-slate-400 font-semibold">{unassignedCount}</span>
                  </button>

                  <div className="my-1 border-t border-slate-100" />

                  {/* Filtered Agent List */}
                  {filteredAgentList.map((agent) => {
                    const isSelected = activeAgent.toLowerCase() === agent.email.toLowerCase();
                    return (
                      <button
                        key={agent.email}
                        onClick={() => handleAgentSelect(agent.email)}
                        className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg text-xs transition-colors cursor-pointer ${
                          isSelected ? 'bg-slate-100 font-bold text-slate-900' : 'hover:bg-slate-50 text-slate-700'
                        }`}
                      >
                        <div className="text-left truncate max-w-[170px]">
                          <div className="font-semibold truncate">{agent.name}</div>
                          <div className="text-[10px] text-slate-400 truncate">{agent.email}</div>
                        </div>
                        <span className="text-[10px] font-bold px-1.5 py-0.2 rounded-full bg-slate-100 text-slate-600">
                          {agent.count}
                        </span>
                      </button>
                    );
                  })}

                  {filteredAgentList.length === 0 && (
                    <div className="py-3 text-center text-xs text-slate-400">
                      No agent matching &quot;{agentSearchQuery}&quot;
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
          )}

          {/* Category Filter Select */}
          <div className="relative">
            <Layers className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
            <select
              value={activeCategory}
              onChange={(e) => handleCategorySelect(e.target.value === 'ALL' ? 'ALL' : Number(e.target.value))}
              className="pl-8 pr-7 py-1.5 rounded-full text-xs font-semibold bg-white border border-slate-200 text-slate-700 hover:border-slate-300 focus:outline-none focus:ring-1 focus:ring-slate-900 transition-all cursor-pointer appearance-none shadow-2xs max-w-[170px] truncate"
            >
              <option value="ALL">All Categories ({tickets.length})</option>
              {categories.map((c) => {
                const count = tickets.filter(t => t.categoryId === c.categoryId).length;
                return (
                  <option key={c.categoryId} value={c.categoryId}>
                    {c.name} ({count})
                  </option>
                );
              })}
            </select>
            <ChevronDown className="w-3 h-3 absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
          </div>

          {/* Clear Category Filter */}
          {activeCategory !== 'ALL' && (
            <button
              onClick={() => handleCategorySelect('ALL')}
              className="flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-semibold bg-slate-100 hover:bg-slate-200 text-slate-700 transition-colors cursor-pointer"
              title="Clear category filter"
            >
              <span>{selectedCategoryObj?.name || 'Category'}</span>
              <X className="w-3 h-3 text-slate-500" />
            </button>
          )}
        </div>
      </div>

      {/* Ticket Table */}
      <div className="overflow-x-auto">
        <table className="w-full text-left text-xs">
          <thead>
            <tr className="border-b border-slate-100 text-slate-400 font-medium">
              <th className="pb-3 font-semibold">Ticket / ID</th>
              <th className="pb-3 font-semibold">Requestor</th>
              <th className="pb-3 font-semibold">Category</th>
              {!isAgent && <th className="pb-3 font-semibold">Assigned Agent</th>}
              <th className="pb-3 font-semibold">Priority</th>
              <th className="pb-3 font-semibold">Status</th>
              <th className="pb-3 font-semibold text-right pr-2">Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-50">
            {filteredTickets.length === 0 ? (
              <tr>
                <td colSpan={isAgent ? 6 : 7} className="py-10 text-center text-slate-400 text-xs">
                  <div>No tickets found matching the selected filters.</div>
                  {(activeCategory !== 'ALL' || activeAgent !== 'ALL' || filterTab !== 'ALL' || searchQuery) && (
                    <button
                      onClick={() => {
                        handleCategorySelect('ALL');
                        handleAgentSelect('ALL');
                        setFilterTab('ALL');
                        setSearchQuery('');
                      }}
                      className="mt-2 text-xs font-semibold text-slate-800 underline hover:text-slate-950 cursor-pointer"
                    >
                      Reset all filters
                    </button>
                  )}
                </td>
              </tr>
            ) : (
              displayTickets.map((ticket) => {
                const reqName = ticket.requestorName || 'Customer';
                return (
                  <tr
                    key={ticket.ticketPublicId}
                    onClick={(e) => handleRowClick(e, ticket)}
                    className="hover:bg-slate-50/80 transition-colors group cursor-pointer"
                  >
                    {/* Title & Code */}
                    <td className="py-3.5 pr-4 max-w-[280px]">
                      <Link
                        href={`/tickets/${ticket.ticketPublicId}`}
                        onClick={(e) => e.stopPropagation()}
                        className="font-bold text-slate-900 text-xs truncate group-hover:text-indigo-600 transition-colors block hover:underline"
                      >
                        {ticket.title}
                      </Link>
                      {ticket.code ? (
                        <div className="text-[11px] text-slate-400 font-mono mt-0.5">
                          {ticket.code}
                        </div>
                      ) : null}
                    </td>

                    {/* Requestor */}
                    <td className="py-3.5 pr-4">
                      <div className="font-semibold text-slate-700 truncate max-w-[130px]">
                        {reqName}
                      </div>
                      <div className="text-[10px] text-slate-400 truncate max-w-[130px]">
                        {ticket.requestorEmail}
                      </div>
                    </td>

                    {/* Category */}
                    <td className="py-3.5 pr-4 text-slate-600">
                      <button
                        type="button"
                        onClick={(e) => handleCategoryBadgeClick(e, ticket.categoryId)}
                        className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-medium transition-colors max-w-[150px] truncate cursor-pointer ${
                          activeCategory === ticket.categoryId
                            ? 'bg-[#0B132B] text-white shadow-2xs'
                            : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
                        }`}
                        title={
                          activeCategory === ticket.categoryId
                            ? `Active filter: ${ticket.categoryName} (Click to remove filter)`
                            : `Filter by category: ${ticket.categoryName}`
                        }
                      >
                        <Tag className={`w-3 h-3 shrink-0 ${activeCategory === ticket.categoryId ? 'text-white' : 'text-slate-400'}`} />
                        <span className="truncate">{ticket.categoryName}</span>
                        {activeCategory === ticket.categoryId && (
                          <X className="w-2.5 h-2.5 text-white/80 shrink-0 ml-0.5" />
                        )}
                      </button>
                    </td>

                    {/* Assigned Agent (Hidden for Agents who work solely on own tickets) */}
                    {!isAgent && (
                      <td className="py-3.5 pr-4">
                        {ticket.assignedAgentEmail || ticket.assignedAgentName ? (
                          <button
                            type="button"
                            onClick={(e) => handleAgentBadgeClick(e, ticket.assignedAgentEmail!)}
                            className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-semibold transition-colors max-w-[160px] truncate ${
                              canFilterByAgent ? 'cursor-pointer' : 'cursor-default'
                            } ${
                              activeAgent.toLowerCase() === (ticket.assignedAgentEmail || '').toLowerCase()
                                ? 'bg-[#0B132B] text-white shadow-2xs'
                                : 'bg-slate-100 text-slate-700 hover:bg-slate-200 border border-slate-200/60'
                            }`}
                            title={
                              activeAgent.toLowerCase() === (ticket.assignedAgentEmail || '').toLowerCase()
                                ? `Active filter: ${ticket.assignedAgentName || ticket.assignedAgentEmail} (Click to remove filter)`
                                : `Assigned to: ${ticket.assignedAgentName || ticket.assignedAgentEmail}`
                            }
                          >
                            <UserCheck className={`w-3 h-3 shrink-0 ${activeAgent.toLowerCase() === (ticket.assignedAgentEmail || '').toLowerCase() ? 'text-white' : 'text-slate-500'}`} />
                            <span className="truncate">{ticket.assignedAgentName || ticket.assignedAgentEmail}</span>
                            {activeAgent.toLowerCase() === (ticket.assignedAgentEmail || '').toLowerCase() && (
                              <X className="w-2.5 h-2.5 text-white/80 shrink-0 ml-0.5" />
                            )}
                          </button>
                        ) : (
                          <button
                            type="button"
                            onClick={(e) => handleUnassignedBadgeClick(e)}
                            className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-semibold transition-colors ${
                              canFilterByAgent ? 'cursor-pointer' : 'cursor-default'
                            } ${
                              activeAgent === 'UNASSIGNED'
                                ? 'bg-amber-600 text-white shadow-2xs'
                                : 'bg-amber-50 text-amber-800 hover:bg-amber-100 border border-amber-200/60'
                            }`}
                            title={
                              activeAgent === 'UNASSIGNED'
                                ? 'Active filter: Unassigned (Click to remove filter)'
                                : 'Unassigned ticket'
                            }
                          >
                            <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
                            <span>Unassigned</span>
                            {activeAgent === 'UNASSIGNED' && (
                              <X className="w-2.5 h-2.5 text-white/80 shrink-0 ml-0.5" />
                            )}
                          </button>
                        )}
                      </td>
                    )}

                    {/* Priority */}
                    <td className="py-3.5 pr-4">
                      {getPriorityDisplay(ticket.priorityName)}
                    </td>

                    {/* Status */}
                    <td className="py-3.5 pr-4">
                      {getStatusBadge(ticket.status)}
                    </td>

                    {/* Action link */}
                    <td className="py-3.5 text-right pr-2">
                      <Link
                        href={`/tickets/${ticket.ticketPublicId}`}
                        onClick={(e) => e.stopPropagation()}
                        className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-semibold bg-[#0B132B] hover:bg-slate-800 text-white shadow-2xs hover:shadow-xs transition-all cursor-pointer whitespace-nowrap group-hover:bg-[#1A264F]"
                      >
                        <span>Manage</span>
                        <span className="text-[10px] font-bold">↗</span>
                      </Link>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination Footer */}
      <TablePagination
        total={total}
        page={page}
        size={size}
        totalPages={pages}
        pageSizeOptions={[10, 20, 50]}
        label="tickets"
        isLoading={isLoading}
        onPageChange={handlePageChange}
        onPageSizeChange={handlePageSizeChange}
      />
    </div>
  );
}
