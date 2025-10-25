/**
 * Backend Type Definitions
 * Centralized types and interfaces for the server-side application
 */

// ============================================================================
// Database Document Interfaces
// ============================================================================

export interface IMessage {
  _id: string
  conversationId: string
  query: string
  response: string
  files?: {
    url: string
    type: string
    name: string
    size: number
  }[]
  generatedImages?: {
    url: string
    publicId?: string
    caption?: string
    prompt?: string
  }[]
  tokenCount?: number
  parentMessageId?: string | null
  branches?: string[]
  depth?: number
  createdAt: Date
  updatedAt: Date
}

export interface IConversation {
  _id: string
  userId: string
  title: string
  model: string
  totalTokens: number
  lastMessageAt: Date
  archived: boolean
  createdAt: Date
  updatedAt: Date
}

export interface IImage {
  _id: string
  userId: string
  url: string
  publicId?: string
  caption?: string
  metadata?: {
    originalPrompt?: string
    revisedPrompt?: string
    model?: string
    format?: string
    aspectRatio?: string
    size?: string
    quality?: string
  }
  createdAt: Date
  updatedAt: Date
}

// ============================================================================
// API Request Body Types
// ============================================================================

export interface ChatRequestBody {
  messages: Array<{
    role: 'user' | 'assistant' | 'system'
    content: string
    experimental_attachments?: Array<{
      name: string
      contentType: string
      url: string
    }>
  }>
  conversationId?: string
  model?: string
  parentMessageId?: string | null
  files?: Array<{
    url: string
    type: string
    name: string
    size: number
  }>
  isTemporaryChat?: boolean
}

export interface CreateConversationBody {
  title: string
}

export interface UpdateConversationBody {
  conversationId: string
  title?: string
  archived?: boolean
}

export interface ImageGenerationBody {
  prompt: string
  size?: string
  quality?: string
  n?: number
}

// ============================================================================
// Mem0 Types
// ============================================================================

export interface Mem0Memory {
  id: string
  memory: string
  user_id?: string
  agent_id?: string
  metadata?: Record<string, any>
  created_at?: string
  updated_at?: string
}

export interface Mem0SearchResult {
  id: string
  memory: string
  score?: number
  metadata?: Record<string, any>
}

export interface Mem0AddResult {
  id: string
  event: 'ADD' | 'UPDATE' | 'DELETE'
  data: {
    memory?: string
    old_memory?: string
  }
}

// ============================================================================
// Cloudinary Types
// ============================================================================

export interface CloudinaryUploadResult {
  public_id: string
  secure_url: string
  format: string
  width?: number
  height?: number
  bytes?: number
  created_at?: string
}

// ============================================================================
// Utility Types
// ============================================================================

export interface TokenUsage {
  promptTokens: number
  completionTokens: number
  totalTokens: number
}

export interface StreamTextOptions {
  model: any
  messages: Array<{
    role: 'user' | 'assistant' | 'system'
    content: string
    experimental_attachments?: any[]
  }>
  temperature?: number
  maxTokens?: number
  onChunk?: (chunk: any) => void
  onFinish?: (result: {
    text: string
    usage?: TokenUsage
    finishReason?: string
  }) => void
}
