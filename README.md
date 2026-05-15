<p align="center">
  <img src="https://img.icons8.com/fluency/96/tv-show.png" alt="SyncRoom Logo" width="80" />
</p>

<h1 align="center">SyncRoom</h1>

<p align="center">
  <b>Watch Together. Chat Together. Be Together.</b><br/>
  A real-time, full-stack watch party application for synchronized video viewing with friends.
</p>

<p align="center">
  <a href="https://syncroom-frontend.vercel.app/">
    <img src="https://img.shields.io/badge/🌐_Live_Demo-syncroom--frontend.vercel.app-indigo?style=for-the-badge" alt="Live Demo" />
  </a>
</p>

<p align="center">
  <img src="https://img.shields.io/badge/Next.js-14-black?style=flat-square&logo=next.js" alt="Next.js" />
  <img src="https://img.shields.io/badge/TypeScript-5-blue?style=flat-square&logo=typescript" alt="TypeScript" />
  <img src="https://img.shields.io/badge/Socket.IO-4-white?style=flat-square&logo=socket.io&logoColor=black" alt="Socket.IO" />
  <img src="https://img.shields.io/badge/Express-5-green?style=flat-square&logo=express" alt="Express" />
  <img src="https://img.shields.io/badge/MongoDB-Mongoose-darkgreen?style=flat-square&logo=mongodb" alt="MongoDB" />
  <img src="https://img.shields.io/badge/WebRTC-PeerJS-orange?style=flat-square&logo=webrtc" alt="WebRTC" />
  <img src="https://img.shields.io/badge/FastAPI-Python-teal?style=flat-square&logo=fastapi" alt="FastAPI" />
  <img src="https://img.shields.io/badge/TailwindCSS-3-38bdf8?style=flat-square&logo=tailwindcss" alt="TailwindCSS" />
</p>

---

## ✨ Features

### 🎬 Synchronized Video Playback
- **YouTube Integration** — Paste any YouTube URL and the video syncs across all participants in real time
- **Local File Support** — Upload and play local video files directly in the browser
- **Play / Pause / Seek Sync** — Every action is broadcast via Socket.IO so everyone stays in perfect sync
- **Smart Loop Prevention** — Remote events don't trigger re-emission, preventing infinite event loops

### 💬 Real-Time Chat
- **Instant Messaging** — Messages are broadcast to all room participants via WebSockets
- **User Avatars** — Profile pictures from Google OAuth displayed alongside messages
- **Emoji Picker** — Built-in emoji picker with 11 categories (Smileys, Gestures, Hearts, Animals, Food, Activities, and more)
- **Auto-Scroll** — Chat automatically scrolls to the latest message
- **Timestamp Display** — Every message shows the time it was sent

### 📹 Voice & Video Calls (WebRTC)
- **Peer-to-Peer Video** — Direct WebRTC connections via PeerJS for low-latency video/audio
- **Camera Toggle** — Turn your webcam on/off at any time
- **Microphone Toggle** — Mute/unmute with one click
- **Screen Sharing** — Share your screen with all participants; auto-reverts to camera when stopped
- **Tab-Switch Recovery** — Camera automatically recovers when switching back from another tab (the browser may kill the video track in background tabs — SyncRoom detects this and re-acquires it)
- **Audio-Only Fallback** — If the camera is unavailable, the app falls back to audio-only mode

### 👥 Room Management
- **Create Rooms** — Generate a unique room code instantly from the dashboard
- **Join Rooms** — Enter a room code to join an existing watch party
- **Participant List** — See who's in the room with their mic/camera status
- **Host Indicator** — First user in the room is marked with a crown icon

### 🔐 Authentication
- **Google OAuth** — Sign in with your Google account via NextAuth.js
- **JWT Sessions** — Secure, stateless session management
- **Protected Routes** — Dashboard and room pages require authentication

---

