# Galaxy AI - ChatGPT Clone

A pixel-perfect ChatGPT clone built with Next.js 15, Vercel AI SDK, MongoDB, and Clerk authentication. This project demonstrates enterprise-level architecture following the patterns from [Dub.co](https://github.com/dubinc/dub).

## 🎯 Features

- ✅ **Pixel-Perfect UI** - ChatGPT-like interface designed with v0.dev
- ✅ **Streaming AI Responses** - Real-time chat using Vercel AI SDK
- ✅ **Chat Memory** - Context-aware conversations with custom memory implementation
- ✅ **File Upload** - Support for images and documents (Cloudinary storage)
- ✅ **Message Editing** - Edit and regenerate previous messages
- ✅ **Context Window Management** - Smart token counting and trimming
- ✅ **Conversation History** - Persistent chat storage in MongoDB
- ✅ **Authentication** - Secure auth with Clerk
- ✅ **Responsive Design** - Mobile-first, fully responsive UI

## 🛠️ Tech Stack

| Category | Technology |
|----------|------------|
| **Framework** | Next.js 15 (App Router) |
| **Language** | TypeScript |
| **AI SDK** | Vercel AI SDK + OpenAI |
| **Database** | MongoDB + Mongoose |
| **Authentication** | Clerk |
| **File Storage** | Cloudinary |
| **Styling** | TailwindCSS + ShadCN |
| **UI Design** | v0.dev |
| **Deployment** | Vercel |

## 📁 Project Structure

Following [Dub's architecture](https://github.com/dubinc/dub):

```
galaxy-ai/
├── app/                      # Next.js app router
│   ├── api/                  # API routes
│   │   ├── chat/             # Chat streaming endpoint
│   │   ├── upload/           # File upload handler
│   │   └── memory/           # Memory management
│   ├── (auth)/               # Auth pages (sign-in, sign-up)
│   ├── (dashboard)/          # Main chat interface
│   ├── layout.tsx            # Root layout
│   └── globals.css           # Global styles
├── lib/                      # Core business logic
│   ├── db/                   # Database connection & models
│   │   ├── mongodb.ts        # MongoDB connection
│   │   └── models.ts         # Mongoose schemas
│   ├── utils/                # Utility functions
│   │   └── index.ts          # Helper functions
│   └── zod/                  # Zod validation schemas
├── ui/                       # Reusable UI components
│   └── chat/                 # Chat-specific components
├── components/               # Shared components
├── public/                   # Static assets
└── middleware.ts             # Next.js middleware (Clerk)
```

## 🚀 Getting Started

### Prerequisites

- Node.js 18+ and npm
- MongoDB database (local or Atlas)
- OpenAI API key
- Clerk account
- Cloudinary account

### 1. Clone and Install

```bash
git clone <your-repo-url>
cd galaxy-ai
npm install
```

### 2. Environment Setup

Copy `.env.example` to `.env.local` and fill in your credentials:

```bash
# Core App
NEXT_PUBLIC_APP_URL=http://localhost:3000

# OpenAI API
OPENAI_API_KEY=sk-...

# MongoDB
MONGODB_URI=mongodb+srv://...

# Clerk Authentication
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_...
CLERK_SECRET_KEY=sk_...

# Cloudinary
CLOUDINARY_CLOUD_NAME=...
CLOUDINARY_API_KEY=...
CLOUDINARY_API_SECRET=...
```

### 3. Run Development Server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

## 📝 Key Implementation Details

### 1. **Streaming Chat with Vercel AI SDK**

```typescript
// app/api/chat/route.ts
import { streamText } from 'ai';
import { openai } from '@ai-sdk/openai';

export async function POST(req: Request) {
  const { messages } = await req.json();
  
  const result = streamText({
    model: openai('gpt-4-turbo'),
    messages,
  });

  return result.toDataStreamResponse();
}
```

### 2. **Context Window Management**

We implement smart token counting to stay within model limits:

```typescript
// Trim messages to fit context window
function trimMessages(messages: Message[], maxTokens: number) {
  // Keep system message + recent messages
  // Estimate ~4 chars per token
}
```

### 3. **MongoDB Schema Design**

Two main collections:
- **Conversations**: Metadata, title, model, token count
- **Messages**: Individual messages with role, content, files

### 4. **File Upload Flow**

1. User selects file → Upload to Cloudinary
2. Get secure URL → Attach to message
3. Send to OpenAI (vision models for images)

## 🎨 UI Design with v0.dev

All UI components were designed using v0.dev. Here are the prompts used:

### Chat Interface Prompt
```
Create a ChatGPT-like interface with:
- Sidebar for conversation history
- Main chat area with message bubbles
- Input field with file upload button
- Responsive mobile layout
- Dark mode support
```

*(See full prompts in `/docs/v0-prompts.md`)*

## 📦 Deployment

### Deploy to Vercel

```bash
npm run build
vercel --prod
```

Make sure to add all environment variables in Vercel dashboard.

## 🧪 Testing

```bash
npm run type-check  # TypeScript validation
npm run lint        # ESLint
```

## 📚 Learning Resources

- [Next.js Best Practices](https://nextjs.org/docs)
- [Vercel AI SDK Docs](https://sdk.vercel.ai/docs)
- [Dub Repository](https://github.com/dubinc/dub) - Architecture reference
- [ShadCN UI](https://ui.shadcn.com/)

## 🤝 Contributing

This project follows strict coding standards:

1. **Code Quality**: Clean, readable, modular code
2. **Type Safety**: Strict TypeScript
3. **Architecture**: Follow Dub's patterns
4. **UI/UX**: Pixel-perfect designs from v0.dev

## 📄 License

MIT

---

**Built with ❤️ following enterprise-grade standards**
