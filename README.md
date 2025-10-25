# GPT (Chat + Image Library)

This is a Next.js (App Router) TypeScript project that provides a ChatGPT-style interface with streaming responses, a saved conversations sidebar, and an Image Library for generated images.

Key features
- Chat UI with streaming assistant responses
- Conversation list cached in Redux Toolkit (cached across navigation)
- Clerk-based user authentication (client-side user is synced into Redux)
- Image generation/upload flow with a library view (download/share actions)
- Server streaming backed by a Gemini-compatible model (API integration)

Tech stack
- Next.js – framework for server-rendered React apps (App Router)
- TypeScript – statically typed superset of JavaScript
- Tailwind – utility-first CSS framework for styling
- Redux – predictable client-side state management (Redux Toolkit)
- Cloudinary – image hosting, storage and CDN delivery for generated images
- Gemini – LLM model used for assistant responses
- Vercel AI SDK – helpers for streaming and client-server model integration
- MongoDB – document database used for storing conversations/messages
- Clerk – authentication and user management (client + server integrations)
- Vercel – deployment and hosting platform

Quick start

Prerequisites
- Node.js 18+ (or the version required by your environment)
- npm or pnpm
- MongoDB (connection string)

Install

```bash
cd /path/to/repo
npm install
# or: pnpm install
```

Environment

Create a `.env.local` file in the project root with the environment variables your deployment requires. The exact names depend on your deployment and secrets; example variables used by this project:

```
# MongoDB connection string
MONGODB_URI=mongodb+srv://user:pass@cluster.example.mongodb.net/dbname

# Gemini / LLM API key (example name used in code: GEMINI_API_KEY)
GEMINI_API_KEY=your_gemini_key_here

# Cloudinary (used for image uploads)
CLOUDINARY_URL=cloudinary://<api_key>:<api_secret>@<cloud_name>

# Clerk (if using Clerk for auth)
CLERK_FRONTEND_API=your_clerk_frontend_api
CLERK_API_KEY=your_clerk_api_key

# Any other provider keys (SENTRY, ANALYTICS, etc.)
```

Run (development)

```bash
npm run dev
# open http://localhost:3000
```

Build and run production

```bash
npm run build
npm start
```

Project Structure (high-level)
- `app/` - Next.js App Router pages and routes (chat, library, api endpoints)
- `components/` - UI components (chat area, message bubble, sidebar, input area)
- `lib/` - helper libraries and Redux store (`lib/redux` contains slices and hooks)
- `utils/`, `db/`, `types/` - utilities, DB models, and TypeScript types

Notes and tips
- Redux state keeps conversations serializable (timestamps stored as ISO strings). Use `toConversationWithDate` to convert when needed.
- `components/image-actions.tsx` centralizes download/share overlay behavior. The overlay is hover-only on desktop and always-visible on mobile.
- Server endpoints live under `app/api/*` (e.g., `/api/chat`, `/api/conversations`, `/api/images`). Consider adding server-side dedup checks if duplicate messages appear.

Contributing
- Follow the existing coding style (TypeScript, Tailwind CSS utility classes).
- Add small, focused PRs and include a short description of the change and any environment variables needed to test it.

