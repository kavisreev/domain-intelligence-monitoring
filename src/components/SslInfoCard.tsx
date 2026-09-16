import React from 'react';
import { 
  ShieldCheck, 
  ShieldAlert, 
  ShieldX, 
  Calendar, 
  Clock, 
  Building2, 
  Lock, 
  KeyRound, 
  AlertTriangle 
} from 'lucide-react';
import { SslInfo } from '../types';

interface SslInfoCardProps {
  ssl: SslInfo;
  domain: string;
}

export const SslInfoCard: React.FC<SslInfoCardProps> = ({ ssl, domain }) => {
  const isExpiringSoon = ssl.isExpiringSoon;
  const isExpired = ssl.sslStatus === 'EXPIRED';
  const isValid = ssl.sslStatus === 'VALID';
  const isNotApplicable = ssl.sslStatus === 'NOT_APPLICABLE';

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return 'N/A';
    try {
      const d = new Date(dateStr);
      return d.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      });
    } catch {
      return dateStr;
    }
  };

  // Remaining days percentage for visual bar (e.g., standard 90-day validity window)
  const remainingPercent = ssl.daysRemaining !== null
    ? Math.max(0, Math.min(100, (ssl.daysRemaining / 90) * 100))
    : 0;

  return (
    <div id="ssl-info-card" className="bg-white rounded-xl border border-slate-200/90 shadow-sm p-5 sm:p-6">
      <div className="flex items-center justify-between pb-4 border-b border-slate-100">
        <div className="flex items-center gap-2.5">
          <div className={`p-2 rounded-lg border ${
            isValid
              ? 'bg-emerald-50 text-emerald-600 border-emerald-100'
              : isExpiringSoon
              ? 'bg-amber-50 text-amber-600 border-amber-100'
              : 'bg-rose-50 text-rose-600 border-rose-100'
          }`}>
            {isValid ? (
              <ShieldCheck className="w-5 h-5" />
            ) : isExpiringSoon ? (
              <ShieldAlert className="w-5 h-5" />
            ) : (
              <ShieldX className="w-5 h-5" />
            )}
          </div>
          <div>
            <h2 className="text-base sm:text-lg font-bold text-slate-900">SSL Certificate Information</h2>
            <p className="text-xs text-slate-500">X.509 cryptographic validation, authority chain & expiry schedule</p>
          </div>
        </div>

        <span
          className={`px-2.5 py-1 rounded-full text-xs font-bold border ${
            isValid
              ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
              : isExpiringSoon
              ? 'bg-amber-50 text-amber-700 border-amber-200'
              : isNotApplicable
              ? 'bg-slate-100 text-slate-700 border-slate-200'
              : 'bg-rose-50 text-rose-700 border-rose-200'
          }`}
        >
          {ssl.sslStatus.replace('_', ' ')}
        </span>
      </div>

      {/* Expiry Warning Banner if <= 30 days */}
      {isExpiringSoon && (
        <div className="mt-4 p-3.5 rounded-lg bg-amber-50 border border-amber-200/90 text-amber-900 flex items-start gap-3">
          <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
          <div>
            <p className="text-xs font-bold text-amber-800">
              Warning: Certificate Expiry Imminent ({ssl.daysRemaining} days remaining)
            </p>
            <p className="text-xs text-amber-700 mt-0.5">
              This certificate will expire in less than 30 days ({formatDate(ssl.expiryDate)}). Renew it promptly to prevent browser security warnings and site downtime.
            </p>
          </div>
        </div>
      )}

      {/* Expired Certificate Banner */}
      {isExpired && (
        <div className="mt-4 p-3.5 rounded-lg bg-rose-50 border border-rose-200/90 text-rose-900 flex items-start gap-3">
          <ShieldX className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
          <div>
            <p className="text-xs font-bold text-rose-800">
              Critical: Certificate Expired
            </p>
            <p className="text-xs text-rose-700 mt-0.5">
              The SSL/TLS certificate expired on {formatDate(ssl.expiryDate)}. Modern browsers will actively block users from visiting this website with a security error.
            </p>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
        {/* Certificate Expiry Date */}
        <div className="bg-slate-50/80 rounded-lg p-3.5 border border-slate-200/60">
          <span className="text-xs font-semibold text-slate-500 uppercase tracking-wide flex items-center gap-1.5">
            <Calendar className="w-3.5 h-3.5 text-slate-400" />
            Certificate Expiry Date
          </span>
          <p className="text-sm font-bold text-slate-900 mt-1">
            {formatDate(ssl.expiryDate)}
          </p>
        </div>

        {/* Remaining Days */}
        <div className="bg-slate-50/80 rounded-lg p-3.5 border border-slate-200/60">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wide flex items-center gap-1.5">
              <Clock className="w-3.5 h-3.5 text-slate-400" />
              Remaining Days
            </span>
            {ssl.daysRemaining !== null && (
              <span className={`text-xs font-mono font-bold ${
                isExpiringSoon ? 'text-amber-600' : isExpired ? 'text-rose-600' : 'text-emerald-600'
              }`}>
                {ssl.daysRemaining} days
              </span>
            )}
          </div>
          
          <p className="text-sm font-extrabold text-slate-900 mt-1 font-mono">
            {ssl.daysRemaining !== null ? `${ssl.daysRemaining} Days` : 'N/A'}
          </p>

          {/* Progress bar visual */}
          {ssl.daysRemaining !== null && (
            <div className="w-full bg-slate-200 rounded-full h-1.5 mt-2 overflow-hidden">
              <div
                className={`h-1.5 rounded-full transition-all duration-300 ${
                  isExpired ? 'bg-rose-500 w-full' : isExpiringSoon ? 'bg-amber-500' : 'bg-emerald-500'
                }`}
                style={{ width: `${isExpired ? 100 : remainingPercent}%` }}
              />
            </div>
          )}
        </div>

        {/* Certificate Authority / Issuer */}
        <div className="bg-slate-50/80 rounded-lg p-3.5 border border-slate-200/60">
          <span className="text-xs font-semibold text-slate-500 uppercase tracking-wide flex items-center gap-1.5">
            <Building2 className="w-3.5 h-3.5 text-slate-400" />
            Issuing Certificate Authority (CA)
          </span>
          <p className="text-sm font-semibold text-slate-900 mt-1 truncate" title={ssl.issuer || 'Unknown'}>
            {ssl.issuer || 'Unknown or Self-signed'}
          </p>
        </div>

        {/* TLS Protocol & Cipher */}
        <div className="bg-slate-50/80 rounded-lg p-3.5 border border-slate-200/60">
          <span className="text-xs font-semibold text-slate-500 uppercase tracking-wide flex items-center gap-1.5">
            <Lock className="w-3.5 h-3.5 text-slate-400" />
            Negotiated Protocol & Cipher
          </span>
          <div className="flex items-center gap-2 mt-1">
            <span className="text-xs font-mono font-bold bg-blue-50 text-blue-700 px-2 py-0.5 rounded border border-blue-200">
              {ssl.protocol || 'None'}
            </span>
            <span className="text-xs font-mono text-slate-600 truncate" title={ssl.cipher || 'None'}>
              {ssl.cipher || 'N/A'}
            </span>
          </div>
        </div>
      </div>

      {/* SSL Handshake / Validation Error if any */}
      {ssl.error && !isValid && (
        <div className="mt-4 p-3 rounded-lg bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-center gap-2">
          <span className="font-bold">TLS Notice:</span>
          <span>{ssl.error}</span>
        </div>
      )}
    </div>
  );
};
