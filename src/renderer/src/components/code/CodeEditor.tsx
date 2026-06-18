import React from 'react'
import Editor, { loader } from '@monaco-editor/react'
import * as monaco from 'monaco-editor'
import editorWorker from 'monaco-editor/esm/vs/editor/editor.worker?worker'
import tsWorker from 'monaco-editor/esm/vs/language/typescript/ts.worker?worker'
import { useThemeStore } from '../../stores/themeStore'

// Use local Monaco instead of CDN
self.MonacoEnvironment = {
  getWorker(_: unknown, label: string) {
    if (label === 'typescript' || label === 'javascript') {
      return new tsWorker()
    }
    return new editorWorker()
  }
}
loader.config({ monaco })

interface CodeEditorProps {
  value: string
  language?: string
  readOnly?: boolean
  onCodeChange?: (nextCode: string) => void
}

export default function CodeEditor({
  value,
  language = 'python',
  readOnly = false,
  onCodeChange
}: CodeEditorProps): React.JSX.Element {
  const resolvedTheme = useThemeStore((s) => s.resolved)
  const editorTheme = resolvedTheme === 'dark' ? 'vs-dark' : 'vs'

  return (
    <div style={{ position: 'relative', width: '100%', height: '100%' }}>
      <Editor
        width="100%"
        height="100%"
        language={language}
        value={value}
        onChange={readOnly ? undefined : (nextValue) => onCodeChange?.(nextValue ?? '')}
        theme={editorTheme}
        options={{
          fontSize: 13,
          fontFamily: 'Menlo, Monaco, "Courier New", monospace',
          minimap: { enabled: !readOnly, scale: 1 },
          scrollBeyondLastLine: false,
          wordWrap: 'on',
          lineNumbers: 'on',
          renderLineHighlight: readOnly ? 'none' : 'gutter',
          padding: { top: 8, bottom: 8 },
          smoothScrolling: true,
          cursorBlinking: readOnly ? 'solid' : 'smooth',
          folding: !readOnly,
          bracketPairColorization: { enabled: true },
          formatOnPaste: !readOnly,
          tabSize: 2,
          readOnly,
          domReadOnly: readOnly,
          contextmenu: !readOnly
        }}
      />
    </div>
  )
}
