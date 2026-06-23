import React from 'react'
import { Button } from '@heroui/react'
import logoDark from '../../../assets/m5logo-white.svg'
import logoLight from '../../../assets/m5logo2022.svg'
import { useThemeStore } from '../../../stores/themeStore'
import StepIndicator from '../StepIndicator'

interface WelcomeStepProps {
  onGetStarted: () => void
}

export default function WelcomeStep({ onGetStarted }: WelcomeStepProps): React.JSX.Element {
  const resolved = useThemeStore((s) => s.resolved)
  const logo = resolved === 'dark' ? logoDark : logoLight

  return (
    <div className="flex flex-1 flex-col items-center justify-center text-center px-2">
      <img src={logo} alt="M5Stack" className="h-24 w-auto object-contain mb-4" />
      <h1 className="text-[28px] font-semibold text-[var(--text-h)]">Welcome to AIFlow.</h1>

      <div className="my-16 w-full">
        <StepIndicator step={0} variant="preview" />
      </div>

      <Button
        variant="primary"
        className="w-[200px] !text-[14px] !py-6 font-semibold cursor-pointer"
        onPress={onGetStarted}
      >
        Get Started
      </Button>
    </div>
  )
}
