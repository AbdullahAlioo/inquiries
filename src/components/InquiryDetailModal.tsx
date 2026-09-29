import React, { useState } from 'react';
import { 
  X, 
  Mail, 
  Phone, 
  Calendar, 
  Clock, 
  Star, 
  Trash2, 
  CheckCircle, 
  Send, 
  Copy, 
  Check, 
  Tag, 
  Building2, 
  MessageSquare,
  Globe, 
  Monitor, 
  FileText,
  Save
} from 'lucide-react';
import { Inquiry } from '../types.ts';

interface InquiryDetailModalProps {
  inquiry: Inquiry | null;
  onClose: () => void;
  onUpdateStatus: (id: string, status: Inquiry['status']) => void;
  onToggleStar: (id: string, starred: boolean) => void;
  onUpdateNotes: (id: string, notes: string) => void;
  onDelete: (id: string) => void;
}

export const InquiryDetailModal: React.FC<InquiryDetailModalProps> = ({
  inquiry,
  onClose,
  onUpdateStatus,
  onToggleStar,
  onUpdateNotes,
  onDelete
}) => {
  if (!inquiry) return null;

  const [notes, setNotes] = useState(inquiry.notes || '');
  const [isSavingNotes, setIsSavingNotes] = useState(false);
  const [copiedField, setCopiedField] = useState<string | null>(null);
  const [selectedTemplate, setSelectedTemplate] = useState<string>('visit');
  const [replyBody, setReplyBody] = useState<string>(
    `Hi ${inquiry.name},\n\nThank you for reaching out regarding ${inquiry.interest || 'your inquiry'}. We would be thrilled to assist you!\n\nWhen would be a convenient time for a brief call or visit?\n\nBest regards,\nThe Team`
  );

  const handleCopy = (text: string, fieldName: string) => {
    navigator.clipboard.writeText(text);
    setCopiedField(fieldName);
    setTimeout(() => setCopiedField(null), 2000);
  };

  const handleSaveNotes = () => {
    setIsSavingNotes(true);
    onUpdateNotes(inquiry.id, notes);
    setTimeout(() => setIsSavingNotes(false), 500);
  };

  const handleTemplateChange = (templateKey: string) => {
    setSelectedTemplate(templateKey);
    if (templateKey === 'visit') {
      setReplyBody(
        `Hi ${inquiry.name},\n\nThank you for booking a visit! We would love to welcome you. Would you prefer a morning (10:00 AM) or afternoon (2:00 PM) slot this coming week?\n\nPlease let us know what works best for your schedule.\n\nWarm regards,\nVisits & Admissions Team`
      );
    } else if (templateKey === 'pricing') {
      setReplyBody(
        `Hi ${inquiry.name},\n\nThank you for contacting us regarding ${inquiry.interest || 'pricing and services'}. I have attached our latest prospectus and fee details for your review.\n\nPlease feel free to reply with any specific questions you may have.\n\nWarm regards,\nClient Services`
      );
    } else {
      setReplyBody(
        `Hi ${inquiry.name},\n\nThank you for reaching out to us. We have received your inquiry regarding "${inquiry.interest || 'our programs'}" and are reviewing your message.\n\nWe will follow up with complete details within 24 hours.\n\nBest regards,\nCustomer Support`
      );
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/75 backdrop-blur-sm animate-fadeIn">
      <div 
        className="relative w-full max-w-4xl max-h-[92vh] flex flex-col bg-slate-900 border border-slate-700/80 rounded-2xl shadow-2xl overflow-hidden text-slate-100"
        onClick={(e) => e.stopPropagation()}
      >
        
        {/* Header Bar */}
        <div className="p-4 sm:p-6 border-b border-slate-800 bg-slate-900/90 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <button
              onClick={() => onToggleStar(inquiry.id, !inquiry.starred)}
              className="p-2 rounded-lg bg-slate-800 border border-slate-700 hover:border-amber-500/50 text-slate-400 hover:text-amber-400 transition-colors"
              title={inquiry.starred ? 'Starred' : 'Mark as Starred'}
            >
              <Star className={`w-5 h-5 ${inquiry.starred ? 'fill-amber-400 text-amber-400' : ''}`} />
            </button>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-xl font-bold text-white tracking-tight">{inquiry.name}</h2>
                {inquiry.source === 'book-a-visit-form' ? (
                  <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-purple-500/15 text-purple-300 border border-purple-500/30">
                    <Building2 className="w-3 h-3 text-purple-400" />
                    book-a-visit-form
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-500/15 text-emerald-300 border border-emerald-500/30">
                    <MessageSquare className="w-3 h-3 text-emerald-400" />
                    {inquiry.source}
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                Received on {new Date(inquiry.createdAt).toLocaleString('en-US', { dateStyle: 'medium', timeStyle: 'short' })}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* Status Selector */}
            <select
              value={inquiry.status}
              onChange={(e) => onUpdateStatus(inquiry.id, e.target.value as Inquiry['status'])}
              className="text-xs font-semibold px-3 py-1.5 rounded-lg border border-slate-700 bg-slate-800 text-slate-200 focus:outline-none focus:ring-1 focus:ring-indigo-500 cursor-pointer"
            >
              <option value="new">● New Lead</option>
              <option value="in-review">◔ In Review</option>
              <option value="contacted">✉ Contacted</option>
              <option value="converted">✔ Converted</option>
              <option value="archived">✕ Archived</option>
            </select>

            {/* Close Button */}
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Scrollable Body */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-6">
          
          {/* Quick Contact & Info Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            
            {/* Email Box */}
            <div className="p-3.5 rounded-xl bg-slate-800/60 border border-slate-700/60 flex items-start justify-between">
              <div className="space-y-1">
                <span className="text-[11px] font-medium text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                  <Mail className="w-3.5 h-3.5 text-indigo-400" /> Email Address
                </span>
                <p className="text-sm font-medium text-white break-all">{inquiry.email}</p>
              </div>
              <div className="flex gap-1 shrink-0 ml-2">
                <button
                  onClick={() => handleCopy(inquiry.email, 'email')}
                  className="p-1.5 rounded text-slate-400 hover:text-white hover:bg-slate-700"
                  title="Copy email"
                >
                  {copiedField === 'email' ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                </button>
                <a
                  href={`mailto:${inquiry.email}?subject=Regarding%20your%20inquiry`}
                  className="p-1.5 rounded text-slate-400 hover:text-white hover:bg-slate-700"
                  title="Send email"
                >
                  <Send className="w-3.5 h-3.5" />
                </a>
              </div>
            </div>

            {/* Phone Box */}
            <div className="p-3.5 rounded-xl bg-slate-800/60 border border-slate-700/60 flex items-start justify-between">
              <div className="space-y-1">
                <span className="text-[11px] font-medium text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                  <Phone className="w-3.5 h-3.5 text-emerald-400" /> Phone Number
                </span>
                <p className="text-sm font-medium text-white">
                  {inquiry.phone || <span className="italic text-slate-500">Not provided</span>}
                </p>
              </div>
              {inquiry.phone && (
                <div className="flex gap-1 shrink-0 ml-2">
                  <button
                    onClick={() => handleCopy(inquiry.phone!, 'phone')}
                    className="p-1.5 rounded text-slate-400 hover:text-white hover:bg-slate-700"
                    title="Copy phone"
                  >
                    {copiedField === 'phone' ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                  </button>
                  <a
                    href={`tel:${inquiry.phone}`}
                    className="p-1.5 rounded text-slate-400 hover:text-white hover:bg-slate-700"
                    title="Call"
                  >
                    <Phone className="w-3.5 h-3.5" />
                  </a>
                </div>
              )}
            </div>

            {/* Interest Box */}
            <div className="p-3.5 rounded-xl bg-slate-800/60 border border-slate-700/60">
              <span className="text-[11px] font-medium text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                <Tag className="w-3.5 h-3.5 text-cyan-400" /> Area of Interest
              </span>
              <p className="text-sm font-semibold text-cyan-300 mt-1">
                {inquiry.interest || 'General'}
              </p>
            </div>

          </div>

          {/* User Message Box */}
          <div className="p-4 rounded-xl bg-slate-800/40 border border-slate-700/80">
            <h3 className="text-xs font-semibold text-slate-300 uppercase tracking-wider mb-2 flex items-center gap-2">
              <FileText className="w-4 h-4 text-indigo-400" /> Message Submitted by User
            </h3>
            <div className="p-3.5 rounded-lg bg-slate-900 border border-slate-800 text-slate-200 text-sm whitespace-pre-wrap leading-relaxed">
              {inquiry.message || (
                <span className="italic text-slate-500">
                  No additional message was included in this submission.
                </span>
              )}
            </div>
          </div>

          {/* Quick Email Reply Composer */}
          <div className="p-4 rounded-xl bg-slate-800/40 border border-slate-700/80 space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h3 className="text-xs font-semibold text-slate-300 uppercase tracking-wider flex items-center gap-2">
                <Mail className="w-4 h-4 text-emerald-400" /> Quick Reply Composer
              </h3>
              
              {/* Template selector pills */}
              <div className="flex items-center gap-1.5 text-xs">
                <span className="text-slate-400 text-[11px]">Template:</span>
                <button
                  onClick={() => handleTemplateChange('visit')}
                  className={`px-2 py-0.5 rounded text-[11px] font-medium transition-colors ${
                    selectedTemplate === 'visit' ? 'bg-indigo-600 text-white' : 'bg-slate-700 text-slate-300 hover:text-white'
                  }`}
                >
                  Visit / Tour
                </button>
                <button
                  onClick={() => handleTemplateChange('pricing')}
                  className={`px-2 py-0.5 rounded text-[11px] font-medium transition-colors ${
                    selectedTemplate === 'pricing' ? 'bg-indigo-600 text-white' : 'bg-slate-700 text-slate-300 hover:text-white'
                  }`}
                >
                  Information & Pricing
                </button>
                <button
                  onClick={() => handleTemplateChange('support')}
                  className={`px-2 py-0.5 rounded text-[11px] font-medium transition-colors ${
                    selectedTemplate === 'support' ? 'bg-indigo-600 text-white' : 'bg-slate-700 text-slate-300 hover:text-white'
                  }`}
                >
                  General Follow-up
                </button>
              </div>
            </div>

            <textarea
              rows={4}
              value={replyBody}
              onChange={(e) => setReplyBody(e.target.value)}
              className="w-full p-3 rounded-lg bg-slate-900 border border-slate-700 text-xs text-slate-200 font-mono focus:outline-none focus:ring-1 focus:ring-indigo-500"
            />

            <div className="flex items-center justify-between pt-1">
              <button
                onClick={() => handleCopy(replyBody, 'reply')}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800 border border-slate-700 hover:bg-slate-700 text-slate-300 text-xs font-medium"
              >
                {copiedField === 'reply' ? (
                  <>
                    <Check className="w-3.5 h-3.5 text-emerald-400" />
                    <span>Copied Reply Body</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-3.5 h-3.5" />
                    <span>Copy Text</span>
                  </>
                )}
              </button>

              <a
                href={`mailto:${inquiry.email}?subject=${encodeURIComponent(
                  `Regarding your inquiry: ${inquiry.interest || 'Our Services'}`
                )}&body=${encodeURIComponent(replyBody)}`}
                onClick={() => onUpdateStatus(inquiry.id, 'contacted')}
                className="flex items-center gap-1.5 px-4 py-1.5 rounded-lg bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white text-xs font-semibold shadow-md shadow-emerald-600/20"
              >
                <Send className="w-3.5 h-3.5" />
                <span>Open in Email App & Mark Contacted</span>
              </a>
            </div>
          </div>

          {/* Admin Internal Notes */}
          <div className="p-4 rounded-xl bg-slate-800/40 border border-slate-700/80 space-y-2">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-semibold text-slate-300 uppercase tracking-wider flex items-center gap-2">
                <FileText className="w-4 h-4 text-amber-400" /> Internal Staff Notes
              </h3>
              <button
                onClick={handleSaveNotes}
                disabled={isSavingNotes}
                className="flex items-center gap-1 px-2.5 py-1 rounded bg-slate-800 hover:bg-slate-700 border border-slate-700 text-xs font-medium text-amber-300"
              >
                <Save className="w-3.5 h-3.5" />
                {isSavingNotes ? 'Saved' : 'Save Notes'}
              </button>
            </div>
            <textarea
              rows={2}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Add internal notes about phone conversations, scheduled visits, or qualification..."
              className="w-full p-2.5 rounded-lg bg-slate-900 border border-slate-700 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
            />
          </div>

          {/* Technical Metadata & Client Footprint */}
          <div className="p-4 rounded-xl bg-slate-950/60 border border-slate-800/80 text-xs space-y-2">
            <h4 className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
              <Globe className="w-3.5 h-3.5 text-slate-500" /> Ingestion & Client Footprint
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2 text-slate-400">
              <div>
                <span className="text-slate-500">Inquiry ID:</span> <span className="font-mono text-slate-300">{inquiry.id}</span>
              </div>
              <div>
                <span className="text-slate-500">IP Address:</span> <span className="font-mono text-slate-300">{inquiry.ip || 'Unavailable'}</span>
              </div>
              <div>
                <span className="text-slate-500">Form Source:</span> <span className="font-mono text-indigo-300">{inquiry.source}</span>
              </div>
            </div>
            {inquiry.metadata && Object.keys(inquiry.metadata).length > 0 && (
              <div className="mt-2 pt-2 border-t border-slate-800">
                <span className="text-slate-500 block mb-1">Custom Form Parameters:</span>
                <pre className="p-2 rounded bg-slate-900 text-[11px] font-mono text-cyan-300 overflow-x-auto">
                  {JSON.stringify(inquiry.metadata, null, 2)}
                </pre>
              </div>
            )}
          </div>

        </div>

        {/* Footer Actions */}
        <div className="p-4 border-t border-slate-800 bg-slate-900/90 flex items-center justify-between">
          <button
            onClick={() => {
              if (confirm('Are you sure you want to delete this inquiry?')) {
                onDelete(inquiry.id);
                onClose();
              }
            }}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-rose-400 hover:bg-rose-500/10 text-xs font-medium transition-colors"
          >
            <Trash2 className="w-3.5 h-3.5" />
            <span>Delete Inquiry</span>
          </button>

          <button
            onClick={onClose}
            className="px-4 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium border border-slate-700"
          >
            Close Details
          </button>
        </div>

      </div>
    </div>
  );
};
