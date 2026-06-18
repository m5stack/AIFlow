import React from 'react'
import type { OnboardingStep } from '../../stores/onboardingStore'
import { ArrowRightIcon } from '../icons/Icons'
import { WIZARD_STEPS } from './constants'

export type StepIndicatorVariant = 'progress' | 'preview'

export interface StepIndicatorProps {
  step: OnboardingStep
  variant?: StepIndicatorVariant
}

export default function StepIndicator({
  step,
  variant = 'progress'
}: StepIndicatorProps): React.JSX.Element {
  const isPreview = variant === 'preview'

  return (
    <div className="flex items-start justify-center gap-2">
      {WIZARD_STEPS.map((label, index) => {
        const stepNum = index + 1
        const isActive = stepNum === step
        const isPast = stepNum < step
        const connectorHighlighted = isPreview || isPast || isActive

        return (
          <React.Fragment key={label}>
            {index > 0 && (
              <span
                className="self-start mt-[12px] shrink-0 flex items-center"
                style={{
                  color: connectorHighlighted ? 'var(--accent)' : 'var(--muted)',
                  opacity: connectorHighlighted ? 1 : 0.45
                }}
              >
                <ArrowRightIcon size={18} />
              </span>
            )}
            <div className="flex flex-col items-center gap-1.5">
              <div
                className="flex size-12 items-center justify-center rounded-full text-[16px] font-semibold transition-colors"
                style={
                  isPreview
                    ? {
                        backgroundColor: 'var(--accent-bg)',
                        color: 'var(--accent)',
                        border: '2px solid var(--accent)'
                      }
                    : {
                        backgroundColor: isActive
                          ? 'var(--accent)'
                          : isPast
                            ? 'var(--accent-bg)'
                            : 'var(--surface-2)',
                        color: isActive ? '#fff' : isPast ? 'var(--accent)' : 'var(--muted)',
                        border: isActive || isPast ? 'none' : '1px solid var(--line)'
                      }
                }
              >
                {stepNum}
              </div>
              <span
                className="text-[11px] whitespace-nowrap max-w-[100px] text-center leading-tight"
                style={{
                  color: isPreview ? 'var(--muted)' : isActive ? 'var(--accent)' : 'var(--muted)',
                  fontWeight: isPreview ? 400 : isActive ? 600 : 400
                }}
              >
                {label}
              </span>
            </div>
          </React.Fragment>
        )
      })}
    </div>
  )
}
