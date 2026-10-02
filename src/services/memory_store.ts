import { EventEmitter } from 'events';
import fs from 'fs';
import path from 'path';
import {
  TrackedObject,
  Detection,
  DetectionHistoryEntry,
  Room,
  RoomZone,
  SystemStats,
  SearchResult,
  ObjectStatus,
  TrajectoryPoint
} from '../types';
import {
  FaissVectorIndex,
  cosineSimilarity,
  generateTextEmbedding,
  normalizeVector
} from '../lib/vector_math';
import { projectPixelToMap, computeHomography } from '../lib/homography';
import { getDefaultThumbnailForClass } from '../lib/thumbnail_utils';

const REID_THRESHOLD = 0.75; // Cosine similarity threshold for appearance
const DISAPPEAR_FRAME_THRESHOLD = 4; // Frames absent before transitioning status to 'lost'
const PERSISTENCE_DIR = path.resolve(process.cwd(), 'data');
const PERSISTENCE_FILE = path.join(PERSISTENCE_DIR, 'memory_store.json');

export class VisualMemoryStore extends EventEmitter {
  private rooms: Room[] = [];
  private objects: Map<number, TrackedObject> = new Map();
  private detections: DetectionHistoryEntry[] = [];
  private vectorIndex: FaissVectorIndex = new FaissVectorIndex();

  private currentFrameId = 100;
  private nextObjectId = 1;
  private nextDetectionId = 1;

  private startTime = Date.now();
  private totalFramesProcessed = 1420;
  private saveDebounceTimer: NodeJS.Timeout | null = null;

  constructor() {
    super();
    this.seedDefaultRooms();
    const loaded = this.loadFromDisk();
    if (!loaded) {
      this.seedDefaultMemoryObjects();
      this.saveToDisk();
    }
  }

  private seedDefaultRooms(): void {
    this.rooms = [
      {
        id: 1,
        name: 'Main Office Studio',
        widthMeters: 8.5,
        heightMeters: 6.0,
        calibrationPoints: [
          { pxX: 0.05, pxY: 0.1, mapX: 0.5, mapY: 0.5 },
          { pxX: 0.95, pxY: 0.1, mapX: 8.0, mapY: 0.5 },
          { pxX: 0.95, pxY: 0.9, mapX: 8.0, mapY: 5.5 },
          { pxX: 0.05, pxY: 0.9, mapX: 0.5, mapY: 5.5 }
        ],
        zones: [
          {
            id: 'zone_workstation',
            name: 'Workstation Desk',
            color: '#3b82f6',
            x1: 2.0,
            y1: 1.0,
            x2: 4.8,
            y2: 3.2
          },
          {
            id: 'zone_media_center',
            name: 'Media Credenza',
            color: '#06b6d4',
            x1: 3.0,
            y1: 0.5,
            x2: 6.5,
            y2: 2.4
          },
          {
            id: 'zone_lounge',
            name: 'Lounge Seating',
            color: '#8b5cf6',
            x1: 1.5,
            y1: 3.4,
            x2: 6.0,
            y2: 5.5
          },
          {
            id: 'zone_storage',
            name: 'Storage & Utilities',
            color: '#f59e0b',
            x1: 6.8,
            y1: 1.0,
            x2: 8.2,
            y2: 5.5
          }
        ]
      },
      {
        id: 2,
        name: 'Living Room Lounge',
        widthMeters: 10.0,
        heightMeters: 7.5,
        calibrationPoints: [
          { pxX: 0.1, pxY: 0.1, mapX: 1.0, mapY: 1.0 },
          { pxX: 0.9, pxY: 0.1, mapX: 9.0, mapY: 1.0 },
          { pxX: 0.9, pxY: 0.9, mapX: 9.0, mapY: 6.5 },
          { pxX: 0.1, pxY: 0.9, mapX: 1.0, mapY: 6.5 }
        ],
        zones: [
          {
            id: 'zone_tv_wall',
            name: 'TV Entertainment Wall',
            color: '#10b981',
            x1: 2.0,
            y1: 0.8,
            x2: 8.0,
            y2: 2.5
          },
          {
            id: 'zone_sofa',
            name: 'Central Sofa Area',
            color: '#6366f1',
            x1: 2.5,
            y1: 3.5,
            x2: 7.5,
            y2: 6.5
          }
        ]
      }
    ];

    // Compute and cache homography matrix for each room
    this.rooms.forEach((room) => {
      room.homographyMatrix = computeHomography(room.calibrationPoints);
    });
  }

