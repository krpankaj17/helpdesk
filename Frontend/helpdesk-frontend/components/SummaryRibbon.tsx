'use client';

import React from 'react';
import Link from 'next/link';

import { DashboardMetrics } from '@/types';

interface ExecutiveRibbonProps {
  items?: {
    label: string;
    value: string | number;
    sublabel?: string;
  }[];
  actionText?: string;
  actionHref?: string;
  onActionClick?: () => void;
  metrics?: DashboardMetrics | null;
  totalTickets?: number;
  activeTickets?: number;
}

export function ExecutiveRibbon({
  items,
  actionText,
  actionHref = '/tickets',
  onActionClick,
  metrics,
  totalTickets,
  activeTickets,
}: ExecutiveRibbonProps) {
  const displayItems = (items && Array.isArray(items) && items.length > 0)
    ? items
    : [
        { label: 'Total Volume', value: totalTickets ?? metrics?.totalTickets ?? 0, sublabel: 'Tickets' },
        { label: 'Active Pipeline', value: activeTickets ?? ((metrics?.openTickets ?? 0) + (metrics?.inProgressTickets ?? 0)), sublabel: 'In Progress' },
        { label: 'Pending Triage', value: metrics?.unassignedTickets ?? 0, sublabel: 'Unassigned' },
        { label: 'Overdue Incidents', value: metrics?.overdueTickets ?? 0, sublabel: 'SLA Breaches' },
      ];

  const label = actionText || 'View Incident Queue';

  return (
    <div className="pill-card px-6 py-4 flex flex-wrap items-center justify-between gap-4 text-xs">
      <div className="flex flex-wrap items-center gap-6 sm:gap-10">
        {(displayItems || []).map((item, idx) => (
          <div key={idx} className="flex items-center gap-2">
            <span className="text-slate-400 font-medium">{item.label}:</span>
            <span className="text-slate-900 font-bold text-sm tracking-tight">{item.value}</span>
            {item.sublabel && (
              <span className="text-slate-400 text-[11px]">({item.sublabel})</span>
            )}
          </div>
        ))}
      </div>

      <div>
        {actionHref ? (
          <Link
            href={actionHref}
            className="font-bold text-slate-800 hover:text-slate-950 flex items-center gap-1 transition-colors"
          >
            <span>{label}</span>
            <span className="text-xs">↗</span>
          </Link>
        ) : (
          <button
            onClick={onActionClick}
            className="font-bold text-slate-800 hover:text-slate-950 flex items-center gap-1 transition-colors cursor-pointer"
          >
            <span>{label}</span>
            <span className="text-xs">↗</span>
          </button>
        )}
      </div>
    </div>
  );
}

interface StatusFilterRibbonProps {
  stats?: {
    id: string;
    label: string;
    count: number;
    isHighlighted?: boolean;
  }[];
  activeId?: string;
  onSelect?: (id: string) => void;
}

export function StatusFilterRibbon({
  stats,
  activeId,
  onSelect,
}: StatusFilterRibbonProps) {
  return (
    <div className="pill-card px-4 py-3 flex items-center gap-2 sm:gap-6 overflow-x-auto">
      {(stats || []).map((stat) => {
        const isCurrent = activeId === stat.id || stat.isHighlighted;
        return (
          <button
            key={stat.id}
            onClick={() => onSelect?.(stat.id)}
            className={`flex items-center gap-3 px-4 py-2 rounded-full text-xs font-semibold transition-all whitespace-nowrap cursor-pointer ${
              isCurrent
                ? 'badge-yellow shadow-2xs font-bold'
                : 'text-slate-600 hover:bg-slate-50'
            }`}
          >
            <span>{stat.label}</span>
            <span className={`px-2 py-0.5 rounded-full text-[11px] ${
              isCurrent ? 'bg-amber-300/40 text-slate-900 font-bold' : 'text-slate-700 font-bold'
            }`}>
              {stat.count}
            </span>
          </button>
        );
      })}
    </div>
  );
}
