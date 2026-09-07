# Change 003: Add Open Source License and IP Governance

## 1. Problem Statement
As the project expands into a Multi Board Games Platform, establishing explicit open-source licensing and intellectual property (IP) boundaries early prevents legal ambiguities before external assets (chess records, AI engines, sounds, fonts) and additional game rules are introduced.

## 2. Proposed Change
1. Apply the standard MIT License to the original source code authored in this project.
2. Establish a clear distinction between proprietary codebase implementation and generic traditional board game rules (which reside in the public domain).
3. Document all third-party dependencies and their upstream licenses in `docs/THIRD_PARTY_LICENSES.md`.
4. Establish IP guidelines in `docs/COPYRIGHT_POLICY.md` for future assets (audio, fonts, PGN datasets, AI engines).
5. Add living specifications in `openspec/specs/licensing/spec.md`.
6. Implement a repository validation test suite in `tests/core/licensing.test.ts`.

## 3. Non-Goals
- No addition of AI engines or chess libraries.
- No addition of new games (Gomoku, Banqi, Checkers).
- No addition of external image, audio, or font assets.
- No modifications to Xiangqi rules or platform core state machines.
- No legal advice or statutory warranty.

## 4. Acceptance Criteria
- `LICENSE` file exists at repository root with standard MIT text and appropriate copyright attribution.
- `docs/THIRD_PARTY_LICENSES.md` lists all runtime and dev dependencies with verified licenses.
- `docs/COPYRIGHT_POLICY.md` defines rules for code, dependencies, traditional game rules, media, and external AI.
- `openspec/specs/licensing/spec.md` captures behavioral licensing requirements.
- `tests/core/licensing.test.ts` passes and validates repository license documentation contracts.
- Zero functional regression in existing 47 Xiangqi and Core platform tests.