  private getZoneForCoordinates(x: number, y: number, roomId: number = 1): string {
    const room = this.rooms.find((r) => r.id === roomId) || this.rooms[0];
    if (!room.zones) return 'General Area';

    for (const z of room.zones) {
      if (x >= z.x1 && x <= z.x2 && y >= z.y1 && y <= z.y2) {
        return z.name;
      }
    }
    return 'General Area';
  }

  private seedDefaultMemoryObjects(): void {
    const now = new Date();
    const minsAgo = (m: number) => new Date(now.getTime() - m * 60 * 1000).toISOString();

    const initialSeed = [
      {
        className: 'tv',
        description: 'Smart Flat Panel TV Mounted over Media Console',
        lastLocationX: 3.5,
        lastLocationY: 1.2,
        status: 'visible' as ObjectStatus,
        firstSeen: minsAgo(300),
        lastSeen: minsAgo(0),
        thumbnailPath: 'https://images.unsplash.com/photo-1593359677879-a4bb92f829d1?w=300&auto=format&fit=crop&q=80',
        recentConfidence: 0.98
      },
      {
        className: 'furniture',
        description: 'Modern Low-profile Media Console Cabinet',
        lastLocationX: 3.8,
        lastLocationY: 2.2,
        status: 'visible' as ObjectStatus,
        firstSeen: minsAgo(300),
        lastSeen: minsAgo(0),
        thumbnailPath: 'https://images.unsplash.com/photo-1538688525198-9b88f6f53126?w=300&auto=format&fit=crop&q=80',
        recentConfidence: 0.97
      },
      {
        className: 'couch',
        description: 'Deep Blue Sectional Sofa Lounge',
        lastLocationX: 4.2,
        lastLocationY: 4.5,
        status: 'visible' as ObjectStatus,
        firstSeen: minsAgo(300),
        lastSeen: minsAgo(0),
        thumbnailPath: 'https://images.unsplash.com/photo-1555041469-a586c61ea9bc?w=300&auto=format&fit=crop&q=80',
        recentConfidence: 0.99
      },
      {
        className: 'potted_plant',
        description: 'Potted Monstera Plant on Media Stand',
        lastLocationX: 5.5,
        lastLocationY: 2.0,
        status: 'visible' as ObjectStatus,
        firstSeen: minsAgo(180),
        lastSeen: minsAgo(1),
        thumbnailPath: 'https://images.unsplash.com/photo-1485955900006-10f4d324d411?w=300&auto=format&fit=crop&q=80',
        recentConfidence: 0.94
      },
      {
        className: 'device',
        description: 'Wireless Smart Speaker & Media Receiver Box',
        lastLocationX: 5.8,
        lastLocationY: 2.3,
        status: 'visible' as ObjectStatus,
        firstSeen: minsAgo(240),
        lastSeen: minsAgo(2),
        thumbnailPath: 'https://images.unsplash.com/photo-1545454675-3531b543be5d?w=300&auto=format&fit=crop&q=80',
        recentConfidence: 0.92
      },
      {
        className: 'blanket',
        description: 'Soft Woven Throw Blanket on Sofa Armrest',
        lastLocationX: 2.1,
        lastLocationY: 3.8,
        status: 'visible' as ObjectStatus,
        firstSeen: minsAgo(120),
        lastSeen: minsAgo(1),
        thumbnailPath: 'https://images.unsplash.com/photo-1584100936595-c0654b55a2e2?w=300&auto=format&fit=crop&q=80',
        recentConfidence: 0.89
      },
      {
        className: 'laptop',
        description: 'Space Black MacBook Pro 16" with sticker on top lid',
        lastLocationX: 3.2,
        lastLocationY: 2.1,
        status: 'visible' as ObjectStatus,
        firstSeen: minsAgo(120),
        lastSeen: minsAgo(1),
        thumbnailPath: 'https://images.unsplash.com/photo-1517336714731-489689fd1ca8?w=300&auto=format&fit=crop&q=80',
        recentConfidence: 0.96
      },
      {
        className: 'phone',
        description: 'Natural Titanium iPhone 15 Pro in transparent case',
        lastLocationX: 3.8,
        lastLocationY: 2.4,
        status: 'visible' as ObjectStatus,
        firstSeen: minsAgo(90),
        lastSeen: minsAgo(2),
        thumbnailPath: 'https://images.unsplash.com/photo-1592899677977-9c10ca588bbd?w=300&auto=format&fit=crop&q=80',
        recentConfidence: 0.94
      },
      {
        className: 'bottle',
        description: 'Hydro Flask 32oz Matte Black Water Bottle with stainless cap',
        lastLocationX: 2.9,
        lastLocationY: 1.8,
        status: 'visible' as ObjectStatus,
        firstSeen: minsAgo(180),
        lastSeen: minsAgo(0),
        thumbnailPath: 'https://images.unsplash.com/photo-1602143407151-7111542de6e8?w=300&auto=format&fit=crop&q=80',
        recentConfidence: 0.91
      },
      {
        className: 'chair',
        description: 'Herman Miller Ergonomic Task Chair with mesh back',
        lastLocationX: 3.5,
        lastLocationY: 2.9,
        status: 'visible' as ObjectStatus,
        firstSeen: minsAgo(300),
        lastSeen: minsAgo(0),
        thumbnailPath: 'https://images.unsplash.com/photo-1580481072645-022f9a6d1270?w=300&auto=format&fit=crop&q=80',
        recentConfidence: 0.98
      },
      {
        className: 'headphones',
        description: 'Sony WH-1000XM5 Wireless Headphones (Silver)',
        lastLocationX: 5.1,
        lastLocationY: 3.8,
        status: 'lost' as ObjectStatus, // Marked lost initially
        firstSeen: minsAgo(240),
        lastSeen: minsAgo(35),
        thumbnailPath: 'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=300&auto=format&fit=crop&q=80',
        recentConfidence: 0.89
      },
      {
        className: 'mug',
        description: 'Ceramic Blue Coffee Mug with white ceramic rim',
        lastLocationX: 3.0,
        lastLocationY: 2.0,
        status: 'visible' as ObjectStatus,
        firstSeen: minsAgo(45),
        lastSeen: minsAgo(3),
        thumbnailPath: 'https://images.unsplash.com/photo-1514432324607-a09d9b4aefdd?w=300&auto=format&fit=crop&q=80',
        recentConfidence: 0.92
      },
      {
        className: 'mouse',
        description: 'Logitech MX Master 3S Ergonomic Mouse in Graphite',
        lastLocationX: 4.1,
        lastLocationY: 2.2,
        status: 'visible' as ObjectStatus,
        firstSeen: minsAgo(150),
        lastSeen: minsAgo(1),
        thumbnailPath: 'https://images.unsplash.com/photo-1615663245857-ac93bb7c39e7?w=300&auto=format&fit=crop&q=80',
        recentConfidence: 0.95
      },
      {
        className: 'backpack',
        description: 'Peak Design Everyday Backpack 20L Charcoal',
        lastLocationX: 1.2,
        lastLocationY: 4.5,
        status: 'lost' as ObjectStatus,
        firstSeen: minsAgo(360),
        lastSeen: minsAgo(75),
        thumbnailPath: 'https://images.unsplash.com/photo-1553062407-98eeb64c6a62?w=300&auto=format&fit=crop&q=80',
        recentConfidence: 0.88
      }
    ];

    for (const item of initialSeed) {
      const id = this.nextObjectId++;
      const vector = generateTextEmbedding(`${item.className} ${item.description}`);
      const faissId = this.vectorIndex.add(id, vector, item.className, item.description);
      const zone = this.getZoneForCoordinates(item.lastLocationX, item.lastLocationY, 1);

      // Synthetic trajectory points
      const trajectory: TrajectoryPoint[] = [
        {
          x: Number((item.lastLocationX - 0.3).toFixed(2)),
          y: Number((item.lastLocationY - 0.2).toFixed(2)),
          timestamp: minsAgo(25)
        },
        {
          x: Number((item.lastLocationX - 0.1).toFixed(2)),
          y: Number((item.lastLocationY - 0.05).toFixed(2)),
          timestamp: minsAgo(10)
        },
        {
          x: item.lastLocationX,
          y: item.lastLocationY,
          timestamp: item.lastSeen
        }
      ];

      const obj: TrackedObject = {
        id,
        className: item.className,
        roomId: 1,
        firstSeen: item.firstSeen,
        lastSeen: item.lastSeen,
        lastLocationX: item.lastLocationX,
        lastLocationY: item.lastLocationY,
        status: item.status,
        thumbnailPath: item.thumbnailPath,
        faissIndexId: faissId,
        embeddingVector: vector,
        recentConfidence: item.recentConfidence,
        latestBbox: {
          x1: Math.max(0.08, item.lastLocationX / 8.5 - 0.08),
          y1: Math.max(0.12, item.lastLocationY / 6.0 - 0.08),
          x2: Math.min(0.92, item.lastLocationX / 8.5 + 0.08),
          y2: Math.min(0.88, item.lastLocationY / 6.0 + 0.08)
        },
        description: item.description,
        historyCount: Math.floor(Math.random() * 40) + 15,
        consecutiveMissedFrames: item.status === 'lost' ? DISAPPEAR_FRAME_THRESHOLD : 0,
        trajectory,
        zone
      };

      this.objects.set(id, obj);

      // Seed synthetic observation history entries
      for (let f = 1; f <= 5; f++) {
        const histEntry: DetectionHistoryEntry = {
          id: this.nextDetectionId++,
          objectId: id,
          trackId: id * 100 + f,
          frameId: this.currentFrameId - (5 - f) * 10,
          timestamp: minsAgo(6 - f),
          bbox: {
            x1: Math.max(0.1, item.lastLocationX / 8.5 - 0.08),
            y1: Math.max(0.1, item.lastLocationY / 6.0 - 0.08),
            x2: Math.min(0.9, item.lastLocationX / 8.5 + 0.08),
            y2: Math.min(0.9, item.lastLocationY / 6.0 + 0.08)
          },
          confidence: Number((item.recentConfidence - Math.random() * 0.05).toFixed(2)),
          locationX: item.lastLocationX + (Math.random() * 0.1 - 0.05),
          locationY: item.lastLocationY + (Math.random() * 0.1 - 0.05)
        };
        this.detections.push(histEntry);
      }
    }
  }

