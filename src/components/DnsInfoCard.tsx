import React, { useState } from 'react';
import { Server, Copy, Check, Radio, Network, Clock, Shield } from 'lucide-react';
import { DnsInfo } from '../types';

interface DnsInfoCardProps {
  dns: DnsInfo;
  domain: string;
}

export const DnsInfoCard: React.FC<DnsInfoCardProps> = ({ dns, domain }) => {
  const [copied, setCopied] = useState(false);

  const handleCopyIp = () => {
    if (dns.ipAddress && dns.ipAddress !== 'Lookup failed') {
      navigator.clipboard.writeText(dns.ipAddress);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const isResolved = dns.dnsStatus === 'RESOLVED';

  return (
    <div id="dns-info-card" className="bg-white rounded-xl border border-slate-200/90 shadow-sm p-5 sm:p-6">
      <div className="flex items-center justify-between pb-4 border-b border-slate-100">
        <div className="flex items-center gap-2.5">
          <div className="p-2 rounded-lg bg-teal-50 text-teal-600 border border-teal-100">
            <Server className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-base sm:text-lg font-bold text-slate-900">DNS Information</h2>
            <p className="text-xs text-slate-500">Domain Name System lookup & resolution diagnostics</p>
          </div>
        </div>

        <span
          className={`px-2.5 py-1 rounded-full text-xs font-bold border ${
            isResolved
              ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
              : 'bg-rose-50 text-rose-700 border-rose-200'
          }`}
        >
          {dns.dnsStatus}
        </span>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
        {/* Domain Name */}
        <div className="bg-slate-50/80 rounded-lg p-3.5 border border-slate-200/60">
          <span className="text-xs font-semibold text-slate-500 uppercase tracking-wide flex items-center gap-1.5">
            <Radio className="w-3.5 h-3.5 text-slate-400" />
            Target Domain
          </span>
          <p className="text-sm font-mono font-bold text-slate-900 mt-1 truncate" title={domain}>
            {domain}
          </p>
        </div>

        {/* Primary IP Address */}
        <div className="bg-slate-50/80 rounded-lg p-3.5 border border-slate-200/60 flex items-center justify-between">
          <div>
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wide flex items-center gap-1.5">
              <Network className="w-3.5 h-3.5 text-slate-400" />
              Resolved IP Address
            </span>
            <p className="text-sm font-mono font-bold text-blue-700 mt-1 truncate" title={dns.ipAddress}>
              {dns.ipAddress}
            </p>
          </div>
          {isResolved && (
            <button
              type="button"
              onClick={handleCopyIp}
              title="Copy IP Address"
              className="p-1.5 text-slate-500 hover:text-slate-800 hover:bg-slate-200 rounded-md transition-colors"
            >
              {copied ? <Check className="w-4 h-4 text-emerald-600" /> : <Copy className="w-4 h-4" />}
            </button>
          )}
        </div>

        {/* Resolution Time */}
        <div className="bg-slate-50/80 rounded-lg p-3.5 border border-slate-200/60">
          <span className="text-xs font-semibold text-slate-500 uppercase tracking-wide flex items-center gap-1.5">
            <Clock className="w-3.5 h-3.5 text-slate-400" />
            Lookup Resolution Time
          </span>
          <p className="text-sm font-mono font-bold text-slate-900 mt-1">
            {dns.resolutionTimeMs} <span className="text-xs font-normal text-slate-500">milliseconds</span>
          </p>
        </div>

        {/* Resolved Records Count */}
        <div className="bg-slate-50/80 rounded-lg p-3.5 border border-slate-200/60">
          <span className="text-xs font-semibold text-slate-500 uppercase tracking-wide flex items-center gap-1.5">
            <Shield className="w-3.5 h-3.5 text-slate-400" />
            Active Records
          </span>
          <p className="text-sm font-semibold text-slate-800 mt-1">
            {dns.records.length > 0 ? (
              <span>
                {dns.records.length} record(s) resolved (IPv{dns.records[0].family})
              </span>
            ) : (
              <span className="text-rose-600 font-medium">None / Unresolved</span>
            )}
          </p>
        </div>
      </div>

      {/* Additional IP Records list if multiple */}
      {dns.records && dns.records.length > 1 && (
        <div className="mt-4 pt-3 border-t border-slate-100">
          <span className="text-xs font-semibold text-slate-500">All Discovered A / AAAA Records:</span>
          <div className="flex flex-wrap gap-2 mt-2">
            {dns.records.map((rec, idx) => (
              <span
                key={idx}
                className="text-xs font-mono bg-slate-100 text-slate-700 px-2.5 py-1 rounded border border-slate-200 flex items-center gap-1"
              >
                <span className="text-[10px] font-bold text-slate-500">IPv{rec.family}:</span>
                {rec.address}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Error display if any */}
      {dns.error && (
        <div className="mt-4 p-3 rounded-lg bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-center gap-2">
          <span className="font-bold">DNS Error:</span>
          <span>{dns.error}</span>
        </div>
      )}
    </div>
  );
};
