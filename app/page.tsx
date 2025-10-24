"use client"

import { useState, useEffect } from "react"
import { useChat, type Message } from "ai/react"
import { useRouter, useSearchParams } from "next/navigation"
import { useUser } from "@clerk/nextjs"
import { Sidebar } from "@/components/sidebar"
import { ChatArea } from "@/components/chat-area"
import { InputArea } from "@/components/input-area"
import { toast } from "sonner"

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

  // Vercel AI SDK useChat hook for streaming
  const { messages, input, handleInputChange, handleSubmit, isLoading, setMessages, append, reload } = useChat({
    api: "/api/chat",
    id: currentConversationId || undefined,
    body: {
      conversationId: currentConversationId,
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
      // Reload conversations after message is complete
      loadConversations()
    },
  })

  // Load conversations on mount and from URL
  useEffect(() => {
    loadConversations()
    
    // Check if there's a conversation ID in the URL
    const conversationIdFromUrl = searchParams.get('c')
    if (conversationIdFromUrl) {
      handleSelectConversation(conversationIdFromUrl)
    }
  }, [])

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

    console.log("Sending message:", { content, files, currentConversationId })

    try {
      let conversationIdToUse = currentConversationId

      // If no current conversation, create one first
      if (!conversationIdToUse) {
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
      
      // Store current messages count to identify the new message
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
      
      console.log("Message sent successfully")
    } catch (error) {
      toast.error("Failed to send message")
      console.error("Send message error:", error)
    }
  }

  // Create a new chat
  const handleNewChat = async () => {
    setCurrentConversationId(null)
    setMessages([])
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
        />
        <InputArea onSendMessage={handleSendMessage} isStreaming={isLoading || isEditingResponse} />
      </div>
    </div>
  )
}
