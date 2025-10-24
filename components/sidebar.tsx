"use client"

import { useState } from "react"
import { Plus, Moon, Sun, Search, MoreHorizontal, Trash2, Edit2, Menu, X } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { SignOutButton } from "@clerk/nextjs"
import { ConfirmDialog } from "@/components/confirm-dialog"

interface Conversation {
  id: string
  title: string
  preview: string
  timestamp: Date
  messages: any[]
}

interface UserData {
  firstName?: string | null
  lastName?: string | null
  emailAddress?: string
  imageUrl?: string
}

interface SidebarProps {
  conversations: Conversation[]
  currentConversationId: string | null
  sidebarOpen: boolean
  setSidebarOpen: (open: boolean) => void
  onNewChat?: () => void
  onSelectConversation?: (conversationId: string) => void
  onRenameConversation?: (conversationId: string, newTitle: string) => void
  onDeleteConversation?: (conversationId: string) => void
  user?: UserData
}

export function Sidebar({ 
  conversations, 
  currentConversationId,
  sidebarOpen, 
  setSidebarOpen, 
  onNewChat,
  onSelectConversation,
  onRenameConversation,
  onDeleteConversation,
  user
}: SidebarProps) {
  const [darkMode, setDarkMode] = useState(true)
  const [searchQuery, setSearchQuery] = useState("")
  const [hoveredId, setHoveredId] = useState<string | null>(null)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editingTitle, setEditingTitle] = useState("")
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [conversationToDelete, setConversationToDelete] = useState<string | null>(null)

  // Get user display name
  const userName = user?.firstName && user?.lastName 
    ? `${user.firstName} ${user.lastName}`
    : user?.firstName || user?.emailAddress?.split('@')[0] || 'User'
  
  // Get user initials for avatar fallback
  const userInitials = user?.firstName && user?.lastName
    ? `${user.firstName[0]}${user.lastName[0]}`
    : user?.firstName?.[0] || user?.emailAddress?.[0]?.toUpperCase() || 'U'

  const handleRenameStart = (conv: Conversation) => {
    setEditingId(conv.id)
    setEditingTitle(conv.title)
  }

  const handleRenameSave = (convId: string) => {
    if (editingTitle.trim() && editingTitle !== conversations.find(c => c.id === convId)?.title) {
      onRenameConversation?.(convId, editingTitle.trim())
    }
    setEditingId(null)
    setEditingTitle("")
  }

  const handleRenameCancel = () => {
    setEditingId(null)
    setEditingTitle("")
  }

  const handleDeleteClick = (convId: string) => {
    setConversationToDelete(convId)
    setDeleteDialogOpen(true)
  }

  const handleDeleteConfirm = () => {
    if (conversationToDelete) {
      onDeleteConversation?.(conversationToDelete)
      setConversationToDelete(null)
    }
    setDeleteDialogOpen(false)
  }

  const groupConversationsByDate = (convs: Conversation[]) => {
    const now = new Date()
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
    const yesterday = new Date(today)
    yesterday.setDate(yesterday.getDate() - 1)
    const sevenDaysAgo = new Date(today)
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7)
    const thirtyDaysAgo = new Date(today)
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)

    const groups: { [key: string]: Conversation[] } = {
      Today: [],
      Yesterday: [],
      "Last 7 days": [],
      "Last 30 days": [],
      Older: [],
    }

    convs.forEach((conv) => {
      const convDate = new Date(conv.timestamp.getFullYear(), conv.timestamp.getMonth(), conv.timestamp.getDate())
      if (convDate.getTime() === today.getTime()) {
        groups["Today"].push(conv)
      } else if (convDate.getTime() === yesterday.getTime()) {
        groups["Yesterday"].push(conv)
      } else if (convDate > sevenDaysAgo) {
        groups["Last 7 days"].push(conv)
      } else if (convDate > thirtyDaysAgo) {
        groups["Last 30 days"].push(conv)
      } else {
        groups["Older"].push(conv)
      }
    })

    return groups
  }

  const filteredConversations = conversations.filter(
    (conv) =>
      conv.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      conv.preview.toLowerCase().includes(searchQuery.toLowerCase()),
  )

  const groupedConversations = groupConversationsByDate(filteredConversations)

  return (
    <>
      {/* Mobile menu button */}
      <Button
        variant="ghost"
        size="icon"
        className="fixed left-4 top-4 z-50 md:hidden"
        onClick={() => setSidebarOpen(!sidebarOpen)}
      >
        {sidebarOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
      </Button>

      {/* Sidebar overlay for mobile */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-30 bg-black/50 backdrop-blur-sm md:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={`fixed left-0 top-0 z-40 flex h-screen w-64 flex-col bg-[#141414] text-sidebar-foreground border-r border-border/30 transition-transform duration-300 md:relative md:translate-x-0 ${
          sidebarOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        {/* New Chat Button */}
        <div className="p-4">
          <Button
            className="w-full gap-2 bg-sidebar-accent text-sidebar-accent-foreground hover:bg-sidebar-accent/80"
            onClick={() => {
              onNewChat?.()
            }}
            suppressHydrationWarning
          >
            <Plus className="h-4 w-4" />
            New Chat
          </Button>
        </div>

        {/* Search Bar */}
        <div className="p-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-sidebar-foreground/50" />
            <Input
              placeholder="Search conversations..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 bg-sidebar-accent text-sidebar-foreground placeholder:text-sidebar-foreground/50"
              suppressHydrationWarning
            />
          </div>
        </div>

        {/* Conversations List */}
        <div className="flex-1 overflow-y-auto" style={{
          scrollbarWidth: 'thin',
          scrollbarColor: '#1a1a1a #0d0d0d'
        }}>
          {Object.entries(groupedConversations).map(([group, convs]) =>
            convs.length > 0 ? (
              <div key={group}>
                <div className="px-4 py-3 text-xs font-semibold uppercase text-sidebar-foreground/50">{group}</div>
                {convs.map((conv) => (
                  <div
                    key={conv.id}
                    className={`group relative mx-2 mb-2 rounded-lg px-3 py-2 cursor-pointer transition-colors ${
                      currentConversationId === conv.id 
                        ? "bg-sidebar-accent" 
                        : "hover:bg-sidebar-accent/50"
                    }`}
                    onMouseEnter={() => setHoveredId(conv.id)}
                    onMouseLeave={() => setHoveredId(null)}
                    onClick={() => {
                      if (editingId !== conv.id) {
                        onSelectConversation?.(conv.id)
                      }
                    }}
                  >
                    {editingId === conv.id ? (
                      <div className="flex items-center gap-2 pr-2">
                        <Input
                          value={editingTitle}
                          onChange={(e) => setEditingTitle(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                              handleRenameSave(conv.id)
                            } else if (e.key === 'Escape') {
                              handleRenameCancel()
                            }
                          }}
                          onBlur={() => handleRenameSave(conv.id)}
                          className="h-7 text-sm bg-sidebar-accent border-sidebar-foreground/20"
                          autoFocus
                          onClick={(e) => e.stopPropagation()}
                          suppressHydrationWarning
                        />
                      </div>
                    ) : (
                      <>
                        <div className="flex-1 truncate pr-14">
                          <p className="truncate text-sm font-medium">{conv.title}</p>
                          <p className="truncate text-xs text-sidebar-foreground/60">{conv.preview}</p>
                        </div>
                        {hoveredId === conv.id && (
                          <div className="absolute right-2 top-1/2 -translate-y-1/2 flex gap-1">
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-6 w-6 text-sidebar-foreground/60 hover:text-sidebar-foreground  hover:bg-white/5"
                              onClick={(e) => {
                                e.stopPropagation()
                                handleRenameStart(conv)
                              }}
                              suppressHydrationWarning
                            >
                              <Edit2 className="h-3 w-3" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-6 w-6 text-sidebar-foreground/60 hover:text-destructive  hover:bg-white/5"
                              onClick={(e) => {
                                e.stopPropagation()
                                handleDeleteClick(conv.id)
                              }}
                              suppressHydrationWarning
                            >
                              <Trash2 className="h-3 w-3" />
                            </Button>
                          </div>
                        )}
                      </>
                    )}
                  </div>
                ))}
              </div>
            ) : null,
          )}
        </div>

        {/* Bottom Section */}
        <div className="p-4">
          {/* Dark Mode Toggle */}
          <Button
            variant="ghost"
            className="w-full justify-start gap-2 text-sidebar-foreground hover:bg-sidebar-accent"
            onClick={() => setDarkMode(!darkMode)}
            suppressHydrationWarning
          >
            {darkMode ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
            {darkMode ? "Light Mode" : "Dark Mode"}
          </Button>

          {/* User Profile */}
          <div className="mt-4 flex items-center gap-3 rounded-lg bg-sidebar-accent p-3">
            <Avatar className="h-8 w-8">
              <AvatarImage src={user?.imageUrl || "https://api.dicebear.com/7.x/avataaars/svg?seed=user"} />
              <AvatarFallback>{userInitials}</AvatarFallback>
            </Avatar>
            <div className="flex-1 truncate">
              <p className="text-sm font-medium">{userName}</p>
              <p className="truncate text-xs text-sidebar-foreground/60">{user?.emailAddress || 'user@example.com'}</p>
            </div>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="h-6 w-6" suppressHydrationWarning>
                  <MoreHorizontal className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem>Settings</DropdownMenuItem>
                <SignOutButton>
                  <DropdownMenuItem>Logout</DropdownMenuItem>
                </SignOutButton>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </aside>

      {/* Delete Confirmation Dialog */}
      <ConfirmDialog
        open={deleteDialogOpen}
        onOpenChange={setDeleteDialogOpen}
        onConfirm={handleDeleteConfirm}
        title="Delete Conversation"
        description="Are you sure you want to delete this conversation? This action cannot be undone and all messages will be permanently deleted."
        confirmText="Delete"
        cancelText="Cancel"
        variant="destructive"
      />
    </>
  )
}
