import React, { useState } from 'react';
import { 
  Star, 
  Mail, 
  Phone, 
  ExternalLink, 
  Trash2, 
  CheckCircle, 
  Clock, 
  Calendar, 
  Filter, 
  ChevronDown, 
  Tag, 
  MoreHorizontal,
  FileSpreadsheet,
  Building2,
  MessageSquare,
  Sparkles,
  SearchX,
  Play
} from 'lucide-react';
import { Inquiry, FilterStatus, FilterSource } from '../types.ts';

interface InquiryListProps {
  inquiries: Inquiry[];
  selectedInquiry: Inquiry | null;
  onSelectInquiry: (inquiry: Inquiry) => void;
  onUpdateStatus: (id: string, status: Inquiry['status']) => void;
  onToggleStar: (id: string, starred: boolean) => void;
  onDeleteInquiry: (id: string) => void;
  onBulkAction: (action: 'status' | 'delete', ids: string[], status?: Inquiry['status']) => void;
  statusFilter: FilterStatus;
  setStatusFilter: (status: FilterStatus) => void;
  sourceFilter: FilterSource;
  setSourceFilter: (source: FilterSource) => void;
  starredFilter: boolean;
  setStarredFilter: (val: boolean) => void;
  onOpenSimulator: () => void;
}

