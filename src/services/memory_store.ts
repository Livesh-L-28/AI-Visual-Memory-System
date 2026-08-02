import {
  TrackedObject,
  Detection,
  DetectionHistoryEntry,
  Room,
  SystemStats,
  SearchResult,
  ObjectStatus
} from '../types';
import {
  FaissVectorIndex,
  cosineSimilarity,
  generateTextEmbedding,
  normalizeVector
} from '../lib/vector_math';
import { projectPixelToMap } from '../lib/homography';

const REID_THRESHOLD = 0.80; // Re-identification cosine similarity threshold
const DISAPPEAR_FRAME_THRESHOLD = 15; // Number of frames absent before marking status='lost'

export class VisualMemoryStore {
  private rooms: Room[] = [];
  private objects: Map<number, TrackedObject> = new Map();
  private detections: DetectionHistoryEntry[] = [];
  private vectorIndex: FaissVectorIndex = new FaissVectorIndex();
  
  private currentFrameId = 100;
  private nextObjectId = 1;
  private nextDetectionId = 1;
  private activeTrackIdMap: Map<number, { objectId: number; lastFrameSeen: number }> = new Map();
  
  private startTime = Date.now();
  private totalFramesProcessed = 1420;
  private fpsCounter = 28.5;

  constructor() {
    this.seedDefaultRooms();
    this.seedDefaultMemoryObjects();
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
        ]
      }
    ];
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
        status: 'lost' as ObjectStatus, // Disappeared earlier
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
          x1: Math.max(0.08, (item.lastLocationX / 8.5) - 0.08),
          y1: Math.max(0.12, (item.lastLocationY / 6.0) - 0.08),
          x2: Math.min(0.92, (item.lastLocationX / 8.5) + 0.08),
          y2: Math.min(0.88, (item.lastLocationY / 6.0) + 0.08)
        },
        description: item.description,
        historyCount: Math.floor(Math.random() * 40) + 15
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
            x1: Math.max(0.1, (item.lastLocationX / 8.5) - 0.08),
            y1: Math.max(0.1, (item.lastLocationY / 6.0) - 0.08),
            x2: Math.min(0.9, (item.lastLocationX / 8.5) + 0.08),
            y2: Math.min(0.9, (item.lastLocationY / 6.0) + 0.08)
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
   * Process incoming detections from a camera frame using Re-ID matching state machine
   */
  public processFrameDetections(
    detections: { className: string; bbox: { x1: number; y1: number; x2: number; y2: number }; confidence: number; croppedThumbnail?: string; visualFeatures?: string }[],
    roomId: number = 1
  ): Detection[] {
    this.currentFrameId++;
    this.totalFramesProcessed++;

    const room = this.rooms.find((r) => r.id === roomId) || this.rooms[0];
    const processedDetections: Detection[] = [];
    const seenObjectIdsInThisFrame = new Set<number>();

    for (const det of detections) {
      const centerX = (det.bbox.x1 + det.bbox.x2) / 2;
      const centerY = (det.bbox.y1 + det.bbox.y2) / 2;
      const pointMeters = projectPixelToMap(centerX, centerY, room.calibrationPoints, room.widthMeters, room.heightMeters);

      // Generate embedding for detection crop/features
      const detText = `${det.className} ${det.visualFeatures || ''}`.trim();
      const detVector = generateTextEmbedding(detText);

      // Re-ID state machine: Search vector index for matching existing object
      const matches = this.vectorIndex.search(detVector, 3);
      let matchedObjectId: number | null = null;
      let highestSimilarity = 0;

      for (const match of matches) {
        if (match.score >= REID_THRESHOLD && match.faissEntry.className.toLowerCase() === det.className.toLowerCase()) {
          matchedObjectId = match.faissEntry.objectId;
          highestSimilarity = match.score;
          break;
        }
      }

      const timestampNow = new Date().toISOString();

      if (matchedObjectId && this.objects.has(matchedObjectId)) {
        // Match found -> Reuse permanent object_id and update location/status
        const existingObj = this.objects.get(matchedObjectId)!;
        existingObj.lastSeen = timestampNow;
        existingObj.lastLocationX = pointMeters.x;
        existingObj.lastLocationY = pointMeters.y;
        existingObj.status = 'visible';
        existingObj.recentConfidence = det.confidence;
        existingObj.latestBbox = det.bbox;
        existingObj.historyCount++;
        if (det.croppedThumbnail) {
          existingObj.thumbnailPath = det.croppedThumbnail;
        }
        seenObjectIdsInThisFrame.add(matchedObjectId);

        const histEntry: DetectionHistoryEntry = {
          id: this.nextDetectionId++,
          objectId: matchedObjectId,
          trackId: matchedObjectId * 10,
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
          objectId: matchedObjectId,
          trackId: matchedObjectId * 10,
          className: det.className,
          confidence: det.confidence,
          bbox: det.bbox,
          frameId: this.currentFrameId,
          timestamp: timestampNow,
          croppedThumbnail: det.croppedThumbnail
        });
      } else {
        // No match above threshold -> Register new permanent object
        const newObjId = this.nextObjectId++;
        const desc = det.visualFeatures || `${det.className} detected in frame #${this.currentFrameId}`;
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
          thumbnailPath: det.croppedThumbnail || 'https://images.unsplash.com/photo-1581291518857-4e27b48ff24e?w=300&auto=format&fit=crop&q=80',
          faissIndexId: faissId,
          embeddingVector: detVector,
          recentConfidence: det.confidence,
          latestBbox: det.bbox,
          description: desc,
          historyCount: 1
        };

        this.objects.set(newObjId, newObj);
        seenObjectIdsInThisFrame.add(newObjId);

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
      // Direct class name string match bonus
      if (obj.className.toLowerCase() === normQuery) {
        score = Math.min(1.0, score + 0.25);
      } else if (normQuery.includes(obj.className.toLowerCase())) {
        score = Math.min(1.0, score + 0.15);
      }

      if (score >= 0.35) {
        let reason = `Visual feature vector match (similarity: ${Math.round(score * 100)}%)`;
        if (obj.className.toLowerCase() === normQuery) {
          reason = `Exact object class match for '${obj.className}'`;
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

  public getMapData(roomId: number = 1): { objects: { id: number; className: string; x: number; y: number; status: ObjectStatus; thumbnail: string; lastSeen: string }[] } {
    const objs = this.getAllObjects().filter((o) => o.roomId === roomId);
    return {
      objects: objs.map((o) => ({
        id: o.id,
        className: o.className,
        x: o.lastLocationX,
        y: o.lastLocationY,
        status: o.status,
        thumbnail: o.thumbnailPath,
        lastSeen: o.lastSeen
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
      fps: Number((24.0 + Math.sin(Date.now() / 2000) * 3.5).toFixed(1)),
      totalObjects: allObjs.length,
      visibleObjects: visibleObjs,
      lostObjects: lostObjs,
      objectsByClass,
      vectorCount: this.vectorIndex.getCount(),
      averageReidConfidence: 0.93,
      uptimeSeconds: Math.floor((Date.now() - this.startTime) / 1000),
      totalFramesProcessed: this.totalFramesProcessed
    };
  }

  public addCustomObject(data: { className: string; description: string; lastLocationX?: number; lastLocationY?: number; thumbnailPath?: string }): TrackedObject {
    const id = this.nextObjectId++;
    const nowISO = new Date().toISOString();
    const classNameClean = data.className.toLowerCase().trim();
    const descClean = data.description || `Manually registered ${classNameClean} object`;
    const textEmb = generateTextEmbedding(`${classNameClean} ${descClean}`);
    const faissId = this.vectorIndex.add(id, textEmb, classNameClean, descClean);

    const newObj: TrackedObject = {
      id,
      className: classNameClean,
      description: descClean,
      firstSeen: nowISO,
      lastSeen: nowISO,
      lastLocationX: data.lastLocationX ?? Number((Math.random() * 5 + 1).toFixed(1)),
      lastLocationY: data.lastLocationY ?? Number((Math.random() * 4 + 1).toFixed(1)),
      latestBbox: { x1: 0.2, y1: 0.2, x2: 0.5, y2: 0.5 },
      status: 'visible' as ObjectStatus,
      thumbnailPath: data.thumbnailPath || 'https://images.unsplash.com/photo-1584438784894-089d6a62b8fa?w=300&auto=format&fit=crop&q=80',
      recentConfidence: 0.95,
      historyCount: 1,
      roomId: 1,
      faissIndexId: faissId,
      embeddingVector: textEmb
    };

    this.objects.set(id, newObj);
    return newObj;
  }

  public deleteObject(id: number): boolean {
    return this.objects.delete(id);
  }

  public updateObjectLocation(id: number, x: number, y: number): TrackedObject | undefined {
    const obj = this.objects.get(id);
    if (obj) {
      obj.lastLocationX = Number(x.toFixed(2));
      obj.lastLocationY = Number(y.toFixed(2));
      obj.lastSeen = new Date().toISOString();
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
  }
}

// Global Singleton for server instance
export const globalMemoryStore = new VisualMemoryStore();
