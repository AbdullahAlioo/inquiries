import React, { useState } from 'react';
import { 
  Code2, 
  Copy, 
  Check, 
  Terminal, 
  Globe, 
  ExternalLink, 
  FileText, 
  ShieldCheck, 
  Zap,
  ArrowRight
} from 'lucide-react';

interface IntegrationGuideProps {
  onOpenSimulator: () => void;
}

export const IntegrationGuide: React.FC<IntegrationGuideProps> = ({ onOpenSimulator }) => {
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  const baseUrl = typeof window !== 'undefined' ? window.location.origin : 'https://your-domain.com';
  const inquiryEndpoint = `${baseUrl}/inquiry?`;

  const copyToClipboard = (text: string, key: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  const clientScriptCode = `(function () {
  'use strict';

  // 1. Point to your InquiryHub Admin Server Endpoint
  var inquiryServer = '${inquiryEndpoint}';

  // 2. Core sender function that converts payload to query parameters and calls GET /inquiry?
  function sendInquiryToAdmin(payload) {
    var email = String(payload.email || '').trim();
    if (!email) return Promise.reject(new Error('Email required'));

    var query = new URLSearchParams();
    Object.keys(payload).forEach(function (key) {
      if (payload[key]) query.set(key, String(payload[key]));
    });

    return fetch(inquiryServer + query.toString(), {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' }
    }).then(function (response) {
      if (!response.ok) throw new Error('Server error');
      return response.json();
    });
  }

  // 3. Modal Form: "Book a Visit"
  var modalForm = document.querySelector('#modal-form');
  var successMessage = document.querySelector('.success-message');
  if (modalForm) {
    modalForm.addEventListener('submit', function (event) {
      event.preventDefault();
      var submit = modalForm.querySelector('button[type="submit"]');
      var original = submit.innerHTML;
      var data = new FormData(modalForm);
      submit.disabled = true;
      submit.textContent = 'Sending…';

      sendInquiryToAdmin({
        name: data.get('modal-name'),
        email: data.get('modal-email'),
        interest: data.get('modal-interest'),
        source: 'book-a-visit-form',
      }).then(function (result) {
        console.log('Inquiry recorded with ID:', result.id);
        modalForm.hidden = true;
        if (successMessage) successMessage.hidden = false;
      }).catch(function (error) {
        console.error('Inquiry submission failed:', error);
        alert('There was an error sending your request. Please try again or call us directly.');
      }).finally(function () {
        submit.disabled = false;
        submit.innerHTML = original;
      });
    });
  }

  // 4. Contact Us Page Form
  var inquiryForm = document.querySelector('#inquiry-form');
  if (inquiryForm) {
    inquiryForm.addEventListener('submit', function (event) {
      event.preventDefault();
      var submit = inquiryForm.querySelector('button[type="submit"]');
      var original = submit.innerHTML;
      var data = new FormData(inquiryForm);
      submit.disabled = true;
      submit.textContent = 'Sending…';

      sendInquiryToAdmin({
        name: data.get('name'),
        email: data.get('email'),
        phone: data.get('phone'),
        interest: data.get('interest'),
        message: data.get('message'),
        source: 'contact-inquiry-form',
      }).then(function (result) {
        inquiryForm.reset();
        alert('Thanks for reaching out! Your inquiry has been sent to our team.');
      }).catch(function (error) {
        console.error('Inquiry submission failed:', error);
        alert('We could not send your inquiry. Please try again.');
      }).finally(function () {
        submit.disabled = false;
        submit.innerHTML = original;
      });
    });
  }

})();`;

  const curlExample = `curl -X GET "${inquiryEndpoint}name=Jane+Doe&email=jane%40example.com&phone=555-0199&interest=Campus+Tour&source=book-a-visit-form"`;

  const postExample = `fetch("${baseUrl}/inquiry", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({
    name: "Alex Vance",
    email: "alex@example.com",
    interest: "STEM Program",
    source: "book-a-visit-form"
  })
}).then(res => res.json()).then(console.log);`;

  return (
    <div className="space-y-6">
      
      {/* Overview Card */}
      <div className="bg-gradient-to-r from-slate-900 via-indigo-950/60 to-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                Ready for Production
              </span>
              <span className="text-xs text-slate-400">CORS Enabled (Access-Control-Allow-Origin: *)</span>
            </div>
            <h2 className="text-2xl font-bold text-white tracking-tight">
              Website Integration Guide
            </h2>
            <p className="text-sm text-slate-300 max-w-2xl">
              Connect your public website forms directly to this admin dashboard. Simply update your website's <code className="text-indigo-300 font-mono text-xs">inquiryServer</code> URL to the endpoint below.
            </p>
          </div>

          <button
            onClick={onOpenSimulator}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold shadow-lg shadow-indigo-600/25 cursor-pointer"
          >
            <span>Launch Interactive Simulator</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Live Endpoint Bar */}
        <div className="mt-6 p-4 rounded-xl bg-slate-950 border border-indigo-900/60 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <span className="px-2.5 py-1 rounded bg-indigo-500/20 text-indigo-300 text-xs font-mono font-bold">
              GET / POST
            </span>
            <span className="text-xs font-mono text-slate-200 break-all select-all">
              {inquiryEndpoint}
            </span>
          </div>
          <button
            onClick={() => copyToClipboard(inquiryEndpoint, 'endpoint')}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium border border-slate-700 shrink-0"
          >
            {copiedKey === 'endpoint' ? (
              <>
                <Check className="w-3.5 h-3.5 text-emerald-400" />
                <span>Copied Endpoint</span>
              </>
            ) : (
              <>
                <Copy className="w-3.5 h-3.5" />
                <span>Copy URL</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Full Script Snippet */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
        <div className="p-4 sm:p-5 border-b border-slate-800 bg-slate-900/90 flex items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <Code2 className="w-5 h-5 text-indigo-400" />
            <div>
              <h3 className="text-sm font-bold text-white">Your Complete Website JavaScript File</h3>
              <p className="text-xs text-slate-400">Drop this into your website's main.js or script tag</p>
            </div>
          </div>
          <button
            onClick={() => copyToClipboard(clientScriptCode, 'script')}
            className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold shadow-md shadow-indigo-600/20"
          >
            {copiedKey === 'script' ? (
              <>
                <Check className="w-3.5 h-3.5" />
                <span>Copied Code</span>
              </>
            ) : (
              <>
                <Copy className="w-3.5 h-3.5" />
                <span>Copy Entire Script</span>
              </>
            )}
          </button>
        </div>

        <div className="p-4 bg-slate-950 overflow-x-auto max-h-[500px]">
          <pre className="text-xs font-mono text-slate-300 leading-relaxed">
            {clientScriptCode}
          </pre>
        </div>
      </div>

      {/* Alternative APIs: cURL & POST JSON */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        
        {/* cURL Example */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-xl space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Terminal className="w-4 h-4 text-amber-400" />
              <h4 className="text-xs font-bold text-slate-200 uppercase tracking-wider">
                cURL CLI Test Command
              </h4>
            </div>
            <button
              onClick={() => copyToClipboard(curlExample, 'curl')}
              className="p-1.5 rounded text-slate-400 hover:text-white hover:bg-slate-800"
              title="Copy cURL"
            >
              {copiedKey === 'curl' ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
            </button>
          </div>
          <p className="text-xs text-slate-400">
            Send an instant test inquiry from your terminal:
          </p>
          <pre className="p-3 rounded-xl bg-slate-950 border border-slate-800 text-[11px] font-mono text-amber-300 overflow-x-auto leading-relaxed">
            {curlExample}
          </pre>
        </div>

        {/* POST JSON Example */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-xl space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Zap className="w-4 h-4 text-cyan-400" />
              <h4 className="text-xs font-bold text-slate-200 uppercase tracking-wider">
                POST JSON Support
              </h4>
            </div>
            <button
              onClick={() => copyToClipboard(postExample, 'post')}
              className="p-1.5 rounded text-slate-400 hover:text-white hover:bg-slate-800"
              title="Copy Fetch"
            >
              {copiedKey === 'post' ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
            </button>
          </div>
          <p className="text-xs text-slate-400">
            If you prefer standard POST requests, send JSON to <code className="font-mono text-cyan-300">/inquiry</code>:
          </p>
          <pre className="p-3 rounded-xl bg-slate-950 border border-slate-800 text-[11px] font-mono text-cyan-300 overflow-x-auto leading-relaxed">
            {postExample}
          </pre>
        </div>

      </div>

      {/* Ingestion Specs Reference */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-xl">
        <h3 className="text-sm font-bold text-white mb-3 flex items-center gap-2">
          <ShieldCheck className="w-4 h-4 text-emerald-400" /> API Field Compatibility Matrix
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3 text-xs">
          <div className="p-3 rounded-xl bg-slate-950 border border-slate-800">
            <div className="font-mono font-bold text-indigo-300 mb-1">name / modal-name</div>
            <div className="text-slate-400">Lead's full or visitor name</div>
          </div>
          <div className="p-3 rounded-xl bg-slate-950 border border-slate-800">
            <div className="font-mono font-bold text-rose-300 mb-1">email / modal-email</div>
            <div className="text-slate-400">Required. Validated for presence.</div>
          </div>
          <div className="p-3 rounded-xl bg-slate-950 border border-slate-800">
            <div className="font-mono font-bold text-purple-300 mb-1">interest / modal-interest</div>
            <div className="text-slate-400">Topic, tour preference, or service</div>
          </div>
          <div className="p-3 rounded-xl bg-slate-950 border border-slate-800">
            <div className="font-mono font-bold text-emerald-300 mb-1">source</div>
            <div className="text-slate-400">e.g. 'book-a-visit-form' or 'contact-inquiry-form'</div>
          </div>
        </div>
      </div>

    </div>
  );
};