## 🏗️ Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                        Frontend (Next.js 14)                     │
│  Landing Page ──► Dashboard ──► Room Page                        │
│  (Google OAuth)   (Create/Join)  (Video + Chat + WebRTC)         │
│                                                                  │
│  Components: VideoPlayer │ ChatPanel │ CameraGrid │ Participants │
│  State: Zustand │ Hooks: useWebRTC │ UI: shadcn/ui + Tailwind   │
└────────────┬────────────────────────┬────────────────────────────┘
             │ Socket.IO + REST       │ PeerJS (WebRTC)
             ▼                        ▼
┌────────────────────────────┐  ┌─────────────────────┐
│   Backend (Express + Node) │  │  PeerJS Server       │
│   Port 4000                │  │  (integrated)        │
│                            │  │  /peerjs/myapp       │
│  • Socket.IO server        │  └─────────────────────┘
│  • REST API (/api/rooms)   │
│  • MongoDB (Mongoose)      │
│  • Health check endpoint   │
└────────────────────────────┘
             │
             ▼
┌────────────────────────────┐
│  Python Service (FastAPI)  │
│  Port 8000                 │
│                            │
│  • YouTube metadata (oEmbed)│
│  • Health check endpoint   │
└────────────────────────────┘
```

---

## 🛠️ Tech Stack

| Layer | Technology | Purpose |
|-------|-----------|---------|
| **Frontend** | Next.js 14 (App Router) | React framework with SSR |
| | TypeScript | Type safety |
| | Tailwind CSS 3 | Utility-first styling |
| | shadcn/ui (New York) | Radix-based UI component library |
| | Zustand | Lightweight state management |
| | Socket.IO Client | Real-time WebSocket communication |
| | PeerJS | WebRTC abstraction layer |
| | NextAuth.js | Google OAuth authentication |
| | Framer Motion | Animations |
| | react-youtube | YouTube player embed |
| | Lucide React | Icon library |
| **Backend** | Express 5 | HTTP/WebSocket server |
| | Socket.IO 4 | Real-time event handling |
| | Mongoose 9 | MongoDB ODM |
| | PeerJS Server | WebRTC signaling |
| | JSON Web Token | Authentication tokens |
| **Python** | FastAPI | Video metadata microservice |
| | httpx | Async HTTP client |
| | Uvicorn | ASGI server |
| **Infrastructure** | Docker Compose | Multi-container orchestration |
| | Vercel | Frontend deployment |
| | Railway | Backend + Python deployment |

---

## 📁 Project Structure

```
SyncRoom/
├── docker-compose.yml              # Orchestrates all 3 services
├── start-dev.sh                    # Dev launcher (Linux/Mac)
├── start-dev.bat                   # Dev launcher (Windows)
│
├── backend/                        # Node.js API + Socket.IO + PeerJS
│   ├── server.js                   # Entry point
│   ├── models/
│   │   ├── Room.js                 # Room schema (roomId, ownerId, isPrivate)
│   │   ├── User.js                 # User schema (name, email, image)
│   │   └── Message.js              # Message schema (roomId, text, sender)
│   ├── routes/
│   │   └── room.js                 # REST endpoints for room CRUD
│   ├── socket/
│   │   └── index.js                # All Socket.IO event handlers
│   ├── Dockerfile
│   └── railway.json
│
├── frontend/                       # Next.js 14 TypeScript App
│   ├── src/
│   │   ├── app/
│   │   │   ├── page.tsx            # Landing page (Google sign-in)
│   │   │   ├── layout.tsx          # Root layout (AuthProvider + Toaster)
│   │   │   ├── globals.css         # Tailwind + CSS variables
│   │   │   ├── dashboard/
│   │   │   │   └── page.tsx        # Create/Join room dashboard
│   │   │   ├── room/[roomId]/
│   │   │   │   └── page.tsx        # Main room experience
│   │   │   └── api/auth/[...nextauth]/
│   │   │       └── route.ts        # NextAuth API handler
│   │   ├── components/
│   │   │   ├── VideoPlayer.tsx     # YouTube + local video sync
│   │   │   ├── ChatPanel.tsx       # Real-time chat with emoji picker
│   │   │   ├── CameraGrid.tsx      # WebRTC camera tiles
│   │   │   ├── ParticipantsPanel.tsx # User list with status
│   │   │   ├── AuthProvider.tsx    # NextAuth SessionProvider
│   │   │   └── ui/                 # 12 shadcn/ui components
│   │   ├── hooks/
│   │   │   ├── useWebRTC.ts        # PeerJS + camera recovery hook
│   │   │   └── use-toast.ts        # Toast notification system
│   │   ├── lib/
│   │   │   ├── auth.ts             # NextAuth config (Google OAuth)
│   │   │   └── utils.ts            # Tailwind merge utility
│   │   └── store/
│   │       └── useRoomStore.ts     # Zustand store (users, messages)
│   ├── Dockerfile
│   ├── tailwind.config.ts
│   └── vercel.json
│
└── python-service/                 # FastAPI microservice
    ├── main.py                     # YouTube metadata via oEmbed
    ├── requirements.txt
    ├── Dockerfile
    └── railway.json
