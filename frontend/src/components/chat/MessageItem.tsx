import * as React from 'react'
import ReactMarkdown from 'react-markdown'
import { ThumbsUp, ThumbsDown, FileText, Sparkles } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import type { ChatMessage, Source } from '@/types'
import { useChatStore } from '@/stores/chatStore'

interface MessageItemProps {
  message: ChatMessage
  isStreaming?: boolean
}

export function MessageItem({ message, isStreaming }: MessageItemProps) {
  const { submitFeedback } = useChatStore()
  const [feedback, setFeedback] = React.useState<'up' | 'down' | null>(null)
  const isUser = message.role === 'user'

  const handleFeedback = async (rating: 'up' | 'down') => {
    const next = feedback === rating ? null : rating
    setFeedback(next as 'up' | 'down' | null)
    if (next) {
      await submitFeedback(message.id, next).catch(() => null)
    }
  }

  return (
    <div className={cn('flex gap-3 px-4 py-3', isUser ? 'flex-row-reverse' : 'flex-row')}>
      <div
        className={cn(
          'flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full text-xs font-semibold',
          isUser ? 'bg-secondary text-secondary-foreground' : 'bg-primary text-primary-foreground',
        )}
      >
        {isUser ? 'U' : 'AI'}
      </div>

      <div className={cn('flex flex-col gap-1.5 max-w-[75%]', isUser ? 'items-end' : 'items-start')}>
        <div
          className={cn(
            'rounded-xl px-4 py-2.5 text-sm',
            isUser
              ? 'bg-primary text-primary-foreground rounded-tr-sm'
              : 'bg-card border border-border text-foreground rounded-tl-sm',
          )}
        >
          {isUser ? (
            <p className="whitespace-pre-wrap">{message.content}</p>
          ) : (
            <div className="prose prose-sm prose-invert max-w-none">
              <ReactMarkdown>{message.content}</ReactMarkdown>
              {isStreaming && (
                <span className="inline-block h-4 w-0.5 bg-primary ml-0.5 animate-[blink_1s_step-end_infinite]" />
              )}
            </div>
          )}
        </div>

        {/* Fallback badge */}
        {!isUser && message.is_fallback && (
          <div className="inline-flex items-center gap-1 rounded-full border border-border bg-secondary px-2.5 py-1 text-xs text-muted-foreground">
            <Sparkles className="h-3 w-3" />
            <span>通用回答（未基于知识库）</span>
          </div>
        )}

        {/* Sources */}
        {!isUser && message.sources.length > 0 && (
          <div className="flex flex-wrap gap-1.5 max-w-full">
            {message.sources.map((source: Source) => (
              <Tooltip key={source.chunk_id}>
                <TooltipTrigger asChild>
                  <div className="flex items-center gap-1 rounded-full bg-secondary px-2.5 py-1 text-xs text-muted-foreground hover:text-foreground cursor-pointer transition-colors border border-border">
                    <FileText className="h-3 w-3" />
                    <span>[{source.index}] {source.doc_name}</span>
                    {source.page_number && <span className="text-muted-foreground">p.{source.page_number}</span>}
                  </div>
                </TooltipTrigger>
                <TooltipContent className="max-w-xs">
                  <p className="text-xs leading-relaxed">{source.snippet}</p>
                </TooltipContent>
              </Tooltip>
            ))}
          </div>
        )}

        {/* Feedback */}
        {!isUser && !isStreaming && message.id && !message.id.startsWith('tmp-') && (
          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={() => handleFeedback('up')}
              className={cn(
                'rounded p-1 transition-colors',
                feedback === 'up' ? 'text-success' : 'text-muted-foreground hover:text-foreground',
              )}
              title="有帮助"
            >
              <ThumbsUp className="h-3.5 w-3.5" />
            </button>
            <button
              type="button"
              onClick={() => handleFeedback('down')}
              className={cn(
                'rounded p-1 transition-colors',
                feedback === 'down' ? 'text-destructive-foreground' : 'text-muted-foreground hover:text-foreground',
              )}
              title="没帮助"
            >
              <ThumbsDown className="h-3.5 w-3.5" />
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
