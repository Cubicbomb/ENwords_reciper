# AGENTS.md

This repository is a zero-dependency, browser-only CET4 vocabulary study app. Keep every change compatible with the static web architecture and the existing test-first workflow.

## Project map

- [README.md](README.md): product overview and usage notes.
- [QUICK_START.md](QUICK_START.md): fast local commands.
- [HANDOFF.md](HANDOFF.md): project handoff / status summary.
- [docs/tech-plan.md](docs/tech-plan.md): architecture and design intent.
- [docs/compose/spec/](docs/compose/spec/): compose-next feature specs (one file per feature).
- [index.html](index.html): app entry page.
- [src/main.js](src/main.js): hash routes, startup, global keyboard shortcuts.
- [src/domain](src/domain): pure domain logic (no DOM/IO):
  - [model.js](src/domain/model.js): Word/Deck/Card/Log/Flag types, factories, normalize.
  - [scheduler.js](src/domain/scheduler.js) / [scheduler-fsrs.js](src/domain/scheduler-fsrs.js): SRS grading.
  - [queue.js](src/domain/queue.js): build queue, rate limits, group shuffle (`rng` injectable).
  - [mistakes.js](src/domain/mistakes.js): mistake-book membership (`computeMistakeEntries`).
  - [roots.js](src/domain/roots.js): word-root/affix hints.
- [src/modes](src/modes): question modes + registration (`modes/index.js`).
- [src/store/db.js](src/store/db.js): IndexedDB Promise wrapper (words/decks/cards/logs/flags/meta).
- [src/io](src/io): parse/export/excel import helpers.
- [src/ui](src/ui): `h()` DOM helper, speech/TTS.
- [src/views](src/views): page renderers (home, study, quiz, mistakes, library, import, stats, settings).
- [styles/base.css](styles/base.css): design tokens and base UI.
- [data](data): bundled word lists (`cet4.json`, `cet4_full.json`, `roots.json`).
- [tests](tests): Node `node --test` pure-function suites.
- [tools/bundle.mjs](tools/bundle.mjs): inline app into `dist/index.html`.

## Working rules

- Prefer native ES modules and browser APIs only; no app framework and no build tooling unless explicitly requested.
- Keep edits small and surgical; do not broaden scope without a clear reason.
- Keep model, scheduling, queue, and mistake-book logic pure when possible; validate with Node tests.
- Preserve the existing hash-route flow and IndexedDB-backed data lifecycle unless the task explicitly changes them.
- Avoid adding npm packages, backend services, or new bundling steps.
- Prefer updating the smallest relevant test alongside the fix.
- Mistake-book membership is derived in `domain/mistakes.js`; view code should not reimplement flag/log rules.
- Feature work tracked via compose-next should keep one spec under `docs/compose/spec/<feature>.md`.

## Commands

### Start locally

```bash
python -m http.server 5173
```

Then open http://localhost:5173.

### Run the relevant tests

```bash
node tests/scheduler.test.js && node tests/normalize.test.js && node tests/parse.test.js && node tests/queue.test.js && node tests/modes.test.js && node tests/mistakes.test.js
```

### Build the single-file distribution

```bash
node tools/bundle.mjs
```

## Change guidance

- If the task touches study logic, inspect [src/domain](src/domain) and the matching tests in [tests](tests) first.
- If the task touches storage or imported data, inspect [src/store/db.js](src/store/db.js) and normalization code in [src/domain/model.js](src/domain/model.js).
- If the task touches routing or screens, check [src/main.js](src/main.js) and relevant pages in [src/views](src/views).
- If the task changes question behavior, trace the mode registration in [src/modes/index.js](src/modes/index.js) and the specific mode file involved.
- If the task touches the mistake book or flags, inspect [src/domain/mistakes.js](src/domain/mistakes.js), [src/views/mistakes.js](src/views/mistakes.js), and `flags` keyPath `['wordId','type']` in [src/store/db.js](src/store/db.js).
- If the task changes queue order or randomness, inspect [src/domain/queue.js](src/domain/queue.js) and [tests/queue.test.js](tests/queue.test.js) (`config.rng`).

## Expected agent behavior

1. Read the relevant code and docs before editing.
2. Keep the fix aligned with the browser-only static architecture.
3. Validate with the narrowest relevant Node test command or app-level check.
4. Do not introduce dependencies or structural churn without explicit need.
5. Favor clear, minimal changes over broad refactors.
