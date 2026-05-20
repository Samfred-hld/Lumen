---
phase: 04-polish-platform
plan: 01
subsystem: pwa
tags: [pwa, service-worker, workbox, offline, vite-plugin-pwa, manifest]

# Dependency graph
requires:
  - phase: 0
    provides: Supabase client and auth context for offline queue integration
provides:
  - PWA service worker with cache-first static assets and network-first API
  - Offline mutation queue with localStorage persistence
  - Online/offline detection with automatic queue sync on reconnect
  - Custom PWA install prompt in Portuguese
  - OfflineBar and InstallBanner UI components wired into Layout
affects: [04-polish-platform, offline, pwa, layout]

# Tech tracking
tech-stack:
  added: [vite-plugin-pwa, workbox]
  patterns: [offline-queue, service-worker-caching, pwa-install-prompt]

key-files:
  created:
    - src/lib/offlineQueue.js
    - src/hooks/useOfflineStatus.js
    - src/hooks/useInstallPrompt.js
    - src/components/pwa/OfflineBar.jsx
    - src/components/pwa/InstallBanner.jsx
    - public/icons/icon-192.png
    - public/icons/icon-512.png
    - public/icons/icon-maskable.png
  modified:
    - vite.config.js
    - index.html
    - package.json
    - package-lock.json
    - src/components/Layout.jsx

key-decisions:
  - "VitePWA registerType: 'prompt' for user-controlled service worker updates"
  - "NetworkFirst for Supabase REST with 5s timeout; CacheFirst for storage with 30-day expiration"
  - "Offline queue caps at 500 items with FIFO eviction and 7-day maxAge for stale entries"
  - "Install banner dismissal is per-session (sessionStorage) not permanent"
  - "OfflineBar positioned fixed below header; InstallBanner fixed above mobile bottom nav"

patterns-established:
  - "Offline queue pattern: enqueue mutations in localStorage, processQueue on reconnect"
  - "PWA install lifecycle: beforeinstallprompt capture + session-based dismissal"

requirements-completed: [GAPS #12, GAPS #13, CONCERN #15]

# Metrics
duration: 4min
completed: 2026-05-20
---

# Phase 4 Plan 01: PWA & Offline Support Summary

**VitePWA service worker with cache-first static assets, network-first Supabase API, offline mutation queue, and custom Portuguese install prompt**

## Performance

- **Duration:** 4 min
- **Started:** 2026-05-20T23:49:06Z
- **Completed:** 2026-05-20T23:53:36Z
- **Tasks:** 3
- **Files modified:** 11

## Accomplishments

- VitePWA plugin configured with workbox runtime caching: NetworkFirst for Supabase REST (5s timeout), CacheFirst for Supabase Storage (30-day TTL)
- Offline mutation queue with enqueue/dequeue/processQueue using localStorage, FIFO eviction at 500 items, 7-day maxAge for stale entries
- OfflineBar component shows yellow "Sem conexao" bar when offline, green flash with sync count on reconnect, triggers React Query invalidation
- InstallBanner component with Portuguese text, "Instalar" button, session-based dismissal via sessionStorage
- Both components wired into Layout.jsx: OfflineBar fixed below header, InstallBanner fixed above mobile bottom nav

## Task Commits

Each task was committed atomically:

1. **Task 1: Configure vite-plugin-pwa with manifest and workbox strategies** - `a5dd3fa` (feat)
2. **Task 2: Create offline queue and detection hooks** - `3ee11b7` (feat)
3. **Task 3: Create OfflineBar and InstallBanner components, wire into Layout** - `14cbacf` (feat)

**Plan metadata commit:** pending

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Removed old manifest link from index.html**
- **Found during:** Task 1
- **Issue:** index.html had `<link rel="manifest" href="/manifest.json" />` which would conflict with VitePWA's generated `manifest.webmanifest`
- **Fix:** Removed old manifest link, added `<meta name="theme-color" content="#0F766E" />` instead
- **Files modified:** index.html
- **Commit:** a5dd3fa

**2. [Rule 2 - Missing] Added theme-color meta tag to index.html**
- **Found during:** Task 1
- **Issue:** Plan called for manifest theme_color but index.html also needs a meta theme-color tag for mobile browser chrome
- **Fix:** Added `<meta name="theme-color" content="#0F766E" />` to index.html head
- **Files modified:** index.html
- **Commit:** a5dd3fa

## Manual Verification

**PWA Install:**
1. `npm run build && npm run preview`
2. Visit `http://localhost:4173` in Chrome
3. Check Application tab in DevTools — Service Worker registered, Manifest detected
4. Install icon should appear in address bar (Chrome desktop) or "Add to Home Screen" prompt (mobile)

**Offline Support:**
1. Load the app, then go to Network tab and check "Offline"
2. Yellow offline bar should appear at top
3. Navigate between cached pages — should work
4. Go back online — green "Conexao restaurada" bar with sync count appears briefly
5. Supabase API calls use NetworkFirst (5s timeout before falling back to cache)

**Install Banner (Mobile):**
1. On mobile Chrome/Safari, visit the deployed URL
2. Install banner appears at bottom with "Instalar Lumen" and "Acessar mais rapido pela tela inicial"
3. Tap "Instalar" — PWA install prompt appears
4. Tap "X" — banner dismissed for session (refresh page, banner reappears; reopen tab same session, banner stays hidden)

**Offline Queue:**
1. Go offline, make a transaction
2. Check localStorage for `rattio_*_offlineMutationQueue` key — mutation queued
3. Go online — queue processed, data synced

## Requirements Coverage

| Requirement | Plan | Status |
|-------------|------|--------|
| GAPS #12 | 04-01 | Done |
| GAPS #13 | 04-01 | Done |
| CONCERN #15 | 04-01 | Done |

## Self-Check: PASSED

- All 11 created/modified files verified present
- All 3 task commits verified in git log (a5dd3fa, 3ee11b7, 14cbacf)
- Build passes with PWA artifacts generated (sw.js, manifest.webmanifest, registerSW.js)
- All 190 tests pass with no regressions
