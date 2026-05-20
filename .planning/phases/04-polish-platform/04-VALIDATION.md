---
phase: 4
slug: polish-platform
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-05-20
---

# Phase 4 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | Vitest ^4.1.6 + @testing-library/react ^16.3.2 |
| **Config file** | `vitest.config.js` (exists) |
| **Quick run command** | `npm test` |
| **Full suite command** | `npm run test:coverage` |
| **Estimated runtime** | ~15 seconds |

---

## Sampling Rate

- **After every task commit:** Run `npm test`
- **After every plan wave:** Run `npm run test:coverage`
- **Before `/gsd:verify-work`:** Full suite must be green
- **Max feedback latency:** 15 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Threat Ref | Secure Behavior | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|------------|-----------------|-----------|-------------------|-------------|--------|
| 04-01-01 | 01 | 1 | GAPS #13 | T-04-01 | PWA manifest has required fields | smoke | `npm test -- pwa.test.js` | ❌ W0 | ⬜ pending |
| 04-02-01 | 02 | 1 | GAPS #12 | T-04-02 | Offline queue enqueues/dequeues mutations | unit | `npm test -- offlineQueue.test.js` | ❌ W0 | ⬜ pending |
| 04-02-02 | 02 | 1 | GAPS #12 | T-04-02 | Queue processes on 'online' event | integration | `npm test -- offlineQueue.test.js` | ❌ W0 | ⬜ pending |
| 04-03-01 | 03 | 1 | GAPS #14 | T-04-03 | Profile renders email update form | unit | `npm test -- Profile.test.jsx` | ❌ W0 | ⬜ pending |
| 04-04-01 | 04 | 2 | GAPS #8 | T-04-04 | Backup export produces valid JSON with all entities | unit | `npm test -- backupRestore.test.js` | ❌ W0 | ⬜ pending |
| 04-04-02 | 04 | 2 | GAPS #8 | T-04-04 | Restore validates schema and shows row counts | unit | `npm test -- backupRestore.test.js` | ❌ W0 | ⬜ pending |
| 04-05-01 | 05 | 2 | GAPS #16 | T-04-05 | Theme selector toggles between 3 states | unit | `npm test -- useThemePreference.test.js` | ❌ W0 | ⬜ pending |
| 04-06-01 | 06 | 2 | GAPS #17 | T-04-06 | Accessibility audit passes | manual | Lighthouse CI in GitHub Actions | ❌ W0 | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] `src/lib/__tests__/offlineQueue.test.js` — covers GAPS #12
- [ ] `src/lib/__tests__/backupRestore.test.js` — covers GAPS #8
- [ ] `src/hooks/__tests__/useThemePreference.test.js` — covers GAPS #16
- [ ] `src/components/profile/__tests__/Profile.test.jsx` — covers GAPS #14
- [ ] `src/__tests__/pwa.test.js` — covers GAPS #13

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Print stylesheet hides sidebar/nav | GAPS #21 | Visual verification in print preview | Open Reports page, Ctrl+P, verify sidebar hidden |
| PWA install prompt appears on mobile | GAPS #13 | Requires mobile device or emulator | Open app on mobile Chrome, verify install banner |
| Offline queue syncs on reconnect | GAPS #12 | Requires network toggle | Disconnect network, add transaction, reconnect, verify sync |

---

## Security Domain

### Applicable ASVS Categories

| ASVS Category | Applies | Standard Control |
|---------------|---------|-----------------|
| V2 Authentication | yes | Supabase Auth — updateUser for email/password, Edge Function for deletion |
| V3 Session Management | yes | supabase.auth.getSession() for session display, signOut() for logout |
| V4 Access Control | yes | RLS policies on all tables (already in place from Phase 0) |
| V5 Input Validation | yes | zod for backup restore JSON validation, form validation with react-hook-form |
| V6 Cryptography | no | Supabase handles JWT and password hashing internally |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 15s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
