# Phase 4: Polish & Platform - Research

**Researched:** 2026-05-20
**Domain:** PWA, offline-first, Supabase Auth account management, backup/restore, dark mode scheduling, accessibility
**Confidence:** HIGH

## Summary

Phase 4 adds platform capabilities that make Lumen feel production-grade: PWA installability with offline support, user profile management (password change, email update, account deletion), full data backup/restore, dark mode scheduling, CI pipeline, accessibility audit, and print stylesheet.

The core technical challenge is the PWA + offline-first layer. `vite-plugin-pwa` (v1.3.0) handles manifest generation and service worker creation via Workbox. The recommended strategy is cache-first for static assets (JS/CSS/images) and network-first for Supabase API calls, with a localStorage-based offline mutation queue for write operations. Account deletion requires a Supabase Edge Function because `auth.admin.deleteUser()` needs the `service_role` key (never exposed to the client).

**Primary recommendation:** Use `vite-plugin-pwa` with `generateSW` strategy, `registerType: 'prompt'` for update UX, and a custom `offlineQueue.js` for mutation persistence. Extend existing `TabDados.jsx` export for backup/restore rather than building a new module.

---

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions
- **D-01:** Offline mutation storage: localStorage queue — simple, already used in codebase for other state
- **D-02:** Service worker strategy: cache-first for static assets, network-first for API — standard for financial apps
- **D-03:** PWA install prompt: custom banner in Portuguese matching app design — consistent UX
- **D-04:** Sync conflict resolution: last-write-wins with timestamp — simple, matches current real-time behavior
- **D-05:** Dedicated `src/pages/Profile.jsx` with sidebar nav item — clean separation, room to grow
- **D-06:** Account deletion: soft delete with 30-day grace period + confirmation dialog — safe for financial data
- **D-07:** Session display: show active session (device, last active) via Supabase `auth.getSession()`
- **D-08:** Full JSON backup (all entities) — extend existing TabDados export with import/restore functionality
- **D-09:** Restore validation: schema validation + row count summary before confirm — safe, shows what will change
- **D-10:** Dark mode "Auto": `prefers-color-scheme` media query listener + manual override — standard, zero server cost
- **D-11:** Backup location: local download only (JSON file) — simple, user controls storage
- **D-12:** CI: GitHub Actions `.github/workflows/ci.yml` — free for public repos, native to GitHub
- **D-13:** Accessibility audit: Lighthouse in CI (automated) — catches regressions
- **D-14:** `.env.example`: document all `VITE_*` vars with descriptions — standard practice
- **D-15:** Print stylesheet: `@media print` on Reports page only — focused, high-value

### Claude's Discretion
- D-06 soft delete implementation details (Supabase column vs separate table)
- D-12 CI workflow specifics (Node version, caching, job steps)

### Deferred Ideas (OUT OF SCOPE)
None — discussion stayed within phase scope.
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| CONCERN #14 | Large files — split across phases | Profile.jsx is new, not a refactor of existing large files. BackupSection extends TabDados. |
| CONCERN #15 | localStorage schema without versioning | offlineQueue.js adds versioned localStorage keys with `LS_PREFIX` pattern from helpers.js |
| CONCERN #16 | CSS size (941 lines) | Print stylesheet adds `@media print` block to index.css — marginal increase |
| CONCERN #17-24 | Various low UI concerns | Addressed opportunistically across all new components |
| CONCERN A | PageNotFound mixed language | Fixed by replacing hardcoded English text with Portuguese |
| CONCERN B | No .env.example | Already exists (created in Phase 0). D-14 ensures it's documented. |
| CONCERN C | Mixed language in error pages | Fix Portuguese copy in 404/error states |
| GAPS #8 | Data backup/restore (P1) | Extend TabDados.jsx with import/restore, validate JSON schema before import |
| GAPS #12 | Offline-first capability (P2) | vite-plugin-pwa + localStorage queue + service worker strategies |
| GAPS #13 | PWA support (P2) | vite-plugin-pwa manifest + service worker + install prompt |
| GAPS #14 | User profile management (P2) | New Profile.jsx with Supabase Auth updateUser + Edge Function for deletion |
| GAPS #15 | Deployment config (P2) | Already handled in Phase 0. D-14 documents .env.example. |
| GAPS #16 | Dark mode scheduling (P3) | extends settings.js with 'auto' value + prefers-color-scheme listener |
| GAPS #17 | Accessibility audit (P3) | Lighthouse CI + axe-core automated checks |
| GAPS #21 | Printable reports (P3) | @media print stylesheet on Reports page |
</phase_requirements>

