import React, { useCallback } from 'react'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import type { Components } from 'react-markdown'

interface ConversationMarkdownProps {
  content: string
}

function MarkdownCodeBlock({
  className,
  children
}: {
  className?: string
  children: React.ReactNode
}): React.JSX.Element {
  const language = /language-(\w+)/.exec(className ?? '')?.[1] ?? 'text'
  const code = String(children).replace(/\n$/, '')

  const handleCopy = useCallback((): void => {
    void navigator.clipboard.writeText(code)
  }, [code])

  return (
    <div className="conv-markdown-code-block">
      <div className="conv-markdown-code-header">
        <span className="conv-markdown-code-lang">{language}</span>
        <button type="button" className="conv-markdown-code-copy" onClick={handleCopy}>
          Copy
        </button>
      </div>
      <pre className="conv-markdown-code-pre">
        <code>{code}</code>
      </pre>
    </div>
  )
}

const markdownComponents: Components = {
  a: ({ href, children }) => (
    <a href={href} target="_blank" rel="noopener noreferrer">
      {children}
    </a>
  ),
  code: ({ className, children, ...props }) => {
    if (!className) {
      return (
        <code className="conv-markdown-inline-code" {...props}>
          {children}
        </code>
      )
    }
    return <MarkdownCodeBlock className={className}>{children}</MarkdownCodeBlock>
  },
  pre: ({ children }) => <>{children}</>,
  table: ({ children }) => (
    <div className="conv-markdown-table-wrap">
      <table>{children}</table>
    </div>
  )
}

export default function ConversationMarkdown({ content }: ConversationMarkdownProps): React.JSX.Element {
  return (
    <div className="conv-markdown">
      <ReactMarkdown remarkPlugins={[remarkGfm]} components={markdownComponents}>
        {content}
      </ReactMarkdown>
    </div>
  )
}