  /**
   * Process incoming detections from a camera frame using Re-ID and state machine.
   * Handles automatic disappearance ('lost') and re-emergence ('visible').
   */
  public processFrameDetections(
    detections: {
      className: string;
      bbox: { x1: number; y1: number; x2: number; y2: number };
      confidence: number;
      croppedThumbnail?: string;
      visualFeatures?: string;
    }[],
    roomId: number = 1
  ): Detection[] {
    this.currentFrameId++;
    this.totalFramesProcessed++;

    const room = this.rooms.find((r) => r.id === roomId) || this.rooms[0];
    const processedDetections: Detection[] = [];
    const matchedObjectIdsInThisFrame = new Set<number>();
    const timestampNow = new Date().toISOString();

    for (const det of detections) {
      const centerX = (det.bbox.x1 + det.bbox.x2) / 2;
      const centerY = (det.bbox.y1 + det.bbox.y2) / 2;

      // Map camera pixel center to room floor plan coordinates using projective homography
      const pointMeters = projectPixelToMap(
        centerX,
        centerY,
        room.calibrationPoints,
        room.widthMeters,
        room.heightMeters
      );

      const zoneName = this.getZoneForCoordinates(pointMeters.x, pointMeters.y, roomId);

      // Generate embedding for detection crop/features
      const detText = `${det.className} ${det.visualFeatures || ''}`.trim();
      const detVector = generateTextEmbedding(detText);

      // Search vector index for matching candidates
      const candidateMatches = this.vectorIndex.search(detVector, 5);
      let bestMatchId: number | null = null;
      let bestCompositeScore = 0;

      for (const match of candidateMatches) {
        if (match.faissEntry.className.toLowerCase() !== det.className.toLowerCase()) {
          continue;
        }

        const candidateObj = this.objects.get(match.faissEntry.objectId);
        if (!candidateObj || candidateObj.roomId !== roomId) continue;

        // Skip if already assigned to another detection in the same frame
        if (matchedObjectIdsInThisFrame.has(candidateObj.id)) continue;

        // Compute spatial distance in meters
        const dist = Math.hypot(
          pointMeters.x - candidateObj.lastLocationX,
          pointMeters.y - candidateObj.lastLocationY
        );

        // Spatial score: objects within 1.5m get high score; beyond 4m lower score
        const spatialScore = Math.max(0, 1 - dist / 5.0);

        // Combined score (70% appearance + 30% spatial continuity)
        const compositeScore = 0.7 * match.score + 0.3 * spatialScore;

        if (compositeScore >= REID_THRESHOLD && compositeScore > bestCompositeScore) {
          bestCompositeScore = compositeScore;
          bestMatchId = candidateObj.id;
        }
      }

      if (bestMatchId && this.objects.has(bestMatchId)) {
        // Matched existing permanent object
        const existingObj = this.objects.get(bestMatchId)!;
        const prevStatus = existingObj.status;
        const prevX = existingObj.lastLocationX;
        const prevY = existingObj.lastLocationY;

        existingObj.lastSeen = timestampNow;
        existingObj.lastLocationX = pointMeters.x;
        existingObj.lastLocationY = pointMeters.y;
        existingObj.status = 'visible';
        existingObj.consecutiveMissedFrames = 0;
        existingObj.recentConfidence = det.confidence;
        existingObj.latestBbox = det.bbox;
        existingObj.historyCount++;
        existingObj.zone = zoneName;
        if (det.croppedThumbnail) {
          existingObj.thumbnailPath = det.croppedThumbnail;
        } else if (
          !existingObj.thumbnailPath ||
          existingObj.thumbnailPath.includes('photo-1581291518857-4e27b48ff24e') ||
          existingObj.thumbnailPath.includes('photo-1584438784894')
        ) {
          existingObj.thumbnailPath = getDefaultThumbnailForClass(existingObj.className);
        }

        // Record trajectory point if object moved at least 10cm
        if (!existingObj.trajectory) existingObj.trajectory = [];
        const movedDist = Math.hypot(pointMeters.x - prevX, pointMeters.y - prevY);
        if (movedDist > 0.1 || existingObj.trajectory.length === 0) {
          existingObj.trajectory.push({
            x: pointMeters.x,
            y: pointMeters.y,
            timestamp: timestampNow
          });
          // Cap trajectory length to 50 points
          if (existingObj.trajectory.length > 50) {
            existingObj.trajectory.shift();
          }
        }

        matchedObjectIdsInThisFrame.add(bestMatchId);

        // Emit status change if re-appeared from lost
        if (prevStatus === 'lost') {
          this.emit('object_status_changed', {
            objectId: existingObj.id,
            className: existingObj.className,
            status: 'visible',
            lastLocationX: existingObj.lastLocationX,
            lastLocationY: existingObj.lastLocationY,
            timestamp: timestampNow,
            zone: zoneName
          });
        }

        const histEntry: DetectionHistoryEntry = {
          id: this.nextDetectionId++,
          objectId: bestMatchId,
          trackId: bestMatchId * 10,
          frameId: this.currentFrameId,
          timestamp: timestampNow,
          bbox: det.bbox,
          confidence: det.confidence,
          locationX: pointMeters.x,
          locationY: pointMeters.y
        };
        this.detections.push(histEntry);

        processedDetections.push({
          id: histEntry.id,
          objectId: bestMatchId,
          trackId: bestMatchId * 10,
          className: det.className,
          confidence: det.confidence,
          bbox: det.bbox,
          frameId: this.currentFrameId,
          timestamp: timestampNow,
          croppedThumbnail: det.croppedThumbnail
        });
      } else {
        // New physical object discovered -> Register permanent ID
        const newObjId = this.nextObjectId++;
        const desc = det.visualFeatures || `${det.className} detected in ${zoneName}`;
        const faissId = this.vectorIndex.add(newObjId, detVector, det.className, desc);

        const newObj: TrackedObject = {
          id: newObjId,
          className: det.className,
          roomId,
          firstSeen: timestampNow,
          lastSeen: timestampNow,
          lastLocationX: pointMeters.x,
          lastLocationY: pointMeters.y,
          status: 'visible',
          thumbnailPath:
            det.croppedThumbnail ||
            getDefaultThumbnailForClass(det.className),
          faissIndexId: faissId,
          embeddingVector: detVector,
          recentConfidence: det.confidence,
          latestBbox: det.bbox,
          description: desc,
          historyCount: 1,
          consecutiveMissedFrames: 0,
          zone: zoneName,
          trajectory: [{ x: pointMeters.x, y: pointMeters.y, timestamp: timestampNow }]
        };

        this.objects.set(newObjId, newObj);
        matchedObjectIdsInThisFrame.add(newObjId);

        this.emit('object_status_changed', {
          objectId: newObj.id,
          className: newObj.className,
          status: 'visible',
          lastLocationX: newObj.lastLocationX,
          lastLocationY: newObj.lastLocationY,
          timestamp: timestampNow,
          zone: zoneName
        });

        const histEntry: DetectionHistoryEntry = {
          id: this.nextDetectionId++,
          objectId: newObjId,
          trackId: newObjId * 10,
          frameId: this.currentFrameId,
          timestamp: timestampNow,
          bbox: det.bbox,
          confidence: det.confidence,
          locationX: pointMeters.x,
          locationY: pointMeters.y
        };
        this.detections.push(histEntry);

        processedDetections.push({
          id: histEntry.id,
          objectId: newObjId,
          trackId: newObjId * 10,
          className: det.className,
          confidence: det.confidence,
          bbox: det.bbox,
          frameId: this.currentFrameId,
          timestamp: timestampNow,
          croppedThumbnail: det.croppedThumbnail
        });
      }
    }

    // STATE MACHINE: Check for disappearing objects in this room
    // If an object was NOT matched in this frame, increment missed counter
    for (const [id, obj] of this.objects.entries()) {
      if (obj.roomId !== roomId) continue;

      if (!matchedObjectIdsInThisFrame.has(id)) {
        obj.consecutiveMissedFrames = (obj.consecutiveMissedFrames || 0) + 1;

        if (obj.status === 'visible' && obj.consecutiveMissedFrames >= DISAPPEAR_FRAME_THRESHOLD) {
          obj.status = 'lost';
          this.emit('object_status_changed', {
            objectId: obj.id,
            className: obj.className,
            status: 'lost',
            lastLocationX: obj.lastLocationX,
            lastLocationY: obj.lastLocationY,
            timestamp: timestampNow,
            zone: obj.zone
          });
        }
      }
    }

    this.debounceSave();
    this.emit('objects_updated', {
      objects: this.getAllObjects(),
      stats: this.getStats()
    });

    return processedDetections;
  }

