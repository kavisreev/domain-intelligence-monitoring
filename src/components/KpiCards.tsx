import React from 'react';
import { 
  Activity, 
  Zap, 
  Percent, 
  Server, 
  ShieldCheck, 
  ShieldAlert, 
  ShieldX, 
  CheckCircle2, 
  XCircle, 
  AlertTriangle 
} from 'lucide-react';
import { WebsiteCheckResult } from '../types';

interface KpiCardsProps {
  data: WebsiteCheckResult;
  uptimePercentage: number;
  totalChecks: number;
  successfulChecks: number;
}

export const KpiCards: React.FC<KpiCardsProps> = ({
  data,
  uptimePercentage,
  totalChecks,
  successfulChecks,
}) => {
  const isUp = data.status === 'UP';
  const isDnsResolved = data.dns.dnsStatus === 'RESOLVED';
  
  // SSL status logic
  const isSslValid = data.ssl.sslStatus === 'VALID';
  const isSslExpiringSoon = data.ssl.sslStatus === 'EXPIRING_SOON';
  const isSslExpired = data.ssl.sslStatus === 'EXPIRED';
  const isSslInvalid = data.ssl.sslStatus === 'INVALID';
  const isSslNA = data.ssl.sslStatus === 'NOT_APPLICABLE';

  // Response time grading
  const getResponseTimeGrade = (ms: number) => {
    if (ms <= 150) return { label: 'Optimal Speed', color: 'text-emerald-700 bg-emerald-50 border-emerald-200' };
    if (ms <= 400) return { label: 'Moderate Latency', color: 'text-blue-700 bg-blue-50 border-blue-200' };
    if (ms <= 900) return { label: 'Elevated Latency', color: 'text-amber-700 bg-amber-50 border-amber-200' };
    return { label: 'High Latency / Slow', color: 'text-rose-700 bg-rose-50 border-rose-200' };
  };

  const speedGrade = getResponseTimeGrade(data.responseTimeMs);

  return (
    <section id="kpi-cards-grid" className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
      {/* 1. Website Status Card */}
      <div 
        id="card-website-status"
        className="bg-white rounded-xl border border-slate-200/90 shadow-sm p-4 sm:p-5 flex flex-col justify-between transition-all hover:shadow-md"
      >
        <div className="flex items-center justify-between">
          <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Website Status</span>
          <div className={`p-2 rounded-lg ${isUp ? 'bg-emerald-50 text-emerald-600' : 'bg-rose-50 text-rose-600'}`}>
            <Activity className="w-4 h-4" />
          </div>
        </div>

        <div className="my-3">
          <div className="flex items-center gap-2.5">
            <span className="relative flex h-3.5 w-3.5">
              {isUp && <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>}
              <span className={`relative inline-flex rounded-full h-3.5 w-3.5 ${isUp ? 'bg-emerald-500' : 'bg-rose-500'}`}></span>
            </span>
            <span className={`text-2xl font-extrabold tracking-tight ${isUp ? 'text-emerald-600' : 'text-rose-600'}`}>
              {isUp ? 'UP' : 'DOWN'}
            </span>
          </div>
          <p className="text-xs font-medium text-slate-500 mt-1">
            HTTP Code:{' '}
            <span className="font-mono font-semibold text-slate-700">
              {data.httpStatusCode ? `${data.httpStatusCode} ${data.httpStatusText}` : 'No Response'}
            </span>
          </p>
        </div>

        <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
          <span>Host Health</span>
          <span className={`font-semibold ${isUp ? 'text-emerald-600' : 'text-rose-600'}`}>
            {isUp ? 'Operational' : 'Service Disruption'}
          </span>
        </div>
      </div>

      {/* 2. Response Time Card */}
      <div 
        id="card-response-time"
        className="bg-white rounded-xl border border-slate-200/90 shadow-sm p-4 sm:p-5 flex flex-col justify-between transition-all hover:shadow-md"
      >
        <div className="flex items-center justify-between">
          <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Response Time</span>
          <div className="p-2 rounded-lg bg-blue-50 text-blue-600">
            <Zap className="w-4 h-4" />
          </div>
        </div>

        <div className="my-3">
          <div className="flex items-baseline gap-1">
            <span className="text-2xl font-extrabold font-mono text-slate-900">
              {data.responseTimeMs}
            </span>
            <span className="text-sm font-semibold text-slate-500">ms</span>
          </div>
          <span className={`inline-block text-[11px] font-semibold px-2 py-0.5 rounded border mt-1.5 ${speedGrade.color}`}>
            {speedGrade.label}
          </span>
        </div>

        <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
          <span>Round-trip latency</span>
          <span className="font-medium text-slate-700">TCP + TLS + HTTP</span>
        </div>
      </div>

      {/* 3. Uptime Card */}
      <div 
        id="card-uptime"
        className="bg-white rounded-xl border border-slate-200/90 shadow-sm p-4 sm:p-5 flex flex-col justify-between transition-all hover:shadow-md"
      >
        <div className="flex items-center justify-between">
          <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Uptime</span>
          <div className="p-2 rounded-lg bg-indigo-50 text-indigo-600">
            <Percent className="w-4 h-4" />
          </div>
        </div>

        <div className="my-3">
          <div className="flex items-baseline gap-1">
            <span className="text-2xl font-extrabold font-mono text-slate-900">
              {uptimePercentage.toFixed(1)}%
            </span>
          </div>
          <p className="text-xs font-medium text-slate-500 mt-1">
            <span className="font-semibold text-emerald-600">{successfulChecks}</span> of{' '}
            <span className="font-semibold text-slate-700">{totalChecks}</span> checks UP
          </p>
        </div>

        <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
          <span>Current Session</span>
          <span className="font-semibold text-indigo-600">
            {uptimePercentage >= 99 ? 'High Availability' : uptimePercentage >= 80 ? 'Degraded' : 'Critical'}
          </span>
        </div>
      </div>

      {/* 4. DNS Status Card */}
      <div 
        id="card-dns-status"
        className="bg-white rounded-xl border border-slate-200/90 shadow-sm p-4 sm:p-5 flex flex-col justify-between transition-all hover:shadow-md"
      >
        <div className="flex items-center justify-between">
          <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">DNS Status</span>
          <div className={`p-2 rounded-lg ${isDnsResolved ? 'bg-teal-50 text-teal-600' : 'bg-rose-50 text-rose-600'}`}>
            <Server className="w-4 h-4" />
          </div>
        </div>

        <div className="my-3">
          <div className="flex items-center gap-1.5">
            {isDnsResolved ? (
              <CheckCircle2 className="w-5 h-5 text-emerald-500 shrink-0" />
            ) : (
              <XCircle className="w-5 h-5 text-rose-500 shrink-0" />
            )}
            <span className={`text-xl font-bold ${isDnsResolved ? 'text-slate-900' : 'text-rose-600'}`}>
              {isDnsResolved ? 'Resolved' : 'Failed'}
            </span>
          </div>
          <p className="text-xs font-mono text-slate-600 truncate mt-1" title={data.dns.ipAddress}>
            {data.dns.ipAddress}
          </p>
        </div>

        <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
          <span>Lookup Latency</span>
          <span className="font-mono font-medium text-slate-700">{data.dns.resolutionTimeMs} ms</span>
        </div>
      </div>

      {/* 5. SSL Status Card */}
      <div 
        id="card-ssl-status"
        className="bg-white rounded-xl border border-slate-200/90 shadow-sm p-4 sm:p-5 flex flex-col justify-between transition-all hover:shadow-md"
      >
        <div className="flex items-center justify-between">
          <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">SSL Status</span>
          <div className={`p-2 rounded-lg ${
            isSslValid
              ? 'bg-emerald-50 text-emerald-600'
              : isSslExpiringSoon
              ? 'bg-amber-50 text-amber-600'
              : 'bg-rose-50 text-rose-600'
          }`}>
            {isSslValid ? (
              <ShieldCheck className="w-4 h-4" />
            ) : isSslExpiringSoon ? (
              <ShieldAlert className="w-4 h-4" />
            ) : (
              <ShieldX className="w-4 h-4" />
            )}
          </div>
        </div>

        <div className="my-3">
          <div className="flex items-center gap-1.5">
            {isSslValid && <CheckCircle2 className="w-5 h-5 text-emerald-500 shrink-0" />}
            {isSslExpiringSoon && <AlertTriangle className="w-5 h-5 text-amber-500 shrink-0" />}
            {(isSslExpired || isSslInvalid) && <XCircle className="w-5 h-5 text-rose-500 shrink-0" />}
            
            <span className={`text-xl font-bold ${
              isSslValid
                ? 'text-emerald-600'
                : isSslExpiringSoon
                ? 'text-amber-600'
                : isSslNA
                ? 'text-slate-500'
                : 'text-rose-600'
            }`}>
              {isSslValid ? 'Valid' : isSslExpiringSoon ? 'Expiring Soon' : isSslNA ? 'No SSL' : 'Invalid'}
            </span>
          </div>

          <p className="text-xs font-medium text-slate-500 mt-1">
            {data.ssl.daysRemaining !== null ? (
              <span>
                <strong className={`font-mono ${data.ssl.daysRemaining <= 30 ? 'text-amber-600' : 'text-slate-700'}`}>
                  {data.ssl.daysRemaining}
                </strong>{' '}
                days remaining
              </span>
            ) : (
              <span>Plain HTTP / No Cert</span>
            )}
          </p>
        </div>

        <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
          <span>X.509 TLS</span>
          <span className="font-semibold text-slate-700 truncate max-w-[120px]" title={data.ssl.protocol || 'None'}>
            {data.ssl.protocol || 'N/A'}
          </span>
        </div>
      </div>
    </section>
  );
};
