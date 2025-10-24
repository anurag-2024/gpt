"use client"

import { useEffect, useRef } from "react"
import { MessageBubble } from "./message-bubble"
import { TypingIndicator } from "./typing-indicator"
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
}

export function ChatArea({ messages, isLoading = false, onEditMessage, onRegenerateResponse, onPreviousBranch, onNextBranch, currentBranchIndices }: ChatAreaProps) {
  const messagesEndRef = useRef<HTMLDivElement>(null)

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }

  useEffect(() => {
    scrollToBottom()
  }, [messages, isLoading])

  return (
    <div className="flex-1 overflow-y-auto bg-background">
      <div className="mx-auto flex max-w-3xl flex-col gap-4 px-4 py-8">
        {messages.length === 0 ? (
          <div className="flex h-full flex-col items-center justify-center gap-4 py-12 text-center">
            <h1 className="text-3xl font-bold text-foreground">How can I help you today?</h1>
            <p className="text-muted-foreground">Start a conversation or ask me anything</p>
          </div>
        ) : (
          <>
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
          </>
        )}
        <div ref={messagesEndRef} />
      </div>
    </div>
  )
}