## Architectural Responsibility Map

| Capability | Primary Tier | Secondary Tier | Rationale |
|------------|-------------|----------------|-----------|
| PWA manifest & service worker | Browser / Client | CDN / Static | Service worker runs in browser; manifest served as static asset |
| Offline mutation queue | Browser / Client | — | localStorage-based queue, synced when online |
| Install prompt | Browser / Client | — | `beforeinstallprompt` event is browser-only |
| User profile (email/password) | API / Backend | Browser / Client | Supabase Auth methods called from client, validated server-side |
| Account deletion | API / Backend | — | Requires service_role key via Edge Function |
| Backup/restore | Browser / Client | API / Backend | Export is client-side; restore writes to Supabase |
| Dark mode scheduling | Browser / Client | — | `prefers-color-scheme` media query is browser-only |
| CI pipeline | CDN / Static | — | GitHub Actions runs on push, no runtime involvement |
| Print stylesheet | Browser / Client | — | @media print is CSS-only, browser-rendered |
| Accessibility audit | CDN / Static | — | Lighthouse runs in CI, not at runtime |

## Standard Stack

### Core

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| vite-plugin-pwa | 1.3.0 | PWA plugin for Vite (manifest, service worker, workbox) | Official Vite PWA solution, uses workbox-build under the hood. [VERIFIED: npm registry] |
| @supabase/supabase-js | ^2.106.0 | Auth methods (updateUser, getSession) | Already in project. [VERIFIED: npm registry] |

### Supporting

| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| workbox-window | 7.4.1 | Service worker registration in browser | Bundled with vite-plugin-pwa, used for SW lifecycle events [VERIFIED: npm registry] |
| zod | ^3.24.2 | JSON schema validation for backup restore | Already in project — validate backup file structure [VERIFIED: npm registry] |

### Alternatives Considered

| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| vite-plugin-pwa | Manual service worker + manifest | vite-plugin-pwa handles precache manifest generation, workbox integration, and dev-mode testing — manual approach requires 10x more code |
| localStorage offline queue | IndexedDB | localStorage is simpler, already used in codebase, sufficient for transaction queue size. IndexedDB adds complexity for marginal benefit. |
| Supabase Edge Function for delete | Client-side deleteUser call | Supabase client SDK has no `deleteUser()` method — it requires `auth.admin.deleteUser()` with service_role key [CITED: supabase.com/docs/reference/javascript/auth-admin-deleteuser] |

**Installation:**
```bash
npm install -D vite-plugin-pwa
```

## Package Legitimacy Audit

> slopcheck was available at research time.

| Package | Registry | Age | Downloads | Source Repo | slopcheck | Disposition |
|---------|----------|-----|-----------|-------------|-----------|-------------|
| vite-plugin-pwa | npm | ~4 yrs | high | github.com/vite-pwa/vite-plugin-pwa | [OK] | Approved |

**Packages removed due to slopcheck [SLOP] verdict:** none
**Packages flagged as suspicious [SUS]:** none

*Only one new package is needed. All other dependencies are already in the project.*

## Architecture Patterns

### System Architecture Diagram

