"use client"

import { useState } from "react"
import { Copy, Edit2, RotateCcw, Check, ChevronLeft, ChevronRight } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar"
import ReactMarkdown from "react-markdown"
import type { Message as UIMessage } from "ai/react"

interface FileAttachment {
  url: string
  type: string
  name: string
  size?: number
}

interface MessageBubbleProps {
  message: UIMessage & { files?: FileAttachment[] }
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

export function MessageBubble({ message, onEdit, onRegenerate, isLastUserMessage, isLastAssistantMessage, branchInfo }: MessageBubbleProps) {
  const [showActions, setShowActions] = useState(false)
  const [copied, setCopied] = useState(false)
  const [isEditing, setIsEditing] = useState(false)
  const [editedContent, setEditedContent] = useState(message.content)

  const handleCopy = () => {
    navigator.clipboard.writeText(message.content)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const formatTime = (date?: Date) => {
    if (!date) return "Just now"
    return date.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" })
  }

  const isUser = message.role === "user"

  const markdownComponents = {
    code({ inline, className, children, ...props }: any) {
      const match = /language-(\w+)/.exec(className || "")
      const language = match ? match[1] : "text"

      if (inline) {
        return (
          <code className="rounded bg-muted px-1.5 py-0.5 font-mono text-sm text-muted-foreground">{children}</code>
        )
      }

      return (
        <div className="relative my-2 rounded-lg border border-border bg-muted/50">
          <div className="flex items-center justify-between border-b border-border px-4 py-2">
            <span className="text-xs font-semibold text-muted-foreground uppercase">{language}</span>
            <Button
              variant="ghost"
              size="sm"
              className="h-6 px-2 text-xs"
              onClick={() => {
                navigator.clipboard.writeText(String(children).trim())
                setCopied(true)
                setTimeout(() => setCopied(false), 2000)
              }}
            >
              {copied ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
            </Button>
          </div>
          <pre className="overflow-x-auto p-4">
            <code className="text-xs font-mono text-foreground">{String(children).trim()}</code>
          </pre>
        </div>
      )
    },
    p: ({ children }: any) => <div className="mb-2 leading-relaxed">{children}</div>,
    ul: ({ children }: any) => <ul className="mb-2 ml-4 list-disc space-y-1">{children}</ul>,
    ol: ({ children }: any) => <ol className="mb-2 ml-4 list-decimal space-y-1">{children}</ol>,
    li: ({ children }: any) => <li className="text-sm">{children}</li>,
    blockquote: ({ children }: any) => (
      <blockquote className="mb-2 border-l-4 border-muted-foreground/30 pl-4 italic text-muted-foreground">
        {children}
      </blockquote>
    ),
    h1: ({ children }: any) => <h1 className="mb-2 text-xl font-bold">{children}</h1>,
    h2: ({ children }: any) => <h2 className="mb-2 text-lg font-bold">{children}</h2>,
    h3: ({ children }: any) => <h3 className="mb-2 text-base font-bold">{children}</h3>,
    a: ({ href, children }: any) => (
      <a href={href} className="text-primary hover:underline" target="_blank" rel="noopener noreferrer">
        {children}
      </a>
    ),
  }

  return (
    <div
      className={`flex gap-4 animate-fade-in ${isUser ? "flex-row-reverse" : "flex-row"}`}
      onMouseEnter={() => setShowActions(true)}
      onMouseLeave={() => setShowActions(false)}
    >
      {/* Avatar */}
      <Avatar className="h-8 w-8 shrink-0">
        {isUser ? (
          <>
            <AvatarImage src="https://api.dicebear.com/7.x/avataaars/svg?seed=user" />
            <AvatarFallback>U</AvatarFallback>
          </>
        ) : (
          <>
            <AvatarImage src="https://api.dicebear.com/7.x/bottts/svg?seed=assistant" />
            <AvatarFallback>AI</AvatarFallback>
          </>
        )}
      </Avatar>

      {/* Message Content */}
      <div className={`flex flex-col gap-2 flex-1 max-w-[80%] ${isUser ? "items-end" : "items-start"}`}>
        {isEditing && isUser ? (
          <div className="flex w-full gap-2">
            <textarea
              value={editedContent}
              onChange={(e) => setEditedContent(e.target.value)}
              className="flex-1 rounded-lg border border-border bg-card px-4 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary resize-none"
              style={{ minHeight: '60px', maxHeight: '200px' }}
              rows={3}
              autoFocus
            />
            <div className="flex flex-col gap-1">
              <Button
                size="sm"
                onClick={() => {
                  if (editedContent.trim() && editedContent !== message.content) {
                    onEdit?.(message.id, editedContent)
                  }
                  setIsEditing(false)
                }}
              >
                Save & Submit
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={() => {
                  setIsEditing(false)
                  setEditedContent(message.content)
                }}
              >
                Cancel
              </Button>
            </div>
          </div>
        ) : (
          <div className="flex items-start gap-2 w-full relative">
            <div
              className={`rounded-lg px-4 py-2 flex-1 ${
                isUser ? "bg-primary text-primary-foreground" : "bg-card text-card-foreground"
              }`}
            >
              {/* Display files if present (for user messages) */}
              {isUser && message.files && message.files.length > 0 && (
                <div className="mb-2 flex flex-wrap gap-2">
                  {message.files.map((file, index) => (
                    <div key={index} className="relative">
                      {file.type.startsWith('image/') ? (
                        <img
                          src={file.url}
                          alt={file.name}
                          className="max-w-xs rounded-lg border border-primary-foreground/20"
                          style={{ maxHeight: '200px' }}
                        />
                      ) : (
                        <div className="flex items-center gap-2 rounded-lg border border-primary-foreground/20 bg-primary-foreground/10 px-3 py-2">
                          <div className="flex h-8 w-8 items-center justify-center rounded bg-primary-foreground/20">
                            <span className="text-xs font-semibold">
                              {file.type.split('/')[1]?.toUpperCase().slice(0, 3) || 'FILE'}
                            </span>
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="truncate text-xs font-medium">{file.name}</p>
                            <p className="text-xs opacity-70">{file.type.split('/')[1]?.toUpperCase()}</p>
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
              
              {isUser ? (
                <p className="whitespace-pre-wrap text-sm leading-relaxed">{message.content}</p>
              ) : (
                <div className="prose prose-sm max-w-none text-sm">
                  <ReactMarkdown components={markdownComponents}>{message.content}</ReactMarkdown>
                </div>
              )}
            </div>
            
            {/* Edit button on the right side of user message - absolute positioning to prevent layout shift */}
            {isUser && isLastUserMessage && (
              <div className={`absolute ${isUser ? 'right-0' : 'left-0'} top-1 -translate-x-full mr-2 transition-opacity duration-200 ${showActions ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}>
                <Button 
                  variant="ghost" 
                  size="icon" 
                  className="h-7 w-7 shrink-0" 
                  onClick={() => setIsEditing(true)}
                  title="Edit message"
                >
                  <Edit2 className="h-3.5 w-3.5" />
                </Button>
              </div>
            )}
          </div>
        )}

        {/* Timestamp and Actions - Always show timestamp, show action buttons on hover */}
        {!isEditing && (
          <div
            className={`flex items-center gap-2 text-xs text-muted-foreground ${isUser ? "flex-row-reverse" : "flex-row"}`}
          >
            <span>{formatTime(message.createdAt)}</span>
            
            {/* Branch Navigation - Show for messages with multiple versions */}
            {branchInfo && branchInfo.total > 1 && (
              <div className="flex items-center gap-1 rounded-md border border-border bg-card px-2 py-1">
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-4 w-4 p-0"
                  onClick={branchInfo.onPrevBranch}
                  disabled={branchInfo.current === 0}
                >
                  <ChevronLeft className="h-3 w-3" />
                </Button>
                <span className="text-xs font-medium px-1">
                  {branchInfo.current + 1} / {branchInfo.total}
                </span>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-4 w-4 p-0"
                  onClick={branchInfo.onNextBranch}
                  disabled={branchInfo.current === branchInfo.total - 1}
                >
                  <ChevronRight className="h-3 w-3" />
                </Button>
              </div>
            )}
            
            {/* AI message actions - show on hover */}
            {!isUser && showActions && (
              <>
                <Button 
                  variant="ghost" 
                  size="icon" 
                  className="h-5 w-5" 
                  onClick={handleCopy}
                  title="Copy message"
                >
                  {copied ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
                </Button>
                {/* Regenerate only for last assistant message */}
                {isLastAssistantMessage && (
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-5 w-5"
                    onClick={() => onRegenerate?.(message.id)}
                    title="Regenerate response"
                  >
                    <RotateCcw className="h-3 w-3" />
                  </Button>
                )}
              </>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
