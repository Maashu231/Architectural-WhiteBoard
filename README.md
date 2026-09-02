# Arch Whiteboard

**Arch Whiteboard** is a collaborative, real-time cloud architecture design tool. It combines an infinite canvas for system design with multiplayer capabilities (live cursors and real-time syncing) and an **AI Co-Architect** that can generate, analyze, and export complex cloud infrastructures from natural language.

> **Status:** Completed, ready for deployment. Not yet deployed.

---

## 🌟 Key Features

- **Real-Time Multiplayer:** Instant collaboration with live cursors and synchronized node/edge states powered by a custom Socket.io server.
- **AI Co-Architect:**
  - **Generate:** Describe an architecture (e.g., "serverless e-commerce backend") and watch the AI build the nodes and connections on your canvas.
  - **Analyze:** AI audits your current design for single points of failure, security vulnerabilities, performance bottlenecks, and cost optimizations.
  - **Export:** Translate your visual architecture into infrastructure-as-code (Terraform, Docker Compose) or Mermaid.js.
- **Interactive Canvas:** Built on React Flow with an immersive, glassmorphic dark theme and smooth physics-based animations (Framer Motion).
- **Authentication:** Secure Google OAuth integration managed by Supabase.
- **Cloud Storage:** Save and load diagrams seamlessly via Supabase PostgreSQL.

---

## 🏗️ Architecture & Tech Stack

Arch Whiteboard is built on a modern, decoupled architecture:

- **Frontend Application:** Next.js (App Router) serving the React UI. Handles rendering the canvas, modals, AI integrations (via Next.js API Routes), and Supabase Auth.
- **Real-time Server:** A standalone Node.js/Express server running Socket.io for managing WebSocket connections, room states, and high-frequency events (cursors).
- **Database & Auth:** Supabase (PostgreSQL) for user authentication and persisting diagram states.
- **AI Layer:** Groq (LLaMA) via the Vercel AI SDK for high-speed architecture generation and analysis.
- **State Management (Optional):** Redis is supported on the socket server for multi-instance scaling and rate-limiting.

### Tech Stack Versions
- **Framework:** Next.js `16.2.12` (React `19.2.4`)
- **Canvas:** React Flow `^11.11.4`
- **Styling & Animations:** Tailwind CSS `^4.0`, Framer Motion `^13.2.0`, Lucide React
- **WebSockets:** Socket.io `^4.8.3`
- **Database/Auth:** Supabase JS `^2.111.0`, Supabase SSR `^0.12.4`
- **AI SDK:** `ai ^7.0.56`, `@ai-sdk/openai`, `@ai-sdk/google`
- **Validation:** Zod `^4.4.3`

---

## 📋 Prerequisites

Before setting up the project, ensure you have the following installed and configured:

1. **Node.js** (v20+ recommended)
2. **Supabase Account:** Create a new project for Auth and database storage.
   - Enable **Google OAuth** in the Supabase Auth providers.
3. **Groq API Key:** For the AI Co-Architect features (alternatively, Google Gemini).
4. **Redis (Optional):** If running in a multi-instance production environment.

---

## 🚀 Installation & Setup

1. **Clone the repository and install dependencies:**
   ```bash
   git clone <repository-url>
   cd arch-whiteboard
   npm install
   ```

2. **Database Setup (Supabase):**
   - Run the provided `supabase-setup.sql` file in your Supabase SQL Editor. This will create the required `diagrams` table and set up Row Level Security (RLS) policies.

3. **Environment Variables:**
   - Copy the example environment file:
     ```bash
     cp .env.example .env.local
     ```
   - Fill in your `.env.local` file with your actual keys (never commit this file):

| Variable | Description | Required? |
|----------|-------------|-----------|
| `NEXT_PUBLIC_SUPABASE_URL` | Your Supabase project URL | Yes |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Your Supabase anonymous API key | Yes |
| `GROQ_API_KEY` | Your Groq API key for AI features | Yes* |
| `GROQ_MODEL` | Default: `openai/gpt-oss-20b` | No |
| `NEXT_PUBLIC_SOCKET_URL` | URL for the WebSocket server (default: `http://localhost:4002`) | Yes |
| `PORT` | Port for the Socket.io server to listen on (default: `4002`) | Yes |
| `ALLOWED_ORIGINS` | CORS origins for the Socket server (default: `http://localhost:3000`) | Yes |

*\*Note: You can use `GOOGLE_GENERATIVE_AI_API_KEY` as an alternative to Groq.*

---

## 💻 Running Locally

To run the application in development mode, start the Next.js app and the Socket.io server simultaneously. 

Run the following command in the root directory:
```bash
npm run dev
```
*(This uses `concurrently` to run both `next dev` on port 3000 and `node server.js` on port 4002).*

- **Web App:** [http://localhost:3000](http://localhost:3000)
- **Socket Server:** [http://localhost:4002](http://localhost:4002)

---

## 📁 Project Structure

```text
arch-whiteboard/
├── app/
│   ├── api/            # Next.js API Routes (AI Generate, Analyze, Export)
│   ├── auth/           # Supabase Auth callbacks
│   ├── components/     # React components (Canvas, Modals, Sidebar)
│   ├── lib/            # Utilities (AI, Env validation, Rate Limiting, Supabase)
│   └── globals.css     # Tailwind v4 configuration and design system
├── public/             # Static assets
├── test/               # Unit and integration tests
├── .env.example        # Environment variable template
├── next.config.ts      # Next.js configuration and CSP policies
├── package.json        # Dependencies and scripts
├── server.js           # Custom Socket.io Node.js server
└── supabase-setup.sql  # Database schema and RLS policies
```

---

## 📖 Usage

- **Joining a Room:** Upon logging in, you are placed in a default collaborative room. You can share your screen with others.
- **Designing:** Drag and drop infrastructure nodes (Edge, Gateway, Compute, Database, etc.) from the left sidebar onto the canvas. Connect them by dragging from a node's handle to another.
- **AI Generation:** Click the **Sparkle (AI)** icon in the toolbar, describe your desired system, and watch the AI build it instantly.
- **Analyzing:** Click the **Shield** icon to receive a security, performance, and cost audit of your current canvas.
- **Exporting:** Click the **Download** icon to export your visual diagram as raw Terraform code or a Docker Compose file.

---

## 🚢 Deployment (Not Yet Deployed)

When you are ready to deploy Arch Whiteboard, keep in mind that the application consists of **two** separate processes that must be hosted:

1. **The Next.js Application:**
   - Best deployed on a platform optimized for Next.js like **Vercel** or **AWS Amplify**.
   - Build command: `npm run build`
   - Ensure all `NEXT_PUBLIC_*`, Supabase, and AI API keys are set in the platform's environment variables.

2. **The Socket.io Server (`server.js`):**
   - Must be deployed to a stateful/long-running environment like **Render**, **Railway**, **Heroku**, or an **AWS EC2/ECS** instance. Serverless environments (like Vercel functions) cannot host persistent WebSockets.
   - Start command: `npm run server`
   - Ensure `ALLOWED_ORIGINS` is set to your production Next.js domain.
   - **Important:** If running multiple instances of the Socket server in production, you *must* configure `REDIS_HOST`, `REDIS_PORT`, and `REDIS_PASSWORD` to enable the Socket.io Redis Adapter and share state/rate-limits across instances.

---

## 📄 License

This project is proprietary and confidential. Unauthorized copying, distribution, or modification of this software is strictly prohibited.
