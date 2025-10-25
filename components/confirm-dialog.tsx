"use client"

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import type { ConfirmDialogProps } from "@/types"

export function ConfirmDialog({
  open,
  onOpenChange,
  onConfirm,
  title,
  description,
  highlightedText,
  confirmText = "Continue",
  cancelText = "Cancel",
  variant = "default",
  showSettingsLink = false,
}: ConfirmDialogProps) {
  const handleCancel = () => {
    onOpenChange(false)
  }

  const handleConfirm = () => {
    onConfirm()
    onOpenChange(false)
  }

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent className="max-w-md bg-zinc-900 border-zinc-800">
        <AlertDialogHeader className="space-y-3">
          <AlertDialogTitle className="text-xl font-semibold text-white">
            {title}
          </AlertDialogTitle>
          <div className="space-y-2">
            {description && (
              <AlertDialogDescription className="text-sm text-zinc-400">
                {description}{" "}
                {highlightedText && (
                  <span className="font-semibold text-white">{highlightedText}</span>
                )}
                .
              </AlertDialogDescription>
            )}
            {showSettingsLink && (
              <AlertDialogDescription className="text-sm text-zinc-400">
                Visit{" "}
                <button
                  onClick={() => {
                    // Navigate to settings or open settings dialog
                    console.log("Navigate to settings")
                  }}
                  className="underline hover:text-zinc-300 transition-colors"
                >
                  settings
                </button>{" "}
                to delete any memories saved during this chat.
              </AlertDialogDescription>
            )}
          </div>
        </AlertDialogHeader>
        <AlertDialogFooter className="flex-row justify-end space-x-2 mt-4">
          <AlertDialogCancel 
            onClick={handleCancel}
            className="mt-0 bg-transparent border-0 text-zinc-400 hover:text-white hover:bg-zinc-800"
          >
            {cancelText}
          </AlertDialogCancel>
          <AlertDialogAction
            onClick={handleConfirm}
            className={
              variant === "destructive"
                ? "bg-red-600 hover:bg-red-700 text-white font-medium px-4"
                : "bg-white hover:bg-zinc-200 text-black font-medium px-4"
            }
          >
            {confirmText}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
