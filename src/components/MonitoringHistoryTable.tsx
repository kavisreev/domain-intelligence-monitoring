import React, { useState } from 'react';
import { 
  History, 
  Download, 
  Trash2, 
  Search, 
  CheckCircle2, 
  XCircle, 
  FileText, 
  FileSpreadsheet,
  ArrowUpDown
} from 'lucide-react';
import { MonitoringHistoryItem } from '../types';

interface MonitoringHistoryTableProps {
  history: MonitoringHistoryItem[];
  onClearHistory: () => void;
}

export const MonitoringHistoryTable: React.FC<MonitoringHistoryTableProps> = ({
  history,
  onClearHistory,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'UP' | 'DOWN'>('ALL');

  const filteredHistory = history.filter((item) => {
    const matchesSearch =
      item.website.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (item.httpStatusCode && item.httpStatusCode.toString().includes(searchTerm));
    const matchesStatus = statusFilter === 'ALL' || item.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const formatDate = (isoString: string) => {
    try {
      const d = new Date(isoString);
      return d.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
      });
    } catch {
      return isoString;
    }
  };

  // Export to CSV
  const handleExportCsv = () => {
    if (history.length === 0) return;
    const headers = ['Date & Time', 'Website', 'Status', 'Response Time (ms)', 'HTTP Status Code', 'Status Text', 'DNS Status', 'SSL Status'];
    const rows = history.map((item) => [
      `"${item.timestamp}"`,
      `"${item.website}"`,
      `"${item.status}"`,
      item.responseTime,
      item.httpStatusCode || '',
      `"${item.httpStatusText || ''}"`,
      `"${item.dnsStatus || ''}"`,
      `"${item.sslStatus || ''}"`,
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map((e) => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `website-monitoring-history-${Date.now()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Export to JSON
  const handleExportJson = () => {
    if (history.length === 0) return;
    const jsonString = `data:text/json;charset=utf-8,${encodeURIComponent(JSON.stringify(history, null, 2))}`;
    const link = document.createElement('a');
    link.setAttribute('href', jsonString);
    link.setAttribute('download', `website-monitoring-history-${Date.now()}.json`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div id="monitoring-history-card" className="bg-white rounded-xl border border-slate-200/90 shadow-sm p-5 sm:p-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 pb-4 border-b border-slate-100">
        <div className="flex items-center gap-2.5">
          <div className="p-2 rounded-lg bg-indigo-50 text-indigo-600 border border-indigo-100">
            <History className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-base sm:text-lg font-bold text-slate-900">Monitoring History</h2>
            <p className="text-xs text-slate-500">Historical chronological log of all diagnostic ping runs</p>
          </div>
        </div>

        {/* Actions (Export CSV, JSON, Clear) */}
        <div className="flex items-center gap-2 flex-wrap">
          <button
            type="button"
            onClick={handleExportCsv}
            disabled={history.length === 0}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-slate-700 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            title="Export history as CSV"
          >
            <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-600" />
            <span>CSV</span>
          </button>

          <button
            type="button"
            onClick={handleExportJson}
            disabled={history.length === 0}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-slate-700 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            title="Export history as JSON"
          >
            <FileText className="w-3.5 h-3.5 text-blue-600" />
            <span>JSON</span>
          </button>

          {history.length > 0 && (
            <button
              type="button"
              onClick={onClearHistory}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-rose-600 bg-rose-50 hover:bg-rose-100 border border-rose-200 rounded-lg transition-colors"
              title="Clear monitoring logs"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>Clear</span>
            </button>
          )}
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 mt-4">
        <div className="relative w-full sm:w-72">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input
            type="text"
            placeholder="Search website or HTTP code..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-3 py-1.5 text-xs text-slate-800 placeholder:text-slate-400 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-500 focus:bg-white"
          />
        </div>

        <div className="flex items-center gap-1 self-start sm:self-auto bg-slate-100 p-1 rounded-lg text-xs font-semibold">
          <button
            type="button"
            onClick={() => setStatusFilter('ALL')}
            className={`px-2.5 py-1 rounded-md transition-colors ${
              statusFilter === 'ALL' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-500 hover:text-slate-900'
            }`}
          >
            All ({history.length})
          </button>
          <button
            type="button"
            onClick={() => setStatusFilter('UP')}
            className={`px-2.5 py-1 rounded-md transition-colors ${
              statusFilter === 'UP' ? 'bg-white text-emerald-700 shadow-xs' : 'text-slate-500 hover:text-emerald-700'
            }`}
          >
            UP ({history.filter((h) => h.status === 'UP').length})
          </button>
          <button
            type="button"
            onClick={() => setStatusFilter('DOWN')}
            className={`px-2.5 py-1 rounded-md transition-colors ${
              statusFilter === 'DOWN' ? 'bg-white text-rose-700 shadow-xs' : 'text-slate-500 hover:text-rose-700'
            }`}
          >
            DOWN ({history.filter((h) => h.status === 'DOWN').length})
          </button>
        </div>
      </div>

      {/* History Table */}
      <div className="mt-4 overflow-x-auto rounded-lg border border-slate-200/80">
        <table id="monitoring-history-table-element" className="w-full text-left text-xs text-slate-700">
          <thead className="bg-slate-50/90 text-slate-600 font-bold border-b border-slate-200 uppercase tracking-wider">
            <tr>
              <th scope="col" className="py-3 px-4">Date & Time</th>
              <th scope="col" className="py-3 px-4">Website</th>
              <th scope="col" className="py-3 px-4">Status</th>
              <th scope="col" className="py-3 px-4">Response Time</th>
              <th scope="col" className="py-3 px-4">HTTP Code</th>
              <th scope="col" className="py-3 px-4">DNS</th>
              <th scope="col" className="py-3 px-4">SSL</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200/60 bg-white">
            {filteredHistory.length === 0 ? (
              <tr>
                <td colSpan={7} className="py-8 text-center text-slate-400">
                  {history.length === 0
                    ? 'No monitoring logs recorded yet. Check a website to begin recording history.'
                    : 'No records matching your search or status filter.'}
                </td>
              </tr>
            ) : (
              filteredHistory.map((item) => {
                const isUp = item.status === 'UP';
                return (
                  <tr key={item.id} className="hover:bg-slate-50/70 transition-colors">
                    {/* Date and Time */}
                    <td className="py-3 px-4 font-mono text-slate-600 whitespace-nowrap">
                      {formatDate(item.timestamp)}
                    </td>

                    {/* Website */}
                    <td className="py-3 px-4 font-semibold text-slate-900 max-w-[200px] truncate" title={item.website}>
                      {item.website}
                    </td>

                    {/* Status */}
                    <td className="py-3 px-4 whitespace-nowrap">
                      <span
                        className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full font-bold text-[11px] border ${
                          isUp
                            ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                            : 'bg-rose-50 text-rose-700 border-rose-200'
                        }`}
                      >
                        {isUp ? (
                          <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                        ) : (
                          <XCircle className="w-3 h-3 text-rose-600" />
                        )}
                        {item.status}
                      </span>
                    </td>

                    {/* Response Time */}
                    <td className="py-3 px-4 font-mono font-bold text-slate-900 whitespace-nowrap">
                      {item.responseTime} ms
                    </td>

                    {/* HTTP Status Code */}
                    <td className="py-3 px-4 whitespace-nowrap font-mono">
                      {item.httpStatusCode ? (
                        <span className={`px-2 py-0.5 rounded text-[11px] font-bold ${
                          item.httpStatusCode < 400
                            ? 'bg-slate-100 text-slate-800'
                            : 'bg-amber-50 text-amber-800 border border-amber-200'
                        }`}>
                          {item.httpStatusCode} {item.httpStatusText}
                        </span>
                      ) : (
                        <span className="text-slate-400 italic">No Response</span>
                      )}
                    </td>

                    {/* DNS Status */}
                    <td className="py-3 px-4 whitespace-nowrap">
                      <span
                        className={`text-[10px] font-semibold px-1.5 py-0.5 rounded ${
                          item.dnsStatus === 'RESOLVED'
                            ? 'bg-teal-50 text-teal-700 border border-teal-200'
                            : 'bg-rose-50 text-rose-700 border border-rose-200'
                        }`}
                      >
                        {item.dnsStatus}
                      </span>
                    </td>

                    {/* SSL Status */}
                    <td className="py-3 px-4 whitespace-nowrap">
                      <span
                        className={`text-[10px] font-semibold px-1.5 py-0.5 rounded ${
                          item.sslStatus === 'VALID'
                            ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                            : item.sslStatus === 'EXPIRING_SOON'
                            ? 'bg-amber-50 text-amber-700 border border-amber-200'
                            : 'bg-slate-100 text-slate-700'
                        }`}
                      >
                        {item.sslStatus}
                      </span>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};