```
Browser (Client Tier)
├── beforeinstallprompt event
│   └── InstallBanner component (custom pt-BR prompt)
│
├── Service Worker (vite-plugin-pwa / Workbox)
│   ├── Precache: static assets (JS, CSS, images, fonts)
│   ├── Runtime Cache (CacheFirst): Supabase CDN assets
│   └── Runtime Cache (NetworkFirst): Supabase REST API
│       └── On network failure → return cached response
│
├── Offline Mutation Queue (localStorage)
│   ├── Queue writes when navigator.onLine === false
│   ├── On 'online' event → process queue sequentially
│   └── Last-write-wins with timestamp (D-04)
│
├── Theme Manager (useThemePreference hook)
│   ├── Reads preference: 'light' | 'dark' | 'auto'
│   ├── If 'auto' → listen to matchMedia('(prefers-color-scheme: dark)')
│   └── Apply data-theme + .dark class on <html>
│
├── Backup/Restore (backupRestore.js)
│   ├── Export: JSON.stringify(all entities) → Blob → download
│   └── Import: FileReader → JSON.parse → zod validate → batch insert
│
└── Profile Page (Profile.jsx)
    ├── Password change → supabase.auth.updateUser({ password })
    ├── Email update → supabase.auth.updateUser({ email })
    ├── Session display → supabase.auth.getSession()
    └── Account deletion → supabase.functions.invoke('delete-account')

API / Backend Tier
├── Supabase Auth (existing)
│   ├── updateUser({ email }) — client-side
│   ├── updateUser({ password }) — client-side (already in AuthContext)
│   └── getSession() — client-side
│
└── Supabase Edge Function: delete-account
    ├── Receives JWT, validates user
    ├── Calls auth.admin.deleteUser(id, true) for soft delete
    └── Returns success/failure
```

### Recommended Project Structure

```
src/
├── components/
│   ├── pwa/
│   │   ├── InstallBanner.jsx     # Custom PWA install prompt
│   │   ├── OfflineBar.jsx        # Offline status indicator
│   │   └── SyncStatus.jsx        # Queue sync indicator
│   ├── profile/
│   │   ├── ProfileSection.jsx    # Reusable section wrapper
│   │   ├── PasswordChangeForm.jsx
│   │   ├── EmailUpdateForm.jsx
│   │   ├── AccountDeletionDialog.jsx
│   │   └── SessionDisplay.jsx
│   └── settings/
│       ├── BackupSection.jsx     # Extends TabDados with import
│       ├── RestoreConfirmDialog.jsx
│       └── ThemeSelector.jsx     # 3-state theme switch
├── hooks/
│   ├── useOfflineStatus.js       # navigator.onLine + events
│   ├── useInstallPrompt.js       # beforeinstallprompt state
│   └── useThemePreference.js     # 3-state theme management
├── lib/
│   ├── offlineQueue.js           # localStorage mutation queue
│   ├── pwaEvents.js              # beforeinstallprompt handler
│   └── backupRestore.js          # JSON export/import + validation
├── pages/
│   └── Profile.jsx               # User profile + account management
public/
├── manifest.json                 # PWA manifest (or generated by plugin)
├── icons/
│   ├── icon-192.png
│   ├── icon-512.png
│   └── icon-maskable.png
.github/
└── workflows/
    └── ci.yml                    # GitHub Actions CI
```

### Pattern 1: vite-plugin-pwa Configuration

**What:** Configure VitePWA plugin with manifest, workbox strategies, and dev options
**When to use:** In `vite.config.js` — the single integration point for PWA
**Example:**
```js
// Source: https://vite-pwa-org.netlify.app/guide/
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'prompt',
      devOptions: { enabled: true },
      manifest: {
        name: 'Lúmen — Gestão Financeira',
        short_name: 'Lúmen',
        description: 'Controle financeiro pessoal para brasileiros',
        theme_color: '#0F766E',
        background_color: '#FFFFFF',
        display: 'standalone',
        start_url: '/',
        scope: '/',
        icons: [
          { src: 'icons/icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: 'icons/icon-512.png', sizes: '512x512', type: 'image/png' },
          { src: 'icons/icon-maskable.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' }
        ]
      },
      workbox: {
        runtimeCaching: [
          {
            urlPattern: /^https:\/\/.*\.supabase\.co\/rest\/.*/i,
            handler: 'NetworkFirst',
            options: {
              cacheName: 'supabase-api-cache',
              networkTimeoutSeconds: 5,
              expiration: { maxEntries: 100, maxAgeSeconds: 60 * 60 * 24 },
              cacheableResponse: { statuses: [0, 200] }
            }
          },
          {
            urlPattern: /^https:\/\/.*\.supabase\.co\/storage\/.*/i,
            handler: 'CacheFirst',
            options: {
              cacheName: 'supabase-storage-cache',
              expiration: { maxEntries: 50, maxAgeSeconds: 60 * 60 * 24 * 30 },
              cacheableResponse: { statuses: [0, 200] }
            }
          }
        ]
      }
    })
  ]
})
```

