import React from 'react';
import {
  Eye,
  BrainCircuit,
  MapPin,
  MessageSquare,
  BarChart3,
  RotateCcw,
  Camera,
  Activity,
  Layers
} from 'lucide-react';
import { SystemStats } from '../types';

interface NavbarProps {
  activeTab: 'scanner' | 'memory' | 'map' | 'chat' | 'stats';
  setActiveTab: (tab: 'scanner' | 'memory' | 'map' | 'chat' | 'stats') => void;
  stats: SystemStats | null;
  onResetMemory: () => void;
  isStreaming: boolean;
  toggleStream: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  activeTab,
  setActiveTab,
  stats,
  onResetMemory,
  isStreaming,
  toggleStream
}) => {
  return (
    <header className="bg-slate-900/90 backdrop-blur-md border-b border-slate-800 sticky top-0 z-40 text-slate-100">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Brand Logo & System Status */}
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-cyan-500 via-indigo-500 to-purple-600 p-0.5 flex items-center justify-center shadow-lg shadow-cyan-500/20">
              <div className="w-full h-full bg-slate-950 rounded-[10px] flex items-center justify-center">
                <BrainCircuit className="w-5 h-5 text-cyan-400 animate-pulse" />
              </div>
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h1 className="text-base font-bold text-slate-100">
                  AI Visual Memory System
                </h1>
                <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold bg-cyan-950 text-cyan-300 border border-cyan-800/50">
                  <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 mr-1 animate-pulse" />
                  SPATIAL AI
                </span>
              </div>
              <p className="text-xs text-slate-400 hidden sm:block">
                3D Spatial Perception & Persistent Object Tracking
              </p>
            </div>
          </div>

          {/* Center Navigation Tabs */}
          <nav className="hidden md:flex items-center space-x-1 bg-slate-950/60 p-1.5 rounded-xl border border-slate-800/80">
            <button
              onClick={() => setActiveTab('scanner')}
              className={`flex items-center space-x-2 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                activeTab === 'scanner'
                  ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/30 shadow-sm'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
              }`}
            >
              <Eye className="w-4 h-4" />
              <span>Live Feed</span>
              {isStreaming && (
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse ml-1" />
              )}
            </button>

            <button
              onClick={() => setActiveTab('memory')}
              className={`flex items-center space-x-2 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                activeTab === 'memory'
                  ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/30 shadow-sm'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
              }`}
            >
              <BrainCircuit className="w-4 h-4" />
              <span>Memory Bank</span>
              {stats && (
                <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-indigo-900/80 text-indigo-300 border border-indigo-700/50 font-mono">
                  {stats.totalObjects}
                </span>
              )}
            </button>

            <button
              onClick={() => setActiveTab('map')}
              className={`flex items-center space-x-2 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                activeTab === 'map'
                  ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/30 shadow-sm'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
              }`}
            >
              <MapPin className="w-4 h-4" />
              <span>2D Floor Map</span>
            </button>

            <button
              onClick={() => setActiveTab('chat')}
              className={`flex items-center space-x-2 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                activeTab === 'chat'
                  ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/30 shadow-sm'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
              }`}
            >
              <MessageSquare className="w-4 h-4" />
              <span>AI Assistant</span>
            </button>

            <button
              onClick={() => setActiveTab('stats')}
              className={`flex items-center space-x-2 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                activeTab === 'stats'
                  ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/30 shadow-sm'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
              }`}
            >
              <BarChart3 className="w-4 h-4" />
              <span>Telemetry</span>
            </button>
          </nav>

          {/* Action Buttons & Status Telemetry */}
          <div className="flex items-center space-x-2 sm:space-x-3">
            {stats && (
              <div className="hidden lg:flex items-center space-x-3 text-xs bg-slate-950 px-3 py-1.5 rounded-lg border border-slate-800 font-mono">
                <div className="flex items-center space-x-1 text-emerald-400">
                  <Activity className="w-3.5 h-3.5" />
                  <span>{stats.fps} FPS</span>
                </div>
                <div className="text-slate-600">|</div>
                <div className="text-cyan-300">
                  <span className="text-slate-500">Visible:</span> {stats.visibleObjects}
                </div>
                <div className="text-slate-600">|</div>
                <div className="text-amber-400">
                  <span className="text-slate-500">Lost:</span> {stats.lostObjects}
                </div>
              </div>
            )}

            <button
              onClick={toggleStream}
              className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                isStreaming
                  ? 'bg-rose-500/20 text-rose-300 border border-rose-500/40 hover:bg-rose-500/30'
                  : 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 hover:bg-emerald-500/30'
              }`}
              title={isStreaming ? 'Pause perception stream' : 'Start real-time camera detection'}
            >
              <Camera className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">{isStreaming ? 'Pause Stream' : 'Live Stream'}</span>
            </button>

            <button
              onClick={onResetMemory}
              className="p-1.5 rounded-lg text-slate-400 hover:text-slate-100 hover:bg-slate-800 transition-colors border border-slate-800"
              title="Reset Memory Store"
            >
              <RotateCcw className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Mobile Navigation Row */}
        <div className="flex md:hidden items-center justify-around py-2 border-t border-slate-800 text-xs">
          <button
            onClick={() => setActiveTab('scanner')}
            className={`flex flex-col items-center py-1 px-2 ${activeTab === 'scanner' ? 'text-cyan-400' : 'text-slate-400'}`}
          >
            <Eye className="w-4 h-4" />
            <span className="text-[10px]">Feed</span>
          </button>
          <button
            onClick={() => setActiveTab('memory')}
            className={`flex flex-col items-center py-1 px-2 ${activeTab === 'memory' ? 'text-cyan-400' : 'text-slate-400'}`}
          >
            <BrainCircuit className="w-4 h-4" />
            <span className="text-[10px]">Memory</span>
          </button>
          <button
            onClick={() => setActiveTab('map')}
            className={`flex flex-col items-center py-1 px-2 ${activeTab === 'map' ? 'text-cyan-400' : 'text-slate-400'}`}
          >
            <MapPin className="w-4 h-4" />
            <span className="text-[10px]">Map</span>
          </button>
          <button
            onClick={() => setActiveTab('chat')}
            className={`flex flex-col items-center py-1 px-2 ${activeTab === 'chat' ? 'text-cyan-400' : 'text-slate-400'}`}
          >
            <MessageSquare className="w-4 h-4" />
            <span className="text-[10px]">Assistant</span>
          </button>
          <button
            onClick={() => setActiveTab('stats')}
            className={`flex flex-col items-center py-1 px-2 ${activeTab === 'stats' ? 'text-cyan-400' : 'text-slate-400'}`}
          >
            <BarChart3 className="w-4 h-4" />
            <span className="text-[10px]">Telemetry</span>
          </button>
        </div>
      </div>
    </header>
  );
};
