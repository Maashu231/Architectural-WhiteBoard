# Architectural Whiteboard

> Production-grade, real-time collaborative cloud topology designer powered by React Flow, Socket.IO, and structured LLM code generation.

[![Next.js](https://img.shields.io/badge/Next.js-16_App_Router-black?style=flat-square&logo=next.js)](https://nextjs.org/)
[![React Flow](https://img.shields.io/badge/React_Flow-v11-ff007f?style=flat-square&logo=react)](https://reactflow.dev/)
[![Socket.IO](https://img.shields.io/badge/Socket.IO-v4.8-010101?style=flat-square&logo=socket.io)](https://socket.io/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.x-blue?style=flat-square&logo=typescript)](https://www.typescriptlang.org/)
[![License](https://img.shields.io/badge/License-MIT-green?style=flat-square)](LICENSE)

---

## 📌 System Capabilities

- **Real-Time Collaborative Canvas**: Low-latency multi-user diagram editing with dynamic state synchronization and pointer tracking over WebSockets.
- **LLM-Driven Graph Synthesis**: Generates structured, auto-tiered system topology nodes and directional connection edges from natural language prompts using Vercel AI SDK and Zod schema validation.
- **Automated Infrastructure Auditing**: Performs static analysis on canvas state to highlight Single Points of Failure (SPOFs), unencrypted transport boundaries, public database exposures, and monthly AWS cost projections.
- **Multi-Target IaC Compilation**: Compiles visual visual graphs directly into deployable primitives:
  - **HashiCorp Terraform** (`.tf`)
  - **Docker Compose** (`docker-compose.yml`)
  - **Mermaid.js** (`.mmd`)

---

## 🏗 System Architecture & Data Flow

The platform uses a split architecture separating stateless API/AI request processing from persistent WebSocket room orchestration.

              ┌──────────────────────────────────────────────┐
              │              Web Browser Client              │
              └──────────────┬────────────────────┬──────────┘
                             │                    │
              HTTP / REST    │                    │ WebSockets (Port 4002)
         (Next.js Serverless)│                    │ (Express + Socket.IO)
                             ▼                    ▼
┌─────────────────────────────────────────┐ ┌───────────────────────────────────┐ │ Next.js Route Handlers │ │ Socket.IO Gateway Server │ ├─────────────────────────────────────────┤ ├───────────────────────────────────┤ │ • /api/generate - AI Graph Generator │ │ • Room State & Cursors Broadcast │ │ • /api/analyze - Security/Cost Engine │ │ • In-Memory Delta Sync │ │ • /api/export - IaC Compiler │ │ • Optional Redis Pub/Sub Adapter │ └────────────────────┬────────────────────┘ └───────────────────────────────────┘ │ ▼ ┌─────────────────────────┐ │ Vercel AI SDK Engine │ │ (OpenAI / Gemini) │ └─────────────────────────┘


---

## 🛠 Tech Stack & Dependencies

| Layer | Technologies |
| :--- | :--- |
| **Frontend Framework** | Next.js 16 (App Router), React 19, TypeScript |
| **Canvas Engine** | React Flow (`reactflow`), Framer Motion, Lucide Icons |
| **Styling** | Tailwind CSS v4, Glassmorphism design primitives |
| **Real-Time Transport**| Node.js, Express 5, Socket.IO 4.8 |
| **AI / Schema Engine** | Vercel AI SDK (`generateObject`, `generateText`), Zod |
| **Persistence / Cache** | Supabase, Redis (`ioredis` fallback to memory) |

---

## 🚀 Environment & Getting Started

### Prerequisites

- **Node.js**: `>= 18.0.0`
- **npm**: `>= 9.0.0` (or `pnpm` / `yarn`)
- **Redis** *(Optional)*: Required only if scaling socket server nodes horizontally.

### Environment Configuration

Create a `.env.local` file in the project root:

```ini
# App Configuration
NEXT_PUBLIC_APP_URL="http://localhost:3000"
NEXT_PUBLIC_SOCKET_URL="http://localhost:4002"

# AI Provider Keys
OPENAI_API_KEY="sk-..."
GOOGLE_GENERATIVE_AI_API_KEY="AIzaSy..."

# Database & Auth (Optional for Auth / Persisted Diagrams)
NEXT_PUBLIC_SUPABASE_URL="https://your-project.supabase.co"
NEXT_PUBLIC_SUPABASE_ANON_KEY="your-anon-key"

# Redis Cache (Optional - Falls back to In-Memory Map)
REDIS_URL="redis://localhost:6379"
💻 Installation & Local Running
Clone & Install Dependencies

git clone https://github.com/Maashu231/Architectural-WhiteBoard.git
cd Architectural-WhiteBoard
npm install
Start Dev Server (Next.js + Socket Server)

The repository uses concurrently to run both the Web Client (Port 3000) and Real-Time Gateway (Port 4002) concurrently:

npm run dev
Run Services Individually (Alternative)

# Terminal 1: Next.js frontend & API routes
npm run dev:next

# Terminal 2: Standalone Socket.IO service
npm run server
Verify Application Health

Web Application: http://localhost:3000
Socket Gateway: http://localhost:4002/health
📂 Repository Topology
Architectural-WhiteBoard/
├── app/
│   ├── api/
│   │   ├── analyze/        # Security SPOF & Cost Audit endpoints
│   │   ├── export/         # Terraform / Docker Compose compilation logic
│   │   └── generate/       # Prompt-to-Node graph layout generation
│   ├── components/         # Canvas UI, Sidebar, AI Modals, Node components
│   ├── login/              # Auth views
│   ├── signup/
│   ├── globals.css         # Theme primitives & React Flow style overrides
│   └── page.tsx            # Main whiteboard view entrypoint
├── server/
│   └── server.js           # Socket.IO WebSocket server (Port 4002)
├── lib/                    # Shared utility primitives, DB clients, Graph layouts
├── types/                  # TypeScript interface declarations for canvas & state
├── public/                 # Static assets & icons
└── README.md
⚡ Real-Time Mechanics & Production Deployment
Scaling WebSockets
The WebSocket server (server/server.js) tracks rooms and canvas mutation deltas.
For multi-instance production deployments (e.g., Kubernetes / ECS), configure the @socket.io/redis-adapter using REDIS_URL and enable sticky sessions at the Load Balancer level (e.g., AWS ALB / NGINX).
Infrastructure Compilation Engine
Visual canvas elements are transformed into IaC formats by mapping standard graph nodes (Compute, Database, Gateway, Queue) to corresponding Cloud Providers resource definitions via deterministic template generators.

🧪 Quality & Type Checking
# Typecheck TypeScript codebase
npm run type-check

# Run test suite
npm run test

# Production build test
npm run build
📄 License
This project is licensed under the MIT License - see the LICENSE file for details.

