# AGENTS.md

This repository is a zero-dependency, browser-only CET4 vocabulary study app. Keep every change compatible with the static web architecture and the existing test-first workflow.

## Project map

- [README.md](README.md): product overview and usage notes.
- [QUICK_START.md](QUICK_START.md): fast local commands.
- [docs/tech-plan.md](docs/tech-plan.md): architecture and design intent.
- [index.html](index.html): app entry page.
- [src/main.js](src/main.js): route bootstrap and app startup.
- [src/domain](src/domain): scheduling, queue logic, and domain rules.
- [src/modes](src/modes): study/question modes and registration.
- [src/store/db.js](src/store/db.js): IndexedDB persistence layer.
- [src/views](src/views): page-level renderers.
- [tests](tests): Node-based pure-function tests.
- [data](data): bundled word-list data.

## Working rules

- Prefer native ES modules and browser APIs only; no app framework and no build tooling unless explicitly requested.
- Keep edits small and surgical; do not broaden scope without a clear reason.
- Keep model and scheduling logic pure when possible; most logic should be easy to validate with Node tests.
- Preserve the existing hash-route flow and IndexedDB-backed data lifecycle unless the task explicitly changes them.
- Avoid adding npm packages, backend services, or new bundling steps.
- Prefer updating the smallest relevant test alongside the fix.

## Commands

### Start locally

```bash
python -m http.server 5173
```

Then open http://localhost:5173.

### Run the relevant tests

```bash
node tests/scheduler.test.js && node tests/normalize.test.js && node tests/parse.test.js && node tests/queue.test.js && node tests/modes.test.js
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

## Expected agent behavior

1. Read the relevant code and docs before editing.
2. Keep the fix aligned with the browser-only static architecture.
3. Validate with the narrowest relevant Node test command or app-level check.
4. Do not introduce dependencies or structural churn without explicit need.
5. Favor clear, minimal changes over broad refactors.
