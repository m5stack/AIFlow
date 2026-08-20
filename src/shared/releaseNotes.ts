import { APP_DISPLAY_VERSION } from './appVersion'

export interface ReleaseNoteSection {
  title: string
  items: readonly string[]
}

export interface AppReleaseNote {
  version: string
  releasedAt: string
  sections: readonly ReleaseNoteSection[]
}

/** Curated release notes, ordered from newest to oldest. */
export const APP_RELEASE_NOTES: readonly AppReleaseNote[] = [
  {
    version: APP_DISPLAY_VERSION,
    releasedAt: '2026-08-20',
    sections: [
      {
        title: 'Features',
        items: [
          'Added image attachments to AI conversations.',
          'Added custom prompt templates.',
          'Added searchable online UIFlow2 firmware flashing.',
          'Improved Terminal and WebSocket reliability.',
          'Switched to the new backend service.',
          'Added release notes history.',
          'Updated Claude Agent SDK to v0.3.237',
          'Fixed known bugs.'
        ]
      }
    ]
  },
  {
    version: '1.0.3-beta',
    releasedAt: '2026-07-24',
    sections: [
      {
        title: 'Features',
        items: [
          'Added local file upload to device and startup code selection.',
          'Optimized Terminal connection and device status synchronization.',
          'Optimized firmware flashing and device configuration; updated device firmware.',
          'Optimized Token statistics, conversation titles, tabs, scrolling experience, and overall UI layout.',
          'Updated Skill: M5Stack Assistant v1.0.4 and UIFlow2 Coder v1.0.10.',
          'Fixed known bugs.'
        ]
      }
    ]
  },
  {
    version: '1.0.2-beta',
    releasedAt: '2026-07-09',
    sections: [
      {
        title: 'Features',
        items: [
          'Added support for Cardputer-Adv device.',
          'Added Skills support.',
          'Added MCP support.',
          'Added token usage statistics.',
          'Improved UI.',
          'Fixed known bugs.'
        ]
      }
    ]
  },
  {
    version: '1.0.1-beta',
    releasedAt: '2026-06-24',
    sections: [
      {
        title: 'Features',
        items: [
          'Added support for StackChan device.',
          'Added model connection testing.',
          'Added firmware flashing timeouts',
          'Added window size and zoom factor persistence.',
          'Fixed known bugs.'
        ]
      }
    ]
  },
  {
    version: '1.0.0-beta',
    releasedAt: '2026-06-18',
    sections: [
      {
        title: 'Features',
        items: [
          'AI-powered project chat using the Claude Agent SDK, with support for reading and editing project files.',
          'MicroPython code editor with project-based file management and resource import.',
          'Multi-conversation workflow per project, including persisted chat history.',
          'M5Stack device pairing via 6-digit pairing code.',
          'One-click project run: upload resources and push main.py to the selected device.',
          'Built-in device terminal with realtime WebSocket/Web Serial connection.',
          'Firmware flashing flow with bundled AI-Flow firmware and Wi-Fi/server configuration.',
          'Onboarding flow for model setup, device connection, firmware flashing, and project creation.',
          'Bundled M5Stack/UIFlow2 coding skills and device context for better hardware-aware code generation.',
          'Dark/light theme support and responsive multi-panel workspace layout.'
        ]
      }
    ]
  }
]
