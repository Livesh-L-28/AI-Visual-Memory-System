import React, { useRef, useEffect, useState } from 'react';
import {
  Camera,
  Video,
  Play,
  Pause,
  Sparkles,
  Layers,
  Activity,
  Eye,
  Crosshair,
  Upload,
  RefreshCw,
  CheckCircle2,
  AlertCircle,
  FileVideo,
  Film
} from 'lucide-react';
import { TrackedObject, SampleVideoSource } from '../types';

interface LiveScannerViewProps {
  trackedObjects: TrackedObject[];
  onProcessFrame: (frameBase64?: string, customDetections?: any[]) => Promise<any>;
  onSelectObject: (object: TrackedObject) => void;
  isStreaming: boolean;
}

const SAMPLE_VIDEOS: SampleVideoSource[] = [
  {
    id: 'remind_lounge',
    title: 'Living Room Patrol',
    description: 'Active spatial scan with Re-ID spatial memory overlay in lounge environment.',
    category: 'living_room',
    posterUrl: 'https://images.unsplash.com/photo-1555041469-a586c61ea9bc?w=1000&auto=format&fit=crop&q=80',
    objectsPresent: ['tv', 'furniture', 'couch', 'potted_plant', 'device', 'blanket', 'chair']
  },
  {
    id: 'desk',
    title: 'Workstation Desk Patrol',
    description: 'High-density spatial scan of laptop, phone, bottle, mug, headphones & mouse.',
    category: 'desk',
    posterUrl: 'https://images.unsplash.com/photo-1517336714731-489689fd1ca8?w=800&auto=format&fit=crop&q=80',
    objectsPresent: ['laptop', 'phone', 'bottle', 'mug', 'mouse', 'headphones']
  },
  {
    id: 'office_hub',
    title: 'Executive Office Hub',
    description: 'Spatial memory scan of dual monitors, keyboard, desk lamp & task chair.',
    category: 'office',
    posterUrl: 'https://images.unsplash.com/photo-1497366216548-37526070297c?w=1000&auto=format&fit=crop&q=80',
    objectsPresent: ['monitor', 'keyboard', 'chair', 'lamp']
  }
];

