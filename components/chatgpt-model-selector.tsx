"use client"

import { useRouter } from "next/navigation"
import { ChevronDown, Check } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import type { ChatGPTModelSelectorProps } from "@/types"

export function ChatGPTModelSelector({ selectedModel, onModelSelect }: ChatGPTModelSelectorProps) {
  const router = useRouter()

  return (
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
          onClick={() => onModelSelect("chatgpt-go")}
        >
          <div className="mt-0.5">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M12 2L2 7L12 12L22 7L12 2Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              <path d="M2 17L12 22L22 17" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              <path d="M2 12L12 17L22 12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </div>
          <div 
            className="flex-1" 
            onClick={(e) => {
              e.stopPropagation()
              router.push('/pricing')
            }}
          >
            <div className="flex items-center gap-2 mb-1">
              <span className="font-medium text-[15px]">ChatGPT Go</span>
            </div>
            <p className="text-xs text-[#8e8ea0]">Our smartest model & more</p>
          </div>
          <div className="flex items-center gap-2">
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
          onClick={() => onModelSelect("chatgpt")}
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
  )
}
