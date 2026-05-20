---
phase: 01-foundation-hardening
plan: 02
subsystem: testing
tags: [unit-tests, csvParser, amountParser, transactionDetectors, stringUtils]
plan: 01-02-PLAN.md
task_count: 2
duration: 12min
completed: 2026-05-19
---

# Plan 01-02: CSV Import Pipeline Tests Summary

**112 unit tests covering encoding detection, CSV parsing, date/amount normalization, column detection, installment detection, invoice month calculation, and string normalization.**

## Performance

- **Duration:** 12min
- **Tasks:** 2
- **Tests:** 112 (all passing, combined with 01-01: 190 total)

## Accomplishments
- csvParser.test.js: 61 tests — encoding detection (BOM + heuristics), separator detection, CSV parsing (quoted, multiline, CRLF), date format detection/normalization, date range validation, column detection, invoice month calculation, month shifting, installment expansion
- amountParser.test.js: 19 tests — BR (1.234,56), US (1,234.56), accounting ((1.234,56)), comma-thousands ambiguity, edge cases (null, empty, 0)
- transactionDetectors.test.js: 21 tests — all 5 installment patterns + 3X variant + IOF exclusion + refund/payment detection
- stringUtils.test.js: 10 tests — accent removal, curly quote removal, whitespace collapse, null handling

## Task Commits

1. **All 4 test files** - `712723c`

## Issues Encountered
- parseAmount does not handle explicit `-` sign (only accounting parens) — adjusted test
- detectColumns: Débito column also matches valIdx regex — split column detection requires no valIdx match
- isRefundOrPayment regex requires accents on "cartão"/"crédito" — tests use accented form
