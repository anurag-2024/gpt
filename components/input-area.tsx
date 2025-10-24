"use client"

import type React from "react"

import { useState, useRef, useEffect } from "react"
import { Paperclip, Square, X, Loader2, ArrowUp } from "lucide-react"
import { Button } from "@/components/ui/button"
import { toast } from "sonner"

interface UploadedFile {
  id: string
  name: string
  size: number
  type: string
  preview?: string
  url?: string
  publicId?: string
}

interface InputAreaProps {
  onSendMessage: (message: string, files?: UploadedFile[]) => void
  isStreaming?: boolean
  onStop?: () => void
}

export function InputArea({ onSendMessage, isStreaming = false, onStop }: InputAreaProps) {
  const [input, setInput] = useState("")
  const [uploadedFiles, setUploadedFiles] = useState<UploadedFile[]>([])
  const [isUploading, setIsUploading] = useState(false)
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  // Auto-expand textarea
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto"
      textareaRef.current.style.height = Math.min(textareaRef.current.scrollHeight, 200) + "px"
    }
  }, [input])

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.currentTarget.files
    if (!files || files.length === 0) return

    setIsUploading(true)

    try {
      const formData = new FormData()
      
      for (let i = 0; i < files.length; i++) {
        const file = files[i]
        
        // Validate file size (10MB)
        if (file.size > 10 * 1024 * 1024) {
          toast.error(`${file.name} exceeds 10MB limit`)
          continue
        }

        formData.append("files", file)
      }

      // Upload to Cloudinary via API
      const response = await fetch("/api/upload", {
        method: "POST",
        body: formData,
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || "Upload failed")
      }

      const data = await response.json()

      // Add uploaded files to state with preview for images
      const newFiles: UploadedFile[] = data.files.map((file: any, index: number) => ({
        id: `${Date.now()}-${index}`,
        name: file.name,
        size: file.size,
        type: file.type,
        url: file.url,
        publicId: file.publicId,
        preview: file.type.startsWith("image/") ? file.url : undefined,
      }))

      setUploadedFiles((prev) => [...prev, ...newFiles])
      toast.success(`${newFiles.length} file(s) uploaded successfully`)
    } catch (error: any) {
      console.error("Upload error:", error)
      toast.error(error.message || "Failed to upload files")
    } finally {
      setIsUploading(false)
      if (fileInputRef.current) {
        fileInputRef.current.value = ""
      }
    }
  }

  const removeFile = (fileId: string) => {
    setUploadedFiles((prev) => prev.filter((f) => f.id !== fileId))
  }

  const handleSend = () => {
    if (input.trim() || uploadedFiles.length > 0) {
      onSendMessage(input, uploadedFiles.length > 0 ? uploadedFiles : undefined)
      setInput("")
      setUploadedFiles([])
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return "0 Bytes"
    const k = 1024
    const sizes = ["Bytes", "KB", "MB"]
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + " " + sizes[i]
  }

  return (
    <div className="bg-background px-4 py-6">
      <div className="mx-auto max-w-3xl">
        {/* File Preview Section */}
        {uploadedFiles.length > 0 && (
          <div className="mb-3 flex flex-wrap gap-2">
            {uploadedFiles.map((file) => (
              <div
                key={file.id}
                className="relative flex items-center gap-2 rounded-lg border border-border bg-muted/50 p-2"
              >
                {file.preview ? (
                  <img
                    src={file.preview || "/placeholder.svg"}
                    alt={file.name}
                    className="h-12 w-12 rounded object-cover"
                  />
                ) : (
                  <div className="flex h-12 w-12 items-center justify-center rounded bg-muted">
                    <span className="text-xs font-semibold text-muted-foreground">
                      {file.type.split("/")[1]?.toUpperCase().slice(0, 3) || "FILE"}
                    </span>
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <p className="truncate text-xs font-medium">{file.name}</p>
                  <p className="text-xs text-muted-foreground">{formatFileSize(file.size)}</p>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-6 w-6 shrink-0"
                  onClick={() => removeFile(file.id)}
                  suppressHydrationWarning
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            ))}
          </div>
        )}

        {/* Input Area - Exact ChatGPT Style */}
        <div className="relative rounded-[26px] border border-border/40 bg-[#2f2f2f] shadow-[0_0_0_1px_rgba(0,0,0,0.1)]">
          <div className="flex items-center gap-2 px-4 py-3">
            {/* File Upload */}
            <input
              ref={fileInputRef}
              type="file"
              multiple
              onChange={handleFileSelect}
              className="hidden"
              accept="image/*,.pdf,.doc,.docx,.txt"
              suppressHydrationWarning
            />
            <Button
              variant="ghost"
              size="icon"
              className="shrink-0 h-8 w-8 rounded-lg text-muted-foreground hover:text-foreground hover:bg-transparent"
              onClick={() => fileInputRef.current?.click()}
              suppressHydrationWarning
            >
              <Paperclip className="h-5 w-5" />
            </Button>

            {/* Textarea */}
            <textarea
              ref={textareaRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Ask anything"
              className="flex-1 max-h-[200px] resize-none bg-transparent text-[15px] text-foreground placeholder:text-muted-foreground focus:outline-none py-1.5"
              rows={1}
            />

            {/* Right Icons Group */}
            <div className="flex items-center gap-1 shrink-0">
              {/* Microphone Button - Placeholder */}
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 rounded-lg text-muted-foreground hover:text-foreground hover:bg-transparent"
                suppressHydrationWarning
              >
                <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z" />
                  <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
                  <line x1="12" y1="19" x2="12" y2="23" />
                  <line x1="8" y1="23" x2="16" y2="23" />
                </svg>
              </Button>

              {/* Send or Stop Button */}
              {isStreaming ? (
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 rounded-lg bg-foreground text-background hover:bg-foreground/90"
                  onClick={() => {
                    if (onStop) {
                      onStop()
                      toast.info("Response stopped")
                    }
                  }}
                  suppressHydrationWarning
                >
                  <Square className="h-3.5 w-3.5 fill-current" />
                </Button>
              ) : (
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 rounded-lg bg-foreground text-background hover:bg-foreground/90 disabled:opacity-100 disabled:bg-muted disabled:cursor-not-allowed"
                  onClick={handleSend}
                  disabled={(!input.trim() && uploadedFiles.length === 0) || isUploading}
                  suppressHydrationWarning
                >
                  {isUploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <ArrowUp className="h-5 w-5" />}
                </Button>
              )}
            </div>
          </div>
        </div>
        
        {/* Footer Text - ChatGPT Style */}
        <p className="mt-2 text-center text-xs text-muted-foreground">
          ChatGPT can make mistakes. Check important info.
        </p>
      </div>
    </div>
  )
}
