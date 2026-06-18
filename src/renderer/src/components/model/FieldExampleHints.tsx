import React from 'react'

interface FieldExampleHintsProps {
  prefix?: string
  examples: readonly string[]
  onSelect: (value: string) => void
  disabled?: boolean
  className?: string
}

export default function FieldExampleHints({
  prefix = 'e.g.',
  examples,
  onSelect,
  disabled = false,
  className = 'text-[10px] text-muted opacity-70'
}: FieldExampleHintsProps): React.JSX.Element {
  return (
    <p className={className}>
      {prefix}{' '}
      {examples.map((example, index) => (
        <React.Fragment key={example}>
          {index > 0 && ', '}
          <button
            type="button"
            disabled={disabled}
            className="text-accent hover:underline cursor-pointer disabled:cursor-not-allowed disabled:opacity-50"
            onClick={() => onSelect(example)}
          >
            &apos;{example}&apos;
          </button>
        </React.Fragment>
      ))}
    </p>
  )
}
