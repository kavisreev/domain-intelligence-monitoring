import React, { useState } from 'react';
import { 
  Stethoscope, 
  RefreshCw, 
  CheckCircle2, 
  XCircle, 
  AlertTriangle, 
  Globe, 
  Server, 
  ShieldCheck, 
  ShieldAlert, 
  Clock, 
  Activity,
  Info
} from 'lucide-react';
import { WebsiteCheckResult } from '../types';

interface DiagnosisRecoverySectionProps {
  result: WebsiteCheckResult;
  onRetry: () => Promise<WebsiteCheckResult | null>;
  isChecking: boolean;
}

interface DiagnosisDetail {
  category: 'dns' | 'ssl' | 'timeout' | 'connection' | 'http5xx' | 'http4xx' | 'general';
  detectedIssue: string;
  explanation: string;
  suggestedAction: string;
}

export const DiagnosisRecoverySection: React.FC<DiagnosisRecoverySectionProps> = ({
  result,
  onRetry,
  isChecking,
}) => {
  const [isDiagnosed, setIsDiagnosed] = useState<boolean>(false);
  const [recoveryState, setRecoveryState] = useState<'idle' | 'started' | 'completed'>('idle');
  const [recoveryResult, setRecoveryResult] = useState<WebsiteCheckResult | null>(null);

  // Analyze check result to identify root cause
  const analyzeIssue = (data: WebsiteCheckResult): DiagnosisDetail => {
    const errorStr = (data.error || '').toLowerCase();
    const httpCode = data.httpStatusCode;
    const dnsStatus = data.dns?.dnsStatus;
    const sslStatus = data.ssl?.sslStatus;
    const sslError = (data.ssl?.error || '').toLowerCase();

    // 1. DNS Resolution Failure
    if (dnsStatus === 'FAILED' || errorStr.includes('enotfound') || errorStr.includes('getaddrinfo') || errorStr.includes('dns')) {
      return {
        category: 'dns',
        detectedIssue: 'DNS Resolution Failure (NXDOMAIN / Nameserver Unreachable)',
        explanation: 'The domain name could not be resolved to an IP address by recursive DNS servers. The domain may be unregistered, expired, or have misconfigured authoritative nameserver records.',
        suggestedAction: 'Verify domain spelling, confirm registrar registration is active, inspect authoritative NS and A/AAAA records in your DNS zone, and check for propagation delays.',
      };
    }

    // 2. SSL/TLS Issue
    if (sslStatus === 'EXPIRED' || sslStatus === 'INVALID' || sslError || errorStr.includes('cert_') || errorStr.includes('tls') || errorStr.includes('ssl')) {
      return {
        category: 'ssl',
        detectedIssue: `SSL/TLS Handshake Failure (${sslStatus === 'EXPIRED' ? 'Certificate Expired' : 'Untrusted / Invalid Certificate'})`,
        explanation: 'The secure TLS handshake could not be established. The target server presented an expired, self-signed, or untrusted certificate chain, or rejected the TLS cipher suite.',
        suggestedAction: 'Renew or re-issue the SSL/TLS certificate via a trusted Certificate Authority (e.g. Let\'s Encrypt, DigiCert), install full intermediate CA chains, and ensure the server name (SNI) matches the domain.',
      };
    }

    // 3. Timeout
    if (httpCode === 408 || errorStr.includes('timeout') || errorStr.includes('timed out') || errorStr.includes('etimedout')) {
      return {
        category: 'timeout',
        detectedIssue: 'Connection Request Timeout (Gateway / Host Latency)',
        explanation: 'The server did not respond to the HTTP/HTTPS request within the diagnostic timeout limit (7-8 seconds). The remote host may be under heavy load, dropping packets, or experiencing routing blackholes.',
        suggestedAction: 'Check remote server resource utilization (CPU, memory, database connection pool), inspect firewall or DDoS mitigation rate-limiting thresholds, and test network hop latency via traceroute.',
      };
    }

    // 4. Connection Failure / Refused
    if (errorStr.includes('econnrefused') || errorStr.includes('connection refused') || errorStr.includes('econnreset') || (!httpCode && data.status === 'DOWN')) {
      return {
        category: 'connection',
        detectedIssue: 'TCP Connection Refused / Port Closed',
        explanation: 'The server IP was resolved successfully, but the host rejected the connection on HTTP port 80 or HTTPS port 443. The web server daemon may be stopped or blocked by host-level firewall policies.',
        suggestedAction: 'Verify that the web daemon (e.g., Nginx, Apache, Caddy, Node.js) is running and bound to 0.0.0.0, check cloud security groups (AWS SG / GCP Firewall), and review iptables/ufw rules.',
      };
    }

    // 5. HTTP 5xx Server Error
    if (httpCode && httpCode >= 500 && httpCode < 600) {
      return {
        category: 'http5xx',
        detectedIssue: `HTTP ${httpCode} Internal Server Error (${data.httpStatusText || 'Server Fault'})`,
        explanation: `The server received the request but crashed or failed to generate a valid response (HTTP ${httpCode}). This typically indicates an unhandled application exception, database outage, or reverse proxy upstream crash.`,
        suggestedAction: 'Inspect web application error logs, restart application worker processes, verify database/backend service health, and check reverse proxy proxy_pass configurations.',
      };
    }

    // 6. HTTP 4xx Error
    if (httpCode && httpCode >= 400 && httpCode < 500) {
      return {
        category: 'http4xx',
        detectedIssue: `HTTP ${httpCode} Client/Access Error (${data.httpStatusText || 'Access Denied'})`,
        explanation: `The server responded with an HTTP ${httpCode} error status, indicating access was rejected due to missing permissions, authentication requirements, or a non-existent endpoint.`,
        suggestedAction: 'Check URL path and routing rules, verify web server directory permissions and index files, and review any WAF or IP access control rules blocking public requests.',
      };
    }

    // 7. General fallback
    return {
      category: 'general',
      detectedIssue: 'Website Service Disruption',
      explanation: 'The website is currently unreachable or experiencing connection failures according to network health checks.',
      suggestedAction: 'Re-test connection reachability, inspect hosting provider status pages, and examine server operational health.',
    };
  };

  const currentActiveData = recoveryResult || result;
  const diagnosis = analyzeIssue(result);

  const handleDiagnose = () => {
    setIsDiagnosed(true);
    setRecoveryState('idle');
  };

  const handleTryRecovery = async () => {
    // 1. Immediately indicate that recovery check has started
    setRecoveryState('started');
    const startTime = Date.now();

    try {
      // 2. Perform retry (health check, DNS, SSL, response time)
      const freshResult = await onRetry();
      
      // Ensure visible feedback duration (minimum 600ms) so user can see progress
      const elapsed = Date.now() - startTime;
      if (elapsed < 600) {
        await new Promise((resolve) => setTimeout(resolve, 600 - elapsed));
      }

      const outcome = freshResult || result;
      setRecoveryResult(outcome);
      setRecoveryState('completed');
    } catch {
      setRecoveryResult(result);
      setRecoveryState('completed');
    }
  };

  return (
    <section 
      id="intelligent-issue-diagnosis-section"
      className="bg-white rounded-xl border border-rose-200 shadow-sm p-5 sm:p-6 transition-all"
    >
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-100">
        <div className="flex items-center gap-2.5">
          <div className="p-2 rounded-lg bg-rose-50 text-rose-600 border border-rose-100">
            <Stethoscope className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-base sm:text-lg font-bold text-slate-900 flex items-center gap-2">
              Intelligent Issue Diagnosis &amp; Recovery
            </h2>
            <p className="text-xs text-slate-500">
              Automated root-cause analysis, DNS/TLS diagnostic re-checks, and recovery verification
            </p>
          </div>
        </div>

        {/* Diagnosis trigger button if not yet diagnosed */}
        {!isDiagnosed && (
          <button
            id="diagnose-issue-btn"
            type="button"
            onClick={handleDiagnose}
            className="flex items-center gap-2 px-4 py-2 bg-rose-600 hover:bg-rose-700 active:bg-rose-800 text-white text-xs font-bold rounded-lg shadow-sm transition-colors cursor-pointer self-start sm:self-auto"
          >
            <Stethoscope className="w-4 h-4" />
            <span>Diagnose Issue</span>
          </button>
        )}
      </div>

      {/* Initial state before diagnosis */}
      {!isDiagnosed && (
        <div className="mt-4 p-4 rounded-lg bg-slate-50 border border-slate-200/70 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-2.5 text-slate-600">
            <AlertTriangle className="w-4.5 h-4.5 text-rose-500 shrink-0" />
            <span>
              Target host <strong className="text-slate-900 font-mono">{result.domain}</strong> is reporting a failure. Click <strong>Diagnose Issue</strong> to inspect possible causes.
            </span>
          </div>
        </div>
      )}

      {/* Diagnosed Details Display */}
      {isDiagnosed && (
        <div className="mt-4 space-y-4 animate-fade-in">
          {/* Issue breakdown cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Detected Issue */}
            <div className="bg-slate-50/90 rounded-lg p-4 border border-slate-200/70">
              <span className="text-[11px] font-bold text-rose-600 uppercase tracking-wider block mb-1">
                Detected Issue
              </span>
              <p className="text-sm font-bold text-slate-900">
                {diagnosis.detectedIssue}
              </p>
            </div>

            {/* Short Explanation */}
            <div className="bg-slate-50/90 rounded-lg p-4 border border-slate-200/70 md:col-span-2">
              <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block mb-1">
                Diagnostic Explanation
              </span>
              <p className="text-xs text-slate-700 leading-relaxed">
                {diagnosis.explanation}
              </p>
            </div>
          </div>

          {/* Suggested Recovery Action */}
          <div className="bg-blue-50/70 rounded-lg p-4 border border-blue-200/70">
            <span className="text-[11px] font-bold text-blue-700 uppercase tracking-wider block mb-1">
              Suggested Recovery Action
            </span>
            <p className="text-xs text-slate-800 leading-relaxed font-medium">
              {diagnosis.suggestedAction}
            </p>
          </div>

          {/* 1. VISIBLE LOADING STATE WHEN RECOVERY STARTS */}
          {recoveryState === 'started' && (
            <div 
              id="recovery-started-indicator"
              className="p-4 rounded-xl bg-blue-50 border border-blue-200 text-blue-900 space-y-3 animate-fade-in"
            >
              <div className="flex items-center gap-2.5 font-bold text-sm text-blue-900">
                <RefreshCw className="w-4.5 h-4.5 text-blue-600 animate-spin shrink-0" />
                <span>Recovery check started...</span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-xs pt-1">
                <div className="flex items-center gap-2 bg-white/80 px-3 py-2 rounded-lg border border-blue-100 text-slate-700">
                  <Activity className="w-3.5 h-3.5 text-blue-600 animate-pulse shrink-0" />
                  <span>Retrying website health check...</span>
                </div>
                <div className="flex items-center gap-2 bg-white/80 px-3 py-2 rounded-lg border border-blue-100 text-slate-700">
                  <Globe className="w-3.5 h-3.5 text-blue-600 animate-pulse shrink-0" />
                  <span>Re-checking DNS resolution...</span>
                </div>
                <div className="flex items-center gap-2 bg-white/80 px-3 py-2 rounded-lg border border-blue-100 text-slate-700">
                  <ShieldCheck className="w-3.5 h-3.5 text-blue-600 animate-pulse shrink-0" />
                  <span>Re-checking SSL when applicable...</span>
                </div>
              </div>
            </div>
          )}

          {/* 2. VISIBLE RESULT DISPLAY AFTER CHECKING */}
          {recoveryState === 'completed' && currentActiveData && (
            <div className="space-y-3 animate-fade-in">
              {/* Primary Status Banner */}
              {currentActiveData.status === 'UP' ? (
                <div 
                  id="recovery-result-up-banner"
                  className="p-4 rounded-xl bg-emerald-50 border border-emerald-300 text-emerald-900 shadow-sm flex items-center gap-3 font-bold text-sm sm:text-base"
                >
                  <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
                  <span>Website recovered successfully — Website is UP.</span>
                </div>
              ) : (
                <div 
                  id="recovery-result-down-banner"
                  className="p-4 rounded-xl bg-rose-50 border border-rose-300 text-rose-900 shadow-sm flex items-center gap-3 font-bold text-sm sm:text-base"
                >
                  <XCircle className="w-5 h-5 text-rose-600 shrink-0" />
                  <span>Recovery unsuccessful — Website is still DOWN.</span>
                </div>
              )}

              {/* Detailed Recovery Telemetry Grid */}
              <div 
                id="recovery-telemetry-grid"
                className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2.5 pt-1"
              >
                {/* Website Status */}
                <div className="bg-slate-50 rounded-lg p-3 border border-slate-200">
                  <div className="flex items-center gap-1.5 text-slate-500 text-[11px] font-semibold mb-1">
                    <Globe className="w-3.5 h-3.5 text-slate-400" />
                    <span>Website Status</span>
                  </div>
                  <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-bold ${
                    currentActiveData.status === 'UP' 
                      ? 'bg-emerald-100 text-emerald-800' 
                      : 'bg-rose-100 text-rose-800'
                  }`}>
                    {currentActiveData.status}
                  </span>
                </div>

                {/* HTTP Status / Error */}
                <div className="bg-slate-50 rounded-lg p-3 border border-slate-200">
                  <div className="flex items-center gap-1.5 text-slate-500 text-[11px] font-semibold mb-1">
                    <Server className="w-3.5 h-3.5 text-slate-400" />
                    <span>HTTP Status / Error</span>
                  </div>
                  <div className="text-xs font-bold text-slate-900 truncate" title={currentActiveData.httpStatusText || currentActiveData.error || 'N/A'}>
                    {currentActiveData.httpStatusCode 
                      ? `${currentActiveData.httpStatusCode} ${currentActiveData.httpStatusText}`
                      : (currentActiveData.httpStatusText || currentActiveData.error || 'Error')}
                  </div>
                </div>

                {/* DNS Result */}
                <div className="bg-slate-50 rounded-lg p-3 border border-slate-200">
                  <div className="flex items-center gap-1.5 text-slate-500 text-[11px] font-semibold mb-1">
                    <Globe className="w-3.5 h-3.5 text-slate-400" />
                    <span>DNS Result</span>
                  </div>
                  <div className="text-xs font-bold text-slate-900 truncate" title={currentActiveData.dns.ipAddress}>
                    {currentActiveData.dns.dnsStatus === 'RESOLVED' 
                      ? `Resolved (${currentActiveData.dns.ipAddress})` 
                      : `Failed (${currentActiveData.dns.dnsStatus})`}
                  </div>
                </div>

                {/* SSL Result */}
                <div className="bg-slate-50 rounded-lg p-3 border border-slate-200">
                  <div className="flex items-center gap-1.5 text-slate-500 text-[11px] font-semibold mb-1">
                    <ShieldCheck className="w-3.5 h-3.5 text-slate-400" />
                    <span>SSL Result</span>
                  </div>
                  <div className="text-xs font-bold text-slate-900 truncate" title={currentActiveData.ssl.sslStatus}>
                    {currentActiveData.ssl.sslStatus === 'VALID'
                      ? `Valid (${currentActiveData.ssl.daysRemaining ?? 'OK'} days left)`
                      : (currentActiveData.ssl.sslStatus || 'Not applicable')}
                  </div>
                </div>

                {/* Response Time */}
                <div className="bg-slate-50 rounded-lg p-3 border border-slate-200 col-span-2 sm:col-span-1">
                  <div className="flex items-center gap-1.5 text-slate-500 text-[11px] font-semibold mb-1">
                    <Clock className="w-3.5 h-3.5 text-slate-400" />
                    <span>Response Time</span>
                  </div>
                  <div className="text-xs font-bold text-slate-900">
                    {currentActiveData.responseTimeMs > 0 ? `${currentActiveData.responseTimeMs} ms` : 'N/A'}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Action Footer with Try Recovery Button & Disclaimer */}
          <div className="pt-3 border-t border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <p className="text-[11px] text-slate-500 flex items-center gap-1.5">
              <Info className="w-3.5 h-3.5 text-slate-400 shrink-0" />
              <span>
                Diagnostic analysis only. Retries connectivity and re-checks DNS/SSL without claiming external server repair.
              </span>
            </p>

            <button
              id="try-recovery-btn"
              type="button"
              onClick={handleTryRecovery}
              disabled={isChecking || recoveryState === 'started'}
              className="flex items-center justify-center gap-2 px-5 py-2.5 bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white text-xs font-bold rounded-lg shadow-sm transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isChecking || recoveryState === 'started' ? 'animate-spin' : ''}`} />
              <span>{recoveryState === 'started' ? 'Checking Recovery...' : 'Try Recovery'}</span>
            </button>
          </div>
        </div>
      )}
    </section>
  );
};
