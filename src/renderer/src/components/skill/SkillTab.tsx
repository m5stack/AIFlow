import React from 'react'
import { SkillIcon } from '../icons/Icons'

export default function SkillTab(): React.JSX.Element {
  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-2 text-center">
      <SkillIcon size={28} className="opacity-80" />
      <p className="text-[13px] text-muted">Skills coming soon</p>
    </div>
  )
}
