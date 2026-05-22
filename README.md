# chatme

A fast, simple, real-time 1-to-1 chat built with Next.js, Socket.IO, and MongoDB.

## Features
- Sign up / log in with **name + password** (JWT-based sessions)
- Real-time messaging over WebSockets
- Online / Offline presence + **last seen**
- WhatsApp-style status ticks: **sent → delivered → seen**
- Typing indicator
- Unread counts, conversation list, day dividers
- Mobile-responsive split UI

## Stack
- **Next.js 14** (App Router) + custom `server.js` to attach Socket.IO
- **MongoDB** via Mongoose
- **Tailwind CSS** for styling
- **bcryptjs** + **jsonwebtoken** for auth

## Setup

1. Install deps:
   ```bash
   npm install
   ```

2. Copy the env file and fill in your MongoDB Atlas URI + a JWT secret:
   ```bash
   cp .env.example .env.local
   ```
   Edit `.env.local`:
   ```
   PORT=3000
   MONGODB_URI=mongodb+srv://<user>:<pass>@<cluster>.mongodb.net/chatme?retryWrites=true&w=majority
   JWT_SECRET=<a long random string>
   JWT_EXPIRES_IN=7d
   ```

3. Run dev server:
   ```bash
   npm run dev
   ```
   Open http://localhost:3000

4. Open the app in **two different browsers** (or one normal + one incognito) and sign up as two different users to chat.

## Production
```bash
npm run build
npm start
```

## Project layout
```
app/                Next.js App Router (pages + API routes)
  api/              REST endpoints (auth, users, conversations, messages)
  login, signup, chat
components/         UI components (Sidebar, ChatWindow, MessageBubble, …)
context/            React contexts (Auth, Socket)
lib/                Server-side helpers (db, auth, models, socket server)
  models/           Mongoose schemas
utils/              Shared utilities (date formatting)
server.js           Custom Next.js server that also hosts Socket.IO
```
# justus