### Pattern 2: Offline Mutation Queue

**What:** localStorage-based queue that stores write operations when offline and replays them when connectivity returns
**When to use:** For all Supabase `.insert()`, `.update()`, `.delete()` calls
**Example:**
```js
// src/lib/offlineQueue.js
import { getPrefix } from './store/helpers'

const QUEUE_KEY = 'offlineMutationQueue'

export function enqueue(mutation) {
  const queue = getQueue()
  queue.push({
    ...mutation,
    timestamp: Date.now(),
    id: crypto.randomUUID()
  })
  localStorage.setItem(getPrefix() + QUEUE_KEY, JSON.stringify(queue))
}

export function getQueue() {
  try {
    return JSON.parse(localStorage.getItem(getPrefix() + QUEUE_KEY) || '[]')
  } catch { return [] }
}

export function dequeue(id) {
  const queue = getQueue().filter(m => m.id !== id)
  localStorage.setItem(getPrefix() + QUEUE_KEY, JSON.stringify(queue))
}

export async function processQueue(supabaseClient) {
  const queue = getQueue()
  for (const mutation of queue) {
    try {
      const table = supabaseClient.from(mutation.table)
      if (mutation.action === 'insert') await table.insert(mutation.data)
      else if (mutation.action === 'update') await table.update(mutation.data).eq('id', mutation.data.id)
      else if (mutation.action === 'delete') await table.delete().eq('id', mutation.data.id)
      dequeue(mutation.id)
    } catch (err) {
      console.error('[OfflineQueue] Sync failed for mutation:', mutation.id, err)
      break // stop processing on first failure
    }
  }
}
```

### Pattern 3: Supabase Auth Account Management

**What:** Client-side email/password update + server-side account deletion via Edge Function
**When to use:** In Profile.jsx and AuthContext.jsx
**Example:**
```js
// Extend AuthContext.jsx — add these methods:

// Email update (client-side — Supabase sends confirmation to new email)
const updateEmail = async (newEmail) => {
  const { data, error } = await supabase.auth.updateUser({ email: newEmail })
  if (error) throw error
  return data
}

// Account deletion (requires Edge Function with service_role key)
const deleteAccount = async () => {
  const { data: { session } } = await supabase.auth.getSession()
  const { error } = await supabase.functions.invoke('delete-account', {
    headers: { Authorization: `Bearer ${session.access_token}` }
  })
  if (error) throw error
  await logout()
}
```

```ts
// supabase/functions/delete-account/index.ts
import { serve } from 'https://deno.land/std@0.177.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

serve(async (req) => {
  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  )

  // Get user from JWT
  const authHeader = req.headers.get('Authorization')!
  const token = authHeader.replace('Bearer ', '')
  const { data: { user }, error: authError } = await supabase.auth.getUser(token)
  if (authError || !user) return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 })

  // Soft delete — 30-day grace period (D-06)
  const { error } = await supabase.auth.admin.deleteUser(user.id, true)
  if (error) return new Response(JSON.stringify({ error: error.message }), { status: 500 })

  return new Response(JSON.stringify({ success: true }), { status: 200 })
})
```

### Pattern 4: Theme Preference Hook