// Scene-specific normalized bounding boxes [x1, y1, x2, y2]
const SCENE_BOUNDING_BOXES: Record<string, Record<string, { x1: number; y1: number; x2: number; y2: number; label: string; color: string; rgba: string; mode: string; desc: string }>> = {
  remind_lounge: {
    tv: { x1: 0.18, y1: 0.20, x2: 0.58, y2: 0.46, label: '1-TV', color: '#22c55e', rgba: 'rgba(34, 197, 94, 0.35)', mode: '[S|M]', desc: 'Mounted Smart Display TV' },
    furniture: { x1: 0.10, y1: 0.46, x2: 0.88, y2: 0.72, label: '2-CABINET', color: '#06b6d4', rgba: 'rgba(6, 182, 212, 0.32)', mode: '[S|M]', desc: 'Low-profile Media Credenza' },
    couch: { x1: 0.04, y1: 0.72, x2: 0.96, y2: 0.94, label: '3-COUCH', color: '#6366f1', rgba: 'rgba(99, 102, 241, 0.35)', mode: '[S|M]', desc: 'L-Shape Sectional Sofa' },
    potted_plant: { x1: 0.60, y1: 0.30, x2: 0.74, y2: 0.44, label: '4-PLANT', color: '#eab308', rgba: 'rgba(234, 179, 8, 0.35)', mode: '[A|M]', desc: 'Decorative Indoor Monstera' },
    device: { x1: 0.74, y1: 0.38, x2: 0.86, y2: 0.48, label: '5-SPEAKER', color: '#ec4899', rgba: 'rgba(236, 72, 153, 0.35)', mode: '[S|M]', desc: 'Smart Wireless Audio Hub' },
    blanket: { x1: 0.14, y1: 0.58, x2: 0.32, y2: 0.68, label: '6-BLANKET', color: '#a855f7', rgba: 'rgba(168, 85, 247, 0.35)', mode: '[S|M]', desc: 'Woven Cotton Throw' },
    chair: { x1: 0.01, y1: 0.42, x2: 0.12, y2: 0.62, label: '7-CHAIR', color: '#f97316', rgba: 'rgba(249, 115, 22, 0.35)', mode: '[S|M]', desc: 'Accent Lounge Armchair' }
  },
  desk: {
    laptop: { x1: 0.28, y1: 0.32, x2: 0.62, y2: 0.72, label: '1-LAPTOP', color: '#3b82f6', rgba: 'rgba(59, 130, 246, 0.35)', mode: '[S|M]', desc: 'MacBook Pro Space Black' },
    bottle: { x1: 0.08, y1: 0.18, x2: 0.19, y2: 0.54, label: '2-BOTTLE', color: '#10b981', rgba: 'rgba(16, 185, 129, 0.35)', mode: '[S|M]', desc: 'Matte Hydro Bottle' },
    mug: { x1: 0.20, y1: 0.58, x2: 0.30, y2: 0.80, label: '3-MUG', color: '#ec4899', rgba: 'rgba(236, 72, 153, 0.35)', mode: '[S|M]', desc: 'Ceramic Espresso Mug' },
    phone: { x1: 0.66, y1: 0.42, x2: 0.76, y2: 0.68, label: '4-PHONE', color: '#8b5cf6', rgba: 'rgba(139, 92, 246, 0.35)', mode: '[S|M]', desc: 'Smartphone on Stand' },
    mouse: { x1: 0.72, y1: 0.70, x2: 0.82, y2: 0.86, label: '5-MOUSE', color: '#06b6d4', rgba: 'rgba(6, 182, 212, 0.35)', mode: '[S|M]', desc: 'Ergonomic Laser Mouse' },
    headphones: { x1: 0.78, y1: 0.16, x2: 0.90, y2: 0.40, label: '6-HEADPHONES', color: '#f59e0b', rgba: 'rgba(245, 158, 11, 0.35)', mode: '[A|M]', desc: 'Noise-Canceling Headset' }
  },
  office_hub: {
    monitor: { x1: 0.25, y1: 0.15, x2: 0.75, y2: 0.55, label: '1-MONITOR', color: '#38bdf8', rgba: 'rgba(56, 189, 248, 0.35)', mode: '[S|M]', desc: '4K Curved Ultrawide Display' },
    keyboard: { x1: 0.30, y1: 0.60, x2: 0.70, y2: 0.82, label: '2-KEYBOARD', color: '#a855f7', rgba: 'rgba(168, 85, 247, 0.35)', mode: '[S|M]', desc: 'Mechanical RGB Keyboard' },
    chair: { x1: 0.05, y1: 0.35, x2: 0.22, y2: 0.88, label: '3-CHAIR', color: '#f59e0b', rgba: 'rgba(245, 158, 11, 0.35)', mode: '[S|M]', desc: 'Ergonomic Mesh Chair' },
    lamp: { x1: 0.80, y1: 0.10, x2: 0.94, y2: 0.58, label: '4-LAMP', color: '#eab308', rgba: 'rgba(234, 179, 8, 0.35)', mode: '[S|M]', desc: 'Minimalist LED Desk Lamp' }
  }
};

