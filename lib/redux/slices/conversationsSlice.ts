import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit'

// Use a serializable version of Conversation for Redux
interface SerializableConversation {
  id: string
  title: string
  preview: string
  timestamp: string // Store as ISO string instead of Date
  messages: any[]
}

interface ConversationsState {
  conversations: SerializableConversation[]
  isLoading: boolean
  error: string | null
  lastFetched: number | null
}

const initialState: ConversationsState = {
  conversations: [],
  isLoading: false,
  error: null,
  lastFetched: null,
}

// Async thunk to fetch conversations
export const fetchConversations = createAsyncThunk(
  'conversations/fetchConversations',
  async (_, { rejectWithValue }) => {
    try {
      const res = await fetch('/api/conversations')
      if (!res.ok) {
        throw new Error('Failed to fetch conversations')
      }
      const data = await res.json()
      return data.conversations.map((conv: any) => ({
        id: conv._id,
        title: conv.title,
        preview: conv.preview || 'Click to view conversation',
        timestamp: new Date(conv.lastMessageAt).toISOString(), // Convert to ISO string
        messages: [],
      }))
    } catch (error: any) {
      return rejectWithValue(error.message)
    }
  }
)

// Async thunk to rename conversation
export const renameConversation = createAsyncThunk(
  'conversations/renameConversation',
  async ({ conversationId, newTitle }: { conversationId: string; newTitle: string }, { rejectWithValue }) => {
    try {
      const res = await fetch('/api/conversations', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ conversationId, title: newTitle }),
      })
      if (!res.ok) {
        throw new Error('Failed to rename conversation')
      }
      return { conversationId, newTitle }
    } catch (error: any) {
      return rejectWithValue(error.message)
    }
  }
)

// Async thunk to delete conversation
export const deleteConversation = createAsyncThunk(
  'conversations/deleteConversation',
  async (conversationId: string, { rejectWithValue }) => {
    try {
      const res = await fetch(`/api/conversations?id=${conversationId}`, { method: 'DELETE' })
      if (!res.ok) {
        throw new Error('Failed to delete conversation')
      }
      return conversationId
    } catch (error: any) {
      return rejectWithValue(error.message)
    }
  }
)

const conversationsSlice = createSlice({
  name: 'conversations',
  initialState,
  reducers: {
    addConversation: (state, action: PayloadAction<SerializableConversation>) => {
      state.conversations.unshift(action.payload)
    },
    updateConversation: (state, action: PayloadAction<{ id: string; updates: Partial<SerializableConversation> }>) => {
      const index = state.conversations.findIndex(c => c.id === action.payload.id)
      if (index !== -1) {
        state.conversations[index] = { ...state.conversations[index], ...action.payload.updates }
      }
    },
    clearConversations: (state) => {
      state.conversations = []
      state.lastFetched = null
    },
  },
  extraReducers: (builder) => {
    builder
      // Fetch conversations
      .addCase(fetchConversations.pending, (state) => {
        state.isLoading = true
        state.error = null
      })
      .addCase(fetchConversations.fulfilled, (state, action) => {
        state.isLoading = false
        state.conversations = action.payload
        state.lastFetched = Date.now()
      })
      .addCase(fetchConversations.rejected, (state, action) => {
        state.isLoading = false
        state.error = action.payload as string
      })
      // Rename conversation
      .addCase(renameConversation.fulfilled, (state, action) => {
        const index = state.conversations.findIndex(c => c.id === action.payload.conversationId)
        if (index !== -1) {
          state.conversations[index].title = action.payload.newTitle
        }
      })
      // Delete conversation
      .addCase(deleteConversation.fulfilled, (state, action) => {
        state.conversations = state.conversations.filter(c => c.id !== action.payload)
      })
  },
})

export const { addConversation, updateConversation, clearConversations } = conversationsSlice.actions
export default conversationsSlice.reducer

// Export the type for use in components
export type { SerializableConversation }

// Helper function to convert serializable conversation to Conversation with Date
export const toConversationWithDate = (conv: SerializableConversation) => ({
  ...conv,
  timestamp: new Date(conv.timestamp),
})