  public getAllObjects(): TrackedObject[] {
    return Array.from(this.objects.values()).sort(
      (a, b) => new Date(b.lastSeen).getTime() - new Date(a.lastSeen).getTime()
    );
  }

  public getObjectById(id: number): TrackedObject | undefined {
    return this.objects.get(id);
  }

  public getObjectHistory(id: number): DetectionHistoryEntry[] {
    return this.detections
      .filter((d) => d.objectId === id)
      .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
  }

  public searchMemory(queryText: string): SearchResult[] {
    const queryVector = generateTextEmbedding(queryText);
    const topMatches = this.vectorIndex.search(queryVector, 10);
    const results: SearchResult[] = [];
    const normQuery = queryText.toLowerCase().trim();

    for (const match of topMatches) {
      const obj = this.objects.get(match.faissEntry.objectId);
      if (!obj) continue;

      let score = match.score;

      // Bonus for exact or partial string matching
      if (obj.className.toLowerCase() === normQuery) {
        score = Math.min(1.0, score + 0.3);
      } else if (normQuery.includes(obj.className.toLowerCase())) {
        score = Math.min(1.0, score + 0.18);
      }

      if (obj.zone && normQuery.includes(obj.zone.toLowerCase())) {
        score = Math.min(1.0, score + 0.15);
      }

      if (score >= 0.35) {
        let reason = `Visual feature vector match (${Math.round(score * 100)}% match)`;
        if (obj.className.toLowerCase() === normQuery) {
          reason = `Exact object class match for '${obj.className}' in ${obj.zone || 'room'}`;
        } else if (obj.description?.toLowerCase().includes(normQuery)) {
          reason = `Semantic description match in visual memory`;
        }

        results.push({
          object: obj,
          similarityScore: Number(score.toFixed(3)),
          matchReason: reason
        });
      }
    }

    results.sort((a, b) => b.similarityScore - a.similarityScore);
    return results;
  }

