import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Header } from './components/Header';
import { UrlInputBar } from './components/UrlInputBar';
import { KpiCards } from './components/KpiCards';
import { DnsInfoCard } from './components/DnsInfoCard';
import { SslInfoCard } from './components/SslInfoCard';
import { ResponseTimeChart } from './components/ResponseTimeChart';
import { MonitoringHistoryTable } from './components/MonitoringHistoryTable';
import { EmptyState } from './components/EmptyState';
import { DiagnosisRecoverySection } from './components/DiagnosisRecoverySection';
import { WebsiteCheckResult, MonitoringHistoryItem, ResponseTimeDataPoint } from './types';
import { AlertCircle, X, RefreshCw, Radio, CheckCircle, CheckCircle2, ShieldAlert } from 'lucide-react';

export default function App() {
  const [url, setUrl] = useState<string>('');
  const [currentResult, setCurrentResult] = useState<WebsiteCheckResult | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [recoveryNotification, setRecoveryNotification] = useState<'recovered' | 'still_down' | null>(null);
  const [showDiagnosisSection, setShowDiagnosisSection] = useState<boolean>(false);

  // Near Real-Time Monitoring state (10s interval)
  const [isRealTimeActive, setIsRealTimeActive] = useState<boolean>(false);
  const [countdown, setCountdown] = useState<number>(10);

  // Historical telemetry
  const [history, setHistory] = useState<MonitoringHistoryItem[]>(() => {
    try {
      const saved = localStorage.getItem('domain_intel_monitoring_history');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  const [responseTimeDataPoints, setResponseTimeDataPoints] = useState<ResponseTimeDataPoint[]>([]);

  // Keep ref for current url and auto-monitor state
  const urlRef = useRef(url);
  urlRef.current = url;
  const isRealTimeActiveRef = useRef(isRealTimeActive);
  isRealTimeActiveRef.current = isRealTimeActive;

  // Persist history to localStorage
  useEffect(() => {
    try {
      localStorage.setItem('domain_intel_monitoring_history', JSON.stringify(history));
    } catch {
      // ignore storage quota errors
    }
  }, [history]);

  // Execute Website Check via server-side API
  const performCheck = useCallback(async (targetUrl?: string, isRecovery: boolean = false) => {
    const queryUrl = (targetUrl || urlRef.current).trim();
    if (!queryUrl) {
      setErrorMessage('Please enter a website URL to check.');
      return;
    }

    if (!isRecovery) {
      setRecoveryNotification(null);
    }

    setIsLoading(true);
    setErrorMessage(null);

    try {
      let response = await fetch('/api/check-website', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ url: queryUrl }),
      });

      // If POST method is not allowed (e.g. some Vercel edge/proxy rewrites), fall back to GET
      if (response.status === 405) {
        response = await fetch(`/api/check-website?url=${encodeURIComponent(queryUrl)}`, {
          method: 'GET',
        });
      }

      const contentType = response.headers.get('content-type') || '';
      let data: any;
      if (contentType.includes('application/json')) {
        data = await response.json();
      } else {
        const text = await response.text();
        throw new Error(
          !response.ok
            ? `Server error (${response.status}): ${text.slice(0, 100)}`
            : 'Received invalid non-JSON response from serverless function'
        );
      }

      if (!response.ok) {
        throw new Error(data?.error || `HTTP error ${response.status}: Failed to inspect website`);
      }

      const result: WebsiteCheckResult = data;
      setCurrentResult(result);

      if (!isRecovery) {
        // New check: only show diagnosis if status is DOWN
        setShowDiagnosisSection(result.status === 'DOWN');
        setRecoveryNotification(null);
      } else {
        // Recovery check: keep diagnosis section visible to display recovery outcome
        setShowDiagnosisSection(true);
        if (result.status === 'UP') {
          setRecoveryNotification('recovered');
        } else {
          setRecoveryNotification('still_down');
        }
      }

      // Record to history
      const historyItem: MonitoringHistoryItem = {
        id: 'hist-' + Date.now() + '-' + Math.random().toString(36).substring(2, 7),
        timestamp: result.timestamp,
        website: result.domain,
        status: result.status,
        responseTime: result.responseTimeMs,
        httpStatusCode: result.httpStatusCode,
        httpStatusText: result.httpStatusText,
        dnsStatus: result.dns.dnsStatus,
        sslStatus: result.ssl.sslStatus,
        error: result.error,
      };

      setHistory((prev) => [historyItem, ...prev.slice(0, 99)]); // Keep last 100 entries

      // Record to response time points
      const now = new Date(result.timestamp);
      const timeLabel = now.toLocaleTimeString('en-US', {
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hour12: false,
      });

      setResponseTimeDataPoints((prev) => {
        const newPoints = [
          ...prev,
          {
            id: historyItem.id,
            timestamp: result.timestamp,
            timeLabel,
            responseTime: result.responseTimeMs,
            status: result.status,
            statusCode: result.httpStatusCode,
          },
        ];
        return newPoints.slice(-25); // Keep last 25 points for chart readability
      });

      return result;
    } catch (err: any) {
      setErrorMessage(err.message || 'An unexpected error occurred while communicating with the server.');
      return null;
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Handle URL changes and check on preset click
  const handleSelectSample = (sampleUrl: string) => {
    setUrl(sampleUrl);
    performCheck(sampleUrl);
  };

  // Near Real-Time Monitoring interval countdown
  useEffect(() => {
    if (!isRealTimeActive) {
      setCountdown(10);
      return;
    }

    const timer = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          // Trigger check when counter reaches zero
          if (!isLoading && urlRef.current.trim()) {
            performCheck();
          }
          return 10;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [isRealTimeActive, isLoading, performCheck]);

  // Toggle Real-Time Monitoring
  const handleToggleRealTime = () => {
    if (!isRealTimeActive) {
      if (!url.trim()) {
        setErrorMessage('Please enter a website URL first before enabling Near Real-Time Monitoring.');
        return;
      }
      setIsRealTimeActive(true);
      setCountdown(10);
      // Run immediate check if no check has been performed yet
      if (!currentResult) {
        performCheck();
      }
    } else {
      setIsRealTimeActive(false);
    }
  };

  const handleClearHistory = () => {
    setHistory([]);
    setResponseTimeDataPoints([]);
    try {
      localStorage.removeItem('domain_intel_monitoring_history');
    } catch {
      // ignore
    }
  };

  // Calculate session uptime for current domain
  const relevantHistory = currentResult
    ? history.filter((h) => h.website.toLowerCase() === currentResult.domain.toLowerCase())
    : [];

  const totalChecks = relevantHistory.length > 0 ? relevantHistory.length : currentResult ? 1 : 0;
  const successfulChecks = relevantHistory.length > 0
    ? relevantHistory.filter((h) => h.status === 'UP').length
    : currentResult?.status === 'UP' ? 1 : 0;

  const uptimePercentage = totalChecks > 0 ? (successfulChecks / totalChecks) * 100 : 100;

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col selection:bg-blue-600 selection:text-white">
      {/* Dark blue / navy Header */}
      <Header
        lastCheckedTime={currentResult?.timestamp}
        isRealTimeActive={isRealTimeActive}
      />

      {/* Main Content Area */}
      <main id="main-content" className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8 space-y-6">
        {/* Error Alert Box */}
        {errorMessage && (
          <div
            id="error-alert"
            className="p-4 rounded-xl bg-rose-50 border border-rose-200/90 text-rose-900 shadow-sm flex items-start justify-between gap-3 animate-fade-in"
          >
            <div className="flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
              <div>
                <h4 className="text-sm font-bold text-rose-800">Diagnostic Check Notice</h4>
                <p className="text-xs text-rose-700 mt-0.5">{errorMessage}</p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setErrorMessage(null)}
              className="text-rose-400 hover:text-rose-700 p-1 rounded transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* URL Input Bar & Controls */}
        <UrlInputBar
          url={url}
          onUrlChange={setUrl}
          onCheck={() => performCheck()}
          isLoading={isLoading}
          isRealTimeActive={isRealTimeActive}
          onToggleRealTime={handleToggleRealTime}
          countdown={countdown}
        />

        {/* Real-time active banner indicator if monitoring */}
        {isRealTimeActive && (
          <div className="flex items-center justify-between p-3 px-4 rounded-lg bg-emerald-900/90 text-white shadow-sm border border-emerald-700 text-xs">
            <div className="flex items-center gap-2.5">
              <span className="relative flex h-2.5 w-2.5">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-400"></span>
              </span>
              <span className="font-semibold">Near Real-Time Monitoring is ACTIVE:</span>
              <span className="text-emerald-200">Automatically re-evaluating website health every 10 seconds.</span>
            </div>
            <span className="font-mono font-bold bg-emerald-800/80 px-2 py-0.5 rounded border border-emerald-600">
              Next in {countdown}s
            </span>
          </div>
        )}

        {/* Loading state visual indicator */}
        {isLoading && !currentResult && (
          <div className="bg-white rounded-xl border border-slate-200/90 shadow-sm p-10 text-center">
            <div className="w-12 h-12 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center mx-auto mb-4 animate-spin">
              <RefreshCw className="w-6 h-6" />
            </div>
            <h3 className="text-lg font-bold text-slate-900">Conducting Deep Diagnostic Scan...</h3>
            <p className="text-xs text-slate-500 mt-1">
              Resolving authoritative DNS records, performing TLS handshake, and measuring HTTP round-trip latency.
            </p>
          </div>
        )}

        {/* Empty State before first check */}
        {!currentResult && !isLoading && (
          <EmptyState onSelectSample={handleSelectSample} />
        )}

        {/* Results Section when data is present */}
        {currentResult && (
          <div className="space-y-6">
            {/* 1. Dashboard KPI Cards */}
            <KpiCards
              data={currentResult}
              uptimePercentage={uptimePercentage}
              totalChecks={totalChecks}
              successfulChecks={successfulChecks}
            />

            {/* Intelligent Issue Diagnosis & Recovery (visible when DOWN or during/after recovery check) */}
            {showDiagnosisSection && currentResult && (
              <DiagnosisRecoverySection
                result={currentResult}
                onRetry={() => performCheck(currentResult.url, true)}
                isChecking={isLoading}
              />
            )}

            {/* 2. DNS & SSL Information Cards (2 Columns) */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <DnsInfoCard dns={currentResult.dns} domain={currentResult.domain} />
              <SslInfoCard ssl={currentResult.ssl} domain={currentResult.domain} />
            </div>

            {/* 3. Response Time Line Graph */}
            <ResponseTimeChart dataPoints={responseTimeDataPoints} />

            {/* 4. Monitoring History Table */}
            <MonitoringHistoryTable
              history={history}
              onClearHistory={handleClearHistory}
            />
          </div>
        )}
      </main>

      {/* Modern SaaS Footer */}
      <footer id="app-footer" className="bg-white border-t border-slate-200 py-6 text-xs text-slate-500">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-3 text-center sm:text-left">
          <div className="flex items-center gap-2">
            <span className="font-bold text-slate-800">Domain Intelligence</span>
            <span>&bull;</span>
            <span>College Capstone Project for Website Health Monitoring</span>
          </div>
          <div className="flex items-center gap-4 text-slate-400">
            <span>RFC 1035 (DNS)</span>
            <span>&bull;</span>
            <span>RFC 8446 (TLS 1.3)</span>
            <span>&bull;</span>
            <span>RFC 9110 (HTTP)</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
