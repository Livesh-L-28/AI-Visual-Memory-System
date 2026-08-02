import React, { useState } from 'react';
import {
  BrainCircuit,
  Search,
  CheckCircle2,
  AlertTriangle,
  Clock,
  MapPin,
  History,
  Layers,
  ChevronRight,
  Filter,
  Plus,
  Download,
  Trash2,
  X,
  PlusCircle,
  FileSpreadsheet,
  FileJson
} from 'lucide-react';
import { TrackedObject, ObjectStatus } from '../types';

interface MemoryBankViewProps {
  objects: TrackedObject[];
  onSelectObject: (object: TrackedObject) => void;
  searchQuery: string;
  setSearchQuery: (query: string) => void;
  onAddObject?: (item: { className: string; description: string; lastLocationX: number; lastLocationY: number }) => Promise<void>;
  onDeleteObject?: (id: number) => Promise<void>;
}

export const MemoryBankView: React.FC<MemoryBankViewProps> = ({
  objects,
  onSelectObject,
  searchQuery,
  setSearchQuery,
  onAddObject,
  onDeleteObject
}) => {
  const [filterStatus, setFilterStatus] = useState<'all' | 'visible' | 'lost'>('all');
  const [showAddModal, setShowAddModal] = useState<boolean>(false);
  const [newClassName, setNewClassName] = useState<string>('');
  const [newDescription, setNewDescription] = useState<string>('');
  const [newLocX, setNewLocX] = useState<number>(2.5);
  const [newLocY, setNewLocY] = useState<number>(3.0);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  // Filter objects based on status and search query
  const filteredObjects = objects.filter((obj) => {
    const matchesStatus = filterStatus === 'all' || obj.status === filterStatus;
    const q = searchQuery.toLowerCase().trim();
    const matchesQuery =
      !q ||
      obj.className.toLowerCase().includes(q) ||
      `#obj-${obj.id}`.includes(q) ||
      (obj.description && obj.description.toLowerCase().includes(q));
    return matchesStatus && matchesQuery;
  });

  const visibleCount = objects.filter((o) => o.status === 'visible').length;
  const lostCount = objects.filter((o) => o.status === 'lost').length;

  const handleAddSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newClassName.trim()) return;
    setIsSubmitting(true);
    try {
      if (onAddObject) {
        await onAddObject({
          className: newClassName.trim(),
          description: newDescription.trim() || `Manually registered ${newClassName} item`,
          lastLocationX: newLocX,
          lastLocationY: newLocY
        });
      }
      setNewClassName('');
      setNewDescription('');
      setShowAddModal(false);
    } catch (err) {
      console.error(err);
    } finally {
      setIsSubmitting(false);
    }
  };

  const exportJSON = () => {
    const jsonStr = JSON.stringify(objects, null, 2);
    const blob = new Blob([jsonStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `spatial_memory_bank_${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const exportCSV = () => {
    const headers = ['ID', 'Class', 'Status', 'LocationX', 'LocationY', 'LastSeen', 'Description'];
    const rows = objects.map((o) => [
      o.id,
      `"${o.className}"`,
      o.status,
      o.lastLocationX,
      o.lastLocationY,
      `"${o.lastSeen}"`,
      `"${(o.description || '').replace(/"/g, '""')}"`
    ]);
    const csvContent = [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `spatial_memory_bank_${Date.now()}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6">
      {/* Search & Memory Stats Header */}
      <div className="bg-slate-900/80 rounded-2xl border border-slate-800 p-5 space-y-4 shadow-xl">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center space-x-3">
            <div className="p-3 rounded-xl bg-indigo-950/80 text-indigo-400 border border-indigo-800/60">
              <BrainCircuit className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-100 flex items-center gap-2">
                Permanent Object Memory Bank
                <span className="px-2 py-0.5 rounded-full text-xs bg-slate-800 text-cyan-300 font-mono">
                  FAISS INDEX: {objects.length} VECTORS
                </span>
              </h2>
              <p className="text-xs text-slate-400">
                Persistent re-identified physical objects with spatial history and CLIP feature vectors
              </p>
            </div>
          </div>

          {/* Action Buttons: Add Item & Export */}
          <div className="flex items-center space-x-2">
            <button
              onClick={() => setShowAddModal(true)}
              className="flex items-center space-x-1.5 bg-cyan-600 hover:bg-cyan-500 text-white px-3.5 py-2 rounded-xl text-xs font-semibold transition-colors shadow-md shadow-cyan-950/40"
            >
              <Plus className="w-4 h-4" />
              <span>Register Object</span>
            </button>

            <button
              onClick={exportJSON}
              title="Export Memory JSON"
              className="flex items-center space-x-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 px-3 py-2 rounded-xl text-xs font-medium border border-slate-700 transition-colors"
            >
              <FileJson className="w-4 h-4 text-cyan-400" />
              <span className="hidden sm:inline">JSON</span>
            </button>

            <button
              onClick={exportCSV}
              title="Export Memory CSV"
              className="flex items-center space-x-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 px-3 py-2 rounded-xl text-xs font-medium border border-slate-700 transition-colors"
            >
              <FileSpreadsheet className="w-4 h-4 text-emerald-400" />
              <span className="hidden sm:inline">CSV</span>
            </button>
          </div>
        </div>

        {/* Search Bar & Filter Row */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 border-t border-slate-800/80 pt-4">
          <div className="relative flex-1 max-w-md">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search memory (e.g., 'laptop', 'phone', 'bottle', '#OBJ-1')..."
              className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-9 pr-4 py-2 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-cyan-500 transition-colors"
            />
          </div>

          <div className="flex items-center space-x-2 text-xs">
            <span className="text-slate-500 hidden md:inline">Status:</span>
            <button
              onClick={() => setFilterStatus('all')}
              className={`px-3 py-1.5 rounded-lg transition-all ${
                filterStatus === 'all'
                  ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 font-medium'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
              }`}
            >
              All ({objects.length})
            </button>
            <button
              onClick={() => setFilterStatus('visible')}
              className={`px-3 py-1.5 rounded-lg transition-all flex items-center space-x-1.5 ${
                filterStatus === 'visible'
                  ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 font-medium'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
              }`}
            >
              <span className="w-2 h-2 rounded-full bg-emerald-400" />
              <span>Visible ({visibleCount})</span>
            </button>
            <button
              onClick={() => setFilterStatus('lost')}
              className={`px-3 py-1.5 rounded-lg transition-all flex items-center space-x-1.5 ${
                filterStatus === 'lost'
                  ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40 font-medium'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
              }`}
            >
              <span className="w-2 h-2 rounded-full bg-amber-400" />
              <span>Lost ({lostCount})</span>
            </button>
          </div>
        </div>
      </div>

      {/* Grid of Permanent Object Memory Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {filteredObjects.map((obj) => {
          const isVisible = obj.status === 'visible';
          const relativeLastSeen = new Date(obj.lastSeen).toLocaleTimeString([], {
            hour: '2-digit',
            minute: '2-digit'
          });

          return (
            <div
              key={obj.id}
              onClick={() => onSelectObject(obj)}
              className="bg-slate-900/80 rounded-2xl border border-slate-800 hover:border-cyan-500/60 transition-all p-4 flex flex-col justify-between space-y-3 cursor-pointer group hover:shadow-xl hover:shadow-cyan-950/20 relative"
            >
              <div className="space-y-3">
                {/* Thumbnail & Status Badge */}
                <div className="relative rounded-xl overflow-hidden aspect-video bg-slate-950 border border-slate-800">
                  <img
                    src={obj.thumbnailPath}
                    alt={obj.className}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                  />
                  <div className="absolute top-2 left-2 flex items-center space-x-1.5 bg-slate-950/80 backdrop-blur-md px-2.5 py-1 rounded-md border border-slate-800 text-[11px] font-mono font-bold text-slate-100">
                    <span>#OBJ-{obj.id}</span>
                  </div>

                  <div className="absolute top-2 right-2 flex items-center space-x-1">
                    {isVisible ? (
                      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium bg-emerald-950/90 text-emerald-300 border border-emerald-800/80">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 mr-1 animate-pulse" />
                        VISIBLE
                      </span>
                    ) : (
                      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium bg-amber-950/90 text-amber-300 border border-amber-800/80">
                        <AlertTriangle className="w-3 h-3 mr-1 text-amber-400" />
                        LOST
                      </span>
                    )}

                    {onDeleteObject && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          if (confirm(`Remove #OBJ-${obj.id} (${obj.className}) from memory?`)) {
                            onDeleteObject(obj.id);
                          }
                        }}
                        className="p-1 rounded-md bg-slate-950/80 text-slate-400 hover:text-rose-400 border border-slate-800 transition-colors"
                        title="Delete from memory bank"
                      >
                        <Trash2 className="w-3 h-3" />
                      </button>
                    )}
                  </div>
                </div>

                {/* Class Title & Description */}
                <div>
                  <h3 className="text-sm font-bold text-slate-100 group-hover:text-cyan-300 transition-colors uppercase tracking-wide">
                    {obj.className}
                  </h3>
                  <p className="text-xs text-slate-400 line-clamp-2 mt-1 font-sans">
                    {obj.description || `Re-identified ${obj.className} object in main space.`}
                  </p>
                </div>
              </div>

              {/* Spatial Location & Observation History Footer */}
              <div className="border-t border-slate-800/80 pt-3 space-y-2 text-xs text-slate-400 font-mono">
                <div className="flex items-center justify-between">
                  <span className="flex items-center space-x-1 text-slate-400">
                    <MapPin className="w-3.5 h-3.5 text-cyan-400" />
                    <span>Location:</span>
                  </span>
                  <span className="text-slate-200 font-semibold">
                    X:{obj.lastLocationX}m, Y:{obj.lastLocationY}m
                  </span>
                </div>

                <div className="flex items-center justify-between">
                  <span className="flex items-center space-x-1 text-slate-400">
                    <Clock className="w-3.5 h-3.5 text-indigo-400" />
                    <span>Last Seen:</span>
                  </span>
                  <span className="text-slate-300">{relativeLastSeen}</span>
                </div>

                <div className="flex items-center justify-between pt-1">
                  <span className="flex items-center space-x-1 text-slate-500 text-[10px]">
                    <History className="w-3 h-3" />
                    <span>{obj.historyCount || 1} Observations</span>
                  </span>

                  <span className="text-cyan-400 text-xs font-medium flex items-center space-x-1 group-hover:translate-x-1 transition-transform">
                    <span>Timeline</span>
                    <ChevronRight className="w-3.5 h-3.5" />
                  </span>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {filteredObjects.length === 0 && (
        <div className="text-center py-16 bg-slate-900/40 rounded-2xl border border-slate-800 space-y-3">
          <BrainCircuit className="w-10 h-10 text-slate-600 mx-auto" />
          <h3 className="text-sm font-semibold text-slate-300">No objects found in visual memory</h3>
          <p className="text-xs text-slate-500 max-w-sm mx-auto">
            Try adjusting your search query or click "Register Object" to log a new item into the spatial memory bank.
          </p>
        </div>
      )}

      {/* Modal Dialog for Registering New Memory Item */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-md w-full p-6 space-y-5 shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="text-base font-bold text-slate-100 flex items-center gap-2">
                <PlusCircle className="w-5 h-5 text-cyan-400" />
                Register Object to Spatial Memory
              </h3>
              <button
                onClick={() => setShowAddModal(false)}
                className="text-slate-400 hover:text-slate-100 text-sm font-bold"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleAddSubmit} className="space-y-4 text-xs font-sans">
              <div>
                <label className="block text-slate-300 font-medium mb-1">Object Name / Category *</label>
                <input
                  type="text"
                  required
                  value={newClassName}
                  onChange={(e) => setNewClassName(e.target.value)}
                  placeholder="e.g. Keys, Wallet, Backpack, Passport, Headphones"
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-slate-100 placeholder-slate-500 focus:outline-none focus:border-cyan-500"
                />
              </div>

              <div>
                <label className="block text-slate-300 font-medium mb-1">Description & Visual Features</label>
                <textarea
                  rows={2}
                  value={newDescription}
                  onChange={(e) => setNewDescription(e.target.value)}
                  placeholder="e.g. Black leather folding wallet with silver keychain"
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-slate-100 placeholder-slate-500 focus:outline-none focus:border-cyan-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3 font-mono">
                <div>
                  <label className="block text-slate-300 text-[11px] mb-1">Floor X (Meters)</label>
                  <input
                    type="number"
                    step="0.1"
                    value={newLocX}
                    onChange={(e) => setNewLocX(parseFloat(e.target.value) || 0)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-slate-100"
                  />
                </div>
                <div>
                  <label className="block text-slate-300 text-[11px] mb-1">Floor Y (Meters)</label>
                  <input
                    type="number"
                    step="0.1"
                    value={newLocY}
                    onChange={(e) => setNewLocY(parseFloat(e.target.value) || 0)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-slate-100"
                  />
                </div>
              </div>

              <div className="flex items-center justify-end space-x-3 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2 rounded-xl text-slate-400 hover:text-slate-200"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting || !newClassName.trim()}
                  className="bg-cyan-600 hover:bg-cyan-500 text-white px-5 py-2 rounded-xl font-semibold transition-colors disabled:opacity-50"
                >
                  {isSubmitting ? 'Registering...' : 'Save to Memory'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

