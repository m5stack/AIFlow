import './assets/main.css'

import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import App from './App'

// Hide splash after React paints its first frame, but keep it visible
// for at least a minimum duration so the animation doesn't flash by.
const splash = document.getElementById('splash')
if (splash) {
  const MIN_SPLASH_MS = 2000
  const startTime = performance.now()

  const hideSplash = (): void => {
    if (splash.classList.contains('hidden')) return
    splash.classList.add('hidden')
    splash.addEventListener('transitionend', () => splash.remove(), { once: true })
  }

  requestAnimationFrame(() => {
    requestAnimationFrame(() => {
      const elapsed = performance.now() - startTime
      if (elapsed >= MIN_SPLASH_MS) {
        hideSplash()
      } else {
        setTimeout(hideSplash, MIN_SPLASH_MS - elapsed)
      }
    })
  })
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>
)
