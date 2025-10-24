import mongoose, { Schema, model, models } from "mongoose";

/**
 * Message Schema
 * Represents query-response pairs in a conversation
 * Each message contains both the user query and AI response
 * Supports branching for edited messages (like ChatGPT)
 */
const MessageSchema = new Schema(
  {
    conversationId: {
      type: Schema.Types.ObjectId,
      ref: "Conversation",
      required: true,
      index: true,
    },
    // User's query/prompt
    query: {
      type: String,
      required: true,
    },
    // AI's response
    response: {
      type: String,
      required: true,
    },
    files: {
      type: Schema.Types.Mixed,
      default: [],
    },
    tokenCount: {
      type: Number,
      default: 0,
    },
    // Branching support for edited messages
    parentMessageId: {
      type: Schema.Types.ObjectId,
      ref: "Message",
      default: null,
    },
    branches: [{
      type: Schema.Types.ObjectId,
      ref: "Message",
    }],
    // Position in the conversation thread
    depth: {
      type: Number,
      default: 0,
    },
  },
  {
    timestamps: true,
  }
);

/**
 * Conversation Schema
 * Represents a chat conversation with its metadata
 */
const ConversationSchema = new Schema(
  {
    userId: {
      type: String,
      required: true,
      index: true,
    },
    title: {
      type: String,
      default: "New Chat",
    },
    model: {
      type: String,
      default: "gemini-2.5-flash",
    },
    totalTokens: {
      type: Number,
      default: 0,
    },
    lastMessageAt: {
      type: Date,
      default: Date.now,
    },
    archived: {
      type: Boolean,
      default: false,
    },
  },
  {
    timestamps: true,
  }
);

// Indexes for better query performance
MessageSchema.index({ conversationId: 1, createdAt: -1 });
ConversationSchema.index({ userId: 1, lastMessageAt: -1 });
ConversationSchema.index({ userId: 1, archived: 1, lastMessageAt: -1 });

// Export models - check if already compiled to avoid OverwriteModelError
export const Message = models.Message || model("Message", MessageSchema);
export const Conversation = models.Conversation || model("Conversation", ConversationSchema);

// Types
export interface IMessage {
  _id: string;
  conversationId: string;
  query: string;
  response: string;
  files?: {
    url: string;
    type: string;
    name: string;
    size: number;
  }[];
  tokenCount?: number;
  parentMessageId?: string | null;
  branches?: string[];
  depth?: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface IConversation {
  _id: string;
  userId: string;
  title: string;
  model: string;
  totalTokens: number;
  lastMessageAt: Date;
  archived: boolean;
  createdAt: Date;
  updatedAt: Date;
}
