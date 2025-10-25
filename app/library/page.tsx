"use client"

import React, { Suspense, useEffect, useState } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { Sidebar } from "@/components/sidebar"
import { InputArea } from "@/components/input-area"
import { toast } from "sonner"
import { Download, Share2, Menu, MoreHorizontal } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import type { IImage } from "@/types"
import { useAppDispatch, useAppSelector } from "@/lib/redux/hooks"
import { fetchConversations, renameConversation, deleteConversation, toConversationWithDate } from "@/lib/redux/slices/conversationsSlice"

function LibraryContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const dispatch = useAppDispatch()
  
  // Get user and conversations from Redux store
  const user = useAppSelector((state) => state.user)
  const { conversations: serializedConversations, isLoading: isLoadingConversations } = useAppSelector((state) => state.conversations)
  
  // Convert serialized conversations to Conversation with Date objects
  const conversations = serializedConversations.map(toConversationWithDate)
  
  const [sidebarOpen, setSidebarOpen] = useState(true)
  const [images, setImages] = useState<IImage[] | null>(null)
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

  // Load conversations from Redux on mount
  useEffect(() => {
    dispatch(fetchConversations())
  }, [dispatch])

  const handleSelectConversation = (conversationId: string) => {
    // Navigate to the main chat page with the conversation id in query string
    router.push(`/?c=${conversationId}`)
  }

  const handleNewChat = () => {
    router.push('/')
  }

  const handleRenameConversation = async (conversationId: string, newTitle: string) => {
    try {
      await dispatch(renameConversation({ conversationId, newTitle })).unwrap()
      toast.success('Conversation renamed')
    } catch (err: any) {
      console.error(err)
      toast.error(err.message || 'Failed to rename')
    }
  }

  const handleDeleteConversation = async (conversationId: string) => {
    try {
      await dispatch(deleteConversation(conversationId)).unwrap()
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
      // Store the preload message in sessionStorage keyed by conversation id so main page can read it
      try {
        if (typeof window !== 'undefined') {
          sessionStorage.setItem(`preload:${conversationId}`, message)
        }
      } catch (e) {
        console.warn('Failed to set preload in sessionStorage', e)
      }
      // Navigate to chat with new conversation. Include a marker (from=library) and sidebar=false
      router.push(`/?c=${conversationId}&from=library&sidebar=false`)
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
          firstName: user?.firstName || undefined,
          lastName: user?.lastName || undefined,
          emailAddress: user?.email || undefined,
          imageUrl: user?.imageUrl || undefined,
        }}
      />

      {/* Mobile hamburger menu - only show when sidebar is closed */}
      {!sidebarOpen && (
        <Button
          variant="ghost"
          size="icon"
          className="fixed left-4 top-4 z-50 md:hidden"
          onClick={() => setSidebarOpen(true)}
        >
          <Menu className="h-5 w-5" />
        </Button>
      )}

      {/* Mobile title - center/right side, left of three-dot menu */}
      <div className="fixed left-1/2 transform -translate-x-1/2 top-4 z-2 md:hidden">
        <h1 className="text-lg font-semibold">Images</h1>
      </div>

      {/* Three-dot menu button - top right */}
      <div className="fixed right-4 top-4 z-40">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className="h-10 w-10 rounded-full hover:bg-[#2f2f2f]"
            >
              <MoreHorizontal className="h-5 w-5" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent
            align="end"
            className="w-56 bg-[#2f2f2f] border-[#4e4e4e] text-[#ececec]"
          >
            <DropdownMenuItem className="cursor-pointer hover:bg-[#212121] focus:bg-[#212121]">
              Settings
            </DropdownMenuItem>
            <DropdownMenuItem className="cursor-pointer hover:bg-[#212121] focus:bg-[#212121]">
              Help & FAQ
            </DropdownMenuItem>
            <DropdownMenuItem className="cursor-pointer hover:bg-[#212121] focus:bg-[#212121]">
              Download all images
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      <main className="flex-1 flex flex-col overflow-hidden">
        {/* Header - only show on desktop */}
        <div className="hidden md:block flex-shrink-0 px-6 pt-6 pb-4 border-b border-border/50">
          <div className="max-w-7xl mx-auto">
            <h1 className="text-2xl font-semibold mb-1">Images</h1>
          </div>
        </div>

        {/* Scrollable content area */}
        <div className="flex-1 overflow-y-auto px-6 py-6 mt-16 md:mt-0">{/* Added mt-16 for mobile spacing */}
          <div className="max-w-7xl mx-auto">
            {isLoading || images === null ? (
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
                {Array.from({ length: 10 }).map((_, i) => (
                  <div key={i} className="aspect-square rounded-lg bg-[#1f1f1f] animate-pulse" />
                ))}
              </div>
            ) : images.length === 0 ? (
              <div className="flex flex-col items-center justify-center min-h-[60vh]">
                <div className="max-w-md text-center">
                  <h2 className="text-xl font-semibold mb-3">Visualize anything, find it here</h2>
                  <p className="text-muted-foreground text-sm leading-relaxed">
                    Ask ChatGPT to turn any idea into an image, diagram, or visual. All your generated images will appear here.
                  </p>
                </div>
              </div>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
                {images.map((img) => (
                  <div 
                    key={img._id} 
                    className="group relative rounded-lg overflow-hidden bg-[#1f1f1f] border border-border/50 hover:border-[#3f3f3f] transition-all cursor-pointer aspect-square"
                  >
                    <img 
                      src={img.url} 
                      alt={img.caption || 'AI image'} 
                      className="w-full h-full object-cover" 
                    />
                    
                    {/* Bottom action buttons - always visible on mobile, visible on hover for desktop */}
                    <div className="absolute bottom-0 left-0 right-0 p-2 bg-gradient-to-t from-black/80 via-black/40 to-transparent md:opacity-0 md:group-hover:opacity-100 transition-opacity">
                      <div className="flex items-center justify-between">
                        {/* Download button - bottom left */}
                        <button
                          onClick={(e) => {
                            e.stopPropagation()
                            handleDownloadImage(img.url, img.caption)
                          }}
                          className="p-2 rounded-full text-white hover:bg-white/20 transition-all"
                          title="Download image"
                        >
                          <Download className="h-4 w-4 md:h-5 md:w-5" />
                        </button>
                        
                        {/* Share button - bottom right */}
                        <button
                          onClick={(e) => {
                            e.stopPropagation()
                            handleShareImage(img.url, img.caption)
                          }}
                          className="p-2 rounded-full text-white hover:bg-white/20 transition-all"
                          title="Share image"
                        >
                          <Share2 className="h-4 w-4 md:h-5 md:w-5" />
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Fixed input area at bottom */}
        <div className="flex-shrink-0 border-t border-border/50 bg-background">
          <div className="max-w-4xl mx-auto px-3 py-2">
            <InputArea onSendMessage={handleSendMessage} />
          </div>
        </div>
      </main>
    </div>
  )
}

export default function LibraryPage() {
  return (
    <Suspense fallback={
      <div className="flex h-screen bg-background text-foreground items-center justify-center">
        <div className="text-muted-foreground">Loading...</div>
      </div>
    }>
      <LibraryContent />
    </Suspense>
  )
}
