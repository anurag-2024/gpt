"use client"

import React, { useEffect, useState } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { useUser } from "@clerk/nextjs"
import { Sidebar } from "@/components/sidebar"
import { InputArea } from "@/components/input-area"
import { toast } from "sonner"
import { Download, Share2 } from "lucide-react"
import type { IImage } from "@/types"

export default function LibraryPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { user } = useUser()
  const [sidebarOpen, setSidebarOpen] = useState(true)
  const [images, setImages] = useState<IImage[] | null>(null)
  const [conversations, setConversations] = useState<any[]>([])
  const [isLoadingConversations, setIsLoadingConversations] = useState(true)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    // Only show images tab for now
    const tab = searchParams?.get?.('tab') || 'images'
    if (tab !== 'images') return

    const load = async () => {
      try {
        setIsLoading(true)
        const res = await fetch('/api/images')
        if (!res.ok) {
          if (res.status === 401) {
            setImages([])
            return
          }
          throw new Error('Failed to load images')
        }
        const data = await res.json()
        // API returns an array
        setImages(Array.isArray(data) ? data : [])
      } catch (err: any) {
        console.error('Failed to load images', err)
        setImages([])
      } finally {
        setIsLoading(false)
      }
    }

    load()
  }, [searchParams])

  // Load conversations for sidebar
  useEffect(() => {
    const loadConversations = async () => {
      try {
        setIsLoadingConversations(true)
        const res = await fetch('/api/conversations')
        if (!res.ok) {
          setConversations([])
          return
        }
        const data = await res.json()
        setConversations(data.conversations.map((conv: any) => ({
          id: conv._id,
          title: conv.title,
          preview: 'Click to view conversation',
          timestamp: new Date(conv.lastMessageAt),
          messages: [],
        })))
      } catch (err) {
        console.error('Failed to load conversations', err)
        setConversations([])
      } finally {
        setIsLoadingConversations(false)
      }
    }

    loadConversations()
  }, [])

  const handleSelectConversation = (conversationId: string) => {
    // Navigate to the main chat page with the conversation id in query string
    router.push(`/?c=${conversationId}`)
  }

  const handleNewChat = () => {
    router.push('/')
  }

  const handleRenameConversation = async (conversationId: string, newTitle: string) => {
    try {
      const res = await fetch('/api/conversations', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ conversationId, title: newTitle }),
      })
      if (!res.ok) throw new Error('Failed to rename')
      // refresh locally
      const updated = conversations.map((c) => c.id === conversationId ? { ...c, title: newTitle } : c)
      setConversations(updated)
      toast.success('Conversation renamed')
    } catch (err: any) {
      console.error(err)
      toast.error(err.message || 'Failed to rename')
    }
  }

  const handleDeleteConversation = async (conversationId: string) => {
    try {
      const res = await fetch(`/api/conversations?id=${conversationId}`, { method: 'DELETE' })
      if (!res.ok) throw new Error('Failed to delete')
      setConversations((prev) => prev.filter((c) => c.id !== conversationId))
      toast.success('Conversation deleted')
    } catch (err: any) {
      console.error(err)
      toast.error(err.message || 'Failed to delete')
    }
  }

  // When user types a message in the library input, create a new conversation and navigate to it.
  // We also fire the initial message to /api/chat in the background so the conversation starts.
  const handleSendMessage = async (message: string, files?: any[]) => {
    if (!message || !message.trim()) return

    try {
      // Create conversation
      const res = await fetch('/api/conversations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: message.substring(0, 50) || 'New Chat' }),
      })

      if (!res.ok) throw new Error('Failed to create conversation')

      const data = await res.json()
      const conversationId = data.conversation?._id || data.conversationId || data.id
      if (!conversationId) throw new Error('Invalid conversation id')

      // Navigate to chat with new conversation and include a preloadMessage so the chat UI shows the user's message immediately
      // Note: we intentionally do NOT send the initial message here to avoid duplicate messages.
      // The main chat page will handle sending/streaming the message via its `append` (useChat) call when it sees the preloadMessage.
      const encoded = encodeURIComponent(message)
      router.push(`/?c=${conversationId}&preloadMessage=${encoded}`)
    } catch (err: any) {
      console.error('Failed to start chat from library:', err)
      toast.error(err.message || 'Failed to start chat')
    }
  }

  const handleDownloadImage = async (imageUrl: string, caption?: string) => {
    try {
      const response = await fetch(imageUrl)
      const blob = await response.blob()
      const url = window.URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      
      // Format: ChatGPT Image MM-DD-YYYY HH-MM-SS AM/PM.png
      const now = new Date()
      const month = String(now.getMonth() + 1).padStart(2, '0')
      const day = String(now.getDate()).padStart(2, '0')
      const year = now.getFullYear()
      const hours = now.getHours()
      const minutes = String(now.getMinutes()).padStart(2, '0')
      const seconds = String(now.getSeconds()).padStart(2, '0')
      const ampm = hours >= 12 ? 'PM' : 'AM'
      const displayHours = hours % 12 || 12
      
      link.download = `ChatGPT Image ${month}-${day}-${year} ${displayHours}-${minutes}-${seconds} ${ampm}.png`
      
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      window.URL.revokeObjectURL(url)
      toast.success('Image downloaded')
    } catch (err) {
      console.error('Download failed:', err)
      toast.error('Failed to download image')
    }
  }

  const handleShareImage = async (imageUrl: string, caption?: string) => {
    try {
      if (navigator.share) {
        await navigator.share({
          title: caption || 'AI Generated Image',
          text: caption || 'Check out this AI generated image',
          url: imageUrl,
        })
        toast.success('Image shared')
      } else {
        // Fallback: copy URL to clipboard
        await navigator.clipboard.writeText(imageUrl)
        toast.success('Image URL copied to clipboard')
      }
    } catch (err) {
      console.error('Share failed:', err)
      toast.error('Failed to share image')
    }
  }

  return (
    <div className="flex h-screen bg-background text-foreground">
      <Sidebar
        conversations={conversations}
        currentConversationId={null}
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
          imageUrl: user?.imageUrl,
        }}
      />

      <main className="flex-1 overflow-auto p-6">
        <div className="max-w-6xl mx-auto">
          <div className="flex items-center justify-between mb-6">
            <h4 className="text-md font-semibold border-b border-muted-foreground">Images</h4>
            <div className="text-sm text-muted-foreground">Showing AI-generated images</div>
          </div>

          {/* Content area */}
          {isLoading || images === null ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
              {Array.from({ length: 8 }).map((_, i) => (
                <div key={i} className="h-40 w-full rounded-lg bg-[#1f1f1f] animate-pulse" />
              ))}
            </div>
          ) : images.length === 0 ? (
            <div className="flex flex-col items-center justify-center mt-[20%]">
              <h2 className="text-xl font-medium mb-2">Visualize anything, find it here</h2>
              <p className="text-center text-muted-foreground max-w-lg text-sm">
                Ask ChatGPT to turn any idea into an image, diagram, or visual.
              </p>

              <div className="w-full max-w-3xl mt-12 px-4" />
            </div>
          ) : (
            <div>
              <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-1">
                {images.map((img) => (
                  <div 
                    key={img._id} 
                    className="group relative rounded-xs overflow-hidden bg-[#1f1f1f] border border-border hover:border-[#3f3f3f] transition-all cursor-pointer aspect-square"
                  >
                    <img 
                      src={img.url} 
                      alt={img.caption || 'AI image'} 
                      className="w-full h-full object-cover" 
                    />
                    
                    {/* Bottom action buttons - always visible on hover */}
                    <div className="absolute left-0 right-0 bottom-0 p-2 bg-gradient-to-t from-black/90 via-black/60 to-transparent opacity-0 group-hover:opacity-100 transition-opacity">
                      <div className="flex items-center justify-between">
                        {/* Download button - bottom left */}
                        <button
                          onClick={() => handleDownloadImage(img.url, img.caption)}
                          className="p-2.5 rounded-full cursor-pointer text-white hover:bg-white/10 transition-all hover:scale-110"
                          title="Download image"
                        >
                          <Download className="h-5 w-5" />
                        </button>
                        
                        {/* Share button - bottom right */}
                        <button
                          onClick={() => handleShareImage(img.url, img.caption)}
                          className="p-2.5 rounded-full cursor-pointer text-white hover:bg-white/10 transition-all hover:scale-110"
                          title="Share image"
                        >
                          <Share2 className="h-5 w-5" />
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </main>

      {/* InputArea - fixed at bottom for the library page */}
      <div className="fixed left-[58%] transform -translate-x-1/2 bottom-6 w-full max-w-3xl px-0">
        <InputArea onSendMessage={handleSendMessage} />
      </div>
    </div>
  )
}
