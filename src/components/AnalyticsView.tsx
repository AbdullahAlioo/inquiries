import React from 'react';
import { 
  BarChart3, 
  TrendingUp, 
  Globe2, 
  CheckCircle2, 
  Clock, 
  Sparkles,
  Building2,
  MessageSquare
} from 'lucide-react';
import { InquiryStats, Inquiry } from '../types.ts';

interface AnalyticsViewProps {
  stats: InquiryStats | null;
  inquiries: Inquiry[];
}

export const AnalyticsView: React.FC<AnalyticsViewProps> = ({ stats, inquiries }) => {
  if (!stats) return null;

  const total = stats.total || 1;

  // Calculate percentages for statuses
  const statusPercentages = {
    new: Math.round(((stats.statusCounts.new || 0) / total) * 100),
    'in-review': Math.round(((stats.statusCounts['in-review'] || 0) / total) * 100),
    contacted: Math.round(((stats.statusCounts.contacted || 0) / total) * 100),
    converted: Math.round(((stats.statusCounts.converted || 0) / total) * 100),
    archived: Math.round(((stats.statusCounts.archived || 0) / total) * 100),
  };

  return (
    <div className="space-y-6">
      
      {/* Top High-Level Metrics */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        
        <div className="p-5 rounded-2xl bg-slate-900 border border-slate-800 shadow-xl">
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider">Conversion Efficiency</span>
            <div className="p-2 rounded-xl bg-emerald-500/10 text-emerald-400">
              <TrendingUp className="w-5 h-5" />
            </div>
          </div>
          <div className="text-3xl font-extrabold text-white tracking-tight">
            {stats.conversionRate}%
          </div>
          <p className="text-xs text-slate-400 mt-1">
            {stats.statusCounts.converted} out of {stats.total} total leads successfully converted
          </p>
        </div>

        <div className="p-5 rounded-2xl bg-slate-900 border border-slate-800 shadow-xl">
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider">24-Hour Velocity</span>
            <div className="p-2 rounded-xl bg-indigo-500/10 text-indigo-400">
              <Clock className="w-5 h-5" />
            </div>
          </div>
          <div className="text-3xl font-extrabold text-white tracking-tight">
            +{stats.todayCount}
          </div>
          <p className="text-xs text-slate-400 mt-1">
            {stats.thisWeekCount} inquiries received past 7 days
          </p>
        </div>

        <div className="p-5 rounded-2xl bg-slate-900 border border-slate-800 shadow-xl">
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider">Book-A-Visit Share</span>
            <div className="p-2 rounded-xl bg-purple-500/10 text-purple-400">
              <Building2 className="w-5 h-5" />
            </div>
          </div>
          <div className="text-3xl font-extrabold text-purple-300 tracking-tight">
            {Math.round(((stats.sourceCounts['book-a-visit-form'] || 0) / total) * 100)}%
          </div>
          <p className="text-xs text-slate-400 mt-1">
            {stats.sourceCounts['book-a-visit-form'] || 0} tour bookings
          </p>
        </div>

        <div className="p-5 rounded-2xl bg-slate-900 border border-slate-800 shadow-xl">
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider">Contact Form Share</span>
            <div className="p-2 rounded-xl bg-teal-500/10 text-teal-400">
              <MessageSquare className="w-5 h-5" />
            </div>
          </div>
          <div className="text-3xl font-extrabold text-teal-300 tracking-tight">
            {Math.round(((stats.sourceCounts['contact-inquiry-form'] || 0) / total) * 100)}%
          </div>
          <p className="text-xs text-slate-400 mt-1">
            {stats.sourceCounts['contact-inquiry-form'] || 0} direct contacts
          </p>
        </div>

      </div>

      {/* Breakdown Grids */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        
        {/* Lead Pipeline Funnel */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-4">
          <h3 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
            <BarChart3 className="w-4 h-4 text-indigo-400" /> Pipeline Status Distribution
          </h3>

          <div className="space-y-3 pt-2">
            <div>
              <div className="flex justify-between text-xs mb-1">
                <span className="font-semibold text-rose-300">New Incoming</span>
                <span className="text-slate-400">{stats.statusCounts.new || 0} ({statusPercentages.new}%)</span>
              </div>
              <div className="w-full h-2.5 bg-slate-800 rounded-full overflow-hidden">
                <div className="h-full bg-rose-500 rounded-full transition-all" style={{ width: `${statusPercentages.new}%` }}></div>
              </div>
            </div>

            <div>
              <div className="flex justify-between text-xs mb-1">
                <span className="font-semibold text-amber-300">In Review</span>
                <span className="text-slate-400">{stats.statusCounts['in-review'] || 0} ({statusPercentages['in-review']}%)</span>
              </div>
              <div className="w-full h-2.5 bg-slate-800 rounded-full overflow-hidden">
                <div className="h-full bg-amber-500 rounded-full transition-all" style={{ width: `${statusPercentages['in-review']}%` }}></div>
              </div>
            </div>

            <div>
              <div className="flex justify-between text-xs mb-1">
                <span className="font-semibold text-blue-300">Contacted</span>
                <span className="text-slate-400">{stats.statusCounts.contacted || 0} ({statusPercentages.contacted}% )</span>
              </div>
              <div className="w-full h-2.5 bg-slate-800 rounded-full overflow-hidden">
                <div className="h-full bg-blue-500 rounded-full transition-all" style={{ width: `${statusPercentages.contacted}%` }}></div>
              </div>
            </div>

            <div>
              <div className="flex justify-between text-xs mb-1">
                <span className="font-semibold text-emerald-300">Converted</span>
                <span className="text-slate-400">{stats.statusCounts.converted || 0} ({statusPercentages.converted}%)</span>
              </div>
              <div className="w-full h-2.5 bg-slate-800 rounded-full overflow-hidden">
                <div className="h-full bg-emerald-500 rounded-full transition-all" style={{ width: `${statusPercentages.converted}%` }}></div>
              </div>
            </div>

            <div>
              <div className="flex justify-between text-xs mb-1">
                <span className="font-semibold text-slate-400">Archived</span>
                <span className="text-slate-400">{stats.statusCounts.archived || 0} ({statusPercentages.archived}%)</span>
              </div>
              <div className="w-full h-2.5 bg-slate-800 rounded-full overflow-hidden">
                <div className="h-full bg-slate-600 rounded-full transition-all" style={{ width: `${statusPercentages.archived}%` }}></div>
              </div>
            </div>
          </div>
        </div>

        {/* Popular Interests & Topics */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-4">
          <h3 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-cyan-400" /> Top Inquired Topics & Interests
          </h3>

          <div className="space-y-3 pt-2">
            {Object.entries(stats.interestCounts)
              .sort(([, a], [, b]) => b - a)
              .slice(0, 5)
              .map(([interest, count]) => {
                const pct = Math.round((count / total) * 100);
                return (
                  <div key={interest}>
                    <div className="flex justify-between text-xs mb-1">
                      <span className="font-medium text-slate-200 truncate max-w-xs">{interest}</span>
                      <span className="text-cyan-300 font-mono font-semibold">{count} ({pct}%)</span>
                    </div>
                    <div className="w-full h-2 bg-slate-800 rounded-full overflow-hidden">
                      <div className="h-full bg-gradient-to-r from-cyan-500 to-indigo-500 rounded-full transition-all" style={{ width: `${pct}%` }}></div>
                    </div>
                  </div>
                );
              })}
          </div>
        </div>

      </div>

    </div>
  );
};
