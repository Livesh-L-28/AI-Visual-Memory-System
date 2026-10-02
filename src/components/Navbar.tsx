import React, { useState, useEffect } from 'react';
import {
  Eye,
  BrainCircuit,
  MapPin,
  MessageSquare,
  BarChart3,
  RotateCcw,
  Camera,
  Activity,
  KeyRound,
  Check,
  X,
  AlertCircle
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
  const [hasApiKey, setHasApiKey] = useState<boolean>(false);
  const [showKeyModal, setShowKeyModal] = useState<boolean>(false);
  const [keyInput, setKeyInput] = useState<string>('');
  const [isSavingKey, setIsSavingKey] = useState<boolean>(false);
  const [keyMessage, setKeyMessage] = useState<string | null>(null);

  const checkConfig = async () => {
    try {
      const res = await fetch('/api/config');
      if (res.ok) {
        const data = await res.json();
        setHasApiKey(!!data.hasGeminiKey);
      }
    } catch (e) {
      // Ignore
    }
  };

  useEffect(() => {
    checkConfig();
  }, []);

  const handleSaveKey = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!keyInput.trim()) return;

    setIsSavingKey(true);
    setKeyMessage(null);
    try {
      const res = await fetch('/api/config/api-key', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ apiKey: keyInput.trim() })
      });

      if (res.ok) {
        setHasApiKey(true);
        setKeyMessage('Gemini API Key activated successfully!');
        setKeyInput('');
        setTimeout(() => {
          setShowKeyModal(false);
          setKeyMessage(null);
        }, 1200);
      } else {
        const err = await res.json();
        setKeyMessage(`Error: ${err.error || 'Failed to save key'}`);
      }
    } catch (err: any) {
      setKeyMessage(`Error: ${err?.message || 'Network error'}`);
    } finally {
      setIsSavingKey(false);
    }
  };

  return (
    <header className="bg-slate-900/90 backdrop-blur-md border-b border-slate-800 sticky top-0 z-40 text-slate-100">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between min-h-16 py-2 gap-3 flex-wrap sm:flex-nowrap">
          {/* Brand Logo & System Status */}
          <div className="flex items-center space-x-3 flex-shrink-0">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-cyan-500 via-indigo-500 to-purple-600 p-0.5 flex items-center justify-center shadow-lg shadow-cyan-500/20 flex-shrink-0">
              <div className="w-full h-full bg-slate-950 rounded-[10px] flex items-center justify-center">
                <BrainCircuit className="w-5 h-5 text-cyan-400 animate-pulse" />
              </div>
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h1 className="text-base font-bold text-slate-100 whitespace-nowrap">
                  AI Visual Memory System
                </h1>
                <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold bg-cyan-950 text-cyan-300 border border-cyan-800/50 whitespace-nowrap">
                  <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 mr-1 animate-pulse" />
                  SPATIAL AI
                </span>
              </div>
              <p className="text-xs text-slate-400 hidden lg:block whitespace-nowrap">
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
            {/* API Key Status / Configuration Button */}
            <button
              onClick={() => setShowKeyModal(true)}
              className={`flex items-center space-x-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium border transition-colors ${
                hasApiKey
                  ? 'bg-emerald-950/70 text-emerald-300 border-emerald-800/80 hover:bg-emerald-900/80'
                  : 'bg-amber-950/80 text-amber-300 border-amber-700/80 hover:bg-amber-900/80 animate-pulse'
              }`}
              title="Configure Gemini API Key"
            >
              <KeyRound className="w-3.5 h-3.5" />
              <span className="hidden sm:inline font-mono text-[11px]">
                {hasApiKey ? 'Gemini AI' : 'API Key'}
              </span>
            </button>

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

      {/* Gemini API Key Configuration Modal */}
      {showKeyModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in duration-150">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="text-sm font-bold text-slate-100 flex items-center gap-2">
                <KeyRound className="w-4 h-4 text-cyan-400" />
                Configure Google Gemini API Key
              </h3>
              <button
                onClick={() => setShowKeyModal(false)}
                className="text-slate-400 hover:text-white text-sm"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <p className="text-xs text-slate-400 leading-relaxed">
              To perform accurate real-time object detection on live webcam and video frames, enter your Google Gemini API key. Your key is stored in your local environment.
            </p>

            <form onSubmit={handleSaveKey} className="space-y-3">
              <div>
                <label className="text-[10px] font-mono text-slate-400 block mb-1">
                  GEMINI_API_KEY
                </label>
                <input
                  type="password"
                  placeholder="Paste your Gemini API key (AIzaSy...)"
                  value={keyInput}
                  onChange={(e) => setKeyInput(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-xs text-slate-100 font-mono focus:outline-none focus:border-cyan-500"
                />
              </div>

              {keyMessage && (
                <div className={`p-2.5 rounded-xl text-xs flex items-center space-x-2 ${
                  keyMessage.startsWith('Error')
                    ? 'bg-rose-950/80 text-rose-300 border border-rose-800'
                    : 'bg-emerald-950/80 text-emerald-300 border border-emerald-800'
                }`}>
                  {keyMessage.startsWith('Error') ? <AlertCircle className="w-4 h-4" /> : <Check className="w-4 h-4" />}
                  <span>{keyMessage}</span>
                </div>
              )}

              <div className="flex items-center justify-between pt-2">
                <a
                  href="https://aistudio.google.com/app/apikey"
                  target="_blank"
                  rel="noreferrer"
                  className="text-[11px] text-cyan-400 hover:underline"
                >
                  Get a free key at Google AI Studio ↗
                </a>

                <button
                  type="submit"
                  disabled={isSavingKey || !keyInput.trim()}
                  className="bg-cyan-600 hover:bg-cyan-500 disabled:opacity-50 text-slate-950 font-bold px-4 py-2 rounded-xl text-xs transition-colors flex items-center space-x-1.5"
                >
                  {isSavingKey ? 'Saving...' : 'Save & Activate'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </header>
  );
};
