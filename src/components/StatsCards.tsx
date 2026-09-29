import React from 'react';
import { 
  Inbox, 
  Sparkles, 
  Clock, 
  CheckCircle2, 
  ArrowUpRight, 
  Globe2, 
  CalendarDays 
} from 'lucide-react';
import { InquiryStats, FilterStatus } from '../types.ts';

interface StatsCardsProps {
  stats: InquiryStats | null;
  onFilterStatus: (status: FilterStatus) => void;
  activeStatus: FilterStatus;
}

export const StatsCards: React.FC<StatsCardsProps> = ({ stats, onFilterStatus, activeStatus }) => {
  if (!stats) return null;

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-3 mb-6">
      
      {/* Total Inquiries */}
      <div 
        onClick={() => onFilterStatus('all')}
        className={`p-4 rounded-xl border transition-all cursor-pointer ${
          activeStatus === 'all'
            ? 'bg-slate-800/90 border-indigo-500/80 ring-2 ring-indigo-500/20 shadow-lg'
            : 'bg-slate-900/60 border-slate-800 hover:border-slate-700 hover:bg-slate-800/40'
        }`}
      >
        <div className="flex items-center justify-between text-slate-400 mb-2">
          <span className="text-xs font-medium uppercase tracking-wider">Total Leads</span>
          <div className="p-1.5 rounded-lg bg-indigo-500/10 text-indigo-400">
            <Inbox className="w-4 h-4" />
          </div>
        </div>
        <div className="flex items-baseline gap-2">
          <span className="text-2xl font-bold text-white tracking-tight">{stats.total}</span>
          {stats.todayCount > 0 && (
            <span className="text-xs font-medium text-emerald-400 flex items-center">
              +{stats.todayCount} today
            </span>
          )}
        </div>
        <p className="text-[11px] text-slate-400 mt-1">Across all website forms</p>
      </div>

      {/* New & Uncontacted */}
      <div 
        onClick={() => onFilterStatus('new')}
        className={`p-4 rounded-xl border transition-all cursor-pointer ${
          activeStatus === 'new'
            ? 'bg-slate-800/90 border-rose-500/80 ring-2 ring-rose-500/20 shadow-lg'
            : 'bg-slate-900/60 border-slate-800 hover:border-slate-700 hover:bg-slate-800/40'
        }`}
      >
        <div className="flex items-center justify-between text-slate-400 mb-2">
          <span className="text-xs font-medium uppercase tracking-wider">New Incoming</span>
          <div className="p-1.5 rounded-lg bg-rose-500/10 text-rose-400">
            <Sparkles className="w-4 h-4" />
          </div>
        </div>
        <div className="flex items-baseline gap-2">
          <span className="text-2xl font-bold text-rose-400 tracking-tight">
            {stats.statusCounts.new || 0}
          </span>
          <span className="text-[10px] uppercase font-semibold px-1.5 py-0.5 rounded bg-rose-500/20 text-rose-300">
            Needs Reply
          </span>
        </div>
        <p className="text-[11px] text-slate-400 mt-1">Awaiting first response</p>
      </div>

      {/* In Review */}
      <div 
        onClick={() => onFilterStatus('in-review')}
        className={`p-4 rounded-xl border transition-all cursor-pointer ${
          activeStatus === 'in-review'
            ? 'bg-slate-800/90 border-amber-500/80 ring-2 ring-amber-500/20 shadow-lg'
            : 'bg-slate-900/60 border-slate-800 hover:border-slate-700 hover:bg-slate-800/40'
        }`}
      >
        <div className="flex items-center justify-between text-slate-400 mb-2">
          <span className="text-xs font-medium uppercase tracking-wider">In Review</span>
          <div className="p-1.5 rounded-lg bg-amber-500/10 text-amber-400">
            <Clock className="w-4 h-4" />
          </div>
        </div>
        <div className="flex items-baseline gap-2">
          <span className="text-2xl font-bold text-amber-300 tracking-tight">
            {stats.statusCounts['in-review'] || 0}
          </span>
        </div>
        <p className="text-[11px] text-slate-400 mt-1">Being processed by team</p>
      </div>

      {/* Converted */}
      <div 
        onClick={() => onFilterStatus('converted')}
        className={`p-4 rounded-xl border transition-all cursor-pointer ${
          activeStatus === 'converted'
            ? 'bg-slate-800/90 border-emerald-500/80 ring-2 ring-emerald-500/20 shadow-lg'
            : 'bg-slate-900/60 border-slate-800 hover:border-slate-700 hover:bg-slate-800/40'
        }`}
      >
        <div className="flex items-center justify-between text-slate-400 mb-2">
          <span className="text-xs font-medium uppercase tracking-wider">Converted</span>
          <div className="p-1.5 rounded-lg bg-emerald-500/10 text-emerald-400">
            <CheckCircle2 className="w-4 h-4" />
          </div>
        </div>
        <div className="flex items-baseline gap-2">
          <span className="text-2xl font-bold text-emerald-400 tracking-tight">
            {stats.statusCounts.converted || 0}
          </span>
          <span className="text-xs font-semibold text-emerald-400">
            {stats.conversionRate}% rate
          </span>
        </div>
        <p className="text-[11px] text-slate-400 mt-1">Booked or completed</p>
      </div>

      {/* Top Source Highlight */}
      <div className="hidden lg:block p-4 rounded-xl border border-slate-800 bg-slate-900/60">
        <div className="flex items-center justify-between text-slate-400 mb-2">
          <span className="text-xs font-medium uppercase tracking-wider">Top Sources</span>
          <div className="p-1.5 rounded-lg bg-cyan-500/10 text-cyan-400">
            <Globe2 className="w-4 h-4" />
          </div>
        </div>
        <div className="space-y-1.5 text-xs">
          <div className="flex items-center justify-between">
            <span className="text-slate-300 truncate max-w-[110px]" title="book-a-visit-form">
              book-a-visit
            </span>
            <span className="font-semibold text-cyan-300">
              {stats.sourceCounts['book-a-visit-form'] || 0}
            </span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-slate-300 truncate max-w-[110px]" title="contact-inquiry-form">
              contact-form
            </span>
            <span className="font-semibold text-cyan-300">
              {stats.sourceCounts['contact-inquiry-form'] || 0}
            </span>
          </div>
        </div>
      </div>

    </div>
  );
};
