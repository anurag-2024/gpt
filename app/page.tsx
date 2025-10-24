"use client"

import { useState, useEffect } from "react"
import { useChat, type Message } from "ai/react"
import { useRouter, useSearchParams } from "next/navigation"
import { useUser } from "@clerk/nextjs"
import { Sidebar } from "@/components/sidebar"
import { ChatArea } from "@/components/chat-area"
import { InputArea } from "@/components/input-area"
import { Button } from "@/components/ui/button"
import { Sparkles, ChevronDown, Check } from "lucide-react"
import { toast } from "sonner"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip"

interface Conversation {
  id: string
  title: string
  preview: string
  timestamp: Date
  messages: any[]
}

// Extend Message type to include pairId and files
interface ExtendedMessage extends Message {
  pairId?: string
  files?: Array<{
    url: string
    type: string
    name: string
    size?: number
  }>
}

export default function Home() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { user } = useUser()
  const [sidebarOpen, setSidebarOpen] = useState(true)
  const [conversations, setConversations] = useState<Conversation[]>([])
  const [currentConversationId, setCurrentConversationId] = useState<string | null>(null)
  const [isLoadingConversations, setIsLoadingConversations] = useState(true)
  const [currentBranchIndices, setCurrentBranchIndices] = useState<Map<string, number>>(new Map())
  const [isEditingResponse, setIsEditingResponse] = useState(false)
  const [welcomeMessage, setWelcomeMessage] = useState("")
  const [isTemporaryChat, setIsTemporaryChat] = useState(false)
  const [selectedModel, setSelectedModel] = useState<"chatgpt" | "chatgpt-go">("chatgpt")

  // Models configuration
  const models = [
    {
      id: "chatgpt" as const,
      name: "ChatGPT",
      icon: "G",
      description: "Great for everyday tasks",
    },
    {
      id: "chatgpt-go" as const,
      name: "ChatGPT Go",
      icon: "G",
      description: "Our smartest and fastest model",
    },
  ]

  // Handle model selection
  const handleModelSelect = (modelId: "chatgpt" | "chatgpt-go") => {
    setSelectedModel(modelId)
    toast.success(`Switched to ${modelId === "chatgpt" ? "ChatGPT" : "ChatGPT Go"}`)
  }

  // Welcome messages array
  const getWelcomeMessages = (userName?: string | null) => [
    "What are you working on?",
    "Ready when you are.",
    "Where should we begin?",
    "What's on your mind today?",
    "What's on the agenda today?",
    userName ? `Good to see you, ${userName}.` : "Good to see you.",
    userName ? `How can I help, ${userName}?` : "How can I help?",
    userName ? `Hey, ${userName}. Ready to dive in?` : "Hey. Ready to dive in?",
  ]

  // Vercel AI SDK useChat hook for streaming
  const { messages, input, handleInputChange, handleSubmit, isLoading, setMessages, append, reload, stop } = useChat({
    api: "/api/chat",
    id: currentConversationId || undefined,
    body: {
      conversationId: currentConversationId,
      isTemporaryChat: isTemporaryChat,
    },
    onResponse: (response) => {
      if (!response.ok) {
        toast.error("Failed to get response from AI")
        console.error("Chat API error:", response)
      } else {
        console.log("✅ Chat response received successfully")
      }
    },
    onError: (error) => {
      toast.error(error.message || "An error occurred")
      console.error("❌ Chat error:", error)
    },
    onFinish: (message) => {
      console.log("✅ Chat finished:", message)
      // Reload conversations after message is complete (skip if temporary)
      if (!isTemporaryChat) {
        loadConversations()
      }
    },
  })

  // Select a random welcome message when there are no messages
  useEffect(() => {
    if (messages.length === 0) {
      const userName = user?.firstName || user?.username
      const welcomeMessages = getWelcomeMessages(userName)
      const randomIndex = Math.floor(Math.random() * welcomeMessages.length)
      setWelcomeMessage(welcomeMessages[randomIndex])
    }
  }, [messages.length, user?.firstName, user?.username])

  // Load conversations on mount and from URL
  useEffect(() => {
    loadConversations()
    
    // Check if there's a conversation ID in the URL
    const conversationIdFromUrl = searchParams.get('c')
    if (conversationIdFromUrl) {
      handleSelectConversation(conversationIdFromUrl)
    }
    
    // Check if temporary-chat parameter is in URL
    const temporaryChatParam = searchParams.get('temporary-chat')
    if (temporaryChatParam === 'true') {
      setIsTemporaryChat(true)
    }
  }, [])
  
  // Update URL when temporary chat state changes
  useEffect(() => {
    const currentParam = searchParams.get('temporary-chat')
    
    if (isTemporaryChat && currentParam !== 'true') {
      // Switching TO temporary chat - clear conversation but keep messages
      if (currentConversationId) {
        setCurrentConversationId(null)
      }
      router.push('/?temporary-chat=true', { scroll: false })
    } else if (!isTemporaryChat && currentParam === 'true') {
      // Switching FROM temporary chat - navigate home
      router.push('/', { scroll: false })
    }
  }, [isTemporaryChat])

  const loadConversations = async () => {
    try {
      const response = await fetch("/api/conversations")
      if (!response.ok) throw new Error("Failed to load conversations")
      
      const data = await response.json()
      setConversations(data.conversations.map((conv: any) => ({
        id: conv._id,
        title: conv.title,
        preview: "Click to view conversation",
        timestamp: new Date(conv.lastMessageAt),
        messages: [],
      })))
    } catch (error) {
      toast.error("Failed to load conversations")
      console.error(error)
    } finally {
      setIsLoadingConversations(false)
    }
  }

  const handleSendMessage = async (content: string, files?: any[]) => {
    if (!content.trim() && (!files || files.length === 0)) return

    console.log("Sending message:", { content, files, currentConversationId, isTemporaryChat })

    try {
      let conversationIdToUse = currentConversationId
      const isNewConversation = !conversationIdToUse

      // If no current conversation and NOT temporary, create one first
      if (!conversationIdToUse && !isTemporaryChat) {
        console.log("Creating new conversation...")
        const response = await fetch("/api/conversations", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ title: content.substring(0, 50) || "New Chat" }),
        })

        if (!response.ok) throw new Error("Failed to create conversation")

        const data = await response.json()
        conversationIdToUse = data.conversation._id
        console.log("Conversation created:", conversationIdToUse)
        setCurrentConversationId(conversationIdToUse)
        await loadConversations()
      }

      // Prepare message with files if any
      const messageContent = content.trim() || "Here's an image"
      
      // Convert files to the format we store
      const fileAttachments = files?.map(file => ({
        url: file.url || file.preview,
        name: file.name,
        type: file.type,
        size: file.size || 0,
      })) || []
      
      console.log("Appending message to chat with conversationId:", conversationIdToUse)
      console.log("Files to attach:", files?.length || 0)
      console.log("Is temporary chat:", isTemporaryChat)
      
      // For new conversations, we need to call the API directly because useChat isn't initialized yet
      if (isNewConversation || isTemporaryChat) {
        console.log('🚀 Using manual streaming mode')
        console.log('📊 Current messages before adding user message:', messages.length)
        
        // Store previous messages before adding user message
        const previousMessages = [...messages]
        console.log('💾 Stored previous messages:', previousMessages.length)
        
        // Add user message to UI immediately
        const userMessage = {
          id: `temp-user-${Date.now()}`,
          role: 'user' as const,
          content: messageContent,
          createdAt: new Date(),
          files: fileAttachments.length > 0 ? fileAttachments : undefined,
        }
        
        // For temporary chat, append to existing messages; for new conversation, start fresh
        if (isTemporaryChat && messages.length > 0) {
          console.log('📝 Appending to existing messages')
          setMessages([...messages, userMessage])
        } else {
          console.log('📝 Starting fresh with user message')
          setMessages([userMessage])
        }
        
        // Set loading state to show typing indicator
        setIsEditingResponse(true)

        // Call chat API directly
        console.log('📤 Sending request to /api/chat')
        const response = await fetch('/api/chat', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            messages: isTemporaryChat ? [...messages, { role: 'user', content: messageContent }] : [{ role: 'user', content: messageContent }],
            conversationId: conversationIdToUse,
            files: fileAttachments,
            isTemporaryChat: isTemporaryChat,
          }),
        })

        if (!response.ok) {
          console.error('❌ Response not OK:', response.status)
          setIsEditingResponse(false)
          throw new Error('Failed to get AI response')
        }

        console.log('✅ Got response, starting to read stream')
        
        // Handle streaming response
        const reader = response.body?.getReader()
        const decoder = new TextDecoder()
        let assistantMessage = ''
        const assistantMsgId = `temp-assistant-${Date.now()}`
        let hasStartedStreaming = false

        if (reader) {
          console.log('📖 Starting to read stream...')
          while (true) {
            const { done, value } = await reader.read()
            if (done) {
              console.log('✅ Stream reading complete, final message length:', assistantMessage.length)
              break
            }

            const chunk = decoder.decode(value)
            const lines = chunk.split('\n')
            console.log('📦 Processing', lines.length, 'lines')
            
            // Log first few lines to see the format
            if (lines.length > 0) {
              console.log('📋 First line:', lines[0].substring(0, 100))
              if (lines.length > 1) {
                console.log('📋 Second line:', lines[1].substring(0, 100))
              }
            }

            for (const line of lines) {
              console.log('🔍 Checking line:', line.substring(0, 50), 'starts with 0:?', line.startsWith('0:'))
              
              // Vercel AI SDK data stream format:
              // 0:"text content" - text chunks (content is a JSON string)
              // e: - errors
              // d: - done
              if (line.startsWith('0:')) {
                try {
                  // The format is 0:"text content" or 0:{"content":"text"}
                  const jsonStr = line.substring(2).trim()
                  if (jsonStr) {
                    console.log('🔍 JSON string:', jsonStr.substring(0, 50))
                    
                    // Try parsing as a plain string first (most common format)
                    if (jsonStr.startsWith('"') && jsonStr.endsWith('"')) {
                      const textContent = JSON.parse(jsonStr)
                      assistantMessage += textContent
                      console.log('📝 Added text chunk, total length:', assistantMessage.length)
                    } else {
                      // Try parsing as an object with content property
                      const parsed = JSON.parse(jsonStr)
                      if (parsed.content) {
                        assistantMessage += parsed.content
                        console.log('📝 Added content chunk, total length:', assistantMessage.length)
                      }
                    }
                    
                    console.log('📝 Assistant message length:', assistantMessage.length, 'previousMessages:', previousMessages.length)
                    
                    // Hide typing indicator once we start receiving content
                    if (!hasStartedStreaming) {
                      setIsEditingResponse(false)
                      hasStartedStreaming = true
                      console.log('🎬 Started streaming, hiding typing indicator')
                    }
                    
                    // Update UI with streaming response in chunks
                    // Use the previousMessages we stored before adding userMessage
                    const newMessages = [
                      ...previousMessages,
                      userMessage,
                      {
                        id: assistantMsgId,
                        role: 'assistant' as const,
                        content: assistantMessage,
                        createdAt: new Date(),
                      }
                    ]
                    console.log('💬 Setting messages, total count:', newMessages.length, 'structure:', newMessages.map(m => ({ role: m.role, contentLength: m.content.length })))
                    setMessages(newMessages)
                  }
                } catch (e) {
                  // Ignore JSON parse errors for incomplete chunks
                  console.error('JSON parse error:', e)
                }
              }
            }
          }
        }
        
        // Clear loading state
        setIsEditingResponse(false)

        // Reload conversation to get the real message IDs (skip for temporary chats)
        if (conversationIdToUse && !isTemporaryChat) {
          setTimeout(() => handleSelectConversation(conversationIdToUse), 500)
        }
      } else {
        // Existing conversation - use append as before
        const currentMessagesCount = messages.length
        
        // For Vercel AI SDK, experimental_attachments should only be included if there are files
        const messageToSend: any = {
          role: "user",
          content: messageContent,
        }
        
        // Only add experimental_attachments if we have files
        if (files && files.length > 0) {
          messageToSend.experimental_attachments = files.map(file => ({
            url: file.url,
            name: file.name,
            contentType: file.type,
          }))
          console.log("Adding attachments:", messageToSend.experimental_attachments)
        }
        
        console.log("Message to send:", JSON.stringify(messageToSend, null, 2))
        
        // Use append to send the message with experimental_attachments for images
        // The conversationId will be sent via the body parameter in useChat
        // Also send files in body as backup
        await append(messageToSend, {
          body: {
            conversationId: conversationIdToUse,
            files: fileAttachments, // Send files in body as well
          }
        })
        
        // After append, manually add files to the user message in the state
        // This ensures files are displayed immediately
        if (fileAttachments.length > 0) {
          setTimeout(() => {
            setMessages((prevMessages) => {
              const updatedMessages = [...prevMessages]
              // Find the user message we just added (it should be at currentMessagesCount index)
              if (updatedMessages[currentMessagesCount]) {
                updatedMessages[currentMessagesCount] = {
                  ...updatedMessages[currentMessagesCount],
                  files: fileAttachments,
                } as any
              }
              return updatedMessages
            })
          }, 100)
        }
      }
      
      console.log("Message sent successfully")
    } catch (error) {
      // Clear loading state on error
      setIsEditingResponse(false)
      toast.error("Failed to send message")
      console.error("Send message error:", error)
    }
  }

  // Create a new chat
  const handleNewChat = async () => {
    setCurrentConversationId(null)
    setMessages([])
    setIsTemporaryChat(false) // Disable temporary chat when starting new chat
    router.push('/')
    // toast.success("New chat started")
  }

  // Rename a conversation
  const handleRenameConversation = async (conversationId: string, newTitle: string) => {
    try {
      const response = await fetch('/api/conversations', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ conversationId, title: newTitle }),
      })

      if (!response.ok) throw new Error('Failed to rename conversation')

      await loadConversations()
      toast.success('Conversation renamed')
    } catch (error) {
      toast.error('Failed to rename conversation')
      console.error('Rename error:', error)
    }
  }

  // Delete a conversation
  const handleDeleteConversation = async (conversationId: string) => {
    try {
      const response = await fetch(`/api/conversations?id=${conversationId}`, {
        method: 'DELETE',
      })

      if (!response.ok) throw new Error('Failed to delete conversation')

      // If deleting current conversation, clear it
      if (currentConversationId === conversationId) {
        setCurrentConversationId(null)
        setMessages([])
        router.push('/')
      }

      await loadConversations()
      toast.success('Conversation deleted')
    } catch (error) {
      toast.error('Failed to delete conversation')
      console.error('Delete error:', error)
    }
  }

  // Load messages for a specific conversation
  const handleSelectConversation = async (conversationId: string) => {
    try {
      setCurrentConversationId(conversationId)
      setIsTemporaryChat(false) // Disable temporary chat when selecting a conversation
      
      // Update URL with conversation ID
      router.push(`/?c=${conversationId}`)
      
      // Fetch ALL messages for this conversation (including branches)
      const response = await fetch(`/api/messages?conversationId=${conversationId}`)
      if (!response.ok) throw new Error("Failed to load messages")
      
      const data = await response.json()
      
      // Build a map of message pairs by pairId
      const pairsById = new Map<string, any>()
      const pairsByParent = new Map<string | null, any[]>()
      
      data.messages.forEach((msg: any) => {
        if (msg.role === 'user') {
          const pair = {
            pairId: msg.pairId,
            user: msg,
            assistant: null,
            parentMessageId: msg.parentMessageId,
            branches: msg.branches || [],
            depth: msg.depth || 0,
          }
          pairsById.set(msg.pairId, pair)
          
          // Group by parent for tree building
          const parentId = msg.parentMessageId || null
          if (!pairsByParent.has(parentId)) {
            pairsByParent.set(parentId, [])
          }
          pairsByParent.get(parentId)!.push(pair)
        } else if (msg.role === 'assistant') {
          const pair = pairsById.get(msg.pairId)
          if (pair) {
            pair.assistant = msg
          }
        }
      })
      
      // Build the conversation path following selected branches
      const displayedMessages: any[] = []
      const buildPath = (parentId: string | null = null) => {
        const children = pairsByParent.get(parentId) || []
        if (children.length === 0) return
        
        // Sort by creation time
        children.sort((a, b) => 
          new Date(a.user.createdAt).getTime() - new Date(b.user.createdAt).getTime()
        )
        
        // For root level or any level, show the currently selected branch
        if (parentId === null) {
          // Show all root messages in sequence (messages without parent)
          children.forEach(pair => {
            // Count how many siblings this pair has (for branch navigation)
            const siblingsCount = children.length
            const currentIndex = children.indexOf(pair)
            
            displayedMessages.push({
              id: pair.user._id,
              role: 'user',
              content: pair.user.content,
              createdAt: new Date(pair.user.createdAt),
              pairId: pair.pairId,
              branches: pair.branches,
              branchCount: siblingsCount,
              branchIndex: currentIndex,
              files: pair.user.files || [],
            })
            displayedMessages.push({
              id: pair.assistant._id,
              role: 'assistant',
              content: pair.assistant.content,
              createdAt: new Date(pair.assistant.createdAt),
              pairId: pair.pairId,
              branches: pair.branches,
              branchCount: siblingsCount,
              branchIndex: currentIndex,
            })
            
            // Continue building path from this message
            buildPath(pair.pairId)
          })
        } else {
          // For branched messages, show the currently selected branch only
          const branchIndex = currentBranchIndices.get(parentId) || 0
          const selectedPair = children[Math.min(branchIndex, children.length - 1)]
          const siblingsCount = children.length
          
          if (selectedPair) {
            displayedMessages.push({
              id: selectedPair.user._id,
              role: 'user',
              content: selectedPair.user.content,
              createdAt: new Date(selectedPair.user.createdAt),
              pairId: selectedPair.pairId,
              branches: selectedPair.branches,
              branchCount: siblingsCount,
              branchIndex: branchIndex,
              files: selectedPair.user.files || [],
            })
            displayedMessages.push({
              id: selectedPair.assistant._id,
              role: 'assistant',
              content: selectedPair.assistant.content,
              createdAt: new Date(selectedPair.assistant.createdAt),
              pairId: selectedPair.pairId,
              branches: selectedPair.branches,
              branchCount: siblingsCount,
              branchIndex: branchIndex,
            })
            
            // Continue building path
            buildPath(selectedPair.pairId)
          }
        }
      }
      
      buildPath(null)
      
      // Initialize branch indices for all pairs that have branches
      const newBranchIndices = new Map(currentBranchIndices)
      pairsById.forEach((pair, pairId) => {
        if (pair.branches && pair.branches.length > 0 && !newBranchIndices.has(pairId)) {
          newBranchIndices.set(pairId, 0)
        }
      })
      setCurrentBranchIndices(newBranchIndices)
      
      setMessages(displayedMessages)
    } catch (error) {
      toast.error("Failed to load conversation")
      console.error(error)
    }
  }

  // Handle message editing - when user edits their message, regenerate response
  const handleEditMessage = async (messageId: string, newContent: string) => {
    if (!currentConversationId) return
    
    try {
      console.log("Editing message:", messageId, "New content:", newContent)
      
      // Set loading state for typing indicator
      setIsEditingResponse(true)
      
      // Find the message being edited
      const messageIndex = messages.findIndex(m => m.id === messageId)
      if (messageIndex === -1) return

      // Get the pairId of the message being edited (for branching)
      const editedMessage = messages[messageIndex] as ExtendedMessage
      const parentPairId = editedMessage.pairId || null

      // Keep all messages before the edited one
      const messagesBeforeEdit = messages.slice(0, messageIndex)
      
      // Create a new user message with the edited content
      const editedUserMessage = {
        id: `temp-${Date.now()}`,
        role: 'user' as const,
        content: newContent,
        createdAt: new Date(),
      }

      // Update UI immediately - show messages before edit + edited message
      setMessages([...messagesBeforeEdit, editedUserMessage])

      // Call the chat API directly with the complete message history and parent ID
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: [...messagesBeforeEdit, { role: 'user', content: newContent }],
          conversationId: currentConversationId,
          parentMessageId: parentPairId, // For branching
        }),
      })

      if (!response.ok) {
        throw new Error('Failed to get AI response')
      }

      // Handle streaming response
      const reader = response.body?.getReader()
      const decoder = new TextDecoder()
      let assistantMessage = ''
      const assistantMsgId = `temp-assistant-${Date.now()}`

      if (reader) {
        while (true) {
          const { done, value } = await reader.read()
          if (done) break

          const chunk = decoder.decode(value)
          const lines = chunk.split('\n')

          for (const line of lines) {
            if (line.startsWith('0:')) {
              try {
                const jsonStr = line.substring(2).trim()
                if (jsonStr) {
                  const parsed = JSON.parse(jsonStr)
                  if (parsed.content) {
                    assistantMessage += parsed.content
                    
                    // Update UI with streaming response
                    setMessages([
                      ...messagesBeforeEdit,
                      editedUserMessage,
                      {
                        id: assistantMsgId,
                        role: 'assistant' as const,
                        content: assistantMessage,
                        createdAt: new Date(),
                      }
                    ])
                  }
                }
              } catch (e) {
                // Ignore JSON parse errors for incomplete chunks
              }
            }
          }
        }
      }

      toast.success("Message edited and response regenerated")
      
      // Reload conversation to show the new branch
      await handleSelectConversation(currentConversationId)
      
    } catch (error: any) {
      console.error("Edit message error:", error)
      toast.error(error.message || "Failed to edit message")
    } finally {
      // Always clear loading state
      setIsEditingResponse(false)
    }
  }

  // Handle regenerating the last AI response
  const handleRegenerateResponse = async (messageId: string) => {
    if (!currentConversationId) return
    
    try {
      console.log("Regenerating response for message:", messageId)
      
      // Set loading state for typing indicator
      setIsEditingResponse(true)
      
      // Find the AI message and the user message before it
      const messageIndex = messages.findIndex(m => m.id === messageId)
      if (messageIndex === -1 || messageIndex === 0) return

      const currentMessage = messages[messageIndex] as ExtendedMessage
      const userMessage = messages[messageIndex - 1]
      if (userMessage.role !== 'user') return

      // Get the pairId to create a branch
      const parentPairId = (userMessage as ExtendedMessage).pairId || null

      // Keep all messages before the AI response
      const messagesBeforeAI = messages.slice(0, messageIndex)
      
      // Update UI - remove the AI response to show typing indicator
      setMessages(messagesBeforeAI)

      // Call the chat API with message history up to the user message and parent ID for branching
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: messagesBeforeAI,
          conversationId: currentConversationId,
          parentMessageId: parentPairId, // This creates a branch
        }),
      })

      if (!response.ok) {
        throw new Error('Failed to regenerate response')
      }

      // Handle streaming response
      const reader = response.body?.getReader()
      const decoder = new TextDecoder()
      let assistantMessage = ''
      const assistantMsgId = `temp-regen-${Date.now()}`

      if (reader) {
        while (true) {
          const { done, value } = await reader.read()
          if (done) break

          const chunk = decoder.decode(value)
          const lines = chunk.split('\n')

          for (const line of lines) {
            if (line.startsWith('0:')) {
              try {
                const jsonStr = line.substring(2).trim()
                if (jsonStr) {
                  const parsed = JSON.parse(jsonStr)
                  if (parsed.content) {
                    assistantMessage += parsed.content
                    
                    // Update UI with streaming response
                    setMessages([
                      ...messagesBeforeAI,
                      {
                        id: assistantMsgId,
                        role: 'assistant' as const,
                        content: assistantMessage,
                        createdAt: new Date(),
                      }
                    ])
                  }
                }
              } catch (e) {
                // Ignore JSON parse errors for incomplete chunks
              }
            }
          }
        }
      }

      toast.success("Response regenerated")
      
      // Wait a moment before reloading to show the complete message
      await new Promise(resolve => setTimeout(resolve, 500))
      
      // Reload the conversation to get branch information
      await handleSelectConversation(currentConversationId)
      
    } catch (error: any) {
      console.error("Regenerate error:", error)
      toast.error(error.message || "Failed to regenerate response")
    } finally {
      // Always clear loading state
      setIsEditingResponse(false)
    }
  }

  // Navigate to previous branch of a message
  const handlePreviousBranch = async (pairId: string) => {
    if (!currentConversationId) return
    
    const currentIndex = currentBranchIndices.get(pairId) || 0
    if (currentIndex > 0) {
      // Update branch index
      const newIndices = new Map(currentBranchIndices)
      newIndices.set(pairId, currentIndex - 1)
      setCurrentBranchIndices(newIndices)
      
      // Reload conversation to rebuild the message tree with new branch
      setTimeout(() => handleSelectConversation(currentConversationId), 0)
    }
  }

  // Navigate to next branch of a message
  const handleNextBranch = async (pairId: string, totalBranches: number) => {
    if (!currentConversationId) return
    
    const currentIndex = currentBranchIndices.get(pairId) || 0
    if (currentIndex < totalBranches - 1) {
      // Update branch index
      const newIndices = new Map(currentBranchIndices)
      newIndices.set(pairId, currentIndex + 1)
      setCurrentBranchIndices(newIndices)
      
      // Reload conversation to rebuild the message tree with new branch
      setTimeout(() => handleSelectConversation(currentConversationId), 0)
    }
  }

  return (
    <div className="flex h-screen bg-background text-foreground dark">
      <Sidebar 
        conversations={conversations} 
        currentConversationId={currentConversationId}
        sidebarOpen={sidebarOpen} 
        setSidebarOpen={setSidebarOpen}
        onNewChat={handleNewChat}
        onSelectConversation={handleSelectConversation}
        onRenameConversation={handleRenameConversation}
        onDeleteConversation={handleDeleteConversation}
        user={{
          firstName: user?.firstName,
          lastName: user?.lastName,
          emailAddress: user?.primaryEmailAddress?.emailAddress,
          imageUrl: user?.imageUrl
        }}
      />
      <div className="flex flex-1 flex-col overflow-hidden">
        {messages.length === 0 ? (
          /* Empty state - centered welcome with input */
          <>
            {/* Top Navigation Bar - Only shown when no messages */}
            <div className="flex items-center justify-between px-4 py-3">
              {/* Left - ChatGPT Dropdown */}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="ghost"
                    className="flex items-center gap-2 px-3 py-2 h-9 text-sm font-medium text-[#ececec] hover:bg-[#2f2f2f] rounded-lg"
                  >
                    ChatGPT
                    <ChevronDown className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="start" className="w-[340px] bg-[#2f2f2f] border-[#3f3f3f] text-[#ececec] p-2">
                  {/* ChatGPT Go Option */}
                  <DropdownMenuItem 
                    className="flex items-start gap-3 p-3 rounded-lg focus:bg-[#3f3f3f] focus:text-[#ececec] cursor-pointer mb-1"
                    onClick={() => setSelectedModel("chatgpt-go")}
                  >
                    <div className="mt-0.5">
                      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <path d="M12 2L2 7L12 12L22 7L12 2Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                        <path d="M2 17L12 22L22 17" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                        <path d="M2 12L12 17L22 12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                      </svg>
                    </div>
                    <div className="flex-1" 
                        onClick={(e) => {
                          e.stopPropagation()
                          router.push('/pricing')
                        }}>
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-medium text-[15px]">ChatGPT Go</span>
                      </div>
                      <p className="text-xs text-[#8e8ea0]">Our smartest model & more</p>
                    </div>
                    <div className="flex items-center gap-2" >
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-7 px-3 text-xs bg-[#3f3f3f] hover:bg-[#4f4f4f] text-[#ececec] rounded-md"
                        onClick={(e) => {
                          e.stopPropagation()
                          router.push('/pricing')
                        }}
                      >
                        Upgrade
                      </Button>
                    </div>
                  </DropdownMenuItem>

                  {/* ChatGPT Option */}
                  <DropdownMenuItem 
                    className="flex items-start gap-3 p-3 rounded-lg focus:bg-[#3f3f3f] focus:text-[#ececec] cursor-pointer"
                    onClick={() => setSelectedModel("chatgpt")}
                  >
                    <div className="mt-0.5">
                      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="2"/>
                        <path d="M8 12L11 15L16 9" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                      </svg>
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-medium text-[15px]">ChatGPT</span>
                      </div>
                      <p className="text-xs text-[#8e8ea0]">Great for everyday tasks</p>
                    </div>
                    {selectedModel === "chatgpt" && (
                      <div className="mt-0.5">
                        <Check className="h-5 w-5 text-[#ececec]" />
                      </div>
                    )}
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>

              {/* Center - Upgrade to Go Button */}
              <Button
                className="bg-gradient-to-r from-[#6e56cf] to-[#8e4ec6] hover:from-[#5d47b8] hover:to-[#7d3fb5] text-white rounded-full px-4 py-2 h-9 text-sm font-medium flex items-center gap-2 shadow-sm"
                onClick={() => {
                  router.push('/pricing')
                }}
              >
                <Sparkles className="h-4 w-4" />
                Upgrade to Go
              </Button>

              {/* Right - Temporary Chat Button */}
              <Button
                variant="ghost"
                className="flex items-center gap-2 px-3 py-2 h-9 text-sm font-medium text-[#ececec] hover:bg-[#2f2f2f] rounded-lg"
                onClick={() => {
                  setIsTemporaryChat(!isTemporaryChat)
                }}
              >
                {/* Pentagon/Shield Icon with optional check */}
                <div className="relative">
                  {!isTemporaryChat?(
                       <svg width="20" height="20" viewBox="0 0 20 20" fill="currentColor" xmlns="http://www.w3.org/2000/svg" data-rtl-flip="" className="icon"><path d="M4.52148 15.1664C4.61337 14.8108 4.39951 14.4478 4.04395 14.3559C3.73281 14.2756 3.41605 14.4295 3.28027 14.7074L3.2334 14.8334C3.13026 15.2324 3.0046 15.6297 2.86133 16.0287L2.71289 16.4281C2.63179 16.6393 2.66312 16.8775 2.79688 17.06C2.93067 17.2424 3.14825 17.3443 3.37402 17.3305L3.7793 17.3002C4.62726 17.2265 5.44049 17.0856 6.23438 16.8764C6.84665 17.1788 7.50422 17.4101 8.19434 17.558C8.55329 17.6348 8.9064 17.4062 8.9834 17.0473C9.06036 16.6882 8.83177 16.3342 8.47266 16.2572C7.81451 16.1162 7.19288 15.8862 6.62305 15.5815C6.50913 15.5206 6.38084 15.4946 6.25391 15.5053L6.12793 15.5277C5.53715 15.6955 4.93256 15.819 4.30566 15.9027C4.33677 15.8053 4.36932 15.7081 4.39844 15.6098L4.52148 15.1664Z"></path><path d="M15.7998 14.5365C15.5786 14.3039 15.2291 14.2666 14.9668 14.4301L14.8604 14.5131C13.9651 15.3633 12.8166 15.9809 11.5273 16.2572C11.1682 16.3342 10.9396 16.6882 11.0166 17.0473C11.0936 17.4062 11.4467 17.6348 11.8057 17.558C13.2388 17.2509 14.5314 16.5858 15.5713 15.6645L15.7754 15.477C16.0417 15.2241 16.0527 14.8028 15.7998 14.5365Z"></path><path d="M2.23828 7.58927C1.97668 8.34847 1.83496 9.15958 1.83496 10.0004C1.835 10.736 1.94324 11.4483 2.14551 12.1234L2.23828 12.4106C2.35793 12.7576 2.73588 12.9421 3.08301 12.8227C3.3867 12.718 3.56625 12.4154 3.52637 12.1088L3.49512 11.977C3.2808 11.3549 3.16508 10.6908 3.16504 10.0004C3.16504 9.30977 3.28072 8.64514 3.49512 8.02286C3.61476 7.67563 3.43024 7.2968 3.08301 7.17716C2.73596 7.05778 2.35799 7.24232 2.23828 7.58927Z"></path><path d="M16.917 12.8227C17.2641 12.9421 17.6421 12.7576 17.7617 12.4106C18.0233 11.6515 18.165 10.8411 18.165 10.0004C18.165 9.15958 18.0233 8.34847 17.7617 7.58927C17.642 7.24231 17.264 7.05778 16.917 7.17716C16.5698 7.2968 16.3852 7.67563 16.5049 8.02286C16.7193 8.64514 16.835 9.30977 16.835 10.0004C16.8349 10.6908 16.7192 11.3549 16.5049 11.977C16.3852 12.3242 16.5698 12.703 16.917 12.8227Z"></path><path d="M8.9834 2.95255C8.90632 2.59374 8.55322 2.3651 8.19434 2.44181C6.76126 2.74892 5.46855 3.41405 4.42871 4.33536L4.22461 4.52286C3.95829 4.77577 3.94729 5.19697 4.2002 5.46329C4.42146 5.69604 4.77088 5.73328 5.0332 5.56973L5.13965 5.4877C6.03496 4.63748 7.18337 4.0189 8.47266 3.74259C8.83177 3.66563 9.06036 3.31166 8.9834 2.95255Z"></path><path d="M15.5713 4.33536C14.5314 3.41405 13.2387 2.74892 11.8057 2.44181C11.4468 2.3651 11.0937 2.59374 11.0166 2.95255C10.9396 3.31166 11.1682 3.66563 11.5273 3.74259C12.7361 4.00163 13.8209 4.56095 14.6895 5.33048L14.8604 5.4877L14.9668 5.56973C15.2291 5.73327 15.5785 5.69604 15.7998 5.46329C16.0211 5.23025 16.0403 4.87902 15.8633 4.6254L15.7754 4.52286L15.5713 4.33536Z"></path></svg>
                  ) : <svg width="20" height="20" viewBox="0 0 20 20" fill="currentColor" xmlns="http://www.w3.org/2000/svg" data-rtl-flip="" className="icon"><path d="M11.7304 7.35195C11.9273 7.04193 12.3384 6.95002 12.6484 7.14687C12.9582 7.34374 13.0502 7.75487 12.8535 8.06484L9.67868 13.0648C9.56765 13.2397 9.38114 13.3525 9.17477 13.3705C8.96844 13.3885 8.76558 13.3096 8.62595 13.1566L6.80075 11.1566L6.7197 11.0482C6.56149 10.7827 6.60647 10.4337 6.84372 10.2172C7.08112 10.0007 7.43256 9.98823 7.68259 10.1703L7.78317 10.2601L9.02145 11.6166L11.7304 7.35195Z" data-rtl-flip=""></path><path d="M4.52148 15.1664C4.61337 14.8108 4.39951 14.4478 4.04395 14.3559C3.73281 14.2756 3.41605 14.4295 3.28027 14.7074L3.2334 14.8334C3.13026 15.2324 3.0046 15.6297 2.86133 16.0287L2.71289 16.4281C2.63179 16.6393 2.66312 16.8775 2.79688 17.06C2.93067 17.2424 3.14825 17.3443 3.37402 17.3305L3.7793 17.3002C4.62726 17.2265 5.44049 17.0856 6.23438 16.8764C6.84665 17.1788 7.50422 17.4101 8.19434 17.558C8.55329 17.6347 8.9064 17.4062 8.9834 17.0473C9.06036 16.6881 8.83177 16.3342 8.47266 16.2572C7.81451 16.1162 7.19288 15.8862 6.62305 15.5814C6.50913 15.5205 6.38084 15.4946 6.25391 15.5053L6.12793 15.5277C5.53715 15.6955 4.93256 15.819 4.30566 15.9027C4.33677 15.8052 4.36932 15.7081 4.39844 15.6098L4.52148 15.1664Z"></path><path d="M15.7998 14.5365C15.5786 14.3039 15.2291 14.2666 14.9668 14.4301L14.8604 14.5131C13.9651 15.3633 12.8166 15.9809 11.5273 16.2572C11.1682 16.3342 10.9396 16.6881 11.0166 17.0473C11.0936 17.4062 11.4467 17.6347 11.8057 17.558C13.2388 17.2509 14.5314 16.5858 15.5713 15.6644L15.7754 15.4769C16.0417 15.224 16.0527 14.8028 15.7998 14.5365Z"></path><path d="M2.23828 7.58925C1.97668 8.34846 1.83496 9.15956 1.83496 10.0004C1.835 10.7359 1.94324 11.4483 2.14551 12.1234L2.23828 12.4105C2.35793 12.7576 2.73588 12.9421 3.08301 12.8226C3.3867 12.718 3.56625 12.4153 3.52637 12.1088L3.49512 11.9769C3.2808 11.3548 3.16508 10.6908 3.16504 10.0004C3.16504 9.30975 3.28072 8.64512 3.49512 8.02284C3.61476 7.67561 3.43024 7.29679 3.08301 7.17714C2.73596 7.05777 2.35799 7.2423 2.23828 7.58925Z"></path><path d="M16.917 12.8226C17.2641 12.9421 17.6421 12.7576 17.7617 12.4105C18.0233 11.6515 18.165 10.8411 18.165 10.0004C18.165 9.15956 18.0233 8.34846 17.7617 7.58925C17.642 7.2423 17.264 7.05777 16.917 7.17714C16.5698 7.29679 16.3852 7.67561 16.5049 8.02284C16.7193 8.64512 16.835 9.30975 16.835 10.0004C16.8349 10.6908 16.7192 11.3548 16.5049 11.9769C16.3852 12.3242 16.5698 12.703 16.917 12.8226Z"></path><path d="M8.9834 2.95253C8.90632 2.59372 8.55322 2.36509 8.19434 2.44179C6.76126 2.74891 5.46855 3.41404 4.42871 4.33534L4.22461 4.52284C3.95829 4.77575 3.94729 5.19696 4.2002 5.46327C4.42146 5.69603 4.77088 5.73326 5.0332 5.56972L5.13965 5.48769C6.03496 4.63746 7.18337 4.01888 8.47266 3.74257C8.83177 3.66561 9.06036 3.31165 8.9834 2.95253Z"></path><path d="M15.5713 4.33534C14.5314 3.41404 13.2387 2.74891 11.8057 2.44179C11.4468 2.36509 11.0937 2.59372 11.0166 2.95253C10.9396 3.31165 11.1682 3.66561 11.5273 3.74257C12.7361 4.00161 13.8209 4.56094 14.6895 5.33046L14.8604 5.48769L14.9668 5.56972C15.2291 5.73326 15.5785 5.69603 15.7998 5.46327C16.0211 5.23025 16.0403 4.87902 15.8633 4.62538L15.7754 4.52284L15.5713 4.33534Z"></path></svg>}
                </div>
              </Button>
            </div>

            <div className="flex-1 flex mt-[13%] justify-center">
              <div className="w-full max-w-3xl px-4">
                <div className="text-center mb-8">
                  {isTemporaryChat ? (
                    <>
                      <h1 className="text-[32px] font-medium text-foreground mb-4 tracking-tight">
                        Temporary Chat
                      </h1>
                      <p className="text-[#8e8ea0] text-base max-w-sm mx-auto leading-relaxed">
                        This chat won't appear in history, use or update ChatGPT's memory, or be used to train our models. For safety purposes, we may keep a copy of this chat for up to 30 days.
                      </p>
                    </>
                  ) : (
                    <h1 className="text-[32px] font-medium text-foreground mb-0 tracking-tight">
                      {welcomeMessage || "Ready when you are."}
                    </h1>
                  )}
                </div>
                <InputArea onSendMessage={handleSendMessage} isStreaming={isLoading || isEditingResponse} onStop={stop} />
              </div>
            </div>
          </>
        ) : (
          /* Chat mode - input at bottom */
          <>
            {/* Top bar for temporary chat mode */}
            {isTemporaryChat && (
              <div className="flex items-center justify-between px-4 py-3 border-b border-[#2f2f2f]">
                {/* Left - ChatGPT button (same as new chat page) */}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="ghost"
                    className="flex items-center gap-2 px-3 py-2 h-9 text-sm font-medium text-[#ececec] hover:bg-[#2f2f2f] rounded-lg"
                  >
                    ChatGPT
                    <ChevronDown className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="start" className="w-[340px] bg-[#2f2f2f] border-[#3f3f3f] text-[#ececec] p-2">
                  {/* ChatGPT Go Option */}
                  <DropdownMenuItem 
                    className="flex items-start gap-3 p-3 rounded-lg focus:bg-[#3f3f3f] focus:text-[#ececec] cursor-pointer mb-1"
                    onClick={() => setSelectedModel("chatgpt-go")}
                  >
                    <div className="mt-0.5">
                      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <path d="M12 2L2 7L12 12L22 7L12 2Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                        <path d="M2 17L12 22L22 17" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                        <path d="M2 12L12 17L22 12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                      </svg>
                    </div>
                    <div className="flex-1" 
                        onClick={(e) => {
                          e.stopPropagation()
                          router.push('/pricing')
                        }}>
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-medium text-[15px]">ChatGPT Go</span>
                      </div>
                      <p className="text-xs text-[#8e8ea0]">Our smartest model & more</p>
                    </div>
                    <div className="flex items-center gap-2" >
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-7 px-3 text-xs bg-[#3f3f3f] hover:bg-[#4f4f4f] text-[#ececec] rounded-md"
                        onClick={(e) => {
                          e.stopPropagation()
                          router.push('/pricing')
                        }}
                      >
                        Upgrade
                      </Button>
                    </div>
                  </DropdownMenuItem>

                  {/* ChatGPT Option */}
                  <DropdownMenuItem 
                    className="flex items-start gap-3 p-3 rounded-lg focus:bg-[#3f3f3f] focus:text-[#ececec] cursor-pointer"
                    onClick={() => setSelectedModel("chatgpt")}
                  >
                    <div className="mt-0.5">
                      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="2"/>
                        <path d="M8 12L11 15L16 9" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                      </svg>
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-medium text-[15px]">ChatGPT</span>
                      </div>
                      <p className="text-xs text-[#8e8ea0]">Great for everyday tasks</p>
                    </div>
                    {selectedModel === "chatgpt" && (
                      <div className="mt-0.5">
                        <Check className="h-5 w-5 text-[#ececec]" />
                      </div>
                    )}
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
       
                
                {/* Middle - Temporary Chat indicator */}
                <div className="flex items-center gap-2 text-[#8e8ea0] absolute left-1/2 transform -translate-x-1/2">
                  <svg width="20" height="20" viewBox="0 0 20 20" fill="currentColor" xmlns="http://www.w3.org/2000/svg" data-rtl-flip="" className="icon"><path d="M4.52148 15.1664C4.61337 14.8108 4.39951 14.4478 4.04395 14.3559C3.73281 14.2756 3.41605 14.4295 3.28027 14.7074L3.2334 14.8334C3.13026 15.2324 3.0046 15.6297 2.86133 16.0287L2.71289 16.4281C2.63179 16.6393 2.66312 16.8775 2.79688 17.06C2.93067 17.2424 3.14825 17.3443 3.37402 17.3305L3.7793 17.3002C4.62726 17.2265 5.44049 17.0856 6.23438 16.8764C6.84665 17.1788 7.50422 17.4101 8.19434 17.558C8.55329 17.6348 8.9064 17.4062 8.9834 17.0473C9.06036 16.6882 8.83177 16.3342 8.47266 16.2572C7.81451 16.1162 7.19288 15.8862 6.62305 15.5815C6.50913 15.5206 6.38084 15.4946 6.25391 15.5053L6.12793 15.5277C5.53715 15.6955 4.93256 15.819 4.30566 15.9027C4.33677 15.8053 4.36932 15.7081 4.39844 15.6098L4.52148 15.1664Z"></path><path d="M15.7998 14.5365C15.5786 14.3039 15.2291 14.2666 14.9668 14.4301L14.8604 14.5131C13.9651 15.3633 12.8166 15.9809 11.5273 16.2572C11.1682 16.3342 10.9396 16.6882 11.0166 17.0473C11.0936 17.4062 11.4467 17.6348 11.8057 17.558C13.2388 17.2509 14.5314 16.5858 15.5713 15.6645L15.7754 15.477C16.0417 15.2241 16.0527 14.8028 15.7998 14.5365Z"></path><path d="M2.23828 7.58927C1.97668 8.34847 1.83496 9.15958 1.83496 10.0004C1.835 10.736 1.94324 11.4483 2.14551 12.1234L2.23828 12.4106C2.35793 12.7576 2.73588 12.9421 3.08301 12.8227C3.3867 12.718 3.56625 12.4154 3.52637 12.1088L3.49512 11.977C3.2808 11.3549 3.16508 10.6908 3.16504 10.0004C3.16504 9.30977 3.28072 8.64514 3.49512 8.02286C3.61476 7.67563 3.43024 7.2968 3.08301 7.17716C2.73596 7.05778 2.35799 7.24232 2.23828 7.58927Z"></path><path d="M16.917 12.8227C17.2641 12.9421 17.6421 12.7576 17.7617 12.4106C18.0233 11.6515 18.165 10.8411 18.165 10.0004C18.165 9.15958 18.0233 8.34847 17.7617 7.58927C17.642 7.24231 17.264 7.05778 16.917 7.17716C16.5698 7.2968 16.3852 7.67563 16.5049 8.02286C16.7193 8.64514 16.835 9.30977 16.835 10.0004C16.8349 10.6908 16.7192 11.3549 16.5049 11.977C16.3852 12.3242 16.5698 12.703 16.917 12.8227Z"></path><path d="M8.9834 2.95255C8.90632 2.59374 8.55322 2.3651 8.19434 2.44181C6.76126 2.74892 5.46855 3.41405 4.42871 4.33536L4.22461 4.52286C3.95829 4.77577 3.94729 5.19697 4.2002 5.46329C4.42146 5.69604 4.77088 5.73328 5.0332 5.56973L5.13965 5.4877C6.03496 4.63748 7.18337 4.0189 8.47266 3.74259C8.83177 3.66563 9.06036 3.31166 8.9834 2.95255Z"></path><path d="M15.5713 4.33536C14.5314 3.41405 13.2387 2.74892 11.8057 2.44181C11.4468 2.3651 11.0937 2.59374 11.0166 2.95255C10.9396 3.31166 11.1682 3.66563 11.5273 3.74259C12.7361 4.00163 13.8209 4.56095 14.6895 5.33048L14.8604 5.4877L14.9668 5.56973C15.2291 5.73327 15.5785 5.69604 15.7998 5.46329C16.0211 5.23025 16.0403 4.87902 15.8633 4.6254L15.7754 4.52286L15.5713 4.33536Z"></path></svg>
                  <span className="text-sm text-[#8e8ea0]">Temporary Chat</span>
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <button className="flex items-center justify-center w-4 h-4 rounded-full hover:bg-[#3f3f3f] transition-colors">
                          <svg width="14" height="14" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg" className="text-[#8e8ea0]">
                            <circle cx="8" cy="8" r="7" stroke="currentColor" strokeWidth="1.5"/>
                            <path d="M8 11V8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
                            <circle cx="8" cy="5.5" r="0.75" fill="currentColor"/>
                          </svg>
                        </button>
                      </TooltipTrigger>
                      <TooltipContent side="bottom" className="max-w-xs bg-[#2f2f2f] text-white border border-[#4d4d4d] p-3">
                        <p className="text-xs leading-relaxed">
                          Temporary Chats won't appear in your history, and ChatGPT won't remember anything you talk about.
                        </p>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                </div>
                
                {/* Right - Three horizontal dots menu */}
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-8 w-8 p-0 rounded-lg hover:bg-[#2f2f2f]"
                    >
                      <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor" xmlns="http://www.w3.org/2000/svg" className="text-[#8e8ea0]">
                        <circle cx="2" cy="8" r="1.5"/>
                        <circle cx="8" cy="8" r="1.5"/>
                        <circle cx="14" cy="8" r="1.5"/>
                      </svg>
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent
                    align="end"
                    className="w-40 bg-[#2f2f2f] border-[#4d4d4d] text-white p-1"
                  >
                    <DropdownMenuItem
                      onClick={() => {
                        toast.info("Report functionality coming soon")
                      }}
                      className="cursor-pointer hover:bg-[#3f3f3f] rounded-md px-3 py-2 flex items-center gap-3"
                    >
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className="text-[#ececec]">
                        <path d="M4 15C4 15 5 14 8 14C11 14 13 16 16 16C19 16 20 15 20 15V3C20 3 19 4 16 4C13 4 11 2 8 2C5 2 4 3 4 3V15Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                        <path d="M4 22V15" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                      </svg>
                      <span className="text-sm text-[#ececec]">Report</span>
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      onClick={() => {
                        setMessages([])
                        setIsTemporaryChat(false)
                        router.push('/')
                      }}
                      className="cursor-pointer hover:bg-[#3f3f3f] rounded-md px-3 py-2 flex items-center gap-3"
                    >
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className="text-[#ef4444]">
                        <path d="M3 6H5H21" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                        <path d="M8 6V4C8 3.46957 8.21071 2.96086 8.58579 2.58579C8.96086 2.21071 9.46957 2 10 2H14C14.5304 2 15.0391 2.21071 15.4142 2.58579C15.7893 2.96086 16 3.46957 16 4V6M19 6V20C19 20.5304 18.7893 21.0391 18.4142 21.4142C18.0391 21.7893 17.5304 22 17 22H7C6.46957 22 5.96086 21.7893 5.58579 21.4142C5.21071 21.0391 5 20.5304 5 20V6H19Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                      </svg>
                      <span className="text-sm text-[#ef4444]">Delete</span>
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            )}
            <ChatArea 
              messages={messages} 
              isLoading={isLoading || isEditingResponse}
              onEditMessage={handleEditMessage}
              onRegenerateResponse={handleRegenerateResponse}
              onPreviousBranch={handlePreviousBranch}
              onNextBranch={handleNextBranch}
              currentBranchIndices={currentBranchIndices}
              conversationId={currentConversationId}
              conversationTitle={conversations.find(c => c.id === currentConversationId)?.title}
              onDeleteConversation={handleDeleteConversation}
              userName={user?.firstName || user?.username || undefined}
            />
            <InputArea onSendMessage={handleSendMessage} isStreaming={isLoading || isEditingResponse} onStop={stop} />
          </>
        )}
      </div>
    </div>
  )
}