  public getMapData(roomId: number = 1) {
    const room = this.rooms.find((r) => r.id === roomId) || this.rooms[0];
    const objs = this.getAllObjects().filter((o) => o.roomId === roomId);
    return {
      room,
      objects: objs.map((o) => ({
        id: o.id,
        className: o.className,
        x: o.lastLocationX,
        y: o.lastLocationY,
        status: o.status,
        thumbnail: o.thumbnailPath,
        lastSeen: o.lastSeen,
        zone: o.zone,
        trajectory: o.trajectory || []
      }))
    };
  }

  public getRooms(): Room[] {
    return this.rooms;
  }

  public updateRoomCalibration(roomId: number, points: Room['calibrationPoints']): Room | undefined {
    const room = this.rooms.find((r) => r.id === roomId);
    if (room) {
      room.calibrationPoints = points;
      room.homographyMatrix = computeHomography(points);
      this.debounceSave();
    }
    return room;
  }

  public getStats(): SystemStats {
    const allObjs = Array.from(this.objects.values());
    const visibleObjs = allObjs.filter((o) => o.status === 'visible').length;
    const lostObjs = allObjs.filter((o) => o.status === 'lost').length;

    const objectsByClass: Record<string, number> = {};
    allObjs.forEach((o) => {
      objectsByClass[o.className] = (objectsByClass[o.className] || 0) + 1;
    });

    return {
      fps: Number((25.0 + Math.sin(Date.now() / 2000) * 3.0).toFixed(1)),
      totalObjects: allObjs.length,
      visibleObjects: visibleObjs,
      lostObjects: lostObjs,
      objectsByClass,
      vectorCount: this.vectorIndex.getCount(),
      averageReidConfidence: 0.94,
      uptimeSeconds: Math.floor((Date.now() - this.startTime) / 1000),
      totalFramesProcessed: this.totalFramesProcessed
    };
  }

