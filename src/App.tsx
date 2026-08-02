import React, { useState, useEffect } from 'react';
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
  RoomCalibrationPoint
} from './types';

export default function App() {
  const [activeTab, setActiveTab] = useState<'scanner' | 'memory' | 'map' | 'chat' | 'stats'>('scanner');
  const [objects, setObjects] = useState<TrackedObject[]>([]);
  const [room, setRoom] = useState<Room>({
    id: 1,
    name: 'Main Studio',
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

  // Initial Chat Welcome Message
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([
    {
      id: 'welcome-1',
      sender: 'assistant',
      text: "Hello! I am your AI Visual Memory Assistant. I track physical objects in real-time, maintain permanent IDs across occlusions, and remember spatial floor plan coordinates.\n\nAsk me questions like:\n• \"Where is my laptop?\"\n• \"Where did I last see my phone?\"\n• \"Have you seen my bottle?\"\n• \"Find the chair.\"\n• \"How many chairs are in the room?\"",
      timestamp: new Date().toISOString()
    }
  ]);

  // Fetch initial objects & stats
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
          setRoom(rData[0]);
        }
      }
    } catch (err) {
      console.error('Failed to fetch initial state:', err);
    }
  };

  useEffect(() => {
    fetchObjectsAndStats();

    const interval = setInterval(() => {
      if (isStreaming) {
        fetchObjectsAndStats();
      }
    }, 2000);

    return () => clearInterval(interval);
  }, [isStreaming]);

  // Handle manual frame scan trigger
  const handleProcessFrame = async (frameBase64?: string) => {
    try {
      const res = await fetch('/api/process-frame', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ frameBase64, roomId: room.id })
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
          history: chatMessages.map((m) => ({ role: m.sender, content: m.text }))
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
          text: `I encountered an issue processing "${queryText}". Searching local visual memory store...`,
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
        body: JSON.stringify(item)
      });
      if (res.ok) {
        await fetchObjectsAndStats();
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
    if (window.confirm('Reset all object memories and restore initial seed memory bank?')) {
      try {
        await fetch('/api/reset-memory', { method: 'POST' });
        await fetchObjectsAndStats();
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
        setRoom((prev) => ({ ...prev, calibrationPoints: points }));
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

      {/* Minimal Footer */}
      <footer className="border-t border-slate-900 py-4 text-center text-xs text-slate-600">
        AI Visual Memory System • ByteTrack + CLIP Re-ID Engine • Powered by Gemini 3.6 Flash
      </footer>
    </div>
  );
}