```

---

## 🚀 Getting Started

### Prerequisites

- **Node.js** 20+ ([download](https://nodejs.org/))
- **Python** 3.8+ ([download](https://www.python.org/))
- **MongoDB** — Local instance or [MongoDB Atlas](https://www.mongodb.com/atlas) (free tier)
- **Google OAuth Credentials** — [Google Cloud Console](https://console.cloud.google.com/apis/credentials)

### 1. Clone the Repository

```bash
git clone https://github.com/adibhoyarekar/SyncRoom.git
cd SyncRoom
```

### 2. Environment Variables

**Backend** — Create `backend/.env`:
```env
PORT=4000
MONGODB_URI=mongodb+srv://<username>:<password>@cluster.mongodb.net/syncroom?retryWrites=true&w=majority
CLIENT_URL=http://localhost:3000
```

**Frontend** — Create `frontend/.env.local`:
```env
GOOGLE_CLIENT_ID=your-google-client-id
GOOGLE_CLIENT_SECRET=your-google-client-secret
NEXTAUTH_URL=http://localhost:3000
NEXTAUTH_SECRET=your-random-secret-key
NEXT_PUBLIC_SOCKET_URL=http://localhost:4000
NEXT_PUBLIC_PEER_HOST=localhost
NEXT_PUBLIC_PEER_PORT=4000
```

### 3. Run Locally

#### Option A: Dev Scripts (Recommended)

```bash
# Linux / macOS
chmod +x start-dev.sh
./start-dev.sh

# Windows
start-dev.bat
```

#### Option B: Manual Start

```bash
# Terminal 1 — Backend
cd backend
npm install
npm run dev          # Runs on port 4000

# Terminal 2 — Frontend
cd frontend
npm install
npm run dev          # Runs on port 3000

