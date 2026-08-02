import React, { useState } from 'react';
import {
  MapPin,
  Compass,
  SlidersHorizontal,
  Layers,
  Crosshair,
  Maximize2,
  AlertTriangle,
  RotateCcw,
  Check
} from 'lucide-react';
import { TrackedObject, Room, RoomCalibrationPoint } from '../types';

interface FloorMapViewProps {
  objects: TrackedObject[];
  room: Room;
  onSelectObject: (object: TrackedObject) => void;
  onCalibrateRoom: (points: RoomCalibrationPoint[]) => void;
}

export const FloorMapView: React.FC<FloorMapViewProps> = ({
  objects,
  room,
  onSelectObject,
  onCalibrateRoom
}) => {
  const [selectedObjectId, setSelectedObjectId] = useState<number | null>(null);
  const [showCalibrationModal, setShowCalibrationModal] = useState<boolean>(false);
  const [calibPoints, setCalibPoints] = useState<RoomCalibrationPoint[]>(room.calibrationPoints);

  const roomWidth = room.widthMeters || 8.5;
  const roomHeight = room.heightMeters || 6.0;

  const handleSaveCalibration = () => {
    onCalibrateRoom(calibPoints);
    setShowCalibrationModal(false);
  };

  return (
    <div className="space-y-6">
      {/* Top Map Header & Calibration Controls */}
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
              Homography perspective transform mapping image pixels to physical room coordinates
            </p>
          </div>
        </div>

        <button
          onClick={() => setShowCalibrationModal(true)}
          className="flex items-center space-x-2 bg-slate-800 hover:bg-slate-700 text-slate-200 px-4 py-2 rounded-xl text-xs font-medium border border-slate-700 transition-colors"
        >
          <SlidersHorizontal className="w-4 h-4 text-cyan-400" />
          <span>Calibrate Camera Matrix</span>
        </button>
      </div>

      {/* Main Floor Plan Grid Canvas Container */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Floor Map Interactive Stage */}
        <div className="lg:col-span-3 bg-slate-950 rounded-2xl border border-slate-800 p-6 relative overflow-hidden shadow-2xl min-h-[480px] flex flex-col justify-between">
          {/* Architectural Room Zones Background Layer */}
          <div className="absolute inset-0 p-8 grid grid-cols-3 grid-rows-2 gap-4 opacity-20 pointer-events-none">
            <div className="border border-slate-700 rounded-xl p-3 flex flex-col justify-between">
              <span className="text-[10px] font-mono text-slate-400">ZONE A: WORKSTATION DESK</span>
            </div>
            <div className="border border-slate-700 rounded-xl p-3 flex flex-col justify-between">
              <span className="text-[10px] font-mono text-slate-400">ZONE B: CENTRAL COFFEE TABLE</span>
            </div>
            <div className="border border-slate-700 rounded-xl p-3 flex flex-col justify-between">
              <span className="text-[10px] font-mono text-slate-400">ZONE C: STORAGE COUNTER</span>
            </div>
            <div className="border border-slate-700 rounded-xl p-3 flex flex-col justify-between">
              <span className="text-[10px] font-mono text-slate-400">ZONE D: TASK SEATING AREA</span>
            </div>
            <div className="border border-slate-700 rounded-xl p-3 flex flex-col justify-between">
              <span className="text-[10px] font-mono text-slate-400">ZONE E: LOUNGE CHAIRS</span>
            </div>
            <div className="border border-slate-700 rounded-xl p-3 flex flex-col justify-between">
              <span className="text-[10px] font-mono text-slate-400">ZONE F: ENTRYWAY DOOR</span>
            </div>
          </div>

          {/* Grid Measure Scale Overlay */}
          <div className="absolute inset-0 grid grid-cols-8 grid-rows-6 pointer-events-none">
            {Array.from({ length: 48 }).map((_, i) => (
              <div key={i} className="border-[0.5px] border-slate-800/40" />
            ))}
          </div>

          {/* Render Object Pins on Floor Map */}
          <div className="relative w-full h-[400px]">
            {objects.map((obj) => {
              // Convert meters to % position on floor plan
              const posX = Math.max(5, Math.min(95, (obj.lastLocationX / roomWidth) * 100));
              const posY = Math.max(5, Math.min(95, (obj.lastLocationY / roomHeight) * 100));

              const isVisible = obj.status === 'visible';
              const isSelected = selectedObjectId === obj.id;

              return (
                <div
                  key={obj.id}
                  style={{ left: `${posX}%`, top: `${posY}%` }}
                  onClick={() => {
                    setSelectedObjectId(obj.id);
                    onSelectObject(obj);
                  }}
                  className="absolute -translate-x-1/2 -translate-y-1/2 cursor-pointer group z-20"
                >
                  {/* Radar Pulse Effect if Visible */}
                  {isVisible && (
                    <div className="absolute -inset-3 rounded-full bg-cyan-500/20 animate-ping opacity-75" />
                  )}

                  {/* Marker Pin */}
                  <div
                    className={`relative w-8 h-8 rounded-full flex items-center justify-center border-2 shadow-lg transition-transform group-hover:scale-125 ${
                      isSelected
                        ? 'bg-cyan-500 border-white ring-4 ring-cyan-500/40'
                        : isVisible
                        ? 'bg-slate-900 border-cyan-400 text-cyan-300'
                        : 'bg-slate-950 border-amber-500 text-amber-400'
                    }`}
                  >
                    <Crosshair className="w-4 h-4" />
                  </div>

                  {/* Tooltip Hover Badge */}
                  <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 hidden group-hover:flex flex-col items-center z-30 pointer-events-none">
                    <div className="bg-slate-950 text-slate-100 border border-slate-800 rounded-lg p-2 shadow-2xl text-[11px] font-mono whitespace-nowrap space-y-1">
                      <div className="font-bold text-cyan-300">
                        #OBJ-{obj.id} {obj.className.toUpperCase()}
                      </div>
                      <div className="text-slate-400">
                        ({obj.lastLocationX}m, {obj.lastLocationY}m) • {obj.status}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Map Legend */}
          <div className="flex items-center justify-between text-xs text-slate-400 border-t border-slate-800/80 pt-3 font-mono">
            <div className="flex items-center space-x-4">
              <span className="flex items-center space-x-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-cyan-400 animate-pulse" />
                <span>Currently Visible</span>
              </span>
              <span className="flex items-center space-x-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-amber-400" />
                <span>Disappeared / Lost Position</span>
              </span>
            </div>
            <span>CAMERA CALIBRATED Matrix 3x3 H</span>
          </div>
        </div>

        {/* Right 1 Column: Selected Object Spatial Detail Panel */}
        <div className="bg-slate-900/80 rounded-2xl border border-slate-800 p-5 space-y-4 shadow-xl">
          <h3 className="text-sm font-semibold text-slate-100 border-b border-slate-800 pb-3 flex items-center gap-2">
            <Layers className="w-4 h-4 text-cyan-400" />
            Spatial Location Inspector
          </h3>

          {selectedObjectId ? (
            (() => {
              const obj = objects.find((o) => o.id === selectedObjectId);
              if (!obj) return null;
              return (
                <div className="space-y-4">
                  <div className="rounded-xl overflow-hidden aspect-video bg-slate-950 border border-slate-800">
                    <img
                      src={obj.thumbnailPath}
                      alt={obj.className}
                      className="w-full h-full object-cover"
                    />
                  </div>

                  <div>
                    <div className="flex items-center justify-between">
                      <h4 className="text-sm font-bold text-slate-100 uppercase">
                        {obj.className}
                      </h4>
                      <span className="text-xs font-mono text-cyan-400">
                        #OBJ-{obj.id}
                      </span>
                    </div>
                    <p className="text-xs text-slate-400 mt-1 font-sans">{obj.description}</p>
                  </div>

                  <div className="space-y-2 bg-slate-950 p-3 rounded-xl border border-slate-800 text-xs font-mono">
                    <div className="flex justify-between">
                      <span className="text-slate-500">Floor X Coord:</span>
                      <span className="text-cyan-300 font-bold">{obj.lastLocationX} meters</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-500">Floor Y Coord:</span>
                      <span className="text-cyan-300 font-bold">{obj.lastLocationY} meters</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-500">Distance from Camera:</span>
                      <span className="text-indigo-300">
                        {Math.sqrt(obj.lastLocationX ** 2 + obj.lastLocationY ** 2).toFixed(2)}m
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-500">Status:</span>
                      <span className={obj.status === 'visible' ? 'text-emerald-400 font-bold' : 'text-amber-400 font-bold'}>
                        {obj.status.toUpperCase()}
                      </span>
                    </div>
                  </div>

                  <button
                    onClick={() => onSelectObject(obj)}
                    className="w-full bg-cyan-600 hover:bg-cyan-500 text-white py-2 rounded-xl text-xs font-medium transition-colors"
                  >
                    View Timeline History
                  </button>
                </div>
              );
            })()
          ) : (
            <div className="text-center py-12 text-xs text-slate-500 space-y-2">
              <MapPin className="w-8 h-8 text-slate-600 mx-auto" />
              <p>Click any radar marker on the map to inspect spatial telemetry.</p>
            </div>
          )}
        </div>
      </div>

      {/* Homography Calibration Matrix Modal */}
      {showCalibrationModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-lg w-full p-6 space-y-5 shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="text-base font-bold text-slate-100 flex items-center gap-2">
                <SlidersHorizontal className="w-5 h-5 text-cyan-400" />
                Homography Corner Calibration
              </h3>
              <button
                onClick={() => setShowCalibrationModal(false)}
                className="text-slate-400 hover:text-slate-100 text-sm font-bold"
              >
                ✕
              </button>
            </div>

            <p className="text-xs text-slate-400">
              Set pixel to 2D room floor plan corner reference points for Homography matrix transformation calculation.
            </p>

            <div className="space-y-3 max-h-[300px] overflow-y-auto pr-1">
              {calibPoints.map((pt, idx) => (
                <div key={idx} className="bg-slate-950 p-3 rounded-xl border border-slate-800 space-y-2 text-xs font-mono">
                  <div className="text-cyan-300 font-bold">
                    Corner #{idx + 1} ({idx === 0 ? 'Top-Left' : idx === 1 ? 'Top-Right' : idx === 2 ? 'Bottom-Right' : 'Bottom-Left'})
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="text-[10px] text-slate-500">Pixel X (0..1)</label>
                      <input
                        type="number"
                        step="0.01"
                        value={pt.pxX}
                        onChange={(e) => {
                          const updated = [...calibPoints];
                          updated[idx].pxX = parseFloat(e.target.value);
                          setCalibPoints(updated);
                        }}
                        className="w-full bg-slate-900 border border-slate-800 rounded p-1 text-slate-200"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] text-slate-500">Map X (Meters)</label>
                      <input
                        type="number"
                        step="0.1"
                        value={pt.mapX}
                        onChange={(e) => {
                          const updated = [...calibPoints];
                          updated[idx].mapX = parseFloat(e.target.value);
                          setCalibPoints(updated);
                        }}
                        className="w-full bg-slate-900 border border-slate-800 rounded p-1 text-slate-200"
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>

            <div className="flex items-center justify-end space-x-3 border-t border-slate-800 pt-3">
              <button
                onClick={() => setShowCalibrationModal(false)}
                className="px-4 py-2 rounded-xl text-xs text-slate-400 hover:text-slate-200"
              >
                Cancel
              </button>
              <button
                onClick={handleSaveCalibration}
                className="bg-cyan-600 hover:bg-cyan-500 text-white px-5 py-2 rounded-xl text-xs font-medium flex items-center space-x-1.5"
              >
                <Check className="w-4 h-4" />
                <span>Save Matrix Calibration</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
