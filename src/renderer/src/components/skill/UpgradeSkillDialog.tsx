import React, { useState } from 'react'
import {
  Button,
  Modal,
  ModalBackdrop,
  ModalBody,
  ModalContainer,
  ModalDialog,
  ModalFooter,
  ModalHeader,
  ModalHeading,
  ProgressBar
} from '@heroui/react'
import type { SkillItem } from '../../../../shared/types'
import { downloadSkill } from '../../api/skill'
import type { SkillUpdateInfo } from '../../utils/skillUpdates'

type InstallPhase = 'downloading' | 'installing'

interface UpgradeSkillDialogProps {
  isOpen: boolean
  onClose: () => void
  skillName: string
  update: SkillUpdateInfo | null
  onUpgraded: (skills: SkillItem[]) => void
}

export default function UpgradeSkillDialog({
  isOpen,
  onClose,
  skillName,
  update,
  onUpgraded
}: UpgradeSkillDialogProps): React.JSX.Element {
  const [isUpgrading, setIsUpgrading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [phase, setPhase] = useState<InstallPhase | null>(null)
  const [progress, setProgress] = useState(0)

  const resetState = (): void => {
    setIsUpgrading(false)
    setError(null)
    setPhase(null)
    setProgress(0)
  }

  const handleClose = (): void => {
    if (isUpgrading) return
    resetState()
    onClose()
  }

  const handleUpgrade = async (): Promise<void> => {
    if (!update || isUpgrading) return

    setIsUpgrading(true)
    setError(null)
    setPhase('downloading')
    setProgress(0)

    try {
      const { remoteFileName, expectedSize } = update
      const bytes = await downloadSkill(remoteFileName, {
        expectedSize,
        onProgress: ({ percent }) => {
          setPhase('downloading')
          setProgress(Math.min(90, Math.round(percent * 0.9)))
        }
      })
      setPhase('downloading')
      setProgress(90)
      setPhase('installing')
      setProgress(95)
      const nextSkills = await window.ipc.skill.install(remoteFileName, bytes)
      setProgress(100)
      onUpgraded(nextSkills)
      onClose()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to upgrade skill')
      setPhase(null)
      setProgress(0)
    } finally {
      setIsUpgrading(false)
    }
  }

  const versionLabel =
    update?.installedVersion && update.remoteVersion
      ? `v${update.installedVersion} → v${update.remoteVersion}`
      : update?.remoteVersion
        ? `v${update.remoteVersion}`
        : null

  return (
    <Modal>
      <Modal.Trigger
        aria-hidden
        tabIndex={-1}
        className="fixed size-0 overflow-hidden opacity-0 pointer-events-none border-0 p-0"
      />
      <ModalBackdrop
        isOpen={isOpen}
        onOpenChange={(open) => {
          if (!open) handleClose()
        }}
        isDismissable={!isUpgrading}
      >
        <ModalContainer size="md">
          <ModalDialog>
            <Modal.CloseTrigger />
            <ModalHeader>
              <ModalHeading className="text-lg">Upgrade Skill</ModalHeading>
            </ModalHeader>

            <ModalBody className="flex flex-col gap-3 p-2">
              {error ? <div className="text-[12px] text-muted">{error}</div> : null}

              {isUpgrading && phase ? (
                <div className="flex flex-col gap-2">
                  <span className="text-[12px] text-muted">
                    {phase === 'downloading' ? 'Downloading…' : 'Installing…'}
                  </span>
                  <ProgressBar
                    value={progress}
                    minValue={0}
                    maxValue={100}
                    aria-label={`${skillName} upgrade progress`}
                  >
                    <ProgressBar.Track className="h-1.5">
                      <ProgressBar.Fill />
                    </ProgressBar.Track>
                  </ProgressBar>
                </div>
              ) : (
                <p className="text-[13px] text-ink">
                  A newer version of <span className="font-medium">{skillName}</span> is available
                  {versionLabel ? (
                    <>
                      {' '}
                      (<span className="text-muted">{versionLabel}</span>)
                    </>
                  ) : null}
                  . Upgrade now?
                </p>
              )}
            </ModalBody>

            <ModalFooter className="flex justify-end gap-2 px-2">
              <Button
                variant="ghost"
                className="text-[13px] cursor-pointer"
                onClick={handleClose}
                isDisabled={isUpgrading}
              >
                Cancel
              </Button>
              <Button
                variant="primary"
                className="text-[13px] cursor-pointer"
                isDisabled={!update || isUpgrading}
                onClick={() => void handleUpgrade()}
              >
                {isUpgrading ? 'Upgrading…' : 'Upgrade'}
              </Button>
            </ModalFooter>
          </ModalDialog>
        </ModalContainer>
      </ModalBackdrop>
    </Modal>
  )
}
