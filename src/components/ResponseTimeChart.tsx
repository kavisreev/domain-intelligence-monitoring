import React, { useState, useMemo } from 'react';
import { Activity, Zap, TrendingUp, TrendingDown, Clock, Info } from 'lucide-react';
import { ResponseTimeDataPoint } from '../types';

interface ResponseTimeChartProps {
  dataPoints: ResponseTimeDataPoint[];
}

export const ResponseTimeChart: React.FC<ResponseTimeChartProps> = ({ dataPoints }) => {
  const [hoveredPoint, setHoveredPoint] = useState<ResponseTimeDataPoint | null>(null);
  const [hoverPos, setHoverPos] = useState<{ x: number; y: number } | null>(null);

  // Calculate metrics
  const stats = useMemo(() => {
    if (dataPoints.length === 0) {
      return { min: 0, max: 0, avg: 0, latest: 0 };
    }
    const times = dataPoints.map((d) => d.responseTime);
    const min = Math.min(...times);
    const max = Math.max(...times);
    const sum = times.reduce((acc, v) => acc + v, 0);
    const avg = Math.round(sum / times.length);
    const latest = times[times.length - 1];
    return { min, max, avg, latest };
  }, [dataPoints]);

  // Dimensions for SVG
  const width = 800;
  const height = 240;
  const padding = { top: 25, right: 30, bottom: 40, left: 55 };

  const chartWidth = width - padding.left - padding.right;
  const chartHeight = height - padding.top - padding.bottom;

  // Compute coordinate points
  const points = useMemo(() => {
    if (dataPoints.length === 0) return [];

    const effectiveMax = Math.max(stats.max * 1.15, 100);
    const effectiveMin = 0;

    return dataPoints.map((d, index) => {
      const x =
        dataPoints.length === 1
          ? padding.left + chartWidth / 2
          : padding.left + (index / (dataPoints.length - 1)) * chartWidth;
      const normalizedY = (d.responseTime - effectiveMin) / (effectiveMax - effectiveMin || 1);
      const y = padding.top + chartHeight - normalizedY * chartHeight;
      return { x, y, data: d };
    });
  }, [dataPoints, chartWidth, chartHeight, padding.left, padding.top, stats.max]);

  // SVG path strings
  const linePath = useMemo(() => {
    if (points.length === 0) return '';
    if (points.length === 1) {
      return `M ${points[0].x - 20} ${points[0].y} L ${points[0].x + 20} ${points[0].y}`;
    }
    return points.reduce((acc, pt, idx) => {
      return idx === 0 ? `M ${pt.x} ${pt.y}` : `${acc} L ${pt.x} ${pt.y}`;
    }, '');
  }, [points]);

  const areaPath = useMemo(() => {
    if (points.length === 0) return '';
    const bottomY = padding.top + chartHeight;
    if (points.length === 1) {
      return `M ${points[0].x - 20} ${points[0].y} L ${points[0].x + 20} ${points[0].y} L ${points[0].x + 20} ${bottomY} L ${points[0].x - 20} ${bottomY} Z`;
    }
    return `${linePath} L ${points[points.length - 1].x} ${bottomY} L ${points[0].x} ${bottomY} Z`;
  }, [linePath, points, padding.top, chartHeight]);

  // Calculate Y-axis tick values
  const yTicks = useMemo(() => {
    const effectiveMax = Math.max(stats.max * 1.15, 100);
    return [
      Math.round(effectiveMax),
      Math.round(effectiveMax * 0.66),
      Math.round(effectiveMax * 0.33),
      0,
    ];
  }, [stats.max]);

  return (
    <div id="response-time-graph-card" className="bg-white rounded-xl border border-slate-200/90 shadow-sm p-5 sm:p-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-100">
        <div>
          <div className="flex items-center gap-2">
            <div className="p-1.5 rounded-md bg-blue-50 text-blue-600">
              <Zap className="w-4 h-4" />
            </div>
            <h2 className="text-base sm:text-lg font-bold text-slate-900">Response Time Graph</h2>
          </div>
          <p className="text-xs text-slate-500 mt-0.5">
            Real-time latency progression history across consecutive checks
          </p>
        </div>

        {/* Quick summary metrics */}
        <div className="flex items-center gap-4 text-xs">
          <div className="flex items-center gap-1.5">
            <span className="text-slate-500">Average:</span>
            <span className="font-mono font-bold text-slate-900">{stats.avg} ms</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="text-slate-500">Min:</span>
            <span className="font-mono font-bold text-emerald-600">{stats.min} ms</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="text-slate-500">Max:</span>
            <span className="font-mono font-bold text-rose-600">{stats.max} ms</span>
          </div>
        </div>
      </div>

      {/* Chart Canvas */}
      <div className="relative mt-4 w-full overflow-hidden">
        {dataPoints.length === 0 ? (
          <div className="h-48 flex items-center justify-center text-slate-400 text-sm">
            No response time telemetry recorded yet.
          </div>
        ) : (
          <div className="w-full">
            <svg
              viewBox={`0 0 ${width} ${height}`}
              className="w-full h-auto overflow-visible select-none"
              style={{ maxHeight: '260px' }}
            >
              <defs>
                <linearGradient id="latencyGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#2563eb" stopOpacity="0.28" />
                  <stop offset="100%" stopColor="#2563eb" stopOpacity="0.02" />
                </linearGradient>
              </defs>

              {/* Horizontal Grid lines */}
              {yTicks.map((tick, idx) => {
                const effectiveMax = Math.max(stats.max * 1.15, 100);
                const y = padding.top + chartHeight - (tick / effectiveMax) * chartHeight;
                return (
                  <g key={idx}>
                    <line
                      x1={padding.left}
                      y1={y}
                      x2={width - padding.right}
                      y2={y}
                      stroke="#f1f5f9"
                      strokeWidth="1"
                      strokeDasharray="4 4"
                    />
                    <text
                      x={padding.left - 10}
                      y={y + 4}
                      textAnchor="end"
                      fontSize="10"
                      className="fill-slate-400 font-mono"
                    >
                      {tick} ms
                    </text>
                  </g>
                );
              })}

              {/* Average latency line */}
              {stats.avg > 0 && (
                <g>
                  {(() => {
                    const effectiveMax = Math.max(stats.max * 1.15, 100);
                    const avgY = padding.top + chartHeight - (stats.avg / effectiveMax) * chartHeight;
                    return (
                      <>
                        <line
                          x1={padding.left}
                          y1={avgY}
                          x2={width - padding.right}
                          y2={avgY}
                          stroke="#94a3b8"
                          strokeWidth="1.2"
                          strokeDasharray="3 3"
                        />
                        <text
                          x={width - padding.right}
                          y={avgY - 4}
                          textAnchor="end"
                          fontSize="9"
                          className="fill-slate-500 font-semibold"
                        >
                          Avg: {stats.avg} ms
                        </text>
                      </>
                    );
                  })()}
                </g>
              )}

              {/* Area Under Curve */}
              {areaPath && <path d={areaPath} fill="url(#latencyGradient)" />}

              {/* Line Curve */}
              {linePath && (
                <path
                  d={linePath}
                  fill="none"
                  stroke="#2563eb"
                  strokeWidth="2.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              )}

              {/* Interactive Data Points */}
              {points.map((pt, index) => {
                const isDown = pt.data.status === 'DOWN';
                const isHovered = hoveredPoint?.id === pt.data.id;
                return (
                  <g
                    key={pt.data.id || index}
                    className="cursor-pointer"
                    onMouseEnter={(e) => {
                      setHoveredPoint(pt.data);
                      const rect = e.currentTarget.getBoundingClientRect();
                      setHoverPos({ x: pt.x, y: pt.y });
                    }}
                    onMouseLeave={() => {
                      setHoveredPoint(null);
                      setHoverPos(null);
                    }}
                  >
                    <circle
                      cx={pt.x}
                      cy={pt.y}
                      r={isHovered ? 6 : 4}
                      fill={isDown ? '#ef4444' : '#2563eb'}
                      stroke="#ffffff"
                      strokeWidth="2"
                      className="transition-all duration-150"
                    />
                    {/* X axis labels (sparse if many points) */}
                    {(points.length <= 8 || index % Math.ceil(points.length / 6) === 0 || index === points.length - 1) && (
                      <text
                        x={pt.x}
                        y={height - 12}
                        textAnchor="middle"
                        fontSize="9"
                        className="fill-slate-400 font-mono"
                      >
                        {pt.data.timeLabel}
                      </text>
                    )}
                  </g>
                );
              })}
            </svg>

            {/* Hover Tooltip Overlay */}
            {hoveredPoint && hoverPos && (
              <div
                className="absolute pointer-events-none z-10 bg-slate-900 text-white rounded-lg px-3 py-2 text-xs shadow-xl border border-slate-700 transition-all duration-150"
                style={{
                  left: `${(hoverPos.x / width) * 100}%`,
                  top: `${(hoverPos.y / height) * 100}%`,
                  transform: 'translate(-50%, -120%)',
                }}
              >
                <div className="font-mono font-bold text-blue-400 flex items-center gap-1.5">
                  <span>{hoveredPoint.responseTime} ms</span>
                  <span
                    className={`px-1.5 py-0.2 rounded text-[10px] ${
                      hoveredPoint.status === 'UP' ? 'bg-emerald-900/80 text-emerald-300' : 'bg-rose-900/80 text-rose-300'
                    }`}
                  >
                    {hoveredPoint.status}
                  </span>
                </div>
                <div className="text-slate-300 text-[10px] mt-0.5 font-medium">
                  {hoveredPoint.timeLabel} • HTTP {hoveredPoint.statusCode || 'Err'}
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      <div className="mt-2 text-right">
        <span className="text-[11px] text-slate-400 font-medium">
          Showing {dataPoints.length} check sample(s) in active session
        </span>
      </div>
    </div>
  );
};
