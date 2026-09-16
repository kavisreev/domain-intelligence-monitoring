import React from 'react';
import { Globe, Server, ShieldCheck, Zap, ArrowRight, CheckCircle2 } from 'lucide-react';

interface EmptyStateProps {
  onSelectSample: (url: string) => void;
}

export const EmptyState: React.FC<EmptyStateProps> = ({ onSelectSample }) => {
  return (
    <div id="empty-state-view" className="bg-white rounded-xl border border-slate-200/90 shadow-sm p-6 sm:p-10 text-center">
      <div className="max-w-2xl mx-auto">
        <div className="w-16 h-16 rounded-2xl bg-blue-50 border border-blue-100 flex items-center justify-center mx-auto text-blue-600 mb-4 shadow-inner">
          <Globe className="w-8 h-8 animate-pulse" />
        </div>

        <h3 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">
          Ready to Monitor Any Website or Domain
        </h3>
        <p className="text-sm text-slate-600 mt-2 leading-relaxed">
          Enter any website address in the input above and click <span className="font-semibold text-blue-600">CHECK WEBSITE</span> to execute real-time server-side DNS resolution, X.509 SSL certificate inspection, and HTTP round-trip latency timing.
        </p>

        {/* Feature highlight grid */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5 text-left mt-8">
          <div className="p-4 rounded-lg bg-slate-50 border border-slate-200/60">
            <div className="w-8 h-8 rounded-md bg-emerald-100 text-emerald-700 flex items-center justify-center mb-2 font-bold">
              <Zap className="w-4 h-4" />
            </div>
            <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider">Health & Latency</h4>
            <p className="text-xs text-slate-500 mt-1">
              Checks live HTTP/HTTPS status, response codes (200, 301, 500), and precise millisecond round-trip times.
            </p>
          </div>

          <div className="p-4 rounded-lg bg-slate-50 border border-slate-200/60">
            <div className="w-8 h-8 rounded-md bg-teal-100 text-teal-700 flex items-center justify-center mb-2 font-bold">
              <Server className="w-4 h-4" />
            </div>
            <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider">Authoritative DNS</h4>
            <p className="text-xs text-slate-500 mt-1">
              Performs real-time recursive DNS resolution, mapping IPv4 & IPv6 records and evaluating lookup speed.
            </p>
          </div>

          <div className="p-4 rounded-lg bg-slate-50 border border-slate-200/60">
            <div className="w-8 h-8 rounded-md bg-blue-100 text-blue-700 flex items-center justify-center mb-2 font-bold">
              <ShieldCheck className="w-4 h-4" />
            </div>
            <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider">SSL / TLS Lifecycle</h4>
            <p className="text-xs text-slate-500 mt-1">
              Validates certificate expiration, remaining days, issuing CA, cipher suites, and flags &le; 30-day renewals.
            </p>
          </div>
        </div>

        {/* Instant test launcher */}
        <div className="mt-8 pt-6 border-t border-slate-100">
          <p className="text-xs font-semibold text-slate-500 mb-3">
            Or test right now with one of these real-world targets:
          </p>
          <div className="flex flex-wrap items-center justify-center gap-2.5">
            <button
              type="button"
              onClick={() => onSelectSample('github.com')}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-slate-100 hover:bg-blue-50 hover:text-blue-700 text-slate-800 text-xs font-semibold border border-slate-200 transition-colors cursor-pointer"
            >
              <span>Test github.com (Fast & Valid SSL)</span>
              <ArrowRight className="w-3 h-3" />
            </button>
            <button
              type="button"
              onClick={() => onSelectSample('cloudflare.com')}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-slate-100 hover:bg-blue-50 hover:text-blue-700 text-slate-800 text-xs font-semibold border border-slate-200 transition-colors cursor-pointer"
            >
              <span>Test cloudflare.com (Edge Anycast)</span>
              <ArrowRight className="w-3 h-3" />
            </button>
            <button
              type="button"
              onClick={() => onSelectSample('expired.badssl.com')}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-rose-50 hover:bg-rose-100 text-rose-800 text-xs font-semibold border border-rose-200 transition-colors cursor-pointer"
            >
              <span>Test expired.badssl.com (SSL Alert Demo)</span>
              <ArrowRight className="w-3 h-3" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