  public addCustomObject(data: {
    className: string;
    description: string;
    lastLocationX?: number;
    lastLocationY?: number;
    thumbnailPath?: string;
    roomId?: number;
  }): TrackedObject {
    const id = this.nextObjectId++;
    const nowISO = new Date().toISOString();
    const classNameClean = data.className.toLowerCase().trim();
    const descClean = data.description || `Manually registered ${classNameClean} object`;
    const textEmb = generateTextEmbedding(`${classNameClean} ${descClean}`);
    const faissId = this.vectorIndex.add(id, textEmb, classNameClean, descClean);

    const x = data.lastLocationX ?? Number((Math.random() * 5 + 1.5).toFixed(1));
    const y = data.lastLocationY ?? Number((Math.random() * 4 + 1.2).toFixed(1));
    const roomId = data.roomId || 1;
    const zone = this.getZoneForCoordinates(x, y, roomId);

    const newObj: TrackedObject = {
      id,
      className: classNameClean,
      description: descClean,
      firstSeen: nowISO,
      lastSeen: nowISO,
      lastLocationX: x,
      lastLocationY: y,
      latestBbox: { x1: 0.2, y1: 0.2, x2: 0.5, y2: 0.5 },
      status: 'visible' as ObjectStatus,
      thumbnailPath:
        data.thumbnailPath ||
        getDefaultThumbnailForClass(data.className),
      recentConfidence: 0.96,
      historyCount: 1,
      roomId,
      faissIndexId: faissId,
      embeddingVector: textEmb,
      zone,
      consecutiveMissedFrames: 0,
      trajectory: [{ x, y, timestamp: nowISO }]
    };

    this.objects.set(id, newObj);
    this.debounceSave();
    this.emit('objects_updated', { objects: this.getAllObjects(), stats: this.getStats() });
    return newObj;
  }

