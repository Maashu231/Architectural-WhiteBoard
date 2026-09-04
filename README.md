<h1 align="center">
  Architectural Whiteboard
</h1>

<p align="center">
  <strong>An AI-powered, real-time collaborative cloud architecture designer.</strong>
</p>

<p align="center">
  <img src="https://img.shields.io/badge/Next.js-16-black?style=flat-square&logo=next.js" alt="Next.js" />
  <img src="https://img.shields.io/badge/React_Flow-11-ff007f?style=flat-square&logo=react" alt="React Flow" />
  <img src="https://img.shields.io/badge/Socket.IO-4.8-black?style=flat-square&logo=socket.io" alt="Socket.io" />
  <img src="https://img.shields.io/badge/TypeScript-5-blue?style=flat-square&logo=typescript" alt="TypeScript" />
  <img src="https://img.shields.io/badge/License-MIT-green?style=flat-square" alt="License" />
</p>

## Overview

**Architectural Whiteboard** is a modern, enterprise-grade web application designed for Cloud Architects, DevOps Engineers, and Software Developers. It allows teams to visually design cloud infrastructure on an interactive canvas, collaborate in real-time, generate architectures using Natural Language Processing (NLP), and export diagrams directly into Infrastructure as Code (IaC) templates.

---

## ✨ Features

- **⚡ Real-Time Collaboration**: Powered by `Socket.IO`, multiple users can join a room and edit architecture concurrently with real-time cursor tracking and dynamic state sync.
- **🤖 AI Architecture Generation**: Describe your desired system (e.g., *"E-commerce backend with Kafka, Redis, PostgreSQL, and an API Gateway"*) and AI auto-generates structured components, relationships, and layout positioning on the canvas.
- **🛡️ AI Security & Cost Audit**: Instant, one-click automated architecture analysis to detect Single Points of Failure (SPOFs), unencrypted connections, exposed databases, and monthly AWS cost estimates.
- **📄 Infrastructure as Code (IaC) Export**: One-click export of visual diagrams into:
  - **Terraform (`.tf`)**
  - **Docker Compose (`.yml`)**
  - **Mermaid.js Diagrams**
- **🎨 Glassmorphic Dark UI**: High-performance rendering powered by React Flow, equipped with customized dynamic node states, status LEDs, custom node creators, and animated protocol data flow indicators (HTTPS, gRPC, DB links).

---

## 🏗️ Architecture

```mermaid
graph TD
    Client[Web Browser Client] -->|HTTP / REST| NextAPI[Next.js App Router APIs]
    Client -->|WebSocket Port 4002| SocketServer[Node.js / Socket.IO Server]
    
    subgraph "Next.js Full-Stack"
        NextAPI -->|/api/generate| AIEngine[Prompt-to-Node Generator]
        NextAPI -->|/api/analyze| AuditEngine[Security/Cost Auditor]
        NextAPI -->|/api/export| IaCEngine[Terraform / Docker Exporter]
    end
    
    subgraph "Collaboration Engine"
        SocketServer -->|Broadcasts| RoomState[Room State Sync & Cursors]
    end
🛠️ Tech Stack
Frontend: Next.js 16 (App Router), React, React Flow (Canvas Rendering), Lucide React Icons, Tailwind CSS / Glassmorphism.
Backend (API): Next.js Route Handlers (/api/...) for stateless prompt processing, AI schema generation, and IaC conversion.
Backend (Real-Time): Express.js + Socket.IO (running on port 4002) for low-latency WebSocket tracking and room state synchronization.
AI Integration: Vercel AI SDK (generateObject, generateText) with Zod schema enforcement and automated graph auto-tier layout algorithms.
🚀 Getting Started
This project is configured as a zero-config, out-of-the-box local environment.

Prerequisites
Node.js: v18 or higher
npm or yarn
Redis (Optional for local dev — rooms automatically fall back to in-memory state)
Installation & Local Setup
Clone the repository:

git clone https://github.com/Maashu231/Architectural-WhiteBoard.git
cd Architectural-WhiteBoard
Install dependencies:

npm install
Configure environment variables:

cp .env.example .env.local
Edit .env.local to provide your OpenAI/Vercel AI keys and optional Supabase or Redis URLs.

Start the development server: (Uses concurrently to boot both the Next.js app on port 3000 and the Socket.IO server on port 4002 automatically)

npm run dev
Open the App: Navigate to http://localhost:3000 in your browser.

🤝 Contributing
Contributions, issues, and feature requests are welcome!
Feel free to check the issues page.

📝 License
This project is MIT licensed.


---
