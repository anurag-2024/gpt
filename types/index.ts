/**
 * Frontend Type Definitions
 * Centralized types and interfaces for the client-side application
 */

import type { Message as AIMessage } from "ai/react"

// ============================================================================
// User Types
// ============================================================================

export interface User {
  firstName?: string | null
  lastName?: string | null
  emailAddress?: string
  imageUrl?: string
}

// ============================================================================
// Message Types
// ============================================================================

export interface FileAttachment {
  id?: string
  name: string
  size: number
  type: string
  url: string
  publicId?: string
  preview?: string
}

export interface GeneratedImage {
  url: string
  publicId?: string
  caption?: string
  prompt?: string
}

export interface ExtendedMessage extends AIMessage {
  files?: FileAttachment[]
  generatedImages?: GeneratedImage[]
  pairId?: string
  branches?: string[]
  branchCount?: number
  branchIndex?: number
  depth?: number
}

// ============================================================================
// Conversation Types
// ============================================================================

export interface Conversation {
  id: string
  title: string
  preview: string
  timestamp: Date
  messages: any[]
}

// ============================================================================
// Component Props
// ============================================================================

export interface MessageBubbleProps {
  message: ExtendedMessage
  onEdit?: (messageId: string, newContent: string) => void
  onRegenerate?: (messageId: string) => void
  isLastUserMessage?: boolean
  isLastAssistantMessage?: boolean
  branchInfo?: {
    current: number
    total: number
    onPrevBranch?: () => void
    onNextBranch?: () => void
  }
}

export interface SidebarProps {
  conversations: Conversation[]
  currentConversationId: string | null
  sidebarOpen: boolean
  setSidebarOpen: (open: boolean) => void
  onNewChat: () => void
  onSelectConversation: (conversationId: string) => void
  onRenameConversation: (conversationId: string, newTitle: string) => void
  onDeleteConversation: (conversationId: string) => void
  user: User
}

export interface InputAreaProps {
  onSendMessage: (content: string, files?: FileAttachment[]) => void
  isStreaming?: boolean
  onStop?: () => void
}

export interface ChatAreaProps {
  messages: ExtendedMessage[]
  isLoading: boolean
  onEditMessage: (messageId: string, newContent: string) => void
  onRegenerateResponse: (messageId: string) => void
  conversationId: string | null
  conversationTitle?: string
  onDeleteConversation: (conversationId: string) => void
  userName?: string
}

export interface ChatGPTModelSelectorProps {
  selectedModel: "chatgpt" | "chatgpt-go"
  onModelSelect: (modelId: "chatgpt" | "chatgpt-go") => void
}

export interface ConfirmDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onConfirm: () => void
  title: string
  description?: string
  highlightedText?: string
  confirmText?: string
  cancelText?: string
  variant?: "default" | "destructive"
  showSettingsLink?: boolean
}

// ============================================================================
// Library Types
// ============================================================================

export interface IImage {
  _id: string
  userId: string
  url: string
  publicId?: string
  caption?: string
  metadata?: any
  createdAt: string
}

// ============================================================================
// API Response Types
// ============================================================================

export interface ImageGenerationResponse {
  success: boolean
  image: {
    url: string
    publicId: string
    caption: string
    originalPrompt: string
    id: string
  }
}

export interface ConversationResponse {
  conversation: {
    _id: string
    userId: string
    title: string
    model: string
    lastMessageAt: string
    createdAt: string
  }
}

export interface MessagesResponse {
  messages: Array<{
    _id: string
    role: 'user' | 'assistant'
    content: string
    createdAt: string
    pairId: string
    parentMessageId?: string | null
    branches?: string[]
    depth?: number
    files?: FileAttachment[]
    generatedImages?: GeneratedImage[]
  }>
}

export interface UploadResponse {
  files: Array<{
    url: string
    publicId: string
    name: string
    type: string
    size: number
    format: string
  }>
  errors?: string[]
  message?: string
}
