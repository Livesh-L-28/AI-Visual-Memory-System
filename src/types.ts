export type ObjectStatus = 'visible' | 'lost';

export interface BoundingBox {
  x1: number; // 0 to 1 normalized
  y1: number;
  x2: number;
  y2: number;
}

export interface Detection {
  id: number;
  objectId?: number;
  trackId: number;
  className: string;
  confidence: number;
  bbox: BoundingBox;
  frameId: number;
  timestamp: string;
  croppedThumbnail?: string;
}

export interface TrajectoryPoint {
  x: number;
  y: number;
  timestamp: string;
}

export interface TrackedObject {
  id: number; // Permanent Object ID
  className: string;
  roomId: number;
  firstSeen: string;
  lastSeen: string;
  lastLocationX: number; // Floor plan X (meters)
  lastLocationY: number; // Floor plan Y (meters)
  status: ObjectStatus;
  thumbnailPath: string;
  faissIndexId: number;
  embeddingVector: number[];
  recentConfidence: number;
  latestBbox?: BoundingBox;
  description?: string;
  historyCount: number;
  trajectory?: TrajectoryPoint[];
  consecutiveMissedFrames?: number;
  zone?: string;
}

export interface DetectionHistoryEntry {
  id: number;
  objectId: number;
  trackId: number;
  frameId: number;
  timestamp: string;
  bbox: BoundingBox;
  confidence: number;
  locationX: number;
  locationY: number;
}

export interface RoomCalibrationPoint {
  pxX: number; // pixel X (0..1)
  pxY: number; // pixel Y (0..1)
  mapX: number; // map X in meters
  mapY: number; // map Y in meters
}

export interface RoomZone {
  id: string;
  name: string;
  color: string;
  x1: number; // in meters
  y1: number;
  x2: number;
  y2: number;
}

export interface Room {
  id: number;
  name: string;
  widthMeters: number;
  heightMeters: number;
  calibrationPoints: RoomCalibrationPoint[];
  zones?: RoomZone[];
  homographyMatrix?: number[];
}

export type WsServerMessage =
  | {
      type: 'telemetry_tick';
      timestamp: string;
      stats: SystemStats;
      activeCount: number;
      visibleObjects: Array<{
        id: number;
        className: string;
        lastLocationX: number;
        lastLocationY: number;
        recentConfidence: number;
        status: ObjectStatus;
        zone?: string;
      }>;
    }
  | {
      type: 'object_status_changed';
      objectId: number;
      className: string;
      status: ObjectStatus;
      lastLocationX: number;
      lastLocationY: number;
      timestamp: string;
      zone?: string;
    }
  | {
      type: 'objects_updated';
      objects: TrackedObject[];
      stats: SystemStats;
    }
  | {
      type: 'frame_processed_result';
      summary: string;
      detections: Detection[];
    };

export interface SystemStats {
  fps: number;
  totalObjects: number;
  visibleObjects: number;
  lostObjects: number;
  objectsByClass: Record<string, number>;
  vectorCount: number;
  averageReidConfidence: number;
  uptimeSeconds: number;
  totalFramesProcessed: number;
}

export interface SearchResult {
  object: TrackedObject;
  similarityScore: number;
  matchReason: string;
}

export interface ChatMessage {
  id: string;
  sender: 'user' | 'assistant' | 'system';
  text: string;
  timestamp: string;
  searchResults?: SearchResult[];
  referencedObject?: TrackedObject;
  mapPin?: { x: number; y: number; label: string };
  toolCalls?: string[];
}

export interface SampleVideoSource {
  id: string;
  title: string;
  description: string;
  category: 'office' | 'living_room' | 'desk' | 'kitchen';
  posterUrl: string;
  objectsPresent: string[];
}
