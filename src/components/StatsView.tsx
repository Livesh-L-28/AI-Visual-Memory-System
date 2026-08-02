import React from 'react';
import {
  BarChart3,
  Activity,
  BrainCircuit,
  Database,
  Layers,
  Clock,
  Zap,
  CheckCircle2
} from 'lucide-react';
import { SystemStats } from '../types';

interface StatsViewProps {
  stats: SystemStats | null;
}

export const StatsView: React.FC<StatsViewProps> = ({ stats }) => {
  if (!stats) {
    return (
      <div className="text-center py-12 text-xs text-slate-500">
        Loading system telemetry...
      </div>
    );
  }

  const formatUptime = (sec: number) => {
    const mins = Math.floor(sec / 60);
    const hours = Math.floor(mins / 60);
    if (hours > 0) return `${hours}h ${mins % 60}m`;
    return `${mins}m ${sec % 60}s`;
  };

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="bg-slate-900/80 rounded-2xl border border-slate-800 p-5 flex items-center justify-between shadow-xl">
        <div className="flex items-center space-x-3">
          <div className="p-3 rounded-xl bg-cyan-950/80 text-cyan-400 border border-cyan-800/60">
            <BarChart3 className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-base font-bold text-slate-100 flex items-center gap-2">
              System Performance & Vector Memory Telemetry
              <span className="px-2 py-0.5 rounded-full text-xs bg-emerald-950 text-emerald-300 border border-emerald-800/50 font-mono">
                HEALTHY 100%
              </span>
            </h2>
            <p className="text-xs text-slate-400">
              Real-time perception pipeline FPS, FAISS index metrics, and object class distributions
            </p>
          </div>
        </div>
      </div>

      {/* Metric Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-slate-900/80 rounded-2xl border border-slate-800 p-4 space-y-2">
          <div className="flex items-center justify-between text-xs text-slate-400">
            <span>Perception Frame Rate</span>
            <Activity className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="text-2xl font-bold font-mono text-slate-100 flex items-baseline space-x-1">
            <span>{stats.fps}</span>
            <span className="text-xs text-slate-500 font-sans">FPS</span>
          </div>
          <p className="text-[11px] text-slate-500">ByteTrack + YOLO perception loop</p>
        </div>

        <div className="bg-slate-900/80 rounded-2xl border border-slate-800 p-4 space-y-2">
          <div className="flex items-center justify-between text-xs text-slate-400">
            <span>FAISS Vector Memory</span>
            <BrainCircuit className="w-4 h-4 text-cyan-400" />
          </div>
          <div className="text-2xl font-bold font-mono text-cyan-300 flex items-baseline space-x-1">
            <span>{stats.vectorCount}</span>
            <span className="text-xs text-slate-500 font-sans">Vectors</span>
          </div>
          <p className="text-[11px] text-slate-500">512-dim normalized CLIP embeddings</p>
        </div>

        <div className="bg-slate-900/80 rounded-2xl border border-slate-800 p-4 space-y-2">
          <div className="flex items-center justify-between text-xs text-slate-400">
            <span>Re-ID Cosine Threshold</span>
            <Zap className="w-4 h-4 text-amber-400" />
          </div>
          <div className="text-2xl font-bold font-mono text-amber-300 flex items-baseline space-x-1">
            <span>0.80</span>
            <span className="text-xs text-slate-500 font-sans">Threshold</span>
          </div>
          <p className="text-[11px] text-slate-500">Identity matching tolerance</p>
        </div>

        <div className="bg-slate-900/80 rounded-2xl border border-slate-800 p-4 space-y-2">
          <div className="flex items-center justify-between text-xs text-slate-400">
            <span>Engine Uptime</span>
            <Clock className="w-4 h-4 text-purple-400" />
          </div>
          <div className="text-2xl font-bold font-mono text-slate-100 flex items-baseline space-x-1">
            <span>{formatUptime(stats.uptimeSeconds)}</span>
          </div>
          <p className="text-[11px] text-slate-500">{stats.totalFramesProcessed} frames processed</p>
        </div>
      </div>

      {/* Class Distribution Breakdown */}
      <div className="bg-slate-900/80 rounded-2xl border border-slate-800 p-6 space-y-4 shadow-xl">
        <h3 className="text-sm font-bold text-slate-100 flex items-center gap-2">
          <Layers className="w-4 h-4 text-cyan-400" />
          Object Class Memory Distribution
        </h3>

        <div className="space-y-3">
          {Object.entries(stats.objectsByClass).map(([className, count]) => {
            const numCount = Number(count);
            const percentage = stats.totalObjects > 0 ? Math.round((numCount / stats.totalObjects) * 100) : 0;

            return (
              <div key={className} className="space-y-1 text-xs">
                <div className="flex items-center justify-between font-mono">
                  <span className="text-slate-300 uppercase">{className}</span>
                  <span className="text-slate-400">
                    {count} objects ({percentage}%)
                  </span>
                </div>
                <div className="w-full bg-slate-950 rounded-full h-2 overflow-hidden border border-slate-800">
                  <div
                    style={{ width: `${percentage}%` }}
                    className="bg-gradient-to-r from-cyan-500 to-indigo-500 h-full rounded-full transition-all duration-500"
                  />
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