export const InquiryList: React.FC<InquiryListProps> = ({
  inquiries,
  selectedInquiry,
  onSelectInquiry,
  onUpdateStatus,
  onToggleStar,
  onDeleteInquiry,
  onBulkAction,
  statusFilter,
  setStatusFilter,
  sourceFilter,
  setSourceFilter,
  starredFilter,
  setStarredFilter,
  onOpenSimulator
}) => {
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [sortBy, setSortBy] = useState<'date-desc' | 'date-asc' | 'name'>('date-desc');

  // Multi-select handlers
  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedIds(inquiries.map(i => i.id));
    } else {
      setSelectedIds([]);
    }
  };

  const handleToggleSelect = (id: string) => {
    setSelectedIds(prev => 
      prev.includes(id) ? prev.filter(item => item !== id) : [...prev, id]
    );
  };

  // Sort inquiries
  const sortedInquiries = [...inquiries].sort((a, b) => {
    if (sortBy === 'date-desc') {
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    }
    if (sortBy === 'date-asc') {
      return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
    }
    if (sortBy === 'name') {
      return a.name.localeCompare(b.name);
    }
    return 0;
  });

  // Unique sources for filter dropdown
  const uniqueSources = Array.from(new Set(inquiries.map(i => i.source)));

  const formatRelativeTime = (isoString: string) => {
    const diff = Date.now() - new Date(isoString).getTime();
    const mins = Math.floor(diff / (1000 * 60));
    if (mins < 1) return 'Just now';
    if (mins < 60) return `${mins}m ago`;
    const hours = Math.floor(mins / 60);
    if (hours < 24) return `${hours}h ago`;
    const days = Math.floor(hours / 24);
    if (days === 1) return 'Yesterday';
    if (days < 30) return `${days}d ago`;
    return new Date(isoString).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };

  const getStatusBadge = (status: Inquiry['status']) => {
    switch (status) {
      case 'new':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-rose-500/15 text-rose-400 border border-rose-500/30">
            <span className="w-1.5 h-1.5 rounded-full bg-rose-400 animate-pulse"></span>
            New
          </span>
        );
      case 'in-review':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-amber-500/15 text-amber-300 border border-amber-500/30">
            <Clock className="w-3 h-3" />
            In Review
          </span>
        );
      case 'contacted':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-blue-500/15 text-blue-300 border border-blue-500/30">
            <Mail className="w-3 h-3" />
            Contacted
          </span>
        );
      case 'converted':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-500/15 text-emerald-300 border border-emerald-500/30">
            <CheckCircle className="w-3 h-3" />
            Converted
          </span>
        );
      case 'archived':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-slate-700 text-slate-300 border border-slate-600">
            Archived
          </span>
        );
    }
  };

  const getSourceBadge = (source: string) => {
    if (source === 'book-a-visit-form') {
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-medium bg-purple-500/15 text-purple-300 border border-purple-500/30" title="Modal: Book a Visit Form">
          <Building2 className="w-3 h-3 text-purple-400" />
          book-a-visit
        </span>
      );
    }
    if (source === 'contact-inquiry-form') {
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-medium bg-emerald-500/15 text-emerald-300 border border-emerald-500/30" title="Contact Page Form">
          <MessageSquare className="w-3 h-3 text-emerald-400" />
          contact-form
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-medium bg-cyan-500/15 text-cyan-300 border border-cyan-500/30">
        <Tag className="w-3 h-3 text-cyan-400" />
        {source}
      </span>
    );
  };

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden shadow-xl">
      
      {/* Filter and Control Bar */}
      <div className="p-4 border-b border-slate-800 bg-slate-900/90 flex flex-wrap items-center justify-between gap-3">
        
        {/* Status Pill Tabs */}
        <div className="flex items-center flex-wrap gap-1.5">
          {(['all', 'new', 'in-review', 'contacted', 'converted', 'archived'] as FilterStatus[]).map((st) => (
            <button
              key={st}
              onClick={() => setStatusFilter(st)}
              className={`px-3 py-1 text-xs font-medium rounded-lg transition-colors capitalize ${
                statusFilter === st
                  ? 'bg-indigo-600 text-white shadow-sm'
                  : 'bg-slate-800/80 text-slate-300 hover:text-white hover:bg-slate-700'
              }`}
            >
              {st === 'all' ? 'All Leads' : st.replace('-', ' ')}
            </button>
          ))}
        </div>

        {/* Secondary filters & Sort */}
        <div className="flex items-center flex-wrap gap-2 text-xs">
          
          {/* Starred filter button */}
          <button
            onClick={() => setStarredFilter(!starredFilter)}
            className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border transition-colors ${
              starredFilter
                ? 'bg-amber-500/20 text-amber-300 border-amber-500/40'
                : 'bg-slate-800 border-slate-700 text-slate-400 hover:text-slate-200'
            }`}
          >
            <Star className={`w-3.5 h-3.5 ${starredFilter ? 'fill-amber-400 text-amber-400' : ''}`} />
            <span>Starred</span>
          </button>

          {/* Source Dropdown */}
          <div className="relative">
            <select
              value={sourceFilter}
              onChange={(e) => setSourceFilter(e.target.value as FilterSource)}
              className="bg-slate-800 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-slate-200 focus:outline-none focus:ring-1 focus:ring-indigo-500 cursor-pointer"
            >
              <option value="all">All Sources</option>
              <option value="book-a-visit-form">book-a-visit-form</option>
              <option value="contact-inquiry-form">contact-inquiry-form</option>
              {uniqueSources
                .filter(s => s !== 'book-a-visit-form' && s !== 'contact-inquiry-form')
                .map(s => (
                  <option key={s} value={s}>{s}</option>
                ))}
            </select>
          </div>

          {/* Sort By */}
          <div className="relative">
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as any)}
              className="bg-slate-800 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-slate-200 focus:outline-none focus:ring-1 focus:ring-indigo-500 cursor-pointer"
            >
              <option value="date-desc">Newest First</option>
              <option value="date-asc">Oldest First</option>
              <option value="name">Name (A-Z)</option>
            </select>
          </div>

        </div>

      </div>

      {/* Bulk Action Bar (when rows are checked) */}
      {selectedIds.length > 0 && (
        <div className="p-3 bg-indigo-950/70 border-b border-indigo-800/60 flex items-center justify-between text-xs text-indigo-200 animate-fadeIn">
          <div className="flex items-center gap-2">
            <span className="font-semibold text-white px-2 py-0.5 bg-indigo-600 rounded">
              {selectedIds.length}
            </span>
            <span>inquiries selected</span>
            <button 
              onClick={() => setSelectedIds([])}
              className="text-indigo-400 hover:text-white underline ml-2"
            >
              Deselect all
            </button>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-slate-400">Set status:</span>
            <button
              onClick={() => onBulkAction('status', selectedIds, 'contacted')}
              className="px-2.5 py-1 rounded bg-blue-600/80 hover:bg-blue-600 text-white font-medium"
            >
              Contacted
            </button>
            <button
              onClick={() => onBulkAction('status', selectedIds, 'converted')}
              className="px-2.5 py-1 rounded bg-emerald-600/80 hover:bg-emerald-600 text-white font-medium"
            >
              Converted
            </button>
            <button
              onClick={() => onBulkAction('status', selectedIds, 'archived')}
              className="px-2.5 py-1 rounded bg-slate-700 hover:bg-slate-600 text-white font-medium"
            >
              Archive
            </button>
            <button
              onClick={() => {
                if (confirm(`Delete ${selectedIds.length} selected inquiries?`)) {
                  onBulkAction('delete', selectedIds);
                  setSelectedIds([]);
                }
              }}
              className="px-2.5 py-1 rounded bg-rose-600/80 hover:bg-rose-600 text-white font-medium flex items-center gap-1"
            >
              <Trash2 className="w-3 h-3" />
              Delete
            </button>
          </div>
        </div>
      )}

      {/* Table view */}
      {sortedInquiries.length === 0 ? (
        <div className="py-16 px-4 text-center">
          <div className="w-12 h-12 mx-auto rounded-full bg-slate-800 flex items-center justify-center text-slate-500 mb-3">
            <SearchX className="w-6 h-6" />
          </div>
          <h3 className="text-base font-semibold text-white">No inquiries found</h3>
          <p className="text-sm text-slate-400 max-w-sm mx-auto mt-1 mb-5">
            No inquiry matches your current filters or search terms. Try clearing filters or submit a test lead.
          </p>
          <div className="flex justify-center gap-3">
            <button
              onClick={() => {
                setStatusFilter('all');
                setSourceFilter('all');
                setStarredFilter(false);
              }}
              className="px-4 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium border border-slate-700"
            >
              Reset Filters
            </button>
            <button
              onClick={onOpenSimulator}
              className="px-4 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-medium flex items-center gap-1.5 shadow-md shadow-indigo-600/20"
            >
              <Play className="w-3.5 h-3.5" />
              Send Test Inquiry
            </button>
          </div>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs sm:text-sm">
            <thead>
              <tr className="border-b border-slate-800 bg-slate-900/60 text-slate-400 text-[11px] uppercase tracking-wider font-semibold">
                <th className="py-3 px-3 w-10 text-center">
                  <input
                    type="checkbox"
                    checked={selectedIds.length > 0 && selectedIds.length === inquiries.length}
                    onChange={(e) => handleSelectAll(e.target.checked)}
                    className="rounded border-slate-700 bg-slate-800 text-indigo-600 focus:ring-0 focus:ring-offset-0 cursor-pointer"
                  />
                </th>
                <th className="py-3 px-2 w-8 text-center"></th>
                <th className="py-3 px-4">Contact & Lead</th>
                <th className="py-3 px-3">Source & Form</th>
                <th className="py-3 px-3">Interest / Topic</th>
                <th className="py-3 px-3 hidden md:table-cell">Message Excerpt</th>
                <th className="py-3 px-3">Status</th>
                <th className="py-3 px-3 text-right">Received</th>
                <th className="py-3 px-3 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/80">
              {sortedInquiries.map((inquiry) => {
                const isSelected = selectedIds.includes(inquiry.id);
                const isCurrent = selectedInquiry?.id === inquiry.id;

                return (
                  <tr
                    key={inquiry.id}
                    className={`group transition-colors cursor-pointer ${
                      isCurrent
                        ? 'bg-indigo-950/40 hover:bg-indigo-950/60'
                        : isSelected
                        ? 'bg-indigo-950/20 hover:bg-slate-800/60'
                        : inquiry.status === 'new'
                        ? 'bg-rose-950/10 hover:bg-slate-800/60'
                        : 'hover:bg-slate-800/50'
                    }`}
                    onClick={() => onSelectInquiry(inquiry)}
                  >
                    {/* Checkbox */}
                    <td 
                      className="py-3 px-3 text-center" 
                      onClick={(e) => e.stopPropagation()}
                    >
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={() => handleToggleSelect(inquiry.id)}
                        className="rounded border-slate-700 bg-slate-800 text-indigo-600 focus:ring-0 focus:ring-offset-0 cursor-pointer"
                      />
                    </td>

                    {/* Star icon */}
                    <td 
                      className="py-3 px-2 text-center" 
                      onClick={(e) => {
                        e.stopPropagation();
                        onToggleStar(inquiry.id, !inquiry.starred);
                      }}
                    >
                      <button className="text-slate-500 hover:text-amber-400 p-1">
                        <Star className={`w-3.5 h-3.5 ${inquiry.starred ? 'fill-amber-400 text-amber-400' : ''}`} />
                      </button>
                    </td>

                    {/* Contact name & email */}
                    <td className="py-3 px-4">
                      <div className="font-semibold text-slate-100 group-hover:text-indigo-300 transition-colors">
                        {inquiry.name}
                      </div>
                      <div className="text-xs text-slate-400 flex items-center gap-2 mt-0.5">
                        <span className="truncate max-w-[160px] sm:max-w-[200px]" title={inquiry.email}>
                          {inquiry.email}
                        </span>
                        {inquiry.phone && (
                          <span className="hidden sm:inline text-slate-500 flex items-center gap-1">
                            • {inquiry.phone}
                          </span>
                        )}
                      </div>
                    </td>

                    {/* Source badge */}
                    <td className="py-3 px-3 whitespace-nowrap">
                      {getSourceBadge(inquiry.source)}
                    </td>

                    {/* Interest / Topic */}
                    <td className="py-3 px-3">
                      <span className="font-medium text-slate-200 text-xs block truncate max-w-[150px]">
                        {inquiry.interest || 'General'}
                      </span>
                    </td>

                    {/* Message snippet */}
                    <td className="py-3 px-3 hidden md:table-cell text-slate-400 text-xs max-w-xs">
                      <p className="truncate line-clamp-1" title={inquiry.message || 'No written message'}>
                        {inquiry.message || <span className="italic text-slate-600">No message text</span>}
                      </p>
                    </td>

                    {/* Status badge & fast selector */}
                    <td 
                      className="py-3 px-3 whitespace-nowrap"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <select
                        value={inquiry.status}
                        onChange={(e) => onUpdateStatus(inquiry.id, e.target.value as Inquiry['status'])}
                        className={`text-xs font-semibold px-2 py-1 rounded-lg border cursor-pointer focus:outline-none transition-colors ${
                          inquiry.status === 'new'
                            ? 'bg-rose-500/10 text-rose-300 border-rose-500/30'
                            : inquiry.status === 'in-review'
                            ? 'bg-amber-500/10 text-amber-300 border-amber-500/30'
                            : inquiry.status === 'contacted'
                            ? 'bg-blue-500/10 text-blue-300 border-blue-500/30'
                            : inquiry.status === 'converted'
                            ? 'bg-emerald-500/10 text-emerald-300 border-emerald-500/30'
                            : 'bg-slate-800 text-slate-400 border-slate-700'
                        }`}
                      >
                        <option value="new">● New</option>
                        <option value="in-review">◔ In Review</option>
                        <option value="contacted">✉ Contacted</option>
                        <option value="converted">✔ Converted</option>
                        <option value="archived">✕ Archived</option>
                      </select>
                    </td>

                    {/* Received date */}
                    <td className="py-3 px-3 text-right whitespace-nowrap text-slate-400 text-xs">
                      {formatRelativeTime(inquiry.createdAt)}
                    </td>

                    {/* Quick row actions */}
                    <td 
                      className="py-3 px-3 text-right whitespace-nowrap"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <div className="flex items-center justify-end gap-1">
                        <a
                          href={`mailto:${inquiry.email}?subject=Regarding%20your%20inquiry%20about%20${encodeURIComponent(inquiry.interest || 'our services')}`}
                          className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
                          title="Open Email"
                        >
                          <Mail className="w-3.5 h-3.5" />
                        </a>
                        <button
                          onClick={() => onSelectInquiry(inquiry)}
                          className="p-1.5 rounded-lg text-slate-400 hover:text-indigo-400 hover:bg-slate-800 transition-colors"
                          title="View Details"
                        >
                          <ExternalLink className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => {
                            if (confirm(`Delete inquiry from ${inquiry.name}?`)) {
                              onDeleteInquiry(inquiry.id);
                            }
                          }}
                          className="p-1.5 rounded-lg text-slate-500 hover:text-rose-400 hover:bg-slate-800 transition-colors"
                          title="Delete"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>

                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Footer summary bar */}
      <div className="p-3 border-t border-slate-800 bg-slate-900/90 flex items-center justify-between text-xs text-slate-400">
        <div>
          Showing <span className="font-semibold text-slate-200">{sortedInquiries.length}</span> of <span className="font-semibold text-slate-200">{inquiries.length}</span> inquiries
        </div>
        <div className="flex items-center gap-4">
          <span className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-purple-400"></span> book-a-visit-form
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-emerald-400"></span> contact-inquiry-form
          </span>
        </div>
      </div>

    </div>
  );
};
