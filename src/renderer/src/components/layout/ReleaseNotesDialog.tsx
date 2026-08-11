import React, { useState } from 'react'
import {
  Modal,
  ModalBackdrop,
  ModalBody,
  ModalContainer,
  ModalDialog,
  ModalHeader,
  ModalHeading
} from '@heroui/react'
import { APP_DISPLAY_VERSION } from '../../../../shared/appVersion'
import { APP_RELEASE_NOTES, type AppReleaseNote } from '../../../../shared/releaseNotes'

const releaseDateFormatter = new Intl.DateTimeFormat('en-US', {
  month: 'long',
  day: 'numeric',
  year: 'numeric',
  timeZone: 'UTC'
})

const formatReleaseDate = (date: string): string =>
  releaseDateFormatter.format(new Date(`${date}T00:00:00Z`))

export default function ReleaseNotesDialog(): React.JSX.Element {
  const [selectedVersion, setSelectedVersion] = useState(APP_DISPLAY_VERSION)
  const selectedRelease =
    APP_RELEASE_NOTES.find((release) => release.version === selectedVersion) ?? APP_RELEASE_NOTES[0]

  const resetSelection = (): void => setSelectedVersion(APP_DISPLAY_VERSION)

  return (
    <Modal>
      <Modal.Trigger<'button'>
        render={(props) => <button {...props} type="button" />}
        className="cursor-pointer rounded-full bg-accent-bg px-2 py-0.5 text-[10px] font-semibold text-accent outline-none transition-colors hover:text-ink hover:ring-1 hover:ring-accent focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-surface"
        aria-label={`View release notes for version ${APP_DISPLAY_VERSION}`}
        title="View release notes"
      >
        v{APP_DISPLAY_VERSION}
      </Modal.Trigger>

      <ModalBackdrop
        onOpenChange={(isOpen) => {
          if (!isOpen) resetSelection()
        }}
        isDismissable
      >
        <ModalContainer size="lg">
          <ModalDialog className="w-[min(780px,calc(100vw-2rem))] max-w-[min(780px,calc(100vw-2rem))]!">
            <Modal.CloseTrigger />
            <ModalHeader>
              <ModalHeading className="text-lg">Release Notes</ModalHeading>
              <p className="text-[12px] text-muted">What changed in AIFlow</p>
            </ModalHeader>

            <ModalBody className="min-h-0 p-0">
              <div className="grid h-[min(64vh,560px)] min-h-0 grid-cols-[140px_minmax(0,1fr)] overflow-hidden max-[560px]:grid-cols-[112px_minmax(0,1fr)]">
                <nav
                  className="min-h-0 overflow-y-auto border-r border-line bg-surface-2 p-2"
                  aria-label="AIFlow versions"
                >
                  <div className="flex flex-col gap-1">
                    {APP_RELEASE_NOTES.map((release) => (
                      <ReleaseVersionButton
                        key={release.version}
                        release={release}
                        isSelected={release.version === selectedRelease.version}
                        onSelect={() => setSelectedVersion(release.version)}
                      />
                    ))}
                  </div>
                </nav>

                <article
                  key={selectedRelease.version}
                  className="min-h-0 overflow-y-auto px-5 py-4 max-[560px]:px-3"
                  aria-labelledby={`release-${selectedRelease.version}`}
                >
                  <div className="flex flex-wrap items-center gap-2">
                    <h2
                      id={`release-${selectedRelease.version}`}
                      className="text-[18px] font-semibold text-ink"
                    >
                      v{selectedRelease.version}
                    </h2>
                    {selectedRelease.version === APP_DISPLAY_VERSION ? (
                      <span className="rounded-full bg-accent-bg px-2 py-0.5 text-[10px] font-semibold text-accent">
                        Current
                      </span>
                    ) : null}
                  </div>
                  <time
                    className="mt-1 block text-[11px] text-muted"
                    dateTime={selectedRelease.releasedAt}
                  >
                    {formatReleaseDate(selectedRelease.releasedAt)}
                  </time>

                  <div className="mt-5 flex flex-col gap-5">
                    {selectedRelease.sections.map((section) => (
                      <section key={section.title}>
                        <h3 className="text-[13px] font-semibold text-ink">{section.title}</h3>
                        <ul className="mt-2 flex list-disc flex-col gap-2 pl-5 text-[12px] leading-relaxed text-muted marker:text-accent">
                          {section.items.map((item) => (
                            <li key={item}>{item}</li>
                          ))}
                        </ul>
                      </section>
                    ))}
                  </div>
                </article>
              </div>
            </ModalBody>
          </ModalDialog>
        </ModalContainer>
      </ModalBackdrop>
    </Modal>
  )
}

interface ReleaseVersionButtonProps {
  release: AppReleaseNote
  isSelected: boolean
  onSelect: () => void
}

function ReleaseVersionButton({
  release,
  isSelected,
  onSelect
}: ReleaseVersionButtonProps): React.JSX.Element {
  const isCurrent = release.version === APP_DISPLAY_VERSION

  return (
    <button
      type="button"
      className={`flex w-full cursor-pointer flex-col items-start gap-0.5 rounded px-2 py-2 text-left outline-none transition-colors focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-accent ${
        isSelected ? 'bg-soft text-ink' : 'text-muted hover:bg-soft hover:text-ink'
      }`}
      aria-current={isSelected ? 'page' : undefined}
      onClick={onSelect}
    >
      <span className="text-[11px] font-semibold">v{release.version}</span>
      <span className="text-[9px] text-muted">{isCurrent ? 'Current' : release.releasedAt}</span>
    </button>
  )
}