# Terminal 3 — Python Service
cd python-service
python -m venv venv
source venv/bin/activate    # Windows: venv\Scripts\activate
pip install -r requirements.txt
uvicorn main:app --host 0.0.0.0 --port 8000 --reload
```

#### Option C: Docker Compose

```bash
docker-compose up --build
```

### 4. Open the App

Navigate to **[http://localhost:3000](http://localhost:3000)** in your browser.

---

## 🔌 Socket.IO Events

| Event | Direction | Payload | Description |
|-------|-----------|---------|-------------|
| `join-room` | Client → Server | `{ roomId, user }` | Join a room |
| `room-users` | Server → Client | `[{ socketId, user }]` | Current users list |
| `user-joined` | Server → Room | `{ socketId, user }` | New user notification |
| `user-left` | Server → Room | `{ socketId, user }` | User disconnect |
| `video-play` | Bidirectional | `{ roomId, time }` | Sync play action |
| `video-pause` | Bidirectional | `{ roomId, time }` | Sync pause action |
| `video-seek` | Bidirectional | `{ roomId, time }` | Sync seek position |
| `video-url-change` | Bidirectional | `{ roomId, newUrl }` | Change video URL |
| `chat-message` | Bidirectional | `{ roomId, message }` | Send/receive chat |
| `typing` | Client → Room | `{ roomId, userName }` | Typing indicator |
| `toggle-mic` | Client → Room | `{ roomId, userId, isMuted }` | Mic state change |
| `toggle-camera` | Client → Room | `{ roomId, userId, isVideoOn }` | Camera state change |
| `webrtc-offer` | Peer → Peer | `{ offer, to }` | WebRTC offer |
| `webrtc-answer` | Peer → Peer | `{ answer, to }` | WebRTC answer |
| `webrtc-ice-candidate` | Peer → Peer | `{ candidate, to }` | ICE candidate |

---

## 🌐 Deployment

| Service | Platform | URL |
|---------|----------|-----|
| Frontend | Vercel | [syncroom-frontend.vercel.app](https://syncroom-frontend.vercel.app/) |
| Backend | Railway | Configured via `railway.json` |
| Python Service | Railway | Configured via `railway.json` |

### Deploying to Vercel

1. Connect your GitHub repo to [Vercel](https://vercel.com)
2. Set **Root Directory** to `frontend`
3. Add all environment variables from `frontend/.env.local`
4. Deploy — Vercel auto-deploys on every push to `main`

### Deploying to Railway

1. Connect your GitHub repo to [Railway](https://railway.app)
2. Create separate services for `backend` and `python-service`
3. Set root directories accordingly
4. Add environment variables for each service
5. Railway uses the `Dockerfile` and `railway.json` for build/deploy config

---

## 📸 Pages Overview

| Page | Route | Description |
|------|-------|-------------|
| **Landing** | `/` | Hero section with Google sign-in CTA and feature cards |
| **Dashboard** | `/dashboard` | Create new rooms or join existing ones via room code |
| **Room** | `/room/[roomId]` | Full experience — video player, camera grid, chat sidebar, media controls |

---

## 🧩 Key Technical Decisions

### Camera Tab-Switch Recovery
Browsers can kill `getUserMedia` video tracks when a tab is hidden. SyncRoom handles this with a 3-layer recovery system:
1. **`useWebRTC` hook** — Listens for `visibilitychange` and checks `track.readyState`. If `"ended"`, re-acquires the camera via `getUserMedia` and hot-swaps the track into all active PeerJS connections.
2. **`CameraGrid`** — Re-attaches `srcObject` on focus without altering `track.enabled` (preserving user intent).
3. **Room page** — Syncs track enabled state with UI toggles after tab recovery.

### Video Sync Loop Prevention
When a remote play/pause/seek event is received, a `isRemoteActionRef` flag is set for 500ms to prevent the local player from re-emitting the same event, avoiding infinite loops.

### State Management
Zustand is used for room state (`users[]`, `messages[]`) because it's lightweight, doesn't require a Provider, and allows direct store access from both components and callbacks.

---

## 🛣️ Future Roadmap

- [ ] Room passwords and private rooms
- [ ] Persistent chat history (MongoDB)
- [ ] Recent rooms on dashboard
- [ ] Typing indicators in chat
- [ ] Room owner controls (kick, mute others)
- [ ] Support for more video platforms (Vimeo, Dailymotion)
- [ ] Mobile responsive optimizations
- [ ] End-to-end encryption for chat

---

## 📄 License

This project is open source and available under the [MIT License](LICENSE).

---

<p align="center">
  Built with ❤️ by <a href="https://github.com/adibhoyarekar">Aditya Bhoyarekar</a>
</p>