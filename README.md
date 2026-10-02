# AI Visual Memory & 3D Spatial Tracking System

<p align="center">
  <a href="https://ai-visual-memory-system.onrender.com" target="_blank">
    <img src="https://img.shields.io/badge/LIVE%20DEMO-ai--visual--memory--system.onrender.com-00C7B7?style=for-the-badge&logo=render&logoColor=white" alt="Live Demo on Render" />
  </a>
</p>

<p align="center">
  <a href="https://ai-visual-memory-system.onrender.com" target="_blank">
    <strong>🌐 Launch Live Web Application: https://ai-visual-memory-system.onrender.com</strong>
  </a>
</p>

<p align="center">
  <img src="https://img.shields.io/badge/AI-Visual%20Memory%20System-6366F1?style=for-the-badge&logo=google" alt="AI Visual Memory" />
  <img src="https://img.shields.io/badge/Real--Time%20Perception-06B6D4?style=for-the-badge&logo=webrtc&logoColor=white" alt="Real-time" />
  <img src="https://img.shields.io/badge/Multimodal-Gemini%20Flash%20Waterfall-8B5CF6?style=for-the-badge&logo=googlegemini&logoColor=white" alt="Gemini" />
  <img src="https://img.shields.io/badge/DLT-Homography%20Mapping-10B981?style=for-the-badge" alt="Homography" />
  <img src="https://img.shields.io/badge/Status-Production%20Ready-22C55E?style=for-the-badge" alt="status" />
</p>

<p align="center">
  <em>A persistent visual memory bank with projective spatial geometry, appearance Re-ID, real-time camera thumbnail cropping, and voice-assisted natural language navigation.</em>
</p>

---

