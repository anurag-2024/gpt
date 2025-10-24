"use client"

import { useState, useEffect, useRef } from "react"
import { Search, X, MessageCircle } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"

interface Conversation {
  id: string
  title: string
  preview: string
  timestamp: Date
  messages: any[]
}

interface SearchModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  conversations: Conversation[]
  onSelectConversation: (conversationId: string) => void
  onNewChat?: () => void
}

export function SearchModal({ open, onOpenChange, conversations, onSelectConversation, onNewChat }: SearchModalProps) {
  const [searchQuery, setSearchQuery] = useState("")
  const inputRef = useRef<HTMLInputElement>(null)

  // Focus input when modal opens
  useEffect(() => {
    if (open && inputRef.current) {
      inputRef.current.focus()
    }
  }, [open])

  // Clear search when closing
  useEffect(() => {
    if (!open) {
      setSearchQuery("")
    }
  }, [open])

  // Filter conversations based on search query
  const filteredConversations = searchQuery.trim()
    ? conversations.filter(
        (conv) =>
          conv.title.toLowerCase().includes(searchQuery.toLowerCase())
      )
    : conversations

  // Group conversations by time period
  const groupConversations = (convs: Conversation[]) => {
    const now = new Date()
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
    const yesterday = new Date(today)
    yesterday.setDate(yesterday.getDate() - 1)
    const lastWeek = new Date(today)
    lastWeek.setDate(lastWeek.getDate() - 7)
    const last30Days = new Date(today)
    last30Days.setDate(last30Days.getDate() - 30)

    const groups: { [key: string]: Conversation[] } = {
      Today: [],
      Yesterday: [],
      "Previous 7 Days": [],
      "Previous 30 Days": [],
      Older: [],
    }

    convs.forEach((conv) => {
      const convDate = new Date(conv.timestamp)
      if (convDate >= today) {
        groups.Today.push(conv)
      } else if (convDate >= yesterday) {
        groups.Yesterday.push(conv)
      } else if (convDate >= lastWeek) {
        groups["Previous 7 Days"].push(conv)
      } else if (convDate >= last30Days) {
        groups["Previous 30 Days"].push(conv)
      } else {
        groups.Older.push(conv)
      }
    })

    return groups
  }

  const groupedConversations = groupConversations(filteredConversations)

  const handleSelectConversation = (convId: string) => {
    onSelectConversation(convId)
    onOpenChange(false)
  }

  if (!open) return null

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50"
        onClick={() => onOpenChange(false)}
      />

      {/* Modal */}
      <div className="fixed left-1/2 top-[10%] -translate-x-1/2 z-50 w-full max-w-2xl">
        <div className="bg-[#2f2f2f] rounded-2xl shadow-2xl border border-[#4d4d4d] overflow-hidden">
          {/* Search Input */}
          <div className="flex items-center gap-3 px-5 py-4 border-b border-[#4d4d4d]">
            <Search className="h-5 w-5 text-[#8e8ea0]" />
            <Input
              ref={inputRef}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search chats..."
              className="flex-1 bg-transparent border-none text-[#ececec] placeholder:text-[#8e8ea0] text-base focus-visible:ring-0 focus-visible:ring-offset-0 px-0"
            />
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 rounded-lg text-[#8e8ea0] hover:text-[#ececec] hover:bg-[#212121]"
              onClick={() => onOpenChange(false)}
            >
              <X className="h-5 w-5" />
            </Button>
          </div>

          {/* New Chat Option */}
          <div className="px-3 py-2 border-b border-[#4d4d4d]">
            <button
              className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-[#212121] transition-colors text-left"
              onClick={() => {
                onOpenChange(false)
                onNewChat?.()
              }}
            >
              <div className="h-8 w-8 rounded-lg bg-[#212121] flex items-center justify-center">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M12 5V19M5 12H19" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-[#ececec]"/>
                </svg>
              </div>
              <span className="text-[#ececec] text-sm font-medium">New chat</span>
            </button>
          </div>

          {/* Results */}
          <div className="max-h-[500px] overflow-y-auto">
            {Object.entries(groupedConversations).map(([group, convs]) => {
              if (convs.length === 0) return null

              return (
                <div key={group}>
                  {/* Group Header */}
                  <div className="px-5 py-2 sticky top-0 bg-[#2f2f2f] z-10">
                    <h3 className="text-xs font-medium text-[#8e8ea0]">{group}</h3>
                  </div>

                  {/* Conversations in Group */}
                  <div className="px-3 pb-2">
                    {convs.map((conv) => (
                      <button
                        key={conv.id}
                        className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-[#212121] transition-colors text-left"
                        onClick={() => handleSelectConversation(conv.id)}
                      >
                        <div className="h-8 w-8 rounded-lg bg-[#212121] flex items-center justify-center flex-shrink-0">
                          <MessageCircle className="h-4 w-4 text-[#8e8ea0]" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm text-[#ececec] truncate">{conv.title}</p>
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
              )
            })}

            {filteredConversations.length === 0 && (
              <div className="px-5 py-12 text-center">
                <p className="text-sm text-[#8e8ea0]">No chats found</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  )
}
