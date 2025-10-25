"use client"

import React from "react"
import { Download, Share2 } from "lucide-react"
import { toast } from "sonner"

type ImageActionsProps = {
  url: string
  filename?: string
  caption?: string
}

export function ImageActions({ url, filename, caption }: ImageActionsProps) {
  const handleDownload = async (e: React.MouseEvent) => {
    e.stopPropagation()
    try {
      const res = await fetch(url)
      const blob = await res.blob()
      const objectUrl = window.URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = objectUrl
      const now = new Date()
      const month = String(now.getMonth() + 1).padStart(2, '0')
      const day = String(now.getDate()).padStart(2, '0')
      const year = now.getFullYear()
      const hours = now.getHours()
      const minutes = String(now.getMinutes()).padStart(2, '0')
      const seconds = String(now.getSeconds()).padStart(2, '0')
      const ampm = hours >= 12 ? 'PM' : 'AM'
      const displayHours = hours % 12 || 12
      const ext = (filename || 'image').split('.').pop() || 'png'
      link.download = `${filename || 'ChatGPT Image'} ${month}-${day}-${year} ${displayHours}-${minutes}-${seconds} ${ampm}.${ext}`
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      window.URL.revokeObjectURL(objectUrl)
      toast.success('Image downloaded')
    } catch (err) {
      console.error('Download failed:', err)
      toast.error('Failed to download image')
    }
  }

  const handleShare = async (e: React.MouseEvent) => {
    e.stopPropagation()
    try {
      if (navigator.share) {
        await navigator.share({
          title: caption || filename || 'AI Image',
          text: caption || filename || 'Check out this image',
          url,
        })
        toast.success('Image shared')
      } else {
        await navigator.clipboard.writeText(url)
        toast.success('Image URL copied to clipboard')
      }
    } catch (err) {
      console.error('Share failed:', err)
      toast.error('Failed to share image')
    }
  }

  return (
    <div className="absolute bottom-6 left-0 right-0 p-2 bg-gradient-to-t from-black/80 via-black/40 to-transparent md:opacity-0 md:group-hover:opacity-100 transition-opacity">
      <div className="flex items-center justify-between">
        <button
          onClick={handleDownload}
          className="p-2 rounded-full cursor-pointer text-white hover:bg-white/20 transition-all"
          title="Download image"
        >
          <Download className="h-4 w-4 md:h-5 md:w-5" />
        </button>

        <button
          onClick={handleShare}
          className="p-2 rounded-full cursor-pointer text-white hover:bg-white/20 transition-all"
          title="Share image"
        >
          <Share2 className="h-4 w-4 md:h-5 md:w-5" />
        </button>
      </div>
    </div>
  )
}

export default ImageActions
