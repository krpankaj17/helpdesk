'use client';

import React, { useState, useRef, useEffect } from 'react';
import { ChevronDown, ChevronLeft, ChevronRight, Check } from 'lucide-react';

interface TablePaginationProps {
  total: number;
  page: number;
  size: number;
  totalPages?: number;
  pageSizeOptions?: number[];
  label?: string;
  isLoading?: boolean;
  onPageChange: (newPage: number) => void;
  onPageSizeChange: (newSize: number) => void;
}

export default function TablePagination({
  total,
  page,
  size,
  totalPages,
  pageSizeOptions = [10, 25, 50],
  label = 'records',
  isLoading = false,
  onPageChange,
  onPageSizeChange,
}: TablePaginationProps) {
  const [isSizeDropdownOpen, setIsSizeDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const pages = totalPages !== undefined ? totalPages : Math.max(1, Math.ceil(total / size));
  const startItem = total === 0 ? 0 : page * size + 1;
  const endItem = Math.min((page + 1) * size, total);

  // Close dropdown on outside click
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsSizeDropdownOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  if (total <= 0) return null;

  return (
    <div className="px-4 sm:px-6 py-3.5 border-t border-slate-100 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-slate-500">
      {/* Summary Record Count */}
      <div className="text-center sm:text-left text-xs text-slate-500">
        Showing <span className="font-bold text-slate-800">{startItem} - {endItem}</span> of{' '}
        <span className="font-bold text-slate-800">{total}</span> {label}
      </div>

      {/* Controls Container: Fully responsive wrapping for small screens */}
      <div className="flex flex-wrap items-center justify-center sm:justify-end gap-3 sm:gap-5 w-full sm:w-auto">
        {/* Custom Rows Per Page Dropdown (Opens upwards so it never clips) */}
        <div className="flex items-center gap-2 relative" ref={dropdownRef}>
          <span className="text-slate-500 text-xs whitespace-nowrap">Rows per page:</span>
          
          <button
            type="button"
            onClick={() => setIsSizeDropdownOpen(!isSizeDropdownOpen)}
            className="inline-flex items-center gap-1.5 bg-white border border-slate-200 hover:border-slate-300 rounded-lg px-2.5 py-1 text-xs font-semibold text-slate-700 shadow-2xs focus:outline-none transition-all cursor-pointer"
            title="Choose rows per page"
          >
            <span>{size}</span>
            <ChevronDown className={`w-3 h-3 text-slate-400 transition-transform duration-150 ${isSizeDropdownOpen ? 'rotate-180' : ''}`} />
          </button>

          {isSizeDropdownOpen && (
            <div className="absolute bottom-full mb-1.5 right-0 sm:left-auto w-24 bg-white border border-slate-200 rounded-xl shadow-lg z-50 py-1 overflow-hidden">
              {pageSizeOptions.map((opt) => (
                <button
                  key={opt}
                  type="button"
                  onClick={() => {
                    onPageSizeChange(opt);
                    setIsSizeDropdownOpen(false);
                  }}
                  className={`w-full text-left px-3 py-1.5 text-xs font-semibold flex items-center justify-between transition-colors cursor-pointer ${
                    size === opt
                      ? 'bg-[#0B132B] text-white'
                      : 'text-slate-700 hover:bg-slate-50'
                  }`}
                >
                  <span>{opt}</span>
                  {size === opt && <Check className="w-3 h-3 text-white shrink-0" />}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Pagination Prev / Numbers / Next Buttons */}
        <div className="flex items-center gap-1 shrink-0">
          <button 
            disabled={page === 0 || isLoading}
            onClick={() => onPageChange(page - 1)}
            className="flex items-center gap-1 px-2.5 py-1 rounded-md text-slate-600 hover:bg-slate-100 disabled:opacity-40 transition-colors cursor-pointer disabled:cursor-not-allowed font-medium text-xs"
            title="Previous page"
          >
            <ChevronLeft className="w-3.5 h-3.5" />
            <span>Prev</span>
          </button>

          {/* Compact text indicator on small mobile screens */}
          <div className="sm:hidden px-2 text-xs font-semibold text-slate-700">
            {page + 1} / {pages}
          </div>

          {/* Numbered buttons on tablet/desktop */}
          <div className="hidden sm:flex items-center gap-1">
            {Array.from({ length: pages }, (_, i) => (
              <button
                key={i}
                disabled={isLoading}
                onClick={() => onPageChange(i)}
                className={`w-7 h-7 rounded-md font-bold flex items-center justify-center text-xs transition-colors cursor-pointer ${
                  page === i
                    ? 'bg-[#0B132B] text-white shadow-2xs'
                    : 'text-slate-600 hover:bg-slate-100'
                }`}
              >
                {i + 1}
              </button>
            )).slice(Math.max(0, page - 2), Math.min(pages, page + 3))}
          </div>

          <button 
            disabled={page >= pages - 1 || isLoading}
            onClick={() => onPageChange(page + 1)}
            className="flex items-center gap-1 px-2.5 py-1 rounded-md text-slate-600 hover:bg-slate-100 disabled:opacity-40 transition-colors cursor-pointer disabled:cursor-not-allowed font-medium text-xs"
            title="Next page"
          >
            <span>Next</span>
            <ChevronRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
}
