import React, { useState } from 'react';
import { 
  Building2, 
  MessageSquare, 
  Send, 
  CheckCircle2, 
  AlertCircle, 
  Sparkles, 
  Play, 
  RotateCcw,
  Code2,
  ExternalLink,
  Laptop
} from 'lucide-react';
import { Inquiry } from '../types.ts';

interface WebsiteSimulatorProps {
  onInquirySubmitted: (inquiry: Inquiry) => void;
  onSwitchToInquiries: () => void;
}

export const WebsiteSimulator: React.FC<WebsiteSimulatorProps> = ({
  onInquirySubmitted,
  onSwitchToInquiries
}) => {
  const [activeFormType, setActiveFormType] = useState<'modal' | 'contact' | 'custom'>('modal');

  // Book a visit modal form state
  const [modalName, setModalName] = useState('Alexandra Wright');
  const [modalEmail, setModalEmail] = useState('alex.wright@venturecap.com');
  const [modalInterest, setModalInterest] = useState('Private Guided Campus Tour');
  const [modalSending, setModalSending] = useState(false);
  const [modalSuccess, setModalSuccess] = useState(false);
  const [modalError, setModalError] = useState<string | null>(null);

  // Contact inquiry form state
  const [contactName, setContactName] = useState('Julian Mercer');
  const [contactEmail, setContactEmail] = useState('j.mercer@apexglobal.org');
  const [contactPhone, setContactPhone] = useState('+1 (555) 890-4421');
  const [contactInterest, setContactInterest] = useState('Corporate Booking & Packages');
  const [contactMessage, setContactMessage] = useState(
    'We are planning our regional summit for next quarter and would like details on private access, catering packages, and group reservations.'
  );
  const [contactSending, setContactSending] = useState(false);
  const [contactSuccess, setContactSuccess] = useState(false);
  const [contactError, setContactError] = useState<string | null>(null);

  // Custom Raw Tester state
  const [customParams, setCustomParams] = useState(
    'name=Harper+Lee&email=harper%40example.com&phone=555-0144&interest=Creative+Writing+Residency&source=campaign-spring-2026&vip=true'
  );
  const [customSending, setCustomSending] = useState(false);
  const [customResponse, setCustomResponse] = useState<any>(null);

  // Reusable submit function mirroring the user's exact client script:
  // var inquiryServer = window.location.origin + '/inquiry?';
  const executeClientInquiry = async (payload: Record<string, string | undefined>) => {
    const email = String(payload.email || '').trim();
    if (!email) throw new Error('Email required');

    const query = new URLSearchParams();
    Object.keys(payload).forEach((key) => {
      const val = payload[key];
      if (val !== undefined && val !== null && String(val).trim() !== '') {
        query.set(key, String(val));
      }
    });

    const inquiryServer = window.location.origin + '/inquiry?';
    const response = await fetch(inquiryServer + query.toString(), {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' }
    });

    if (!response.ok) {
      const errData = await response.json().catch(() => ({}));
      throw new Error(errData.error || errData.message || 'Server error');
    }

    return response.json();
  };

  // Submit Modal Form (Book a Visit)
  const handleModalSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setModalSending(true);
    setModalError(null);
    setModalSuccess(false);

    try {
      const res = await executeClientInquiry({
        name: modalName,
        email: modalEmail,
        interest: modalInterest,
        source: 'book-a-visit-form',
      });

      setModalSuccess(true);
      if (res.inquiry) {
        onInquirySubmitted(res.inquiry);
      }
    } catch (err: any) {
      setModalError(err.message || 'Failed to send inquiry');
    } finally {
      setModalSending(false);
    }
  };

  // Submit Contact Inquiry Form
  const handleContactSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setContactSending(true);
    setContactError(null);
    setContactSuccess(false);

    try {
      const res = await executeClientInquiry({
        name: contactName,
        email: contactEmail,
        phone: contactPhone,
        interest: contactInterest,
        message: contactMessage,
        source: 'contact-inquiry-form',
      });

      setContactSuccess(true);
      if (res.inquiry) {
        onInquirySubmitted(res.inquiry);
      }
    } catch (err: any) {
      setContactError(err.message || 'Failed to send inquiry');
    } finally {
      setContactSending(false);
    }
  };

  // Submit Custom Raw Tester
  const handleCustomSubmit = async () => {
    setCustomSending(true);
    setCustomResponse(null);

    try {
      const targetUrl = `${window.location.origin}/inquiry?${customParams.startsWith('?') ? customParams.slice(1) : customParams}`;
      const start = performance.now();
      const res = await fetch(targetUrl, {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' }
      });
      const end = performance.now();
      const data = await res.json();

      setCustomResponse({
        status: res.status,
        latencyMs: Math.round(end - start),
        data
      });

      if (data.inquiry) {
        onInquirySubmitted(data.inquiry);
      }
    } catch (err: any) {
      setCustomResponse({
        status: 500,
        error: err.message
      });
    } finally {
      setCustomSending(false);
    }
  };

  return (
    <div className="space-y-6">
      
      {/* Intro banner */}
      <div className="bg-gradient-to-r from-slate-900 via-indigo-950/60 to-slate-900 border border-indigo-900/50 rounded-2xl p-5 sm:p-6 shadow-xl">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                Interactive Testing Sandbox
              </span>
              <span className="text-xs text-slate-400">Uses GET /inquiry? exactly like your main website script</span>
            </div>
            <h2 className="text-xl sm:text-2xl font-bold text-white tracking-tight">
              Website Form Simulator
            </h2>
            <p className="text-sm text-slate-300 max-w-2xl">
              Test how user inquiries sent from your website's modal popups and contact forms get delivered instantly into your admin dashboard.
            </p>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={onSwitchToInquiries}
              className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold border border-slate-700 shadow-sm transition-all"
            >
              <span>View Admin Inbox</span>
              <ExternalLink className="w-3.5 h-3.5 text-indigo-400" />
            </button>
          </div>
        </div>

        {/* Tab switcher for simulated forms */}
        <div className="flex items-center gap-2 mt-6 border-b border-slate-800 pb-3">
          <button
            onClick={() => setActiveFormType('modal')}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold transition-all ${
              activeFormType === 'modal'
                ? 'bg-purple-600 text-white shadow-lg shadow-purple-600/20'
                : 'bg-slate-800/80 text-slate-300 hover:text-white hover:bg-slate-700'
            }`}
          >
            <Building2 className="w-4 h-4" />
            <span>Book a Visit (Modal Form)</span>
          </button>

          <button
            onClick={() => setActiveFormType('contact')}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold transition-all ${
              activeFormType === 'contact'
                ? 'bg-emerald-600 text-white shadow-lg shadow-emerald-600/20'
                : 'bg-slate-800/80 text-slate-300 hover:text-white hover:bg-slate-700'
            }`}
          >
            <MessageSquare className="w-4 h-4" />
            <span>Contact Inquiry Form</span>
          </button>

          <button
            onClick={() => setActiveFormType('custom')}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold transition-all ${
              activeFormType === 'custom'
                ? 'bg-cyan-600 text-white shadow-lg shadow-cyan-600/20'
                : 'bg-slate-800/80 text-slate-300 hover:text-white hover:bg-slate-700'
            }`}
          >
            <Code2 className="w-4 h-4" />
            <span>Custom Ingestion / Raw API</span>
          </button>
        </div>
      </div>

      {/* 1. Modal Form Simulator */}
      {activeFormType === 'modal' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          
          <div className="lg:col-span-7 bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl">
            <div className="flex items-center justify-between pb-4 mb-4 border-b border-slate-800">
              <div className="flex items-center gap-2">
                <div className="p-2 rounded-lg bg-purple-500/10 text-purple-400">
                  <Building2 className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-white">Book a Visit Modal</h3>
                  <p className="text-xs text-slate-400">Payload Source: <code className="text-purple-300 font-mono">book-a-visit-form</code></p>
                </div>
              </div>

              {/* Sample Quick Fills */}
              <button
                type="button"
                onClick={() => {
                  setModalName('Jonathan & Claire Hayes');
                  setModalEmail('hayes.family@example.com');
                  setModalInterest('Architecture & Design Lab Tour');
                  setModalSuccess(false);
                }}
                className="text-xs text-indigo-400 hover:text-indigo-300 flex items-center gap-1 font-medium"
              >
                <Sparkles className="w-3.5 h-3.5" />
                Sample Lead
              </button>
            </div>

            {modalSuccess && (
              <div className="mb-4 p-4 rounded-xl bg-emerald-950/40 border border-emerald-500/40 flex items-start gap-3 text-emerald-200 text-xs">
                <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
                <div className="space-y-1">
                  <p className="font-semibold text-white">Inquiry successfully sent!</p>
                  <p className="text-emerald-300">
                    The inquiry was transmitted via <code className="font-mono">GET /inquiry?</code> and is now live in the admin inbox.
                  </p>
                  <button
                    onClick={onSwitchToInquiries}
                    className="inline-flex items-center gap-1 mt-1 text-emerald-400 underline font-semibold hover:text-white"
                  >
                    Go to Inquiries Inbox →
                  </button>
                </div>
              </div>
            )}

            {modalError && (
              <div className="mb-4 p-4 rounded-xl bg-rose-950/40 border border-rose-500/40 flex items-start gap-3 text-rose-200 text-xs">
                <AlertCircle className="w-5 h-5 text-rose-400 shrink-0" />
                <div>
                  <p className="font-semibold text-white">Submission failed</p>
                  <p>{modalError}</p>
                </div>
              </div>
            )}

            <form onSubmit={handleModalSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1">
                  Visitor Name (modal-name)
                </label>
                <input
                  type="text"
                  required
                  value={modalName}
                  onChange={(e) => setModalName(e.target.value)}
                  placeholder="e.g. Eleanor Vance"
                  className="w-full px-3.5 py-2.5 bg-slate-800 border border-slate-700 rounded-xl text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-purple-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1">
                  Email Address (modal-email)
                </label>
                <input
                  type="email"
                  required
                  value={modalEmail}
                  onChange={(e) => setModalEmail(e.target.value)}
                  placeholder="e.g. visitor@example.com"
                  className="w-full px-3.5 py-2.5 bg-slate-800 border border-slate-700 rounded-xl text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-purple-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1">
                  Area of Interest (modal-interest)
                </label>
                <select
                  value={modalInterest}
                  onChange={(e) => setModalInterest(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-slate-800 border border-slate-700 rounded-xl text-sm text-white focus:outline-none focus:ring-2 focus:ring-purple-500 cursor-pointer"
                >
                  <option value="Private Guided Campus Tour">Private Guided Campus Tour</option>
                  <option value="STEM Lab & Robotics Walkthrough">STEM Lab & Robotics Walkthrough</option>
                  <option value="Architecture & Design Lab Tour">Architecture & Design Lab Tour</option>
                  <option value="Weekend Workshop Experience">Weekend Workshop Experience</option>
                  <option value="Executive Admissions Meeting">Executive Admissions Meeting</option>
                </select>
              </div>

              <button
                type="submit"
                disabled={modalSending}
                className="w-full py-3 px-4 rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white font-bold text-sm shadow-lg shadow-purple-600/25 transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
              >
                {modalSending ? (
                  <>
                    <RotateCcw className="w-4 h-4 animate-spin" />
                    <span>Sending to Admin...</span>
                  </>
                ) : (
                  <>
                    <Send className="w-4 h-4" />
                    <span>Submit "Book a Visit" Inquiry</span>
                  </>
                )}
              </button>
            </form>
          </div>

          {/* Code Inspection Card */}
          <div className="lg:col-span-5 bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-4">
            <h4 className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center gap-2">
              <Code2 className="w-4 h-4 text-purple-400" /> Exact Client Call Under The Hood
            </h4>
            <p className="text-xs text-slate-400">
              This simulator runs the exact function from your website script:
            </p>
            <pre className="p-3.5 rounded-xl bg-slate-950 border border-slate-800 text-[11px] font-mono text-slate-300 overflow-x-auto leading-relaxed">
{`sendInquiryToHuggingFace({
  name: "${modalName}",
  email: "${modalEmail}",
  interest: "${modalInterest}",
  source: 'book-a-visit-form'
});

