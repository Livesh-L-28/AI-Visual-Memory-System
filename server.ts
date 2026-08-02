import express from 'express';
import http from 'http';
import path from 'path';
import { fileURLToPath } from 'url';
import { WebSocketServer, WebSocket } from 'ws';
import { createServer as createViteServer } from 'vite';
import { globalMemoryStore } from './src/services/memory_store';
import { analyzeFrameWithGemini, chatWithVisualMemory } from './src/services/gemini_service';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json({ limit: '20mb' }));

  // ==================== REST API ROUTES ====================

  // GET /api/objects -> list all permanent re-identified objects
  app.get('/api/objects', (req, res) => {
    try {
      const objects = globalMemoryStore.getAllObjects();
      res.json(objects);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // GET /api/objects/:id -> full object details
  app.get('/api/objects/:id', (req, res) => {
    try {
      const id = parseInt(req.params.id, 10);
      const object = globalMemoryStore.getObjectById(id);
      if (!object) {
        return res.status(404).json({ error: `Object #${id} not found in memory` });
      }
      res.json(object);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // GET /api/objects/:id/history -> timeline of frame observations & positions
  app.get('/api/objects/:id/history', (req, res) => {
    try {
      const id = parseInt(req.params.id, 10);
      const history = globalMemoryStore.getObjectHistory(id);
      res.json(history);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // GET /api/search?query=<text> -> ranked memory search
  app.get('/api/search', (req, res) => {
    try {
      const query = (req.query.query as string) || '';
      if (!query.trim()) {
        return res.json([]);
      }
      const results = globalMemoryStore.searchMemory(query);
      res.json(results);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // GET /api/map -> return 2D floor plan map data
  app.get('/api/map', (req, res) => {
    try {
      const roomId = parseInt((req.query.roomId as string) || '1', 10);
      const mapData = globalMemoryStore.getMapData(roomId);
      res.json(mapData);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // GET /api/stats -> system metrics (FPS, total objects, visible count, lost count)
  app.get('/api/stats', (req, res) => {
    try {
      const stats = globalMemoryStore.getStats();
      res.json(stats);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // GET /api/rooms -> list room calibration profiles
  app.get('/api/rooms', (req, res) => {
    try {
      const rooms = globalMemoryStore.getRooms();
      res.json(rooms);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // POST /api/rooms/calibrate -> update homography calibration
  app.post('/api/rooms/calibrate', (req, res) => {
    try {
      const { roomId, calibrationPoints } = req.body;
      const updated = globalMemoryStore.updateRoomCalibration(roomId || 1, calibrationPoints);
      res.json({ success: true, room: updated });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // POST /api/process-frame -> analyze captured video frame & integrate into memory
  app.post('/api/process-frame', async (req, res) => {
    try {
      const { frameBase64, customDetections, roomId } = req.body;

      let detectionsToProcess = customDetections;

      if (!detectionsToProcess && frameBase64) {
        const visionResult = await analyzeFrameWithGemini(frameBase64);
        detectionsToProcess = visionResult.detections;
      }

      if (!detectionsToProcess) {
        detectionsToProcess = [];
      }

      const processed = globalMemoryStore.processFrameDetections(detectionsToProcess, roomId || 1);
      const stats = globalMemoryStore.getStats();

      res.json({
        success: true,
        detections: processed,
        stats
      });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // POST /api/chat -> Natural Language Q&A with Visual Memory Assistant
  app.post('/api/chat', async (req, res) => {
    try {
      const { query, history } = req.body;
      if (!query || !query.trim()) {
        return res.status(400).json({ error: 'Query string is required' });
      }

      const result = await chatWithVisualMemory(query, history || []);
      res.json(result);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // POST /api/memory/add -> Add custom object to memory store
  app.post('/api/memory/add', (req, res) => {
    try {
      const { className, description, lastLocationX, lastLocationY, thumbnailPath } = req.body;
      if (!className) {
        return res.status(400).json({ error: 'className is required' });
      }
      const newObj = globalMemoryStore.addCustomObject({
        className,
        description: description || `Manually registered ${className} object`,
        lastLocationX,
        lastLocationY,
        thumbnailPath
      });
      res.json({ success: true, object: newObj });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // DELETE /api/memory/:id -> Remove object from memory
  app.delete('/api/memory/:id', (req, res) => {
    try {
      const id = parseInt(req.params.id, 10);
      const deleted = globalMemoryStore.deleteObject(id);
      res.json({ success: deleted });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // PATCH /api/memory/:id/location -> Update spatial location of an object
  app.patch('/api/memory/:id/location', (req, res) => {
    try {
      const id = parseInt(req.params.id, 10);
      const { x, y } = req.body;
      const updated = globalMemoryStore.updateObjectLocation(id, Number(x), Number(y));
      if (!updated) {
        return res.status(404).json({ error: 'Object not found' });
      }
      res.json({ success: true, object: updated });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // POST /api/reset-memory -> reset visual memory store to initial state
  app.post('/api/reset-memory', (req, res) => {
    try {
      globalMemoryStore.resetMemory();
      res.json({ success: true, message: 'Visual memory bank reset successfully' });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // ==================== HTTP & WEBSOCKET SERVER ====================
  const server = http.createServer(app);

  const wss = new WebSocketServer({ noServer: true });

  server.on('upgrade', (request, socket, head) => {
    const pathname = request.url;
    if (pathname === '/api/camera/stream') {
      wss.handleUpgrade(request, socket, head, (ws) => {
        wss.emit('connection', ws, request);
      });
    } else {
      socket.destroy();
    }
  });

  wss.on('connection', (ws: WebSocket) => {
    console.log('[WebSocket] Client connected to live camera stream');

    // Broadcast frame ticks every 100ms
    const timer = setInterval(() => {
      if (ws.readyState === WebSocket.OPEN) {
        const stats = globalMemoryStore.getStats();
        const activeObjects = globalMemoryStore.getAllObjects().filter((o) => o.status === 'visible');

        ws.send(
          JSON.stringify({
            type: 'telemetry_tick',
            timestamp: new Date().toISOString(),
            stats,
            activeCount: activeObjects.length,
            visibleObjects: activeObjects.map((o) => ({
              id: o.id,
              className: o.className,
              lastLocationX: o.lastLocationX,
              lastLocationY: o.lastLocationY,
              recentConfidence: o.recentConfidence
            }))
          })
        );
      }
    }, 200);

    ws.on('message', async (data: Buffer | string) => {
      try {
        const message = JSON.parse(data.toString());
        if (message.type === 'process_frame_chunk' && message.frameBase64) {
          const visionResult = await analyzeFrameWithGemini(message.frameBase64);
          const processed = globalMemoryStore.processFrameDetections(visionResult.detections);
          ws.send(
            JSON.stringify({
              type: 'frame_processed_result',
              summary: visionResult.summary,
              detections: processed
            })
          );
        }
      } catch (e) {
        // Ignore parse error
      }
    });

    ws.on('close', () => {
      clearInterval(timer);
    });
  });

  // ==================== VITE DEVELOPMENT / PRODUCTION ====================
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa'
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(__dirname, 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  server.listen(PORT, '0.0.0.0', () => {
    console.log(`[AI Visual Memory System] Server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
