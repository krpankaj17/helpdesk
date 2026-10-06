'use client';

import React from 'react';
import Link from 'next/link';

interface StatCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  actionText?: string;
  actionHref?: string;
  onActionClick?: () => void;
  icon: React.ReactNode;
  trend?: string;
  trendType?: 'up' | 'down' | 'neutral' | string;
  description?: string;
}

export default function StatCard({
  title,
  value,
  subtitle,
  actionText,
  actionHref,
  onActionClick,
  icon,
  trend,
  trendType = 'neutral',
  description,
}: StatCardProps) {
  const bottomText = subtitle || description || trend;

  return (
    <div className="pill-card p-6 flex flex-col justify-between transition-all duration-200">
      {/* Top Row: Title + Circular Icon */}
      <div className="flex items-center justify-between">
        <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
          {title}
        </span>
        <div className="w-8 h-8 rounded-full bg-slate-50 border border-slate-100 flex items-center justify-center text-slate-500 shadow-2xs">
          {icon}
        </div>
      </div>

      {/* Middle Value */}
      <div className="my-3 sm:my-4 flex items-baseline justify-between gap-2">
        <span className="text-3xl sm:text-4xl font-extrabold text-[#0B132B] tracking-tight">
          {value}
        </span>
        {trend && (
          <span className={`text-[11px] font-bold px-2 py-0.5 rounded-full ${
            trendType === 'up' ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' :
            trendType === 'down' ? 'bg-amber-50 text-amber-700 border border-amber-200' :
            'bg-slate-100 text-slate-600'
          }`}>
            {trend}
          </span>
        )}
      </div>

      {/* Bottom Row: Subtitle + Action link with arrow */}
      <div className="flex items-center justify-between text-xs pt-1 border-t border-slate-100/60">
        <span className="text-slate-500 font-medium truncate max-w-[140px] sm:max-w-none text-[11px]">
          {bottomText}
        </span>

        {actionText && (
          actionHref ? (
            <Link
              href={actionHref}
              className="font-semibold text-slate-700 hover:text-slate-950 flex items-center gap-0.5 transition-colors whitespace-nowrap ml-2 text-[11px]"
            >
              <span>{actionText}</span>
              <span className="text-xs">↗</span>
            </Link>
          ) : (
            <button
              onClick={onActionClick}
              className="font-semibold text-slate-700 hover:text-slate-950 flex items-center gap-0.5 transition-colors whitespace-nowrap ml-2 cursor-pointer text-[11px]"
            >
              <span>{actionText}</span>
              <span className="text-xs">↗</span>
            </button>
          )
        )}
      </div>
    </div>
  );
}