## 📑 Table of Contents
- [✨ Key Innovations & What's New](#-key-innovations--whats-new)
- [🌐 Live Demo & Hosted Service](#-live-demo--hosted-service)
- [🎨 System Overview](#-system-overview)
- [🎯 Core Capabilities](#-core-capabilities)
  - [1. Real-Time Vision & Perception HUD](#1-real-time-vision--perception-hud)
  - [2. Multi-Model Gemini Waterfall Architecture](#2-multi-model-gemini-waterfall-architecture)
  - [3. Projective DLT Homography & Pixel-to-Meter Mapping](#3-projective-dlt-homography--pixel-to-meter-mapping)
  - [4. Object Re-Identification (Re-ID) & Vector Memory](#4-object-re-identification-re-id--vector-memory)
  - [5. Disappearance State Machine (`visible` vs `lost`)](#5-disappearance-state-machine-visible-vs-lost)
  - [6. Real-Time Sharp Bounding Box Thumbnail Extraction](#6-real-time-sharp-bounding-box-thumbnail-extraction)
  - [7. Interactive 2D Floor Plan with Trajectory History](#7-interactive-2d-floor-plan-with-trajectory-history)
  - [8. Natural Language & Voice-Enabled AI Assistant](#8-natural-language--voice-enabled-ai-assistant)
- [🏗️ System Architecture](#️-system-architecture)
- [🧰 Technology Stack](#-technology-stack)
- [🔌 REST & WebSocket API Specification](#-rest--websocket-api-specification)
- [💻 Local Installation & Setup](#-local-installation--setup)
- [🚀 Cloud Deployment Guide](#-cloud-deployment-guide)
  - [Deploy to Render](#deploy-to-render)
  - [Deploy to Railway](#deploy-to-railway)
  - [Run Container with Docker](#run-container-with-docker)
  - [Expose Locally via Cloudflare Tunnel](#expose-locally-via-cloudflare-tunnel)
- [📄 License](#-license)

---

## ✨ Key Innovations & What's New

* **Live Deployment:** Production deployment live on [Render](https://ai-visual-memory-system.onrender.com).
* **Multi-Model Auto-Cascading Waterfall:** Automatically cascades across Google Gemini model endpoints (`gemini-flash-lite-latest` → `gemini-3.1-flash-lite` → `gemini-3.5-flash-lite` → `gemini-flash-latest` → `gemini-3.8-flash` → `gemini-3.7-flash` → `gemini-3.5-flash`) to prevent 404 deprecations or temporary 503 high-demand rate limit spikes.
* **Real-Time Camera Thumbnail Cropping (`sharp`):** Every detected object is dynamically cropped directly from the incoming camera frame buffer, eliminating static placeholder images.
* **Direct Linear Transformation (DLT) Homography:** Calculates an 8-variable transformation matrix with Gaussian elimination to map camera perspective coordinates into room coordinates (in meters).
* **Bidirectional WebSocket Sync:** Sub-second telemetry push with instant visual alerts and Web Audio status chimes.
* **Speech Synthesis & Voice Navigation:** Native speech recognition and Text-to-Speech (TTS) voice navigation.

---

## 🌐 Live Demo & Hosted Service

* **URL:** **[https://ai-visual-memory-system.onrender.com](https://ai-visual-memory-system.onrender.com)**
* **Default Port:** `3000` (auto-bound via `process.env.PORT`)
* **Transport:** HTTPS + Secure WebSockets (`wss://`)

---

## 🎨 System Overview

Traditional object detection systems discard perception data after each frame. When an object is occluded or taken out of view, the system forgets where it was.

The **AI Visual Memory System** bridges computer vision and persistent spatial intelligence. It observes your physical environment, identifies objects, tracks trajectories, stores 512-dimensional semantic appearance embeddings, projects real-world positions onto a calibrated 2D floor plan, and preserves the last-known coordinates of missing objects.

```
 Camera Stream (Webcam / Upload / Preset)
                   │
                   ▼
       Frame Capture & Bounding Box
                   │
                   ▼
  Google Gemini Multimodal Vision API
  (High-Throughput Waterfall Cascade)
                   │
                   ▼
  Sharp Native Image Extraction (240x240 Crop)
                   │
                   ▼
    Projective DLT Homography Engine
  (Pixel Coordinates → Floor Plan Meters)
                   │
                   ▼
   Vector Search & Re-ID Appearance Matching
   (70% Cosine Similarity + 30% Spatial Continuity)
                   │
                   ▼
  Persistent Memory Store (Disk JSON Cache)
        │                       │
        ▼                       ▼
 2D Spatial Floor Map    Voice AI Assistant
 (Zones & Trajectories)  (Tool Calling & TTS)
```

---

## 🎯 Core Capabilities

### 1. Real-Time Vision & Perception HUD
- Live webcam streaming with camera flip controls (`user` vs `environment` back camera).
- Real-time HTML5 Canvas overlays at 60 FPS:
  - **Mask Fills:** Translucent color-coded segment overlays.
  - **Graph Mesh:** Dashed inter-object distance connection lines.
  - **Class Badges:** Permanent `#OBJ-X` tags and classification confidence.
  - **Centroids & Crosshairs:** Spatial target locators.
- Support for video file uploads (MP4, WebM) and static scene inspection.

### 2. Multi-Model Gemini Waterfall Architecture
To ensure continuous operation without downtime or model deprecation errors:
- Implements a resilient model waterfall that catches 404, 503, and 429 errors and cascades automatically:
  1. `gemini-flash-lite-latest` *(High availability, sub-second latency)*
  2. `gemini-3.1-flash-lite`
  3. `gemini-3.5-flash-lite`
  4. `gemini-flash-latest`
  5. `gemini-3.8-flash`
  6. `gemini-3.7-flash`
  7. `gemini-3.5-flash`
- Uses structured JSON schema validation (`responseMimeType: 'application/json'`).

### 3. Projective DLT Homography & Pixel-to-Meter Mapping
- Converts camera image perspective coordinates $(u, v)$ to metric floor plan coordinates $(X, Y)$ using an 8-variable Direct Linear Transformation (DLT).
- Solves an $8 \times 8$ linear system $A \cdot h = b$ via partial-pivoting Gaussian elimination:
  $$\begin{bmatrix} X \\ Y \\ 1 \end{bmatrix} \sim H \begin{bmatrix} u \\ v \\ 1 \end{bmatrix} = \begin{bmatrix} h_{11} & h_{12} & h_{13} \\ h_{21} & h_{22} & h_{23} \\ h_{31} & h_{32} & 1 \end{bmatrix} \begin{bmatrix} u \\ v \\ 1 \end{bmatrix}$$
- Supports multi-room configurations (e.g. *Main Office Studio*, *Living Room Lounge*).

### 4. Object Re-Identification (Re-ID) & Vector Memory
- Tracks items across frame occlusions, camera movements, and temporary exits.
- Computes composite matching score:
  $$\text{Score} = 0.70 \times \text{CosineSimilarity}(\vec{e}_{\text{det}}, \vec{e}_{\text{obj}}) + 0.30 \times \max\left(0, 1 - \frac{\text{Distance}}{5.0}\right)$$
- If $\text{Score} \ge 0.75$, the existing `#OBJ-X` identity is preserved; otherwise, a new permanent identity is registered.

### 5. Disappearance State Machine (`visible` vs `lost`)
- Tracks consecutive missed frames for every active item.
- When an object is absent for $\ge 4$ consecutive scan cycles, its status transitions from `'visible'` to `'lost'`.
- Broadcasts WebSocket alerts, plays an audio alert chime, and stores its last known coordinates and zone.
- When re-observed, its status returns to `'visible'` and emits a recovery notification.

### 6. Real-Time Sharp Bounding Box Thumbnail Extraction
- The server extracts the exact bounding box rectangle from the image using native `sharp` image processing.
- Adds padding, normalizes aspect ratios, and generates a 240×240 JPEG data URL.
- When browsing the **Memory Bank**, object cards display the **actual cropped camera view of that specific item**.
- Fallback dictionary maps classes (`person`, `glasses`, `laptop`, `phone`, `bottle`, etc.) to verified visuals.

### 7. Interactive 2D Floor Plan with Trajectory History
- Interactive SVG top-down room map rendering metric coordinates ($0\text{m} \dots 8.5\text{m}$).
- Motion trails show historical movements (up to 50 trajectory waypoints).
- Dynamic room zones: *Workstation Desk*, *Media Credenza*, *Lounge Seating*, *Storage & Utilities*.
- Draggable calibration pins allow manual coordinate fine-tuning.

### 8. Natural Language & Voice-Enabled AI Assistant
- Integrated Function Calling tools:
  - `search_memory`: Semantic lookup by query text or class name.
  - `get_disappeared_objects`: Enumerates missing items and last-seen coordinates.
  - `get_room_stats`: Returns FPS, visible/lost counts, and class metrics.
- Natural Voice Text-to-Speech (TTS) readout with voice toggle.
- Interactive response cards with direct links to object inspect drawers.

---

## 🏗️ System Architecture

```
┌────────────────────────────────────────────────────────────────────────┐
│                          CLIENT (React 19 / Vite)                      │
│                                                                        │
│   ┌──────────────────┐  ┌──────────────────┐  ┌────────────────────┐   │
│   │ LiveScannerView  │  │   FloorMapView   │  │   MemoryBankView   │   │
│   │ (HTML5 Canvas)   │  │ (SVG Homography) │  │  (Object Catalog)  │   │
│   └────────┬─────────┘  └────────┬─────────┘  └─────────┬──────────┘   │
│            │                     │                      │              │
│            └──────────────┬──────┴──────────────────────┘              │
│                           │ WebSocket + REST                           │
└───────────────────────────┼────────────────────────────────────────────┘
                            │
┌───────────────────────────┼────────────────────────────────────────────┐
│                           ▼                                            │
│                     SERVER (Express / Node.js)                         │
│                                                                        │
│   ┌────────────────────────────────────────────────────────────────┐   │
│   │ POST /api/process-frame                                        │   │
│   │ ├─► Gemini Multimodal API (Cascade: lite -> flash -> 3.8)      │   │
│   │ └─► Sharp Bounding Box Cropper (240x240 JPEG Extract)          │   │
│   └───────────────────────────────┬────────────────────────────────┘   │
│                                   │                                    │
│   ┌───────────────────────────────▼────────────────────────────────┐   │
│   │ VisualMemoryStore Engine                                       │   │
│   │ ├─► Projective DLT Homography Matrix Engine                   │   │
│   │ ├─► FAISS 512-Dim Vector Appearance Index                      │   │
│   │ ├─► Disappearance State Machine (Lost Threshold >= 4)         │   │
│   │ └─► Disk Persistence (data/memory_store.json)                  │   │
│   └───────────────────────────────┬────────────────────────────────┘   │
│                                   │                                    │
│   ┌───────────────────────────────▼────────────────────────────────┐   │
│   │ POST /api/chat                                                 │   │
│   │ └─► Gemini Function Calling Tool Loop (search_memory, etc.)    │   │
│   └────────────────────────────────────────────────────────────────┘   │
└────────────────────────────────────────────────────────────────────────┘
```

---

## 🧰 Technology Stack

| Layer | Technologies |
|---|---|
| **Frontend** | React 19, TypeScript, Vite 6, Tailwind CSS 4, Lucide React, Motion |
| **Backend** | Node.js (v20+), Express 4, WebSocket (`ws`), ESBuild |
| **Vision & AI** | Google Gemini Multimodal SDK (`@google/genai`), Sharp C++ Image Processing |
| **Math & Spatial** | Direct Linear Transformation (DLT) Homography, Cosine Vector Embeddings |
| **Deployment** | Docker (Alpine Multi-Stage), Render Blueprint (`render.yaml`), Railway (`railway.json`) |

---

## 🔌 REST & WebSocket API Specification

### REST Endpoints

| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/api/config` | Returns Gemini API key status |
| `POST` | `/api/config/api-key` | Dynamically updates and persists `GEMINI_API_KEY` to `.env` |
| `GET` | `/api/objects` | Lists all tracked objects (excluding heavy internal embeddings) |
| `GET` | `/api/objects/:id` | Detailed record for specific `#OBJ-X` with trajectory history |
| `GET` | `/api/objects/:id/history` | Timeline of camera observations and bounding boxes |
| `GET` | `/api/search?query=...` | Semantic vector and class search |
| `POST` | `/api/process-frame` | Analyzes base64 frame, crops thumbnails, updates spatial memory |
| `POST` | `/api/chat` | Spatial memory Q&A with function calling |
| `GET` | `/api/map?roomId=1` | Returns floor plan bounds, calibration matrix, and room zones |
| `GET` | `/api/stats` | Telemetry metrics (FPS, active, lost, uptime, vector count) |
| `POST` | `/api/memory/reset` | Resets store to default room calibration |

### WebSocket Endpoint: `/api/camera/stream`
- **Client $\rightarrow$ Server:**
  - `{"type": "process_frame_chunk", "frameBase64": "...", "roomId": 1}`
- **Server $\rightarrow$ Client (Broadcast):**
  - `telemetry_tick`: 500ms heartbeat with FPS, active objects, coordinates.
  - `object_status_changed`: Fired immediately when an object is marked `'lost'` or `'visible'`.
  - `objects_updated`: Broadcasts whenever an item is added, moved, or deleted.

---

## 💻 Local Installation & Setup

### Prerequisites
- **Node.js:** `v20.0.0` or higher
- **npm:** `v10.0.0` or higher
- **Google Gemini API Key:** [Get a key from Google AI Studio](https://aistudio.google.com/)

### 1. Clone the Repository
```bash
git clone https://github.com/Livesh-L-28/AI-Visual-Memory-System.git
cd AI-Visual-Memory-System
```

### 2. Install Dependencies
```bash
npm install
```

### 3. Configure Environment Variables
Create a `.env` file in the root directory:
```bash
cp .env.example .env
```
Add your Gemini API key:
```env
GEMINI_API_KEY="your-google-gemini-api-key"
PORT=3000
NODE_ENV=development
```
*(You can also set or change the API key directly within the web UI via the **"API Key"** header button).*

### 4. Run Development Server
```bash
npm run dev
```
Open **[http://localhost:3000](http://localhost:3000)** in your browser.

---

## 🚀 Cloud Deployment Guide

### Deploy to Render

The repository includes a ready-to-use [`render.yaml`](file:///Users/livesh/AI-Visual-Memory-System/render.yaml) blueprint:

1. Push your code to GitHub.
2. Open **[Render Dashboard](https://dashboard.render.com/)** $\rightarrow$ **New +** $\rightarrow$ **Web Service**.
3. Select your repository.
4. Set the build parameters:
   - **Runtime:** `Node`
   - **Build Command:** `npm install && npm run build`
   - **Start Command:** `npm run start`
5. Under **Environment Variables**, add:
   - `GEMINI_API_KEY` = *your API key*
   - `NODE_ENV` = `production`
6. Click **Deploy Web Service**.

---

### Deploy to Railway

The repository includes a [`railway.json`](file:///Users/livesh/AI-Visual-Memory-System/railway.json) configuration:

1. Go to **[Railway.app](https://railway.app/)** $\rightarrow$ **New Project** $\rightarrow$ **Deploy from GitHub repo**.
2. Select your repository.
3. In **Variables**, add:
   - `GEMINI_API_KEY` = *your key*
   - `NODE_ENV` = `production`
4. Click **Generate Domain** to get your public HTTPS URL.

---

### Run Container with Docker

1. **Build the production container:**
   ```bash
   docker build -t ai-visual-memory-system .
   ```
2. **Run container with persistent memory volume:**
   ```bash
   docker run -d \
     -p 3000:3000 \
     -e GEMINI_API_KEY="your-key-here" \
     -v $(pwd)/data:/app/data \
     --name visual-memory \
     ai-visual-memory-system
   ```

---

### Expose Locally via Cloudflare Tunnel

To test camera features on mobile devices without setting up a remote server:

```bash
# Install Cloudflare CLI
brew install cloudflare/cloudflare/cloudflared

# Launch tunnel
cloudflared tunnel --url http://localhost:3000
```
This generates a temporary `https://<random-id>.trycloudflare.com` URL with SSL camera permissions.

---

## 📄 License

This project is licensed under the MIT License. Built for computer vision, spatial computing, and robotics research.
