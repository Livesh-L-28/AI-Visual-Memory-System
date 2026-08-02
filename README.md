# AI Visual Memory & Spatial Tracking System

<p align="center">
  <img src="https://img.shields.io/badge/AI-Visual%20Memory%20System-ff69b4?style=for-the-badge&logo=google" alt="banner" />
  <img src="https://img.shields.io/badge/Real-Time-🚀-brightgreen?style=for-the-badge" alt="realtime" />
  <img src="https://img.shields.io/badge/Multimodal-Gemini-blueviolet?style=for-the-badge&logo=google" alt="gemini" />
  <img src="https://img.shields.io/badge/Status-Prototype-yellow?style=for-the-badge" alt="status" />
</p>

<p align="center">
  <em>Make your environment remember — colorful, interactive, and AI-driven ✨</em>
</p>

---

# 🎨 Overview

An AI-powered real-time computer vision system that detects, tracks, remembers, and spatially maps physical objects using multimodal AI. Unlike traditional object detection applications, this system blends computer vision, memory, and spatial intelligence into a single interactive platform for smart workspaces and robotics.

---

# 🎯 Features

## 🔴 Real-Time Computer Vision

- Live webcam streaming
- Preset room camera scenes
- AI-powered object detection using Gemini
- Real-time bounding box visualization
- Confidence score estimation
- Multi-object detection
- Dynamic object classification

Supported objects include (examples):

- 👤 Person
- 💻 Laptop
- 👓 Glasses
- 🪑 Chair
- 🍼 Bottle
- 📱 Phone
- ⌨️ Keyboard
- 🖱️ Mouse
- 🖥️ Monitor
- 🎒 Backpack
- 🌀 Fan
- ☕ Cup
- 🔌 Appliances
- ⭐ Custom registered objects

---

## 🖼️ Interactive Perception HUD

The perception interface provides multiple visualization layers (toggleable):

- Bounding boxes
- Object labels
- Confidence scores
- Centroid markers
- Contour overlays
- Spatial graph connections
- Distance indicators
- Object tracking paths

---

## 🆔 Object Tracking & Re-Identification

Each detected object receives a permanent identity (e.g., `#OBJ-001`). Identity persistence is maintained across occlusions and reappearances using appearance similarity, spatial consistency, and vector matching.

---

## 🗺️ Spatial Memory Bank

Every observation is stored in a persistent memory database. Each object stores:

- Permanent Object ID
- Object Class
- Detection Confidence
- Last Seen Timestamp
- Visibility Status
- Spatial Coordinates
- Observation History
- Vector Embedding

Users can: search objects, filter by status, view history, delete objects, or register custom objects manually.

Object states: Visible, Lost, Occluded, Registered

---

## 🏠 2D Spatial Floor Plan

Detected objects are projected onto an interactive floor plan using homography calibration. Shows room boundaries, camera FOV, object positions, zones, tracking paths, and active camera location.

Example zones: Workstation, Executive Desk, Lounge, Storage, Meeting Area

---

## 📏 Pixel-to-Meter Spatial Mapping

Pixel coordinates → Homography → Real world coordinates → Floor plan visualization. Accurate localization inside the environment.

---

## 🤖 AI Memory Assistant

Natural language queries such as:

- "Where are my glasses?" 👓
- "Find my laptop." 💻
- "Which objects disappeared?" ❓

Combines visual observations, object history, vector similarity search, and Gemini multimodal reasoning for context-aware answers.

---

## 🎙️ Voice-Based Spatial Search

Speech → Speech Recognition → Natural Language Query → Gemini AI → Memory Search → Spatial Response

---

## 📝 Manual Object Registration

Register important objects (wallet, passport, keys, etc.) with metadata and initial coordinates.

---

## ⏳ Historical Observation Timeline

Complete observation history per object, e.g.:

10:10 AM → Detected near Desk → 10:15 AM → Moved to Lounge → 10:20 AM → Temporarily Lost → 10:26 AM → Visible Again

---

## 📤 Export Functionality

Export spatial memory as JSON or CSV for analytics, research, or robotics datasets.

---

## 📊 Live System Telemetry

Dashboard shows FPS, detection latency, active objects, memory stats, confidence distribution, and vector memory metrics.

---

# 🏗️ System Architecture

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

# 🧰 Technology Stack

- Frontend: React 18 · TypeScript · Vite · Tailwind CSS
- Backend: Node.js · Express.js · REST API
- AI: Google Gemini Flash · Multimodal AI · Vision-Language Reasoning
- CV: Object Detection · Tracking · Re-Identification
- Spatial: Homography · Pixel-to-Meter Mapping
- Storage: Persistent Memory Store · Vector Embeddings · Cosine Similarity

---

# 🚦 Project Workflow

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

# ✨ Applications

- Smart Office Object Tracking
- AI Personal Memory Assistant
- Indoor Navigation
- Robotics Perception
- Warehouse Asset Management
- AR/VR Spatial Computing

---

# 🚀 Future Enhancements

- Multi-camera tracking
- 3D room reconstruction
- SLAM integration
- Cloud memory synchronization
- Face recognition
- Object trajectory prediction
- Mobile app
- IoT integration

---

# 🎉 Highlights

- Real-time AI detection
- Persistent identities via Re-Identification
- Interactive floor plan
- Pixel-to-meter mapping
- Voice-enabled spatial assistant
- Export (JSON / CSV)

---

# 📝 License

This project is intended for educational, research, and demonstration purposes. Feel free to extend and customize it for your own applications.