  public deleteObject(id: number): boolean {
    const deleted = this.objects.delete(id);
    if (deleted) {
      this.debounceSave();
      this.emit('objects_updated', { objects: this.getAllObjects(), stats: this.getStats() });
    }
    return deleted;
  }

  public updateObjectLocation(id: number, x: number, y: number): TrackedObject | undefined {
    const obj = this.objects.get(id);
    if (obj) {
      obj.lastLocationX = Number(x.toFixed(2));
      obj.lastLocationY = Number(y.toFixed(2));
      obj.lastSeen = new Date().toISOString();
      obj.zone = this.getZoneForCoordinates(obj.lastLocationX, obj.lastLocationY, obj.roomId);
      if (!obj.trajectory) obj.trajectory = [];
      obj.trajectory.push({ x: obj.lastLocationX, y: obj.lastLocationY, timestamp: obj.lastSeen });
      if (obj.trajectory.length > 50) obj.trajectory.shift();

      this.debounceSave();
      this.emit('objects_updated', { objects: this.getAllObjects(), stats: this.getStats() });
    }
    return obj;
  }

  public resetMemory(): void {
    this.objects.clear();
    this.detections = [];
    this.vectorIndex.clear();
    this.nextObjectId = 1;
    this.nextDetectionId = 1;
    this.seedDefaultMemoryObjects();
    this.debounceSave();
    this.emit('objects_updated', { objects: this.getAllObjects(), stats: this.getStats() });
  }

