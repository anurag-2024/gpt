export function TypingIndicator() {
  return (
    <div className="flex gap-1">
      <div className="h-2 w-2 rounded-full bg-muted-foreground animate-typing" style={{ animationDelay: "0s" }} />
      <div className="h-2 w-2 rounded-full bg-muted-foreground animate-typing" style={{ animationDelay: "0.2s" }} />
      <div className="h-2 w-2 rounded-full bg-muted-foreground animate-typing" style={{ animationDelay: "0.4s" }} />
    </div>
  )
}
