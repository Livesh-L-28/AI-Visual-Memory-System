# AI Visual Memory & Spatial Tracking System

An AI-powered real-time computer vision system that detects, tracks, remembers, and spatially maps physical objects using multimodal AI. Unlike traditional object detection applications, this system builds a **persistent visual memory** of the environment, allowing users to locate previously seen objects, track movement history, and interact with the system using natural language.

The application combines **computer vision, object re-identification, spatial mapping, vector memory, and AI-powered reasoning** into a single interactive platform suitable for smart workspaces, robotics, AR/VR environments, surveillance, and intelligent indoor navigation.

---

# Features

## Real-Time Computer Vision

- Live webcam streaming
- Preset room camera scenes
- AI-powered object detection using Gemini
- Real-time bounding box visualization
- Confidence score estimation
- Multi-object detection
- Dynamic object classification

Supported objects include:

- Person
- Laptop
- Glasses
- Chair
- Bottle
- Phone
- Keyboard
- Mouse
- Monitor
- Backpack
- Fan
- Cup
- Appliances
- Custom registered objects

---

## Interactive Perception HUD

The perception interface provides multiple visualization layers:

- Bounding boxes
- Object labels
- Confidence scores
- Centroid markers
- Contour overlays
- Spatial graph connections
- Distance indicators
- Object tracking paths

HUD layers can be enabled or disabled individually.

---

## Object Tracking & Re-Identification

Each detected object receives a permanent identity.

Example:

- #OBJ-001
- #OBJ-002
- #OBJ-003

The system preserves object identities even when:

- Objects leave the camera view
- Temporary occlusions occur
- Objects reappear later
- Partial visibility occurs

Identity persistence is maintained using appearance similarity, spatial consistency, and vector matching.

---

## Spatial Memory Bank

Every observation is stored in a persistent memory database.

Each object stores:

- Permanent Object ID
- Object Class
- Detection Confidence
- Last Seen Timestamp
- Visibility Status
- Spatial Coordinates
- Observation History
- Vector Embedding

Users can:

- Search objects
- Filter by status
- View object history
- Delete objects
- Register custom objects manually

Object states include:

- Visible
- Lost
- Occluded
- Registered

---

## 2D Spatial Floor Plan

Detected objects are projected onto an interactive floor plan using homography calibration.

The floor plan displays:

- Room boundaries
- Camera field of view
- Object positions
- Spatial zones
- Tracking paths
- Active camera location

Example zones:

- Workstation
- Executive Desk
- Lounge
- Storage
- Meeting Area

---

## Pixel-to-Meter Spatial Mapping

The application converts camera pixel coordinates into real-world coordinates using four-point homography transformation.

Pipeline:

Camera Image

↓

Pixel Coordinates

↓

Homography Mapping

↓

Real World Coordinates

↓

Floor Plan Visualization

This allows accurate localization of detected objects inside the environment.

---

## AI Memory Assistant

Users can query the system using natural language.

Example queries:

- Where are my glasses?
- Find my laptop.
- Show my backpack.
- Which objects disappeared?
- How many chairs are visible?
- What was last seen near the desk?
- Show objects in the lounge.

The assistant combines:

- Visual observations
- Object history
- Vector similarity search
- Gemini multimodal reasoning

to generate context-aware responses.

---

## Voice-Based Spatial Search

Supports voice interaction.

Workflow:

Speech

↓

Speech Recognition

↓

Natural Language Query

↓

Gemini AI

↓

Memory Search

↓

Spatial Response

---

## Manual Object Registration

Users can manually register important objects such as:

- Wallet
- Passport
- Office ID
- Car Keys
- Headphones
- Documents

Each registration stores:

- Object name
- Category
- Notes
- Initial coordinates
- Timestamp

---

## Historical Observation Timeline

Every tracked object maintains a complete observation history.

Example:

10:10 AM → Detected near Desk

↓

10:15 AM → Moved to Lounge

↓

10:20 AM → Temporarily Lost

↓

10:26 AM → Visible Again

---

## Export Functionality

The complete spatial memory database can be exported as:

- JSON
- CSV

Suitable for:

- Analytics
- Auditing
- Robotics datasets
- Research
- Reporting

---

## Live System Telemetry

The dashboard monitors:

- Live FPS
- Detection latency
- Active objects
- Total observations
- Memory retention duration
- Confidence score distribution
- Vector memory size
- Similarity threshold
- Detection statistics

---

# System Architecture

```
Camera Feed
      │
      ▼
Frame Acquisition
      │
      ▼
Gemini Vision Processing
      │
      ▼
Object Detection
      │
      ▼
Object Tracking
      │
      ▼
Re-Identification
      │
      ▼
Spatial Coordinate Mapping
      │
      ▼
Persistent Memory Store
      │
      ├──────────────┐
      ▼              ▼
Floor Plan      AI Memory Assistant
      │              │
      └──────┬───────┘
             ▼
      Interactive Dashboard
```

---

# Technology Stack

## Frontend

- React 18
- TypeScript
- Vite
- Tailwind CSS
- HTML5 Canvas

## Backend

- Node.js
- Express.js
- REST API

## Artificial Intelligence

- Google Gemini Flash
- Multimodal AI
- Natural Language Processing
- Vision-Language Reasoning

## Computer Vision

- Object Detection
- Bounding Box Extraction
- Object Tracking
- Re-Identification
- Spatial Coordinate Mapping

## Spatial Intelligence

- Homography Transformation
- Pixel-to-Meter Conversion
- Coordinate Calibration
- Interactive Floor Plan Mapping

## Data Management

- Persistent Memory Store
- Vector Embeddings
- Cosine Similarity Search
- JSON Storage
- CSV Export

---

# Project Workflow

```
Camera Stream
      │
      ▼
Frame Capture
      │
      ▼
AI Object Detection
      │
      ▼
Object Tracking
      │
      ▼
Re-Identification
      │
      ▼
Spatial Mapping
      │
      ▼
Memory Storage
      │
      ▼
Vector Search
      │
      ▼
Natural Language Query
      │
      ▼
AI Spatial Response
```

---

# Applications

- Smart Office Object Tracking
- AI Personal Memory Assistant
- Indoor Navigation
- Robotics Perception
- Warehouse Asset Management
- Digital Twin Systems
- AR/VR Spatial Computing
- Smart Home Automation
- Security Monitoring
- Healthcare Asset Tracking
- Human-Robot Interaction
- Industrial Monitoring

---

# Future Enhancements

- Multi-camera tracking
- 3D room reconstruction
- SLAM integration
- Cloud memory synchronization
- Face recognition
- Object trajectory prediction
- Mobile application
- IoT integration
- AR smart glasses support
- Distributed vector database
- Collaborative spatial memory
- Autonomous robot navigation

---

# Highlights

- Real-time AI-powered object detection
- Persistent object identity through Re-Identification
- Interactive spatial floor plan visualization
- Pixel-to-meter coordinate mapping
- AI-powered natural language object search
- Voice-enabled spatial assistant
- Persistent visual memory database
- Historical object tracking timeline
- Live telemetry dashboard
- JSON and CSV export support
- Modular full-stack architecture
- Production-ready user interface

---

# License

This project is intended for educational, research, and demonstration purposes. Feel free to extend and customize it for your own applications.
