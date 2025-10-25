"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Plus, Search, MoreHorizontal, Trash2, Edit, Menu, X, PenSquare, BookMarked, Briefcase, HelpCircle, FileText, MessageCircle, Download, Keyboard, LogOut, Settings, Sparkles, User, Share2, Archive, BookOpen, FolderKanban, PanelLeftClose, PanelLeftOpen } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { SignOutButton } from "@clerk/nextjs"
import { ConfirmDialog } from "@/components/confirm-dialog"
import { SearchModal } from "@/components/search-modal"
import type { SidebarProps, Conversation, User as UserData } from "@/types"

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
  const [searchQuery, setSearchQuery] = useState("")
  const [hoveredId, setHoveredId] = useState<string | null>(null)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editingTitle, setEditingTitle] = useState("")
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [conversationToDelete, setConversationToDelete] = useState<string | null>(null)
  const [helpMenuOpen, setHelpMenuOpen] = useState(false)
  const [collapsedHovered, setCollapsedHovered] = useState(false)
  const [isMounted, setIsMounted] = useState(false)
  const [searchModalOpen, setSearchModalOpen] = useState(false)
  const router = useRouter()

  // Prevent hydration mismatch by only rendering user-specific content after mount
  useEffect(() => {
    setIsMounted(true)
  }, [])

  // Keyboard shortcut for search (Ctrl+K)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault()
        setSearchModalOpen(true)
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [])

  // Get user display name
  const userName = isMounted ? (user?.firstName || user?.emailAddress?.split('@')[0] || 'User') : 'User'
  const userEmail = isMounted ? (user?.emailAddress || 'user@example.com') : 'user@example.com'
  
  // Get user initials for avatar fallback
  const userInitials = isMounted ? (user?.firstName?.[0]?.toUpperCase() || user?.emailAddress?.[0]?.toUpperCase() || 'U') : 'U'

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

  const filteredConversations = conversations.filter(
    (conv) =>
      conv.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      conv.preview.toLowerCase().includes(searchQuery.toLowerCase()),
  )

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

      {/* Collapsed Sidebar - Icon Only */}
      {!sidebarOpen && (
        <aside 
          className="hidden md:flex fixed left-0 top-0 z-40 h-screen w-[60px] flex-col items-center bg-[#171717] text-[#ececec] py-2 gap-2 group cursor-pointer"
          onMouseEnter={() => setCollapsedHovered(true)}
          onMouseLeave={() => setCollapsedHovered(false)}
          onClick={() => setSidebarOpen(true)}
        >
          {/* New Chat Icon or Open Sidebar Button */}
          {collapsedHovered ? (
            <Button
              variant="ghost"
              size="icon"
              className="h-10 w-10 rounded-lg text-[#ececec] hover:bg-[#2f2f2f]"
              onClick={(e) => {
                e.stopPropagation()
                setSidebarOpen(true)
              }}
            >
              <PanelLeftOpen className="h-5 w-5" />
            </Button>
          ) : (
            <Button
              variant="ghost"
              size="icon"
              className="h-10 w-10 rounded-lg text-[#ececec] hover:bg-[#2f2f2f]"
              onClick={(e) => {
                e.stopPropagation()
                onNewChat?.()
              }}
            >
              <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor" xmlns="http://www.w3.org/2000/svg" className="icon-lg"><path d="M11.2475 18.25C10.6975 18.25 10.175 18.1455 9.67999 17.9365C9.18499 17.7275 8.74499 17.436 8.35999 17.062C7.94199 17.205 7.50749 17.2765 7.05649 17.2765C6.31949 17.2765 5.63749 17.095 5.01049 16.732C4.38349 16.369 3.87749 15.874 3.49249 15.247C3.11849 14.62 2.93149 13.9215 2.93149 13.1515C2.93149 12.8325 2.97549 12.486 3.06349 12.112C2.62349 11.705 2.28249 11.2375 2.04049 10.7095C1.79849 10.1705 1.67749 9.6095 1.67749 9.0265C1.67749 8.4325 1.80399 7.8605 2.05699 7.3105C2.30999 6.7605 2.66199 6.2875 3.11299 5.8915C3.57499 5.4845 4.10849 5.204 4.71349 5.05C4.83449 4.423 5.08749 3.862 5.47249 3.367C5.86849 2.861 6.35249 2.465 6.92449 2.179C7.49649 1.893 8.10699 1.75 8.75599 1.75C9.30599 1.75 9.82849 1.8545 10.3235 2.0635C10.8185 2.2725 11.2585 2.564 11.6435 2.938C12.0615 2.795 12.496 2.7235 12.947 2.7235C13.684 2.7235 14.366 2.905 14.993 3.268C15.62 3.631 16.1205 4.126 16.4945 4.753C16.8795 5.38 17.072 6.0785 17.072 6.8485C17.072 7.1675 17.028 7.514 16.94 7.888C17.38 8.295 17.721 8.768 17.963 9.307C18.205 9.835 18.326 10.3905 18.326 10.9735C18.326 11.5675 18.1995 12.1395 17.9465 12.6895C17.6935 13.2395 17.336 13.718 16.874 14.125C16.423 14.521 15.895 14.796 15.29 14.95C15.169 15.577 14.9105 16.138 14.5145 16.633C14.1295 17.139 13.651 17.535 13.079 17.821C12.507 18.107 11.8965 18.25 11.2475 18.25ZM7.17199 16.1875C7.72199 16.1875 8.20049 16.072 8.60749 15.841L11.7095 14.059C11.8195 13.982 11.8745 13.8775 11.8745 13.7455V12.3265L7.88149 14.62C7.63949 14.763 7.39749 14.763 7.15549 14.62L4.03699 12.8215C4.03699 12.8545 4.03149 12.893 4.02049 12.937C4.02049 12.981 4.02049 13.047 4.02049 13.135C4.02049 13.696 4.15249 14.213 4.41649 14.686C4.69149 15.148 5.07099 15.511 5.55499 15.775C6.03899 16.05 6.57799 16.1875 7.17199 16.1875ZM7.33699 13.498C7.40299 13.531 7.46349 13.5475 7.51849 13.5475C7.57349 13.5475 7.62849 13.531 7.68349 13.498L8.92099 12.7885L4.94449 10.4785C4.70249 10.3355 4.58149 10.121 4.58149 9.835V6.2545C4.03149 6.4965 3.59149 6.8705 3.26149 7.3765C2.93149 7.8715 2.76649 8.4215 2.76649 9.0265C2.76649 9.5655 2.90399 10.0825 3.17899 10.5775C3.45399 11.0725 3.81149 11.4465 4.25149 11.6995L7.33699 13.498ZM11.2475 17.161C11.8305 17.161 12.3585 17.029 12.8315 16.765C13.3045 16.501 13.6785 16.138 13.9535 15.676C14.2285 15.214 14.366 14.697 14.366 14.125V10.561C14.366 10.429 14.311 10.33 14.201 10.264L12.947 9.538V14.1415C12.947 14.4275 12.826 14.642 12.584 14.785L9.46549 16.5835C10.0045 16.9685 10.5985 17.161 11.2475 17.161ZM11.8745 11.122V8.878L10.01 7.822L8.12899 8.878V11.122L10.01 12.178L11.8745 11.122ZM7.05649 5.8585C7.05649 5.5725 7.17749 5.358 7.41949 5.215L10.538 3.4165C9.99899 3.0315 9.40499 2.839 8.75599 2.839C8.17299 2.839 7.64499 2.971 7.17199 3.235C6.69899 3.499 6.32499 3.862 6.04999 4.324C5.78599 4.786 5.65399 5.303 5.65399 5.875V9.4225C5.65399 9.5545 5.70899 9.659 5.81899 9.736L7.05649 10.462V5.8585ZM15.4385 13.7455C15.9885 13.5035 16.423 13.1295 16.742 12.6235C17.072 12.1175 17.237 11.5675 17.237 10.9735C17.237 10.4345 17.0995 9.9175 16.8245 9.4225C16.5495 8.9275 16.192 8.5535 15.752 8.3005L12.6665 6.5185C12.6005 6.4745 12.54 6.458 12.485 6.469C12.43 6.469 12.375 6.4855 12.32 6.5185L11.0825 7.2115L15.0755 9.538C15.1965 9.604 15.2845 9.692 15.3395 9.802C15.4055 9.901 15.4385 10.022 15.4385 10.165V13.7455ZM12.122 5.3635C12.364 5.2095 12.606 5.2095 12.848 5.3635L15.983 7.195C15.983 7.118 15.983 7.019 15.983 6.898C15.983 6.37 15.851 5.8695 15.587 5.3965C15.334 4.9125 14.9655 4.5275 14.4815 4.2415C14.0085 3.9555 13.4585 3.8125 12.8315 3.8125C12.2815 3.8125 11.803 3.928 11.396 4.159L8.29399 5.941C8.18399 6.018 8.12899 6.1225 8.12899 6.2545V7.6735L12.122 5.3635Z" transform="scale(1.2) translate(-2, -2)"></path></svg>
            </Button>
          )}

          {/* Edit Icon */}
          <Button
            variant="ghost"
            size="icon"
            className="h-10 w-10 rounded-lg text-[#ececec] hover:bg-[#2f2f2f]"
            onClick={(e) => {
              e.stopPropagation()
              onNewChat?.()
            }}
          >
            <PenSquare className="h-5 w-5" />
          </Button>

          {/* Search Icon */}
          <Button
            variant="ghost"
            size="icon"
            className="h-10 w-10 rounded-lg text-[#ececec] hover:bg-[#2f2f2f]"
            onClick={(e) => {
              e.stopPropagation()
              setSearchModalOpen(true)
            }}
          >
            <Search className="h-5 w-5" />
          </Button>

          {/* Library Icon */}
          <Button
            variant="ghost"
            size="icon"
            className="h-10 w-10 rounded-lg text-[#ececec] hover:bg-[#2f2f2f]"
            onClick={(e) => {
              e.stopPropagation()
              router.push('/library?tab=images')
            }}
          >
            <BookOpen className="h-5 w-5" />
          </Button>

          {/* Spacer */}
          <div className="flex-1" onClick={(e) => e.stopPropagation()}></div>

          {/* Sparkles Icon at Bottom */}
          <Button
            variant="ghost"
            size="icon"
            className="h-10 w-10 rounded-lg text-[#ececec] hover:bg-[#2f2f2f]"
            onClick={(e) => e.stopPropagation()}
          >
            <Sparkles className="h-5 w-5" />
          </Button>

          {/* User Avatar with Dropdown */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Avatar 
                className="h-10 w-10 cursor-pointer" 
                onClick={(e) => e.stopPropagation()}
              >
                <AvatarImage src={user?.imageUrl} />
                <AvatarFallback className="bg-[#5f5f5f] text-white text-sm font-medium">
                  {userInitials}
                </AvatarFallback>
              </Avatar>
            </DropdownMenuTrigger>
            <DropdownMenuContent 
              align="end" 
              side="right"
              className="w-[280px] bg-[#2f2f2f] border-[#4e4e4e] text-[#ececec] p-1.5"
              sideOffset={8}
            >
              {/* Email */}
              <div className="flex items-center gap-3 px-3 py-2">
                <User className="h-5 w-5 text-[#8e8ea0]" />
                <span className="text-sm text-[#ececec] truncate">{userEmail}</span>
              </div>

              <div className="h-px bg-[#4e4e4e] my-1" />

              {/* Upgrade Plan */}
              <DropdownMenuItem 
                className="gap-3 rounded-md px-3 py-2 cursor-pointer hover:bg-[#212121] focus:bg-[#212121]"
                onClick={() => router.push('/pricing')}
              >
                <Sparkles className="h-5 w-5" />
                <span className="text-sm">Upgrade plan</span>
              </DropdownMenuItem>

              {/* Personalization */}
              <DropdownMenuItem className="gap-3 rounded-md px-3 py-2 cursor-pointer hover:bg-[#212121] focus:bg-[#212121]">
                <User className="h-5 w-5" />
                <span className="text-sm">Personalization</span>
              </DropdownMenuItem>

              {/* Settings */}
              <DropdownMenuItem className="gap-3 rounded-md px-3 py-2 cursor-pointer hover:bg-[#212121] focus:bg-[#212121]">
                <Settings className="h-5 w-5" />
                <span className="text-sm">Settings</span>
              </DropdownMenuItem>

              <div className="h-px bg-[#4e4e4e] my-1" />

              {/* Help with Submenu */}
              <DropdownMenu open={helpMenuOpen} onOpenChange={setHelpMenuOpen}>
                <DropdownMenuTrigger asChild>
                  <div className="flex items-center gap-3 rounded-md px-3 py-2 cursor-pointer hover:bg-[#212121] text-sm relative">
                    <HelpCircle className="h-5 w-5" />
                    <span className="flex-1">Help</span>
                    <span className="text-lg">›</span>
                  </div>
                </DropdownMenuTrigger>
                <DropdownMenuContent 
                  side="right" 
                  align="start"
                  className="w-[220px] bg-[#2f2f2f] border-[#4e4e4e] text-[#ececec] p-1.5"
                  sideOffset={2}
                >
                  <DropdownMenuItem className="gap-3 rounded-md px-3 py-2 cursor-pointer hover:bg-[#212121] focus:bg-[#212121]">
                    <HelpCircle className="h-4 w-4" />
                    <span className="text-sm">Help center</span>
                  </DropdownMenuItem>
                  <DropdownMenuItem className="gap-3 rounded-md px-3 py-2 cursor-pointer hover:bg-[#212121] focus:bg-[#212121]">
                    <FileText className="h-4 w-4" />
                    <span className="text-sm">Release notes</span>
                  </DropdownMenuItem>
                  <DropdownMenuItem className="gap-3 rounded-md px-3 py-2 cursor-pointer hover:bg-[#212121] focus:bg-[#212121]">
                    <FileText className="h-4 w-4" />
                    <span className="text-sm">Terms & policies</span>
                  </DropdownMenuItem>
                  <DropdownMenuItem className="gap-3 rounded-md px-3 py-2 cursor-pointer hover:bg-[#212121] focus:bg-[#212121]">
                    <MessageCircle className="h-4 w-4" />
                    <span className="text-sm">Report Bug</span>
                  </DropdownMenuItem>
                  <DropdownMenuItem className="gap-3 rounded-md px-3 py-2 cursor-pointer hover:bg-[#212121] focus:bg-[#212121]">
                    <Download className="h-4 w-4" />
                    <span className="text-sm">Download apps</span>
                  </DropdownMenuItem>
                  <DropdownMenuItem className="gap-3 rounded-md px-3 py-2 cursor-pointer hover:bg-[#212121] focus:bg-[#212121]">
                    <Keyboard className="h-4 w-4" />
                    <span className="text-sm">Keyboard shortcuts</span>
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>

              {/* Log out */}
              <SignOutButton>
                <DropdownMenuItem className="gap-3 rounded-md px-3 py-2 cursor-pointer hover:bg-[#212121] focus:bg-[#212121]">
                  <LogOut className="h-5 w-5" />
                  <span className="text-sm">Log out</span>
                </DropdownMenuItem>
              </SignOutButton>
            </DropdownMenuContent>
          </DropdownMenu>
        </aside>
      )}

      {/* Full Sidebar */}
      <aside
        className={`fixed left-0 top-0 z-40 flex h-screen w-[260px] flex-col bg-[#171717] text-[#ececec] transition-transform duration-300 md:relative md:translate-x-0 ${
          sidebarOpen ? "translate-x-0" : "-translate-x-full md:hidden"
        }`}
      >
        {/* Top Section */}
        <div className="flex flex-col p-2">
          {/* Logo and Sidebar Close Button */}
          <div className="flex items-center justify-between px-2 py-2 mb-1">
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 rounded-lg text-[#ececec] hover:bg-[#2f2f2f]"
              onClick={onNewChat}
            >
              {/* <Sparkles className="h-5 w-5" /> */}
              <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor" xmlns="http://www.w3.org/2000/svg" className="icon-lg"><path d="M11.2475 18.25C10.6975 18.25 10.175 18.1455 9.67999 17.9365C9.18499 17.7275 8.74499 17.436 8.35999 17.062C7.94199 17.205 7.50749 17.2765 7.05649 17.2765C6.31949 17.2765 5.63749 17.095 5.01049 16.732C4.38349 16.369 3.87749 15.874 3.49249 15.247C3.11849 14.62 2.93149 13.9215 2.93149 13.1515C2.93149 12.8325 2.97549 12.486 3.06349 12.112C2.62349 11.705 2.28249 11.2375 2.04049 10.7095C1.79849 10.1705 1.67749 9.6095 1.67749 9.0265C1.67749 8.4325 1.80399 7.8605 2.05699 7.3105C2.30999 6.7605 2.66199 6.2875 3.11299 5.8915C3.57499 5.4845 4.10849 5.204 4.71349 5.05C4.83449 4.423 5.08749 3.862 5.47249 3.367C5.86849 2.861 6.35249 2.465 6.92449 2.179C7.49649 1.893 8.10699 1.75 8.75599 1.75C9.30599 1.75 9.82849 1.8545 10.3235 2.0635C10.8185 2.2725 11.2585 2.564 11.6435 2.938C12.0615 2.795 12.496 2.7235 12.947 2.7235C13.684 2.7235 14.366 2.905 14.993 3.268C15.62 3.631 16.1205 4.126 16.4945 4.753C16.8795 5.38 17.072 6.0785 17.072 6.8485C17.072 7.1675 17.028 7.514 16.94 7.888C17.38 8.295 17.721 8.768 17.963 9.307C18.205 9.835 18.326 10.3905 18.326 10.9735C18.326 11.5675 18.1995 12.1395 17.9465 12.6895C17.6935 13.2395 17.336 13.718 16.874 14.125C16.423 14.521 15.895 14.796 15.29 14.95C15.169 15.577 14.9105 16.138 14.5145 16.633C14.1295 17.139 13.651 17.535 13.079 17.821C12.507 18.107 11.8965 18.25 11.2475 18.25ZM7.17199 16.1875C7.72199 16.1875 8.20049 16.072 8.60749 15.841L11.7095 14.059C11.8195 13.982 11.8745 13.8775 11.8745 13.7455V12.3265L7.88149 14.62C7.63949 14.763 7.39749 14.763 7.15549 14.62L4.03699 12.8215C4.03699 12.8545 4.03149 12.893 4.02049 12.937C4.02049 12.981 4.02049 13.047 4.02049 13.135C4.02049 13.696 4.15249 14.213 4.41649 14.686C4.69149 15.148 5.07099 15.511 5.55499 15.775C6.03899 16.05 6.57799 16.1875 7.17199 16.1875ZM7.33699 13.498C7.40299 13.531 7.46349 13.5475 7.51849 13.5475C7.57349 13.5475 7.62849 13.531 7.68349 13.498L8.92099 12.7885L4.94449 10.4785C4.70249 10.3355 4.58149 10.121 4.58149 9.835V6.2545C4.03149 6.4965 3.59149 6.8705 3.26149 7.3765C2.93149 7.8715 2.76649 8.4215 2.76649 9.0265C2.76649 9.5655 2.90399 10.0825 3.17899 10.5775C3.45399 11.0725 3.81149 11.4465 4.25149 11.6995L7.33699 13.498ZM11.2475 17.161C11.8305 17.161 12.3585 17.029 12.8315 16.765C13.3045 16.501 13.6785 16.138 13.9535 15.676C14.2285 15.214 14.366 14.697 14.366 14.125V10.561C14.366 10.429 14.311 10.33 14.201 10.264L12.947 9.538V14.1415C12.947 14.4275 12.826 14.642 12.584 14.785L9.46549 16.5835C10.0045 16.9685 10.5985 17.161 11.2475 17.161ZM11.8745 11.122V8.878L10.01 7.822L8.12899 8.878V11.122L10.01 12.178L11.8745 11.122ZM7.05649 5.8585C7.05649 5.5725 7.17749 5.358 7.41949 5.215L10.538 3.4165C9.99899 3.0315 9.40499 2.839 8.75599 2.839C8.17299 2.839 7.64499 2.971 7.17199 3.235C6.69899 3.499 6.32499 3.862 6.04999 4.324C5.78599 4.786 5.65399 5.303 5.65399 5.875V9.4225C5.65399 9.5545 5.70899 9.659 5.81899 9.736L7.05649 10.462V5.8585ZM15.4385 13.7455C15.9885 13.5035 16.423 13.1295 16.742 12.6235C17.072 12.1175 17.237 11.5675 17.237 10.9735C17.237 10.4345 17.0995 9.9175 16.8245 9.4225C16.5495 8.9275 16.192 8.5535 15.752 8.3005L12.6665 6.5185C12.6005 6.4745 12.54 6.458 12.485 6.469C12.43 6.469 12.375 6.4855 12.32 6.5185L11.0825 7.2115L15.0755 9.538C15.1965 9.604 15.2845 9.692 15.3395 9.802C15.4055 9.901 15.4385 10.022 15.4385 10.165V13.7455ZM12.122 5.3635C12.364 5.2095 12.606 5.2095 12.848 5.3635L15.983 7.195C15.983 7.118 15.983 7.019 15.983 6.898C15.983 6.37 15.851 5.8695 15.587 5.3965C15.334 4.9125 14.9655 4.5275 14.4815 4.2415C14.0085 3.9555 13.4585 3.8125 12.8315 3.8125C12.2815 3.8125 11.803 3.928 11.396 4.159L8.29399 5.941C8.18399 6.018 8.12899 6.1225 8.12899 6.2545V7.6735L12.122 5.3635Z" transform="scale(1.2) translate(-2, -2)"></path></svg>
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 rounded-lg text-[#ececec] hover:bg-[#2f2f2f]"
              onClick={() => setSidebarOpen(false)}
            >
              <PanelLeftClose className="h-5 w-5" />
            </Button>
          </div>

          {/* New Chat Button */}
          <div className="relative group/newchat">
            <Button
              className="w-full justify-start gap-2.5 rounded-lg bg-transparent text-[#ececec] hover:bg-[#2f2f2f] h-10 px-2.5 font-normal text-sm"
              onClick={onNewChat}
              variant="ghost"
            >
              <PenSquare className="h-4 w-4" />
              <span className="flex-1 text-left">New chat</span>
            </Button>
            {/* Hover tooltip */}
            <div className="absolute right-2 top-1/2 -translate-y-1/2 opacity-0 group-hover/newchat:opacity-100 transition-opacity pointer-events-none">
              <span className="text-xs text-[#8e8ea0]">Ctrl + Shift + O</span>
            </div>
          </div>

          {/* Search Chats */}
          <div className="relative group/search">
            <Button
              variant="ghost"
              className="w-full justify-start gap-2.5 rounded-lg text-[#ececec] hover:bg-[#2f2f2f] h-10 px-2.5 font-normal text-sm"
              onClick={() => setSearchModalOpen(true)}
            >
              <Search className="h-4 w-4" />
              <span className="flex-1 text-left">Search chats</span>
            </Button>
            {/* Hover tooltip */}
            <div className="absolute right-2 top-1/2 -translate-y-1/2 opacity-0 group-hover/search:opacity-100 transition-opacity pointer-events-none">
              <span className="text-xs text-[#8e8ea0]">Ctrl + K</span>
            </div>
          </div>

          {/* Library */}
          <Button
            variant="ghost"
            className="w-full justify-start gap-2.5 rounded-lg text-[#ececec] hover:bg-[#2f2f2f] h-10 px-2.5 font-normal text-sm"
            onClick={() => router.push('/library?tab=images')}
          >
            <BookOpen className="h-4 w-4" />
            <span>Library</span>
          </Button>

          {/* Projects */}
          <Button
            variant="ghost"
            className="w-full justify-start gap-2.5 rounded-lg text-[#ececec] hover:bg-[#2f2f2f] h-10 px-2.5 font-normal text-sm"
          >
            <FolderKanban className="h-4 w-4" />
            <span>Projects</span>
          </Button>
        </div>

        {/* Chats Section Header */}
        <div className="px-3 py-1.5 mt-1">
          <h2 className="text-xs font-medium text-[#8e8ea0]">Chats</h2>
        </div>

        {/* Conversations List */}
        <div className="flex-1 overflow-y-auto px-2" style={{
          scrollbarWidth: 'thin',
          scrollbarColor: '#2f2f2f #171717'
        }}>
          {filteredConversations.length === 0 ? (
            <div className="px-4 py-8 text-center text-sm text-[#8e8ea0]">
              No conversations yet
            </div>
          ) : (
            filteredConversations.map((conv) => (
              <div
                key={conv.id}
                className={`group relative mb-0.5 rounded-lg px-2.5 py-2 cursor-pointer transition-colors ${
                  currentConversationId === conv.id 
                    ? "bg-[#2f2f2f]" 
                    : "hover:bg-[#2f2f2f]"
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
                  <div className="flex items-center gap-2">
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
                      className="h-6 text-sm bg-[#2f2f2f] border-[#4e4e4e] text-[#ececec]"
                      autoFocus
                      onClick={(e) => e.stopPropagation()}
                    />
                  </div>
                ) : (
                  <>
                    <div className="flex items-center gap-2">
                      <p className="flex-1 truncate text-sm font-normal text-[#ececec] pr-6">{conv.title}</p>
                    </div>
                    {hoveredId === conv.id && (
                      <div className="absolute right-2 top-1/2 -translate-y-1/2 z-50">
                        <DropdownMenu modal={false}>
                          <DropdownMenuTrigger asChild>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-7 w-7 text-[#8e8ea0] hover:text-[#ececec] hover:bg-[#212121] rounded-md"
                              onClick={(e) => e.stopPropagation()}
                            >
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent 
                            align="end"
                            side="bottom"
                            sideOffset={4}
                            className="w-[200px] bg-[#2f2f2f] border border-[#4e4e4e] text-[#ececec] p-1.5 shadow-lg z-[100]"
                          >
                            <DropdownMenuItem 
                              className="gap-3 rounded-md px-3 py-2.5 cursor-pointer hover:bg-[#212121] focus:bg-[#212121] text-[#ececec]"
                              onClick={(e) => {
                                e.stopPropagation()
                                // Share functionality
                              }}
                            >
                              <Share2 className="h-4 w-4" />
                              <span className="text-sm">Share</span>
                            </DropdownMenuItem>
                            <DropdownMenuItem 
                              className="gap-3 rounded-md px-3 py-2.5 cursor-pointer hover:bg-[#212121] focus:bg-[#212121] text-[#ececec]"
                              onClick={(e) => {
                                e.stopPropagation()
                                handleRenameStart(conv)
                              }}
                            >
                              <Edit className="h-4 w-4" />
                              <span className="text-sm">Rename</span>
                            </DropdownMenuItem>
                            <DropdownMenuItem 
                              className="gap-3 rounded-md px-3 py-2.5 cursor-pointer hover:bg-[#212121] focus:bg-[#212121] text-[#ececec]"
                              onClick={(e) => {
                                e.stopPropagation()
                                // Archive functionality
                              }}
                            >
                              <Archive className="h-4 w-4" />
                              <span className="text-sm">Archive</span>
                            </DropdownMenuItem>
                            <DropdownMenuItem 
                              className="gap-3 rounded-md px-3 py-2.5 cursor-pointer hover:bg-[#212121] focus:bg-[#212121] text-[#ef4444] focus:text-[#ef4444]"
                              onClick={(e) => {
                                e.stopPropagation()
                                handleDeleteClick(conv.id)
                              }}
                            >
                              <Trash2 className="h-4 w-4" />
                              <span className="text-sm">Delete</span>
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                    )}
                  </>
                )}
              </div>
            ))
          )}
        </div>

        {/* Bottom Section - User Profile */}
        <div className="border-t border-[#2f2f2f] p-2">
          <div className="flex items-center gap-2">
            {/* User Profile Button with Dropdown */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  className="flex-1 justify-start gap-2.5 rounded-lg px-2.5 py-2 h-auto hover:bg-[#2f2f2f]"
                >
                  <Avatar className="h-8 w-8">
                    <AvatarImage src={user?.imageUrl} />
                    <AvatarFallback className="bg-[#5f5f5f] text-white text-sm font-medium">
                      {userInitials}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 truncate text-left">
                    <p className="text-sm font-medium text-[#ececec] truncate">{userName}</p>
                    <p className="text-xs text-[#8e8ea0]">Free</p>
                  </div>
                </Button>
              </DropdownMenuTrigger>
            <DropdownMenuContent 
              align="end" 
              side="top"
              className="w-[280px] bg-[#2f2f2f] border-[#4e4e4e] text-[#ececec] p-1.5"
              sideOffset={8}
            >
              {/* Email */}
              <div className="flex items-center gap-3 px-3 py-2">
                <User className="h-5 w-5 text-[#8e8ea0]" />
                <span className="text-sm text-[#ececec] truncate">{userEmail}</span>
              </div>

              <div className="h-px bg-[#4e4e4e] my-1" />

              {/* Upgrade Plan */}
              <DropdownMenuItem 
                className="gap-3 rounded-md px-3 py-2 cursor-pointer hover:bg-[#212121] focus:bg-[#212121]"
                onClick={() => router.push('/pricing')}
              >
                <Sparkles className="h-5 w-5" />
                <span className="text-sm">Upgrade plan</span>
              </DropdownMenuItem>

              {/* Personalization */}
              <DropdownMenuItem className="gap-3 rounded-md px-3 py-2 cursor-pointer hover:bg-[#212121] focus:bg-[#212121]">
                <User className="h-5 w-5" />
                <span className="text-sm">Personalization</span>
              </DropdownMenuItem>

              {/* Settings */}
              <DropdownMenuItem className="gap-3 rounded-md px-3 py-2 cursor-pointer hover:bg-[#212121] focus:bg-[#212121]">
                <Settings className="h-5 w-5" />
                <span className="text-sm">Settings</span>
              </DropdownMenuItem>

              <div className="h-px bg-[#4e4e4e] my-1" />

              {/* Help with Submenu */}
              <DropdownMenu open={helpMenuOpen} onOpenChange={setHelpMenuOpen}>
                <DropdownMenuTrigger asChild>
                  <div className="flex items-center gap-3 rounded-md px-3 py-2 cursor-pointer hover:bg-[#212121] text-sm relative">
                    <HelpCircle className="h-5 w-5" />
                    <span className="flex-1">Help</span>
                    <span className="text-lg">›</span>
                  </div>
                </DropdownMenuTrigger>
                <DropdownMenuContent 
                  side="right" 
                  align="start"
                  className="w-[220px] bg-[#2f2f2f] border-[#4e4e4e] text-[#ececec] p-1.5"
                  sideOffset={2}
                >
                  <DropdownMenuItem className="gap-3 rounded-md px-3 py-2 cursor-pointer hover:bg-[#212121] focus:bg-[#212121]">
                    <HelpCircle className="h-4 w-4" />
                    <span className="text-sm">Help center</span>
                  </DropdownMenuItem>
                  <DropdownMenuItem className="gap-3 rounded-md px-3 py-2 cursor-pointer hover:bg-[#212121] focus:bg-[#212121]">
                    <FileText className="h-4 w-4" />
                    <span className="text-sm">Release notes</span>
                  </DropdownMenuItem>
                  <DropdownMenuItem className="gap-3 rounded-md px-3 py-2 cursor-pointer hover:bg-[#212121] focus:bg-[#212121]">
                    <FileText className="h-4 w-4" />
                    <span className="text-sm">Terms & policies</span>
                  </DropdownMenuItem>
                  <DropdownMenuItem className="gap-3 rounded-md px-3 py-2 cursor-pointer hover:bg-[#212121] focus:bg-[#212121]">
                    <MessageCircle className="h-4 w-4" />
                    <span className="text-sm">Report Bug</span>
                  </DropdownMenuItem>
                  <DropdownMenuItem className="gap-3 rounded-md px-3 py-2 cursor-pointer hover:bg-[#212121] focus:bg-[#212121]">
                    <Download className="h-4 w-4" />
                    <span className="text-sm">Download apps</span>
                  </DropdownMenuItem>
                  <DropdownMenuItem className="gap-3 rounded-md px-3 py-2 cursor-pointer hover:bg-[#212121] focus:bg-[#212121]">
                    <Keyboard className="h-4 w-4" />
                    <span className="text-sm">Keyboard shortcuts</span>
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>

              {/* Log out */}
              <SignOutButton>
                <DropdownMenuItem className="gap-3 rounded-md px-3 py-2 cursor-pointer hover:bg-[#212121] focus:bg-[#212121]">
                  <LogOut className="h-5 w-5" />
                  <span className="text-sm">Log out</span>
                </DropdownMenuItem>
              </SignOutButton>
            </DropdownMenuContent>
              </DropdownMenu>

            {/* Upgrade Button */}
            <Button
              className="rounded-lg bg-transparent border border-[#4e4e4e] text-[#ececec] hover:bg-[#2f2f2f] h-9 px-3 text-sm font-medium"
              variant="outline"
              onClick={(e) => {
                          e.stopPropagation()
                          router.push('/pricing')
                        }}
            >
              Upgrade
            </Button>
          </div>
        </div>
      </aside>

      {/* Delete Confirmation Dialog */}
      <ConfirmDialog
        open={deleteDialogOpen}
        onOpenChange={setDeleteDialogOpen}
        onConfirm={handleDeleteConfirm}
        title="Delete chat?"
        description="This will delete"
        highlightedText={
          conversationToDelete
            ? conversations.find((c) => c.id === conversationToDelete)?.title || "New chat"
            : "New chat"
        }
        confirmText="Delete"
        cancelText="Cancel"
        variant="destructive"
        showSettingsLink={true}
      />

      {/* Search Modal */}
      <SearchModal
        open={searchModalOpen}
        onOpenChange={setSearchModalOpen}
        conversations={conversations}
        onSelectConversation={(convId) => {
          onSelectConversation?.(convId)
          setSearchModalOpen(false)
        }}
        onNewChat={onNewChat}
      />
    </>
  )
}
