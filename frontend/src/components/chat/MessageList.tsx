import * as React from 'react'
import { Bot, Sparkles } from 'lucide-react'
import { MessageItem } from './MessageItem'
import { useChatStore } from '@/stores/chatStore'

export function MessageList() {
  const { messages, isStreaming, streamingId, isLoading } = useChatStore()
  const bottomRef = React.useRef<HTMLDivElement>(null)

  React.useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, isStreaming])

  if (isLoading) {
    return (
      <div className="flex h-full items-center justify-center">
        <div className="flex items-center gap-2 text-muted-foreground text-sm">
          <div className="h-4 w-4 rounded-full border-2 border-primary border-t-transparent animate-spin" />
          加载中...
        </div>
      </div>
    )
  }

  if (messages.length === 0) {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-4 text-center px-8">
        <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/15">
          <Sparkles className="h-7 w-7 text-primary" />
        </div>
        <div>
          <h2 className="text-xl font-display font-semibold mb-1">开始提问</h2>
          <p className="text-sm text-muted-foreground">从知识库中检索信息，获取精准回答</p>
        </div>
      </div>
    )
  }

  return (
    <div className="flex flex-col overflow-y-auto h-full py-4">
      {messages.map((msg) => (
        <MessageItem
          key={msg.id}
          message={msg}
          isStreaming={isStreaming && msg.id === streamingId}
        />
      ))}
      {isStreaming && streamingId && messages[messages.length - 1]?.id === streamingId && messages[messages.length - 1]?.content === '' && (
        <div className="flex gap-3 px-4 py-3">
          <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground text-xs font-semibold">
            AI
          </div>
          <div className="flex items-center gap-1.5 bg-card border border-border rounded-xl px-4 py-3">
            <span className="h-2 w-2 rounded-full bg-primary animate-[pulse-soft_2s_ease-in-out_infinite]" />
            <span className="h-2 w-2 rounded-full bg-primary animate-[pulse-soft_2s_ease-in-out_infinite] [animation-delay:0.3s]" />
            <span className="h-2 w-2 rounded-full bg-primary animate-[pulse-soft_2s_ease-in-out_infinite] [animation-delay:0.6s]" />
          </div>
        </div>
      )}
      <div ref={bottomRef} />
    </div>
  )
}
