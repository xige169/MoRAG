import * as React from 'react'
import { Send, Square } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useChatStore } from '@/stores/chatStore'

export function ChatInput() {
  const { sendMessage, cancelStream, isStreaming, currentSession } = useChatStore()
  const [value, setValue] = React.useState('')
  const textareaRef = React.useRef<HTMLTextAreaElement>(null)

  const handleSubmit = async () => {
    const content = value.trim()
    if (!content || isStreaming || !currentSession) return
    setValue('')
    adjustHeight(true)
    await sendMessage(content).catch(() => null)
  }

  const adjustHeight = (reset = false) => {
    const el = textareaRef.current
    if (!el) return
    el.style.height = 'auto'
    if (!reset) {
      el.style.height = Math.min(el.scrollHeight, 160) + 'px'
    }
  }

  return (
    <div className="border-t border-border bg-background px-4 py-3">
      <div className="mx-auto max-w-3xl">
        <div className="relative flex items-end gap-2 rounded-xl border border-border bg-card px-3 py-2.5 focus-within:ring-2 focus-within:ring-ring">
          <textarea
            ref={textareaRef}
            value={value}
            onChange={(e) => { setValue(e.target.value); adjustHeight() }}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault()
                handleSubmit()
              }
            }}
            placeholder={currentSession ? '输入问题… (Enter 发送，Shift+Enter 换行)' : '请先选择或创建对话'}
            disabled={!currentSession}
            rows={1}
            className="flex-1 resize-none bg-transparent text-sm text-foreground placeholder:text-muted-foreground focus:outline-none min-h-[24px] max-h-40 py-0.5"
          />
          <button
            type="button"
            onClick={isStreaming ? cancelStream : handleSubmit}
            disabled={!currentSession || (!isStreaming && !value.trim())}
            className={cn(
              'flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg transition-colors disabled:opacity-40',
              isStreaming ? 'bg-destructive text-destructive-foreground hover:bg-destructive/80' : 'bg-primary text-primary-foreground hover:bg-primary/90',
            )}
          >
            {isStreaming ? <Square className="h-3.5 w-3.5" /> : <Send className="h-3.5 w-3.5" />}
          </button>
        </div>
        <p className="mt-1.5 text-center text-xs text-muted-foreground">
          内容基于知识库生成，请结合实际情况判断
        </p>
      </div>
    </div>
  )
}
