import React, { useEffect, useState } from 'react';
import {
  X,
  MapPin,
  Clock,
  History,
  AlertTriangle,
  CheckCircle2,
  BrainCircuit,
  Maximize2
} from 'lucide-react';
import { TrackedObject, DetectionHistoryEntry } from '../types';

interface ObjectDetailDrawerProps {
  object: TrackedObject | null;
  onClose: () => void;
}

export const ObjectDetailDrawer: React.FC<ObjectDetailDrawerProps> = ({ object, onClose }) => {
  const [history, setHistory] = useState<DetectionHistoryEntry[]>([]);
  const [loading, setLoading] = useState<boolean>(false);

  useEffect(() => {
    if (object) {
      setLoading(true);
      fetch(`/api/objects/${object.id}/history`)
        .then((res) => res.json())
        .then((data) => {
          setHistory(Array.isArray(data) ? data : []);
        })
        .catch((err) => console.error('Failed to fetch history:', err))
        .finally(() => setLoading(false));
    }
  }, [object]);

  if (!object) return null;

  const isVisible = object.status === 'visible';

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-md flex justify-end p-0 sm:p-4 animate-fade-in">
      <div className="bg-slate-900 border-l sm:border border-slate-800 w-full max-w-md h-full sm:rounded-2xl p-6 flex flex-col justify-between space-y-6 shadow-2xl overflow-y-auto">
        {/* Header */}
        <div className="space-y-4">
          <div className="flex items-center justify-between border-b border-slate-800 pb-4">
            <div className="flex items-center space-x-2">
              <span className="text-xs font-mono font-bold bg-cyan-950 text-cyan-300 px-2.5 py-1 rounded-md border border-cyan-800/80">
                #OBJ-{object.id}
              </span>
              {isVisible ? (
                <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium bg-emerald-950 text-emerald-300 border border-emerald-800/80">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 mr-1 animate-pulse" />
                  VISIBLE
                </span>
              ) : (
                <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium bg-amber-950 text-amber-300 border border-amber-800/80">
                  <AlertTriangle className="w-3 h-3 mr-1 text-amber-400" />
                  LOST
                </span>
              )}
            </div>

            <button
              onClick={onClose}
              className="p-1.5 rounded-lg text-slate-400 hover:text-slate-100 hover:bg-slate-800 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Thumbnail Image */}
          <div className="rounded-xl overflow-hidden aspect-video bg-slate-950 border border-slate-800 shadow-md">
            <img
              src={object.thumbnailPath}
              alt={object.className}
              className="w-full h-full object-cover"
            />
          </div>

          {/* Object Title & Description */}
          <div>
            <h3 className="text-lg font-bold text-slate-100 uppercase tracking-wide">
              {object.className}
            </h3>
            <p className="text-xs text-slate-400 mt-1">{object.description}</p>
          </div>

          {/* Metrics Grid */}
          <div className="grid grid-cols-2 gap-3 bg-slate-950 p-3 rounded-xl border border-slate-800 text-xs font-mono">
            <div>
              <span className="text-slate-500 text-[10px] block">Floor Coordinates</span>
              <span className="text-cyan-300 font-bold">
                X:{object.lastLocationX}m, Y:{object.lastLocationY}m
              </span>
            </div>
            <div>
              <span className="text-slate-500 text-[10px] block">Re-ID Match Score</span>
              <span className="text-emerald-400 font-bold">
                {Math.round(object.recentConfidence * 100)}%
              </span>
            </div>
            <div>
              <span className="text-slate-500 text-[10px] block">First Seen</span>
              <span className="text-slate-300 text-[11px]">
                {new Date(object.firstSeen).toLocaleTimeString()}
              </span>
            </div>
            <div>
              <span className="text-slate-500 text-[10px] block">Last Observed</span>
              <span className="text-slate-300 text-[11px]">
                {new Date(object.lastSeen).toLocaleTimeString()}
              </span>
            </div>
          </div>

          {/* Observation History Timeline */}
          <div className="space-y-3 pt-2">
            <h4 className="text-xs font-bold text-slate-200 flex items-center gap-1.5 uppercase tracking-wider">
              <History className="w-3.5 h-3.5 text-cyan-400" />
              Observation Trajectory ({history.length} frames)
            </h4>

            {loading ? (
              <div className="text-xs text-slate-500 py-4 text-center">
                Loading history timeline...
              </div>
            ) : (
              <div className="space-y-2 max-h-[220px] overflow-y-auto pr-1">
                {history.map((h) => (
                  <div
                    key={h.id}
                    className="p-2.5 rounded-lg bg-slate-950 border border-slate-800/80 text-[11px] font-mono flex items-center justify-between text-slate-300"
                  >
                    <div>
                      <div className="text-slate-200">Frame #{h.frameId}</div>
                      <div className="text-[10px] text-slate-500">
                        {new Date(h.timestamp).toLocaleTimeString()}
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-cyan-300">
                        X:{h.locationX}m, Y:{h.locationY}m
                      </div>
                      <div className="text-emerald-400 text-[10px]">
                        {Math.round(h.confidence * 100)}% Conf
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Action Button */}
        <button
          onClick={onClose}
          className="w-full bg-slate-800 hover:bg-slate-700 text-slate-200 py-2.5 rounded-xl text-xs font-medium border border-slate-700 transition-colors"
        >
          Close Drawer
        </button>
      </div>
    </div>
  );
};
