# Tasks: 003 Add Open Source License

## Phase 1: Repository & Dependency Audit
- [x] Audit repository for third-party media assets and unauthorized copied code.
- [x] Audit direct and development npm dependencies and map exact upstream licenses.

## Phase 2: Documentation & Licensing Core
- [x] Add root `LICENSE` (standard MIT license with copyright attribution).
- [x] Add `docs/THIRD_PARTY_LICENSES.md` inventory.
- [x] Add `docs/COPYRIGHT_POLICY.md` IP boundaries policy.
- [x] Add `openspec/specs/licensing/spec.md` living spec.
- [x] Add `openspec/changes/003-add-open-source-license/proposal.md`.
- [x] Add `openspec/changes/003-add-open-source-license/design.md`.

## Phase 3: Package & README Updates
- [x] Update `README.md` with License, Third-Party Software, and Copyright/IP sections.
- [x] Update `package.json` with `"description"` and `"license": "MIT"`.
- [x] Ensure `.gitignore` ignores secret/env files and build outputs.

## Phase 4: Automated Repository Verification
- [x] Create `tests/core/licensing.test.ts` checking contract existence and links.
- [x] Run `vitest` unit test suite to verify 0 regressions.
- [x] Run `tsc` type check.
- [x] Run Vite production build.
- [x] Run git status & secret scan.
