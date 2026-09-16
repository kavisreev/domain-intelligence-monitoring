import React from 'react';
import { Globe, ShieldCheck, Activity, GraduationCap } from 'lucide-react';

interface HeaderProps {
  lastCheckedTime?: string;
  isRealTimeActive?: boolean;
}

export const Header: React.FC<HeaderProps> = ({ lastCheckedTime, isRealTimeActive }) => {
  return (
    <header id="header-container" className="bg-[#0B1528] text-white border-b border-slate-800 shadow-md">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-5">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          {/* Logo and Titles */}
          <div className="flex items-center space-x-3.5">
            <div className="w-11 h-11 rounded-xl bg-blue-600/20 border border-blue-500/40 flex items-center justify-center text-blue-400 shadow-inner">
              <Globe className="w-6 h-6 animate-pulse" />
            </div>
            <div>
              <div className="flex items-center gap-2.5 flex-wrap">
                <span className="text-xl sm:text-2xl font-bold tracking-tight text-white flex items-center gap-1.5">
                  🌐 Domain Intelligence
                </span>
                <span className="hidden sm:inline-block px-2.5 py-0.5 text-xs font-semibold bg-blue-900/60 text-blue-300 border border-blue-700/50 rounded-full">
                  v2.4 Live Engine
                </span>
              </div>
              <p className="text-xs sm:text-sm text-slate-400 font-medium mt-0.5 tracking-wide">
                Website Monitoring System
              </p>
            </div>
          </div>

          {/* Right Badges & Academic Tag */}
          <div className="flex items-center flex-wrap gap-2.5 sm:gap-3 text-xs">
            <div className="flex items-center gap-1.5 bg-slate-800/80 border border-slate-700/60 rounded-lg px-3 py-1.5 text-slate-300">
              <GraduationCap className="w-4 h-4 text-amber-400" />
              <span className="font-medium text-slate-200">College Capstone Project</span>
            </div>

            <div className="flex items-center gap-2 bg-slate-800/80 border border-slate-700/60 rounded-lg px-3 py-1.5">
              <span className="relative flex h-2 w-2">
                {isRealTimeActive ? (
                  <>
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                  </>
                ) : (
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-slate-400"></span>
                )}
              </span>
              <span className="text-slate-300 font-medium">
                {isRealTimeActive ? 'Monitoring Active (10s)' : 'Standby Mode'}
              </span>
            </div>
          </div>
        </div>
      </div>
    </header>
  );
};