// Sends HTTP GET to:
// ${window.location.origin}/inquiry?name=${encodeURIComponent(modalName)}&email=${encodeURIComponent(modalEmail)}&interest=${encodeURIComponent(modalInterest)}&source=book-a-visit-form`}
            </pre>
            <div className="p-3 rounded-xl bg-purple-950/20 border border-purple-800/40 text-xs text-purple-300">
              💡 <strong>Instant Delivery:</strong> When submitted, your admin page updates live without needing to refresh!
            </div>
          </div>

        </div>
      )}

      {/* 2. Contact Inquiry Form Simulator */}
      {activeFormType === 'contact' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          
          <div className="lg:col-span-7 bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl">
            <div className="flex items-center justify-between pb-4 mb-4 border-b border-slate-800">
              <div className="flex items-center gap-2">
                <div className="p-2 rounded-lg bg-emerald-500/10 text-emerald-400">
                  <MessageSquare className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-white">Full Contact Page Form</h3>
                  <p className="text-xs text-slate-400">Payload Source: <code className="text-emerald-300 font-mono">contact-inquiry-form</code></p>
                </div>
              </div>

              {/* Sample Quick Fills */}
              <button
                type="button"
                onClick={() => {
                  setContactName('Dr. Aris Thorne');
                  setContactEmail('aris.thorne@biomed-institute.org');
                  setContactPhone('+1 (555) 771-3329');
                  setContactInterest('Research Partnership & Facility Access');
                  setContactMessage('We would like to discuss establishing a 12-month joint research initiative.');
                  setContactSuccess(false);
                }}
                className="text-xs text-indigo-400 hover:text-indigo-300 flex items-center gap-1 font-medium"
              >
                <Sparkles className="w-3.5 h-3.5" />
                Sample Lead
              </button>
            </div>

            {contactSuccess && (
              <div className="mb-4 p-4 rounded-xl bg-emerald-950/40 border border-emerald-500/40 flex items-start gap-3 text-emerald-200 text-xs">
                <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
                <div className="space-y-1">
                  <p className="font-semibold text-white">Contact inquiry sent successfully!</p>
                  <p className="text-emerald-300">
                    Your contact form inquiry is now in the admin inbox with all details, phone, and message.
                  </p>
                  <button
                    onClick={onSwitchToInquiries}
                    className="inline-flex items-center gap-1 mt-1 text-emerald-400 underline font-semibold hover:text-white"
                  >
                    Go to Inquiries Inbox →
                  </button>
                </div>
              </div>
            )}

            {contactError && (
              <div className="mb-4 p-4 rounded-xl bg-rose-950/40 border border-rose-500/40 flex items-start gap-3 text-rose-200 text-xs">
                <AlertCircle className="w-5 h-5 text-rose-400 shrink-0" />
                <div>
                  <p className="font-semibold text-white">Submission failed</p>
                  <p>{contactError}</p>
                </div>
              </div>
            )}

            <form onSubmit={handleContactSubmit} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1">
                    Your Name (name)
                  </label>
                  <input
                    type="text"
                    required
                    value={contactName}
                    onChange={(e) => setContactName(e.target.value)}
                    className="w-full px-3.5 py-2 bg-slate-800 border border-slate-700 rounded-xl text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1">
                    Email Address (email)
                  </label>
                  <input
                    type="email"
                    required
                    value={contactEmail}
                    onChange={(e) => setContactEmail(e.target.value)}
                    className="w-full px-3.5 py-2 bg-slate-800 border border-slate-700 rounded-xl text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1">
                    Phone (phone)
                  </label>
                  <input
                    type="tel"
                    value={contactPhone}
                    onChange={(e) => setContactPhone(e.target.value)}
                    className="w-full px-3.5 py-2 bg-slate-800 border border-slate-700 rounded-xl text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1">
                    Interest / Topic (interest)
                  </label>
                  <input
                    type="text"
                    value={contactInterest}
                    onChange={(e) => setContactInterest(e.target.value)}
                    className="w-full px-3.5 py-2 bg-slate-800 border border-slate-700 rounded-xl text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1">
                  Message (message)
                </label>
                <textarea
                  rows={3}
                  value={contactMessage}
                  onChange={(e) => setContactMessage(e.target.value)}
                  className="w-full px-3.5 py-2 bg-slate-800 border border-slate-700 rounded-xl text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              <button
                type="submit"
                disabled={contactSending}
                className="w-full py-3 px-4 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-bold text-sm shadow-lg shadow-emerald-600/25 transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
              >
                {contactSending ? (
                  <>
                    <RotateCcw className="w-4 h-4 animate-spin" />
                    <span>Dispatching...</span>
                  </>
                ) : (
                  <>
                    <Send className="w-4 h-4" />
                    <span>Send Contact Inquiry Form</span>
                  </>
                )}
              </button>
            </form>
          </div>

          {/* Code Inspection Card */}
          <div className="lg:col-span-5 bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-4">
            <h4 className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center gap-2">
              <Code2 className="w-4 h-4 text-emerald-400" /> Contact Script In Action
            </h4>
            <p className="text-xs text-slate-400">
              Matches line 110 of your JavaScript snippet:
            </p>
            <pre className="p-3.5 rounded-xl bg-slate-950 border border-slate-800 text-[11px] font-mono text-slate-300 overflow-x-auto leading-relaxed">
{`sendInquiryToHuggingFace({
  name: "${contactName}",
  email: "${contactEmail}",
  phone: "${contactPhone}",
  interest: "${contactInterest}",
  message: "${contactMessage.slice(0, 45)}...",
  source: 'contact-inquiry-form'
});`}
            </pre>
            <div className="p-3 rounded-xl bg-emerald-950/20 border border-emerald-800/40 text-xs text-emerald-300">
              ✓ Both GET query parameters and POST request bodies are supported simultaneously!
            </div>
          </div>

        </div>
      )}

      {/* 3. Custom Raw Ingestion Tester */}
      {activeFormType === 'custom' && (
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-800">
            <div>
              <h3 className="text-base font-bold text-white">Custom Query String / Ingestion Tester</h3>
              <p className="text-xs text-slate-400">
                Directly fire a test <code className="text-cyan-400 font-mono">GET /inquiry?{"{queryParams}"}</code> request.
              </p>
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-xs font-semibold text-slate-300 uppercase tracking-wider">
              Query String Parameters
            </label>
            <div className="flex items-center gap-2">
              <span className="text-xs font-mono text-slate-500 bg-slate-800 px-2.5 py-2 rounded-lg border border-slate-700">
                {window.location.origin}/inquiry?
              </span>
              <input
                type="text"
                value={customParams}
                onChange={(e) => setCustomParams(e.target.value)}
                className="flex-1 px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-xs font-mono text-white focus:outline-none focus:ring-1 focus:ring-cyan-500"
              />
              <button
                onClick={handleCustomSubmit}
                disabled={customSending}
                className="px-4 py-2 rounded-lg bg-cyan-600 hover:bg-cyan-500 text-white font-semibold text-xs flex items-center gap-1.5 shadow-md shadow-cyan-600/20 disabled:opacity-50 cursor-pointer"
              >
                <Play className="w-3.5 h-3.5" />
                {customSending ? 'Executing...' : 'Execute GET'}
              </button>
            </div>
          </div>

          {customResponse && (
            <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 text-xs space-y-2">
              <div className="flex items-center justify-between">
                <span className="font-semibold text-slate-300">HTTP Response:</span>
                <div className="flex items-center gap-3">
                  <span className={`px-2 py-0.5 rounded text-[11px] font-bold ${
                    customResponse.status === 200 ? 'bg-emerald-500/20 text-emerald-400' : 'bg-rose-500/20 text-rose-400'
                  }`}>
                    Status {customResponse.status}
                  </span>
                  {customResponse.latencyMs && (
                    <span className="text-slate-400">{customResponse.latencyMs}ms</span>
                  )}
                </div>
              </div>
              <pre className="p-3 rounded bg-slate-900 text-[11px] font-mono text-cyan-300 overflow-x-auto">
                {JSON.stringify(customResponse.data || customResponse, null, 2)}
              </pre>
            </div>
          )}
        </div>
      )}

    </div>
  );
};
