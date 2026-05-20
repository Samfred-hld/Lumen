# Phase 04: Polish & Platform - Context

**Gathered:** 2026-05-20
**Status:** Ready for planning

<domain>
## Phase Boundary

The app works offline, can be installed as a PWA, has user profile management, dark mode scheduling, and data backup/restore. Platform capabilities make the app feel complete and production-grade — offline resilience, installability, account management, and accessibility compliance.

</domain>

<decisions>
## Implementation Decisions

### Offline & PWA
- **D-01:** Offline mutation storage: localStorage queue — simple, already used in codebase for other state
- **D-02:** Service worker strategy: cache-first for static assets, network-first for API — standard for financial apps
- **D-03:** PWA install prompt: custom banner in Portuguese matching app design — consistent UX
- **D-04:** Sync conflict resolution: last-write-wins with timestamp — simple, matches current real-time behavior

### Profile & Account
- **D-05:** Dedicated `src/pages/Profile.jsx` with sidebar nav item — clean separation, room to grow
- **D-06:** Account deletion: soft delete with 30-day grace period + confirmation dialog — safe for financial data
- **D-07:** Session display: show active session (device, last active) via Supabase `auth.getSession()`

### Backup/Restore & Dark Mode
- **D-08:** Full JSON backup (all entities) — extend existing TabDados export with import/restore functionality
- **D-09:** Restore validation: schema validation + row count summary before confirm — safe, shows what will change
- **D-10:** Dark mode "Auto": `prefers-color-scheme` media query listener + manual override — standard, zero server cost
- **D-11:** Backup location: local download only (JSON file) — simple, user controls storage

### Environment & Accessibility
- **D-12:** CI: GitHub Actions `.github/workflows/ci.yml` — free for public repos, native to GitHub
- **D-13:** Accessibility audit: Lighthouse in CI (automated) — catches regressions
- **D-14:** `.env.example`: document all `VITE_*` vars with descriptions — standard practice
- **D-15:** Print stylesheet: `@media print` on Reports page only — focused, high-value

### Claude's Discretion
- D-06 soft delete implementation details (Supabase column vs separate table)
- D-12 CI workflow specifics (Node version, caching, job steps)

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Prior Phase Context
- `.planning/phases/02-ui-consolidation/02-CONTEXT.md` — UI patterns (shared components, design tokens, Tailwind CSS)
- `.planning/phases/03-feature-gaps/03-CONTEXT.md` — Feature patterns (React Query, Supabase data access, page structure)

### Codebase (no external specs)
No external specs — requirements fully captured in decisions above.

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `src/components/settings/TabDados.jsx` — Already has JSON export (`handleExportJSON`), CSV export, clear data. Extend with import/restore
- `src/lib/store/settings.js` — Theme persistence (`getTheme`, `setTheme`) — extend with "auto" option
- `src/lib/AuthContext.jsx` — Supabase Auth with `signInWithPassword`, `signUp`, `signOut`, `resetPasswordForEmail`, `updateUser({ password })` — add email update, account deletion
- `src/components/Layout.jsx` — Sidebar with theme toggle — add Profile nav item
- `src/pages/Settings.jsx` — Has dark mode switch — extend with "Automático (sistema)" option

### Established Patterns
- State management: TanStack React Query v5 + React Context
- Styling: Tailwind CSS 3 with design tokens (CSS custom properties)
- Auth: Supabase Auth via `src/lib/AuthContext.jsx`
- Data access: `supabase.from(table).select/insert/update/delete`
- Build: Vite 6 (no PWA plugin currently)
- Theme: `data-theme` attribute on `<html>` + `.dark` class toggle

### Integration Points
- `vite.config.js` — Add `vite-plugin-pwa` plugin
- `src/components/Layout.jsx:348` — Theme toggle button (extend with auto option)
- `src/pages/Settings.jsx:134` — Dark mode switch (extend with 3-state)
- `src/components/settings/TabDados.jsx` — Export functions (add import)
- `src/lib/AuthContext.jsx` — Auth functions (add email update, account deletion)
- `public/` — PWA icons and manifest

</code_context>

<specifics>
## Specific Ideas

No specific requirements — open to standard approaches. User confirmed all recommended options.

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope.

</deferred>
