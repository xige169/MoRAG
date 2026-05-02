import * as React from 'react'
import ReactMarkdown, { type Components } from 'react-markdown'
import remarkGfm from 'remark-gfm'
import { Check, Copy, ExternalLink } from 'lucide-react'
import { cn } from '@/lib/utils'

interface MarkdownMessageProps {
  content: string
  className?: string
}

function getTextContent(children: React.ReactNode): string {
  if (typeof children === 'string') return children
  if (typeof children === 'number') return String(children)
  if (Array.isArray(children)) return children.map(getTextContent).join('')
  if (React.isValidElement<{ children?: React.ReactNode }>(children)) {
    return getTextContent(children.props.children)
  }
  return ''
}

function CodeBlock({
  children,
  language,
}: {
  children: React.ReactNode
  language?: string
}) {
  const [copied, setCopied] = React.useState(false)
  const code = getTextContent(children).replace(/\n$/, '')

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(code)
      setCopied(true)
      window.setTimeout(() => setCopied(false), 1400)
    } catch {
      setCopied(false)
    }
  }

  return (
    <div className="my-3 overflow-hidden rounded-lg border border-border bg-background/80">
      <div className="flex h-9 items-center justify-between border-b border-border bg-secondary/70 px-3">
        <span className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
          {language || 'code'}
        </span>
        <button
          type="button"
          onClick={handleCopy}
          className="inline-flex h-7 items-center gap-1.5 rounded-md px-2 text-xs text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
          title="复制代码"
        >
          {copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
          <span>{copied ? '已复制' : '复制'}</span>
        </button>
      </div>
      <pre className="overflow-x-auto p-3 text-[13px] leading-relaxed">
        <code className="font-mono text-foreground">{children}</code>
      </pre>
    </div>
  )
}

const components: Components = {
  h1: ({ children }) => (
    <h1 className="mb-3 mt-1 border-b border-border pb-2 text-xl font-display font-semibold leading-tight text-foreground">
      {children}
    </h1>
  ),
  h2: ({ children }) => (
    <h2 className="mb-2.5 mt-4 text-base font-display font-semibold leading-snug text-foreground first:mt-0">
      {children}
    </h2>
  ),
  h3: ({ children }) => (
    <h3 className="mb-2 mt-3 text-sm font-semibold leading-snug text-foreground">
      {children}
    </h3>
  ),
  p: ({ children }) => (
    <p className="my-2 leading-7 text-foreground/90 first:mt-0 last:mb-0">
      {children}
    </p>
  ),
  strong: ({ children }) => <strong className="font-semibold text-foreground">{children}</strong>,
  em: ({ children }) => <em className="text-foreground/90">{children}</em>,
  ul: ({ children }) => (
    <ul className="my-2.5 list-disc space-y-1.5 pl-5 marker:text-primary/80">
      {children}
    </ul>
  ),
  ol: ({ children }) => (
    <ol className="my-2.5 list-decimal space-y-1.5 pl-5 marker:text-primary/80">
      {children}
    </ol>
  ),
  li: ({ children }) => <li className="pl-1 leading-7 text-foreground/90">{children}</li>,
  blockquote: ({ children }) => (
    <blockquote className="my-3 border-l-2 border-primary bg-secondary/50 py-2 pl-3 pr-3 text-muted-foreground">
      {children}
    </blockquote>
  ),
  a: ({ children, href }) => (
    <a
      href={href}
      target="_blank"
      rel="noreferrer noopener"
      className="inline-flex items-center gap-0.5 font-medium text-primary underline-offset-4 hover:underline"
    >
      {children}
      <ExternalLink className="h-3 w-3" />
    </a>
  ),
  table: ({ children }) => (
    <div className="my-3 max-w-full overflow-x-auto rounded-lg border border-border">
      <table className="w-full min-w-max border-collapse text-left text-xs">
        {children}
      </table>
    </div>
  ),
  thead: ({ children }) => <thead className="bg-secondary text-foreground">{children}</thead>,
  tbody: ({ children }) => <tbody className="divide-y divide-border">{children}</tbody>,
  tr: ({ children }) => <tr className="divide-x divide-border">{children}</tr>,
  th: ({ children }) => (
    <th className="px-3 py-2 font-semibold text-foreground">
      {children}
    </th>
  ),
  td: ({ children }) => (
    <td className="px-3 py-2 align-top leading-6 text-foreground/85">
      {children}
    </td>
  ),
  hr: () => <hr className="my-4 border-border" />,
  pre: ({ children }) => <>{children}</>,
  code: ({ children, className }) => {
    const match = /language-(\w+)/.exec(className || '')
    if (match) {
      return <CodeBlock language={match[1]}>{children}</CodeBlock>
    }
    return (
      <code className="rounded border border-border bg-secondary px-1.5 py-0.5 font-mono text-[0.92em] text-foreground">
        {children}
      </code>
    )
  },
}

export function MarkdownMessage({ content, className }: MarkdownMessageProps) {
  return (
    <div className={cn('markdown-message text-sm leading-relaxed', className)}>
      <ReactMarkdown remarkPlugins={[remarkGfm]} components={components}>
        {content}
      </ReactMarkdown>
    </div>
  )
}