**What:** 3-state theme management (light/dark/auto) with prefers-color-scheme listener
**When to use:** Replace existing 2-state theme toggle
**Example:**
```js
// src/hooks/useThemePreference.js
import { useState, useEffect, useCallback } from 'react'
import { getTheme, setTheme as storeSetTheme } from '@/lib/store'

export function useThemePreference() {
  const [preference, setPreference] = useState(() => getTheme() || 'light')

  const applyTheme = useCallback((pref) => {
    const isDark = pref === 'dark' ||
      (pref === 'auto' && window.matchMedia('(prefers-color-scheme: dark)').matches)

    document.documentElement.setAttribute('data-theme', isDark ? 'dark' : 'light')
    document.documentElement.classList.toggle('dark', isDark)
    storeSetTheme(pref)
  }, [])

  useEffect(() => {
    applyTheme(preference)

    if (preference === 'auto') {
      const mq = window.matchMedia('(prefers-color-scheme: dark)')
      const handler = (e) => applyTheme(e.matches ? 'dark' : 'light')
      mq.addEventListener('change', handler)
      return () => mq.removeEventListener('change', handler)
    }
  }, [preference, applyTheme])

  return { preference, setPreference }
}
```

### Anti-Patterns to Avoid

- **Don't use `registerType: 'autoUpdate'` for a financial app:** Silent updates can interrupt form input. Use `'prompt'` to let users control when to update. [CITED: vite-pwa-org.netlify.app/guide/service-worker-strategies-and-behaviors]
- **Don't expose `service_role` key in client code:** Account deletion MUST go through an Edge Function. The Supabase docs explicitly warn: "This function should only be called on a server." [CITED: supabase.com/docs/reference/javascript/auth-admin-deleteuser]
- **Don't use `auth.role()` in RLS policies:** It's deprecated. Use `TO authenticated` clause instead. [CITED: supabase skill]
- **Don't hand-roll service worker precaching:** vite-plugin-pwa generates the precache manifest automatically via workbox-build. Manual precache lists become stale immediately.
- **Don't queue reads in the offline queue:** Only mutations (insert/update/delete) need queuing. Reads should fall back to the service worker's NetworkFirst cache.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| PWA manifest & SW | Manual manifest.json + service-worker.js | vite-plugin-pwa | Auto-generates precache manifest, handles workbox integration, dev-mode testing |
| Service worker strategies | Custom fetch interception | Workbox runtimeCaching config | Handles edge cases (opaque responses, cache expiration, background sync) |
| JSON schema validation | Manual property checking | zod | Already in project, type-safe, composable schemas |
| prefers-color-scheme listener | Manual window.matchMedia polling | matchMedia 'change' event | Standard API, fires only on actual change |
| Account deletion | Client-side deleteUser call | Supabase Edge Function | Requires service_role key, cannot be done client-side |

**Key insight:** The PWA/offline layer has dozens of edge cases (opaque responses, cache expiration, background sync, update prompts). Workbox handles all of these. The one new package (`vite-plugin-pwa`) replaces what would be hundreds of lines of manual service worker code.

## Common Pitfalls

### Pitfall 1: Service Worker Caching Stale API Data
**What goes wrong:** Users see outdated financial data because the service worker caches API responses too aggressively
**Why it happens:** Using CacheFirst strategy for Supabase REST API calls
**How to avoid:** Use NetworkFirst for all API calls with a 5-second timeout. Only use CacheFirst for static assets (JS, CSS, images). [CITED: developer.chrome.com/docs/workbox/modules/workbox-strategies]
**Warning signs:** Users report "my balance is wrong" or "I added a transaction but it disappeared"

### Pitfall 2: Offline Queue Growing Unbounded
**What goes wrong:** localStorage fills up with unsynced mutations over weeks of offline usage
**Why it happens:** No queue size limit, no expiration on queued items
**How to avoid:** Cap queue at 500 items. Add a `maxAge` of 7 days. Show a warning when queue exceeds 100 items. [ASSUMED — reasonable limit for financial app]
**Warning signs:** localStorage quota errors, slow app startup