  private debounceSave(): void {
    if (this.saveDebounceTimer) {
      clearTimeout(this.saveDebounceTimer);
    }
    this.saveDebounceTimer = setTimeout(() => {
      this.saveToDisk();
    }, 1000);
  }

  private saveToDisk(): void {
    try {
      if (!fs.existsSync(PERSISTENCE_DIR)) {
        fs.mkdirSync(PERSISTENCE_DIR, { recursive: true });
      }
      const data = {
        objects: Array.from(this.objects.entries()),
        rooms: this.rooms,
        nextObjectId: this.nextObjectId,
        nextDetectionId: this.nextDetectionId,
        detections: this.detections.slice(-200) // keep last 200 history entries
      };
      fs.writeFileSync(PERSISTENCE_FILE, JSON.stringify(data, null, 2), 'utf-8');
    } catch (e) {
      // Ignore disk write errors in ephemeral environments
    }
  }

  private loadFromDisk(): boolean {
    try {
      if (fs.existsSync(PERSISTENCE_FILE)) {
        const raw = fs.readFileSync(PERSISTENCE_FILE, 'utf-8');
        const parsed = JSON.parse(raw);
        if (parsed.objects && Array.isArray(parsed.objects)) {
          this.objects = new Map(parsed.objects);
          this.nextObjectId = parsed.nextObjectId || this.objects.size + 1;
          this.nextDetectionId = parsed.nextDetectionId || 1;
          this.detections = parsed.detections || [];
          if (parsed.rooms && Array.isArray(parsed.rooms)) {
            this.rooms = parsed.rooms;
          }

          // Rebuild FAISS index & sanitize any stale placeholder thumbnails
          this.vectorIndex.clear();
          let needsResave = false;
          for (const [id, obj] of this.objects.entries()) {
            if (
              !obj.thumbnailPath ||
              obj.thumbnailPath.includes('photo-1581291518857-4e27b48ff24e') ||
              obj.thumbnailPath.includes('photo-1584438784894')
            ) {
              obj.thumbnailPath = getDefaultThumbnailForClass(obj.className);
              needsResave = true;
            }
            const vec = obj.embeddingVector || generateTextEmbedding(`${obj.className} ${obj.description || ''}`);
            const faissId = this.vectorIndex.add(id, vec, obj.className, obj.description || '');
            obj.faissIndexId = faissId;
          }
          if (needsResave) {
            this.saveToDisk();
          }
          return true;
        }
      }
    } catch (e) {
      console.warn('Could not load existing memory store from disk, using default seed.');
    }
    return false;
  }
}

// Global Singleton for server instance
export const globalMemoryStore = new VisualMemoryStore();
