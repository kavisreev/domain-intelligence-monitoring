import React, { useState } from 'react';
import { Search, Loader2, Globe, Clock, Play, Pause, Sparkles, RefreshCw } from 'lucide-react';

interface UrlInputBarProps {
  url: string;
  onUrlChange: (newUrl: string) => void;
  onCheck: () => void;
  isLoading: boolean;
  isRealTimeActive: boolean;
  onToggleRealTime: () => void;
  countdown: number;
}

const PRESET_DOMAINS = [
  { label: 'GitHub', url: 'github.com' },
  { label: 'Google', url: 'google.com' },
  { label: 'Wikipedia', url: 'wikipedia.org' },
  { label: 'Cloudflare', url: 'cloudflare.com' },
  { label: 'SSL Expired Test', url: 'expired.badssl.com' },
];

export const UrlInputBar: React.FC<UrlInputBarProps> = ({
  url,
  onUrlChange,
  onCheck,
  isLoading,
  isRealTimeActive,
  onToggleRealTime,
  countdown,
}) => {
  const [inputFocused, setInputFocused] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!isLoading && url.trim()) {
      onCheck();
    }
  };

  const handleSelectPreset = (presetUrl: string) => {
    onUrlChange(presetUrl);
  };

  return (
    <section id="url-input-section" className="bg-white rounded-xl border border-slate-200/90 shadow-sm p-5 sm:p-7">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 mb-4 pb-4 border-b border-slate-100">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
            Website Health Monitoring
          </h1>
          <p className="text-sm text-slate-500 mt-0.5">
            Diagnostic verification of HTTP status, DNS record resolution, and X.509 TLS/SSL certificate lifecycle.
          </p>
        </div>

        {/* Near Real-Time Monitoring Toggle */}
        <div className="flex items-center gap-2.5 self-start md:self-auto bg-slate-50 border border-slate-200 rounded-lg p-1.5 px-3">
          <button
            id="toggle-real-time-btn"
            type="button"
            onClick={onToggleRealTime}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-md font-semibold text-xs transition-all duration-150 ${
              isRealTimeActive
                ? 'bg-emerald-600 text-white shadow-sm hover:bg-emerald-700'
                : 'bg-white text-slate-700 hover:bg-slate-100 border border-slate-200'
            }`}
          >
            {isRealTimeActive ? (
              <>
                <Pause className="w-3.5 h-3.5" />
                <span>Pause Auto Monitor</span>
              </>
            ) : (
              <>
                <Play className="w-3.5 h-3.5" />
                <span>Near Real-Time Monitoring</span>
              </>
            )}
          </button>

          {isRealTimeActive && (
            <div className="flex items-center gap-1 text-xs font-mono font-medium text-emerald-700 bg-emerald-50 px-2 py-1 rounded border border-emerald-200">
              <Clock className="w-3.5 h-3.5 animate-spin text-emerald-600" />
              <span>{countdown}s</span>
            </div>
          )}
        </div>
      </div>

      {/* Input form */}
      <form onSubmit={handleSubmit} className="space-y-3.5">
        <div className="flex flex-col sm:flex-row gap-2.5">
          <div
            className={`relative flex-1 rounded-lg border transition-all duration-200 bg-slate-50/50 flex items-center ${
              inputFocused
                ? 'border-blue-600 ring-2 ring-blue-100 bg-white'
                : 'border-slate-300 hover:border-slate-400'
            }`}
          >
            <div className="pl-3.5 pr-2 text-slate-400 flex items-center pointer-events-none">
              <Globe className="w-5 h-5" />
            </div>
            <input
              id="website-url-input"
              type="text"
              value={url}
              onChange={(e) => onUrlChange(e.target.value)}
              onFocus={() => setInputFocused(true)}
              onBlur={() => setInputFocused(false)}
              placeholder="Enter website URL (e.g. github.com, https://example.org)"
              disabled={isLoading}
              className="w-full py-3 pr-4 text-sm sm:text-base text-slate-900 placeholder:text-slate-400 bg-transparent focus:outline-none disabled:opacity-50"
            />
            {url && (
              <button
                type="button"
                onClick={() => onUrlChange('')}
                className="mr-3 text-xs text-slate-400 hover:text-slate-600 px-1.5 py-0.5 rounded bg-slate-200/60"
              >
                Clear
              </button>
            )}
          </div>

          <button
            id="check-website-btn"
            type="submit"
            disabled={isLoading || !url.trim()}
            className="w-full sm:w-auto px-6 py-3 bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white font-bold text-sm tracking-wide rounded-lg shadow-sm transition-all duration-150 flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap min-w-[170px]"
          >
            {isLoading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin text-white" />
                <span>CHECKING...</span>
              </>
            ) : (
              <>
                <Search className="w-4 h-4" />
                <span>CHECK WEBSITE</span>
              </>
            )}
          </button>
        </div>

        {/* Quick presets pills */}
        <div className="flex items-center gap-2 flex-wrap text-xs text-slate-500 pt-1">
          <span className="font-semibold text-slate-600 flex items-center gap-1">
            <Sparkles className="w-3.5 h-3.5 text-blue-500" />
            Quick Presets:
          </span>
          {PRESET_DOMAINS.map((preset) => (
            <button
              key={preset.url}
              type="button"
              onClick={() => handleSelectPreset(preset.url)}
              className="px-2.5 py-1 rounded-md bg-slate-100 hover:bg-blue-50 hover:text-blue-700 text-slate-700 font-medium transition-colors border border-slate-200/80 cursor-pointer"
            >
              {preset.label}
            </button>
          ))}
        </div>
      </form>
    </section>
  );
};