### Pitfall 3: Account Deletion Without Edge Function
**What goes wrong:** Developer tries to call `supabase.auth.admin.deleteUser()` from the client
**Why it happens:** Confusing API — `updateUser` is client-side but `admin.deleteUser` is server-only
**How to avoid:** Always use an Edge Function for account deletion. The service_role key must never be in client code. [CITED: supabase.com/docs/reference/javascript/auth-admin-deleteuser]
**Warning signs:** 403 errors, service_role key exposed in browser DevTools

### Pitfall 4: Theme Flash on Load (FOUC)
**What goes wrong:** Brief flash of wrong theme when page loads before JavaScript executes
**Why it happens:** Theme preference is in localStorage but applied by React after hydration
**How to avoid:** Add an inline `<script>` in `index.html` that reads localStorage and sets `data-theme` + `.dark` class before React mounts. [ASSUMED — standard pattern for theme FOUC prevention]
**Warning signs:** White flash on dark-mode users, or dark flash on light-mode users

### Pitfall 5: PWA Install Prompt Not Firing
**What goes wrong:** `beforeinstallprompt` event never fires on mobile
**Why it happens:** Chrome requires several heuristics: HTTPS, valid manifest, service worker registered, user engagement. Missing any one prevents the prompt.
**How to avoid:** Ensure manifest has all required fields (name, icons at 192 and 512, theme_color, display). Test with Lighthouse PWA audit. Use `devOptions: { enabled: true }` during development. [CITED: vite-pwa-org.netlify.app/guide/pwa-minimal-requirements]
**Warning signs:** Lighthouse PWA audit shows failures, no install prompt appears after multiple visits

### Pitfall 6: Backup Restore Overwrites Without Confirmation
**What goes wrong:** User accidentally restores an old backup, losing recent data
**Why it happens:** No validation or confirmation before batch import
**How to avoid:** Show row count summary before import ("N transações, N orçamentos, N metas"). Require explicit confirmation. Validate JSON schema with zod. [CITED: CONTEXT.md D-09]
**Warning signs:** User reports data loss after restore

## Code Examples

Verified patterns from official sources:

### vite-plugin-pwa with NetworkFirst for API
```js
// Source: https://vite-pwa-org.netlify.app/workbox/generate-sw
VitePWA({
  registerType: 'prompt',
  workbox: {
    runtimeCaching: [{
      urlPattern: /^https:\/\/.*\.supabase\.co\/rest\/.*/i,
      handler: 'NetworkFirst',
      options: {
        cacheName: 'supabase-api-cache',
        networkTimeoutSeconds: 5,
        cacheableResponse: { statuses: [0, 200] }
      }
    }]
  }
})
```

### Supabase updateUser for email
```js
// Source: https://supabase.com/docs/reference/javascript/auth-updateuser
const { data, error } = await supabase.auth.updateUser({ email: 'new@email.com' })
// Supabase sends confirmation email to new address
// Email is not changed until user clicks confirmation link
```

### Supabase updateUser for password
```js
// Source: Already in src/lib/AuthContext.jsx
const { data, error } = await supabase.auth.updateUser({ password: 'new-password' })
```

### Supabase Edge Function invocation
```js
// Source: https://supabase.com/docs/guides/functions/quickstart
const { data, error } = await supabase.functions.invoke('delete-account', {
  body: {},
  headers: { Authorization: `Bearer ${session.access_token}` }
})
```

