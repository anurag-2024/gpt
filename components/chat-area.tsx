"use client"

import { useEffect, useRef, useState } from "react"
import { MessageBubble } from "./message-bubble"
import { TypingIndicator } from "./typing-indicator"
import { Button } from "@/components/ui/button"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { MoreHorizontal, Share2, Archive, Flag, Trash2 } from "lucide-react"
import { ConfirmDialog } from "@/components/confirm-dialog"
import { toast } from "sonner"
import type { Message as UIMessage } from "ai/react"

interface ExtendedMessage extends UIMessage {
  pairId?: string
  branches?: string[]
  branchCount?: number
  branchIndex?: number
}

interface ChatAreaProps {
  messages: ExtendedMessage[]
  isLoading?: boolean
  onEditMessage?: (messageId: string, newContent: string) => void
  onRegenerateResponse?: (messageId: string) => void
  onPreviousBranch?: (pairId: string) => void
  onNextBranch?: (pairId: string, totalBranches: number) => void
  currentBranchIndices?: Map<string, number>
  conversationId?: string | null
  conversationTitle?: string
  onDeleteConversation?: (conversationId: string) => void
  userName?: string
}

export function ChatArea({ 
  messages, 
  isLoading = false, 
  onEditMessage, 
  onRegenerateResponse, 
  onPreviousBranch, 
  onNextBranch, 
  currentBranchIndices,
  conversationId,
  conversationTitle,
  onDeleteConversation,
  userName
}: ChatAreaProps) {
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }

  useEffect(() => {
    scrollToBottom()
  }, [messages, isLoading])

  const handleShare = () => {
    if (conversationId) {
      const shareUrl = `${window.location.origin}?c=${conversationId}`
      navigator.clipboard.writeText(shareUrl)
      toast.success("Link copied to clipboard!")
    } else {
      toast.error("No conversation to share")
    }
  }

  const handleArchive = () => {
    toast.info("Archive feature coming soon!")
  }

  const handleReport = () => {
    toast.info("Report feature coming soon!")
  }

  const handleDeleteClick = () => {
    if (conversationId) {
      setDeleteDialogOpen(true)
    }
  }

  const handleDeleteConfirm = () => {
    if (conversationId) {
      onDeleteConversation?.(conversationId)
      toast.success("Conversation deleted")
    }
    setDeleteDialogOpen(false)
  }

  return (
    <div className="flex-1 overflow-y-auto bg-background flex flex-col">
      {/* Top Bar with Share and Menu - Only show when there's a conversation */}
      {conversationId && messages.length > 0 && (
        <div className="sticky top-0 z-10 bg-background backdrop-blur-sm border-b border-border/20">
          <div className="w-full px-4 py-2 flex items-center justify-end">
            <div className="flex items-center gap-1">
              <Button
                variant="ghost"
                size="sm"
                className="gap-2 text-muted-foreground hover:text-foreground hover:bg-white/5"
                onClick={handleShare}
              >
                <Share2 className="h-4 w-4" />
                <span className="hidden sm:inline text-sm">Share</span>
              </Button>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 text-muted-foreground hover:text-foreground hover:bg-white/5"
                  >
                    <MoreHorizontal className="h-5 w-5" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-48">
                  <DropdownMenuItem onClick={handleArchive} className="gap-2 cursor-pointer hover:bg-[#212121] focus:bg-[#212121]">
                    <Archive className="h-4 w-4" />
                    Archive
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={handleReport} className="gap-2 cursor-pointer hover:bg-[#212121] focus:bg-[#212121]">
                    <Flag className="h-4 w-4" />
                    Report
                  </DropdownMenuItem>
                  <DropdownMenuItem 
                    onClick={handleDeleteClick} 
                    className="gap-2 text-destructive focus:text-destructive cursor-pointer hover:bg-[#212121] focus:bg-[#212121]"
                  >
                    <Trash2 className="h-4 w-4" />
                    Delete
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
        </div>
      )}

      {/* Messages Area */}
      <div className="flex-1 overflow-y-auto">
        <div className="mx-auto flex max-w-4xl flex-col gap-4 px-4 py-8">
          {messages.map((message, index) => {
              // Find the last user message
              const userMessages = messages.filter(m => m.role === 'user')
              const isLastUserMessage = message.role === 'user' && 
                userMessages.length > 0 && 
                userMessages[userMessages.length - 1].id === message.id
              
              // Find the last assistant message
              const assistantMessages = messages.filter(m => m.role === 'assistant')
              const isLastAssistantMessage = message.role === 'assistant' && 
                assistantMessages.length > 0 && 
                assistantMessages[assistantMessages.length - 1].id === message.id
              
              // Calculate branch info for this message
              // Only show branch navigation if this message has siblings (multiple versions)
              const branchCount = message.branchCount || 0
              const branchIndex = message.branchIndex || 0
              
              const branchInfo = branchCount > 1 ? {
                current: branchIndex,
                total: branchCount,
                onPrevBranch: message.pairId ? () => onPreviousBranch?.(message.pairId!) : undefined,
                onNextBranch: message.pairId ? () => onNextBranch?.(message.pairId!, branchCount) : undefined,
              } : undefined
              
              return (
                <MessageBubble 
                  key={message.id} 
                  message={message}
                  onEdit={onEditMessage}
                  onRegenerate={onRegenerateResponse}
                  isLastUserMessage={isLastUserMessage}
                  isLastAssistantMessage={isLastAssistantMessage}
                  branchInfo={branchInfo}
                />
              )
            })}
            {isLoading && (
              <div className="flex gap-4 animate-fade-in">
                <div className="h-8 w-8 shrink-0 rounded-full bg-muted" />
                <div className="flex items-center gap-1 rounded-lg bg-card px-4 py-2">
                  <TypingIndicator />
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>
        </div>

        {/* Delete Confirmation Dialog */}
        <ConfirmDialog
          open={deleteDialogOpen}
          onOpenChange={setDeleteDialogOpen}
          onConfirm={handleDeleteConfirm}
          title="Delete chat?"
          description="This will delete"
          highlightedText={conversationTitle || "New chat"}
          confirmText="Delete"
          cancelText="Cancel"
          variant="destructive"
          showSettingsLink={true}
        />
      </div>
    )
  }
