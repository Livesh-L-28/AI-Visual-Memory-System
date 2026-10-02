import React, { useState, useEffect, useRef } from 'react';
import { Navbar } from './components/Navbar';
import { LiveScannerView } from './components/LiveScannerView';
import { MemoryBankView } from './components/MemoryBankView';
import { FloorMapView } from './components/FloorMapView';
import { AIChatView } from './components/AIChatView';
import { StatsView } from './components/StatsView';
import { ObjectDetailDrawer } from './components/ObjectDetailDrawer';
import {
  TrackedObject,
  Room,
  SystemStats,
  ChatMessage,
  RoomCalibrationPoint,
  WsServerMessage
} from './types';
import { Bell, AlertTriangle, CheckCircle, Wifi, WifiOff, X } from 'lucide-react';

interface ToastAlert {
  id: string;
  type: 'lost' | 'visible' | 'info';
  title: string;
  message: string;
  timestamp: string;
}

export default function App() {
  const [activeTab, setActiveTab] = useState<'scanner' | 'memory' | 'map' | 'chat' | 'stats'>('scanner');
  const [objects, setObjects] = useState<TrackedObject[]>([]);
  const [allRooms, setAllRooms] = useState<Room[]>([]);
  const [currentRoomId, setCurrentRoomId] = useState<number>(1);
  const [room, setRoom] = useState<Room>({
    id: 1,
    name: 'Main Office Studio',
    widthMeters: 8.5,
    heightMeters: 6.0,
    calibrationPoints: [
      { pxX: 0.05, pxY: 0.1, mapX: 0.5, mapY: 0.5 },
      { pxX: 0.95, pxY: 0.1, mapX: 8.0, mapY: 0.5 },
      { pxX: 0.95, pxY: 0.9, mapX: 8.0, mapY: 5.5 },
      { pxX: 0.05, pxY: 0.9, mapX: 0.5, mapY: 5.5 }
    ]
  });
  const [stats, setStats] = useState<SystemStats | null>(null);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedObjectDrawer, setSelectedObjectDrawer] = useState<TrackedObject | null>(null);
  const [isStreaming, setIsStreaming] = useState<boolean>(true);
  const [isThinking, setIsThinking] = useState<boolean>(false);
  const [wsConnected, setWsConnected] = useState<boolean>(false);
  const [toasts, setToasts] = useState<ToastAlert[]>([]);

  const wsRef = useRef<WebSocket | null>(null);

  // Initial Chat Welcome Message
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([
    {
      id: 'welcome-1',
      sender: 'assistant',
      text: "Hello! I am your AI Visual Memory Assistant. I track physical objects in real-time, maintain permanent IDs across occlusions, and remember spatial floor plan coordinates.\n\nAsk me questions like:\n• \"Where is my laptop?\"\n• \"What objects disappeared?\"\n• \"Have you seen my bottle?\"\n• \"What is in the Workstation Desk?\"\n• \"How many chairs are in the room?\"",
      timestamp: new Date().toISOString()
    }
  ]);

  // Audio chime synthesizer for real-time perception alerts
  const playAlertSound = (type: 'lost' | 'visible') => {
    try {
      const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);

      if (type === 'lost') {
        // Two downward tones for lost
        osc.frequency.setValueAtTime(520, ctx.currentTime);
        osc.frequency.exponentialRampToValueAtTime(320, ctx.currentTime + 0.25);
        gain.gain.setValueAtTime(0.12, ctx.currentTime);
        gain.gain.linearRampToValueAtTime(0.01, ctx.currentTime + 0.28);
        osc.start();
        osc.stop(ctx.currentTime + 0.3);
      } else {
        // Upward chime for detected/visible
        osc.frequency.setValueAtTime(440, ctx.currentTime);
        osc.frequency.exponentialRampToValueAtTime(880, ctx.currentTime + 0.2);
        gain.gain.setValueAtTime(0.1, ctx.currentTime);
        gain.gain.linearRampToValueAtTime(0.01, ctx.currentTime + 0.22);
        osc.start();
        osc.stop(ctx.currentTime + 0.24);
      }
    } catch (e) {
      // AudioContext may be restricted before user gesture
    }
  };

  const addToast = (toast: Omit<ToastAlert, 'id' | 'timestamp'>) => {
    const newToast: ToastAlert = {
      ...toast,
      id: Math.random().toString(),
      timestamp: new Date().toLocaleTimeString()
    };
    setToasts((prev) => [newToast, ...prev.slice(0, 3)]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== newToast.id));
    }, 4500);
  };

  // Fetch initial objects, rooms, and stats
  const fetchObjectsAndStats = async () => {
    try {
      const [objRes, statsRes, roomsRes] = await Promise.all([
        fetch('/api/objects'),
        fetch('/api/stats'),
        fetch('/api/rooms')
      ]);

      if (objRes.ok) {
        const data = await objRes.json();
        setObjects(Array.isArray(data) ? data : []);
      }
      if (statsRes.ok) {
        const sData = await statsRes.json();
        setStats(sData);
      }
      if (roomsRes.ok) {
        const rData = await roomsRes.json();
        if (Array.isArray(rData) && rData.length > 0) {
          setAllRooms(rData);
          const active = rData.find((r: Room) => r.id === currentRoomId) || rData[0];
          setRoom(active);
        }
      }
    } catch (err) {
      console.error('Failed to fetch initial state:', err);
    }
  };

  // WebSocket Live Connection
  useEffect(() => {
    fetchObjectsAndStats();

    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const wsUrl = `${protocol}//${window.location.host}/api/camera/stream`;

    let reconnectTimer: NodeJS.Timeout | null = null;

    const connectWebSocket = () => {
      try {
        const ws = new WebSocket(wsUrl);
        wsRef.current = ws;

        ws.onopen = () => {
          setWsConnected(true);
        };

        ws.onmessage = (event) => {
          try {
            const data: WsServerMessage = JSON.parse(event.data);

            if (data.type === 'telemetry_tick') {
              setStats(data.stats);
            } else if (data.type === 'objects_updated') {
              setObjects(data.objects);
              if (data.stats) setStats(data.stats);
            } else if (data.type === 'object_status_changed') {
              if (data.status === 'lost') {
                playAlertSound('lost');
                addToast({
                  type: 'lost',
                  title: `Object Disappeared: #${data.objectId} ${data.className.toUpperCase()}`,
                  message: `Lost from sight near ${data.zone || 'coordinates'} (${data.lastLocationX}m, ${data.lastLocationY}m)`
                });
              } else if (data.status === 'visible') {
                playAlertSound('visible');
                addToast({
                  type: 'visible',
                  title: `Object Re-identified: #${data.objectId} ${data.className.toUpperCase()}`,
                  message: `Visible again in ${data.zone || 'Room'} at (${data.lastLocationX}m, ${data.lastLocationY}m)`
                });
              }
              // Refresh object state
              fetchObjectsAndStats();
            }
          } catch (e) {
            // Ignore parse errors
          }
        };

        ws.onclose = () => {
          setWsConnected(false);
          reconnectTimer = setTimeout(connectWebSocket, 3000);
        };

        ws.onerror = () => {
          ws.close();
        };
      } catch (err) {
        setWsConnected(false);
        reconnectTimer = setTimeout(connectWebSocket, 4000);
      }
    };

    connectWebSocket();

    // Fallback polling every 8 seconds if WebSocket is not connected
    const fallbackInterval = setInterval(() => {
      if (!wsConnected && isStreaming) {
        fetchObjectsAndStats();
      }
    }, 8000);

    return () => {
      if (reconnectTimer) clearTimeout(reconnectTimer);
      clearInterval(fallbackInterval);
      if (wsRef.current) wsRef.current.close();
    };
  }, []);

  // Update room when room ID changes
  const handleSelectRoom = (roomId: number) => {
    setCurrentRoomId(roomId);
    const found = allRooms.find((r) => r.id === roomId);
    if (found) {
      setRoom(found);
    }
  };

  // Handle manual frame scan trigger
  const handleProcessFrame = async (frameBase64?: string, customDetections?: any[]) => {
    try {
      const res = await fetch('/api/process-frame', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ frameBase64, customDetections, roomId: room.id })
      });
      if (res.ok) {
        const data = await res.json();
        await fetchObjectsAndStats();
        return data;
      }
    } catch (e) {
      console.error('Error processing frame:', e);
    }
  };

  // Handle AI Chat Query
  const handleSendChatMessage = async (queryText: string) => {
    const userMsg: ChatMessage = {
      id: Date.now().toString(),
      sender: 'user',
      text: queryText,
      timestamp: new Date().toISOString()
    };

    setChatMessages((prev) => [...prev, userMsg]);
    setIsThinking(true);

    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          query: queryText,
          history: chatMessages.slice(-6).map((m) => ({ role: m.sender, content: m.text }))
        })
      });

      if (res.ok) {
        const data = await res.json();
        const assistantMsg: ChatMessage = {
          id: (Date.now() + 1).toString(),
          sender: 'assistant',
          text: data.answer,
          timestamp: new Date().toISOString(),
          searchResults: data.searchResults,
          referencedObject: data.referencedObject
        };
        setChatMessages((prev) => [...prev, assistantMsg]);
      } else {
        throw new Error('API error');
      }
    } catch (err) {
      setChatMessages((prev) => [
        ...prev,
        {
          id: (Date.now() + 1).toString(),
          sender: 'assistant',
          text: `Searching local visual memory store for "${queryText}"...`,
          timestamp: new Date().toISOString()
        }
      ]);
    } finally {
      setIsThinking(false);
    }
  };

  // Handle Add Custom Object
  const handleAddObject = async (item: { className: string; description: string; lastLocationX: number; lastLocationY: number }) => {
    try {
      const res = await fetch('/api/memory/add', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...item, roomId: room.id })
      });
      if (res.ok) {
        await fetchObjectsAndStats();
        addToast({
          type: 'visible',
          title: `Object Registered: ${item.className}`,
          message: `Manually added to ${room.name}`
        });
      }
    } catch (err) {
      console.error('Add object error:', err);
    }
  };

  // Handle Delete Object
  const handleDeleteObject = async (id: number) => {
    try {
      const res = await fetch(`/api/memory/${id}`, {
        method: 'DELETE'
      });
      if (res.ok) {
        await fetchObjectsAndStats();
        if (selectedObjectDrawer?.id === id) {
          setSelectedObjectDrawer(null);
        }
      }
    } catch (err) {
      console.error('Delete object error:', err);
    }
  };

  // Handle Reset Memory
  const handleResetMemory = async () => {
    if (window.confirm('Reset all object memories and restore default visual memory state?')) {
      try {
        await fetch('/api/reset-memory', { method: 'POST' });
        await fetchObjectsAndStats();
        addToast({
          type: 'info',
          title: 'Memory Bank Reset',
          message: 'All physical memory banks restored to initial state.'
        });
      } catch (err) {
        console.error('Reset error:', err);
      }
    }
  };

  // Handle Room Calibration
  const handleCalibrateRoom = async (points: RoomCalibrationPoint[]) => {
    try {
      const res = await fetch('/api/rooms/calibrate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ roomId: room.id, calibrationPoints: points })
      });
      if (res.ok) {
        const data = await res.json();
        setRoom((prev) => ({ ...prev, calibrationPoints: points }));
        addToast({
          type: 'info',
          title: 'Homography Calibrated',
          message: '3x3 camera matrix updated successfully.'
        });
      }
    } catch (e) {
      console.error('Calibration error:', e);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 font-sans selection:bg-cyan-500 selection:text-slate-950 flex flex-col">
      {/* App Header */}
      <Navbar
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        stats={stats}
        onResetMemory={handleResetMemory}
        isStreaming={isStreaming}
        toggleStream={() => setIsStreaming(!isStreaming)}
      />

      {/* Real-time Status & WebSocket Indicator Bar */}
      <div className="bg-slate-900/60 border-b border-slate-800/80 px-4 py-1.5 flex items-center justify-between text-[11px] font-mono">
        <div className="flex items-center space-x-3">
          <span className="flex items-center space-x-1.5 text-slate-400">
            {wsConnected ? (
              <>
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
                <span className="text-emerald-400 font-medium">WS Real-time Synced</span>
              </>
            ) : (
              <>
                <span className="w-2 h-2 rounded-full bg-amber-400" />
                <span className="text-amber-400">Polling Mode (Offline WS)</span>
              </>
            )}
          </span>
          <span className="text-slate-600">|</span>
          <span className="text-slate-400">
            Room: <strong className="text-cyan-300 font-sans">{room.name}</strong>
          </span>
        </div>

        <div className="flex items-center space-x-2">
          <span className="text-slate-400">
            Active: <span className="text-emerald-400 font-bold">{objects.filter((o) => o.status === 'visible').length}</span>
          </span>
          <span className="text-slate-600">|</span>
          <span className="text-slate-400">
            Lost: <span className="text-amber-400 font-bold">{objects.filter((o) => o.status === 'lost').length}</span>
          </span>
        </div>
      </div>

      {/* Floating Perception Event Toasts */}
      <div className="fixed top-16 right-4 z-50 space-y-2 max-w-sm pointer-events-none">
        {toasts.map((t) => (
          <div
            key={t.id}
            className={`pointer-events-auto p-3 rounded-xl border shadow-2xl backdrop-blur-md flex items-start space-x-3 transition-all animate-in slide-in-from-right duration-200 ${
              t.type === 'lost'
                ? 'bg-amber-950/90 border-amber-600/70 text-amber-100'
                : t.type === 'visible'
                ? 'bg-emerald-950/90 border-emerald-600/70 text-emerald-100'
                : 'bg-slate-900/90 border-slate-700 text-slate-100'
            }`}
          >
            <div className="mt-0.5">
              {t.type === 'lost' ? (
                <AlertTriangle className="w-4 h-4 text-amber-400" />
              ) : t.type === 'visible' ? (
                <CheckCircle className="w-4 h-4 text-emerald-400" />
              ) : (
                <Bell className="w-4 h-4 text-cyan-400" />
              )}
            </div>
            <div className="flex-1 text-xs">
              <div className="font-bold flex items-center justify-between">
                <span>{t.title}</span>
                <span className="text-[10px] opacity-60 font-mono ml-2">{t.timestamp}</span>
              </div>
              <p className="opacity-90 text-[11px] mt-0.5">{t.message}</p>
            </div>
            <button
              onClick={() => setToasts((prev) => prev.filter((x) => x.id !== t.id))}
              className="text-slate-400 hover:text-white"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        ))}
      </div>

      {/* Main App Container */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {activeTab === 'scanner' && (
          <LiveScannerView
            trackedObjects={objects}
            onProcessFrame={handleProcessFrame}
            onSelectObject={(obj) => setSelectedObjectDrawer(obj)}
            isStreaming={isStreaming}
          />
        )}

        {activeTab === 'memory' && (
          <MemoryBankView
            objects={objects}
            onSelectObject={(obj) => setSelectedObjectDrawer(obj)}
            searchQuery={searchQuery}
            setSearchQuery={setSearchQuery}
            onAddObject={handleAddObject}
            onDeleteObject={handleDeleteObject}
          />
        )}

        {activeTab === 'map' && (
          <FloorMapView
            objects={objects}
            room={room}
            rooms={allRooms}
            onSelectRoom={handleSelectRoom}
            onSelectObject={(obj) => setSelectedObjectDrawer(obj)}
            onCalibrateRoom={handleCalibrateRoom}
          />
        )}

        {activeTab === 'chat' && (
          <AIChatView
            messages={chatMessages}
            onSendMessage={handleSendChatMessage}
            isThinking={isThinking}
            onSelectObject={(obj) => setSelectedObjectDrawer(obj)}
          />
        )}

        {activeTab === 'stats' && <StatsView stats={stats} />}
      </main>

      {/* Object Detail History Drawer */}
      <ObjectDetailDrawer
        object={selectedObjectDrawer}
        onClose={() => setSelectedObjectDrawer(null)}
      />

      {/* Footer */}
      <footer className="border-t border-slate-900 py-4 text-center text-xs text-slate-500">
        AI Visual Memory & Spatial Tracking System • Real-Time Projective Re-ID Engine • Powered by Gemini Flash
      </footer>
    </div>
  );
}