export const LiveScannerView: React.FC<LiveScannerViewProps> = ({
  trackedObjects,
  onProcessFrame,
  onSelectObject,
  isStreaming
}) => {
  const [sourceType, setSourceType] = useState<'sample' | 'webcam' | 'upload'>('sample');
  const [selectedSample, setSelectedSample] = useState<SampleVideoSource>(SAMPLE_VIDEOS[0]);
  const [confidenceThreshold, setConfidenceThreshold] = useState<number>(0.50);
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [webcamActive, setWebcamActive] = useState<boolean>(false);
  const [facingMode, setFacingMode] = useState<'user' | 'environment'>('environment');

  // Custom uploaded media
  const [uploadedMediaUrl, setUploadedMediaUrl] = useState<string | null>(null);
  const [uploadedMediaType, setUploadedMediaType] = useState<'video' | 'image' | null>(null);

  const [webcamDetections, setWebcamDetections] = useState<Array<{
    id?: number;
    objectId?: number;
    className: string;
    confidence: number;
    bbox: { x1: number; y1: number; x2: number; y2: number };
  }>>([]);

  const [hoveredBox, setHoveredBox] = useState<any | null>(null);
  const [selectedBox, setSelectedBox] = useState<any | null>(null);
  const [showMesh, setShowMesh] = useState<boolean>(true);
  const [showMasks, setShowMasks] = useState<boolean>(true);
  const [showBadges, setShowBadges] = useState<boolean>(true);
  const [showCentroids, setShowCentroids] = useState<boolean>(true);
  const [hasApiKey, setHasApiKey] = useState<boolean>(true);

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const prevFrameDataRef = useRef<Uint8ClampedArray | null>(null);

  // Check if API key is configured
  useEffect(() => {
    fetch('/api/config')
      .then((r) => r.json())
      .then((d) => setHasApiKey(!!d.hasGeminiKey))
      .catch(() => {});
  }, [sourceType]);

  // Reset detections when switching source
  useEffect(() => {
    if (sourceType === 'webcam') {
      setWebcamDetections([]);
      setSelectedBox(null);
    }
  }, [sourceType, selectedSample, uploadedMediaUrl]);

  // Initialize webcam stream if in webcam mode
  useEffect(() => {
    let stream: MediaStream | null = null;
    if (sourceType === 'webcam') {
      navigator.mediaDevices
        .getUserMedia({
          video: {
            facingMode,
            width: { ideal: 1280 },
            height: { ideal: 720 }
          },
          audio: false
        })
        .then((s) => {
          stream = s;
          if (videoRef.current) {
            videoRef.current.srcObject = s;
            videoRef.current.play().catch(() => {});
          }
          setWebcamActive(true);
          setCameraError(null);
        })
        .catch((err) => {
          console.error('Webcam access error:', err);
          setCameraError('Camera access denied or unavailable. You can upload video files or use the sample rooms.');
          setSourceType('sample');
          setWebcamActive(false);
        });
    }

    return () => {
      if (stream) {
        stream.getTracks().forEach((track) => track.stop());
      }
    };
  }, [sourceType, facingMode]);

  // Periodic frame capture with motion difference detection
  useEffect(() => {
    if (!isStreaming) return;

    const interval = setInterval(() => {
      if (!isProcessing) {
        handleTriggerScan();
      }
    }, 3500);

    return () => clearInterval(interval);
  }, [isStreaming, isProcessing, sourceType, uploadedMediaType]);

  // Render bounding box overlays on HTML5 Canvas in real-time
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    type BoxItem = {
      x1: number;
      y1: number;
      x2: number;
      y2: number;
      w: number;
      h: number;
      cx: number;
      cy: number;
      color: string;
      rgba: string;
      labelStr: string;
      modeStr: string;
      objectId?: number;
    };

    const computedBoxes: BoxItem[] = [];

    if (sourceType === 'sample') {
      const sceneMap = SCENE_BOUNDING_BOXES[selectedSample.id];
      if (sceneMap) {
        Object.entries(sceneMap).forEach(([className, config]) => {
          const x1 = config.x1 * canvas.width;
          const y1 = config.y1 * canvas.height;
          const x2 = config.x2 * canvas.width;
          const y2 = config.y2 * canvas.height;
          const cx = (x1 + x2) / 2;
          const cy = (y1 + y2) / 2;

          computedBoxes.push({
            x1,
            y1,
            x2,
            y2,
            w: x2 - x1,
            h: y2 - y1,
            cx,
            cy,
            color: config.color,
            rgba: config.rgba,
            labelStr: config.label,
            modeStr: config.mode
          });
        });
      }
    } else {
      // In webcam or uploaded mode, draw real bounding boxes from vision analysis
      const classCounts: Record<string, number> = {};

      webcamDetections.forEach((det, idx) => {
        if (!det.bbox || det.bbox.x2 <= det.bbox.x1 || det.bbox.y2 <= det.bbox.y1) return;
        if (det.confidence < confidenceThreshold) return;

        const clsKey = det.className.toLowerCase();
        classCounts[clsKey] = (classCounts[clsKey] || 0) + 1;
        const countIdx = classCounts[clsKey];

        const x1 = Math.max(0, Math.min(1, det.bbox.x1)) * canvas.width;
        const y1 = Math.max(0, Math.min(1, det.bbox.y1)) * canvas.height;
        const x2 = Math.max(0, Math.min(1, det.bbox.x2)) * canvas.width;
        const y2 = Math.max(0, Math.min(1, det.bbox.y2)) * canvas.height;
        const cx = (x1 + x2) / 2;
        const cy = (y1 + y2) / 2;

        let color = '#38bdf8'; // cyan default
        if (clsKey.includes('person')) color = '#22c55e';
        else if (clsKey.includes('laptop')) color = '#3b82f6';
        else if (clsKey.includes('phone')) color = '#8b5cf6';
        else if (clsKey.includes('bottle')) color = '#10b981';
        else if (clsKey.includes('chair')) color = '#f59e0b';
        else if (clsKey.includes('mug')) color = '#ec4899';
        else if (clsKey.includes('mouse')) color = '#06b6d4';
        else if (clsKey.includes('glasses')) color = '#eab308';
        else if (clsKey.includes('monitor') || clsKey.includes('tv')) color = '#6366f1';
        else if (clsKey.includes('keyboard')) color = '#a855f7';
        else if (clsKey.includes('plant')) color = '#84cc16';

        computedBoxes.push({
          x1,
          y1,
          x2,
          y2,
          w: Math.max(20, x2 - x1),
          h: Math.max(20, y2 - y1),
          cx,
          cy,
          color,
          rgba: `${color}35`,
          labelStr: `${det.objectId ? `#OBJ-${det.objectId}` : idx + 1} ${det.className.toUpperCase()}`,
          modeStr: '[S|M]',
          objectId: det.objectId
        });
      });
    }

    // 1. Draw Mesh Connections
    if (showMesh && computedBoxes.length > 1) {
      ctx.save();
      ctx.lineWidth = 1.2;
      ctx.setLineDash([4, 4]);

      for (let i = 0; i < computedBoxes.length; i++) {
        for (let j = i + 1; j < computedBoxes.length; j++) {
          const b1 = computedBoxes[i];
          const b2 = computedBoxes[j];
          const dist = Math.hypot(b2.cx - b1.cx, b2.cy - b1.cy);

          if (dist < canvas.width * 0.55) {
            ctx.strokeStyle = 'rgba(6, 182, 212, 0.45)';
            ctx.beginPath();
            ctx.moveTo(b1.cx, b1.cy);
            ctx.lineTo(b2.cx, b2.cy);
            ctx.stroke();
          }
        }
      }
      ctx.restore();
    }

    // 2. Draw Object Masks & Contour Borders
    computedBoxes.forEach((item) => {
      const { x1, y1, w, h, cx, cy, color, rgba, labelStr, modeStr } = item;
      const isSelected = selectedBox?.labelStr === labelStr || hoveredBox?.labelStr === labelStr;

      ctx.save();

      // Translucent Segment Mask Fill
      if (showMasks) {
        ctx.fillStyle = isSelected ? `${color}75` : rgba;
        ctx.fillRect(x1, y1, w, h);
      }

      // Solid Contour Border
      ctx.strokeStyle = isSelected ? '#facc15' : color;
      ctx.lineWidth = isSelected ? 3.5 : 2.2;
      ctx.shadowColor = isSelected ? '#facc15' : color;
      ctx.shadowBlur = isSelected ? 16 : 8;
      ctx.strokeRect(x1, y1, w, h);

      // Centroid Node Dot
      if (showCentroids) {
        ctx.fillStyle = isSelected ? '#facc15' : color;
        ctx.beginPath();
        ctx.arc(cx, cy, isSelected ? 5.5 : 3.5, 0, Math.PI * 2);
        ctx.fill();
      }

      ctx.restore();

      // Label Badge
      if (showBadges) {
        const fullText = `${labelStr} ${modeStr}`;
        ctx.font = 'bold 12px "Courier New", monospace, sans-serif';
        const textMetrics = ctx.measureText(fullText);
        const badgeWidth = textMetrics.width + 16;
        const badgeHeight = 22;

        let badgeX = x1;
        let badgeY = y1 > 28 ? y1 - badgeHeight - 4 : y1 + 6;

        ctx.save();
        ctx.fillStyle = isSelected ? '#1e1b4b' : '#080d1a';
        ctx.fillRect(badgeX, badgeY, badgeWidth, badgeHeight);

        ctx.strokeStyle = isSelected ? '#facc15' : color;
        ctx.lineWidth = 1.5;
        ctx.strokeRect(badgeX, badgeY, badgeWidth, badgeHeight);

        ctx.fillStyle = '#ffffff';
        ctx.font = 'bold 11px monospace';
        ctx.fillText(labelStr, badgeX + 8, badgeY + 15);

        ctx.fillStyle = '#38bdf8';
        ctx.fillText(modeStr, badgeX + 8 + ctx.measureText(labelStr + ' ').width, badgeY + 15);
        ctx.restore();
      }
    });
  }, [confidenceThreshold, sourceType, selectedSample, webcamDetections, showMesh, showMasks, showBadges, showCentroids, hoveredBox, selectedBox]);

  const handleTriggerScan = async () => {
    setIsProcessing(true);
    try {
      let frameBase64: string | undefined = undefined;
      let customDetections: any[] | undefined = undefined;

      if ((sourceType === 'webcam' || (sourceType === 'upload' && uploadedMediaType === 'video')) && videoRef.current) {
        const tempCanvas = document.createElement('canvas');
        tempCanvas.width = videoRef.current.videoWidth || 640;
        tempCanvas.height = videoRef.current.videoHeight || 360;
        const tempCtx = tempCanvas.getContext('2d');
        if (tempCtx) {
          tempCtx.drawImage(videoRef.current, 0, 0, tempCanvas.width, tempCanvas.height);
          frameBase64 = tempCanvas.toDataURL('image/jpeg', 0.85).split(',')[1];
        }
      } else if (sourceType === 'sample') {
        const boxes = SCENE_BOUNDING_BOXES[selectedSample.id];
        if (boxes) {
          customDetections = Object.entries(boxes).map(([className, cfg]) => ({
            className,
            confidence: 0.95,
            visualFeatures: cfg.desc,
            bbox: { x1: cfg.x1, y1: cfg.y1, x2: cfg.x2, y2: cfg.y2 }
          }));
        }
      }

      const res = await onProcessFrame(frameBase64, customDetections);
      if (res && res.detections) {
        setWebcamDetections(res.detections);
      }
    } catch (e) {
      console.error('Scan processing error:', e);
    } finally {
      setTimeout(() => {
        setIsProcessing(false);
      }, 400);
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const url = URL.createObjectURL(file);
    setUploadedMediaUrl(url);

    if (file.type.startsWith('video/')) {
      setUploadedMediaType('video');
      setSourceType('upload');
    } else if (file.type.startsWith('image/')) {
      setUploadedMediaType('image');
      setSourceType('upload');

      // Convert image to base64 and scan immediately
      const reader = new FileReader();
      reader.onload = async () => {
        const base64 = (reader.result as string).split(',')[1];
        const res = await onProcessFrame(base64);
        if (res && res.detections) {
          setWebcamDetections(res.detections);
        }
      };
      reader.readAsDataURL(file);
    }
  };

  const detectedCount =
    sourceType === 'sample'
      ? Object.keys(SCENE_BOUNDING_BOXES[selectedSample.id] || {}).length
      : webcamDetections.length;

  return (
    <div className="space-y-6">
      {/* Top Banner Control Panel */}
      <div className="bg-slate-900/80 rounded-2xl border border-slate-800 p-4 sm:p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 shadow-xl">
        <div className="flex items-center space-x-3">
          <div className="p-2.5 rounded-xl bg-cyan-950/80 text-cyan-400 border border-cyan-800/60">
            <Video className="w-5 h-5 animate-pulse" />
          </div>
          <div>
            <h2 className="text-base font-semibold text-slate-100 flex items-center gap-2">
              Real-Time Perception Feed & Spatial Re-ID
              <span className="px-2 py-0.5 rounded-md text-[10px] font-mono bg-emerald-950 text-emerald-300 border border-emerald-800/50 flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping" />
                DLT Homography Active
              </span>
            </h2>
            <p className="text-xs text-slate-400">
              Live multi-object tracking with automatic disappearance detection and permanent identity preservation
            </p>
          </div>
        </div>

        {/* Source Switcher & Scan Actions */}
        <div className="flex items-center space-x-2 w-full sm:w-auto justify-end flex-wrap gap-y-2">
          <div className="bg-slate-950 p-1 rounded-xl border border-slate-800 flex items-center text-xs">
            <button
              onClick={() => setSourceType('sample')}
              className={`px-3 py-1.5 rounded-lg transition-all ${
                sourceType === 'sample'
                  ? 'bg-slate-800 text-cyan-300 font-medium'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Presets
            </button>
            <button
              onClick={() => setSourceType('webcam')}
              className={`px-3 py-1.5 rounded-lg transition-all flex items-center gap-1.5 ${
                sourceType === 'webcam'
                  ? 'bg-slate-800 text-cyan-300 font-medium'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Camera className="w-3.5 h-3.5" />
              Live Cam
            </button>
            <button
              onClick={() => fileInputRef.current?.click()}
              className={`px-3 py-1.5 rounded-lg transition-all flex items-center gap-1.5 ${
                sourceType === 'upload'
                  ? 'bg-slate-800 text-cyan-300 font-medium'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Upload className="w-3.5 h-3.5" />
              Upload Video
            </button>
          </div>

          <input
            type="file"
            ref={fileInputRef}
            onChange={handleFileUpload}
            accept="video/*,image/*"
            className="hidden"
          />

          {sourceType === 'webcam' && (
            <button
              onClick={() => setFacingMode((prev) => (prev === 'user' ? 'environment' : 'user'))}
              className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 transition-colors"
              title="Flip camera"
            >
              <RefreshCw className="w-3.5 h-3.5" />
            </button>
          )}

          <button
            onClick={handleTriggerScan}
            disabled={isProcessing}
            className="flex items-center space-x-2 bg-gradient-to-r from-cyan-600 to-indigo-600 hover:from-cyan-500 hover:to-indigo-500 text-white px-4 py-2 rounded-xl text-xs font-medium shadow-md shadow-cyan-900/30 transition-all disabled:opacity-50"
          >
            <Sparkles className={`w-3.5 h-3.5 ${isProcessing ? 'animate-spin' : ''}`} />
            <span>{isProcessing ? 'Perceiving...' : 'Perceive Scene'}</span>
          </button>
        </div>
      </div>

      {cameraError && (
        <div className="bg-amber-950/40 border border-amber-800/50 text-amber-200 px-4 py-3 rounded-xl text-xs flex items-center space-x-2">
          <AlertCircle className="w-4 h-4 text-amber-400 flex-shrink-0" />
          <span>{cameraError}</span>
        </div>
      )}

      {sourceType === 'webcam' && !hasApiKey && (
        <div className="bg-amber-950/50 border border-amber-700/60 text-amber-200 px-4 py-3 rounded-xl text-xs flex items-center justify-between shadow-lg">
          <div className="flex items-center space-x-2.5">
            <AlertCircle className="w-4 h-4 text-amber-400 flex-shrink-0" />
            <span>
              <strong>Gemini API Key Required:</strong> Real-time webcam perception needs a Gemini API key. Click <strong>"API Key"</strong> in the top header to enter your key, or use <strong>"Presets"</strong> for pre-calibrated room testing.
            </span>
          </div>
        </div>
      )}

      {/* Main Video Stage & Telemetry Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Video Canvas Stage */}
        <div className="lg:col-span-2 space-y-4">
          <div className="relative rounded-2xl overflow-hidden bg-slate-950 border border-slate-800 shadow-2xl group min-h-[380px] sm:min-h-[460px] flex items-center justify-center">
            {sourceType === 'webcam' ? (
              <video
                ref={videoRef}
                className="w-full h-full object-cover"
                playsInline
                muted
              />
            ) : sourceType === 'upload' && uploadedMediaUrl ? (
              uploadedMediaType === 'video' ? (
                <video
                  ref={videoRef}
                  src={uploadedMediaUrl}
                  className="w-full h-full object-cover"
                  controls
                  autoPlay
                  loop
                  playsInline
                  muted
                />
              ) : (
                <img
                  src={uploadedMediaUrl}
                  alt="Uploaded scene"
                  className="w-full h-full object-cover"
                />
              )
            ) : (
              <img
                src={selectedSample.posterUrl}
                alt={selectedSample.title}
                className="w-full h-full object-cover opacity-90 transition-opacity group-hover:opacity-100"
              />
            )}

            {/* Bounding Box HTML5 Canvas Overlay */}
            <canvas
              ref={canvasRef}
              width={1280}
              height={720}
              className="absolute inset-0 w-full h-full pointer-events-none z-10"
            />

            {/* Top Frame Telemetry Bar */}
            <div className="absolute top-3 left-3 right-3 flex items-center justify-between z-20 text-xs font-mono">
              <div className="bg-slate-950/80 backdrop-blur-md px-3 py-1.5 rounded-lg border border-slate-800 text-slate-200 flex items-center space-x-2">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
                <span>
                  STREAM:{' '}
                  {sourceType === 'webcam'
                    ? `LIVE WEBCAM (${facingMode.toUpperCase()})`
                    : sourceType === 'upload'
                    ? 'CUSTOM VIDEO/IMAGE'
                    : selectedSample.title.toUpperCase()}
                </span>
              </div>

              <div className="bg-slate-950/80 backdrop-blur-md px-3 py-1.5 rounded-lg border border-slate-800 text-cyan-300">
                <span>{detectedCount} SPATIALLY MAPPED OBJECTS</span>
              </div>
            </div>

            {/* Bottom HUD Bar */}
            <div className="absolute bottom-3 left-3 right-3 flex items-center justify-between z-20 text-xs">
              <div className="bg-slate-950/80 backdrop-blur-md px-3 py-1.5 rounded-lg border border-slate-800 text-slate-400 flex items-center space-x-2 font-mono">
                <span>RE-ID COMPOSITE MATCHING</span>
                <span>|</span>
                <span>STATE: TRACK AGING & OCCLUSION RESISTANT</span>
              </div>
            </div>
          </div>

          {/* Perception Overlay Layer Controls */}
          <div className="bg-slate-900/80 rounded-xl border border-slate-800 p-3 flex flex-wrap items-center justify-between gap-2 text-xs">
            <span className="text-slate-400 font-medium flex items-center gap-1.5">
              <Eye className="w-3.5 h-3.5 text-cyan-400" />
              Perception HUD Layers:
            </span>
            <div className="flex items-center space-x-2 flex-wrap gap-y-1">
              <button
                onClick={() => setShowMasks(!showMasks)}
                className={`px-2.5 py-1 rounded-md border font-mono transition-all ${
                  showMasks ? 'bg-cyan-950/70 border-cyan-700 text-cyan-300' : 'bg-slate-950 border-slate-800 text-slate-500 line-through'
                }`}
              >
                Mask Fills
              </button>
              <button
                onClick={() => setShowMesh(!showMesh)}
                className={`px-2.5 py-1 rounded-md border font-mono transition-all ${
                  showMesh ? 'bg-cyan-950/70 border-cyan-700 text-cyan-300' : 'bg-slate-950 border-slate-800 text-slate-500 line-through'
                }`}
              >
                Graph Mesh
              </button>
              <button
                onClick={() => setShowBadges(!showBadges)}
                className={`px-2.5 py-1 rounded-md border font-mono transition-all ${
                  showBadges ? 'bg-cyan-950/70 border-cyan-700 text-cyan-300' : 'bg-slate-950 border-slate-800 text-slate-500 line-through'
                }`}
              >
                Class Badges
              </button>
              <button
                onClick={() => setShowCentroids(!showCentroids)}
                className={`px-2.5 py-1 rounded-md border font-mono transition-all ${
                  showCentroids ? 'bg-cyan-950/70 border-cyan-700 text-cyan-300' : 'bg-slate-950 border-slate-800 text-slate-500 line-through'
                }`}
              >
                Centroids
              </button>
            </div>
          </div>

          {/* Sample Presets */}
          {sourceType === 'sample' && (
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {SAMPLE_VIDEOS.map((vid) => (
                <button
                  key={vid.id}
                  onClick={() => setSelectedSample(vid)}
                  className={`p-3 rounded-xl border text-left transition-all ${
                    selectedSample.id === vid.id
                      ? 'bg-cyan-950/40 border-cyan-500/50 text-slate-100 shadow-md shadow-cyan-950/30'
                      : 'bg-slate-900/60 border-slate-800 text-slate-400 hover:border-slate-700 hover:text-slate-200'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="font-medium text-xs text-slate-200">{vid.title}</span>
                    {selectedSample.id === vid.id && <CheckCircle2 className="w-4 h-4 text-cyan-400" />}
                  </div>
                  <p className="text-[11px] text-slate-400 mt-1 line-clamp-1">{vid.description}</p>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Right Sidebar: Active Objects in Scene */}
        <div className="space-y-4">
          <div className="bg-slate-900/80 rounded-2xl border border-slate-800 p-4 space-y-4 shadow-xl">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="text-sm font-semibold text-slate-100 flex items-center gap-2">
                <Layers className="w-4 h-4 text-cyan-400" />
                Active Objects in Feed
              </h3>
              <span className="text-xs font-mono text-cyan-400 bg-cyan-950 px-2 py-0.5 rounded border border-cyan-800/60">
                {detectedCount} Detected
              </span>
            </div>

            {/* Confidence Slider */}
            <div className="space-y-1.5 text-xs">
              <div className="flex items-center justify-between text-slate-400">
                <span>Confidence Threshold</span>
                <span className="font-mono text-cyan-300">{Math.round(confidenceThreshold * 100)}%</span>
              </div>
              <input
                type="range"
                min="0.5"
                max="0.95"
                step="0.05"
                value={confidenceThreshold}
                onChange={(e) => setConfidenceThreshold(parseFloat(e.target.value))}
                className="w-full accent-cyan-500 bg-slate-800 rounded-lg h-1.5 cursor-pointer"
              />
            </div>

            {/* List of objects */}
            <div className="space-y-2.5 max-h-[380px] overflow-y-auto pr-1">
              {trackedObjects
                .filter((o) => o.status === 'visible' && o.recentConfidence >= confidenceThreshold)
                .map((obj) => (
                  <div
                    key={obj.id}
                    onClick={() => onSelectObject(obj)}
                    className="p-3 rounded-xl bg-slate-950/80 border border-slate-800 hover:border-cyan-500/50 hover:bg-slate-900/90 transition-all cursor-pointer group flex items-start space-x-3"
                  >
                    <img
                      src={obj.thumbnailPath}
                      alt={obj.className}
                      className="w-12 h-12 rounded-lg object-cover bg-slate-800 border border-slate-700/80 group-hover:scale-105 transition-transform"
                    />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-semibold text-slate-100 truncate group-hover:text-cyan-300 transition-colors">
                          {obj.className.toUpperCase()}
                        </span>
                        <span className="text-[10px] font-mono text-cyan-400 font-bold">
                          #OBJ-{obj.id}
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-400 truncate mt-0.5">{obj.zone || obj.description}</p>

                      <div className="flex items-center justify-between mt-2 text-[10px] font-mono text-slate-500">
                        <span>({obj.lastLocationX}m, {obj.lastLocationY}m)</span>
                        <span className="text-emerald-400 font-medium">
                          {Math.round(obj.recentConfidence * 100)}% Conf
                        </span>
                      </div>
                    </div>
                  </div>
                ))}

              {detectedCount === 0 && (
                <div className="text-center py-8 text-xs text-slate-500">
                  No objects currently visible in the active frame.
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