### prefers-color-scheme listener
```js
// Source: MDN Web APIs (standard)
const mq = window.matchMedia('(prefers-color-scheme: dark)')
mq.addEventListener('change', (e) => {
  if (e.matches) applyDarkTheme()
  else applyLightTheme()
})
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Manual service worker | vite-plugin-pwa + workbox | vite-plugin-pwa v1.0 (2022) | Eliminates hundreds of lines of manual SW code |
| appCache manifest | Service Worker API | Deprecated in all browsers | No fallback to appCache needed |
| localStorage theme only | prefers-color-scheme + override | CSS media query standard | Zero server cost, automatic scheduling |

**Deprecated/outdated:**
- `auth.role()` in Supabase RLS policies: Deprecated in favor of `TO authenticated` clause. [CITED: supabase skill]
- `window.ononline`/`onoffline` as strings: Use `addEventListener('online', ...)` instead. [ASSUMED — standard DOM API]

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| A1 | Offline queue cap at 500 items is sufficient | Common Pitfalls | Users with very long offline periods may lose oldest queued mutations |
| A2 | 7-day maxAge for queued items is reasonable | Common Pitfalls | Stale mutations may replay after long offline period |
| A3 | Inline script in index.html prevents theme FOUC | Common Pitfalls | Users may see brief theme flash on every page load |
| A4 | `registerType: 'prompt'` is better than `'autoUpdate'` for financial apps | Anti-Patterns | Users may prefer silent updates; this is a UX preference |
| A5 | Edge Function `delete-account` uses Deno runtime | Architecture Patterns | Supabase Edge Functions runtime may have changed |

## Open Questions

1. **Supabase soft delete behavior**
   - What we know: `auth.admin.deleteUser(id, true)` performs soft delete from auth schema
   - What's unclear: Whether soft-deleted users can still log in during the 30-day grace period, and how to implement the grace period UI
   - Recommendation: Test soft delete behavior in development. May need a separate `user_configs` flag to block login while auth record persists.

2. **Offline queue replay order**
   - What we know: Queue is FIFO (array-based)
   - What's unclear: Whether out-of-order replay causes data integrity issues (e.g., update before insert)
   - Recommendation: Queue operations with their table + action + data. On replay, skip updates/deletes for entities that don't exist yet (already deleted or never synced).

3. **PWA icon generation**
   - What we know: Need 192x192, 512x512, and maskable variants
   - What's unclear: Whether user has source artwork at sufficient resolution
   - Recommendation: Use existing `logo.png` in `public/` as source. Generate variants with sharp or online tool.

## Environment Availability

| Dependency | Required By | Available | Version | Fallback |
|------------|------------|-----------|---------|----------|
| Node.js | Build toolchain | ✓ | v24.14.0 | — |
| npm | Package manager | ✓ | 11.14.1 | — |
| Supabase CLI | Edge Function deploy | ✗ | — | Deploy via Supabase Dashboard UI |
| Docker | Local Edge Function testing | ? | — | Skip local testing, deploy directly |
| Vite | Build | ✓ | ^6.1.0 | — |
| Vitest | Testing | ✓ | ^4.1.6 | — |

**Missing dependencies with no fallback:**
- None — all critical tools are available

**Missing dependencies with fallback:**
- Supabase CLI: Not installed. Edge Functions can be deployed via the Supabase Dashboard. For local testing, install CLI or skip local function testing.

## Validation Architecture

### Test Framework

| Property | Value |
|----------|-------|
| Framework | Vitest ^4.1.6 + @testing-library/react ^16.3.2 |
| Config file | `vitest.config.js` (exists) |
| Quick run command | `npm test` |
| Full suite command | `npm run test:coverage` |

### Phase Requirements to Test Map

| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| GAPS #8 | Backup export produces valid JSON with all entities | unit | `npm test -- backupRestore.test.js` | ❌ Wave 0 |
| GAPS #8 | Restore validates schema and shows row counts | unit | `npm test -- backupRestore.test.js` | ❌ Wave 0 |
| GAPS #12 | Offline queue enqueues/dequeues mutations | unit | `npm test -- offlineQueue.test.js` | ❌ Wave 0 |
| GAPS #12 | Queue processes on 'online' event | integration | `npm test -- offlineQueue.test.js` | ❌ Wave 0 |
| GAPS #13 | PWA manifest has required fields | smoke | `npm test -- pwa.test.js` | ❌ Wave 0 |
| GAPS #14 | Profile renders email update form | unit | `npm test -- Profile.test.jsx` | ❌ Wave 0 |
| GAPS #16 | Theme selector toggles between 3 states | unit | `npm test -- useThemePreference.test.js` | ❌ Wave 0 |
| GAPS #17 | Accessibility audit passes | manual | Lighthouse CI in GitHub Actions | ❌ Wave 0 |
| GAPS #21 | Print stylesheet hides sidebar/nav | visual | Manual check in print preview | manual-only |

### Sampling Rate
- **Per task commit:** `npm test`
- **Per wave merge:** `npm run test:coverage`
- **Phase gate:** Full suite green before `/gsd:verify-work`

### Wave 0 Gaps
- [ ] `src/lib/__tests__/offlineQueue.test.js` — covers GAPS #12
- [ ] `src/lib/__tests__/backupRestore.test.js` — covers GAPS #8
- [ ] `src/hooks/__tests__/useThemePreference.test.js` — covers GAPS #16
- [ ] `src/components/profile/__tests__/Profile.test.jsx` — covers GAPS #14

## Security Domain

### Applicable ASVS Categories

| ASVS Category | Applies | Standard Control |
|---------------|---------|-----------------|
| V2 Authentication | yes | Supabase Auth — updateUser for email/password, Edge Function for deletion |
| V3 Session Management | yes | supabase.auth.getSession() for session display, signOut() for logout |
| V4 Access Control | yes | RLS policies on all tables (already in place from Phase 0) |
| V5 Input Validation | yes | zod for backup restore JSON validation, form validation with react-hook-form |
| V6 Cryptography | no | Supabase handles JWT and password hashing internally |

### Known Threat Patterns for PWA + Supabase

| Pattern | STRIDE | Standard Mitigation |
|---------|--------|---------------------|
| Service worker serves stale auth tokens | Elevation of Privilege | NetworkFirst for API calls, short JWT expiry |
| Offline queue replayed with stale data | Tampering | Last-write-wins with timestamp, skip stale mutations |
| Backup file contains sensitive data | Information Disclosure | Backup is local download only (D-11), no cloud upload |
| Account deletion without confirmation | Denial of Service | Confirmation dialog + password re-entry (D-06) |
| service_role key exposed in client | Elevation of Privilege | Edge Function for deletion, never expose service_role [CITED: supabase skill] |
| updateEmail sends to wrong address | Spoofing | Supabase sends confirmation to new email, user must click link |

## Sources

### Primary (HIGH confidence)
- https://vite-pwa-org.netlify.app/guide/ — vite-plugin-pwa configuration, manifest, workbox
- https://vite-pwa-org.netlify.app/workbox/generate-sw — runtimeCaching with CacheFirst, NetworkOnly
- https://developer.chrome.com/docs/workbox/modules/workbox-strategies — NetworkFirst, StaleWhileRevalidate strategies
- https://supabase.com/docs/reference/javascript/auth-admin-deleteuser — admin deleteUser with soft delete
- https://supabase.com/docs/reference/javascript/auth-updateuser — updateUser for email/password
- https://supabase.com/docs/guides/functions/quickstart — Edge Function creation, deployment, client invocation

### Secondary (MEDIUM confidence)
- Supabase skill (`.claude/skills/supabase/SKILL.md`) — RLS security checklist, auth best practices
- vite-plugin-pwa npm registry — version 1.3.0 confirmed

### Tertiary (LOW confidence)
- Assumptions about offline queue limits (500 items, 7-day maxAge) — based on training data, not verified against specific benchmarks
- Theme FOUC prevention via inline script — standard pattern but not verified against current browser behavior

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — vite-plugin-pwa version verified on npm, Supabase auth methods verified via official docs
- Architecture: HIGH — patterns follow official documentation and established PWA best practices
- Pitfalls: MEDIUM — most pitfalls from official docs, queue limits are assumptions

**Research date:** 2026-05-20
**Valid until:** 2026-06-20 (30 days — PWA and Supabase Auth are stable APIs)
