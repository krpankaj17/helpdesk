'use client';

import React from 'react';
import Link from 'next/link';
import { TicketCategory } from '@/types';
import { Layers, CheckCircle2 } from 'lucide-react';

interface CategoryListProps {
  categories: TicketCategory[];
}

export default function CategoryList({ categories }: CategoryListProps) {
  return (
    <div className="pill-card p-6 flex flex-col justify-between h-full">
      <div>
        {/* Card Header */}
        <div className="flex items-center justify-between mb-1">
          <div className="flex items-center gap-2.5">
            <Layers className="w-4 h-4 text-slate-700" />
            <h3 className="text-base font-bold text-[#0B132B] tracking-tight">
              Ticket Categories
            </h3>
          </div>
          <Link
            href="/categories"
            className="text-xs font-semibold text-slate-700 hover:text-slate-950 flex items-center gap-0.5 transition-colors"
          >
            <span>View All</span>
            <span>↗</span>
          </Link>
        </div>

        {/* Subtitle */}
        <p className="text-xs text-slate-400 mb-6">
          Active incident distribution across technical domains
        </p>

        {/* List of HelpDesk Categories */}
        <div className="space-y-3">
          {categories.map((cat, idx) => (
            <div
              key={cat.categoryId || idx}
              className="flex items-center justify-between p-3 rounded-xl hover:bg-slate-50/80 transition-colors border border-transparent hover:border-slate-100 group"
            >
              <div className="flex items-center gap-3">
                <div className="w-2 h-2 rounded-full bg-slate-300 group-hover:bg-slate-900 transition-colors" />
                <span className="text-sm font-semibold text-slate-800">
                  {cat.name}
                </span>
              </div>
              <span className="text-xs font-medium text-slate-500 bg-slate-100/80 px-2.5 py-1 rounded-full">
                {cat.ticketCount || 0} tickets
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Footer Info */}
      <div className="mt-6 pt-4 border-t border-slate-100 flex items-center justify-between text-xs text-slate-400">
        <span>Configured: {categories.length} Units</span>
        <span className="text-emerald-600 font-semibold flex items-center gap-1">
          <CheckCircle2 className="w-3.5 h-3.5" />
          SLA Compliance: 99.4%
        </span>
      </div>
    </div>
  );
}
