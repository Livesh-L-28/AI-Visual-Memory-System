import React, { useState, useRef, useEffect } from 'react';
import {
  Compass,
  SlidersHorizontal,
  Layers,
  Crosshair,
  Route,
  Move,
  Check,
  RotateCcw,
  Sparkles,
  Info
} from 'lucide-react';
import { TrackedObject, Room, RoomCalibrationPoint } from '../types';

interface FloorMapViewProps {
  objects: TrackedObject[];
  room: Room;
  rooms?: Room[];
  onSelectRoom?: (id: number) => void;
  onSelectObject: (object: TrackedObject) => void;
  onCalibrateRoom: (points: RoomCalibrationPoint[]) => void;
}

export const FloorMapView: React.FC<FloorMapViewProps> = ({
  objects,
  room,
  rooms = [],
  onSelectRoom,
  onSelectObject,
  onCalibrateRoom
}) => {
  const [selectedObjectId, setSelectedObjectId] = useState<number | null>(null);
  const [showCalibrationModal, setShowCalibrationModal] = useState<boolean>(false);
  const [calibPoints, setCalibPoints] = useState<RoomCalibrationPoint[]>(room.calibrationPoints);
  const [showTrajectories, setShowTrajectories] = useState<boolean>(true);
  const [showZones, setShowZones] = useState<boolean>(true);
  const [isDraggingPin, setIsDraggingPin] = useState<number | null>(null);

  const mapStageRef = useRef<HTMLDivElement | null>(null);

  const roomWidth = room.widthMeters || 8.5;
  const roomHeight = room.heightMeters || 6.0;

  useEffect(() => {
    setCalibPoints(room.calibrationPoints);
  }, [room]);

  const handleSaveCalibration = () => {
    onCalibrateRoom(calibPoints);
    setShowCalibrationModal(false);
  };

  // Dragging pin across floor map to manually adjust coordinates
  const handleMapPointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!isDraggingPin || !mapStageRef.current) return;
    const rect = mapStageRef.current.getBoundingClientRect();
    const clientX = e.clientX - rect.left;
    const clientY = e.clientY - rect.top;

    const normX = Math.max(0, Math.min(1, clientX / rect.width));
    const normY = Math.max(0, Math.min(1, clientY / rect.height));

    const newX = Number((normX * roomWidth).toFixed(2));
    const newY = Number((normY * roomHeight).toFixed(2));

    const targetObj = objects.find((o) => o.id === isDraggingPin);
    if (targetObj) {
      targetObj.lastLocationX = newX;
      targetObj.lastLocationY = newY;
    }
  };

  const handleMapPointerUp = async () => {
    if (isDraggingPin) {
      const targetObj = objects.find((o) => o.id === isDraggingPin);
      if (targetObj) {
        try {
          await fetch(`/api/memory/${targetObj.id}/location`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ x: targetObj.lastLocationX, y: targetObj.lastLocationY })
          });
        } catch (e) {
          console.error('Failed to update object location:', e);
        }
      }
      setIsDraggingPin(null);
    }
  };

  const selectedObj = objects.find((o) => o.id === selectedObjectId);

  return (
    <div className="space-y-6">
      {/* Top Map Header & Controls */}
      <div className="bg-slate-900/80 rounded-2xl border border-slate-800 p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 shadow-xl">
        <div className="flex items-center space-x-3">
          <div className="p-3 rounded-xl bg-cyan-950/80 text-cyan-400 border border-cyan-800/60">
            <Compass className="w-6 h-6 animate-spin-slow" />
          </div>
          <div>
            <h2 className="text-base font-bold text-slate-100 flex items-center gap-2">
              2D Spatial Floor Plan Map
              <span className="px-2 py-0.5 rounded-md text-xs bg-slate-800 text-cyan-300 font-mono">
                {room.name} ({roomWidth}m × {roomHeight}m)
              </span>
            </h2>
            <p className="text-xs text-slate-400">
              Direct Linear Transformation (DLT) mapping camera pixels to physical ground coordinates
            </p>
          </div>
        </div>

        {/* Room Switcher & Action Toggles */}
        <div className="flex items-center space-x-2 flex-wrap gap-y-2">
          {rooms.length > 1 && onSelectRoom && (
            <div className="bg-slate-950 p-1 rounded-xl border border-slate-800 flex items-center text-xs">
              {rooms.map((r) => (
                <button
                  key={r.id}
                  onClick={() => onSelectRoom(r.id)}
                  className={`px-3 py-1.5 rounded-lg transition-all ${
                    room.id === r.id
                      ? 'bg-slate-800 text-cyan-300 font-medium'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  {r.name}
                </button>
              ))}
            </div>
          )}

          <button
            onClick={() => setShowTrajectories(!showTrajectories)}
            className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-xl text-xs font-medium border transition-colors ${
              showTrajectories
                ? 'bg-cyan-950/80 text-cyan-300 border-cyan-700/60'
                : 'bg-slate-800 text-slate-400 border-slate-700 hover:text-slate-200'
            }`}
          >
            <Route className="w-3.5 h-3.5" />
            <span>Trails</span>
          </button>

          <button
            onClick={() => setShowZones(!showZones)}
            className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-xl text-xs font-medium border transition-colors ${
              showZones
                ? 'bg-purple-950/80 text-purple-300 border-purple-700/60'
                : 'bg-slate-800 text-slate-400 border-slate-700 hover:text-slate-200'
            }`}
          >
            <Layers className="w-3.5 h-3.5" />
            <span>Zones</span>
          </button>

          <button
            onClick={() => setShowCalibrationModal(true)}
            className="flex items-center space-x-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 px-3 py-1.5 rounded-xl text-xs font-medium border border-slate-700 transition-colors"
          >
            <SlidersHorizontal className="w-3.5 h-3.5 text-cyan-400" />
            <span>Calibrate Matrix</span>
          </button>
        </div>
      </div>

      {/* Main Floor Plan Grid Canvas Container */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Floor Map Interactive Stage */}
        <div
          ref={mapStageRef}
          onPointerMove={handleMapPointerMove}
          onPointerUp={handleMapPointerUp}
          className="lg:col-span-3 bg-slate-950 rounded-2xl border border-slate-800 p-6 relative overflow-hidden shadow-2xl min-h-[480px] flex flex-col justify-between select-none"
        >
          {/* Dynamic Architectural Room Zones Layer */}
          {showZones && room.zones && (
            <div className="absolute inset-0 pointer-events-none">
              {room.zones.map((zone) => {
                const left = (zone.x1 / roomWidth) * 100;
                const top = (zone.y1 / roomHeight) * 100;
                const width = ((zone.x2 - zone.x1) / roomWidth) * 100;
                const height = ((zone.y2 - zone.y1) / roomHeight) * 100;
                const count = objects.filter(
                  (o) =>
                    o.status === 'visible' &&
                    o.lastLocationX >= zone.x1 &&
                    o.lastLocationX <= zone.x2 &&
                    o.lastLocationY >= zone.y1 &&
                    o.lastLocationY <= zone.y2
                ).length;

                return (
                  <div
                    key={zone.id}
                    style={{
                      left: `${left}%`,
                      top: `${top}%`,
                      width: `${width}%`,
                      height: `${height}%`,
                      borderColor: zone.color,
                      backgroundColor: `${zone.color}10`
                    }}
                    className="absolute border border-dashed rounded-xl p-2.5 flex flex-col justify-between"
                  >
                    <div className="flex items-center justify-between">
                      <span
                        style={{ color: zone.color }}
                        className="text-[10px] font-mono font-bold tracking-wider"
                      >
                        {zone.name.toUpperCase()}
                      </span>
                      <span className="text-[9px] font-mono px-1.5 py-0.5 rounded bg-slate-900/80 text-slate-300 border border-slate-800">
                        {count} active
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* Grid Measure Scale Overlay */}
          <div className="absolute inset-0 grid grid-cols-8 grid-rows-6 pointer-events-none">
            {Array.from({ length: 48 }).map((_, i) => (
              <div key={i} className="border-[0.5px] border-slate-800/40" />
            ))}
          </div>

          {/* SVG Trajectory Lines Layer */}
          {showTrajectories && (
            <svg className="absolute inset-0 w-full h-full pointer-events-none z-10">
              {objects.map((obj) => {
                const trajectory = obj.trajectory || [];
                if (trajectory.length < 2) return null;

                const pointsStr = trajectory
                  .map((pt) => {
                    const px = (pt.x / roomWidth) * 100;
                    const py = (pt.y / roomHeight) * 100;
                    return `${px}%,${py}%`;
                  })
                  .join(' ');

                const isSelected = selectedObjectId === obj.id;
                const strokeColor = isSelected ? '#38bdf8' : obj.status === 'visible' ? '#06b6d440' : '#f59e0b40';

                return (
                  <polyline
                    key={`traj-${obj.id}`}
                    points={pointsStr}
                    fill="none"
                    stroke={strokeColor}
                    strokeWidth={isSelected ? '2.5' : '1.5'}
                    strokeDasharray={isSelected ? 'none' : '4,4'}
                  />
                );
              })}
            </svg>
          )}

          {/* Render Object Pins on Floor Map */}
          <div className="relative w-full h-[400px]">
            {objects.map((obj) => {
              const posX = Math.max(5, Math.min(95, (obj.lastLocationX / roomWidth) * 100));
              const posY = Math.max(5, Math.min(95, (obj.lastLocationY / roomHeight) * 100));

              const isVisible = obj.status === 'visible';
              const isSelected = selectedObjectId === obj.id;

              return (
                <div
                  key={obj.id}
                  style={{ left: `${posX}%`, top: `${posY}%` }}
                  onPointerDown={(e) => {
                    e.stopPropagation();
                    setIsDraggingPin(obj.id);
                    setSelectedObjectId(obj.id);
                    onSelectObject(obj);
                  }}
                  className="absolute -translate-x-1/2 -translate-y-1/2 cursor-grab active:cursor-grabbing group z-20"
                >
                  {/* Radar Pulse Effect if Visible */}
                  {isVisible && (
                    <div className="absolute -inset-3 rounded-full bg-cyan-500/20 animate-ping opacity-75 pointer-events-none" />
                  )}

                  {/* Marker Pin */}
                  <div
                    className={`relative w-8 h-8 rounded-full flex items-center justify-center border-2 shadow-lg transition-transform group-hover:scale-125 ${
                      isSelected
                        ? 'bg-cyan-500 border-white ring-4 ring-cyan-500/40 text-slate-950 font-bold'
                        : isVisible
                        ? 'bg-slate-900 border-cyan-400 text-cyan-300'
                        : 'bg-slate-950 border-amber-500 text-amber-400'
                    }`}
                  >
                    <Crosshair className="w-4 h-4" />
                  </div>

                  {/* Tooltip Hover Badge */}
                  <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 hidden group-hover:flex flex-col items-center z-30 pointer-events-none">
                    <div className="bg-slate-950 text-slate-100 border border-slate-800 rounded-lg p-2.5 shadow-2xl text-[11px] font-mono whitespace-nowrap space-y-1">
                      <div className="font-bold text-cyan-300 flex items-center justify-between gap-2">
                        <span>#OBJ-{obj.id} {obj.className.toUpperCase()}</span>
                        <span className={`text-[9px] px-1 py-0.2 rounded ${obj.status === 'visible' ? 'bg-emerald-950 text-emerald-300' : 'bg-amber-950 text-amber-300'}`}>
                          {obj.status}
                        </span>
                      </div>
                      <div className="text-slate-400">
                        ({obj.lastLocationX}m, {obj.lastLocationY}m) • {obj.zone || 'Room'}
                      </div>
                      <div className="text-[10px] text-slate-500 italic">
                        Tip: Drag pin to fine-tune location
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Bottom Coordinate Ruler Footer */}
          <div className="border-t border-slate-800/80 pt-3 flex items-center justify-between text-[11px] font-mono text-slate-500">
            <span>Origin (0,0)m [Top-Left]</span>
            <span className="flex items-center space-x-1 text-slate-400">
              <Move className="w-3.5 h-3.5 text-cyan-400" />
              <span>Click & Drag Pins to Reposition</span>
            </span>
            <span>Room Extent ({roomWidth}m, {roomHeight}m)</span>
          </div>
        </div>

        {/* Selected Object Detail Sidebar */}
        <div className="bg-slate-900/80 rounded-2xl border border-slate-800 p-5 flex flex-col justify-between shadow-xl space-y-4">
          <div>
            <h3 className="text-sm font-bold text-slate-200 flex items-center justify-between mb-3">
              <span>Selected Object Inspector</span>
              {selectedObj && (
                <span className={`text-[10px] font-mono px-2 py-0.5 rounded-full ${selectedObj.status === 'visible' ? 'bg-emerald-950 text-emerald-400 border border-emerald-800' : 'bg-amber-950 text-amber-400 border border-amber-800'}`}>
                  {selectedObj.status.toUpperCase()}
                </span>
              )}
            </h3>

            {selectedObj ? (
              <div className="space-y-3.5">
                <div className="relative rounded-xl overflow-hidden border border-slate-800 aspect-video bg-slate-950">
                  <img
                    src={selectedObj.thumbnailPath}
                    alt={selectedObj.className}
                    className="w-full h-full object-cover"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-transparent to-transparent opacity-80" />
                  <div className="absolute bottom-2 left-2 right-2 text-xs font-mono font-bold text-white">
                    #OBJ-{selectedObj.id} {selectedObj.className}
                  </div>
                </div>

                <div className="space-y-2 text-xs font-mono">
                  <div className="flex justify-between py-1 border-b border-slate-800 text-slate-400">
                    <span>Floor Coordinates:</span>
                    <span className="text-cyan-300 font-bold">
                      X: {selectedObj.lastLocationX}m, Y: {selectedObj.lastLocationY}m
                    </span>
                  </div>

                  <div className="flex justify-between py-1 border-b border-slate-800 text-slate-400">
                    <span>Assigned Zone:</span>
                    <span className="text-slate-200">{selectedObj.zone || 'General'}</span>
                  </div>

                  <div className="flex justify-between py-1 border-b border-slate-800 text-slate-400">
                    <span>Last Observed:</span>
                    <span className="text-slate-300">
                      {new Date(selectedObj.lastSeen).toLocaleTimeString()}
                    </span>
                  </div>

                  <div className="flex justify-between py-1 border-b border-slate-800 text-slate-400">
                    <span>Observation Count:</span>
                    <span className="text-purple-300 font-bold">{selectedObj.historyCount} frames</span>
                  </div>

                  <div className="flex justify-between py-1 text-slate-400">
                    <span>Trajectory Length:</span>
                    <span className="text-emerald-300">
                      {(selectedObj.trajectory || []).length} recorded points
                    </span>
                  </div>
                </div>

                {selectedObj.description && (
                  <p className="text-xs text-slate-400 bg-slate-950/60 p-2.5 rounded-xl border border-slate-800 italic">
                    "{selectedObj.description}"
                  </p>
                )}
              </div>
            ) : (
              <div className="text-center py-16 text-xs text-slate-500 space-y-2">
                <Crosshair className="w-8 h-8 mx-auto text-slate-600 opacity-60" />
                <p>Click on any marker pin on the floor map to inspect its spatial telemetry and trajectory trail.</p>
              </div>
            )}
          </div>

          {selectedObj && (
            <button
              onClick={() => onSelectObject(selectedObj)}
              className="w-full bg-cyan-600 hover:bg-cyan-500 text-slate-950 font-bold py-2 rounded-xl text-xs transition-colors flex items-center justify-center space-x-1.5 shadow-lg shadow-cyan-600/20"
            >
              <Info className="w-4 h-4" />
              <span>Open Detailed Memory Drawer</span>
            </button>
          )}
        </div>
      </div>

      {/* Homography 4-Point Camera Calibration Modal */}
      {showCalibrationModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in duration-150">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-xl w-full p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="text-sm font-bold text-slate-100 flex items-center gap-2">
                <SlidersHorizontal className="w-4 h-4 text-cyan-400" />
                Projective Homography Matrix Calibration
              </h3>
              <button
                onClick={() => setShowCalibrationModal(false)}
                className="text-slate-400 hover:text-white text-sm"
              >
                ✕
              </button>
            </div>

            <p className="text-xs text-slate-400 leading-relaxed">
              Define the 4 ground reference corner points matching normalized camera pixels (0.0 to 1.0) with real-world room floor plan coordinates (in meters).
            </p>

            <div className="space-y-3 max-h-64 overflow-y-auto pr-1">
              {calibPoints.map((pt, idx) => (
                <div
                  key={idx}
                  className="bg-slate-950 p-3 rounded-xl border border-slate-800 text-xs grid grid-cols-4 gap-2 items-center"
                >
                  <div>
                    <label className="text-[10px] text-slate-500 font-mono block">Point #{idx + 1} pxX</label>
                    <input
                      type="number"
                      step="0.05"
                      min="0"
                      max="1"
                      value={pt.pxX}
                      onChange={(e) => {
                        const val = parseFloat(e.target.value) || 0;
                        setCalibPoints((prev) => {
                          const updated = [...prev];
                          updated[idx] = { ...updated[idx], pxX: val };
                          return updated;
                        });
                      }}
                      className="w-full bg-slate-900 border border-slate-700 rounded px-2 py-1 text-slate-200 font-mono"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] text-slate-500 font-mono block">pxY</label>
                    <input
                      type="number"
                      step="0.05"
                      min="0"
                      max="1"
                      value={pt.pxY}
                      onChange={(e) => {
                        const val = parseFloat(e.target.value) || 0;
                        setCalibPoints((prev) => {
                          const updated = [...prev];
                          updated[idx] = { ...updated[idx], pxY: val };
                          return updated;
                        });
                      }}
                      className="w-full bg-slate-900 border border-slate-700 rounded px-2 py-1 text-slate-200 font-mono"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] text-slate-500 font-mono block">Map X (m)</label>
                    <input
                      type="number"
                      step="0.5"
                      min="0"
                      max={roomWidth}
                      value={pt.mapX}
                      onChange={(e) => {
                        const val = parseFloat(e.target.value) || 0;
                        setCalibPoints((prev) => {
                          const updated = [...prev];
                          updated[idx] = { ...updated[idx], mapX: val };
                          return updated;
                        });
                      }}
                      className="w-full bg-slate-900 border border-slate-700 rounded px-2 py-1 text-cyan-300 font-mono"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] text-slate-500 font-mono block">Map Y (m)</label>
                    <input
                      type="number"
                      step="0.5"
                      min="0"
                      max={roomHeight}
                      value={pt.mapY}
                      onChange={(e) => {
                        const val = parseFloat(e.target.value) || 0;
                        setCalibPoints((prev) => {
                          const updated = [...prev];
                          updated[idx] = { ...updated[idx], mapY: val };
                          return updated;
                        });
                      }}
                      className="w-full bg-slate-900 border border-slate-700 rounded px-2 py-1 text-cyan-300 font-mono"
                    />
                  </div>
                </div>
              ))}
            </div>

            <div className="flex justify-end space-x-2 pt-2 border-t border-slate-800">
              <button
                onClick={() => setShowCalibrationModal(false)}
                className="px-4 py-2 rounded-xl text-xs text-slate-400 hover:text-white"
              >
                Cancel
              </button>
              <button
                onClick={handleSaveCalibration}
                className="px-4 py-2 rounded-xl text-xs font-bold bg-cyan-600 hover:bg-cyan-500 text-slate-950 flex items-center space-x-1.5"
              >
                <Check className="w-4 h-4" />
                <span>Compute & Apply Homography Matrix</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
